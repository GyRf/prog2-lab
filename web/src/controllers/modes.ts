import type { FeedbackTiming, PracticeMode } from '../models/types'

// CONTROLLER: reglas de cada modo. Las vistas sólo consultan estas funciones.

export interface ModePolicy {
  label: string
  description: string
  defaultTiming: FeedbackTiming
  allowedTimings: FeedbackTiming[]
  showHints: boolean
  showVisibleTests: boolean
  showHiddenTestsBeforeSubmit: boolean
  showSolutionAfterSubmit: boolean
  showSolutionBeforeSubmit: boolean
  canRun: boolean
  timed: boolean
  multipleAttempts: boolean
}

export const MODE_POLICIES: Record<PracticeMode, ModePolicy> = {
  tutor: {
    label: 'Tutor', description: 'Detecta errores mientras escribís, explica conceptos y da pistas graduales. No muestra la solución completa de entrada.',
    defaultTiming: 'typing', allowedTimings: ['typing', 'save', 'compile', 'run', 'submit'],
    showHints: true, showVisibleTests: true, showHiddenTestsBeforeSubmit: false, showSolutionAfterSubmit: true, showSolutionBeforeSubmit: false, canRun: true, timed: false, multipleAttempts: true,
  },
  practice: {
    label: 'Práctica', description: 'Compilá, ejecutá y corré los tests visibles cuantas veces quieras. Feedback al compilar.',
    defaultTiming: 'compile', allowedTimings: ['typing', 'save', 'compile', 'run', 'submit'],
    showHints: true, showVisibleTests: true, showHiddenTestsBeforeSubmit: false, showSolutionAfterSubmit: true, showSolutionBeforeSubmit: false, canRun: true, timed: false, multipleAttempts: true,
  },
  exam: {
    label: 'Examen', description: 'Sin feedback ni pistas. Tests ocultos. Con tiempo límite. Se corrige todo al entregar.',
    defaultTiming: 'end', allowedTimings: ['end'],
    showHints: false, showVisibleTests: false, showHiddenTestsBeforeSubmit: false, showSolutionAfterSubmit: true, showSolutionBeforeSubmit: false, canRun: false, timed: true, multipleAttempts: false,
  },
}

export const TIMING_LABEL: Record<FeedbackTiming, string> = {
  typing: 'Mientras escribo', save: 'Al guardar (Ctrl+S)', compile: 'Al compilar', run: 'Al ejecutar', submit: 'Al entregar', end: 'Sólo al finalizar',
}

const ORDER: FeedbackTiming[] = ['typing', 'save', 'compile', 'run', 'submit', 'end']

/** ¿Se debe mostrar el análisis ante este evento, dada la preferencia de timing? */
export function shouldShowAnalysis(timing: FeedbackTiming, event: FeedbackTiming): boolean {
  if (event === 'end') return true
  if (timing === 'end') return false
  return ORDER.indexOf(event) >= ORDER.indexOf(timing)
}
