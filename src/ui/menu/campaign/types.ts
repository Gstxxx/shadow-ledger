// Contrato entre a UI da Campanha e o motor (game-builder). A UI só lê estes campos; o adaptador
// (ConnectedMainMenu / CampaignResultHost) monta a visão a partir da store.
import type { OriginId, PresetDef, Unit } from '../../../game/types';

export type Difficulty = 1 | 2 | 3;

export interface CampaignView {
  /** Capítulo atual (1..10). */
  chapter: number;
  completed: number[];
  /** Capítulos cuja pista do Dossiê já foi liberada. */
  clues: number[];
  director: string;
  agency: string;
  origin: Exclude<OriginId, 'none'>;
  difficulty: Difficulty;
  hardcore: boolean;
  veterans: Unit[];
  /** Bônus de caixa vindo do capítulo anterior. */
  cashBonus: number;
  over?: 'lost' | 'won';
}

export interface ChapterInfo {
  n: number;
  preset: PresetDef;
}

export interface CampaignNewConfig {
  director: string;
  agency: string;
  origin: Exclude<OriginId, 'none'>;
  difficulty: Difficulty;
  hardcore: boolean;
}

export interface CampaignMenuProps {
  view: CampaignView | null;
  chapters: ChapterInfo[];
  onNew(cfg: CampaignNewConfig): void;
  /** Começa a partida do capítulo atual (depois do Briefing). */
  onPlay(): void;
  onAbandon(): void;
}

export interface CampaignResultView {
  won: boolean;
  chapter: number;
  profit: number;
  cashBonusNext: number;
  candidates: Unit[];
  hardcoreEnded?: boolean;
  /** Teto de Veteranos (padrão 3). */
  maxVeterans?: number;
}
