// Agency actions (ADR 0002): every action takes the acting Agency, so Agências Rivais use the same rules.
// Each validates, mutates the state, and returns a short pt-BR reason when refused.
import { addCargo, addLot, cargoQty, lotId, lotQty, removeCargo, takeLot } from './cargo';
import { abortPending, beginCombat, liftInterdiction, negotiateCost } from './combatFlow';
import { ITEMS, usesCargo } from './data/items';
import { TEAM_NAMES } from './data/names';
import {
  COMMERCIAL_FARE_PER_1000KM,
  COMMERCIAL_SPEED,
  COMMERCIAL_BAGGAGE_T,
  FENCE_RATE,
  OPERATION_COMBAT,
  STATIONS,
  VAULT_CAPACITY,
} from './data/rules';
import { recordAggression } from './ai/memory';
import { recordWmdSale } from './tension';
import { isLocked } from './tutorial/locks';
import { originMods } from './data/origins';
import { buildForce } from './forces';
import { fleetSpeed, freeCargo, maxCargo, quoteBuyFor, quoteSellFor, rollRecruits, unitsWeight, usedCargo } from './market';
import { chance } from './rng';
import {
  addExposure,
  addReputation,
  addTension,
  agencyById,
  directorAt,
  M,
  note,
  notify,
  postureIn,
  ref,
  say,
  seePrices,
  standing,
  stationIn,
  travelKm,
} from './state';
import type {
  Agency,
  CargoLot,
  CombatSetupData,
  GameState,
  OperationKind,
  Station,
  StationLevel,
  Team,
  ThreatReaction,
  Unit,
} from './types';
import { titled } from './msg';
import type { Msg } from './msg';
import { def, isPersonnel, makeUnit, REPAIR_MIN_LEVEL, repairCost, restore, unitValue } from './units';

export type Result = { ok: true; msg?: string; m?: Msg } | { ok: false; msg: string; m?: Msg };
const ok = (msg?: string | Msg): Result =>
  msg === undefined || typeof msg === 'string' ? { ok: true, msg } : { ok: true, msg: say(msg), m: msg };
const no = (msg: string | Msg): Result => (typeof msg === 'string' ? { ok: false, msg } : { ok: false, msg: say(msg), m: msg });

function directorReady(s: GameState, a: Agency): Result | null {
  if (s.over) return no(M('msg.act.gameOver'));
  if (a.director.status === 'detained') return no(M('msg.act.directorDetained'));
  if (a.director.status === 'kidnapped') return no(M('msg.act.directorKidnapped'));
  if (a.director.status === 'dead') return no(M('msg.act.directorDead'));
  if (a.flight) return no(M('msg.act.fleetInFlight'));
  return null;
}

// ── Viagem da Frota ─────────────────────────────────────────

export const FLIGHT_GROUND_H = 1.5;

export function flightHours(a: Agency, to: string): number {
  const speed = fleetSpeed(a);
  if (!speed) return Infinity;
  return travelKm(a.location, to) / speed + FLIGHT_GROUND_H;
}

export function travel(s: GameState, a: Agency, to: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  if (to === a.location) return no(M('msg.act.fleetAlreadyHere'));
  if (!s.countries[to]) return no(M('msg.act.unknownDestination'));
  if (!maxCargo(a)) return no(M('msg.act.noFreighter'));
  if (usedCargo(a) > maxCargo(a) + 1e-6)
    return no(M('msg.act.fleetOverloaded'));
  const hours = flightHours(a, to);
  a.flight = { from: a.location, to, depart: s.time, arrive: s.time + hours };
  note(s, a, M('msg.act.fleetTakeoff', { from: ref.country(a.location), to: ref.country(to) }), 'info', to);
  return ok();
}

// ── Comércio (exclusivo do Diretor) ─────────────────────────

function tradeExposure(s: GameState, a: Agency, countryId: string, value: number, itemId: string) {
  const c = s.countries[countryId];
  const it = def(itemId);
  const k = it.wmd ? 3 : it.cls === 'special' ? 0.4 : ['arms', 'vehicle', 'jet', 'heli'].includes(it.cls) ? 1.2 : 0.8;
  addExposure(s, a, countryId, Math.min(25, (value / (c.level * 500_000)) * 2 * k));
  if (it.wmd) addTension(s, 2);
}

export function buy(s: GameState, a: Agency, itemId: string, qty: number): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const c = s.countries[a.location];
  if (!c.stock.includes(itemId)) return no(M('msg.act.marketNoItem'));
  if (qty <= 0) return no(M('msg.act.invalidQty'));
  const it = ITEMS[itemId];
  if (it.weight * qty > freeCargo(a) + 1e-6) return no(M('msg.act.noFleetSpace'));
  const q = quoteBuyFor(a, c, itemId, qty);
  if (q.total > a.cash) return no(M('msg.act.noCash'));
  a.cash -= q.total;
  c.saturation[itemId] = q.after;
  addCargo(a, itemId, qty, q.avg);
  tradeExposure(s, a, c.id, q.total, itemId);
  a.stats.trades++;
  seePrices(s, a, c.id);
  return ok(M('msg.act.bought', { qty, item: ref.item(itemId), total: ref.money(q.total) }));
}

export function sell(s: GameState, a: Agency, itemId: string, qty: number): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const c = s.countries[a.location];
  if (qty <= 0 || cargoQty(a, itemId) < qty) return no(M('msg.act.insufficientCargo'));
  const q = quoteSellFor(a, c, itemId, qty);
  if (q.total <= 0) return no(M('msg.act.countryNoBuy', { country: ref.country(c.id) }));
  removeCargo(a, itemId, qty);
  a.cash += q.total;
  c.saturation[itemId] = q.after;
  const it = ITEMS[itemId];
  if (it.wmd) recordWmdSale(s, a, itemId, qty, c.id);
  // Armamento pesado vendido a quem está em guerra empurra a Tensão Global.
  else if ((c.politics === 'war' || c.politics === 'civilwar') && ['vehicle', 'jet', 'heli', 'antiair', 'arms'].includes(it.cls))
    addTension(s, Math.min(1, 0.03 * qty));
  tradeExposure(s, a, c.id, q.total, itemId);
  a.stats.trades++;
  seePrices(s, a, c.id);
  return ok(M('msg.act.sold', { qty, item: ref.item(itemId), total: ref.money(q.total) }));
}

/** Alistar: turn one fieldable item from the Carga into an Unidade of the Escolta (or Frota). */
export function enlist(s: GameState, a: Agency, itemId: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const it = ITEMS[itemId];
  if (!it.fieldable) return no(M('msg.act.notFieldable'));
  const lot = a.cargo.find((l) => l.itemId === itemId);
  if (!lot) return no(M('msg.act.notInCargo'));
  removeCargo(a, itemId, 1);
  const u = makeUnit(s, itemId, lot.paidEach);
  u.record = { combats: 0, wins: 0, kos: 0, converts: 0, joinedAt: s.time };
  if (it.cls === 'cargo') a.fleet.push(u);
  else a.escort.push(u);
  return ok(M(it.cls === 'cargo' ? 'msg.act.enlistedFleet' : 'msg.act.enlistedEscort', { unit: u.name, item: ref.item(itemId) }));
}

export const recruitPrice = (countryId: string, itemId: string) =>
  Math.round(ITEMS[itemId].price * (ITEMS[itemId].origin?.includes(countryId) ? 0.85 : 1));

/** Contratar: Pessoal especializado e cargueiros que não são revendidos. */
export function recruit(s: GameState, a: Agency, itemId: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const c = s.countries[a.location];
  if (!rollRecruits(c).includes(itemId)) return no(M('msg.act.noRecruit'));
  const it = ITEMS[itemId];
  const price = recruitPrice(c.id, itemId);
  if (price > a.cash) return no(M('msg.act.noCash'));
  if (usesCargo(it) && it.weight > freeCargo(a) + 1e-6) return no(M('msg.act.noFleetSpace'));
  a.cash -= price;
  const u = makeUnit(s, itemId, price);
  u.record = { combats: 0, wins: 0, kos: 0, converts: 0, joinedAt: s.time };
  if (it.cls === 'cargo') a.fleet.push(u);
  else a.escort.push(u);
  return ok(M('msg.act.recruited', { unit: u.name, item: ref.item(itemId) }));
}

/** Dispensar uma Unidade da Escolta ou Frota, recuperando 60% do valor. */
export function dismiss(s: GameState, a: Agency, uid: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const inFleet = a.fleet.find((u) => u.uid === uid);
  const u = inFleet ?? a.escort.find((x) => x.uid === uid);
  if (!u) return no(M('msg.act.unitNotFound'));
  if (inFleet && a.fleet.length === 1) return no(M('msg.act.fleetNeedsFreighter'));
  const value = Math.round(unitValue(u) * 0.6);
  a.cash += value;
  if (inFleet) a.fleet = a.fleet.filter((x) => x !== u);
  else a.escort = a.escort.filter((x) => x !== u);
  return ok(M('msg.act.dismissed', { unit: u.name, value: ref.money(value) }));
}

// ── Estações ────────────────────────────────────────────────

export function stationCost(a: Agency, countryId: string, level: StationLevel): number {
  const p = postureIn(a, countryId);
  return Math.round(STATIONS[level].cost * (p === 'enemy' ? 1.5 : p === 'ally' ? 0.85 : 1) * (originMods(a).stationCostMult ?? 1));
}

export function openStation(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  if (stationIn(a, a.location)) return no(M('msg.act.stationExists'));
  const cost = stationCost(a, a.location, 1);
  if (a.cash < cost) return no(M('msg.act.noCash'));
  a.cash -= cost;
  a.stations.push({ countryId: a.location, level: 1, units: [], founded: s.time, vault: [], detained: [] });
  addExposure(s, a, a.location, 4);
  seePrices(s, a, a.location);
  return ok(M('msg.act.cellOpened', { country: ref.country(a.location) }));
}

export function upgradeStation(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st) return no(M('msg.act.noStationHere'));
  if (st.interdicted) return no(M('msg.act.stationSeized'));
  if (st.level >= 5) return no(M('msg.act.alreadyBase'));
  const next = (st.level + 1) as StationLevel;
  const cost = stationCost(a, a.location, next);
  if (a.cash < cost) return no(M('msg.act.noCash'));
  a.cash -= cost;
  st.level = next;
  return ok(M('msg.act.stationUpgraded', { level: ref.station(next) }));
}

/** Move an Unidade between the Escolta and the Estação where the Diretor is. */
export function transferUnit(s: GameState, a: Agency, uid: string, to: 'station' | 'escort'): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st) return no(M('msg.act.noStationHere'));
  if (st.interdicted) return no(M('msg.act.stationSeized'));
  if (to === 'station') {
    const u = a.escort.find((x) => x.uid === uid);
    if (!u) return no(M('msg.act.unitNotInEscort'));
    const spec = STATIONS[st.level];
    if (!spec.allows.includes(def(u.itemId).cls)) return no(M('msg.act.stationNoHouse', { station: ref.station(st.level), item: ref.item(u.itemId) }));
    if (st.units.length >= spec.capacity) return no(M('msg.act.stationFull', { station: ref.station(st.level) }));
    a.escort = a.escort.filter((x) => x !== u);
    st.units.push(u);
    return ok();
  }
  const u = st.units.find((x) => x.uid === uid);
  if (!u) return no(M('msg.act.unitNotInStation'));
  if (usesCargo(def(u.itemId)) && def(u.itemId).weight > freeCargo(a) + 1e-6) return no(M('msg.act.noFleetSpace'));
  st.units = st.units.filter((x) => x !== u);
  a.escort.push(u);
  return ok();
}

/** Conserto de uma máquina Danificada, numa Estação Escritório ou maior onde o Diretor está. */
export function repair(s: GameState, a: Agency, uid: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st || st.interdicted || st.level < REPAIR_MIN_LEVEL) return no(M('msg.act.repairNeedsOffice'));
  const u = [...a.fleet, ...a.escort, ...st.units].find((x) => x.uid === uid);
  if (!u || u.injury?.kind !== 'damaged') return no(M('msg.act.nothingToRepair'));
  const cost = repairCost(u);
  if (a.cash < cost) return no(M('msg.act.noCash'));
  a.cash -= cost;
  u.injury = undefined;
  restore(u);
  return ok(M('msg.act.repaired', { unit: u.name, cost: ref.money(cost) }));
}

export function payFine(s: GameState, a: Agency, countryId: string): Result {
  const st = stationIn(a, countryId);
  if (!st?.interdicted) return no(M('msg.act.notSeized'));
  if (a.cash < st.interdicted.fine) return no(M('msg.act.noCash'));
  a.cash -= st.interdicted.fine;
  liftInterdiction(a, countryId);
  note(s, a, M('msg.act.finePaid', { country: ref.country(countryId) }), 'good', countryId);
  return ok();
}

/** Recorrer: Combate Jurídico contra a Promotoria, com o Diretor presente. */
export function appeal(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st?.interdicted) return no(M('msg.act.nothingToAppeal'));
  const c = s.countries[a.location];
  const data: CombatSetupData = {
    type: 'legal',
    reason: { kind: 'appeal', countryId: c.id },
    ...titled(M('msg.title.appeal', { country: ref.country(c.id) })),
    enemy: buildForce(s, 'court', 4 + c.level * 2.5, 'legal'),
    sources: [{ kind: 'escort' }],
    playerDefends: false,
    // The Diretor argues in person (chooses the Tática); losing an appeal never leads to prison.
    directorPresent: true,
  };
  beginCombat(s, a, data);
  return ok();
}

// ── Cofre ───────────────────────────────────────────────────

export const vaultWeight = (st: Station) => st.vault.reduce((x, l) => x + def(l.itemId).weight * l.qty, 0);
export const vaultFree = (st: Station) => Math.max(0, VAULT_CAPACITY[st.level] - vaultWeight(st));

/** O Diretor deixa Carga no Cofre da Estação onde está. */
export function deposit(s: GameState, a: Agency, itemId: string, qty: number): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st || st.interdicted) return no(M('msg.act.noOperatingStation'));
  if (qty <= 0 || cargoQty(a, itemId) < qty) return no(M('msg.act.insufficientCargo'));
  if (def(itemId).weight * qty > vaultFree(st) + 1e-6) return no(M('msg.act.vaultFull'));
  const paid = takeLot(a.cargo, itemId, qty)!;
  addLot(st.vault, lotId, itemId, qty, paid);
  return ok();
}

/** Só o Diretor retira do Cofre. */
export function withdraw(s: GameState, a: Agency, itemId: string, qty: number): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st || st.interdicted) return no(M('msg.act.noOperatingStation'));
  if (qty <= 0 || lotQty(st.vault, itemId) < qty) return no(M('msg.act.vaultEmpty'));
  if (def(itemId).weight * qty > freeCargo(a) + 1e-6) return no(M('msg.act.noFleetSpace'));
  const paid = takeLot(st.vault, itemId, qty)!;
  addCargo(a, itemId, qty, paid);
  return ok();
}

// ── Itens capturados por Equipes: Receptador ou Cofre ───────

export const fenceValue = (lot: CargoLot) => Math.round(ITEMS[lot.itemId].price * FENCE_RATE) * lot.qty;

/** Receptador: compra na hora, com desconto forte. Não é Comércio. */
export function fenceSpoils(s: GameState, a: Agency, teamId: string, lid: string): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const t = a.teams.find((x) => x.id === teamId);
  const lot = t?.spoils.find((l) => l.lid === lid);
  if (!t || !lot) return no(M('msg.act.itemNotFound'));
  if (!lot.fresh) return no(M('msg.act.fenceFreshOnly'));
  const value = fenceValue(lot);
  a.cash += value;
  t.spoils = t.spoils.filter((l) => l !== lot);
  addExposure(s, a, t.location, 3);
  return ok(M('msg.act.fenced', { value: ref.money(value), item: ref.item(lot.itemId) }));
}

export const spoilsWeight = (t: Team) => t.spoils.reduce((x, l) => x + def(l.itemId).weight * l.qty, 0);

/** A Equipe entrega os itens capturados ao Diretor no mesmo país; viram Carga. */
export function handSpoils(s: GameState, a: Agency, teamId: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel || !t.spoils.length) return no(M('msg.act.nothingToHand'));
  if (t.location !== a.location) return no(M('msg.act.directorNotInCountry'));
  if (spoilsWeight(t) > freeCargo(a) + 1e-6) return no(M('msg.act.noFleetSpace'));
  for (const l of t.spoils) addCargo(a, l.itemId, l.qty, l.paidEach);
  t.spoils = [];
  return ok(M('msg.act.spoilsHanded'));
}

/** Leva os itens capturados ao Cofre da Estação do país onde a Equipe está. */
export function stashSpoils(_s: GameState, a: Agency, teamId: string): Result {
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no(M('msg.act.teamUnavailable'));
  if (!t.spoils.length) return no(M('msg.act.nothingToStash'));
  const st = stationIn(a, t.location);
  if (!st || st.interdicted) return no(M('msg.act.noOperatingStationCountry'));
  const w = t.spoils.reduce((x, l) => x + def(l.itemId).weight * l.qty, 0);
  if (w > vaultFree(st) + 1e-6) return no(M('msg.act.vaultFull'));
  for (const l of t.spoils) addLot(st.vault, lotId, l.itemId, l.qty, l.paidEach);
  t.spoils = [];
  return ok(M('msg.act.stashed', { country: ref.country(t.location) }));
}

// ── Reações a Ameaças ───────────────────────────────────────

export function reactionCost(s: GameState, a: Agency, threatId: string, reaction: ThreatReaction): number {
  const t = a.threats.find((x) => x.id === threatId);
  if (!t) return 0;
  const c = s.countries[t.countryId];
  const p = postureIn(a, t.countryId);
  switch (reaction) {
    case 'lawyers':
      return 60_000 * c.level;
    case 'bribe':
      return Math.round(
        40_000 *
          c.level *
          (1 + standing(a, t.countryId).exposure / 50) *
          (p === 'ally' ? 0.6 : p === 'enemy' ? 2 : 1) *
          (t.strength / 10),
      );
    case 'reinforce':
      return 50_000 * c.level;
    case 'evacuate':
      return 0;
  }
}

export function bribeChance(a: Agency, threatId: string): number {
  const t = a.threats.find((x) => x.id === threatId);
  if (!t) return 0;
  if (t.kind === 'criminal') return 0.7;
  if (t.kind === 'military') return 0.25;
  const p = postureIn(a, t.countryId);
  return p === 'ally' ? 0.85 : p === 'neutral' ? 0.6 : 0.3;
}

export function reactionAvailable(a: Agency, threatId: string, reaction: ThreatReaction): boolean {
  const t = a.threats.find((x) => x.id === threatId);
  if (!t || t.cancelled || t.reactions.includes(reaction)) return false;
  if (reaction === 'lawyers') return t.kind === 'lawsuit' || t.kind === 'raid';
  if (reaction === 'evacuate') return t.target === 'station' && (stationIn(a, t.countryId)?.units.length ?? 0) > 0;
  if (reaction === 'reinforce') return t.target === 'station';
  return true;
}

export function react(s: GameState, a: Agency, threatId: string, reaction: ThreatReaction): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const t = a.threats.find((x) => x.id === threatId);
  if (!t) return no(M('msg.act.threatNotFound'));
  if (!reactionAvailable(a, threatId, reaction)) return no(M('msg.act.reactionUnavailable'));
  const cost = reactionCost(s, a, threatId, reaction);
  if (a.cash < cost) return no(M('msg.act.noCash'));
  a.cash -= cost;
  t.reactions.push(reaction);
  switch (reaction) {
    case 'lawyers':
      t.strength = Math.max(1, Math.round(t.strength * 0.7));
      return ok(M('msg.act.reactLawyers', { strength: t.strength }));
    case 'bribe':
      if (chance(s, bribeChance(a, threatId))) {
        t.cancelled = true;
        return ok(M('msg.act.reactBribeOk'));
      }
      addExposure(s, a, t.countryId, 12);
      t.strength = Math.round(t.strength * 1.1);
      return ok(M('msg.act.reactBribeFail'));
    case 'reinforce':
      t.hired = (t.hired ?? 0) + 4 + s.countries[t.countryId].level * 2;
      return ok(M('msg.act.reactReinforce', { strength: t.hired }));
    case 'evacuate': {
      const st = stationIn(a, t.countryId)!;
      const team = createTeam(s, a, t.countryId, st.units);
      st.units = [];
      return ok(M('msg.act.reactEvacuate', { team: team.name }));
    }
  }
}

// ── Contratos ───────────────────────────────────────────────

export function acceptContract(s: GameState, a: Agency, id: string): Result {
  const k = s.contracts.find((x) => x.id === id);
  if (!k || k.status !== 'offered') return no(M('msg.act.offerUnavailable'));
  if (postureIn(a, k.countryId) === 'enemy') return no(M('msg.act.buyerRefuses'));
  if (s.contracts.filter((x) => x.status === 'accepted' && x.agencyId === a.id).length >= 3) return no(M('msg.act.maxContracts'));
  k.status = 'accepted';
  k.agencyId = a.id;
  return ok();
}

export function deliverContract(s: GameState, a: Agency, id: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const k = s.contracts.find((x) => x.id === id);
  if (!k || k.status !== 'accepted' || k.agencyId !== a.id) return no(M('msg.act.contractNotActive'));
  if (k.countryId !== a.location) return no(M('msg.act.deliveryElsewhere'));
  if (cargoQty(a, k.itemId) < k.qty) return no(M('msg.act.cargoShortDelivery'));
  removeCargo(a, k.itemId, k.qty);
  a.cash += k.reward;
  k.status = 'done';
  addReputation(a, k.countryId, k.reputation);
  addExposure(s, a, k.countryId, 4);
  a.stats.contractsDone++;
  note(s, a, M('msg.act.contractDeliveredNote', { buyer: k.buyer, reward: ref.money(k.reward) }), 'good', k.countryId);
  return ok(M('msg.act.contractDelivered', { reward: ref.money(k.reward) }));
}

// ── Operações Especiais e Golpe ─────────────────────────────

export const BANK_COOLDOWN_H = 24 * 30;

export function operationStrength(s: GameState, a: Agency, countryId: string, op: OperationKind | 'coup'): number {
  const c = s.countries[countryId];
  const diff = 0.8 + s.options.difficulty * 0.2;
  const base =
    op === 'bank' ? 5 + c.level * 4 : op === 'tech' ? 6 + c.level * 5 : op === 'neutralize' ? 8 + c.level * 5 : 12 + c.level * 8;
  const p = postureIn(a, countryId);
  return Math.round(base * diff * (p === 'enemy' ? 1.2 : p === 'ally' ? 0.9 : 1));
}

export function operationBlockedMsg(s: GameState, countryId: string, op: OperationKind): Msg | null {
  const c = s.countries[countryId];
  if (op === 'bank' && c.bankRobbedAt !== undefined && s.time - c.bankRobbedAt < BANK_COOLDOWN_H) return M('msg.act.bankAlert');
  return null;
}

/** Texto pt do bloqueio (compatível); `operationBlockedMsg` devolve a Msg. */
export function operationBlocked(s: GameState, countryId: string, op: OperationKind): string | null {
  const m = operationBlockedMsg(s, countryId, op);
  return m ? say(m) : null;
}

function opSetup(s: GameState, a: Agency, countryId: string, op: OperationKind, by: 'director' | Team): CombatSetupData {
  const c = s.countries[countryId];
  const type = OPERATION_COMBAT[op];
  return {
    type,
    reason: { kind: 'operation', op, countryId, by: by === 'director' ? 'director' : by.id },
    ...titled(M('msg.title.operation', { op: ref.op(op), country: ref.country(c.id) })),
    enemy: buildForce(s, op === 'neutralize' ? 'military' : 'security', operationStrength(s, a, countryId, op), type),
    sources: by === 'director' ? [{ kind: 'escort' }] : [{ kind: 'team', teamId: by.id }],
    playerDefends: false,
    directorPresent: by === 'director',
  };
}

export function startOperation(s: GameState, a: Agency, op: OperationKind): Result {
  const r = directorReady(s, a);
  if (r) return r;
  if (isLocked(s, 'operations')) return no(M('msg.act.locked'));
  const blocked = operationBlockedMsg(s, a.location, op);
  if (blocked) return no(blocked);
  if (!a.escort.length) return no(M('msg.act.escortEmpty'));
  beginCombat(s, a, opSetup(s, a, a.location, op, 'director'));
  return ok();
}

/** Golpe: só com o Diretor presente. */
export function startCoup(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  if (isLocked(s, 'operations')) return no(M('msg.act.locked'));
  if (!a.escort.length) return no(M('msg.act.escortEmpty'));
  const c = s.countries[a.location];
  if (c.couped) return no(M('msg.act.alreadyCouped'));
  beginCombat(s, a, {
    type: 'army',
    reason: { kind: 'coup', countryId: c.id },
    ...titled(M('msg.title.coup', { country: ref.country(c.id) })),
    enemy: buildForce(s, 'military', operationStrength(s, a, c.id, 'coup'), 'army'),
    sources: [{ kind: 'escort' }],
    playerDefends: false,
    directorPresent: true,
  });
  return ok();
}

export const cancelPending = (s: GameState): Result => (abortPending(s) ? ok() : no(M('msg.act.cannotAvoid')));

export { negotiateCost };

// ── Diretor ─────────────────────────────────────────────────

export function payRelease(s: GameState, a: Agency): Result {
  const d = a.director;
  if (d.status !== 'detained' && d.status !== 'kidnapped') return no(M('msg.act.directorFree'));
  const price = d.price ?? 0;
  if (a.cash < price) return no(M('msg.act.noCash'));
  a.cash -= price;
  const was = d.status;
  d.status = 'free';
  d.heldIn = undefined;
  d.price = undefined;
  d.releaseAt = undefined;
  notify(
    s,
    a,
    'director',
    M('msg.act.releasedTitle'),
    M(was === 'detained' ? 'msg.act.releasedBail' : 'msg.act.releasedRansom', { price: ref.money(price) }),
    'good',
    a.location,
  );
  return ok();
}

export function payArrears(s: GameState, a: Agency): Result {
  if (!a.arrears) return no(M('msg.act.nothingOwed'));
  if (a.cash < a.arrears) return no(M('msg.act.noCash'));
  a.cash -= a.arrears;
  note(s, a, M('msg.act.arrearsPaid', { amount: ref.money(a.arrears) }), 'good');
  a.arrears = 0;
  for (const u of [...a.fleet, ...a.escort, ...a.stations.flatMap((x) => x.units), ...a.teams.flatMap((t) => t.units)]) u.idle = false;
  for (const t of a.teams) if (t.freighter) t.freighter.idle = false;
  return ok();
}

// ── Equipes ─────────────────────────────────────────────────

function createTeam(s: GameState, a: Agency, location: string, units: Unit[]): Team {
  s.uidCounter += 1;
  const used = new Set(a.teams.map((t) => t.name));
  const teamName = (base: string | { listed: 'team'; index: number }) => say(M('msg.act.teamName', { base }));
  const index = TEAM_NAMES.findIndex((_, i) => !used.has(teamName({ listed: 'team', index: i })));
  const name = teamName(index >= 0 ? { listed: 'team', index } : `${s.uidCounter}`);
  const team: Team = { id: `tm${s.uidCounter}`, name, units: [...units], location, spoils: [] };
  a.teams.push(team);
  return team;
}

/** Destacar Unidades da Escolta (Diretor presente) ou de uma Estação numa Equipe. */
export function formTeam(s: GameState, a: Agency, from: 'escort' | { stationCountry: string }, uids: string[]): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  if (isLocked(s, 'teams')) return no(M('msg.act.locked'));
  if (!uids.length) return no(M('msg.act.pickOneUnit'));
  if (from === 'escort') {
    const r = directorReady(s, a);
    if (r) return r;
    const units = a.escort.filter((u) => uids.includes(u.uid));
    if (units.length !== uids.length) return no(M('msg.act.unitOutsideEscort'));
    a.escort = a.escort.filter((u) => !uids.includes(u.uid));
    const t = createTeam(s, a, a.location, units);
    return ok(M('msg.act.teamFormed', { team: t.name, n: units.length }));
  }
  const st = stationIn(a, from.stationCountry);
  if (!st || st.interdicted) return no(M('msg.act.stationUnavailable'));
  const units = st.units.filter((u) => uids.includes(u.uid));
  if (units.length !== uids.length) return no(M('msg.act.unitOutsideStation'));
  st.units = st.units.filter((u) => !uids.includes(u.uid));
  const t = createTeam(s, a, st.countryId, units);
  return ok(M('msg.act.teamFormed', { team: t.name, n: units.length }));
}

export function commercialFare(team: Team, to: string): number {
  return Math.round((travelKm(team.location, to) / 1000) * COMMERCIAL_FARE_PER_1000KM * team.units.length);
}

/** Smallest active freighter of the Frota that can carry the team and what it captured. */
function pickFreighter(a: Agency, team: Team): Unit | undefined {
  const need = unitsWeight(team.units) + spoilsWeight(team);
  return a.fleet
    .filter((u) => !u.idle && def(u.itemId).weight >= need)
    .sort((x, y) => def(x.itemId).weight - def(y.itemId).weight)[0];
}

export function teamFlightHours(a: Agency, team: Team, to: string, mode: 'commercial' | 'freighter'): number {
  const km = travelKm(team.location, to);
  if (mode === 'commercial') return km / COMMERCIAL_SPEED + 4;
  const f = team.freighter ?? pickFreighter(a, team);
  return km / (def(f?.itemId ?? 'cargo0').speed ?? 500) + 1.5;
}

export function sendTeam(s: GameState, a: Agency, teamId: string, to: string, mode: 'commercial' | 'freighter'): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const t = a.teams.find((x) => x.id === teamId);
  if (!t) return no(M('msg.act.teamNotFound'));
  if (t.travel) return no(M('msg.act.teamInTransit'));
  if (t.location === to) return no(M('msg.act.teamAlreadyThere'));
  if (!t.units.length) return no(M('msg.act.teamEmpty'));
  if (mode === 'commercial') {
    if (!t.units.every(isPersonnel)) return no(M('msg.act.commercialPersonnelOnly'));
    if (spoilsWeight(t) > COMMERCIAL_BAGGAGE_T + 1e-6)
      return no(M('msg.act.commercialBaggage', { t: ref.num(COMMERCIAL_BAGGAGE_T) }));
    const fare = commercialFare(t, to);
    if (a.cash < fare) return no(M('msg.act.fareShort'));
    a.cash -= fare;
  } else if (!t.freighter) {
    if (a.flight || t.location !== a.location) return no(M('msg.act.detachOnlyLanded'));
    const f = pickFreighter(a, t);
    if (!f) return no(M('msg.act.noFreeFreighter'));
    if (a.fleet.length <= 1) return no(M('msg.act.keepOneFreighter'));
    a.fleet = a.fleet.filter((u) => u !== f);
    t.freighter = f;
    note(s, a, M('msg.act.freighterDetached', { freighter: f.name, team: t.name }), 'info');
  }
  if (t.freighter && unitsWeight(t.units) + spoilsWeight(t) > def(t.freighter.itemId).weight + 1e-6)
    return no(M('msg.act.freighterCapacity'));
  const hours = teamFlightHours(a, t, to, mode);
  t.travel = { from: t.location, to, depart: s.time, arrive: s.time + hours, mode };
  // Depois de sair do lugar, o Receptador já não aceita.
  for (const l of t.spoils) l.fresh = false;
  return ok(M('msg.act.teamEnRoute', { team: t.name, country: ref.country(to) }));
}

export function teamOperation(s: GameState, a: Agency, teamId: string, op: OperationKind): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  if (isLocked(s, 'operations')) return no(M('msg.act.locked'));
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no(M('msg.act.teamUnavailable'));
  const blocked = operationBlockedMsg(s, t.location, op);
  if (blocked) return no(blocked);
  beginCombat(s, a, opSetup(s, a, t.location, op, t));
  return ok();
}

/** Equipe ataca o grupo hostil (caça/resgate) no país onde está. */
export function teamAttackGroup(s: GameState, a: Agency, teamId: string): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const t = a.teams.find((x) => x.id === teamId);
  const g = s.group;
  if (!t || t.travel) return no(M('msg.act.teamUnavailable'));
  if (!g || g.defeated || g.countryId !== t.location) return no(M('msg.act.groupNotHere'));
  beginCombat(s, a, {
    type: 'army',
    reason: { kind: 'group', countryId: t.location, by: t.id },
    ...titled(M('msg.title.teamVsGroup', { team: t.name, group: g.name })),
    enemy: g.units,
    sources: [{ kind: 'team', teamId: t.id }],
    playerDefends: false,
    directorPresent: false,
  });
  return ok();
}

/** Equipe resgata o Diretor Sequestrado (ou Detido) no país do cativeiro. */
export function teamRescue(s: GameState, a: Agency, teamId: string): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const t = a.teams.find((x) => x.id === teamId);
  const d = a.director;
  if (!t || t.travel) return no(M('msg.act.teamUnavailable'));
  if ((d.status !== 'kidnapped' && d.status !== 'detained') || d.heldIn !== t.location) return no(M('msg.act.directorNotHeldHere'));
  const c = s.countries[t.location];
  if (d.status === 'detained') addReputation(a, t.location, -15);
  beginCombat(s, a, {
    type: 'urban',
    reason: { kind: 'rescue', countryId: t.location, teamId: t.id },
    ...titled(M('msg.title.rescue', { country: ref.country(c.id) })),
    enemy: buildForce(s, d.status === 'kidnapped' ? 'criminal' : 'police', 8 + c.level * 4, 'urban'),
    sources: [{ kind: 'team', teamId: t.id }],
    playerDefends: false,
    directorPresent: false,
  });
  return ok();
}

/** Reintegrar a Equipe: à Escolta (Diretor no mesmo país) ou à Estação do país. */
export function mergeTeam(s: GameState, a: Agency, teamId: string, into: 'escort' | 'station'): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no(M('msg.act.teamUnavailable'));
  if (into === 'escort') {
    if (!directorAt(a, t.location)) return no(M('msg.act.directorNotInCountry'));
    a.escort.push(...t.units);
    if (t.freighter) a.fleet.push(t.freighter);
    // O Diretor recebe em mãos o que a Equipe ainda carrega.
    for (const lot of t.spoils) addCargo(a, lot.itemId, lot.qty, lot.paidEach);
  } else {
    const st = stationIn(a, t.location);
    if (!st || st.interdicted) return no(M('msg.act.noOperatingStation'));
    if (t.spoils.length) return no(M('msg.act.mergeSpoilsFirst'));
    const spec = STATIONS[st.level];
    if (st.units.length + t.units.length > spec.capacity) return no(M('msg.act.stationFull', { station: ref.station(st.level) }));
    if (!t.units.every((u) => spec.allows.includes(def(u.itemId).cls)))
      return no(M('msg.act.stationNoHouseAll', { station: ref.station(st.level) }));
    if (t.freighter && !directorAt(a, t.location))
      return no(M('msg.act.freighterMustReturn'));
    st.units.push(...t.units);
    if (t.freighter) a.fleet.push(t.freighter);
  }
  a.teams = a.teams.filter((x) => x !== t);
  return ok(M('msg.act.teamMerged', { team: t.name }));
}

// ── Ações hostis entre agências (simétricas: jogador e Agências Rivais) ──

function hostileTarget(s: GameState, a: Agency, teamId: string, targetId: string): { team: Team; target: Agency; st: Station } | Msg {
  if (s.over) return M('msg.act.gameOver');
  const team = a.teams.find((x) => x.id === teamId);
  if (!team || team.travel || !team.units.length) return M('msg.act.teamUnavailable');
  const target = agencyById(s, targetId);
  if (!target || target.id === a.id) return M('msg.act.invalidTarget');
  const st = stationIn(target, team.location);
  if (!st || st.interdicted) return M('msg.act.targetNoStation', { agency: target.name });
  return { team, target, st };
}

function hostileStrike(s: GameState, a: Agency, teamId: string, targetId: string, act: 'sabotage' | 'raid'): Result {
  const h = hostileTarget(s, a, teamId, targetId);
  if (!('team' in h)) return no(h);
  const c = s.countries[h.team.location];
  const fort = STATIONS[h.st.level].fort.urban;
  const defenders = h.st.units.map((u) => ({ ...u, hp: { ...u.hp } }));
  const enemy = defenders.length ? defenders : buildForce(s, 'security', fort * 3, 'urban');
  recordAggression(s, a.id, h.target.id, act === 'sabotage' ? 3 : 2);
  beginCombat(s, a, {
    type: 'urban',
    reason: { kind: 'hostile', act, countryId: c.id, teamId: h.team.id, targetId: h.target.id },
    ...titled(M(act === 'sabotage' ? 'msg.title.sabotage' : 'msg.title.raid', { target: h.target.name, country: ref.country(c.id) })),
    enemy,
    sources: [{ kind: 'team', teamId: h.team.id }],
    playerDefends: false,
    directorPresent: false,
  });
  return ok();
}

/** Equipe sabota a Estação de outra agência no país: sucesso derruba um Nível. */
export const sabotageStation = (s: GameState, a: Agency, teamId: string, targetId: string): Result =>
  hostileStrike(s, a, teamId, targetId, 'sabotage');

/** Equipe assalta o Cofre de outra agência no país: sucesso leva o conteúdo como itens capturados. */
export const raidVault = (s: GameState, a: Agency, teamId: string, targetId: string): Result =>
  hostileStrike(s, a, teamId, targetId, 'raid');

export const denounceCost = (s: GameState, countryId: string) => 50_000 * s.countries[countryId].level;

/** Denúncia: entrega a outra agência às autoridades de um país onde quem age tem Estação ou o Diretor. */
export function denounce(s: GameState, a: Agency, targetId: string, countryId: string): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const target = agencyById(s, targetId);
  if (!target || target.id === a.id) return no(M('msg.act.invalidTarget'));
  if (!stationIn(a, countryId) && !directorAt(a, countryId)) return no(M('msg.act.needStationOrDirector'));
  const cost = denounceCost(s, countryId);
  if (a.cash < cost) return no(M('msg.act.noCash'));
  a.cash -= cost;
  addExposure(s, target, countryId, 25);
  addExposure(s, a, countryId, 3);
  recordAggression(s, a.id, target.id, 1);
  notify(s, target, 'intel', M('msg.act.denounceTitle'), M('msg.act.denounceBody', { country: ref.country(countryId) }), 'warn', countryId);
  return ok(M('msg.act.denounced', { agency: target.name, country: ref.country(countryId) }));
}
