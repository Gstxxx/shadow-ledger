/** US$ 12,4 mi / US$ 850 mil / US$ 1.200 */
export function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}US$ ${(a / 1e9).toFixed(2).replace('.', ',')} bi`;
  if (a >= 1e6) return `${sign}US$ ${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',')} mi`;
  if (a >= 1e4) return `${sign}US$ ${Math.round(a / 1e3)} mil`;
  if (a < 50) return 'US$ 0';
  return `${sign}US$ ${(a / 1e3).toFixed(1).replace('.', ',')} mil`;
}

export const moneyFull = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const tons = (t: number) => `${t.toFixed(t < 10 ? 1 : 0).replace('.', ',')} t`;

/** Compact amount without the currency prefix, for tables headed in US$. */
export const amount = (n: number) => money(n).replace('US$ ', '');
