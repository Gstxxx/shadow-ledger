// Continuous clock (ADR 0001): advance in small steps, stop at the first Evento.
import { beginCombat } from './combatFlow';
import { COUNTRY_SEEDS, neighbors } from './data/countries';
import { ITEM_LIST, ITEMS } from './data/items';
import { BUYERS } from './data/names';
import { STATIONS, THREAT_BY_STATE, THREAT_COMBAT, THREAT_LABEL } from './data/rules';
import { TRAITS } from './data/traits';
import { buildForce } from './forces';
import type { Faction } from './forces';
import { driftPrices, interested, midPrice, recoverSaturation, rollStock } from './market';
import { checkObjective } from './objective';
import { chance, pick, randInt, randRange, weighted } from './rng';
import {
  addReputation,
  addTension,
  allUnits,
  dayOf,
  DAYS_PER_MONTH,
  directorAt,
  intelCountries,
  log,
  note,
  notify,
  player,
  postureIn,
  rollPolitics,
  seePrices,
  standing,
  stationIn,
} from './state';
import type { Agency, CombatSetupData, ForceSource, GameState, Threat, ThreatKind } from './types';
import { healUnit, isPersonnel, recoverDay, upkeepOf } from './units';

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
  for (const c of Object.values(s.countries)) recoverSaturation(c, dt);
  for (const a of s.agencies) tickAgency(s, a, dt);

  for (const k of s.contracts) {
    if (k.status === 'offered' && s.time >= k.offerExpires) k.status = 'expired';
    if (k.status === 'accepted' && s.time >= k.deadline) {
      k.status = 'failed';
      const a = s.agencies.find((x) => x.id === k.agencyId);
      if (a) {
        addReputation(a, k.countryId, -8);
        note(s, a, `Contrato com ${k.buyer} (${s.countries[k.countryId].name}) venceu sem entrega. Reputação caiu.`, 'bad', k.countryId);
      }
    }
  }
  s.contracts = s.contracts.filter((k) => k.status === 'offered' || k.status === 'accepted' || s.time - k.offeredAt < 24 * 20);

  if (s.group && !s.group.defeated && s.time >= s.group.nextMoveAt) moveGroup(s);

  const day = dayOf(s.time);
  while (s.lastDay < day) {
    s.lastDay += 1;
    dailyWorld(s);
    for (const a of s.agencies) dailyAgency(s, a);
    if (s.lastDay % DAYS_PER_MONTH === 0) for (const a of s.agencies) monthly(s, a);
  }
  checkObjective(s);
}

function tickAgency(s: GameState, a: Agency, dt: number) {
  const decay = Math.exp(-dt / EXPOSURE_DECAY_H);
  for (const st of Object.values(a.standing)) st.exposure *= decay;

  if (a.flight && s.time >= a.flight.arrive) arriveFleet(s, a);
  for (const t of a.teams) {
    if (t.travel && s.time >= t.travel.arrive) {
      t.location = t.travel.to;
      t.travel = undefined;
      notify(s, a, 'team', `${t.name} chegou`, `A Equipe está em ${s.countries[t.location].name}, pronta para agir.`, 'info', t.location);
    }
  }
  const d = a.director;
  if (d.status === 'detained' && d.releaseAt !== undefined && s.time >= d.releaseAt) {
    d.status = 'free';
    d.heldIn = undefined;
    d.price = undefined;
    d.releaseAt = undefined;
    notify(s, a, 'director', 'Diretor solto', 'Sem provas suficientes, o Diretor foi liberado.', 'good', a.location);
  }
  for (const t of [...a.threats]) {
    if (s.time >= t.strikesAt && !isBlocked(s)) strike(s, a, t);
  }
}

// ── Chegada da Frota ────────────────────────────────────────

function arriveFleet(s: GameState, a: Agency) {
  const f = a.flight!;
  a.location = f.to;
  a.flight = undefined;
  seePrices(s, a, f.to);
  const c = s.countries[f.to];
  const deliverable = s.contracts.filter((k) => k.status === 'accepted' && k.agencyId === a.id && k.countryId === f.to);
  const extra = deliverable.length ? ` ${deliverable.length} Contrato(s) podem ser entregues aqui.` : '';
  notify(s, a, 'arrival', `Chegada: ${c.name}`, `A Frota pousou. Mercado aberto ao Diretor.${extra}`, 'info', f.to);
  if (a.isPlayer && s.group && !s.group.defeated && s.group.countryId === f.to) groupEncounter(s, a);
}

// ── Grupo hostil (Objetivos de caça e resgate) ──────────────

function groupEncounter(s: GameState, a: Agency) {
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
  beginCombat(s, a, data);
}

function moveGroup(s: GameState) {
  const g = s.group!;
  const pool = COUNTRY_SEEDS.filter((c) => g.region.includes(c.continent)).map((c) => c.id);
  const near = neighbors(g.countryId, 6).filter((id) => pool.includes(id));
  g.countryId = near.length ? pick(s, near) : pick(s, pool);
  g.nextMoveAt = s.time + randRange(s, 72, 150);
  const me = player(s);
  if (intelCountries(me).has(g.countryId)) {
    g.seenAt = { countryId: g.countryId, at: s.time };
    notify(s, me, 'intel', `${g.name} avistado`, `Uma Estação identificou o grupo em ${s.countries[g.countryId].name}.`, 'intel', g.countryId);
  }
  if (directorAt(me, g.countryId) && !isBlocked(s)) groupEncounter(s, me);
}

// ── Diário ──────────────────────────────────────────────────

function dailyWorld(s: GameState) {
  const day = s.lastDay;
  for (const c of Object.values(s.countries)) {
    driftPrices(s, c);
    if (chance(s, 0.003)) {
      const before = c.politics;
      c.politics = c.couped && chance(s, 0.5) ? 'peace' : rollPolitics(s, c.level);
      if (c.politics !== before) {
        c.couped = false;
        if (c.politics === 'war' || c.politics === 'civilwar') addTension(s, 4);
        log(s, `${c.name}: o cenário político mudou.`, 'intel', c.id);
      }
    }
    if (day % 7 === Number(c.id) % 7) c.stock = rollStock(s, c, s.tension);
  }
  addTension(s, -0.12);
  const me = player(s);
  if (s.group && !s.group.defeated && intelCountries(me).has(s.group.countryId)) {
    s.group.seenAt = { countryId: s.group.countryId, at: s.time };
  }
  rollContracts(s);
}

function dailyAgency(s: GameState, a: Agency) {
  let income = 0;
  for (const st of a.stations) {
    const c = s.countries[st.countryId];
    if (st.interdicted) continue;
    const posture = postureIn(a, st.countryId);
    income += STATIONS[st.level].income * (0.6 + c.level * 0.15) * (posture === 'ally' ? 1.25 : posture === 'enemy' ? 0.7 : 1);
    standing(a, st.countryId).exposure = Math.min(100, standing(a, st.countryId).exposure + 0.4 * st.level);
  }
  a.cash += Math.round(income);
  for (const st of Object.values(a.standing)) st.reputation += -st.reputation * 0.008; // slow drift back to neutral
  intelCountries(a).forEach((id) => seePrices(s, a, id));

  for (const u of [...a.fleet, ...a.escort, ...a.teams.flatMap((t) => t.units)]) {
    healUnit(u);
    recoverDay(u, false);
  }
  for (const st of a.stations) {
    for (const u of st.units) {
      healUnit(u);
      recoverDay(u, true);
    }
  }
  rollThreats(s, a);
}

// ── Manutenção mensal ───────────────────────────────────────

export function upkeepTotal(a: Agency): number {
  return allUnits(a).reduce((x, u) => x + upkeepOf(u), 0);
}

function monthly(s: GameState, a: Agency) {
  const total = upkeepTotal(a) + a.arrears;
  if (total <= 0) return;
  if (a.cash >= total) {
    a.cash -= total;
    a.arrears = 0;
    for (const u of allUnits(a)) u.idle = false;
    note(s, a, `Manutenção mensal paga: US$ ${total.toLocaleString('pt-BR')}.`, 'info');
    return;
  }
  // Não pagou: o Pessoal deserta (metade, ao acaso; os Leais ficam) e as máquinas ficam paradas.
  let deserted = 0;
  const leave = (list: typeof a.escort) =>
    list.filter((u) => {
      if (isPersonnel(u) && !u.traits.some((t) => TRAITS[t].loyal) && chance(s, 0.5)) {
        deserted++;
        return false;
      }
      return true;
    });
  a.escort = leave(a.escort);
  for (const st of a.stations) st.units = leave(st.units);
  for (const t of a.teams) t.units = leave(t.units);
  let machines = 0;
  for (const u of allUnits(a)) {
    if (!isPersonnel(u)) {
      u.idle = true;
      machines += upkeepOf(u);
    }
  }
  a.arrears = machines;
  notify(
    s,
    a,
    'maintenance',
    'Manutenção não paga',
    `Faltou caixa para US$ ${total.toLocaleString('pt-BR')}. ${deserted} do Pessoal desertaram; as máquinas estão paradas até quitar US$ ${machines.toLocaleString('pt-BR')}.`,
    'bad',
  );
}

// ── Contratos (disputados por todas as agências) ────────────

function rollContracts(s: GameState) {
  const open = s.contracts.filter((k) => k.status === 'offered').length;
  if (open >= 4 || !chance(s, 0.45)) return;
  const pool = Object.values(s.countries).filter((c) => c.level >= 2);
  const c = pick(s, pool);
  const items = ITEM_LIST.filter(
    (it) => it.tradable && !it.wmd && it.cls !== 'special' && it.cls !== 'cargo' && interested(c, it) && it.rank <= c.level - 1,
  );
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

function rollThreats(s: GameState, a: Agency) {
  const present = new Set<string>(a.stations.map((st) => st.countryId));
  if (a.director.status === 'free' && !a.flight) present.add(a.location);
  for (const id of present) {
    if (a.threats.some((t) => t.countryId === id)) continue;
    const c = s.countries[id];
    const exp = standing(a, id).exposure;
    const posture = postureIn(a, id);
    const pf = posture === 'enemy' ? 1.8 : posture === 'ally' ? 0.45 : 1;
    const p = Math.min(0.45, (0.008 + (exp / 100) * 0.22) * pf * DIFF_THREAT[s.options.difficulty]);
    if (!chance(s, p)) continue;

    const gov = posture === 'enemy' ? 2 : posture === 'neutral' ? 1 : 0.3;
    const orderly = ['peace', 'sanctions', 'coldwar'].includes(c.politics) ? 1.2 : 0.7;
    const chaos = ['disorder', 'civilwar'].includes(c.politics) ? 2 : 0.6;
    const warlike = posture === 'enemy' && ['war', 'civilwar', 'coldwar'].includes(c.politics) ? 1.4 : posture === 'enemy' ? 0.3 : 0.05;
    const kind = weighted<ThreatKind>(s, [
      ['raid', gov * orderly],
      ['lawsuit', gov * (c.level / 3)],
      ['criminal', chaos * (1 + exp / 50)],
      ['military', warlike],
    ]);
    const target = stationIn(a, id) ? 'station' : 'director';
    const kindMult = kind === 'military' ? 1.6 : kind === 'raid' ? 1.1 : kind === 'criminal' ? 0.9 : 1;
    const strength = Math.round(
      (4 + c.level * 2.5 + exp / 8) * kindMult * (0.75 + s.options.difficulty * 0.25) * randRange(s, 0.8, 1.2),
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
    a.threats.push(threat);
    notify(
      s,
      a,
      'threat',
      `${THREAT_LABEL[kind]} anunciado`,
      `${c.name}: ${target === 'station' ? 'a Estação' : 'o Diretor'} será alvo em cerca de ${Math.round(lead)} h (força estimada ${strength}).`,
      'warn',
      id,
    );
  }
}

function strike(s: GameState, a: Agency, t: Threat) {
  a.threats = a.threats.filter((x) => x !== t);
  const c = s.countries[t.countryId];
  if (t.cancelled) {
    note(s, a, `${THREAT_LABEL[t.kind]} em ${c.name} não aconteceu: o acordo foi cumprido.`, 'good', t.countryId);
    return;
  }
  const st = stationIn(a, t.countryId);
  if (t.target === 'station' && !st) {
    note(s, a, `${THREAT_LABEL[t.kind]} em ${c.name} chegou a um endereço vazio.`, 'info', t.countryId);
    return;
  }
  const directorHere = directorAt(a, t.countryId);
  if (t.target === 'director' && !directorHere) {
    note(s, a, `${THREAT_LABEL[t.kind]} em ${c.name} não encontrou o Diretor.`, 'good', t.countryId);
    return;
  }
  const type = THREAT_COMBAT[t.kind];
  const sources: ForceSource[] = [];
  if (st) sources.push({ kind: 'station', countryId: t.countryId });
  if (directorHere) sources.push({ kind: 'escort' });
  const enemy = buildForce(s, FACTION_OF[t.kind], t.strength, type);
  // Reforço contratado: segurança local temporária que luta pela Estação e vai embora depois.
  const temp = t.hired && st ? buildForce(s, 'security', t.hired, type).map((u) => ({ ...u, paid: 0, temp: true })) : [];
  if (temp.length && st) {
    st.units.push(...temp);
    note(s, a, `Segurança local contratada reforça a Estação em ${c.name}.`, 'info', t.countryId);
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
  beginCombat(s, a, data);
  if (THREAT_BY_STATE[t.kind]) standing(a, t.countryId).exposure = Math.max(0, standing(a, t.countryId).exposure - 10);
}
