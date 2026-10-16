// Domain model. Names map 1:1 to the glossary in CONTEXT.md (see comments).
import type { AiState } from './ai/types';

export type Continent = 'NA' | 'SA' | 'EU' | 'AF' | 'ME' | 'AS' | 'OC';

export type Politics = 'peace' | 'disorder' | 'civilwar' | 'sanctions' | 'coldwar' | 'war';

/** Postura: faixa da Reputação. */
export type Posture = 'enemy' | 'neutral' | 'ally';

/** Tipo de Combate: Jurídico, Urbano, Militar, Aéreo. */
export type CombatType = 'legal' | 'urban' | 'army' | 'air';

/** `influence` = Agente de Influência. */
export type UnitClass =
  | 'human'
  | 'lawyer'
  | 'influence'
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
  /** Arma de Destruição em Massa: só comércio, só com Tensão Global alta. */
  wmd?: boolean;
  /** Where it is manufactured (cheaper there). */
  origin?: string[];
  blurb: string;
}

/** World-level country: shared by every agency. */
export interface Country {
  id: string;
  name: string;
  continent: Continent;
  /** Economic / military level 1..5 */
  level: number;
  politics: Politics;
  /** Saturação por item: deslocamento relativo do preço (-0.6..+0.6) que se dissipa. Compartilhada por todas as agências. */
  saturation: Record<string, number>;
  lon: number;
  lat: number;
  /** Market price multiplier noise per item, drifts daily. */
  drift: Record<string, number>;
  /** Items currently offered for sale here. */
  stock: string[];
  /** Last time the bank was robbed (hours). */
  bankRobbedAt?: number;
  /** Current government was installed by a Golpe. */
  couped?: boolean;
}

/** How one agency stands in one country. */
export interface Standing {
  /** Reputação: -100..100, muda devagar, define a Postura. */
  reputation: number;
  /** Exposição: 0..100, sobe rápido e decai sozinha. */
  exposure: number;
  /** Prices last seen by the Diretor or an Estação. */
  seen?: { at: number; prices: Record<string, number> };
}

export type TraitId =
  | 'coldblood'
  | 'loyal'
  | 'frugal'
  | 'demanding'
  | 'resilient'
  | 'quick'
  | 'discreet'
  | 'persuasive'
  | 'nervous';

/** Ferida (Pessoal) ou Danificada (máquina). */
export interface Injury {
  kind: 'wounded' | 'damaged';
  /** Ferida: days of recovery left (faster in an Estação). Danificada: needs a paid repair. */
  days?: number;
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
  /** Traços (Pessoal only). */
  traits: TraitId[];
  /** Patentes already rewarded with a Traço. */
  ranked: number;
  injury?: Injury;
  /** Máquina parada por falta de Manutenção. */
  idle?: boolean;
  /** Segurança local contratada para uma única defesa. */
  temp?: boolean;
}

/** Lote de Carga (ou de Cofre). */
export interface CargoLot {
  lid: string;
  itemId: string;
  qty: number;
  paidEach: number;
  /** Recém-capturado por uma Equipe: o Receptador ainda aceita (só logo após a captura). */
  fresh?: boolean;
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
  /** Cofre: itens guardados; só o Diretor retira. */
  vault: CargoLot[];
  /** Interditada: apreendida pelo Estado até pagar a multa ou vencer recurso. */
  interdicted?: { fine: number; since: number };
  /** Unidades Detidas na apreensão; voltam quando a interdição cai. */
  detained: Unit[];
}

/** Objetivo: condição de vitória. */
export type ObjectiveKind = 'profit' | 'quick' | 'destroy' | 'rescue';

/** Preset: configuração pronta de Sandbox. A custom Sandbox is a Preset built by the player. */
export interface PresetDef {
  id: string;
  objective: ObjectiveKind;
  title: string;
  brief: string;
  /** Prazo em dias; 0 = sem prazo. */
  days: number;
  /** Lucro alvo (lucro rápido). */
  target?: number;
  cash: number;
  startCountry: string;
  startStations: { countryId: string; level: StationLevel }[];
  startUnits: string[];
  /** Suggested challenge, for display. */
  challenge: 1 | 2 | 3;
  region?: Continent[];
}

/** Dificuldade: Recruta, Operador, Diretor. */
export type Difficulty = 1 | 2 | 3;

export interface GameOptions {
  preset: PresetDef;
  difficulty: Difficulty;
  hardcore: boolean;
  directorName?: string;
  agencyName?: string;
  /** Número de Agências Rivais; sem valor, a Dificuldade decide. */
  rivals?: number;
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

/** Evento: acontecimento que exige atenção e pausa o relógio. Only the player's agency raises Eventos. */
export interface GameEvent {
  id: string;
  at: number;
  kind: 'arrival' | 'threat' | 'engage' | 'combat' | 'contract' | 'maintenance' | 'director' | 'objective' | 'team' | 'intel' | 'station';
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

/** Voo em andamento. */
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
  /** Itens capturados aguardando a escolha: Receptador ou Cofre. */
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
  /** Prazo de entrega. */
  deadline: number;
  status: 'offered' | 'accepted' | 'done' | 'failed' | 'expired';
  /** Agency that accepted it (contracts are disputed by every agency). */
  agencyId?: string;
  reputation: number;
}

// ── Combate ──────────────────────────────────────────────

/** Tática: Assalto, Defensiva, Infiltração, Negociar. */
export type Tactic = 'assault' | 'defensive' | 'infiltration' | 'negotiate';

/** Operações Especiais: roubo a banco, roubo de tecnologia, Neutralização. */
export type OperationKind = 'bank' | 'tech' | 'neutralize';

export interface CombatUnitRef {
  key: string;
  side: 'p' | 'e';
  unit: Unit;
  row: number;
  col: number;
}

export interface CombatFx {
  kind: 'hit' | 'down' | 'convert' | 'move' | 'breach';
  key: string;
  row: number;
  col: number;
  dmg?: number;
}

/** Where the agency's units in a combat come from, so results can be written back. */
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
  | { kind: 'rescue'; countryId: string; teamId: string }
  | { kind: 'intercept'; countryId: string; teamId: string }
  /** Ação hostil de uma Equipe contra a Estação de outra agência. */
  | { kind: 'hostile'; act: 'sabotage' | 'raid'; countryId: string; teamId: string; targetId: string };

export interface CombatState {
  id: string;
  agencyId: string;
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
  /** Agency units in reserve, not yet deployed. */
  reserve: Unit[];
  /** Furthest column held per row. */
  reach: number[];
  log: string[];
  fx: CombatFx[];
  result?: 'win' | 'lose' | 'draw';
  /** Agency units knocked out (become Feridas / Danificadas). */
  downed: string[];
  /** Agency units turned by enemy Agentes de Influência (lost). */
  turned: string[];
  /** Converted enemy units awaiting transfer to the agency. */
  converted: Unit[];
  sources: ForceSource[];
  /** Diretor está presente (perde → Detido/Sequestrado/morte). */
  directorPresent: boolean;
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

/** Combate aguardando a escolha de Tática (Diretor do jogador presente). */
export interface PendingCombat {
  agencyId: string;
  setup: CombatSetupData;
  /** Prévia: chance de vitória por Tática. */
  preview: Record<Tactic, number>;
}

export interface AgencyStats {
  operations: number;
  coups: number;
  combatsWon: number;
  combatsLost: number;
  trades: number;
  contractsDone: number;
  peakProfit: number;
}

/** A agência: a do jogador ou uma Agência Rival. Every action takes the acting Agency. */
export interface Agency {
  id: string;
  name: string;
  isPlayer: boolean;
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
  threats: Threat[];
  /** Reputação e Exposição por país. */
  standing: Record<string, Standing>;
  /** Manutenção em atraso (US$). */
  arrears: number;
  stats: AgencyStats;
}

export interface GameState {
  /** Versão do formato do save (src/game/save.ts). */
  saveVersion: number;
  seed: number;
  rng: number;
  /** Relógio contínuo em horas de jogo desde o início. */
  time: number;
  /** Last processed day boundary. */
  lastDay: number;
  options: GameOptions;
  /** Agencies; index 0 is the player's. */
  agencies: Agency[];
  countries: Record<string, Country>;
  /** Tensão Global 0..100. */
  tension: number;
  contracts: Contract[];
  group?: EnemyGroup;
  log: LogEntry[];
  /** Eventos ainda não vistos; os que existem pausam o relógio. */
  events: GameEvent[];
  pendingCombat?: PendingCombat;
  combat?: CombatState;
  over?: { won: boolean; reason: string; score: number };
  uidCounter: number;
  /** Memória das Agências Rivais (src/game/ai). */
  ai?: AiState;
  /** Quando foi gravado pela última vez (ms desde a época Unix). */
  savedAt?: number;
  /** Crise Final: horas acumuladas com a Tensão Global no Topo. */
  crisis?: { hours: number };
  /** Vendas de Armas de Destruição em Massa, para o epílogo da Crise Final. */
  wmdLedger?: { agencyId: string; itemId: string; qty: number; countryId: string; at: number }[];
}
