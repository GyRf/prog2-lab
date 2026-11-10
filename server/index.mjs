// Servidor de ejecución Java aislado. Sin dependencias.
// NUNCA ejecuta el código del alumno dentro de este proceso: cada pedido corre
// javac + java en un contenedor Docker descartable (o, sólo si se pide
// explícitamente con JAVA_RUNNER=local, en un subproceso con timeout).
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT ?? 8787)
const RUNNER = process.env.JAVA_RUNNER ?? 'docker' // docker | local
const IMAGE = process.env.JAVA_DOCKER_IMAGE ?? 'eclipse-temurin:21-jdk'
const TIMEOUT_MS = Number(process.env.JAVA_TIMEOUT_MS ?? 15000)
const RUN_TIMEOUT_S = Number(process.env.JAVA_RUN_TIMEOUT_S ?? 5)
const MAX_OUTPUT = 64 * 1024
const MAX_BODY = 256 * 1024
const MAX_CONCURRENT = Number(process.env.JAVA_MAX_CONCURRENT ?? 2)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173'

let running = 0

const FILE_RE = /^[A-Za-z_$][\w$]*\.java$/
const CLASS_RE = /^[A-Za-z_$][\w$]*$/

export function validate(body) {
  if (!body || !Array.isArray(body.files) || body.files.length === 0 || body.files.length > 30) return 'files inválido'
  for (const f of body.files) {
    if (typeof f?.name !== 'string' || !FILE_RE.test(f.name)) return `nombre de archivo inválido: ${f?.name}`
    if (typeof f.content !== 'string') return 'contenido inválido'
  }
  if (body.mainClass !== undefined && (typeof body.mainClass !== 'string' || !CLASS_RE.test(body.mainClass))) return 'mainClass inválido'
  return null
}

// Script único: compila y, si corresponde, ejecuta. Los marcadores separan fases.
// mainClass ya fue validado con CLASS_RE, no puede inyectar comandos.
function script(mainClass) {
  const compile = 'javac -encoding UTF-8 -nowarn -d "$OUT" *.java 2> "$OUT.err"'
  const run = mainClass
    ? `timeout ${RUN_TIMEOUT_S} java -Xmx128m -Xss4m -XX:+UseSerialGC -cp "$OUT" ${mainClass}; echo "@@EXIT $?"`
    : 'true'
  return `mkdir -p "$OUT"; if ${compile}; then echo "@@COMPILE_OK"; ${run}; else echo "@@COMPILE_FAIL"; cat "$OUT.err"; fi`
}

function exec(dir, mainClass) {
  let cmd, args, env
  if (RUNNER === 'docker') {
    cmd = 'docker'
    args = [
      'run', '--rm', '--network', 'none', '--memory', '256m', '--memory-swap', '256m', '--cpus', '1',
      '--pids-limit', '128', '--read-only', '--tmpfs', '/tmp:rw,size=64m,exec', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--user', '65534:65534',
      '-v', `${dir}:/src:ro`, '-w', '/src', '-e', 'OUT=/tmp/out', IMAGE, 'sh', '-c', script(mainClass),
    ]
    env = process.env
  } else {
    cmd = 'sh'
    args = ['-c', script(mainClass)]
    env = { PATH: process.env.PATH, OUT: join(dir, '.out'), HOME: dir }
  }
  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(cmd, args, { cwd: dir, env })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const cap = (s, chunk) => (s.length > MAX_OUTPUT ? s : s + chunk.toString())
    child.stdout.on('data', (c) => (stdout = cap(stdout, c)))
    child.stderr.on('data', (c) => (stderr = cap(stderr, c)))
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, TIMEOUT_MS)
    child.on('close', () => {
      clearTimeout(timer)
      resolve({ stdout, stderr, timedOut, durationMs: Date.now() - started })
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ stdout: '', stderr: `No se pudo iniciar el runner (${cmd}): ${e.message}`, timedOut: false, durationMs: 0 })
    })
  })
}

export function parse(raw, ran) {
  const stderr = raw.stderr
    .split('\n')
    .filter((l) => !l.startsWith('Picked up JAVA_TOOL_OPTIONS'))
    .join('\n')
  const failIdx = raw.stdout.indexOf('@@COMPILE_FAIL')
  if (failIdx >= 0)
    return { compiled: false, compileOutput: raw.stdout.slice(failIdx + 15), stdout: '', stderr, timedOut: raw.timedOut, durationMs: raw.durationMs }
  const okIdx = raw.stdout.indexOf('@@COMPILE_OK')
  let out = okIdx >= 0 ? raw.stdout.slice(okIdx + 13) : raw.stdout
  const exit = out.match(/@@EXIT (\d+)\s*$/)
  out = out.replace(/@@EXIT \d+\s*$/, '')
  const runTimedOut = raw.timedOut || exit?.[1] === '124'
  return {
    compiled: okIdx >= 0,
    compileOutput: okIdx >= 0 ? '' : stderr || 'No se pudo compilar (sin salida del compilador).',
    stdout: out,
    stderr: (runTimedOut ? `Tiempo límite excedido (${RUN_TIMEOUT_S}s). ¿Hay un bucle o recursión infinita?\n` : '') + (ran ? stderr : ''),
    timedOut: runTimedOut,
    durationMs: raw.durationMs,
  }
}

async function handle(body, withRun) {
  const dir = await mkdtemp(join(tmpdir(), 'prog2-'))
  try {
    for (const f of body.files) await writeFile(join(dir, f.name), f.content, 'utf8')
    const raw = await exec(dir, withRun ? (body.mainClass ?? 'Main') : null)
    return parse(raw, withRun)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function send(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(obj))
}

export const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (req.method === 'GET' && req.url === '/api/health') return send(res, 200, { ok: true, runner: RUNNER })
  if (req.method !== 'POST' || !['/api/compile', '/api/run'].includes(req.url)) return send(res, 404, { error: 'not found' })
  let size = 0
  const chunks = []
  req.on('data', (c) => {
    size += c.length
    if (size > MAX_BODY) {
      send(res, 413, { error: 'pedido demasiado grande' })
      req.destroy()
    } else chunks.push(c)
  })
  req.on('end', async () => {
    if (res.writableEnded) return
    let body
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      return send(res, 400, { error: 'JSON inválido' })
    }
    const err = validate(body)
    if (err) return send(res, 400, { error: err })
    if (running >= MAX_CONCURRENT) return send(res, 429, { error: 'Servidor ocupado, reintentá en unos segundos' })
    running++
    try {
      send(res, 200, await handle(body, req.url === '/api/run'))
    } catch (e) {
      send(res, 500, { error: String(e?.message ?? e) })
    } finally {
      running--
    }
  })
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Servidor de ejecución Java en http://127.0.0.1:${PORT} (runner: ${RUNNER})`)
    if (RUNNER === 'local')
      console.warn('ATENCIÓN: JAVA_RUNNER=local ejecuta el código SIN aislamiento. Usalo sólo en tu propia máquina y con tu propio código.')
  })
}
