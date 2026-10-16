// Domain model. Names map 1:1 to the glossary in CONTEXT.md (see comments).

export type Continent = 'NA' | 'SA' | 'EU' | 'AF' | 'ME' | 'AS' | 'OC';

export type Politics = 'peace' | 'disorder' | 'civilwar' | 'sanctions' | 'coldwar' | 'war';

/** Postura: faixa da Reputação. */
export type Posture = 'enemy' | 'neutral' | 'ally';

/** Tipo de Combate: Jurídico, Urbano, Militar, Aéreo. */
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
  /** Reputação: -100..100, muda devagar, define a Postura. */
  reputation: number;
  /** Exposição: 0..100, sobe rápido e decai sozinha. */
  exposure: number;
  /** Saturação por item: deslocamento relativo do preço (-0.6..+0.6) que se dissipa. */
  saturation: Record<string, number>;
  lon: number;
  lat: number;
  /** Market price multiplier noise per item, drifts daily. */
  drift: Record<string, number>;
  /** Items currently offered for sale here. */
  stock: string[];
  /** Last time the bank was robbed (hours). */
  bankRobbedAt?: number;
  /** Prices last seen by the Diretor or an Estação. */
  seen?: { at: number; prices: Record<string, number> };
  /** Days left of post-coup instability. */
  couped?: boolean;
}

/** Unidade. */
export interface Unit {
  uid: string;
  itemId: string;
  name: string; // personal name for Pessoal, serial for machines
  /** Current strength (damage reduces it); max comes from ItemDef. */
  hp: Strength;
  xp: number; // 0..100
  paid: number;
  seed: number; // avatar seed
  /** Máquina parada por falta de Manutenção. */
  idle?: boolean;
}

/** Lote de Carga. */
export interface CargoLot {
  lid: string;
  itemId: string;
  qty: number;
  paidEach: number;
}

/** Nível de Estação: Célula, Casa Segura, Escritório, Complexo, Base. */
export type StationLevel = 1 | 2 | 3 | 4 | 5;

/** Estação. */
export interface Station {
  countryId: string;
  level: StationLevel;
  /** Unidades de Estação. */
  units: Unit[];
  founded: number;
  /** Interditada: apreendida pelo Estado até pagar a multa ou vencer recurso. */
  interdicted?: { fine: number; since: number };
  /** Unidades Detidas na apreensão; voltam quando a interdição cai. */
  detained: Unit[];
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
  startStations: { countryId: string; level: StationLevel }[];
  startUnits: string[];
  difficulty: 1 | 2 | 3;
  region?: Continent[];
}

export type Difficulty = 1 | 2 | 3;

export interface GameOptions {
  missionId: string;
  difficulty: Difficulty;
  hardcore: boolean;
  directorName?: string;
  seed?: number;
}

export interface EnemyGroup {
  name: string;
  countryId: string;
  units: Unit[];
  /** Next move time (hours). */
  nextMoveAt: number;
  hostage?: string;
  region: Continent[];
  /** Last known location by Estação intel. */
  seenAt?: { countryId: string; at: number };
  defeated?: boolean;
}

export type Tone = 'info' | 'good' | 'bad' | 'intel' | 'warn';

export interface LogEntry {
  at: number;
  tone: Tone;
  text: string;
  countryId?: string;
}

/** Evento: acontecimento que exige atenção e pausa o relógio. */
export interface GameEvent {
  id: string;
  at: number;
  kind: 'arrival' | 'threat' | 'combat' | 'contract' | 'maintenance' | 'director' | 'mission' | 'team' | 'intel' | 'station';
  title: string;
  body: string;
  tone: Tone;
  countryId?: string;
}

// ── Diretor ──────────────────────────────────────────────

export type DirectorStatus = 'free' | 'detained' | 'kidnapped' | 'dead';

export interface Director {
  name: string;
  status: DirectorStatus;
  /** Where the Diretor is held, while Detido or Sequestrado. */
  heldIn?: string;
  /** Detido: released automatically at this time (hours). */
  releaseAt?: number;
  /** Fiança (Detido) ou resgate (Sequestrado). */
  price?: number;
}

/** Voo da Frota em andamento. */
export interface Flight {
  from: string;
  to: string;
  depart: number;
  arrive: number;
}

// ── Equipes ──────────────────────────────────────────────

export type TeamTravelMode = 'commercial' | 'freighter';

/** Equipe: Unidades destacadas que se deslocam sem o Diretor. Nunca comercia. */
export interface Team {
  id: string;
  name: string;
  units: Unit[];
  location: string;
  travel?: Flight & { mode: TeamTravelMode };
  /** Cargueiro Destacado que leva a Equipe (fora da Frota enquanto destacado). */
  freighter?: Unit;
  /** Itens capturados em Operações Especiais. Destino em aberto (docs/OPEN-QUESTIONS.md). */
  spoils: CargoLot[];
}

// ── Ameaças ──────────────────────────────────────────────

/** raid = batida policial, lawsuit = processo, criminal = ataque criminoso, military = ataque militar. */
export type ThreatKind = 'raid' | 'lawsuit' | 'criminal' | 'military';

export type ThreatReaction = 'lawyers' | 'bribe' | 'reinforce' | 'evacuate';

/** Ameaça: ação hostil anunciada com antecedência. */
export interface Threat {
  id: string;
  kind: ThreatKind;
  countryId: string;
  /** Alvo: a Estação do país ou o Diretor (quando não há Estação). */
  target: 'station' | 'director';
  announcedAt: number;
  strikesAt: number;
  /** Força total do ataque (soma de forças das Unidades hostis). */
  strength: number;
  reactions: ThreatReaction[];
  /** Suborno aceito: a ameaça não acontece. */
  cancelled?: boolean;
  /** Força extra contratada como reforço local. */
  hired?: number;
}

// ── Contratos ────────────────────────────────────────────

export interface Contract {
  id: string;
  countryId: string;
  buyer: string;
  itemId: string;
  qty: number;
  /** Pagamento total na entrega. */
  reward: number;
  offeredAt: number;
  /** Oferta expira se não for aceita até aqui. */
  offerExpires: number;
  /** Prazo de entrega após aceito. */
  deadline: number;
  status: 'offered' | 'accepted' | 'done' | 'failed' | 'expired';
  reputation: number;
}

// ── Combate ──────────────────────────────────────────────

/** Tática: Assalto, Defensiva, Infiltração, Negociar. */
export type Tactic = 'assault' | 'defensive' | 'infiltration' | 'negotiate';

export type OperationKind = 'bank' | 'tech' | 'eliminate';

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

/** Where the player's units in a combat come from, so casualties can be written back. */
export type ForceSource =
  | { kind: 'escort' }
  | { kind: 'station'; countryId: string }
  | { kind: 'team'; teamId: string };

export type CombatReason =
  | { kind: 'threat'; threatId: string; threatKind: ThreatKind; countryId: string; target: 'station' | 'director' }
  | { kind: 'operation'; op: OperationKind; countryId: string; by: 'director' | string /* team id */ }
  | { kind: 'coup'; countryId: string }
  | { kind: 'group'; countryId: string; by: 'director' | string }
  | { kind: 'appeal'; countryId: string }
  | { kind: 'rescue'; countryId: string; teamId: string };

export interface CombatState {
  id: string;
  type: CombatType;
  reason: CombatReason;
  title: string;
  /** The side defending: holding until the end (draw) counts as a win for the defender. */
  playerDefends: boolean;
  tactic: Tactic;
  turn: number; // 0 = deploy phase
  maxTurns: number;
  cols: number;
  rows: number;
  deployCols: number;
  units: CombatUnitRef[];
  /** Player units in reserve, not yet deployed. */
  reserve: Unit[];
  /** Furthest column the player has held per row. */
  reach: number[];
  log: string[];
  fx: CombatFx[];
  result?: 'win' | 'lose' | 'draw';
  /** Converted enemy units awaiting transfer to the player. */
  converted: Unit[];
  sources: ForceSource[];
  /** Diretor está presente (perde → Detido/Sequestrado/morte). */
  directorPresent: boolean;
}

/** Combate aguardando a escolha de Tática (Diretor presente). */
export interface PendingCombat {
  setup: CombatSetupData;
  /** Prévia: chance de vitória por Tática. */
  preview: Record<Tactic, number>;
}

export interface CombatSetupData {
  type: CombatType;
  reason: CombatReason;
  title: string;
  enemy: Unit[];
  sources: ForceSource[];
  playerDefends: boolean;
  fort?: number;
  directorPresent: boolean;
}

export interface GameStats {
  operations: number;
  coups: number;
  combatsWon: number;
  combatsLost: number;
  trades: number;
  contractsDone: number;
  peakProfit: number;
}

export interface GameState {
  version: 2;
  seed: number;
  rng: number;
  /** Relógio contínuo em horas de jogo desde o início. */
  time: number;
  /** Last processed day boundary. */
  lastDay: number;
  options: GameOptions;
  mission: MissionDef;
  director: Director;
  /** Country where the Diretor and the Frota are (origin while flying). */
  location: string;
  flight?: Flight;
  cash: number;
  /** Capital inicial (ativos no início). Lucro = ativos − capital inicial. */
  capital: number;
  /** Frota: cargueiros do Diretor. */
  fleet: Unit[];
  /** Escolta: Unidades que viajam com o Diretor (sem os cargueiros). */
  escort: Unit[];
  cargo: CargoLot[];
  stations: Station[];
  teams: Team[];
  countries: Record<string, Country>;
  threats: Threat[];
  contracts: Contract[];
  group?: EnemyGroup;
  log: LogEntry[];
  /** Eventos ainda não vistos; os que existem pausam o relógio. */
  events: GameEvent[];
  pendingCombat?: PendingCombat;
  combat?: CombatState;
  /** Manutenção em atraso (US$). */
  arrears: number;
  over?: { won: boolean; reason: string; score: number };
  stats: GameStats;
  uidCounter: number;
}
