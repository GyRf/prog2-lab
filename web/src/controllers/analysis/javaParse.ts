// Parser liviano de Java: no es un compilador, extrae la estructura necesaria
// para el análisis estático (clases, campos, métodos y sus cuerpos).

export interface FieldInfo {
  name: string
  type: string
  modifiers: string[]
  line: number
}

export interface MethodInfo {
  name: string
  returnType: string | null // null = constructor
  params: { type: string; name: string }[]
  modifiers: string[]
  startLine: number
  endLine: number
  bodyStart: number // offset en el texto limpio
  bodyEnd: number
  body: string // texto limpio del cuerpo
}

export interface ClassInfo {
  name: string
  kind: 'class' | 'interface' | 'enum' | 'record'
  isAbstract: boolean
  extends?: string
  implements: string[]
  startLine: number
  endLine: number
  fields: FieldInfo[]
  methods: MethodInfo[]
}

export interface ParsedFile {
  file: string
  source: string
  clean: string // sin comentarios ni contenido de literales (mismas posiciones)
  lines: string[]
  classes: ClassInfo[]
  lineOf: (offset: number) => number
}

/** Reemplaza comentarios y contenido de strings/chars por espacios, conservando saltos de línea. */
export function stripCommentsAndStrings(src: string): string {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const ch = src[i]
    const next = src[i + 1]
    if (ch === '/' && next === '/') {
      while (i < n && src[i] !== '\n') { out += ' '; i++ }
    } else if (ch === '/' && next === '*') {
      out += '  '; i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++ }
      if (i < n) { out += '  '; i += 2 }
    } else if (ch === '"' && src.slice(i, i + 3) === '"""') {
      out += '"""'; i += 3
      while (i < n && src.slice(i, i + 3) !== '"""') { out += src[i] === '\n' ? '\n' : ' '; i++ }
      if (i < n) { out += '"""'; i += 3 }
    } else if (ch === '"' || ch === "'") {
      const q = ch
      out += q; i++
      while (i < n && src[i] !== q && src[i] !== '\n') {
        if (src[i] === '\\') { out += ' '; i++ }
        out += ' '; i++
      }
      if (i < n && src[i] === q) { out += q; i++ }
    } else {
      out += ch; i++
    }
  }
  return out
}

const MODIFIERS = ['public', 'private', 'protected', 'static', 'final', 'abstract', 'default', 'synchronized', 'transient', 'volatile', 'native']

function splitModifiers(header: string): { mods: string[]; rest: string } {
  const h = header.replace(/@\w+(\([^)]*\))?/g, ' ').trim()
  const tokens = h.split(/\s+/)
  const mods: string[] = []
  while (tokens.length && MODIFIERS.includes(tokens[0])) mods.push(tokens.shift()!)
  return { mods, rest: tokens.join(' ') }
}

function parseParams(s: string): { type: string; name: string }[] {
  if (!s.trim()) return []
  // separar por comas fuera de <>
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '<') depth++
    if (ch === '>') depth--
    if (ch === ',' && depth === 0) { parts.push(cur); cur = '' } else cur += ch
  }
  parts.push(cur)
  return parts.map((p) => {
    const t = p.replace(/@\w+/g, '').replace(/\bfinal\b/, '').trim()
    const m = t.match(/^(.*\S)\s+(\w+)$/)
    return m ? { type: m[1].replace(/\s+/g, ''), name: m[2] } : { type: t, name: '' }
  })
}

const CLASS_RE = /\b(class|interface|enum|record)\s+(\w+)(?:\s*<[^{]*?>)?(?:\s*\([^)]*\))?(?:\s+extends\s+([\w<>, .?]+?))?(?:\s+implements\s+([\w<>, .?]+?))?\s*$/
const METHOD_RE = /^(?:<[^>]+>\s+)?([\w<>[\],.? ]+?)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w.,\s]+)?$/
const CTOR_RE = /^(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w.,\s]+)?$/
const FIELD_RE = /^([\w<>[\],.? ]+?)\s+(\w+)\s*(?:=[\s\S]*)?$/

export function parseJava(file: string, source: string): ParsedFile {
  const clean = stripCommentsAndStrings(source)
  const lines = source.split('\n')
  const lineStarts: number[] = [0]
  for (let i = 0; i < clean.length; i++) if (clean[i] === '\n') lineStarts.push(i + 1)
  const lineOf = (offset: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1
    }
    return lo + 1
  }

  type Ctx = { type: 'class'; info: ClassInfo } | { type: 'method'; info: MethodInfo; cls: ClassInfo } | { type: 'block' }
  const stack: Ctx[] = []
  const classes: ClassInfo[] = []
  let segStart = 0
  const top = () => stack[stack.length - 1]
  const inClassBody = () => stack.length === 0 || top().type === 'class'

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (ch === '{') {
      const header = clean.slice(segStart, i).trim()
      const headerOffset = segStart + (clean.slice(segStart, i).length - clean.slice(segStart, i).trimStart().length)
      let pushed: Ctx = { type: 'block' }
      if (inClassBody()) {
        const cm = header.match(CLASS_RE)
        if (cm && !header.includes('=') && !header.includes('new ')) {
          const info: ClassInfo = {
            name: cm[2],
            kind: cm[1] as ClassInfo['kind'],
            isAbstract: /\babstract\b/.test(header) || cm[1] === 'interface',
            extends: cm[3]?.trim(),
            implements: cm[4] ? cm[4].split(',').map((s) => s.trim()) : [],
            startLine: lineOf(headerOffset),
            endLine: 0,
            fields: [],
            methods: [],
          }
          if (cm[1] === 'interface' && cm[3]) info.implements.push(...cm[3].split(',').map((s) => s.trim()))
          classes.push(info)
          pushed = { type: 'class', info }
        } else if (stack.length && top().type === 'class') {
          const cls = (top() as { info: ClassInfo }).info
          const { mods, rest } = splitModifiers(header)
          const ctor = rest.match(CTOR_RE)
          const mm = rest.match(METHOD_RE)
          if (ctor && ctor[1] === cls.name) {
            const info: MethodInfo = { name: ctor[1], returnType: null, params: parseParams(ctor[2]), modifiers: mods, startLine: lineOf(headerOffset), endLine: 0, bodyStart: i + 1, bodyEnd: 0, body: '' }
            cls.methods.push(info)
            pushed = { type: 'method', info, cls }
          } else if (mm && !['new', 'return', 'else'].includes(mm[1])) {
            const info: MethodInfo = { name: mm[2], returnType: mm[1].trim(), params: parseParams(mm[3]), modifiers: mods, startLine: lineOf(headerOffset), endLine: 0, bodyStart: i + 1, bodyEnd: 0, body: '' }
            cls.methods.push(info)
            pushed = { type: 'method', info, cls }
          }
        }
      }
      stack.push(pushed)
      segStart = i + 1
    } else if (ch === '}') {
      const ctx = stack.pop()
      if (ctx?.type === 'class') ctx.info.endLine = lineOf(i)
      if (ctx?.type === 'method') {
        ctx.info.endLine = lineOf(i)
        ctx.info.bodyEnd = i
        ctx.info.body = clean.slice(ctx.info.bodyStart, i)
      }
      segStart = i + 1
    } else if (ch === ';') {
      if (stack.length && top().type === 'class') {
        const cls = (top() as { info: ClassInfo }).info
        const raw = clean.slice(segStart, i)
        const header = raw.trim()
        const headerOffset = segStart + (raw.length - raw.trimStart().length)
        const { mods, rest } = splitModifiers(header)
        if (rest.includes('(') && !rest.includes('=')) {
          const mm = rest.match(METHOD_RE)
          if (mm) {
            const ln = lineOf(headerOffset)
            cls.methods.push({ name: mm[2], returnType: mm[1].trim(), params: parseParams(mm[3]), modifiers: cls.kind === 'interface' ? [...mods, 'abstract'] : mods, startLine: ln, endLine: ln, bodyStart: i, bodyEnd: i, body: '' })
          }
        } else if (rest && !rest.startsWith('import') && !rest.startsWith('package')) {
          const fm = rest.match(FIELD_RE)
          if (fm && cls.kind !== 'enum') cls.fields.push({ name: fm[2], type: fm[1].replace(/\s+/g, ''), modifiers: mods, line: lineOf(headerOffset) })
        }
      }
      segStart = i + 1
    }
  }
  return { file, source, clean, lines, classes, lineOf }
}
