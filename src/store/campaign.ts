// Campanha "Herança": estado da Campanha (save próprio, versionado) e o fluxo de Capítulos para a UI.
// O motor está em src/game/campaign; a partida de cada Capítulo roda no useGameStore como qualquer outra.
import { create } from 'zustand';
import type { Key } from '../i18n';
import {
  CHAPTERS,
  cashBonus,
  chapterDef,
  chapterResult as resultOf,
  commitChapter as commit,
  dossierKeys,
  failChapter,
  loadCampaign,
  newCampaign as create0,
  startChapter as build,
} from '../game/campaign';
import type { CampaignState, ChapterResult, NewCampaignOptions, RivalStrength } from '../game/campaign';
import { loadSave } from '../game/save';
import type { GameState, ObjectiveKind, Unit } from '../game/types';
import { CAMPAIGN_GAME_KEY, useGameStore } from './game';

export { CHAPTERS };
export type { CampaignState, ChapterResult, NewCampaignOptions };

const CAMPAIGN_KEY = 'shadow-ledger.campaign.v1';

function read<T>(key: string, parse: (raw: string) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage cheio ou bloqueado: a Campanha segue na memória */
  }
}

interface CampaignStore {
  campaign: CampaignState | null;
  set(c: CampaignState | null): void;
}

export const useCampaignStore = create<CampaignStore>()((set) => ({
  campaign: read(CAMPAIGN_KEY, loadCampaign),
  set: (c) => {
    write(CAMPAIGN_KEY, c);
    set({ campaign: c });
  },
}));

const current = () => useCampaignStore.getState().campaign;
const save = (c: CampaignState | null) => useCampaignStore.getState().set(c);

/** Campanha salva (null se não há). */
export const getCampaign = (): CampaignState | null => current();
export const useCampaign = (): CampaignState | null => useCampaignStore((s) => s.campaign);

/** O que o Briefing mostra de um Capítulo (chaves i18n + números). */
export interface ChapterBriefing {
  n: number;
  titleKey: Key;
  hookKey: Key;
  regionKey: Key;
  analystKeys: Key[];
  objective: ObjectiveKind;
  days: number;
  target?: number;
  cash: number;
  /** Bônus do Capítulo anterior já incluso no caixa inicial (só para o Capítulo atual). */
  cashBonus: number;
  veterans: Unit[];
  rival?: RivalStrength;
  status: 'locked' | 'current' | 'done';
}

const key = (n: number, part: string) => `campaign.ch.${n}.${part}` as Key;

export function chapterBriefing(n: number, c: CampaignState | null = current()): ChapterBriefing {
  const ch = chapterDef(n);
  const at = c?.chapter ?? 1;
  const done = !!c && (n < at || (c.status === 'won' && n === at));
  const isCurrent = !done && n === at;
  return {
    n: ch.n,
    titleKey: key(ch.n, 'title'),
    hookKey: key(ch.n, 'hook'),
    regionKey: key(ch.n, 'region'),
    analystKeys: ch.beats.map((b) => b.key as Key),
    objective: ch.preset.objective,
    days: ch.preset.days,
    target: ch.preset.target,
    cash: ch.preset.cash,
    cashBonus: isCurrent && c ? cashBonus(c.lastProfit, ch.n) : 0,
    veterans: isCurrent && c ? c.veterans : [],
    rival: ch.rival,
    status: done ? 'done' : isCurrent ? 'current' : 'locked',
  };
}

/** Pistas do Dossiê, liberadas ou não, na ordem dos Capítulos. */
export function dossierEntries(c: CampaignState | null = current()) {
  return CHAPTERS.map((ch) => ({ n: ch.n, ...dossierKeys(ch.n), unlocked: !!c?.dossier.includes(ch.n) }));
}

/** Partida do Capítulo em andamento, se houver. */
function readChapterGame(): GameState | null {
  const g = read(CAMPAIGN_GAME_KEY, loadSave);
  const c = current();
  return g && c && g.campaign?.chapter === c.chapter ? g : null;
}

export const hasChapterInProgress = (): boolean => !!readChapterGame() && current()?.status === 'active';

/** Começa uma Campanha nova (apaga a anterior). Não entra no jogo: o menu mostra o Briefing do Capítulo 1. */
export function newCampaign(o: NewCampaignOptions): CampaignState {
  const c = create0(o);
  write(CAMPAIGN_GAME_KEY, null);
  save(c);
  return c;
}

/** Monta e entra no Capítulo atual (depois do Briefing). */
export function startChapter(): boolean {
  const c = current();
  if (!c || c.status !== 'active') return false;
  useGameStore.getState().load(build(c));
  return true;
}

/** Retoma a partida do Capítulo em andamento. */
export function continueChapter(): boolean {
  const g = readChapterGame();
  if (!g || current()?.status !== 'active') return false;
  useGameStore.getState().load(g, true);
  return true;
}

/** Resultado da partida de Campanha que acabou de terminar (null se não terminou ou não é da Campanha). */
export function chapterResult(): ChapterResult | null {
  const c = current();
  const g = useGameStore.getState().game;
  if (!c || !g?.over || g.campaign?.chapter !== c.chapter) return null;
  return resultOf(c, g);
}

/** Debriefing: leva os Veteranos escolhidos (até 3) e avança. Devolve a Campanha atualizada. */
export function commitChapter(veteranUids: string[]): CampaignState | null {
  const c = current();
  const g = useGameStore.getState().game;
  if (!c || !g?.over?.won || g.campaign?.chapter !== c.chapter) return null;
  const next = commit(c, g, veteranUids);
  write(CAMPAIGN_GAME_KEY, null);
  save(next);
  return next;
}

/**
 * Capítulo perdido. Fora do Hardcore, monta a nova tentativa do mesmo estado e entra nela (true).
 * No Hardcore, encerra a Campanha (status 'lost') e devolve false.
 */
export function retryChapter(): boolean {
  const c = current();
  if (!c || c.status !== 'active') return false;
  const next = failChapter(c);
  write(CAMPAIGN_GAME_KEY, null);
  save(next);
  if (next.status !== 'active') return false;
  useGameStore.getState().load(build(next));
  return true;
}

/** Apaga a Campanha e a partida do Capítulo. */
export function abandonCampaign() {
  write(CAMPAIGN_GAME_KEY, null);
  save(null);
}
