// Oportunidades de comércio conhecidas: o que a agência sabe de preços (Diretor, Estações, memória)
// transformado em pares compra → venda. Só usa informação que a agência tem; nada de onisciência.
import { ITEMS } from './data/items';
import { fleetSpeed, interested, midPrice } from './market';
import { intelCountries, standing, travelKm } from './state';
import type { Agency, GameState } from './types';

export interface PriceKnowledge {
  countryId: string;
  /** Preço médio conhecido (mid). */
  mid: number;
  /** Ao vivo (Diretor ou Estação) ou lembrado de uma visita. */
  live: boolean;
  /** Quando o preço foi visto (horas de jogo). */
  seenAt: number;
  /** O país vende este item (estava no estoque quando visto). */
  sells: boolean;
}

export interface TradeOpportunity {
  itemId: string;
  buyIn: string;
  /** Preço de compra estimado por unidade (com spread). */
  buyPrice: number;
  sellIn: string;
  /** Preço de venda estimado por unidade (com spread, antes da Saturação da sua própria venda). */
  sellPrice: number;
  /** Lucro por unidade. */
  profitEach: number;
  /** Margem sobre o preço de compra (0,25 = 25%). */
  margin: number;
  /** Lucro por tonelada de Carga: o que importa com a Frota limitada. */
  profitPerTon: number;
  /** Horas de voo da posição do Diretor até o país de compra (0 se já está lá). */
  hoursToBuy: number;
  /** Horas de voo do país de compra ao de venda. */
  hoursToSell: number;
  /** A informação mais velha usada no cálculo (horas de jogo). */
  oldestInfo: number;
}

const BUY_SPREAD = 1.07;
const SELL_SPREAD = 0.91;

/** Everything the agency knows about one item's prices around the world. */
export function knownPrices(s: GameState, a: Agency, itemId: string): PriceKnowledge[] {
  const live = intelCountries(a);
  const out: PriceKnowledge[] = [];
  for (const c of Object.values(s.countries)) {
    if (live.has(c.id)) {
      out.push({ countryId: c.id, mid: midPrice(c, itemId), live: true, seenAt: s.time, sells: c.stock.includes(itemId) });
      continue;
    }
    const seen = standing(a, c.id).seen;
    if (seen && seen.prices[itemId] !== undefined) {
      out.push({ countryId: c.id, mid: seen.prices[itemId], live: false, seenAt: seen.at, sells: true });
    }
  }
  return out;
}

/** Hours of flight for the Frota between two countries (Infinity without freighters). */
function hoursBetween(a: Agency, from: string, to: string): number {
  if (from === to) return 0;
  const speed = fleetSpeed(a);
  return speed ? travelKm(from, to) / speed + 1.5 : Infinity;
}

/**
 * Best known buy → sell pairs, one per item, sorted by profit per ton.
 * `minMargin` filters out noise (default 5%).
 */
export function tradeOpportunities(s: GameState, a: Agency, opts: { minMargin?: number; limit?: number } = {}): TradeOpportunity[] {
  const minMargin = opts.minMargin ?? 0.05;
  const here = a.flight ? a.flight.to : a.location;
  const out: TradeOpportunity[] = [];
  for (const it of Object.values(ITEMS)) {
    if (!it.tradable) continue;
    const prices = knownPrices(s, a, it.id);
    let best: TradeOpportunity | null = null;
    for (const b of prices) {
      if (!b.sells) continue;
      const buyPrice = Math.round(b.mid * BUY_SPREAD);
      for (const v of prices) {
        if (v.countryId === b.countryId || !interested(s.countries[v.countryId], it)) continue;
        const sellPrice = Math.round(v.mid * SELL_SPREAD);
        const profitEach = sellPrice - buyPrice;
        const margin = profitEach / buyPrice;
        if (margin < minMargin) continue;
        const cand: TradeOpportunity = {
          itemId: it.id,
          buyIn: b.countryId,
          buyPrice,
          sellIn: v.countryId,
          sellPrice,
          profitEach,
          margin,
          profitPerTon: profitEach / Math.max(0.01, it.weight),
          hoursToBuy: b.countryId === here ? 0 : hoursBetween(a, here, b.countryId),
          hoursToSell: hoursBetween(a, b.countryId, v.countryId),
          oldestInfo: Math.min(b.seenAt, v.seenAt),
        };
        if (!best || cand.profitPerTon > best.profitPerTon) best = cand;
      }
    }
    if (best) out.push(best);
  }
  out.sort((x, y) => y.profitPerTon - x.profitPerTon);
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/** Convenience for the "o que fazer agora" card: the best opportunity starting where the Diretor is. */
export function bestFromHere(s: GameState, a: Agency): TradeOpportunity | undefined {
  return tradeOpportunities(s, a).find((o) => o.buyIn === a.location);
}

