// Continuous clock (ADR 0001): advance in small steps, stop at the first Evento.
import { beginCombat } from './combatFlow';
import { COUNTRY_SEEDS, neighbors } from './data/countries';
import { ITEM_LIST, ITEMS } from './data/items';
import { BUYERS } from './data/names';
import { STATIONS, THREAT_BY_STATE, THREAT_COMBAT, THREAT_LABEL } from './data/rules';
import { buildForce } from './forces';
import type { Faction } from './forces';
import { driftPrices, interested, midPrice, recoverSaturation, rollStock } from './market';
import { checkMission } from './mission';
import { chance, pick, rand, randInt, randRange, weighted } from './rng';
import {
  allUnits,
  dayOf,
  DAYS_PER_MONTH,
  directorAt,
  intelCountries,
  log,
  postureIn,
  pushEvent,
  rollPolitics,
  seePrices,
  stationIn,
} from './state';
import type { CombatSetupData, ForceSource, GameState, Threat, ThreatKind } from './types';
import { healUnit, isPersonnel, upkeepOf } from './units';

/** Hours for Exposição to fall to ~37%. */
export const EXPOSURE_DECAY_H = 24 * 6;
const STEP_H = 0.5;

/** The clock is stopped while there are unseen Eventos, a combat, or the game is over. */
export const isBlocked = (s: GameState) => !!(s.over || s.events.length || s.pendingCombat || s.combat);

/** Advance the clock by up to `hours`; returns hours actually simulated (stops on Eventos). */
export function advance(s: GameState, hours: number): number {
  let done = 0;
  while (done < hours - 1e-9 && !isBlocked(s)) {
    const dt = Math.min(STEP_H, hours - done);
    tick(s, dt);
    done += dt;
  }
  return done;
}

function tick(s: GameState, dt: number) {
  s.time += dt;
  const decay = Math.exp(-dt / EXPOSURE_DECAY_H);
  for (const c of Object.values(s.countries)) {
    c.exposure *= decay;
    recoverSaturation(c, dt);
  }

  if (s.flight && s.time >= s.flight.arrive) arriveFleet(s);
  for (const t of s.teams) {
    if (t.travel && s.time >= t.travel.arrive) {
      t.location = t.travel.to;
      t.travel = undefined;
      pushEvent(s, 'team', `${t.name} chegou`, `A Equipe está em ${s.countries[t.location].name}, pronta para agir.`, 'info', t.location);
    }
  }
  if (s.director.status === 'detained' && s.director.releaseAt !== undefined && s.time >= s.director.releaseAt) {
    s.director.status = 'free';
    s.director.heldIn = undefined;
    s.director.price = undefined;
    s.director.releaseAt = undefined;
    pushEvent(s, 'director', 'Diretor solto', 'Sem provas suficientes, o Diretor foi liberado.', 'good', s.location);
  }
  for (const t of [...s.threats]) {
    if (s.time >= t.strikesAt && !isBlocked(s)) strike(s, t);
  }
  for (const k of s.contracts) {
    if (k.status === 'offered' && s.time >= k.offerExpires) k.status = 'expired';
    if (k.status === 'accepted' && s.time >= k.deadline) {
      k.status = 'failed';
      s.countries[k.countryId].reputation -= 8;
      log(s, `Contrato com ${k.buyer} (${s.countries[k.countryId].name}) venceu sem entrega. Reputação caiu.`, 'bad', k.countryId);
    }
  }
  s.contracts = s.contracts.filter((k) => k.status === 'offered' || k.status === 'accepted' || s.time - k.offeredAt < 24 * 20);

  if (s.group && !s.group.defeated && s.time >= s.group.nextMoveAt) moveGroup(s);

  const day = dayOf(s.time);
  while (s.lastDay < day) {
    s.lastDay += 1;
    daily(s);
    if (s.lastDay % DAYS_PER_MONTH === 0) monthly(s);
  }
  checkMission(s);
}

// ── Chegada da Frota ────────────────────────────────────────

function arriveFleet(s: GameState) {
  const f = s.flight!;
  s.location = f.to;
  s.flight = undefined;
  seePrices(s, f.to);
  const c = s.countries[f.to];
  const deliverable = s.contracts.filter((k) => k.status === 'accepted' && k.countryId === f.to);
  const extra = deliverable.length ? ` ${deliverable.length} Contrato(s) podem ser entregues aqui.` : '';
  pushEvent(s, 'arrival', `Chegada: ${c.name}`, `A Frota pousou. Mercado aberto ao Diretor.${extra}`, 'info', f.to);
  if (s.group && !s.group.defeated && s.group.countryId === f.to) groupEncounter(s);
}

// ── Grupo hostil (missões de caça e resgate) ────────────────

function groupEncounter(s: GameState) {
  const g = s.group!;
  const data: CombatSetupData = {
    type: 'army',
    reason: { kind: 'group', countryId: g.countryId, by: 'director' },
    title: g.hostage ? `Cativeiro de ${g.hostage}` : `Confronto com ${g.name}`,
    enemy: g.units,
    sources: [{ kind: 'escort' }],
    playerDefends: false,
    directorPresent: true,
  };
  beginCombat(s, data);
}

function moveGroup(s: GameState) {
  const g = s.group!;
  const pool = COUNTRY_SEEDS.filter((c) => g.region.includes(c.continent)).map((c) => c.id);
  const near = neighbors(g.countryId, 6).filter((id) => pool.includes(id));
  g.countryId = near.length ? pick(s, near) : pick(s, pool);
  g.nextMoveAt = s.time + randRange(s, 72, 150);
  if (intelCountries(s).has(g.countryId)) {
    g.seenAt = { countryId: g.countryId, at: s.time };
    pushEvent(s, 'intel', `${g.name} avistado`, `Uma Estação identificou o grupo em ${s.countries[g.countryId].name}.`, 'intel', g.countryId);
  }
  if (directorAt(s, g.countryId) && !isBlocked(s)) groupEncounter(s);
}

// ── Diário ──────────────────────────────────────────────────

function daily(s: GameState) {
  const day = s.lastDay;
  let income = 0;
  for (const st of s.stations) {
    const c = s.countries[st.countryId];
    if (st.interdicted) continue;
    const posture = postureIn(s, st.countryId);
    income += STATIONS[st.level].income * (0.6 + c.level * 0.15) * (posture === 'ally' ? 1.25 : posture === 'enemy' ? 0.7 : 1);
    c.exposure = Math.min(100, c.exposure + 0.4 * st.level);
  }
  s.cash += Math.round(income);

  for (const c of Object.values(s.countries)) {
    driftPrices(s, c);
    c.reputation += -c.reputation * 0.008; // slow drift back to neutral
    if (chance(s, 0.003)) {
      const before = c.politics;
      c.politics = c.couped && chance(s, 0.5) ? 'peace' : rollPolitics(s, c.level);
      if (c.politics !== before) {
        c.couped = false;
        log(s, `${c.name}: o cenário político mudou.`, 'intel', c.id);
      }
    }
    if (day % 7 === (Number(c.id) % 7)) c.stock = rollStock(s, c);
  }
  intelCountries(s).forEach((id) => seePrices(s, id));
  for (const u of allUnits(s)) healUnit(u);

  if (s.group && !s.group.defeated && intelCountries(s).has(s.group.countryId)) {
    s.group.seenAt = { countryId: s.group.countryId, at: s.time };
  }

  rollContracts(s);
  rollThreats(s);
}

// ── Manutenção mensal ───────────────────────────────────────

export function upkeepTotal(s: GameState): number {
  return allUnits(s).reduce((a, u) => a + upkeepOf(u), 0);
}

function monthly(s: GameState) {
  const total = upkeepTotal(s) + s.arrears;
  if (total <= 0) return;
  if (s.cash >= total) {
    s.cash -= total;
    s.arrears = 0;
    for (const u of allUnits(s)) u.idle = false;
    log(s, `Manutenção mensal paga: US$ ${total.toLocaleString('pt-BR')}.`, 'info');
    return;
  }
  // Não pagou: o Pessoal deserta (metade, ao acaso) e as máquinas ficam paradas.
  let deserted = 0;
  const leave = (list: typeof s.escort) =>
    list.filter((u) => {
      if (isPersonnel(u) && chance(s, 0.5)) {
        deserted++;
        return false;
      }
      return true;
    });
  s.escort = leave(s.escort);
  for (const st of s.stations) st.units = leave(st.units);
  for (const t of s.teams) t.units = leave(t.units);
  let machines = 0;
  for (const u of allUnits(s)) {
    if (!isPersonnel(u)) {
      u.idle = true;
      machines += upkeepOf(u);
    }
  }
  s.arrears = machines;
  pushEvent(
    s,
    'maintenance',
    'Manutenção não paga',
    `Faltou caixa para US$ ${total.toLocaleString('pt-BR')}. ${deserted} do Pessoal desertaram; as máquinas estão paradas até quitar US$ ${machines.toLocaleString('pt-BR')}.`,
    'bad',
  );
}

// ── Contratos ───────────────────────────────────────────────

function rollContracts(s: GameState) {
  const open = s.contracts.filter((k) => k.status === 'offered').length;
  if (open >= 4 || !chance(s, 0.45)) return;
  const pool = Object.values(s.countries).filter((c) => c.level >= 2 && postureIn(s, c.id) !== 'enemy');
  if (!pool.length) return;
  const c = pick(s, pool);
  const items = ITEM_LIST.filter((it) => it.tradable && it.cls !== 'special' && it.cls !== 'cargo' && interested(c, it) && it.rank <= c.level - 1);
  if (!items.length) return;
  const it = pick(s, items);
  const budget = randRange(s, 0.5, 3.5) * 1_000_000 * (0.6 + c.level * 0.2);
  const qty = Math.max(1, Math.min(25, Math.round(budget / it.price)));
  const premium = randRange(s, 1.25, 1.6);
  s.uidCounter += 1;
  s.contracts.push({
    id: `k${s.uidCounter}`,
    countryId: c.id,
    buyer: pick(s, BUYERS),
    itemId: it.id,
    qty,
    reward: Math.round(midPrice(c, it.id) * qty * premium),
    offeredAt: s.time,
    offerExpires: s.time + randInt(s, 3, 6) * 24,
    deadline: s.time + randInt(s, 14, 32) * 24,
    status: 'offered',
    reputation: randInt(s, 5, 12),
  });
  log(s, `Contrato oferecido em ${c.name}: ${qty}× ${ITEMS[it.id].name}.`, 'intel', c.id);
}

// ── Ameaças ─────────────────────────────────────────────────

const DIFF_THREAT = [1, 0.65, 1, 1.4];

const FACTION_OF: Record<ThreatKind, Faction> = { raid: 'police', lawsuit: 'court', criminal: 'criminal', military: 'military' };

function rollThreats(s: GameState) {
  const present = new Set<string>(s.stations.map((st) => st.countryId));
  if (s.director.status === 'free' && !s.flight) present.add(s.location);
  for (const id of present) {
    if (s.threats.some((t) => t.countryId === id)) continue;
    const c = s.countries[id];
    const posture = postureIn(s, id);
    const pf = posture === 'enemy' ? 1.8 : posture === 'ally' ? 0.45 : 1;
    const p = Math.min(0.45, (0.008 + (c.exposure / 100) * 0.22) * pf * DIFF_THREAT[s.options.difficulty]);
    if (!chance(s, p)) continue;

    const gov = posture === 'enemy' ? 2 : posture === 'neutral' ? 1 : 0.3;
    const orderly = ['peace', 'sanctions', 'coldwar'].includes(c.politics) ? 1.2 : 0.7;
    const chaos = ['disorder', 'civilwar'].includes(c.politics) ? 2 : 0.6;
    const warlike = posture === 'enemy' && ['war', 'civilwar', 'coldwar'].includes(c.politics) ? 1.4 : posture === 'enemy' ? 0.3 : 0.05;
    const kind = weighted<ThreatKind>(s, [
      ['raid', gov * orderly],
      ['lawsuit', gov * (c.level / 3)],
      ['criminal', chaos * (1 + c.exposure / 50)],
      ['military', warlike],
    ]);
    const hasStation = !!stationIn(s, id);
    const target = hasStation ? 'station' : 'director';
    const kindMult = kind === 'military' ? 1.6 : kind === 'raid' ? 1.1 : kind === 'criminal' ? 0.9 : 1;
    const strength = Math.round(
      (4 + c.level * 2.5 + c.exposure / 8) * kindMult * (0.75 + s.options.difficulty * 0.25) * randRange(s, 0.8, 1.2),
    );
    const lead = s.options.difficulty === 3 ? randInt(s, 18, 48) : randInt(s, 24, 72);
    s.uidCounter += 1;
    const threat: Threat = {
      id: `t${s.uidCounter}`,
      kind,
      countryId: id,
      target,
      announcedAt: s.time,
      strikesAt: s.time + lead,
      strength,
      reactions: [],
    };
    s.threats.push(threat);
    pushEvent(
      s,
      'threat',
      `${THREAT_LABEL[kind]} anunciado`,
      `${c.name}: ${target === 'station' ? 'a Estação' : 'o Diretor'} será alvo em cerca de ${Math.round(lead)} h (força estimada ${strength}).`,
      'warn',
      id,
    );
  }
}

/** Reforço contratado vira Unidades temporárias de segurança local. */
function hiredUnits(s: GameState, t: Threat) {
  if (!t.hired) return [];
  return buildForce(s, 'security', t.hired, THREAT_COMBAT[t.kind]);
}

function strike(s: GameState, t: Threat) {
  s.threats = s.threats.filter((x) => x !== t);
  const c = s.countries[t.countryId];
  if (t.cancelled) {
    log(s, `${THREAT_LABEL[t.kind]} em ${c.name} não aconteceu: o acordo foi cumprido.`, 'good', t.countryId);
    return;
  }
  const st = stationIn(s, t.countryId);
  if (t.target === 'station' && !st) {
    log(s, `${THREAT_LABEL[t.kind]} em ${c.name} chegou a um endereço vazio.`, 'info', t.countryId);
    return;
  }
  const directorHere = directorAt(s, t.countryId);
  if (t.target === 'director' && !directorHere) {
    log(s, `${THREAT_LABEL[t.kind]} em ${c.name} não encontrou o Diretor.`, 'good', t.countryId);
    return;
  }
  const type = THREAT_COMBAT[t.kind];
  const sources: ForceSource[] = [];
  if (st) sources.push({ kind: 'station', countryId: t.countryId });
  if (directorHere) sources.push({ kind: 'escort' });
  const enemy = buildForce(s, FACTION_OF[t.kind], t.strength, type);
  const temp = hiredUnits(s, t);
  if (temp.length && st) {
    st.units.push(...temp.map((u) => ({ ...u, paid: 0 })));
    log(s, `Segurança local contratada reforça a Estação em ${c.name}.`, 'info', t.countryId);
  }
  const data: CombatSetupData = {
    type,
    reason: { kind: 'threat', threatId: t.id, threatKind: t.kind, countryId: t.countryId, target: t.target },
    title: `${THREAT_LABEL[t.kind]} em ${c.name}`,
    enemy,
    sources,
    playerDefends: true,
    fort: st ? STATIONS[st.level].fort[type] : undefined,
    directorPresent: directorHere,
  };
  beginCombat(s, data);
  // Hired security leaves after the fight.
  if (temp.length) {
    const ids = new Set(temp.map((u) => u.uid));
    const st2 = stationIn(s, t.countryId);
    if (st2) st2.units = st2.units.filter((u) => !ids.has(u.uid));
  }
  if (THREAT_BY_STATE[t.kind]) c.exposure = Math.max(0, c.exposure - 10);
}

/** For tests and debugging: random jitter source that never touches game logic. */
export const _debugRand = (s: GameState) => rand(s);
