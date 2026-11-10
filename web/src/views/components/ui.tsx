import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { conceptName } from '../../data/concepts'
import type { Diagnostic, Difficulty } from '../../models/types'
import { CATEGORY_LABEL, SEVERITY_LABEL } from '../../controllers/analysis/rules'

export function Page({ title, subtitle, actions, children, wide }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-[1600px]' : 'max-w-6xl'} px-4 sm:px-6 py-6`}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="muted mt-1 text-sm max-w-3xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export const DIFF_LABEL: Record<Difficulty, string> = { introductory: 'Introductorio', intermediate: 'Intermedio', advanced: 'Avanzado', exam: 'Examen' }

export function DifficultyBadge({ d }: { d: Difficulty }) {
  return <span className="chip">{DIFF_LABEL[d]}</span>
}

export function ConceptChips({ ids, max = 4 }: { ids: string[]; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ids.slice(0, max).map((c) => <span key={c} className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'transparent' }}>{conceptName(c)}</span>)}
    </div>
  )
}

export function Bar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: v >= 80 ? 'var(--ok)' : v >= 50 ? 'var(--accent)' : 'var(--warn)' }} />
    </div>
  )
}

const SEV_STYLE = {
  error: { bg: 'var(--err-soft)', fg: 'var(--err)' },
  warning: { bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  info: { bg: 'var(--info-soft)', fg: 'var(--info)' },
}

export function DiagnosticCard({ d, onGoto, compact }: { d: Diagnostic; onGoto?: (d: Diagnostic) => void; compact?: boolean }) {
  const s = SEV_STYLE[d.severity]
  return (
    <details className="rounded-lg border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }} open={!compact && d.severity === 'error'}>
      <summary className="cursor-pointer list-none p-2.5 flex items-start gap-2">
        <span className="chip shrink-0" style={{ background: s.bg, color: s.fg, borderColor: 'transparent' }}>{SEVERITY_LABEL[d.severity]}</span>
        <span className="min-w-0 flex-1">
          <span className="font-medium">{d.title}</span>
          <span className="muted text-xs block">
            {d.file ? `${d.file}:` : 'línea '}{d.line} · {CATEGORY_LABEL[d.category]} · {conceptName(d.concept)}
          </span>
        </span>
        {onGoto && <button type="button" className="btn btn-sm shrink-0" onClick={(e) => { e.preventDefault(); onGoto(d) }}>Ir</button>}
      </summary>
      <div className="px-3 pb-3 space-y-2">
        {d.code && <pre className="codeblock !text-xs !p-2">{d.code}</pre>}
        <p>{d.explanation}</p>
        <p><span className="font-medium">Por qué es un problema: </span><span className="muted">{d.why}</span></p>
        <p><span className="font-medium">Sugerencia: </span>{d.suggestion}</p>
        {d.fixedExample && <pre className="codeblock !text-xs !p-2" aria-label="Ejemplo corregido">{d.fixedExample}</pre>}
        <p className="text-xs muted">Concepto: <Link className="underline" to="/modulos">{conceptName(d.concept)}</Link></p>
      </div>
    </details>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm muted" style={{ borderColor: 'var(--border)' }}>{children}</div>
}
