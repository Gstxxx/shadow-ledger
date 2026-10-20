// Objetivo guiado do início de partida: cada passo termina sozinho quando o estado do jogo mostra que o
// jogador fez a coisa (comprou, voou, vendeu, abriu Estação, aceitou Contrato). Puro: sem React.
import { setupRivals } from '../ai/setup';
import { player } from '../state';
import type { Agency, GameState } from '../types';
import { lockedSystems, setTutorial, tutorialOf } from './locks';
import type { GuideStepId, TutorialState } from './types';

export const GUIDE_STEPS: GuideStepId[] = ['buy', 'fly', 'sell', 'station', 'contract', 'free'];

/** Âncoras `data-tour` do spotlight, em ordem de preferência (a primeira visível ganha). */
export const STEP_TARGETS: Record<GuideStepId, string[]> = {
  buy: ['buy', 'market', 'market-dock', 'drawer-left'],
  fly: ['fly', 'map'],
  sell: ['sell', 'market', 'market-dock', 'drawer-left'],
  station: ['open-station', 'drawer-left'],
  contract: ['tab-contracts', 'drawer-right'],
  free: [],
};

/** Horas de jogo que o passo do Contrato espera antes de seguir sozinho. */
export const CONTRACT_PATIENCE_H = 24 * 7;

const cargoUnits = (a: Agency) => a.cargo.reduce((x, l) => x + l.qty, 0);
const myContracts = (s: GameState, a: Agency) => s.contracts.filter((k) => k.agencyId === a.id).length;

function markOf(s: GameState): TutorialState['mark'] {
  const a = player(s);
  return { cargo: cargoUnits(a), stations: a.stations.length, contracts: myContracts(s, a), location: a.location, at: s.time };
}

/** O passo terminou? Comparado com a marca tirada quando ele começou. */
function stepDone(s: GameState, t: TutorialState): boolean {
  const a = player(s);
  const m = t.mark;
  switch (t.step) {
    case 'buy':
      return cargoUnits(a) > m.cargo;
    case 'fly':
      return !!a.flight || a.location !== m.location;
    case 'sell':
      // Vendeu (ou entregou) algo depois de pousar em outro país.
      return !a.flight && cargoUnits(a) < m.cargo;
    case 'station':
      return a.stations.length > m.stations;
    case 'contract':
      // Contratos aparecem ao acaso: sem oferta boa em uma semana, o guia segue sem ele.
      return myContracts(s, a) > m.contracts || s.time - m.at > CONTRACT_PATIENCE_H;
    case 'free':
      return false;
  }
}

/** Fim do Tutorial: libera os sistemas travados pelo Preset e traz as Agências Rivais. */
export function unlockSystems(s: GameState) {
  const t = tutorialOf(s);
  if (!t || t.unlocked) return;
  t.unlocked = true;
  if (lockedSystems(s).includes('rivals')) setupRivals(s);
}

export function startTutorial(s: GameState): TutorialState {
  const t: TutorialState = { step: 'buy', mark: markOf(s), done: [] };
  setTutorial(s, t);
  return t;
}

/**
 * Avança o guia conforme o estado. Chame a cada render da tela de jogo (barato).
 * Devolve os passos concluídos agora, para a Analista comemorar.
 */
export function updateTutorial(s: GameState): GuideStepId[] {
  const t = tutorialOf(s) ?? startTutorial(s);
  const finished: GuideStepId[] = [];
  let guard = 0;
  while (!t.skipped && t.step !== 'free' && stepDone(s, t) && guard++ < GUIDE_STEPS.length) {
    finished.push(t.step);
    t.done.push(t.step);
    t.step = GUIDE_STEPS[GUIDE_STEPS.indexOf(t.step) + 1];
    t.mark = markOf(s);
  }
  if (t.step === 'free' || t.skipped) unlockSystems(s);
  return finished;
}

/** O jogador dispensou o guia: também encerra o Tutorial (libera os sistemas). */
export function skipGuide(s: GameState) {
  const t = tutorialOf(s) ?? startTutorial(s);
  t.skipped = true;
  unlockSystems(s);
}

/** Posição do passo atual (1..n) e total de passos com objetivo (sem o "free"). */
export function guideProgress(t: TutorialState): { n: number; total: number } {
  const total = GUIDE_STEPS.length - 1;
  return { n: Math.min(total, GUIDE_STEPS.indexOf(t.step) + 1), total };
}
