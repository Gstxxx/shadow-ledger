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
  OPERATION_LABEL,
  STATIONS,
  VAULT_CAPACITY,
} from './data/rules';
import { buildForce } from './forces';
import { fleetSpeed, freeCargo, maxCargo, quoteBuy, quoteSell, rollRecruits, unitsWeight, usedCargo } from './market';
import { chance } from './rng';
import {
  addExposure,
  addReputation,
  addTension,
  directorAt,
  note,
  notify,
  postureIn,
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
import { def, isPersonnel, makeUnit, REPAIR_MIN_LEVEL, repairCost, restore, unitValue } from './units';

export type Result = { ok: true; msg?: string } | { ok: false; msg: string };
const ok = (msg?: string): Result => ({ ok: true, msg });
const no = (msg: string): Result => ({ ok: false, msg });

const money = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;

function directorReady(s: GameState, a: Agency): Result | null {
  if (s.over) return no('A partida acabou.');
  if (a.director.status === 'detained') return no('O Diretor está Detido.');
  if (a.director.status === 'kidnapped') return no('O Diretor está Sequestrado.');
  if (a.director.status === 'dead') return no('O Diretor está morto.');
  if (a.flight) return no('A Frota está em voo.');
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
  if (to === a.location) return no('A Frota já está aqui.');
  if (!s.countries[to]) return no('Destino desconhecido.');
  if (!maxCargo(a)) return no('Nenhum cargueiro operante na Frota.');
  if (usedCargo(a) > maxCargo(a) + 1e-6)
    return no('A Frota está sobrecarregada: venda Carga, use o Cofre ou deixe Unidades numa Estação.');
  const hours = flightHours(a, to);
  a.flight = { from: a.location, to, depart: s.time, arrive: s.time + hours };
  note(s, a, `A Frota decolou de ${s.countries[a.location].name} rumo a ${s.countries[to].name}.`, 'info', to);
  return ok();
}

// ── Comércio (exclusivo do Diretor) ─────────────────────────

function tradeExposure(s: GameState, a: Agency, countryId: string, value: number, itemId: string) {
  const c = s.countries[countryId];
  const it = def(itemId);
  const k = it.wmd ? 3 : it.cls === 'special' ? 0.4 : ['arms', 'vehicle', 'jet', 'heli'].includes(it.cls) ? 1.2 : 0.8;
  addExposure(a, countryId, Math.min(25, (value / (c.level * 500_000)) * 2 * k));
  if (it.wmd) addTension(s, 2);
}

export function buy(s: GameState, a: Agency, itemId: string, qty: number): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const c = s.countries[a.location];
  if (!c.stock.includes(itemId)) return no('Este mercado não oferece o item.');
  if (qty <= 0) return no('Quantidade inválida.');
  const it = ITEMS[itemId];
  if (it.weight * qty > freeCargo(a) + 1e-6) return no('Sem espaço na Frota.');
  const q = quoteBuy(c, itemId, qty);
  if (q.total > a.cash) return no('Caixa insuficiente.');
  a.cash -= q.total;
  c.saturation[itemId] = q.after;
  addCargo(a, itemId, qty, q.avg);
  tradeExposure(s, a, c.id, q.total, itemId);
  a.stats.trades++;
  seePrices(s, a, c.id);
  return ok(`Comprou ${qty}× ${it.name} por ${money(q.total)}.`);
}

export function sell(s: GameState, a: Agency, itemId: string, qty: number): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const c = s.countries[a.location];
  if (qty <= 0 || cargoQty(a, itemId) < qty) return no('Carga insuficiente.');
  const q = quoteSell(c, itemId, qty);
  if (q.total <= 0) return no(`${c.name} não compra este item.`);
  removeCargo(a, itemId, qty);
  a.cash += q.total;
  c.saturation[itemId] = q.after;
  tradeExposure(s, a, c.id, q.total, itemId);
  a.stats.trades++;
  seePrices(s, a, c.id);
  return ok(`Vendeu ${qty}× ${ITEMS[itemId].name} por ${money(q.total)}.`);
}

/** Alistar: turn one fieldable item from the Carga into an Unidade of the Escolta (or Frota). */
export function enlist(s: GameState, a: Agency, itemId: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const it = ITEMS[itemId];
  if (!it.fieldable) return no('Este item não entra em campo.');
  const lot = a.cargo.find((l) => l.itemId === itemId);
  if (!lot) return no('Item não está na Carga.');
  removeCargo(a, itemId, 1);
  const u = makeUnit(s, itemId, lot.paidEach);
  if (it.cls === 'cargo') a.fleet.push(u);
  else a.escort.push(u);
  return ok(`${u.name} (${it.name}) entrou na ${it.cls === 'cargo' ? 'Frota' : 'Escolta'}.`);
}

export const recruitPrice = (countryId: string, itemId: string) =>
  Math.round(ITEMS[itemId].price * (ITEMS[itemId].origin?.includes(countryId) ? 0.85 : 1));

/** Contratar: Pessoal especializado e cargueiros que não são revendidos. */
export function recruit(s: GameState, a: Agency, itemId: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const c = s.countries[a.location];
  if (!rollRecruits(c).includes(itemId)) return no('Ninguém disponível para contratar aqui.');
  const it = ITEMS[itemId];
  const price = recruitPrice(c.id, itemId);
  if (price > a.cash) return no('Caixa insuficiente.');
  if (usesCargo(it) && it.weight > freeCargo(a) + 1e-6) return no('Sem espaço na Frota.');
  a.cash -= price;
  const u = makeUnit(s, itemId, price);
  if (it.cls === 'cargo') a.fleet.push(u);
  else a.escort.push(u);
  return ok(`${u.name} contratado: ${it.name}.`);
}

/** Dispensar uma Unidade da Escolta ou Frota, recuperando 60% do valor. */
export function dismiss(s: GameState, a: Agency, uid: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const inFleet = a.fleet.find((u) => u.uid === uid);
  const u = inFleet ?? a.escort.find((x) => x.uid === uid);
  if (!u) return no('Unidade não encontrada.');
  if (inFleet && a.fleet.length === 1) return no('A Frota precisa de ao menos um cargueiro.');
  const value = Math.round(unitValue(u) * 0.6);
  a.cash += value;
  if (inFleet) a.fleet = a.fleet.filter((x) => x !== u);
  else a.escort = a.escort.filter((x) => x !== u);
  return ok(`${u.name} dispensado por ${money(value)}.`);
}

// ── Estações ────────────────────────────────────────────────

export function stationCost(a: Agency, countryId: string, level: StationLevel): number {
  const p = postureIn(a, countryId);
  return Math.round(STATIONS[level].cost * (p === 'enemy' ? 1.5 : p === 'ally' ? 0.85 : 1));
}

export function openStation(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  if (stationIn(a, a.location)) return no('Já existe uma Estação aqui.');
  const cost = stationCost(a, a.location, 1);
  if (a.cash < cost) return no('Caixa insuficiente.');
  a.cash -= cost;
  a.stations.push({ countryId: a.location, level: 1, units: [], founded: s.time, vault: [], detained: [] });
  addExposure(a, a.location, 4);
  seePrices(s, a, a.location);
  return ok(`Célula aberta em ${s.countries[a.location].name}.`);
}

export function upgradeStation(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st) return no('Não há Estação aqui.');
  if (st.interdicted) return no('A Estação está Interditada.');
  if (st.level >= 5) return no('Já é uma Base.');
  const next = (st.level + 1) as StationLevel;
  const cost = stationCost(a, a.location, next);
  if (a.cash < cost) return no('Caixa insuficiente.');
  a.cash -= cost;
  st.level = next;
  return ok(`Estação promovida a ${STATIONS[next].name}.`);
}

/** Move an Unidade between the Escolta and the Estação where the Diretor is. */
export function transferUnit(s: GameState, a: Agency, uid: string, to: 'station' | 'escort'): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st) return no('Não há Estação aqui.');
  if (st.interdicted) return no('A Estação está Interditada.');
  if (to === 'station') {
    const u = a.escort.find((x) => x.uid === uid);
    if (!u) return no('Unidade não está na Escolta.');
    const spec = STATIONS[st.level];
    if (!spec.allows.includes(def(u.itemId).cls)) return no(`Uma ${spec.name} não abriga ${def(u.itemId).name}.`);
    if (st.units.length >= spec.capacity) return no(`Capacidade da ${spec.name} esgotada.`);
    a.escort = a.escort.filter((x) => x !== u);
    st.units.push(u);
    return ok();
  }
  const u = st.units.find((x) => x.uid === uid);
  if (!u) return no('Unidade não está na Estação.');
  if (usesCargo(def(u.itemId)) && def(u.itemId).weight > freeCargo(a) + 1e-6) return no('Sem espaço na Frota.');
  st.units = st.units.filter((x) => x !== u);
  a.escort.push(u);
  return ok();
}

/** Conserto de uma máquina Danificada, numa Estação Escritório ou maior onde o Diretor está. */
export function repair(s: GameState, a: Agency, uid: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st || st.interdicted || st.level < REPAIR_MIN_LEVEL) return no('Conserto exige uma Estação Escritório ou maior aqui.');
  const u = [...a.fleet, ...a.escort, ...st.units].find((x) => x.uid === uid);
  if (!u || u.injury?.kind !== 'damaged') return no('Nada a consertar.');
  const cost = repairCost(u);
  if (a.cash < cost) return no('Caixa insuficiente.');
  a.cash -= cost;
  u.injury = undefined;
  restore(u);
  return ok(`${u.name} consertado por ${money(cost)}.`);
}

export function payFine(s: GameState, a: Agency, countryId: string): Result {
  const st = stationIn(a, countryId);
  if (!st?.interdicted) return no('A Estação não está Interditada.');
  if (a.cash < st.interdicted.fine) return no('Caixa insuficiente.');
  a.cash -= st.interdicted.fine;
  liftInterdiction(a, countryId);
  note(s, a, `Multa paga: Estação em ${s.countries[countryId].name} liberada.`, 'good', countryId);
  return ok();
}

/** Recorrer: Combate Jurídico contra a Promotoria, com o Diretor presente. */
export function appeal(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st?.interdicted) return no('Nada a recorrer aqui.');
  const c = s.countries[a.location];
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
  if (!st || st.interdicted) return no('Não há Estação operante aqui.');
  if (qty <= 0 || cargoQty(a, itemId) < qty) return no('Carga insuficiente.');
  if (def(itemId).weight * qty > vaultFree(st) + 1e-6) return no('O Cofre não tem espaço.');
  const paid = takeLot(a.cargo, itemId, qty)!;
  addLot(st.vault, lotId, itemId, qty, paid);
  return ok();
}

/** Só o Diretor retira do Cofre. */
export function withdraw(s: GameState, a: Agency, itemId: string, qty: number): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const st = stationIn(a, a.location);
  if (!st || st.interdicted) return no('Não há Estação operante aqui.');
  if (qty <= 0 || lotQty(st.vault, itemId) < qty) return no('O Cofre não tem isso.');
  if (def(itemId).weight * qty > freeCargo(a) + 1e-6) return no('Sem espaço na Frota.');
  const paid = takeLot(st.vault, itemId, qty)!;
  addCargo(a, itemId, qty, paid);
  return ok();
}

// ── Itens capturados por Equipes: Receptador ou Cofre ───────

export const fenceValue = (lot: CargoLot) => Math.round(ITEMS[lot.itemId].price * FENCE_RATE) * lot.qty;

/** Receptador: compra na hora, com desconto forte. Não é Comércio. */
export function fenceSpoils(s: GameState, a: Agency, teamId: string, lid: string): Result {
  if (s.over) return no('A partida acabou.');
  const t = a.teams.find((x) => x.id === teamId);
  const lot = t?.spoils.find((l) => l.lid === lid);
  if (!t || !lot) return no('Item não encontrado.');
  if (!lot.fresh) return no('O Receptador só compra logo após a captura.');
  const value = fenceValue(lot);
  a.cash += value;
  t.spoils = t.spoils.filter((l) => l !== lot);
  addExposure(a, t.location, 3);
  return ok(`O Receptador pagou ${money(value)} por ${ITEMS[lot.itemId].name}.`);
}

export const spoilsWeight = (t: Team) => t.spoils.reduce((x, l) => x + def(l.itemId).weight * l.qty, 0);

/** A Equipe entrega os itens capturados ao Diretor no mesmo país; viram Carga. */
export function handSpoils(s: GameState, a: Agency, teamId: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel || !t.spoils.length) return no('Nada a entregar.');
  if (t.location !== a.location) return no('O Diretor não está neste país.');
  if (spoilsWeight(t) > freeCargo(a) + 1e-6) return no('Sem espaço na Frota.');
  for (const l of t.spoils) addCargo(a, l.itemId, l.qty, l.paidEach);
  t.spoils = [];
  return ok('Itens entregues ao Diretor.');
}

/** Leva os itens capturados ao Cofre da Estação do país onde a Equipe está. */
export function stashSpoils(s: GameState, a: Agency, teamId: string): Result {
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no('Equipe indisponível.');
  if (!t.spoils.length) return no('Nada a guardar.');
  const st = stationIn(a, t.location);
  if (!st || st.interdicted) return no('Não há Estação operante neste país.');
  const w = t.spoils.reduce((x, l) => x + def(l.itemId).weight * l.qty, 0);
  if (w > vaultFree(st) + 1e-6) return no('O Cofre não tem espaço.');
  for (const l of t.spoils) addLot(st.vault, lotId, l.itemId, l.qty, l.paidEach);
  t.spoils = [];
  return ok(`Itens guardados no Cofre em ${s.countries[t.location].name}.`);
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
  if (s.over) return no('A partida acabou.');
  const t = a.threats.find((x) => x.id === threatId);
  if (!t) return no('Ameaça não encontrada.');
  if (!reactionAvailable(a, threatId, reaction)) return no('Reação indisponível.');
  const cost = reactionCost(s, a, threatId, reaction);
  if (a.cash < cost) return no('Caixa insuficiente.');
  a.cash -= cost;
  t.reactions.push(reaction);
  switch (reaction) {
    case 'lawyers':
      t.strength = Math.max(1, Math.round(t.strength * 0.7));
      return ok(`Advogados contratados: a força da ameaça caiu para ${t.strength}.`);
    case 'bribe':
      if (chance(s, bribeChance(a, threatId))) {
        t.cancelled = true;
        return ok('Suborno aceito: a ameaça não vai acontecer.');
      }
      addExposure(a, t.countryId, 12);
      t.strength = Math.round(t.strength * 1.1);
      return ok('Suborno recusado. A Exposição subiu e o outro lado vem mais preparado.');
    case 'reinforce':
      t.hired = (t.hired ?? 0) + 4 + s.countries[t.countryId].level * 2;
      return ok(`Segurança local contratada (força ${t.hired}) vai defender a Estação.`);
    case 'evacuate': {
      const st = stationIn(a, t.countryId)!;
      const team = createTeam(s, a, t.countryId, st.units);
      st.units = [];
      return ok(`Unidades evacuadas como ${team.name}. A Estação fica só com as defesas fixas.`);
    }
  }
}

// ── Contratos ───────────────────────────────────────────────

export function acceptContract(s: GameState, a: Agency, id: string): Result {
  const k = s.contracts.find((x) => x.id === id);
  if (!k || k.status !== 'offered') return no('Oferta indisponível.');
  if (postureIn(a, k.countryId) === 'enemy') return no('O comprador não negocia com Inimigos do Estado.');
  if (s.contracts.filter((x) => x.status === 'accepted' && x.agencyId === a.id).length >= 3) return no('No máximo 3 Contratos ativos.');
  k.status = 'accepted';
  k.agencyId = a.id;
  return ok();
}

export function deliverContract(s: GameState, a: Agency, id: string): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const k = s.contracts.find((x) => x.id === id);
  if (!k || k.status !== 'accepted' || k.agencyId !== a.id) return no('Contrato não está ativo.');
  if (k.countryId !== a.location) return no('A entrega é em outro país.');
  if (cargoQty(a, k.itemId) < k.qty) return no('Carga insuficiente para a entrega.');
  removeCargo(a, k.itemId, k.qty);
  a.cash += k.reward;
  k.status = 'done';
  addReputation(a, k.countryId, k.reputation);
  addExposure(a, k.countryId, 4);
  a.stats.contractsDone++;
  note(s, a, `Contrato entregue a ${k.buyer}: ${money(k.reward)}.`, 'good', k.countryId);
  return ok(`Contrato entregue: ${money(k.reward)}.`);
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

export function operationBlocked(s: GameState, countryId: string, op: OperationKind): string | null {
  const c = s.countries[countryId];
  if (op === 'bank' && c.bankRobbedAt !== undefined && s.time - c.bankRobbedAt < BANK_COOLDOWN_H)
    return 'O banco ainda está em alerta máximo.';
  return null;
}

function opSetup(s: GameState, a: Agency, countryId: string, op: OperationKind, by: 'director' | Team): CombatSetupData {
  const c = s.countries[countryId];
  const type = OPERATION_COMBAT[op];
  return {
    type,
    reason: { kind: 'operation', op, countryId, by: by === 'director' ? 'director' : by.id },
    title: `${OPERATION_LABEL[op]} em ${c.name}`,
    enemy: buildForce(s, op === 'neutralize' ? 'military' : 'security', operationStrength(s, a, countryId, op), type),
    sources: by === 'director' ? [{ kind: 'escort' }] : [{ kind: 'team', teamId: by.id }],
    playerDefends: false,
    directorPresent: by === 'director',
  };
}

export function startOperation(s: GameState, a: Agency, op: OperationKind): Result {
  const r = directorReady(s, a);
  if (r) return r;
  const blocked = operationBlocked(s, a.location, op);
  if (blocked) return no(blocked);
  if (!a.escort.length) return no('A Escolta está vazia.');
  beginCombat(s, a, opSetup(s, a, a.location, op, 'director'));
  return ok();
}

/** Golpe: só com o Diretor presente. */
export function startCoup(s: GameState, a: Agency): Result {
  const r = directorReady(s, a);
  if (r) return r;
  if (!a.escort.length) return no('A Escolta está vazia.');
  const c = s.countries[a.location];
  if (c.couped) return no('O governo atual já é obra de uma agência.');
  beginCombat(s, a, {
    type: 'army',
    reason: { kind: 'coup', countryId: c.id },
    title: `Golpe em ${c.name}`,
    enemy: buildForce(s, 'military', operationStrength(s, a, c.id, 'coup'), 'army'),
    sources: [{ kind: 'escort' }],
    playerDefends: false,
    directorPresent: true,
  });
  return ok();
}

export const cancelPending = (s: GameState): Result => (abortPending(s) ? ok() : no('Este combate não pode ser evitado.'));

export { negotiateCost };

// ── Diretor ─────────────────────────────────────────────────

export function payRelease(s: GameState, a: Agency): Result {
  const d = a.director;
  if (d.status !== 'detained' && d.status !== 'kidnapped') return no('O Diretor está livre.');
  const price = d.price ?? 0;
  if (a.cash < price) return no('Caixa insuficiente.');
  a.cash -= price;
  const was = d.status;
  d.status = 'free';
  d.heldIn = undefined;
  d.price = undefined;
  d.releaseAt = undefined;
  notify(s, a, 'director', 'Diretor libertado', was === 'detained' ? `Fiança paga: ${money(price)}.` : `Resgate pago: ${money(price)}.`, 'good', a.location);
  return ok();
}

export function payArrears(s: GameState, a: Agency): Result {
  if (!a.arrears) return no('Nada em atraso.');
  if (a.cash < a.arrears) return no('Caixa insuficiente.');
  a.cash -= a.arrears;
  note(s, a, `Manutenção em atraso quitada: ${money(a.arrears)}. Máquinas de volta à ativa.`, 'good');
  a.arrears = 0;
  for (const u of [...a.fleet, ...a.escort, ...a.stations.flatMap((x) => x.units), ...a.teams.flatMap((t) => t.units)]) u.idle = false;
  for (const t of a.teams) if (t.freighter) t.freighter.idle = false;
  return ok();
}

// ── Equipes ─────────────────────────────────────────────────

function createTeam(s: GameState, a: Agency, location: string, units: Unit[]): Team {
  s.uidCounter += 1;
  const used = new Set(a.teams.map((t) => t.name));
  const base = TEAM_NAMES.find((n) => !used.has(`Equipe ${n}`)) ?? `${s.uidCounter}`;
  const team: Team = { id: `tm${s.uidCounter}`, name: `Equipe ${base}`, units: [...units], location, spoils: [] };
  a.teams.push(team);
  return team;
}

/** Destacar Unidades da Escolta (Diretor presente) ou de uma Estação numa Equipe. */
export function formTeam(s: GameState, a: Agency, from: 'escort' | { stationCountry: string }, uids: string[]): Result {
  if (s.over) return no('A partida acabou.');
  if (!uids.length) return no('Escolha ao menos uma Unidade.');
  if (from === 'escort') {
    const r = directorReady(s, a);
    if (r) return r;
    const units = a.escort.filter((u) => uids.includes(u.uid));
    if (units.length !== uids.length) return no('Unidade fora da Escolta.');
    a.escort = a.escort.filter((u) => !uids.includes(u.uid));
    const t = createTeam(s, a, a.location, units);
    return ok(`${t.name} formada com ${units.length} Unidade(s).`);
  }
  const st = stationIn(a, from.stationCountry);
  if (!st || st.interdicted) return no('Estação indisponível.');
  const units = st.units.filter((u) => uids.includes(u.uid));
  if (units.length !== uids.length) return no('Unidade fora da Estação.');
  st.units = st.units.filter((u) => !uids.includes(u.uid));
  const t = createTeam(s, a, st.countryId, units);
  return ok(`${t.name} formada com ${units.length} Unidade(s).`);
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
  if (s.over) return no('A partida acabou.');
  const t = a.teams.find((x) => x.id === teamId);
  if (!t) return no('Equipe não encontrada.');
  if (t.travel) return no('A Equipe já está em trânsito.');
  if (t.location === to) return no('A Equipe já está lá.');
  if (!t.units.length) return no('A Equipe está vazia.');
  if (mode === 'commercial') {
    if (!t.units.every(isPersonnel)) return no('Voo Comercial só leva Pessoal. Use um Cargueiro Destacado.');
    if (spoilsWeight(t) > COMMERCIAL_BAGGAGE_T + 1e-6)
      return no(`Voo Comercial aceita até ${COMMERCIAL_BAGGAGE_T} t de itens capturados. Use um Cargueiro Destacado.`);
    const fare = commercialFare(t, to);
    if (a.cash < fare) return no('Caixa insuficiente para as passagens.');
    a.cash -= fare;
  } else if (!t.freighter) {
    if (a.flight || t.location !== a.location) return no('Só dá para destacar um cargueiro onde a Frota está pousada.');
    const f = pickFreighter(a, t);
    if (!f) return no('Nenhum cargueiro livre com capacidade para a Equipe.');
    if (a.fleet.length <= 1) return no('O Diretor precisa manter ao menos um cargueiro.');
    a.fleet = a.fleet.filter((u) => u !== f);
    t.freighter = f;
    note(s, a, `${f.name} destacado da Frota para levar a ${t.name}.`, 'info');
  }
  if (t.freighter && unitsWeight(t.units) + spoilsWeight(t) > def(t.freighter.itemId).weight + 1e-6)
    return no('O Cargueiro Destacado não comporta a Equipe e os itens.');
  const hours = teamFlightHours(a, t, to, mode);
  t.travel = { from: t.location, to, depart: s.time, arrive: s.time + hours, mode };
  // Depois de sair do lugar, o Receptador já não aceita.
  for (const l of t.spoils) l.fresh = false;
  return ok(`${t.name} a caminho de ${s.countries[to].name}.`);
}

export function teamOperation(s: GameState, a: Agency, teamId: string, op: OperationKind): Result {
  if (s.over) return no('A partida acabou.');
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no('Equipe indisponível.');
  const blocked = operationBlocked(s, t.location, op);
  if (blocked) return no(blocked);
  beginCombat(s, a, opSetup(s, a, t.location, op, t));
  return ok();
}

/** Equipe ataca o grupo hostil (caça/resgate) no país onde está. */
export function teamAttackGroup(s: GameState, a: Agency, teamId: string): Result {
  if (s.over) return no('A partida acabou.');
  const t = a.teams.find((x) => x.id === teamId);
  const g = s.group;
  if (!t || t.travel) return no('Equipe indisponível.');
  if (!g || g.defeated || g.countryId !== t.location) return no('O grupo não está aqui.');
  beginCombat(s, a, {
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
export function teamRescue(s: GameState, a: Agency, teamId: string): Result {
  if (s.over) return no('A partida acabou.');
  const t = a.teams.find((x) => x.id === teamId);
  const d = a.director;
  if (!t || t.travel) return no('Equipe indisponível.');
  if ((d.status !== 'kidnapped' && d.status !== 'detained') || d.heldIn !== t.location) return no('O Diretor não está preso aqui.');
  const c = s.countries[t.location];
  if (d.status === 'detained') addReputation(a, t.location, -15);
  beginCombat(s, a, {
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
export function mergeTeam(s: GameState, a: Agency, teamId: string, into: 'escort' | 'station'): Result {
  if (s.over) return no('A partida acabou.');
  const t = a.teams.find((x) => x.id === teamId);
  if (!t || t.travel) return no('Equipe indisponível.');
  if (into === 'escort') {
    if (!directorAt(a, t.location)) return no('O Diretor não está neste país.');
    a.escort.push(...t.units);
    if (t.freighter) a.fleet.push(t.freighter);
    // O Diretor recebe em mãos o que a Equipe ainda carrega.
    for (const lot of t.spoils) addCargo(a, lot.itemId, lot.qty, lot.paidEach);
  } else {
    const st = stationIn(a, t.location);
    if (!st || st.interdicted) return no('Não há Estação operante aqui.');
    if (t.spoils.length) return no('Antes, decida o destino dos itens capturados (Receptador ou Cofre).');
    const spec = STATIONS[st.level];
    if (st.units.length + t.units.length > spec.capacity) return no(`Capacidade da ${spec.name} esgotada.`);
    if (!t.units.every((u) => spec.allows.includes(def(u.itemId).cls))) return no(`A ${spec.name} não abriga todas as Unidades.`);
    if (t.freighter && !directorAt(a, t.location))
      return no('O Cargueiro Destacado precisa voltar à Frota: reintegre onde está o Diretor.');
    st.units.push(...t.units);
    if (t.freighter) a.fleet.push(t.freighter);
  }
  a.teams = a.teams.filter((x) => x !== t);
  return ok(`${t.name} reintegrada.`);
}
