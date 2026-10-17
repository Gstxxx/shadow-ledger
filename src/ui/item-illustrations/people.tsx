// Pessoal: figura de corpo inteiro em 3/4 (peso na perna da frente), 8 cabeças de altura, iluminada por trás.
// O corpo é montado com segmentos afinados (coxa, canela, braço, antebraço) e peças de roupa com volume; a luz de
// contorno vem de uma cópia da silhueta deslocada para cima-esquerda, na cor do cenário (âmbar ou fria).
// Rosto em meia-luz: crânio, queixo, nariz e cabelo com volume, sem olhos (realista sem virar retrato).
import type { ReactNode } from 'react';
import { GROUND as G, type Ink } from './kit';

type P = [number, number];

/** Segmento afinado com pontas arredondadas (aproximação cúbica de semicírculo). */
function seg(a: P, b: P, wa: number, wb: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy;
  const ny = ux;
  const ra = wa / 2;
  const rb = wb / 2;
  const k = 1.33;
  const A1: P = [a[0] + nx * ra, a[1] + ny * ra];
  const A2: P = [a[0] - nx * ra, a[1] - ny * ra];
  const B1: P = [b[0] + nx * rb, b[1] + ny * rb];
  const B2: P = [b[0] - nx * rb, b[1] - ny * rb];
  const f = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return (
    `M${f(A1)} L${f(B1)} C${f([B1[0] + ux * rb * k, B1[1] + uy * rb * k])} ${f([B2[0] + ux * rb * k, B2[1] + uy * rb * k])} ${f(B2)} ` +
    `L${f(A2)} C${f([A2[0] - ux * ra * k, A2[1] - uy * ra * k])} ${f([A1[0] - ux * ra * k, A1[1] - uy * ra * k])} ${f(A1)} Z`
  );
}

/** Clareia (f>1) ou escurece (f<1) uma cor hex. */
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ── Esqueleto base (3/4, olhando para a direita; lado da frente = esquerda da tela) ─────────────
const J = {
  head: [238, 37] as P,
  neckA: [238, 50] as P,
  neckB: [240, 64] as P,
  sF: [214, 72] as P,
  sB: [263, 74] as P,
  hF: [224, 141] as P,
  hB: [256, 146] as P,
  kF: [225, 201] as P,
  aF: [227, 256] as P,
  toeF: [246, 266] as P,
  kB: [263, 200] as P,
  aB: [270, 254] as P,
  toeB: [290, 263] as P,
};

type Scene = 'street' | 'corridor' | 'field' | 'office' | 'palace';
type ArmPose = 'down' | 'watch' | 'lowready' | 'pocket' | 'glass' | 'case' | 'folder' | 'pistol';
type Outfit = 'suit' | 'leather' | 'uniform' | 'tactical' | 'camo' | 'commando' | 'trench' | 'skirtsuit' | 'gown' | 'tux';
type HeadKind = 'crop' | 'helmet' | 'nvg' | 'cap' | 'balaclava' | 'hat' | 'bun' | 'long' | 'bald' | 'slick';

export interface Figure {
  scene: Scene;
  outfit: Outfit;
  head: HeadKind;
  arms: ArmPose;
  /** feminina: ombros mais estreitos, cintura marcada, quadril mais largo. */
  fem?: boolean;
  /** detalhes: ponto no ouvido, óculos táticos, gravata, mochila. */
  earpiece?: boolean;
  goggles?: boolean;
  tie?: string;
  pack?: boolean;
  /** cores das peças (tecido). */
  top: string;
  bottom?: string;
}

interface Part {
  d: string;
  fill: string;
  /** dobras e costuras por cima da peça. */
  detail?: ReactNode;
}

// ── Peças ──────────────────────────────────────────────────────────────
function arms(pose: ArmPose, fem: boolean, sleeve: number) {
  const sF: P = fem ? [218, 74] : J.sF;
  const sB: P = fem ? [259, 76] : J.sB;
  // [cotovelo, punho, ponta da mão] de cada braço, por pose.
  const poses: Record<ArmPose, { f: [P, P, P]; b: [P, P, P] }> = {
    down: { f: [[206, 112], [205, 150], [204, 164]], b: [[271, 114], [274, 150], [276, 163]] },
    watch: { f: [[206, 112], [222, 132], [238, 130]], b: [[270, 112], [250, 132], [236, 132]] },
    lowready: { f: [[204, 108], [226, 134], [240, 138]], b: [[268, 110], [256, 140], [262, 150]] },
    pocket: { f: [[205, 112], [214, 140], [220, 146]], b: [[272, 114], [275, 150], [277, 163]] },
    glass: { f: [[206, 112], [205, 150], [204, 164]], b: [[276, 106], [262, 82], [258, 74]] },
    case: { f: [[206, 112], [205, 150], [204, 164]], b: [[272, 114], [276, 150], [277, 164]] },
    folder: { f: [[208, 108], [228, 110], [244, 104]], b: [[271, 114], [274, 150], [276, 163]] },
    pistol: { f: [[205, 112], [208, 150], [212, 164]], b: [[271, 114], [274, 150], [276, 163]] },
  };
  const p = poses[pose];
  const up = sleeve;
  const lo = sleeve * 0.78;
  return {
    back: [
      seg(sB, p.b[0], up, up * 0.86),
      seg(p.b[0], p.b[1], lo, lo * 0.82),
    ],
    backHand: seg(p.b[1], p.b[2], 9, 7.5),
    front: [
      seg(sF, p.f[0], up, up * 0.86),
      seg(p.f[0], p.f[1], lo, lo * 0.82),
    ],
    frontHand: seg(p.f[1], p.f[2], 9.5, 8),
    pts: p,
  };
}

function legs(thigh: number, calf: number) {
  return {
    back: [seg(J.hB, J.kB, thigh, calf + 2), seg(J.kB, J.aB, calf + 2, calf * 0.72)],
    front: [seg(J.hF, J.kF, thigh, calf + 2), seg(J.kF, J.aF, calf + 2, calf * 0.72)],
  };
}

const shoe = (heel = false): [string, string] =>
  heel
    ? [seg(J.aB, [J.toeB[0] - 4, J.toeB[1] - 2], 7, 5), seg(J.aF, [J.toeF[0] - 4, J.toeF[1] - 1], 7, 5)]
    : [seg([J.aB[0] - 2, J.aB[1] + 4], J.toeB, 13, 10), seg([J.aF[0] - 2, J.aF[1] + 4], J.toeF, 13, 10)];

/** Tronco: ombros → cintura → quadril, com o lado da frente mais largo (3/4). */
function torso(fem: boolean, bulk = 0, hem = 150) {
  const b = bulk;
  return fem
    ? `M${214 - b} 74 Q240 64 ${263 + b} 76 Q${270 + b} 92 ${264 + b} 110 Q${258 + b} 122 ${266 + b} ${hem} L${218 - b} ${hem} Q${226 - b} 122 ${218 - b} 108 Q${208 - b} 90 ${214 - b} 74 Z`
    : `M${206 - b} 72 Q240 60 ${270 + b} 74 Q${276 + b} 96 ${270 + b} 118 L${266 + b} ${hem} L${218 - b} ${hem} Q${212 - b} 120 ${208 - b} 104 Q${200 - b} 88 ${206 - b} 72 Z`;
}

function headParts(kind: HeadKind, fem: boolean, skin: string, hair: string): Part[] {
  const [hx, hy] = J.head;
  // crânio em 3/4 + mandíbula + nariz (lado da luz) + orelha
  const skull = `M${hx - 11} ${hy + 2} Q${hx - 13} ${hy - 15} ${hx + 1} ${hy - 16} Q${hx + 13} ${hy - 15} ${hx + 12} ${hy - 2} L${hx + 13} ${hy + 2} L${hx + 16} ${hy + 6} L${hx + 12} ${hy + 8} Q${hx + 12} ${hy + 13} ${hx + 6} ${hy + 15} Q${hx - 2} ${hy + 16} ${hx - 7} ${hy + 10} Q${hx - 11} ${hy + 7} ${hx - 11} ${hy + 2} Z`;
  const ear = `M${hx - 5} ${hy - 1} q-5 1 -4 7 q1 4 5 3 Z`;
  const out: Part[] = [{ d: skull, fill: skin }, { d: ear, fill: shade(skin, 0.8) }];
  const capOver = (d: string, fill: string, detail?: ReactNode) => out.push({ d, fill, detail });
  switch (kind) {
    case 'crop':
      capOver(`M${hx - 12} ${hy - 1} Q${hx - 14} ${hy - 17} ${hx + 1} ${hy - 17} Q${hx + 12} ${hy - 16} ${hx + 12} ${hy - 7} Q${hx + 2} ${hy - 11} ${hx - 6} ${hy - 6} Q${hx - 9} ${hy - 2} ${hx - 12} ${hy - 1} Z`, hair);
      break;
    case 'slick':
      capOver(`M${hx - 12} ${hy + 1} Q${hx - 15} ${hy - 18} ${hx + 2} ${hy - 18} Q${hx + 13} ${hy - 17} ${hx + 13} ${hy - 9} Q${hx} ${hy - 14} ${hx - 8} ${hy - 4} Z`, hair, <path d={`M${hx - 8} ${hy - 12} Q${hx + 2} ${hy - 16} ${hx + 10} ${hy - 12}`} stroke="#fff" strokeOpacity="0.25" strokeWidth="1.2" fill="none" />);
      break;
    case 'bald':
      capOver(`M${hx - 12} ${hy + 2} Q${hx - 13} ${hy - 6} ${hx - 9} ${hy - 9} L${hx - 6} ${hy - 4} Q${hx - 9} ${hy - 1} ${hx - 9} ${hy + 3} Z`, hair);
      break;
    case 'helmet':
    case 'nvg':
      capOver(`M${hx - 15} ${hy - 1} Q${hx - 16} ${hy - 21} ${hx + 1} ${hy - 21} Q${hx + 16} ${hy - 20} ${hx + 15} ${hy - 4} L${hx + 15} ${hy} L${hx - 15} ${hy + 2} Z`, '#3b4232', <path d={`M${hx - 12} ${hy - 12} Q${hx} ${hy - 19} ${hx + 11} ${hy - 13}`} stroke="#fff" strokeOpacity="0.22" strokeWidth="1.4" fill="none" />);
      if (kind === 'nvg') capOver(`M${hx + 8} ${hy - 18} l12 2 l0 12 l-10 1 Z`, '#1c2024', <circle cx={hx + 18} cy={hy - 9} r="2.4" fill="#5fd1a0" opacity="0.8" />);
      break;
    case 'balaclava':
      capOver(`M${hx - 12} ${hy + 4} Q${hx - 14} ${hy - 17} ${hx + 1} ${hy - 17} Q${hx + 13} ${hy - 16} ${hx + 13} ${hy - 2} L${hx + 15} ${hy + 6} L${hx + 11} ${hy + 9} Q${hx + 11} ${hy + 14} ${hx + 5} ${hy + 16} Q${hx - 4} ${hy + 17} ${hx - 9} ${hy + 11} Z`, '#15181b');
      break;
    case 'cap':
      capOver(`M${hx - 12} ${hy - 4} Q${hx - 12} ${hy - 19} ${hx + 1} ${hy - 19} Q${hx + 13} ${hy - 18} ${hx + 12} ${hy - 6} Z`, '#1d2433');
      capOver(`M${hx + 4} ${hy - 7} L${hx + 22} ${hy - 4} L${hx + 21} ${hy - 1} L${hx + 4} ${hy - 3} Z`, '#11151d');
      break;
    case 'hat':
      capOver(`M${hx - 11} ${hy - 7} Q${hx - 10} ${hy - 22} ${hx + 2} ${hy - 22} Q${hx + 13} ${hy - 21} ${hx + 12} ${hy - 8} Z`, '#24211d');
      capOver(`M${hx - 22} ${hy - 6} Q${hx + 2} ${hy - 13} ${hx + 26} ${hy - 6} Q${hx + 2} ${hy - 3} ${hx - 22} ${hy - 6} Z`, '#1a1815');
      break;
    case 'bun':
      capOver(`M${hx - 12} ${hy + 1} Q${hx - 14} ${hy - 17} ${hx + 1} ${hy - 17} Q${hx + 12} ${hy - 16} ${hx + 12} ${hy - 6} Q${hx + 2} ${hy - 12} ${hx - 6} ${hy - 6} Z`, hair);
      capOver(`M${hx - 14} ${hy - 10} a8 7 0 1 1 6 -10 a6 6 0 0 1 -6 10 Z`, hair);
      break;
    case 'long':
      capOver(`M${hx - 13} ${hy + 22} Q${hx - 17} ${hy - 18} ${hx + 1} ${hy - 18} Q${hx + 14} ${hy - 17} ${hx + 12} ${hy - 4} Q${hx + 2} ${hy - 12} ${hx - 6} ${hy - 4} Q${hx - 6} ${hy + 12} ${hx - 2} ${hy + 26} Q${hx - 9} ${hy + 30} ${hx - 13} ${hy + 22} Z`, hair, <path d={`M${hx - 10} ${hy - 10} Q${hx - 12} ${hy + 6} ${hx - 9} ${hy + 22}`} stroke="#fff" strokeOpacity="0.2" strokeWidth="1.3" fill="none" />);
      break;
  }
  if (fem) out[0] = { d: skull.replace(/16\)/g, '15)'), fill: skin };
  return out;
}

// ── Montagem ───────────────────────────────────────────────────────────
function build(fig: Figure): { parts: Part[]; props: ReactNode; over: ReactNode } {
  const fem = !!fig.fem;
  const top = fig.top;
  const bottom = fig.bottom ?? top;
  const skin = '#4e3d32';
  const hair = '#1b1612';
  const heavy = fig.outfit === 'tactical' || fig.outfit === 'commando' || fig.outfit === 'camo';
  const sleeve = heavy ? 19 : fig.outfit === 'trench' ? 19 : fem ? 13 : 16;
  const A = arms(fig.arms, fem, sleeve);
  const Lg = legs(fem ? 18 : heavy ? 26 : 24, fem ? 11 : heavy ? 17 : 15);
  const [shoeB, shoeF] = shoe(fem && fig.outfit !== 'gown');
  const parts: Part[] = [];
  const fold = (d: string, o = 0.35) => <path d={d} stroke="#000" strokeOpacity={o} strokeWidth="1.4" fill="none" strokeLinecap="round" />;
  const hiFold = (d: string, o = 0.18) => <path d={d} stroke="#fff" strokeOpacity={o} strokeWidth="1.2" fill="none" strokeLinecap="round" />;

  // fundo: mochila
  if (fig.pack) parts.push({ d: 'M256 78 Q290 80 290 104 L288 142 Q276 150 258 144 Z', fill: '#2f3526', detail: fold('M262 100 L286 102') });
  // braço e perna de trás
  if (fig.outfit !== 'gown') {
    parts.push({ d: Lg.back.join(' '), fill: shade(bottom, 0.75), detail: fold(`M${J.kB[0] - 6} ${J.kB[1] - 3} q6 4 12 0`) });
    parts.push({ d: shoeB, fill: '#0e0f11' });
  }
  parts.push({ d: A.back.join(' '), fill: shade(top, 0.78) });
  parts.push({ d: A.backHand, fill: fig.outfit === 'commando' || fig.outfit === 'tactical' ? '#1c1f22' : shade(skin, 0.85) });
  // perna da frente
  if (fig.outfit === 'gown') {
    parts.push({
      d: 'M220 112 Q214 150 206 196 Q198 240 190 268 L296 268 Q286 230 276 196 Q266 150 260 112 Z',
      fill: top,
      detail: (
        <>
          {hiFold('M224 140 Q216 200 208 264', 0.25)}
          {fold('M244 140 Q246 200 250 266', 0.4)}
          {hiFold('M234 150 Q232 210 230 266', 0.14)}
        </>
      ),
    });
  } else if (fig.outfit === 'skirtsuit') {
    parts.push({ d: Lg.front.join(' '), fill: '#3a3230' });
    parts.push({ d: shoeF, fill: '#0e0f11' });
    parts.push({ d: 'M216 140 L264 144 L262 196 L222 196 Z', fill: bottom, detail: fold('M238 150 L236 194') });
  } else {
    parts.push({
      d: Lg.front.join(' '),
      fill: bottom,
      detail: (
        <>
          {fold(`M${J.kF[0] - 7} ${J.kF[1] - 4} q7 5 14 0`)}
          {hiFold(`M${J.hF[0] - 10} ${J.hF[1] + 8} L${J.kF[0] - 8} ${J.kF[1] - 6}`)}
          {fig.outfit === 'tactical' || fig.outfit === 'commando' ? <rect x={J.kF[0] - 9} y={J.kF[1] - 7} width="18" height="14" rx="5" fill="#16191c" /> : null}
        </>
      ),
    });
    parts.push({ d: shoeF, fill: heavy ? '#17140f' : '#0e0f11', detail: hiFold(`M${J.aF[0] + 2} ${J.aF[1] + 6} L${J.toeF[0] - 4} ${J.toeF[1] - 3}`, 0.3) });
  }
  // pescoço
  parts.push({ d: seg(J.neckA, J.neckB, 13, 15), fill: shade(skin, 0.8) });
  // tronco e roupa principal
  const tie = fig.tie ? <path d="M240 72 L244 76 L242 112 L238 116 L235 112 L236 76 Z" fill={fig.tie} /> : null;
  const lapels = (
    <>
      <path d="M228 70 L238 98 L232 76 Z M252 72 L244 98 L250 77 Z" fill="#000" opacity="0.35" />
      <path d="M232 70 L240 72 L248 72 L241 104 Z" fill="#d9dde2" opacity="0.85" />
      {tie}
    </>
  );
  switch (fig.outfit) {
    case 'suit':
    case 'tux':
      parts.push({
        d: torso(false, 0, 158),
        fill: top,
        detail: (
          <>
            {lapels}
            {fig.outfit === 'tux' && <path d="M232 73 L240 77 L248 73 L248 80 L240 77 L232 80 Z" fill="#0b0c0e" />}
            <circle cx="241" cy="124" r="1.8" fill="#000" opacity="0.6" />
            {fold('M216 104 Q222 120 220 150', 0.3)}
            {hiFold('M210 80 Q206 100 214 128')}
            {fold('M236 140 L262 142', 0.25)}
          </>
        ),
      });
      break;
    case 'skirtsuit':
      parts.push({ d: torso(true, 0, 146), fill: top, detail: <>{lapels}{hiFold('M218 82 Q212 100 220 126')}</> });
      break;
    case 'gown':
      parts.push({ d: 'M218 76 Q240 70 260 77 Q266 92 260 112 L220 112 Q214 92 218 76 Z', fill: top, detail: hiFold('M222 82 Q218 96 222 110', 0.3) });
      break;
    case 'leather':
      parts.push({
        d: torso(false, 3, 146),
        fill: top,
        detail: (
          <>
            <path d="M226 70 L236 80 L230 90 Z M254 72 L246 82 L252 92 Z" fill="#000" opacity="0.4" />
            {fold('M240 80 L242 146', 0.5)}
            {hiFold('M210 84 Q204 104 214 130', 0.32)}
            {hiFold('M262 90 Q266 104 262 118', 0.15)}
            <rect x="214" y="138" width="54" height="8" fill="#000" opacity="0.3" />
          </>
        ),
      });
      break;
    case 'uniform':
      parts.push({
        d: torso(false, 0, 150),
        fill: top,
        detail: (
          <>
            <path d="M212 82 Q240 76 268 84 L268 132 L214 132 Z" fill="#141a22" />
            {fold('M240 84 L240 130', 0.5)}
            <rect x="222" y="94" width="12" height="9" rx="2" fill="#0b0f15" />
            <rect x="248" y="94" width="12" height="9" rx="2" fill="#0b0f15" />
            <rect x="212" y="140" width="58" height="9" fill="#0b0c0e" />
            <rect x="262" y="142" width="12" height="18" rx="2" fill="#0b0c0e" />
            {hiFold('M214 84 L216 128', 0.22)}
          </>
        ),
      });
      break;
    case 'tactical':
    case 'commando':
    case 'camo':
      parts.push({ d: torso(false, 4, 150), fill: top });
      parts.push({
        d: 'M210 80 Q240 72 270 82 L272 136 Q240 142 208 136 Z',
        fill: fig.outfit === 'camo' ? '#3c4330' : '#262b26',
        detail: (
          <>
            {[214, 232, 250].map((x) => (
              <g key={x}>
                <rect x={x} y="112" width="16" height="22" rx="2" fill="#000" opacity="0.32" />
                <rect x={x} y="112" width="16" height="5" fill="#fff" opacity="0.08" />
              </g>
            ))}
            <path d="M218 80 L222 72 M262 82 L258 74" stroke="#000" strokeOpacity="0.5" strokeWidth="5" />
            {hiFold('M212 86 L210 132', 0.25)}
            {fig.outfit === 'commando' && <rect x="246" y="88" width="20" height="10" rx="2" fill="#0d0f10" />}
            <rect x="210" y="142" width="62" height="9" fill="#15181a" />
          </>
        ),
      });
      break;
    case 'trench':
      parts.push({
        d: 'M204 72 Q240 60 272 74 Q280 100 274 128 L290 226 Q240 234 190 226 L210 130 Q198 104 204 72 Z',
        fill: top,
        detail: (
          <>
            <path d="M224 66 L236 92 L230 70 Z M256 68 L246 92 L252 72 Z" fill="#000" opacity="0.4" />
            <rect x="206" y="124" width="70" height="9" fill="#000" opacity="0.32" />
            {fold('M240 134 L238 226', 0.45)}
            {fold('M214 150 Q206 190 200 224', 0.3)}
            {hiFold('M210 84 Q204 108 212 126', 0.3)}
            {hiFold('M218 140 Q212 180 206 220', 0.16)}
          </>
        ),
      });
      break;
  }
  // camuflagem: manchas sobre roupa e calça
  const camo =
    fig.outfit === 'camo' ? (
      <g opacity="0.55">
        {[[220, 160, 9], [232, 188, 7], [258, 170, 8], [266, 214, 6], [228, 224, 7], [212, 98, 6], [262, 96, 7], [236, 120, 5]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r * 1.4} ry={r} fill={i % 2 ? '#2a2f20' : '#5a5f40'} transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
      </g>
    ) : null;
  // braço da frente por cima
  parts.push({
    d: A.front.join(' '),
    fill: shade(top, 1.05),
    detail: (
      <>
        {fold(`M${A.pts.f[0][0] - 5} ${A.pts.f[0][1] - 2} q5 4 11 1`)}
        {hiFold(`M${J.sF[0] - 6} ${J.sF[1] + 6} L${A.pts.f[0][0] - 6} ${A.pts.f[0][1] - 4}`, 0.25)}
      </>
    ),
  });
  parts.push({ d: A.frontHand, fill: heavy ? '#1c1f22' : skin });
  parts.push(...headParts(fig.head, fem, skin, hair));
  if (fig.goggles) parts.push({ d: 'M243 31 L256 32 L256 38 L243 37 Z', fill: '#0a0d10', detail: <path d="M246 33 L252 33" stroke="#9fd0ff" strokeOpacity="0.7" strokeWidth="1.2" /> });

  // objetos na mão
  let props: ReactNode = null;
  const [fe, fw, fh] = A.pts.f;
  const [, bw, bh] = A.pts.b;
  void fe;
  if (fig.arms === 'lowready') {
    // fuzil apontado para baixo e à frente, segurado pelas duas mãos
    props = (
      <g transform={`rotate(32 ${fw[0]} ${fw[1]})`}>
        <path d={`M${fw[0] - 40} ${fw[1] - 6} L${fw[0] - 6} ${fw[1] - 8} L${fw[0] + 40} ${fw[1] - 8} L${fw[0] + 84} ${fw[1] - 6} L${fw[0] + 84} ${fw[1] - 2} L${fw[0] + 40} ${fw[1]} L${fw[0] + 6} ${fw[1] + 2} L${fw[0]} ${fw[1] + 14} L${fw[0] - 8} ${fw[1] + 14} L${fw[0] - 12} ${fw[1] + 2} L${fw[0] - 40} ${fw[1] + 4} Z`} fill="#0d0f11" />
        <rect x={fw[0] + 10} y={fw[1] - 2} width="10" height="16" rx="2" fill="#0d0f11" transform={`rotate(10 ${fw[0] + 15} ${fw[1] + 6})`} />
        <rect x={fw[0] + 2} y={fw[1] - 16} width="22" height="7" rx="2" fill="#16191c" />
        <path d={`M${fw[0] - 30} ${fw[1] - 8} L${fw[0] + 80} ${fw[1] - 8}`} stroke="#c9d3dc" strokeOpacity="0.35" strokeWidth="1.2" />
        {fig.outfit === 'commando' && <rect x={fw[0] + 84} y={fw[1] - 9} width="26" height="10" rx="4" fill="#0d0f11" />}
      </g>
    );
  } else if (fig.arms === 'pistol') {
    props = <path d={`M${fh[0] - 3} ${fh[1] - 4} L${fh[0] + 4} ${fh[1] - 4} L${fh[0] + 6} ${fh[1] + 18} L${fh[0] + 1} ${fh[1] + 18} L${fh[0]} ${fh[1] + 6} L${fh[0] - 6} ${fh[1] + 4} Z`} fill="#0b0c0e" stroke="#c9d3dc" strokeOpacity="0.35" strokeWidth="0.8" />;
  } else if (fig.arms === 'case') {
    props = (
      <g>
        <rect x={bh[0] - 14} y={bh[1] + 2} width="40" height="30" rx="3" fill="#2a1f17" />
        <rect x={bh[0] - 14} y={bh[1] + 2} width="40" height="5" fill="#fff" opacity="0.12" />
        <path d={`M${bh[0] - 2} ${bh[1] + 2} L${bh[0] - 2} ${bh[1] - 4} L${bh[0] + 14} ${bh[1] - 4} L${bh[0] + 14} ${bh[1] + 2}`} stroke="#1a130d" strokeWidth="3" fill="none" />
        <rect x={bh[0] + 2} y={bh[1] + 14} width="8" height="4" fill="#c2a46a" />
      </g>
    );
  } else if (fig.arms === 'folder') {
    props = <rect x={fw[0] - 6} y={fw[1] - 34} width="40" height="52" rx="2" fill="#b8925a" transform={`rotate(14 ${fw[0] + 14} ${fw[1] - 8})`} />;
  } else if (fig.arms === 'glass') {
    props = (
      <g>
        <path d={`M${bh[0] - 6} ${bh[1] - 22} Q${bh[0]} ${bh[1] - 6} ${bh[0] + 6} ${bh[1] - 22} Z`} fill="#f4dca8" fillOpacity="0.35" stroke="#fff2d6" strokeOpacity="0.7" strokeWidth="1" />
        <path d={`M${bh[0]} ${bh[1] - 12} L${bh[0]} ${bh[1] + 2} M${bh[0] - 5} ${bh[1] + 2} L${bh[0] + 5} ${bh[1] + 2}`} stroke="#fff2d6" strokeOpacity="0.7" strokeWidth="1" />
        <path d={`M${bh[0] - 5} ${bh[1] - 16} Q${bh[0]} ${bh[1] - 9} ${bh[0] + 5} ${bh[1] - 16} Z`} fill="#9a2a2a" opacity="0.7" />
      </g>
    );
  } else if (fig.outfit === 'gown') {
    props = <rect x={fh[0] - 10} y={fh[1] - 6} width="24" height="12" rx="3" fill="#b89a5a" />;
  }
  void bw;
  const over = (
    <>
      {camo}
      {fig.earpiece && <path d="M233 40 Q228 56 236 70" stroke="#d6dde4" strokeOpacity="0.85" strokeWidth="1.1" fill="none" />}
    </>
  );
  return { parts, props, over };
}

// ── Cenários ───────────────────────────────────────────────────────────
const RIM: Record<Scene, string> = { street: '#ffc879', corridor: '#bfe0ff', field: '#ffb466', office: '#ffe2ae', palace: '#ffd38a' };

function SceneBg({ ink, scene }: { ink: Ink; scene: Scene }) {
  const far = ink.lg ? ink.u('far') : undefined;
  const glow = (id: string, c: string, o = 0.6) => (
    <radialGradient id={ink.k(id)}>
      <stop offset="0" stopColor={c} stopOpacity={o} />
      <stop offset="1" stopColor={c} stopOpacity="0" />
    </radialGradient>
  );
  const defs = (
    <>
      {glow('gA', '#ffc879')}
      {glow('gC', '#cfe8ff', 0.7)}
      {glow('gW', '#ffd38a', 0.55)}
    </>
  );
  switch (scene) {
    case 'street':
      return (
        <g>
          {defs}
          <rect width="480" height="320" fill="#0c121a" />
          <g filter={far}>
            <rect x="0" y="40" width="120" height="200" fill="#121a24" />
            <rect x="360" y="20" width="120" height="220" fill="#101820" />
            {[[30, 80], [70, 120], [400, 60], [430, 140], [390, 180]].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width="16" height="22" fill="#f2a93b" opacity="0.35" />
            ))}
            <circle cx="300" cy="70" r="90" fill={ink.u('gA')} />
            <circle cx="300" cy="70" r="12" fill="#ffe6b8" />
            <rect x="296" y="76" width="7" height="190" fill="#05080b" />
          </g>
          <rect y="240" width="480" height="80" fill="#0a0f14" />
          <ellipse cx="300" cy="282" rx="90" ry="20" fill={ink.u('gA')} />
          <path d="M0 252 L480 246" stroke="#ffc879" strokeOpacity="0.15" />
        </g>
      );
    case 'corridor':
      return (
        <g>
          {defs}
          <rect width="480" height="320" fill="#1a2027" />
          <polygon points="0,0 200,110 200,190 0,320" fill="#11161b" />
          <polygon points="480,0 280,110 280,190 480,320" fill="#141a20" />
          <polygon points="0,320 200,190 280,190 480,320" fill="#22292f" />
          <rect x="200" y="110" width="80" height="80" fill="#dff1ff" filter={far} />
          <rect x="200" y="110" width="80" height="80" fill="#bfe0ff" opacity="0.6" />
          {/* luminárias no teto, em perspectiva até o fundo */}
          {[0, 1, 2, 3].map((i) => {
            const y = 100 - i * 26;
            const w = 30 + i * 46;
            return <polygon key={i} points={`${240 - w / 2},${y} ${240 + w / 2},${y} ${240 + w / 2 + 6},${y - 6 - i * 3} ${240 - w / 2 - 6},${y - 6 - i * 3}`} fill="#eef7ff" opacity={0.75 - i * 0.12} />;
          })}
          <ellipse cx="240" cy="150" rx="150" ry="120" fill={ink.u('gC')} opacity="0.5" />
        </g>
      );
    case 'field':
      return (
        <g>
          {defs}
          <linearGradient id={ink.k('dusk')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c2a36" />
            <stop offset="0.6" stopColor="#6b5a4a" />
            <stop offset="0.82" stopColor="#d08a48" />
          </linearGradient>
          <rect width="480" height="320" fill={ink.u('dusk')} />
          <g filter={far}>
            <ellipse cx="160" cy="200" rx="220" ry="46" fill={ink.u('gW')} opacity="0.5" />
            <path d="M0 236 L60 222 L120 230 L200 214 L260 226 L340 210 L420 224 L480 216 L480 250 L0 250 Z" fill="#1c1a16" />
          </g>
          <rect y="244" width="480" height="76" fill="#17140f" />
          <ellipse cx="300" cy="228" rx="160" ry="34" fill={ink.u('gA')} opacity="0.7" />
        </g>
      );
    case 'office':
      return (
        <g>
          {defs}
          <rect width="480" height="320" fill="#2a241d" />
          <g filter={far}>
            <rect x="70" y="18" width="300" height="214" fill="#f6dfae" />
            {Array.from({ length: 15 }, (_, i) => (
              <rect key={i} x="70" y={24 + i * 14} width="300" height="7" fill="#3a2f22" opacity="0.88" />
            ))}
            <rect x="216" y="18" width="8" height="214" fill="#2a241d" />
            <rect x="370" y="60" width="90" height="190" fill="#1f1a15" />
          </g>
          <rect y="232" width="480" height="88" fill="#1e1a15" />
          <polygon points="70,232 370,232 420,320 20,320" fill="#ffe2ae" opacity="0.08" />
        </g>
      );
    default:
      return (
        <g>
          {defs}
          <rect width="480" height="320" fill="#1f1912" />
          <g filter={far}>
            {[60, 150, 330, 420].map((x) => (
              <g key={x}>
                <rect x={x - 14} y="30" width="28" height="220" fill="#3a3024" />
                <rect x={x - 14} y="30" width="7" height="220" fill="#e9d4a8" opacity="0.15" />
              </g>
            ))}
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} cx={40 + ((i * 97) % 400)} cy={30 + ((i * 53) % 140)} r={10 + (i % 4) * 6} fill={ink.u('gW')} opacity={0.7 + (i % 3) * 0.15} />
            ))}
            <ellipse cx="240" cy="40" rx="90" ry="30" fill={ink.u('gW')} />
          </g>
          <rect y="240" width="480" height="80" fill="#2a2118" />
          <rect y="240" width="480" height="80" fill="#ffd38a" opacity="0.06" />
        </g>
      );
  }
}

export function Person({ ink, fig }: { ink: Ink; fig: Figure }) {
  const { parts, props, over } = build(fig);
  const rim = RIM[fig.scene];
  const silhouette = (
    <>
      {parts.map((p, i) => (
        <path key={i} d={p.d} />
      ))}
      {props}
    </>
  );
  return (
    <g>
      <SceneBg ink={ink} scene={fig.scene} />
      {/* luz de trás vazando em volta do corpo */}
      <radialGradient id={ink.k('halo')} cx="0.5" cy="0.45" r="0.5">
        <stop offset="0" stopColor={rim} stopOpacity="0.38" />
        <stop offset="1" stopColor={rim} stopOpacity="0" />
      </radialGradient>
      <ellipse cx="246" cy="140" rx="120" ry="150" fill={ink.u('halo')} />
      {/* sombra de contato e sombra projetada para a frente (luz atrás) */}
      <ellipse cx="250" cy={G + 3} rx="58" ry="7" fill="#000" opacity="0.6" />
      <path d={`M210 ${G + 2} L290 ${G + 2} L330 ${G + 40} L170 ${G + 40} Z`} fill="#000" opacity="0.28" />
      <g transform="translate(6 -4)">
        {/* contorno de luz: a silhueta inteira na cor da luz, deslocada para trás e para cima */}
        <g fill={rim} transform="translate(2.6 -1.8)" opacity="0.9">
          {silhouette}
        </g>
        <g fill={rim} transform="translate(-1.4 -1.2)" opacity="0.35">
          {silhouette}
        </g>
        {parts.map((p, i) => (
          <g key={i}>
            <path d={p.d} fill={p.fill} />
            {p.detail}
          </g>
        ))}
        {props}
        {over}
        {/* preenchimento suave, só dentro da silhueta: a frente (esquerda) recebe luz ambiente; o lado de trás afunda */}
        <clipPath id={ink.k('sil')}>{parts.map((p, i) => <path key={i} d={p.d} />)}</clipPath>
        <rect x="180" y="10" width="140" height="270" fill={ink.u('fillLight')} clipPath={ink.u('sil')} />
      </g>
      <linearGradient id={ink.k('fillLight')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
        <stop offset="0.45" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.45" />
      </linearGradient>
    </g>
  );
}

export const FIGURES: Record<string, Figure> = {
  bodyguard: { scene: 'corridor', outfit: 'suit', head: 'crop', arms: 'watch', earpiece: true, tie: '#0e1013', top: '#22262b', bottom: '#1d2024' },
  thug: { scene: 'street', outfit: 'leather', head: 'crop', arms: 'pistol', top: '#3a2a20', bottom: '#23272e' },
  police: { scene: 'street', outfit: 'uniform', head: 'cap', arms: 'down', top: '#25324a', bottom: '#1c2433' },
  swat: { scene: 'corridor', outfit: 'tactical', head: 'helmet', arms: 'lowready', goggles: true, top: '#2a2f2c', bottom: '#262a28' },
  soldier: { scene: 'field', outfit: 'camo', head: 'helmet', arms: 'lowready', pack: true, top: '#4d5440', bottom: '#4a5040' },
  commando: { scene: 'field', outfit: 'commando', head: 'nvg', arms: 'lowready', pack: true, top: '#262a24', bottom: '#23271f' },
  agent: { scene: 'street', outfit: 'trench', head: 'hat', arms: 'case', top: '#4a4236', bottom: '#2a2724' },
  lawyer1: { scene: 'office', outfit: 'suit', head: 'slick', arms: 'case', tie: '#5a1c1c', top: '#2c3036', bottom: '#262a2f' },
  lawyer2: { scene: 'office', outfit: 'skirtsuit', head: 'bun', arms: 'folder', fem: true, top: '#33363d', bottom: '#2b2e34' },
  lawyer3: { scene: 'office', outfit: 'suit', head: 'bald', arms: 'pocket', tie: '#24345a', top: '#1f2226', bottom: '#1b1d21' },
  liaison1: { scene: 'palace', outfit: 'suit', head: 'slick', arms: 'glass', tie: '#3d2a14', top: '#2e2a26', bottom: '#24211e' },
  liaison2: { scene: 'palace', outfit: 'gown', head: 'long', arms: 'down', fem: true, top: '#5a1f26' },
  liaison3: { scene: 'palace', outfit: 'tux', head: 'slick', arms: 'glass', top: '#141518', bottom: '#121315' },
};
