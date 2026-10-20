// Dados de mentira para a prévia do menu e dos resultados (?campaign=new|demo|done, ?cresult=win|lose|final).
import { useState } from 'react';
import { CHAPTERS } from '../../../game/campaign';
import type { Unit } from '../../../game/types';
import type { CampaignMenuProps, CampaignResultView, CampaignView, ChapterInfo } from './types';

export const MOCK_CHAPTERS: ChapterInfo[] = CHAPTERS;

const unit = (uid: string, itemId: string, name: string): Unit => ({ uid, itemId, name, hp: {} as Unit['hp'], xp: 40, paid: 0, seed: 1, traits: [], ranked: 0 });
export const MOCK_UNITS: Unit[] = [unit('u1', 'swat', 'Rita Okafor'), unit('u2', 'lawyer2', 'Helena Duarte'), unit('u3', 'liaison1', 'Marco Vitale'), unit('u4', 'soldier', 'Iván Petrov'), unit('u5', 'bodyguard', 'Sam Kowalski')];

const DEMO: CampaignView = { chapter: 4, completed: [1, 2, 3], clues: [1, 2, 3], director: 'Ana Ferraz', agency: 'Lanterna Associados', origin: 'diplomat', difficulty: 2, hardcore: false, veterans: MOCK_UNITS.slice(0, 2), cashBonus: 640_000 };

export function useMockCampaign(kind: string | null): CampaignMenuProps | undefined {
  const [view, setView] = useState<CampaignView | null>(() =>
    kind === 'demo' ? DEMO : kind === 'done' ? { ...DEMO, chapter: 10, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], clues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], over: 'won' } : null,
  );
  if (!kind) return undefined;
  return {
    view,
    chapters: MOCK_CHAPTERS,
    onNew: (cfg) => setView({ chapter: 1, completed: [], clues: [], veterans: [], cashBonus: 0, ...cfg }),
    onPlay: () => alert('campaignPlay()'),
    onAbandon: () => setView(null),
  };
}

export const mockResult = (kind: string | null): CampaignResultView | null =>
  kind === 'win'
    ? { won: true, chapter: 4, profit: 3_200_000, cashBonusNext: 640_000, candidates: MOCK_UNITS }
    : kind === 'final'
      ? { won: true, chapter: 10, profit: 9_800_000, cashBonusNext: 0, candidates: [] }
      : kind === 'lose'
        ? { won: false, chapter: 4, profit: -800_000, cashBonusNext: 0, candidates: [] }
        : null;
