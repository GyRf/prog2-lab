import type { CodeAnalysisResult, CompilationResult, Diagnostic, ExecutionResult, JavaFile, TestCase, TestResult } from '../../models/types'
import { analyzeJava } from '../analysis/analyzer'
import { RULES } from '../analysis/rules'

/** Contrato desacoplado de ejecución Java (ver docs/ARQUITECTURA.md). */
export interface JavaExecutionService {
  compile(source: string, files: JavaFile[]): Promise<CompilationResult>
  run(source: string, tests: TestCase[], files?: JavaFile[], hiddenIds?: string[]): Promise<ExecutionResult>
  analyze(source: string, files?: JavaFile[]): Promise<CodeAnalysisResult>
}

// ---------- Harness de tests ----------
export const HARNESS_CLASS = 'TestRunner'

export function buildTestHarness(tests: TestCase[]): JavaFile {
  const calls = tests
    .map((t) => `        run(${JSON.stringify(t.id)}, () -> {\n${t.body.split('\n').map((l) => '            ' + l).join('\n')}\n        });`)
    .join('\n')
  return {
    name: `${HARNESS_CLASS}.java`,
    content: `import java.util.*;
import java.util.function.*;

public class ${HARNESS_CLASS} {
    interface T { void run() throws Throwable; }
    static void check(boolean c, String msg) { if (!c) throw new AssertionError(msg); }
    static void eq(Object esperado, Object obtenido) {
        if (!Objects.equals(esperado, obtenido)) throw new AssertionError("Se esperaba <" + esperado + "> pero se obtuvo <" + obtenido + ">");
    }
    static void eqD(double esperado, double obtenido) {
        if (Math.abs(esperado - obtenido) > 1e-6) throw new AssertionError("Se esperaba <" + esperado + "> pero se obtuvo <" + obtenido + ">");
    }
    static int sgn(int x) { return Integer.signum(x); }
    static void run(String id, T t) {
        try { t.run(); System.out.println("@@TEST|" + id + "|PASS|"); }
        catch (Throwable x) {
            String m = x.getMessage() == null ? x.toString() : (x instanceof AssertionError ? x.getMessage() : x.toString());
            System.out.println("@@TEST|" + id + "|FAIL|" + m.replace('\\n', ' '));
        }
    }
    public static void main(String[] args) {
${calls}
    }
}
`,
  }
}

// ---------- Parser de salida de javac ----------
const JAVAC_HINTS: [RegExp, string, string][] = [
  [/cannot find symbol/, 'No se encuentra un símbolo', 'Una variable, método o clase no existe con ese nombre o no es visible. Revisá mayúsculas, imports y que el método esté declarado en el tipo estático de la variable.'],
  [/';' expected/, 'Falta un punto y coma', 'Cada sentencia termina con ;.'],
  [/missing return statement/, 'Falta un return', 'Algún camino del método no devuelve valor. Asegurate de que todas las ramas tengan return.'],
  [/incompatible types/, 'Tipos incompatibles', 'El valor no corresponde al tipo esperado. Revisá el tipo de retorno o si falta un cast/conversión (por ejemplo double a int).'],
  [/is not abstract and does not override abstract method/, 'Falta implementar un método abstracto', 'La clase concreta debe implementar todos los métodos abstractos de su superclase o interfaz.'],
  [/unreported exception/, 'Excepción checked sin manejar', 'La excepción es checked: hay que capturarla con try/catch o declararla con throws.'],
  [/unreachable statement/, 'Sentencia inalcanzable', 'Hay código después de un return/throw.'],
  [/method does not override or implement/, '@Override sobre un método que no redefine', 'La firma no coincide con ningún método de la superclase/interfaz. Revisá nombre y tipos de parámetros.'],
  [/has private access/, 'Acceso a miembro private', 'El miembro es private: usá un método público o protected.'],
  [/might not have been initialized/, 'Variable sin inicializar', 'Asigná un valor antes de usarla.'],
  [/class, interface, enum, or record expected/, 'Llave de más o código fuera de la clase', 'Probablemente sobra una } o hay código fuera de la clase.'],
  [/reached end of file while parsing/, 'Falta cerrar una llave', 'El archivo termina antes de cerrar todas las {.'],
  [/cannot be applied to given types/, 'Argumentos incorrectos', 'La cantidad o tipo de argumentos no coincide con la firma del método/constructor.'],
  [/non-static .* cannot be referenced from a static context/, 'Acceso a miembro de instancia desde static', 'Desde un método static no hay this: necesitás una instancia.'],
]

export function parseJavacOutput(out: string): Diagnostic[] {
  const diags: Diagnostic[] = []
  const lines = out.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:.*[\\/])?([\w$]+\.java):(\d+):\s*error:\s*(.*)$/)
    if (!m) continue
    const code = (lines[i + 1] ?? '').trim()
    const symbol = lines.slice(i + 1, i + 5).find((l) => /symbol:/.test(l))?.trim()
    const hint = JAVAC_HINTS.find(([re]) => re.test(m[3]))
    diags.push({
      ...RULES.javac,
      ruleId: 'javac',
      severity: 'error',
      category: 'compilation',
      file: m[1],
      line: Number(m[2]),
      code,
      title: hint ? hint[1] : 'Error de compilación',
      explanation: `javac: ${m[3]}${symbol ? ` (${symbol})` : ''}`,
      why: RULES.javac.why,
      suggestion: hint ? hint[2] : 'Leé el mensaje del compilador y la línea indicada.',
      concept: RULES.javac.concept,
    })
  }
  return diags
}

export function parseTestOutput(stdout: string, tests: TestCase[], hiddenIds: string[] = []): { tests: TestResult[]; cleanStdout: string } {
  const res = new Map<string, TestResult>()
  const other: string[] = []
  for (const line of stdout.split('\n')) {
    const m = line.match(/^@@TEST\|([^|]*)\|(PASS|FAIL)\|(.*)$/)
    if (m) res.set(m[1], { id: m[1], name: '', status: m[2] === 'PASS' ? 'pass' : 'fail', message: m[3] || undefined, hidden: false })
    else other.push(line)
  }
  return {
    tests: tests.map((t) => ({
      ...(res.get(t.id) ?? { id: t.id, status: 'error' as const, message: 'No llegó a ejecutarse (timeout o error previo).' }),
      name: t.name,
      hidden: hiddenIds.includes(t.id),
    })) as TestResult[],
    cleanStdout: other.join('\n').trim(),
  }
}

/** Nombre de archivo según la clase pública declarada (para el analizador web). */
export function guessFileName(source: string): string {
  const m = source.match(/public\s+(?:abstract\s+|final\s+)*(?:class|interface|enum|record)\s+(\w+)/) ?? source.match(/(?:class|interface|enum)\s+(\w+)/)
  return (m?.[1] ?? 'Main') + '.java'
}

/** Implementación sin servidor: análisis estático + chequeo sintáctico. No ejecuta código. */
export class BrowserJavaExecutionService implements JavaExecutionService {
  async compile(source: string, files: JavaFile[]): Promise<CompilationResult> {
    const all = files.length ? files : [{ name: guessFileName(source), content: source }]
    const r = analyzeJava(all, { syntaxOnly: true })
    return { ok: r.diagnostics.length === 0, real: false, errors: r.diagnostics, output: 'Chequeo sintáctico básico (sin servidor de ejecución).' }
  }
  async run(_source: string, tests: TestCase[], files: JavaFile[] = [], hiddenIds: string[] = []): Promise<ExecutionResult> {
    const comp = await this.compile('', files)
    return {
      compiled: comp.ok,
      real: false,
      stdout: '',
      stderr: 'El servidor de ejecución Java no está disponible: los tests no se ejecutaron. Iniciá el servidor (ver README) para compilar y correr de verdad.',
      tests: tests.map((t) => ({ id: t.id, name: t.name, status: 'not-run', hidden: hiddenIds.includes(t.id) })),
      timedOut: false,
      durationMs: 0,
      compileErrors: comp.errors,
    }
  }
  async analyze(source: string, files: JavaFile[] = []): Promise<CodeAnalysisResult> {
    return analyzeJava(files.length ? files : [{ name: guessFileName(source), content: source }])
  }
}

/** Implementación contra el servidor sandbox (server/). */
export class HttpJavaExecutionService implements JavaExecutionService {
  private baseUrl: string
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const r = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) throw new Error(`Servidor de ejecución: HTTP ${r.status} ${await r.text()}`)
    return r.json() as Promise<T>
  }

  async compile(source: string, files: JavaFile[]): Promise<CompilationResult> {
    const all = files.length ? files : [{ name: guessFileName(source), content: source }]
    const r = await this.post<{ compiled: boolean; compileOutput: string }>('/compile', { files: all })
    return { ok: r.compiled, real: true, errors: parseJavacOutput(r.compileOutput), output: r.compileOutput }
  }

  async run(_source: string, tests: TestCase[], files: JavaFile[] = [], hiddenIds: string[] = []): Promise<ExecutionResult> {
    const harness = buildTestHarness(tests)
    const r = await this.post<{ compiled: boolean; compileOutput: string; stdout: string; stderr: string; timedOut: boolean; durationMs: number }>('/run', {
      files: [...files, harness],
      mainClass: HARNESS_CLASS,
    })
    const parsed = parseTestOutput(r.stdout, tests, hiddenIds)
    return {
      compiled: r.compiled,
      real: true,
      stdout: parsed.cleanStdout,
      stderr: r.stderr,
      tests: r.compiled ? parsed.tests : tests.map((t) => ({ id: t.id, name: t.name, status: 'not-run', hidden: hiddenIds.includes(t.id) })),
      timedOut: r.timedOut,
      durationMs: r.durationMs,
      compileErrors: parseJavacOutput(r.compileOutput).filter((d) => d.file !== `${HARNESS_CLASS}.java`).concat(
        // errores en el harness casi siempre significan firma/clase incorrecta en el código del alumno
        parseJavacOutput(r.compileOutput).filter((d) => d.file === `${HARNESS_CLASS}.java`).slice(0, 3).map((d) => ({
          ...d,
          title: 'Los tests no compilan contra tu código',
          suggestion: 'Revisá que los nombres de clases, constructores y métodos coincidan exactamente con los pedidos en el enunciado. ' + d.suggestion,
        })),
      ),
    }
  }

  async analyze(source: string, files: JavaFile[] = []): Promise<CodeAnalysisResult> {
    return analyzeJava(files.length ? files : [{ name: guessFileName(source), content: source }])
  }
}
