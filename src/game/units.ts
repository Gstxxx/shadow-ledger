import { ITEMS } from './data/items';
import { CALLSIGNS, FIRST_NAMES, LAST_NAMES } from './data/names';
import { clashes, PROMOTION_TRAITS, TRAIT_IDS, TRAITS } from './data/traits';
import { chance, pick, randInt } from './rng';
import type { RngHolder } from './rng';
import type { CombatType, ItemDef, Strength, TraitId, Unit } from './types';

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

export const isPersonnelItem = (it: ItemDef) => it.cls === 'human' || it.cls === 'lawyer' || it.cls === 'influence';

export function makeUnit(s: MintCtx, itemId: string, paid?: number): Unit {
  const it = ITEMS[itemId];
  const human = isPersonnelItem(it);
  const name = human ? `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}` : `${pick(s, CALLSIGNS)}-${randInt(s, 10, 99)}`;
  const traits: TraitId[] = [];
  if (human) {
    const n = chance(s, 0.4) ? 2 : 1;
    let guard = 0;
    while (traits.length < n && guard++ < 20) {
      const t = pick(s, TRAIT_IDS);
      if (!traits.includes(t) && !traits.some((x) => clashes(x, t))) traits.push(t);
    }
  }
  return {
    uid: nextUid(s),
    itemId,
    name,
    hp: { ...it.str },
    xp: 0,
    paid: paid ?? it.price,
    seed: randInt(s, 1, 1_000_000),
    traits,
    ranked: 0,
  };
}

export function makeFort(s: MintCtx, str: number, type: CombatType): Unit {
  const hp: Strength = { legal: 0, urban: 0, army: 0, air: 0, convert: 0 };
  hp[type] = str;
  return { uid: nextUid(s, 'f'), itemId: FORT_ID, name: 'Defesa da Estação', hp, xp: 0, paid: 0, seed: 0, traits: [], ranked: 0 };
}

export const isPersonnel = (u: Unit) => isPersonnelItem(def(u.itemId));

/** Agentes de Influência fight with persuasion in every combat but air. */
export function usesConvert(u: Unit, type: CombatType): boolean {
  return def(u.itemId).cls === 'influence' && type !== 'air';
}

export function strOf(u: Unit, type: CombatType): number {
  return usesConvert(u, type) ? u.hp.convert : u.hp[type];
}

export function maxStrOf(u: Unit, type: CombatType): number {
  const d = def(u.itemId);
  return usesConvert(u, type) ? d.str.convert : d.str[type];
}

/** Product of a numeric Traço modifier over the unit's Traços. */
export function traitMult(u: Unit, key: 'strength' | 'upkeep' | 'recovery' | 'xp' | 'convert' | 'exposure'): number {
  return u.traits.reduce((a, t) => a * (TRAITS[t][key] ?? 1), 1);
}

/** Ready for action: not Ferida/Danificada, not parada, and has strength of this type. */
export const canFight = (u: Unit, type: CombatType) => !u.idle && !u.injury && strOf(u, type) > 0;

/** Manutenção mensal: salário do Pessoal (3% do preço) ou manutenção técnica das máquinas (1,5%). */
export function upkeepOf(u: Unit): number {
  if (u.itemId === FORT_ID) return 0;
  const d = def(u.itemId);
  return Math.round(d.price * (isPersonnel(u) ? 0.03 : 0.015) * traitMult(u, 'upkeep'));
}

export const rankOf = (u: Unit) => Math.min(5, Math.floor(u.xp / 20));

/** Promotion: one new positive Traço per new patente (Pessoal only). Returns the Traço gained, if any. */
export function promote(s: MintCtx, u: Unit): TraitId | undefined {
  if (!isPersonnel(u)) return undefined;
  const r = rankOf(u);
  if (r <= u.ranked) return undefined;
  u.ranked = r;
  const options = PROMOTION_TRAITS.filter((t) => !u.traits.includes(t));
  if (!options.length) return undefined;
  const t = pick(s, options);
  u.traits = [...u.traits.filter((x) => !clashes(x, t)), t];
  return t;
}

/** Average remaining health across the strengths this unit actually has. */
export function healthRatio(u: Unit): number {
  const d = def(u.itemId);
  const keys = (Object.keys(d.str) as (keyof Strength)[]).filter((k) => d.str[k] > 0);
  if (!keys.length) return 1;
  return keys.reduce((a, k) => a + u.hp[k] / d.str[k], 0) / keys.length;
}

export const unitValue = (u: Unit) =>
  Math.round(u.paid * (0.4 + 0.6 * healthRatio(u)) * (u.injury?.kind === 'damaged' ? 0.6 : 1));

export const restore = (u: Unit) => {
  u.hp = { ...def(u.itemId).str };
};

/** Heal one point of every reduced strength (units out of action do not heal this way). */
export function healUnit(u: Unit) {
  if (u.injury) return;
  const d = def(u.itemId);
  (Object.keys(d.str) as (keyof Strength)[]).forEach((k) => {
    if (u.hp[k] < d.str[k]) u.hp[k] += 1;
  });
}

/** Ferida: days out of action. */
export const WOUND_DAYS = 10;

/** Knocked out in Combate: Ferida (Pessoal) or Danificada (máquina). */
export function knockOut(u: Unit) {
  u.injury = isPersonnel(u) ? { kind: 'wounded', days: WOUND_DAYS } : { kind: 'damaged' };
}

/** Daily recovery of a Ferida; twice as fast inside an Estação. */
export function recoverDay(u: Unit, inStation: boolean) {
  if (u.injury?.kind !== 'wounded') return;
  u.injury.days = (u.injury.days ?? 0) - (inStation ? 2 : 1) * traitMult(u, 'recovery');
  if (u.injury.days <= 0) {
    u.injury = undefined;
    restore(u);
  }
}

/** Conserto de uma máquina Danificada (numa Estação Escritório ou maior). */
export const repairCost = (u: Unit) => Math.round(def(u.itemId).price * 0.15);
export const REPAIR_MIN_LEVEL = 3;
