// Campanha "Herança" (docs/CAMPANHA.md): estado que atravessa os Capítulos.
import type { Difficulty, ObjectiveKind, OriginId, PresetDef, Unit } from '../types';

/** Força da Casa Moravia num Capítulo (multiplica o caixa e o plantel da rival). */
export type RivalStrength = 'weak' | 'normal' | 'strong';

export interface ChapterDef {
  /** 1..10 */
  n: number;
  /** Preset do Capítulo (id `campaign-N`). */
  preset: PresetDef;
  /** Casa Moravia ativa neste Capítulo. */
  rival?: RivalStrength;
  /** Nome do refém (Resgate) ou do Grupo Hostil (Destruir), quando a história fixa. */
  hostage?: string;
  group?: string;
  /** Falas do Analista: chaves i18n com o momento (fração do prazo) em que aparecem. */
  beats: { at: number; key: string }[];
  /** Pista do Dossiê liberada ao vencer (id = n do Capítulo). */
  dossier: number;
}

export interface ChapterRecord {
  n: number;
  profit: number;
  day: number;
  attempts: number;
}

export type CampaignStatus = 'active' | 'won' | 'lost';

/** O save separado da Campanha. Versionado à parte do save da partida. */
export interface CampaignState {
  campaignVersion: number;
  seed: number;
  difficulty: Difficulty;
  hardcore: boolean;
  origin: OriginId;
  directorName?: string;
  agencyName?: string;
  /** Índice 1..10 do Capítulo atual (o próximo a jogar). */
  chapter: number;
  /** Tentativas no Capítulo atual (muda a semente de cada retry). */
  attempts: number;
  /** Até 3 Unidades do Pessoal, já curadas. */
  veterans: Unit[];
  /** Reputação levada por país (já trazida metade do caminho até Neutro). */
  reputation: Record<string, number>;
  /** Lucro do Capítulo anterior (base do bônus de caixa). */
  lastProfit: number;
  /** Pistas do Dossiê liberadas (números dos Capítulos). */
  dossier: number[];
  history: ChapterRecord[];
  status: CampaignStatus;
}

export interface NewCampaignOptions {
  difficulty: Difficulty;
  hardcore: boolean;
  origin: OriginId;
  directorName?: string;
  agencyName?: string;
  seed?: number;
}

/** Marca da Campanha dentro de uma partida (GameState.campaign). */
export interface CampaignMark {
  chapter: number;
  /** Índices das falas do Analista já mostradas. */
  beats: number[];
}

/** Resultado de um Capítulo terminado, para o Debriefing. */
export interface ChapterResult {
  won: boolean;
  /** Derrota no Modo Hardcore: a Campanha acabou. */
  hardcoreLost: boolean;
  /** Último Capítulo vencido: a Campanha terminou. */
  final: boolean;
  chapter: number;
  objective: ObjectiveKind;
  /** Pista nova do Dossiê (só quando venceu). */
  dossier?: number;
  /** Pessoal vivo que pode virar Veterano. */
  candidates: Unit[];
  maxVeterans: number;
  profit: number;
  /** Bônus de caixa que o próximo Capítulo receberia. */
  cashBonusNext: number;
}
