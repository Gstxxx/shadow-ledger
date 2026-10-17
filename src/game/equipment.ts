// Equipamento e Arsenal (backlog 5). O Equipamento multiplica a força da Unidade por tipo de Combate,
// como os Traços (combat.ts eff()). O Arsenal é a loja de Equipamento, separada do Mercado: sem estoque
// guardado, a oferta e o preço saem do Nível e da política do país (em guerra há mais oferta e é mais barato).
import { GEAR, GEAR_IDS } from './data/equipment';
import type { GearDef, GearSlot } from './data/equipment';
import { M, ref, say } from './msg';
import type { Result } from './actions';
import type { Msg } from './msg';
import { allUnits } from './state';
import type { Agency, CombatType, Country, GameState, Unit } from './types';
import { isPersonnel } from './units';

export type GearResult = Result;
const done = (ok: boolean, m: Msg): Result => (ok ? { ok: true, msg: say(m), m } : { ok: false, msg: say(m), m });

/** Multiplicador de força do Equipamento da Unidade neste tipo de Combate (1 sem Equipamento). */
export function equipMult(u: Unit, type: CombatType): number {
  const g = u.gear;
  if (!g) return 1;
  let m = 1;
  for (const id of [g.weapon, g.armor, g.kit]) if (id && GEAR[id]) m *= 1 + (GEAR[id].bonus[type] ?? 0);
  return m;
}

/** Só o Pessoal usa Equipamento. */
export const canEquip = (u: Unit) => isPersonnel(u) && !u.temp;

/** Nível de oferta do Arsenal no país: 1 em todo lugar, 2 em países grandes ou instáveis, 3 em guerra. */
export function arsenalTier(c: Country): number {
  const war = c.politics === 'war' || c.politics === 'civilwar';
  const unrest = c.politics === 'disorder' || c.politics === 'coldwar';
  if (war) return 3;
  return c.level >= 4 || unrest ? 2 : 1;
}

/** Fator de preço do Arsenal: guerra barateia, sanções encarecem. */
export function arsenalPriceFactor(c: Country): number {
  if (c.politics === 'war' || c.politics === 'civilwar') return 0.85;
  if (c.politics === 'sanctions') return 1.25;
  if (c.politics === 'disorder') return 0.95;
  return 1;
}

export interface ArsenalOffer {
  def: GearDef;
  price: number;
}

/** O que o Arsenal do país vende, na ordem do catálogo. */
export function arsenalOffer(c: Country): ArsenalOffer[] {
  const tier = arsenalTier(c);
  const f = arsenalPriceFactor(c);
  return GEAR_IDS.map((id) => GEAR[id])
    .filter((g) => g.tier <= tier)
    .map((g) => ({ def: g, price: Math.round((g.price * f) / 1000) * 1000 }));
}

/** Equipamento guardado (comprado e não equipado). */
export const gearStock = (a: Agency, id: string) => a.gearStock?.[id] ?? 0;

function blocked(s: GameState, a: Agency): Msg | null {
  if (s.over) return M('msg.act.gameOver');
  if (a.director.status === 'detained') return M('msg.act.directorDetained');
  if (a.director.status === 'kidnapped') return M('msg.act.directorKidnapped');
  if (a.director.status === 'dead') return M('msg.act.directorDead');
  if (a.flight) return M('msg.act.fleetInFlight');
  return null;
}

/** Compra no Arsenal do país onde o Diretor está; vai para o estoque de Equipamento da agência. */
export function buyGear(s: GameState, a: Agency, id: string): GearResult {
  const b = blocked(s, a);
  if (b) return done(false, b);
  const c = s.countries[a.location];
  const o = arsenalOffer(c).find((x) => x.def.id === id);
  if (!o) return done(false, M('msg.gear.notHere', { country: ref.country(c.id) }));
  if (o.price > a.cash) return done(false, M('msg.act.noCash'));
  a.cash -= o.price;
  (a.gearStock ??= {})[id] = gearStock(a, id) + 1;
  return done(true, M('msg.gear.bought', { gear: ref.msg(M(`gear.${id}.name` as never)), total: ref.money(o.price) }));
}

/** Equipa (id) ou tira (null) o slot de uma Unidade; o que sai volta ao estoque. */
export function equipGear(a: Agency, uid: string, slot: GearSlot, id: string | null): GearResult {
  const u = allUnits(a).find((x) => x.uid === uid);
  if (!u || !canEquip(u)) return done(false, M('msg.gear.cannot'));
  if (id !== null) {
    const g = GEAR[id];
    if (!g || g.slot !== slot) return done(false, M('msg.gear.cannot'));
    if (gearStock(a, id) <= 0) return done(false, M('msg.gear.noneInStock'));
  }
  const stock = (a.gearStock ??= {});
  const old = u.gear?.[slot];
  if (old) stock[old] = (stock[old] ?? 0) + 1;
  if (id !== null) stock[id] -= 1;
  u.gear = { ...u.gear, [slot]: id ?? undefined };
  return done(true, M(id ? 'msg.gear.equipped' : 'msg.gear.removed', { name: u.name }));
}
