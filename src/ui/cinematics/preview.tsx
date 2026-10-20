// Prévia da cena do Golpe. ?render=1 (pausada, para o render) · ?rm=1 (reduzir movimento) · ?country=818 (id numérico) · ?lang=en
// Depois do corte mostra 1,3 s de um tabuleiro de Combate parado, para o vídeo terminar no "corte seco".
// ?cine=raid-held|raid-lost|raid-interdicted|hunt|crisis|finale mostra as outras cenas pelo CinematicHost (como no jogo);
// ?cresult=win|lose|final mostra o resultado de capítulo da Campanha.
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import '../../index.css';
import '../../art/tokens.css';
import '../../art/game-ui.css';
import '../../art/game-ui-2.css';
import { getLang, translate } from '../../i18n';
import { countryName } from '../../i18n/lookup';
import { audio } from '../../audio/engine';
import { buildCoup } from './coup';
import { CinematicHost } from './CinematicHost';
import { installSafeAreaDebug } from '../game/portrait/safeArea';
installSafeAreaDebug();
import './coup.css';
import './preview.css';

const q = new URLSearchParams(location.search);
const RENDER = q.get('render') === '1';
const lang = getLang();
type K = Parameters<typeof translate>[1];
type P = Parameters<typeof translate>[2];
const t = (k: K, p?: P) => translate(lang, k, p);

function Board() {
  const cells = Array.from({ length: 24 }, (_, i) => <span key={i} className="cp-cell" />);
  return (
    <div className="cp-after">
      <header className="cp-hud">
        <span className="cp-type">{t('combat.army')}</span>
        <strong>{countryName(q.get('country') ?? '818', lang)}</strong>
      </header>
      <div className="g-board cp-board">{cells}</div>
    </div>
  );
}

const root = document.getElementById('root')!;
const CINE = q.get('cine') ?? (q.get('cresult') ? 'none' : null);
createRoot(root).render(
  <>
    <Board />
    {CINE && <CinematicHost />}
  </>,
);
const host = document.createElement('div');
if (!CINE) document.body.appendChild(host);
const h = buildCoup(host, {
  text: {
    kicker: t('cine.coup.kicker'),
    title: t('cine.coup.title', { country: countryName(q.get('country') ?? '818', lang) }),
    telex: [t('cine.coup.telex.1'), t('cine.coup.telex.2'), t('cine.coup.telex.3')],
    map: t('cine.coup.map'),
    skip: t('cine.skip'),
  },
  reduced: q.get('rm') === '1',
  sound: RENDER ? undefined : (n) => audio.sfx(n),
  onDone: () => {
    if (!RENDER) setTimeout(() => host.remove(), 0);
  },
});
// Linha mestra: a cena e, depois do corte, o tabuleiro por 1,3 s (o preto do corte some num quadro).
const master = gsap.timeline({ paused: true });
master.add(h.tl.paused(false), 0);
const cut = host.querySelector('.cc-root') as HTMLElement;
master.set(cut, { opacity: 0 }, h.cutAt + 1 / 30);
master.to({}, { duration: 1.3 }, h.cutAt);
const w = window as unknown as { __seek?: (s: number) => void; __duration?: number };
w.__duration = master.duration();
w.__seek = (s: number) => {
  master.seek(s, false);
};
if (!RENDER) {
  const go = () => {
    audio.unlock();
    master.restart();
  };
  document.addEventListener('pointerdown', go, { once: true });
}
