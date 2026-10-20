// Cenas curtas para momentos grandes (mesmo estilo do Golpe): Ataque à Estação, Caçada concluída e Crise Final.
// Palco 1600×900 em "cover", diorama em camadas com câmera, telex e tarja por cima, carimbo de desfecho e corte seco.
// Timeline GSAP seek-safe (setters por função; sons só em play); só transform/opacity animam.
// Reduzir movimento: cartão estático (cena parada já resolvida, tarja e carimbo) por 1,6 s.
import { gsap } from 'gsap';
import { ease, f } from '../menu/ease';

export type SceneKind = 'raid' | 'hunt' | 'crisis' | 'finale';
export type RaidOutcome = 'held' | 'lost' | 'interdicted';

export interface SceneText {
  kicker: string;
  title: string;
  telex: string[];
  /** Carimbo do desfecho (ex.: "Estação mantida", "Neutralizado", "Fim de jogo"). */
  stamp: string;
  skip: string;
  /** Linha extra sob o carimbo (ex.: recompensa). */
  note?: string;
}

export interface SceneOptions {
  kind: SceneKind;
  text: SceneText;
  /** Ataque à Estação: desfecho. */
  outcome?: RaidOutcome;
  /** Caçada: recompensa (conta subindo sob o carimbo). */
  bounty?: number;
  formatMoney?: (n: number) => string;
  reduced?: boolean;
  sound?: (name: 'hit' | 'alert' | 'type' | 'redact' | 'kill' | 'win' | 'lose' | 'arrive') => void;
  onDone?: () => void;
}

export interface SceneHandle {
  tl: gsap.core.Timeline;
  cutAt: number;
  skip(): void;
  destroy(): void;
}

const W = 1600;
const H = 900;
const HZ = 600;

const el = (cls: string, parent: HTMLElement, html = '') => {
  const d = document.createElement('div');
  d.className = cls;
  if (html) d.innerHTML = html;
  parent.appendChild(d);
  return d;
};
const svg = (body: string, w = W, h = H) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// ── Ataque à Estação: casa segura à noite, viaturas chegando, holofote, fita de interdição ───────────
function raidLayers(r: () => number) {
  let stars = '';
  for (let i = 0; i < 40; i++) stars += `<circle cx="${(r() * W) | 0}" cy="${(r() * 380) | 0}" r="${(0.6 + r()).toFixed(1)}" opacity="${(0.2 + r() * 0.5).toFixed(2)}"/>`;
  const sky = svg(`<defs><linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04070b"/><stop offset="1" stop-color="#16222f"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#rs)"/><g fill="#cfe3ff">${stars}</g>`);
  let blocks = '';
  let x = -20;
  while (x < W) {
    const w = 80 + r() * 120;
    const h = 120 + r() * 220;
    blocks += `<rect x="${x | 0}" y="${(HZ - h) | 0}" width="${w | 0}" height="${(h + 4) | 0}"/>`;
    x += w + 4;
  }
  const city = svg(`<g fill="#0b131c">${blocks}</g>`);
  // casa segura: sobrado com portão, janelas acesas âmbar, antena
  let wins = '';
  for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) wins += `<rect class="cs-win" x="${640 + i * 86}" y="${360 + row * 110}" width="44" height="60"/>`;
  const house = svg(`<g fill="#141d27">
      <rect x="600" y="300" width="400" height="${HZ - 300}"/>
      <polygon points="580,304 800,220 1020,304"/>
      <rect x="930" y="170" width="6" height="80"/>
    </g>
    <g>${wins}</g>
    <rect x="770" y="490" width="60" height="110" fill="#0a1017"/>
    <rect x="560" y="560" width="480" height="40" fill="#0f161e"/>
    <g stroke="#2a3542" stroke-width="5">${Array.from({ length: 13 }, (_, i) => `<line x1="${560 + i * 40}" y1="560" x2="${560 + i * 40}" y2="600"/>`).join('')}</g>`);
  const ground = svg(`<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="#080c11"/>
    <polygon points="0,${H} ${W},${H} ${W},${HZ + 40} 0,${HZ + 60}" fill="#0c1218"/>`);
  return { sky, city, house, ground };
}

/** Viatura de frente/lado (silhueta) com giroflex. */
const VAN = svg(
  `<g fill="#05080c"><rect x="10" y="40" width="300" height="90" rx="10"/><polygon points="230,40 300,40 330,90 330,130 230,130"/>
   <circle cx="70" cy="132" r="26"/><circle cx="260" cy="132" r="26"/></g>
   <rect x="250" y="52" width="56" height="34" fill="#1d3346"/>
   <rect class="cs-bar cs-bar--r" x="120" y="24" width="40" height="14" rx="3"/><rect class="cs-bar cs-bar--b" x="162" y="24" width="40" height="14" rx="3"/>
   <circle cx="326" cy="104" r="7" fill="#fff1c9"/>`,
  340,
  160,
);

const AGENT = svg(
  `<g fill="#04070a"><ellipse cx="30" cy="16" rx="12" ry="11"/><path d="M12 32 Q30 24 48 32 L52 86 L40 86 L36 130 L24 130 L20 86 L8 86 Z"/><rect x="40" y="40" width="40" height="7" rx="2"/></g>`,
  90,
  132,
);

// ── Caçada: acampamento no morro ao amanhecer, fumaça, bandeira caindo ─────────────────────────────
function huntLayers(r: () => number) {
  const sky = svg(`<defs><linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2633"/><stop offset=".62" stop-color="#7a6248"/><stop offset=".85" stop-color="#e2a55c"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#hs)"/><circle cx="1180" cy="520" r="90" fill="#ffd9a0" opacity=".55"/>`);
  const hills = svg(`<path d="M0 560 C220 470 420 520 620 470 S1040 440 1260 500 S1520 470 1600 490 L1600 900 L0 900 Z" fill="#2a261f"/>
    <path d="M0 640 C300 580 560 640 860 600 S1360 580 1600 620 L1600 900 L0 900 Z" fill="#17140f"/>`);
  let tents = '';
  for (let i = 0; i < 4; i++) {
    const x = 520 + i * 150 + r() * 30;
    tents += `<polygon points="${x},540 ${x + 60},460 ${x + 120},540" fill="#1f1c16"/><polygon points="${x + 50},540 ${x + 60},478 ${x + 70},540" fill="#0b0a08"/>`;
  }
  const camp = svg(`${tents}<rect x="700" y="380" width="5" height="160" fill="#14110d"/>
    <g class="cs-flag"><polygon points="705,384 790,396 705,414" fill="#c8352c"/></g>
    <g fill="#2c2820"><rect x="880" y="510" width="60" height="30"/><rect x="950" y="520" width="40" height="20"/></g>`);
  return { sky, hills, camp };
}

// ── Crise Final: horizonte urbano, rastros de lançamento subindo, clarão, céu tomado de vermelho ───
function crisisLayers(r: () => number) {
  const sky = svg(`<defs><linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070b"/><stop offset=".7" stop-color="#1a1f28"/><stop offset="1" stop-color="#3a2a22"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#cs)"/>`);
  let b = '';
  let x = -10;
  while (x < W) {
    const w = 40 + r() * 110;
    const h = 40 + r() * 150;
    b += `<rect x="${x | 0}" y="${(HZ + 110 - h) | 0}" width="${w | 0}" height="${(h + 300) | 0}"/>`;
    x += w + 3;
  }
  const city = svg(`<g fill="#06090d">${b}</g>`);
  // rastros: curvas que sobem do horizonte; reveladas por máscara de escala vertical (só transform)
  const trails = [
    [260, 'M260 660 C300 420 420 220 640 60'],
    [720, 'M720 660 C700 420 760 220 900 40'],
    [1180, 'M1180 660 C1140 440 1060 240 980 30'],
    [1420, 'M1420 660 C1440 460 1380 260 1300 80'],
  ] as const;
  return { sky, city, trails };
}

// ── Final da Campanha: amanhecer sobre a cidade, janelas acendendo, a lanterna no alto ─────────────
function finaleLayers(r: () => number) {
  const sky = svg(`<defs><linearGradient id="fs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14202e"/><stop offset=".55" stop-color="#5a5a62"/><stop offset=".8" stop-color="#e0a35e"/><stop offset="1" stop-color="#f6cf8e"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#fs)"/><circle cx="800" cy="640" r="150" fill="#ffe2a8" opacity=".55"/>`);
  let b = '';
  let wins = '';
  let x = -10;
  while (x < W) {
    const w = 50 + r() * 120;
    const h = 90 + r() * 240;
    const top = HZ + 40 - h;
    b += `<rect x="${x | 0}" y="${top | 0}" width="${w | 0}" height="${(h + 300) | 0}"/>`;
    for (let k = 0; k < 3; k++) if (r() > 0.4) wins += `<rect class="cs-win cs-win--f" x="${(x + 8 + r() * (w - 20)) | 0}" y="${(top + 14 + r() * (h - 30)) | 0}" width="8" height="12"/>`;
    x += w + 3;
  }
  const city = svg(`<g fill="#0c1016">${b}</g><g>${wins}</g>`);
  return { sky, city };
}

// ── Construção comum ─────────────────────────────────────────────────
export function buildScene(host: HTMLElement, o: SceneOptions): SceneHandle {
  const R = !!o.reduced;
  const r = rng(o.kind === 'raid' ? 5 : o.kind === 'hunt' ? 9 : o.kind === 'finale' ? 21 : 13);
  const root = el(`cc-root cs-root cs-root--${o.kind}${R ? ' is-reduced' : ''}`, host);
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', `${o.text.kicker}: ${o.text.title}. ${o.text.stamp}`);
  const viewport = el('cc-viewport', root);
  const stage = el('cc-stage', viewport);
  const fit = () => stage.style.setProperty('--cc-fit', String(Math.max(viewport.clientWidth / W, viewport.clientHeight / H)));
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(viewport);
  const camera = el('cc-camera', stage);
  const layer = (name: string, depth: number, art = '') => {
    const d = el(`cc-layer cs-l--${name}`, camera, art);
    d.dataset.depth = String(depth);
    return d;
  };

  const tl = gsap.timeline({ paused: true });
  const call = (n: Parameters<NonNullable<SceneOptions['sound']>>[0], at: number) => tl.call(() => o.sound?.(n), undefined, at);
  const D = o.kind === 'crisis' || o.kind === 'finale' ? 7.2 : o.kind === 'raid' ? 6.4 : 5.6;
  const cutAt = R ? 1.6 : D;

  // Camadas por cena + coreografia própria (o que muda de uma para outra).
  const siren = el('cc-siren cc-siren--r', root);
  const sirenB = el('cc-siren cc-siren--b', root);
  const flash = el('cs-flash', root);
  let stampAt = D - 2.2;
  if (o.kind === 'raid') {
    const L = raidLayers(r);
    layer('sky', 0.05, L.sky);
    layer('city', 0.2, L.city);
    const house = layer('house', 0.4, L.house);
    const beam = el('cs-beam', house);
    layer('ground', 0.6, L.ground);
    const cars = layer('cars', 0.85);
    const v1 = el('cs-van', cars, VAN);
    const v2 = el('cs-van', cars, VAN);
    const men = Array.from({ length: 5 }, () => el('cs-agent', cars, AGENT));
    const tape = el('cs-tape', house);
    if (!R) {
      tl.fromTo(v1, { x: -420, y: 640, scale: 1.25 }, { x: 140, duration: 1.3, ease: ease.softLand }, 0.2);
      tl.fromTo(v2, { x: W + 80, y: 690, scale: 1.45 }, { x: 1180, duration: 1.2, ease: ease.softLand }, 0.6);
      men.forEach((m, i) => tl.fromTo(m, { x: 320 + i * 70, y: 640, scale: 0.9, opacity: 0 }, { x: 640 + i * 70, y: 560, scale: 0.7, opacity: 1, duration: 1.6, ease: ease.glide }, 1.4 + i * 0.12));
      tl.fromTo(beam, { rotation: -30 }, { rotation: 18, duration: 2.6, ease: ease.softInOut, yoyo: true, repeat: 1 }, 0);
      for (let k = 0; k < 12; k++) {
        const at = 0.5 + k * 0.38;
        const s = k % 2 ? sirenB : siren;
        tl.fromTo(s, { opacity: 0 }, { opacity: 0.5, duration: f(3), ease: ease.whip, immediateRender: false }, at).to(s, { opacity: 0, duration: f(6), ease: ease.cruise }, at + f(3));
      }
      call('alert', 0.4);
      call('arrive', 1.4);
      // impacto na porta
      tl.to(stage, { keyframes: [{ x: -8, y: 3 }, { x: 6, y: -2 }, { x: -3 }, { x: 0, y: 0 }], duration: f(6), ease: 'steps(4)' }, 3.2);
      call('hit', 3.2);
    } else {
      gsap.set(v1, { x: 140, y: 640, scale: 1.25 });
      gsap.set(v2, { x: 1180, y: 690, scale: 1.45 });
      men.forEach((m, i) => gsap.set(m, { x: 640 + i * 70, y: 560, scale: 0.7 }));
    }
    gsap.set(tape, { scaleX: 0 });
    if (o.outcome === 'interdicted') {
      if (R) gsap.set(tape, { scaleX: 1, opacity: 1 });
      else tl.fromTo(tape, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: f(10), ease: ease.glide, immediateRender: false }, D - 2.5);
    } else gsap.set(tape, { opacity: 0 });
    if (o.outcome && o.outcome !== 'held') {
      // janelas apagam uma a uma (a Estação caiu)
      house.querySelectorAll('.cs-win').forEach((w, i) => {
        if (R) gsap.set(w, { opacity: 0.12 });
        else tl.to(w, { opacity: 0.12, duration: f(3), ease: 'steps(1)' }, D - 2.6 + i * 0.07);
      });
    }
    stampAt = D - 2.0;
  } else if (o.kind === 'hunt') {
    const L = huntLayers(r);
    layer('sky', 0.05, L.sky);
    layer('hills', 0.25, L.hills);
    const camp = layer('camp', 0.45, L.camp);
    const smoke = layer('smoke', 0.6);
    const puffs = Array.from({ length: 6 }, (_, i) => {
      const p = el('cc-smoke', smoke);
      p.style.left = `${560 + i * 90}px`;
      p.style.top = `${440 - i * 10}px`;
      return p;
    });
    const team = layer('team', 0.9);
    const men = Array.from({ length: 4 }, () => el('cs-agent', team, AGENT));
    const flag = camp.querySelector<SVGGElement>('.cs-flag')!;
    if (!R) {
      men.forEach((m, i) => tl.fromTo(m, { x: 120 + i * 120, y: 700, scale: 1.8 }, { x: 360 + i * 140, y: 640, scale: 1.4, duration: 2.8, ease: ease.glide }, i * 0.15));
      puffs.forEach((p, i) => tl.fromTo(p, { opacity: 0, y: 30, scale: 0.6 }, { opacity: 0.6, y: -60, scale: 1.4, duration: 3, ease: 'none' }, 0.6 + i * 0.2));
      // bandeira do grupo cai (gira na base do mastro)
      tl.fromTo(flag, { rotation: 0, svgOrigin: '705 540' }, { rotation: 86, duration: f(14), ease: 'power2.in', immediateRender: false }, 2.0);
      call('hit', 2.4);
    } else gsap.set(flag, { rotation: 86, svgOrigin: '705 540' });
    stampAt = D - 2.6;
  } else if (o.kind === 'finale') {
    const L = finaleLayers(r);
    layer('sky', 0.05, L.sky);
    const city = layer('city', 0.35, L.city);
    const lamp = el('cs-lantern', layer('lamp', 0.5));
    const wins = city.querySelectorAll('.cs-win--f');
    if (!R) {
      // janelas acendem aos poucos e a lanterna sobe e brilha
      wins.forEach((w, i) => tl.fromTo(w, { opacity: 0 }, { opacity: 0.85, duration: f(4), ease: 'steps(1)', immediateRender: false }, 0.6 + (i % 23) * 0.12));
      gsap.set(wins, { opacity: 0 });
      tl.fromTo(lamp, { y: 120, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 2.4, ease: ease.softLand }, 0.8);
      tl.fromTo(flash, { opacity: 0 }, { opacity: 0.35, duration: f(6), ease: ease.whip, immediateRender: false }, 4.3).to(flash, { opacity: 0, duration: f(30), ease: ease.cruise }, 4.3 + f(6));
      call('arrive', 0.8);
    } else gsap.set(wins, { opacity: 0.85 });
    stampAt = D - 2.6;
  } else {
    const L = crisisLayers(r);
    layer('sky', 0.05, L.sky);
    const trailsL = layer('trails', 0.15, svg(L.trails.map(([, d]) => `<path d="${d}" stroke="#ff9a4a" stroke-width="22" fill="none" stroke-linecap="round" opacity=".18"/><path d="${d}" stroke="#ffe2b0" stroke-width="6" fill="none" stroke-linecap="round" opacity=".95"/>`).join('')));
    layer('city', 0.35, L.city);
    // os rastros sobem: uma "cortina" escura cobre e recua para cima (scaleY), revelando a curva
    const curtain = el('cs-curtain', trailsL);
    const red = el('cs-red', root);
    if (!R) {
      tl.fromTo(curtain, { scaleY: 1 }, { scaleY: 0, duration: 2.6, ease: 'power1.in', transformOrigin: '50% 0%' }, 0.6);
      call('alert', 0.4);
      call('alert', 1.6);
      tl.fromTo(flash, { opacity: 0 }, { opacity: 0.95, duration: f(2), ease: ease.whip, immediateRender: false }, 3.6).to(flash, { opacity: 0, duration: f(26), ease: ease.cruise }, 3.6 + f(2));
      tl.fromTo(red, { opacity: 0 }, { opacity: 0.6, duration: f(30), ease: ease.cruise, immediateRender: false }, 3.7);
      call('kill', 3.6);
      tl.to(stage, { keyframes: [{ x: -10, y: 5 }, { x: 8, y: -4 }, { x: -5, y: 3 }, { x: 2 }, { x: 0, y: 0 }], duration: f(8), ease: 'steps(5)' }, 3.6);
    } else {
      gsap.set(curtain, { scaleY: 0 });
      gsap.set(red, { opacity: 0.6 });
    }
    stampAt = D - 2.4;
  }

  // Câmera: dolly lento e parallax por profundidade.
  if (!R) {
    tl.fromTo(camera, { scale: 1.03 }, { scale: 1.13, duration: D, ease: ease.cruise }, 0);
    camera.querySelectorAll<HTMLElement>('.cc-layer').forEach((L) => {
      const d = Number(L.dataset.depth);
      tl.fromTo(L, { x: 60 * d }, { x: -80 * d, duration: D, ease: ease.cruise }, 0);
    });
  }

  // Sobreposições: grão, vinheta, telex, tarja, carimbo, pular, corte.
  const grain = el('cc-grain', root);
  el('cc-vignette', root);
  const hud = el('cc-hud', root);
  const telex = el('cc-telex', hud);
  const lines = o.text.telex.map((txt) => {
    const ln = el('cc-telex__line', telex);
    let shown = -1;
    const face = {
      n(x?: number) {
        if (x === undefined) return shown;
        const k = Math.round(x);
        if (k !== shown) {
          shown = k;
          ln.textContent = txt.slice(0, k) + (k > 0 && k < txt.length ? '▌' : '');
        }
        return x;
      },
    };
    return { face, len: txt.length };
  });
  const title = el('cc-title cs-title', hud);
  el('cc-title__kicker', title).textContent = o.text.kicker;
  const tt = el('cc-title__text', title);
  tt.textContent = o.text.title;
  const bar = el('cc-title__bar', tt);
  const tone = o.kind === 'raid' ? (o.outcome === 'held' ? 'good' : 'bad') : o.kind === 'hunt' || o.kind === 'finale' ? 'good' : 'bad';
  const stamp = el(`cs-stamp cs-stamp--${tone}`, hud);
  el('cs-stamp__text', stamp).textContent = o.text.stamp;
  let noteFace: { n(x?: number): number } | null = null;
  if (o.text.note || o.bounty) {
    const note = el('cs-stamp__note', stamp);
    let v = -1;
    const fmt = o.formatMoney ?? ((n: number) => String(Math.round(n)));
    noteFace = {
      n(x?: number) {
        if (x === undefined) return v;
        v = x;
        note.textContent = o.bounty ? `${o.text.note ?? ''} ${fmt(x)}`.trim() : (o.text.note ?? '');
        return x;
      },
    };
    noteFace.n(R ? (o.bounty ?? 0) : 0);
  }
  el('cc-skip', root).textContent = o.text.skip;
  const cut = el('cc-cut', root);
  gsap.set([title, stamp, cut], { opacity: 0 });

  if (R) {
    lines.forEach((l) => l.face.n(l.len));
    gsap.set([title, stamp], { opacity: 1 });
    gsap.set(bar, { scaleX: 0 });
    tl.to({}, { duration: 1.6 });
    call(tone === 'good' ? 'win' : 'lose', 0);
  } else {
    lines.forEach((l, i) => {
      const at = 0.5 + i * 0.85;
      tl.fromTo(l.face, { n: 0 }, { n: l.len, duration: Math.min(0.7, l.len * 0.022), ease: 'none', immediateRender: false }, at);
      call('type', at);
    });
    const S = 1.0;
    tl.fromTo(title, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: f(7), ease: ease.snapSettle, immediateRender: false }, S)
      .fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: f(9), ease: ease.accelExit, transformOrigin: '100% 50%', immediateRender: false }, S + f(8));
    call('redact', S + f(8));
    // carimbo do desfecho
    tl.fromTo(stamp, { opacity: 0, scale: 1.7, rotation: -14 }, { opacity: 1, scale: 1, rotation: -6, duration: f(8), ease: ease.snapSettle, immediateRender: false }, stampAt);
    call(tone === 'good' ? 'win' : 'lose', stampAt + f(2));
    tl.to(stage, { keyframes: [{ x: 5, y: 2 }, { x: -3 }, { x: 0, y: 0 }], duration: f(5), ease: 'steps(3)' }, stampAt + f(3));
    if (noteFace && o.bounty) tl.fromTo(noteFace, { n: 0 }, { n: o.bounty, duration: f(24), ease: ease.softInOut, immediateRender: false }, stampAt + f(6));
    tl.set(cut, { opacity: 1 }, D);
  }
  const g = {
    n(x?: number) {
      if (x === undefined) return 0;
      const k = Math.floor(x);
      grain.style.transform = `translate(${((k * 37) % 60) - 30}px, ${((k * 53) % 60) - 30}px)`;
      return x;
    },
  };
  tl.fromTo(g, { n: 0 }, { n: cutAt * 15, duration: cutAt, ease: 'none', immediateRender: false }, 0);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    o.onDone?.();
  };
  tl.call(finish, undefined, cutAt);
  const skip = () => {
    tl.progress(1);
    finish();
  };
  root.addEventListener('pointerdown', skip);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
  };
  window.addEventListener('keydown', onKey);
  return {
    tl,
    cutAt,
    skip,
    destroy() {
      tl.kill();
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}
