import { useEffect, useState } from 'react'
import type { Progress } from '../models/types'
import { useServices } from '../services/AppServices'

/** Hook de vista: lee el progreso del repositorio y se actualiza cuando cambia. */
export function useProgress(): Progress | null {
  const { progress, userId, progressVersion } = useServices()
  const [p, setP] = useState<Progress | null>(null)
  useEffect(() => {
    let alive = true
    progress.getProgress(userId).then((x) => alive && setP(x))
    return () => { alive = false }
  }, [progress, userId, progressVersion])
  return p
}

const KEY = 'prog2lab:examDate'
export function useExamDate(): [string, (v: string) => void] {
  const [v, setV] = useState(() => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } })
  return [v, (x: string) => { setV(x); try { localStorage.setItem(KEY, x) } catch { /* sin storage */ } }]
}

export const daysUntil = (date: string) => (date ? Math.ceil((new Date(date + 'T00:00:00').getTime() - Date.now()) / 86_400_000) : undefined)
