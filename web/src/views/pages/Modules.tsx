import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CONCEPTS, UNITS } from '../../data/concepts'
import { LESSONS } from '../../data/lessons'
import { QUIZZES } from '../../data/quizzes'
import { Page } from '../components/ui'
import { useProgress } from '../useProgress'

const MASTERY = { unseen: { l: 'Sin practicar', c: 'var(--muted)' }, weak: { l: 'Débil', c: 'var(--err)' }, learning: { l: 'En progreso', c: 'var(--accent)' }, mastered: { l: 'Dominado', c: 'var(--ok)' } }

export function Modules() {
  const p = useProgress()
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }) }, [hash])
  return (
    <Page title="Módulos" subtitle="Contenidos del programa organizados por unidad. Cada lección enlaza a su quiz, animaciones y ejercicios.">
      <div className="space-y-6">
        {UNITS.map((u, i) => (
          <section key={u.id} id={u.id} className="card p-5 scroll-mt-20" aria-labelledby={`${u.id}-t`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`${u.id}-t`} className="text-lg font-semibold">Unidad {i + 1}: {u.title}</h2>
              {QUIZZES.filter((q) => q.unit === u.id).map((q) => <Link key={q.id} to={`/quiz/${q.id}`} className="btn btn-sm">Quiz de la unidad</Link>)}
            </div>
            <p className="muted text-sm mt-1">{u.description}</p>
            <div className="grid gap-3 sm:grid-cols-2 mt-4">
              {LESSONS.filter((l) => l.unit === u.id).map((l) => (
                <Link key={l.id} to={`/leccion/${l.id}`} className="rounded-lg border p-3 hover:border-[var(--accent)]" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs muted mt-1">{l.concepts.length} conceptos{l.animationIds?.length ? ` · ${l.animationIds.length} animación(es)` : ''}{l.exerciseIds?.length ? ` · ${l.exerciseIds.length} ejercicio(s)` : ''}</div>
                </Link>
              ))}
            </div>
            <details className="mt-4">
              <summary className="text-sm cursor-pointer muted">Conceptos de la unidad y tu nivel</summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-sm">
                {CONCEPTS.filter((c) => c.unit === u.id).map((c) => {
                  const m = MASTERY[p?.conceptStats[c.id]?.mastery ?? 'unseen']
                  return (
                    <li key={c.id} className="flex items-start gap-2 py-1">
                      <span className="mt-1.5 inline-block w-2 h-2 rounded-full shrink-0" style={{ background: m.c }} aria-hidden="true" />
                      <span><span className="font-medium">{c.name}</span> <span className="text-xs" style={{ color: m.c }}>({m.l})</span><br /><span className="muted text-xs">{c.summary}</span></span>
                    </li>
                  )
                })}
              </ul>
            </details>
          </section>
        ))}
      </div>
    </Page>
  )
}
