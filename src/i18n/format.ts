import type { Lang } from './types';

/** Número com separadores do idioma. */
export function num(lang: Lang, n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(lang, opts).format(n);
}

const trim = (lang: Lang, x: number, digits: number) =>
  num(lang, Number(x.toFixed(digits)), { maximumFractionDigits: digits });

const UNITS: Record<Lang, { k: string; m: string; b: string }> = {
  'pt-BR': { k: ' mil', m: ' mi', b: ' bi' },
  en: { k: 'K', m: 'M', b: 'B' },
};

/** pt-BR "US$ 1,2 mi" · en "$1.2M". Valores pequenos: "US$ 850" / "$850". */
export function money(lang: Lang, n: number): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  const u = UNITS[lang];
  const pre = lang === 'en' ? '$' : 'US$ ';
  if (a < 50) return `${pre}0`;
  let body: string;
  if (a >= 1e9) body = trim(lang, a / 1e9, 2) + u.b;
  else if (a >= 1e6) body = trim(lang, a / 1e6, a >= 1e8 ? 0 : 1) + u.m;
  else if (a >= 1e4) body = num(lang, Math.round(a / 1e3)) + u.k;
  else if (a >= 1e3) body = trim(lang, a / 1e3, 1) + u.k;
  else body = num(lang, Math.round(a));
  return sign + pre + body;
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
