// Histórico de preços: uma amostra diária por país × item, só onde o jogador tem informação ao vivo
// (Estações e o país do Diretor), numa janela dos últimos 60 dias. Pensado para caber no save.
import { originMods } from './data/origins';
import { POLITICS_LABEL } from './data/rules';
import { BUY_SPREAD, interested, midPrice, SELL_SPREAD } from './market';
import { intelCountries, player } from './state';
import type { GameState, Politics } from './types';
import { def } from './units';

/** Dias guardados por série. */
export const HISTORY_DAYS = 60;
/** Preços guardados em centenas de dólares (inteiros) para o save ficar pequeno. */
const UNIT = 100;

/** Série de um país × item: dias (crescentes) e preço médio no mercado, em centenas de US$. */
export interface PriceSeries {
  d: number[];
  p: number[];
}

/** O que explica um pico: mudança política no país ou Comércio do jogador (Saturação). */
export type PriceEventKind = Politics | 'coup' | 'playerBuy' | 'playerSell';

export interface PriceEvent {
  day: number;
  countryId: string;
  /** Ausente = afeta o país inteiro (política). */
  itemId?: string;
  kind: PriceEventKind;
}

export interface PriceHistoryState {
  series: Record<string, PriceSeries>;
  events: PriceEvent[];
}

export interface PricePoint {
  day: number;
  /** Preço de compra para o jogador. */
  buy: number;
  /** Preço de venda para o jogador (0 se o país não compra o item). */
  sell: number;
  /** Eventos daquele dia que explicam o movimento. */
  events?: PriceEventKind[];
}

const keyOf = (countryId: string, itemId: string) => `${countryId}:${itemId}`;

export function historyOf(s: GameState): PriceHistoryState {
  return (s.priceHistory ??= { series: {}, events: [] });
}

/** Registra um evento que explica um movimento de preço (só os que o jogador poderia saber). */
export function recordPriceEvent(s: GameState, e: Omit<PriceEvent, 'day'>) {
  const h = historyOf(s);
  h.events.push({ ...e, day: Math.floor(s.time / 24) });
}

/** Amostra diária: chamada uma vez por dia pelo relógio. */
export function samplePrices(s: GameState) {
  const h = historyOf(s);
  const day = Math.floor(s.time / 24);
  const me = player(s);
  const items = new Set(me.cargo.map((l) => l.itemId));
  for (const cid of intelCountries(me)) {
    const c = s.countries[cid];
    for (const itemId of new Set([...c.stock, ...items])) {
      const k = keyOf(cid, itemId);
      const ser = (h.series[k] ??= { d: [], p: [] });
      if (ser.d[ser.d.length - 1] === day) continue;
      ser.d.push(day);
      ser.p.push(Math.round(midPrice(c, itemId) / UNIT));
    }
  }
  // Janela: descarta o que passou de 60 dias e séries vazias.
  const min = day - HISTORY_DAYS + 1;
  for (const [k, ser] of Object.entries(h.series)) {
    let i = 0;
    while (i < ser.d.length && ser.d[i] < min) i++;
    if (i) {
      ser.d.splice(0, i);
      ser.p.splice(0, i);
    }
    if (!ser.d.length) delete h.series[k];
  }
  h.events = h.events.filter((e) => e.day >= min);
}

/** Pontos de um país × item para o gráfico, com os preços que o jogador pagaria/receberia. */
export function priceHistory(s: GameState, countryId: string, itemId: string): PricePoint[] {
  const h = historyOf(s);
  const ser = h.series[keyOf(countryId, itemId)];
  if (!ser) return [];
  const c = s.countries[countryId];
  const buys = interested(c, def(itemId));
  const sellMult = originMods(player(s)).sellMult ?? 1;
  return ser.d.map((day, i) => {
    const mid = ser.p[i] * UNIT;
    const events = h.events
      .filter((e) => e.day === day && e.countryId === countryId && (!e.itemId || e.itemId === itemId))
      .map((e) => e.kind);
    return {
      day,
      buy: Math.round(mid * BUY_SPREAD),
      sell: buys ? Math.round(mid * SELL_SPREAD * sellMult) : 0,
      ...(events.length ? { events } : {}),
    };
  });
}

/** Média mundial conhecida por dia (preço médio de mercado entre os países com amostra naquele dia). */
export function worldAverageHistory(s: GameState, itemId: string): { day: number; mid: number; countries: number }[] {
  const h = historyOf(s);
  const byDay = new Map<number, { sum: number; n: number }>();
  for (const [k, ser] of Object.entries(h.series)) {
    if (!k.endsWith(`:${itemId}`)) continue;
    ser.d.forEach((day, i) => {
      const acc = byDay.get(day) ?? { sum: 0, n: 0 };
      acc.sum += ser.p[i] * UNIT;
      acc.n++;
      byDay.set(day, acc);
    });
  }
  return [...byDay.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([day, { sum, n }]) => ({ day, mid: Math.round(sum / n), countries: n }));
}

// ── Formato do gráfico do modal de item (combinado com a ui-polish) ──

export interface PriceChart {
  /** Um ponto por dia com amostra, do mais antigo ao mais novo; t em horas de jogo. */
  points: { t: number; buy: number; sell: number }[];
  /** Média mundial conhecida hoje (preço médio por unidade), para a linha tracejada. */
  world?: number;
  /** Marcadores: política do país, Golpe e Comércio do jogador (Saturação). */
  events: { t: number; kind: PriceEventKind; text: string }[];
}

const EVENT_TEXT: Record<string, string> = {
  coup: 'Golpe',
  playerBuy: 'Sua compra (Saturação)',
  playerSell: 'Sua venda (Saturação)',
};

/** priceHistory no formato do gráfico: janela dos últimos `days` dias. */
export function priceChart(s: GameState, countryId: string, itemId: string, days = 30): PriceChart {
  const today = Math.floor(s.time / 24);
  const from = today - days + 1;
  const pts = priceHistory(s, countryId, itemId).filter((p) => p.day >= from);
  const world = worldAverageHistory(s, itemId).filter((w) => w.day >= from);
  const events = historyOf(s)
    .events.filter((e) => e.day >= from && e.countryId === countryId && (!e.itemId || e.itemId === itemId))
    .map((e) => ({ t: e.day * 24, kind: e.kind, text: EVENT_TEXT[e.kind] ?? POLITICS_LABEL[e.kind as Politics] ?? e.kind }));
  return {
    points: pts.map((p) => ({ t: p.day * 24, buy: p.buy, sell: p.sell })),
    world: world.length ? world[world.length - 1].mid : undefined,
    events,
  };
}
