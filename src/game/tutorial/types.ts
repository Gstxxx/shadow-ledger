// Tipos do Tutorial e do objetivo guiado. JSON puro: vivem no GameState e entram no save.

/** Sistemas que um Preset pode deixar desligados até o fim do Tutorial. */
export type SystemId = 'teams' | 'operations' | 'rivals' | 'tension';

/** Passos do objetivo guiado do início de partida. */
export type GuideStepId = 'buy' | 'fly' | 'sell' | 'station' | 'contract' | 'free';

export interface TutorialState {
  /** Passo atual do objetivo guiado. */
  step: GuideStepId;
  /** Contadores do momento em que o passo começou (para detectar a conclusão pelo estado do jogo). */
  mark: { cargo: number; stations: number; contracts: number; location: string; at: number };
  /** O jogador dispensou o guia nesta partida. */
  skipped?: boolean;
  /** Sistemas travados pelo Preset já liberados (fim do Tutorial). */
  unlocked?: boolean;
  /** Passos concluídos, em ordem (diagnóstico e testes). */
  done: GuideStepId[];
}
