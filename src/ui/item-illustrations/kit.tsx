// Kit comum das ilustrações de itens: definições (gradientes de metal, vidro, céu, chão), filtros de "foto"
// (grão, desfoque de profundidade, sombra de contato) e peças reutilizáveis (rodas, lagartas, brilho especular).
// Palco 480×320 (3:2). Luz rasante de cima-esquerda. Grade fria, acentos âmbar e vermelho-sinal do jogo.
import type { ReactNode } from 'react';

export const VW = 480;
export const VH = 320;
export const GROUND = 262;

/** `u('steel')` → `url(#<uid>-steel)`; `k('steel')` → id. Um uid por instância evita colisão entre SVGs. */
export interface Ink {
  u(name: string): string;
  k(name: string): string;
  lg: boolean;
}

export type Backdrop = 'yard' | 'sky' | 'desk' | 'studio' | 'night';

/** Paletas (grade fria): aço, oliva militar, areia, branco de frota, papel. */
export const C = {
  ink: '#0a0f15',
  steelHi: '#9aa8b6',
  steel: '#5b6976',
  steelLo: '#2a333d',
  oliveHi: '#7e8a68',
  olive: '#4f5a41',
  oliveLo: '#262c20',
  sandHi: '#b8ab88',
  sand: '#8a7f62',
  sandLo: '#4a4434',
  fleetHi: '#e3e8ee',
  fleet: '#b9c2cc',
  fleetLo: '#6d7783',
  paper: '#e8dcc2',
  paperLo: '#b9aa88',
  amber: '#f2a93b',
  red: '#c8352c',
  glass: '#1d3346',
};

function grad(ink: Ink, id: string, hi: string, mid: string, lo: string, vertical = true) {
  return (
    <linearGradient id={ink.k(id)} x1="0" y1="0" x2={vertical ? '0.35' : '1'} y2={vertical ? '1' : '0.25'}>
      <stop offset="0" stopColor={hi} />
      <stop offset="0.48" stopColor={mid} />
      <stop offset="1" stopColor={lo} />
    </linearGradient>
  );
}

export function Defs({ ink }: { ink: Ink }) {
  return (
    <defs>
      {grad(ink, 'steel', C.steelHi, C.steel, C.steelLo)}
      {grad(ink, 'olive', C.oliveHi, C.olive, C.oliveLo)}
      {grad(ink, 'sand', C.sandHi, C.sand, C.sandLo)}
      {grad(ink, 'fleet', C.fleetHi, C.fleet, C.fleetLo)}
      {grad(ink, 'dark', '#3a4550', '#1a2129', '#07090c')}
      {grad(ink, 'paper', '#f3ead6', C.paper, C.paperLo)}
      {grad(ink, 'wood', '#8a7556', '#5f4e37', '#33291c')}
      <linearGradient id={ink.k('glass')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8fb3cf" />
        <stop offset="0.35" stopColor="#2c4a63" />
        <stop offset="1" stopColor="#0c1823" />
      </linearGradient>
      <radialGradient id={ink.k('tire')} cx="0.38" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#3b434c" />
        <stop offset="0.7" stopColor="#14191e" />
        <stop offset="1" stopColor="#050607" />
      </radialGradient>
      <radialGradient id={ink.k('hub')} cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#c4ccd4" />
        <stop offset="0.6" stopColor="#6b7681" />
        <stop offset="1" stopColor="#2b3138" />
      </radialGradient>
      {/* Cilindros (canos, tubos, tambores): brilho no terço de cima. */}
      <linearGradient id={ink.k('tube')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a434c" />
        <stop offset="0.22" stopColor="#c3ccd5" />
        <stop offset="0.42" stopColor="#68737e" />
        <stop offset="1" stopColor="#151a1f" />
      </linearGradient>
      <linearGradient id={ink.k('tubeV')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2a3138" />
        <stop offset="0.25" stopColor="#b7c1cb" />
        <stop offset="0.45" stopColor="#5f6a75" />
        <stop offset="1" stopColor="#11151a" />
      </linearGradient>
      {/* Contraluz das pessoas: borda clara à esquerda/cima. */}
      <linearGradient id={ink.k('rim')} x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stopColor="#ffe2b0" stopOpacity="0.95" />
        <stop offset="0.22" stopColor="#ffe2b0" stopOpacity="0.15" />
        <stop offset="0.5" stopColor="#ffe2b0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={ink.k('body')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2a2f36" />
        <stop offset="0.35" stopColor="#12161b" />
        <stop offset="1" stopColor="#07090b" />
      </linearGradient>
      <radialGradient id={ink.k('vig')} cx="0.5" cy="0.48" r="0.72">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.62" />
      </radialGradient>
      <radialGradient id={ink.k('shadow')} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000" stopOpacity="0.72" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      {ink.lg && (
        <>
          <filter id={ink.k('grain')} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.55 0" />
          </filter>
          <filter id={ink.k('far')}>
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </>
      )}
    </defs>
  );
}

/** Fundo de "foto de arquivo": céu ou parede neutros, chão com perspectiva leve, luz de cima-esquerda. */
export function Backdrop({ ink, kind }: { ink: Ink; kind: Backdrop }) {
  const far = ink.lg ? ink.u('far') : undefined;
  if (kind === 'sky')
    return (
      <g>
        <linearGradient id={ink.k('skyG')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#6f8396" />
          <stop offset="0.6" stopColor="#a9b6c2" />
          <stop offset="1" stopColor="#c9d1d8" />
        </linearGradient>
        <rect width={VW} height={VH} fill={ink.u('skyG')} />
        <g fill="#e6ebf0" opacity="0.5" filter={far}>
          <ellipse cx="90" cy="250" rx="150" ry="26" />
          <ellipse cx="400" cy="282" rx="190" ry="30" />
          <ellipse cx="330" cy="70" rx="90" ry="12" opacity="0.6" />
        </g>
      </g>
    );
  if (kind === 'night')
    return (
      <g>
        <linearGradient id={ink.k('nightG')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1520" />
          <stop offset="0.7" stopColor="#2b3a4a" />
          <stop offset="1" stopColor="#8a6a45" />
        </linearGradient>
        <rect width={VW} height={VH} fill={ink.u('nightG')} />
        <rect y={GROUND} width={VW} height={VH - GROUND} fill="#14100c" />
      </g>
    );
  if (kind === 'desk')
    return (
      <g>
        <rect width={VW} height={VH} fill={ink.u('wood')} />
        <g stroke="#2b2217" strokeWidth="1.2" opacity="0.35" filter={far}>
          {[30, 74, 121, 170, 214, 262, 300].map((y) => (
            <path key={y} d={`M0 ${y} C120 ${y - 6} 300 ${y + 8} ${VW} ${y - 3}`} fill="none" />
          ))}
        </g>
        <ellipse cx="150" cy="70" rx="260" ry="150" fill="#ffe7b8" opacity="0.16" />
      </g>
    );
  if (kind === 'studio')
    return (
      <g>
        <radialGradient id={ink.k('stG')} cx="0.32" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#d9dfe5" />
          <stop offset="0.45" stopColor="#7d8893" />
          <stop offset="1" stopColor="#1d2329" />
        </radialGradient>
        <rect width={VW} height={VH} fill={ink.u('stG')} />
        <rect y={GROUND + 8} width={VW} height={VH} fill="#1a1f24" opacity="0.55" />
      </g>
    );
  // Pátio: muro de concreto ao fundo (desfocado) e piso de concreto.
  return (
    <g>
      <linearGradient id={ink.k('yardSky')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8796a4" />
        <stop offset="1" stopColor="#c3cad1" />
      </linearGradient>
      <rect width={VW} height={VH} fill={ink.u('yardSky')} />
      <g filter={far}>
        <rect y="150" width={VW} height="70" fill="#6e7781" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={i * 56} y="150" width="2" height="70" fill="#4d555d" />
        ))}
        <rect y="140" width={VW} height="12" fill="#5a636c" />
        <rect x="300" y="96" width="120" height="56" fill="#59626b" />
      </g>
      <linearGradient id={ink.k('floor')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7c858d" />
        <stop offset="1" stopColor="#3c434a" />
      </linearGradient>
      <rect y="218" width={VW} height={VH - 218} fill={ink.u('floor')} />
      <path d={`M0 246 L${VW} 238`} stroke="#2e353b" strokeWidth="1.5" opacity="0.5" />
    </g>
  );
}

/** Grão, vinheta e moldura de dossiê (fina, com cantos de fita). */
export function Finish({ ink }: { ink: Ink }) {
  return (
    <g pointerEvents="none">
      <rect width={VW} height={VH} fill="#1f3550" opacity="0.1" style={{ mixBlendMode: 'multiply' }} />
      {ink.lg && <rect width={VW} height={VH} filter={ink.u('grain')} opacity="0.35" style={{ mixBlendMode: 'overlay' }} />}
      <rect width={VW} height={VH} fill={ink.u('vig')} />
      <rect x="3" y="3" width={VW - 6} height={VH - 6} fill="none" stroke="#e8dcc2" strokeOpacity="0.55" strokeWidth="2" />
      {ink.lg && (
        <g fill="#e8dcc2" opacity="0.5">
          <rect x="-8" y="10" width="44" height="13" transform="rotate(-38 14 16)" />
          <rect x="444" y="296" width="44" height="13" transform="rotate(-38 466 302)" />
        </g>
      )}
    </g>
  );
}

/** Sombra de contato (oclusão) sob um objeto apoiado no chão. */
export const Shadow = ({ ink, cx, cy = GROUND + 2, rx, ry = 9 }: { ink: Ink; cx: number; cy?: number; rx: number; ry?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={ink.u('shadow')} />
);

/** Roda com pneu, aro e reflexo. */
export function Wheel({ ink, cx, cy, r }: { ink: Ink; cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={ink.u('tire')} />
      <circle cx={cx} cy={cy} r={r * 0.56} fill={ink.u('hub')} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#20262c" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={cx + Math.cos((a * Math.PI) / 180) * r * 0.36} cy={cy + Math.sin((a * Math.PI) / 180) * r * 0.36} r={r * 0.05} fill="#1a1f24" />
      ))}
      <path d={`M${cx - r * 0.82} ${cy - r * 0.3} A${r * 0.88} ${r * 0.88} 0 0 1 ${cx - r * 0.2} ${cy - r * 0.86}`} stroke="#fff" strokeOpacity="0.25" strokeWidth={r * 0.08} fill="none" />
    </g>
  );
}

/** Lagarta com rodas de apoio, roda motriz e guia; `skirt` cobre a parte de cima (saias laterais). */
export function Track({ ink, x, y, w, h, n, skirt }: { ink: Ink; x: number; y: number; w: number; h: number; n: number; skirt?: ReactNode }) {
  const r = h * 0.36;
  const wheels = Array.from({ length: n }, (_, i) => x + h * 0.55 + (i * (w - h * 1.1)) / (n - 1));
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="#0d1115" />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={(h - 6) / 2} fill="none" stroke="#3a434c" strokeWidth="2" strokeDasharray="3 4" />
      {wheels.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={y + h * 0.56} r={r} fill={ink.u('hub')} />
          <circle cx={cx} cy={y + h * 0.56} r={r * 0.32} fill="#1b2025" />
        </g>
      ))}
      {skirt}
    </g>
  );
}

/** Brilho especular: linha clara fina num contorno de cima. */
export const Shine = ({ d, w = 1.6, o = 0.45 }: { d: string; w?: number; o?: number }) => (
  <path d={d} stroke="#fff" strokeOpacity={o} strokeWidth={w} fill="none" strokeLinecap="round" />
);

/** Cano/tubo horizontal com brilho cilíndrico. */
export const Barrel = ({ ink, x, y, len, r, angle = 0 }: { ink: Ink; x: number; y: number; len: number; r: number; angle?: number }) => (
  <g transform={`rotate(${angle} ${x} ${y})`}>
    <rect x={x} y={y - r} width={len} height={r * 2} rx={r * 0.4} fill={ink.u('tube')} />
    <rect x={x + len - r * 1.2} y={y - r * 1.25} width={r * 1.2} height={r * 2.5} rx={r * 0.3} fill={ink.u('tube')} />
  </g>
);
