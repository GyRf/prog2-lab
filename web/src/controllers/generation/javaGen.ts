import type { DomainDef, DomainField } from '../../data/domains'
import type { Rng } from './rng'

// Helpers para generar código Java y modelos de datos coherentes por dominio.

export const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
export const getter = (f: string) => `get${cap(f)}`
export const javaType = (f: DomainField) => f.type
export const field = (d: DomainDef, name: string) => d.fields.find((f) => f.name === name)!
export const numericFields = (d: DomainDef) => d.fields.filter((f) => f.type !== 'String')

export type Value = string | number
export type LeafData = Record<string, Value>

export function lit(v: Value, f: DomainField): string {
  if (f.type === 'String') return JSON.stringify(v)
  if (f.type === 'double') return Number.isInteger(v) ? `${v}.0` : String(v)
  return String(v)
}

export function randomValue(rng: Rng, f: DomainField): Value {
  if (f.type === 'String') return rng.pick(f.values!)
  return f.type === 'int' ? rng.int(f.range![0], f.range![1]) : rng.dbl(f.range![0], f.range![1])
}

/** Genera n hojas con nombres únicos y valores numéricos sin repetir por campo. */
export function makeLeaves(rng: Rng, d: DomainDef, n: number): LeafData[] {
  const names = rng.shuffle(d.leafNames).slice(0, Math.min(n, d.leafNames.length))
  const used: Record<string, Set<Value>> = {}
  return names.map((nombre) => {
    const leaf: LeafData = { nombre }
    for (const f of d.fields.slice(1)) {
      used[f.name] ??= new Set()
      let v = randomValue(rng, f)
      for (let tries = 0; f.type !== 'String' && used[f.name].has(v) && tries < 50; tries++) v = randomValue(rng, f)
      used[f.name].add(v)
      leaf[f.name] = v
    }
    return leaf
  })
}

export const newLeaf = (d: DomainDef, l: LeafData) => `new ${d.leaf}(${d.fields.map((f) => lit(l[f.name], f)).join(', ')})`

/** Clase hoja con campos final, constructor y getters. */
export function leafSource(d: DomainDef, opts: { extendsBase?: boolean; extra?: string; overrideGetters?: string[] } = {}): string {
  const fields = d.fields.map((f) => `    private final ${f.type} ${f.name};`).join('\n')
  const params = d.fields.map((f) => `${f.type} ${f.name}`).join(', ')
  const assigns = d.fields.map((f) => `        this.${f.name} = ${f.name};`).join('\n')
  const getters = d.fields
    .map((f) => `${opts.overrideGetters?.includes(f.name) ? '    @Override\n' : ''}    public ${f.type} ${getter(f.name)}() {\n        return ${f.name};\n    }`)
    .join('\n\n')
  return `import java.util.*;

public class ${d.leaf}${opts.extendsBase ? ` extends ${d.base}` : ''} {
${fields}

    public ${d.leaf}(${params}) {
${assigns}
    }

${getters}
${opts.extra ? '\n' + opts.extra + '\n' : ''}
    @Override
    public String toString() {
        return nombre;
    }
}
`
}

// ---------- Árboles para Composite ----------
export type Node = { kind: 'leaf'; data: LeafData } | { kind: 'comp'; name: string; children: Node[] }

export function makeTree(rng: Rng, d: DomainDef, leaves: LeafData[], depth: number): Node {
  const pool = [...leaves]
  const compNames = rng.shuffle(d.compositeNames)
  let ci = 0
  const nextName = () => {
    const base = compNames[ci % compNames.length]
    const n = ci < compNames.length ? base : `${base} ${Math.floor(ci / compNames.length) + 1}`
    ci++
    return n
  }
  const build = (level: number): Node => {
    const node: Node = { kind: 'comp', name: nextName(), children: [] }
    const nChildren = rng.int(2, 3)
    for (let i = 0; i < nChildren && pool.length; i++) {
      if (level < depth && rng.bool(0.45) && pool.length > 1) node.children.push(build(level + 1))
      else node.children.push({ kind: 'leaf', data: pool.shift()! })
    }
    return node
  }
  const root = build(1)
  // repartir sobrantes en el compuesto más profundo para respetar la profundidad pedida
  const comps: Node[] = []
  const walk = (n: Node) => { if (n.kind === 'comp') { comps.push(n); n.children.forEach(walk) } }
  walk(root)
  while (pool.length) (comps[rng.int(0, comps.length - 1)] as Extract<Node, { kind: 'comp' }>).children.push({ kind: 'leaf', data: pool.shift()! })
  return root
}

export const leavesOf = (n: Node): LeafData[] => (n.kind === 'leaf' ? [n.data] : n.children.flatMap(leavesOf))
export const depthOf = (n: Node): number => (n.kind === 'leaf' ? 0 : 1 + Math.max(0, ...n.children.map(depthOf)))

/** Código Java que construye el árbol. Devuelve el nombre de la variable raíz. */
export function treeBuilder(d: DomainDef, root: Node, add = 'agregar'): { code: string; rootVar: string; compVars: Map<Node, string> } {
  const lines: string[] = []
  const compVars = new Map<Node, string>()
  let ci = 0, li = 0
  const emit = (n: Node, parent?: string): string => {
    if (n.kind === 'leaf') {
      const v = `h${li++}`
      lines.push(`${d.leaf} ${v} = ${newLeaf(d, n.data)};`)
      if (parent) lines.push(`${parent}.${add}(${v});`)
      return v
    }
    const v = `c${ci++}`
    compVars.set(n, v)
    lines.push(`${d.composite} ${v} = new ${d.composite}(${JSON.stringify(n.name)});`)
    if (parent) lines.push(`${parent}.${add}(${v});`)
    n.children.forEach((c) => emit(c, v))
    return v
  }
  const rootVar = emit(root)
  return { code: lines.join('\n'), rootVar, compVars }
}

export const fmtNum = (v: number, f: DomainField) => (f.type === 'double' ? lit(Math.round(v * 1000) / 1000, f) : String(v))
export const javaStringList = (xs: string[]) => `List.of(${xs.map((x) => JSON.stringify(x)).join(', ')})`
