// Prévia isolada do menu: /src/ui/menu/preview.html no servidor Vite (não entra no build do jogo).
// ?skip=1 pula a abertura; ?rm=1 força reduzir movimento.
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ConnectedMainMenu } from './ConnectedMainMenu';
import { useSettings } from '../../store/settings';

const q = new URLSearchParams(location.search);
if (q.get('rm') === '1') useSettings.getState().setReducedMotion(true);
if (q.get('rm') === '0') useSettings.getState().setReducedMotion(false);

// Para inspeção com o painel oculto (rAF parado): window.__gsap.ticker.tick()
(window as unknown as { __gsap: typeof gsap }).__gsap = gsap;

createRoot(document.getElementById('root')!).render(<ConnectedMainMenu skipIntro={q.get('skip') === '1'} />);
