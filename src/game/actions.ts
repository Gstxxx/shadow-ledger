// Player actions. Each validates, mutates the state, and returns a short pt-BR reason when refused.
import { addCargo, cargoQty, removeCargo } from './cargo';
import { abortPending, beginCombat, liftInterdiction, negotiateCost } from './combatFlow';
import { ITEMS, usesCargo } from './data/items';
import { TEAM_NAMES } from './data/names';
import { COMMERCIAL_FARE_PER_1000KM, COMMERCIAL_SPEED, OPERATION_COMBAT, OPERATION_LABEL, STATIONS } from './data/rules';
import { buildForce } from './forces';
import {
  fleetSpeed,
  freeCargo,
  maxCargo,
  quoteBuy,
  quoteSell,
  rollRecruits,
  unitsWeight,
  usedCargo,
} from './market';
import { checkMission } from './mission';
import { chance } from './rng';
import { directorAt, log, postureIn, pushEvent, seePrices, stationIn, travelKm } from './state';
import type { CombatSetupData, GameState, OperationKind, StationLevel, Team, ThreatReaction, Unit } from './types';
import { def, isPersonnel, makeUnit, unitValue } from './units';

export type Result = { ok: true; msg?: string } | { ok: false; msg: string };
const ok = (msg?: string): Result => ({ ok: true, msg });
const no = (msg: string): Result => ({ ok: false, msg });

const money = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;

function directorReady(s: GameState): Result | null {
  if (s.over) return no('A partida acabou.');
  if (s.director.status === 'detained') return no('O Diretor está Detido.');
  if (s.director.status === 'kidnapped') return no('O Diretor está Sequestrado.');
  if (s.director.status === 'dead') return no('O Diretor está morto.');
  if (s.flight) return no('A Frota está em voo.');
  return null;
}

// ── Viagem da Frota ─────────────────────────────────────────

export const FLIGHT_GROUND_H = 1.5;

export function flightHours(s: GameState, to: string): number {
  const speed = fleetSpeed(s);
  if (!speed) return Infinity;
  return travelKm(s.location, to) / speed + FLIGHT_GROUND_H;
}

export function travel(s: GameState, to: string): Result {
  const r = directorReady(s);
  if (r) return r;
  if (to === s.location) return no('A Frota já está aqui.');
  if (!s.countries[to]) return no('Destino desconhecido.');
  if (!maxCargo(s)) return no('Nenhum cargueiro operante na Frota.');
  if (usedCargo(s) > maxCargo(s) + 1e-6) return no('A Frota está sobrecarregada: venda Carga ou deixe Unidades numa Estação.');
  const hours = flightHours(s, to);
  s.flight = { from: s.location, to, depart: s.time, arrive: s.time + hours };
  log(s, `A Frota decolou de ${s.countries[s.location].name} rumo a ${s.countries[to].name}.`, 'info', to);
  return ok();
}

// ── Comércio ────────────────────────────────────────────────

function tradeExposure(s: GameState, countryId: string, value: number, itemId: string) {
  const c = s.countries[countryId];
  const cls = def(itemId).cls;
  const k = cls === 'special' ? 0.4 : cls === 'arms' || cls === 'vehicle' || cls === 'jet' || cls === 'heli' ? 1.2 : 0.8;
  c.exposure = Math.min(100, c.exposure + Math.min(15, (value / (c.level * 500_000)) * 2 * k));
}

export function buy(s: GameState, itemId: string, qty: number): Result {
  const r = directorReady(s);
  if (r) return r;
  const c = s.countries[s.location];
  if (!c.stock.includes(itemId)) return no('Este mercado não oferece o item.');
  if (qty <= 0) return no('Quantidade inválida.');
  const it = ITEMS[itemId];
  if (it.weight * qty > freeCargo(s) + 1e-6) return no('Sem espaço na Frota.');
  const q = quoteBuy(c, itemId, qty);
  if (q.total > s.cash) return no('Caixa insuficiente.');
  s.cash -= q.total;
  c.saturation[itemId] = q.after;
  addCargo(s, itemId, qty, q.avg);
  tradeExposure(s, c.id, q.total, itemId);
  s.stats.trades++;
  seePrices(s, c.id);
  return ok(`Comprou ${qty}× ${it.name} por ${money(q.total)}.`);
}

export function sell(s: GameState, itemId: string, qty: number): Result {
  const r = directorReady(s);
  if (r) return r;
  const c = s.countries[s.location];
  if (qty <= 0 || cargoQty(s, itemId) < qty) return no('Carga insuficiente.');
  const q = quoteSell(c, itemId, qty);
  if (q.total <= 0) return no(`${c.name} não compra este item.`);
  removeCargo(s, itemId, qty);
  s.cash += q.total;
  c.saturation[itemId] = q.after;
  tradeExposure(s, c.id, q.total, itemId);
  s.stats.trades++;
  seePrices(s, c.id);
  return ok(`Vendeu ${qty}× ${ITEMS[itemId].name} por ${money(q.total)}.`);
}

/** Alistar: turn one fieldable item from the Carga into an Unidade of the Escolta (or Frota). */
export function enlist(s: GameState, itemId: string): Result {
  const r = directorReady(s);
  if (r) return r;
  const it = ITEMS[itemId];
  if (!it.fieldable) return no('Este item não entra em campo.');
  const lot = s.cargo.find((l) => l.itemId === itemId);
  if (!lot) return no('Item não está na Carga.');
  removeCargo(s, itemId, 1);
  const u = makeUnit(s, itemId, lot.paidEach);
  if (it.cls === 'cargo') s.fleet.push(u);
  else s.escort.push(u);
  return ok(`${u.name} (${it.name}) entrou na ${it.cls === 'cargo' ? 'Frota' : 'Escolta'}.`);
}

/** Contratar: Pessoal especializado e cargueiros que não são revendidos. */
export function recruit(s: GameState, itemId: string): Result {
  const r = directorReady(s);
  if (r) return r;
  const c = s.countries[s.location];
  if (!rollRecruits(c).includes(itemId)) return no('Ninguém disponível para contratar aqui.');
  const it = ITEMS[itemId];
  const price = Math.round(it.price * (it.origin?.includes(c.id) ? 0.85 : 1));
  if (price > s.cash) return no('Caixa insuficiente.');
  if (usesCargo(it) && it.weight > freeCargo(s) + 1e-6) return no('Sem espaço na Frota.');
  s.cash -= price;
  const u = makeUnit(s, itemId, price);
  if (it.cls === 'cargo') s.fleet.push(u);
  else s.escort.push(u);
  return ok(`${u.name} contratado(a): ${it.name}.`);
}

/** Dispensar/vender uma Unidade da Escolta ou Frota a 60% do valor. */
export function dismiss(s: GameState, uid: string): Result {
  const r = directorReady(s);
  if (r) return r;
  const inFleet = s.fleet.find((u) => u.uid === uid);
  const u = inFleet ?? s.escort.find((x) => x.uid === uid);
  if (!u) return no('Unidade não encontrada.');
  if (inFleet && s.fleet.length === 1) return no('A Frota precisa de ao menos um cargueiro.');
  const value = Math.round(unitValue(u) * 0.6);
  s.cash += value;
  if (inFleet) s.fleet = s.fleet.filter((x) => x !== u);
  else s.escort = s.escort.filter((x) => x !== u);
  return ok(`${u.name} dispensado(a) por ${money(value)}.`);
}

// ── Estações ────────────────────────────────────────────────

export function stationCost(s: GameState, countryId: string, level: StationLevel): number {
  const p = postureIn(s, countryId);
  return Math.round(STATIONS[level].cost * (p === 'enemy' ? 1.5 : p === 'ally' ? 0.85 : 1));
}

export function openStation(s: GameState): Result {
  const r = directorReady(s);
  if (r) return r;
  if (stationIn(s, s.location)) return no('Já existe uma Estação aqui.');
  const cost = stationCost(s, s.location, 1);
  if (s.cash < cost) return no('Caixa insuficiente.');
  s.cash -= cost;
  s.stations.push({ countryId: s.location, level: 1, units: [], founded: s.time, detained: [] });
  s.countries[s.location].exposure += 4;
  seePrices(s, s.location);
  return ok(`Célula aberta em ${s.countries[s.location].name}.`);
}

export function upgradeStation(s: GameState): Result {
  const r = directorReady(s);
  if (r) return r;
  const st = stationIn(s, s.location);
  if (!st) return no('Não há Estação aqui.');
  if (st.interdicted) return no('A Estação está Interditada.');
  if (st.level >= 5) return no('Já é uma Base.');
  const next = (st.level + 1) as StationLevel;
  const cost = stationCost(s, s.location, next);
  if (s.cash < cost) return no('Caixa insuficiente.');
  s.cash -= cost;
  st.level = next;
  return ok(`Estação promovida a ${STATIONS[next].name}.`);
}

/** Move an Unidade between the Escolta and the Estação where the Diretor is. */
export function transferUnit(s: GameState, uid: string, to: 'station' | 'escort'): Result {
  const r = directorReady(s);
  if (r) return r;
  const st = stationIn(s, s.location);
  if (!st) return no('Não há Estação aqui.');
  if (st.interdicted) return no('A Estação está Interditada.');
  if (to === 'station') {
    const u = s.escort.find((x) => x.uid === uid);
    if (!u) return no('Unidade não está na Escolta.');
    const spec = STATIONS[st.level];
    if (!spec.allows.includes(def(u.itemId).cls)) return no(`Uma ${spec.name} não abriga ${def(u.itemId).name}.`);
    if (st.units.length >= spec.capacity) return no(`Capacidade da ${spec.name} esgotada.`);
    s.escort = s.escort.filter((x) => x !== u);
    st.units.push(u);
    return ok();
  }
  const u = st.units.find((x) => x.uid === uid);
  if (!u) return no('Unidade não está na Estação.');
  if (usesCargo(def(u.itemId)) && def(u.itemId).weight > freeCargo(s) + 1e-6) return no('Sem espaço na Frota.');
  st.units = st.units.filter((x) => x !== u);
  s.escort.push(u);
  return ok();
}

export function payFine(s: GameState, countryId: string): Result {
  const st = stationIn(s, countryId);
  if (!st?.interdicted) return no('A Estação não está Interditada.');
  if (s.cash < st.interdicted.fine) return no('Caixa insuficiente.');
  s.cash -= st.interdicted.fine;
  liftInterdiction(s, countryId);
  log(s, `Multa paga: Estação em ${s.countries[countryId].name} liberada.`, 'good', countryId);
  return ok();
}

/** Recorrer: Combate Jurídico contra a Promotoria, com o Diretor presente. */
export function appeal(s: GameState): Result {
  const r = directorReady(s);
  if (r) return r;
  const st = stationIn(s, s.location);
  if (!st?.interdicted) return no('Nada a recorrer aqui.');
  const c = s.countries[s.location];
  const data: CombatSetupData = {
    type: 'legal',
    reason: { kind: 'appeal', countryId: c.id },
    title: `Recurso em ${c.name}`,
    enemy: buildForce(s, 'court', 4 + c.level * 2.5, 'legal'),
    sources: [{ kind: 'escort' }],
    playerDefends: false,
    // The Diretor argues in person (chooses the Tática); losing an appeal never leads to prison.
    directorPresent: true,
  };
  beginCombat(s, data);
  return ok();
}

// ── Reações a Ameaças ───────────────────────────────────────

export function reactionCost(s: GameState, threatId: string, reaction: ThreatReaction): number {
  const t = s.threats.find((x) => x.id === threatId);
  if (!t) return 0;
  const c = s.countries[t.countryId];
  const p = postureIn(s, t.countryId);
  switch (reaction) {
    case 'lawyers':
      return 60_000 * c.level;
    case 'bribe':
      return Math.round(40_000 * c.level * (1 + c.exposure / 50) * (p === 'ally' ? 0.6 : p === 'enemy' ? 2 : 1) * (t.strength / 10));
    case 'reinforce':
      return 50_000 * c.level;
    case 'evacuate':
      return 0;
  }
}

export function bribeChance(s: GameState, threatId: string): number {
  const t = s.threats.find((x) => x.id === threatId);
  if (!t) return 0;
  if (t.kind === 'criminal') return 0.7;
  if (t.kind === 'military') return 0.25;
  const p = postureIn(s, t.countryId);
  return p === 'ally' ? 0.85 : p === 'neutral' ? 0.6 : 0.3;
}

export function reactionAvailable(s: GameState, threatId: string, reaction: ThreatReaction): boolean {
  const t = s.threats.find((x) => x.id === threatId);
  if (!t || t.cancelled || t.reactions.includes(reaction)) return false;
  if (reaction === 'lawyers') return t.kind === 'lawsuit' || t.kind === 'raid';
  if (reaction === 'evacuate') return t.target === 'station' && (stationIn(s, t.countryId)?.units.length ?? 0) > 0;
  if (reaction === 'reinforce') return t.target === 'station';
  return true;
}

export function react(s: GameState, threatId: string, reaction: ThreatReaction): Result {
  if (s.over) return no('A partida acabou.');
  const t = s.threats.find((x) => x.id === threatId);
  if (!t) return no('Ameaça não encontrada.');
  if (!reactionAvailable(s, threatId, reaction)) return no('Reação indisponível.');
  const cost = reactionCost(s, threatId, reaction);
  if (s.cash < cost) return no('Caixa insuficiente.');
  s.cash -= cost;
  t.reactions.push(reaction);
  const c = s.countries[t.countryId];
  switch (reaction) {
    case 'lawyers':
      t.strength = Math.max(1, Math.round(t.strength * 0.7));
      return ok(`Advogados contratados: a força da ameaça caiu para ${t.strength}.`);
    case 'bribe':
      if (chance(s, bribeChance(s, threatId))) {
        t.cancelled = true;
        return ok('Suborno aceito: a ameaça não vai acontecer.');
      }
      c.exposure = Math.min(100, c.exposure + 12);
      t.strength = Math.round(t.strength * 1.1);
      return ok('Suborno recusado. A Exposição subiu e o outro lado vem mais preparado.');
    case 'reinforce':
      t.hired = (t.hired ?? 0) + 4 + c.level * 2;
      return ok(`Segurança local contratada (força ${t.hired}) vai defender a Estação.`);
    case 'evacuate': {
      const st = stationIn(s, t.countryId)!;
      const team = createTeam(s, t.countryId, st.units);
      st.units = [];
      return ok(`Unidades evacuadas como ${team.name}. A Estação fica só com as defesas fixas.`);
    }
  }
}

// ── Contratos ───────────────────────────────────────────────

export function acceptContract(s: GameState, id: string): Result {
  const k = s.contracts.find((x) => x.id === id);
  if (!k || k.status !== 'offered') return no('Oferta indisponível.');
  if (s.contracts.filter((x) => x.status === 'accepted').length >= 3) return no('No máximo 3 Contratos ativos.');
  k.status = 'accepted';
  return ok();
}

export function deliverContract(s: GameState, id: string): Result {
  const r = directorReady(s);
  if (r) return r;
  const k = s.contracts.find((x) => x.id === id);
  if (!k || k.status !== 'accepted') return no('Contrato não está ativo.');
  if (k.countryId !== s.location) return no('A entrega é em outro país.');
  if (cargoQty(s, k.itemId) < k.qty) return no('Carga insuficiente para a entrega.');
  removeCargo(s, k.itemId, k.qty);
  s.cash += k.reward;
  k.status = 'done';
  const c = s.countries[k.countryId];
  c.reputation = Math.min(100, c.reputation + k.reputation);
  c.exposure = Math.min(100, c.exposure + 4);
  s.stats.contractsDone++;
  log(s, `Contrato entregue a ${k.buyer}: ${money(k.reward)}.`, 'good', k.countryId);
  return ok(`Contrato entregue: ${money(k.reward)}.`);
}

// ── Operações Especiais e Golpe ─────────────────────────────

export const BANK_COOLDOWN_H = 24 * 30;

export function operationStrength(s: GameState, countryId: string, op: OperationKind | 'coup'): number {
  const c = s.countries[countryId];
  const diff = 0.8 + s.options.difficulty * 0.2;
  const base = op === 'bank' ? 5 + c.level * 4 : op === 'tech' ? 6 + c.level * 5 : op === 'eliminate' ? 8 + c.level * 5 : 12 + c.level * 8;
  const p = postureIn(s, countryId);
  return Math.round(base * diff * (p === 'enemy' ? 1.2 : p === 'ally' ? 0.9 : 1));
}

export function operationBlocked(s: GameState, countryId: string, op: OperationKind): string | null {
  const c = s.countries[countryId];
  if (op === 'bank' && c.bankRobbedAt !== undefined && s.time - c.bankRobbedAt < BANK_COOLDOWN_H)
    return 'O banco ainda está em alerta máximo.';
  return null;
}

function opSetup(s: GameState, countryId: string, op: OperationKind, by: 'director' | Team): CombatSetupData {
  const c = s.countries[countryId];
  const type = OPERATION_COMBAT[op];
  return {
    type,
    reason: { kind: 'operation', op, countryId, by: by === 'director' ? 'director' : by.id },
    title: `${OPERATION_LABEL[op]} em ${c.name}`,
    enemy: buildForce(s, op === 'eliminate' ? 'military' : 'security', operationStrength(s, countryId, op), type),
    sources: by === 'director' ? [{ kind: 'escort' }] : [{ kind: 'team', teamId: by.id }],
    playerDefends: false,
    directorPresent: by === 'director',
  };
}

export function startOperation(s: GameState, op: OperationKind): Result {
  const r = directorReady(s);
  if (r) return r;
  const blocked = operationBlocked(s, s.location, op);
  if (blocked) return no(blocked);
  if (!s.escort.length) return no('A Escolta está vazia.');
  beginCombat(s, opSetup(s, s.location, op, 'director'));
  return ok();
}

export function startCoup(s: GameState): Result {
  const r = directorReady(s);
  if (r) return r;
  if (!s.escort.length) return no('A Escolta está vazia.');
  const c = s.countries[s.location];
  if (c.couped) return no('O governo atual já é obra da agência.');
  beginCombat(s, {
    type: 'army',
    reason: { kind: 'coup', countryId: c.id },
    title: `Golpe em ${c.name}`,
    enemy: buildForce(s, 'military', operationStrength(s, c.id, 'coup'), 'army'),
    sources: [{ kind: 'escort' }],
    playerDefends: false,
    directorPresent: true,
  });
  return ok();
}

export const cancelPending = (s: GameState): Result => (abortPending(s) ? ok() : no('Este combate não pode ser evitado.'));

export { negotiateCost };

// ── Diretor ─────────────────────────────────────────────────

export function payRelease(s: GameState): Result {
  const d = s.director;
  if (d.status !== 'detained' && d.status !== 'kidnapped') return no('O Diretor está livre.');
  const price = d.price ?? 0;
  if (s.cash < price) return no('Caixa insuficiente.');
  s.cash -= price;
  const was = d.status;
  d.status = 'free';
  d.heldIn = undefined;
  d.price = undefined;
  d.releaseAt = undefined;
  pushEvent(s, 'director', 'Diretor libertado', was === 'detained' ? `Fiança paga: ${money(price)}.` : `Resgate pago: ${money(price)}.`, 'good', s.location);
  return ok();
}

export function payArrears(s: GameState): Result {
  if (!s.arrears) return no('Nada em atraso.');
  if (s.cash < s.arrears) return no('Caixa insuficiente.');
  s.cash -= s.arrears;
  log(s, `Manutenção em atraso quitada: ${money(s.arrears)}. Máquinas de volta à ativa.`, 'good');
  s.arrears = 0;
  for (const u of [...s.fleet, ...s.escort, ...s.stations.flatMap((x) => x.units), ...s.teams.flatMap((t) => t.units)]) u.idle = false;
  for (const t of s.teams) if (t.freighter) t.freighter.idle = false;
  return ok();
}

// ── Equipes ─────────────────────────────────────────────────

function createTeam(s: GameState, location: string, units: Unit[]): Team {
  s.uidCounter += 1;
  const used = new Set(s.teams.map((t) => t.name));
  const base = TEAM_NAMES.find((n) => !used.has(`Equipe ${n}`)) ?? `${s.uidCounter}`;
  const team: Team = { id: `tm${s.uidCounter}`, name: `Equipe ${base}`, units: [...units], location, spoils: [] };
  s.teams.push(team);
  return team;
}

/** Destacar Unidades da Escolta (Diretor presente) ou de uma Estação numa Equipe. */
export function formTeam(s: GameState, from: 'escort' | { stationCountry: string }, uids: string[]): Result {
  if (!uids.length) return no('Escolha ao menos uma Unidade.');
  if (from === 'escort') {
    const r = directorReady(s);
    if (r) return r;
    const units = s.escort.filter((u) => uids.includes(u.uid));
    if (units.length !== uids.length) return no('Unidade fora da Escolta.');
    s.escort = s.escort.filter((u) => !uids.includes(u.uid));
    const t = createTeam(s, s.location, units);
    return ok(`${t.name} formada com ${units.length} Unidade(s).`);
  }
  const st = stationIn(s, from.stationCountry);
  if (!st || st.interdicted) return no('Estação indisponível.');
  const units = st.units.filter((u) => uids.includes(u.uid));
  if (units.length !== uids.length) return no('Unidade fora da Estação.');
  st.units = st.units.filter((u) => !uids.includes(u.uid));
  const t = createTeam(s, st.countryId, units);
  return ok(`${t.name} formada com ${units.length} Unidade(s).`);
}

export function commercialFare(team: Team, to: string): number {
  return Math.round((travelKm(team.location, to) / 1000) * COMMERCIAL_FARE_PER_1000KM * team.units.length);
}

export function teamFlightHours(s: GameState, team: Team, to: string, mode: 'commercial' | 'freighter'): number {
  const km = travelKm(team.location, to);
  if (mode === 'commercial') return km / COMMERCIAL_SPEED + 4;
  const f = team.freighter ?? pickFreighter(s, team);
  return km / (def(f?.itemId ?? 'cargo0').speed ?? 500) + 1.5;
}

/** Smallest active freighter of the Frota that can carry the team. */
function pickFreighter(s: GameState, team: Team): Unit | undefined {
  const need = unitsWeight(team.units);
  return s.fleet
    .filter((u) => !u.idle && def(u.itemId).weight >= need)
    .sort((a, b) => def(a.itemId).weight - def(b.itemId).weight)[0];
}

export function sendTeam(s: GameState, teamId: string, to: string, mode: 'commercial' | 'freighter'): Result {
  if (s.over) return no('A partida acabou.');
  const t = s.teams.find((x) => x.id === teamId);
  if (!t) return no('Equipe não encontrada.');
  if (t.travel) return no('A Equipe já está em trânsito.');
  if (t.location === to) return no('A Equipe já está lá.');
  if (mode === 'commercial') {
    if (!t.units.every(isPersonnel)) return no('Voo Comercial só leva Pessoal. Use um Cargueiro Destacado.');
    const fare = commercialFare(t, to);
    if (s.cash < fare) return no('Caixa insuficiente para as passagens.');
    s.cash -= fare;
  } else if (!t.freighter) {
    if (s.flight || t.location !== s.location) return no('Só dá para destacar um cargueiro onde a Frota está pousada.');
    const f = pickFreighter(s, t);
    if (!f) return no('Nenhum cargueiro livre com capacidade para a Equipe.');
    if (s.fleet.length <= 1) return no('O Diretor precisa manter ao menos um cargueiro.');
    s.fleet = s.fleet.filter((u) => u !== f);
    t.freighter = f;
    log(s, `${f.name} destacado da Frota para levar a ${t.name}.`, 'info');
  }
  const hours = teamFlightHours(s, t, to, mode);
  t.travel = { from: t.location, to, depart: s.time, arrive: s.time + hours, mode };
  return ok(`${t.name} a caminho de ${s.countries[to].name}.`);
}

export function teamOperation(s: GameState, teamId: string, op: OperationKind): Result {
  if (s.over) return no('A partida acabou.');
  const t = s.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no('Equipe indisponível.');
  const blocked = operationBlocked(s, t.location, op);
  if (blocked) return no(blocked);
  beginCombat(s, opSetup(s, t.location, op, t));
  return ok();
}

/** Equipe ataca o grupo hostil (caça/resgate) no país onde está. */
export function teamAttackGroup(s: GameState, teamId: string): Result {
  const t = s.teams.find((x) => x.id === teamId);
  const g = s.group;
  if (!t || t.travel) return no('Equipe indisponível.');
  if (!g || g.defeated || g.countryId !== t.location) return no('O grupo não está aqui.');
  beginCombat(s, {
    type: 'army',
    reason: { kind: 'group', countryId: t.location, by: t.id },
    title: `${t.name} contra ${g.name}`,
    enemy: g.units,
    sources: [{ kind: 'team', teamId: t.id }],
    playerDefends: false,
    directorPresent: false,
  });
  return ok();
}

/** Equipe resgata o Diretor Sequestrado (ou Detido) no país do cativeiro. */
export function teamRescue(s: GameState, teamId: string): Result {
  const t = s.teams.find((x) => x.id === teamId);
  const d = s.director;
  if (!t || t.travel) return no('Equipe indisponível.');
  if ((d.status !== 'kidnapped' && d.status !== 'detained') || d.heldIn !== t.location) return no('O Diretor não está preso aqui.');
  const c = s.countries[t.location];
  beginCombat(s, {
    type: 'urban',
    reason: { kind: 'rescue', countryId: t.location, teamId: t.id },
    title: `Resgate do Diretor em ${c.name}`,
    enemy: buildForce(s, d.status === 'kidnapped' ? 'criminal' : 'police', 8 + c.level * 4, 'urban'),
    sources: [{ kind: 'team', teamId: t.id }],
    playerDefends: false,
    directorPresent: false,
  });
  return ok();
}

/** Reintegrar a Equipe: à Escolta (Diretor no mesmo país) ou à Estação do país. */
export function mergeTeam(s: GameState, teamId: string, into: 'escort' | 'station'): Result {
  const t = s.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no('Equipe indisponível.');
  if (into === 'escort') {
    if (!directorAt(s, t.location)) return no('O Diretor não está neste país.');
    s.escort.push(...t.units);
    if (t.freighter) s.fleet.push(t.freighter);
    // Provisório: o Diretor embarca os itens capturados ao reencontrar a Equipe (docs/OPEN-QUESTIONS.md).
    for (const lot of t.spoils) addCargo(s, lot.itemId, lot.qty, lot.paidEach);
  } else {
    const st = stationIn(s, t.location);
    if (!st || st.interdicted) return no('Não há Estação operante aqui.');
    if (t.spoils.length) return no('A Equipe carrega itens capturados; reencontre o Diretor primeiro.');
    const spec = STATIONS[st.level];
    if (st.units.length + t.units.length > spec.capacity) return no(`Capacidade da ${spec.name} esgotada.`);
    if (!t.units.every((u) => spec.allows.includes(def(u.itemId).cls))) return no(`A ${spec.name} não abriga todas as Unidades.`);
    if (t.freighter && !directorAt(s, t.location))
      return no('O Cargueiro Destacado precisa voltar à Frota: reintegre onde está o Diretor.');
    st.units.push(...t.units);
    if (t.freighter) s.fleet.push(t.freighter);
  }
  s.teams = s.teams.filter((x) => x !== t);
  return ok(`${t.name} reintegrada.`);
}

export { checkMission };
