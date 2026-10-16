// Personalidades e Dificuldade das Agências Rivais. Só pesos e ritmos: as regras são as do motor (ADR 0002).
import type { Difficulty, UnitClass } from '../types';
import type { PersonalityId } from './types';

export interface Personality {
  id: PersonalityId;
  label: string;
  /** Peso de cada frente de decisão (0..1+). */
  trade: number;
  stations: number;
  military: number;
  operations: number;
  /** Disposição para agir contra outras agências (inclusive o jogador). */
  hostility: number;
  /** Preferência por classe de item no Comércio. */
  itemBias: Partial<Record<UnitClass, number>>;
  /** Operações preferidas contra países. */
  ops: { bank: number; tech: number; neutralize: number };
  /** Ação preferida contra agências. */
  strikes: { sabotage: number; vault: number; denounce: number };
  /** Apetite por Armas de Destruição em Massa (0 = nunca toca). */
  wmd: number;
  /** Tensão Global a partir da qual recua do mercado de ADM com medo da Crise Final (101 = nunca). */
  crisisFear: number;
  /** Fração do caixa que nunca arrisca. */
  reserve: number;
  /** Quanto evita Exposição alta (0..1). */
  caution: number;
  /** Tamanho desejado da Escolta. */
  escort: number;
}

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  mercador: {
    id: 'mercador',
    label: 'Mercador',
    trade: 1,
    stations: 0.9,
    military: 0.35,
    operations: 0.15,
    hostility: 0.25,
    itemBias: { special: 1.1, vehicle: 1.05 },
    ops: { bank: 0.2, tech: 0.7, neutralize: 0.1 },
    strikes: { sabotage: 0.2, vault: 0.3, denounce: 1 },
    wmd: 0,
    crisisFear: 80,
    reserve: 0.2,
    caution: 0.8,
    escort: 3,
  },
  mercenaria: {
    id: 'mercenaria',
    label: 'Mercenária',
    trade: 0.75,
    stations: 0.6,
    military: 1,
    operations: 0.9,
    hostility: 0.85,
    itemBias: { arms: 1.4, vehicle: 1.2, human: 1.1 },
    ops: { bank: 1, tech: 0.3, neutralize: 0.6 },
    strikes: { sabotage: 1, vault: 0.8, denounce: 0.2 },
    wmd: 0.6,
    crisisFear: 92,
    reserve: 0.12,
    caution: 0.3,
    escort: 6,
  },
  sombra: {
    id: 'sombra',
    label: 'Estado-Sombra',
    trade: 0.6,
    stations: 1.1,
    military: 0.6,
    operations: 0.7,
    hostility: 0.6,
    itemBias: { special: 1.5, antiair: 1.2, jet: 1.1 },
    ops: { bank: 0.1, tech: 0.8, neutralize: 1 },
    strikes: { sabotage: 0.5, vault: 0.3, denounce: 1 },
    wmd: 1,
    crisisFear: 101,
    reserve: 0.18,
    caution: 0.5,
    escort: 4,
  },
  fantasma: {
    id: 'fantasma',
    label: 'Fantasma',
    trade: 0.85,
    stations: 0.7,
    military: 0.5,
    operations: 0.6,
    hostility: 0.45,
    itemBias: { special: 1.3, arms: 1.1 },
    ops: { bank: 0.3, tech: 1, neutralize: 0.2 },
    strikes: { sabotage: 0.3, vault: 1, denounce: 0.5 },
    wmd: 0.3,
    crisisFear: 85,
    reserve: 0.15,
    caution: 0.9,
    escort: 3,
  },
};

export const PERSONALITY_ORDER: PersonalityId[] = ['mercador', 'mercenaria', 'sombra', 'fantasma'];

/** O que a Dificuldade muda na IA (nunca as regras). */
export interface DifficultyProfile {
  /** Quantas rivais: [mínimo, máximo]. */
  count: [number, number];
  /** Multiplica `hostility` e `operations`. */
  aggression: number;
  /** Qualidade das escolhas 0..1: amostra de países avaliados, ruído nas estimativas, margem de segurança. */
  quality: number;
  /** Intervalo entre decisões, em horas de jogo (com jitter). */
  interval: [number, number];
  /** Multiplicador do capital inicial do Preset. */
  cash: number;
  /** Fração do caixa disponível que entra num único lote de Comércio. */
  stake: number;
}

export const DIFFICULTY_AI: Record<Difficulty, DifficultyProfile> = {
  1: { count: [1, 1], aggression: 0.3, quality: 0.3, interval: [24, 40], cash: 0.6, stake: 0.2 },
  2: { count: [2, 2], aggression: 0.65, quality: 0.65, interval: [10, 18], cash: 0.9, stake: 0.35 },
  3: { count: [3, 4], aggression: 1, quality: 0.95, interval: [6, 11], cash: 1.15, stake: 0.5 },
};

/** Tensão Global em que a IA considera a Crise Final iminente. */
export const CRISIS_TENSION = 95;

export const RIVAL_NAMES = [
  'Rede Basalto',
  'Consórcio Vesper',
  'Grupo Halcyon',
  'Casa Moravia',
  'Sindicato Oriel',
  'Firma Lazuli',
  'Companhia Sarabande',
];
