import type { Lang } from './types';

/** Número com separadores do idioma. */
export function num(lang: Lang, n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(lang, opts).format(n);
}

/** Sempre o valor completo: pt-BR "US$ 1.250.000" · en "$1,250,000". */
export function money(lang: Lang, n: number): string {
  return moneyFull(lang, n);
}

/** Valor completo: "US$ 1.234.567" / "$1,234,567". */
export function moneyFull(lang: Lang, n: number): string {
  const body = num(lang, Math.round(Math.abs(n)));
  return `${n < 0 ? '−' : ''}${lang === 'en' ? '$' : 'US$ '}${body}`;
}

/** Valor compacto sem o prefixo de moeda (tabelas já intituladas). */
export const amount = (lang: Lang, n: number) => money(lang, n).replace(/^(−?)(US\$ |\$)/, '$1');

export const pct = (lang: Lang, v: number) => num(lang, Math.round(v * 100)) + '%';

export const tons = (lang: Lang, t: number) =>
  `${num(lang, Number(t.toFixed(t < 10 ? 1 : 0)), { maximumFractionDigits: 1 })} t`;

export function date(lang: Lang, ms: number, style: 'short' | 'long' = 'short'): string {
  try {
    return new Intl.DateTimeFormat(
      lang,
      style === 'long' ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' },
    ).format(ms);
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }
}
