// Adaptador store → UI da Campanha. O motor (src/game/campaign) define CampaignState e ChapterResult; a store
// expõe o estado e as ações combinadas com o game-builder. Enquanto a store não tiver as ações, devolve
// undefined e o menu não mostra o item (nada quebra).
import { CHAPTERS, cashBonus, type CampaignState, type ChapterResult, type NewCampaignOptions } from '../../../game/campaign';
import { useGameStore } from '../../../store/game';
import type { CampaignMenuProps, CampaignResultView, CampaignView } from './types';

interface CampaignStoreShape {
  campaign?: CampaignState | null;
  campaignResult?: ChapterResult | null;
  campaignNew?(o: NewCampaignOptions): void;
  campaignPlay?(): void;
  campaignAdvance?(veteranUids: string[]): void;
  campaignRetry?(): void;
  campaignAbandon?(): void;
  go?(screen: string): void;
}

const api = (st: unknown) => st as CampaignStoreShape;

export function toView(c: CampaignState): CampaignView {
  const done = c.history.map((h) => h.n);
  return {
    chapter: c.chapter,
    completed: c.status === 'won' ? CHAPTERS.map((x) => x.n) : done,
    clues: c.dossier,
    director: c.directorName ?? '',
    agency: c.agencyName ?? '',
    origin: c.origin === 'none' ? 'exagent' : c.origin,
    difficulty: c.difficulty as CampaignView['difficulty'],
    hardcore: c.hardcore,
    veterans: c.veterans,
    cashBonus: c.chapter > 1 ? cashBonus(c.lastProfit, c.chapter) : 0,
    over: c.status === 'active' ? undefined : c.status,
  };
}

export function useCampaignMenu(): CampaignMenuProps | undefined {
  const st = api(useGameStore());
  const { campaignNew, campaignPlay, campaignAbandon } = st;
  if (!campaignNew || !campaignPlay || !campaignAbandon) return undefined;
  return {
    view: st.campaign ? toView(st.campaign) : null,
    chapters: CHAPTERS,
    onNew: (cfg) => campaignNew({ difficulty: cfg.difficulty, hardcore: cfg.hardcore, origin: cfg.origin, directorName: cfg.director, agencyName: cfg.agency }),
    onPlay: campaignPlay,
    onAbandon: campaignAbandon,
  };
}

export interface CampaignResultApi {
  result: CampaignResultView;
  view: CampaignView | null;
  advance(veteranUids: string[]): void;
  retry(): void;
  toMenu(): void;
}

export function useCampaignResult(): CampaignResultApi | undefined {
  const st = api(useGameStore());
  const r = st.campaignResult;
  if (!r || !st.campaignAdvance || !st.campaignRetry) return undefined;
  return {
    result: { won: r.won, chapter: r.chapter, profit: r.profit, cashBonusNext: r.cashBonusNext, candidates: r.candidates, hardcoreEnded: r.hardcoreLost, maxVeterans: r.maxVeterans },
    view: st.campaign ? toView(st.campaign) : null,
    advance: st.campaignAdvance,
    retry: st.campaignRetry,
    toMenu: () => st.go?.('title'),
  };
}
