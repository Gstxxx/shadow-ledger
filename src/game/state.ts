import { COUNTRY_SEEDS, distanceKm, neighbors } from './data/countries';
import { GROUP_NAMES, HOSTAGE_NAMES } from './data/names';
import { MISSIONS, postureOf, STATIONS } from './data/rules';
import { driftPrices, midPrice, rollStock } from './market';
import { pick, randInt, randRange, weighted } from './rng';
import type {
  Country,
  GameEvent,
  GameOptions,
  GameState,
  Politics,
  Posture,
  Station,
  StationLevel,
  Tone,
  Unit,
} from './types';
import { def, makeUnit, unitValue } from './units';
import { buildForce } from './forces';

export const HOURS_PER_DAY = 24;
export const DAYS_PER_MONTH = 30;
/** Calendar day 0 of every campaign. */
export const EPOCH = Date.UTC(2031, 2, 1, 6, 0, 0);

export const dayOf = (time: number) => Math.floor(time / HOURS_PER_DAY);

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatDate(time: number): string {
  const d = new Date(EPOCH + time * 3600_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatClock(time: number): string {
  const d = new Date(EPOCH + time * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatDuration(hours: number): string {
  const h = Math.max(0, Math.round(hours));
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  const r = h % 24;
  return r ? `${d} d ${r} h` : `${d} d`;
}

const POLITICS_BY_LEVEL: Record<number, [Politics, number][]> = {
  5: [['peace', 0.6], ['coldwar', 0.3], ['sanctions', 0.1]],
  4: [['peace', 0.5], ['coldwar', 0.2], ['disorder', 0.2], ['sanctions', 0.1]],
  3: [['peace', 0.35], ['disorder', 0.3], ['coldwar', 0.15], ['sanctions', 0.1], ['war', 0.1]],
  2: [['disorder', 0.35], ['peace', 0.25], ['civilwar', 0.2], ['war', 0.1], ['sanctions', 0.1]],
  1: [['civilwar', 0.35], ['disorder', 0.3], ['war', 0.25], ['peace', 0.1]],
};

export function rollPolitics(s: GameState, level: number): Politics {
  return weighted(s, POLITICS_BY_LEVEL[level] ?? POLITICS_BY_LEVEL[3]);
}

export const country = (s: GameState, id: string): Country => s.countries[id];
export const postureIn = (s: GameState, id: string): Posture => postureOf(s.countries[id].reputation);
export const stationIn = (s: GameState, id: string): Station | undefined => s.stations.find((st) => st.countryId === id);

export const directorFree = (s: GameState) => s.director.status === 'free';
/** The Diretor is on the ground, free, in this country. */
export const directorAt = (s: GameState, id: string) => directorFree(s) && !s.flight && s.location === id;

export function travelKm(a: string, b: string) {
  const ca = COUNTRY_SEEDS.find((c) => c.id === a)!;
  const cb = COUNTRY_SEEDS.find((c) => c.id === b)!;
  return distanceKm(ca, cb);
}

export function log(s: GameState, text: string, tone: Tone = 'info', countryId?: string) {
  s.log.push({ at: s.time, tone, text, countryId });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}

/** Evento: shows to the player and pauses the clock until acknowledged. */
export function pushEvent(
  s: GameState,
  kind: GameEvent['kind'],
  title: string,
  body: string,
  tone: Tone = 'info',
  countryId?: string,
) {
  s.uidCounter += 1;
  s.events.push({ id: `ev${s.uidCounter}`, at: s.time, kind, title, body, tone, countryId });
  log(s, `${title} — ${body}`, tone, countryId);
}

/** Every Unidade the agency owns, wherever it is (Detidas excluded). */
export function allUnits(s: GameState): Unit[] {
  return [
    ...s.fleet,
    ...s.escort,
    ...s.stations.flatMap((st) => st.units),
    ...s.teams.flatMap((t) => [...t.units, ...(t.freighter ? [t.freighter] : [])]),
  ];
}

export function stationValue(level: StationLevel): number {
  let v = 0;
  for (let l = 1; l <= level; l++) v += STATIONS[l as StationLevel].cost;
  return Math.round(v * 0.6);
}

/** Ativos: caixa + Carga (preço pago) + Unidades + Estações. */
export function assets(s: GameState): number {
  const cargo = s.cargo.reduce((a, l) => a + l.paidEach * l.qty, 0);
  const spoils = s.teams.reduce((a, t) => a + t.spoils.reduce((b, l) => b + l.paidEach * l.qty, 0), 0);
  const units = allUnits(s).reduce((a, u) => a + unitValue(u), 0);
  const stations = s.stations.reduce((a, st) => a + (st.interdicted ? 0 : stationValue(st.level)), 0);
  return Math.round(s.cash + cargo + spoils + units + stations);
}

/** Lucro = ativos − capital inicial. */
export const profit = (s: GameState) => assets(s) - s.capital;

export function seePrices(s: GameState, countryId: string) {
  const c = s.countries[countryId];
  const prices: Record<string, number> = {};
  for (const id of c.stock) prices[id] = midPrice(c, id);
  c.seen = { at: s.time, prices };
}

/** Countries whose market the agency sees live: the Diretor's, plus Estações (and their neighbors from Complexo up). */
export function intelCountries(s: GameState): Set<string> {
  const set = new Set<string>();
  if (directorFree(s) && !s.flight) set.add(s.location);
  for (const st of s.stations) {
    if (st.interdicted) continue;
    set.add(st.countryId);
    if (STATIONS[st.level].wideIntel) neighbors(st.countryId, 4).forEach((n) => set.add(n));
  }
  return set;
}

const DIFF_CASH = [1, 1.25, 1, 0.85];

export function newGame(opts: GameOptions): GameState {
  const mission = MISSIONS.find((m) => m.id === opts.missionId) ?? MISSIONS[0];
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const s: GameState = {
    version: 2,
    seed,
    rng: seed,
    time: 0,
    lastDay: 0,
    options: { ...opts, missionId: mission.id },
    mission,
    director: { name: opts.directorName?.trim() || 'Diretor', status: 'free' },
    location: mission.startCountry,
    cash: Math.round(mission.cash * DIFF_CASH[opts.difficulty]),
    capital: 0,
    fleet: [],
    escort: [],
    cargo: [],
    stations: [],
    teams: [],
    countries: {},
    threats: [],
    contracts: [],
    log: [],
    events: [],
    arrears: 0,
    stats: { operations: 0, coups: 0, combatsWon: 0, combatsLost: 0, trades: 0, contractsDone: 0, peakProfit: 0 },
    uidCounter: 0,
  };

  for (const seedC of COUNTRY_SEEDS) {
    const c: Country = {
      id: seedC.id,
      name: seedC.name,
      continent: seedC.continent,
      level: seedC.level,
      politics: rollPolitics(s, seedC.level),
      reputation: randInt(s, -12, 18),
      exposure: 0,
      saturation: {},
      lon: seedC.lon,
      lat: seedC.lat,
      drift: {},
      stock: [],
    };
    driftPrices(s, c);
    c.stock = rollStock(s, c);
    s.countries[c.id] = c;
  }
  // The home country starts friendlier.
  s.countries[mission.startCountry].reputation = Math.max(s.countries[mission.startCountry].reputation, 25);

  for (const id of mission.startUnits) {
    const u = makeUnit(s, id);
    if (def(id).cls === 'cargo') s.fleet.push(u);
    else s.escort.push(u);
  }
  for (const st of mission.startStations) {
    const station: Station = { countryId: st.countryId, level: st.level, units: [], founded: 0, detained: [] };
    if (st.level >= 2) station.units.push(makeUnit(s, 'bodyguard'));
    if (st.level >= 3) station.units.push(makeUnit(s, 'police'));
    s.stations.push(station);
    s.countries[st.countryId].reputation = Math.max(s.countries[st.countryId].reputation, 10);
  }

  if (mission.kind === 'destroy' || mission.kind === 'rescue') {
    const region = mission.region ?? ['EU'];
    const pool = COUNTRY_SEEDS.filter((c) => region.includes(c.continent) && c.id !== mission.startCountry);
    const start = pick(s, pool);
    const strength = 22 + mission.difficulty * 10 + (opts.difficulty - 1) * 6;
    s.group = {
      name: pick(s, GROUP_NAMES),
      countryId: start.id,
      units: buildForce(s, 'group', strength, 'army'),
      nextMoveAt: randRange(s, 72, 140),
      region,
      hostage: mission.kind === 'rescue' ? pick(s, HOSTAGE_NAMES) : undefined,
    };
  }

  intelCountries(s).forEach((id) => seePrices(s, id));
  s.capital = assets(s);
  log(s, `${mission.title}: operação iniciada em ${s.countries[s.location].name}.`, 'intel', s.location);
  return s;
}
