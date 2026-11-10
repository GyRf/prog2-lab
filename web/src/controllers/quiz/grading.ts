import type { QuizQuestion } from '../../models/types'

// CONTROLLER: corrección de preguntas de quiz.

export type QuizAnswer =
  | { kind: 'multiple-choice'; value: number }
  | { kind: 'true-false'; value: boolean }
  | { kind: 'complete-code'; value: string[] }
  | { kind: 'order-steps'; value: string[] }
  | { kind: 'match'; value: Record<string, string> }

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')

export function gradeQuestion(q: QuizQuestion, a: QuizAnswer | undefined): boolean {
  if (!a || a.kind !== q.kind) return false
  switch (q.kind) {
    case 'multiple-choice': return (a as { value: number }).value === q.correct
    case 'true-false': return (a as { value: boolean }).value === q.correct
    case 'complete-code': return q.blanks.every((acc, i) => acc.map(norm).includes(norm((a as { value: string[] }).value[i] ?? '')))
    case 'order-steps': return q.steps.every((s, i) => (a as { value: string[] }).value[i] === s)
    case 'match': return q.pairs.every(([l, r]) => (a as { value: Record<string, string> }).value[l] === r)
  }
}
