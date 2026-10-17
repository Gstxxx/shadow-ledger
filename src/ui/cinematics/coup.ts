// Cena curta do Golpe de Estado: diorama 2.5D em camadas (céu, cidade, palácio, holofotes, avenida, fumaça,
// blindados, soldados) com câmera (dolly + pan + parallax), telex e mapa tático sobrepostos, tarja de título
// e corte seco para o Combate. Timeline GSAP seek-safe (setters por função; sons só em play), só transform/opacity.
import { gsap } from 'gsap';
import { ease, f } from '../menu/ease';

/** Camadas que podem receber imagens geradas depois (a imagem substitui o desenho SVG da camada). */
export type CoupSlot = 'sky' | 'city' | 'palace' | 'avenue' | 'tanks' | 'fg';

export interface CoupText {
  kicker: string;
  title: string;
  telex: string[];
  map: string;
  skip: string;
}

export interface CoupOptions {
  text: CoupText;
  reduced?: boolean;
  /** URL de imagem por camada (opcional). */
  images?: Partial<Record<CoupSlot, string>>;
  sound?: (name: 'hit' | 'alert' | 'type' | 'redact' | 'kill') => void;
  /** Chamado no corte (fim natural ou toque para pular). */
  onDone?: () => void;
}

export interface CoupHandle {
  tl: gsap.core.Timeline;
  /** Instante do corte seco (s). */
  cutAt: number;
  skip(): void;
  destroy(): void;
}

const W = 1600;
const H = 900;
const HORIZON = 560;

const el = (cls: string, parent: HTMLElement, html = '') => {
  const d = document.createElement('div');
  d.className = cls;
  if (html) d.innerHTML = html;
  parent.appendChild(d);
  return d;
};

const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// ── Desenhos (SVG em unidades do palco 1600×900) ─────────────────────
const svg = (body: string, w = W, h = H, extra = '') =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true" ${extra}>${body}</svg>`;

function skyArt(r: () => number) {
  let stars = '';
  for (let i = 0; i < 70; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 420).toFixed(0)}" r="${(0.6 + r() * 1.3).toFixed(1)}" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  return svg(
    `<defs><linearGradient id="cc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080d"/><stop offset=".62" stop-color="#0d1a2a"/><stop offset="1" stop-color="#1a2a3c"/></linearGradient>
     <radialGradient id="cc-glow" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#f2a93b" stop-opacity=".28"/><stop offset="1" stop-color="#f2a93b" stop-opacity="0"/></radialGradient></defs>
     <rect width="${W}" height="${H}" fill="url(#cc-sky)"/><g fill="#cfe3ff">${stars}</g>
     <rect y="${HORIZON - 260}" width="${W}" height="320" fill="url(#cc-glow)"/>`,
  );
}

function cityArt(r: () => number) {
  let b = '';
  let x = -20;
  while (x < W + 20) {
    const w = 40 + r() * 90;
    const h = 60 + r() * (Math.abs(x - W / 2) < 360 ? 70 : 190);
    b += `<rect x="${x.toFixed(0)}" y="${(HORIZON - h).toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 4).toFixed(0)}"/>`;
    for (let k = 0; k < 4; k++) if (r() > 0.55) b += `<rect class="cc-win" x="${(x + 6 + r() * (w - 14)).toFixed(0)}" y="${(HORIZON - h + 8 + r() * (h - 20)).toFixed(0)}" width="4" height="6"/>`;
    x += w + 2;
  }
  return svg(`<g fill="#0b1520">${b}</g>`);
}

function palaceArt() {
  let cols = '';
  for (let i = 0; i < 8; i++) cols += `<rect x="${648 + i * 40}" y="452" width="14" height="102"/>`;
  let wins = '';
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 6; i++) {
      wins += `<rect class="cc-win" x="${540 + i * 16}" y="${462 + row * 44}" width="8" height="18"/>`;
      wins += `<rect class="cc-win" x="${982 + i * 16}" y="${462 + row * 44}" width="8" height="18"/>`;
    }
  return svg(`<g fill="#121f2e">
      <rect x="500" y="440" width="600" height="124"/>
      <rect x="470" y="556" width="660" height="10"/>
      <polygon points="620,440 800,382 980,440"/>
      <rect x="712" y="320" width="176" height="64"/>
      <path d="M700 324 Q800 190 900 324 Z"/>
      <rect x="792" y="214" width="16" height="30"/>
      <rect x="798" y="150" width="3" height="68"/>
    </g>
    <g fill="#060b11">${cols}</g>
    <g>${wins}</g>
    <polygon class="cc-flag" points="801,152 846,160 801,170" fill="#e5372f"/>`);
}

function avenueArt() {
  const vp = W / 2;
  let lamps = '';
  let dashes = '';
  for (let i = 1; i <= 7; i++) {
    const p = i / 7.5;
    const y = HORIZON + (H - HORIZON) * p * p;
    const s = 0.12 + p * p * 1.9;
    for (const side of [-1, 1]) {
      const x = vp + side * (40 + (W * 0.62) * p * p);
      lamps += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})"><rect x="-3" y="-160" width="6" height="160" fill="#091119"/><circle class="cc-lamp" cy="-162" r="9"/><circle cy="-162" r="40" fill="url(#cc-lampglow)"/></g>`;
    }
    const d0 = HORIZON + (H - HORIZON) * Math.pow((i - 0.3) / 7.5, 2);
    const d1 = HORIZON + (H - HORIZON) * Math.pow((i + 0.05) / 7.5, 2);
    const w0 = 1 + 10 * Math.pow((i - 0.3) / 7.5, 2);
    const w1 = 1 + 10 * Math.pow((i + 0.05) / 7.5, 2);
    dashes += `<polygon points="${vp - w0},${d0} ${vp + w0},${d0} ${vp + w1},${d1} ${vp - w1},${d1}" fill="#3a4a5a" opacity=".7"/>`;
  }
  return svg(`<defs><radialGradient id="cc-lampglow"><stop offset="0" stop-color="#f2a93b" stop-opacity=".45"/><stop offset="1" stop-color="#f2a93b" stop-opacity="0"/></radialGradient>
      <linearGradient id="cc-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16212c"/><stop offset="1" stop-color="#0a0f15"/></linearGradient></defs>
    <rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="#070b10"/>
    <polygon points="${vp - 46},${HORIZON} ${vp + 46},${HORIZON} ${W * 1.05},${H} ${-W * 0.05},${H}" fill="url(#cc-road)"/>
    ${dashes}${lamps}`);
}

/** Blindado de frente (vindo na direção da câmera), base no (0,0) do próprio SVG 420×260, com faróis no chão. */
const TANK = svg(
  `<defs><linearGradient id="cc-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd58a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></linearGradient></defs>
   <polygon points="120,214 168,214 40,262 -40,262" fill="url(#cc-beam)" class="cc-beam"/>
   <polygon points="252,214 300,214 460,262 380,262" fill="url(#cc-beam)" class="cc-beam"/>
   <g fill="#05080c">
     <rect x="20" y="120" width="70" height="100" rx="8"/><rect x="330" y="120" width="70" height="100" rx="8"/>
     <polygon points="60,110 360,110 380,200 40,200"/>
     <rect x="128" y="58" width="164" height="62" rx="10"/>
     <rect x="200" y="74" width="20" height="44"/>
     <rect x="246" y="10" width="3" height="54"/>
     <rect x="150" y="40" width="30" height="20" rx="3"/>
   </g>
   <circle cx="210" cy="96" r="12" fill="#0d151d"/><circle cx="210" cy="96" r="6" fill="#020305"/>
   <circle class="cc-head" cx="144" cy="186" r="9"/><circle class="cc-head" cx="276" cy="186" r="9"/>
   <rect x="60" y="150" width="300" height="4" fill="#1d2b38"/>`,
  420,
  262,
  'style="overflow:visible"',
);

const SOLDIER = (fill = '#04070a') =>
  svg(
    `<g fill="${fill}"><ellipse cx="30" cy="16" rx="13" ry="10"/><rect x="18" y="20" width="24" height="10" rx="4"/>
     <path d="M12 32 Q30 26 48 32 L52 84 L40 84 L36 128 L24 128 L20 84 L8 84 Z"/>
     <rect x="44" y="20" width="5" height="62" transform="rotate(14 46 50)"/></g>`,
    60,
    130,
    'style="overflow:visible"',
  );

const MAP = svg(
  `<rect width="300" height="200" fill="#e8dcc2"/>
   <g stroke="#9c8a68" stroke-width="1" opacity=".55">${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 36}" y1="0" x2="${i * 36}" y2="200"/>`).join('')}${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 36}" x2="300" y2="${i * 36}"/>`).join('')}</g>
   <path d="M0 140 C60 120 120 150 180 110 S260 80 300 90" stroke="#6e7f8f" stroke-width="10" fill="none" opacity=".5"/>
   <rect x="196" y="56" width="44" height="30" fill="none" stroke="#241c11" stroke-width="3"/>
   <g class="cc-arrow" stroke="#b3261e" stroke-width="5" fill="none" stroke-linecap="round"><path d="M18 176 C70 150 130 120 190 82"/></g>
   <g class="cc-arrow2" stroke="#b3261e" stroke-width="5" fill="none" stroke-linecap="round"><path d="M290 186 C270 150 252 120 236 92"/></g>
   <polygon points="186,74 200,78 192,90" fill="#b3261e" class="cc-arrow"/>
   <circle cx="218" cy="71" r="22" fill="none" stroke="#b3261e" stroke-width="3" class="cc-ring"/>`,
  300,
  200,
);

// ── Construção ───────────────────────────────────────────────────────
export function buildCoup(host: HTMLElement, o: CoupOptions): CoupHandle {
  const R = !!o.reduced;
  const r = rng(11);
  const root = el(`cc-root${R ? ' is-reduced' : ''}`, host);
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', `${o.text.kicker}: ${o.text.title}`);
  const viewport = el('cc-viewport', root);
  const stage = el('cc-stage', viewport);
  const fit = () => {
    const s = Math.max(viewport.clientWidth / W, viewport.clientHeight / H);
    stage.style.setProperty('--cc-fit', String(s));
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(viewport);

  const camera = el('cc-camera', stage);
  const layer = (slot: CoupSlot | 'lights' | 'smoke', depth: number, art: string) => {
    const d = el(`cc-layer cc-layer--${slot}`, camera);
    d.dataset.slot = slot;
    d.dataset.depth = String(depth);
    const img = o.images?.[slot as CoupSlot];
    if (img) {
      const im = document.createElement('img');
      im.src = img;
      im.alt = '';
      im.className = 'cc-img';
      d.appendChild(im);
    } else d.innerHTML = art;
    return d;
  };
  layer('sky', 0.05, skyArt(r));
  layer('city', 0.18, cityArt(r));
  const lights = layer('lights', 0.3, '');
  const beams = [520, 800, 1080].map((x, i) => {
    const b = el('cc-search', lights);
    b.style.left = `${x}px`;
    b.style.top = `${HORIZON - 40 - i * 8}px`;
    return b;
  });
  layer('palace', 0.32, palaceArt());
  layer('avenue', 0.55, avenueArt());
  const smoke = layer('smoke', 0.7, '');
  const puffs = Array.from({ length: 7 }, (_, i) => {
    const p = el('cc-smoke', smoke);
    p.style.left = `${100 + i * 220 + r() * 80}px`;
    p.style.top = `${HORIZON - 70 + r() * 140}px`;
    return p;
  });
  const tanksL = layer('tanks', 0.8, '');
  const tank = (cls: string) => el(`cc-tank ${cls}`, tanksL, TANK);
  const t1 = tank('cc-tank--1');
  const t2 = tank('cc-tank--2');
  const troops = Array.from({ length: 6 }, (_, i) => {
    const s = el('cc-soldier', tanksL, SOLDIER());
    s.dataset.i = String(i);
    return s;
  });
  const fg = layer('fg', 1.15, '');
  const runners = Array.from({ length: 3 }, (_, i) => {
    const s = el('cc-runner', fg, SOLDIER('#020304'));
    s.style.top = `${560 + i * 40}px`;
    return s;
  });

  // Luz de sirene, grão e vinheta sobre tudo; telex, mapa e tarja fora do palco (posicionados pela tela real).
  const sirenR = el('cc-siren cc-siren--r', root);
  const sirenB = el('cc-siren cc-siren--b', root);
  const grain = el('cc-grain', root);
  el('cc-vignette', root);
  const hud = el('cc-hud', root);
  const telex = el('cc-telex', hud);
  const lines = o.text.telex.map((txt) => {
    const ln = el('cc-telex__line', telex);
    let shown = -1;
    // Propriedade-função: o GSAP chama até em seek; o texto "datilografa" por caractere.
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
    return { ln, face, len: txt.length };
  });
  const map = el('cc-map', hud, MAP);
  const mapLabel = el('cc-map__label', map);
  mapLabel.textContent = o.text.map;
  const title = el('cc-title', hud);
  const kicker = el('cc-title__kicker', title);
  kicker.textContent = o.text.kicker;
  const titleText = el('cc-title__text', title);
  titleText.textContent = o.text.title;
  const redact = el('cc-title__bar', titleText);
  const skipHint = el('cc-skip', root);
  skipHint.textContent = o.text.skip;
  const cut = el('cc-cut', root);

  const tl = gsap.timeline({ paused: true });
  const call = (n: Parameters<NonNullable<CoupOptions['sound']>>[0], at: number) => tl.call(() => o.sound?.(n), undefined, at);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    o.onDone?.();
  };

  gsap.set([map, title, redact, cut], { opacity: 0 });
  gsap.set(lines.map((l) => l.ln), { opacity: 1 });

  let cutAt: number;
  if (R) {
    // Reduzir movimento: cartão estático de 1,5 s (palácio, tarja aberta, sem câmera nem luzes).
    gsap.set([t1, t2, ...troops, ...runners], { opacity: 0 });
    gsap.set(title, { opacity: 1 });
    gsap.set(redact, { opacity: 0 });
    lines.forEach((l) => l.face.n(l.len));
    gsap.set(map, { opacity: 1 });
    cutAt = 1.5;
    tl.to({}, { duration: 1.5 });
    call('alert', 0);
  } else {
    const T = 7.0;
    cutAt = T;
    // Câmera: dolly lento para dentro e pan da direita para a esquerda; cada camada desloca pela sua profundidade.
    tl.fromTo(camera, { scale: 1.02 }, { scale: 1.14, duration: T, ease: ease.cruise }, 0);
    camera.querySelectorAll<HTMLElement>('.cc-layer').forEach((L) => {
      const d = Number(L.dataset.depth);
      tl.fromTo(L, { x: 70 * d }, { x: -90 * d, duration: T, ease: ease.cruise }, 0);
    });
    // Holofotes varrendo o céu (cada um no seu ritmo).
    beams.forEach((b, i) => {
      const a = [-28, 12, 30][i];
      tl.fromTo(b, { rotation: a }, { rotation: a - 40 + i * 22, duration: (T - i * 0.4) / 3, ease: ease.softInOut, repeat: 2, yoyo: true }, 0);
    });
    // Fumaça e poeira à deriva.
    puffs.forEach((p, i) => tl.fromTo(p, { x: 0, scale: 0.9, opacity: 0.35 }, { x: -60 - i * 6, scale: 1.25, opacity: 0.55, duration: T, ease: 'none' }, 0));
    // Blindados pela avenida: do ponto de fuga até tomar o quadro (acelera ao se aproximar, como em perspectiva).
    tl.fromTo(t1, { x: W / 2 - 210, y: HORIZON - 250, scale: 0.08 }, { x: W / 2 - 210 - 120, y: H - 140, scale: 3.4, duration: T, ease: 'power2.in' }, 0);
    tl.fromTo(t2, { x: W / 2 - 210, y: HORIZON - 250, scale: 0.05 }, { x: W / 2 - 210 + 260, y: H - 300, scale: 1.45, duration: T - 0.6, ease: 'power2.in' }, 0.6);
    // Pelotão a pé ao lado dos blindados.
    troops.forEach((s, i) => {
      const side = i % 2 ? 1 : -1;
      const lane = 1 + Math.floor(i / 2);
      tl.fromTo(
        s,
        { x: W / 2 - 30 + side * (30 + lane * 10), y: HORIZON - 128, scale: 0.1 },
        { x: W / 2 - 30 + side * (200 + lane * 150), y: H - 260 + lane * 40, scale: 1.1 + lane * 0.25, duration: T - 0.3 - i * 0.12, ease: 'power2.in' },
        0.3 + i * 0.12,
      );
      // Passo marcado (sobe e desce em degraus, como a pé).
      tl.to(s.firstElementChild, { y: -3, duration: f(5), ease: 'steps(1)', repeat: Math.floor((T - 0.5) / f(5)) - 1, yoyo: true }, 0.3 + i * 0.12);
    });
    // Sirenes: vermelho e azul alternando.
    const SR = 0.4;
    for (let k = 0; k < 14; k++) {
      const at = SR + k * 0.36;
      tl.fromTo(k % 2 ? sirenB : sirenR, { opacity: 0 }, { opacity: 0.55, duration: f(3), ease: ease.whip, immediateRender: false }, at).to(k % 2 ? sirenB : sirenR, { opacity: 0, duration: f(6), ease: ease.cruise }, at + f(3));
    }
    call('alert', SR);
    call('alert', SR + 2.9);
    // Telex datilografado, linha a linha.
    [1.0, 2.0, 2.8].forEach((at, i) => {
      const l = lines[i];
      if (!l) return;
      tl.fromTo(l.face, { n: 0 }, { n: l.len, duration: Math.min(0.75, l.len * 0.022), ease: 'none', immediateRender: false }, at);
      call('type', at);
    });
    // Mapa tático entra como recorte preso por um clipe; as setas se estendem até o palácio.
    tl.fromTo(map, { opacity: 0, x: 70, rotation: 7 }, { opacity: 1, x: 0, rotation: -3, duration: f(12), ease: ease.softLand, immediateRender: false }, 2.2);
    map.querySelectorAll<SVGGElement>('.cc-arrow, .cc-arrow2').forEach((a, i) => {
      tl.fromTo(a, { scale: 0, transformOrigin: i === 1 ? '100% 100%' : '0% 100%' }, { scale: 1, duration: f(14), ease: ease.glide, immediateRender: false }, 2.45 + i * f(4));
    });
    tl.fromTo(map.querySelector('.cc-ring'), { scale: 1.8, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: f(8), ease: ease.snapSettle, immediateRender: false }, 3.0);
    // Tarja: bate de 1,5→1, a barra de censura corre e revela o título; impacto grave e tremida curta.
    const S = 3.7;
    tl.fromTo(title, { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: f(7), ease: ease.snapSettle, immediateRender: false }, S)
      .fromTo(redact, { opacity: 1, scaleX: 1 }, { scaleX: 0, duration: f(9), ease: ease.accelExit, transformOrigin: '100% 50%', immediateRender: false }, S + f(9));
    call('hit', S + f(2));
    call('redact', S + f(9));
    tl.to(stage, { keyframes: [{ x: -9, y: 4 }, { x: 7, y: -3 }, { x: -4, y: 2 }, { x: 2 }, { x: 0, y: 0 }], duration: f(7), ease: 'steps(5)' }, S + f(2));
    // Soldados passam rente à câmera, desfocados.
    runners.forEach((s, i) => tl.fromTo(s, { x: W + 120 + i * 90, scale: 3.2 + i * 0.4 }, { x: -380 - i * 60, duration: 0.9 + i * 0.12, ease: ease.glide, immediateRender: false }, 5.2 + i * 0.18));
    // Corte seco: o blindado toma o quadro e a tela vai ao preto num quadro (o Combate entra por cima).
    tl.set(cut, { opacity: 1 }, T);
    call('kill', T);
  }
  // Grão: o padrão salta por quadro (on-twos), sem custo de pintura.
  const g = { n(x?: number) {
    if (x === undefined) return 0;
    const k = Math.floor(x);
    grain.style.transform = `translate(${((k * 37) % 60) - 30}px, ${((k * 53) % 60) - 30}px)`;
    return x;
  } };
  tl.fromTo(g, { n: 0 }, { n: cutAt * 15, duration: cutAt, ease: 'none', immediateRender: false }, 0);
  tl.call(finish, undefined, cutAt);

  const skip = () => {
    tl.progress(1);
    finish();
  };
  root.addEventListener('pointerdown', () => skip());
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
