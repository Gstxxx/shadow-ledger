import type { CombatType } from '../types';

/** Slot de Equipamento numa Unidade do Pessoal. */
export type GearSlot = 'weapon' | 'armor' | 'kit';
export const GEAR_SLOTS: GearSlot[] = ['weapon', 'armor', 'kit'];

/**
 * Equipamento: o que uma Unidade do Pessoal carrega (não é Carga). `bonus` multiplica a força da Unidade
 * naquele tipo de Combate (0,2 = +20%). `tier` controla onde o Arsenal tem o item: 1 em todo lugar,
 * 2 em países maiores ou em conflito, 3 só em guerra. Nomes e descrições em i18n: `gear.<id>.name|blurb`.
 */
export interface GearDef {
  id: string;
  slot: GearSlot;
  price: number;
  tier: 1 | 2 | 3;
  bonus: Partial<Record<CombatType, number>>;
}

const list: GearDef[] = [
  { id: 'pistol', slot: 'weapon', price: 40_000, tier: 1, bonus: { urban: 0.15 } },
  { id: 'carbine', slot: 'weapon', price: 180_000, tier: 2, bonus: { urban: 0.2, army: 0.25 } },
  { id: 'manpads', slot: 'weapon', price: 650_000, tier: 3, bonus: { air: 0.4, army: 0.1 } },
  { id: 'vest', slot: 'armor', price: 60_000, tier: 1, bonus: { urban: 0.15, army: 0.1 } },
  { id: 'plate', slot: 'armor', price: 220_000, tier: 2, bonus: { urban: 0.2, army: 0.2 } },
  { id: 'radio', slot: 'kit', price: 80_000, tier: 1, bonus: { urban: 0.05, army: 0.05, air: 0.05 } },
  { id: 'nvg', slot: 'kit', price: 250_000, tier: 2, bonus: { urban: 0.15, army: 0.1 } },
  { id: 'papers', slot: 'kit', price: 120_000, tier: 2, bonus: { legal: 0.25 } },
];

export const GEAR: Record<string, GearDef> = Object.fromEntries(list.map((g) => [g.id, g]));
export const GEAR_IDS = list.map((g) => g.id);
