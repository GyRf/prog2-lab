// MODELS: tipos de dominio de la plataforma. Sin lógica.

export type UnitId = 'u1' | 'u2' | 'u3' | 'u4' | 'u5'

export type ConceptId = string

export interface Concept {
  id: ConceptId
  unit: UnitId
  name: string
  summary: string
}

export interface Unit {
  id: UnitId
  title: string
  description: string
}

// ---------- Código fuente ----------
export interface JavaFile {
  name: string // ej: "ComparadorPorExperiencia.java"
  content: string
  readonly?: boolean
}

// ---------- Ejercicios ----------
export type Difficulty = 'introductory' | 'intermediate' | 'advanced' | 'exam'
export type ExerciseFormat = 'quiz' | 'code-fragment' | 'full-design' | 'debugging' | 'exam'

/** Requisito estructural verificable sin ejecutar (regex sobre el código del alumno). */
export interface Requirement {
  id: string
  description: string
  /** Si está, el requisito se verifica en el navegador. */
  check?: { file?: string; pattern: string; flags?: string; mustMatch: boolean }
}

/**
 * Test ejecutable en Java. `body` son sentencias Java dentro de un método;
 * se dispone de check(cond, msg) y eq(esperado, obtenido).
 */
export interface TestCase {
  id: string
  name: string
  body: string
  description?: string
}

export interface Hint {
  level: 1 | 2 | 3
  text: string
}

export interface RubricItem {
  id: string
  description: string
  points: number
  kind: 'tests' | 'requirements' | 'analysis'
}

export interface Rubric {
  items: RubricItem[]
}

export interface Exercise {
  id: string
  seed: number
  title: string
  domain: string
  statement: string
  concepts: ConceptId[]
  difficulty: Difficulty
  format: ExerciseFormat
  starterCode?: JavaFile[]
  /** Archivos de soporte que el alumno ve pero no edita (clases del dominio). */
  supportFiles?: JavaFile[]
  requirements: Requirement[]
  hiddenTests: TestCase[]
  visibleTests?: TestCase[]
  referenceSolution: JavaFile[]
  rubric: Rubric
  hints: Hint[]
  /** Explicación del diseño de la solución, se muestra después de entregar. */
  explanation?: string
  /** Para generados: plantilla de origen. */
  templateId?: string
  timeLimitMinutes?: number
}

// ---------- Diagnósticos / análisis ----------
export type Severity = 'error' | 'warning' | 'info'
export type DiagnosticCategory =
  | 'compilation'
  | 'functional'
  | 'bad-practice'
  | 'style'
  | 'design'

export interface Diagnostic {
  ruleId: string
  severity: Severity
  category: DiagnosticCategory
  file?: string
  line: number
  code: string
  title: string
  explanation: string
  why: string
  suggestion: string
  fixedExample?: string
  concept: ConceptId
}

export interface CodeAnalysisResult {
  diagnostics: Diagnostic[]
  metrics: { lines: number; classes: number; methods: number }
}

export interface CompilationResult {
  ok: boolean
  /** false cuando no hay servidor de ejecución y sólo se hizo un chequeo sintáctico básico. */
  real: boolean
  errors: Diagnostic[]
  output: string
}

export type TestStatus = 'pass' | 'fail' | 'error' | 'not-run'

export interface TestResult {
  id: string
  name: string
  status: TestStatus
  message?: string
  hidden: boolean
}

export interface ExecutionResult {
  compiled: boolean
  real: boolean
  stdout: string
  stderr: string
  tests: TestResult[]
  timedOut: boolean
  durationMs: number
  compileErrors: Diagnostic[]
}

// ---------- Modos ----------
export type PracticeMode = 'tutor' | 'practice' | 'exam'
export type FeedbackTiming = 'typing' | 'save' | 'compile' | 'run' | 'submit' | 'end'

// ---------- Quizzes ----------
export type QuizQuestion =
  | ({ kind: 'multiple-choice'; options: string[]; correct: number } & QuizBase)
  | ({ kind: 'true-false'; correct: boolean } & QuizBase)
  | ({ kind: 'complete-code'; code: string; blanks: string[][] } & QuizBase) // cada blank: respuestas aceptadas
  | ({ kind: 'order-steps'; steps: string[] } & QuizBase) // steps en orden correcto
  | ({ kind: 'match'; pairs: [string, string][] } & QuizBase)

export interface QuizBase {
  id: string
  /** Subtipo pedagógico: predecir salida, elegir patrón, detectar aliasing, etc. */
  topic: string
  concepts: ConceptId[]
  prompt: string
  code?: string
  explanation: string
}

export interface Quiz {
  id: string
  title: string
  unit: UnitId
  questions: QuizQuestion[]
}

// ---------- Lecciones ----------
export type LessonBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; code: string; caption?: string }
  | { type: 'tip'; text: string }
  | { type: 'warn'; text: string }

export interface Lesson {
  id: string
  unit: UnitId
  title: string
  concepts: ConceptId[]
  blocks: LessonBlock[]
  quizId?: string
  animationIds?: string[]
  exerciseIds?: string[]
}

// ---------- Intentos / progreso ----------
export interface Attempt {
  id: string
  userId: string
  exerciseId: string
  exerciseTitle: string
  kind: 'exercise' | 'quiz' | 'exam'
  mode: PracticeMode
  concepts: ConceptId[]
  startedAt: number
  finishedAt: number
  score: number // 0..100
  testsPassed: number
  testsTotal: number
  diagnostics: { ruleId: string; title: string; category: DiagnosticCategory }[]
  code?: JavaFile[]
  difficulty?: Difficulty
}

export interface ConceptStat {
  concept: ConceptId
  attempts: number
  avgScore: number
  lastPracticed?: number
  mastery: 'unseen' | 'weak' | 'learning' | 'mastered'
}

export interface Progress {
  userId: string
  attempts: Attempt[]
  conceptStats: Record<ConceptId, ConceptStat>
  solvedExercises: string[]
  avgTimeMs: number
  testsPassed: number
  testsTotal: number
  frequentIssues: { ruleId: string; title: string; count: number }[]
  recommendedDifficulty: Difficulty
}

export interface Recommendation {
  kind: 'exercise' | 'lesson' | 'quiz' | 'generate'
  targetId: string
  title: string
  reason: string
}

// ---------- Generación ----------
export interface GenerationRequest {
  templateId: string
  seed: number
  domain?: string
  difficulty?: Difficulty
}

export interface ExerciseTemplate {
  id: string
  title: string
  description: string
  concepts: ConceptId[]
  formats: ExerciseFormat[]
  domains: string[]
  generate(req: GenerationRequest): Exercise
}

export interface ValidationIssue {
  code: string
  message: string
}
