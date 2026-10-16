import { COUNTRY_SEEDS, distanceKm, neighbors } from './data/countries';
import { GROUP_NAMES, HOSTAGE_NAMES, PLAYER_AGENCY_NAMES } from './data/names';
import { postureOf, PRESETS, STATIONS } from './data/rules';
import { setupRivals } from './ai/setup';
import { originMods, ORIGINS, TUTORIAL_ORIGIN } from './data/origins';
import type { OriginMods } from './data/origins';
import { TUTORIAL_ID } from './tutorial/preset';
import { SAVE_VERSION } from './save';
import { isLocked } from './tutorial/locks';
import { buildForce } from './forces';
import { driftPrices, midPrice, rollStock } from './market';
import { pick, randInt, randRange, weighted } from './rng';
import { keyRef, M, say, textOf } from './msg';
import type { Msg } from '../i18n/lookup';
import type {
  Agency,
  OriginId,
  Country,
  GameEvent,
  GameOptions,
  GameState,
  LogEntry,
  Politics,
  Posture,
  PresetDef,
  Standing,
  Station,
  StationLevel,
  Tone,
  Unit,
} from './types';
import { def, makeUnit, unitValue } from './units';

export const HOURS_PER_DAY = 24;
export const DAYS_PER_MONTH = 30;
/** Calendar day 0 of every game. */
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

// ── Agências ────────────────────────────────────────────────

/** A agência do jogador. */
export const player = (s: GameState): Agency => s.agencies[0];
export const agencyById = (s: GameState, id: string): Agency | undefined => s.agencies.find((a) => a.id === id);

export function standing(a: Agency, countryId: string): Standing {
  return (a.standing[countryId] ??= { reputation: 0, exposure: 0 });
}

export const postureIn = (a: Agency, id: string): Posture => postureOf(standing(a, id).reputation);
export const stationIn = (a: Agency, id: string): Station | undefined => a.stations.find((st) => st.countryId === id);

export const directorFree = (a: Agency) => a.director.status === 'free';
/** The Diretor is on the ground, free, in this country. */
export const directorAt = (a: Agency, id: string) => directorFree(a) && !a.flight && a.location === id;

export function addReputation(a: Agency, countryId: string, delta: number) {
  const st = standing(a, countryId);
  const gain = delta > 0 ? delta * (originMods(a).repGainMult ?? 1) : delta;
  st.reputation = Math.max(-100, Math.min(100, st.reputation + gain));
}

/** Exposição ganha ou perdida; `op` marca Operações Especiais e ações hostis (Origem Ex-Agente). */
export function addExposure(s: GameState, a: Agency, countryId: string, delta: number, op = false) {
  const st = standing(a, countryId);
  let d = delta;
  if (d > 0) {
    const m = originMods(a);
    if (op) d *= m.opExposureMult ?? 1;
    if (s.countries[countryId]?.politics === 'peace') d *= m.peaceExposureMult ?? 1;
  }
  st.exposure = Math.max(0, Math.min(100, st.exposure + d));
}

export function travelKm(a: string, b: string) {
  const ca = COUNTRY_SEEDS.find((c) => c.id === a)!;
  const cb = COUNTRY_SEEDS.find((c) => c.id === b)!;
  return distanceKm(ca, cb);
}

// ── Relatório ───────────────────────────────────────────────

export { keyRef, M, ref, say, textOf } from './msg';

const msgOf = (m: string | Msg): Msg | undefined => (typeof m === 'string' ? undefined : m);

export function log(s: GameState, text: string | Msg, tone: Tone = 'info', countryId?: string, detail?: Msg) {
  const entry: LogEntry = { at: s.time, tone, text: detail ? `${textOf(text)} — ${say(detail)}` : textOf(text), countryId };
  if (typeof text !== 'string') entry.msg = text;
  if (detail) entry.detail = detail;
  s.log.push(entry);
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}

/** Evento for the player's agency: pauses the clock until acknowledged. Rival agencies raise none. */
export function notify(
  s: GameState,
  a: Agency,
  kind: GameEvent['kind'],
  title: string | Msg,
  body: string | Msg,
  tone: Tone = 'info',
  countryId?: string,
) {
  if (!a.isPlayer) return;
  s.uidCounter += 1;
  const ev: GameEvent = { id: `ev${s.uidCounter}`, at: s.time, kind, title: textOf(title), body: textOf(body), tone, countryId };
  const tm = msgOf(title);
  const bm = msgOf(body);
  if (tm) ev.titleMsg = tm;
  if (bm) ev.bodyMsg = bm;
  s.events.push(ev);
  if (tm && bm) log(s, tm, tone, countryId, bm);
  else log(s, `${ev.title} — ${ev.body}`, tone, countryId);
}

/** Relatório line for the player's agency only. */
export function note(s: GameState, a: Agency, text: string | Msg, tone: Tone = 'info', countryId?: string) {
  if (a.isPlayer) log(s, text, tone, countryId);
}

// ── Valor e informação ──────────────────────────────────────

/** Every Unidade the agency owns, wherever it is (Detidas excluded). */
export function allUnits(a: Agency): Unit[] {
  return [
    ...a.fleet,
    ...a.escort,
    ...a.stations.flatMap((st) => st.units),
    ...a.teams.flatMap((t) => [...t.units, ...(t.freighter ? [t.freighter] : [])]),
  ];
}

export function stationValue(level: StationLevel): number {
  let v = 0;
  for (let l = 1; l <= level; l++) v += STATIONS[l as StationLevel].cost;
  // Valor contábil = custo: abrir ou subir uma Estação não deve parecer prejuízo.
  return v;
}

const lotsValue = (lots: { paidEach: number; qty: number }[]) => lots.reduce((a, l) => a + l.paidEach * l.qty, 0);

/** Ativos: caixa + Carga + Cofres + Unidades + Estações. */
export function assets(a: Agency): number {
  const goods =
    lotsValue(a.cargo) + a.teams.reduce((x, t) => x + lotsValue(t.spoils), 0) + a.stations.reduce((x, st) => x + lotsValue(st.vault), 0);
  const units = allUnits(a).reduce((x, u) => x + unitValue(u), 0);
  const stations = a.stations.reduce((x, st) => x + (st.interdicted ? 0 : stationValue(st.level)), 0);
  return Math.round(a.cash + goods + units + stations);
}

/** Lucro = ativos − capital inicial. */
export const profit = (a: Agency) => assets(a) - a.capital;

export function seePrices(s: GameState, a: Agency, countryId: string) {
  const c = s.countries[countryId];
  const prices: Record<string, number> = {};
  for (const id of c.stock) prices[id] = midPrice(c, id);
  standing(a, countryId).seen = { at: s.time, prices };
}

/** Countries whose market the agency sees live: the Diretor's, plus Estações (and neighbors from Complexo up). */
export function intelCountries(a: Agency): Set<string> {
  const set = new Set<string>();
  if (directorFree(a) && !a.flight) set.add(a.location);
  for (const st of a.stations) {
    if (st.interdicted) continue;
    set.add(st.countryId);
    if (STATIONS[st.level].wideIntel || originMods(a).wideIntel) neighbors(st.countryId, 4).forEach((n) => set.add(n));
  }
  return set;
}

// ── Nova partida ────────────────────────────────────────────

const DIFF_CASH = [1, 1.25, 1, 0.85];

/** Escolta inicial ajustada pela Origem: uma Unidade a menos, ou só Pessoal jurídico e de influência. */
export function startingUnits(ids: string[], m: OriginMods): string[] {
  let out = [...ids];
  if (m.oneUnitLess) {
    for (let k = out.length - 1; k >= 0; k--) {
      if (def(out[k]).cls !== 'cargo') {
        out.splice(k, 1);
        break;
      }
    }
  }
  if (m.noFighters) {
    let n = 0;
    out = out.map((id) => {
      const c = def(id).cls;
      if (c === 'cargo' || c === 'lawyer' || c === 'influence') return id;
      return n++ % 2 === 0 ? 'lawyer1' : 'liaison1';
    });
  }
  return out;
}

export function createAgency(
  s: GameState,
  preset: PresetDef,
  opts: { id: string; name: string; isPlayer: boolean; director: string; cashMult: number; origin?: OriginId },
): Agency {
  const a: Agency = {
    id: opts.id,
    name: opts.name,
    isPlayer: opts.isPlayer,
    origin: opts.origin ?? (opts.isPlayer ? 'none' : pick(s, ORIGINS).id),
    director: { name: opts.director, status: 'free' },
    location: preset.startCountry,
    cash: Math.round(preset.cash * opts.cashMult),
    capital: 0,
    fleet: [],
    escort: [],
    cargo: [],
    stations: [],
    teams: [],
    threats: [],
    standing: {},
    arrears: 0,
    stats: { operations: 0, coups: 0, combatsWon: 0, combatsLost: 0, trades: 0, contractsDone: 0, peakProfit: 0 },
  };
  for (const id of Object.keys(s.countries)) a.standing[id] = { reputation: randInt(s, -12, 18), exposure: 0 };
  standing(a, preset.startCountry).reputation = Math.max(standing(a, preset.startCountry).reputation, 25);
  const repL5 = originMods(a).startRepLevel5;
  if (repL5) for (const c of Object.values(s.countries)) if (c.level === 5) standing(a, c.id).reputation += repL5;
  for (const id of startingUnits(preset.startUnits, originMods(a))) {
    const u = makeUnit(s, id);
    if (def(id).cls === 'cargo') a.fleet.push(u);
    else a.escort.push(u);
  }
  for (const st of preset.startStations) {
    const station: Station = { countryId: st.countryId, level: st.level, units: [], founded: 0, vault: [], detained: [] };
    if (st.level >= 2) station.units.push(makeUnit(s, 'bodyguard'));
    if (st.level >= 3) station.units.push(makeUnit(s, 'police'));
    a.stations.push(station);
    standing(a, st.countryId).reputation = Math.max(standing(a, st.countryId).reputation, 10);
  }
  intelCountries(a).forEach((id) => seePrices(s, a, id));
  a.capital = assets(a);
  return a;
}

export function newGame(opts: GameOptions): GameState {
  const preset = opts.preset ?? PRESETS[0];
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const s: GameState = {
    saveVersion: SAVE_VERSION,
    crisis: { hours: 0 },
    wmdLedger: [],
    seed,
    rng: seed,
    time: 0,
    lastDay: 0,
    options: { ...opts, preset },
    agencies: [],
    countries: {},
    tension: 20,
    contracts: [],
    log: [],
    events: [],
    uidCounter: 0,
  };

  for (const seedC of COUNTRY_SEEDS) {
    const c: Country = {
      id: seedC.id,
      name: seedC.name,
      continent: seedC.continent,
      level: seedC.level,
      politics: rollPolitics(s, seedC.level),
      saturation: {},
      lon: seedC.lon,
      lat: seedC.lat,
      drift: {},
      stock: [],
    };
    driftPrices(s, c);
    c.stock = rollStock(s, c, s.tension);
    s.countries[c.id] = c;
  }

  s.agencies.push(
    createAgency(s, preset, {
      id: 'player',
      name: opts.agencyName?.trim() || pick(s, PLAYER_AGENCY_NAMES),
      isPlayer: true,
      director: opts.directorName?.trim() || say(M('msg.state.defaultDirector')),
      cashMult: DIFF_CASH[opts.difficulty],
      origin: opts.origin ?? (preset.id === TUTORIAL_ID ? TUTORIAL_ORIGIN : 'none'),
    }),
  );

  if (preset.objective === 'destroy' || preset.objective === 'rescue') {
    const region = preset.region ?? ['EU'];
    const pool = COUNTRY_SEEDS.filter((c) => region.includes(c.continent) && c.id !== preset.startCountry);
    const start = pick(s, pool);
    const strength = 12 + preset.challenge * 6 + (opts.difficulty - 1) * 5;
    s.group = {
      name: pick(s, GROUP_NAMES),
      countryId: start.id,
      units: buildForce(s, 'group', strength, 'army'),
      nextMoveAt: randRange(s, 72, 140),
      region,
      hostage: preset.objective === 'rescue' ? pick(s, HOSTAGE_NAMES) : undefined,
    };
  }

  log(
    s,
    { key: 'msg.state.operationStarted', params: { preset: keyRef(`preset.${preset.id}.title`, preset.title), country: { country: preset.startCountry } } },
    'intel',
    preset.startCountry,
  );
  setupRivals(s);
  return s;
}

/** Tensão Global moves with wars, golpes and hostile operations. */
export function addTension(s: GameState, delta: number) {
  if (isLocked(s, 'tension')) return;
  s.tension = Math.max(0, Math.min(100, s.tension + delta));
}
