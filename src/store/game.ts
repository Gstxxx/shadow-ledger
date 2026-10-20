import { create } from 'zustand';
import type { Result } from '../game/actions';
import type { Msg } from '../i18n/lookup';
import { advance, isBlocked } from '../game/sim';
import { loadSave } from '../game/save';
import { chapterResult, commitChapter, failChapter, loadCampaign, newCampaign, startChapter } from '../game/campaign';
import type { CampaignState, ChapterResult, NewCampaignOptions } from '../game/campaign';
import { newGame, player } from '../game/state';
import type { Agency, GameOptions, GameState } from '../game/types';
import { audio } from '../audio/engine';
import type { Sfx } from '../audio/engine';
import { useSettings } from './settings';
import type { Speed } from './settings';

const SAVE_KEY = 'shadow-ledger.save.v3';
/** Partida do Capítulo em andamento da Campanha: slot próprio, não toca o save da partida avulsa. */
export const CAMPAIGN_GAME_KEY = 'shadow-ledger.campaign.game.v1';
/** Estado da Campanha (src/game/campaign), versionado à parte. */
export const CAMPAIGN_KEY = 'shadow-ledger.campaign.v1';
/** Game hours per real second at 1×. */
export const HOURS_PER_SECOND = 1;

export type Screen = 'title' | 'newgame' | 'settings' | 'credits' | 'game';

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
  /** Mensagem traduzível; a UI prefere ela ao texto. */
  msg?: Msg;
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
  /** Campanha salva (slot próprio), ou null. */
  campaign: CampaignState | null;
  /** Resultado da partida de Campanha que terminou; a UI mostra Debriefing ou derrota por cima do jogo. */
  campaignResult: ChapterResult | null;
  /** Cria a Campanha (apaga a anterior). Não entra no jogo. */
  campaignNew(o: NewCampaignOptions): void;
  /** Entra no Capítulo atual: retoma a partida salva dele ou monta uma nova. */
  campaignPlay(): void;
  /** Fecha o Capítulo vencido com até 3 Veteranos e volta ao menu. */
  campaignAdvance(veteranUids: string[]): void;
  /** Capítulo perdido: nova tentativa do mesmo estado; no Hardcore encerra a Campanha e volta ao menu. */
  campaignRetry(): void;
  /** Apaga a Campanha e a partida do Capítulo. */
  campaignAbandon(): void;
  go(screen: Screen): void;
  start(opts: GameOptions): void;
  /** Entra numa partida já montada (Capítulo da Campanha). */
  load(g: GameState, paused?: boolean): void;
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
  toast(text: string, tone?: Toast['tone'], msg?: Msg): void;
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
    localStorage.setItem(s.campaign ? CAMPAIGN_GAME_KEY : SAVE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the game keeps running */
  }
}

function readJson<T>(key: string, parse: (raw: string) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}

function writeKey(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage cheio ou bloqueado */
  }
}

/** Partida salva do Capítulo atual da Campanha, se houver. */
export function readChapterGame(c: CampaignState | null): GameState | null {
  const g = readJson(CAMPAIGN_GAME_KEY, loadSave);
  return g && c && c.status === 'active' && g.campaign?.chapter === c.chapter ? g : null;
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
  campaign: readJson(CAMPAIGN_KEY, loadCampaign),
  campaignResult: null,

  go: (screen) => set({ screen }),

  start: (opts) => {
    const g = newGame(opts);
    lastSaveDay = -1;
    writeSave(g);
    set({ game: g, screen: 'game', rev: get().rev + 1, speed: useSettings.getState().defaultSpeed, paused: false, selected: player(g).location });
  },

  load: (g, paused = false) => {
    lastSaveDay = Math.floor(g.time / 24);
    writeSave(g);
    set({ game: g, screen: 'game', rev: get().rev + 1, speed: useSettings.getState().defaultSpeed, paused, selected: player(g).location, campaignResult: null });
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
    set({ screen: 'title', game: null, campaignResult: null });
  },

  act: (fn, sfx) => {
    const g = get().game;
    if (!g) return { ok: false, msg: 'Sem partida.' };
    const r = fn(g, player(g));
    if (r.ok) {
      if (sfx) audio.sfx(sfx);
      if (r.msg) get().toast(r.msg, 'good', r.m);
      if (!g.over) writeSave(g);
    } else {
      audio.sfx('close');
      get().toast(r.msg, 'bad', r.m);
    }
    set({ rev: get().rev + 1 });
    syncCampaign();
    return r;
  },

  mutate: (fn) => {
    const g = get().game;
    if (!g) return;
    fn(g);
    if (!g.combat && !g.pendingCombat) writeSave(g);
    set({ rev: get().rev + 1 });
    syncCampaign();
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
    if (g.over) syncCampaign();
  },

  setSpeed: (v) => set({ speed: v, paused: false }),

  skipToNextEvent: (maxHours = 24 * 30) => {
    const g = get().game;
    if (!g || isBlocked(g)) return 0;
    let done = 0;
    while (done < maxHours && !isBlocked(g)) done += advance(g, Math.min(24, maxHours - done)) || maxHours;
    writeSave(g);
    set({ rev: get().rev + 1 });
    syncCampaign();
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

  toast: (text, tone = 'info', msg) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-3), { id, text, tone, msg }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3800);
  },

  campaignNew: (o) => {
    const c = newCampaign(o);
    writeKey(CAMPAIGN_GAME_KEY, null);
    writeKey(CAMPAIGN_KEY, c);
    set({ campaign: c, campaignResult: null });
  },

  campaignPlay: () => {
    const c = get().campaign;
    if (!c || c.status !== 'active') return;
    const saved = readChapterGame(c);
    get().load(saved ?? startChapter(c), !!saved);
    syncCampaign();
  },

  campaignAdvance: (veteranUids) => {
    const { campaign: c, game: g } = get();
    if (!c || !g?.over?.won || g.campaign?.chapter !== c.chapter) return;
    const next = commitChapter(c, g, veteranUids);
    writeKey(CAMPAIGN_GAME_KEY, null);
    writeKey(CAMPAIGN_KEY, next);
    set({ campaign: next, campaignResult: null, game: null, screen: 'title' });
  },

  campaignRetry: () => {
    const c = get().campaign;
    if (!c || c.status !== 'active') return;
    const next = failChapter(c);
    writeKey(CAMPAIGN_GAME_KEY, null);
    writeKey(CAMPAIGN_KEY, next);
    set({ campaign: next, campaignResult: null });
    if (next.status === 'active') get().load(startChapter(next));
    else set({ game: null, screen: 'title' });
  },

  campaignAbandon: () => {
    writeKey(CAMPAIGN_GAME_KEY, null);
    writeKey(CAMPAIGN_KEY, null);
    const g = get().game;
    set({ campaign: null, campaignResult: null, ...(g?.campaign ? { game: null, screen: 'title' as Screen } : {}) });
  },

  save: () => {
    const g = get().game;
    if (g) writeSave(g);
  },
}));

/** Preenche `campaignResult` quando a partida do Capítulo atual termina. */
function syncCampaign() {
  const { game: g, campaign: c, campaignResult } = useGameStore.getState();
  if (campaignResult || !g?.over || !c || g.campaign?.chapter !== c.chapter) return;
  writeSave(g);
  useGameStore.setState({ campaignResult: chapterResult(c, g) });
}

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
