// Roteiro do turno em batidas: um tiro por vez, para dar para ver o Combate acontecendo. O motor resolve o turno
// inteiro de uma vez (c.fx); aqui só a apresentação muda. Cada evento vira uma batida de ~0,8–1 s a 1×:
//   câmera até o par → atirador mira → tiro (clarão na boca + traçante que viaja até o alvo) →
//   impacto (faísca/explosão, flash branco no sprite, número de dano) → ferido ou abatido (corpo/destroço fica).
// O turno dura a soma das batidas (sem orçamento fixo); a velocidade (1×/2×/4×) é o timeScale da timeline.

import { gsap } from 'gsap';
import type { CombatState, CombatUnitRef } from '../../../game/types';
import { breach, convert, damageCounter, ghostOf, move, portraitBox } from '../../combat-fx';
import type { Box, Snap, TurnBuilder } from '../../combat-fx';
import type { Pose } from './unitSprites';

export type VfxSize = 's' | 'm' | 'l';

export interface BeatHost {
  /** Área que rola (zoom em pé); a câmera desliza até cada par atirador → alvo. */
  wrap(): HTMLElement | null;
  /** Unidades antes do turno (quem caiu ainda está aqui, com casa). */
  before(): readonly CombatUnitRef[];
  pose(key: string, pose: Pose | null): void;
  vfx(v: { col: number; row: number; anim: string; size: VfxSize }): void;
  /** Abatido: corpo do Pessoal (morte, fica no chão) ou destroço do veículo. */
  fallen(r: CombatUnitRef): void;
  /** Mostra a próxima linha do log do turno (abate, conversão, ruptura); `all` libera o resto. */
  reveal(all?: boolean): void;
  machine(r: CombatUnitRef): boolean;
}

const boxOf = (n: HTMLElement): Box => ({ x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight });
const chest = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h * 0.55 });

/** Clarão na boca da arma e um traçante curto que viaja do atirador até o alvo. */
function tracer(board: HTMLElement, a: { x: number; y: number }, b: { x: number; y: number }, color: string, dur: number, size = 1) {
  const tl = gsap.timeline();
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const rail = document.createElement('div');
  rail.className = 'beat-rail';
  Object.assign(rail.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${len}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)`, '--beat-c': color, '--beat-s': String(size) });
  const bolt = document.createElement('span');
  bolt.className = 'beat-bolt';
  rail.appendChild(bolt);
  const flash = document.createElement('div');
  flash.className = 'beat-muzzle';
  Object.assign(flash.style, { left: `${a.x}px`, top: `${a.y}px`, '--beat-c': color, '--beat-s': String(size) });
  tl.call(() => board.append(rail, flash))
    .fromTo(flash, { scale: 0.6, opacity: 1 }, { scale: 1.4, opacity: 0, duration: dur * 0.7, ease: 'power2.out', immediateRender: false }, 0)
    .fromTo(bolt, { x: 0, opacity: 1 }, { x: Math.max(0, len - 24 * size), duration: dur, ease: 'none', immediateRender: false }, 0)
    .to(bolt, { opacity: 0, duration: 0.05 })
    .call(() => {
      rail.remove();
      flash.remove();
    });
  return tl;
}

/** Flash branco curto no sprite do alvo (no filtro da âncora, que o React não controla). */
function whiteFlash(node: HTMLElement | undefined, dur: number) {
  const tl = gsap.timeline();
  const a = node?.querySelector<HTMLElement>('.iso-anchor') ?? node;
  if (!a) return tl;
  // immediateRender: false — montado antes de tocar, o flash não pode acender no quadro 0 do turno.
  tl.set(a, { filter: 'brightness(3.2) saturate(0)', immediateRender: false }).set(a, { filter: 'none', immediateRender: false }, dur).set(a, { clearProps: 'filter', immediateRender: false });
  return tl;
}

/** Empurrão curto no alvo, para longe do atirador, em passos de 1 quadro (sem tremor com movimento reduzido). */
function knock(node: HTMLElement, a: { x: number; y: number } | null, b: { x: number; y: number }, reduced: boolean) {
  const tl = gsap.timeline();
  if (reduced || !a) return tl;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const at = (d: number) => ({ x: ux * d, y: uy * d });
  tl.to(node, { keyframes: [at(5), at(-2), at(2), at(0)], duration: 0.12, ease: 'steps(4)' }).set(node, { clearProps: 'transform' });
  return tl;
}

const COLOR = { urban: '#ffd27a', army: '#ff9a5a', legal: '#efe7d6', air: '#8ff6ff' } as const;

/** Monta o roteiro do turno: um TurnBuilder para o useCombatFx (com `budget: null`). */
export function beatBuilder(host: BeatHost): TurnBuilder {
  return (st, c: CombatState, fx, snaps: Map<string, Snap>) => {
    const tl = gsap.timeline();
    // Com movimento reduzido: batidas mais curtas, sem tremor nem câmera deslizando.
    const k = st.reduced ? 0.55 : 1;
    const board = st.camera;
    const live = new Map(Array.from(board.querySelectorAll<HTMLElement>('[data-fx-key]')).map((n) => [n.dataset.fxKey!, n]));
    const ghosts = new Map<string, HTMLElement>();
    for (const [key, s] of snaps) {
      if (live.has(key)) continue;
      const g = ghostOf(st, s.html, s.box);
      g.className = `cfx-ghost ${s.className.replace(/\b(hit|ghost|down|convert)\b/g, '')}`;
      ghosts.set(key, g);
    }
    const nodeOf = (key: string) => live.get(key) ?? ghosts.get(key);
    const before = host.before();
    const refOf = (key: string) => c.units.find((u) => u.key === key) ?? before.find((u) => u.key === key);
    const dead = new Set<string>();
    let lastShooter = '';
    let t = 0;

    // 1) Avanço da frente, todos juntos, andando.
    const movers = fx.filter((e) => e.kind === 'move');
    for (const e of movers) {
      const n = live.get(e.key);
      const s = snaps.get(e.key);
      if (!n || !s) continue;
      tl.call(() => host.pose(e.key, 'walk'), undefined, 0);
      tl.add(move(st, n, s.box, boxOf(n)), 0);
      tl.call(() => host.pose(e.key, null), undefined, 0.5);
    }
    if (movers.length) t = 0.55 * k;

    // 2) Uma batida por evento, em ordem.
    const counters = new Map<string, ReturnType<typeof damageCounter>>();
    for (const e of fx) {
      if (e.kind === 'move') continue;
      const target = refOf(e.key);
      const n = nodeOf(e.key);
      const box = n ? boxOf(n) : snaps.get(e.key)?.box;
      if (!target || !box) continue;
      const side = target.side;
      if (e.kind === 'breach') {
        tl.add(breach(st, box, c.type, side === 'p'), t);
        tl.call(() => host.reveal(), undefined, t);
        t += 0.75 * k;
        continue;
      }
      // Atirador: o oponente vivo mais próximo na mesma linha (o motor só registra o alvo).
      const dist = (u: CombatUnitRef) => Math.abs(u.col - e.col) + (u.row === e.row ? 0 : 10 * Math.abs(u.row - e.row));
      const shooter = before.filter((u) => u.side !== side && !dead.has(u.key)).sort((a, b) => dist(a) - dist(b))[0];
      const sNode = shooter && nodeOf(shooter.key);
      const A = sNode ? chest(boxOf(sNode)) : null;
      const B = chest(box);

      // Câmera: desliza até o meio do par quando a arena rola (zoom).
      const wrap = host.wrap();
      if (wrap && (wrap.scrollWidth > wrap.clientWidth + 4 || wrap.scrollHeight > wrap.clientHeight + 4)) {
        const mx = A ? (A.x + B.x) / 2 : B.x;
        const my = A ? (A.y + B.y) / 2 : B.y;
        const left = Math.max(0, Math.min(wrap.scrollWidth - wrap.clientWidth, mx - wrap.clientWidth / 2));
        const top = Math.max(0, Math.min(wrap.scrollHeight - wrap.clientHeight, my - wrap.clientHeight / 2));
        if (Math.abs(wrap.scrollLeft - left) > 24 || Math.abs(wrap.scrollTop - top) > 24) {
          if (st.reduced) tl.set(wrap, { scrollLeft: left, scrollTop: top }, t);
          else {
            tl.to(wrap, { scrollLeft: left, scrollTop: top, duration: 0.26, ease: 'power2.inOut' }, t);
            t += 0.26;
          }
        }
      }

      // Mira → tiro.
      if (shooter) {
        // Quem acabou de atirar já está na mira: atira de novo sem a pausa de mirar.
        if (lastShooter !== shooter.key) {
          tl.call(() => host.pose(shooter.key, 'aim'), undefined, t);
          t += 0.12 * k;
        }
        lastShooter = shooter.key;
        tl.call(() => host.pose(shooter.key, 'shoot'), undefined, t);
        if (A && c.type !== 'legal' && e.kind !== 'convert') {
          tl.add(tracer(board, A, B, COLOR[c.type], 0.17 * k, Math.max(1, box.h / 70)), t);
          t += 0.17 * k;
        } else t += 0.15 * k;
      }

      // Impacto.
      const pbox = n ? portraitBox(n, box) : box;
      const machine = host.machine(target);
      if (e.kind === 'hit') {
        tl.call(() => host.vfx({ col: target.col, row: target.row, anim: machine ? 'explosion' : 'sparks', size: machine ? 'm' : 's' }), undefined, t);
        if (n) {
          tl.add(whiteFlash(n, 0.07), t);
          tl.add(knock(n, A, B, st.reduced), t);
          let ctr = counters.get(e.key);
          if (!ctr) counters.set(e.key, (ctr = damageCounter(st, pbox, c.type)));
          tl.add(ctr.tick(e.dmg ?? 1), t);
        }
        tl.call(() => host.pose(e.key, 'hurt'), undefined, t);
        t += 0.32 * k;
      } else if (e.kind === 'down') {
        dead.add(e.key);
        tl.call(() => host.vfx({ col: target.col, row: target.row, anim: machine ? 'explosion' : 'blood', size: machine ? 'l' : 's' }), undefined, t);
        if (n) tl.add(whiteFlash(n, 0.08), t);
        // Veículo: explosão grande e um tremor de 150 ms na arena.
        if (machine && !st.reduced) tl.to(board, { keyframes: [{ x: 5, y: -2 }, { x: -4, y: 2 }, { x: 3, y: -1 }, { x: 0, y: 0 }], duration: 0.15, ease: 'steps(4)' }, t).set(board, { clearProps: 'transform' });
        tl.call(
          () => {
            ghosts.get(e.key)?.remove();
            host.fallen(target);
            host.reveal();
          },
          undefined,
          t + 0.08,
        );
        // Congela um instante no abate.
        if (!st.reduced) tl.set(board, { filter: 'brightness(1.35)', immediateRender: false }, t).set(board, { clearProps: 'filter', immediateRender: false }, t + 0.08);
        t += (machine ? 0.7 : 0.5) * k;
      } else if (e.kind === 'convert') {
        dead.add(e.key);
        const g = ghosts.get(e.key);
        if (g) tl.add(convert(st, g, side === 'e', pbox, box), t);
        tl.call(() => host.reveal(), undefined, t);
        t += 0.7 * k;
      }

      // Volta ao idle e respira antes da próxima batida.
      tl.call(
        () => {
          if (shooter) host.pose(shooter.key, null);
          host.pose(e.key, null);
        },
        undefined,
        t,
      );
      t += 0.12 * k;
    }

    counters.forEach((ctr) => tl.add(ctr.out(), t));
    tl.call(
      () => {
        ghosts.forEach((g) => g.isConnected && g.remove());
        host.reveal(true);
      },
      undefined,
      t + 0.2,
    );
    tl.data = { core: t + 0.2 };
    return tl;
  };
}
