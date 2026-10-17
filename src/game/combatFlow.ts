// Combat orchestration: gather forces, Prévia, Tática, Combate Automático, and outcomes.
import { addCargo, addLot, lotId } from './cargo';
import { applyCasualties, autoDeploy, createCombat, estimateWin, runToEnd, succeeded, TACTICS } from './combat';
import type { CombatSetup } from './combat';
import { ITEMS, STEAL_TABLE } from './data/items';
import { STATIONS, THREAT_BY_STATE } from './data/rules';
import { originMods } from './data/origins';
import { recordPriceEvent } from './history';
import { checkObjective } from './objective';
import { pick, randInt, randRange } from './rng';
import {
  addExposure,
  addReputation,
  addTension,
  agencyById,
  M,
  note,
  notify,
  player,
  ref,
  standing,
  stationIn,
} from './state';
import type { Agency, CombatSetupData, CombatState, ForceSource, GameState, StationLevel, Tactic, Unit } from './types';
import { def, promote, restore, traitMult } from './units';
import type { Msg } from './msg';

/** Título de Combate como parâmetro: a Msg quando há, senão o texto pt. */
const titleParam = (x: { title: string; titleMsg?: Msg }) => (x.titleMsg ? ref.msg(x.titleMsg) : x.title);

export function forceUnits(a: Agency, src: ForceSource): Unit[] {
  switch (src.kind) {
    case 'escort':
      return a.escort;
    case 'station':
      return stationIn(a, src.countryId)?.units ?? [];
    case 'team':
      return a.teams.find((t) => t.id === src.teamId)?.units ?? [];
  }
}

function setForceUnits(a: Agency, src: ForceSource, units: Unit[]) {
  switch (src.kind) {
    case 'escort':
      a.escort = units;
      return;
    case 'station': {
      const st = stationIn(a, src.countryId);
      if (st) st.units = units;
      return;
    }
    case 'team': {
      const t = a.teams.find((x) => x.id === src.teamId);
      if (t) t.units = units;
      return;
    }
  }
}

function toSetup(a: Agency, data: CombatSetupData): Omit<CombatSetup, 'tactic'> {
  return {
    agencyId: a.id,
    type: data.type,
    reason: data.reason,
    title: data.title,
    titleMsg: data.titleMsg,
    enemy: data.enemy,
    player: data.sources.flatMap((src) => forceUnits(a, src)),
    playerDefends: data.playerDefends,
    sources: data.sources,
    directorPresent: data.directorPresent,
    fort: data.fort,
    originBonus: originBonus(a, data),
  };
}

/** Força que a Origem soma a cada Unidade da agência neste tipo de Combate. */
function originBonus(a: Agency, data: CombatSetupData): { all: number; military: number } | undefined {
  const m = originMods(a);
  let all = m.strength?.[data.type] ?? 0;
  if (data.type === 'army' && data.directorPresent) all += m.directorArmy ?? 0;
  const military = data.type === 'army' ? (m.militaryUnitsArmy ?? 0) : 0;
  return all || military ? { all, military } : undefined;
}

/** Margem de erro (95%) da Prévia para `runs` simulações. */
export const previewMargin = (p: number, runs: number) => 1.96 * Math.sqrt((p * (1 - p)) / runs);

/** Prévia for every Tática. Uses a scratch rng derived from the game, never the game's own cursor. */
export function previewAll(s: GameState, a: Agency, data: CombatSetupData, runs = 60): Record<Tactic, number> {
  const setup = toSetup(a, data);
  const base = (s.rng ^ 0x5bd1e995) | 0;
  const out = {} as Record<Tactic, number>;
  TACTICS.forEach((t, i) => (out[t] = estimateWin(setup, t, base + i * 7919, runs)));
  return out;
}

/** Custo da Tática Negociar. */
export function negotiateCost(s: GameState, data: CombatSetupData): number {
  const lvl = s.countries[data.reason.countryId]?.level ?? 3;
  return 60_000 * lvl;
}

/**
 * Start a combat. With the player's Diretor present it waits for the Tática (pendingCombat);
 * otherwise it is a Combate Automático resolved on the spot with the best Tática by Prévia.
 */
export function beginCombat(s: GameState, a: Agency, data: CombatSetupData) {
  if (data.directorPresent && a.isPlayer) {
    const preview = previewAll(s, a, data);
    const margin = originMods(a).previewMargin
      ? (Object.fromEntries(TACTICS.map((t) => [t, previewMargin(preview[t], 60)])) as Record<Tactic, number>)
      : undefined;
    s.pendingCombat = { agencyId: a.id, setup: data, preview, margin };
    notify(s, a, 'engage', data.titleMsg ?? data.title, M('msg.combat.chooseTactic'), 'warn', data.reason.countryId);
    return;
  }
  // Rivals skip the Prévia (it costs ~50 simulated fights); the player's automatic fights still use it.
  let tactic: Tactic = data.playerDefends ? 'defensive' : 'assault';
  if (a.isPlayer) {
    const preview = previewAll(s, a, data, 16);
    tactic = TACTICS.filter((t) => t !== 'negotiate').reduce((best, t) => (preview[t] > preview[best] ? t : best), 'defensive' as Tactic);
  }
  const c = createCombat(s, { ...toSetup(a, data), tactic });
  autoDeploy(c);
  runToEnd(s, c);
  resolveCombat(s, c);
}

/** Player picked a Tática for the pending combat. `manual` = assumir a grade. */
export function chooseTactic(s: GameState, tactic: Tactic, manual: boolean): boolean {
  const pend = s.pendingCombat;
  if (!pend) return false;
  const a = agencyById(s, pend.agencyId) ?? player(s);
  if (tactic === 'negotiate') {
    const cost = negotiateCost(s, pend.setup);
    if (a.cash < cost) return false;
    a.cash -= cost;
  }
  const c = createCombat(s, { ...toSetup(a, pend.setup), tactic });
  if (!manual) autoDeploy(c);
  s.pendingCombat = undefined;
  s.combat = c;
  s.events = s.events.filter((e) => e.kind !== 'engage');
  return true;
}

/** Abort a pending combat the player started (Operações, Golpe, recurso). Ameaças cannot be refused. */
export function abortPending(s: GameState): boolean {
  const pend = s.pendingCombat;
  if (!pend || pend.setup.reason.kind === 'threat' || pend.setup.reason.kind === 'group') return false;
  s.pendingCombat = undefined;
  s.events = s.events.filter((e) => e.kind !== 'engage');
  note(s, player(s), M('msg.combat.aborted', { title: titleParam(pend.setup) }), 'info', pend.setup.reason.countryId);
  return true;
}

/** A live combat can still be called off before the first turn (not Ameaças nor the grupo hostil). */
export function canAbortLive(s: GameState): boolean {
  const c = s.combat;
  return !!c && c.turn === 0 && !c.result && c.reason.kind !== 'threat' && c.reason.kind !== 'group' && c.reason.kind !== 'intercept';
}

/** Call off a live combat before contact: units go home unharmed (they were only clones in the grid). */
export function abortLive(s: GameState): boolean {
  if (!canAbortLive(s)) return false;
  const c = s.combat!;
  s.combat = undefined;
  s.events = s.events.filter((e) => e.kind !== 'engage');
  note(s, agencyById(s, c.agencyId) ?? player(s), M('msg.combat.aborted', { title: titleParam(c) }), 'info', c.reason.countryId);
  return true;
}

/** Finish the live combat (after the player watched or played it). */
export function finishCombat(s: GameState) {
  const c = s.combat;
  if (!c) return;
  if (!c.result) {
    if (c.turn === 0) autoDeploy(c);
    runToEnd(s, c);
  }
  s.combat = undefined;
  resolveCombat(s, c);
}

/** Diretor perde: Detido (Estado), Sequestrado (crime) ou morto (Modo Hardcore). */
export function captureDirector(s: GameState, a: Agency, byState: boolean, countryId: string) {
  const c = s.countries[countryId];
  if (s.options.hardcore && a.isPlayer) {
    a.director.status = 'dead';
    notify(s, a, 'director', M('msg.combat.directorDeadTitle'), M('msg.combat.directorDeadBody', { country: ref.country(countryId) }), 'bad', countryId);
    checkObjective(s);
    return;
  }
  a.director.heldIn = countryId;
  if (byState) {
    a.director.status = 'detained';
    a.director.releaseAt = s.time + randInt(s, 6, 14) * 24;
    a.director.price = Math.round(150_000 * c.level * (1 + s.options.difficulty * 0.3));
    notify(s, a, 'director', M('msg.combat.directorDetainedTitle'), M('msg.combat.directorDetainedBody', { country: ref.country(countryId) }), 'bad', countryId);
  } else {
    a.director.status = 'kidnapped';
    a.director.releaseAt = undefined;
    a.director.price = Math.round(400_000 * c.level * (1 + s.options.difficulty * 0.4));
    notify(s, a, 'director', M('msg.combat.directorKidnappedTitle'), M('msg.combat.directorKidnappedBody', { country: ref.country(countryId) }), 'bad', countryId);
  }
}

export function stationLosesLevel(s: GameState, a: Agency, countryId: string) {
  const st = stationIn(a, countryId);
  if (!st) return;
  const country = ref.country(countryId);
  if (st.level === 1) {
    a.stations = a.stations.filter((x) => x !== st);
    notify(s, a, 'station', M('msg.combat.cellDestroyedTitle'), M('msg.combat.cellDestroyedBody', { country }), 'bad', countryId);
    return;
  }
  st.level = (st.level - 1) as StationLevel;
  const spec = STATIONS[st.level];
  // Units that no longer fit or are no longer allowed are lost.
  const keep = st.units.filter((u) => spec.allows.includes(def(u.itemId).cls)).slice(0, spec.capacity);
  const lost = st.units.length - keep.length;
  st.units = keep;
  const body = lost
    ? M('msg.combat.stationDowngradedLostBody', { country, station: ref.station(st.level), lost })
    : M('msg.combat.stationDowngradedBody', { country, station: ref.station(st.level) });
  notify(s, a, 'station', M('msg.combat.stationDowngradedTitle'), body, 'bad', countryId);
}

function interdict(s: GameState, a: Agency, countryId: string) {
  const st = stationIn(a, countryId);
  if (!st) return;
  const c = s.countries[countryId];
  const fine = Math.round(STATIONS[st.level].cost * 0.35 + 40_000 * c.level);
  st.interdicted = { fine, since: s.time };
  st.detained.push(...st.units);
  st.units = [];
  notify(
    s,
    a,
    'station',
    M('msg.combat.stationSeizedTitle'),
    M('msg.combat.stationSeizedBody', { country: ref.country(countryId), n: st.detained.length, fine: ref.money(fine) }),
    'bad',
    countryId,
  );
}

export function liftInterdiction(a: Agency, countryId: string) {
  const st = stationIn(a, countryId);
  if (!st?.interdicted) return;
  st.interdicted = undefined;
  st.units.push(...st.detained);
  st.detained = [];
}

const stealByLevel = (level: number) => STEAL_TABLE[Math.min(STEAL_TABLE.length - 1, Math.max(0, level - 1))];

/** Exposição multiplier from Discreto members of the force. */
const discretion = (units: Unit[]) => Math.min(1, ...units.map((u) => traitMult(u, 'exposure')));

/** Write results back, then apply what the outcome means for the agency. */
export function resolveCombat(s: GameState, c: CombatState) {
  const a = agencyById(s, c.agencyId) ?? player(s);
  const ok = succeeded(c);
  let lostTotal = 0;
  let downedTotal = 0;
  const involved: Unit[] = [];
  for (const src of c.sources) {
    const { lost, kept, downed } = applyCasualties(c, forceUnits(a, src));
    lostTotal += lost.length;
    downedTotal += downed.length;
    involved.push(...kept);
    setForceUnits(a, src, kept);
  }
  const fought = new Set([...c.units.filter((x) => x.side === 'p').map((x) => x.unit), ...c.downed.map((uid) => ({ uid }))].map((u) => u.uid));
  for (const u of involved) {
    if (fought.has(u.uid) && u.itemId !== '__fort') {
      const rec = (u.record ??= { combats: 0, wins: 0, kos: 0, converts: 0, joinedAt: 0 });
      rec.combats++;
      if (ok) rec.wins++;
      rec.kos += c.credits?.[u.uid]?.kos ?? 0;
      rec.converts += c.credits?.[u.uid]?.converts ?? 0;
    }
    const t = promote(s, u);
    if (t) note(s, a, M('msg.combat.promoted', { unit: u.name, trait: ref.trait(t) }), 'good');
  }
  // Converted enemies join the first force on the field.
  if (c.converted.length && c.sources.length) {
    const first = c.sources[0];
    const joined = c.converted.map((u) => {
      const v = { ...u, paid: ITEMS[u.itemId]?.price ?? 0, injury: undefined };
      restore(v);
      return v;
    });
    setForceUnits(a, first, [...forceUnits(a, first), ...joined]);
    note(s, a, M('msg.combat.convertedJoin', { n: joined.length }), 'good');
  }
  if (ok) a.stats.combatsWon++;
  else a.stats.combatsLost++;

  const r = c.reason;
  const cty = s.countries[r.countryId];
  const casualty = ref.casualty(downedTotal, lostTotal);
  const country = ref.country(r.countryId);
  const quiet = discretion(involved);

  switch (r.kind) {
    case 'threat': {
      a.threats = a.threats.filter((t) => t.id !== r.threatId);
      const byState = THREAT_BY_STATE[r.threatKind];
      if (ok) {
        notify(s, a, 'combat', M('msg.combat.threatWonTitle', { threat: ref.threat(r.threatKind) }), M('msg.combat.threatWonBody', { country, casualty }), 'good', r.countryId);
        addReputation(a, r.countryId, byState ? -4 : 3);
        addExposure(s, a, r.countryId, 6);
      } else {
        if (r.target === 'station') {
          if (r.threatKind === 'raid' || r.threatKind === 'lawsuit') interdict(s, a, r.countryId);
          else stationLosesLevel(s, a, r.countryId);
        } else {
          notify(s, a, 'combat', M('msg.combat.threatLostTitle', { threat: ref.threat(r.threatKind) }), M('msg.combat.threatLostBody', { country, casualty }), 'bad', r.countryId);
        }
        if (c.directorPresent) captureDirector(s, a, byState, r.countryId);
      }
      break;
    }
    case 'operation': {
      a.stats.operations++;
      const team = r.by === 'director' ? undefined : a.teams.find((t) => t.id === r.by);
      addReputation(a, r.countryId, ok ? -20 : -12);
      addExposure(s, a, r.countryId, (ok ? 35 : 45) * quiet, true);
      addTension(s, r.op === 'neutralize' ? 3 : 1);
      if (ok) {
        if (r.op === 'bank') {
          const loot = Math.round(cty.level * 150_000 * randRange(s, 0.7, 1.3));
          a.cash += loot;
          cty.bankRobbedAt = s.time;
          notify(s, a, 'combat', M('msg.combat.bankTitle'), M('msg.combat.bankBody', { country, loot: ref.money(loot), casualty }), 'good', r.countryId);
        } else if (r.op === 'tech') {
          const itemId = stealByLevel(cty.level);
          const paid = Math.round(ITEMS[itemId].price * 0.5);
          if (team) {
            addLot(team.spoils, lotId, itemId, 1, paid);
            for (const l of team.spoils) if (l.itemId === itemId) l.fresh = true;
          }
          else addCargo(a, itemId, 1, paid);
          notify(
            s,
            a,
            'combat',
            M('msg.combat.techTitle'),
            team
              ? M('msg.combat.techBodyTeam', { team: team.name, item: ref.item(itemId), country, casualty })
              : M('msg.combat.techBodyDirector', { item: ref.item(itemId), country, casualty }),
            'good',
            r.countryId,
          );
        } else {
          cty.politics = pick(s, ['disorder', 'civilwar'] as const);
          notify(s, a, 'combat', M('msg.combat.neutralizeTitle'), M('msg.combat.neutralizeBody', { country, casualty }), 'good', r.countryId);
        }
      } else {
        notify(s, a, 'combat', M('msg.combat.opFailedTitle', { op: ref.op(r.op) }), M('msg.combat.opFailedBody', { country, casualty }), 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, a, true, r.countryId);
      }
      break;
    }
    case 'coup': {
      addTension(s, 6);
      if (ok) {
        a.stats.coups++;
        standing(a, r.countryId).reputation = 75;
        cty.politics = 'disorder';
        cty.couped = true;
        recordPriceEvent(s, { countryId: r.countryId, kind: 'coup' });
        addExposure(s, a, r.countryId, 50);
        const bonus = cty.level * 400_000;
        a.cash += bonus;
        notify(s, a, 'combat', M('msg.combat.coupWonTitle'), M('msg.combat.coupWonBody', { country, bonus: ref.money(bonus) }), 'good', r.countryId);
      } else {
        standing(a, r.countryId).reputation = -80;
        notify(s, a, 'combat', M('msg.combat.coupLostTitle'), M('msg.combat.coupLostBody', { country, casualty }), 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, a, true, r.countryId);
      }
      break;
    }
    case 'group': {
      const g = s.group;
      if (ok && g) {
        g.defeated = true;
        notify(
          s,
          a,
          'objective',
          M(g.hostage ? 'msg.combat.hostageFreedTitle' : 'msg.combat.groupDestroyedTitle'),
          g.hostage
            ? M('msg.combat.hostageFreedBody', { hostage: g.hostage, group: g.name })
            : M('msg.combat.groupDestroyedBody', { group: g.name, country }),
          'good',
          r.countryId,
        );
      } else {
        const group = g?.name ?? ref.msg(M('msg.combat.theGroup'));
        notify(s, a, 'combat', M('msg.combat.groupLostTitle'), M('msg.combat.groupLostBody', { group, country, casualty }), 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, a, false, r.countryId);
      }
      break;
    }
    case 'appeal': {
      const st = stationIn(a, r.countryId);
      if (ok) {
        liftInterdiction(a, r.countryId);
        notify(s, a, 'station', M('msg.combat.appealWonTitle'), M('msg.combat.appealWonBody', { country }), 'good', r.countryId);
      } else if (st?.interdicted) {
        st.interdicted.fine = Math.round(st.interdicted.fine * 1.25);
        notify(s, a, 'station', M('msg.combat.appealLostTitle'), M('msg.combat.appealLostBody', { country, fine: ref.money(st.interdicted.fine) }), 'bad', r.countryId);
      }
      break;
    }
    case 'hostile': {
      const target = agencyById(s, r.targetId);
      addReputation(a, r.countryId, -10);
      addExposure(s, a, r.countryId, 30 * quiet, true);
      if (!target) break;
      if (ok) {
        if (r.act === 'sabotage') stationLosesLevel(s, target, r.countryId);
        else {
          const st = stationIn(target, r.countryId);
          const team = a.teams.find((t) => t.id === r.teamId);
          if (st && team) {
            for (const l of st.vault) addLot(team.spoils, lotId, l.itemId, l.qty, l.paidEach);
            for (const l of team.spoils) l.fresh = true;
            st.vault = [];
          }
        }
        notify(s, a, 'combat', M(`msg.combat.hostileDoneTitle.${r.act}`), M('msg.combat.hostileDoneBody', { target: target.name, country, casualty }), 'good', r.countryId);
        notify(s, target, 'station', M(`msg.combat.hostileSufferedTitle.${r.act}`), M('msg.combat.hostileSufferedBody', { agency: a.name, country }), 'bad', r.countryId);
      } else {
        notify(s, a, 'combat', M(`msg.combat.hostileFailedTitle.${r.act}`), M('msg.combat.hostileFailedBody', { target: target.name, country, casualty }), 'bad', r.countryId);
        notify(s, target, 'station', M('msg.combat.hostileRepelledTitle'), M('msg.combat.hostileRepelledBody', { country, agency: a.name }), 'good', r.countryId);
      }
      break;
    }
    case 'intercept': {
      const team = a.teams.find((t) => t.id === r.teamId);
      if (ok) {
        const tname = team?.name ?? ref.msg(M('msg.combat.theTeam'));
        notify(s, a, 'team', M('msg.combat.interceptAvoidedTitle'), M('msg.combat.interceptAvoidedBody', { team: tname, country, casualty }), 'good', r.countryId);
      } else if (team) {
        team.spoils = [];
        notify(s, a, 'team', M('msg.combat.interceptSeizedTitle'), M('msg.combat.interceptSeizedBody', { country, team: team.name, casualty }), 'bad', r.countryId);
      }
      break;
    }
    case 'rescue': {
      if (ok) {
        a.director.status = 'free';
        a.director.heldIn = undefined;
        a.director.price = undefined;
        a.director.releaseAt = undefined;
        notify(s, a, 'director', M('msg.combat.rescueWonTitle'), M('msg.combat.rescueWonBody', { country }), 'good', r.countryId);
      } else {
        notify(s, a, 'team', M('msg.combat.rescueLostTitle'), M('msg.combat.rescueLostBody', { country, casualty }), 'bad', r.countryId);
      }
      break;
    }
  }
  // Hired local security leaves once the fight is over.
  for (const st of a.stations) st.units = st.units.filter((u) => !u.temp);
  // Teams with nobody left are dissolved; a Cargueiro Destacado flies back to the Frota.
  for (const t of [...a.teams]) {
    if (t.units.length === 0 && t.spoils.length === 0) {
      if (t.freighter) a.fleet.push(t.freighter);
      a.teams = a.teams.filter((x) => x !== t);
      note(s, a, M('msg.combat.teamDissolved', { team: t.name }), 'bad');
    }
  }
  checkObjective(s);
}
