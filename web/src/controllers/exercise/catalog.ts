import { STATIC_EXERCISES } from '../../data/exercises'
import type { Difficulty, Exercise } from '../../models/types'
import { templateById } from '../generation/templates'

// CONTROLLER: acceso a ejercicios. Los generados no se guardan: su id codifica
// (plantilla, dominio, dificultad, semilla) y se regeneran de forma determinística.

export const genId = (templateId: string, domain: string, difficulty: Difficulty, seed: number) => `gen-${templateId}-${domain}-${difficulty}-${seed}`

export function getExercise(id: string): Exercise | undefined {
  const s = STATIC_EXERCISES.find((e) => e.id === id)
  if (s) return s
  const m = id.match(/^gen-([a-z-]+?)-([a-z]+)-(introductory|intermediate|advanced|exam)-(\d+)$/)
  if (!m) return undefined
  const t = templateById(m[1])
  return t?.generate({ templateId: m[1], domain: m[2], difficulty: m[3] as Difficulty, seed: Number(m[4]) })
}

export const listStaticExercises = () => STATIC_EXERCISES
