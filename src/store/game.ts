import { create } from 'zustand';
import type { Result } from '../game/actions';
import { advance, isBlocked } from '../game/sim';
import { loadSave } from '../game/save';
import { newGame, player } from '../game/state';
import type { Agency, GameOptions, GameState } from '../game/types';
import { audio } from '../audio/engine';
import type { Sfx } from '../audio/engine';
import { useSettings } from './settings';
import type { Speed } from './settings';

const SAVE_KEY = 'shadow-ledger.save.v3';
/** Game hours per real second at 1×. */
export const HOURS_PER_SECOND = 1;

export type Screen = 'title' | 'newgame' | 'settings' | 'credits' | 'game';

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

interface GameStore {
  screen: Screen;
  game: GameState | null;
  /** Bumped on every mutation so components re-render. */
  rev: number;
  speed: Speed;
  paused: boolean;
  selected: string | null;
  toasts: Toast[];
  go(screen: Screen): void;
  start(opts: GameOptions): void;
  continueSaved(): boolean;
  quit(): void;
  /** Run an agency action for the player; toasts the outcome. */
  act(fn: (s: GameState, a: Agency) => Result, sfx?: Sfx): Result;
  /** Mutate the game without the Result plumbing (UI bookkeeping, combat steps). */
  mutate(fn: (s: GameState) => void): void;
  tick(seconds: number): void;
  setSpeed(v: Speed): void;
  /** Avança o relógio até o próximo Evento (ou até `maxHours`). Returns hours simulated. */
  skipToNextEvent(maxHours?: number): number;
  togglePause(): void;
  select(id: string | null): void;
  ackEvent(id?: string): void;
  toast(text: string, tone?: Toast['tone']): void;
  save(): void;
}

let toastId = 0;
let lastSaveDay = -1;
let lastRender = 0;
/** Re-render at most this often while the clock runs (ms). */
const RENDER_MS = 66;

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

function readSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return loadSave(raw);
  } catch {
    return null;
  }
}

function writeSave(s: GameState) {
  try {
    s.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the game keeps running */
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing to delete */
  }
}

export function exportSave(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

export function importSave(json: string): boolean {
  try {
    const s = loadSave(json);
    if (!s) return false;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export const useGameStore = create<GameStore>()((set, get) => ({
  screen: 'title',
  game: null,
  rev: 0,
  speed: 1,
  paused: false,
  selected: null,
  toasts: [],

  go: (screen) => set({ screen }),

  start: (opts) => {
    const g = newGame(opts);
    lastSaveDay = -1;
    writeSave(g);
    set({ game: g, screen: 'game', rev: get().rev + 1, speed: useSettings.getState().defaultSpeed, paused: false, selected: player(g).location });
  },

  continueSaved: () => {
    const g = readSave();
    if (!g) return false;
    lastSaveDay = Math.floor(g.time / 24);
    set({ game: g, screen: 'game', rev: get().rev + 1, speed: useSettings.getState().defaultSpeed, paused: true, selected: player(g).location });
    return true;
  },

  quit: () => {
    const g = get().game;
    if (g && !g.over) writeSave(g);
    set({ screen: 'title', game: null });
  },

  act: (fn, sfx) => {
    const g = get().game;
    if (!g) return { ok: false, msg: 'Sem partida.' };
    const r = fn(g, player(g));
    if (r.ok) {
      if (sfx) audio.sfx(sfx);
      if (r.msg) get().toast(r.msg, 'good');
      if (!g.over) writeSave(g);
    } else {
      audio.sfx('close');
      get().toast(r.msg, 'bad');
    }
    set({ rev: get().rev + 1 });
    return r;
  },

  mutate: (fn) => {
    const g = get().game;
    if (!g) return;
    fn(g);
    if (!g.combat && !g.pendingCombat) writeSave(g);
    set({ rev: get().rev + 1 });
  },

  tick: (seconds) => {
    const { game: g, paused, speed } = get();
    if (!g || paused || isBlocked(g)) return;
    const before = g.events.length;
    advance(g, Math.min(seconds, 0.25) * speed * HOURS_PER_SECOND);
    if (g.events.length > before) audio.sfx(g.events.some((e) => e.tone === 'bad' || e.tone === 'warn') ? 'alert' : 'arrive');
    const day = Math.floor(g.time / 24);
    if (day !== lastSaveDay || g.events.length > before) {
      lastSaveDay = day;
      writeSave(g);
    }
    const now = performance.now();
    if (now - lastRender >= RENDER_MS || g.events.length > before || isBlocked(g)) {
      lastRender = now;
      set({ rev: get().rev + 1 });
    }
  },

  setSpeed: (v) => set({ speed: v, paused: false }),

  skipToNextEvent: (maxHours = 24 * 30) => {
    const g = get().game;
    if (!g || isBlocked(g)) return 0;
    let done = 0;
    while (done < maxHours && !isBlocked(g)) done += advance(g, Math.min(24, maxHours - done)) || maxHours;
    writeSave(g);
    set({ rev: get().rev + 1 });
    return done;
  },
  togglePause: () => set({ paused: !get().paused }),
  select: (id) => set({ selected: id }),

  ackEvent: (id) => {
    const g = get().game;
    if (!g) return;
    g.events = id ? g.events.filter((e) => e.id !== id) : g.events.slice(1);
    writeSave(g);
    set({ rev: get().rev + 1 });
  },

  toast: (text, tone = 'info') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-3), { id, text, tone }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3800);
  },

  save: () => {
    const g = get().game;
    if (g) writeSave(g);
  },
}));

/** Subscribe a component to every game mutation and get the live state. */
export function useGame(): GameState {
  useGameStore((s) => s.rev);
  return useGameStore.getState().game!;
}

export const usePlayer = (): Agency => player(useGame());

// Dev-only handle for debugging in the browser console.
if (import.meta.env.DEV) {
  const w = globalThis as unknown as { __sl: typeof useGameStore; __slAdvance: (h: number) => number };
  w.__sl = useGameStore;
  w.__slAdvance = (h) => {
    let done = 0;
    useGameStore.getState().mutate((g) => (done = advance(g, h)));
    return done;
  };
}
