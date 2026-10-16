import { dayOf, profit, pushEvent } from './state';
import type { GameState } from './types';

export const missionDaysLeft = (s: GameState) => (s.mission.days ? s.mission.days - s.time / 24 : Infinity);

/** Ends the campaign when its goal is met or lost. Safe to call any time. */
export function checkMission(s: GameState) {
  if (s.over) return;
  const m = s.mission;
  const p = profit(s);
  s.stats.peakProfit = Math.max(s.stats.peakProfit, p);
  const day = dayOf(s.time);
  const end = (won: boolean, reason: string, score: number) => {
    s.over = { won, reason, score: Math.round(score) };
    pushEvent(s, 'mission', won ? 'Missão cumprida' : 'Missão fracassada', reason, won ? 'good' : 'bad');
  };

  if (s.director.status === 'dead') return end(false, 'O Diretor morreu em ação (Modo Hardcore).', p);

  switch (m.kind) {
    case 'profit':
      if (m.days && s.time >= m.days * 24) {
        if (p > 0) end(true, `${m.days} dias encerrados com lucro de US$ ${p.toLocaleString('pt-BR')}.`, p);
        else end(false, `${m.days} dias encerrados no vermelho (US$ ${p.toLocaleString('pt-BR')}).`, p);
      }
      return;
    case 'quick':
      if (p >= (m.target ?? 0)) end(true, `Meta de lucro atingida em ${day} dias.`, Math.max(1, 1000 - day));
      else if (m.days && s.time >= m.days * 24) end(false, 'O prazo acabou antes da meta.', p);
      return;
    case 'destroy':
    case 'rescue':
      if (s.group?.defeated) end(true, m.kind === 'rescue' ? 'Refém resgatado com vida.' : 'Alvo eliminado.', p + 10_000_000);
      else if (m.days && s.time >= m.days * 24) end(false, m.kind === 'rescue' ? 'O refém não foi encontrado a tempo.' : 'O alvo escapou.', p);
      return;
  }
}
