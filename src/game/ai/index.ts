// IA das Agências Rivais. Ganchos do motor: setupRivals (newGame) e tickRivals (tick); recordAggression
// (ações hostis entre agências). Ver docs/AI.md.
export { decide, tickRivals } from './brain';
export { aiState, memoryOf, recordAggression } from './memory';
export { CRISIS_TENSION, DIFFICULTY_AI, PERSONALITIES } from './profiles';
export type { DifficultyProfile, Personality } from './profiles';
export { setupRivals } from './setup';
export type { AiState, PersonalityId, RivalMemory, TeamOrder, TradePlan } from './types';
