import { ITEMS } from './data/items';
import { CALLSIGNS, FIRST_NAMES, LAST_NAMES } from './data/names';
import { pick, randInt } from './rng';
import type { RngHolder } from './rng';
import type { CombatType, ItemDef, Strength, Unit } from './types';

/** Minimal context to mint units: an rng cursor and the uid counter. */
export type MintCtx = RngHolder & { uidCounter: number };

export const FORT_ID = '__fort';

const FORT_DEF: ItemDef = {
  id: FORT_ID,
  name: 'Defesa da Estação',
  cls: 'special',
  rank: 0,
  price: 0,
  weight: 0,
  str: { legal: 0, urban: 0, army: 0, air: 0, convert: 0 },
  tradable: false,
  fieldable: false,
  blurb: 'Portas reforçadas, câmeras e o vigia da noite.',
};

export function def(itemId: string): ItemDef {
  return itemId === FORT_ID ? FORT_DEF : ITEMS[itemId];
}

export function nextUid(s: MintCtx, prefix = 'u'): string {
  s.uidCounter += 1;
  return `${prefix}${s.uidCounter}`;
}

export function makeUnit(s: MintCtx, itemId: string, paid?: number): Unit {
  const it = ITEMS[itemId];
  const human = it.cls === 'human' || it.cls === 'lawyer' || it.cls === 'secretary';
  const name = human
    ? `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}`
    : `${pick(s, CALLSIGNS)}-${randInt(s, 10, 99)}`;
  return {
    uid: nextUid(s),
    itemId,
    name,
    hp: { ...it.str },
    xp: 0,
    paid: paid ?? it.price,
    seed: randInt(s, 1, 1_000_000),
  };
}

export function makeFort(s: MintCtx, str: number, type: CombatType): Unit {
  const hp: Strength = { legal: 0, urban: 0, army: 0, air: 0, convert: 0 };
  hp[type] = str;
  return { uid: nextUid(s, 'f'), itemId: FORT_ID, name: 'Defesa da Estação', hp, xp: 0, paid: 0, seed: 0 };
}

/** Converters (influence agents) fight with persuasion in every combat but air. */
export function usesConvert(u: Unit, type: CombatType): boolean {
  return def(u.itemId).cls === 'secretary' && type !== 'air';
}

export function strOf(u: Unit, type: CombatType): number {
  return usesConvert(u, type) ? u.hp.convert : u.hp[type];
}

export function maxStrOf(u: Unit, type: CombatType): number {
  const d = def(u.itemId);
  return usesConvert(u, type) ? d.str.convert : d.str[type];
}

export const canFight = (u: Unit, type: CombatType) => !u.idle && strOf(u, type) > 0;

export const isPersonnel = (u: Unit) => {
  const c = def(u.itemId).cls;
  return c === 'human' || c === 'lawyer' || c === 'secretary';
};

/** Manutenção mensal: salário do Pessoal (3% do preço) ou manutenção técnica das máquinas (1,5%). */
export function upkeepOf(u: Unit): number {
  if (u.itemId === FORT_ID) return 0;
  const d = def(u.itemId);
  return Math.round(d.price * (isPersonnel(u) ? 0.03 : 0.015));
}

export const rankOf = (u: Unit) => Math.min(5, Math.floor(u.xp / 20));

/** Average remaining health across the strengths this unit actually has. */
export function healthRatio(u: Unit): number {
  const d = def(u.itemId);
  const keys = (Object.keys(d.str) as (keyof Strength)[]).filter((k) => d.str[k] > 0);
  if (!keys.length) return 1;
  return keys.reduce((a, k) => a + u.hp[k] / d.str[k], 0) / keys.length;
}

export const unitValue = (u: Unit) => Math.round(u.paid * (0.4 + 0.6 * healthRatio(u)));

/** Heal one point of every damaged strength. */
export function healUnit(u: Unit) {
  const d = def(u.itemId);
  (Object.keys(d.str) as (keyof Strength)[]).forEach((k) => {
    if (u.hp[k] < d.str[k]) u.hp[k] += 1;
  });
}
