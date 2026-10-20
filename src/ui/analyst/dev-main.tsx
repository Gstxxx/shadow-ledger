/**
 * Harness só de dev: `/src/ui/analyst/dev.html` monta a tela de jogo com o Preset Tutorial e a Analista
 * por cima, sem depender da montagem em GameScreen. `?new` começa partida nova (senão continua o save);
 * `?reset` esquece o que a Analista já explicou; `?preset=<id>` usa outro Preset; `?seed=n`.
 * Enquanto a tela de jogo não tiver os `data-tour`, um shim marca os alvos pelo texto dos botões.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { PRESETS } from '../../game/data/rules';
import { TUTORIAL_PRESET } from '../../game/tutorial';
import { useGameStore } from '../../store/game';
import { GameScreen } from '../game/GameScreen';
import { Toasts } from '../game/Toasts';
import { AnalystLayer } from './AnalystLayer';
import { analystMemory } from './memory';

const q = new URLSearchParams(location.search);
if (q.has('reset')) analystMemory.reset();
const preset = [TUTORIAL_PRESET, ...PRESETS].find((p) => p.id === (q.get('preset') ?? TUTORIAL_PRESET.id)) ?? TUTORIAL_PRESET;
// Recarregar (HMR) continua a partida salva; `?new` começa outra.
if (q.has('new') || !useGameStore.getState().continueSaved())
  useGameStore.getState().start({ preset, difficulty: 1, hardcore: false, seed: Number(q.get('seed') ?? 11) });
history.replaceState(null, '', location.pathname);

const SHIM: [string, (el: HTMLElement) => boolean][] = [
  ['map', (el) => el.classList.contains('map-area')],
  ['buy', (el) => el.tagName === 'BUTTON' && /^(Comprar|Buy)\b/.test(el.textContent?.trim() ?? '')],
  ['sell', (el) => el.tagName === 'BUTTON' && /^(Vender|Sell)\b/.test(el.textContent?.trim() ?? '')],
  ['fly', (el) => el.tagName === 'BUTTON' && /Voar|Fly/.test(el.textContent ?? '')],
  ['open-station', (el) => el.tagName === 'BUTTON' && /^(Abrir|Open)\b/.test(el.textContent?.trim() ?? '')],
  ['tab-contracts', (el) => el.getAttribute('role') === 'tab' && /Contrat/.test(el.textContent ?? '')],
  ['market', (el) => el.classList.contains('mkt-segs')],
];

function shim() {
  // Só completa os alvos que a tela real ainda não marca.
  const real = new Set([...document.querySelectorAll<HTMLElement>('[data-tour]:not([data-shim])')].map((el) => el.dataset.tour));
  document.querySelectorAll<HTMLElement>('[data-shim]').forEach((el) => {
    delete el.dataset.tour;
    delete el.dataset.shim;
  });
  for (const el of document.querySelectorAll<HTMLElement>('button:not([data-tour]), [role="tab"]:not([data-tour]), .mkt-segs')) {
    const hit = SHIM.find(([id, test]) => !real.has(id) && test(el));
    if (hit) {
      el.dataset.tour = hit[0];
      el.dataset.shim = '1';
    }
  }
}
window.setInterval(shim, 250);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameScreen />
    <AnalystLayer />
    <Toasts />
  </StrictMode>,
);
