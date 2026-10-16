// Efeitos de Combate: cada função recebe o palco (a grade) e devolve uma timeline GSAP que só mexe em
// transform e opacity. Tudo que precisa sobreviver ao React (Unidade abatida ou convertida, números de dano,
// flashes, carimbo) é criado aqui como nó próprio dentro da camada e removido quando a timeline termina.
//
// Gramática (motionmaxxing): chegada desacelera (softLand/snapSettle), saída acelera (accelExit), nada nasce
// de escala zero, tremores em passos de 1–2 quadros, uma única "mola" por combate (o carimbo do resultado).

import { gsap } from 'gsap';
import { ease, f } from '../menu/ease';
import type { CombatType } from '../../game/types';

/** Cor do flash por tipo de Combate: Jurídico é tinta sobre papel, Urbano âmbar, Militar vermelho-sinal, Aéreo radar. */
export const TYPE_COLOR: Record<CombatType, string> = {
  legal: '#efe7d6',
  urban: '#f5b04a',
  army: '#ff5f56',
  air: '#6ef0f5',
};
/** Cor da agência (recrutado para o nosso lado) e de quem nos traiu (convertido para o lado inimigo). */
export const AGENCY_COLOR = '#f5b04a';
export const TURNED_COLOR = '#ff5f56';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Stage {
  /** Nó que recebe os efeitos (absoluto sobre a grade). */
  layer: HTMLElement;
  /** A grade inteira: é a "câmera" na ruptura e no carimbo. */
  camera: HTMLElement;
  reduced: boolean;
}

const el = (cls: string, box?: Box, parent?: HTMLElement) => {
  const n = document.createElement('div');
  n.className = cls;
  if (box) Object.assign(n.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
  parent?.appendChild(n);
  return n;
};

/** Cópia visual de um token, posicionada onde ele estava, para animar depois que o React o removeu. */
export function ghostOf(stage: Stage, html: string, box: Box): HTMLElement {
  const g = el('cfx-ghost', box, stage.layer);
  g.innerHTML = html;
  return g;
}

/** Caixa do retrato dentro de um token (ou da casa inteira, se não houver retrato), em coordenadas da grade. */
export function portraitBox(node: HTMLElement, box: Box): Box {
  const p = node.querySelector<HTMLElement | SVGElement>('.portrait, svg, img');
  if (!p) return box;
  const r = p.getBoundingClientRect();
  const n = node.getBoundingClientRect();
  return { x: box.x + (r.left - n.left), y: box.y + (r.top - n.top), w: r.width, h: r.height };
}

// ── Avanço da frente ────────────────────────────────────────────────────────

/** FLIP de um avanço: o token já está na casa nova; começa na antiga, recua um fio (antecipação) e desliza. */
export function move(stage: Stage, token: HTMLElement, from: Box, to: Box): gsap.core.Timeline {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const tl = gsap.timeline();
  if (stage.reduced) {
    tl.fromTo(token, { opacity: 0.4 }, { opacity: 1, duration: f(6), ease: ease.cruise, clearProps: 'opacity' });
    return tl;
  }
  const dir = Math.sign(-dx) || 1;
  const pull = Math.min(6, Math.abs(dx) * 0.08) * dir;
  tl.set(token, { x: dx, y: dy })
    .to(token, { x: dx - pull, duration: f(3), ease: ease.gentleIn })
    .to(token, { x: 0, y: 0, duration: f(9), ease: ease.softLand })
    .set(token, { clearProps: 'transform' });
  return tl;
}

// ── Golpe ───────────────────────────────────────────────────────────────────

/** Tremor curto em passos de 1 quadro + flash de flashbulb recortado no retrato, na cor do tipo de Combate. */
export function hit(stage: Stage, target: HTMLElement, pbox: Box, type: CombatType, side: 'p' | 'e' = 'e'): gsap.core.Timeline {
  const tl = gsap.timeline();
  const flash = el('cfx-flash', { x: pbox.x - 2, y: pbox.y - 2, w: pbox.w + 4, h: pbox.h + 4 }, stage.layer);
  flash.style.setProperty('--cfx-color', TYPE_COLOR[type]);
  if (stage.reduced) {
    tl.fromTo(flash, { opacity: 0.45 }, { opacity: 0, duration: f(8), ease: ease.cruise }).call(() => flash.remove());
    return tl;
  }
  // O golpe vem do lado oposto: o alvo é empurrado para trás e volta em 4 passos.
  const k = side === 'e' ? 1 : -1;
  tl.fromTo(flash, { opacity: 0.8 }, { opacity: 0, duration: f(6), ease: ease.glide }, 0)
    .to(target, { keyframes: [{ x: 5 * k }, { x: -3 * k }, { x: 2 * k }, { x: 0 }], duration: f(4), ease: 'steps(4)' }, 0)
    .set(target, { clearProps: 'transform' })
    .call(() => flash.remove());
  return tl;
}

/** Contador de dano de uma Unidade no turno: nasce no 1º golpe acima do retrato e soma a cada golpe seguinte. */
export function damageCounter(stage: Stage, pbox: Box, type: CombatType) {
  const num = el('cfx-dmg', undefined, stage.layer);
  // Ao lado do retrato, dentro da própria casa: não invade o nome da linha de cima no celular.
  Object.assign(num.style, { left: `${pbox.x + pbox.w + 3}px`, top: `${pbox.y - 2}px`, color: TYPE_COLOR[type] });
  gsap.set(num, { opacity: 0, transformOrigin: '0% 50%' });
  let total = 0;
  // Propriedade-função: o GSAP a chama como setter até em seek()/progress(), ao contrário de call().
  let shown = 0;
  const face = {
    value(v?: number) {
      if (v === undefined) return shown;
      shown = Math.round(v);
      num.textContent = shown > 0 ? `−${shown}` : '';
      return shown;
    },
  };
  return {
    node: num,
    /** Golpe: o número troca num passo (contador) e dá um soco curto. */
    tick(dmg: number): gsap.core.Timeline {
      const from = total;
      total += dmg;
      const tl = gsap.timeline();
      tl.fromTo(face, { value: from }, { value: total, duration: f(1), ease: 'steps(1)', immediateRender: false }, 0);
      if (stage.reduced) tl.set(num, { opacity: 1 }, 0);
      else tl.fromTo(num, { opacity: 1, scale: 1.45, y: 4 }, { scale: 1, y: 0, duration: f(6), ease: ease.snapSettle, immediateRender: false }, 0);
      return tl;
    },
    /** Sai subindo e apagando quando o turno acaba. */
    out(): gsap.core.Timeline {
      const tl = gsap.timeline({ onComplete: () => num.remove() });
      if (stage.reduced) tl.to(num, { opacity: 0, duration: f(6), ease: ease.cruise });
      else tl.to(num, { y: -10, opacity: 0, duration: f(7), ease: ease.gentleIn });
      return tl;
    },
  };
}

// ── Abate ───────────────────────────────────────────────────────────────────

const STRIPS = 6;

/** A tarja de censura cobre o retrato; a ficha se desfaz em linhas de dossiê que saem acelerando. */
export function down(stage: Stage, ghost: HTMLElement, pbox?: Box, box?: Box): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: () => ghost.remove() });
  if (stage.reduced) {
    tl.to(ghost, { opacity: 0, duration: f(8), ease: ease.cruise });
    return tl;
  }
  // Tarja sobre os olhos do retrato: a imagem de ficha censurada.
  const bar = el('cfx-redact');
  if (pbox && box) {
    Object.assign(bar.style, {
      left: `${pbox.x - box.x - pbox.w * 0.12}px`,
      width: `${pbox.w * 1.24}px`,
      top: `${pbox.y - box.y + pbox.h * 0.3}px`,
      height: `${Math.max(6, pbox.h * 0.26)}px`,
    });
  }
  ghost.appendChild(bar);
  // Tiras horizontais da ficha já censurada: cópias recortadas, prontas e escondidas até o corte.
  const whole = Array.from(ghost.children) as HTMLElement[];
  const html = ghost.innerHTML;
  const strips = Array.from({ length: STRIPS }, (_, i) => {
    const s = el('cfx-strip');
    s.innerHTML = html;
    s.style.clipPath = `inset(${(i / STRIPS) * 100}% 0 ${100 - ((i + 1) / STRIPS) * 100}% 0)`;
    ghost.appendChild(s);
    return s;
  });
  gsap.set(strips, { autoAlpha: 0 });
  gsap.set(strips.map((s) => s.querySelector('.cfx-redact')), { scaleX: 1 });

  tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: f(6), ease: ease.glide, transformOrigin: '0% 50%' })
    // Respiro de 3 quadros com a tarja lida; no corte, a ficha inteira vira tiras.
    .set(strips, { autoAlpha: 1 }, f(8))
    .set(whole, { autoAlpha: 0 }, f(8));
  strips.forEach((s, i) => {
    const dir = i % 2 ? 1 : -1;
    tl.to(s, { x: dir * (14 + i * 6), opacity: 0, duration: f(9), ease: ease.accelExit }, f(9) + i * f(1));
  });
  return tl;
}

// ── Conversão ───────────────────────────────────────────────────────────────

/** O retrato ganha a cor do novo lado e recebe o selo de recrutamento; depois deixa a grade. */
export function convert(stage: Stage, ghost: HTMLElement, toAgency: boolean, pbox?: Box, box?: Box): gsap.core.Timeline {
  const color = toAgency ? AGENCY_COLOR : TURNED_COLOR;
  const tl = gsap.timeline({ onComplete: () => ghost.remove() });
  const tint = el('cfx-tint');
  tint.style.setProperty('--cfx-color', color);
  ghost.appendChild(tint);
  const seal = el('cfx-seal');
  seal.style.setProperty('--cfx-color', color);
  seal.innerHTML =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><circle cx="24" cy="24" r="16" stroke-dasharray="2 3"/><path d="M15 25l6 6 12-14"/></svg>';
  ghost.appendChild(seal);
  // Tinta e selo presos ao retrato (coordenadas relativas à cópia da ficha).
  if (pbox && box) {
    const px = pbox.x - box.x;
    const py = pbox.y - box.y;
    Object.assign(tint.style, { left: `${px}px`, top: `${py}px`, width: `${pbox.w}px`, height: `${pbox.h}px`, inset: 'auto' });
    const sz = pbox.w * 0.62;
    Object.assign(seal.style, { left: `${px + pbox.w - sz * 0.62}px`, top: `${py - sz * 0.38}px`, width: `${sz}px`, right: 'auto' });
  }

  if (stage.reduced) {
    tl.fromTo([tint, seal], { opacity: 0 }, { opacity: 1, duration: f(6), ease: ease.cruise })
      .to(ghost, { opacity: 0, duration: f(8), ease: ease.cruise }, f(14));
    return tl;
  }
  tl.fromTo(tint, { opacity: 0 }, { opacity: 0.55, duration: f(6), ease: ease.softInOut })
    // O selo bate de cima: 2,2× → 1 com assentamento rápido, inclinado como carimbo de mão.
    .fromTo(seal, { scale: 2.2, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -10, duration: f(9), ease: ease.snapSettle }, f(3))
    .to(ghost, { keyframes: [{ scale: 0.96 }, { scale: 1 }], duration: f(3), ease: 'steps(2)' }, f(4))
    // Sai da grade para a reserva do novo lado, acelerando.
    .to(ghost, { y: 10, scale: 0.9, opacity: 0, duration: f(9), ease: ease.accelExit }, f(18));
  return tl;
}

// ── Ruptura da linha ────────────────────────────────────────────────────────

/** Holofote varre a casa, um flash curto na grade e a câmera dá um puxão na direção da ruptura. */
export function breach(stage: Stage, box: Box, type: CombatType, towardRight: boolean): gsap.core.Timeline {
  const tl = gsap.timeline();
  const sweep = el('cfx-sweep', box, stage.layer);
  sweep.style.setProperty('--cfx-color', TYPE_COLOR[type]);
  // Só a faixa da linha rompida acende (nada de inundar a grade inteira).
  const wash = el('cfx-wash', { x: 0, y: box.y, w: stage.camera.clientWidth, h: box.h }, stage.layer);
  wash.style.setProperty('--cfx-color', TYPE_COLOR[type]);
  if (stage.reduced) {
    tl.fromTo([sweep, wash], { opacity: 0.4 }, { opacity: 0, duration: f(12), ease: ease.cruise }).call(() => (sweep.remove(), wash.remove()));
    return tl;
  }
  const k = towardRight ? 1 : -1;
  tl.fromTo(sweep, { scaleY: 0.2, opacity: 0.9 }, { scaleY: 1, duration: f(5), ease: ease.whip, transformOrigin: '50% 50%' }, 0)
    .to(sweep, { opacity: 0, duration: f(8), ease: ease.gentleIn }, f(5))
    .fromTo(wash, { opacity: 0.22, scaleX: 0.3 }, { opacity: 0, scaleX: 1, duration: f(8), ease: ease.glide, transformOrigin: towardRight ? '100% 50%' : '0% 50%' }, f(1))
    .fromTo(stage.camera, { scale: 1, x: 0 }, { scale: 1.035, x: 10 * k, duration: f(7), ease: ease.whip }, f(2))
    .to(stage.camera, { scale: 1, x: 0, duration: f(14), ease: ease.softLand }, f(9))
    .set(stage.camera, { clearProps: 'transform' })
    .call(() => (sweep.remove(), wash.remove()));
  return tl;
}

// ── Início do combate ───────────────────────────────────────────────────────

/** As fichas entram como cartões jogados na mesa: por coluna, de cada lado para o centro, 2 quadros entre colunas. */
export function intro(stage: Stage, tokens: { node: HTMLElement; side: 'p' | 'e'; col: number }[]): gsap.core.Timeline {
  const tl = gsap.timeline();
  const maxCol = Math.max(0, ...tokens.map((t) => t.col));
  for (const t of tokens) {
    // Distância até a borda do próprio lado: os mais de trás entram primeiro.
    const order = t.side === 'p' ? t.col : maxCol - t.col;
    const at = order * f(2) + (t.side === 'e' ? f(1) : 0);
    if (stage.reduced) {
      tl.fromTo(t.node, { opacity: 0 }, { opacity: 1, duration: f(6), ease: ease.cruise, clearProps: 'opacity' }, 0);
      continue;
    }
    tl.fromTo(
      t.node,
      { opacity: 0, y: 14, x: t.side === 'p' ? -18 : 18, rotation: t.side === 'p' ? -3 : 3 },
      { opacity: 1, y: 0, x: 0, rotation: 0, duration: f(12), ease: ease.softLand, clearProps: 'transform,opacity' },
      at,
    );
  }
  return tl;
}

// ── Resultado ───────────────────────────────────────────────────────────────

/** Carimbo de borracha sobre a folha: cai de 2,6×, bate (tremor de 3 passos) e fica, com a tinta falhada. */
export function verdict(stage: Stage, text: string, success: boolean): gsap.core.Timeline {
  const stamp = el(`cfx-stamp ${success ? 'is-ok' : 'is-fail'}`, undefined, stage.layer);
  stamp.textContent = text;
  stamp.setAttribute('role', 'status');
  const tl = gsap.timeline();
  if (stage.reduced) {
    tl.fromTo(stamp, { opacity: 0, xPercent: -50, yPercent: -50, rotation: -8 }, { opacity: 1, duration: f(8), ease: ease.cruise });
    return tl;
  }
  tl.fromTo(
    stamp,
    { opacity: 0, scale: 2.6, xPercent: -50, yPercent: -50, rotation: -14 },
    { opacity: 1, scale: 1, rotation: -8, duration: f(10), ease: ease.snapSettle },
  )
    // Impacto no 3º quadro: a folha inteira treme em passos e assenta.
    .to(stage.camera, { keyframes: [{ x: 3, y: 2 }, { x: -2, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 0 }], duration: f(6), ease: 'steps(4)' }, f(3))
    .set(stage.camera, { clearProps: 'transform' });
  return tl;
}
