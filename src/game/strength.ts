// Gancho de força: módulos (ex.: Equipamento, src da ui-polish) somam força por Unidade e tipo de Combate.
// O Combate, a Prévia e o Combate Automático leem a força efetiva por aqui.
import type { CombatType, Unit } from './types';
import { strOf } from './units';

export type StrengthMod = (u: Unit, type: CombatType) => number;

const mods = new Map<string, StrengthMod>();

/** Registra (ou substitui) um modificador de força. Deve ser puro e barato: roda em cada duelo. */
export function registerStrengthMod(id: string, fn: StrengthMod) {
  mods.set(id, fn);
}

export function unregisterStrengthMod(id: string) {
  mods.delete(id);
}

/** Soma dos modificadores registrados para esta Unidade neste tipo de Combate. */
export function strengthBonus(u: Unit, type: CombatType): number {
  let b = 0;
  for (const fn of mods.values()) b += fn(u, type) || 0;
  return b;
}

/** Força efetiva fora do Combate (ficha, listas): força atual + modificadores, nunca negativa. */
export function unitStrength(u: Unit, type: CombatType): number {
  const base = strOf(u, type);
  return base > 0 ? Math.max(0, base + strengthBonus(u, type)) : 0;
}
