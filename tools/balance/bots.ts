// Bots jogadores do balanceamento. Só usam as ações públicas do motor (src/game/actions.ts,
// combatFlow.chooseTactic) — as mesmas que a interface chama. Nada aqui muda regras.
import * as A from '../../src/game/actions';
import { cargoQty } from '../../src/game/cargo';
import { ITEMS } from '../../src/game/data/items';
import { freeCargo, interested, quoteBuy, quoteSell, saturationStep } from '../../src/game/market';
import { player, postureIn, standing, stationIn } from '../../src/game/state';
import type { Agency, GameState, OperationKind, Tactic } from '../../src/game/types';
import { estimateWin } from '../../src/game/combat';
import { def } from '../../src/game/units';

export type BotId = 'guloso' | 'estacoes' | 'operador' | 'passivo' | 'aleatorio' | 'iniciante';
export const BOT_IDS: BotId[] = ['guloso', 'estacoes', 'operador', 'passivo', 'aleatorio', 'iniciante'];
export const BOT_LABEL: Record<BotId, string> = {
  guloso: 'Comerciante guloso',
  estacoes: 'Construtor de Estações',
  operador: 'Operador agressivo',
  passivo: 'Passivo',
  aleatorio: 'Aleatório',
  iniciante: 'Iniciante razoável',
};

export type Rng = () => number;

export function botRng(seed: number): Rng {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Bot {
  id: BotId;
  /** Decide e age (só quando nada bloqueia o relógio). */
  act(s: GameState, a: Agency, r: Rng): void;
  /** Tática para um Combate pendente, dada a Prévia. */
  tactic(s: GameState, preview: Record<Tactic, number>, r: Rng): Tactic | 'abort';
}

// ── Utilidades ──────────────────────────────────────────────

const onGround = (a: Agency) => a.director.status === 'free' && !a.flight;
const negotiateOk = (s: GameState, a: Agency) =>
  !!s.pendingCombat && a.cash >= A.negotiateCost(s, s.pendingCombat.setup) * 3;

/** Melhor Tática pela Prévia (Negociar só se sobra caixa). */
export function bestTactic(s: GameState, preview: Record<Tactic, number>): Tactic {
  const a = player(s);
  const opts: Tactic[] = ['assault', 'defensive', 'infiltration'];
  if (negotiateOk(s, a)) opts.push('negotiate');
  return opts.reduce((b, t) => (preview[t] > preview[b] ? t : b), opts[0]);
}

type PriceView = 'true' | 'seen';

/** Receita estimada de vender k unidades em `dest` (vista verdadeira ou o último preço visto). */
function estSell(s: GameState, a: Agency, dest: string, itemId: string, k: number, view: PriceView): number {
  const c = s.countries[dest];
  if (view === 'true') return quoteSell(c, itemId, k).total;
  if (!interested(c, def(itemId))) return 0;
  const seen = standing(a, dest).seen;
  const mid = seen?.prices[itemId];
  if (!mid || s.time - seen!.at > 24 * 25) return 0;
  const step = saturationStep(c, itemId);
  let total = 0;
  for (let i = 0; i < k; i++) total += mid * 0.94 * Math.max(0.4, 1 - step * i);
  return total;
}

interface TradePlan {
  itemId: string;
  qty: number;
  dest: string;
  profit: number;
  score: number;
}

/** Arbitragem: compra aqui o que mais rende por hora de voo em outro mercado. */
export function planTrade(s: GameState, a: Agency, view: PriceView, budgetShare = 0.9, reserve = 0): TradePlan | undefined {
  const here = s.countries[a.location];
  const cash = Math.max(0, a.cash * budgetShare - reserve);
  const space = freeCargo(a);
  let best: TradePlan | undefined;
  for (const itemId of here.stock) {
    const it = ITEMS[itemId];
    if (!it?.tradable || it.wmd) continue;
    const maxBySpace = Math.floor(space / Math.max(0.01, it.weight));
    const unit = quoteBuy(here, itemId, 1).total;
    const maxByCash = Math.floor(cash / Math.max(1, unit));
    const cap = Math.min(maxBySpace, maxByCash, 60);
    if (cap <= 0) continue;
    for (const dest of Object.keys(s.countries)) {
      if (dest === a.location) continue;
      const sell1 = estSell(s, a, dest, itemId, 1, view);
      if (sell1 <= unit * 1.03) continue;
      // Quantidade: cresce enquanto a unidade marginal ainda dá lucro (Saturação nos dois lados).
      let k = 0;
      let buyTot = 0;
      let sellTot = 0;
      for (let q = 1; q <= cap; q++) {
        const b = quoteBuy(here, itemId, q).total;
        const sl = estSell(s, a, dest, itemId, q, view);
        if (b > cash) break;
        if (sl - b <= sellTot - buyTot) break;
        k = q;
        buyTot = b;
        sellTot = sl;
      }
      if (!k) continue;
      const profit = sellTot - buyTot;
      const hours = A.flightHours(a, dest);
      const score = profit / (hours + 8);
      if (!best || score > best.score) best = { itemId, qty: k, dest, profit, score };
    }
  }
  return best;
}

/** Vende a Carga aqui quando este mercado está perto do melhor conhecido (ou já dá lucro bom). */
export function sellHere(s: GameState, a: Agency, view: PriceView) {
  const here = s.countries[a.location];
  for (const lot of [...a.cargo]) {
    const qty = lot.qty;
    const local = quoteSell(here, lot.itemId, qty).total;
    if (local <= 0) continue;
    let bestElsewhere = 0;
    for (const dest of Object.keys(s.countries)) {
      if (dest === a.location) continue;
      bestElsewhere = Math.max(bestElsewhere, estSell(s, a, dest, lot.itemId, qty, view));
    }
    const paid = lot.paidEach * qty;
    if (local >= bestElsewhere * 0.92 || local >= paid * 1.25) A.sell(s, a, lot.itemId, qty);
  }
}

/** Destino para a Carga que sobrou: onde ela vale mais. */
function bestCargoDest(s: GameState, a: Agency, view: PriceView): string | undefined {
  let best: { dest: string; v: number } | undefined;
  for (const dest of Object.keys(s.countries)) {
    if (dest === a.location) continue;
    let v = 0;
    for (const lot of a.cargo) v += estSell(s, a, dest, lot.itemId, lot.qty, view);
    v /= A.flightHours(a, dest) + 8;
    if (v > 0 && (!best || v > best.v)) best = { dest, v };
  }
  return best?.dest;
}

function deliverContracts(s: GameState, a: Agency) {
  for (const k of s.contracts.filter((x) => x.status === 'accepted' && x.agencyId === a.id && x.countryId === a.location)) {
    A.deliverContract(s, a, k.id);
  }
}

/** Aceita Contratos cujo item está à venda aqui por bem menos que o prêmio. */
function takeContracts(s: GameState, a: Agency) {
  const here = s.countries[a.location];
  for (const k of s.contracts.filter((x) => x.status === 'offered')) {
    if (!here.stock.includes(k.itemId)) continue;
    const cost = quoteBuy(here, k.itemId, k.qty).total;
    if (cost < k.reward * 0.8 && cost < a.cash * 0.5 && ITEMS[k.itemId].weight * k.qty <= freeCargo(a)) {
      if (A.acceptContract(s, a, k.id).ok) A.buy(s, a, k.itemId, k.qty);
    }
  }
}

function pendingContractDest(s: GameState, a: Agency): string | undefined {
  const k = s.contracts.find((x) => x.status === 'accepted' && x.agencyId === a.id && cargoQty(a, x.itemId) >= x.qty);
  return k?.countryId;
}

/** Diretor preso, atrasos, multas: paga quando dá. */
function housekeeping(s: GameState, a: Agency, reserve: number) {
  if (a.director.status === 'detained' || a.director.status === 'kidnapped') {
    if (a.cash >= (a.director.price ?? 0)) A.payRelease(s, a);
  }
  if (a.arrears && a.cash > a.arrears) A.payArrears(s, a);
  for (const st of a.stations) if (st.interdicted && a.cash > st.interdicted.fine + reserve) A.payFine(s, a, st.countryId);
}

/** Reação às Ameaças: foge do que mira o Diretor; na Estação, suborna ou reforça se couber no caixa. */
function handleThreats(s: GameState, a: Agency, style: 'cautious' | 'cheap') {
  for (const t of a.threats) {
    if (t.cancelled) continue;
    if (t.target === 'station') {
      const tries: ('bribe' | 'reinforce' | 'lawyers')[] = style === 'cautious' ? ['bribe', 'reinforce', 'lawyers'] : ['reinforce'];
      for (const re of tries) {
        if (t.reactions.includes(re) || !A.reactionAvailable(a, t.id, re)) continue;
        const cost = A.reactionCost(s, a, t.id, re);
        if (cost < a.cash * 0.12) {
          A.react(s, a, t.id, re);
          if (re === 'bribe' && a.threats.find((x) => x.id === t.id)?.cancelled) break;
        }
      }
    }
  }
}

// ── Caçada (Objetivos destroy/rescue) ───────────────────────

const ESCORT_BUY = ['commando', 'swat', 'soldier'];

function escortArmy(a: Agency): number {
  return a.escort.filter((u) => !u.injury).reduce((x, u) => x + u.hp.army, 0);
}

/** Reforça a Escolta com o que o mercado local vende, até `target` de força Militar. */
function buildEscort(s: GameState, a: Agency, target: number, reserve: number) {
  const here = s.countries[a.location];
  for (const id of ESCORT_BUY) {
    while (escortArmy(a) < target && here.stock.includes(id)) {
      const q = quoteBuy(here, id, 1).total;
      if (a.cash - q < reserve || def(id).weight > freeCargo(a)) break;
      if (!A.buy(s, a, id, 1).ok) break;
      if (!A.enlist(s, a, id).ok) break;
    }
  }
}

/** Chance de vencer o grupo hostil com a Escolta atual (o jogador vê a composição do grupo no dossiê). */
function huntOdds(s: GameState, a: Agency): number {
  const g = s.group!;
  const setup = {
    agencyId: a.id,
    type: 'army' as const,
    reason: { kind: 'group' as const, countryId: g.countryId, by: 'director' },
    title: '',
    enemy: g.units,
    player: a.escort,
    playerDefends: false,
    sources: [{ kind: 'escort' as const }],
    directorPresent: true,
  };
  return Math.max(...(['assault', 'infiltration', 'defensive'] as Tactic[]).map((t) => estimateWin(setup, t, 99, 40)));
}

/** Compra comandos/operadores aqui enquanto melhora a chance contra o grupo (até 9 combatentes). */
function armForHunt(s: GameState, a: Agency, reserve: number) {
  const here = s.countries[a.location];
  let odds = huntOdds(s, a);
  for (const id of ESCORT_BUY) {
    while (odds < 0.75 && here.stock.includes(id) && a.escort.filter((u) => !u.injury && u.hp.army > 0).length < 9) {
      const q = quoteBuy(here, id, 1).total;
      if (a.cash - q < reserve || def(id).weight > freeCargo(a)) break;
      if (!A.buy(s, a, id, 1).ok || !A.enlist(s, a, id).ok) break;
      odds = huntOdds(s, a);
    }
  }
  return odds;
}

/** Caçada: arma a Escolta e persegue o grupo quando há pista. Retorna true se agiu (viajou). */
function hunt(s: GameState, a: Agency, r: Rng): boolean {
  const g = s.group;
  if (!g || g.defeated) return false;
  const odds = armForHunt(s, a, 300_000);
  // Planta Células na região do grupo como olhos.
  if (!stationIn(a, a.location) && g.region.includes(s.countries[a.location].continent) && a.cash > 1_500_000) A.openStation(s, a);
  if (odds < 0.5) return false; // ainda fraco: comercia para pagar reforços
  if (g.seenAt && s.time - g.seenAt.at < 24 * 6) {
    if (g.seenAt.countryId !== a.location) return A.travel(s, a, g.seenAt.countryId).ok;
    return false;
  }
  const pool = Object.values(s.countries).filter((c) => g.region.includes(c.continent) && c.id !== a.location);
  return A.travel(s, a, pool[Math.floor(r() * pool.length)].id).ok;
}

const isHunt = (s: GameState) => s.options.preset.objective === 'destroy' || s.options.preset.objective === 'rescue';

// ── Bots ────────────────────────────────────────────────────

/** Ciclo de comércio comum: entrega, vende, compra, voa. */
function tradeTurn(s: GameState, a: Agency, r: Rng, view: PriceView, opts: { reserve: number; noise?: number }) {
  deliverContracts(s, a);
  sellHere(s, a, view);
  takeContracts(s, a);
  const plan = planTrade(s, a, view, 0.92, opts.reserve);
  let dest = pendingContractDest(s, a);
  if (plan && (!opts.noise || r() > opts.noise)) {
    A.buy(s, a, plan.itemId, plan.qty);
    dest ??= plan.dest;
  }
  dest ??= a.cargo.length ? bestCargoDest(s, a, view) : undefined;
  if (!dest) {
    // Nada a fazer aqui: vai a um mercado grande próximo para ver preços.
    const ids = Object.values(s.countries)
      .filter((c) => c.level >= 3 && c.id !== a.location)
      .map((c) => c.id);
    dest = ids[Math.floor(r() * ids.length)];
  }
  A.travel(s, a, dest);
}

const guloso: Bot = {
  id: 'guloso',
  act(s, a, r) {
    housekeeping(s, a, 0);
    if (!onGround(a)) return;
    tradeTurn(s, a, r, 'true', { reserve: 0 });
  },
  tactic: (s, p) => bestTactic(s, p),
};

const estacoes: Bot = {
  id: 'estacoes',
  act(s, a, r) {
    housekeeping(s, a, 200_000);
    handleThreats(s, a, 'cautious');
    if (!onGround(a)) return;
    if (isHunt(s) && hunt(s, a, r)) return;
    const c = s.countries[a.location];
    const reserve = 500_000;
    const st = stationIn(a, a.location);
    if (!st && c.level >= 2 && postureIn(a, c.id) !== 'enemy' && a.cash > A.stationCost(a, c.id, 1) * 2 + reserve) A.openStation(s, a);
    else if (st && !st.interdicted && st.level < 5) {
      const next = (st.level + 1) as 2 | 3 | 4 | 5;
      if (a.cash > A.stationCost(a, c.id, next) * 1.6 + reserve) A.upgradeStation(s, a);
    }
    // Uma Unidade barata para não deixar a Estação só com as defesas fixas.
    const here = stationIn(a, a.location);
    if (here && !here.units.length) {
      const u = a.escort.find((x) => def(x.itemId).cls === 'human');
      if (u && a.escort.length > 2) A.transferUnit(s, a, u.uid, 'station');
    }
    tradeTurn(s, a, r, 'seen', { reserve });
  },
  tactic: (s, p) => bestTactic(s, p),
};

const OPS: OperationKind[] = ['bank', 'tech', 'neutralize'];

const operador: Bot = {
  id: 'operador',
  act(s, a, r) {
    housekeeping(s, a, 0);
    for (const t of a.teams) {
      for (const lot of [...t.spoils]) A.fenceSpoils(s, a, t.id, lot.lid);
    }
    if (!onGround(a)) return;
    if (isHunt(s) && hunt(s, a, r)) return;
    // Escolta de choque: comandos e operadores táticos.
    const c = s.countries[a.location];
    buildEscort(s, a, 14 + s.options.difficulty * 4, 1_000_000);
    if (a.escort.some((u) => !u.injury)) {
      if (!A.operationBlocked(s, c.id, 'bank') && c.level >= 2 && r() < 0.7) {
        if (A.startOperation(s, a, 'bank').ok) return;
      }
      const op = OPS[Math.floor(r() * OPS.length)];
      if (r() < 0.35 && A.startOperation(s, a, op).ok) return;
      if (r() < 0.06 && a.stats.coups < 3 && A.startCoup(s, a).ok) return;
    }
    tradeTurn(s, a, r, 'seen', { reserve: 600_000 });
  },
  tactic(s, p) {
    const pend = s.pendingCombat!;
    const t = bestTactic(s, p);
    // Operação/Golpe com chance ruim: o operador ainda arrisca a partir de 45%.
    const kind = pend.setup.reason.kind;
    if ((kind === 'operation' || kind === 'coup') && p[t] < 0.45) return 'abort';
    return t;
  },
};

const passivo: Bot = {
  id: 'passivo',
  act() {},
  tactic: () => 'defensive',
};

const aleatorio: Bot = {
  id: 'aleatorio',
  act(s, a, r) {
    const pick = <T>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(r() * arr.length)] : undefined);
    const ids = Object.keys(s.countries);
    const here = s.countries[a.location];
    const roll = r();
    if (roll < 0.25) A.travel(s, a, pick(ids)!);
    else if (roll < 0.45) {
      const it = pick(here.stock);
      if (it) A.buy(s, a, it, 1 + Math.floor(r() * 6));
    } else if (roll < 0.65) {
      const lot = pick(a.cargo);
      if (lot) A.sell(s, a, lot.itemId, Math.max(1, Math.floor(lot.qty * r())));
    } else if (roll < 0.69) A.openStation(s, a);
    else if (roll < 0.71) A.upgradeStation(s, a);
    else if (roll < 0.74) {
      const t = pick(a.threats);
      if (t) A.react(s, a, t.id, pick(['lawyers', 'bribe', 'reinforce', 'evacuate'] as const)!);
    } else if (roll < 0.77) {
      const k = pick(s.contracts.filter((x) => x.status === 'offered'));
      if (k) A.acceptContract(s, a, k.id);
      deliverContracts(s, a);
    } else if (roll < 0.79) A.startOperation(s, a, pick(OPS)!);
    else if (roll < 0.795) A.startCoup(s, a);
    else if (roll < 0.83) A.payRelease(s, a);
    else if (roll < 0.85) A.payArrears(s, a);
    else if (roll < 0.87) {
      const lot = pick(a.cargo.filter((l) => ITEMS[l.itemId].fieldable));
      if (lot) A.enlist(s, a, lot.itemId);
    }
  },
  tactic(_s, _p, r) {
    const ts: Tactic[] = ['assault', 'defensive', 'infiltration'];
    return ts[Math.floor(r() * ts.length)];
  },
};

/**
 * Iniciante razoável: comercia só com os preços que viu, erra 20% das escolhas, abre uma ou duas
 * Estações, foge de Ameaças contra o Diretor, nunca faz Operações. É a régua dos alvos de Dificuldade.
 */
const iniciante: Bot = {
  id: 'iniciante',
  act(s, a, r) {
    housekeeping(s, a, 300_000);
    handleThreats(s, a, 'cautious');
    if (!onGround(a)) return;
    if (isHunt(s) && hunt(s, a, r)) return;
    const c = s.countries[a.location];
    if (
      a.stations.length < 3 &&
      !stationIn(a, c.id) &&
      c.level >= 3 &&
      s.time > 24 * 10 &&
      a.cash > A.stationCost(a, c.id, 1) * 4
    )
      A.openStation(s, a);
    tradeTurn(s, a, r, 'seen', { reserve: 300_000, noise: 0.2 });
  },
  tactic: (s, p) => bestTactic(s, p),
};

export const BOTS: Record<BotId, Bot> = { guloso, estacoes, operador, passivo, aleatorio, iniciante };
