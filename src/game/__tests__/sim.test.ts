import { describe, expect, it } from 'vitest';
import * as A from '../actions';
import { chooseTactic, finishCombat } from '../combatFlow';
import { PRESETS } from '../data/rules';
import { TACTICS, stepCombat } from '../combat';
import { advance } from '../sim';
import { assets, newGame, player } from '../state';
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
  bad('time', s.time);
  bad('tension', s.tension);
  for (const a of s.agencies) {
    bad('cash', a.cash);
    bad('assets', assets(a));
    for (const [id, st] of Object.entries(a.standing)) {
      bad(`rep ${id}`, st.reputation);
      bad(`exp ${id}`, st.exposure);
    }
    for (const u of [...a.escort, ...a.fleet]) for (const v of Object.values(u.hp)) bad(`hp ${u.name}`, v);
  }
  for (const c of Object.values(s.countries)) {
    for (const [k, v] of Object.entries(c.saturation)) bad(`sat ${c.name} ${k}`, v);
    for (const [k, v] of Object.entries(c.drift)) bad(`drift ${c.name} ${k}`, v);
  }
}

function bot(s: GameState, r: () => number) {
  const a = player(s);
  const pick = <T,>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(r() * arr.length)] : undefined);
  const ids = Object.keys(s.countries);
  const roll = r();
  const here = s.countries[a.location];
  if (roll < 0.2) A.travel(s, a, pick(ids)!);
  else if (roll < 0.4) {
    const it = pick(here.stock);
    if (it) A.buy(s, a, it, 1 + Math.floor(r() * 5));
  } else if (roll < 0.55) {
    const lot = pick(a.cargo);
    if (lot) A.sell(s, a, lot.itemId, Math.max(1, Math.floor(lot.qty * r())));
  } else if (roll < 0.6) A.openStation(s, a);
  else if (roll < 0.63) A.upgradeStation(s, a);
  else if (roll < 0.66) {
    const u = pick(a.escort);
    if (u) A.transferUnit(s, a, u.uid, 'station');
  } else if (roll < 0.69) {
    const t = pick(a.threats);
    if (t) A.react(s, a, t.id, pick<ThreatReaction>(['lawyers', 'bribe', 'reinforce', 'evacuate'])!);
  } else if (roll < 0.73) {
    const k = pick(s.contracts.filter((x) => x.status === 'offered'));
    if (k) A.acceptContract(s, a, k.id);
    const d = pick(s.contracts.filter((x) => x.status === 'accepted'));
    if (d) A.deliverContract(s, a, d.id);
  } else if (roll < 0.75) A.startOperation(s, a, pick<OperationKind>(['bank', 'tech', 'neutralize'])!);
  else if (roll < 0.76) A.startCoup(s, a);
  else if (roll < 0.79) {
    const u = pick(a.escort);
    if (u) A.formTeam(s, a, 'escort', [u.uid]);
  } else if (roll < 0.84) {
    const t = pick(a.teams);
    if (t) {
      const x = r();
      if (x < 0.35) A.sendTeam(s, a, t.id, pick(ids)!, r() < 0.5 ? 'commercial' : 'freighter');
      else if (x < 0.55) A.teamOperation(s, a, t.id, pick<OperationKind>(['bank', 'tech', 'neutralize'])!);
      else if (x < 0.62) A.teamRescue(s, a, t.id);
      else if (x < 0.68) A.teamAttackGroup(s, a, t.id);
      else if (x < 0.76) {
        const lot = pick(t.spoils);
        if (lot) A.fenceSpoils(s, a, t.id, lot.lid);
      } else if (x < 0.84) A.stashSpoils(s, a, t.id);
      else A.mergeTeam(s, a, t.id, r() < 0.5 ? 'escort' : 'station');
    }
  } else if (roll < 0.86) A.payRelease(s, a);
  else if (roll < 0.87) A.payArrears(s, a);
  else if (roll < 0.88) {
    const st = pick(a.stations.filter((x) => x.interdicted));
    if (st) A.payFine(s, a, st.countryId);
  } else if (roll < 0.9) {
    const lot = pick(a.cargo.filter((l) => l.itemId !== 'rifles'));
    if (lot) A.enlist(s, a, lot.itemId);
  } else if (roll < 0.92) {
    const lot = pick(a.cargo);
    if (lot) A.deposit(s, a, lot.itemId, 1);
    const st = a.stations.find((x) => x.countryId === a.location);
    const v = st && pick(st.vault);
    if (v) A.withdraw(s, a, v.itemId, 1);
  } else if (roll < 0.93) {
    const u = pick([...a.escort, ...a.fleet].filter((x) => x.injury?.kind === 'damaged'));
    if (u) A.repair(s, a, u.uid);
  }
}

function run(seed: number, presetIdx: number, sandbox: boolean, days = 200) {
  const base = PRESETS[presetIdx % PRESETS.length];
  const preset = sandbox ? { ...base, objective: 'profit' as const, days: 0 } : base;
  const s = newGame({ preset, difficulty: (1 + (seed % 3)) as 1 | 2 | 3, hardcore: !sandbox && seed % 4 === 0, seed });
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
  it('roda 200 dias em Sandbox sem prazo com decisões aleatórias sem erro nem NaN', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = run(seed, seed, true);
      expect(s.over, JSON.stringify(s.over)).toBeUndefined();
      expect(s.time).toBeGreaterThanOrEqual(200 * 24);
    }
  }, 300_000);

  it('cada Preset roda até o fim ou até 200 dias', () => {
    for (const [i, p] of PRESETS.entries()) {
      const s = run(100 + i, i, false);
      expect(s.over !== undefined || s.time >= 200 * 24).toBe(true);
      if (p.days) expect(s.over).toBeDefined();
    }
  }, 300_000);
});
