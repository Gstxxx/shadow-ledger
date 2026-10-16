// Propostas de balanceamento: cada uma é uma troca exata de texto num arquivo do motor
// (valor antigo → novo). Um lote é medido com VARIANT=<lote> numa cópia de src/game e só depois
// é enviado ao game-builder. Nada aqui altera src/.

export interface Proposal {
  id: string;
  batch: string;
  file: string;
  from: string;
  to: string;
  why: string;
}

export const PROPOSALS: Proposal[] = [
  // ── Lote 0: Tensão Global e Crise Final ──────────────────
  {
    id: 'T1',
    batch: 'lote0',
    file: 'src/game/sim.ts',
    from: 'addTension(s, -0.45 + wars * 0.015);',
    to: 'addTension(s, -(0.3 + s.tension * 0.01) + wars * 0.01);',
    why: 'Decaimento proporcional à própria tensão (0,8/dia em 50, 1,3/dia em 100): um mundo calmo volta sozinho, e só uma escalada sustentada mantém o Topo.',
  },
  // ── Lote 1: economia do Comércio ─────────────────────────
  {
    id: 'P1',
    batch: 'lote1',
    file: 'src/game/market.ts',
    from: 'const BUY_SPREAD = 1.04;\nconst SELL_SPREAD = 0.94;',
    to: 'const BUY_SPREAD = 1.06;\nconst SELL_SPREAD = 0.92;',
    why: 'Ida e volta custava 10% (agora 16%); com 50–150% de margem máxima por viagem o caixa dobrava em dias. 15% de spread corta as rotas marginais.',
  },
  {
    id: 'P2',
    batch: 'lote1',
    file: 'src/game/market.ts',
    from: "const weight = it.cls === 'arms' || it.cls === 'special' ? 0.05 : 0.07;",
    to: "const weight = it.cls === 'arms' || it.cls === 'special' ? 0.15 : 0.2;",
    why: 'Saturação por unidade ×3: cada mercado absorve um terço do volume antes de a margem sumir. Sem isso o lucro escala com o capital (Iniciante +165 M no Mediterrâneo, +840 M no Pacífico).',
  },
  {
    id: 'P3',
    batch: 'lote1',
    file: 'src/game/market.ts',
    from: 'export const SATURATION_RECOVERY_H = 96;',
    to: 'export const SATURATION_RECOVERY_H = 240;',
    why: 'Saturação dissipa em ~10 dias em vez de 4: voltar à mesma rota cedo demais rende pouco.',
  },
  {
    id: 'P4',
    batch: 'lote1',
    file: 'src/game/market.ts',
    from: '    const cur = c.drift[it.id] ?? randRange(s, 0.85, 1.15);\n    const next = cur + randRange(s, -0.04, 0.04) + (1 - cur) * 0.08;\n    c.drift[it.id] = Math.min(1.3, Math.max(0.72, next));',
    to: '    const cur = c.drift[it.id] ?? randRange(s, 0.92, 1.08);\n    const next = cur + randRange(s, -0.03, 0.03) + (1 - cur) * 0.08;\n    c.drift[it.id] = Math.min(1.15, Math.max(0.87, next));',
    why: 'O ruído de preço (0,72–1,30) sozinho criava 80% de margem entre países. O lucro deve vir de política, origem e nível do país, não de sorteio.',
  },

  // ── Lote 2: Estações e defesa ────────────────────────────
  {
    id: 'P5',
    batch: 'lote2',
    file: 'src/game/combat.ts',
    from: '  if (setup.fort && c.reserve.length === 0) {',
    to: '  if (setup.fort) {',
    why: 'As defesas fixas só entravam com a Estação vazia, e toda linha sem defensor é rompida: 2 Operadores Táticos seguravam 1% contra força 8, a Estação vazia 13%. Com as defesas sempre na coluna 0, Unidades somam em vez de atrapalhar.',
  },
  {
    id: 'P6',
    batch: 'lote2',
    file: 'src/game/data/rules.ts',
    from: `  1: { level: 1, name: 'Célula', cost: 250_000, capacity: 2, allows: HUMANS, fort: { legal: 2, urban: 2, army: 2, air: 2 }, income: 3_500, wideIntel: false },
  2: { level: 2, name: 'Casa Segura', cost: 800_000, capacity: 4, allows: HUMANS, fort: { legal: 3, urban: 3, army: 3, air: 3 }, income: 9_000, wideIntel: false },
  3: { level: 3, name: 'Escritório', cost: 2_500_000, capacity: 6, allows: GROUND, fort: { legal: 4, urban: 4, army: 4, air: 4 }, income: 24_000, wideIntel: false },
  4: { level: 4, name: 'Complexo', cost: 6_000_000, capacity: 8, allows: [...GROUND, 'heli'], fort: { legal: 4, urban: 5, army: 5, air: 5 }, income: 52_000, wideIntel: true },
  5: { level: 5, name: 'Base', cost: 14_000_000, capacity: 10, allows: [...GROUND, 'heli', 'jet'], fort: { legal: 4, urban: 5, army: 6, air: 6 }, income: 105_000, wideIntel: true },`,
    to: `  1: { level: 1, name: 'Célula', cost: 250_000, capacity: 2, allows: HUMANS, fort: { legal: 4, urban: 4, army: 4, air: 4 }, income: 5_000, wideIntel: false },
  2: { level: 2, name: 'Casa Segura', cost: 800_000, capacity: 4, allows: HUMANS, fort: { legal: 5, urban: 5, army: 5, air: 5 }, income: 13_000, wideIntel: false },
  3: { level: 3, name: 'Escritório', cost: 2_500_000, capacity: 6, allows: GROUND, fort: { legal: 5, urban: 6, army: 6, air: 6 }, income: 32_000, wideIntel: false },
  4: { level: 4, name: 'Complexo', cost: 6_000_000, capacity: 8, allows: [...GROUND, 'heli'], fort: { legal: 6, urban: 7, army: 7, air: 7 }, income: 64_000, wideIntel: true },
  5: { level: 5, name: 'Base', cost: 14_000_000, capacity: 10, allows: [...GROUND, 'heli', 'jet'], fort: { legal: 6, urban: 7, army: 8, air: 8 }, income: 120_000, wideIntel: true },`,
    why: 'Célula rendia 3,5 mil/dia (payback 53–68 dias) e caía em ~94% das Ameaças (defesa fixa 2). Renda 5 mil → payback 37–55 dias; defesa fixa 4 segura ~58% contra força 12 (Recruta) e ~35% contra 16 (Diretor).',
  },
  {
    id: 'P7',
    batch: 'lote2',
    file: 'src/game/combatFlow.ts',
    from: 'const fine = Math.round(STATIONS[st.level].cost * 0.35 + 120_000 * c.level);',
    to: 'const fine = Math.round(STATIONS[st.level].cost * 0.35 + 40_000 * c.level);',
    why: 'A multa de uma Célula Interditada num país nível 3 era 447 mil, quase o dobro do custo da Célula (250 mil): ninguém pagava.',
  },

  // ── Lote 3: Objetivos de caça e resgate ──────────────────
  {
    id: 'P8',
    batch: 'lote3',
    file: 'src/game/state.ts',
    from: 'const strength = 22 + preset.challenge * 10 + (opts.difficulty - 1) * 6;',
    to: 'const strength = 12 + preset.challenge * 6 + (opts.difficulty - 1) * 5;',
    why: 'Grupo com força 42–64 em 9 Unidades veteranas: mesmo com +6 comandos a chance de vencer em 10 turnos era ≤ 5%. Nenhum bot venceu Caçada no Sahel nem Resgate nos Andes.',
  },

  // ── Lote 4: Operações Especiais ──────────────────────────
  {
    id: 'P9',
    batch: 'lote4',
    file: 'src/game/combatFlow.ts',
    from: 'const loot = Math.round(cty.level * 450_000 * randRange(s, 0.7, 1.3));',
    to: 'const loot = Math.round(cty.level * 150_000 * randRange(s, 0.7, 1.3));',
    why: 'Roubo a banco rendia até US$ 2,9 M (nível 5) com risco baixo: o Operador fazia ~45 Operações por partida e lucrava 5–8× o Comerciante (US$ 150 M vs 22 M no Primeiro Contrato).',
  },
  {
    id: 'P10',
    batch: 'lote4',
    file: 'src/game/combatFlow.ts',
    from: 'const bonus = cty.level * 800_000;',
    to: 'const bonus = cty.level * 400_000;',
    why: 'O "agradecimento" do Golpe (até US$ 4 M) pagava o risco várias vezes; metade mantém o Golpe atraente pelo Aliado + Reputação 75.',
  },
];

/** Lotes são cumulativos na ordem: o lote N inclui os anteriores. */
export const BATCH_ORDER: string[] = ['lote0', 'lote1', 'lote2', 'lote3', 'lote4'];

export function variantPatches(name: string): Proposal[] {
  const upto = BATCH_ORDER.indexOf(name);
  if (upto < 0) {
    // Um id avulso: só essa proposta ou lote (ex.: VARIANT=P5).
    const one = PROPOSALS.filter((p) => p.id === name || p.batch === name);
    if (!one.length) throw new Error(`Variante desconhecida: ${name}`);
    return one;
  }
  const batches = new Set(BATCH_ORDER.slice(0, upto + 1));
  return PROPOSALS.filter((p) => batches.has(p.batch));
}
