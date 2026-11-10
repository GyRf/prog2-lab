import { CONCEPTS, conceptName } from '../../data/concepts'
import { STATIC_EXERCISES } from '../../data/exercises'
import type { Attempt, ConceptStat, Difficulty, Exercise, Progress, Recommendation } from '../../models/types'
import { genId } from '../exercise/catalog'
import { TEMPLATES } from '../generation/templates'

// CONTROLLER: cálculo de progreso y recomendaciones (funciones puras).

const DIFFS: Difficulty[] = ['introductory', 'intermediate', 'advanced', 'exam']

export function computeProgress(userId: string, attempts: Attempt[]): Progress {
  const conceptStats: Record<string, ConceptStat> = {}
  for (const c of CONCEPTS) conceptStats[c.id] = { concept: c.id, attempts: 0, avgScore: 0, mastery: 'unseen' }
  for (const a of attempts) {
    for (const c of a.concepts) {
      const s = (conceptStats[c] ??= { concept: c, attempts: 0, avgScore: 0, mastery: 'unseen' })
      // promedio exponencial: los intentos recientes pesan más
      s.avgScore = s.attempts === 0 ? a.score : s.avgScore * 0.6 + a.score * 0.4
      s.attempts++
      s.lastPracticed = Math.max(s.lastPracticed ?? 0, a.finishedAt)
    }
  }
  for (const s of Object.values(conceptStats)) {
    if (s.attempts === 0) s.mastery = 'unseen'
    else if (s.avgScore >= 80 && s.attempts >= 2) s.mastery = 'mastered'
    else if (s.avgScore >= 50) s.mastery = 'learning'
    else s.mastery = 'weak'
  }
  const issues = new Map<string, { ruleId: string; title: string; count: number }>()
  for (const a of attempts) for (const d of a.diagnostics) {
    const it = issues.get(d.ruleId) ?? { ruleId: d.ruleId, title: d.title, count: 0 }
    it.count++
    issues.set(d.ruleId, it)
  }
  const solved = [...new Set(attempts.filter((a) => a.score >= 70 && a.kind !== 'quiz').map((a) => a.exerciseId))]
  const timed = attempts.filter((a) => a.finishedAt > a.startedAt)
  const recent = attempts.filter((a) => a.kind !== 'quiz').slice(-5)
  const recentAvg = recent.length ? recent.reduce((s, a) => s + a.score, 0) / recent.length : 0
  const lastDiff = recent.at(-1)?.difficulty ?? 'introductory'
  let idx = DIFFS.indexOf(lastDiff)
  if (recent.length >= 2 && recentAvg >= 80) idx = Math.min(idx + 1, 3)
  else if (recent.length >= 2 && recentAvg < 50) idx = Math.max(idx - 1, 0)
  return {
    userId,
    attempts,
    conceptStats,
    solvedExercises: solved,
    avgTimeMs: timed.length ? timed.reduce((s, a) => s + (a.finishedAt - a.startedAt), 0) / timed.length : 0,
    testsPassed: attempts.reduce((s, a) => s + a.testsPassed, 0),
    testsTotal: attempts.reduce((s, a) => s + a.testsTotal, 0),
    frequentIssues: [...issues.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    recommendedDifficulty: DIFFS[idx],
  }
}

/**
 * Recomendaciones según: conceptos débiles (errores recientes), conceptos no
 * practicados, variedad de formatos y cercanía del examen.
 */
export function recommend(p: Progress, opts: { daysToExam?: number; seed?: number } = {}): Recommendation[] {
  const recs: Recommendation[] = []
  const seed = opts.seed ?? Math.floor(Date.now() / 86_400_000)
  const stats = Object.values(p.conceptStats)
  const weak = stats.filter((s) => s.mastery === 'weak').sort((a, b) => a.avgScore - b.avgScore)
  const unseen = stats.filter((s) => s.mastery === 'unseen')
  const diff = p.recommendedDifficulty === 'exam' ? 'advanced' : p.recommendedDifficulty

  for (const s of weak.slice(0, 2)) {
    const t = TEMPLATES.find((t) => t.concepts.includes(s.concept) && t.id !== 'exam')
    if (t) recs.push({ kind: 'exercise', targetId: genId(t.id, 'pitufos', diff, seed + recs.length), title: `${t.title}`, reason: `Tu promedio en ${conceptName(s.concept)} es ${Math.round(s.avgScore)}%. Practicalo con un ejercicio nuevo.` })
  }
  if (p.frequentIssues[0]) recs.push({ kind: 'lesson', targetId: 'malas-practicas', title: 'Repasar malas prácticas', reason: `El problema más frecuente en tu código es "${p.frequentIssues[0].title}" (${p.frequentIssues[0].count} veces).` })
  for (const s of unseen.slice(0, 2)) {
    const ex = STATIC_EXERCISES.find((e) => e.concepts.includes(s.concept))
    const t = TEMPLATES.find((t) => t.concepts.includes(s.concept) && t.id !== 'exam')
    if (ex && !p.solvedExercises.includes(ex.id)) recs.push({ kind: 'exercise', targetId: ex.id, title: ex.title, reason: `Todavía no practicaste ${conceptName(s.concept)}.` })
    else if (t) recs.push({ kind: 'exercise', targetId: genId(t.id, 'onepiece', diff, seed + 11 + recs.length), title: t.title, reason: `Todavía no practicaste ${conceptName(s.concept)}.` })
  }
  const formats = new Set(p.attempts.map((a) => a.kind))
  if (!formats.has('quiz')) recs.push({ kind: 'quiz', targetId: 'quiz-u1', title: 'Quiz de fundamentos', reason: 'Variá el formato: los quizzes repasan teoría que aparece en los parciales.' })
  if ((opts.daysToExam !== undefined && opts.daysToExam <= 14) || p.solvedExercises.length >= 5) {
    recs.push({ kind: 'generate', targetId: 'exam', title: 'Simulacro de examen integrador', reason: opts.daysToExam !== undefined && opts.daysToExam <= 14 ? `Faltan ${opts.daysToExam} días para el examen: hacé un simulacro con tiempo.` : 'Ya resolviste varios ejercicios: probá un examen integrador con tests ocultos.' })
  }
  if (recs.length < 3) recs.push({ kind: 'exercise', targetId: 'comparator-pitufo-experiencia', title: 'Comparator: mayor experiencia primero', reason: 'Un buen punto de partida.' })
  const seen = new Set<string>()
  return recs.filter((r) => (seen.has(r.targetId) ? false : (seen.add(r.targetId), true))).slice(0, 6)
}

export function recommendExercises(p: Progress): Exercise[] {
  return recommend(p).filter((r) => r.kind === 'exercise').map((r) => STATIC_EXERCISES.find((e) => e.id === r.targetId)).filter((e): e is Exercise => !!e)
}
