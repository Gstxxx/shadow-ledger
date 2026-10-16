// Origens do Diretor (CONTEXT.md: Origem, Vantagem/Desvantagem; docs/ORIGENS.md).
// Números de partida; a sessão de balanceamento ajusta por simulação.
import type { CombatType, OriginId } from '../types';

/** Efeitos permanentes de uma Origem sobre as regras. Ausente = sem efeito. */
export interface OriginMods {
  /** Multiplicador do preço de venda (Comércio). */
  sellMult?: number;
  /** Multiplicador do custo de abrir/subir Estação. */
  stationCostMult?: number;
  /** Multiplicador do preço de compra de veículos e antiaéreos. */
  vehicleCostMult?: number;
  /** Multiplicador da Exposição gerada por Operações Especiais (e ações hostis). */
  opExposureMult?: number;
  /** Multiplicador de toda Exposição ganha em países em Paz. */
  peaceExposureMult?: number;
  /** Multiplicador dos ganhos de Reputação. */
  repGainMult?: number;
  /** Horas extras de aviso para batidas e processos. */
  legalWarningH?: number;
  /** Multiplicadores de capacidade e velocidade da Frota. */
  fleetCapMult?: number;
  fleetSpeedMult?: number;
  /** Multiplicador da Saturação causada pelas próprias vendas. */
  saturationMult?: number;
  /** Multiplicador da chance de interceptação ao pousar com itens capturados. */
  interceptMult?: number;
  /** Vê os preços dos países vizinhos a todas as Estações. */
  wideIntel?: boolean;
  /** A Prévia mostra a margem de erro. */
  previewMargin?: boolean;
  /** Reputação inicial nos países de nível 5. */
  startRepLevel5?: number;
  /** Força somada por Unidade em Combate, por tipo. `military` = só Unidades com força Militar. */
  strength?: Partial<Record<CombatType, number>>;
  /** Força Militar extra só para Unidades com força Militar. */
  militaryUnitsArmy?: number;
  /** Força somada ao Combate Militar quando o Diretor está presente. */
  directorArmy?: number;
  /** Escolta inicial com uma Unidade a menos. */
  oneUnitLess?: boolean;
  /** Escolta inicial sem combatentes (só jurídico e influência). */
  noFighters?: boolean;
}

export interface OriginDef {
  id: OriginId;
  /** Chaves i18n: origin.<id>.name / .desc / .advantage / .disadvantage (texto pt abaixo é fallback). */
  name: string;
  portrait: string;
  advantage: string;
  disadvantage: string;
  mods: OriginMods;
}

export const ORIGINS: OriginDef[] = [
  {
    id: 'exagent',
    name: 'Ex-Agente de Campo',
    portrait: 'sobretudo, olhar cansado, cicatriz',
    advantage: 'Operações Especiais geram 25% menos Exposição; a Escolta ganha +1 de força Urbana.',
    disadvantage: 'Começa com Reputação −10 nos países nível 5: seu nome está nos arquivos deles.',
    mods: { opExposureMult: 0.75, strength: { urban: 1 }, startRepLevel5: -10 },
  },
  {
    id: 'banker',
    name: 'Banqueira de Genebra',
    portrait: 'terno impecável, caneta-tinteiro',
    advantage: '+4% em todas as vendas; Estações custam 10% menos.',
    disadvantage: 'Escolta inicial com uma Unidade a menos; Combate Militar −1 com o Diretor presente.',
    mods: { sellMult: 1.04, stationCostMult: 0.9, oneUnitLess: true, directorArmy: -1 },
  },
  {
    id: 'colonel',
    name: 'Coronel da Reserva',
    portrait: 'farda sem insígnias, quepe',
    advantage: 'Veículos e antiaéreo custam 10% menos; Unidades Militares +1 de força Militar.',
    disadvantage: 'Exposição +15% em países em Paz: ninguém confia num coronel.',
    mods: { vehicleCostMult: 0.9, militaryUnitsArmy: 1, peaceExposureMult: 1.15 },
  },
  {
    id: 'diplomat',
    name: 'Diplomata Caída',
    portrait: 'óculos, lenço de seda',
    advantage: 'Reputação sobe 50% mais rápido; batidas e processos chegam com +2 dias de aviso.',
    disadvantage: 'Combate Urbano −1 para toda a Escolta.',
    mods: { repGainMult: 1.5, legalWarningH: 48, strength: { urban: -1 } },
  },
  {
    id: 'smuggler',
    name: 'Contrabandista',
    portrait: 'jaqueta de couro, cigarro apagado',
    advantage: 'Frota com +20% de capacidade e +10% de velocidade; vendas causam 25% menos Saturação.',
    disadvantage: 'Chance de interceptação ao pousar +30%.',
    mods: { fleetCapMult: 1.2, fleetSpeedMult: 1.1, saturationMult: 0.75, interceptMult: 1.3 },
  },
  {
    id: 'analyst',
    name: 'Analista de Sinais',
    portrait: 'fones no pescoço, tela refletida',
    advantage: 'Vê os preços dos países vizinhos às suas Estações; a Prévia mostra a margem de erro.',
    disadvantage: 'Começa sem combatentes na Escolta (só Pessoal jurídico e de influência).',
    mods: { wideIntel: true, previewMargin: true, noFighters: true },
  },
];

/** Origem neutra: saves antigos e partidas sem escolha. Não aparece na lista. */
export const NEUTRAL_ORIGIN: OriginDef = {
  id: 'none',
  name: 'Sem Origem',
  portrait: '',
  advantage: '',
  disadvantage: '',
  mods: {},
};

/** Origem padrão do Tutorial: a mais fácil para comércio. */
export const TUTORIAL_ORIGIN: OriginId = 'smuggler';

const BY_ID: Record<string, OriginDef> = Object.fromEntries([...ORIGINS, NEUTRAL_ORIGIN].map((o) => [o.id, o]));

export const originDef = (id: OriginId | undefined): OriginDef => BY_ID[id ?? 'none'] ?? NEUTRAL_ORIGIN;

/** Efeitos da Origem de uma agência (ou de nada). */
export const originMods = (a: { origin?: OriginId } | undefined): OriginMods => originDef(a?.origin).mods;

/** Origens que combinam com cada personalidade de Agência Rival (src/game/ai). */
export const ORIGINS_BY_PERSONALITY: Record<string, OriginId[]> = {
  mercador: ['banker', 'smuggler'],
  mercenaria: ['colonel', 'exagent'],
  sombra: ['exagent', 'analyst'],
  fantasma: ['diplomat', 'analyst'],
};
