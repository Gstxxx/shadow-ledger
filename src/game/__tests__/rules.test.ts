import { describe, expect, it } from 'vitest';
import { deposit, fenceSpoils, formTeam, stashSpoils, withdraw } from '../actions';
import { addLot, cargoQty, lotId } from '../cargo';
import { applyCasualties, createCombat } from '../combat';
import { PRESETS } from '../data/rules';
import { advance } from '../sim';
import { newGame, player, stationIn } from '../state';
import { canFight, makeUnit, recoverDay, WOUND_DAYS } from '../units';

const game = () => newGame({ preset: PRESETS.find((p) => p.id === 'sahel-hunt')!, difficulty: 1, hardcore: false, seed: 7, rivals: 0 });

describe('Ferida e Danificada', () => {
  it('quem cai em Combate fica Ferido (Pessoal) ou Danificado (máquina), não morre', () => {
    const ctx = { rng: 1, uidCounter: 0 };
    const guard = makeUnit(ctx, 'swat');
    const car = makeUnit(ctx, 'technical');
    const c = createCombat(ctx, {
      agencyId: 'player',
      type: 'urban',
      reason: { kind: 'operation', op: 'bank', countryId: '840', by: 'director' },
      title: 't',
      player: [guard, car],
      enemy: [],
      tactic: 'assault',
      playerDefends: false,
      sources: [{ kind: 'escort' }],
      directorPresent: true,
    });
    c.reserve = [];
    c.downed = [guard.uid, car.uid];
    const { kept, lost, downed } = applyCasualties(c, [guard, car]);
    expect(lost).toHaveLength(0);
    expect(kept).toHaveLength(2);
    expect(downed.map((u) => u.injury?.kind).sort()).toEqual(['damaged', 'wounded']);
    expect(canFight(guard, 'urban')).toBe(false);
    for (let d = 0; d < WOUND_DAYS / 2; d++) recoverDay(guard, true);
    expect(guard.injury).toBeUndefined();
    expect(canFight(guard, 'urban')).toBe(true);
  });
});

describe('Cofre e Receptador', () => {
  it('o Diretor deixa e retira Carga do Cofre', () => {
    const s = game();
    const a = player(s);
    addLot(a.cargo, lotId, 'intel', 2, 300_000);
    expect(stationIn(a, a.location)).toBeDefined();
    expect(deposit(s, a, 'intel', 2).ok).toBe(true);
    expect(cargoQty(a, 'intel')).toBe(0);
    expect(stationIn(a, a.location)!.vault[0].qty).toBe(2);
    expect(withdraw(s, a, 'intel', 1).ok).toBe(true);
    expect(cargoQty(a, 'intel')).toBe(1);
  });

  it('itens capturados por uma Equipe vão ao Receptador ou ao Cofre', () => {
    const s = game();
    const a = player(s);
    expect(formTeam(s, a, 'escort', [a.escort[0].uid]).ok).toBe(true);
    const t = a.teams[0];
    addLot(t.spoils, lotId, 'docs', 1, 450_000);
    addLot(t.spoils, lotId, 'intel', 1, 150_000);
    t.spoils[0].fresh = true;
    const cash = a.cash;
    expect(fenceSpoils(s, a, t.id, t.spoils[0].lid).ok).toBe(true);
    expect(a.cash).toBeGreaterThan(cash);
    expect(stashSpoils(s, a, t.id).ok).toBe(true);
    expect(t.spoils).toHaveLength(0);
    expect(stationIn(a, t.location)!.vault.length).toBeGreaterThan(0);
  });
});

describe('Tensão Global', () => {
  it('fica entre 0 e 100 e decai com o tempo', () => {
    const s = game();
    s.tension = 60;
    advance(s, 24 * 10);
    expect(s.tension).toBeLessThan(60);
    expect(s.tension).toBeGreaterThanOrEqual(0);
  });
});
