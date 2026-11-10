import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listStaticExercises, genId } from '../../controllers/exercise/catalog'
import { randomSeed } from '../../controllers/generation/rng'
import { TEMPLATES } from '../../controllers/generation/templates'
import type { Difficulty } from '../../models/types'
import { ConceptChips, DIFF_LABEL, DifficultyBadge, Page } from '../components/ui'
import { useProgress } from '../useProgress'

export function PracticePage() {
  const nav = useNavigate()
  const p = useProgress()
  const [diff, setDiff] = useState<Difficulty>('introductory')
  const exs = listStaticExercises()
  return (
    <Page title="Práctica por tema" subtitle="Resolvé un tema aislado sin armar un sistema completo. Los ejercicios generados cambian datos, dominio y criterios en cada intento.">
      <section aria-labelledby="gen-t" className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 id="gen-t" className="text-lg font-semibold">Ejercicios generados</h2>
          <label className="text-sm flex items-center gap-2">Dificultad
            <select className="input" value={diff} onChange={(e) => setDiff(e.target.value as Difficulty)}>
              {(['introductory', 'intermediate', 'advanced'] as Difficulty[]).map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.filter((t) => t.id !== 'exam').map((t) => (
            <div key={t.id} className="card p-4 flex flex-col gap-2">
              <div className="font-medium">{t.title}</div>
              <p className="text-sm muted flex-1">{t.description}</p>
              <ConceptChips ids={t.concepts} max={3} />
              <button className="btn btn-primary self-start mt-1" onClick={() => {
                const domains = t.domains
                nav(`/ejercicio/${genId(t.id, domains[Math.floor(Math.random() * domains.length)], diff, randomSeed())}`)
              }}>Generar y resolver</button>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="fix-t">
        <h2 id="fix-t" className="text-lg font-semibold mb-3">Temas puntuales</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exs.map((e) => {
            const solved = p?.solvedExercises.includes(e.id)
            return (
              <Link key={e.id} to={`/ejercicio/${e.id}`} className="card p-4 flex flex-col gap-2 hover:border-[var(--accent)]">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{e.title}</span>
                  {solved && <span className="chip" style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}>Resuelto</span>}
                </div>
                <div className="flex flex-wrap gap-1 items-center"><DifficultyBadge d={e.difficulty} /><span className="chip">{e.format === 'debugging' ? 'Debugging' : 'Completar código'}</span></div>
                <ConceptChips ids={e.concepts} max={3} />
              </Link>
            )
          })}
        </div>
      </section>
    </Page>
  )
}
