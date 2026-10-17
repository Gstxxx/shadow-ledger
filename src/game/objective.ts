import { dayOf, M, notify, player, profit, ref, say } from './state';
import type { Msg } from './msg';
import type { GameState } from './types';

/** Meta de lucro por Dificuldade (índice = Dificuldade), sobre `preset.target`. */
export const PROFIT_GOAL_MULT = [1, 0.8, 0.95, 1.1];

/** Lucro necessário para vencer um Objetivo "Lucro no prazo" (mínimo US$ 1, i.e. só ficar no azul). */
export const profitGoal = (s: GameState) =>
  Math.max(1, Math.round((s.options.preset.target ?? 0) * PROFIT_GOAL_MULT[s.options.difficulty]));

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
  const end = (won: boolean, reason: Msg, score: number) => {
    s.over = { won, reason: say(reason), reasonMsg: reason, score: Math.round(score) };
    notify(s, me, 'objective', M(won ? 'msg.obj.wonTitle' : 'msg.obj.lostTitle'), reason, won ? 'good' : 'bad');
  };

  if (me.director.status === 'dead') return end(false, M('msg.obj.directorDied'), p);

  switch (pr.objective) {
    case 'profit':
      if (pr.days && s.time >= pr.days * 24) {
        if (p >= profitGoal(s)) end(true, M('msg.obj.profitWon', { days: pr.days, profit: ref.money(p) }), p);
        // TODO(i18n): chave própria "abaixo da meta de {goal}" pedida à sessão de i18n.
        else if (p > 0) end(false, M('msg.obj.quickLost'), p);
        else end(false, M('msg.obj.profitLost', { days: pr.days, profit: ref.money(p) }), p);
      }
      return;
    case 'quick':
      if (p >= (pr.target ?? 0)) end(true, M('msg.obj.quickWon', { target: ref.money(pr.target ?? 0), day }), Math.max(1, 1000 - day));
      else if (pr.days && s.time >= pr.days * 24) end(false, M('msg.obj.quickLost'), p);
      return;
    case 'destroy':
    case 'rescue':
      if (s.group?.defeated) end(true, M(pr.objective === 'rescue' ? 'msg.obj.rescueWon' : 'msg.obj.destroyWon'), p + 10_000_000);
      else if (pr.days && s.time >= pr.days * 24)
        end(false, M(pr.objective === 'rescue' ? 'msg.obj.rescueLost' : 'msg.obj.destroyLost'), p);
      return;
  }
}
