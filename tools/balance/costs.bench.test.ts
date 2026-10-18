// Custo de entrada × recompensa × risco de Contratos, Operações Especiais e reações a Ameaças
// no começo da partida (backlog item 4). Grava OUT/costs.md.
//   npx vitest run --config tools/balance/vitest.config.ts costs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it as vitestIt } from 'vitest';
import * as A from '../../src/game/actions';
import { estimateWin } from '../../src/game/combat';
import { ITEMS } from '../../src/game/data/items';
import { PRESETS } from '../../src/game/data/rules';
import { buildForce } from '../../src/game/forces';
import { quoteBuy } from '../../src/game/market';
import { advance } from '../../src/game/sim';
import { newGame, player } from '../../src/game/state';
import type { Contract, Difficulty, GameState, OperationKind, Unit } from '../../src/game/types';
import { makeUnit } from '../../src/game/units';
import { median } from './report';

const it = vitestIt.skipIf(!process.env.BALANCE);
const OUT = process.env.OUT ?? `tools/balance/out/${process.env.VARIANT ?? 'base'}`;
const SEEDS = Number(process.env.COST_SEEDS ?? 30);

const M = (n: number) => (Number.isFinite(n) ? (n / 1e6).toFixed(2) : '—');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

/** Menor custo para comprar o lote do Contrato em algum mercado do mundo (com Saturação). */
function fulfilCost(s: GameState, k: Contract): number {
  let best = Infinity;
  for (const c of Object.values(s.countries)) if (c.stock.includes(k.itemId)) best = Math.min(best, quoteBuy(c, k.itemId, k.qty).total);
  return best;
}

interface Offer {
  day: number;
  cost: number;
  reward: number;
  level: number;
  cash: number;
}

function collectOffers(preset: string, d: Difficulty, days: number): Offer[] {
  const out: Offer[] = [];
  for (let seed = 0; seed < SEEDS; seed++) {
    const s = newGame({ preset: PRESETS.find((p) => p.id === preset)!, difficulty: d, hardcore: false, seed: 9000 + seed * 13 });
    const cash = player(s).cash;
    const seen = new Set<string>();
    let guard = 0;
    while (s.time < days * 24 && !s.over && guard++ < 5000) {
      for (const k of s.contracts) {
        if (seen.has(k.id) || k.status !== 'offered') continue;
        seen.add(k.id);
        out.push({ day: s.time / 24, cost: fulfilCost(s, k), reward: k.reward, level: s.countries[k.countryId].level, cash });
      }
      s.events = [];
      s.pendingCombat = undefined;
      s.combat = undefined;
      advance(s, 12);
    }
  }
  return out;
}

function contractSection(): string {
  const rows: (string | number)[][] = [];
  for (const d of [1, 2, 3] as Difficulty[]) {
    const os = collectOffers('first-contract', d, 30);
    const cash = os[0]?.cash ?? 0;
    const perDay = os.length / SEEDS / 30;
    rows.push([
      ['', 'Recruta', 'Operador', 'Diretor'][d],
      M(cash),
      (perDay * 30).toFixed(1),
      M(median(os.map((o) => o.cost))),
      M(median(os.map((o) => o.reward))),
      pct(median(os.map((o) => o.reward / o.cost - 1))),
      pct(os.filter((o) => o.cost <= cash * 0.25).length / os.length),
      pct(os.filter((o) => o.cost <= cash * 0.5).length / os.length),
      pct(os.filter((o) => o.cost > cash).length / os.length),
    ]);
  }
  return table(
    ['Dificuldade', 'Caixa inicial (M)', 'Ofertas em 30 d', 'Custo mediano do lote (M)', 'Pagamento mediano (M)', 'Margem mediana', 'Custo ≤ 25% do caixa', '≤ 50%', '> caixa inteiro'],
    rows,
  );
}

const OPS: (OperationKind | 'coup')[] = ['bank', 'tech', 'neutralize', 'coup'];

/** Escolta mínima (Operadores Táticos no urbano, Comandos no militar, a preço-base) para a Prévia passar de 60%. */
function escortNeeded(s: GameState, enemy: Unit[], type: 'urban' | 'army', start: Unit[]): { n: number; cost: number; odds: number } {
  const ctx = { rng: 777, uidCounter: 900_000 };
  const extra: Unit[] = [];
  for (let n = 0; n <= 9; n++) {
    const setup = {
      agencyId: 'player',
      type,
      reason: { kind: 'operation' as const, op: 'bank' as const, countryId: '840', by: 'director' },
      title: '',
      enemy,
      player: [...start, ...extra],
      playerDefends: false,
      sources: [{ kind: 'escort' as const }],
      directorPresent: true,
    };
    const odds = Math.max(...(['assault', 'infiltration', 'defensive'] as const).map((t) => estimateWin(setup, t, 5, 80)));
    const hire = type === 'army' ? 'commando' : 'swat';
    if (odds >= 0.6) return { n, cost: n * ITEMS[hire].price, odds };
    extra.push(makeUnit(ctx, hire));
  }
  return { n: 99, cost: Infinity, odds: 0 };
}

function opsSection(): string {
  const rows: (string | number)[][] = [];
  for (const d of [1, 3] as Difficulty[]) {
    const s = newGame({ preset: PRESETS.find((p) => p.id === 'first-contract')!, difficulty: d, hardcore: false, seed: 4242 });
    const a = player(s);
    for (const lvl of [2, 3, 5]) {
      const c = Object.values(s.countries).find((x) => x.level === lvl)!;
      for (const op of OPS) {
        const str = A.operationStrength(s, a, c.id, op);
        const type = op === 'bank' || op === 'tech' ? 'urban' : 'army';
        const enemy = buildForce(s, op === 'neutralize' || op === 'coup' ? 'military' : 'security', str, type);
        const need = escortNeeded(s, enemy, type, a.escort);
        const bail = Math.round(150_000 * lvl * (1 + d * 0.3));
        rows.push([['', 'Recruta', 'Operador', 'Diretor'][d], lvl, op, str, need.n === 99 ? '> 9' : need.n, M(need.cost), M(bail)]);
      }
    }
  }
  return table(['Dificuldade', 'Nível do país', 'Operação', 'Força inimiga', 'Reforços p/ Prévia 60% (urbano: Op. Tático; militar: Comando)', 'Custo desse reforço (M)', 'Fiança se falhar (M)'], rows);
}

function reactionSection(): string {
  const rows: (string | number)[][] = [];
  for (const d of [1, 2, 3] as Difficulty[]) {
    const s = newGame({ preset: PRESETS.find((p) => p.id === 'first-contract')!, difficulty: d, hardcore: false, seed: 31 });
    const a = player(s);
    for (const lvl of [2, 3, 5]) {
      const c = Object.values(s.countries).find((x) => x.level === lvl)!;
      const strength = Math.round((4 + lvl * 2.5) * (0.75 + d * 0.25));
      a.threats = [{ id: 'tx', kind: 'raid', countryId: c.id, target: 'station', announcedAt: 0, strikesAt: 48, strength, reactions: [] }];
      rows.push([
        ['', 'Recruta', 'Operador', 'Diretor'][d],
        lvl,
        strength,
        M(A.reactionCost(s, a, 'tx', 'bribe')),
        M(A.reactionCost(s, a, 'tx', 'lawyers')),
        M(A.reactionCost(s, a, 'tx', 'reinforce')),
        M(a.cash),
      ]);
    }
  }
  return table(['Dificuldade', 'Nível do país', 'Força da Batida', 'Suborno (M)', 'Advogados (M)', 'Reforço (M)', 'Caixa inicial (M)'], rows);
}

it('custos de entrada no começo da partida', () => {
  const md = [
    `# Custos de entrada — ${process.env.VARIANT ?? 'motor atual'}`,
    `Primeiro Contrato, ${SEEDS} sementes, primeiros 30 dias. Gerado em ${new Date().toISOString()}.`,
    `## Contratos oferecidos\n\nCusto = comprar o lote no mercado mais barato do mundo, com Saturação.\n\n${contractSection()}`,
    `## Operações Especiais e Golpe (Escolta inicial do Primeiro Contrato)\n\n${opsSection()}`,
    `## Reações a uma Batida contra a Estação\n\n${reactionSection()}`,
  ].join('\n\n');
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'costs.md'), md + '\n');
  console.log(md);
  expect(md.length).toBeGreaterThan(0);
});
