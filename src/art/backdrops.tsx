import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import './art.css';
import { prefersLiteRendering, prefersReducedMotion } from './tokens';

// ══════════════════════════════════════════════════════════════════════
// NoiseBackdrop — grão de filme + vinheta + varredura opcional.
// O grão é um ladrilho de 160px gerado uma vez num canvas e movido por CSS
// (só transform, no compositor). Sem WebGL, custo ~0 por quadro.
// ══════════════════════════════════════════════════════════════════════

const grainCache = new Map<string, string>();

/** Gera (e memoriza) um ladrilho de ruído monocromático como data URL. */
export function grainTile(size = 160, alpha = 0.55, seed = 7): string {
  const key = `${size}:${alpha}:${seed}`;
  const hit = grainCache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(size, size);
  let s = seed * 2654435761;
  for (let i = 0; i < img.data.length; i += 4) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const v = (s >>> 0) / 4294967295;
    const lum = v > 0.5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = lum;
    img.data[i + 3] = Math.round(Math.abs(v - 0.5) * 2 * alpha * 255 * (0.35 + 0.65 * ((s >>> 8) & 255) / 255));
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL('image/png');
  grainCache.set(key, url);
  return url;
}

export interface NoiseBackdropProps {
  /** opacidade do grão 0..1 (padrão 0.08) */
  grain?: number;
  /** força da vinheta 0..1 (padrão 0.7) */
  vignette?: number;
  /** linhas de varredura de monitor */
  scanlines?: boolean;
  /** faixa de varredura que desce lentamente (só com scanlines) */
  roll?: boolean;
  /** anima o grão; desliga sozinho com reduced-motion ou aparelho fraco */
  animated?: boolean;
  /** pinta o fundo com --sl-bg (desligue para sobrepor a outra camada) */
  fill?: boolean;
  /** cor da luz central ('none' = só escuro) */
  tint?: 'none' | 'warm' | 'cold';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function NoiseBackdrop({
  grain = 0.08,
  vignette = 0.7,
  scanlines = false,
  roll = false,
  animated = true,
  fill = true,
  tint = 'none',
  className,
  style,
  children,
}: NoiseBackdropProps) {
  const [tile, setTile] = useState('');
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    setTile(grainTile());
    setMotionOk(!prefersReducedMotion() && !prefersLiteRendering());
  }, []);
  const tintBg =
    tint === 'warm'
      ? 'radial-gradient(120% 90% at 50% 38%, rgba(245,176,74,0.10), transparent 60%)'
      : tint === 'cold'
        ? 'radial-gradient(120% 90% at 50% 38%, rgba(51,214,224,0.10), transparent 60%)'
        : '';
  const base = fill ? 'var(--sl-bg)' : 'transparent';
  return (
    <div
      aria-hidden
      className={`sl-noise${animated && motionOk ? ' sl-noise--animated' : ''}${className ? ' ' + className : ''}`}
      style={{ background: tintBg ? `${tintBg}, ${base}` : base, ...style }}
    >
      {children}
      {tile ? <div className="sl-noise__grain" style={{ backgroundImage: `url(${tile})`, opacity: grain, mixBlendMode: 'overlay' }} /> : null}
      {tile ? <div className="sl-noise__grain" style={{ backgroundImage: `url(${tile})`, opacity: grain * 0.6, backgroundSize: '240px', animationDelay: '-0.4s' }} /> : null}
      {scanlines ? <div className="sl-noise__scan" /> : null}
      {scanlines && roll && motionOk ? <div className="sl-noise__roll" /> : null}
      {vignette > 0 ? (
        <div
          className="sl-noise__vignette"
          style={{ background: `radial-gradient(130% 100% at 50% 45%, transparent 45%, rgba(3,4,6,${0.55 * vignette}) 78%, rgba(3,4,6,${0.95 * vignette}) 100%)` }}
        />
      ) : null}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// RadarSweep — anéis, retícula, feixe girando (conic-gradient) e contatos.
// ══════════════════════════════════════════════════════════════════════

export interface RadarBlip {
  /** -1..1 a partir do centro */
  x: number;
  y: number;
  tone?: 'cold' | 'warm' | 'signal';
}

export interface RadarSweepProps {
  size?: number | string;
  /** segundos por volta */
  period?: number;
  tone?: 'cold' | 'warm';
  blips?: RadarBlip[];
  rings?: number;
  /** mostra rótulos de azimute */
  ticks?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function RadarSweep({ size = 240, period = 4, tone = 'cold', blips = [], rings = 4, ticks = true, className, style }: RadarSweepProps) {
  const rgb = tone === 'warm' ? '245,176,74' : '110,240,245';
  const col = `rgb(${rgb})`;
  const ringEls = Array.from({ length: rings }, (_, i) => (
    <circle key={i} cx="50" cy="50" r={((i + 1) / rings) * 48} fill="none" stroke={col} strokeOpacity={i === rings - 1 ? 0.5 : 0.18} strokeWidth={i === rings - 1 ? 0.5 : 0.3} />
  ));
  const tickEls = ticks
    ? Array.from({ length: 72 }, (_, i) => {
        const a = (i * 5 * Math.PI) / 180;
        const long = i % 6 === 0;
        const r0 = long ? 44.5 : 46.4;
        return (
          <line
            key={i}
            x1={50 + Math.sin(a) * r0}
            y1={50 - Math.cos(a) * r0}
            x2={50 + Math.sin(a) * 48}
            y2={50 - Math.cos(a) * 48}
            stroke={col}
            strokeOpacity={long ? 0.55 : 0.25}
            strokeWidth={0.3}
          />
        );
      })
    : null;
  return (
    <div
      aria-hidden
      className={`sl-radar${className ? ' ' + className : ''}`}
      style={
        {
          width: size,
          height: size,
          background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.10), rgba(7,9,11,0.0) 55%), radial-gradient(circle, #0c1418 0%, #070a0c 70%)`,
          boxShadow: `inset 0 0 0 1px rgba(${rgb},0.25), inset 0 0 40px rgba(0,0,0,0.8), 0 0 30px rgba(${rgb},0.08)`,
          ['--sl-radar-tone']: `rgba(${rgb},0.55)`,
          ['--sl-radar-tone-a']: `rgba(${rgb},0.0)`,
          ['--sl-radar-period']: `${period}s`,
          ...style,
        } as CSSProperties
      }
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {ringEls}
        {tickEls}
        <path d="M50 2v96M2 50h96" stroke={col} strokeOpacity={0.16} strokeWidth={0.3} />
        <path d="M16 16l68 68M84 16 16 84" stroke={col} strokeOpacity={0.07} strokeWidth={0.3} strokeDasharray="1 2" />
        <circle cx="50" cy="50" r="1" fill={col} />
      </svg>
      <div className="sl-radar__sweep" />
      {blips.map((b, i) => {
        // atraso para o contato acender quando o feixe passa por ele
        const ang = (Math.atan2(b.x, -b.y) * 180) / Math.PI;
        const delay = -(((ang + 360) % 360) / 360) * period;
        return (
          <span
            key={i}
            className="sl-radar__blip"
            style={
              {
                left: `${50 + b.x * 48}%`,
                top: `${50 + b.y * 48}%`,
                animationDelay: `${delay + period}s`,
                ['--sl-radar-blip']: b.tone ? `var(--sl-${b.tone})` : undefined,
              } as CSSProperties
            }
          />
        );
      })}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,0.25) 3px)', pointerEvents: 'none' }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// DossierPaper — papel envelhecido por filtros SVG: fibra, manchas e borda queimada.
// ══════════════════════════════════════════════════════════════════════

export interface DossierPaperProps {
  /** 0..1 — quanto da borda está chamuscada */
  burn?: number;
  /** marca de caneca/café */
  stain?: boolean;
  /** vinco de dobra no meio */
  fold?: boolean;
  /** semente do ruído (muda o padrão de fibra/queimado) */
  seed?: number;
  /** força o modo barato (só gradientes CSS). Padrão: automático. */
  lite?: boolean;
  /** leve rotação do papel, graus */
  tilt?: number;
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function DossierPaper({ burn = 0.35, stain = false, fold = false, seed = 3, lite, tilt = 0, padding, className, style, children }: DossierPaperProps) {
  const uid = useId().replace(/:/g, '');
  const [autoLite, setAutoLite] = useState(false);
  useEffect(() => setAutoLite(prefersLiteRendering()), []);
  const isLite = lite ?? autoLite;
  const burnW = 6 + burn * 26; // largura da faixa de queimado em unidades do viewBox (0..1000)

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        color: 'var(--sl-paper-ink)',
        padding: padding ?? `calc(var(--sl-space-6) + ${Math.round(burn * 18)}px)`,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        filter: 'drop-shadow(0 10px 18px rgba(0,0,0,.55)) drop-shadow(0 1px 1px rgba(0,0,0,.4))',
        isolation: 'isolate',
        ...style,
      }}
    >
      <svg aria-hidden width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 1000" style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'visible' }}>
        {isLite ? (
          <>
            <defs>
              <radialGradient id={`pl${uid}`} cx="50%" cy="45%" r="75%">
                <stop offset="0.55" stopColor="#efe7d6" />
                <stop offset="0.9" stopColor="#d9c8a6" />
                <stop offset="1" stopColor={burn > 0 ? '#7a5a34' : '#cdbd9c'} />
              </radialGradient>
            </defs>
            <rect width="1000" height="1000" fill={`url(#pl${uid})`} />
          </>
        ) : (
          <>
            <defs>
              {/* fibra do papel */}
              <filter id={`fb${uid}`} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
                <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="2" seed={seed} result="n" />
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.16  0 0 0 0.16 0" />
              </filter>
              {/* manchas grandes */}
              <filter id={`mt${uid}`} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
                <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed={seed + 11} result="n" />
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.16  0 0 0 -1.4 0.95" />
              </filter>
              {/* borda irregular (corrói o papel) */}
              <filter id={`ed${uid}`} x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed={seed + 5} result="t" />
                <feDisplacementMap in="SourceGraphic" in2="t" scale={10 + burn * 30} xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <filter id={`bl${uid}`} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed={seed + 9} result="t" />
                <feDisplacementMap in="SourceGraphic" in2="t" scale={28 + burn * 50} xChannelSelector="R" yChannelSelector="G" result="d" />
                <feGaussianBlur in="d" stdDeviation={3 + burn * 5} />
              </filter>
              <radialGradient id={`lt${uid}`} cx="45%" cy="40%" r="80%">
                <stop offset="0" stopColor="#fff8e8" stopOpacity="0.5" />
                <stop offset="0.6" stopColor="#fff8e8" stopOpacity="0" />
                <stop offset="1" stopColor="#5a4020" stopOpacity="0.28" />
              </radialGradient>
              <mask id={`mk${uid}`} maskUnits="userSpaceOnUse" x="-50" y="-50" width="1100" height="1100">
                <rect x={burn > 0 ? 6 : 0} y={burn > 0 ? 6 : 0} width={burn > 0 ? 988 : 1000} height={burn > 0 ? 988 : 1000} fill="#fff" filter={burn > 0 ? `url(#ed${uid})` : undefined} />
              </mask>
            </defs>
            <g mask={`url(#mk${uid})`}>
              <rect width="1000" height="1000" fill="#ece3cf" />
              <rect width="1000" height="1000" filter={`url(#mt${uid})`} />
              <rect width="1000" height="1000" filter={`url(#fb${uid})`} />
              <rect width="1000" height="1000" fill={`url(#lt${uid})`} />
              {burn > 0 ? (
                <rect
                  x={burnW / 2}
                  y={burnW / 2}
                  width={1000 - burnW}
                  height={1000 - burnW}
                  fill="none"
                  stroke="#2a1606"
                  strokeOpacity={0.55 + burn * 0.4}
                  strokeWidth={burnW * 2.2}
                  filter={`url(#bl${uid})`}
                />
              ) : null}
              {stain ? (
                <g opacity="0.5" filter={`url(#ed${uid})`}>
                  <circle cx="790" cy="230" r="105" fill="none" stroke="#8a5a28" strokeWidth="9" strokeOpacity="0.45" />
                  <circle cx="790" cy="230" r="98" fill="#a87a3e" fillOpacity="0.07" />
                </g>
              ) : null}
              {fold ? (
                <>
                  <rect x="0" y="497" width="1000" height="10" fill="#5a4020" fillOpacity="0.12" />
                  <rect x="0" y="494" width="1000" height="3" fill="#fff" fillOpacity="0.45" />
                </>
              ) : null}
            </g>
          </>
        )}
      </svg>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// WorldGlow — luz atrás do mapa: brilho frio, grade geográfica, focos quentes.
// ══════════════════════════════════════════════════════════════════════

export interface WorldGlowSpot {
  /** 0..1 na largura/altura */
  x: number;
  y: number;
  tone?: 'warm' | 'signal' | 'cold';
  /** raio relativo à largura (padrão 0.08) */
  r?: number;
}

export interface WorldGlowProps {
  /** 0..1 — Tensão Global puxa a luz de ciano para vermelho */
  tension?: number;
  spots?: WorldGlowSpot[];
  grid?: boolean;
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

const spotRgb = { warm: '245,176,74', signal: '255,95,86', cold: '110,240,245' } as const;

export function WorldGlow({ tension = 0, spots = [], grid = true, animated = true, className, style }: WorldGlowProps) {
  const uid = useId().replace(/:/g, '');
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => setMotionOk(!prefersReducedMotion() && !prefersLiteRendering()), []);
  const t = Math.min(1, Math.max(0, tension));
  // interpola ciano → âmbar → vermelho
  const mix = useMemo(() => {
    const a = [51, 214, 224];
    const b = [245, 150, 60];
    const c = [229, 55, 47];
    const lerp = (p: number[], q: number[], k: number) => p.map((v, i) => Math.round(v + (q[i] - v) * k));
    return (t < 0.5 ? lerp(a, b, t * 2) : lerp(b, c, (t - 0.5) * 2)).join(',');
  }, [t]);

  return (
    <div aria-hidden className={`sl-worldglow${className ? ' ' + className : ''}`} style={{ background: 'var(--sl-bg-deep)', ...style }}>
      <div
        className="sl-worldglow__drift"
        style={{
          animationName: animated && motionOk ? undefined : 'none',
          background: `radial-gradient(45% 55% at 50% 50%, rgba(${mix},${0.16 + t * 0.06}), transparent 70%), radial-gradient(30% 40% at 30% 40%, rgba(51,214,224,0.06), transparent 70%), radial-gradient(35% 40% at 72% 58%, rgba(${mix},0.07), transparent 70%)`,
        }}
      />
      {grid ? (
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <pattern id={`gr${uid}`} width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M60 0H0V60" fill="none" stroke="rgba(110,240,245,0.07)" strokeWidth="1" />
              <path d="M30 0v60M0 30h60" fill="none" stroke="rgba(110,240,245,0.03)" strokeWidth="1" />
            </pattern>
            <radialGradient id={`gm${uid}`} cx="50%" cy="50%" r="65%">
              <stop offset="0.3" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id={`gk${uid}`}>
              <rect width="100%" height="100%" fill={`url(#gm${uid})`} />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill={`url(#gr${uid})`} mask={`url(#gk${uid})`} />
        </svg>
      ) : null}
      {spots.map((s, i) => {
        const r = (s.r ?? 0.08) * 100;
        const rgb = spotRgb[s.tone ?? 'warm'];
        return (
          <span
            key={i}
            className="sl-worldglow__hot"
            style={{
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              width: `${r * 2}vmax`,
              height: `${r * 2}vmax`,
              maxWidth: '60%',
              maxHeight: '60%',
              aspectRatio: '1',
              background: `radial-gradient(circle, rgba(${rgb},0.28), rgba(${rgb},0.08) 40%, transparent 70%)`,
              animationName: animated && motionOk ? undefined : 'none',
              animationDelay: `${-i * 1.3}s`,
            }}
          />
        );
      })}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(3,4,6,0.85) 100%)' }} />
    </div>
  );
}
