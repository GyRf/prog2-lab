import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { UNITS } from '../../data/concepts'
import { useServices } from '../../services/AppServices'
import { Icon } from '../components/Icon'

const NAV = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/modulos', label: 'Módulos y teoría', icon: 'book' },
  { to: '/practicar', label: 'Práctica por tema', icon: 'code' },
  { to: '/generador', label: 'Generar ejercicio', icon: 'dice' },
  { to: '/examen', label: 'Simulacro de examen', icon: 'clock' },
  { to: '/analizador', label: 'Analizar código', icon: 'search' },
  { to: '/animaciones', label: 'Animaciones', icon: 'film' },
  { to: '/progreso', label: 'Mi progreso', icon: 'chart' },
]

function ServerPill() {
  const { serverStatus, recheckServer } = useServices()
  const label = serverStatus === 'online' ? 'Java: conectado' : serverStatus === 'checking' ? 'Java: conectando (puede tardar ~1 min)…' : 'Java: sin servidor'
  const color = serverStatus === 'online' ? 'var(--ok)' : serverStatus === 'checking' ? 'var(--muted)' : 'var(--warn)'
  return (
    <button onClick={recheckServer} className="chip w-full justify-start" title={serverStatus === 'offline' ? 'Sin servidor: se analiza el código pero no se compila ni ejecuta. Ver README para iniciarlo. Click para reintentar.' : 'Click para volver a verificar'}>
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </button>
  )
}

export function Layout() {
  const { theme, toggleTheme } = useServices()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])

  const nav = (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${isActive ? 'font-semibold' : 'muted hover:text-[var(--text)]'}`} style={({ isActive }) => (isActive ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined)}>
          <Icon name={n.icon} />
          {n.label}
        </NavLink>
      ))}
      <div className="mt-5 mb-1 px-3 text-[0.7rem] font-semibold uppercase tracking-wider muted">Unidades</div>
      {UNITS.map((u, i) => (
        <NavLink key={u.id} to={`/modulos#${u.id}`} className="rounded-lg px-3 py-1.5 text-sm muted hover:text-[var(--text)]">
          {i + 1}. {u.title}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-full flex">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 card">Saltar al contenido</a>
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 border-r p-4 sticky top-0 h-screen overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <Brand />
        {nav}
        <div className="mt-auto flex flex-col gap-2">
          <ServerPill />
          <ThemeButton theme={theme} toggle={toggleTheme} />
        </div>
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[85%] h-full overflow-y-auto p-4 flex flex-col gap-4" style={{ background: 'var(--panel)' }}>
            <div className="flex items-center justify-between"><Brand /><button className="btn btn-sm" onClick={() => setOpen(false)} aria-label="Cerrar menú"><Icon name="x" /></button></div>
            {nav}
            <ServerPill />
            <ThemeButton theme={theme} toggle={toggleTheme} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
          <button className="btn btn-sm" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}><Icon name="menu" /></button>
          <Brand />
        </header>
        <main id="contenido" className="flex-1 min-w-0" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2 font-semibold">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>P2</span>
      <span>Prog2 Lab</span>
    </NavLink>
  )
}

function ThemeButton({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button className="btn btn-sm justify-start" onClick={toggle} aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} /> Tema {theme === 'dark' ? 'claro' : 'oscuro'}
    </button>
  )
}
