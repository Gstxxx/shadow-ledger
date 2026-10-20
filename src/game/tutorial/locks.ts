// Sistemas desligados pelo Preset Tutorial até o fim do guia. O motor consulta `isLocked` antes de
// formar Equipes, iniciar Operações, mexer na Tensão Global e criar Agências Rivais.
import { M } from '../msg';
import type { Msg } from '../msg';
import type { GameState, PresetDef } from '../types';
import type { SystemId, TutorialState } from './types';

/** O motor ganha `tutorial`/`locked` em types.ts; até lá o acesso é por cast. */
type WithTutorial = GameState & { tutorial?: TutorialState };
type LockedPreset = PresetDef & { locked?: SystemId[] };

export const tutorialOf = (s: GameState): TutorialState | undefined => (s as WithTutorial).tutorial;

export function setTutorial(s: GameState, t: TutorialState) {
  (s as WithTutorial).tutorial = t;
}

export const lockedSystems = (s: GameState): SystemId[] => (s.options.preset as LockedPreset).locked ?? [];

/** O sistema está desligado nesta partida (Preset Tutorial ainda não concluído). */
export function isLocked(s: GameState, sys: SystemId): boolean {
  return lockedSystems(s).includes(sys) && !tutorialOf(s)?.unlocked;
}

/** Motivo para o Result de uma ação travada (traduzido na exibição). */
export const LOCKED_MSG: Msg = M('analyst.locked');
