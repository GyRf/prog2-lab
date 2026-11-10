import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { gradeQuestion, type QuizAnswer } from '../../controllers/quiz/grading'
import { Rng } from '../../controllers/generation/rng'
import { quizById } from '../../data/quizzes'
import type { QuizQuestion } from '../../models/types'
import { useServices } from '../../services/AppServices'
import { Page } from '../components/ui'
import { NotFound } from './NotFound'

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export function QuizPage() {
  const { id } = useParams()
  const quiz = quizById(id ?? '')
  const { progress, userId, notifyProgress } = useServices()
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({})
  const [submitted, setSubmitted] = useState(false)
  const [started] = useState(Date.now())
  const [round, setRound] = useState(0)
  if (!quiz) return <NotFound />

  const results = quiz.questions.map((q) => gradeQuestion(q, answers[q.id]))
  const correct = results.filter(Boolean).length

  const submit = async () => {
    setSubmitted(true)
    await progress.saveAttempt({
      id: crypto.randomUUID?.() ?? String(Date.now()), userId, exerciseId: quiz.id, exerciseTitle: quiz.title, kind: 'quiz', mode: 'practice',
      concepts: [...new Set(quiz.questions.flatMap((q) => q.concepts))], startedAt: started, finishedAt: Date.now(),
      score: Math.round((correct / quiz.questions.length) * 100), testsPassed: 0, testsTotal: 0,
      diagnostics: [],
    })
    notifyProgress()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Page title={quiz.title} subtitle={`${quiz.questions.length} preguntas. Respondé todas y corregí al final.`}>
      {submitted && (
        <div className="card p-4 mb-5 flex flex-wrap items-center justify-between gap-3" role="status">
          <div><span className="text-2xl font-semibold">{correct}/{quiz.questions.length}</span> <span className="muted">respuestas correctas</span></div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => { setAnswers({}); setSubmitted(false); setRound((r) => r + 1) }}>Reintentar</button>
            <Link to="/modulos" className="btn">Volver a módulos</Link>
          </div>
        </div>
      )}
      <ol className="space-y-4">
        {quiz.questions.map((q, i) => (
          <li key={q.id + round} className="card p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-semibold">Pregunta {i + 1}</span>
              <span className="chip">{q.topic}</span>
              {submitted && <span className="chip" style={{ background: results[i] ? 'var(--ok-soft)' : 'var(--err-soft)', color: results[i] ? 'var(--ok)' : 'var(--err)', borderColor: 'transparent' }}>{results[i] ? 'Correcta' : 'Incorrecta'}</span>}
            </div>
            <p className="mb-3">{q.prompt}</p>
            {q.code && q.kind !== 'complete-code' && <pre className="codeblock mb-3">{q.code}</pre>}
            <QuestionInput q={q} value={answers[q.id]} disabled={submitted} onChange={(a) => setAnswers((s) => ({ ...s, [q.id]: a }))} />
            {submitted && (
              <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: 'var(--panel-2)' }}>
                {!results[i] && <p className="mb-1"><strong>Respuesta correcta: </strong>{correctText(q)}</p>}
                <p>{q.explanation}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
      {!submitted && (
        <div className="mt-5 flex justify-end">
          <button className="btn btn-primary" onClick={submit}>Corregir quiz ({Object.keys(answers).length}/{quiz.questions.length} respondidas)</button>
        </div>
      )}
    </Page>
  )
}

function correctText(q: QuizQuestion): string {
  switch (q.kind) {
    case 'multiple-choice': return q.options[q.correct]
    case 'true-false': return q.correct ? 'Verdadero' : 'Falso'
    case 'complete-code': return q.blanks.map((b) => b[0]).join(' · ')
    case 'order-steps': return q.steps.map((s, i) => `${i + 1}) ${s}`).join('  ')
    case 'match': return q.pairs.map(([a, b]) => `${a} → ${b}`).join(' · ')
  }
}

function QuestionInput({ q, value, onChange, disabled }: { q: QuizQuestion; value?: QuizAnswer; onChange: (a: QuizAnswer) => void; disabled: boolean }) {
  const shuffled = useMemo(() => {
    const rng = new Rng(hash(q.id))
    if (q.kind === 'order-steps') return rng.shuffle(q.steps)
    if (q.kind === 'match') return rng.shuffle(q.pairs.map((p) => p[1]))
    return []
  }, [q])

  if (q.kind === 'multiple-choice' || q.kind === 'true-false') {
    const opts = q.kind === 'true-false' ? ['Verdadero', 'Falso'] : q.options
    const sel = value ? (value.kind === 'true-false' ? (value.value ? 0 : 1) : (value as { value: number }).value) : -1
    return (
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="sr-only">Opciones</legend>
        {opts.map((o, i) => (
          <label key={i} className="flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer" style={{ borderColor: sel === i ? 'var(--accent)' : 'var(--border)' }}>
            <input type="radio" name={q.id} checked={sel === i} onChange={() => onChange(q.kind === 'true-false' ? { kind: 'true-false', value: i === 0 } : { kind: 'multiple-choice', value: i })} className="mt-1" />
            <span>{o}</span>
          </label>
        ))}
      </fieldset>
    )
  }
  if (q.kind === 'complete-code') {
    const parts = q.code!.split('___')
    const vals = (value as { value: string[] } | undefined)?.value ?? []
    return (
      <pre className="codeblock">
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <input aria-label={`Espacio ${i + 1}`} disabled={disabled} className="input !py-0 !px-1 font-mono w-24" value={vals[i] ?? ''} onChange={(e) => { const v = [...vals]; v[i] = e.target.value; onChange({ kind: 'complete-code', value: v }) }} />
            )}
          </span>
        ))}
      </pre>
    )
  }
  if (q.kind === 'order-steps') {
    const order = (value as { value: string[] } | undefined)?.value ?? shuffled
    const move = (i: number, d: number) => { const o = [...order]; const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; onChange({ kind: 'order-steps', value: o }) }
    return (
      <ol className="space-y-1.5">
        {order.map((s, i) => (
          <li key={s} className="flex items-center gap-2 rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <span className="w-5 text-center font-semibold muted">{i + 1}</span>
            <span className="flex-1">{s}</span>
            <button className="btn btn-sm" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Subir "${s}"`}>↑</button>
            <button className="btn btn-sm" disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar "${s}"`}>↓</button>
          </li>
        ))}
      </ol>
    )
  }
  const map = (value as { value: Record<string, string> } | undefined)?.value ?? {}
  return (
    <div className="space-y-2">
      {q.pairs.map(([left]) => (
        <label key={left} className="grid sm:grid-cols-2 gap-2 items-center text-sm">
          <span className="font-medium">{left}</span>
          <select className="input" disabled={disabled} value={map[left] ?? ''} onChange={(e) => onChange({ kind: 'match', value: { ...map, [left]: e.target.value } })}>
            <option value="">Elegí…</option>
            {shuffled.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      ))}
    </div>
  )
}
