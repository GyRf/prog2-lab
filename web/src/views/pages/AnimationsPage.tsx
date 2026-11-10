import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ANIMATIONS, animationById } from '../../data/animations'
import type { AnimationDef, HeapObjView, Scene, SlotView, TreeView } from '../../models/animation'
import { Icon } from '../components/Icon'
import { ConceptChips, Page } from '../components/ui'
import { NotFound } from './NotFound'

export function AnimationsPage() {
  return (
    <Page title="Animaciones" subtitle="Cada animación se puede pausar, avanzar y retroceder paso a paso, cambiar los datos y ver qué línea y qué método se ejecuta.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ANIMATIONS.map((a) => (
          <Link key={a.id} to={`/animaciones/${a.id}`} className="card p-4 flex flex-col gap-2 hover:border-[var(--accent)]">
            <span className="font-medium">{a.title}</span>
            <span className="text-sm muted flex-1">{a.description}</span>
            <ConceptChips ids={a.concepts} max={3} />
          </Link>
        ))}
      </div>
    </Page>
  )
}

export function AnimationPage() {
  const { id } = useParams()
  const anim = animationById(id ?? '')
  if (!anim) return <NotFound />
  return <Player key={anim.id} anim={anim} />
}

function Player({ anim }: { anim: AnimationDef }) {
  const [params, setParams] = useState<Record<string, string>>(() => Object.fromEntries(anim.params.map((p) => [p.name, p.default])))
  const steps = useMemo(() => anim.build(params), [anim, params])
  const code = useMemo(() => anim.code(params).split('\n'), [anim, params])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1600)
  const step = steps[Math.min(i, steps.length - 1)]

  useEffect(() => { setI(0); setPlaying(false) }, [steps])
  useEffect(() => {
    if (!playing) return
    if (i >= steps.length - 1) { setPlaying(false); return }
    const t = setTimeout(() => setI((x) => x + 1), speed)
    return () => clearTimeout(t)
  }, [playing, i, steps.length, speed])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, steps.length - 1))
    if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0))
    if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
  }

  return (
    <Page wide title={anim.title} subtitle={anim.description} actions={<Link to="/animaciones" className="btn btn-sm">Todas las animaciones</Link>}>
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2" onKeyDown={onKey} role="group" aria-label="Controles de la animación (flechas y espacio)">
        <button className="btn btn-sm" onClick={() => setI(0)} aria-label="Reiniciar"><Icon name="reset" size={14} /></button>
        <button className="btn btn-sm" onClick={() => setI((x) => Math.max(x - 1, 0))} disabled={i === 0} aria-label="Paso anterior"><Icon name="prev" size={14} /></button>
        <button className="btn btn-sm btn-primary" onClick={() => { if (i >= steps.length - 1) setI(0); setPlaying((p) => !p) }} aria-label={playing ? 'Pausar' : 'Reproducir'}><Icon name={playing ? 'pause' : 'play'} size={14} />{playing ? 'Pausar' : 'Reproducir'}</button>
        <button className="btn btn-sm" onClick={() => setI((x) => Math.min(x + 1, steps.length - 1))} disabled={i >= steps.length - 1} aria-label="Paso siguiente"><Icon name="next" size={14} /></button>
        <span className="text-sm muted tabular-nums">Paso {i + 1}/{steps.length}</span>
        <label className="text-xs flex items-center gap-1 ml-auto">Velocidad
          <select className="input !py-1 text-xs" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value={2600}>Lenta</option><option value={1600}>Normal</option><option value={800}>Rápida</option>
          </select>
        </label>
        {anim.params.map((p) => (
          <label key={p.name} className="text-xs flex items-center gap-1">{p.label}
            <select className="input !py-1 text-xs" value={params[p.name]} onChange={(e) => setParams((s) => ({ ...s, [p.name]: e.target.value }))}>
              {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3 min-w-0">
          <pre className="codeblock !p-0" aria-label="Código">
            {code.map((l, n) => (
              <div key={n} className="px-3 flex" style={n + 1 === step.line ? { background: 'var(--accent-soft)', boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined} aria-current={n + 1 === step.line ? 'step' : undefined}>
                <span className="w-6 shrink-0 text-right pr-3 muted select-none">{n + 1}</span><span>{l || ' '}</span>
              </div>
            ))}
          </pre>
          <div className="card p-4" aria-live="polite">
            {step.method && <p className="text-xs mb-1"><span className="muted">Ejecutando: </span><code className="font-mono" style={{ color: 'var(--accent)' }}>{step.method}</code></p>}
            <p>{step.note}</p>
          </div>
        </div>
        <SceneView scene={step.scene} />
      </div>
    </Page>
  )
}

function Slot({ s }: { s: SlotView }) {
  return (
    <div className="flex justify-between gap-3 text-sm font-mono px-2 py-1 rounded transition-colors" style={s.changed ? { background: 'var(--warn-soft)' } : undefined}>
      <span>{s.name}</span>
      {s.ref ? <span className="chip font-mono" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>→ {s.ref}</span> : <span>{s.value}</span>}
    </div>
  )
}

function HeapObj({ o }: { o: HeapObjView }) {
  return (
    <div className="rounded-lg border p-2 transition-all" style={{ borderColor: o.highlight ? 'var(--accent)' : 'var(--border)', opacity: o.dim ? 0.35 : 1, background: 'var(--panel)' }}>
      <div className="flex justify-between items-center mb-1 text-sm">
        <span className="font-semibold">{o.cls}</span>
        <span className="chip font-mono" style={{ color: 'var(--accent)' }}>{o.id}</span>
      </div>
      {o.tag && <div className="text-xs muted mb-1">{o.tag}</div>}
      {o.fields.map((f, i) => <Slot key={i} s={f} />)}
      {o.dim && <div className="text-xs muted mt-1">inalcanzable</div>}
    </div>
  )
}

function Tree({ t }: { t: TreeView }) {
  const color = t.state === 'visiting' ? 'var(--accent)' : t.state === 'done' ? 'var(--ok)' : 'var(--border)'
  return (
    <div className="rounded-lg border p-2 transition-colors" style={{ borderColor: color, background: t.state === 'visiting' ? 'var(--accent-soft)' : 'var(--panel)' }}>
      <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{t.label}</span>{t.value && <span className="font-mono" style={{ color: t.state === 'done' ? 'var(--ok)' : undefined }}>{t.value}</span>}</div>
      {!!t.children?.length && <div className="mt-2 pl-3 space-y-2 border-l" style={{ borderColor: 'var(--border)' }}>{t.children.map((c, i) => <Tree key={i} t={c} />)}</div>}
    </div>
  )
}

function SceneView({ scene }: { scene: Scene }) {
  const CELL = { idle: 'var(--border)', compare: 'var(--accent)', moved: 'var(--warn)', sorted: 'var(--ok)' }
  return (
    <div className="space-y-4 min-w-0">
      {scene.array && (
        <div className="flex flex-wrap gap-2" aria-label="Lista">
          {scene.array.map((c, i) => (
            <div key={i} className="rounded-lg border-2 px-3 py-2 text-center min-w-20 transition-colors" style={{ borderColor: CELL[c.state ?? 'idle'] }}>
              <div className="font-medium text-sm">{c.label}</div><div className="text-xs muted">{c.sub}</div>
            </div>
          ))}
        </div>
      )}
      {scene.tree && <Tree t={scene.tree} />}
      {(scene.frames?.length || scene.heap?.length) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {scene.frames && (
            <div>
              <h2 className="text-xs uppercase tracking-wider muted mb-1">Pila de llamadas</h2>
              <div className="space-y-2">
                {scene.frames.map((f, i) => (
                  <div key={i} className="rounded-lg border p-2" style={{ borderColor: f.error ? 'var(--err)' : f.active ? 'var(--accent)' : 'var(--border)', background: f.error ? 'var(--err-soft)' : 'var(--panel)' }}>
                    <div className="text-sm font-semibold font-mono">{f.name}</div>
                    {f.vars.map((v, j) => <Slot key={j} s={v} />)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!!scene.heap?.length && (
            <div>
              <h2 className="text-xs uppercase tracking-wider muted mb-1">Heap (objetos)</h2>
              <div className="space-y-2">{scene.heap.map((o) => <HeapObj key={o.id} o={o} />)}</div>
            </div>
          )}
        </div>
      ) : null}
      {!!scene.output?.length && (
        <div>
          <h2 className="text-xs uppercase tracking-wider muted mb-1">Salida</h2>
          <pre className="codeblock">{scene.output.join('\n')}</pre>
        </div>
      )}
    </div>
  )
}
