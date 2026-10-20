// RivalBrain: o ciclo de decisão de cada Agência Rival. Decide a cada poucas horas de jogo (com jitter),
// nunca a cada tick, e age só pelas funções do motor (ADR 0002).
import { cargoQty } from '../cargo';
import { ITEMS } from '../data/items';
import { quoteSell, sellPrice, WMD_TENSION } from '../market';
import { chance, randRange } from '../rng';
import { allUnits, postureIn } from '../state';
import type { Agency, GameState } from '../types';
import { upkeepOf } from '../units';
import { E } from './engine';
import { aiState, GRUDGE_DECAY_H, money, news } from './memory';
import type { Ctx } from './military';
import {
  garrisonHere,
  handleCapture,
  handleThreats,
  hireHere,
  manageStationHere,
  planOperation,
  planStrike,
  relieveCrowding,
  repairHere,
  runTeams,
} from './military';
import { CRISIS_TENSION, DIFFICULTY_AI, PERSONALITIES } from './profiles';
import { lotProfit, planContract, planTrade } from './trade';
import type { RivalMemory } from './types';

/** Venda grande o bastante para virar notícia. */
const NEWSWORTHY = 4_000_000;

function spendableOf(a: Agency, reserve: number): number {
  const upkeep = allUnits(a).reduce((x, u) => x + upkeepOf(u), 0);
  return Math.max(0, a.cash - Math.max(a.cash * reserve, upkeep * 1.5 + a.arrears));
}

function sellAll(ctx: Ctx, itemId: string, qty: number) {
  const { s, a } = ctx;
  const c = s.countries[a.location];
  const q = quoteSell(c, itemId, qty);
  if (!E.sell(s, a, itemId, qty).ok) return;
  ctx.spendable += q.total;
  const it = ITEMS[itemId];
  if (it.wmd) news(s, a, `vendeu ${it.name} em ${c.name}. A Tensão Global sobe.`, 'bad', c.id);
  else if (q.total >= NEWSWORTHY) news(s, a, `despejou ${qty}× ${it.name} em ${c.name} por ${money(q.total)}.`, 'intel', c.id);
}

/** Chegada: fecha o plano se este é o país de venda/entrega, e desova Carga sem plano. */
function tradeArrive(ctx: Ctx) {
  const { s, a, mem } = ctx;
  const p = mem.plan;
  if (p && s.time > p.expires && !p.contractId) mem.plan = undefined;
  if (p?.contractId && s.contracts.find((x) => x.id === p.contractId)?.status !== 'accepted') mem.plan = undefined;
  if (p && mem.plan && !p.buyIn && a.location === p.sellIn) {
    if (p.contractId) {
      const k = s.contracts.find((x) => x.id === p.contractId);
      if (k && E.deliverContract(s, a, p.contractId).ok) {
        ctx.spendable += k.reward;
        news(s, a, `entregou um Contrato a ${k.buyer} em ${s.countries[k.countryId].name}.`, 'intel', k.countryId);
      }
    } else {
      const qty = cargoQty(a, p.itemId);
      if (qty > 0) sellAll(ctx, p.itemId, qty);
    }
    mem.plan = undefined;
  }
  const c = s.countries[a.location];
  for (const lot of [...a.cargo]) {
    if (mem.plan && lot.itemId === mem.plan.itemId) continue;
    const price = sellPrice(c, lot.itemId);
    if (!price) continue;
    const dump = ITEMS[lot.itemId].wmd && mem.wmdRetreat;
    if (dump || price >= lot.paidEach * 0.9) sellAll(ctx, lot.itemId, lot.qty);
  }
}

/** Escolhe (ou segue) o plano de Comércio; compra se está no país certo e decola. Último passo da decisão. */
function tradeMove(ctx: Ctx) {
  const { s, a, mem, P } = ctx;
  if (!mem.plan) {
    const mine = s.contracts.filter((k) => k.status === 'accepted' && k.agencyId === a.id).length;
    const open = s.contracts.filter((k) => k.status === 'offered' && postureIn(a, k.countryId) !== 'enemy');
    let plan = mine < 3 && open.length && chance(s, 0.5 + 0.5 * P.trade) ? planContract(ctx, open) : undefined;
    if (plan && !E.acceptContract(s, a, plan.contractId!).ok) plan = undefined;
    if (plan) {
      const k = s.contracts.find((x) => x.id === plan!.contractId)!;
      news(s, a, `fechou um Contrato com ${k.buyer} em ${s.countries[k.countryId].name}.`, 'intel', k.countryId);
    }
    mem.plan = plan ?? planTrade(ctx);
  }
  const p = mem.plan;
  if (!p) return;
  if (p.buyIn && a.location === p.buyIn) {
    const have = cargoQty(a, p.itemId);
    const need = p.contractId ? Math.max(0, p.qty - have) : p.qty;
    if (need > 0) {
      const viable = p.contractId || lotProfit(s, p.itemId, a.location, p.sellIn, need).profit > 0;
      if (!viable || !E.buy(s, a, p.itemId, need).ok) {
        mem.plan = undefined;
        return;
      }
    }
    p.buyIn = undefined;
  }
  const dest = p.buyIn ?? p.sellIn;
  if (dest === a.location) {
    tradeArrive(ctx);
    return;
  }
  if (!E.travel(s, a, dest).ok) mem.plan = undefined;
}

/** Horas seguidas da Tensão Global no Topo (contador da Crise Final do motor; 0 se não existir). */
const crisisHours = (s: GameState) => (s as GameState & { crisis?: { hours: number } }).crisis?.hours ?? 0;

/**
 * Tensão Global alta: as gananciosas entram no mercado de ADM; as medrosas recuam — de ADM e de Operações que
 * esquentam o mundo — quando a Tensão passa do limite delas ou o Topo dura mais que a paciência.
 */
function tensionStance(ctx: Ctx) {
  const { s, a, mem, P } = ctx;
  const fear = Math.min(P.crisisFear, CRISIS_TENSION + 10);
  const scared = s.tension >= fear || crisisHours(s) > P.crisisPatience * 24;
  if (!mem.wmdRetreat && scared) {
    mem.wmdRetreat = true;
    if (P.wmd > 0) news(s, a, 'saiu do mercado de Armas de Destruição em Massa: teme a Crise Final.', 'intel');
  } else if (mem.wmdRetreat && s.tension < Math.min(fear, WMD_TENSION) - 10 && crisisHours(s) === 0) mem.wmdRetreat = false;
}

/** Uma decisão completa da RivalBrain. */
export function decide(s: GameState, a: Agency, mem: RivalMemory) {
  const P = PERSONALITIES[mem.personality];
  const D = DIFFICULTY_AI[s.options.difficulty];
  const ctx: Ctx = { s, a, mem, P, D, spendable: 0 };
  mem.decisions++;
  const k = Math.exp(-(s.time - mem.lastAt) / GRUDGE_DECAY_H);
  for (const id of Object.keys(mem.grudge)) {
    mem.grudge[id] *= k;
    if (mem.grudge[id] < 0.05) delete mem.grudge[id];
  }
  mem.lastAt = s.time;

  if (a.arrears && a.cash >= a.arrears) E.payArrears(s, a);
  ctx.spendable = spendableOf(a, P.reserve);
  handleCapture(ctx);
  handleThreats(ctx);
  tensionStance(ctx);
  relieveCrowding(ctx);
  runTeams(ctx);

  const landed = a.director.status === 'free' && !a.flight;
  if (landed) {
    tradeArrive(ctx);
    repairHere(ctx);
    manageStationHere(ctx);
    hireHere(ctx);
    garrisonHere(ctx);
  }
  planStrike(ctx);
  // Perto da Crise Final as medrosas param de desestabilizar países.
  if (!mem.wmdRetreat) planOperation(ctx);
  if (landed && a.director.status === 'free' && !a.flight) tradeMove(ctx);
}

function schedule(s: GameState, a: Agency, mem: RivalMemory) {
  const D = DIFFICULTY_AI[s.options.difficulty];
  let next = s.time + randRange(s, D.interval[0], D.interval[1]);
  // Reage logo ao pouso; a Recruta demora mais para perceber que chegou.
  if (a.flight) next = Math.min(next, a.flight.arrive + 0.5 + (1 - D.quality) * 30);
  mem.nextAt = Math.max(s.time + 0.5, next);
}

/**
 * Chamada pelo motor a cada tick, depois de tickAgency. Custo por tick: O(rivais); uma decisão custa
 * O(países × itens) no Comércio e O(agências × Estações) nas ações hostis.
 */
export function tickRivals(s: GameState) {
  if (s.over) return;
  const ai = aiState(s);
  for (const a of s.agencies) {
    if (a.isPlayer) continue;
    const mem = ai.rivals[a.id];
    if (!mem || s.time < mem.nextAt) continue;
    if (a.director.status !== 'dead') decide(s, a, mem);
    schedule(s, a, mem);
  }
}
