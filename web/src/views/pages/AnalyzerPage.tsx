import { useMemo, useState } from 'react'
import { guessFileName } from '../../controllers/execution/JavaExecutionService'
import { analyzeJava } from '../../controllers/analysis/analyzer'
import type { Diagnostic } from '../../models/types'
import { JavaEditor } from '../components/JavaEditor'
import { DiagnosticCard, Empty, Page } from '../components/ui'

const SAMPLE = `import java.util.*;

public class Tripulacion extends ElementoOnePiece {
    public String nombre;
    private ArrayList<ElementoOnePiece> elementos = new ArrayList<>();

    public ArrayList<ElementoOnePiece> getElementos() {
        return elementos;
    }

    public int getFuerza() {
        int total = 0;
        for (ElementoOnePiece e : elementos) {
            if (e instanceof Personaje) {
                total += ((Personaje) e).getFuerza();
            } else if (e instanceof Tripulacion) {
                total += ((Tripulacion) e).getFuerza();
            }
        }
        return total;
    }

    public Tripulacion copia() {
        Tripulacion t = new Tripulacion();
        t.elementos.addAll(this.elementos);
        return t;
    }

    public boolean esCapitan(String n) {
        return nombre == n;
    }
}
`

export default function AnalyzerPage() {
  const [code, setCode] = useState(SAMPLE)
  const [reveal, setReveal] = useState<{ file: string; line: number; n: number }>()
  const name = guessFileName(code)
  const result = useMemo(() => analyzeJava([{ name, content: code }]), [code, name])
  const by = (s: Diagnostic['severity']) => result.diagnostics.filter((d) => d.severity === s)
  return (
    <Page wide title="Analizador de código" subtitle="Pegá código Java y el analizador detecta errores reales, malas prácticas y mejoras opcionales, con explicación, ejemplo corregido y concepto asociado. El análisis es estático (heurístico): no reemplaza al compilador ni a los tests.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="card overflow-hidden h-[70vh] min-h-[420px]">
          <JavaEditor files={[{ name, content: code }]} active={name} onActive={() => {}} onChange={(_, c) => setCode(c)} diagnostics={result.diagnostics} revealLine={reveal} />
        </div>
        <div className="space-y-3 lg:max-h-[70vh] lg:overflow-y-auto">
          <div className="flex gap-2 flex-wrap text-sm" aria-live="polite">
            <span className="chip" style={{ color: 'var(--err)' }}>{by('error').length} errores</span>
            <span className="chip" style={{ color: 'var(--warn)' }}>{by('warning').length} malas prácticas</span>
            <span className="chip" style={{ color: 'var(--info)' }}>{by('info').length} mejoras opcionales</span>
            <span className="chip">{result.metrics.classes} clases · {result.metrics.methods} métodos</span>
          </div>
          {result.diagnostics.length === 0 ? <Empty>No se detectaron problemas.</Empty> : result.diagnostics.map((d, i) => <DiagnosticCard key={i} d={d} compact onGoto={(x) => setReveal({ file: name, line: x.line, n: Date.now() })} />)}
          <button className="btn btn-sm" onClick={() => setCode(SAMPLE)}>Cargar ejemplo con errores</button>
        </div>
      </div>
    </Page>
  )
}
