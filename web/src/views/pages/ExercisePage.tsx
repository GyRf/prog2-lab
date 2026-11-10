import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getExercise } from '../../controllers/exercise/catalog'
import { useExerciseSession, type Submission } from '../../controllers/exercise/useExerciseSession'
import { TIMING_LABEL } from '../../controllers/modes'
import { conceptById } from '../../data/concepts'
import { LESSONS } from '../../data/lessons'
import type { Diagnostic, Exercise, FeedbackTiming, PracticeMode, TestResult } from '../../models/types'
import { JavaDiff, JavaEditor } from '../components/JavaEditor'
import { Markdown } from '../components/Markdown'
import { Icon } from '../components/Icon'
import { ConceptChips, DiagnosticCard, DifficultyBadge, Empty } from '../components/ui'
import { NotFound } from './NotFound'

const MODES: PracticeMode[] = ['tutor', 'practice', 'exam']
const MODE_LABEL = { tutor: 'Tutor', practice: 'Práctica', exam: 'Examen' }

export default function ExercisePage() {
  const { id } = useParams()
  const [sp, setSp] = useSearchParams()
  const mode = (MODES.includes(sp.get('modo') as PracticeMode) ? sp.get('modo') : 'practice') as PracticeMode
  const ex = getExercise(id ?? '')
  if (!ex) return <NotFound />
  // key: cambiar de modo reinicia la sesión
  return <Workspace key={ex.id + mode} ex={ex} mode={mode} setMode={(m) => setSp({ modo: m })} />
}

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Workspace({ ex, mode, setMode }: { ex: Exercise; mode: PracticeMode; setMode: (m: PracticeMode) => void }) {
  const s = useExerciseSession(ex, mode)
  const files = [...s.files, ...(ex.supportFiles ?? [])]
  const [active, setActive] = useState(files[0].name)
  const [reveal, setReveal] = useState<{ file: string; line: number; n: number }>()
  const [side, setSide] = useState<'feedback' | 'tests'>('feedback')
  const resultsRef = useRef<HTMLDivElement>(null)
  const exam = mode === 'exam'

  useEffect(() => { if (s.submission) resultsRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [s.submission])

  const goto = (d: Diagnostic) => { if (d.file) { setActive(d.file); setReveal({ file: d.file, line: d.line, n: Date.now() }) } }
  const confirmSubmit = () => { if (!exam || window.confirm('¿Entregar el examen? No vas a poder modificarlo después.')) void s.submit() }
  const locked = exam && !!s.submission

  return (
    <div className="flex flex-col min-h-[calc(100vh-0px)]">
      {/* barra superior */}
      <div className="border-b px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold truncate">{ex.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-1"><DifficultyBadge d={ex.difficulty} /><span className="chip">{ex.domain}</span></div>
        </div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Modo">
          {MODES.map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} className="btn btn-sm" style={mode === m ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' } : undefined} onClick={() => mode !== m && (!s.files.some((f, i) => f.content !== ex.starterCode?.[i]?.content) || window.confirm('Cambiar de modo reinicia la sesión. ¿Continuar?')) && setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        {!exam && (
          <label className="text-xs flex items-center gap-1.5">Feedback
            <select className="input !py-1 text-xs" value={s.timing} onChange={(e) => s.setTiming(e.target.value as FeedbackTiming)}>
              {s.policy.allowedTimings.map((t) => <option key={t} value={t}>{TIMING_LABEL[t]}</option>)}
            </select>
          </label>
        )}
        {s.remainingMs !== null && !s.submission && (
          <span className="chip text-sm tabular-nums" role="timer" aria-live="off" style={s.remainingMs < 5 * 60_000 ? { color: 'var(--err)', borderColor: 'var(--err)' } : undefined}>
            <Icon name="clock" size={14} /> {fmt(s.remainingMs)}
          </span>
        )}
      </div>

      {/* espacio de trabajo */}
      <div className="flex-1 grid gap-0 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_minmax(280px,360px)] min-h-0">
        {/* enunciado */}
        <section aria-label="Enunciado" className="border-b lg:border-b-0 lg:border-r p-4 overflow-y-auto lg:max-h-[calc(100vh-70px)]" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs muted mb-2">{s.policy.description}</p>
          <Markdown text={ex.statement} className="text-sm" />
          <div className="mt-3"><ConceptChips ids={ex.concepts} max={6} /></div>
          {ex.requirements.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold mb-1">Requisitos</h2>
              <ul className="text-sm list-disc pl-5 space-y-0.5">{ex.requirements.map((r) => <li key={r.id}>{r.description}</li>)}</ul>
            </div>
          )}
          {s.policy.showHints && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold mb-1">Pistas</h2>
              {s.hintsShown.map((h) => <p key={h.level} className="text-sm rounded-lg p-2.5 mb-2" style={{ background: 'var(--info-soft)' }}><strong>Pista {h.level}: </strong>{h.text}</p>)}
              {s.hasMoreHints ? <button className="btn btn-sm" onClick={s.nextHint}><Icon name="bulb" size={14} /> Pedir pista {s.hintsShown.length + 1} de {ex.hints.length}</button> : ex.hints.length > 0 && <p className="text-xs muted">No hay más pistas.</p>}
            </div>
          )}
          {mode === 'tutor' && <TutorConcepts ex={ex} />}
        </section>

        {/* editor + consola */}
        <section aria-label="Editor" className="flex flex-col min-w-0 min-h-[60vh] lg:min-h-0 lg:h-[calc(100vh-70px)]">
          <div className="flex flex-wrap gap-2 p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <button className="btn btn-sm" onClick={s.compileCode} disabled={!!s.busy || locked} title="Ctrl+Shift+B">{s.busy === 'compile' ? 'Compilando…' : 'Compilar'}</button>
            {s.policy.canRun && <button className="btn btn-sm" onClick={s.run} disabled={!!s.busy || s.visibleTests.length === 0} title="Ctrl+Enter"><Icon name="play" size={14} />{s.busy === 'run' ? 'Ejecutando…' : 'Ejecutar tests'}</button>}
            <button className="btn btn-sm btn-primary" onClick={confirmSubmit} disabled={!!s.busy || locked}>{s.busy === 'submit' ? 'Corrigiendo…' : 'Entregar'}</button>
            <span className="flex-1" />
            {!locked && <button className="btn btn-sm" onClick={() => window.confirm('¿Restaurar el código inicial? Se pierde lo escrito.') && s.reset()}><Icon name="reset" size={14} /> Restaurar</button>}
          </div>
          <div className="flex-1 min-h-[360px]">
            <JavaEditor files={files.map((f) => (locked ? { ...f, readonly: true } : f))} active={active} onActive={setActive} onChange={s.edit} diagnostics={s.shownDiagnostics} onSave={s.save} onRun={s.run} onCompile={s.compileCode} revealLine={reveal} />
          </div>
          <Console lines={s.consoleLines} onClear={s.clearConsole} offline={s.serverStatus === 'offline'} />
        </section>

        {/* feedback */}
        <section aria-label="Feedback" className="border-t lg:border-t-0 lg:border-l flex flex-col min-h-0 lg:max-h-[calc(100vh-70px)]" style={{ borderColor: 'var(--border)' }}>
          <div role="tablist" className="flex border-b text-sm" style={{ borderColor: 'var(--border)' }}>
            {(['feedback', 'tests'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={side === t} onClick={() => setSide(t)} className="flex-1 py-2" style={side === t ? { fontWeight: 600, boxShadow: 'inset 0 -2px 0 var(--accent)' } : undefined}>
                {t === 'feedback' ? `Diagnósticos (${s.shownDiagnostics.length})` : 'Tests'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {side === 'feedback' ? (
              exam && !s.submission ? <Empty>Modo examen: el feedback aparece al entregar.</Empty>
              : s.shownDiagnostics.length === 0 ? <Empty>{s.timing === 'typing' ? 'Sin observaciones por ahora.' : `El análisis se muestra ${TIMING_LABEL[s.timing].toLowerCase()}.`}</Empty>
              : s.shownDiagnostics.map((d, i) => <DiagnosticCard key={i} d={d} onGoto={goto} compact={mode !== 'tutor'} />)
            ) : (
              <TestsPanel visible={s.visibleTests.map((t) => t.name)} results={s.exec?.tests} exam={exam} hiddenCount={ex.hiddenTests.length} submitted={!!s.submission} />
            )}
          </div>
        </section>
      </div>

      {s.submission && <div ref={resultsRef}><Results ex={ex} sub={s.submission} canSeeSolution={s.canSeeSolution} onRetry={s.policy.multipleAttempts ? s.retry : undefined} goto={goto} /></div>}
    </div>
  )
}

function TutorConcepts({ ex }: { ex: Exercise }) {
  return (
    <div className="mt-4">
      <h2 className="text-sm font-semibold mb-1">Conceptos relacionados</h2>
      <ul className="text-sm space-y-1.5">
        {ex.concepts.map((c) => {
          const concept = conceptById(c)
          const lesson = LESSONS.find((l) => l.concepts.includes(c))
          return (
            <li key={c}>
              <span className="font-medium">{concept?.name}</span>: <span className="muted">{concept?.summary}</span>{' '}
              {lesson && <Link className="underline text-xs" to={`/leccion/${lesson.id}`} target="_blank">Ver lección</Link>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Console({ lines, onClear, offline }: { lines: { kind: string; text: string }[]; onClear: () => void; offline: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }) }, [lines])
  const color = { info: 'var(--muted)', out: 'var(--text)', err: 'var(--err)', ok: 'var(--ok)' } as Record<string, string>
  return (
    <div className="border-t h-44 flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}>
      <div className="flex items-center justify-between px-3 py-1 text-xs muted">
        <span>Consola {offline && '· sin servidor Java (sólo análisis estático)'}</span>
        <button className="underline" onClick={onClear}>Limpiar</button>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto px-3 pb-2 font-mono text-xs whitespace-pre-wrap" role="log" aria-live="polite">
        {lines.length === 0 ? <span className="muted">Atajos: Ctrl+S guardar · Ctrl+Shift+B compilar · Ctrl+Enter ejecutar tests</span> : lines.map((l, i) => <div key={i} style={{ color: color[l.kind] }}>{l.text}</div>)}
      </div>
    </div>
  )
}

const ST = { pass: { t: 'OK', c: 'var(--ok)' }, fail: { t: 'Falla', c: 'var(--err)' }, error: { t: 'Error', c: 'var(--err)' }, 'not-run': { t: 'No ejecutado', c: 'var(--muted)' } }

function TestRow({ t }: { t: TestResult }) {
  const st = ST[t.status]
  return (
    <li className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start gap-2">
        <span className="chip shrink-0" style={{ color: st.c, borderColor: st.c }}>{st.t}</span>
        <span className="flex-1">{t.name}{t.hidden && <span className="text-xs muted"> (oculto)</span>}</span>
      </div>
      {t.message && t.status !== 'pass' && <p className="text-xs mt-1 font-mono" style={{ color: 'var(--err)' }}>{t.message}</p>}
    </li>
  )
}

function TestsPanel({ visible, results, exam, hiddenCount, submitted }: { visible: string[]; results?: TestResult[]; exam: boolean; hiddenCount: number; submitted: boolean }) {
  if (submitted && results) return <ul className="space-y-1.5">{results.map((t) => <TestRow key={t.id} t={t} />)}</ul>
  return (
    <div className="space-y-2">
      {exam ? <Empty>Modo examen: los {hiddenCount} tests son ocultos y se ejecutan al entregar.</Empty> : (
        <>
          <ul className="space-y-1.5">
            {visible.map((name) => {
              const r = results?.find((x) => x.name === name)
              return r ? <TestRow key={name} t={r} /> : <li key={name} className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--border)' }}><span className="chip mr-2">Pendiente</span>{name}</li>
            })}
          </ul>
          <p className="text-xs muted">Además hay {hiddenCount} tests ocultos que se ejecutan al entregar.</p>
        </>
      )}
    </div>
  )
}

function Results({ ex, sub, canSeeSolution, onRetry, goto }: { ex: Exercise; sub: Submission; canSeeSolution: boolean; onRetry?: () => void; goto: (d: Diagnostic) => void }) {
  const [diffFile, setDiffFile] = useState(ex.referenceSolution[0]?.name)
  const failed = sub.exec.tests.filter((t) => t.status !== 'pass')
  const mine = sub.files.find((f) => f.name === diffFile)?.content ?? ''
  const ref = ex.referenceSolution.find((f) => f.name === diffFile)?.content ?? ''
  const errors = sub.diagnostics.filter((d) => d.severity === 'error')
  const practices = sub.diagnostics.filter((d) => d.severity === 'warning')
  const optional = sub.diagnostics.filter((d) => d.severity === 'info')
  return (
    <section aria-labelledby="res-t" className="border-t px-4 sm:px-6 py-6" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="res-t" className="text-xl font-semibold">Resultado: <span style={{ color: sub.breakdown.total >= 70 ? 'var(--ok)' : sub.breakdown.total >= 40 ? 'var(--warn)' : 'var(--err)' }}>{sub.breakdown.total}/100</span></h2>
          <div className="flex gap-2">
            {onRetry && <button className="btn" onClick={onRetry}>Seguir intentando</button>}
            <Link className="btn" to="/practicar">Otro ejercicio</Link>
          </div>
        </div>
        {!sub.exec.real && <p className="rounded-lg p-3 text-sm" style={{ background: 'var(--warn-soft)' }}>El servidor de ejecución Java no está disponible: los tests no se ejecutaron. La nota sólo considera requisitos y análisis. Ver README para iniciarlo.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          {sub.breakdown.items.map((i) => (
            <div key={i.id} className="card p-3">
              <div className="text-sm muted">{i.description}</div>
              <div className="text-lg font-semibold">{i.earned}/{i.points}</div>
              <div className="text-xs muted">{i.detail}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold mb-2">Tests ({sub.exec.tests.length - failed.length}/{sub.exec.tests.length})</h3>
            <ul className="space-y-1.5">{sub.exec.tests.map((t) => <TestRow key={t.id} t={t} />)}</ul>
            <h3 className="font-semibold mt-4 mb-2">Requisitos</h3>
            <ul className="space-y-1 text-sm">
              {sub.requirements.map((r) => <li key={r.requirement.id} className="flex gap-2"><span style={{ color: r.ok ? 'var(--ok)' : r.ok === null ? 'var(--muted)' : 'var(--err)' }}>{r.ok ? '✓' : r.ok === null ? '–' : '✗'}</span>{r.requirement.description}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Errores de diseño y malas prácticas</h3>
            {sub.diagnostics.length === 0 ? <Empty>Sin observaciones.</Empty> : (
              <div className="space-y-2">
                {[...errors, ...practices, ...optional].map((d, i) => <DiagnosticCard key={i} d={d} onGoto={goto} />)}
              </div>
            )}
          </div>
        </div>

        {canSeeSolution && (
          <div>
            <h3 className="font-semibold mb-2">Comparación con la solución de referencia</h3>
            {ex.explanation && <Markdown text={ex.explanation} className="text-sm mb-3" />}
            <div className="flex flex-wrap gap-1 mb-2">
              {ex.referenceSolution.map((f) => <button key={f.name} className="btn btn-sm" style={diffFile === f.name ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined} onClick={() => setDiffFile(f.name)}>{f.name}</button>)}
            </div>
            <p className="text-xs muted mb-1">Izquierda: tu entrega · Derecha: referencia</p>
            <JavaDiff original={mine} modified={ref} />
          </div>
        )}
      </div>
    </section>
  )
}
