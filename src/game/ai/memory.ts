import { log } from '../state';
import type { Agency, GameState, Tone } from '../types';
import type { AiState, RivalMemory } from './types';

/** O GameState ganha `ai` pelo motor (types.ts); até lá a IA guarda a memória no mesmo lugar por cast. */
type WithAi = GameState & { ai?: AiState };

export function aiState(s: GameState): AiState {
  const g = s as WithAi;
  return (g.ai ??= { rivals: {} });
}

export const memoryOf = (s: GameState, agencyId: string): RivalMemory | undefined => aiState(s).rivals[agencyId];

/** Rancor dura cerca de um mês de jogo. */
export const GRUDGE_DECAY_H = 24 * 30;
export const GRUDGE_CAP = 10;

/**
 * Uma agência agrediu outra (sabotagem, roubo de Cofre, denúncia). Chamada pelas ações hostis do motor;
 * alimenta a retaliação da rival agredida. Sem efeito quando o alvo é o jogador.
 */
export function recordAggression(s: GameState, attackerId: string, targetId: string, weight = 1) {
  const m = memoryOf(s, targetId);
  if (!m || attackerId === targetId || !(weight > 0)) return;
  // Teto: rancor velho não se acumula sem fim.
  m.grudge[attackerId] = Math.min(GRUDGE_CAP, (m.grudge[attackerId] ?? 0) + weight);
}

export const money = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;

/** Notícia de uma rival no Relatório do jogador (não pausa o relógio). */
export function news(s: GameState, a: Agency, text: string, tone: Tone = 'intel', countryId?: string) {
  log(s, `${a.name} ${text}`, tone, countryId);
}
