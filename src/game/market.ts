import { ITEM_LIST, ITEMS, usesCargo } from './data/items';
import { pick, randRange, shuffle } from './rng';
import type { RngHolder } from './rng';
import type { Agency, Country, ItemDef, Politics, Unit, UnitClass } from './types';
import { def } from './units';

const POLITICS_MULT: Record<Politics, Partial<Record<UnitClass, number>> & { all?: number }> = {
  peace: { special: 1.1, lawyer: 1.1 },
  disorder: { arms: 1.25, human: 1.15, vehicle: 1.05 },
  civilwar: { arms: 1.45, human: 1.3, vehicle: 1.15, influence: 1.1 },
  sanctions: { all: 1.2, special: 1.3 },
  coldwar: { jet: 1.25, antiair: 1.25, special: 1.35 },
  war: { vehicle: 1.35, heli: 1.35, jet: 1.4, antiair: 1.35, arms: 1.15, cargo: 1.1 },
};

/** Spread between buying and selling at the mid price. */
const BUY_SPREAD = 1.04;
const SELL_SPREAD = 0.94;
/** Saturação is clamped to ±60% of the price. */
export const SATURATION_LIMIT = 0.6;
/** Hours for Saturação to fall to ~37% of its value. */
export const SATURATION_RECOVERY_H = 96;

/** Rich countries favor high-rank goods, poor countries favor cheap low-rank goods. */
function levelAffinity(level: number, rank: number) {
  const ideal = (level - 1) * 0.75;
  return 1 + 0.12 - Math.abs(ideal - rank) * 0.09;
}

/** Can this country buy (or even be interested in) an item of this rank? */
export function interested(c: Country, it: ItemDef) {
  if (it.wmd) return ['war', 'coldwar', 'sanctions', 'civilwar'].includes(c.politics);
  if (it.cls === 'special') return true;
  return c.level >= it.rank + 1 || (it.rank === 3 && c.level >= 3 && c.politics === 'war');
}

/** Market mid price before Saturação. */
export function basePrice(c: Country, itemId: string): number {
  const it = def(itemId);
  const pm = POLITICS_MULT[c.politics];
  let p = it.price * levelAffinity(c.level, it.rank) * (pm[it.cls] ?? 1) * (pm.all ?? 1);
  if (it.origin?.includes(c.id)) p *= 0.78;
  p *= c.drift[itemId] ?? 1;
  return p;
}

/** Market mid price including the agency's own Saturação. */
export function midPrice(c: Country, itemId: string): number {
  return Math.round(basePrice(c, itemId) * (1 + (c.saturation[itemId] ?? 0)));
}

export const buyPrice = (c: Country, itemId: string) => Math.round(midPrice(c, itemId) * BUY_SPREAD);
export const sellPrice = (c: Country, itemId: string) =>
  interested(c, def(itemId)) ? Math.round(midPrice(c, itemId) * SELL_SPREAD) : 0;

/**
 * How much one unit traded moves the local price. Big economies absorb more; expensive goods
 * move thin markets harder.
 */
export function saturationStep(c: Country, itemId: string): number {
  const it = def(itemId);
  const depth = 0.5 + c.level * 0.5; // 1..3
  const weight = it.cls === 'arms' || it.cls === 'special' ? 0.05 : 0.07;
  const priceFactor = 1 + Math.log10(Math.max(1, it.price / 100_000)) * 0.25;
  return (weight * priceFactor) / depth;
}

function clampSat(v: number) {
  return Math.max(-SATURATION_LIMIT, Math.min(SATURATION_LIMIT, v));
}

/** Quote selling `qty` units, one at a time, each sale pushing the price down. Does not mutate. */
export function quoteSell(c: Country, itemId: string, qty: number): { total: number; avg: number; after: number } {
  if (!interested(c, def(itemId))) return { total: 0, avg: 0, after: c.saturation[itemId] ?? 0 };
  let sat = c.saturation[itemId] ?? 0;
  const base = basePrice(c, itemId);
  const step = saturationStep(c, itemId);
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += Math.round(base * (1 + sat) * SELL_SPREAD);
    sat = clampSat(sat - step);
  }
  return { total, avg: qty ? Math.round(total / qty) : 0, after: sat };
}

/** Quote buying `qty` units, each purchase pushing the price up. Does not mutate. */
export function quoteBuy(c: Country, itemId: string, qty: number): { total: number; avg: number; after: number } {
  let sat = c.saturation[itemId] ?? 0;
  const base = basePrice(c, itemId);
  const step = saturationStep(c, itemId) * 0.8;
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += Math.round(base * (1 + sat) * BUY_SPREAD);
    sat = clampSat(sat + step);
  }
  return { total, avg: qty ? Math.round(total / qty) : 0, after: sat };
}

/** Saturação dissipates exponentially toward zero. */
export function recoverSaturation(c: Country, hours: number) {
  const k = Math.exp(-hours / SATURATION_RECOVERY_H);
  for (const id of Object.keys(c.saturation)) {
    const v = c.saturation[id] * k;
    if (Math.abs(v) < 0.002) delete c.saturation[id];
    else c.saturation[id] = v;
  }
}

/** Pick what a country offers: manufactured goods first, then a level-appropriate mix. */
/** Tensão Global from which Armas de Destruição em Massa reach the market. */
export const WMD_TENSION = 75;

export function rollStock(s: RngHolder, c: Country, tension = 0): string[] {
  const pool = ITEM_LIST.filter(
    (it) => it.tradable && !it.wmd && it.id !== 'space' && it.rank <= Math.max(1, c.level - 1) + (c.level >= 4 ? 1 : 0),
  );
  const own = pool.filter((it) => it.origin?.includes(c.id)).map((it) => it.id);
  const humans = pool.filter((it) => it.cls === 'human').map((it) => it.id);
  const others = pool.filter((it) => !own.includes(it.id) && !humans.includes(it.id) && it.cls !== 'special').map((it) => it.id);
  const stock = new Set<string>(own);
  shuffle(s, humans).slice(0, 3 + Math.floor(c.level / 2)).forEach((id) => stock.add(id));
  shuffle(s, others).slice(0, 5 + c.level).forEach((id) => stock.add(id));
  if (c.level >= 3) stock.add(pick(s, ['intel', 'docs']));
  if (tension >= WMD_TENSION && c.level >= 3 && interested(c, ITEMS.chem)) stock.add(pick(s, ['chem', 'bio', 'nuclear']));
  return [...stock].sort((a, b) => ITEMS[a].price - ITEMS[b].price);
}

/** Recruitable here (not resold as Carga): Pessoal especializado e cargueiros. */
export function rollRecruits(c: Country): string[] {
  const list = ['lawyer1', 'liaison1', 'agent'];
  if (c.level >= 3) list.push('lawyer2', 'liaison2');
  if (c.level >= 5) list.push('lawyer3', 'liaison3');
  list.push(c.level >= 4 ? 'cargo1' : 'cargo0');
  if (c.level >= 5) list.push('cargo2');
  return list;
}

export function driftPrices(s: RngHolder, c: Country) {
  for (const it of ITEM_LIST) {
    const cur = c.drift[it.id] ?? randRange(s, 0.85, 1.15);
    const next = cur + randRange(s, -0.04, 0.04) + (1 - cur) * 0.08;
    c.drift[it.id] = Math.min(1.3, Math.max(0.72, next));
  }
}

// ── Frota: capacidade e velocidade ──────────────────────────

const activeFreighters = (a: Agency) => a.fleet.filter((u) => !u.idle);

export function maxCargo(a: Agency): number {
  return activeFreighters(a).reduce((a, u) => a + def(u.itemId).weight, 0);
}

export const unitsWeight = (units: Unit[]) =>
  units.filter((u) => usesCargo(def(u.itemId))).reduce((a, u) => a + def(u.itemId).weight, 0);

export function cargoWeight(a: Agency): number {
  return a.cargo.reduce((a, l) => a + def(l.itemId).weight * l.qty, 0);
}

/** Carga + Escolta (aeronaves de combate não ocupam espaço) + o Diretor. */
export function usedCargo(a: Agency): number {
  return cargoWeight(a) + unitsWeight(a.escort) + 0.1;
}

export const freeCargo = (a: Agency) => Math.max(0, maxCargo(a) - usedCargo(a));

/** Velocidade da Frota: a do cargueiro mais lento. */
export function fleetSpeed(a: Agency): number {
  const planes = activeFreighters(a);
  return planes.length ? Math.min(...planes.map((u) => def(u.itemId).speed ?? 500)) : 0;
}
