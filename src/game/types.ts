export type Continent = 'NA' | 'SA' | 'EU' | 'AF' | 'ME' | 'AS' | 'OC';

export type Politics = 'peace' | 'disorder' | 'civilwar' | 'sanctions' | 'coldwar' | 'war';
export type Standing = 'enemy' | 'neutral' | 'ally';

export type CombatType = 'legal' | 'urban' | 'army' | 'air';

export type UnitClass =
  | 'human'
  | 'lawyer'
  | 'secretary'
  | 'vehicle'
  | 'antiair'
  | 'heli'
  | 'jet'
  | 'cargo'
  | 'arms'
  | 'special';

export interface Strength {
  legal: number;
  urban: number;
  army: number;
  air: number;
  convert: number;
}

/** Catalog entry: something that can be traded and/or fielded. */
export interface ItemDef {
  id: string;
  name: string;
  cls: UnitClass;
  rank: 0 | 1 | 2 | 3;
  /** Base price in US$. */
  price: number;
  /** Weight in tons. For cargo planes: capacity in tons. */
  weight: number;
  str: Strength;
  /** Cruise speed km/h (cargo planes only). */
  speed?: number;
  tradable: boolean;
  fieldable: boolean;
  /** Where it is manufactured (cheaper there). */
  origin?: string[];
  blurb: string;
}

export interface Country {
  id: string;
  name: string;
  continent: Continent;
  /** Economic / military level 1..5 */
  level: number;
  politics: Politics;
  standing: number; // -100..100 → enemy < -30 < neutral < 30 < ally
  lon: number;
  lat: number;
  /** Market price multiplier noise per item, drifts daily. */
  drift: Record<string, number>;
  /** Items currently offered for sale here. */
  stock: string[];
  bankRobbedDay?: number;
}

export interface Unit {
  uid: string;
  itemId: string;
  name: string; // personal name for humans, serial for machines
  /** Current strength (damage reduces it); max comes from ItemDef. */
  hp: Strength;
  xp: number; // 0..100
  paid: number;
  seed: number; // avatar seed
}

export interface CargoLot {
  lid: string;
  itemId: string;
  qty: number;
  paidEach: number;
}

export type StationTier = 1 | 2 | 3 | 4 | 5; // Cell, House, Building, Complex, Base

export interface Station {
  countryId: string;
  tier: StationTier;
  units: Unit[];
  founded: number;
}

export type MissionKind = 'profit' | 'quick' | 'destroy' | 'rescue';

export interface MissionDef {
  id: string;
  kind: MissionKind;
  title: string;
  brief: string;
  days: number; // 0 = unlimited
  target?: number; // profit target for quick
  cash: number;
  startCountry: string;
  startStations: { countryId: string; tier: StationTier }[];
  startUnits: string[];
  difficulty: 1 | 2 | 3;
  region?: Continent[];
}

export interface EnemyGroup {
  name: string;
  countryId: string;
  units: Unit[];
  nextMoveDay: number;
  hostage?: boolean;
  /** Countries the group may roam. */
  region: Continent[];
  /** Last known location by station intel. */
  seenAt?: { countryId: string; day: number };
}

export interface LogEntry {
  day: number;
  tone: 'info' | 'good' | 'bad' | 'intel';
  text: string;
}

export interface CombatUnitRef {
  key: string;
  side: 'p' | 'e';
  unit: Unit;
  row: number;
  col: number;
}

export interface CombatFx {
  kind: 'hit' | 'kill' | 'convert' | 'move' | 'breach';
  key: string;
  row: number;
  col: number;
  dmg?: number;
}

export type CombatReason =
  | { kind: 'intercept'; countryId: string }
  | { kind: 'station'; countryId: string; attacker: 'police' | 'army' | 'legal' | 'criminal' | 'group' }
  | { kind: 'robbery'; countryId: string }
  | { kind: 'steal'; countryId: string }
  | { kind: 'eliminate'; countryId: string }
  | { kind: 'coup'; countryId: string }
  | { kind: 'group'; countryId: string };

export interface CombatState {
  id: string;
  type: CombatType;
  reason: CombatReason;
  title: string;
  turn: number; // 0 = deploy phase
  maxTurns: number;
  cols: number;
  rows: number;
  /** Player deploy zone = cols [0, deployCols), enemy = [cols-deployCols, cols) */
  deployCols: number;
  units: CombatUnitRef[];
  /** Player units in reserve, not yet deployed. */
  reserve: Unit[];
  /** Furthest column the player has held per row; units may be repositioned up to it. */
  reach: number[];
  /** Combat may be fled before the first turn (interceptions only). */
  canRetreat: boolean;
  log: string[];
  fx: CombatFx[];
  result?: 'win' | 'lose' | 'draw';
  /** Converted enemy units awaiting transfer to the player. */
  converted: Unit[];
}

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  day: number;
  hour: number;
  mission: MissionDef;
  director: { name: string; alive: boolean };
  location: string;
  /** Flight in progress */
  flight?: { from: string; to: string; departHour: number; arriveHour: number };
  cash: number;
  iac: number;
  escort: Unit[];
  cargo: CargoLot[];
  stations: Station[];
  countries: Record<string, Country>;
  group?: EnemyGroup;
  log: LogEntry[];
  /** End-of-day reports waiting to be shown. */
  reports: { day: number; lines: LogEntry[] }[];
  combat?: CombatState;
  over?: { won: boolean; reason: string; score: number };
  stats: { robberies: number; coups: number; steals: number; combatsWon: number; combatsLost: number; trades: number };
  uidCounter: number;
}
