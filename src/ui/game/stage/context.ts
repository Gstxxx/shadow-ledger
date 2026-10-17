import { createContext, useContext } from 'react';
import type { AgencyTab } from '../AgencyPanel';

/** ADR 0006: um conteúdo por vez no centro da tela, com histórico de voltar. */
export type CountryTab = 'overview' | 'market' | 'ops' | 'station';
export type StageModal =
  | { kind: 'country'; id: string; tab: CountryTab }
  | { kind: 'agency'; tab: AgencyTab }
  | { kind: 'item'; countryId: string; itemId: string; side?: 'buy' | 'sell' }
  | { kind: 'unit'; uid: string };

export interface StageApi {
  current: StageModal | undefined;
  canBack: boolean;
  open: (m: StageModal) => void;
  push: (m: StageModal) => void;
  replace: (m: StageModal) => void;
  back: () => void;
  close: () => void;
}

export const StageCtx = createContext<StageApi | null>(null);

/** Palco do jogo (null fora da tela de jogo, como no protótipo do Mercado). */
export const useStage = () => useContext(StageCtx);
