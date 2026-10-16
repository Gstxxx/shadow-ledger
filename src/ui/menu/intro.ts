// Abertura "o último lançamento" (~4,9 s).
//
// Um livro-caixa sob a luz de uma luminária. As linhas (data, rota entre países, item, quantidade, valor)
// vão sendo lançadas e, uma a uma, engolidas por tarjas de censura: a sombra toma o livro.
// A última tarja, no centro, é a do nome: a câmera dá um soco até ela, a tarja recua e revela
// SHADOW LEDGER; o traço duplo vermelho de fechamento contábil sublinha o nome (livro balanceado).
// A luz baixa, a câmera recua e a mesma página vira o fundo do Título.
//
// Regras seguidas (motionmaxxing): a cena já começa em movimento; linhas entram em corte seco (estado);
// tarjas entram com glide e saem acelerando; um respiro de ~0,5 s antes de cada revelação;
// o nome chega por causa (é a última linha do livro), não por padrão; nada nasce de escala zero.

import { gsap } from 'gsap';
import { palette } from '../../art/tokens';
import { ease, f } from './ease';
import { sfx } from './settings';

export interface IntroEls {
  root: HTMLElement;
  camera: HTMLElement;
  rows: HTMLElement;
  dim: HTMLElement;
  lamp: HTMLElement;
  black: HTMLElement;
  world: HTMLElement;
  wordmark: HTMLElement;
  wmText: HTMLElement;
  wmBar: HTMLElement;
  wmRules: HTMLElement[];
  nav: HTMLElement[];
  extras: HTMLElement[];
}

/** Ampliação da câmera no soco até a última linha. */
const PUNCH = 3.2;
/** Instante em que a câmera recua para o Título. */
export const HANDOFF_AT = 4.1;

export function measure(els: IntroEls) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const rowH = parseFloat(getComputedStyle(els.rows).getPropertyValue('--row-h')) || 28;
  gsap.set(els.wordmark, { clearProps: 'transform' });
  const wm = els.wordmark.getBoundingClientRect();
  const tx = els.wmText.getBoundingClientRect();
  const cx = tx.left + tx.width / 2;
  const cy = tx.top + tx.height / 2;
  const s = (rowH * PUNCH * 0.86) / tx.height;
  return {
    W,
    H,
    rowH,
    s,
    x: W / 2 - cx,
    y: H / 2 - cy,
    origin: `${cx - wm.left}px ${cy - wm.top}px`,
    /** Largura da tarja da linha central, em px de página, para casar com a tarja do nome no corte. */
    centerBarW: ((tx.width + rowH * 0.5) * s) / PUNCH,
  };
}

function rowsOf(els: IntroEls) {
  const all = Array.from(els.rows.querySelectorAll<HTMLElement>('.slm-row'));
  const k = all.findIndex((r) => r.dataset.center === 'true');
  return { all, k };
}

/** Estado final (Título) sem animação: reduzir movimento, pular abertura, redimensionar. */
export function finalState(els: IntroEls) {
  const { all, k } = rowsOf(els);
  gsap.set(els.camera, { scale: 1, y: 0, rotation: 0 });
  gsap.set(els.lamp, { '--lx': '58%', '--ly': '40%' });
  gsap.set(els.rows, { y: 0 });
  gsap.set(els.black, { autoAlpha: 0 });
  gsap.set(els.dim, { opacity: 0.86 });
  gsap.set(els.lamp, { opacity: 1 });
  gsap.set(els.world, { autoAlpha: 1 });
  all.forEach((r, i) => {
    gsap.set(r, { autoAlpha: i <= k ? 1 : 0 });
    gsap.set(r.querySelectorAll('.slm-bar'), { scaleX: i <= k ? 1 : 0 });
  });
  gsap.set(els.wordmark, { autoAlpha: 1, clearProps: 'transform' });
  gsap.set(els.wmText, { color: palette.ink100 });
  gsap.set(els.wmBar, { scaleX: 0 });
  gsap.set(els.wmRules, { scaleX: 1, backgroundColor: palette.signal500 });
  gsap.set([...els.nav, ...els.extras], { autoAlpha: 1, y: 0 });
}

export function buildIntro(els: IntroEls, onDone: () => void): gsap.core.Timeline {
  const m = measure(els);
  const { all, k } = rowsOf(els);
  const center = all[k];
  const centerBar = center.querySelector<HTMLElement>('.slm-bar')!;
  centerBar.style.width = `${m.centerBarW}px`;
  centerBar.style.left = `calc(50% - ${m.centerBarW / 2}px)`;

  const tl = gsap.timeline({ onComplete: onDone });

  // Estado inicial: página já escrita até ~7 linhas antes do fim; metade já censurada.
  const NEW = 7;
  const firstNew = k - NEW + 1;
  tl.set(els.black, { autoAlpha: 1 }, 0)
    .set(els.dim, { opacity: 0 }, 0)
    .set(els.world, { autoAlpha: 0 }, 0)
    .set(els.wordmark, { autoAlpha: 0, x: m.x, y: m.y, scale: m.s, transformOrigin: m.origin }, 0)
    .set(els.wmText, { color: palette.paper900 }, 0)
    .set(els.wmBar, { scaleX: 1, transformOrigin: '100% 50%' }, 0)
    .set(els.wmRules, { scaleX: 0, transformOrigin: '0% 50%', backgroundColor: palette.stampRed }, 0)
    .set([...els.nav, ...els.extras], { autoAlpha: 0, y: 14 }, 0);

  const pending: HTMLElement[] = [];
  all.forEach((r, i) => {
    const bars = r.querySelectorAll<HTMLElement>('.slm-bar');
    const pre = i < firstNew;
    tl.set(r, { autoAlpha: pre ? 1 : 0 }, 0);
    const already = pre && (i * 7) % 3 !== 0;
    tl.set(bars, { scaleX: already ? 1 : 0, transformOrigin: '0% 50%' }, 0);
    if (pre && !already) pending.push(r);
  });

  // Luz acende sobre uma página que já está rolando; a câmera avança devagar.
  tl.to(els.black, { autoAlpha: 0, duration: f(13), ease: ease.softInOut }, 0)
    .set(els.lamp, { '--lx': '50%', '--ly': '60%' }, 0)
    // A linha de escrita fica abaixo do centro (página cheia acima); o soco recentra no corte.
    .fromTo(els.camera, { scale: 1.3, rotation: -1.8, y: m.H * 0.16 }, { scale: 1.42, rotation: -0.9, y: m.H * 0.12, duration: 2.6, ease: ease.cruise }, 0)
    .fromTo(els.rows, { y: m.rowH * 0.7 }, { y: 0, duration: 2.6, ease: ease.cruise }, 0);

  // Lançamentos novos: corte seco (é um registro, não uma animação), intervalos irregulares.
  const writeAt = [0.18, 0.4, 0.55, 0.78, 0.96, 1.2, 1.52];
  for (let j = 0; j < NEW; j++) {
    const r = all[firstNew + j];
    const t = writeAt[j];
    tl.set(r, { autoAlpha: 1 }, t).call(() => sfx('type'), undefined, t);
    if (r !== center) {
      tl.to(r.querySelectorAll('.slm-bar'), { scaleX: 1, duration: f(7), ease: ease.glide, stagger: f(2) }, t + 0.24 + (j % 3) * 0.06);
    }
  }
  // A sombra alcança as linhas antigas que ainda estavam limpas, numa onda irregular.
  pending.forEach((r, j) => {
    tl.to(r.querySelectorAll('.slm-bar'), { scaleX: 1, duration: f(7), ease: ease.glide, stagger: f(2) }, 0.3 + j * 0.17 + (j % 2) * 0.05);
  });
  // A última linha recebe a tarja mais pesada.
  tl.to(centerBar, { scaleX: 1, duration: f(10), ease: ease.softLand }, 1.86).call(() => sfx('redact'), undefined, 1.86);

  // Respiro: a luz da luminária oscila duas vezes (passos de 2 quadros).
  tl.set(els.lamp, { opacity: 0.82 }, 2.22)
    .set(els.lamp, { opacity: 1 }, 2.22 + f(2))
    .set(els.lamp, { opacity: 0.9 }, 2.22 + f(5))
    .set(els.lamp, { opacity: 1 }, 2.22 + f(7));

  // Soco de câmera de 1 quadro até a última linha; troca a tarja da linha pela tarja do nome no corte.
  const P = 2.6;
  tl.set(els.camera, { scale: PUNCH * 1.07, rotation: 0, y: 0 }, P)
    .set(els.lamp, { '--ly': '50%' }, P)
    .set(center, { autoAlpha: 0 }, P)
    .set(els.wordmark, { autoAlpha: 1 }, P)
    .to(els.camera, { scale: PUNCH, duration: f(14), ease: ease.softLand }, P)
    // Sem salto visível: o nome acompanha o assentamento da câmera.
    .fromTo(els.wordmark, { scale: m.s * 1.07 }, { scale: m.s, duration: f(14), ease: ease.softLand, immediateRender: false }, P);

  // A tarja recua e revela o nome (sai acelerando, como quem arranca uma fita).
  const R = P + 0.34;
  tl.to(els.wmBar, { scaleX: 0, duration: f(10), ease: ease.accelExit }, R).call(() => sfx('redact'), undefined, R);

  // Traço duplo de fechamento contábil.
  const U = R + 0.42;
  tl.to(els.wmRules[0], { scaleX: 1, duration: f(11), ease: ease.softLand }, U)
    .to(els.wmRules[1], { scaleX: 1, duration: f(11), ease: ease.softLand }, U + f(3))
    .call(() => sfx('click'), undefined, U);

  // Respiro com o nome lido; a câmera se afasta 3% bem devagar.
  tl.to(els.camera, { scale: PUNCH * 0.97, duration: HANDOFF_AT - (P + f(14)), ease: ease.cruise }, P + f(14));
  tl.to(els.wordmark, { scale: m.s * 0.97, duration: HANDOFF_AT - (P + f(14)), ease: ease.cruise }, P + f(14));

  // Passagem para o Título: a luz baixa, a câmera recua, o nome vai para o lugar dele.
  const D = f(22);
  tl.set(center, { autoAlpha: 1 }, HANDOFF_AT)
    .to(els.camera, { scale: 1, duration: D, ease: ease.softInOut }, HANDOFF_AT)
    .to(els.wordmark, { x: 0, y: 0, scale: 1, duration: D, ease: ease.softInOut }, HANDOFF_AT)
    .to(els.dim, { opacity: 0.86, duration: f(12), ease: ease.softInOut }, HANDOFF_AT - f(2))
    .to(els.lamp, { '--lx': '58%', '--ly': '40%', duration: D, ease: ease.softInOut }, HANDOFF_AT)
    .to(els.wmText, { color: palette.ink100, duration: f(14), ease: ease.softInOut }, HANDOFF_AT + f(2))
    .to(els.wmRules, { backgroundColor: palette.signal500, duration: f(14), ease: ease.softInOut }, HANDOFF_AT + f(2))
    .to(els.world, { autoAlpha: 1, duration: f(20), ease: ease.cruise }, HANDOFF_AT + f(8));

  // Itens do menu entram como novos lançamentos, intervalos irregulares, caudas sobrepostas.
  const N = HANDOFF_AT + f(13);
  const gaps = [0, 3, 5, 7, 10, 12];
  [...els.nav, ...els.extras].forEach((el, i) => {
    tl.to(el, { autoAlpha: 1, y: 0, duration: f(12), ease: ease.softLand }, N + f(gaps[Math.min(i, gaps.length - 1)]));
  });

  return tl;
}
