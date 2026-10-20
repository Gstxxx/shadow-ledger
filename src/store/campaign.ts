// Campanha "Herança": leituras para o menu (Briefing, Dossiê). As ações e o estado ficam no useGameStore
// (campaign, campaignResult, campaignNew, campaignPlay, campaignAdvance, campaignRetry, campaignAbandon).
import type { Key } from '../i18n';
import { CHAPTERS, cashBonus, chapterDef, dossierKeys } from '../game/campaign';
import type { CampaignState, RivalStrength } from '../game/campaign';
import type { ObjectiveKind, Unit } from '../game/types';
import { readChapterGame, useGameStore } from './game';

export { CHAPTERS };

export const getCampaign = (): CampaignState | null => useGameStore.getState().campaign;
export const useCampaign = (): CampaignState | null => useGameStore((s) => s.campaign);

/** O que o Briefing mostra de um Capítulo (chaves i18n + números). */
export interface ChapterBriefing {
  n: number;
  titleKey: Key;
  hookKey: Key;
  regionKey: Key;
  objective: ObjectiveKind;
  days: number;
  target?: number;
  cash: number;
  /** Bônus do Capítulo anterior, somado ao caixa inicial (só no Capítulo atual). */
  cashBonus: number;
  veterans: Unit[];
  rival?: RivalStrength;
  status: 'locked' | 'current' | 'done';
}

const key = (n: number, part: string) => `campaign.ch.${n}.${part}` as Key;

export function chapterBriefing(n: number, c: CampaignState | null = getCampaign()): ChapterBriefing {
  const ch = chapterDef(n);
  const at = c?.chapter ?? 1;
  const done = !!c && (n < at || (c.status === 'won' && n === at));
  const isCurrent = !done && n === at;
  return {
    n: ch.n,
    titleKey: key(ch.n, 'title'),
    hookKey: key(ch.n, 'hook'),
    regionKey: key(ch.n, 'region'),
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
export function dossierEntries(c: CampaignState | null = getCampaign()) {
  return CHAPTERS.map((ch) => ({ n: ch.n, ...dossierKeys(ch.n), unlocked: !!c?.dossier.includes(ch.n) }));
}

/** Há uma partida salva do Capítulo atual (campaignPlay retoma ela). */
export const hasChapterInProgress = (): boolean => !!readChapterGame(getCampaign());
