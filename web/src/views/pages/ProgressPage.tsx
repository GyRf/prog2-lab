import { Link } from 'react-router-dom'
import { CONCEPTS, UNITS, conceptName } from '../../data/concepts'
import { recommend } from '../../controllers/progress/progress'
import { useServices } from '../../services/AppServices'
import { Bar, DIFF_LABEL, Empty, Page } from '../components/ui'
import { daysUntil, useExamDate, useProgress } from '../useProgress'
import { recLink } from './Dashboard'

const MASTERY_LABEL = { unseen: 'Sin practicar', weak: 'Débil', learning: 'En progreso', mastered: 'Dominado' }

export function ProgressPage() {
  const p = useProgress()
  const { progress, userId, notifyProgress } = useServices()
  const [examDate] = useExamDate()
  if (!p) return null
  const stats = Object.values(p.conceptStats).filter((s) => s.attempts > 0)
  const weak = stats.filter((s) => s.mastery === 'weak' || s.mastery === 'learning').sort((a, b) => a.avgScore - b.avgScore)
  const mastered = stats.filter((s) => s.mastery === 'mastered')
  const history = [...p.attempts].reverse()
  const evolution = p.attempts.filter((a) => a.kind !== 'quiz').slice(-20)
  const days = daysUntil(examDate)
  const recs = recommend(p, { daysToExam: days !== undefined && days >= 0 ? days : undefined })

  return (
    <Page title="Mi progreso" subtitle="Se guarda en este navegador." actions={<button className="btn btn-sm" onClick={async () => { if (window.confirm('¿Borrar todo el progreso?')) { await progress.clear(userId); notifyProgress() } }}>Borrar progreso</button>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Ejercicios resueltos (≥70)" value={p.solvedExercises.length} />
        <Stat label="Intentos totales" value={p.attempts.length} />
        <Stat label="Tiempo promedio" value={p.avgTimeMs ? `${Math.round(p.avgTimeMs / 60000)} min` : '—'} />
        <Stat label="Dificultad recomendada" value={DIFF_LABEL[p.recommendedDifficulty]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Evolución de notas (últimas entregas)</h2>
          {evolution.length === 0 ? <Empty>Todavía no entregaste ejercicios.</Empty> : (
            <svg viewBox={`0 0 ${Math.max(evolution.length * 30, 60)} 110`} className="w-full h-36" role="img" aria-label={`Notas: ${evolution.map((a) => a.score).join(', ')}`}>
              <line x1="0" x2="100%" y1="30" y2="30" stroke="var(--border)" strokeDasharray="3 3" />
              {evolution.map((a, i) => (
                <g key={a.id}>
                  <rect x={i * 30 + 6} y={100 - a.score} width="18" height={a.score} rx="3" fill={a.score >= 70 ? 'var(--ok)' : a.score >= 40 ? 'var(--warn)' : 'var(--err)'}><title>{`${a.exerciseTitle}: ${a.score}`}</title></rect>
                </g>
              ))}
            </svg>
          )}
          <p className="text-xs muted mt-1">La línea punteada marca 70 (aprobado).</p>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-3">Próximos ejercicios</h2>
          <ul className="space-y-2">{recs.map((r) => <li key={r.targetId}><Link className="underline" to={recLink(r)}>{r.title}</Link><p className="text-xs muted">{r.reason}</p></li>)}</ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-3">Conceptos débiles</h2>
          {weak.length === 0 ? <Empty>Nada por ahora.</Empty> : <ul className="space-y-2">{weak.map((s) => <li key={s.concept}><div className="flex justify-between text-sm"><span>{conceptName(s.concept)}</span><span className="muted">{Math.round(s.avgScore)}% · {s.attempts} intento(s)</span></div><Bar value={s.avgScore} label={conceptName(s.concept)} /></li>)}</ul>}
          <h2 className="font-semibold mt-5 mb-2">Conceptos dominados</h2>
          {mastered.length === 0 ? <p className="text-sm muted">Ninguno todavía (≥80% en al menos 2 intentos).</p> : <div className="flex flex-wrap gap-1">{mastered.map((s) => <span key={s.concept} className="chip" style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}>{conceptName(s.concept)}</span>)}</div>}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-3">Errores y malas prácticas frecuentes</h2>
          {p.frequentIssues.length === 0 ? <Empty>Sin datos.</Empty> : <ul className="space-y-1 text-sm">{p.frequentIssues.map((i) => <li key={i.ruleId} className="flex justify-between"><span>{i.title}</span><span className="chip">{i.count}</span></li>)}</ul>}
          <p className="text-sm mt-4"><span className="muted">Tests aprobados en total:</span> <strong>{p.testsPassed}/{p.testsTotal}</strong></p>
        </section>
      </div>

      <section className="card p-5 mt-6">
        <h2 className="font-semibold mb-3">Mapa de conceptos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {UNITS.map((u) => (
            <div key={u.id}>
              <h3 className="text-sm font-medium mb-1">{u.title}</h3>
              <ul className="text-xs space-y-1">
                {CONCEPTS.filter((c) => c.unit === u.id).map((c) => { const s = p.conceptStats[c.id]; return <li key={c.id} className="flex justify-between gap-2"><span>{c.name}</span><span className="muted">{MASTERY_LABEL[s.mastery]}{s.attempts ? ` · ${Math.round(s.avgScore)}%` : ''}</span></li> })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 mt-6">
        <h2 className="font-semibold mb-3">Historial</h2>
        {history.length === 0 ? <Empty>Sin intentos.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left muted"><th className="py-1 pr-3 font-medium">Fecha</th><th className="pr-3 font-medium">Actividad</th><th className="pr-3 font-medium">Modo</th><th className="pr-3 font-medium">Nota</th><th className="font-medium">Tests</th></tr></thead>
              <tbody>
                {history.slice(0, 50).map((a) => (
                  <tr key={a.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(a.finishedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="pr-3">{a.kind === 'quiz' ? <Link className="underline" to={`/quiz/${a.exerciseId}`}>{a.exerciseTitle}</Link> : <Link className="underline" to={`/ejercicio/${a.exerciseId}`}>{a.exerciseTitle}</Link>}</td>
                    <td className="pr-3">{a.kind === 'quiz' ? 'Quiz' : a.mode === 'exam' ? 'Examen' : a.mode === 'tutor' ? 'Tutor' : 'Práctica'}</td>
                    <td className="pr-3 font-semibold">{a.score}</td>
                    <td>{a.testsTotal ? `${a.testsPassed}/${a.testsTotal}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="card p-4"><div className="text-xs muted">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div></div>
}
