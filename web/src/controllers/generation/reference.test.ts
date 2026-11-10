import { describe, expect, it } from 'vitest'
import { execFile, execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { DOMAINS } from '../../data/domains'
import { STATIC_EXERCISES } from '../../data/exercises'
import type { Difficulty, Exercise } from '../../models/types'
import { analyzeJava } from '../analysis/analyzer'
import { buildTestHarness, HARNESS_CLASS, parseTestOutput } from '../execution/JavaExecutionService'
import { TEMPLATES } from './templates'
import { validateBatch, validateExercise } from './validator'

const run = promisify(execFile)
const hasJavac = (() => { try { execSync('javac -version', { stdio: 'ignore' }); return true } catch { return false } })()
const DIFFS: Difficulty[] = ['introductory', 'intermediate', 'advanced']

const generated: Exercise[] = []
TEMPLATES.forEach((t, ti) => DOMAINS.forEach((d, di) => generated.push(t.generate({ templateId: t.id, domain: d.id, seed: 1000 + ti * 37 + di, difficulty: DIFFS[(ti + di) % 3] }))))
const all = [...generated, ...STATIC_EXERCISES]

async function runReference(ex: Exercise) {
  const tests = [...(ex.visibleTests ?? []), ...ex.hiddenTests]
  const dir = mkdtempSync(join(tmpdir(), 'ref-'))
  try {
    for (const f of [...(ex.supportFiles ?? []), ...ex.referenceSolution, buildTestHarness(tests)]) writeFileSync(join(dir, f.name), f.content)
    await run('sh', ['-c', 'javac -encoding UTF-8 -nowarn -d out *.java'], { cwd: dir }).catch((e) => { throw new Error(`${ex.id} no compila:\n${String(e.stderr).split('\n').filter((l: string) => !l.startsWith('Picked up')).join('\n')}`) })
    const { stdout } = await run('java', ['-cp', 'out', HARNESS_CLASS], { cwd: dir, timeout: 20000 })
    return parseTestOutput(stdout, tests).tests
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('generación procedural', () => {
  it('es determinística por semilla', () => {
    for (const t of TEMPLATES) {
      const a = t.generate({ templateId: t.id, seed: 42, domain: 'pitufos' })
      const b = t.generate({ templateId: t.id, seed: 42, domain: 'pitufos' })
      expect(a).toEqual(b)
    }
  })

  it('semillas distintas producen ejercicios distintos', () => {
    for (const t of TEMPLATES) {
      const xs = [1, 2, 3, 4, 5].map((seed) => t.generate({ templateId: t.id, seed, domain: 'onepiece' }))
      expect(validateBatch(xs)).toEqual([])
    }
  })

  it('todos los ejercicios pasan el validador', () => {
    for (const ex of all) expect(validateExercise(ex), ex.id).toEqual([])
  })

  it('las soluciones de referencia no tienen errores ni malas prácticas', () => {
    for (const ex of all) {
      const bad = analyzeJava([...(ex.supportFiles ?? []), ...ex.referenceSolution], { reportFiles: ex.referenceSolution.map((f) => f.name) }).diagnostics.filter((d) => d.severity !== 'info')
      expect(bad.map((d) => `${d.file}:${d.line} ${d.ruleId}`), ex.id).toEqual([])
    }
  })

  it.skipIf(!hasJavac)('la solución de referencia compila y pasa todos sus tests (javac real)', async () => {
    const queue = [...all]
    const failures: string[] = []
    await Promise.all(
      Array.from({ length: 6 }, async () => {
        for (let ex = queue.shift(); ex; ex = queue.shift()) {
          try {
            const res = await runReference(ex)
            for (const r of res) if (r.status !== 'pass') failures.push(`${ex.id} › ${r.name}: ${r.message}`)
          } catch (e) {
            failures.push(String(e).slice(0, 1500))
          }
        }
      }),
    )
    expect(failures).toEqual([])
  }, 600_000)
})
