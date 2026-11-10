import type { CodeAnalysisResult, Diagnostic, JavaFile } from '../../models/types'
import { parseJava, type ClassInfo, type MethodInfo, type ParsedFile } from './javaParse'
import { RULES } from './rules'

// CONTROLLER: análisis estático heurístico. Cada detector devuelve diagnósticos
// con la metadata pedagógica definida en rules.ts.

const COLLECTIONS = /^(List|ArrayList|LinkedList|Set|HashSet|TreeSet|Map|HashMap|TreeMap|Collection|Vector)\b/
const CONCRETE_COLLECTIONS = /\b(ArrayList|LinkedList|HashSet|TreeSet|HashMap|TreeMap|Vector)\s*</
const JDK_TYPES = new Set(['String', 'Object', 'Integer', 'Double', 'List', 'ArrayList', 'Comparable', 'Comparator', 'Long', 'Number', 'Character', 'Boolean'])

interface Ctx {
  files: ParsedFile[]
  report: Set<string>
  stringNames: Set<string>
  doubleNames: Set<string>
  userClasses: Set<string>
  out: Diagnostic[]
}

function emit(ctx: Ctx, pf: ParsedFile, ruleId: string, line: number, extra?: Partial<Diagnostic>) {
  if (!ctx.report.has(pf.file)) return
  const m = RULES[ruleId]
  if (ctx.out.some((d) => d.ruleId === ruleId && d.file === pf.file && d.line === line)) return
  ctx.out.push({
    ruleId,
    severity: m.severity,
    category: m.category,
    file: pf.file,
    line,
    code: (pf.lines[line - 1] ?? '').trim(),
    title: m.title,
    explanation: m.explanation,
    why: m.why,
    suggestion: m.suggestion,
    fixedExample: m.fixedExample,
    concept: m.concept,
    ...extra,
  })
}

function collectTypedNames(files: ParsedFile[]) {
  const stringNames = new Set<string>()
  const doubleNames = new Set<string>()
  for (const pf of files) {
    for (const m of pf.clean.matchAll(/\b(String|double|Double|float)\s+(\w+)\s*[=;,)]/g)) {
      ;(m[1] === 'String' ? stringNames : doubleNames).add(m[2])
    }
    for (const cls of pf.classes)
      for (const meth of cls.methods) {
        if (meth.returnType === 'String') stringNames.add(meth.name + '()')
        if (meth.returnType && /^(double|Double|float)$/.test(meth.returnType)) doubleNames.add(meth.name + '()')
      }
  }
  return { stringNames, doubleNames }
}

const lastIdent = (operand: string) => {
  const m = operand.match(/(\w+(?:\(\))?)$/)
  return m ? m[1] : operand
}

function checkEquality(ctx: Ctx, pf: ParsedFile) {
  for (const m of pf.clean.matchAll(/([\w.]+(?:\(\))?|"[^"\n]*")\s*([!=]=)\s*([\w.]+(?:\(\))?|"[^"\n]*")/g)) {
    const [, a, , b] = m
    if (a === 'null' || b === 'null') continue
    const line = pf.lineOf(m.index!)
    const isStr = (x: string) => x.startsWith('"') || ctx.stringNames.has(lastIdent(x))
    const isDbl = (x: string) => /^\d+\.\d+$/.test(x) || ctx.doubleNames.has(lastIdent(x))
    if (isStr(a) || isStr(b)) emit(ctx, pf, 'string-eq', line)
    else if (isDbl(a) || isDbl(b)) emit(ctx, pf, 'double-eq', line)
  }
}

function checkComparators(ctx: Ctx, pf: ParsedFile, cls: ClassInfo, meth: MethodInfo) {
  if (!['compare', 'compareTo'].includes(meth.name) || !meth.body) return
  const returns = [...meth.body.matchAll(/return\s+([^;]+);/g)]
  for (const ret of returns) {
    const expr = ret[1]
    // resta binaria entre dos operandos (no un literal negativo ni un -sgn)
    if (/[\w)\]]\s*-\s*[\w(]/.test(expr) && !/compare/.test(expr)) {
      emit(ctx, pf, 'comparator-subtraction', pf.lineOf(meth.bodyStart + ret.index!))
    }
  }
  const delegates = /compare|Comparator\.|equals|\bres\b|\bresultado\b/.test(meth.body)
  const literalOnly = returns.length > 0 && returns.every((x) => /^\s*-?\d+\s*$/.test(x[1]))
  const hasZero = returns.some((x) => /^\s*0\s*$/.test(x[1]))
  if (!delegates && literalOnly && !hasZero) emit(ctx, pf, 'comparator-contract', meth.startLine)
  void cls
}

function checkFields(ctx: Ctx, pf: ParsedFile, cls: ClassInfo) {
  for (const f of cls.fields) {
    const isConst = f.modifiers.includes('static') && f.modifiers.includes('final')
    if (cls.kind !== 'interface' && f.modifiers.includes('public') && !isConst) emit(ctx, pf, 'public-field', f.line)
    if (CONCRETE_COLLECTIONS.test(f.type + '<') && /^(ArrayList|LinkedList|HashSet|TreeSet|HashMap|TreeMap|Vector)/.test(f.type))
      emit(ctx, pf, 'concrete-collection-type', f.line)
    // missing-final: privado, no static, sólo asignado en constructores / declaración
    if (cls.kind === 'class' && f.modifiers.includes('private') && !f.modifiers.includes('final') && !f.modifiers.includes('static')) {
      const reassigned = cls.methods.some(
        (m) => m.returnType !== null && new RegExp(`(?:this\\.)?\\b${f.name}\\s*(=[^=]|\\+\\+|--|[+\\-*/]=)|(\\+\\+|--)\\s*(?:this\\.)?${f.name}\\b`).test(m.body),
      )
      if (!reassigned) emit(ctx, pf, 'missing-final', f.line)
    }
  }
}

function checkMethods(ctx: Ctx, pf: ParsedFile, cls: ClassInfo) {
  const setters = cls.methods.filter((m) => /^set[A-Z]/.test(m.name)).length
  if (setters >= 4) emit(ctx, pf, 'too-many-setters', cls.startLine)
  const methodLines = cls.endLine - cls.startLine
  if (cls.methods.length > 20 || methodLines > 300) emit(ctx, pf, 'god-class', cls.startLine)

  const equalsM = cls.methods.find((m) => m.name === 'equals' && m.params.length === 1)
  if (equalsM && equalsM.params[0].type !== 'Object') emit(ctx, pf, 'equals-overload', equalsM.startLine)
  else if (equalsM && !cls.methods.some((m) => m.name === 'hashCode' && m.params.length === 0))
    emit(ctx, pf, 'equals-without-hashcode', equalsM.startLine)

  if (cls.extends && /^(ArrayList|LinkedList|HashMap|HashSet|Vector|TreeMap)\b/.test(cls.extends)) emit(ctx, pf, 'inheritance-reuse', cls.startLine)

  for (const m of cls.methods) {
    const body = m.body
    checkComparators(ctx, pf, cls, m)
    const len = m.endLine - m.startLine - 1
    if (len > 30) emit(ctx, pf, 'long-method', m.startLine, { explanation: `El método ${m.name} tiene ${len} líneas.` })

    if (/^(m\d*|metodo\d*|aux\d*|hacer|procesar|f\d*|x|cosa|algo|dato)$/i.test(m.name)) emit(ctx, pf, 'unclear-name', m.startLine)

    // tipos de API concretos
    if (m.returnType && /^(ArrayList|LinkedList|HashMap|HashSet|TreeSet|TreeMap|Vector)\b/.test(m.returnType)) emit(ctx, pf, 'concrete-collection-type', m.startLine)
    if (m.params.some((p) => /^(ArrayList|LinkedList|HashMap|HashSet|TreeSet|TreeMap|Vector)\b/.test(p.type))) emit(ctx, pf, 'concrete-collection-type', m.startLine)

    // throws Exception
    const header = pf.lines.slice(m.startLine - 1, m.startLine + 1).join(' ')
    if (/throws\s+(Exception|Throwable)\b/.test(header)) emit(ctx, pf, 'throws-exception', m.startLine)

    if (!body) continue
    const at = (idx: number) => pf.lineOf(m.bodyStart + idx)

    // colección expuesta
    if (m.returnType && COLLECTIONS.test(m.returnType)) {
      const ret = body.match(/return\s+(?:this\.)?(\w+)\s*;/)
      if (ret && cls.fields.some((f) => f.name === ret[1] && COLLECTIONS.test(f.type))) emit(ctx, pf, 'exposed-collection', at(ret.index!))
    }

    // instanceof / casts (equals es la excepción legítima)
    if (m.name !== 'equals') {
      const inst = [...body.matchAll(/\binstanceof\b/g)]
      if (inst.length >= 2 || (inst.length === 1 && cls.kind !== 'interface')) {
        emit(ctx, pf, 'instanceof-chain', at(inst[0]?.index ?? 0), inst.length >= 2 ? {} : { severity: 'info' })
      }
      for (const c of body.matchAll(/\(\s*\(\s*([A-Z]\w*)\s*\)\s*\w+\s*\)/g)) {
        if (!JDK_TYPES.has(c[1]) && ctx.userClasses.has(c[1])) emit(ctx, pf, 'downcast', at(c.index!))
      }
    }

    // if por tipo
    const tipo = body.match(/get(Tipo|Categoria|Clase)\(\)\s*(==|\.equals)/g)
    if (tipo && tipo.length >= 2) emit(ctx, pf, 'type-switch', at(body.search(/get(Tipo|Categoria|Clase)\(\)/)))

    // catch
    for (const c of body.matchAll(/catch\s*\(\s*(?:final\s+)?(Exception|Throwable|RuntimeException)\s+\w+\s*\)/g)) emit(ctx, pf, 'generic-catch', at(c.index!))
    for (const c of body.matchAll(/catch\s*\([^)]*\)\s*\{\s*(?:\w+\.printStackTrace\(\)\s*;\s*)?\}/g)) emit(ctx, pf, 'empty-catch', at(c.index!))

    // LSP
    if (/^\s*throw\s+new\s+UnsupportedOperationException/.test(body.trim()) && cls.extends) emit(ctx, pf, 'lsp-violation', m.startLine)

    // código muerto: sentencia luego de return/throw en el mismo bloque
    for (const d of body.matchAll(/\b(return|throw)\b[^;{}]*;\s*([^\s}])/g)) {
      const rest = body.slice(d.index! + d[0].length - 1)
      if (/^(case\b|default\b)/.test(rest)) continue
      // ignorar si el return está dentro de un if sin llaves: "if (x) return a; return b;"
      const before = body.slice(0, d.index!).trimEnd()
      if (/\)$|\belse$/.test(before)) continue
      emit(ctx, pf, 'dead-code', at(d.index! + d[0].length - 1))
    }

    // variables locales sin usar
    for (const v of body.matchAll(/(?:^|[;{}(])\s*(?:final\s+)?(?:int|double|long|boolean|char|float|String|[A-Z]\w*(?:<[^;=()]*>)?)\s+(\w+)\s*(=|;)/gm)) {
      const name = v[1]
      if (['return', 'new', 'throw'].includes(name)) continue
      const uses = body.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0
      if (uses <= 1) emit(ctx, pf, 'unused-variable', at(v.index! + v[0].indexOf(name)), { explanation: `La variable "${name}" se declara pero nunca se usa.` })
    }

    // copias
    if (/^(copia|copiar|clone|copy|duplicar|getCopia)/i.test(m.name)) {
      const ownCollection = cls.fields.find((f) => COLLECTIONS.test(f.type))
      if (ownCollection) {
        const n = ownCollection.name
        const reuse = new RegExp(`(addAll\\(\\s*(this\\.)?${n}\\s*\\)|new\\s+\\w*<[^>]*>\\(\\s*(this\\.)?${n}\\s*\\)|\\.\\s*${n}\\s*=\\s*(this\\.)?${n}\\s*;)`)
        const recursive = /\.\s*(copia|copiar|clone|copy|duplicar|getCopia)\w*\s*\(/.test(body)
        const r = body.match(reuse)
        if (r || !recursive) emit(ctx, pf, 'shallow-copy', r ? at(r.index!) : m.startLine)
        else if (m.params.length > 0 && /\.add\w*\(/.test(body) && !/isEmpty|size\(\)|!=\s*null|==\s*null|getCantidad|Optional/.test(body))
          emit(ctx, pf, 'empty-composite-copy', m.startLine)
      }
    }
  }
}

function checkDuplicates(ctx: Ctx) {
  const WINDOW = 4
  const seen = new Map<string, { pf: ParsedFile; line: number }>()
  for (const pf of ctx.files) {
    const norm = pf.clean.split('\n').map((l) => l.trim())
    for (let i = 0; i + WINDOW <= norm.length; i++) {
      const block = norm.slice(i, i + WINDOW)
      if (block.some((l) => l.length < 4 || /^[{}]+$/.test(l) || /^(import|package|@Override)/.test(l))) continue
      const key = block.join('\n')
      const prev = seen.get(key)
      if (prev && !(prev.pf === pf && Math.abs(prev.line - (i + 1)) < WINDOW)) {
        emit(ctx, pf, 'duplicated-code', i + 1, { explanation: `Estas líneas repiten las de ${prev.pf.file}:${prev.line}.` })
      } else if (!prev) seen.set(key, { pf, line: i + 1 })
    }
  }
}

function checkSyntax(ctx: Ctx, pf: ParsedFile) {
  const count = (re: RegExp) => pf.clean.match(re)?.length ?? 0
  if (count(/\{/g) !== count(/\}/g) || count(/\(/g) !== count(/\)/g)) {
    // línea aproximada: donde la profundidad se vuelve negativa, o la última
    let depth = 0, line = pf.lines.length
    for (let i = 0; i < pf.clean.length; i++) {
      if (pf.clean[i] === '{') depth++
      if (pf.clean[i] === '}') depth--
      if (depth < 0) { line = pf.lineOf(i); break }
    }
    emit(ctx, pf, 'syntax-braces', line)
  }
  const pub = pf.clean.match(/public\s+(?:abstract\s+|final\s+)*(?:class|interface|enum|record)\s+(\w+)/)
  if (pub && pf.file.endsWith('.java') && pub[1] + '.java' !== pf.file) emit(ctx, pf, 'syntax-class-name', pf.lineOf(pub.index!))
}

export interface AnalyzeOptions {
  /** Archivos sobre los que se reportan diagnósticos (por defecto, todos). */
  reportFiles?: string[]
  /** Sólo chequeos de compilación básicos. */
  syntaxOnly?: boolean
}

export function analyzeJava(files: JavaFile[], opts: AnalyzeOptions = {}): CodeAnalysisResult {
  const parsed = files.map((f) => parseJava(f.name, f.content))
  const { stringNames, doubleNames } = collectTypedNames(parsed)
  const userClasses = new Set(parsed.flatMap((p) => p.classes.map((c) => c.name)))
  const ctx: Ctx = { files: parsed, report: new Set(opts.reportFiles ?? files.map((f) => f.name)), stringNames, doubleNames, userClasses, out: [] }
  for (const pf of parsed) checkSyntax(ctx, pf)
  if (!opts.syntaxOnly) {
    for (const pf of parsed) {
      checkEquality(ctx, pf)
      for (const cls of pf.classes) {
        checkFields(ctx, pf, cls)
        checkMethods(ctx, pf, cls)
      }
    }
    checkDuplicates(ctx)
  }
  const order = { error: 0, warning: 1, info: 2 }
  ctx.out.sort((a, b) => order[a.severity] - order[b.severity] || (a.file ?? '').localeCompare(b.file ?? '') || a.line - b.line)
  return {
    diagnostics: ctx.out,
    metrics: {
      lines: parsed.reduce((s, p) => s + p.lines.length, 0),
      classes: parsed.reduce((s, p) => s + p.classes.length, 0),
      methods: parsed.reduce((s, p) => s + p.classes.reduce((t, c) => t + c.methods.length, 0), 0),
    },
  }
}
