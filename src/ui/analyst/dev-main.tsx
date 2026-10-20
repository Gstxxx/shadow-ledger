/**
 * Harness só de dev: `/src/ui/analyst/dev.html` abre a tela de jogo (que já monta a Analista) direto no
 * Preset Tutorial, sem passar pelo menu. `?new` começa partida nova (senão continua o save);
 * `?reset` esquece o que a Analista já explicou; `?preset=<id>` usa outro Preset; `?seed=n`.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { PRESETS } from '../../game/data/rules';
import { TUTORIAL_PRESET } from '../../game/tutorial';
import { useGameStore } from '../../store/game';
import { GameScreen } from '../game/GameScreen';
import { Toasts } from '../game/Toasts';
import { analystMemory } from './memory';

const q = new URLSearchParams(location.search);
if (q.has('reset')) analystMemory.reset();
const preset = [TUTORIAL_PRESET, ...PRESETS].find((p) => p.id === (q.get('preset') ?? TUTORIAL_PRESET.id)) ?? TUTORIAL_PRESET;
// Recarregar (HMR) continua a partida salva; `?new` começa outra.
if (q.has('new') || !useGameStore.getState().continueSaved())
  useGameStore.getState().start({ preset, difficulty: 1, hardcore: false, seed: Number(q.get('seed') ?? 11) });
history.replaceState(null, '', location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameScreen />
    <Toasts />
  </StrictMode>,
);
