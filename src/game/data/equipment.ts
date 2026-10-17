import type { CombatType } from '../types';

/** Slot de Equipamento numa Unidade do Pessoal. */
export type GearSlot = 'weapon' | 'armor' | 'kit';
export const GEAR_SLOTS: GearSlot[] = ['weapon', 'armor', 'kit'];

/**
 * Equipamento: o que uma Unidade do Pessoal carrega (não é Carga). `bonus` soma pontos de força da Unidade
 * naquele tipo de Combate (gancho src/game/strength.ts). Faixa do balanceamento: ~30 mil por ponto;
 * comum +1 (15–60 mil), intermediário +2 ou +1 em dois tipos (60–200 mil), topo +3 (até 300 mil). `tier` controla onde o Arsenal tem o item: 1 em todo lugar,
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
  { id: 'pistol', slot: 'weapon', price: 30_000, tier: 1, bonus: { urban: 1 } },
  { id: 'carbine', slot: 'weapon', price: 150_000, tier: 2, bonus: { urban: 1, army: 2 } },
  { id: 'manpads', slot: 'weapon', price: 300_000, tier: 3, bonus: { air: 3 } },
  { id: 'vest', slot: 'armor', price: 40_000, tier: 1, bonus: { urban: 1 } },
  { id: 'plate', slot: 'armor', price: 160_000, tier: 2, bonus: { urban: 2, army: 1 } },
  { id: 'radio', slot: 'kit', price: 50_000, tier: 1, bonus: { army: 1 } },
  { id: 'nvg', slot: 'kit', price: 120_000, tier: 2, bonus: { urban: 1, army: 1 } },
  { id: 'papers', slot: 'kit', price: 110_000, tier: 2, bonus: { legal: 2 } },
];

export const GEAR: Record<string, GearDef> = Object.fromEntries(list.map((g) => [g.id, g]));
export const GEAR_IDS = list.map((g) => g.id);
