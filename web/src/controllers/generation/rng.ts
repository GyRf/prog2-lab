/** PRNG determinístico (mulberry32): misma semilla, mismo ejercicio. */
export class Rng {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0 || 1
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }
  /** double con 1 decimal */
  dbl(min: number, max: number): number {
    return Math.round((min + this.next() * (max - min)) * 10) / 10
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  bool(p = 0.5): boolean {
    return this.next() < p
  }
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31)
