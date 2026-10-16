import type { CSSProperties } from 'react';
import { palette } from './tokens';

/*
 * Monograma: um "S" de estêncil feito de três linhas de livro-razão.
 * A linha do meio (âmbar) é o lançamento marcado; o ponto ciano é o contato de radar.
 * Só caminhos — não depende de fonte, então serve para ícone de app e favicon.
 */
const markInner = (ink: string, warm: string, cold: string) =>
  // S de estêncil, área 28..72 × 18..82; pontes de 1.4 entre barras e hastes
  `<path d="M28 18h38l6 6v7H28z" fill="${ink}"/>` +
  `<path d="M28 32.4h13v10.2H28z" fill="${ink}"/>` +
  `<path d="M28 44h44v12H28z" fill="${warm}"/>` +
  `<path d="M59 57.4h13v10.2H59z" fill="${ink}"/>` +
  `<path d="M34 69h38v13H28v-7z" fill="${ink}"/>` +
  `<circle cx="80" cy="14" r="4.2" fill="${cold}"/>` +
  `<circle cx="80" cy="14" r="8.5" fill="none" stroke="${cold}" stroke-opacity=".45" stroke-width="1.6"/>`;

export interface MonogramProps {
  size?: number;
  /** cor do traço principal (padrão: texto) */
  ink?: string;
  warm?: string;
  cold?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function Monogram({
  size = 48,
  ink = 'var(--sl-text)',
  warm = 'var(--sl-warm)',
  cold = 'var(--sl-cold)',
  title = 'Shadow Ledger',
  className,
  style,
}: MonogramProps) {
  return (
    <svg
      viewBox="18 3 74 84"
      width={size}
      height={(size * 84) / 74}
      role="img"
      aria-label={title}
      className={className}
      style={{ flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: markInner(ink, warm, cold) }}
    />
  );
}

export type LogoVariant = 'full' | 'horizontal' | 'compact' | 'mark';

export interface LogoProps {
  variant?: LogoVariant;
  /** altura de referência em px (o monograma ocupa essa altura) */
  height?: number;
  /** linha de apoio abaixo do nome (só `full`) */
  tagline?: string | false;
  className?: string;
  style?: CSSProperties;
}

const display: CSSProperties = {
  fontFamily: 'var(--sl-font-display)',
  fontWeight: 700,
  textTransform: 'uppercase',
  lineHeight: 0.86,
  color: 'var(--sl-text)',
  whiteSpace: 'nowrap',
};

/** Logo SHADOW LEDGER. `full` = empilhado com tagline; `horizontal` = uma linha; `compact` = HUD; `mark` = só monograma. */
export function Logo({ variant = 'full', height = 64, tagline = 'Private Intelligence · Arms · Leverage', className, style }: LogoProps) {
  if (variant === 'mark') return <Monogram size={height * 0.93} className={className} style={style} />;

  if (variant === 'compact') {
    return (
      <span role="img" aria-label="Shadow Ledger" className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.28, ...style }}>
        <Monogram size={height * 0.86} title="" />
        <span aria-hidden style={{ ...display, fontSize: height * 0.62, letterSpacing: '0.08em' }}>
          Shadow<span style={{ color: 'var(--sl-warm)', margin: '0 0.18em' }}>/</span>Ledger
        </span>
      </span>
    );
  }

  if (variant === 'horizontal') {
    return (
      <span role="img" aria-label="Shadow Ledger" className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.32, ...style }}>
        <Monogram size={height * 0.9} title="" />
        <span aria-hidden style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.32em', ...display, fontSize: height * 0.72, letterSpacing: '0.1em' }}>
          <span>Shadow</span>
          <span style={{ position: 'relative', color: 'var(--sl-text)' }}>
            Ledger
            <span style={{ position: 'absolute', left: 0, right: '0.1em', bottom: '-0.16em', height: Math.max(2, height * 0.05), background: 'var(--sl-warm)' }} />
          </span>
        </span>
      </span>
    );
  }

  // full
  const h = height;
  return (
    <span role="img" aria-label="Shadow Ledger" className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: h * 0.3, ...style }}>
      <Monogram size={h * 1.25} title="" />
      <span aria-hidden style={{ display: 'inline-flex', flexDirection: 'column', gap: h * 0.08 }}>
        <span style={{ ...display, fontSize: h * 0.78, letterSpacing: '0.12em' }}>Shadow</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: h * 0.14 }}>
          <span style={{ ...display, fontSize: h * 0.78, letterSpacing: '0.12em', color: 'var(--sl-warm)' }}>Ledger</span>
          <span style={{ flex: 1, minWidth: h * 0.4, height: Math.max(1, h * 0.03), background: 'var(--sl-line-strong)' }} />
        </span>
        {tagline ? (
          <span
            style={{
              fontFamily: 'var(--sl-font-mono)',
              fontSize: Math.max(10, h * 0.16),
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--sl-text-muted)',
              marginTop: h * 0.04,
              whiteSpace: 'nowrap',
            }}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * Ícone de app para o manifest PWA / favicon, como string SVG autônoma.
 * `maskable` mantém o monograma dentro da zona segura (80%) e preenche o quadro todo.
 */
export function appIconSvg(size: 512 | 192 | number = 512, opts: { maskable?: boolean } = {}): string {
  const p = palette;
  const scale = opts.maskable ? 0.56 : 0.66;
  const s = (100 * scale) / 74; // monograma em unidades 0..100 do ícone
  const tx = 50 - 51 * s; // centro óptico do S (sem o ponto de radar)
  const ty = 50 - 50 * s;
  const radius = opts.maskable ? 0 : 22;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
    `<defs>` +
    `<radialGradient id="g" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="${p.ink700}"/><stop offset=".65" stop-color="${p.ink900}"/><stop offset="1" stop-color="${p.ink950}"/></radialGradient>` +
    `<clipPath id="c"><rect width="100" height="100" rx="${radius}"/></clipPath>` +
    `</defs>` +
    `<g clip-path="url(#c)">` +
    `<rect width="100" height="100" fill="url(#g)"/>` +
    `<g fill="none" stroke="${p.radar300}" stroke-opacity=".10" stroke-width=".5">` +
    `<circle cx="50" cy="50" r="18"/><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="46"/>` +
    `<path d="M50 0v100M0 50h100"/>` +
    `</g>` +
    `<path d="M50 50 L50 4 A46 46 0 0 1 82.5 17.5 Z" fill="${p.radar300}" fill-opacity=".06"/>` +
    `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})">${markInner(p.ink100, p.amber400, p.radar300)}</g>` +
    (opts.maskable ? '' : `<rect x=".5" y=".5" width="99" height="99" rx="${radius - 0.5}" fill="none" stroke="#fff" stroke-opacity=".06"/>`) +
    `</g></svg>`
  );
}

/** `data:` URL do ícone de app (para <link rel="icon">, manifest gerado em runtime etc.). */
export const appIconDataUrl = (size: 512 | 192 | number = 512, opts: { maskable?: boolean } = {}) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(appIconSvg(size, opts))}`;
