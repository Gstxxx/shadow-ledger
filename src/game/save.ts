// Save: JSON puro com versão e migrações (pensado para a futura sincronização em nuvem).
import type { GameState } from './types';

/** Bump this and add a step to MIGRATIONS whenever the saved shape changes. */
export const SAVE_VERSION = 5;

type RawSave = Record<string, unknown> & { saveVersion?: number; version?: number };

/** Each step upgrades a save from version `from` to `from + 1`. */
const MIGRATIONS: Record<number, (s: RawSave) => void> = {
  // v3 → v4: `version` vira `saveVersion`; Crise Final e registro de ADM passam a existir.
  3: (s) => {
    delete s.version;
    s.crisis ??= { hours: 0 };
    s.wmdLedger ??= [];
  },
  // v4 → v5: Origem do Diretor; saves antigos recebem a Origem neutra.
  4: (s) => {
    for (const a of (s.agencies as { origin?: string }[]) ?? []) a.origin ??= 'none';
  },
};

/** Parse and upgrade a save. Returns null for anything unknown or newer than this build. */
export function loadSave(json: string): GameState | null {
  let raw: RawSave;
  try {
    raw = JSON.parse(json) as RawSave;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.agencies)) return null;
  let v = raw.saveVersion ?? raw.version;
  if (typeof v !== 'number' || v > SAVE_VERSION || v < 3) return null;
  while (v < SAVE_VERSION) {
    MIGRATIONS[v]?.(raw);
    v += 1;
  }
  raw.saveVersion = SAVE_VERSION;
  return raw as unknown as GameState;
}

export const serializeSave = (s: GameState) => JSON.stringify(s);
