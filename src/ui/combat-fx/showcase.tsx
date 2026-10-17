// Exemplo de Combate melhorado (protótipo para aprovação): um Combate Urbano roteirizado em 7 turnos numa única
// timeline GSAP, seek-safe, que serve tanto para tocar na página quanto para gravar o vídeo (window.__seek / __duration).
// /src/ui/combat-fx/showcase.html  ·  ?render=1 (sem botões, pausado para o render)  ·  ?rm=1 (reduzir movimento)
// Paisagem: o jogador avança →; em pé: a grade gira e o jogador avança ↑ (mesmo eixo do combat-fx).
import { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import '../../index.css';
import '../../art/tokens.css';
import '../../art/game-ui.css';
import '../../art/game-ui-2.css';
import { OperativePortrait } from '../../art/portraits';
import { useT } from '../../i18n';
import { countryName } from '../../i18n/lookup';
import { audio, type Sfx } from '../../audio/engine';
import { ease, f } from '../menu/ease';
import { breach, down, hit, intro, verdict, TYPE_COLOR, AGENCY_COLOR, type Box, type Stage } from './effects';
import { showcaseText } from './showcaseText';
import { buildResult } from './result';
import './result.css';
import './combat-fx.css';
import './showcase.css';

const q = new URLSearchParams(location.search);
const RENDER = q.get('render') === '1';
const REDUCED = q.get('rm') === '1';
/** ?ending=win|lose: final com a tela de resultado completa (sem valor: o carimbo simples aprovado). */
const ENDING = q.get('ending') as 'win' | 'lose' | null;
const COLS = 8;
const ROWS = 3;
const MAX_TURNS = 8;
const URBAN = TYPE_COLOR.urban;

type Side = 'p' | 'e';
interface U {
  id: string;
  side: Side;
  col: number;
  row: number;
  hp: number;
  seed: string;
}
/** Elenco do roteiro: agência à esquerda (cols 1–2), hostis à direita (cols 5–7). */
const CAST: U[] = [
  { id: 'a1', side: 'p', col: 2, row: 0, hp: 5, seed: 'cobra' },
  { id: 'a2', side: 'p', col: 2, row: 1, hp: 4, seed: 'lince' },
  { id: 'a3', side: 'p', col: 1, row: 2, hp: 3, seed: 'vespa' },
  { id: 'a4', side: 'p', col: 1, row: 1, hp: 4, seed: 'falcao' },
  { id: 'e1', side: 'e', col: 5, row: 0, hp: 4, seed: 'basalto' },
  { id: 'e2', side: 'e', col: 5, row: 1, hp: 3, seed: 'garoa' },
  { id: 'e3', side: 'e', col: 6, row: 2, hp: 3, seed: 'quartzo' },
  { id: 'e4', side: 'e', col: 7, row: 0, hp: 5, seed: 'siroco' },
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Showcase() {
  const { t, lang } = useT();
  const txt = showcaseText();
  const root = useRef<HTMLDivElement>(null);
  const [portrait] = useState(() => innerHeight > innerWidth);
  const [cell, setCell] = useState(0);
  const [playing, setPlaying] = useState(false);
  const master = useRef<gsap.core.Timeline | null>(null);

  // Tamanho da casa a partir da área útil (o tabuleiro ocupa ~80% do lado longo).
  useLayoutEffect(() => {
    const W = innerWidth;
    const H = innerHeight;
    const c = portrait ? Math.min((W * 0.92) / ROWS, (H * 0.8) / COLS) : Math.min((W * 0.88) / COLS, (H * 0.68) / ROWS);
    setCell(Math.floor(c));
  }, [portrait]);

  useLayoutEffect(() => {
    if (!cell || !root.current) return;
    const el = root.current;
    const camera = el.querySelector<HTMLElement>('.sc-camera')!;
    const layer = el.querySelector<HTMLElement>('.cfx-layer')!;
    const st: Stage = { layer, camera, reduced: REDUCED, fwd: portrait ? { x: 0, y: -1 } : { x: 1, y: 0 } };
    const tok = (id: string) => el.querySelector<HTMLElement>(`[data-u="${id}"]`)!;
    const pos = new Map(CAST.map((u) => [u.id, { col: u.col, row: u.row }]));
    // (col,row) do motor → centro em px dentro do tabuleiro, no eixo da tela.
    const center = (col: number, row: number) =>
      portrait ? { x: (row + 0.5) * cell, y: (COLS - 1 - col + 0.5) * cell } : { x: (col + 0.5) * cell, y: (row + 0.5) * cell };
    const boxOf = (id: string): Box => {
      const p = pos.get(id)!;
      const c = center(p.col, p.row);
      return { x: c.x - cell / 2, y: c.y - cell / 2, w: cell, h: cell };
    };
    const pboxOf = (id: string): Box => {
      const b = boxOf(id);
      const s = cell * 0.64;
      return { x: b.x + (cell - s) / 2, y: b.y + cell * 0.1, w: s, h: s * 1.0 };
    };
    const play = (s: Sfx) => () => {
      if (!RENDER) audio.sfx(s);
    };

    const tl = gsap.timeline({ paused: true });

    // ── HUD seek-safe: turno e Prévia são propriedades-função (o GSAP as chama até em seek).
    const turnEl = el.querySelector<HTMLElement>('.sc-turn-n')!;
    const fcEl = el.querySelector<HTMLElement>('.sc-fc-n')!;
    const fcBar = el.querySelector<HTMLElement>('.sc-fc-fill')!;
    const hud = {
      turn(v?: number) {
        if (v === undefined) return Number(turnEl.dataset.v ?? 0);
        turnEl.dataset.v = String(Math.round(v));
        turnEl.textContent = t('game.combat.turn', { turn: Math.round(v), max: MAX_TURNS });
        return v;
      },
      fc(v?: number) {
        if (v === undefined) return Number(fcEl.dataset.v ?? 0);
        fcEl.dataset.v = String(v);
        fcEl.textContent = `${Math.round(v)}%`;
        fcBar.style.transform = `scaleX(${v / 100})`;
        return v;
      },
    };
    hud.turn(0);
    hud.fc(58);
    const turnAt = (n: number, at: number) => {
      tl.fromTo(hud, { turn: n - 1 }, { turn: n, duration: f(1), ease: 'steps(1)', immediateRender: false }, at)
        .fromTo(turnEl, { y: 8, opacity: 0.2 }, { y: 0, opacity: 1, duration: f(8), ease: ease.softLand, immediateRender: false }, at);
    };
    const forecastTo = (from: number, to: number, at: number) => {
      // Contador por passos (um valor por quadro, desacelerando) e o medidor junto.
      tl.fromTo(hud, { fc: from }, { fc: to, duration: f(14), ease: ease.snapSettle, immediateRender: false }, at).fromTo(
        fcEl,
        { scale: 1.25, color: '#ffcb6b' },
        { scale: 1, color: '#e7eaee', duration: f(12), ease: ease.softLand, immediateRender: false },
        at,
      );
    };
    const hpTo = (id: string, hp: number, at: number) => {
      const pips = tok(id).querySelectorAll('.g-token__hp > i');
      pips.forEach((p, i) => tl.set(p, { className: i < hp ? 'on' : '' }, at));
    };

    // ── Câmera: aproxima o duelo (zoom em torno de um ponto) e volta.
    const camFocus = (a: string, b: string, at: number, dur: number) => {
      if (REDUCED) return;
      const ca = boxOf(a);
      const cb = boxOf(b);
      const px = (ca.x + cb.x) / 2 + cell / 2;
      const py = (ca.y + cb.y) / 2 + cell / 2;
      const W = camera.offsetWidth;
      const H = camera.offsetHeight;
      const s = 1.2;
      tl.to(camera, { scale: s, x: (W / 2 - px) * (s - 1) * 0.9, y: (H / 2 - py) * (s - 1) * 0.9, duration: f(14), ease: ease.glide }, at).to(
        camera,
        { scale: 1, x: 0, y: 0, duration: f(16), ease: ease.softInOut },
        at + dur,
      );
    };

    // ── Avanço: antecipação contra o movimento + deslize que assenta (posição lógica acumulada por token).
    const logical = new Map<string, { x: number; y: number }>();
    const advanceL = (id: string, cols: number, at: number) => {
      const node = tok(id);
      const cur = logical.get(id) ?? { x: 0, y: 0 };
      const p = pos.get(id)!;
      const from = center(p.col, p.row);
      p.col += cols * (CAST.find((u) => u.id === id)!.side === 'p' ? 1 : -1);
      const to = center(p.col, p.row);
      const nx = cur.x + (to.x - from.x);
      const ny = cur.y + (to.y - from.y);
      logical.set(id, { x: nx, y: ny });
      if (REDUCED) {
        tl.set(node, { x: nx, y: ny }, at);
        return;
      }
      const dx = nx - cur.x;
      const dy = ny - cur.y;
      const len = Math.hypot(dx, dy) || 1;
      tl.fromTo(node, { x: cur.x, y: cur.y }, { x: cur.x - (dx / len) * 7, y: cur.y - (dy / len) * 7, duration: f(3), ease: ease.gentleIn, immediateRender: false }, at)
        .fromTo(node, { x: cur.x - (dx / len) * 7, y: cur.y - (dy / len) * 7 }, { x: nx, y: ny, duration: f(10), ease: ease.softLand, immediateRender: false }, at + f(3))
        .call(play('depart'), undefined, at);
    };

    // ── Golpe: corte diagonal na cor do tipo + tremor + flash + número de dano com física.
    const R = rng(11);
    const slash = (from: string, to: string, dmg: number, at: number) => {
      const target = tok(to);
      const pb = pboxOf(to);
      const lg = logical.get(to) ?? { x: 0, y: 0 };
      const box = { ...pb, x: pb.x + lg.x, y: pb.y + lg.y };
      const cut = document.createElement('div');
      cut.className = 'sc-slash';
      const ang = (from.startsWith('a') ? -32 : 148) + (R() - 0.5) * 16;
      Object.assign(cut.style, { left: `${box.x + box.w / 2}px`, top: `${box.y + box.h / 2}px`, width: `${box.w * 1.7}px` });
      cut.style.setProperty('--c', URBAN);
      layer.appendChild(cut);
      gsap.set(cut, { xPercent: -50, yPercent: -50, rotation: ang, scaleX: 0, opacity: 0 });
      const side = CAST.find((u) => u.id === to)!.side;
      tl.fromTo(cut, { scaleX: 0, opacity: 1, transformOrigin: '0% 50%' }, { scaleX: 1, duration: f(3), ease: ease.whip, immediateRender: false }, at)
        .to(cut, { scaleY: 0.2, opacity: 0, duration: f(6), ease: ease.accelExit }, at + f(3))
        // Treme o cartão (não o token): o hit limpa o transform no fim e o token guarda a posição.
        .add(hit(st, target.querySelector<HTMLElement>('.g-token__card')!, box, 'urban', side), at + f(2))
        .call(play('hit'), undefined, at + f(2));
      // Número de dano: sobe, faz arco e cai com gravidade (duas curvas, seek-safe).
      const num = document.createElement('div');
      num.className = 'sc-dmg';
      num.textContent = `−${dmg}`;
      Object.assign(num.style, { left: `${box.x + box.w * 0.8}px`, top: `${box.y}px` });
      layer.appendChild(num);
      gsap.set(num, { opacity: 0 });
      const vx = (side === 'e' ? 1 : -1) * (14 + R() * 10);
      tl.fromTo(num, { opacity: 1, x: 0, y: 0, scale: 1.6, rotation: 0 }, { x: vx, y: -cell * 0.42, scale: 1, rotation: vx * 0.4, duration: f(9), ease: ease.glide, immediateRender: false }, at + f(2))
        .to(num, { x: vx * 1.8, y: -cell * 0.05, rotation: vx * 0.9, duration: f(12), ease: ease.gentleIn }, at + f(11))
        .to(num, { opacity: 0, duration: f(5), ease: ease.cruise }, at + f(18));
    };

    // ── Abate: tarja nos olhos + ficha em linhas de dossiê (effects.down) sobre o próprio token.
    const kill = (id: string, at: number) => {
      const node = tok(id);
      const lg = logical.get(id) ?? { x: 0, y: 0 };
      const b = boxOf(id);
      const box = { ...b, x: b.x + lg.x, y: b.y + lg.y };
      const pb = pboxOf(id);
      const pbox = { ...pb, x: pb.x + lg.x, y: pb.y + lg.y };
      tl.add(down(st, node, pbox, box), at).call(play('kill'), undefined, at);
    };

    // ── Conversão: pulso de influência, a carta vira (lado da agência) e recebe o selo de recrutamento.
    const turnCard = (by: string, id: string, at: number) => {
      const node = tok(id);
      const card = node.querySelector<HTMLElement>('.g-token__card')!;
      const a = boxOf(by);
      const b = boxOf(id);
      const la = logical.get(by) ?? { x: 0, y: 0 };
      const lb = logical.get(id) ?? { x: 0, y: 0 };
      const ring = document.createElement('div');
      ring.className = 'sc-pulse';
      Object.assign(ring.style, { left: `${a.x + la.x + cell / 2}px`, top: `${a.y + la.y + cell * 0.38}px`, width: `${cell * 0.5}px`, height: `${cell * 0.5}px` });
      layer.appendChild(ring);
      gsap.set(ring, { xPercent: -50, yPercent: -50, opacity: 0 });
      const dist = Math.hypot(b.x + lb.x - (a.x + la.x), b.y + lb.y - (a.y + la.y));
      const flip = {
        // Na metade do giro a carta troca de lado (classe), seek-safe.
        side(v?: number) {
          if (v === undefined) return node.classList.contains('g-token--enemy') ? 0 : 1;
          node.classList.toggle('g-token--enemy', v < 0.5);
          node.classList.toggle('is-recruited', v >= 0.5);
          return v;
        },
      };
      tl.fromTo(ring, { opacity: 0.9, scale: 0.4 }, { scale: (dist / (cell * 0.5)) * 1.1, opacity: 0, duration: f(14), ease: ease.glide, immediateRender: false }, at)
        .call(play('type'), undefined, at)
        .fromTo(card, { rotationY: 0 }, { rotationY: 90, duration: f(5), ease: ease.gentleIn, immediateRender: false, transformPerspective: 500 }, at + f(10))
        .fromTo(flip, { side: 0 }, { side: 1, duration: f(1), ease: 'steps(1)', immediateRender: false }, at + f(15))
        .fromTo(card, { rotationY: -90 }, { rotationY: 0, duration: f(8), ease: ease.softLand, immediateRender: false, transformPerspective: 500 }, at + f(15));
      const seal = document.createElement('div');
      seal.className = 'sc-seal';
      seal.innerHTML = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21"/><circle cx="24" cy="24" r="16" stroke-dasharray="2 3"/><path d="M15 25l6 6 12-14"/></svg>';
      seal.style.setProperty('--c', AGENCY_COLOR);
      node.appendChild(seal);
      gsap.set(seal, { opacity: 0 });
      tl.fromTo(seal, { scale: 2.4, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: -10, duration: f(9), ease: ease.snapSettle, immediateRender: false }, at + f(22))
        .call(play('arrive'), undefined, at + f(23));
    };

    // ── Poeira de papel quando o carimbo bate.
    const dust = (at: number) => {
      if (REDUCED) return;
      const r2 = rng(5);
      const W = camera.offsetWidth;
      const H = camera.offsetHeight;
      for (let i = 0; i < 28; i++) {
        const d = document.createElement('i');
        d.className = 'sc-dust';
        Object.assign(d.style, { left: `${W / 2 + (r2() - 0.5) * cell * 2.4}px`, top: `${H / 2 + (r2() - 0.5) * cell * 0.7}px` });
        layer.appendChild(d);
        gsap.set(d, { opacity: 0 });
        const ang = r2() * Math.PI * 2;
        const sp = cell * (0.5 + r2() * 1.3);
        tl.fromTo(
          d,
          { opacity: 1, x: 0, y: 0, rotation: 0, scale: 0.6 + r2() * 0.8 },
          { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp * 0.6 + cell * 0.35, rotation: (r2() - 0.5) * 540, duration: f(24 + Math.floor(r2() * 12)), ease: ease.whip, immediateRender: false },
          at + r2() * f(2),
        ).to(d, { opacity: 0, duration: f(10), ease: ease.gentleIn }, at + f(20));
      }
    };

    // ═══ Roteiro ═══════════════════════════════════════════════════════
    const titleBar = el.querySelector<HTMLElement>('.sc-title-bar')!;
    const hudEl = el.querySelector<HTMLElement>('.sc-hud')!;
    // 0 s: plano de abertura — a mesa já se move (câmera de 1,08 → 1), o título sob tarja.
    if (!REDUCED) tl.fromTo(camera, { scale: 1.08 }, { scale: 1, duration: 2.4, ease: ease.cruise }, 0);
    tl.fromTo(hudEl, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: f(12), ease: ease.softLand }, 0.1)
      .fromTo(titleBar, { scaleX: 1 }, { scaleX: 0, duration: f(10), ease: ease.accelExit, transformOrigin: '100% 50%' }, 0.45)
      .call(play('redact'), undefined, 0.45);
    // Cartas dos dois lados, cada uma da própria borda; o selo de unidade bate depois.
    const tokens = CAST.map((u) => ({ node: tok(u.id), side: u.side, col: u.col }));
    tl.add(intro(st, tokens), 0.6);
    CAST.forEach((u, i) => {
      const chip = tok(u.id).querySelector<HTMLElement>('.sc-unit-seal')!;
      tl.fromTo(chip, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: f(7), ease: ease.snapSettle, immediateRender: false }, 1.15 + i * f(2));
    });
    tl.call(play('open'), undefined, 0.6);

    // Turno 1 (2,6 s): as frentes avançam.
    let T = 2.6;
    turnAt(1, T);
    ['a1', 'a2', 'a3', 'a4'].forEach((id, i) => advanceL(id, 1, T + i * f(1)));
    ['e1', 'e2', 'e3'].forEach((id, i) => advanceL(id, 1, T + f(2) + i * f(1)));
    // Turno 2 (4,0 s): duelo na linha 0 — golpe e contra-ataque, câmera aproxima.
    T = 4.0;
    turnAt(2, T);
    camFocus('a1', 'e1', T, 1.2);
    slash('a1', 'e1', 1, T + f(6));
    hpTo('e1', 3, T + f(8));
    slash('e1', 'a1', 1, T + f(20));
    hpTo('a1', 4, T + f(22));
    // Variante de derrota: no turno 3 o hostil derruba o agente da linha 1 e a operação cai.
    const resultHost = el.querySelector<HTMLElement>('.sc-result')!;
    const board = el.querySelector<HTMLElement>('.sc-board')!;
    const usd = (n: number) => `US$ ${Math.round(n).toLocaleString(lang)}`;
    const ending = (kind: 'win' | 'lose', at: number) => {
      const h = buildResult(resultHost, {
        kind,
        title: kind === 'win' ? t('game.combat.result.win').toUpperCase() : t('combatfx.stamp.lose'),
        items:
          kind === 'win'
            ? [
                { label: txt.downed, value: 2, tone: 'good' },
                { label: txt.turned, value: 1, tone: 'good' },
                { label: txt.xp, value: 120, format: (n) => `+${Math.round(n)}`, tone: 'good' },
                { label: txt.reward, value: 2400000, format: usd, tone: 'good' },
              ]
            : [
                { label: txt.wounded, value: 2, tone: 'bad' },
                { label: txt.detained, value: 1, tone: 'bad' },
                { label: txt.dirDetained, value: 1, format: (n) => (n >= 1 ? txt.dirState : '—'), tone: 'bad' },
              ],
        doneLabel: t('game.combat.finish'),
        onDone: () => undefined,
        board,
        reduced: REDUCED,
        sound: (n) => play(n as Sfx)(),
      });
      h.tl.pause();
      tl.add(h.tl.paused(false), at);
      // Fim vivo: a câmera ainda se aproxima devagar enquanto o resumo assenta.
      if (!REDUCED) tl.fromTo(camera, { scale: 1 }, { scale: 1.04, duration: 2.6, ease: ease.cruise, immediateRender: false }, at);
      tl.to({}, { duration: 2.4 }, at + 0.3);
      cleanup.push(() => h.destroy());
    };
    const cleanup: (() => void)[] = [];
    if (ENDING === 'lose') {
      T = 5.8;
      turnAt(3, T);
      camFocus('e2', 'a2', T, 1.25);
      slash('e2', 'a2', 2, T + f(5));
      hpTo('a2', 2, T + f(7));
      slash('e2', 'a2', 2, T + f(14));
      hpTo('a2', 0, T + f(16));
      kill('a2', T + f(18));
      forecastTo(58, 31, T + f(26));
      ending('lose', T + 1.3);
    } else {
    // Turno 3 (5,8 s): linha 1 — dois golpes, abate.
    T = 5.8;
    turnAt(3, T);
    camFocus('a2', 'e2', T, 1.25);
    slash('a2', 'e2', 2, T + f(5));
    hpTo('e2', 1, T + f(7));
    slash('a2', 'e2', 1, T + f(14));
    hpTo('e2', 0, T + f(16));
    kill('e2', T + f(18));
    forecastTo(58, 71, T + f(30));
    // Turno 4 (7,6 s): Agente de Influência vira o hostil da linha 2.
    T = 7.6;
    turnAt(4, T);
    advanceL('a3', 1, T);
    advanceL('a3', 1, T + f(12));
    camFocus('a3', 'e3', T + f(10), 1.3);
    turnCard('a3', 'e3', T + f(24));
    forecastTo(71, 79, T + f(52));
    // Turno 5 (9,6 s): linha 0 decide — abate.
    T = 9.6;
    turnAt(5, T);
    camFocus('a1', 'e1', T, 1.1);
    slash('a1', 'e1', 3, T + f(5));
    hpTo('e1', 0, T + f(7));
    kill('e1', T + f(9));
    advanceL('e4', 1, T + f(10));
    // Turno 6 (11,1 s): a linha 1 está livre — avanço longo.
    T = 11.1;
    turnAt(6, T);
    advanceL('a2', 1, T);
    advanceL('a2', 1, T + f(9));
    slash('e4', 'a1', 1, T + f(6));
    hpTo('a1', 3, T + f(8));
    forecastTo(79, 92, T + f(16));
    // Turno 7 (12,5 s): ruptura da linha.
    T = 12.5;
    turnAt(7, T);
    advanceL('a2', 1, T);
    advanceL('a2', 1, T + f(8));
    {
      const lg = logical.get('a2') ?? { x: 0, y: 0 };
      const b = boxOf('a2');
      tl.add(breach(st, { ...b, x: b.x + lg.x, y: b.y + lg.y }, 'urban', true), T + f(16)).call(play('alert'), undefined, T + f(16));
    }
    // Vitória (13,6 s): carimbo bate + poeira de papel.
    const V = 13.7;
    if (ENDING === 'win') ending('win', V - 0.1);
    else {
      tl.add(verdict(st, t('game.combat.result.win').toUpperCase(), true), V).call(play('win'), undefined, V + f(3));
      dust(V + f(3));
      // Fim vivo e curto: a câmera ainda se aproxima devagar enquanto a poeira assenta (sem quadro congelado).
      if (!REDUCED) tl.fromTo(camera, { scale: 1 }, { scale: 1.035, duration: 1.0, ease: ease.cruise, immediateRender: false }, V + 0.35);
      tl.to({}, { duration: 1.0 }, V + 0.35);
    }
    }

    master.current = tl;
    const w = window as unknown as { __seek?: (t: number) => void; __duration?: number; __timelines?: Record<string, gsap.core.Timeline> };
    w.__duration = tl.duration();
    w.__seek = (time: number) => {
      tl.seek(time, false);
    };
    if (!RENDER) {
      tl.progress(0).pause();
    }
    return () => {
      tl.kill();
      cleanup.forEach((c) => c());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell]);

  const start = () => {
    audio.unlock();
    setPlaying(true);
    master.current?.restart();
  };

  const boardW = portrait ? cell * ROWS : cell * COLS;
  const boardH = portrait ? cell * COLS : cell * ROWS;

  return (
    <div ref={root} className={`sc-root${portrait ? ' is-portrait' : ''}`}>
      <header className="sc-hud">
        <span className="sc-type">{t('combat.urban')}</span>
        <h1 className="sc-title">
          {countryName('818')}
          <span className="sc-title-bar" aria-hidden="true" />
        </h1>
        <span className="sc-turn">
          <span className="sc-turn-n" />
        </span>
        <span className="sc-fc">
          <span className="sc-fc-l">{txt.forecast}</span>
          <span className="sc-fc-track">
            <span className="sc-fc-fill" />
          </span>
          <span className="sc-fc-n" />
        </span>
      </header>
      <div className="sc-camera" style={{ width: boardW, height: boardH }}>
        <div className="g-board sc-board" style={{ ['--cols' as string]: portrait ? ROWS : COLS, ['--rows' as string]: portrait ? COLS : ROWS, width: boardW, height: boardH }}>
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const c = i % COLS;
            const r = Math.floor(i / COLS);
            const zone = c < 3 ? ' g-board__cell--deploy' : c >= COLS - 3 ? ' g-board__cell--enemy' : '';
            return <span key={i} className={`g-board__cell${zone}`} style={portrait ? { gridColumn: r + 1, gridRow: COLS - c } : { gridColumn: c + 1, gridRow: r + 1 }} />;
          })}
          {cell > 0 &&
            CAST.map((u) => {
              const cx = portrait ? (u.row + 0.5) * cell : (u.col + 0.5) * cell;
              const cy = portrait ? (COLS - 1 - u.col + 0.5) * cell : (u.row + 0.5) * cell;
              return (
                <div
                  key={u.id}
                  data-u={u.id}
                  className={`g-token sc-token${u.side === 'e' ? ' g-token--enemy' : ''}`}
                  style={{ left: cx - cell / 2, top: cy - cell / 2, width: cell, height: cell }}
                >
                  <span className="g-token__card">
                    <OperativePortrait seed={u.seed} size={Math.round(cell * 0.6)} tone={u.side === 'e' ? 'signal' : 'warm'} frame={false} />
                    <span className="g-token__hp" aria-hidden="true">
                      {Array.from({ length: 5 }, (_, i) => (
                        <i key={i} className={i < u.hp ? 'on' : undefined} />
                      ))}
                    </span>
                  </span>
                  <span className="sc-unit-seal" aria-hidden="true" />
                </div>
              );
            })}
          <div className="cfx-layer" aria-hidden="true" />
        </div>
      </div>
      <div className="sc-result" />
      {!RENDER && (
        <button type="button" className={`g-btn g-btn--primary g-btn--lg sc-play${playing ? ' is-small' : ''}`} onClick={start}>
          {playing ? txt.replay : txt.play}
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Showcase />);
