import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CompilationResult, Diagnostic, ExecutionResult, Exercise, FeedbackTiming, JavaFile, PracticeMode, TestCase } from '../../models/types'
import { useServices } from '../../services/AppServices'
import { analyzeJava } from '../analysis/analyzer'
import { MODE_POLICIES, shouldShowAnalysis } from '../modes'
import { checkRequirements, score, type RequirementResult, type ScoreBreakdown } from './grading'

// CONTROLLER (hook): orquesta una sesión de resolución. Las vistas sólo llaman
// a las acciones y leen el estado; no contienen reglas de negocio.

export interface ConsoleLine { kind: 'info' | 'out' | 'err' | 'ok'; text: string }

export interface Submission {
  breakdown: ScoreBreakdown
  exec: ExecutionResult
  requirements: RequirementResult[]
  diagnostics: Diagnostic[]
  files: JavaFile[]
  at: number
}

const draftKey = (id: string, mode: PracticeMode) => `prog2lab:draft:${mode}:${id}`
const loadDraft = (id: string, mode: PracticeMode): JavaFile[] | null => {
  try { return JSON.parse(localStorage.getItem(draftKey(id, mode)) ?? 'null') } catch { return null }
}

export function useExerciseSession(ex: Exercise, mode: PracticeMode) {
  const { execution, serverStatus, progress, userId, notifyProgress } = useServices()
  const policy = MODE_POLICIES[mode]
  const starter = useMemo(() => (ex.starterCode ?? []).map((f) => ({ ...f, readonly: false })), [ex])
  const studentNames = useMemo(() => starter.map((f) => f.name), [starter])

  const [files, setFiles] = useState<JavaFile[]>(() => {
    const d = mode === 'exam' ? null : loadDraft(ex.id, mode)
    return d && d.length === starter.length && d.every((f, i) => f.name === starter[i].name) ? d : starter
  })
  const [timing, setTiming] = useState<FeedbackTiming>(policy.defaultTiming)
  const [shown, setShown] = useState<Diagnostic[]>([])
  const [compile, setCompile] = useState<CompilationResult | null>(null)
  const [exec, setExec] = useState<ExecutionResult | null>(null)
  const [consoleLines, setConsole] = useState<ConsoleLine[]>([])
  const [hints, setHints] = useState(0)
  const [busy, setBusy] = useState<null | 'compile' | 'run' | 'submit'>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [startedAt] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const attempts = useRef(0)

  const allFiles = useCallback((fs: JavaFile[]) => [...(ex.supportFiles ?? []), ...fs], [ex])
  const analyze = useCallback((fs: JavaFile[]) => analyzeJava(allFiles(fs), { reportFiles: studentNames }).diagnostics, [allFiles, studentNames])
  const log = (lines: ConsoleLine[]) => setConsole((c) => [...c, ...lines].slice(-300))

  const visibleTests: TestCase[] = policy.showVisibleTests ? ex.visibleTests ?? [] : []
  const timeLimitMs = policy.timed ? (ex.timeLimitMinutes ?? 60) * 60_000 : null
  const remainingMs = timeLimitMs ? Math.max(0, startedAt + timeLimitMs - now) : null

  // análisis "mientras escribe" (debounced)
  useEffect(() => {
    if (submission || !shouldShowAnalysis(timing, 'typing')) return
    const t = setTimeout(() => setShown(analyze(files)), 600)
    return () => clearTimeout(t)
  }, [files, timing, analyze, submission])

  // borrador local (no en examen)
  useEffect(() => {
    if (mode === 'exam') return
    try { localStorage.setItem(draftKey(ex.id, mode), JSON.stringify(files)) } catch { /* sin storage */ }
  }, [files, ex.id, mode])

  const edit = useCallback((name: string, content: string) => {
    if (submission && mode === 'exam') return
    setFiles((fs) => fs.map((f) => (f.name === name ? { ...f, content } : f)))
  }, [submission, mode])

  const feedback = (event: FeedbackTiming, fs: JavaFile[]) => { if (shouldShowAnalysis(timing, event)) setShown(analyze(fs)) }

  const save = () => { log([{ kind: 'info', text: 'Guardado.' }]); feedback('save', files) }

  const doCompile = async () => {
    setBusy('compile')
    try {
      const r = await execution.compile('', allFiles(files))
      setCompile(r)
      log(r.ok
        ? [{ kind: 'ok', text: r.real ? 'Compilación exitosa.' : 'Chequeo sintáctico OK (sin servidor de ejecución: no se usó javac).' }]
        : [{ kind: 'err', text: `Errores de compilación (${r.errors.length}):` }, ...r.errors.map((e) => ({ kind: 'err' as const, text: `${e.file}:${e.line} ${e.title} — ${e.explanation}` }))])
      feedback('compile', files)
    } catch (e) {
      log([{ kind: 'err', text: String(e) }])
    } finally { setBusy(null) }
  }

  const doRun = async () => {
    if (!policy.canRun) return
    setBusy('run')
    try {
      attempts.current++
      const r = await execution.run('', visibleTests, allFiles(files), [])
      setExec(r)
      setCompile({ ok: r.compiled, real: r.real, errors: r.compileErrors, output: '' })
      const lines: ConsoleLine[] = []
      if (!r.real) lines.push({ kind: 'info', text: r.stderr })
      else if (!r.compiled) lines.push({ kind: 'err', text: 'No compila:' }, ...r.compileErrors.map((e) => ({ kind: 'err' as const, text: `${e.file}:${e.line} ${e.title} — ${e.explanation}` })))
      else {
        if (r.stdout) lines.push({ kind: 'out', text: r.stdout })
        if (r.stderr) lines.push({ kind: 'err', text: r.stderr })
        const pass = r.tests.filter((t) => t.status === 'pass').length
        lines.push({ kind: pass === r.tests.length ? 'ok' : 'err', text: `Tests visibles: ${pass}/${r.tests.length} aprobados (${r.durationMs} ms).` })
      }
      log(lines)
      feedback('run', files)
    } catch (e) {
      log([{ kind: 'err', text: String(e) }])
    } finally { setBusy(null) }
  }

  const submit = useCallback(async () => {
    setBusy('submit')
    try {
      const tests = [...(ex.visibleTests ?? []), ...ex.hiddenTests]
      const hiddenIds = ex.hiddenTests.map((t) => t.id)
      const r = await execution.run('', tests, allFiles(files), hiddenIds)
      const requirements = checkRequirements(ex, files)
      const diagnostics = [...r.compileErrors, ...analyze(files)]
      const breakdown = score(ex, r.tests, requirements, diagnostics, r.compiled)
      const sub: Submission = { breakdown, exec: r, requirements, diagnostics, files, at: Date.now() }
      setSubmission(sub)
      setExec(r)
      setShown(diagnostics)
      log([{ kind: breakdown.total >= 70 ? 'ok' : 'err', text: `Entrega corregida: ${breakdown.total}/100.${r.real ? '' : ' (Tests no ejecutados: falta el servidor Java; la nota sólo refleja requisitos y análisis.)'}` }])
      await progress.saveAttempt({
        id: crypto.randomUUID?.() ?? String(Date.now()), userId, exerciseId: ex.id, exerciseTitle: ex.title, kind: mode === 'exam' ? 'exam' : 'exercise', mode,
        concepts: ex.concepts, startedAt, finishedAt: Date.now(), score: breakdown.total,
        testsPassed: r.tests.filter((t) => t.status === 'pass').length, testsTotal: r.real ? tests.length : 0,
        diagnostics: diagnostics.map((d) => ({ ruleId: d.ruleId, title: d.title, category: d.category })),
        code: files, difficulty: ex.difficulty,
      })
      notifyProgress()
    } catch (e) {
      log([{ kind: 'err', text: String(e) }])
    } finally { setBusy(null) }
  }, [ex, execution, allFiles, files, analyze, progress, userId, mode, startedAt, notifyProgress])

  // reloj del examen y entrega automática al agotarse el tiempo
  useEffect(() => {
    if (!timeLimitMs || submission) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [timeLimitMs, submission])
  const autoSubmitted = useRef(false)
  useEffect(() => {
    if (remainingMs === 0 && !submission && !autoSubmitted.current) { autoSubmitted.current = true; void submit() }
  }, [remainingMs, submission, submit])

  const reset = () => { setFiles(starter); setShown([]); setExec(null); setCompile(null); log([{ kind: 'info', text: 'Código inicial restaurado.' }]) }
  const nextHint = () => setHints((h) => Math.min(h + 1, ex.hints.length))
  const retry = () => { setSubmission(null); setShown([]) }

  return {
    policy, files, timing, setTiming, shownDiagnostics: shown, compile, exec, consoleLines, clearConsole: () => setConsole([]),
    hintsShown: policy.showHints ? ex.hints.slice(0, hints) : [], hasMoreHints: policy.showHints && hints < ex.hints.length,
    busy, submission, remainingMs, serverStatus, visibleTests, attempts: attempts.current,
    canSeeSolution: !!submission && policy.showSolutionAfterSubmit,
    edit, save, compileCode: doCompile, run: doRun, submit, reset, nextHint, retry,
  }
}
