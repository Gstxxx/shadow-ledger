import { describe, expect, it } from 'vitest';
import * as A from '../actions';
import { chooseTactic, finishCombat } from '../combatFlow';
import { MISSIONS } from '../data/rules';
import { TACTICS, stepCombat } from '../combat';
import { advance } from '../sim';
import { assets, newGame } from '../state';
import type { GameState, OperationKind, ThreatReaction } from '../types';

/** Tiny deterministic rng for the bot (independent of the game's). */
function botRng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function assertSane(s: GameState) {
  const bad = (label: string, v: number) => {
    if (!Number.isFinite(v)) throw new Error(`${label} = ${v} at t=${s.time}`);
  };
  bad('cash', s.cash);
  bad('time', s.time);
  bad('assets', assets(s));
  for (const c of Object.values(s.countries)) {
    bad(`rep ${c.name}`, c.reputation);
    bad(`exp ${c.name}`, c.exposure);
    for (const [k, v] of Object.entries(c.saturation)) bad(`sat ${c.name} ${k}`, v);
    for (const [k, v] of Object.entries(c.drift)) bad(`drift ${c.name} ${k}`, v);
  }
  for (const u of [...s.escort, ...s.fleet]) for (const v of Object.values(u.hp)) bad(`hp ${u.name}`, v);
}

function bot(s: GameState, r: () => number) {
  const pick = <T,>(a: T[]): T | undefined => (a.length ? a[Math.floor(r() * a.length)] : undefined);
  const ids = Object.keys(s.countries);
  const roll = r();
  const here = s.countries[s.location];
  if (roll < 0.2) A.travel(s, pick(ids)!);
  else if (roll < 0.4) {
    const it = pick(here.stock);
    if (it) A.buy(s, it, 1 + Math.floor(r() * 5));
  } else if (roll < 0.55) {
    const lot = pick(s.cargo);
    if (lot) A.sell(s, lot.itemId, Math.max(1, Math.floor(lot.qty * r())));
  } else if (roll < 0.6) A.openStation(s);
  else if (roll < 0.63) A.upgradeStation(s);
  else if (roll < 0.66) {
    const u = pick(s.escort);
    if (u) A.transferUnit(s, u.uid, 'station');
  } else if (roll < 0.69) {
    const t = pick(s.threats);
    if (t) A.react(s, t.id, pick<ThreatReaction>(['lawyers', 'bribe', 'reinforce', 'evacuate'])!);
  } else if (roll < 0.73) {
    const k = pick(s.contracts.filter((x) => x.status === 'offered'));
    if (k) A.acceptContract(s, k.id);
    const d = pick(s.contracts.filter((x) => x.status === 'accepted'));
    if (d) A.deliverContract(s, d.id);
  } else if (roll < 0.75) A.startOperation(s, pick<OperationKind>(['bank', 'tech', 'eliminate'])!);
  else if (roll < 0.76) A.startCoup(s);
  else if (roll < 0.79) {
    const u = pick(s.escort);
    if (u) A.formTeam(s, 'escort', [u.uid]);
  } else if (roll < 0.83) {
    const t = pick(s.teams);
    if (t) {
      const x = r();
      if (x < 0.4) A.sendTeam(s, t.id, pick(ids)!, r() < 0.5 ? 'commercial' : 'freighter');
      else if (x < 0.6) A.teamOperation(s, t.id, pick<OperationKind>(['bank', 'tech', 'eliminate'])!);
      else if (x < 0.7) A.teamRescue(s, t.id);
      else if (x < 0.8) A.teamAttackGroup(s, t.id);
      else A.mergeTeam(s, t.id, r() < 0.5 ? 'escort' : 'station');
    }
  } else if (roll < 0.85) A.payRelease(s);
  else if (roll < 0.86) A.payArrears(s);
  else if (roll < 0.87) {
    const st = pick(s.stations.filter((x) => x.interdicted));
    if (st) A.payFine(s, st.countryId);
  } else if (roll < 0.9) {
    const lot = pick(s.cargo.filter((l) => l.itemId !== 'rifles'));
    if (lot) A.enlist(s, lot.itemId);
  }
}

function run(seed: number, missionId: string, sandbox: boolean, days = 200) {
  const s = newGame({ missionId, difficulty: (1 + (seed % 3)) as 1 | 2 | 3, hardcore: !sandbox && seed % 4 === 0, seed });
  if (sandbox) s.mission = { ...s.mission, kind: 'profit', days: 0 };
  const r = botRng(seed * 31 + 7);
  let guard = 0;
  while (s.time < days * 24 && !s.over && guard++ < 200_000) {
    if (s.events.length) s.events = [];
    if (s.pendingCombat) {
      const t = TACTICS[Math.floor(r() * TACTICS.length)];
      if (!chooseTactic(s, t, r() < 0.3)) chooseTactic(s, 'assault', false);
    }
    if (s.combat) {
      if (r() < 0.5) stepCombat(s, s.combat);
      else finishCombat(s);
      assertSane(s);
      continue;
    }
    if (r() < 0.5) bot(s, r);
    advance(s, 1 + r() * 12);
    assertSane(s);
  }
  return s;
}

describe('Simulação headless', () => {
  it('roda 200 dias em sandbox com decisões aleatórias sem erro nem NaN', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = run(seed, MISSIONS[seed % MISSIONS.length].id, true);
      expect(s.over, JSON.stringify(s.over) + JSON.stringify(s.director)).toBeUndefined();
      expect(s.time).toBeGreaterThanOrEqual(200 * 24);
      expect(s.over).toBeUndefined();
    }
  });

  it('cada missão roda até o fim ou até 200 dias', () => {
    for (const [i, m] of MISSIONS.entries()) {
      const s = run(100 + i, m.id, false);
      expect(s.over !== undefined || s.time >= 200 * 24).toBe(true);
      if (m.days) expect(s.over).toBeDefined();
    }
  });
});
