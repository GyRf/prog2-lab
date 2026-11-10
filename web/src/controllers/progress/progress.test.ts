import { describe, expect, it } from 'vitest'
import { LocalProgressRepository, MemoryStore } from '../../services/ProgressRepository'
import type { Attempt } from '../../models/types'
import { recommend } from './progress'
import { gradeQuestion } from '../quiz/grading'
import { QUIZZES } from '../../data/quizzes'
import { shouldShowAnalysis } from '../modes'

const att = (score: number, concepts: string[], extra: Partial<Attempt> = {}): Attempt => ({
  id: String(Math.random()), userId: 'u', exerciseId: 'x', exerciseTitle: 'x', kind: 'exercise', mode: 'practice', concepts,
  startedAt: 0, finishedAt: 60000, score, testsPassed: 1, testsTotal: 2, diagnostics: [{ ruleId: 'string-eq', title: 'Strings con ==', category: 'functional' }], ...extra,
})

describe('progreso', () => {
  it('actualiza dominio de conceptos y recomienda practicar lo débil', async () => {
    const repo = new LocalProgressRepository(new MemoryStore())
    await repo.saveAttempt(att(20, ['comparator']))
    await repo.saveAttempt(att(100, ['composite']))
    await repo.saveAttempt(att(90, ['composite']))
    const p = await repo.getProgress('u')
    expect(p.conceptStats['comparator'].mastery).toBe('weak')
    expect(p.conceptStats['composite'].mastery).toBe('mastered')
    expect(p.frequentIssues[0]).toMatchObject({ ruleId: 'string-eq', count: 3 })
    const recs = recommend(p, { daysToExam: 5, seed: 1 })
    expect(recs[0].reason).toMatch(/Comparator/)
    expect(recs.some((r) => r.kind === 'generate')).toBe(true)
  })
})

describe('quizzes y modos', () => {
  it('corrige cada tipo de pregunta', () => {
    for (const q of QUIZZES.flatMap((x) => x.questions)) {
      const right =
        q.kind === 'multiple-choice' ? { kind: q.kind, value: q.correct } :
        q.kind === 'true-false' ? { kind: q.kind, value: q.correct } :
        q.kind === 'complete-code' ? { kind: q.kind, value: q.blanks.map((b) => b[0]) } :
        q.kind === 'order-steps' ? { kind: q.kind, value: q.steps } :
        { kind: q.kind, value: Object.fromEntries(q.pairs) }
      expect(gradeQuestion(q, right as never), q.id).toBe(true)
      expect(gradeQuestion(q, undefined)).toBe(false)
    }
  })
  it('el modo examen sólo muestra feedback al finalizar', () => {
    expect(shouldShowAnalysis('end', 'submit')).toBe(false)
    expect(shouldShowAnalysis('end', 'end')).toBe(true)
    expect(shouldShowAnalysis('compile', 'typing')).toBe(false)
    expect(shouldShowAnalysis('compile', 'run')).toBe(true)
  })
})
