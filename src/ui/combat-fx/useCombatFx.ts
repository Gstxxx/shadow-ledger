// useCombatFx: liga a camada de animação à grade de Combate de quem a monta.
//
// Contrato com a tela de Combate:
//   - `grid` é o elemento posicionado (position: relative) onde ficam os tokens das Unidades.
//   - cada token tem `data-fx-key={ref.key}` e `data-fx-side={ref.side}`; a posição vem de left/top (como hoje).
//   - a tela NÃO anima mais hit/ghost/transition de left/top: a camada cuida disso (e desliga a transição).
// O hook cria a própria camada dentro da grade; não há JSX para montar.

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { dictionaries, useLang, type Key } from '../../i18n';
import type { CombatFx, CombatState } from '../../game/types';
import { f } from '../menu/ease';
import { breach, convert, damageCounter, down, ghostOf, hit, intro, move, portraitBox, verdict, type Box, type Stage } from './effects';
import './combat-fx.css';

export interface CombatFxOptions {
  grid: React.RefObject<HTMLElement | null>;
  combat: CombatState;
  /** Multiplicador de velocidade (1, 2, 4). */
  speed?: number;
  /** Força reduzir movimento; sem valor, segue prefers-reduced-motion. */
  reduced?: boolean;
  /** Anima a entrada das fichas na primeira montagem (padrão: sim). */
  intro?: boolean;
  /** Texto do carimbo final; sem valor, usa i18n (combatfx.stamp.* ou game.combat.result.*). */
  verdictText?: (success: boolean, c: CombatState) => string;
}

export interface CombatFxApi {
  /** Termina na hora a animação em curso (botão "pular"). */
  skip(): void;
  /** Há animação tocando agora. */
  busy(): boolean;
}

interface Snap {
  side: 'p' | 'e';
  className: string;
  html: string;
  box: Box;
}

/** Orçamento de um turno a 1×: legível sem arrastar. */
const TURN_BUDGET = 0.9;

const boxOf = (n: HTMLElement): Box => ({ x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight });
const succeeded = (c: CombatState) => c.result === 'win' || (c.result === 'draw' && c.playerDefends);

function systemReduced() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useCombatFx(opts: CombatFxOptions): CombatFxApi {
  const { grid, combat, speed = 1 } = opts;
  const lang = useLang();
  const layer = useRef<HTMLDivElement | null>(null);
  const snaps = useRef(new Map<string, Snap>());
  const current = useRef<gsap.core.Timeline | null>(null);
  const lastTurn = useRef<number>(combat.turn);
  const shownResult = useRef(false);
  const speedRef = useRef(speed);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reduced = () => optsRef.current.reduced ?? systemReduced();

  const tokens = useCallback(() => {
    const g = grid.current;
    return g ? Array.from(g.querySelectorAll<HTMLElement>('[data-fx-key]')) : [];
  }, [grid]);

  const stage = useCallback((): Stage | null => {
    if (!grid.current || !layer.current) return null;
    return { layer: layer.current, camera: grid.current, reduced: reduced() };
  }, [grid]);

  const snapshot = useCallback(() => {
    const m = new Map<string, Snap>();
    for (const n of tokens()) {
      // A transição de left/top da tela brigaria com o FLIP; a camada assume o movimento.
      n.style.transition = 'none';
      m.set(n.dataset.fxKey!, {
        side: (n.dataset.fxSide as 'p' | 'e') ?? 'p',
        className: n.className,
        html: n.innerHTML,
        box: boxOf(n),
      });
    }
    snaps.current = m;
  }, [tokens]);

  const verdictLabel = useCallback(
    (ok: boolean, c: CombatState) => {
      const custom = optsRef.current.verdictText;
      if (custom) return custom(ok, c);
      const d = dictionaries[lang] as Record<string, string>;
      const own = d[ok ? 'combatfx.stamp.win' : 'combatfx.stamp.lose'];
      if (own) return own;
      const fallback: Key = ok ? (c.result === 'draw' ? 'game.combat.result.hold' : 'game.combat.result.win') : 'game.combat.result.lose';
      return (d[fallback] ?? fallback).toUpperCase();
    },
    [lang],
  );

  const run = useCallback((tl: gsap.core.Timeline) => {
    current.current?.progress(1);
    current.current = tl;
    // Inspeção quadro a quadro em desenvolvimento: window.__cfxTl.pause().seek(0.3)
    if (import.meta.env.DEV) (window as unknown as { __cfxTl?: gsap.core.Timeline }).__cfxTl = tl;
    tl.eventCallback('onComplete', () => {
      if (current.current === tl) current.current = null;
    });
  }, []);

  // Camada: criada uma vez dentro da grade.
  useLayoutEffect(() => {
    const g = grid.current;
    if (!g) return;
    const l = document.createElement('div');
    l.className = 'cfx-layer';
    l.setAttribute('aria-hidden', 'true');
    g.appendChild(l);
    layer.current = l;
    snapshot();
    if (opts.intro !== false) {
      const st = stage();
      if (st) {
        const list = tokens().map((node) => ({
          node,
          side: (node.dataset.fxSide as 'p' | 'e') ?? 'p',
          col: Math.round(node.offsetLeft / Math.max(1, node.offsetWidth)),
        }));
        run(intro(st, list));
      }
    }
    return () => {
      current.current?.kill();
      current.current = null;
      l.remove();
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.id]);

  useEffect(() => {
    speedRef.current = speed;
    const tl = current.current;
    if (tl) tl.timeScale((tl.data?.fit ?? 1) * speed);
  }, [speed]);

  // Cada render pós-turno: monta a timeline do turno a partir do snapshot anterior e tira um novo.
  const signature = combat.units.map((u) => `${u.key}@${u.row},${u.col}`).join('|');
  useLayoutEffect(() => {
    const st = stage();
    if (!st) return;
    const prevTurn = lastTurn.current;
    lastTurn.current = combat.turn;
    const advanced = combat.turn === prevTurn + 1;

    if (advanced && combat.fx.length) {
      const tl = buildTurn(st, combat, combat.fx, snaps.current);
      // Encaixa no orçamento pelo fim dos eventos; as caudas de saída podem passar um pouco.
      const core = (tl.data?.core as number) ?? tl.duration();
      const fit = core > TURN_BUDGET ? core / TURN_BUDGET : 1;
      tl.data = { fit };
      tl.timeScale(fit * speedRef.current);
      run(tl);
    } else if (combat.turn !== prevTurn) {
      // Salto de vários turnos ("pular para o fim"): nada de movimento intermediário.
      current.current?.progress(1);
    }

    if (combat.result && !shownResult.current) {
      shownResult.current = true;
      const v = verdict(st, verdictLabel(succeeded(combat), combat), succeeded(combat));
      // O carimbo vem depois do turno decisivo (que pode nem ter começado a tocar ainda).
      const prev = current.current;
      if (prev && prev.progress() < 1) prev.add(v, prev.duration() + f(4));
      else run(v);
    }
    snapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.turn, signature, combat.result]);

  return {
    skip: () => current.current?.progress(1),
    busy: () => !!current.current?.isActive(),
  };
}

/** Timeline de um turno: avanços primeiro (todos juntos, 1 quadro entre linhas), duelos encadeados por linha. */
function buildTurn(st: Stage, c: CombatState, fx: CombatFx[], snaps: Map<string, Snap>): gsap.core.Timeline {
  const tl = gsap.timeline();
  const grid = st.camera;
  const live = new Map(Array.from(grid.querySelectorAll<HTMLElement>('[data-fx-key]')).map((n) => [n.dataset.fxKey!, n]));

  // Quem saiu da grade neste turno continua de pé numa cópia até o efeito dele terminar.
  const ghosts = new Map<string, HTMLElement>();
  for (const [key, s] of snaps) {
    if (live.has(key)) continue;
    const g = ghostOf(st, s.html, s.box);
    g.className = `cfx-ghost ${s.className.replace(/\b(hit|ghost|down|convert)\b/g, '')}`;
    ghosts.set(key, g);
  }
  const nodeOf = (key: string) => live.get(key) ?? ghosts.get(key);

  // 1) Avanço da frente.
  let rowIdx = 0;
  const rowsSeen = new Map<number, number>();
  for (const e of fx) {
    if (e.kind !== 'move') continue;
    const n = live.get(e.key);
    const s = snaps.get(e.key);
    if (!n || !s) continue;
    if (!rowsSeen.has(e.row)) rowsSeen.set(e.row, rowIdx++);
    tl.add(move(st, n, s.box, boxOf(n)), rowsSeen.get(e.row)! * f(1));
  }

  // 2) Duelos, rupturas, abates e conversões: em ordem, cada linha com seu próprio cursor.
  const DUR: Record<Exclude<CombatFx['kind'], 'move'>, number> = { hit: f(4), down: f(16), convert: f(22), breach: f(14) };
  const cursor = new Map<number, number>();
  const counters = new Map<string, ReturnType<typeof damageCounter>>();
  let order = 0;
  let core = tl.duration();
  for (const e of fx) {
    if (e.kind === 'move') continue;
    if (!cursor.has(e.row)) cursor.set(e.row, f(8) + order++ * f(3));
    const at = cursor.get(e.row)!;
    const n = nodeOf(e.key);
    const s = snaps.get(e.key);
    const box = n ? boxOf(n) : s?.box;
    if (!box) continue;
    const pbox = n ? portraitBox(n, box) : box;
    const side = s?.side ?? ((n?.dataset.fxSide as 'p' | 'e') || 'e');
    if (e.kind === 'hit' && n) {
      tl.add(hit(st, n, pbox, c.type, side), at);
      let k = counters.get(e.key);
      if (!k) counters.set(e.key, (k = damageCounter(st, pbox, c.type)));
      tl.add(k.tick(e.dmg ?? 1), at);
    } else if (e.kind === 'down') {
      const g = ghosts.get(e.key);
      if (g) tl.add(down(st, g, pbox, box), at);
    } else if (e.kind === 'convert') {
      const g = ghosts.get(e.key);
      if (g) tl.add(convert(st, g, side === 'e', pbox, box), at);
    } else if (e.kind === 'breach') tl.add(breach(st, box, c.type, side === 'p'), at);
    cursor.set(e.row, at + DUR[e.kind]);
    core = Math.max(core, at + DUR[e.kind]);
  }
  // Os contadores de dano saem juntos quando os golpes acabam.
  const outAt = Math.max(0, ...cursor.values()) + f(4);
  counters.forEach((k) => tl.add(k.out(), outAt));
  tl.data = { core };
  // Fantasma sem efeito (não deveria acontecer): some no fim do turno.
  tl.call(() => ghosts.forEach((g) => g.isConnected && g.remove()), undefined, tl.duration());
  return tl;
}
