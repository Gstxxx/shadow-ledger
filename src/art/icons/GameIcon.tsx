import type { CSSProperties } from 'react';
import { ICONS } from './paths';

export type IconAccent = 'warm' | 'cold' | 'signal' | 'ok' | 'none' | (string & {});

export interface GameIconProps {
  /** id do item (src/game/data/items.ts) ou do sistema (ex.: 'station-office', 'tactic-hold'). */
  id: string;
  /** px; o traço afina sozinho em tamanhos grandes. */
  size?: number;
  /** cor do acento: token semântico ou qualquer cor CSS. Padrão: 'warm'. */
  accent?: IconAccent;
  /** força ou esconde a camada de detalhe (padrão: automático a partir de 40px). */
  detail?: boolean;
  /** texto acessível; sem ele o ícone é decorativo (aria-hidden). */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const accentValue = (a: IconAccent): string => {
  switch (a) {
    case 'warm':
    case 'cold':
    case 'signal':
    case 'ok':
      return `var(--sl-${a})`;
    case 'none':
      return 'currentColor';
    default:
      return a;
  }
};

/** Espessura do traço em unidades do viewBox: 1.75 até 24px, afinando até ~1.2 a 96px. */
export const iconStrokeWidth = (size: number) => (size <= 24 ? 1.75 : Math.max(1.2, 1.75 - (size - 24) * 0.0075));

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Markup interno de um ícone (sem o <svg>), ou '' se o id não existir. */
export const iconInner = (id: string, withDetail: boolean) => {
  const def = ICONS[id];
  if (!def) return '';
  return def.base + (withDetail && def.detail ? def.detail : '');
};

/**
 * SVG completo como string (para canvas, d3, favicon, `<img src=data:...>`).
 * Cores literais porque fora do DOM não há variáveis CSS.
 */
export const iconSvgString = (id: string, opts: { size?: number; color?: string; accent?: string; detail?: boolean } = {}) => {
  const size = opts.size ?? 24;
  const color = opts.color ?? '#dde3e9';
  const accent = opts.accent ?? '#f5b04a';
  const inner = iconInner(id, opts.detail ?? size >= 40).replace(/var\(--sl-icon-accent,currentColor\)/g, accent).replace(/var\(--sl-bg,#0b0e12\)/g, '#0b0e12');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" color="${color}" stroke-width="${iconStrokeWidth(size)}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
};

export function GameIcon({ id, size = 24, accent = 'warm', detail, title, className, style }: GameIconProps) {
  const inner = iconInner(id, detail ?? size >= 40) || '<path d="M5 5h14v14H5zM5 5l14 14" opacity=".5"/>';
  const label = title ?? undefined;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={iconStrokeWidth(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      style={{ flex: 'none', ['--sl-icon-accent' as string]: accentValue(accent), ...style }}
      dangerouslySetInnerHTML={{ __html: (label ? `<title>${esc(label)}</title>` : '') + inner }}
    />
  );
}
