/**
 * Shadow Ledger — tokens para uso em TS (canvas, WebGL, d3, GSAP).
 * Valores crus espelham tokens.css; para DOM prefira `cssVar`, que respeita temas.
 */

export const palette = {
  ink950: '#07090b',
  ink900: '#0b0e12',
  ink850: '#10141a',
  ink800: '#151a21',
  ink700: '#1e252e',
  ink600: '#2a333e',
  ink500: '#3b4552',
  ink400: '#5a6675',
  ink300: '#8a95a3',
  ink200: '#b7c0ca',
  ink100: '#dde3e9',
  paper100: '#efe7d6',
  paper200: '#e2d6bd',
  paper300: '#cdbd9c',
  paper600: '#6b5a3e',
  paper800: '#3a2f1f',
  paper900: '#241c11',
  amber300: '#ffcf7a',
  amber400: '#f5b04a',
  amber500: '#e5952a',
  amber700: '#8f5814',
  signal300: '#ff8f86',
  signal400: '#ff5f56',
  signal500: '#e5372f',
  signal700: '#8e1d18',
  radar200: '#a8fbff',
  radar300: '#6ef0f5',
  radar400: '#33d6e0',
  radar600: '#13838c',
  radar800: '#0a3a40',
  ok400: '#6fdc8c',
  ok700: '#1f6b3a',
  stampRed: '#b3261e',
  stampBlue: '#1f4e8c',
  redact: '#0a0a0a',
} as const;

export const color = {
  bg: palette.ink900,
  bgDeep: palette.ink950,
  surface: palette.ink850,
  surfaceRaised: palette.ink800,
  text: palette.ink100,
  textMuted: palette.ink300,
  warm: palette.amber400,
  signal: palette.signal400,
  cold: palette.radar300,
  ok: palette.ok400,
  paper: palette.paper100,
  paperInk: palette.paper900,
  stamp: palette.stampRed,
} as const;

export const font = {
  display: "'Barlow Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif",
  body: "'IBM Plex Sans', system-ui, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace",
  type: "'Special Elite', 'Courier New', ui-monospace, monospace",
} as const;

export const fontSize = { '2xs': 11, xs: 12, sm: 14, md: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 44, '4xl': 64 } as const;
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radius = { 0: 0, 1: 2, 2: 4, 3: 8, round: 999 } as const;
export const touch = 44;

/** Durações em ms e curvas (cubic-bezier) — também como strings GSAP-compatíveis. */
export const motion = {
  dur: { instant: 80, fast: 140, base: 220, slow: 380, scene: 700 },
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.55, 0, 0.75, 0.2)',
    inout: 'cubic-bezier(0.65, 0, 0.35, 1)',
    stamp: 'cubic-bezier(0.2, 1.6, 0.4, 1)',
  },
  /** Equivalentes aproximados para GSAP (`ease:`). */
  gsap: { out: 'expo.out', in: 'power3.in', inout: 'power3.inOut', stamp: 'back.out(2.2)' },
} as const;

export const z = { backdrop: 0, map: 10, hud: 100, drawer: 200, modal: 300, toast: 400 } as const;

/** Referência a um token CSS semântico (`cssVar('warm')` → `var(--sl-warm)`). */
export const cssVar = (name: string) => `var(--sl-${name})`;

/** true se o usuário pediu menos movimento (seguro em SSR). */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Heurística barata para aparelhos fracos / tela pequena: usar fallback estático. */
export const prefersLiteRendering = (): boolean => {
  if (typeof window === 'undefined') return true;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return true;
  if ((nav.hardwareConcurrency ?? 8) <= 2) return true;
  return false;
};

/** Converte '#rrggbb' em [r,g,b] 0..1 (para shaders). */
export const hexToRgb01 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
