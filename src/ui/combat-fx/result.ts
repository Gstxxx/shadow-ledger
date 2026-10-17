// Tela de resultado do Combate (Vitória / Derrota): construtor de DOM + timeline GSAP seek-safe.
// Serve ao jogo (via <CombatResult>, que toca e deixa pular) e ao exemplo/vídeo (timeline aninhada no roteiro).
//
// Vitória: hit-stop do último golpe, flash âmbar, tabuleiro recua e escurece, carimbo cai de 1,6× e bate (tremor +
// poeira de papel + estilhaços de tinta), linhas de dossiê varrem, cartões do resumo em stagger com contadores.
// Derrota: tela dessatura e treme, tarjas de censura fecham sobre o tabuleiro uma a uma, carimbo FRACASSO com tinta
// borrada, vinheta pulsando, resumo das perdas. Concluir só aparece depois do clímax (~1,2 s).

import { gsap } from 'gsap';
import { ease, f } from '../menu/ease';

export interface ResultItem {
  label: string;
  value: number;
  /** Formata o número (ex.: dinheiro). Padrão: inteiro. */
  format?: (n: number) => string;
  tone?: 'good' | 'bad' | 'neutral';
}

export interface ResultOptions {
  kind: 'win' | 'lose';
  /** Texto do carimbo (já traduzido). */
  title: string;
  items: ResultItem[];
  /** Rótulo do botão Concluir; sem `onDone`, o botão não aparece (vídeo). */
  doneLabel?: string;
  onDone?: () => void;
  /** Elemento do tabuleiro: recua/escurece na vitória, dessatura e recebe as tarjas na derrota. */
  board?: HTMLElement | null;
  reduced?: boolean;
  /** Som nos tempos certos (o chamador decide se toca). */
  sound?: (name: 'hit' | 'win' | 'lose' | 'redact' | 'click') => void;
}

export interface ResultHandle {
  tl: gsap.core.Timeline;
  skip(): void;
  destroy(): void;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const div = (cls: string, parent: HTMLElement) => {
  const n = document.createElement('div');
  n.className = cls;
  parent.appendChild(n);
  return n;
};

export function buildResult(host: HTMLElement, o: ResultOptions): ResultHandle {
  const win = o.kind === 'win';
  const R = !!o.reduced;
  const root = div(`cr-root ${win ? 'is-win' : 'is-lose'}`, host);
  const flash = div('cr-flash', root);
  const vignette = div('cr-vignette', root);
  const lines = div('cr-lines', root);
  const fx = div('cr-fx', root);
  const center = div('cr-center', root);
  const stamp = div('cr-stamp', center);
  stamp.textContent = o.title;
  stamp.setAttribute('role', 'status');
  const cards = div('cr-cards', center);
  const counters = o.items.map((it) => {
    const card = div(`cr-card cr-card--${it.tone ?? 'neutral'}`, cards);
    const v = div('cr-card__v', card);
    const l = div('cr-card__l', card);
    l.textContent = it.label;
    let shown = 0;
    const fmt = it.format ?? ((n: number) => String(Math.round(n)));
    v.textContent = fmt(0);
    // Propriedade-função: o GSAP a chama até em seek (o contador fica certo em qualquer quadro do vídeo).
    const face = {
      n(x?: number) {
        if (x === undefined) return shown;
        shown = x;
        v.textContent = fmt(x);
        return x;
      },
    };
    return { card, face, value: it.value };
  });
  let done: HTMLButtonElement | null = null;
  if (o.onDone) {
    done = document.createElement('button');
    done.type = 'button';
    done.className = `g-btn g-btn--lg ${win ? 'g-btn--primary' : 'g-btn--danger'} cr-done`;
    done.textContent = o.doneLabel ?? '';
    done.addEventListener('click', (e) => {
      e.stopPropagation();
      o.sound?.('click');
      o.onDone?.();
    });
    center.appendChild(done);
  }

  const board = o.board ?? null;
  const tl = gsap.timeline();
  const call = (name: Parameters<NonNullable<ResultOptions['sound']>>[0], at: number) => tl.call(() => o.sound?.(name), undefined, at);
  gsap.set([stamp, ...counters.map((c) => c.card)], { opacity: 0 });
  if (done) gsap.set(done, { autoAlpha: 0 });

  // Contadores sobem (passos por quadro, desacelerando) — comum às duas telas.
  const cardsIn = (at: number) => {
    counters.forEach((c, i) => {
      const t = at + i * f(3);
      if (R) tl.set(c.card, { opacity: 1 }, t);
      else tl.fromTo(c.card, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: f(12), ease: ease.softLand, immediateRender: false }, t);
      tl.fromTo(c.face, { n: 0 }, { n: c.value, duration: R ? f(1) : f(20), ease: R ? 'none' : ease.softInOut, immediateRender: false }, t + f(4));
    });
  };
  const doneIn = (at: number) => {
    if (!done) return;
    tl.fromTo(done, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: f(10), ease: ease.softLand, immediateRender: false }, at);
  };
  const r = rng(win ? 3 : 9);
  const burst = (at: number, n: number, cls: string, reach: number) => {
    if (R) return;
    for (let i = 0; i < n; i++) {
      const d = div(cls, fx);
      gsap.set(d, { opacity: 0 });
      const ang = r() * Math.PI * 2;
      const sp = reach * (0.35 + r() * 0.9);
      tl.fromTo(
        d,
        { opacity: 1, x: 0, y: 0, rotation: 0, scale: 0.6 + r() * 0.9 },
        { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp * 0.7 + reach * 0.25, rotation: (r() - 0.5) * 600, duration: f(22 + Math.floor(r() * 14)), ease: ease.whip, immediateRender: false },
        at + r() * f(2),
      ).to(d, { opacity: 0, duration: f(10), ease: ease.gentleIn }, at + f(18) + r() * f(8));
    }
  };
  const reach = Math.min(innerWidth, innerHeight) * 0.42;

  if (win) {
    // Hit-stop: o último quadro do golpe "congela" ~120 ms sob um flash âmbar; depois o tabuleiro recua e escurece.
    call('hit', 0);
    tl.fromTo(flash, { opacity: 0.6 }, { opacity: 0, duration: f(9), ease: ease.cruise, immediateRender: false }, 0);
    if (board && !R) {
      tl.fromTo(board, { scale: 1.015, filter: 'brightness(1.35)' }, { scale: 1.015, filter: 'brightness(1.35)', duration: 0.12, immediateRender: false }, 0)
        .to(board, { scale: 0.93, filter: 'brightness(0.42) saturate(0.8)', duration: f(14), ease: ease.softLand }, 0.12);
    } else if (board) tl.to(board, { filter: 'brightness(0.45)', duration: f(8), ease: ease.cruise }, 0);
    tl.fromTo(vignette, { opacity: 0 }, { opacity: 0.7, duration: f(12), ease: ease.softInOut, immediateRender: false }, 0.12);
    // Carimbo: 1,6× → 1 e bate.
    const S = 0.2;
    if (R) tl.fromTo(stamp, { opacity: 0 }, { opacity: 1, duration: f(8), ease: ease.cruise, immediateRender: false }, S);
    else
      tl.fromTo(stamp, { opacity: 0, scale: 1.6, rotation: -13 }, { opacity: 1, scale: 1, rotation: -6, duration: f(8), ease: ease.snapSettle, immediateRender: false }, S)
        .to(root, { keyframes: [{ x: 6, y: 3 }, { x: -4, y: -2 }, { x: 2, y: 1 }, { x: 0, y: 0 }], duration: f(6), ease: 'steps(4)' }, S + f(2));
    call('win', S + f(2));
    burst(S + f(2), 26, 'cr-paper', reach);
    burst(S + f(2), 12, 'cr-ink', reach * 0.8);
    // Linhas de dossiê varrem a tela por trás do carimbo.
    if (!R) {
      for (let i = 0; i < 6; i++) {
        const ln = div('cr-line', lines);
        ln.style.top = `${18 + i * 12}%`;
        gsap.set(ln, { scaleX: 0 });
        tl.fromTo(ln, { scaleX: 0, opacity: 0.9, transformOrigin: i % 2 ? '100% 50%' : '0% 50%' }, { scaleX: 1, duration: f(10), ease: ease.glide, immediateRender: false }, S + f(4) + i * f(2)).to(
          ln,
          { opacity: 0.18, duration: f(14), ease: ease.cruise },
          S + f(16) + i * f(2),
        );
      }
    }
    cardsIn(0.62);
    doneIn(1.2);
  } else {
    // Derrota: a tela dessatura e treme; tarjas de censura fecham sobre o tabuleiro, uma a uma.
    call('lose', 0);
    // Valores de partida explícitos: interpolar a partir de 'none' faz o GSAP inventar um quadro claro.
    if (board) tl.fromTo(board, { filter: 'grayscale(0) brightness(1) contrast(1)' }, { filter: 'grayscale(1) brightness(0.55) contrast(1.1)', duration: f(16), ease: ease.softInOut, immediateRender: false }, 0);
    if (!R) tl.to(root, { keyframes: [{ x: -7 }, { x: 6 }, { x: -4, y: 2 }, { x: 3 }, { x: -1, y: -1 }, { x: 0, y: 0 }], duration: f(8), ease: 'steps(6)' }, 0);
    tl.fromTo(flash, { opacity: 0.35 }, { opacity: 0, duration: f(10), ease: ease.cruise, immediateRender: false }, 0);
    if (board) {
      const host2 = board;
      const bars: HTMLElement[] = [];
      for (let i = 0; i < 6; i++) {
        const b = div('cr-bar', host2);
        b.style.top = `${i * (100 / 6) + 2}%`;
        bars.push(b);
        gsap.set(b, { scaleX: 0 });
        if (R) tl.set(b, { scaleX: 1 }, 0.1 + i * f(2));
        else tl.fromTo(b, { scaleX: 0, transformOrigin: i % 2 ? '100% 50%' : '0% 50%' }, { scaleX: 1, duration: f(7), ease: ease.glide, immediateRender: false }, 0.12 + i * f(4));
        call('redact', 0.12 + i * f(4));
      }
      // As tarjas saem com o resto quando a tela é desmontada (destroy).
      (root as HTMLElement & { _bars?: HTMLElement[] })._bars = bars;
    }
    // Vinheta vermelha pulsa duas vezes (finito: o vídeo e o seek têm duração definida).
    if (R) tl.set(vignette, { opacity: 0.7 }, 0.3);
    else
      tl.fromTo(vignette, { opacity: 0.3 }, { opacity: 0.85, duration: f(14), ease: ease.softInOut, immediateRender: false }, 0.3)
        .to(vignette, { opacity: 0.55, duration: f(14), ease: ease.softInOut }, 0.3 + f(14))
        .to(vignette, { opacity: 0.85, duration: f(14), ease: ease.softInOut }, 0.3 + f(28))
        .to(vignette, { opacity: 0.65, duration: f(14), ease: ease.softInOut }, 0.3 + f(42));
    // Carimbo FRACASSO com tinta borrada (desfoque que assenta).
    const S = 0.5;
    if (R) tl.fromTo(stamp, { opacity: 0 }, { opacity: 1, duration: f(8), ease: ease.cruise, immediateRender: false }, S);
    else
      tl.fromTo(
        stamp,
        { opacity: 0, scale: 1.6, rotation: 10, filter: 'blur(6px)' },
        { opacity: 1, scale: 1, rotation: 5, filter: 'blur(0.6px)', duration: f(9), ease: ease.snapSettle, immediateRender: false },
        S,
      ).to(root, { keyframes: [{ x: 5, y: 2 }, { x: -3 }, { x: 1, y: -1 }, { x: 0, y: 0 }], duration: f(6), ease: 'steps(4)' }, S + f(2));
    burst(S + f(2), 14, 'cr-ink cr-ink--red', reach * 0.7);
    cardsIn(0.85);
    doneIn(1.25);
  }

  const skip = () => tl.progress(1);
  // Tocar em qualquer lugar antes do Concluir pula a animação.
  root.addEventListener('pointerdown', () => {
    if (tl.progress() < 1) skip();
  });

  return {
    tl,
    skip,
    destroy() {
      tl.kill();
      const bars = (root as HTMLElement & { _bars?: HTMLElement[] })._bars ?? [];
      bars.forEach((b) => b.remove());
      if (board) gsap.set(board, { clearProps: 'filter,transform' });
      root.remove();
    },
  };
}
