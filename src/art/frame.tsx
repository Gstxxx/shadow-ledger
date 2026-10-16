import { useId, type CSSProperties, type ReactNode } from 'react';
import './art.css';

type Tone = 'neutral' | 'warm' | 'cold' | 'signal';
const toneVar = (t: Tone) => (t === 'neutral' ? 'var(--sl-c-frame-color)' : `var(--sl-${t})`);

// ══════════════════════════════════════════════════════════════════════
// Cantos de dossiê
// ══════════════════════════════════════════════════════════════════════

export interface CornerBracketsProps {
  /** comprimento de cada perna, px */
  size?: number;
  thickness?: number;
  tone?: Tone;
  /** recuo para dentro do contêiner, px */
  inset?: number;
}

/** Quatro cantos em L, absolutos no contêiner pai (que precisa de position: relative). */
export function CornerBrackets({ size = 14, thickness = 2, tone = 'neutral', inset = 0 }: CornerBracketsProps) {
  const c = toneVar(tone);
  const base: CSSProperties = { position: 'absolute', width: size, height: size, borderColor: c, borderStyle: 'solid', pointerEvents: 'none' };
  return (
    <>
      <span aria-hidden style={{ ...base, top: inset, left: inset, borderWidth: `${thickness}px 0 0 ${thickness}px` }} />
      <span aria-hidden style={{ ...base, top: inset, right: inset, borderWidth: `${thickness}px ${thickness}px 0 0` }} />
      <span aria-hidden style={{ ...base, bottom: inset, left: inset, borderWidth: `0 0 ${thickness}px ${thickness}px` }} />
      <span aria-hidden style={{ ...base, bottom: inset, right: inset, borderWidth: `0 ${thickness}px ${thickness}px 0` }} />
    </>
  );
}

export interface DossierFrameProps {
  /** título do painel (caixa alta mono) */
  label?: ReactNode;
  /** código à direita do título (ex.: 'EST-04 · LAGOS') */
  code?: ReactNode;
  tone?: Tone;
  /** fundo do painel: superfície escura, vidro ou nenhum */
  surface?: 'solid' | 'glass' | 'none';
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Painel de HUD com cantos de dossiê, cabeçalho rotulado e borda fina. */
export function DossierFrame({ label, code, tone = 'neutral', surface = 'solid', padding = 'var(--sl-space-4)', className, style, children }: DossierFrameProps) {
  const accent = toneVar(tone);
  const bg =
    surface === 'solid'
      ? 'linear-gradient(180deg, var(--sl-surface-raised), var(--sl-surface))'
      : surface === 'glass'
        ? 'linear-gradient(180deg, rgba(21,26,33,0.72), rgba(11,14,18,0.6))'
        : 'transparent';
  return (
    <section
      className={className}
      style={{
        position: 'relative',
        background: bg,
        backdropFilter: surface === 'glass' ? 'blur(10px) saturate(1.2)' : undefined,
        WebkitBackdropFilter: surface === 'glass' ? 'blur(10px) saturate(1.2)' : undefined,
        border: '1px solid var(--sl-line)',
        boxShadow: 'var(--sl-shadow-2)',
        color: 'var(--sl-text)',
        ...style,
      }}
    >
      <CornerBrackets tone={tone} inset={-1} />
      {label || code ? (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sl-space-2)',
            padding: 'var(--sl-space-2) var(--sl-space-4)',
            borderBottom: '1px solid var(--sl-line)',
            fontFamily: 'var(--sl-font-mono)',
            fontSize: 'var(--sl-fs-2xs)',
            letterSpacing: 'var(--sl-tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--sl-text-muted)',
          }}
        >
          <span aria-hidden style={{ width: 6, height: 6, background: accent === 'var(--sl-c-frame-color)' ? 'var(--sl-warm)' : accent, flex: 'none' }} />
          <span style={{ color: 'var(--sl-text)', fontWeight: 600 }}>{label}</span>
          <span style={{ flex: 1, height: 1, background: 'var(--sl-line)', minWidth: 12 }} />
          {code ? <span>{code}</span> : null}
        </header>
      ) : null}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Carimbos
// ══════════════════════════════════════════════════════════════════════

export type StampPreset = 'CONFIDENCIAL' | 'INTERDITADA' | 'DETIDO' | 'SEQUESTRADO' | 'APROVADO' | 'ARQUIVADO' | 'URGENTE';

const STAMP_COLOR: Record<string, string> = {
  red: 'var(--sl-c-stamp-color)',
  blue: 'var(--sl-stamp-blue)',
  amber: 'var(--sl-warm)',
  signal: 'var(--sl-signal)',
  cold: 'var(--sl-cold)',
};

const PRESET_COLOR: Record<StampPreset, keyof typeof STAMP_COLOR> = {
  CONFIDENCIAL: 'red',
  INTERDITADA: 'red',
  DETIDO: 'red',
  SEQUESTRADO: 'red',
  APROVADO: 'blue',
  ARQUIVADO: 'blue',
  URGENTE: 'red',
};

export interface StampProps {
  /** texto do carimbo (presets ou livre) */
  text: StampPreset | (string & {});
  /** linha menor abaixo (data, órgão) */
  sub?: string;
  color?: keyof typeof STAMP_COLOR | (string & {});
  /** graus */
  rotate?: number;
  /** altura do texto principal em px */
  size?: number;
  /** batida animada ao montar */
  animate?: boolean;
  /** desgaste da tinta 0..1 */
  wear?: number;
  seed?: number;
  className?: string;
  style?: CSSProperties;
}

/** Carimbo de borracha com tinta falhada (máscara de ruído SVG). */
export function Stamp({ text, sub, color, rotate = -8, size = 28, animate = false, wear = 0.5, seed = 4, className, style }: StampProps) {
  const uid = useId().replace(/:/g, '');
  const key = color ?? PRESET_COLOR[text as StampPreset] ?? 'red';
  const c = STAMP_COLOR[key] ?? key;
  // largura estimada (Barlow Condensed bold ≈ 0.5em por letra + tracking)
  const chars = text.length;
  const fs = size;
  const w = Math.round(chars * fs * 0.56 + fs * 1.4);
  const h = Math.round(fs * (sub ? 1.95 : 1.55));
  const k = 6 + wear * 4; // dureza da falha de tinta
  return (
    <span
      role="img"
      aria-label={sub ? `${text} — ${sub}` : text}
      className={`${animate ? 'sl-stamp--animate' : ''}${className ? ' ' + className : ''}`}
      style={{ display: 'inline-block', transform: `rotate(${rotate}deg)`, ['--sl-stamp-rot' as string]: `rotate(${rotate}deg)`, lineHeight: 0, ...style }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible', color: c }}>
        <defs>
          <filter id={`sw${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={seed} result="fine" />
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed={seed + 3} result="blot" />
            <feComposite in="fine" in2="blot" operator="arithmetic" k1="0" k2="0.6" k3="0.7" k4="0" result="mix" />
            <feColorMatrix
              in="mix"
              type="matrix"
              values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${-k} 0 0 0 ${k * (0.92 - wear * 0.18)}`}
              result="holes"
            />
            <feComposite in="SourceGraphic" in2="holes" operator="in" result="inked" />
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed + 7} result="wob" />
            <feDisplacementMap in="inked" in2="wob" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter={`url(#sw${uid})`} fill="currentColor" stroke="currentColor">
          <rect x="2" y="2" width={w - 4} height={h - 4} rx="3" fill="none" strokeWidth={Math.max(2, fs * 0.1)} />
          <rect x={fs * 0.22 + 2} y={fs * 0.22 + 2} width={w - fs * 0.44 - 4} height={h - fs * 0.44 - 4} rx="1.5" fill="none" strokeWidth={Math.max(1, fs * 0.035)} />
          <text
            x={w / 2}
            y={sub ? fs * 1.12 : h / 2 + fs * 0.36}
            textAnchor="middle"
            stroke="none"
            fontFamily="var(--sl-font-display)"
            fontWeight={700}
            fontSize={fs}
            letterSpacing={fs * 0.08}
          >
            {text}
          </text>
          {sub ? (
            <text x={w / 2} y={fs * 1.6} textAnchor="middle" stroke="none" fontFamily="var(--sl-font-mono)" fontWeight={600} fontSize={fs * 0.3} letterSpacing={fs * 0.05}>
              {sub}
            </text>
          ) : null}
        </g>
      </svg>
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Tarjas de censura
// ══════════════════════════════════════════════════════════════════════

export interface RedactedProps {
  children: ReactNode;
  /** mostra o texto (ex.: depois de comprar a informação) */
  revealed?: boolean;
  /** texto lido por leitor de tela enquanto censurado */
  srLabel?: string;
}

/** Trecho de texto coberto por tarja preta; segue a quebra de linha do texto. */
export function Redacted({ children, revealed = false, srLabel = 'censurado' }: RedactedProps) {
  return (
    <span className={`sl-redact${revealed ? ' sl-redact--revealed' : ''}`}>
      {revealed ? children : <span aria-hidden>{children}</span>}
      {revealed ? null : <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>[{srLabel}]</span>}
    </span>
  );
}

export interface RedactionBarProps {
  /** largura (px ou %) */
  width?: number | string;
  height?: number;
  seed?: number;
  style?: CSSProperties;
}

/** Barra de censura avulsa com borda de caneta irregular (para "linhas" de documento). */
export function RedactionBar({ width = '100%', height = 12, seed = 1, style }: RedactionBarProps) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg aria-hidden width={width} height={height + 4} preserveAspectRatio="none" viewBox={`0 0 200 ${height + 4}`} style={{ display: 'block', ...style }}>
      <defs>
        <filter id={`rb${uid}`} x="-2%" y="-30%" width="104%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.08 0.6" numOctaves="2" seed={seed} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <rect x="2" y="2" width="196" height={height} fill="var(--sl-redact)" filter={`url(#rb${uid})`} />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Divisores
// ══════════════════════════════════════════════════════════════════════

export interface DividerProps {
  variant?: 'rule' | 'ticks' | 'perforation' | 'hazard';
  label?: ReactNode;
  tone?: Tone;
  style?: CSSProperties;
}

/** Divisores: `rule` (fio com rótulo), `ticks` (régua), `perforation` (picote), `hazard` (faixa de alerta). */
export function Divider({ variant = 'rule', label, tone = 'neutral', style }: DividerProps) {
  const c = tone === 'neutral' ? 'var(--sl-c-divider-color)' : `var(--sl-${tone})`;
  if (variant === 'hazard') {
    return (
      <div
        role="separator"
        style={{
          height: 8,
          background: `repeating-linear-gradient(-45deg, ${c} 0 8px, transparent 8px 16px)`,
          opacity: 0.85,
          ...style,
        }}
      />
    );
  }
  if (variant === 'perforation') {
    return (
      <div
        role="separator"
        style={{
          height: 10,
          backgroundImage: `radial-gradient(circle, var(--sl-bg-deep) 2.4px, transparent 2.8px), linear-gradient(${c}, ${c})`,
          backgroundSize: '12px 10px, 100% 1px',
          backgroundRepeat: 'repeat-x, no-repeat',
          backgroundPosition: '0 50%, 0 50%',
          ...style,
        }}
      />
    );
  }
  if (variant === 'ticks') {
    return (
      <div
        role="separator"
        style={{
          height: 10,
          borderTop: `1px solid ${c}`,
          backgroundImage: `linear-gradient(90deg, ${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
          backgroundSize: '40px 8px, 8px 4px',
          backgroundRepeat: 'repeat-x',
          ...style,
        }}
      />
    );
  }
  return (
    <div role="separator" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sl-space-3)', ...style }}>
      <span style={{ width: 6, height: 6, border: `1px solid ${c}`, transform: 'rotate(45deg)', flex: 'none' }} />
      <span style={{ flex: 1, height: 1, background: c }} />
      {label ? (
        <span style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 'var(--sl-fs-2xs)', letterSpacing: 'var(--sl-tracking-label)', textTransform: 'uppercase', color: 'var(--sl-text-muted)', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      ) : null}
      {label ? <span style={{ flex: 1, height: 1, background: c }} /> : null}
      <span style={{ width: 6, height: 6, border: `1px solid ${c}`, transform: 'rotate(45deg)', flex: 'none' }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Faixa de classificação, fita adesiva
// ══════════════════════════════════════════════════════════════════════

export interface ClassificationBarProps {
  level?: 'restrito' | 'secreto' | 'ultrassecreto';
  /** texto à direita (ex.: 'SOMENTE DIRETORIA') */
  caveat?: string;
  style?: CSSProperties;
}

const LEVEL: Record<NonNullable<ClassificationBarProps['level']>, { text: string; bg: string; fg: string }> = {
  restrito: { text: 'RESTRITO', bg: 'var(--sl-cold-deep)', fg: 'var(--sl-cold)' },
  secreto: { text: 'SECRETO', bg: 'var(--sl-warm-deep)', fg: 'var(--sl-warm-strong)' },
  ultrassecreto: { text: 'ULTRASSECRETO', bg: 'var(--sl-signal-deep)', fg: 'var(--sl-p-signal-300)' },
};

/** Faixa de topo de documento com o nível de sigilo. */
export function ClassificationBar({ level = 'secreto', caveat, style }: ClassificationBarProps) {
  const l = LEVEL[level];
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.8em',
        padding: '3px 8px',
        background: l.bg,
        color: l.fg,
        fontFamily: 'var(--sl-font-mono)',
        fontWeight: 600,
        fontSize: 'var(--sl-fs-2xs)',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      <span>{l.text}</span>
      {caveat ? <span aria-hidden>{'//'}</span> : null}
      {caveat ? <span>{caveat}</span> : null}
    </div>
  );
}

export interface TapeProps {
  width?: number;
  rotate?: number;
  style?: CSSProperties;
}

/** Pedaço de fita crepe semitransparente (para prender fotos/recortes). */
export function Tape({ width = 72, rotate = -4, style }: TapeProps) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width,
        height: 20,
        transform: `rotate(${rotate}deg)`,
        background: 'linear-gradient(180deg, rgba(232,220,190,0.78), rgba(214,200,165,0.72))',
        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
        clipPath: 'polygon(0 8%, 4% 0, 9% 10%, 14% 0, 100% 4%, 97% 50%, 100% 96%, 92% 100%, 86% 90%, 80% 100%, 0 94%, 3% 50%)',
        ...style,
      }}
    />
  );
}
