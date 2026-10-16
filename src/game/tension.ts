// Tensão Global: um medidor do mundo inteiro, com faixas e a Crise Final.
import { ITEMS } from './data/items';
import { WMD_TENSION } from './market';
import { checkObjective } from './objective';
import { log, notify, player } from './state';
import { isLocked } from './tutorial/locks';
import type { Agency, GameState } from './types';

export type TensionBand = 'low' | 'medium' | 'high' | 'top';

export const TENSION_BAND_LABEL: Record<TensionBand, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  top: 'Topo',
};

/** Limites inferiores das faixas Média, Alta e Topo. */
export const TENSION_MEDIUM = 30;
export const TENSION_HIGH = 55;
/** No Topo abre o mercado de Armas de Destruição em Massa. */
export const TENSION_TOP = WMD_TENSION;

/** Dias seguidos no Topo até a Crise Final. */
export const CRISIS_DAYS = 45;

export function tensionBand(t: number): TensionBand {
  if (t >= TENSION_TOP) return 'top';
  if (t >= TENSION_HIGH) return 'high';
  if (t >= TENSION_MEDIUM) return 'medium';
  return 'low';
}

/** Chance diária de um país mudar de cenário político: o mundo fica instável com a tensão. */
export function politicsChurn(t: number): number {
  return { low: 0.002, medium: 0.003, high: 0.004, top: 0.005 }[tensionBand(t)];
}

/** Contratos ficam maiores com a tensão. */
export function contractScale(t: number): number {
  return { low: 1, medium: 1.3, high: 1.5, top: 1.7 }[tensionBand(t)];
}

export function crisisHoursLeft(s: GameState): number {
  return Math.max(0, CRISIS_DAYS * 24 - (s.crisis?.hours ?? 0));
}

/** Registra uma venda de Arma de Destruição em Massa para o epílogo da Crise Final. */
export function recordWmdSale(s: GameState, a: Agency, itemId: string, qty: number, countryId: string) {
  (s.wmdLedger ??= []).push({ agencyId: a.id, itemId, qty, countryId, at: s.time });
}

/** Contador da Crise Final: sobe no Topo, desce (2× mais rápido) fora dele. */
export function tickTension(s: GameState, dt: number) {
  const c = (s.crisis ??= { hours: 0 });
  if (isLocked(s, 'tension')) return;
  const before = c.hours;
  if (tensionBand(s.tension) === 'top') c.hours += dt;
  else c.hours = Math.max(0, c.hours - dt * 2);
  if (before === 0 && c.hours > 0) {
    notify(
      s,
      player(s),
      'intel',
      'Tensão Global no Topo',
      `O mercado de Armas de Destruição em Massa está aberto. Se a tensão ficar no Topo por ${CRISIS_DAYS} dias, um país usa uma.`,
      'warn',
    );
  }
  if (c.hours >= CRISIS_DAYS * 24 && !s.over) finalCrisis(s);
}

/** Crise Final: um país usa uma arma; todas as agências perdem. */
function finalCrisis(s: GameState) {
  const ledger = s.wmdLedger ?? [];
  const lines = s.agencies
    .map((a) => {
      const sold = ledger.filter((x) => x.agencyId === a.id);
      if (!sold.length) return `${a.name}: nada vendido.`;
      const parts = sold.map((x) => `${x.qty}× ${ITEMS[x.itemId]?.name ?? x.itemId} a ${s.countries[x.countryId]?.name ?? '?'}`);
      return `${a.name}: ${parts.join('; ')}.`;
    })
    .join(' ');
  log(s, `Crise Final. ${lines}`, 'bad');
  s.over = {
    won: false,
    reason: `A Tensão Global ficou no Topo tempo demais e uma arma foi usada. Ninguém vence. ${lines}`,
    score: 0,
  };
  notify(s, player(s), 'objective', 'Crise Final', s.over.reason, 'bad');
  checkObjective(s);
}
