import type { CombatType, Continent } from '../types';

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
  /** Só nos Arsenais destes continentes. */
  continents?: Continent[];
  /** Só em países deste Nível para cima (ex.: embaixadas para a imunidade). */
  minLevel?: number;
  /** Armamento pesado: só a partir deste dia da partida (fim de jogo). */
  minDay?: number;
}

// 8 por slot, em três faixas de preço; cada tipo de Combate tem itens nas três faixas ou quase.
const list: GearDef[] = [
  // Arma principal
  { id: 'pistol', slot: 'weapon', price: 30_000, tier: 1, bonus: { urban: 1 } },
  { id: 'dossier', slot: 'weapon', price: 60_000, tier: 1, bonus: { legal: 2 } },
  { id: 'smg', slot: 'weapon', price: 70_000, tier: 2, bonus: { urban: 2 } },
  { id: 'sniper', slot: 'weapon', price: 140_000, tier: 2, bonus: { army: 2, urban: 1 } },
  { id: 'carbine', slot: 'weapon', price: 150_000, tier: 2, bonus: { urban: 1, army: 2 } },
  { id: 'grenadel', slot: 'weapon', price: 200_000, tier: 3, bonus: { army: 2, urban: 1 } },
  { id: 'lmg', slot: 'weapon', price: 280_000, tier: 3, bonus: { army: 3 }, minDay: 30 },
  { id: 'manpads', slot: 'weapon', price: 300_000, tier: 3, bonus: { air: 3 }, minDay: 30 },
  // Proteção
  { id: 'helmet', slot: 'armor', price: 35_000, tier: 1, bonus: { air: 1 } },
  { id: 'vest', slot: 'armor', price: 40_000, tier: 1, bonus: { urban: 1 } },
  { id: 'camo', slot: 'armor', price: 35_000, tier: 1, bonus: { army: 1 }, continents: ['SA', 'AF', 'AS'] },
  { id: 'suit', slot: 'armor', price: 70_000, tier: 2, bonus: { legal: 1, urban: 1 }, minLevel: 3 },
  { id: 'gasmask', slot: 'armor', price: 80_000, tier: 2, bonus: { urban: 1, army: 1 } },
  { id: 'chute', slot: 'armor', price: 120_000, tier: 2, bonus: { air: 2 } },
  { id: 'plate', slot: 'armor', price: 160_000, tier: 2, bonus: { urban: 2, army: 1 } },
  { id: 'heavyarmor', slot: 'armor', price: 300_000, tier: 3, bonus: { army: 3 }, minDay: 30 },
  // Acessório
  { id: 'lawyer', slot: 'kit', price: 40_000, tier: 1, bonus: { legal: 1 } },
  { id: 'radio', slot: 'kit', price: 50_000, tier: 1, bonus: { army: 1 } },
  { id: 'breach', slot: 'kit', price: 90_000, tier: 2, bonus: { urban: 2 } },
  { id: 'drone', slot: 'kit', price: 100_000, tier: 2, bonus: { urban: 1, air: 1 } },
  { id: 'papers', slot: 'kit', price: 110_000, tier: 2, bonus: { legal: 2 } },
  { id: 'nvg', slot: 'kit', price: 120_000, tier: 2, bonus: { urban: 1, army: 1 } },
  { id: 'laser', slot: 'kit', price: 220_000, tier: 3, bonus: { air: 2, army: 1 } },
  { id: 'immunity', slot: 'kit', price: 300_000, tier: 2, bonus: { legal: 3 }, minLevel: 4, continents: ['NA', 'EU', 'AS'] },
];

export const GEAR: Record<string, GearDef> = Object.fromEntries(list.map((g) => [g.id, g]));
export const GEAR_IDS = list.map((g) => g.id);
