import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DOMAINS } from '../../data/domains'
import { genId } from '../../controllers/exercise/catalog'
import { randomSeed } from '../../controllers/generation/rng'
import { TEMPLATES, templateById } from '../../controllers/generation/templates'
import { validateExercise } from '../../controllers/generation/validator'
import type { Difficulty, PracticeMode } from '../../models/types'
import { Markdown } from '../components/Markdown'
import { ConceptChips, DIFF_LABEL, DifficultyBadge, Page } from '../components/ui'

export function GeneratorPage({ examOnly = false }: { examOnly?: boolean }) {
  const nav = useNavigate()
  const [templateId, setTemplate] = useState(examOnly ? 'exam' : 'composite-metric')
  const [domain, setDomain] = useState('pitufos')
  const [difficulty, setDifficulty] = useState<Difficulty>(examOnly ? 'exam' : 'intermediate')
  const [seed, setSeed] = useState(() => randomSeed())
  const [mode, setMode] = useState<PracticeMode>(examOnly ? 'exam' : 'practice')
  const t = templateById(templateId)!
  const diff: Difficulty = templateId === 'exam' ? 'exam' : difficulty === 'exam' ? 'advanced' : difficulty
  const ex = useMemo(() => t.generate({ templateId, domain, difficulty: diff, seed }), [t, templateId, domain, diff, seed])
  const issues = useMemo(() => validateExercise(ex), [ex])
  const id = genId(templateId, domain, diff, seed)

  return (
    <Page
      title={examOnly ? 'Simulacro de examen integrador' : 'Generador de ejercicios'}
      subtitle={examOnly
        ? 'Enunciado similar en estructura a los de la materia, pero nuevo: Composite, búsqueda con condiciones, copia filtrada y Comparator. Sin feedback hasta entregar, tests ocultos y 120 minutos.'
        : 'Plantilla + dominio + dificultad + semilla. La misma semilla reproduce exactamente el mismo ejercicio; cambiala para obtener uno distinto pero coherente.'}
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <form className="card p-4 space-y-3 h-fit" onSubmit={(e) => { e.preventDefault(); nav(`/ejercicio/${id}?modo=${mode}`) }}>
          {!examOnly && (
            <label className="block text-sm">Plantilla
              <select className="input w-full mt-1" value={templateId} onChange={(e) => setTemplate(e.target.value)}>
                {TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm">Dominio
            <select className="input w-full mt-1" value={domain} onChange={(e) => setDomain(e.target.value)}>
              {DOMAINS.filter((d) => t.domains.includes(d.id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          {templateId !== 'exam' && (
            <label className="block text-sm">Dificultad
              <select className="input w-full mt-1" value={diff} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                {(['introductory', 'intermediate', 'advanced'] as Difficulty[]).map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm">Semilla
            <div className="flex gap-2 mt-1">
              <input className="input w-full font-mono" inputMode="numeric" value={seed} onChange={(e) => setSeed(Number(e.target.value.replace(/\D/g, '')) || 0)} />
              <button type="button" className="btn" onClick={() => setSeed(randomSeed())}>Otra</button>
            </div>
          </label>
          {!examOnly && (
            <fieldset className="text-sm">
              <legend className="mb-1">Modo</legend>
              <div className="flex gap-2 flex-wrap">
                {(['tutor', 'practice', 'exam'] as PracticeMode[]).map((m) => (
                  <label key={m} className="chip cursor-pointer" style={mode === m ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
                    <input type="radio" className="sr-only" name="modo" checked={mode === m} onChange={() => setMode(m)} />
                    {m === 'tutor' ? 'Tutor' : m === 'practice' ? 'Práctica' : 'Examen'}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button type="submit" className="btn btn-primary w-full justify-center" disabled={issues.length > 0}>{examOnly ? 'Comenzar examen' : 'Resolver este ejercicio'}</button>
          {issues.length > 0 && <ul className="text-xs" style={{ color: 'var(--err)' }}>{issues.map((i) => <li key={i.code + i.message}>{i.message}</li>)}</ul>}
          <p className="text-xs muted">Validador: {issues.length === 0 ? 'sin inconsistencias (datos, tests y solución coherentes).' : `${issues.length} problema(s).`}</p>
        </form>

        <article className="card p-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <DifficultyBadge d={ex.difficulty} />
            <span className="chip">{ex.domain}</span>
            <span className="chip">{(ex.visibleTests?.length ?? 0)} tests visibles · {ex.hiddenTests.length} ocultos</span>
          </div>
          <h2 className="text-lg font-semibold mb-2">{ex.title}</h2>
          <ConceptChips ids={ex.concepts} max={6} />
          <Markdown text={ex.statement} className="mt-3" />
          <h3 className="font-medium mt-4 mb-1 text-sm">Archivos</h3>
          <ul className="text-sm muted">
            {ex.supportFiles?.map((f) => <li key={f.name}>{f.name} <span className="text-xs">(dado)</span></li>)}
            {ex.starterCode?.map((f) => <li key={f.name}>{f.name} <span className="text-xs">(a completar)</span></li>)}
          </ul>
        </article>
      </div>
    </Page>
  )
}
