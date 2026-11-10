import type { Exercise, ValidationIssue } from '../../models/types'

// CONTROLLER: valida coherencia de ejercicios (generados o escritos a mano).
// La verificación "la solución de referencia pasa todos los tests" se hace con
// javac real en reference.test.ts.

export function validateExercise(ex: Exercise): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (code: string, message: string) => issues.push({ code, message })
  const tests = [...(ex.visibleTests ?? []), ...ex.hiddenTests]

  if (!ex.statement || ex.statement.length < 40) add('enunciado-corto', 'El enunciado no permite deducir los requisitos.')
  if (tests.length === 0) add('sin-tests', 'El ejercicio no tiene tests.')
  if (ex.referenceSolution.length === 0) add('sin-solucion', 'Falta la solución de referencia.')
  const ids = tests.map((t) => t.id)
  if (new Set(ids).size !== ids.length) add('tests-duplicados', 'Hay tests con el mismo id.')
  const bodies = tests.map((t) => t.body)
  if (new Set(bodies).size !== bodies.length) add('tests-repetidos', 'Hay tests idénticos.')

  // Los tests sólo pueden usar clases que existen en el ejercicio (o del JDK).
  const files = [...(ex.supportFiles ?? []), ...ex.referenceSolution]
  const declared = new Set(files.flatMap((f) => [...f.content.matchAll(/(?:class|interface|enum)\s+(\w+)/g)].map((m) => m[1])))
  for (const t of tests) {
    for (const m of t.body.matchAll(/new\s+([A-Z]\w*)\s*\(/g)) {
      if (!declared.has(m[1]) && !['ArrayList', 'String', 'HashSet', 'LinkedList'].includes(m[1])) add('test-incoherente', `El test "${t.name}" usa la clase ${m[1]}, que no existe en el ejercicio.`)
    }
  }

  // Cada archivo editable tiene solución y viceversa.
  const starter = new Set((ex.starterCode ?? []).map((f) => f.name))
  for (const f of ex.referenceSolution) if (!starter.has(f.name)) add('solucion-sin-archivo', `La solución incluye ${f.name} que el alumno no puede editar.`)
  for (const f of ex.starterCode ?? []) if (!ex.referenceSolution.some((r) => r.name === f.name)) add('archivo-sin-solucion', `${f.name} no tiene solución de referencia.`)
  const support = new Set((ex.supportFiles ?? []).map((f) => f.name))
  for (const f of ex.starterCode ?? []) if (support.has(f.name)) add('archivo-duplicado', `${f.name} aparece como soporte y como editable.`)

  // Requisitos estructurales: la solución de referencia debe cumplirlos (si no, la regla es imposible o contradictoria).
  for (const r of ex.requirements) {
    if (!r.check) continue
    const re = new RegExp(r.check.pattern, r.check.flags ?? 'm')
    const target = r.check.file ? ex.referenceSolution.filter((f) => f.name === r.check!.file) : ex.referenceSolution
    const matches = target.some((f) => re.test(f.content))
    if (matches !== r.check.mustMatch) add('requisito-imposible', `La solución de referencia no cumple el requisito "${r.description}".`)
  }

  // El starter no debería pasar los requisitos "positivos" sin trabajo (si no, no evalúan nada) — sólo aviso.
  if (ex.difficulty !== 'exam' && (ex.visibleTests?.length ?? 0) === 0 && ex.format !== 'exam') add('sin-tests-visibles', 'Conviene al menos un test visible fuera del modo examen.')
  return issues
}

export function validateBatch(exs: Exercise[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Map<string, string>()
  for (const ex of exs) {
    const key = ex.statement + '|' + ex.hiddenTests.map((t) => t.body).join('|')
    if (seen.has(key)) issues.push({ code: 'duplicado', message: `${ex.id} es idéntico a ${seen.get(key)}` })
    else seen.set(key, ex.id)
  }
  return issues
}
