import type { Attempt, Exercise, Progress } from '../models/types'
import { computeProgress, recommendExercises } from '../controllers/progress/progress'

/** Persistencia desacoplada: la app depende de esta interfaz, no de localStorage. */
export interface ProgressRepository {
  saveAttempt(attempt: Attempt): Promise<void>
  getProgress(userId: string): Promise<Progress>
  getRecommendedExercises(userId: string): Promise<Exercise[]>
  clear(userId: string): Promise<void>
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

/** Implementación MVP sobre localStorage (o cualquier KeyValueStore). */
export class LocalProgressRepository implements ProgressRepository {
  private store: KeyValueStore
  constructor(store?: KeyValueStore) {
    let s: KeyValueStore
    try { s = store ?? window.localStorage; s.getItem('probe') } catch { s = new MemoryStore() }
    this.store = s
  }
  private key(userId: string) { return `prog2lab:attempts:${userId}` }
  private load(userId: string): Attempt[] {
    try { return JSON.parse(this.store.getItem(this.key(userId)) ?? '[]') as Attempt[] } catch { return [] }
  }
  async saveAttempt(a: Attempt) {
    const all = this.load(a.userId)
    all.push(a)
    // shortcut: se guardan los últimos 500 intentos; pasar a IndexedDB/backend si se necesita historial completo.
    this.store.setItem(this.key(a.userId), JSON.stringify(all.slice(-500)))
  }
  async getProgress(userId: string) { return computeProgress(userId, this.load(userId)) }
  async getRecommendedExercises(userId: string) { return recommendExercises(computeProgress(userId, this.load(userId))) }
  async clear(userId: string) { this.store.removeItem(this.key(userId)) }
}
