import { useMemo, useState } from 'react';
import { CampaignResult } from './Result';
import { useCampaignResult, type CampaignResultApi } from './connect';
import { MOCK_UNITS, mockResult } from './mock';

/** Mostra o Debriefing ou a derrota quando a partida de Campanha termina. `?cresult=win|lose|final` força um. */
export function CampaignResultHost() {
  const real = useCampaignResult();
  const [mockOpen, setMockOpen] = useState(true);
  const mock = useMemo<CampaignResultApi | undefined>(() => {
    const r = mockResult(new URLSearchParams(location.search).get('cresult'));
    if (!r) return undefined;
    const close = () => setMockOpen(false);
    return {
      result: r,
      view: { chapter: r.chapter, completed: [], clues: [], director: 'Ana Ferraz', agency: 'Lanterna Associados', origin: 'diplomat', difficulty: 2, hardcore: false, veterans: MOCK_UNITS.slice(0, 1), cashBonus: 0 },
      advance: close,
      retry: close,
      toMenu: close,
    };
  }, []);
  const api = real ?? (mockOpen ? mock : undefined);
  if (!api) return null;
  return <CampaignResult key={`${api.result.chapter}-${api.result.won}`} api={api} />;
}
