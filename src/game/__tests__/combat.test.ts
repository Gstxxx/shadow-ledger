import { describe, expect, it } from 'vitest';
import { autoDeploy, createCombat, estimateWin, place, runToEnd, succeeded, TACTICS } from '../combat';
import type { CombatSetup } from '../combat';
import { makeUnit } from '../units';

const ctx = () => ({ rng: 1234, uidCounter: 0 });

function setup(c: ReturnType<typeof ctx>, player: string[], enemy: string[], over: Partial<CombatSetup> = {}): CombatSetup {
  return {
    agencyId: 'player',
    type: 'urban',
    reason: { kind: 'operation', op: 'bank', countryId: '840', by: 'director' },
    title: 'teste',
    player: player.map((id) => makeUnit(c, id)),
    enemy: enemy.map((id) => makeUnit(c, id)),
    tactic: 'assault',
    playerDefends: false,
    sources: [{ kind: 'escort' }],
    directorPresent: true,
    ...over,
  };
}

describe('Combate', () => {
  it('termina sempre em até 10 turnos com um resultado', () => {
    for (let seed = 1; seed < 40; seed++) {
      const c0 = { rng: seed, uidCounter: 0 };
      const cb = createCombat(c0, setup(c0, ['swat', 'thug', 'soldier'], ['police', 'police', 'bodyguard']));
      autoDeploy(cb);
      runToEnd(c0, cb);
      expect(cb.result).toBeDefined();
      expect(cb.turn).toBeLessThanOrEqual(10);
    }
  });

  it('força muito superior vence quase sempre e muito inferior quase nunca', () => {
    const c = ctx();
    const strong = setup(c, ['commando', 'commando', 'commando', 'swat', 'swat'], ['thug', 'bodyguard']);
    const weak = setup(c, ['bodyguard'], ['commando', 'commando', 'swat', 'swat', 'swat']);
    expect(estimateWin(strong, 'assault', 7, 80)).toBeGreaterThan(0.85);
    expect(estimateWin(weak, 'assault', 7, 80)).toBeLessThan(0.15);
  });

  it('na defesa, segurar até o fim (empate) conta como sucesso', () => {
    const c = ctx();
    const cb = createCombat(c, setup(c, ['swat'], ['thug'], { playerDefends: true }));
    cb.result = 'draw';
    expect(succeeded(cb)).toBe(true);
    cb.playerDefends = false;
    expect(succeeded(cb)).toBe(false);
  });

  it('Prévia é determinística e não depende de estado externo', () => {
    const c = ctx();
    const s = setup(c, ['swat', 'soldier'], ['police', 'police']);
    for (const t of TACTICS) expect(estimateWin(s, t, 99, 30)).toBe(estimateWin(s, t, 99, 30));
  });

  it('Agentes de Influência convertem inimigos, e Negociar converte mais', () => {
    const c = ctx();
    const s = setup(c, ['liaison3', 'liaison3', 'liaison3'], ['thug', 'thug', 'thug']);
    for (const u of s.player) u.traits = [];
    let normal = 0;
    let nego = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const [t, add] of [['assault', (n: number) => (normal += n)], ['negotiate', (n: number) => (nego += n)]] as const) {
        const cx = { rng: seed, uidCounter: 0 };
        const cb = createCombat(cx, { ...s, tactic: t });
        autoDeploy(cb);
        runToEnd(cx, cb);
        add(cb.converted.length);
      }
    }
    expect(normal).toBeGreaterThan(0);
    expect(nego).toBeGreaterThan(normal);
  });

  it('o jogador pode posicionar Unidades na zona de implantação', () => {
    const c = ctx();
    const cb = createCombat(c, setup(c, ['swat'], ['thug']));
    const uid = cb.reserve[0].uid;
    expect(place(cb, uid, 0, 5)).toBe(false);
    expect(place(cb, uid, 1, 2)).toBe(true);
    runToEnd(c, cb);
    expect(['win', 'lose', 'draw']).toContain(cb.result);
    expect(typeof succeeded(cb)).toBe('boolean');
  });
});
