import type { GameState } from './types';

/** mulberry32 step over the state's rng cursor; keeps games reproducible from a seed. */
export function rand(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randInt = (s: GameState, min: number, max: number) => min + Math.floor(rand(s) * (max - min + 1));
export const chance = (s: GameState, p: number) => rand(s) < p;
export const pick = <T>(s: GameState, arr: readonly T[]): T => arr[Math.floor(rand(s) * arr.length)];
export const randRange = (s: GameState, min: number, max: number) => min + rand(s) * (max - min);

export function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
