// Partida headless: um bot joga um Preset numa Dificuldade e uma semente; o harness mede tudo.
import * as A from '../../src/game/actions';
import { estimateWin } from '../../src/game/combat';
import { chooseTactic, finishCombat, forceUnits } from '../../src/game/combatFlow';
import { ITEMS } from '../../src/game/data/items';
import { STATIONS, THREAT_LABEL } from '../../src/game/data/rules';
import { maxCargo, SATURATION_LIMIT, usedCargo } from '../../src/game/market';
import { advance, upkeepTotal } from '../../src/game/sim';
import { TENSION_TOP } from '../../src/game/tension';
import { assets, dayOf, newGame, player, postureIn, profit } from '../../src/game/state';
import type { Agency, Difficulty, GameState, PresetDef, Tactic, ThreatKind } from '../../src/game/types';
import { def } from '../../src/game/units';
import { BOTS, botRng } from './bots';
import type { BotId } from './bots';

export interface CombatSample {
  kind: string;
  tactic: Tactic;
  /** Prévia mostrada para a Tática escolhida (60 simulações). */
  preview: number;
  /** Chance da Tática escolhida reestimada com outra semente e 200 simulações (sem viés do vencedor). */
  truth: number;
  won: boolean;
}

export interface ThreatSample {
  kind: ThreatKind;
  target: 'station' | 'director';
  strength: number;
  day: number;
  outcome: 'bribed' | 'missed' | 'repelled' | 'lost' | 'open';
  /** Perda concreta: Interditada, Nível perdido, Célula destruída, Diretor preso. */
  harm: string[];
}

export interface GameResult {
  preset: string;
  objective: string;
  difficulty: Difficulty;
  bot: BotId;
  seed: number;
  days: number;
  won: boolean;
  over: boolean;
  reason: string;
  finalProfit: number;
  /** Lucro ao fim de cada dia (índice = dia). */
  profitByDay: number[];
  tensionByDay: number[];
  firstStationDay?: number;
  firstStationCost?: number;
  /** Dia em que a renda bruta acumulada da primeira Estação aberta pelo bot pagou o custo dela. */
  firstStationPaybackDays?: number;
  firstStationLost?: boolean;
  stationsOpened: number;
  maxStations: number;
  threats: ThreatSample[];
  combats: CombatSample[];
  /** Por mês: Manutenção paga e renda bruta das Estações. */
  upkeepByMonth: number[];
  stationIncomeByMonth: number[];
  directorCaptured: number;
  monthsUnpaid: number;
  maxTension: number;
  firstTopTensionDay?: number;
  longestTopStreakDays: number;
  daysAtOrAbove75: number;
  crisis: boolean;
  anomalies: Record<string, number>;
  operations: number;
  coups: number;
  trades: number;
  contractsDone: number;
}

const DIFF_INCOME_POSTURE = (p: string) => (p === 'ally' ? 1.25 : p === 'enemy' ? 0.7 : 1);

/** Mesma fórmula do motor (sim.ts dailyAgency) para atribuir renda a cada Estação. */
function stationIncome(s: GameState, a: Agency, countryId: string): number {
  const st = a.stations.find((x) => x.countryId === countryId);
  if (!st || st.interdicted) return 0;
  const c = s.countries[countryId];
  return STATIONS[st.level].income * (0.6 + c.level * 0.15) * DIFF_INCOME_POSTURE(postureIn(a, countryId));
}

function checkSanity(s: GameState, anomalies: Record<string, number>) {
  const bump = (k: string) => (anomalies[k] = (anomalies[k] ?? 0) + 1);
  const fin = (k: string, v: number) => {
    if (!Number.isFinite(v)) bump(`NaN:${k}`);
  };
  fin('tension', s.tension);
  if (s.tension < 0 || s.tension > 100) bump('tension fora de 0..100');
  for (const a of s.agencies) {
    const who = a.isPlayer ? '' : 'Rival: ';
    const bumpA = (k: string) => bump(who + k);
    fin('cash', a.cash);
    fin('assets', assets(a));
    if (a.cash < -1) bumpA('caixa negativo');
    if (a.arrears < 0) bumpA('atraso negativo');
    for (const st of Object.values(a.standing)) {
      fin('reputation', st.reputation);
      fin('exposure', st.exposure);
      if (st.reputation < -100.001 || st.reputation > 100.001) bumpA('Reputação fora de -100..100');
      if (st.exposure < -0.001 || st.exposure > 100.001) bumpA('Exposição fora de 0..100');
    }
    for (const l of a.cargo) if (l.qty <= 0 || !Number.isFinite(l.paidEach)) bumpA('lote de Carga vazio/NaN');
    if (a.flight && usedCargo(a) > maxCargo(a) + 1e-6) bumpA('Frota voando sobrecarregada');
    const seen = new Set<string>();
    for (const st of a.stations) {
      if (seen.has(st.countryId)) bumpA('duas Estações no mesmo país');
      seen.add(st.countryId);
      if (st.level < 1 || st.level > 5) bumpA('Nível de Estação inválido');
      if (st.units.filter((u) => !u.temp).length > STATIONS[st.level].capacity) bumpA(`Estação acima da capacidade (${STATIONS[st.level].name})`);
    }
    for (const u of [...a.fleet, ...a.escort, ...a.stations.flatMap((x) => x.units), ...a.teams.flatMap((t) => t.units)]) {
      for (const [k, v] of Object.entries(u.hp)) {
        if (!Number.isFinite(v)) bumpA(`NaN:hp.${k}`);
        if (v < 0) bumpA('hp negativo');
        if (v > (def(u.itemId).str as unknown as Record<string, number>)[k] + 1e-9) bumpA('hp acima do máximo');
      }
    }
    if (a.director.status === 'free' && a.director.heldIn) bumpA('Diretor livre mas preso em país');
    if (!a.fleet.length) bumpA('Frota sem cargueiro');
  }
  for (const c of Object.values(s.countries)) {
    for (const v of Object.values(c.saturation)) {
      fin('saturation', v);
      if (Math.abs(v) > SATURATION_LIMIT + 1e-9) bump('Saturação fora do limite');
    }
    for (const id of c.stock) if (!ITEMS[id]) bump('item inexistente no estoque');
  }
}

export interface RunOptions {
  preset: PresetDef;
  difficulty: Difficulty;
  bot: BotId;
  seed: number;
  /** Limite para Presets sem prazo (e partidas longas). */
  capDays?: number;
  /** Monta a partida de outro jeito (ex.: Capítulo da Campanha); senão, newGame do Preset. */
  make?: () => GameState;
}

export function runGame(o: RunOptions): GameResult {
  const s = o.make ? o.make() : newGame({ preset: o.preset, difficulty: o.difficulty, hardcore: false, seed: o.seed });
  const a = player(s);
  const bot = BOTS[o.bot];
  const r = botRng(o.seed * 7919 + o.bot.length * 104729);
  const capDays = o.preset.days || o.capDays || 365;

  const res: GameResult = {
    preset: o.preset.id,
    objective: o.preset.objective,
    difficulty: o.difficulty,
    bot: o.bot,
    seed: o.seed,
    days: 0,
    won: false,
    over: false,
    reason: '',
    finalProfit: 0,
    profitByDay: [profit(a)],
    tensionByDay: [s.tension],
    stationsOpened: 0,
    maxStations: a.stations.length,
    threats: [],
    combats: [],
    upkeepByMonth: [],
    stationIncomeByMonth: [],
    directorCaptured: 0,
    monthsUnpaid: 0,
    maxTension: s.tension,
    longestTopStreakDays: 0,
    daysAtOrAbove75: 0,
    crisis: false,
    anomalies: {},
    operations: 0,
    coups: 0,
    trades: 0,
    contractsDone: 0,
  };

  const startStations = new Set(a.stations.map((x) => x.countryId));
  let firstStation: { country: string; day: number; cost: number; earned: number } | undefined;
  const openThreats = new Map<string, ThreatSample>();
  let lastDay = 0;
  let topStreak = 0;
  let monthIncome = 0;
  let lastDirector = a.director.status;

  /** Registra o que o motor contou no Relatório e nos Eventos desde a última volta. */
  const consume = () => {
    const texts = [...s.log.map((l) => l.text), ...s.events.map((e) => `${e.title} — ${e.body}`)];
    s.log = [];
    s.events = [];
    for (const text of texts) {
      if (text.startsWith('Manutenção não paga')) res.monthsUnpaid++;
      for (const t of openThreats.values()) {
        const label = THREAT_LABEL[t.kind];
        const cname = s.countries[(t as ThreatSample & { country: string }).country]?.name ?? '';
        if (!text.includes(cname)) continue;
        if (text.startsWith(`${label} em`) && text.includes('não aconteceu')) t.outcome = 'bribed';
        else if (text.includes('endereço vazio') || text.includes('não encontrou o Diretor')) t.outcome = 'missed';
        else if (text.startsWith(`${label} repelido`) || text.startsWith(`${label}: defesa bem-sucedida`)) t.outcome = 'repelled';
        else if (text.startsWith(`${label}: derrota`)) t.outcome = 'lost';
        else if (/^(Estação Interditada|Estação rebaixada|Célula destruída)/.test(text) && t.outcome === 'open') {
          t.outcome = 'lost';
          t.harm.push(text.split(' — ')[0]);
        }
      }
    }
    // Ameaças que deixaram a lista do motor já foram resolvidas.
    const live = new Set(a.threats.map((t) => t.id));
    for (const [id, t] of openThreats) if (!live.has(id) && t.outcome !== 'open') openThreats.delete(id);
  };

  const trackThreats = () => {
    for (const t of a.threats) {
      if (openThreats.has(t.id)) continue;
      const sample = { kind: t.kind, target: t.target, strength: t.strength, day: dayOf(s.time), outcome: 'open', harm: [], country: t.countryId } as ThreatSample & {
        country: string;
      };
      openThreats.set(t.id, sample);
      res.threats.push(sample);
    }
  };

  const onDay = (day: number) => {
    // Renda das Estações do dia (atribuída) e payback da primeira aberta pelo bot.
    for (const st of a.stations) {
      const inc = stationIncome(s, a, st.countryId);
      monthIncome += inc;
      if (firstStation && st.countryId === firstStation.country && res.firstStationPaybackDays === undefined) {
        firstStation.earned += inc;
        if (firstStation.earned >= firstStation.cost) res.firstStationPaybackDays = day - firstStation.day;
      }
    }
    if (day % 30 === 0) {
      res.upkeepByMonth.push(upkeepTotal(a));
      res.stationIncomeByMonth.push(Math.round(monthIncome));
      monthIncome = 0;
    }
    res.profitByDay[day] = profit(a);
    res.tensionByDay[day] = s.tension;
    res.maxTension = Math.max(res.maxTension, s.tension);
    if (s.tension >= TENSION_TOP) res.daysAtOrAbove75++;
    if (s.tension >= TENSION_TOP) {
      topStreak++;
      res.firstTopTensionDay ??= day;
      res.longestTopStreakDays = Math.max(res.longestTopStreakDays, topStreak);
    } else topStreak = 0;
    res.maxStations = Math.max(res.maxStations, a.stations.length);
    checkSanity(s, res.anomalies);
  };

  let guard = 0;
  while (!s.over && s.time < capDays * 24 && guard++ < 100_000) {
    trackThreats();
    consume();
    if (a.director.status !== lastDirector) {
      if (a.director.status === 'detained' || a.director.status === 'kidnapped') res.directorCaptured++;
      lastDirector = a.director.status;
    }
    const day = dayOf(s.time);
    while (lastDay < day) onDay(++lastDay);

    if (s.pendingCombat) {
      const pend = s.pendingCombat;
      const choice = bot.tactic(s, pend.preview, r);
      if (choice === 'abort' && A.cancelPending(s).ok) continue;
      const tactic: Tactic = choice === 'abort' ? 'defensive' : choice;
      if (!chooseTactic(s, tactic, false)) chooseTactic(s, 'defensive', false);
      const before = a.stats.combatsWon;
      const used = s.combat!.tactic;
      const st = pend.setup;
      const truth = estimateWin(
        { ...st, agencyId: a.id, player: st.sources.flatMap((src) => forceUnits(a, src)) },
        used,
        (s.rng ^ 0x2545f491) | 0,
        200,
      );
      finishCombat(s);
      res.combats.push({ kind: pend.setup.reason.kind, tactic: used, preview: pend.preview[used], truth, won: a.stats.combatsWon > before });
      continue;
    }
    if (s.combat) {
      finishCombat(s);
      continue;
    }

    const stationsBefore = new Set(a.stations.map((x) => x.countryId));
    const firstLevelBefore = firstStation ? a.stations.find((x) => x.countryId === firstStation!.country)?.level : undefined;
    const cashBefore = a.cash;
    bot.act(s, a, r);
    for (const st of a.stations) {
      if (stationsBefore.has(st.countryId) || startStations.has(st.countryId)) continue;
      res.stationsOpened++;
      if (!firstStation) {
        firstStation = { country: st.countryId, day: dayOf(s.time), cost: Math.max(0, cashBefore - a.cash), earned: 0 };
        // O custo exato vem da regra (o bot pode ter comprado algo no mesmo turno).
        firstStation.cost = A.stationCost(a, st.countryId, 1);
        res.firstStationDay = firstStation.day;
        res.firstStationCost = firstStation.cost;
      }
    }
    if (firstStation && firstLevelBefore !== undefined && res.firstStationPaybackDays === undefined) {
      const lvl = a.stations.find((x) => x.countryId === firstStation!.country)?.level;
      // Promoções também entram no investimento a pagar.
      if (lvl && lvl > firstLevelBefore) for (let l = firstLevelBefore + 1; l <= lvl; l++) firstStation.cost += A.stationCost(a, firstStation.country, l as 2);
      res.firstStationCost = firstStation.cost;
    }
    if (s.pendingCombat || s.combat) continue;
    advance(s, a.flight ? Math.max(0.5, a.flight.arrive - s.time + 0.01) : 12);
  }
  trackThreats();
  consume();
  const day = dayOf(s.time);
  while (lastDay < day) onDay(++lastDay);

  if (firstStation && !a.stations.some((x) => x.countryId === firstStation!.country)) res.firstStationLost = true;
  res.days = s.time / 24;
  res.over = !!s.over;
  res.won = !!s.over?.won;
  res.reason = s.over?.reason ?? 'limite de dias';
  // Quando o motor implementar a Crise Final, ela chega como fim de partida.
  res.crisis = /Crise Final|Tensão Global ficou no Topo/i.test(s.over?.reason ?? '');
  res.finalProfit = profit(a);
  res.operations = a.stats.operations;
  res.coups = a.stats.coups;
  res.trades = a.stats.trades;
  res.contractsDone = a.stats.contractsDone;
  for (const t of res.threats) delete (t as Partial<ThreatSample & { country: string }>).country;
  return res;
}
