import { Link } from 'react-router-dom'
import { CONCEPTS, UNITS } from '../../data/concepts'
import { recommend } from '../../controllers/progress/progress'
import { Bar, Page } from '../components/ui'
import { Icon } from '../components/Icon'
import { daysUntil, useExamDate, useProgress } from '../useProgress'
import type { Recommendation } from '../../models/types'

export const recLink = (r: Recommendation) =>
  r.kind === 'exercise' ? `/ejercicio/${r.targetId}` : r.kind === 'lesson' ? `/leccion/${r.targetId}` : r.kind === 'quiz' ? `/quiz/${r.targetId}` : '/examen'

export function Dashboard() {
  const p = useProgress()
  const [examDate, setExamDate] = useExamDate()
  const days = daysUntil(examDate)
  if (!p) return null
  const stats = Object.values(p.conceptStats)
  const mastered = stats.filter((s) => s.mastery === 'mastered').length
  const recs = recommend(p, { daysToExam: days !== undefined && days >= 0 ? days : undefined })
  const unitPct = (u: string) => {
    const cs = CONCEPTS.filter((c) => c.unit === u)
    return cs.reduce((s, c) => s + (p.conceptStats[c.id]?.avgScore ?? 0) * (p.conceptStats[c.id]?.attempts ? 1 : 0), 0) / cs.length
  }

  return (
    <Page title="Laboratorio de Programación 2" subtitle="POO en Java para TUDAI: teoría breve, práctica por tema, ejercicios generados, análisis de código y simulacros de examen.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Ejercicios resueltos" value={p.solvedExercises.length} />
        <Stat label="Tests aprobados" value={`${p.testsPassed}/${p.testsTotal}`} />
        <Stat label="Conceptos dominados" value={`${mastered}/${CONCEPTS.length}`} />
        <div className="card p-4">
          <label htmlFor="exam-date" className="text-xs muted">Fecha del examen</label>
          <input id="exam-date" type="date" className="input w-full mt-1" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          {days !== undefined && <p className="text-xs mt-1 muted">{days >= 0 ? `Faltan ${days} días` : 'La fecha ya pasó'}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 card p-5" aria-labelledby="rec-title">
          <h2 id="rec-title" className="font-semibold mb-3">Próximos pasos recomendados</h2>
          <ul className="space-y-2">
            {recs.map((r) => (
              <li key={r.targetId}>
                <Link to={recLink(r)} className="flex items-start gap-3 rounded-lg p-3 border hover:bg-[var(--panel-2)]" style={{ borderColor: 'var(--border)' }}>
                  <Icon name={r.kind === 'lesson' ? 'book' : r.kind === 'quiz' ? 'check' : r.kind === 'generate' ? 'clock' : 'code'} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="font-medium block">{r.title}</span>
                    <span className="text-sm muted">{r.reason}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="units-title">
          <h2 id="units-title" className="font-semibold mb-3">Avance por unidad</h2>
          <ul className="space-y-3">
            {UNITS.map((u, i) => (
              <li key={u.id}>
                <Link to={`/modulos#${u.id}`} className="block">
                  <div className="flex justify-between text-sm mb-1"><span>{i + 1}. {u.title}</span><span className="muted">{Math.round(unitPct(u.id))}%</span></div>
                  <Bar value={unitPct(u.id)} label={`Avance en ${u.title}`} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Accesos rápidos">
        <Quick to="/ejercicio/comparator-pitufo-experiencia" title="Practicar un Comparator" text="Completá sólo el compare." />
        <Quick to="/practicar" title="Practicar Composite" text="Métricas, búsqueda y copia profunda." />
        <Quick to="/analizador" title="Analizar mi código" text="Pegá código y detectá malas prácticas." />
        <Quick to="/animaciones" title="Ver animaciones" text="Binding dinámico, Composite, excepciones…" />
      </section>
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-xs muted">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  )
}

function Quick({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link to={to} className="card p-4 hover:border-[var(--accent)]">
      <div className="font-medium">{title}</div>
      <div className="text-sm muted mt-1">{text}</div>
    </Link>
  )
}
