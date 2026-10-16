// Unidades, Estações, Ameaças, Equipes e Operações das rivais — sempre pelas funções do motor (E).
import { bribeChance, commercialFare, operationBlocked, operationStrength, reactionCost, recruitPrice, stationCost } from '../actions';
import { ITEMS } from '../data/items';
import { STATIONS } from '../data/rules';
import { buyPrice } from '../market';
import { chance, rand, weighted } from '../rng';
import { allUnits, directorAt, postureIn, standing, stationIn, travelKm } from '../state';
import type { Agency, CombatType, GameState, OperationKind, Station, Team, Unit } from '../types';
import { canFight, def, isPersonnel, strOf } from '../units';
import { E } from './engine';
import { money, news } from './memory';
import { calm } from './profiles';
import type { DifficultyProfile, Personality } from './profiles';
import type { RivalMemory, TeamOrder } from './types';

export interface Ctx {
  s: GameState;
  a: Agency;
  mem: RivalMemory;
  P: Personality;
  D: DifficultyProfile;
  spendable: number;
}

/** Força somada de um grupo de Unidades num tipo de Combate. */
export const power = (units: Unit[], type: CombatType) =>
  units.filter((u) => canFight(u, type)).reduce((x, u) => x + strOf(u, type), 0);

const OP_TYPE: Record<OperationKind, CombatType> = { bank: 'urban', tech: 'urban', neutralize: 'army' };

/** Folga de força exigida antes de atacar: a IA afiada só entra com vantagem clara; a Recruta se arrisca. */
const margin = (ctx: Ctx) => 0.95 + 0.55 * ctx.D.quality + (rand(ctx.s) - 0.5) * 0.4 * (1 - ctx.D.quality);

// ── Ameaças contra a própria rival ──────────────────────────

export function handleThreats(ctx: Ctx) {
  const { s, a } = ctx;
  for (const t of a.threats) {
    if (t.cancelled || t.reactions.length) continue;
    const st = stationIn(a, t.countryId);
    const type: CombatType = t.kind === 'lawsuit' ? 'legal' : t.kind === 'military' ? 'army' : 'urban';
    const defense =
      t.target === 'station' && st
        ? power(st.units, type) + STATIONS[st.level].fort[type]
        : directorAt(a, t.countryId)
          ? power(a.escort, type)
          : Infinity;
    if (defense >= t.strength * margin(ctx)) continue;
    const bribe = reactionCost(s, a, t.id, 'bribe');
    const options: ['bribe' | 'lawyers' | 'reinforce' | 'evacuate', number][] = [];
    if (bribe <= ctx.spendable * 0.4 && bribeChance(a, t.id) >= 0.5) options.push(['bribe', bribeChance(a, t.id) * 2]);
    if ((t.kind === 'raid' || t.kind === 'lawsuit') && reactionCost(s, a, t.id, 'lawyers') <= ctx.spendable * 0.3) options.push(['lawyers', 1]);
    if (t.target === 'station' && reactionCost(s, a, t.id, 'reinforce') <= ctx.spendable * 0.3) options.push(['reinforce', 1.2]);
    if (t.target === 'station' && st?.units.length && defense < t.strength * 0.6) options.push(['evacuate', 0.5]);
    if (!options.length) continue;
    const reaction = weighted(s, options);
    const cost = reactionCost(s, a, t.id, reaction);
    if (E.react(s, a, t.id, reaction).ok) ctx.spendable = Math.max(0, ctx.spendable - cost);
  }
}

// ── Estações (o Diretor rival está pousado em a.location) ───

const maxStations = (ctx: Ctx) => Math.round(2 + ctx.P.stations * 4 * (0.5 + ctx.D.aggression / 2));

export function manageStationHere(ctx: Ctx) {
  const { s, a, P } = ctx;
  const here = a.location;
  const c = s.countries[here];
  const st = stationIn(a, here);
  if (st?.interdicted) {
    if (st.interdicted.fine <= ctx.spendable * 0.5 && E.payFine(s, a, here).ok) {
      ctx.spendable -= st.interdicted?.fine ?? 0;
      news(s, a, `pagou a multa e reabriu a Estação em ${c.name}.`, 'intel', here);
    }
    return;
  }
  if (!st) {
    if (a.stations.length >= maxStations(ctx) || c.level < 2 || postureIn(a, here) === 'enemy') return;
    const cost = stationCost(a, here, 1);
    if (cost > ctx.spendable * 0.35 * P.stations) return;
    if (E.openStation(s, a).ok) {
      ctx.spendable -= cost;
      news(s, a, `abriu uma Célula em ${c.name}.`, 'intel', here);
    }
    return;
  }
  const top = P.stations >= 1 ? 5 : P.stations >= 0.7 ? 4 : 3;
  if (st.level >= top || st.level > c.level) return;
  const next = (st.level + 1) as Station['level'];
  const cost = stationCost(a, here, next);
  if (cost > ctx.spendable * 0.3 * P.stations) return;
  if (E.upgradeStation(s, a).ok) {
    ctx.spendable -= cost;
    news(s, a, `transformou a Estação em ${c.name} num ${STATIONS[next].name}.`, 'intel', here);
  }
}

// ── Unidades ────────────────────────────────────────────────

const LAWYERS = ['lawyer3', 'lawyer2', 'lawyer1'];

/** Contrata Pessoal onde o Diretor está: compra no mercado e alista, ou contrata advogados/agentes. */
export function hireHere(ctx: Ctx) {
  const { s, a, P, D } = ctx;
  const c = s.countries[a.location];
  // Plantel desejado: Escolta da personalidade + guarnição de cada Estação (+ quem está em Equipe).
  const garrison = a.stations.reduce((x, st) => x + Math.min(STATIONS[st.level].capacity, st.level + 1), 0);
  const want = Math.round(P.escort * (0.6 + 0.4 * D.aggression)) + garrison;
  let fighters = allUnits(a).filter((u) => def(u.itemId).cls === 'human').length;
  let guard = 0;
  while (fighters < want && guard++ < 2) {
    // Melhor força urbana por dólar entre o Pessoal à venda aqui.
    const offers = c.stock
      .filter((id) => ITEMS[id].cls === 'human' && ITEMS[id].fieldable)
      .map((id) => ({ id, price: buyPrice(c, id) }))
      .filter((o) => o.price <= ctx.spendable * 0.15)
      .sort((x, y) => ITEMS[y.id].str.urban * P.military - ITEMS[x.id].str.urban * P.military || x.price - y.price);
    const o = offers[0];
    if (!o) break;
    if (!E.buy(s, a, o.id, 1).ok || !E.enlist(s, a, o.id).ok) break;
    ctx.spendable -= o.price;
    fighters++;
  }
  // Ao menos um advogado: segura batidas e processos.
  const hasLawyer = [...a.escort, ...a.stations.flatMap((x) => x.units)].some((u) => def(u.itemId).cls === 'lawyer');
  if (!hasLawyer) {
    for (const id of LAWYERS) {
      const price = recruitPrice(c.id, id);
      if (price > ctx.spendable * 0.1) continue;
      if (E.recruit(s, a, id).ok) {
        ctx.spendable -= price;
        break;
      }
    }
  }
}

/** Deixa parte da Escolta como Unidades de Estação onde o Diretor está. */
export function garrisonHere(ctx: Ctx) {
  const { s, a } = ctx;
  const st = stationIn(a, a.location);
  if (!st || st.interdicted) return;
  const spec = STATIONS[st.level];
  const target = Math.min(spec.capacity, st.level + 1);
  const keep = Math.max(2, Math.round(ctx.P.escort / 2));
  const movable = a.escort
    .filter((u) => spec.allows.includes(def(u.itemId).cls) && !u.injury)
    .sort((x, y) => strOf(x, 'urban') - strOf(y, 'urban'));
  while (st.units.length < target && a.escort.length > keep && movable.length) {
    const u = movable.shift()!;
    if (!E.transferUnit(s, a, u.uid, 'station').ok) break;
  }
}

/** Conserta máquinas Danificadas onde há Estação Escritório+. */
export function repairHere(ctx: Ctx) {
  const { s, a } = ctx;
  const st = stationIn(a, a.location);
  if (!st || st.level < 3) return;
  for (const u of [...a.fleet, ...a.escort, ...st.units]) {
    if (u.injury?.kind === 'damaged' && def(u.itemId).price * 0.15 <= ctx.spendable * 0.2) E.repair(s, a, u.uid);
  }
}

// ── Equipes e ordens ────────────────────────────────────────

const teamOf = (a: Agency, id: string) => a.teams.find((t) => t.id === id);

function moveTeam(ctx: Ctx, t: Team, to: string): boolean {
  if (t.location === to) return true;
  if (!t.units.every(isPersonnel)) return false;
  if (commercialFare(t, to) > ctx.spendable) return false;
  const r = E.sendTeam(ctx.s, ctx.a, t.id, to, 'commercial');
  if (r.ok) ctx.spendable -= commercialFare(t, to);
  return r.ok;
}

/** Destino das Equipes sem ordem: reintegrar na Estação mais próxima, ou na Escolta. */
function parkTeam(ctx: Ctx, t: Team) {
  const { s, a } = ctx;
  for (const lot of [...t.spoils]) {
    const st = stationIn(a, t.location);
    if (!(st && !st.interdicted && E.stashSpoils(s, a, t.id).ok)) E.fenceSpoils(s, a, t.id, lot.lid);
  }
  if (E.mergeTeam(s, a, t.id, 'station').ok || E.mergeTeam(s, a, t.id, 'escort').ok) return;
  const home = a.stations
    .filter((st) => !st.interdicted && st.units.length + t.units.length <= STATIONS[st.level].capacity)
    .sort((x, y) => travelKm(t.location, x.countryId) - travelKm(t.location, y.countryId))[0];
  const to = home?.countryId ?? (a.flight ? undefined : a.location);
  if (to && to !== t.location) moveTeam(ctx, t, to);
}

function executeOrder(ctx: Ctx, o: TeamOrder, t: Team): void {
  const { s, a } = ctx;
  const c = s.countries[o.countryId];
  const before = a.stats.combatsWon;
  if (o.kind === 'rescue') {
    E.teamRescue(s, a, t.id);
    return;
  }
  if (o.kind === 'sabotage' || o.kind === 'vault') {
    const fn = o.kind === 'sabotage' ? E.sabotageStation : E.raidVault;
    const target = s.agencies.find((x) => x.id === o.targetId);
    if (!fn || !target) return;
    const r = fn(s, a, t.id, target.id);
    if (r.ok) {
      ctx.mem.lastStrikeAt = s.time;
      const won = a.stats.combatsWon > before;
      const what = o.kind === 'sabotage' ? 'sabotar a Estação' : 'roubar o Cofre';
      news(s, a, `${won ? 'conseguiu' : 'tentou'} ${what} de ${target.name} em ${c.name}.`, won ? 'bad' : 'warn', c.id);
    }
    return;
  }
  const r = E.teamOperation(s, a, t.id, o.kind);
  if (!r.ok) return;
  const won = a.stats.combatsWon > before;
  const label = o.kind === 'bank' ? 'um roubo a banco' : o.kind === 'tech' ? 'um roubo de tecnologia' : 'uma Neutralização';
  news(s, a, `${won ? 'executou' : 'fracassou em'} ${label} em ${c.name}.`, won ? 'warn' : 'intel', c.id);
}

/** Avança as ordens das Equipes; Equipes ociosas voltam para casa. */
export function runTeams(ctx: Ctx) {
  const { s, a, mem } = ctx;
  mem.orders = mem.orders.filter((o) => teamOf(a, o.teamId) && s.time < o.expires);
  for (const t of [...a.teams]) {
    if (t.travel || !a.teams.includes(t)) continue;
    const o = mem.orders.find((x) => x.teamId === t.id);
    if (!o) {
      parkTeam(ctx, t);
      continue;
    }
    if (t.location !== o.countryId) {
      if (!moveTeam(ctx, t, o.countryId)) mem.orders = mem.orders.filter((x) => x !== o);
      continue;
    }
    mem.orders = mem.orders.filter((x) => x !== o);
    executeOrder(ctx, o, t);
  }
}

/** Monta uma Equipe de Pessoal capaz de `need` de força em `type`, da Escolta (Diretor pousado) ou de uma Estação. */
function assemble(ctx: Ctx, type: CombatType, need: number): Team | undefined {
  const { s, a } = ctx;
  const pickFrom = (units: Unit[], keep: number) => {
    const ready = units.filter((u) => isPersonnel(u) && canFight(u, type)).sort((x, y) => strOf(y, type) - strOf(x, type));
    const chosen: Unit[] = [];
    let total = 0;
    for (const u of ready) {
      if (total >= need || units.length - chosen.length <= keep || chosen.length >= 6) break;
      chosen.push(u);
      total += strOf(u, type);
    }
    return total >= need ? chosen : undefined;
  };
  const sources: ('escort' | { stationCountry: string })[] = [];
  if (!a.flight && a.director.status === 'free') sources.push('escort');
  for (const st of a.stations) if (!st.interdicted) sources.push({ stationCountry: st.countryId });
  for (const from of sources) {
    const units = from === 'escort' ? a.escort : stationIn(a, from.stationCountry)!.units;
    const chosen = pickFrom(units, from === 'escort' ? 1 : 0);
    if (!chosen) continue;
    const ids = new Set(a.teams.map((t) => t.id));
    if (!E.formTeam(s, a, from, chosen.map((u) => u.uid)).ok) continue;
    return a.teams.find((t) => !ids.has(t.id));
  }
  return undefined;
}

/** Valor esperado de uma Operação Especial num país, pela ótica da personalidade. */
function opValue(s: GameState, a: Agency, P: Personality, countryId: string, op: OperationKind): number {
  const c = s.countries[countryId];
  if (operationBlocked(s, countryId, op)) return 0;
  // Não suja o próprio quintal: Operações derrubam a Reputação onde há Estação.
  const home = stationIn(a, countryId) ? 0.3 : 1;
  const heat = 1 - standing(a, countryId).exposure / 120;
  const base = op === 'bank' ? c.level * 450_000 : op === 'tech' ? [300_000, 900_000, 2_800_000, 5_500_000, 24_000_000][c.level - 1] * 0.45 : 1_200_000;
  return base * P.ops[op] * home * heat;
}

/** Chance por decisão de iniciar uma ação militar, já com a Dificuldade. */
const actChance = (ctx: Ctx, w: number) => Math.min(0.9, w * ctx.D.aggression * 0.35);

/** Maior força de Pessoal que a rival consegue destacar numa Equipe agora. */
function available(ctx: Ctx, type: CombatType): number {
  const { a } = ctx;
  const pools: Unit[][] = a.stations.filter((st) => !st.interdicted).map((st) => st.units);
  if (!a.flight && a.director.status === 'free') pools.push(a.escort.slice(1));
  return Math.max(0, ...pools.map((units) => power(units.filter(isPersonnel), type)));
}

/** Operação Especial contra um país, escolhida entre as que a força disponível consegue. O(países). */
export function planOperation(ctx: Ctx) {
  const { s, a, mem, P } = ctx;
  if (mem.orders.length >= (ctx.D.aggression >= 1 ? 2 : 1)) return;
  // Operações sobem a Tensão Global: perto do Topo as prudentes param.
  if (!chance(s, actChance(ctx, P.operations) * (1 - calm(P, s.tension)))) return;
  const slack = margin(ctx);
  const can = { urban: available(ctx, 'urban'), army: available(ctx, 'army') } as Record<CombatType, number>;
  let best: { id: string; op: OperationKind; v: number; need: number } | undefined;
  for (const id of Object.keys(s.countries)) {
    if (rand(s) > 0.3 + 0.7 * ctx.D.quality) continue;
    for (const op of ['bank', 'tech', 'neutralize'] as OperationKind[]) {
      const need = operationStrength(s, a, id, op) * slack;
      if (need > can[OP_TYPE[op]]) continue;
      const v = opValue(s, a, P, id, op) / (1 + travelKm(a.location, id) / 5000);
      if (v > 0 && (!best || v > best.v)) best = { id, op, v, need };
    }
  }
  if (!best) return;
  const team = assemble(ctx, OP_TYPE[best.op], best.need);
  if (!team) return;
  mem.orders.push({ teamId: team.id, countryId: best.id, kind: best.op, expires: s.time + 24 * 12 });
}

/** Rancor acima disto não deixa a rival mais furiosa: evita guerras de retaliação sem fim entre rivais. */
const FURY_CAP = 3;
/** Espera base entre ações hostis, sem rancor (horas). */
const STRIKE_COOLDOWN_H = 24 * 20;

type StrikeKind = 'sabotage' | 'vault' | 'denounce';

/** País onde a rival pode denunciar o alvo: ele tem Estação lá e ela tem olhos (Estação ou Diretor). */
function denounceSpot(a: Agency, target: Agency): string | undefined {
  const st = target.stations.find((x) => !x.interdicted && (stationIn(a, x.countryId) || directorAt(a, x.countryId)));
  if (st) return st.countryId;
  return !target.flight && directorAt(a, target.location) ? target.location : undefined;
}

/** Ações hostis que a rival consegue tentar contra o alvo agora, com o peso da personalidade. */
function strikeOptions(a: Agency, P: Personality, target: Agency): [StrikeKind, number][] {
  const open = target.stations.filter((st) => !st.interdicted);
  const out: [StrikeKind, number][] = [];
  if (E.sabotageStation && open.length) out.push(['sabotage', P.strikes.sabotage]);
  if (E.raidVault && open.some((st) => st.vault.length)) out.push(['vault', P.strikes.vault]);
  if (E.denounce && denounceSpot(a, target)) out.push(['denounce', P.strikes.denounce]);
  return out.filter(([, w]) => w > 0);
}

/** Ação contra outra agência (o jogador incluído): sabotagem, roubo de Cofre ou denúncia. O(agências × Estações). */
export function planStrike(ctx: Ctx) {
  const { s, a, mem, P } = ctx;
  const rage = (id: string) => Math.min(FURY_CAP, mem.grudge[id] ?? 0);
  const candidates = s.agencies
    .filter((x) => x.id !== a.id && x.director.status !== 'dead')
    .map((x) => ({ x, options: strikeOptions(a, P, x) }))
    .filter((c) => c.options.length);
  if (!candidates.length) return;
  const fury = Math.max(0, ...candidates.map((c) => rage(c.x.id)));
  // Retaliação: rancor encurta a espera e aumenta a vontade, até um teto.
  if (s.time - mem.lastStrikeAt < STRIKE_COOLDOWN_H / (1 + 0.5 * fury)) return;
  if (!chance(s, actChance(ctx, P.hostility * (1 + 0.3 * fury)))) return;

  // O jogador é o adversário principal; quem agrediu a rival vem logo atrás.
  const { x: target, options } = weighted(
    s,
    candidates.map((c) => [c, (c.x.isPlayer ? 2 : 0.6) + rage(c.x.id) * 1.5] as [(typeof candidates)[number], number]),
  );
  const kind = weighted(s, options);
  const settle = () => {
    mem.lastStrikeAt = s.time;
    mem.grudge[target.id] = Math.max(0, (mem.grudge[target.id] ?? 0) - 2);
    if (!mem.grudge[target.id]) delete mem.grudge[target.id];
  };

  if (kind === 'denounce') {
    const countryId = denounceSpot(a, target)!;
    if (E.denounce!(s, a, target.id, countryId).ok) {
      settle();
      news(s, a, `denunciou ${target.name} às autoridades de ${s.countries[countryId].name}.`, 'warn', countryId);
    }
    return;
  }
  const st = target.stations
    .filter((x) => !x.interdicted && (kind !== 'vault' || x.vault.length))
    .sort((x, y) => x.level - y.level)[0];
  if (!st) return;
  // Como o motor resolve: as Unidades da Estação alvo, ou segurança equivalente ao fort ×3 se ela está vazia.
  const guard = st.units.length ? power(st.units, 'urban') : STATIONS[st.level].fort.urban * 3;
  const need = Math.max(guard, 1) * margin(ctx);
  const team = assemble(ctx, 'urban', need);
  if (!team) return;
  settle();
  mem.orders.push({ teamId: team.id, countryId: st.countryId, kind, targetId: target.id, expires: s.time + 24 * 10 });
}

/** Diretor Sequestrado ou Detido: paga se der, ou manda uma Equipe. */
export function handleCapture(ctx: Ctx) {
  const { s, a, mem } = ctx;
  const d = a.director;
  if (d.status !== 'kidnapped' && d.status !== 'detained') return;
  const price = d.price ?? 0;
  if (price <= a.cash * 0.7) {
    if (E.payRelease(s, a).ok) news(s, a, `pagou ${money(price)} para libertar o próprio Diretor.`, 'intel', d.heldIn);
    return;
  }
  if (d.status !== 'kidnapped' || !d.heldIn || mem.orders.some((o) => o.kind === 'rescue')) return;
  const c = s.countries[d.heldIn];
  const team = assemble(ctx, 'urban', (8 + c.level * 4) * margin(ctx));
  if (team) mem.orders.push({ teamId: team.id, countryId: d.heldIn, kind: 'rescue', expires: s.time + 24 * 15 });
}

export { money };
