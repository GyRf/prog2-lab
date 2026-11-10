import { DOMAINS, domainById, type DomainDef, type DomainField } from '../../data/domains'
import type { Difficulty, Exercise, ExerciseTemplate, GenerationRequest, Hint, JavaFile, Requirement, Rubric, TestCase } from '../../models/types'
import { Rng } from './rng'
import {
  cap, field, fmtNum, getter, javaStringList, leafSource, leavesOf, lit, makeLeaves, makeTree, newLeaf, numericFields, treeBuilder,
  type LeafData, type Node,
} from './javaGen'

// CONTROLLER: plantillas de generación procedural. Cada plantilla produce un
// Exercise completo (enunciado, código inicial, tests, solución, pistas, rúbrica)
// a partir de (plantilla, dominio, dificultad, semilla).

const DEFAULT_RUBRIC: Rubric = {
  items: [
    { id: 'tests', description: 'Tests (visibles y ocultos)', points: 70, kind: 'tests' },
    { id: 'req', description: 'Requisitos del enunciado', points: 20, kind: 'requirements' },
    { id: 'analysis', description: 'Sin errores ni malas prácticas detectadas', points: 10, kind: 'analysis' },
  ],
}

const NO_SUBTRACTION: Requirement = { id: 'no-resta', description: 'No usar restas para comparar (usar Integer.compare / Double.compare / compareTo)', check: { pattern: 'return[^;]*[\\w)]\\s*-\\s*[\\w(]', mustMatch: false } }
const NO_INSTANCEOF: Requirement = { id: 'no-instanceof', description: 'No usar instanceof (resolver con polimorfismo)', check: { pattern: '\\binstanceof\\b', mustMatch: false } }

function setup(req: GenerationRequest, domains?: string[]) {
  const rng = new Rng(req.seed)
  const pool = domains ? DOMAINS.filter((d) => domains.includes(d.id)) : DOMAINS
  const d = (req.domain && domainById(req.domain)) || rng.pick(pool)
  const difficulty: Difficulty = req.difficulty ?? 'intermediate'
  return { rng, d, difficulty }
}

const idOf = (t: string, d: DomainDef, diff: Difficulty, seed: number) => `gen-${t}-${d.id}-${diff}-${seed}`
const level = (diff: Difficulty) => ({ introductory: 0, intermediate: 1, advanced: 2, exam: 2 })[diff]

const cmp = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0)
const eqNum = (f: DomainField) => (f.type === 'double' ? 'eqD' : 'eq')

// =====================================================================
// COMPARATOR
// =====================================================================
interface Criterion { field: DomainField; desc: boolean }

function criterionText(c: Criterion): string {
  if (c.field.type === 'String') return c.desc ? `orden alfabético inverso por ${c.field.label}` : `orden alfabético por ${c.field.label}`
  return c.desc ? `mayor ${c.field.label} primero` : `menor ${c.field.label} primero`
}

function criterionJava(c: Criterion, a: string, b: string): string {
  const g = getter(c.field.name)
  const [x, y] = c.desc ? [b, a] : [a, b]
  if (c.field.type === 'String') return `${x}.${g}().compareTo(${y}.${g}())`
  return `${c.field.type === 'int' ? 'Integer' : 'Double'}.compare(${x}.${g}(), ${y}.${g}())`
}

export const comparatorTemplate: ExerciseTemplate = {
  id: 'comparator',
  title: 'Completar un Comparator',
  description: 'Se dan las clases del dominio; sólo hay que escribir compare con uno o varios criterios y desempates.',
  concepts: ['comparator', 'identidad-igualdad'],
  formats: ['code-fragment'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    const { rng, d, difficulty } = setup(req)
    const nCrit = [1, 2, 3, 2][['introductory', 'intermediate', 'advanced', 'exam'].indexOf(difficulty)]
    const nums = rng.shuffle(numericFields(d))
    const strs = d.fields.filter((f) => f.type === 'String' && f.name !== 'nombre')
    const criteria: Criterion[] = []
    for (let i = 0; i < nCrit - 1 && i < nums.length; i++) criteria.push({ field: nums[i], desc: rng.bool() })
    if (nCrit === 1) criteria.push({ field: nums[0], desc: rng.bool() })
    else {
      // el último criterio garantiza orden total: nombre (único)
      if (nCrit === 3 && strs.length && rng.bool(0.3)) criteria.splice(1, 1, { field: strs[0], desc: false })
      criteria.push({ field: field(d, 'nombre'), desc: rng.bool(0.2) })
    }
    const className = `ComparadorPor${cap(criteria[0].field.name)}`

    // datos: forzar empates en el primer criterio (y segundo) para ejercitar desempates
    const leaves = makeLeaves(rng, d, Math.min(8, d.leafNames.length))
    if (nCrit > 1) {
      const f0 = criteria[0].field.name
      leaves[1][f0] = leaves[0][f0]
      leaves[3][f0] = leaves[2][f0]
      if (nCrit === 3) { leaves[4][f0] = leaves[2][f0]; leaves[4][criteria[1].field.name] = leaves[2][criteria[1].field.name] }
    }
    const compareTs = (a: LeafData, b: LeafData) => {
      for (const c of criteria) {
        const r = cmp(a[c.field.name], b[c.field.name]) * (c.desc ? -1 : 1)
        if (r !== 0) return r
      }
      return 0
    }
    const sortedNames = (ls: LeafData[]) => [...ls].sort(compareTs).map((l) => l.nombre as string)
    const listCode = (ls: LeafData[]) =>
      `List<${d.leaf}> lista = new ArrayList<>(List.of(\n    ${ls.map((l) => newLeaf(d, l)).join(',\n    ')}));\nlista.sort(new ${className}());\nList<String> nombres = new ArrayList<>();\nfor (${d.leaf} x : lista) nombres.add(x.getNombre());\neq(${javaStringList(sortedNames(ls))}, nombres);`

    const small = rng.shuffle(leaves.slice(0, 4))
    const all = rng.shuffle(leaves)
    const tests: TestCase[] = [
      { id: 'ordena-chica', name: `Ordena una lista de ${small.length} ${d.leafPlural}`, body: listCode(small) },
      { id: 'reflexivo', name: 'compare(a, a) devuelve 0', body: `${d.leaf} a = ${newLeaf(d, leaves[0])};\neq(0, new ${className}().compare(a, a));` },
      { id: 'ordena-completa', name: `Ordena ${all.length} ${d.leafPlural}`, body: listCode(all) },
      {
        id: 'antisimetria', name: 'sgn(compare(a,b)) == -sgn(compare(b,a)) para todos los pares',
        body: `List<${d.leaf}> xs = List.of(${leaves.map((l) => newLeaf(d, l)).join(', ')});\n${className} c = new ${className}();\nfor (${d.leaf} a : xs) for (${d.leaf} b : xs)\n    check(sgn(c.compare(a, b)) == -sgn(c.compare(b, a)), "Falla con " + a + " y " + b);`,
      },
    ]
    if (nCrit > 1) {
      const [a, b] = [leaves[0], leaves[1]]
      const exp = Math.sign(compareTs(a, b))
      tests.push({
        id: 'desempate', name: `Desempata cuando ${criteria[0].field.label} es igual`,
        body: `${d.leaf} a = ${newLeaf(d, a)};\n${d.leaf} b = ${newLeaf(d, b)};\neq(${exp}, sgn(new ${className}().compare(a, b)));`,
      })
    }
    const statementCrit = criteria.map((c, i) => (i === 0 ? cap(criterionText(c)) : `a igualdad, ${criterionText(c)}`)).join('; ')
    const body = (indent: string) => {
      if (criteria.length === 1) return `${indent}return ${criterionJava(criteria[0], 'p1', 'p2')};`
      const lines = [`${indent}int res = ${criterionJava(criteria[0], 'p1', 'p2')};`]
      for (const c of criteria.slice(1)) lines.push(`${indent}if (res == 0) {\n${indent}    res = ${criterionJava(c, 'p1', 'p2')};\n${indent}}`)
      lines.push(`${indent}return res;`)
      return lines.join('\n')
    }
    const fileName = `${className}.java`
    const head = `import java.util.Comparator;\n\npublic class ${className} implements Comparator<${d.leaf}> {\n    @Override\n    public int compare(${d.leaf} p1, ${d.leaf} p2) {\n`
    return {
      id: idOf('comparator', d, difficulty, req.seed), seed: req.seed, templateId: 'comparator',
      title: `Comparator de ${d.leafPlural}: ${criterionText(criteria[0])}`,
      domain: d.name,
      statement: `Se cuenta con la clase **${d.leaf}** (${d.name}) con los datos: ${d.fields.map((f) => f.label).join(', ')}.\n\nCompletá **${className}** para ordenar ${d.leafPlural} con el siguiente criterio:\n\n**${statementCrit}.**\n\nSólo hay que completar el método compare. Recordá el contrato: negativo si p1 va antes, positivo si va después y 0 si son equivalentes.`,
      concepts: ['comparator'],
      difficulty, format: 'code-fragment',
      supportFiles: [{ name: `${d.leaf}.java`, content: leafSource(d), readonly: true }],
      starterCode: [{ name: fileName, content: `${head}        // Completá esta parte\n        return 0;\n    }\n}\n` }],
      requirements: [
        { id: 'implements', description: `${className} implementa Comparator<${d.leaf}>`, check: { pattern: `implements\\s+Comparator\\s*<\\s*${d.leaf}\\s*>`, mustMatch: true } },
        NO_SUBTRACTION,
        { id: 'no-string-eq', description: 'No comparar Strings con ==', check: { pattern: 'getNombre\\(\\)\\s*[!=]=', mustMatch: false } },
      ],
      visibleTests: tests.slice(0, 2),
      hiddenTests: tests.slice(2),
      referenceSolution: [{ name: fileName, content: `${head}${body('        ')}\n    }\n}\n` }],
      rubric: DEFAULT_RUBRIC,
      hints: [
        { level: 1, text: `El orden ${criteria[0].desc ? 'descendente' : 'ascendente'} se logra ${criteria[0].desc ? 'invirtiendo los argumentos: compare(p2, p1)' : 'comparando p1 contra p2'}.` },
        { level: 2, text: `Usá ${criteria[0].field.type === 'String' ? 'String.compareTo' : criteria[0].field.type === 'int' ? 'Integer.compare' : 'Double.compare'} en vez de restar valores.` },
        { level: 3, text: criteria.length > 1 ? 'Guardá el resultado del primer criterio en una variable y, si es 0, calculá el siguiente.' : 'Alcanza con una sola línea: return Integer.compare(...).' },
      ],
      explanation: 'Un Comparator encapsula un criterio de orden externo a la clase. Delegar en Integer.compare / Double.compare / compareTo garantiza el contrato (signo correcto, 0 en igualdad, sin overflow). Los desempates se encadenan sólo cuando el criterio anterior da 0; también podría escribirse con Comparator.comparing(...).thenComparing(...).',
    }
  },
}

// =====================================================================
// COMPOSITE: métricas recursivas
// =====================================================================
function baseSource(d: DomainDef, methods: string[]) {
  return `import java.util.*;\n\npublic abstract class ${d.base} {\n${methods.map((m) => `    ${m}`).join('\n\n')}\n}\n`
}

function evalSum(n: Node, f: string): number { return n.kind === 'leaf' ? (n.data[f] as number) : n.children.reduce((s, c) => s + evalSum(c, f), 0) }
function evalMax(n: Node, f: string): number { return n.kind === 'leaf' ? (n.data[f] as number) : Math.max(0, ...n.children.map((c) => evalMax(c, f))) }

export const compositeMetricTemplate: ExerciseTemplate = {
  id: 'composite-metric',
  title: 'Composite: métricas recursivas',
  description: 'Implementar el compuesto de un Composite con cálculos recursivos (suma, máximo, cantidad).',
  concepts: ['composite', 'polimorfismo', 'abstractas'],
  formats: ['code-fragment', 'full-design'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    const { rng, d, difficulty } = setup(req)
    const lv = level(difficulty)
    const sumF = field(d, d.sumField), maxF = field(d, d.maxField)
    const sumM = getter(sumF.name), maxM = `getMax${cap(maxF.name)}`
    const methods = [`public abstract String getNombre();`, `public abstract ${sumF.type} ${sumM}();`]
    if (lv >= 1) methods.push(`public abstract ${maxF.type} ${maxM}();`)
    if (lv >= 2) methods.push(`public abstract int getCantidad();`)
    const leafExtra = [
      lv >= 1 ? `    @Override\n    public ${maxF.type} ${maxM}() {\n        return ${maxF.name};\n    }` : '',
      lv >= 2 ? `    @Override\n    public int getCantidad() {\n        return 1;\n    }` : '',
    ].filter(Boolean).join('\n\n')
    const leaves = makeLeaves(rng, d, 4 + lv * 3)
    const tree = makeTree(rng, d, leaves, 1 + lv)
    const { code, rootVar, compVars } = treeBuilder(d, tree)
    const subComp = [...compVars.entries()].find(([n]) => n !== tree)

    const tests: TestCase[] = [
      { id: 'vacio', name: `Un ${d.composite} vacío suma 0`, body: `${d.composite} c = new ${d.composite}("vacío");\n${eqNum(sumF)}(${lit(0, sumF)}, c.${sumM}());` },
      { id: 'plano', name: `${d.composite} con ${d.leafPlural} directos`, body: `${d.composite} c = new ${d.composite}("x");\n${leaves.slice(0, 2).map((l) => `c.agregar(${newLeaf(d, l)});`).join('\n')}\n${eqNum(sumF)}(${fmtNum((leaves[0][sumF.name] as number) + (leaves[1][sumF.name] as number), sumF)}, c.${sumM}());` },
      { id: 'anidado-suma', name: `Suma recursiva en estructura anidada`, body: `${code}\n${eqNum(sumF)}(${fmtNum(evalSum(tree, sumF.name), sumF)}, ${rootVar}.${sumM}());` },
      { id: 'dinamico', name: 'El cálculo es dinámico (refleja elementos agregados después)', body: `${code}\n${rootVar}.${sumM}();\n${rootVar}.agregar(${newLeaf(d, leaves[0])});\n${eqNum(sumF)}(${fmtNum(evalSum(tree, sumF.name) + (leaves[0][sumF.name] as number), sumF)}, ${rootVar}.${sumM}());` },
    ]
    if (subComp) tests.push({ id: 'subcompuesto', name: 'Funciona sobre un subcompuesto', body: `${code}\n${eqNum(sumF)}(${fmtNum(evalSum(subComp[0], sumF.name), sumF)}, ${subComp[1]}.${sumM}());` })
    if (lv >= 1) tests.push({ id: 'max', name: `Máximo de ${maxF.label} en la estructura`, body: `${code}\n${eqNum(maxF)}(${fmtNum(evalMax(tree, maxF.name), maxF)}, ${rootVar}.${maxM}());` }, { id: 'max-vacio', name: 'Máximo de un compuesto vacío es 0', body: `${eqNum(maxF)}(${lit(0, maxF)}, new ${d.composite}("v").${maxM}());` })
    if (lv >= 2) tests.push({ id: 'cantidad', name: `Cantidad de ${d.leafPlural}`, body: `${code}\neq(${leavesOf(tree).length}, ${rootVar}.getCantidad());` })

    const compBody = [
      `    @Override\n    public ${sumF.type} ${sumM}() {\n        ${sumF.type} total = 0;\n        for (${d.base} e : elementos) {\n            total += e.${sumM}();\n        }\n        return total;\n    }`,
      lv >= 1 ? `    @Override\n    public ${maxF.type} ${maxM}() {\n        ${maxF.type} max = 0;\n        for (${d.base} e : elementos) {\n            max = Math.max(max, e.${maxM}());\n        }\n        return max;\n    }` : '',
      lv >= 2 ? `    @Override\n    public int getCantidad() {\n        int total = 0;\n        for (${d.base} e : elementos) {\n            total += e.getCantidad();\n        }\n        return total;\n    }` : '',
    ].filter(Boolean).join('\n\n')
    const compHead = `import java.util.*;\n\npublic class ${d.composite} extends ${d.base} {\n    private final String nombre;\n    private final List<${d.base}> elementos;\n\n    public ${d.composite}(String nombre) {\n        this.nombre = nombre;\n        this.elementos = new ArrayList<>();\n    }\n\n    public void agregar(${d.base} e) {\n        elementos.add(e);\n    }\n\n    @Override\n    public String getNombre() {\n        return nombre;\n    }\n\n`
    const metrics = [`${sumF.label} total (suma de todos sus ${d.leafPlural})`]
    if (lv >= 1) metrics.push(`${maxF.label} máximo/a entre todos sus ${d.leafPlural} (0 si está vacío)`)
    if (lv >= 2) metrics.push(`cantidad total de ${d.leafPlural} que contiene`)
    return {
      id: idOf('composite-metric', d, difficulty, req.seed), seed: req.seed, templateId: 'composite-metric',
      title: `Composite de ${d.compositePlural}: ${metrics.length === 1 ? 'suma recursiva' : 'métricas recursivas'}`,
      domain: d.name,
      statement: `En el dominio *${d.name}*, un **${d.composite}** puede contener ${d.leafPlural} y otros ${d.compositePlural}, anidados sin límite. Ambos extienden **${d.base}**.\n\nImplementá la clase **${d.composite}** (constructor con nombre, \`agregar(${d.base} e)\`) para que responda:\n\n${metrics.map((m) => `- ${m}`).join('\n')}\n\nLos valores deben calcularse cada vez (no guardar totales), así reflejan elementos agregados después.`,
      concepts: ['composite', 'polimorfismo', 'abstractas'],
      difficulty, format: 'code-fragment',
      supportFiles: [
        { name: `${d.base}.java`, content: baseSource(d, methods), readonly: true },
        { name: `${d.leaf}.java`, content: leafSource(d, { extendsBase: true, overrideGetters: ['nombre', sumF.name], extra: leafExtra }), readonly: true },
      ],
      starterCode: [{ name: `${d.composite}.java`, content: `import java.util.*;\n\npublic class ${d.composite} extends ${d.base} {\n    // Completá: atributos, constructor, agregar y los métodos abstractos\n}\n` }],
      requirements: [
        { id: 'extends', description: `${d.composite} extiende ${d.base}`, check: { pattern: `class\\s+${d.composite}\\s+extends\\s+${d.base}`, mustMatch: true } },
        { id: 'lista-base', description: `Guarda los hijos como List<${d.base}> (no listas separadas por tipo)`, check: { pattern: `List\\s*<\\s*${d.base}\\s*>`, mustMatch: true } },
        NO_INSTANCEOF,
      ],
      visibleTests: tests.slice(0, 2),
      hiddenTests: tests.slice(2),
      referenceSolution: [{ name: `${d.composite}.java`, content: `${compHead}${compBody}\n}\n` }],
      rubric: DEFAULT_RUBRIC,
      hints: [
        { level: 1, text: `El compuesto no sabe si sus hijos son ${d.leafPlural} o ${d.compositePlural}: les envía el mismo mensaje a todos.` },
        { level: 2, text: `Guardá una List<${d.base}> y recorrela acumulando ${sumM}() de cada elemento.` },
        { level: 3, text: `La recursión aparece sola: si un hijo es ${d.composite}, su ${sumM}() vuelve a recorrer sus propios hijos.` },
      ],
      explanation: `En Composite, hoja y compuesto comparten la superclase ${d.base}. El compuesto delega en cada hijo el mismo mensaje, y el binding dinámico decide si se ejecuta la versión de la hoja (caso base) o la del compuesto (paso recursivo). No hace falta instanceof.`,
    }
  },
}

// =====================================================================
// CONDICIONES (And / Or / Not)
// =====================================================================
function condNames(_d: DomainDef, numF: DomainField, catF: DomainField) {
  return { mayor: `Condicion${cap(numF.name)}Mayor`, igual: `Condicion${cap(catF.name)}Igual` }
}

function conditionSources(d: DomainDef, numF: DomainField, catF: DomainField) {
  const n = condNames(d, numF, catF)
  return {
    iface: { name: 'Condicion.java', content: `public interface Condicion {\n    boolean cumple(${d.leaf} x);\n}\n` },
    mayor: { name: `${n.mayor}.java`, content: `public class ${n.mayor} implements Condicion {\n    private final ${numF.type} umbral;\n\n    public ${n.mayor}(${numF.type} umbral) {\n        this.umbral = umbral;\n    }\n\n    @Override\n    public boolean cumple(${d.leaf} x) {\n        return x.${getter(numF.name)}() > umbral;\n    }\n}\n` },
    igual: { name: `${n.igual}.java`, content: `public class ${n.igual} implements Condicion {\n    private final String valor;\n\n    public ${n.igual}(String valor) {\n        this.valor = valor;\n    }\n\n    @Override\n    public boolean cumple(${d.leaf} x) {\n        return x.${getter(catF.name)}().equals(valor);\n    }\n}\n` },
    and: { name: 'CondicionAnd.java', content: `public class CondicionAnd implements Condicion {\n    private final Condicion c1;\n    private final Condicion c2;\n\n    public CondicionAnd(Condicion c1, Condicion c2) {\n        this.c1 = c1;\n        this.c2 = c2;\n    }\n\n    @Override\n    public boolean cumple(${d.leaf} x) {\n        return c1.cumple(x) && c2.cumple(x);\n    }\n}\n` },
    or: { name: 'CondicionOr.java', content: `public class CondicionOr implements Condicion {\n    private final Condicion c1;\n    private final Condicion c2;\n\n    public CondicionOr(Condicion c1, Condicion c2) {\n        this.c1 = c1;\n        this.c2 = c2;\n    }\n\n    @Override\n    public boolean cumple(${d.leaf} x) {\n        return c1.cumple(x) || c2.cumple(x);\n    }\n}\n` },
    not: { name: 'CondicionNot.java', content: `public class CondicionNot implements Condicion {\n    private final Condicion c;\n\n    public CondicionNot(Condicion c) {\n        this.c = c;\n    }\n\n    @Override\n    public boolean cumple(${d.leaf} x) {\n        return !c.cumple(x);\n    }\n}\n` },
  }
}

const skeleton = (f: JavaFile, leaf: string) => {
  const m = f.content.match(/public class (\w+) implements Condicion/)!
  return { name: f.name, content: `public class ${m[1]} implements Condicion {\n    // Completá: atributos y constructor\n\n    @Override\n    public boolean cumple(${leaf} x) {\n        return false;\n    }\n}\n` }
}

export const conditionsTemplate: ExerciseTemplate = {
  id: 'conditions',
  title: 'Condiciones combinables (And, Or, Not)',
  description: 'Modelar filtros como objetos y combinarlos.',
  concepts: ['condiciones', 'interfaces', 'polimorfismo'],
  formats: ['code-fragment'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    return generateConditions(req)
  },
}

function generateConditions(req: GenerationRequest, forceNumField?: string): Exercise {
    const { rng, d, difficulty } = setup(req)
    const lv = level(difficulty)
    const picked = rng.pick(numericFields(d))
    const numF = forceNumField ? field(d, forceNumField) : picked
    const catF = field(d, d.categoryField)
    const src = conditionSources(d, numF, catF)
    const n = condNames(d, numF, catF)
    const leaves = makeLeaves(rng, d, 6)
    const sorted = [...leaves].map((l) => l[numF.name] as number).sort((a, b) => a - b)
    const umbral = sorted[2] // la mitad cumple
    const cat = leaves[rng.int(0, leaves.length - 1)][catF.name] as string
    const mayor = (l: LeafData) => (l[numF.name] as number) > umbral
    const igual = (l: LeafData) => l[catF.name] === cat
    const cMayor = `new ${n.mayor}(${lit(umbral, numF)})`
    const cIgual = `new ${n.igual}(${JSON.stringify(cat)})`
    const check = (expr: string, pred: (l: LeafData) => boolean, label: string): TestCase[] =>
      leaves.slice(0, 4).map((l, i) => ({ id: `${label}-${i}`, name: `${label}: ${l.nombre}`, body: `Condicion c = ${expr};\neq(${pred(l)}, c.cumple(${newLeaf(d, l)}));` }))

    const student: JavaFile[] = [src.mayor, src.not]
    if (lv >= 1) student.push(src.igual, src.and, src.or)
    let tests: TestCase[] = [...check(cMayor, mayor, 'mayor'), ...check(`new CondicionNot(${cMayor})`, (l) => !mayor(l), 'not')]
    if (lv >= 1) tests = tests.concat(check(cIgual, igual, 'igual'), check(`new CondicionAnd(${cMayor}, ${cIgual})`, (l) => mayor(l) && igual(l), 'and'), check(`new CondicionOr(${cMayor}, ${cIgual})`, (l) => mayor(l) || igual(l), 'or'))
    if (lv >= 2) tests = tests.concat(check(`new CondicionAnd(new CondicionNot(${cIgual}), new CondicionOr(${cMayor}, new CondicionNot(${cMayor})))`, (l) => !igual(l), 'compuesta'))
    const support: JavaFile[] = [{ name: `${d.leaf}.java`, content: leafSource(d), readonly: true }, { ...src.iface, readonly: true }]
    if (lv < 1) support.push({ ...src.igual, readonly: true })
    const list = [`**${n.mayor}**: se cumple si ${numF.label} es estrictamente mayor que un umbral recibido en el constructor.`, `**CondicionNot**: niega otra condición.`]
    if (lv >= 1) list.push(`**${n.igual}**: se cumple si ${catF.label} es igual a un valor dado.`, `**CondicionAnd** y **CondicionOr**: combinan dos condiciones cualesquiera (que a su vez pueden ser compuestas).`)
    return {
      id: idOf('conditions', d, difficulty, req.seed), seed: req.seed, templateId: 'conditions',
      title: `Condiciones combinables sobre ${d.leafPlural}`,
      domain: d.name,
      statement: `Para filtrar ${d.leafPlural} se usa la interfaz **Condicion** con el método \`boolean cumple(${d.leaf} x)\`.\n\nImplementá:\n\n${list.map((x) => `- ${x}`).join('\n')}\n\nLas combinaciones deben funcionar con cualquier Condicion, sin conocer su clase concreta.`,
      concepts: ['condiciones', 'interfaces', 'polimorfismo'],
      difficulty, format: 'code-fragment',
      supportFiles: support,
      starterCode: student.map((f) => skeleton(f, d.leaf)),
      requirements: [
        { id: 'interfaz', description: 'Las combinaciones reciben Condicion (no tipos concretos)', check: { pattern: 'Condicion\\s+\\w+\\s*[;,)]', mustMatch: true } },
        { id: 'no-string-eq', description: 'Strings comparados con equals', check: { pattern: `${getter(catF.name)}\\(\\)\\s*[!=]=`, mustMatch: false } },
        NO_INSTANCEOF,
      ],
      visibleTests: tests.filter((_, i) => i % 4 === 0),
      hiddenTests: tests.filter((_, i) => i % 4 !== 0),
      referenceSolution: student,
      rubric: DEFAULT_RUBRIC,
      hints: [
        { level: 1, text: 'Cada combinación guarda las condiciones que combina como atributos de tipo Condicion.' },
        { level: 2, text: 'cumple de CondicionAnd delega: c1.cumple(x) && c2.cumple(x).' },
        { level: 3, text: 'Como las combinaciones también son Condicion, se pueden anidar: new CondicionAnd(new CondicionNot(a), b).' },
      ],
      explanation: 'Las condiciones son objetos que implementan una misma interfaz. And/Or/Not son a su vez condiciones que contienen otras: es un Composite de condiciones. El cliente arma filtros arbitrarios sin agregar métodos nuevos a las clases del dominio.',
    }
}

// =====================================================================
// COMPOSITE: búsqueda
// =====================================================================
export const searchTemplate: ExerciseTemplate = {
  id: 'composite-search',
  title: 'Composite con búsqueda',
  description: 'Buscar recursivamente los elementos que cumplen una condición.',
  concepts: ['composite-busqueda', 'composite', 'condiciones'],
  formats: ['code-fragment'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    const { rng, d, difficulty } = setup(req)
    const lv = level(difficulty)
    const numF = field(d, d.sumField)
    const catF = field(d, d.categoryField)
    const src = conditionSources(d, numF, catF)
    const n = condNames(d, numF, catF)
    const leaves = makeLeaves(rng, d, 5 + lv * 2)
    const tree = makeTree(rng, d, leaves, 1 + lv)
    const { code, rootVar } = treeBuilder(d, tree)
    const sortedVals = leaves.map((l) => l[numF.name] as number).sort((a, b) => a - b)
    const umbral = sortedVals[Math.floor(sortedVals.length / 2)]
    const cat = leaves[0][catF.name] as string
    const all = leavesOf(tree)
    const namesWhere = (p: (l: LeafData) => boolean) => all.filter(p).map((l) => l.nombre as string).sort(cmp)
    const searchBody = (cond: string, p: (l: LeafData) => boolean) =>
      `${code}\nList<${d.leaf}> r = ${rootVar}.buscar(${cond});\nList<String> nombres = new ArrayList<>();\nfor (${d.leaf} x : r) nombres.add(x.getNombre());\nnombres.sort(null);\neq(${javaStringList(namesWhere(p))}, nombres);`
    const base = baseSource(d, [`public abstract String getNombre();`, `public abstract List<${d.leaf}> buscar(Condicion c);`])
    const tests: TestCase[] = [
      { id: 'hoja-cumple', name: 'Una hoja que cumple se devuelve a sí misma', body: `${d.leaf} h = ${newLeaf(d, leaves[0])};\neq(1, h.buscar(new ${n.igual}(${JSON.stringify(cat)})).size());` },
      { id: 'vacio', name: 'Buscar en un compuesto vacío devuelve lista vacía', body: `eq(0, new ${d.composite}("v").buscar(new ${n.mayor}(${lit(0, numF)})).size());` },
      { id: 'mayor', name: `Busca ${d.leafPlural} con ${numF.label} > ${umbral}`, body: searchBody(`new ${n.mayor}(${lit(umbral, numF)})`, (l) => (l[numF.name] as number) > umbral) },
      { id: 'igual', name: `Busca ${d.leafPlural} con ${catF.label} = ${cat}`, body: searchBody(`new ${n.igual}(${JSON.stringify(cat)})`, (l) => l[catF.name] === cat) },
      { id: 'ninguno', name: 'Ningún elemento cumple', body: searchBody(`new ${n.mayor}(${lit(sortedVals[sortedVals.length - 1], numF)})`, () => false) },
      { id: 'no-alias', name: 'Modificar la lista devuelta no altera la estructura', body: `${code}\nList<${d.leaf}> r = ${rootVar}.buscar(new ${n.mayor}(${lit(numF.range![0] - 1, numF)}));\nr.clear();\neq(${all.length}, ${rootVar}.buscar(new ${n.mayor}(${lit(numF.range![0] - 1, numF)})).size());` },
    ]
    const leafExtra = `    @Override\n    public List<${d.leaf}> buscar(Condicion c) {\n        List<${d.leaf}> res = new ArrayList<>();\n        if (c.cumple(this)) {\n            res.add(this);\n        }\n        return res;\n    }`
    const compSol = `import java.util.*;\n\npublic class ${d.composite} extends ${d.base} {\n    private final String nombre;\n    private final List<${d.base}> elementos = new ArrayList<>();\n\n    public ${d.composite}(String nombre) {\n        this.nombre = nombre;\n    }\n\n    public void agregar(${d.base} e) {\n        elementos.add(e);\n    }\n\n    @Override\n    public String getNombre() {\n        return nombre;\n    }\n\n    @Override\n    public List<${d.leaf}> buscar(Condicion c) {\n        List<${d.leaf}> res = new ArrayList<>();\n        for (${d.base} e : elementos) {\n            res.addAll(e.buscar(c));\n        }\n        return res;\n    }\n}\n`
    const leafSol = leafSource(d, { extendsBase: true, overrideGetters: ['nombre'], extra: leafExtra })
    return {
      id: idOf('composite-search', d, difficulty, req.seed), seed: req.seed, templateId: 'composite-search',
      title: `Buscar ${d.leafPlural} en ${d.compositePlural} anidados`,
      domain: d.name,
      statement: `Un **${d.composite}** contiene ${d.leafPlural} y otros ${d.compositePlural}. Se quiere obtener todos los ${d.leafPlural} de la estructura que cumplen una **Condicion** cualquiera.\n\nImplementá \`List<${d.leaf}> buscar(Condicion c)\` en **${d.leaf}** y en **${d.composite}** (también el constructor y \`agregar\` del compuesto). La lista devuelta debe ser nueva: modificarla no puede alterar la estructura.\n\nYa están disponibles ${n.mayor} y ${n.igual}.`,
      concepts: ['composite-busqueda', 'composite', 'condiciones'],
      difficulty, format: 'code-fragment',
      supportFiles: [
        { name: `${d.base}.java`, content: base, readonly: true },
        { ...src.iface, readonly: true }, { ...src.mayor, readonly: true }, { ...src.igual, readonly: true },
      ],
      starterCode: [
        { name: `${d.leaf}.java`, content: leafSol.replace(leafExtra, `    @Override\n    public List<${d.leaf}> buscar(Condicion c) {\n        // Completá\n        return null;\n    }`) },
        { name: `${d.composite}.java`, content: `import java.util.*;\n\npublic class ${d.composite} extends ${d.base} {\n    // Completá\n}\n` },
      ],
      requirements: [NO_INSTANCEOF, { id: 'base', description: `Los hijos se guardan como ${d.base}`, check: { file: `${d.composite}.java`, pattern: `List\\s*<\\s*${d.base}\\s*>`, mustMatch: true } }],
      visibleTests: tests.slice(0, 2),
      hiddenTests: tests.slice(2),
      referenceSolution: [{ name: `${d.leaf}.java`, content: leafSol }, { name: `${d.composite}.java`, content: compSol }],
      rubric: DEFAULT_RUBRIC,
      hints: [
        { level: 1, text: 'La hoja es el caso base: devuelve una lista con ella misma si cumple, o vacía.' },
        { level: 2, text: 'El compuesto junta (addAll) lo que devuelve cada hijo.' },
        { level: 3, text: 'Creá siempre una lista nueva en cada llamada; nunca devuelvas la lista interna.' },
      ],
      explanation: 'La búsqueda en un Composite es un recorrido recursivo: la hoja decide si se incluye y el compuesto concatena los resultados de sus hijos. La condición llega como parámetro (Strategy de filtrado), por lo que la misma búsqueda sirve para cualquier criterio.',
    }
  },
}

// =====================================================================
// COPIA PROFUNDA (filtrada)
// =====================================================================
function copyTree(n: Node, p: (l: LeafData) => boolean): Node | null {
  if (n.kind === 'leaf') return p(n.data) ? n : null
  const ch = n.children.map((c) => copyTree(c, p)).filter((x): x is Node => x !== null)
  return ch.length ? { ...n, children: ch } : null
}

export const deepCopyTemplate: ExerciseTemplate = {
  id: 'deep-copy',
  title: 'Copia profunda filtrada',
  description: 'Copiar un Composite sin aliasing, filtrando hojas y eliminando compuestos vacíos.',
  concepts: ['copia-profunda', 'composite', 'referencias'],
  formats: ['code-fragment'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    const { rng, d, difficulty } = setup(req)
    const lv = level(difficulty)
    const filtered = lv >= 1
    const numF = field(d, d.sumField)
    const catF = field(d, d.categoryField)
    const src = conditionSources(d, numF, catF)
    const n = condNames(d, numF, catF)
    const leaves = makeLeaves(rng, d, 6 + lv * 2)
    const tree = makeTree(rng, d, leaves, 2 + (lv >= 2 ? 1 : 0))
    const { code, rootVar, compVars } = treeBuilder(d, tree)
    const all = leavesOf(tree)
    const cat = leaves[1][catF.name] as string
    const pred = (l: LeafData) => l[catF.name] === cat
    const copied = copyTree(tree, filtered ? pred : () => true)
    const cnt = copied ? leavesOf(copied).length : 0
    const condArg = filtered ? `new ${n.igual}(${JSON.stringify(cat)})` : ''
    const sig = filtered ? `copia(Condicion c)` : 'copia()'
    const call = `copia(${condArg})`
    const tests: TestCase[] = [
      { id: 'hoja', name: `Copiar una hoja crea otro objeto con los mismos datos`, body: `${d.leaf} h = ${newLeaf(d, { ...leaves[1] })};\n${d.base} cp = h.${call};\ncheck(cp != h, "La copia es el mismo objeto");\neq(h.getNombre(), cp.getNombre());` },
      { id: 'cantidad', name: `La copia tiene ${cnt} ${d.leafPlural}`, body: `${code}\n${d.base} cp = ${rootVar}.${call};\n${cnt === 0 ? 'eq(null, cp);' : `eq(${cnt}, cp.getCantidad());`}` },
      { id: 'independiente', name: 'Modificar el original no modifica la copia', body: `${code}\n${d.base} cp = ${rootVar}.${call};\n${rootVar}.agregar(${newLeaf(d, leaves[1])});\n${cnt === 0 ? 'eq(null, cp);' : `eq(${cnt}, cp.getCantidad());`}` },
      { id: 'distinto-objeto', name: 'La copia de un compuesto es otro objeto', body: `${code}\ncheck(${rootVar}.${call} != ${rootVar}, "Se devolvió el mismo compuesto");` },
    ]
    if (filtered) {
      // un subcompuesto sin ninguna hoja que cumpla debe devolver null
      const emptyOne = [...compVars.entries()].find(([node]) => leavesOf(node).every((l) => !pred(l)))
      if (emptyOne) tests.push({ id: 'vacio-null', name: 'Un compuesto sin elementos que cumplan no se copia (null)', body: `${code}\neq(null, ${emptyOne[1]}.${call});` })
      tests.push({ id: 'ninguno', name: 'Si nada cumple, la copia es null', body: `${d.composite} c = new ${d.composite}("x");\n${all.filter((l) => !pred(l)).slice(0, 2).map((l) => `c.agregar(${newLeaf(d, l)});`).join('\n')}\neq(null, c.${call});` })
    }
    const baseMethods = [`public abstract String getNombre();`, `public abstract int getCantidad();`, `public abstract ${d.base} ${sig};`]
    const leafExtra = `    @Override\n    public int getCantidad() {\n        return 1;\n    }\n\n    @Override\n    public ${d.base} ${sig} {\n${filtered ? `        if (!c.cumple(this)) {\n            return null;\n        }\n` : ''}        return new ${d.leaf}(${d.fields.map((f) => f.name).join(', ')});\n    }`
    const compSol = `import java.util.*;\n\npublic class ${d.composite} extends ${d.base} {\n    private final String nombre;\n    private final List<${d.base}> elementos = new ArrayList<>();\n\n    public ${d.composite}(String nombre) {\n        this.nombre = nombre;\n    }\n\n    public void agregar(${d.base} e) {\n        elementos.add(e);\n    }\n\n    @Override\n    public String getNombre() {\n        return nombre;\n    }\n\n    @Override\n    public int getCantidad() {\n        int total = 0;\n        for (${d.base} e : elementos) {\n            total += e.getCantidad();\n        }\n        return total;\n    }\n\n    @Override\n    public ${d.base} ${sig} {\n        ${d.composite} nuevo = new ${d.composite}(nombre);\n        for (${d.base} e : elementos) {\n            ${d.base} hijo = e.${filtered ? 'copia(c)' : 'copia()'};\n${filtered ? `            if (hijo != null) {\n                nuevo.agregar(hijo);\n            }` : '            nuevo.agregar(hijo);'}\n        }\n${filtered ? '        if (nuevo.getCantidad() == 0) {\n            return null;\n        }\n' : ''}        return nuevo;\n    }\n}\n`
    const support: JavaFile[] = [{ name: `${d.base}.java`, content: baseSource(d, baseMethods), readonly: true }, { name: `${d.leaf}.java`, content: leafSource(d, { extendsBase: true, overrideGetters: ['nombre'], extra: leafExtra }), readonly: true }]
    if (filtered) support.push({ ...src.iface, readonly: true }, { ...src.igual, readonly: true })
    return {
      id: idOf('deep-copy', d, difficulty, req.seed), seed: req.seed, templateId: 'deep-copy',
      title: filtered ? `Copia filtrada de ${d.compositePlural}` : `Copia profunda de ${d.compositePlural}`,
      domain: d.name,
      statement: filtered
        ? `Implementá en **${d.composite}** el método \`${d.base} copia(Condicion c)\` que devuelve una **copia profunda** de la estructura que contiene sólo los ${d.leafPlural} que cumplen la condición.\n\n- Original y copia no deben compartir objetos.\n- Los ${d.compositePlural} que queden sin ${d.leafPlural} **no se incluyen**: su copia es \`null\`.\n- También implementá constructor, \`agregar\` y \`getCantidad()\` (cantidad de ${d.leafPlural}).\n\n${d.leaf} ya implementa su copia.`
        : `Implementá en **${d.composite}** el método \`${d.base} copia()\` que devuelve una **copia profunda** de toda la estructura: modificar el original después de copiar no debe afectar a la copia.\n\nTambién implementá constructor, \`agregar\` y \`getCantidad()\` (cantidad de ${d.leafPlural}). ${d.leaf} ya implementa su copia.`,
      concepts: ['copia-profunda', 'composite', 'referencias'],
      difficulty, format: 'code-fragment',
      supportFiles: support,
      starterCode: [{ name: `${d.composite}.java`, content: `import java.util.*;\n\npublic class ${d.composite} extends ${d.base} {\n    // Completá\n}\n` }],
      requirements: [
        NO_INSTANCEOF,
        { id: 'no-addall', description: 'No copiar la lista de hijos (eso sería copia superficial)', check: { pattern: 'addAll\\s*\\(\\s*(this\\.)?\\w+\\s*\\)|new\\s+ArrayList\\s*<[^>]*>\\s*\\(\\s*(this\\.)?elementos', mustMatch: false } },
      ],
      visibleTests: tests.slice(0, 2),
      hiddenTests: tests.slice(2),
      referenceSolution: [{ name: `${d.composite}.java`, content: compSol }],
      rubric: DEFAULT_RUBRIC,
      hints: [
        { level: 1, text: `Copiar la lista (new ArrayList<>(elementos)) comparte los hijos: es copia superficial.` },
        { level: 2, text: `Creá un ${d.composite} nuevo y agregale ${filtered ? 'copia(c)' : 'copia()'} de cada hijo.` },
        ...(filtered ? [{ level: 3 as const, text: 'Si un hijo devuelve null no lo agregues, y si al final el nuevo compuesto quedó vacío devolvé null.' }] : [{ level: 3 as const, text: 'Cada hijo sabe copiarse: la recursión resuelve la profundidad.' }]),
      ],
      explanation: 'La copia profunda recorre la estructura y crea objetos nuevos en cada nivel. Delegar copia() en cada hijo hace que hojas y compuestos se copien polimórficamente. Con filtro, null comunica "no hay nada que copiar" y permite podar compuestos vacíos.',
    }
  },
}

// =====================================================================
// STRATEGY
// =====================================================================
export const strategyTemplate: ExerciseTemplate = {
  id: 'strategy',
  title: 'Strategy intercambiable',
  description: 'Encapsular reglas de cálculo variables y cambiarlas en tiempo de ejecución.',
  concepts: ['strategy', 'interfaces', 'polimorfismo'],
  formats: ['code-fragment'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    const { rng, d, difficulty } = setup(req)
    const lv = level(difficulty)
    const nums = rng.shuffle(numericFields(d).filter((f) => f.type === 'int'))
    const a = nums[0] ?? numericFields(d)[0]
    const b = nums[1] ?? a
    const factor = rng.int(2, 4)
    const tope = rng.int(Math.floor((a.range![0] + a.range![1]) / 3), Math.floor((a.range![0] + a.range![1]) / 2))
    type S = { name: string; desc: string; java: string; ts: (l: LeafData) => number }
    const strategies: S[] = [
      { name: `Puntaje${cap(a.name)}`, desc: `el puntaje es ${a.label}`, java: `x.${getter(a.name)}()`, ts: (l) => l[a.name] as number },
      { name: `PuntajeMultiplicado`, desc: `el puntaje es ${a.label} multiplicado por ${factor}`, java: `x.${getter(a.name)}() * ${factor}`, ts: (l) => (l[a.name] as number) * factor },
    ]
    if (lv >= 1 && b !== a) strategies.push({ name: `PuntajeCombinado`, desc: `el puntaje es ${a.label} + ${b.label}`, java: `x.${getter(a.name)}() + x.${getter(b.name)}()`, ts: (l) => (l[a.name] as number) + (l[b.name] as number) })
    if (lv >= 2) strategies.push({ name: `PuntajeConTope`, desc: `el puntaje es ${a.label}, pero nunca más de ${tope}`, java: `Math.min(x.${getter(a.name)}(), ${tope})`, ts: (l) => Math.min(l[a.name] as number, tope) })
    const leaves = makeLeaves(rng, d, 4)
    const total = (s: S) => leaves.reduce((acc, l) => acc + s.ts(l), 0)
    const iface: JavaFile = { name: 'CriterioPuntaje.java', content: `public interface CriterioPuntaje {\n    int calcular(${d.leaf} x);\n}\n`, readonly: true }
    const stratFile = (s: S): JavaFile => ({ name: `${s.name}.java`, content: `public class ${s.name} implements CriterioPuntaje {\n    @Override\n    public int calcular(${d.leaf} x) {\n        return ${s.java};\n    }\n}\n` })
    const evalSol = `import java.util.*;\n\npublic class Evaluador {\n    private CriterioPuntaje criterio;\n\n    public Evaluador(CriterioPuntaje criterio) {\n        this.criterio = criterio;\n    }\n\n    public void setCriterio(CriterioPuntaje criterio) {\n        this.criterio = criterio;\n    }\n\n    public int puntaje(${d.leaf} x) {\n        return criterio.calcular(x);\n    }\n\n    public int puntajeTotal(List<${d.leaf}> lista) {\n        int total = 0;\n        for (${d.leaf} x : lista) {\n            total += criterio.calcular(x);\n        }\n        return total;\n    }\n}\n`
    const listJava = `List<${d.leaf}> lista = List.of(${leaves.map((l) => newLeaf(d, l)).join(', ')});`
    const tests: TestCase[] = strategies.map((s, i) => ({ id: `s${i}`, name: `${s.name} sobre ${leaves[0].nombre}`, body: `eq(${s.ts(leaves[0])}, new ${s.name}().calcular(${newLeaf(d, leaves[0])}));` }))
    tests.push(
      { id: 'total', name: 'puntajeTotal con el criterio inicial', body: `${listJava}\nEvaluador e = new Evaluador(new ${strategies[0].name}());\neq(${total(strategies[0])}, e.puntajeTotal(lista));` },
      { id: 'cambio', name: 'Cambiar el criterio en tiempo de ejecución', body: `${listJava}\nEvaluador e = new Evaluador(new ${strategies[0].name}());\ne.setCriterio(new ${strategies[strategies.length - 1].name}());\neq(${total(strategies[strategies.length - 1])}, e.puntajeTotal(lista));` },
    )
    const student = [...strategies.map(stratFile), { name: 'Evaluador.java', content: evalSol }]
    return {
      id: idOf('strategy', d, difficulty, req.seed), seed: req.seed, templateId: 'strategy',
      title: `Strategy: criterios de puntaje para ${d.leafPlural}`,
      domain: d.name,
      statement: `Un **Evaluador** calcula el puntaje de ${d.leafPlural} según un **CriterioPuntaje** que puede cambiarse en cualquier momento (\`setCriterio\`).\n\nImplementá los criterios:\n\n${strategies.map((s) => `- **${s.name}**: ${s.desc}.`).join('\n')}\n\nY el **Evaluador** con constructor (recibe el criterio inicial), \`setCriterio\`, \`int puntaje(${d.leaf} x)\` e \`int puntajeTotal(List<${d.leaf}> lista)\`.`,
      concepts: ['strategy', 'interfaces', 'polimorfismo'],
      difficulty, format: 'code-fragment',
      supportFiles: [{ name: `${d.leaf}.java`, content: leafSource(d), readonly: true }, iface],
      starterCode: student.map((f) => ({ name: f.name, content: f.name === 'Evaluador.java' ? `import java.util.*;\n\npublic class Evaluador {\n    // Completá\n}\n` : f.content.replace(/return [^;]+;/, 'return 0; // Completá') })),
      requirements: [
        { id: 'campo-interfaz', description: 'Evaluador guarda el criterio como CriterioPuntaje', check: { file: 'Evaluador.java', pattern: 'CriterioPuntaje\\s+criterio', mustMatch: true } },
        { id: 'sin-ifs', description: 'El Evaluador no decide con if/switch qué fórmula usar', check: { file: 'Evaluador.java', pattern: '\\bswitch\\b|instanceof', mustMatch: false } },
      ],
      visibleTests: tests.slice(0, 2),
      hiddenTests: tests.slice(2),
      referenceSolution: student,
      rubric: DEFAULT_RUBRIC,
      hints: [
        { level: 1, text: 'Cada fórmula es una clase que implementa CriterioPuntaje.' },
        { level: 2, text: 'El Evaluador no conoce las clases concretas: sólo llama criterio.calcular(x).' },
        { level: 3, text: 'setCriterio reemplaza el objeto estrategia; no hace falta crear otro Evaluador.' },
      ],
      explanation: 'Strategy encapsula cada algoritmo en un objeto con una interfaz común. El contexto (Evaluador) delega en la estrategia actual, que puede cambiarse en ejecución. Agregar un criterio nuevo no modifica al Evaluador (abierto/cerrado).',
    }
  },
}

// =====================================================================
// DEBUGGING
// =====================================================================
export const debuggingTemplate: ExerciseTemplate = {
  id: 'debugging',
  title: 'Debugging: encontrar y corregir errores',
  description: 'Código con errores clásicos de parcial (==, restas en compare, copia superficial, colección expuesta).',
  concepts: ['identidad-igualdad', 'comparator', 'copia-profunda', 'exposicion'],
  formats: ['debugging'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    const { rng, d, difficulty } = setup(req)
    const dbl = numericFields(d).find((f) => f.type === 'double') ?? numericFields(d)[0]
    const leaves = makeLeaves(rng, d, 5)
    // fuerza valores double cercanos para que la resta truncada falle
    if (dbl.type === 'double') { leaves[0][dbl.name] = 10.2; leaves[1][dbl.name] = 10.6; leaves[2][dbl.name] = 10.4 }
    const sortedNames = [...leaves].sort((x, y) => cmp(x[dbl.name], y[dbl.name]) || cmp(x.nombre, y.nombre)).map((l) => l.nombre as string)
    const regName = `Registro${d.leaf}s`
    const buggy = `import java.util.*;

public class ${regName} {
    private List<${d.leaf}> lista = new ArrayList<>();

    public void agregar(${d.leaf} x) {
        lista.add(x);
    }

    public List<${d.leaf}> getLista() {
        return lista;
    }

    public ${d.leaf} buscarPorNombre(String nombre) {
        for (${d.leaf} x : lista) {
            if (x.getNombre() == nombre) {
                return x;
            }
        }
        return null;
    }

    public List<${d.leaf}> ordenadosPor${cap(dbl.name)}() {
        List<${d.leaf}> res = new ArrayList<>(lista);
        res.sort(new Comparator<${d.leaf}>() {
            public int compare(${d.leaf} a, ${d.leaf} b) {
                return (int) (a.${getter(dbl.name)}() - b.${getter(dbl.name)}());
            }
        });
        return res;
    }
}
`
    const fixed = buggy
      .replace(`return lista;`, `return new ArrayList<>(lista);`)
      .replace(`x.getNombre() == nombre`, `x.getNombre().equals(nombre)`)
      .replace(`return (int) (a.${getter(dbl.name)}() - b.${getter(dbl.name)}());`, `int r = ${dbl.type === 'double' ? 'Double' : 'Integer'}.compare(a.${getter(dbl.name)}(), b.${getter(dbl.name)}());\n                return r != 0 ? r : a.getNombre().compareTo(b.getNombre());`)
      .replace('private List', 'private final List')
    const setupJava = `${regName} r = new ${regName}();\n${leaves.map((l) => `r.agregar(${newLeaf(d, l)});`).join('\n')}`
    const tests: TestCase[] = [
      { id: 'buscar', name: 'buscarPorNombre con un String construido en ejecución', body: `${setupJava}\nString n = new String(${JSON.stringify(leaves[2].nombre)});\ncheck(r.buscarPorNombre(n) != null, "No encontró a " + n);` },
      { id: 'encapsulamiento', name: 'getLista no permite modificar el registro', body: `${setupJava}\nr.getLista().clear();\neq(${leaves.length}, r.getLista().size());` },
      { id: 'orden', name: `Ordena por ${dbl.label} (desempate por nombre)`, body: `${setupJava}\nList<String> n = new ArrayList<>();\nfor (${d.leaf} x : r.ordenadosPor${cap(dbl.name)}()) n.add(x.getNombre());\neq(${javaStringList(sortedNames)}, n);` },
    ]
    return {
      id: idOf('debugging', d, difficulty, req.seed), seed: req.seed, templateId: 'debugging',
      title: `Debugging: registro de ${d.leafPlural}`,
      domain: d.name,
      statement: `La clase **${regName}** compila pero tiene **tres errores** típicos de parcial. Para cada uno: detectalo, clasificalo (error funcional / mala práctica), explicá por qué falla y corregilo.\n\nComportamiento esperado:\n- \`buscarPorNombre\` encuentra un ${d.leaf} por nombre aunque el String sea otro objeto.\n- \`getLista\` no debe permitir modificar el registro desde afuera.\n- \`ordenadosPor${cap(dbl.name)}\` ordena de menor a mayor ${dbl.label}; a igualdad, alfabéticamente por nombre.\n\nUsá **Analizar** para ver qué detecta el analizador.`,
      concepts: ['identidad-igualdad', 'comparator', 'exposicion'],
      difficulty, format: 'debugging',
      supportFiles: [{ name: `${d.leaf}.java`, content: leafSource(d), readonly: true }],
      starterCode: [{ name: `${regName}.java`, content: buggy }],
      requirements: [
        { id: 'equals', description: 'Comparar Strings con equals', check: { pattern: 'getNombre\\(\\)\\s*==', mustMatch: false } },
        NO_SUBTRACTION,
        { id: 'copia', description: 'getLista devuelve una copia o vista no modificable', check: { pattern: 'return\\s+(this\\.)?lista\\s*;', mustMatch: false } },
      ],
      visibleTests: tests.slice(0, 1),
      hiddenTests: tests.slice(1),
      referenceSolution: [{ name: `${regName}.java`, content: fixed }],
      rubric: DEFAULT_RUBRIC,
      hints: [
        { level: 1, text: 'Uno de los errores es de identidad vs igualdad.' },
        { level: 2, text: `Restar ${dbl.type === 'double' ? 'doubles y castear a int trunca diferencias menores a 1' : 'enteros puede desbordar'}.` },
        { level: 3, text: 'Devolver la lista interna crea un alias: el cliente puede vaciarla.' },
      ],
      explanation: '1) == compara referencias: con Strings creados en ejecución falla (error funcional). 2) La resta en compare trunca/desborda: usar Double.compare/Integer.compare (error funcional y mala práctica). 3) getLista expone la colección interna (mala práctica de encapsulamiento, aliasing).',
    }
  },
}

// =====================================================================
// EXAMEN INTEGRADOR
// =====================================================================
export const examTemplate: ExerciseTemplate = {
  id: 'exam',
  title: 'Examen integrador',
  description: 'Composite + condiciones + copia filtrada + Comparator, con tests ocultos y tiempo límite.',
  concepts: ['composite', 'condiciones', 'copia-profunda', 'comparator', 'composite-busqueda'],
  formats: ['exam'],
  domains: DOMAINS.map((d) => d.id),
  generate(req) {
    const r = { ...req, difficulty: 'advanced' as Difficulty }
    const { d: md } = setup(req)
    // Una sola jerarquía: búsqueda + copia filtrada sobre la misma estructura.
    const conds = generateConditions({ ...r, domain: md.id, difficulty: 'intermediate' }, md.sumField)
    const comp = comparatorTemplate.generate({ ...r, domain: md.id, difficulty: 'intermediate', seed: req.seed + 7 })
    const search = searchTemplate.generate({ ...r, domain: md.id })
    const copy = deepCopyTemplate.generate({ ...r, domain: md.id, difficulty: 'intermediate' })
    const critText = comp.statement.match(/\*\*([^*]+)\.\*\*\n\nSólo/)?.[1] ?? comp.title
    // Fusionar: la base de examen declara buscar + copia + getCantidad.
    const numF = field(md, md.sumField)
    const catF = field(md, md.categoryField)
    const src = conditionSources(md, numF, catF)
    const base = baseSource(md, [`public abstract String getNombre();`, `public abstract int getCantidad();`, `public abstract List<${md.leaf}> buscar(Condicion c);`, `public abstract ${md.base} copia(Condicion c);`])
    const leafSol = (search.referenceSolution[0].content)
      .replace(/\n    @Override\n    public String toString/, `\n    @Override\n    public int getCantidad() {\n        return 1;\n    }\n\n    @Override\n    public ${md.base} copia(Condicion c) {\n        if (!c.cumple(this)) {\n            return null;\n        }\n        return new ${md.leaf}(${md.fields.map((f) => f.name).join(', ')});\n    }\n\n    @Override\n    public String toString`)
    const compSol = copy.referenceSolution[0].content.replace(/\n}\n$/, `\n\n    @Override\n    public List<${md.leaf}> buscar(Condicion c) {\n        List<${md.leaf}> res = new ArrayList<>();\n        for (${md.base} e : elementos) {\n            res.addAll(e.buscar(c));\n        }\n        return res;\n    }\n}\n`)
    const tests = [
      ...search.hiddenTests.concat(search.visibleTests ?? []).filter((t) => t.id !== 'hoja-cumple').map((t) => ({ ...t, id: 'busq-' + t.id })),
      ...copy.hiddenTests.concat(copy.visibleTests ?? []).map((t) => ({ ...t, id: 'copia-' + t.id })),
      ...(conds.hiddenTests.filter((t) => /^(and|or)-/.test(t.id)).slice(0, 4)).map((t) => ({ ...t, id: 'cond-' + t.id })),
      ...comp.hiddenTests.map((t) => ({ ...t, id: 'comp-' + t.id })),
    ]
    const compFile = comp.referenceSolution[0]
    const solution: JavaFile[] = [
      { name: `${md.leaf}.java`, content: leafSol },
      { name: `${md.composite}.java`, content: compSol },
      conds.referenceSolution.find((f) => f.name === 'CondicionAnd.java')!,
      conds.referenceSolution.find((f) => f.name === 'CondicionOr.java')!,
      compFile,
    ]
    const condN = condNames(md, numF, catF)
    // Los tests de condiciones/comparador usan la hoja sin herencia: con extends siguen compilando.
    return {
      id: idOf('exam', md, 'exam', req.seed), seed: req.seed, templateId: 'exam',
      title: `Examen integrador: ${md.name}`,
      domain: md.name,
      statement: `**Examen integrador — ${md.name}.** Tiempo sugerido: 120 minutos. Los tests son ocultos: la corrección se muestra al entregar.\n\nUna empresa administra ${md.compositePlural} que agrupan ${md.leafPlural} y otros ${md.compositePlural} (anidamiento ilimitado). De cada ${md.leaf} se conoce: ${md.fields.map((f) => f.label).join(', ')}.\n\n1. **Estructura (Composite)**: implementá ${md.leaf} y ${md.composite} extendiendo ${md.base}. \`getCantidad()\` devuelve la cantidad de ${md.leafPlural}.\n2. **Búsqueda**: \`buscar(Condicion c)\` devuelve una lista nueva con los ${md.leafPlural} que cumplen.\n3. **Condiciones**: ya existen ${condN.mayor} y ${condN.igual}. Implementá **CondicionAnd** y **CondicionOr** para combinarlas.\n4. **Copia filtrada**: \`copia(Condicion c)\` devuelve una copia profunda con sólo los ${md.leafPlural} que cumplen; los ${md.compositePlural} vacíos no se copian (null).\n5. **Orden**: implementá **${compFile.name.replace('.java', '')}** (Comparator<${md.leaf}>): ${critText}.\n\nJustificá mentalmente cada decisión: ¿qué clase es responsable de cada cálculo? ¿dónde está la recursión?`,
      concepts: ['composite', 'composite-busqueda', 'condiciones', 'copia-profunda', 'comparator'],
      difficulty: 'exam', format: 'exam',
      timeLimitMinutes: 120,
      supportFiles: [{ name: `${md.base}.java`, content: base, readonly: true }, { ...src.iface, readonly: true }, { ...src.mayor, readonly: true }, { ...src.igual, readonly: true }],
      starterCode: solution.map((f) => ({ name: f.name, content: f.name.startsWith('Comparador') ? comp.starterCode![0].content : f.name === `${md.leaf}.java` ? leafSource(md, { extendsBase: true, overrideGetters: ['nombre'], extra: '    // Completá los métodos abstractos' }) : `import java.util.*;\n\npublic class ${f.name.replace('.java', '')}${f.name.startsWith('Condicion') ? ' implements Condicion' : ` extends ${md.base}`} {\n    // Completá\n}\n` })),
      requirements: [NO_INSTANCEOF, NO_SUBTRACTION, { id: 'no-alias', description: 'Ningún método devuelve la lista interna', check: { pattern: 'return\\s+(this\\.)?elementos\\s*;', mustMatch: false } }],
      visibleTests: [],
      hiddenTests: tests,
      referenceSolution: solution,
      rubric: { items: [{ id: 'tests', description: 'Tests ocultos', points: 70, kind: 'tests' }, { id: 'req', description: 'Requisitos de diseño', points: 15, kind: 'requirements' }, { id: 'analysis', description: 'Buenas prácticas', points: 15, kind: 'analysis' }] },
      hints: [],
      explanation: [search.explanation, copy.explanation, conds.explanation, comp.explanation].join('\n\n'),
    }
  },
}

export const TEMPLATES: ExerciseTemplate[] = [comparatorTemplate, compositeMetricTemplate, conditionsTemplate, searchTemplate, deepCopyTemplate, strategyTemplate, debuggingTemplate, examTemplate]
export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id)
export type { Hint }
