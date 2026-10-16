// Peças da execução paralela: cada arquivo *.bench.test.ts roda uma fatia e grava JSON em OUT;
// o teardown do globalSetup (setup.ts) junta tudo em report.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it as vitestIt } from 'vitest';
import * as A from '../../src/game/actions';
import { chooseTactic, finishCombat } from '../../src/game/combatFlow';
import { PRESETS } from '../../src/game/data/rules';
import { advance } from '../../src/game/sim';
import { newGame, player } from '../../src/game/state';
import type { Difficulty, GameState } from '../../src/game/types';
import { BOT_IDS, planTrade } from './bots';
import type { BotId } from './bots';
import { runGame } from './harness';
import type { GameResult } from './harness';

/** Só roda com a config própria (BALANCE=1); o `npm test` do projeto ignora estes arquivos. */
const it = vitestIt.skipIf(!process.env.BALANCE);

export const SEEDS = Number(process.env.SEEDS ?? 8);
export const LONG_SEEDS = Number(process.env.LONG_SEEDS ?? 12);
export const LONG_DAYS = Number(process.env.LONG_DAYS ?? 365);
export const OUT = process.env.OUT ?? `tools/balance/out/${process.env.VARIANT ?? 'base'}`;

const slim = (r: GameResult) => ({
  ...r,
  // Amostra a cada 10 dias: índice i = dia 10·i.
  profitByDay: r.profitByDay.filter((_, i) => i % 10 === 0),
  tensionByDay: r.tensionByDay.filter((_, i) => i % 10 === 0),
});

function save(name: string, data: unknown) {
  mkdirSync(join(OUT, 'parts'), { recursive: true });
  writeFileSync(join(OUT, 'parts', `${name}.json`), JSON.stringify(data));
}

/** Grade de um Preset: 3 Dificuldades × 6 bots × SEEDS sementes. */
export function gridFile(presetId: string) {
  it(`grade ${presetId}`, () => {
    const p = PRESETS.find((x) => x.id === presetId)!;
    const out: GameResult[] = [];
    for (const d of [1, 2, 3] as Difficulty[])
      for (const bot of BOT_IDS) for (let i = 0; i < SEEDS; i++) out.push(runGame({ preset: p, difficulty: d, bot, seed: 1000 + i * 37 }));
    save(`grid-${presetId}`, out.map(slim));
    expect(out.length).toBe(3 * BOT_IDS.length * SEEDS);
  });
}

/** Partidas longas em Sandbox sem prazo: Tensão Global e Crise Final. */
export function longFile(d: Difficulty, bots: BotId[] = ['operador', 'guloso', 'estacoes', 'aleatorio']) {
  it(`longas d${d}`, () => {
    const sandbox = { ...PRESETS.find((p) => p.id === 'med-corridor')!, id: 'sandbox-long', objective: 'profit' as const, days: 0 };
    const out: GameResult[] = [];
    for (const bot of bots)
      for (let i = 0; i < LONG_SEEDS; i++) out.push(runGame({ preset: sandbox, difficulty: d, bot, seed: 5000 + i * 53, capDays: LONG_DAYS }));
    save(`long-d${d}`, out.map(slim));
    expect(out.length).toBeGreaterThan(0);
  });
}

/** Avança até a Frota pousar (e mais `hours`), resolvendo o que aparecer de forma neutra. */
function settle(s: GameState, hours: number) {
  const a = player(s);
  let guard = 0;
  const end = s.time + hours;
  while (!s.over && guard++ < 2000 && (a.flight || s.time < end - 1e-6)) {
    s.events = [];
    if (s.pendingCombat) chooseTactic(s, 'defensive', false);
    if (s.combat) finishCombat(s);
    advance(s, a.flight ? a.flight.arrive - s.time + 0.01 : end - s.time);
  }
  s.events = [];
}

/** Rota fixa repetida: compra Q em A, vende em B, volta (esperando `waitDays`). Lucro de cada viagem. */
export function fixedRoute(seed: number, trips: number, waitDays: number) {
  const s = newGame({ preset: { ...PRESETS.find((p) => p.id === 'first-contract')!, days: 0 }, difficulty: 1, hardcore: false, seed });
  const a = player(s);
  a.cash = 30_000_000; // folga de caixa: só a Saturação (e o estoque) limitam o lucro
  const plan = planTrade(s, a, 'true')!;
  const origin = a.location;
  const out: number[] = [];
  for (let i = 0; i < trips; i++) {
    const before = a.cash;
    if (!A.buy(s, a, plan.itemId, plan.qty).ok) break;
    A.travel(s, a, plan.dest);
    settle(s, 0);
    A.sell(s, a, plan.itemId, plan.qty);
    out.push(a.cash - before);
    A.travel(s, a, origin);
    settle(s, waitDays * 24);
  }
  return { item: plan.itemId, qty: plan.qty, origin, dest: plan.dest, waitDays, out };
}

export function extrasFile() {
  it('rotas fixas (Saturação)', () => {
    const routes = [0, 2, 5].flatMap((w) => [4242, 777, 31337].map((seed) => fixedRoute(seed, 8, w)));
    save('routes', routes);
    expect(routes.length).toBe(9);
  });
}
