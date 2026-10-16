// Comércio abstraído das rivais: escolhe um par país-compra/país-venda e uma quantidade. Compra e venda
// passam por buy/sell do motor (Saturação de verdade); o deslocamento é o voo real da Frota rival.
import { FLIGHT_GROUND_H, flightHours } from '../actions';
import { cargoQty } from '../cargo';
import { ITEMS } from '../data/items';
import { buyPrice, fleetSpeed, freeCargo, quoteBuy, quoteSell, sellPrice } from '../market';
import { rand } from '../rng';
import { intelCountries, standing, travelKm } from '../state';
import type { Agency, Contract, GameState, ItemDef } from '../types';
import type { DifficultyProfile, Personality } from './profiles';
import type { RivalMemory, TradePlan } from './types';

/** Máximo de unidades por lote planejado (a Saturação come o resto da margem). */
const MAX_LOT = 24;
/** Armas de Destruição em Massa: mercado negro raso, poucas unidades por viagem. */
const MAX_WMD_LOT = 1;
/** Intervalo entre negócios de ADM para apetite 1 (dividido pelo apetite da personalidade). */
export const WMD_COOLDOWN_H = 24 * 30;
/** Itens avaliados a fundo (com cotação unidade a unidade) por decisão. */
const SHORTLIST = 8;

export interface TradeCtx {
  s: GameState;
  a: Agency;
  mem: RivalMemory;
  P: Personality;
  D: DifficultyProfile;
  /** Caixa disponível para arriscar. */
  spendable: number;
}

function itemWeight(s: GameState, P: Personality, mem: RivalMemory, it: ItemDef): number {
  if (!it.tradable) return 0;
  if (it.wmd) {
    if (mem.wmdRetreat || P.wmd <= 0) return 0;
    return s.time - (mem.lastWmdAt ?? -Infinity) < WMD_COOLDOWN_H / P.wmd ? 0 : P.wmd;
  }
  return P.itemBias[it.cls] ?? 1;
}

/**
 * O que a rival sabe de cada mercado, como o jogador: ao vivo onde tem o Diretor ou Estação; de memória
 * (cada vez mais errado) onde já viu os preços; por boato, raramente, no resto. Devolve país → erro relativo.
 */
function knownCountries(ctx: TradeCtx): Map<string, number> {
  const { s, a, D } = ctx;
  const live = intelCountries(a);
  const out = new Map<string, number>();
  for (const id of Object.keys(s.countries)) {
    if (live.has(id)) out.set(id, 0.02 * (1 - D.quality));
    else {
      const seen = standing(a, id).seen;
      const days = seen ? (s.time - seen.at) / 24 : Infinity;
      if (days <= 30) out.set(id, 0.04 + days * 0.008);
      else if (rand(s) < 0.1 + 0.2 * D.quality) out.set(id, 0.3 * (1.2 - D.quality));
    }
  }
  return out;
}

/** Estimativa ruidosa do preço num mercado que a rival não vê ao vivo. */
const noisy = (ctx: TradeCtx, v: number, err: number) => v * (1 + (rand(ctx.s) - 0.5) * 2 * err);

function legHours(a: Agency, from: string, to: string): number {
  if (from === to) return 0;
  const speed = fleetSpeed(a);
  return speed ? travelKm(from, to) / speed + FLIGHT_GROUND_H : Infinity;
}

/** Lucro de comprar `qty` em `buyIn` e vender em `sellIn`, com a Saturação que a própria compra/venda causa. */
export function lotProfit(s: GameState, itemId: string, buyIn: string, sellIn: string, qty: number) {
  const cost = quoteBuy(s.countries[buyIn], itemId, qty).total;
  const revenue = quoteSell(s.countries[sellIn], itemId, qty).total;
  return { cost, revenue, profit: revenue - cost };
}

/** Maior lote viável pela carteira e pela Frota. */
function capacity(ctx: TradeCtx, it: ItemDef, unitCost: number): number {
  const byCash = Math.floor((ctx.spendable * ctx.D.stake) / Math.max(1, unitCost));
  const byWeight = it.weight > 0 ? Math.floor(freeCargo(ctx.a) / it.weight) : MAX_LOT;
  return Math.max(0, Math.min(it.wmd ? MAX_WMD_LOT : MAX_LOT, byCash, byWeight));
}

/** Melhor quantidade entre algumas candidatas (lote cheio, metade, um quarto...). */
function bestQty(s: GameState, itemId: string, buyIn: string, sellIn: string, cap: number) {
  let best = { qty: 0, profit: 0, cost: 0 };
  for (let q = cap; q >= 1; q = Math.floor(q / 2)) {
    const r = lotProfit(s, itemId, buyIn, sellIn, q);
    if (r.profit > best.profit) best = { qty: q, profit: r.profit, cost: r.cost };
  }
  return best;
}

/**
 * O(países × itens): melhor compra e melhor venda por item, depois cotação fina dos melhores.
 * A pontuação é lucro por hora de voo, menos o custo da Exposição para as rivais cautelosas.
 */
export function planTrade(ctx: TradeCtx): TradePlan | undefined {
  const { s, a, mem, P } = ctx;
  const known = knownCountries(ctx);
  const buyBest = new Map<string, { c: string; price: number }>();
  const sellBest = new Map<string, { c: string; price: number }>();
  for (const [id, err] of known) {
    const c = s.countries[id];
    for (const itemId of c.stock) {
      if (!itemWeight(s, P, mem, ITEMS[itemId])) continue;
      const p = noisy(ctx, buyPrice(c, itemId), err);
      const cur = buyBest.get(itemId);
      if (!cur || p < cur.price) buyBest.set(itemId, { c: id, price: p });
    }
  }
  for (const [id, err] of known) {
    const c = s.countries[id];
    for (const itemId of buyBest.keys()) {
      const p = sellPrice(c, itemId);
      if (!p) continue;
      const v = noisy(ctx, p, err);
      const cur = sellBest.get(itemId);
      if (!cur || v > cur.price) sellBest.set(itemId, { c: id, price: v });
    }
  }
  const short = [...buyBest.entries()]
    .map(([itemId, b]) => ({ itemId, b, sl: sellBest.get(itemId) }))
    .filter((x) => x.sl && x.sl.c !== x.b.c && x.sl.price > x.b.price)
    .map((x) => ({ ...x, margin: (x.sl!.price / x.b.price - 1) * itemWeight(s, P, mem, ITEMS[x.itemId]) }))
    .sort((x, y) => y.margin - x.margin)
    .slice(0, SHORTLIST);

  const options: { plan: TradePlan; score: number }[] = [];
  for (const { itemId, b, sl } of short) {
    const it = ITEMS[itemId];
    const cap = capacity(ctx, it, b.price);
    if (cap < 1) continue;
    const q = bestQty(s, itemId, b.c, sl!.c, cap);
    if (q.qty < 1 || q.profit < q.cost * 0.04) continue;
    const hours = legHours(a, a.location, b.c) + legHours(a, b.c, sl!.c);
    if (!Number.isFinite(hours)) continue;
    const exposure = (standing(a, b.c).exposure + standing(a, sl!.c).exposure) / 200;
    const value = q.profit * itemWeight(s, P, mem, it) * (1 - P.caution * exposure);
    const score = value / (hours + 8);
    options.push({ plan: { itemId, buyIn: b.c, sellIn: sl!.c, qty: q.qty, expires: s.time + hours + 72 }, score });
  }
  options.sort((x, y) => y.score - x.score);
  // A IA afiada fica com o melhor negócio; a Recruta muitas vezes fecha um qualquer da lista.
  const best = rand(s) < ctx.D.quality ? options[0] : options[Math.floor(rand(s) * options.length)];
  if (best && ITEMS[best.plan.itemId].wmd) mem.lastWmdAt = s.time;
  return best?.plan;
}

/** Contrato que vale a pena disputar: prêmio acima do custo de comprar no melhor mercado e chegar a tempo. */
export function planContract(ctx: TradeCtx, open: Contract[]): TradePlan | undefined {
  const { s, a, D } = ctx;
  let best: { plan: TradePlan; gain: number } | undefined;
  const known = [...knownCountries(ctx).keys()].map((id) => s.countries[id]);
  for (const k of open) {
    const it = ITEMS[k.itemId];
    if (it.weight * k.qty > freeCargo(a)) continue;
    let where: { c: string; cost: number } | undefined;
    for (const c of known) {
      if (!c.stock.includes(k.itemId)) continue;
      const cost = quoteBuy(c, k.itemId, k.qty).total;
      if (!where || cost < where.cost) where = { c: c.id, cost };
    }
    if (!where || where.cost > ctx.spendable) continue;
    const hours = legHours(a, a.location, where.c) + legHours(a, where.c, k.countryId);
    if (s.time + hours * 1.3 + 12 > k.deadline) continue;
    // Recruta aceita Contratos magros que a Diretor deixaria passar.
    const gain = k.reward - where.cost;
    if (gain < k.reward * (0.06 + 0.1 * D.quality)) continue;
    if (!best || gain > best.gain)
      best = { plan: { itemId: k.itemId, buyIn: where.c, sellIn: k.countryId, qty: k.qty, contractId: k.id, expires: k.deadline }, gain };
  }
  return best?.plan;
}

/** Quanto do item do plano já está a bordo. */
export const planLoaded = (a: Agency, p: TradePlan) => cargoQty(a, p.itemId);

export { flightHours };
