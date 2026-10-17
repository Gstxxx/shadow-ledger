import { useId, useMemo, type CSSProperties } from 'react';
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import './art.css';

// ══════════════════════════════════════════════════════════════════════
// AnalystPortrait — a Analista: ilustração vetorial noir, luz de monitor
// (ciano) num lado e luz quente de abajur no outro.
// ══════════════════════════════════════════════════════════════════════

export type AnalystMood = 'neutral' | 'concerned' | 'alert' | 'pleased';

export interface AnalystPortraitProps {
  mood?: AnalystMood;
  size?: number;
  /** anima a boca (quando ela está "falando" um Evento) */
  speaking?: boolean;
  /** pisca de vez em quando (desliga com reduced-motion) */
  blink?: boolean;
  /** fundo do quadro; `false` = transparente */
  background?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const SKIN = '#c08f72';
const SKIN_MID = '#93644f';
const SKIN_SH = '#5a3a31';
const HAIR = '#16110f';
const HAIR_HI = '#3a2e2a';

export interface Face {
  browL: string;
  browR: string;
  lidL: string; // linha da pálpebra superior
  lidR: string;
  lowL?: string; // pálpebra inferior (sorriso / tensão)
  lowR?: string;
  mouth: string;
  mouthFill?: string;
  irisY: number;
  led: string;
}

export const FACES: Record<AnalystMood, Face> = {
  neutral: {
    browL: 'M78.5 85.2c4.6-2.6 11-2.9 17.2-.9',
    browR: 'M105.2 84.3c6.2-2 12.4-1.7 17 .9',
    lidL: 'M80.2 96.2c4-3.6 11.4-3.8 15.6.2',
    lidR: 'M105.2 96.4c4.2-4 11.6-3.8 15.6-.2',
    mouth: 'M92.6 130.2c2.6.8 6 .9 8.6.8s4.6-.4 6.2-1',
    irisY: 96.6,
    led: '#f5b04a',
  },
  concerned: {
    browL: 'M79 86.6c4.6-1.4 10.4-2.6 16.6-5.2',
    browR: 'M105.6 81.6c6.4 2.6 11.8 3.6 16.6 4.8',
    lidL: 'M80.2 96.6c4-3.4 11.4-3.6 15.6 0',
    lidR: 'M105.2 96.6c4.2-3.6 11.6-3.4 15.6 0',
    mouth: 'M93.2 131.4c2.6-1.4 5.6-1.8 8-1.6s4.6.8 6 1.8',
    irisY: 97,
    led: '#f5b04a',
  },
  alert: {
    browL: 'M79 83.4c5.2.2 11.2 1.6 16.8 4.2',
    browR: 'M105.2 87.6c5.6-2.6 11.6-4 16.8-4.2',
    lidL: 'M80.2 95.2c4-4.4 11.4-4.6 15.6-.6',
    lidR: 'M105.2 94.6c4.2-4 11.6-3.8 15.6.6',
    lowL: 'M81.6 98.8c3.6 1 8.6 1 12.6-.2',
    lowR: 'M106.8 98.6c4 1.2 9 1.2 12.6.2',
    mouth: 'M93.6 130.6h13.4',
    irisY: 96.2,
    led: '#ff5f56',
  },
  pleased: {
    browL: 'M78.5 84.6c4.6-3 11-3.4 17.2-1.2',
    browR: 'M105.2 83.4c6.2-2.2 12.4-1.8 17 1.2',
    lidL: 'M80.2 96.4c4-3.4 11.4-3.6 15.6.2',
    lidR: 'M105.2 96.6c4.2-3.8 11.6-3.6 15.6-.2',
    lowL: 'M81.8 98.6c3.6-1.4 8.4-1.4 12.2 0',
    lowR: 'M107 98.6c3.8-1.4 8.6-1.4 12.2 0',
    mouth: 'M92.2 129.2c3 2.4 9.6 2.8 15.6-.8',
    irisY: 96.8,
    led: '#6ef0f5',
  },
};

export const FACE_PATH = 'M72.4 88c0-22 12-36.4 28-36.4s28.4 14.4 28.4 36.4c0 16-3.4 30.4-9 41.6-6.4 12.8-13 19.6-19.4 19.6s-13.2-6.8-19.6-19.6C75.4 118.4 72.4 104 72.4 88z';

/** A Analista, personagem fixa. Quatro expressões: neutral, concerned, alert, pleased. */
export function AnalystPortrait({ mood = 'neutral', size = 200, speaking = false, blink = true, background = true, title, className, style }: AnalystPortraitProps) {
  const uid = useId().replace(/:/g, '');
  const f = FACES[mood];
  const id = (s: string) => `${s}${uid}`;
  const url = (s: string) => `url(#${s}${uid})`;
  const mouthOpen = speaking ? 'M94 129.6c3.6 3.6 9.6 3.6 12.8 0-3.6.8-9.2.8-12.8 0z' : '';

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={(size * 240) / 200}
      role="img"
      aria-label={title ?? `Analista (${mood})`}
      className={className}
      style={{ flex: 'none', ...style }}
    >
      <defs>
        <radialGradient id={id('bg')} cx="30%" cy="35%" r="85%">
          <stop offset="0" stopColor="#173238" />
          <stop offset="0.45" stopColor="#0d171b" />
          <stop offset="1" stopColor="#06080a" />
        </radialGradient>
        <linearGradient id={id('key')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6ef0f5" stopOpacity="0.28" />
          <stop offset="0.38" stopColor="#6ef0f5" stopOpacity="0" />
          <stop offset="0.62" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0b05" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={id('warm')} x1="1" y1="1" x2="0.3" y2="0.2">
          <stop offset="0" stopColor="#f5b04a" stopOpacity="0.38" />
          <stop offset="0.6" stopColor="#f5b04a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('coat')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#25313a" />
          <stop offset="1" stopColor="#0e1317" />
        </linearGradient>
        <linearGradient id={id('hair')} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor={HAIR_HI} />
          <stop offset="0.35" stopColor={HAIR} />
          <stop offset="1" stopColor="#0a0807" />
        </linearGradient>
        <clipPath id={id('face')}>
          <path d={FACE_PATH} />
        </clipPath>
        <clipPath id={id('frame')}>
          <rect width="200" height="240" />
        </clipPath>
        <pattern id={id('scan')} width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" fillOpacity="0.22" />
        </pattern>
      </defs>

      <g clipPath={url('frame')}>
        {background ? (
          <>
            <rect width="200" height="240" fill={url('bg')} />
            {/* telas desfocadas ao fundo */}
            <rect x="8" y="30" width="44" height="30" rx="2" fill="#6ef0f5" fillOpacity="0.05" />
            <rect x="12" y="34" width="20" height="2" fill="#6ef0f5" fillOpacity="0.14" />
            <rect x="12" y="40" width="30" height="2" fill="#6ef0f5" fillOpacity="0.09" />
            <rect x="12" y="46" width="14" height="2" fill="#f5b04a" fillOpacity="0.18" />
            <rect x="156" y="18" width="40" height="52" rx="2" fill="#6ef0f5" fillOpacity="0.035" />
            <path d="M160 58l8-10 6 5 8-14 10 8" fill="none" stroke="#6ef0f5" strokeOpacity="0.14" strokeWidth="1.2" />
            <circle cx="176" cy="104" r="22" fill="#f5b04a" fillOpacity="0.05" />
          </>
        ) : null}

        {/* cabelo de trás */}
        <path
          d="M60.6 94c-3-35 14-58 40.6-58 27.4 0 43 22.6 40.2 58-.8 14 .8 28 6.4 42.4-10.4 5-21 3.4-27.6-3.6H80.6c-6.6 7-17.6 8.6-27.2 3.4 5.2-13 7.8-27 7.2-42.2z"
          fill={url('hair')}
        />

        {/* corpo: casaco, gola alta */}
        <path d="M20 240c2-38 22-60 52-68l28 8 28-8c30 8 50 30 52 68z" fill={url('coat')} />
        <path d="M72 172l18 32-6 36M128 172l-18 32 6 36" fill="none" stroke="#06090b" strokeWidth="2" strokeOpacity="0.8" />
        <path d="M72 172l18 32M20 240c2-38 22-60 52-68" fill="none" stroke="#6ef0f5" strokeOpacity="0.35" strokeWidth="1.1" />
        <path d="M87.5 134v22c8 6 17 6 25 0v-22z" fill={SKIN_MID} />
        <path d="M87.5 136c6 10 19 10 25 0v9c-6 8-19 8-25 0z" fill={SKIN_SH} opacity="0.85" />
        <path d="M82.5 152c8 9 27 9 35 0l3.5 20c-12 10-30 10-42 0z" fill="#0f1418" />
        <path d="M84 159c8 6 24 6 32 0M83 165c9 6 25 6 34 0" fill="none" stroke="#1d262d" strokeWidth="1" />

        {/* rosto */}
        <path d={FACE_PATH} fill={SKIN} />
        <g clipPath={url('face')}>
          {/* sombra do lado direito e sob o queixo */}
          <path d="M112 50c18 8 22 26 20 44-2 22-8 40-18 52-6 6-10 6-14 4 10-10 16-28 17-50 1-20-1-36-5-50z" fill={SKIN_SH} opacity="0.85" />
          <path d="M100 150c-10 0-20-8-24-18 8 6 16 8 24 8s16-2 24-8c-4 10-14 18-24 18z" fill={SKIN_SH} opacity="0.5" />
          {/* bochecha / maçã */}
          <ellipse cx="86" cy="112" rx="8" ry="5" fill="#d9a088" opacity="0.25" />
          {/* sombra projetada da franja */}
          <path d="M70 76c10-10 22-14 34-14 10 0 20 4 28 12v8c-8-6-18-10-28-10-12 0-24 4-34 12z" fill={SKIN_SH} opacity="0.55" />
          <rect x="60" y="40" width="80" height="120" fill={url('key')} />
          <rect x="60" y="40" width="80" height="120" fill={url('warm')} />
        </g>
        {/* contorno de luz ciano (monitor) */}
        <path d="M100.4 51.6c-16 0-28 14.4-28 36.4 0 16 3 30.4 8.6 41.6 4.2 8.4 8.6 14.2 13 17.4" fill="none" stroke="#a8fbff" strokeOpacity="0.7" strokeWidth="1.1" />

        {/* orelha esquerda */}
        <path d="M72.8 96c-4-1.6-6.2 1.6-5.6 6 .6 4.6 2.6 8.6 6.6 9.2" fill={SKIN_MID} />

        {/* olhos */}
        {(['L', 'R'] as const).map((side) => {
          const cx = side === 'L' ? 88 : 113;
          const lid = side === 'L' ? f.lidL : f.lidR;
          const low = side === 'L' ? f.lowL : f.lowR;
          return (
            <g key={side}>
              <path d={side === 'L' ? 'M80.2 96.4c4-3.6 11.4-3.8 15.6 0-4 3.2-11.4 3.4-15.6 0z' : 'M105.2 96.4c4.2-3.8 11.6-3.6 15.6 0-4.2 3.4-11.4 3.2-15.6 0z'} fill="#d8cbb6" />
              <circle cx={cx} cy={f.irisY} r="3.1" fill="#2c1f18" />
              <circle cx={cx} cy={f.irisY} r="1.5" fill="#0a0706" />
              <circle cx={cx - 1} cy={f.irisY - 1.1} r="0.75" fill="#e9fdff" />
              <path d={lid} fill="none" stroke="#140d0b" strokeWidth="2.1" strokeLinecap="round" />
              {low ? <path d={low} fill="none" stroke={SKIN_SH} strokeWidth="1.1" strokeLinecap="round" /> : null}
              {blink ? (
                <path
                  className="sl-analyst__lids"
                  d={side === 'L' ? 'M79.4 92.2h17.2v7.2H79.4z' : 'M104.4 92.2h17.2v7.2h-17.2z'}
                  fill={side === 'L' ? SKIN : SKIN_MID}
                  style={{ animationDelay: side === 'L' ? '0s' : '0.02s' }}
                />
              ) : null}
            </g>
          );
        })}
        <path d={f.browL} fill="none" stroke={HAIR} strokeWidth="3" strokeLinecap="round" />
        <path d={f.browR} fill="none" stroke={HAIR} strokeWidth="3" strokeLinecap="round" />

        {/* nariz */}
        <path d="M101.6 99c.4 6 1.8 11.6 3.4 15.4-1.6 1.6-4 2-6.2 1.4" fill="none" stroke={SKIN_SH} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M96.6 116.4c1 .6 2 .8 3 .6" fill="none" stroke={SKIN_SH} strokeWidth="1.2" strokeLinecap="round" />

        {/* boca */}
        <path d="M94 133.6c3.4 1.6 9.2 1.6 12.4 0" fill="none" stroke="#7a4a40" strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
        <path d={f.mouth} fill="none" stroke="#4a2620" strokeWidth="1.9" strokeLinecap="round" />
        {mouthOpen ? <path className="sl-analyst__mouth-talk" d={mouthOpen} fill="#2a1210" /> : null}

        {/* franja / cabelo da frente, repartido à esquerda, bob assimétrico */}
        <path
          d="M64 102c-3-26 6-50 30-56 20-5 40 4 46 22 3 9 3 22 2 34-3-14-8-26-14-31-10 4-22 2-30-6-8 10-20 18-34 37z"
          fill={url('hair')}
        />
        <path d="M128 76c6 8 9 20 10 30 1 12-1 22 1 34 4-6 6-18 5-32-1-14-6-26-16-32z" fill="#0b0908" />
        <path d="M64 102c-1-20 5-38 18-48" fill="none" stroke="#a8fbff" strokeOpacity="0.55" strokeWidth="1" />
        <path d="M86 52c10-4 24-4 34 2" fill="none" stroke="#6ef0f5" strokeOpacity="0.25" strokeWidth="0.9" />

        {/* fone de comunicação */}
        <path d="M66 98c-6-38 12-62 36-63 26-1 42 24 37 63" fill="none" stroke="#0a0d10" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M66 98c-6-38 12-62 36-63" fill="none" stroke="#6ef0f5" strokeOpacity="0.35" strokeWidth="0.9" />
        <rect x="133.5" y="96" width="10" height="17" rx="4" fill="#12181d" stroke="#2c3842" strokeWidth="0.8" />
        <path d="M137 112c-1 12-8 20-22 21.6" fill="none" stroke="#12181d" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="109" y="131" width="7" height="4.4" rx="2.2" fill="#1d252c" />
        <circle className="sl-analyst__led" cx="138.5" cy="101" r="1.4" fill={f.led} />
        <circle cx="138.5" cy="101" r="3.6" fill={f.led} opacity="0.25" />

        {/* textura de monitor e vinheta */}
        <rect width="200" height="240" fill={url('scan')} opacity="0.22" />
        <rect width="200" height="240" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="18" style={{ filter: 'blur(8px)' }} />
      </g>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════
// OperativePortrait — rosto DiceBear (notionists) estilizado como foto de ficha:
// duotone, meio-tom, moldura de dossiê, tarja de código e clipe.
// ══════════════════════════════════════════════════════════════════════

export type OperativeTone = 'cold' | 'warm' | 'paper' | 'signal';

const DUO: Record<OperativeTone, { dark: string; light: string; bg0: string; bg1: string }> = {
  cold: { dark: '#06171a', light: '#94e2e0', bg0: '#1c4a50', bg1: '#081a1d' },
  warm: { dark: '#1d1006', light: '#f4cf8e', bg0: '#5a3a14', bg1: '#1b1007' },
  paper: { dark: '#231a10', light: '#ece2cc', bg0: '#8d7a5a', bg1: '#3a2f20' },
  signal: { dark: '#1e0705', light: '#ffb0a8', bg0: '#5e1a16', bg1: '#1c0605' },
};

const hex01 = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const avatarCache = new Map<string, string>();
const avatarUri = (seed: string) => {
  let u = avatarCache.get(seed);
  if (!u) {
    u = createAvatar(notionists, { seed, size: 256 }).toDataUri();
    avatarCache.set(seed, u);
  }
  return u;
};

export interface OperativePortraitProps {
  seed: string;
  size?: number;
  tone?: OperativeTone;
  /** linha de código na tarja inferior (ex.: 'OP-0417') */
  code?: string;
  /** nome/codinome abaixo da foto */
  name?: string;
  /** estado sobreposto (carimbo) — ex.: 'DETIDO', 'FERIDA' */
  status?: string;
  /** moldura de ficha (papel, clipe, tarja). `false` = só a foto. */
  frame?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** Retrato de Unidade do Pessoal gerado a partir de `seed`, sempre no mesmo estilo de ficha. */
export function OperativePortrait({ seed, size = 120, tone = 'cold', code, name, status, frame = true, title, className, style }: OperativePortraitProps) {
  const uid = useId().replace(/:/g, '');
  const uri = useMemo(() => avatarUri(seed), [seed]);
  const duo = DUO[tone];
  const [dr, dg, db] = hex01(duo.dark);
  const [lr, lg, lb] = hex01(duo.light);
  const W = 100;
  const H = frame ? 128 : 100;
  const label = code ?? `#${seed.slice(0, 6).toUpperCase()}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      role="img"
      aria-label={title ?? name ?? `Retrato ${label}`}
      className={className}
      style={{ flex: 'none', overflow: 'visible', ...style }}
    >
      <defs>
        <filter id={`duo${uid}`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${dr} ${lr}`} />
            <feFuncG type="table" tableValues={`${dg} ${lg}`} />
            <feFuncB type="table" tableValues={`${db} ${lb}`} />
          </feComponentTransfer>
        </filter>
        <radialGradient id={`bgp${uid}`} cx="45%" cy="35%" r="75%">
          <stop offset="0" stopColor={duo.bg0} />
          <stop offset="1" stopColor={duo.bg1} />
        </radialGradient>
        <pattern id={`ht${uid}`} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="1.1" cy="1.1" r="0.42" fill="#000" fillOpacity="0.35" />
        </pattern>
        <clipPath id={`ph${uid}`}>
          <rect x={frame ? 9 : 0} y={frame ? 9 : 0} width={frame ? 82 : 100} height={frame ? 82 : 100} />
        </clipPath>
        <linearGradient id={`gl${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {frame ? (
        <>
          {/* cartão de ficha */}
          <rect x="1" y="1" width="98" height={H - 2} fill="#e6dcc5" />
          <rect x="1" y="1" width="98" height={H - 2} fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="0.6" />
          <path d={`M1 ${H - 1}l6-4h86l6 4`} fill="#000" fillOpacity="0.06" />
          <rect x="8.5" y="8.5" width="83" height="83" fill="#111" />
        </>
      ) : null}

      <g clipPath={`url(#ph${uid})`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#bgp${uid})`} />
        <image href={uri} x={frame ? 9 : 0} y={frame ? 3 : -3} width={frame ? 82 : 100} height={frame ? 82 : 100} filter={`url(#duo${uid})`} preserveAspectRatio="xMidYMid slice" />
        <rect x="0" y="0" width="100" height="100" fill={`url(#ht${uid})`} />
        <rect x="0" y="0" width="100" height="100" fill={`url(#gl${uid})`} />
        {/* régua de altura */}
        <g stroke={duo.light} strokeOpacity="0.35" strokeWidth="0.4">
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M${frame ? 9 : 0} ${(frame ? 14 : 5) + i * 9}h${i % 2 ? 2 : 4}`} />
          ))}
        </g>
      </g>

      {frame ? (
        <>
          {/* tarja com código */}
          <rect x="9" y="80" width="46" height="8" fill="#0a0a0a" />
          <text x="11.5" y="86" fontFamily="var(--sl-font-mono)" fontSize="5" fill="#e6dcc5" letterSpacing="0.6">
            {label}
          </text>
          {name ? (
            <text x="9" y="104" fontFamily="var(--sl-font-type)" fontSize="8.4" fill="#241c11">
              {name}
            </text>
          ) : (
            <>
              <rect x="9" y="98" width="50" height="5" fill="#0a0a0a" />
              <rect x="9" y="106" width="30" height="4" fill="#0a0a0a" opacity="0.85" />
            </>
          )}
          <path d="M9 115h82" stroke="#241c11" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="1.4 1.4" />
          <text x="9" y="122" fontFamily="var(--sl-font-mono)" fontSize="4.2" fill="#6b5a3e" letterSpacing="0.4">
            {`ARQ ${seed.length.toString().padStart(2, '0')}-${(hashSeed(seed) % 9000) + 1000}`}
          </text>
          {/* clipe */}
          <path d="M76 -3v14c0 2.6 4 2.6 4 0V0c0-4.4-7-4.4-7 0v15" fill="none" stroke="#9aa3ab" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M76 -3v14c0 2.6 4 2.6 4 0V0" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.5" strokeLinecap="round" />
        </>
      ) : null}

      {status ? (
        <g transform={`translate(50 ${frame ? 58 : 60}) rotate(-12)`} opacity="0.92">
          <rect x="-34" y="-9" width="68" height="18" fill="none" stroke="#c62a21" strokeWidth="2" />
          <rect x="-31.5" y="-6.5" width="63" height="13" fill="none" stroke="#c62a21" strokeWidth="0.6" />
          <text x="0" y="4.2" textAnchor="middle" fontFamily="var(--sl-font-display)" fontWeight="700" fontSize="12" fill="#c62a21" letterSpacing="1.4">
            {status}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
