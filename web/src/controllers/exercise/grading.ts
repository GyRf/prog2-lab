import type { Diagnostic, Exercise, JavaFile, Requirement, TestResult } from '../../models/types'

// CONTROLLER: verificación de requisitos estructurales y puntuación por rúbrica.

export interface RequirementResult {
  requirement: Requirement
  ok: boolean | null // null = no verificable automáticamente
}

export function checkRequirements(ex: Exercise, files: JavaFile[]): RequirementResult[] {
  return ex.requirements.map((r) => {
    if (!r.check) return { requirement: r, ok: null }
    const re = new RegExp(r.check.pattern, r.check.flags ?? 'm')
    const target = r.check.file ? files.filter((f) => f.name === r.check!.file) : files
    // quitar comentarios para que un "// instanceof" no cuente
    const matches = target.some((f) => re.test(f.content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')))
    return { requirement: r, ok: matches === r.check.mustMatch }
  })
}

export interface ScoreBreakdown {
  total: number
  items: { id: string; description: string; earned: number; points: number; detail: string }[]
}

export function score(ex: Exercise, tests: TestResult[], reqs: RequirementResult[], diags: Diagnostic[], compiled: boolean): ScoreBreakdown {
  const items = ex.rubric.items.map((it) => {
    let ratio = 0
    let detail = ''
    if (it.kind === 'tests') {
      const ran = tests.filter((t) => t.status !== 'not-run')
      const pass = tests.filter((t) => t.status === 'pass').length
      ratio = compiled && tests.length ? pass / tests.length : 0
      detail = ran.length ? `${pass}/${tests.length} tests aprobados` : 'Tests no ejecutados'
    } else if (it.kind === 'requirements') {
      const checkable = reqs.filter((r) => r.ok !== null)
      const ok = checkable.filter((r) => r.ok).length
      ratio = checkable.length ? ok / checkable.length : 1
      detail = `${ok}/${checkable.length} requisitos cumplidos`
    } else {
      const errors = diags.filter((d) => d.severity === 'error').length
      const warnings = diags.filter((d) => d.severity === 'warning').length
      ratio = Math.max(0, 1 - errors * 0.5 - warnings * 0.25)
      detail = `${errors} errores, ${warnings} malas prácticas (las mejoras opcionales no restan)`
    }
    return { id: it.id, description: it.description, points: it.points, earned: Math.round(it.points * ratio * 10) / 10, detail }
  })
  return { total: Math.round(items.reduce((s, i) => s + i.earned, 0)), items }
}
