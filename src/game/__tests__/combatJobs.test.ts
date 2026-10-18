import { describe, expect, it } from 'vitest';
import { formTeam } from '../actions';
import * as J from '../combatJobs';
import { finishCombat, chooseTactic } from '../combatFlow';
import { PRESETS } from '../data/rules';
import { loadSave } from '../save';
import { advance } from '../sim';
import { newGame, player } from '../state';
import type { CombatContract, GameState } from '../types';
import { makeUnit } from '../units';

const preset = { ...PRESETS.find((p) => p.id === 'first-contract')!, days: 0 };
const game = (seed = 21) => newGame({ preset, difficulty: 2, hardcore: false, seed, rivals: 0 });

const quiet = (s: GameState) => {
  s.events = [];
  s.pendingCombat = undefined;
  s.combat = undefined;
};

/** A strong Team parked where the player is. */
function strongTeam(s: GameState) {
  const a = player(s);
  const squad = Array.from({ length: 7 }, () => makeUnit(s, 'commando'));
  a.escort.push(...squad);
  expect(formTeam(s, a, 'escort', squad.map((u) => u.uid)).ok).toBe(true);
  return a.teams[a.teams.length - 1];
}

describe('Contratos de combate', () => {
  it('aparecem com recompensa, prazo e força hostil', () => {
    const s = game();
    for (let d = 0; d < 20; d++) {
      quiet(s);
      advance(s, 24);
    }
    const jobs = J.jobsOf(s);
    expect(jobs.length).toBeGreaterThan(0);
    for (const k of jobs) {
      expect(k.reward).toBeGreaterThan(0);
      expect(k.strength).toBeGreaterThan(0);
      expect(J.COMBAT_JOB_KINDS).toContain(k.kind);
    }
  });

  it('o risco (Prévia) aparece antes de aceitar, entre 0 e 1', () => {
    const s = game();
    const a = player(s);
    const job: CombatContract = {
      id: 'cjx', countryId: a.location, kind: 'convoy', client: 'X', strength: 8, reward: 500_000, reputation: 5,
      offeredAt: 0, offerExpires: 100, deadline: 300, status: 'offered',
    };
    J.jobsOf(s).push(job);
    const r = J.jobRisk(s, a, job);
    expect(r.chance).toBeGreaterThanOrEqual(0);
    expect(r.chance).toBeLessThanOrEqual(1);
    expect(r.present).toBe(true);
  });

  it('uma Equipe forte cumpre o Contrato em Combate Automático e a agência recebe', () => {
    const s = game();
    const a = player(s);
    const team = strongTeam(s);
    J.jobsOf(s).push({
      id: 'cjy', countryId: a.location, kind: 'extraction', client: 'Cliente', strength: 6, reward: 700_000, reputation: 6,
      offeredAt: 0, offerExpires: 100, deadline: 300, status: 'offered',
    });
    const cash = a.cash;
    expect(J.fightCombatJob(s, a, 'cjy', team.id).ok).toBe(true);
    expect(s.combat).toBeUndefined();
    const k = J.jobsOf(s).find((x) => x.id === 'cjy')!;
    expect(k.status).toBe('done');
    expect(a.cash).toBe(cash + 700_000);
  });

  it('com o Diretor, abre a Prévia e a Tática; perder não prende o Diretor', () => {
    const s = game();
    const a = player(s);
    J.jobsOf(s).push({
      id: 'cjz', countryId: a.location, kind: 'defense', client: 'Cliente', strength: 60, reward: 900_000, reputation: 6,
      offeredAt: 0, offerExpires: 100, deadline: 300, status: 'offered',
    });
    expect(J.fightCombatJob(s, a, 'cjz', 'director').ok).toBe(true);
    expect(s.pendingCombat).toBeDefined();
    chooseTactic(s, 'assault', false);
    finishCombat(s);
    expect(J.jobsOf(s).find((x) => x.id === 'cjz')!.status).toBe('failed');
    expect(a.director.status).toBe('free');
  });

  it('não dá para lutar sem força no país', () => {
    const s = game();
    const a = player(s);
    J.jobsOf(s).push({
      id: 'cjw', countryId: '156', kind: 'convoy', client: 'X', strength: 6, reward: 1, reputation: 1,
      offeredAt: 0, offerExpires: 100, deadline: 300, status: 'offered',
    });
    expect(J.fightCombatJob(s, a, 'cjw', 'director').ok).toBe(false);
    expect(J.acceptCombatJob(s, a, 'cjw').ok).toBe(true);
  });
});

describe('Caçadas', () => {
  it('grupos hostis aparecem com recompensa e posição conhecida', () => {
    const s = game();
    for (let d = 0; d < 30; d++) {
      quiet(s);
      advance(s, 24);
    }
    const bands = J.bandsOf(s);
    expect(bands.length).toBeGreaterThan(0);
    expect(bands.every((b) => b.bounty > 0 && b.units.length > 0)).toBe(true);
  });

  it('caçar com uma Equipe forte elimina o grupo e paga a recompensa', () => {
    const s = game();
    const a = player(s);
    const team = strongTeam(s);
    s.hostiles = [
      {
        id: 'hbx', name: 'Teste', countryId: a.location, strength: 6, units: [makeUnit(s, 'thug'), makeUnit(s, 'thug')],
        bounty: 400_000, nextMoveAt: 9999, seenAt: { countryId: a.location, at: 0 },
      },
    ];
    const cash = a.cash;
    expect(J.huntBand(s, a, 'hbx', team.id).ok).toBe(true);
    expect(J.bandsOf(s)).toHaveLength(0);
    expect(a.cash).toBe(cash + 400_000);
  });
});

describe('Save', () => {
  it('saves da versão 6 ganham listas vazias', () => {
    const s = game() as unknown as Record<string, unknown>;
    s.saveVersion = 6;
    delete s.combatContracts;
    delete s.hostiles;
    const l = loadSave(JSON.stringify(s));
    expect(l?.combatContracts).toEqual([]);
    expect(l?.hostiles).toEqual([]);
  });
});
