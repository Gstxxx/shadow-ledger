/**
 * Modelo puro do painel Mercado: agrupa itens, calcula o que o jogador sabe dos preços no mundo e
 * transforma isso em linhas e Oportunidades legíveis. Não muta o estado do jogo.
 */
import * as A from '../../../game/actions';
import { cargoQty } from '../../../game/cargo';
import { ITEMS } from '../../../game/data/items';
import { buyPrice, freeCargo, interested, midPrice, quoteBuy, quoteSell, rollRecruits, sellPrice } from '../../../game/market';
import { directorAt, intelCountries, standing } from '../../../game/state';
import type { Agency, Country, GameState, ItemDef } from '../../../game/types';
import type { Key, Params } from '../../../i18n';

export type Segment = 'opps' | 'arms' | 'vehicles' | 'air' | 'intel' | 'people' | 'hire';

export const SEGMENTS: {
  id: Segment;
  labelKey: Key;
  icon: string;
  hintKey: Key;
}[] = [
  {
    id: 'opps',
    labelKey: 'game.market.seg.opps',
    icon: 'forecast',
    hintKey: 'game.market.seg.opps.hint',
  },
  {
    id: 'arms',
    labelKey: 'game.market.seg.arms',
    icon: 'rifles',
    hintKey: 'game.market.seg.arms.hint',
  },
  {
    id: 'vehicles',
    labelKey: 'game.market.seg.vehicles',
    icon: 'tank1',
    hintKey: 'game.market.seg.vehicles.hint',
  },
  {
    id: 'air',
    labelKey: 'game.market.seg.air',
    icon: 'heli1',
    hintKey: 'game.market.seg.air.hint',
  },
  {
    id: 'intel',
    labelKey: 'game.market.seg.intel',
    icon: 'intel',
    hintKey: 'game.market.seg.intel.hint',
  },
  {
    id: 'people',
    labelKey: 'game.market.seg.people',
    icon: 'soldier',
    hintKey: 'game.market.seg.people.hint',
  },
  {
    id: 'hire',
    labelKey: 'game.market.seg.hire',
    icon: 'team',
    hintKey: 'game.market.seg.hire.hint',
  },
];

export function segmentOf(it: ItemDef): Exclude<Segment, 'opps' | 'hire'> {
  switch (it.cls) {
    case 'arms':
      return 'arms';
    case 'vehicle':
    case 'antiair':
      return 'vehicles';
    case 'heli':
    case 'jet':
    case 'cargo':
      return 'air';
    case 'special':
      return 'intel';
    default:
      return 'people';
  }
}

// Spread do motor (market.ts): compra = meio × 1,04, venda = meio × 0,94.
const BUY_K = 1.04;
const SELL_K = 0.94;

/** O que o jogador sabe do preço de um item num país. */
export interface KnownPrice {
  countryId: string;
  /** 0 = o país não vende o item. */
  buy: number;
  /** 0 = o país não compra o item (ou o preço é desconhecido). */
  sell: number;
  mid: number;
  live: boolean;
  /** Horas desde que o preço foi visto (0 se ao vivo). */
  age: number;
}

export function knownPrice(s: GameState, a: Agency, countryId: string, itemId: string, live = intelCountries(a)): KnownPrice | null {
  const c = s.countries[countryId];
  if (!c) return null;
  const it = ITEMS[itemId];
  if (live.has(countryId)) {
    const inStock = c.stock.includes(itemId);
    const sell = sellPrice(c, itemId);
    if (!inStock && !sell) return null;
    return {
      countryId,
      buy: inStock ? buyPrice(c, itemId) : 0,
      sell,
      mid: midPrice(c, itemId),
      live: true,
      age: 0,
    };
  }
  const seen = standing(a, countryId).seen;
  const mid = seen?.prices[itemId];
  if (!seen || !mid) return null;
  return {
    countryId,
    buy: Math.round(mid * BUY_K),
    sell: interested(c, it) ? Math.round(mid * SELL_K) : 0,
    mid,
    live: false,
    age: s.time - seen.at,
  };
}

/** Preço de referência: média dos preços do meio conhecidos, completada pelo preço de catálogo. */
export function referenceMid(s: GameState, a: Agency, itemId: string, live = intelCountries(a)): { mid: number; samples: number } {
  let sum = 0;
  let n = 0;
  for (const id of Object.keys(s.countries)) {
    const k = knownPrice(s, a, id, itemId, live);
    if (k) {
      sum += k.mid;
      n++;
    }
  }
  // Com poucos mercados conhecidos, o preço de catálogo completa a média (até valer como 3 amostras).
  const pad = Math.max(0, 3 - n);
  return { mid: (sum + ITEMS[itemId].price * pad) / (n + pad), samples: n };
}

export type Deal = 'cheap' | 'pricey' | 'fair';

/** Onde o item está mais barato para comprar e onde pagam mais, entre os preços conhecidos. */
export function priceRange(
  s: GameState,
  a: Agency,
  itemId: string,
): { cheapest: KnownPrice | null; best: KnownPrice | null; samples: number } {
  const live = intelCountries(a);
  let cheapest: KnownPrice | null = null;
  let best: KnownPrice | null = null;
  let samples = 0;
  for (const id of Object.keys(s.countries)) {
    const k = knownPrice(s, a, id, itemId, live);
    if (!k) continue;
    samples++;
    if (k.buy && (!cheapest || k.buy < cheapest.buy)) cheapest = k;
    if (k.sell && (!best || k.sell > best.sell)) best = k;
  }
  return { cheapest, best, samples };
}

export interface MarketRow {
  itemId: string;
  it: ItemDef;
  segment: Exclude<Segment, 'opps' | 'hire'>;
  /** Você paga (0 = não vende aqui). */
  buy: number;
  /** Você recebe (0 = não compra aqui). */
  sell: number;
  deal: Deal;
  /** Preço do meio aqui vs. a média conhecida (−0,18 = 18% abaixo). */
  dealPct: number;
  /** A média veio de preços vistos no mundo (true) ou do catálogo, sem amostras suficientes (false). */
  dealKnown: boolean;
  owned: number;
  /** Preço médio pago pelo que está na Carga. */
  paidEach: number;
  /** Lucro por unidade vendendo aqui agora (só com Carga). */
  plEach: number;
  /** Saturação causada pela agência (−0,6..0,6). */
  saturation: number;
}

export function marketRows(s: GameState, a: Agency, countryId: string): MarketRow[] {
  const c = s.countries[countryId];
  const live = intelCountries(a);
  const here = directorAt(a, countryId);
  const ids = [...new Set([...c.stock, ...(here ? a.cargo.map((l) => l.itemId) : [])])].filter((id) => ITEMS[id].tradable);
  const rows: MarketRow[] = [];
  for (const itemId of ids) {
    const it = ITEMS[itemId];
    const k = knownPrice(s, a, countryId, itemId, live);
    const lot = a.cargo.find((l) => l.itemId === itemId);
    const owned = lot?.qty ?? 0;
    const buy = k?.buy ?? 0;
    const sell = k?.sell ?? 0;
    const ref = referenceMid(s, a, itemId, live);
    const dealPct = k?.mid && ref.mid ? k.mid / ref.mid - 1 : 0;
    rows.push({
      itemId,
      it,
      segment: segmentOf(it),
      buy,
      sell,
      deal: dealPct <= -0.07 ? 'cheap' : dealPct >= 0.07 ? 'pricey' : 'fair',
      dealPct,
      dealKnown: ref.samples >= 3,
      owned,
      paidEach: lot?.paidEach ?? 0,
      plEach: owned && sell ? sell - (lot?.paidEach ?? 0) : 0,
      saturation: c.saturation[itemId] ?? 0,
    });
  }
  // Na Carga primeiro, depois pelo preço.
  return rows.sort((x, y) => (y.owned > 0 ? 1 : 0) - (x.owned > 0 ? 1 : 0) || x.it.price - y.it.price);
}

export interface Opportunity {
  kind: 'buy-here' | 'sell-here' | 'sell-there';
  itemId: string;
  /** Onde comprar (buy-here) ou de onde vem (Carga). */
  from: string;
  /** Onde vender. */
  to: string;
  buyEach: number;
  sellEach: number;
  /** Margem por unidade (US$) e relativa. */
  marginEach: number;
  pct: number;
  /** Horas de voo do Diretor até o destino (0 = aqui). */
  hours: number;
  /** Unidades que você tem ou pode levar. */
  qty: number;
  profit: number;
  live: boolean;
  /** Por que não dá para fazer agora (null = dá). `string` = texto ainda sem chave de i18n. */
  block: BlockReason | string;
}

/**
 * Oportunidades a partir de `countryId`: o que comprar aqui e vender onde paga mais, e onde vender o que
 * está na Carga. Só usa preços que o jogador conhece (Estações, visitas).
 */
export function opportunities(s: GameState, a: Agency, countryId: string, limit = 6): Opportunity[] {
  const c = s.countries[countryId];
  const live = intelCountries(a);
  const here = directorAt(a, countryId);
  const others = Object.keys(s.countries).filter((id) => id !== countryId);
  const out: Opportunity[] = [];

  const bestSell = (itemId: string) => {
    let best: KnownPrice | null = null;
    for (const id of others) {
      const k = knownPrice(s, a, id, itemId, live);
      if (k && k.sell && (!best || k.sell > best.sell)) best = k;
    }
    return best;
  };
  const hoursTo = (id: string) => (id === a.location ? 0 : A.flightHours(a, id));

  // Comprar aqui, vender lá.
  for (const itemId of c.stock) {
    const it = ITEMS[itemId];
    if (!it.tradable) continue;
    const k = knownPrice(s, a, countryId, itemId, live);
    if (!k?.buy) continue;
    const b = bestSell(itemId);
    if (!b) continue;
    const margin = b.sell - k.buy;
    if (margin <= 0) continue;
    const fit = maxAffordable(s, a, c, itemId);
    const w = ITEMS[itemId].weight;
    // Sem chave de i18n ainda: textos em minúsculas, diferentes de block.notAllFits/noCash.
    const block = fit > 0 ? null : w > freeCargo(a) + 1e-6 ? `não cabe no avião (${w} t)` : 'caixa insuficiente';
    out.push({
      kind: 'buy-here',
      itemId,
      from: countryId,
      to: b.countryId,
      buyEach: k.buy,
      sellEach: b.sell,
      marginEach: margin,
      pct: margin / k.buy,
      hours: hoursTo(b.countryId),
      qty: fit,
      profit: fit * margin,
      live: k.live && b.live,
      block,
    });
  }

  // O que está na Carga: vender aqui ou levar para onde paga mais.
  for (const lot of a.cargo) {
    const it = ITEMS[lot.itemId];
    if (!it.tradable) continue;
    const kHere = knownPrice(s, a, countryId, lot.itemId, live);
    const hereSell = here && kHere?.sell ? quoteSell(c, lot.itemId, lot.qty).avg : 0;
    const b = bestSell(lot.itemId);
    if (hereSell && hereSell > lot.paidEach && (!b || hereSell >= b.sell * 0.97)) {
      out.push({
        kind: 'sell-here',
        itemId: lot.itemId,
        from: countryId,
        to: countryId,
        buyEach: lot.paidEach,
        sellEach: hereSell,
        marginEach: hereSell - lot.paidEach,
        pct: (hereSell - lot.paidEach) / lot.paidEach,
        hours: 0,
        qty: lot.qty,
        profit: (hereSell - lot.paidEach) * lot.qty,
        live: true,
        block: null,
      });
    } else if (b && b.sell > lot.paidEach) {
      out.push({
        kind: 'sell-there',
        itemId: lot.itemId,
        from: a.location,
        to: b.countryId,
        buyEach: lot.paidEach,
        sellEach: b.sell,
        marginEach: b.sell - lot.paidEach,
        pct: (b.sell - lot.paidEach) / lot.paidEach,
        hours: hoursTo(b.countryId),
        qty: lot.qty,
        profit: (b.sell - lot.paidEach) * lot.qty,
        live: b.live,
        block: null,
      });
    }
  }

  // Carga primeiro (é dinheiro parado), depois o que dá para fazer agora pelo lucro total, e por fim o resto.
  const rank = (o: Opportunity) => (o.kind !== 'buy-here' ? 2 : o.block ? 0 : 1);
  return out.sort((x, y) => rank(y) - rank(x) || y.profit - x.profit || y.pct - x.pct).slice(0, limit);
}

/** Quantas unidades cabem no caixa e no espaço do avião. */
export function maxAffordable(s: GameState, a: Agency, c: Country, itemId: string, cap = 99): number {
  void s;
  const w = ITEMS[itemId].weight;
  const byCargo = w > 0 ? Math.floor((freeCargo(a) + 1e-6) / w) : cap;
  let n = 0;
  while (n < Math.min(cap, byCargo) && quoteBuy(c, itemId, n + 1).total <= a.cash) n++;
  return n;
}

/** Motivo de bloqueio como chave de i18n (+ parâmetros); quem renderiza traduz. */
export interface BlockMsg {
  key: Key;
  params?: Params;
}

export type BlockReason = BlockMsg | null;

/** Por que não dá para comprar `qty` agora (null = pode). */
export function whyCantBuy(s: GameState, a: Agency, countryId: string, itemId: string, qty: number): BlockReason {
  const c = s.countries[countryId];
  if (!directorAt(a, countryId)) return { key: a.flight ? 'game.market.block.directorFlying' : 'game.market.block.onlyDirectorBuys' };
  if (!c.stock.includes(itemId)) return { key: 'game.market.block.notSold' };
  const w = ITEMS[itemId].weight * qty;
  if (w > freeCargo(a) + 1e-6)
    return { key: freeCargo(a) < ITEMS[itemId].weight ? 'game.market.block.planeFull' : 'game.market.block.notAllFits' };
  if (quoteBuy(c, itemId, qty).total > a.cash) return { key: 'game.market.block.noCash' };
  return null;
}

/** Por que não dá para vender `qty` agora (null = pode). */
export function whyCantSell(s: GameState, a: Agency, countryId: string, itemId: string, qty: number): BlockReason {
  const c = s.countries[countryId];
  if (!directorAt(a, countryId)) return { key: a.flight ? 'game.market.block.directorFlying' : 'game.market.block.onlyDirectorSells' };
  if (!interested(c, ITEMS[itemId])) return { key: 'game.market.block.nobodyBuys' };
  const owned = cargoQty(a, itemId);
  if (!owned) return { key: 'game.market.block.noneInCargo' };
  if (owned < qty) return { key: 'game.market.block.onlyHave', params: { n: owned } };
  return null;
}

/** Quanto o preço local cai (venda) ou sobe (compra) depois de negociar `qty`, em fração. */
export function saturationAfter(c: Country, itemId: string, qty: number, side: 'buy' | 'sell'): number {
  const now = c.saturation[itemId] ?? 0;
  const after = side === 'buy' ? quoteBuy(c, itemId, qty).after : quoteSell(c, itemId, qty).after;
  return after - now;
}

/** Quantas unidades vender antes do preço cair abaixo do que você pagou. */
export function sellUntilBreakEven(c: Country, itemId: string, owned: number, paidEach: number): number {
  let n = 0;
  while (n < owned) {
    const q = quoteSell(c, itemId, n + 1);
    const last = q.total - (n ? quoteSell(c, itemId, n).total : 0);
    if (last < paidEach) break;
    n++;
  }
  return n;
}

export interface RecruitRow {
  itemId: string;
  it: ItemDef;
  price: number;
  /** null = pode contratar. */
  block: BlockReason;
}

export function recruitRows(s: GameState, a: Agency, countryId: string): RecruitRow[] {
  const c = s.countries[countryId];
  const here = directorAt(a, countryId);
  return rollRecruits(c).map((itemId) => {
    const it = ITEMS[itemId];
    const price = A.recruitPrice(countryId, itemId);
    const needsSpace = it.cls !== 'jet' && it.cls !== 'cargo';
    const block: BlockReason = !here
      ? { key: 'game.market.block.onlyWithDirector' }
      : price > a.cash
        ? { key: 'game.market.block.noCash' }
        : needsSpace && it.weight > freeCargo(a) + 1e-6
          ? { key: 'game.market.block.noSpace' }
          : null;
    return { itemId, it, price, block };
  });
}
