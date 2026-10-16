import { dayOf, notify, player, profit } from './state';
import type { GameState } from './types';

export const daysLeft = (s: GameState) => {
  const d = s.options.preset.days;
  return d ? d - s.time / 24 : Infinity;
};

/** Ends the game when the player's Objetivo is met or lost. Safe to call any time. */
export function checkObjective(s: GameState) {
  if (s.over) return;
  const pr = s.options.preset;
  const me = player(s);
  const p = profit(me);
  me.stats.peakProfit = Math.max(me.stats.peakProfit, p);
  const day = dayOf(s.time);
  const end = (won: boolean, reason: string, score: number) => {
    s.over = { won, reason, score: Math.round(score) };
    notify(s, me, 'objective', won ? 'Objetivo cumprido' : 'Objetivo fracassado', reason, won ? 'good' : 'bad');
  };
  const money = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;

  if (me.director.status === 'dead') return end(false, 'O Diretor morreu em ação (Modo Hardcore).', p);

  switch (pr.objective) {
    case 'profit':
      if (pr.days && s.time >= pr.days * 24) {
        if (p > 0) end(true, `${pr.days} dias encerrados com lucro de ${money(p)}.`, p);
        else end(false, `${pr.days} dias encerrados no vermelho (${money(p)}).`, p);
      }
      return;
    case 'quick':
      if (p >= (pr.target ?? 0)) end(true, `Meta de ${money(pr.target ?? 0)} atingida em ${day} dias.`, Math.max(1, 1000 - day));
      else if (pr.days && s.time >= pr.days * 24) end(false, 'O prazo acabou antes da meta.', p);
      return;
    case 'destroy':
    case 'rescue':
      if (s.group?.defeated) end(true, pr.objective === 'rescue' ? 'Refém resgatado com vida.' : 'Alvo eliminado.', p + 10_000_000);
      else if (pr.days && s.time >= pr.days * 24)
        end(false, pr.objective === 'rescue' ? 'O refém não foi encontrado a tempo.' : 'O alvo escapou.', p);
      return;
  }
}
