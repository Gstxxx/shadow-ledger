import { ITEM_LIST, ITEMS, usesCargo } from './data/items';
import { pick, randRange, shuffle } from './rng';
import type { Country, GameState, ItemDef, Politics, UnitClass } from './types';
import { def } from './units';

const POLITICS_MULT: Record<Politics, Partial<Record<UnitClass, number>> & { all?: number }> = {
  peace: { special: 1.1, lawyer: 1.1 },
  disorder: { arms: 1.25, human: 1.15, vehicle: 1.05 },
  civilwar: { arms: 1.45, human: 1.3, vehicle: 1.15, secretary: 1.1 },
  sanctions: { all: 1.2, special: 1.3 },
  coldwar: { jet: 1.25, antiair: 1.25, special: 1.35 },
  war: { vehicle: 1.35, heli: 1.35, jet: 1.4, antiair: 1.35, arms: 1.15, cargo: 1.1 },
};

/** Rich countries favor high-rank goods, poor countries favor cheap low-rank goods. */
function levelAffinity(level: number, rank: number) {
  const ideal = (level - 1) * 0.75;
  return 1 + 0.12 - Math.abs(ideal - rank) * 0.09;
}

/** Can this country buy (or even be interested in) an item of this rank? */
export function interested(c: Country, it: ItemDef) {
  if (it.cls === 'special') return true;
  return c.level >= it.rank + 1 || (it.rank === 3 && c.level >= 3 && c.politics === 'war');
}

/** Market mid price for an item in a country. */
export function midPrice(c: Country, itemId: string): number {
  const it = def(itemId);
  const pm = POLITICS_MULT[c.politics];
  let p = it.price * levelAffinity(c.level, it.rank) * (pm[it.cls] ?? 1) * (pm.all ?? 1);
  if (it.origin?.includes(c.id)) p *= 0.78;
  p *= c.drift[itemId] ?? 1;
  return Math.round(p);
}

export const buyPrice = (c: Country, itemId: string) => Math.round(midPrice(c, itemId) * 1.04);
export const sellPrice = (c: Country, itemId: string) => (interested(c, def(itemId)) ? Math.round(midPrice(c, itemId) * 0.94) : 0);

/** Pick what a country offers: manufactured goods first, then a level-appropriate mix. */
export function rollStock(s: GameState, c: Country): string[] {
  const pool = ITEM_LIST.filter((it) => it.id !== 'nuclear' && it.id !== 'space' && it.rank <= Math.max(1, c.level - 1) + (c.level >= 4 ? 1 : 0));
  const own = pool.filter((it) => it.origin?.includes(c.id)).map((it) => it.id);
  const humans = pool.filter((it) => ['human', 'lawyer', 'secretary'].includes(it.cls)).map((it) => it.id);
  const others = pool.filter((it) => !own.includes(it.id) && !humans.includes(it.id) && it.cls !== 'special').map((it) => it.id);
  const stock = new Set<string>(own);
  shuffle(s, humans).slice(0, 4 + Math.floor(c.level / 2)).forEach((id) => stock.add(id));
  shuffle(s, others).slice(0, 5 + c.level).forEach((id) => stock.add(id));
  stock.add(c.level >= 4 ? pick(s, ['cargo1', 'cargo2']) : 'cargo0');
  if (c.level >= 3) stock.add(pick(s, ['intel', 'docs']));
  return [...stock].sort((a, b) => ITEMS[a].price - ITEMS[b].price);
}

export function driftPrices(s: GameState, c: Country) {
  for (const it of ITEM_LIST) {
    const cur = c.drift[it.id] ?? randRange(s, 0.85, 1.15);
    const next = cur + randRange(s, -0.04, 0.04) + (1 - cur) * 0.08;
    c.drift[it.id] = Math.min(1.3, Math.max(0.72, next));
  }
}

// ── Capacity ────────────────────────────────────────────

export function maxCargo(s: GameState): number {
  return s.escort.filter((u) => def(u.itemId).cls === 'cargo').reduce((a, u) => a + def(u.itemId).weight, 0);
}

export function usedCargo(s: GameState): number {
  const goods = s.cargo.reduce((a, l) => a + def(l.itemId).weight * l.qty, 0);
  const units = s.escort.filter((u) => usesCargo(def(u.itemId))).reduce((a, u) => a + def(u.itemId).weight, 0);
  return goods + units + 0.1; // the director travels too
}

export const freeCargo = (s: GameState) => Math.max(0, maxCargo(s) - usedCargo(s));

export function fleetSpeed(s: GameState): number {
  const planes = s.escort.filter((u) => def(u.itemId).cls === 'cargo');
  return planes.length ? Math.min(...planes.map((u) => def(u.itemId).speed ?? 500)) : 0;
}
