/** Anything that carries an rng cursor: the GameState, or a scratch holder for previews. */
export interface RngHolder {
  rng: number;
}

/** mulberry32 step over the holder's rng cursor; keeps games reproducible from a seed. */
export function rand(s: RngHolder): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randInt = (s: RngHolder, min: number, max: number) => min + Math.floor(rand(s) * (max - min + 1));
export const chance = (s: RngHolder, p: number) => rand(s) < p;
export const pick = <T>(s: RngHolder, arr: readonly T[]): T => arr[Math.floor(rand(s) * arr.length)];
export const randRange = (s: RngHolder, min: number, max: number) => min + rand(s) * (max - min);

export function shuffle<T>(s: RngHolder, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Weighted pick; weights must be >= 0 and not all zero. */
export function weighted<T>(s: RngHolder, entries: readonly [T, number][]): T {
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let x = rand(s) * total;
  for (const [v, w] of entries) {
    x -= w;
    if (x <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
