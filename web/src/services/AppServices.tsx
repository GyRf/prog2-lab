import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BrowserJavaExecutionService, HttpJavaExecutionService, type JavaExecutionService } from '../controllers/execution/JavaExecutionService'
import { LocalProgressRepository, type ProgressRepository } from './ProgressRepository'

// Inyección de dependencias: las vistas obtienen servicios de acá, nunca los crean.

export type ServerStatus = 'checking' | 'online' | 'offline'

interface Services {
  execution: JavaExecutionService
  serverStatus: ServerStatus
  runner?: string
  recheckServer: () => void
  progress: ProgressRepository
  userId: string
  theme: 'dark' | 'light'
  toggleTheme: () => void
  progressVersion: number
  notifyProgress: () => void
}

const Ctx = createContext<Services | null>(null)
const API = (import.meta.env.VITE_JAVA_API_URL as string | undefined) ?? '/api'

const safeGet = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin storage */ } }

export function AppServicesProvider({ children }: { children: ReactNode }) {
  const [serverStatus, setStatus] = useState<ServerStatus>('checking')
  const [runner, setRunner] = useState<string>()
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (safeGet('prog2lab:theme') as 'dark' | 'light') ?? 'dark')
  const [progressVersion, setPV] = useState(0)
  const progress = useMemo(() => new LocalProgressRepository(), [])
  const http = useMemo(() => new HttpJavaExecutionService(API), [])
  const browser = useMemo(() => new BrowserJavaExecutionService(), [])

  const recheckServer = useCallback(() => {
    setStatus('checking')
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 2000)
    fetch(`${API}/health`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { runner: string }) => { setRunner(j.runner); setStatus('online') })
      .catch(() => setStatus('offline'))
      .finally(() => clearTimeout(t))
  }, [])

  useEffect(recheckServer, [recheckServer])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    safeSet('prog2lab:theme', theme)
  }, [theme])

  const value: Services = {
    execution: serverStatus === 'online' ? http : browser,
    serverStatus, runner, recheckServer,
    progress, userId: 'local',
    theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    progressVersion, notifyProgress: () => setPV((v) => v + 1),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useServices() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useServices fuera de AppServicesProvider')
  return s
}
