// Memória das RivalBrains. Tudo aqui é JSON puro: entra no save junto com o GameState.

/** Personalidade de uma Agência Rival: define os pesos de decisão. */
export type PersonalityId = 'mercador' | 'mercenaria' | 'sombra' | 'fantasma';

/** Plano de Comércio em andamento (o deslocamento é só o voo real da Frota rival). */
export interface TradePlan {
  itemId: string;
  /** País onde comprar; undefined quando a Carga já está a bordo. */
  buyIn?: string;
  sellIn: string;
  qty: number;
  /** Contrato que este plano entrega. */
  contractId?: string;
  /** Desiste do plano se não fechar até aqui (horas). */
  expires: number;
}

/** Operação de uma Equipe rival: o alvo é um país ou outra agência. */
export interface TeamOrder {
  teamId: string;
  countryId: string;
  kind: 'bank' | 'tech' | 'neutralize' | 'sabotage' | 'vault' | 'rescue';
  /** Agência alvo (sabotage / vault). */
  targetId?: string;
  expires: number;
}

export interface RivalMemory {
  agencyId: string;
  personality: PersonalityId;
  /** Próxima decisão (horas de jogo). */
  nextAt: number;
  /** Última decisão (horas de jogo). */
  lastAt: number;
  plan?: TradePlan;
  orders: TeamOrder[];
  /** Rancor por agência: sobe com agressões sofridas e decai sozinho. */
  grudge: Record<string, number>;
  /** Última ação hostil contra outra agência (horas). */
  lastStrikeAt: number;
  /** Recuou do mercado de Armas de Destruição em Massa com medo da Crise Final. */
  wmdRetreat?: boolean;
  /** Último negócio de ADM planejado (horas). */
  lastWmdAt?: number;
  /** Decisões tomadas (diagnóstico e testes). */
  decisions: number;
}

export interface AiState {
  rivals: Record<string, RivalMemory>;
}
