/** Valor completo: US$ 12.400.000 / US$ 850.000 / US$ 1.200 */
export function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}US$ ${Math.round(Math.abs(n)).toLocaleString('pt-BR')}`;
}

export const moneyFull = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const tons = (t: number) => `${t.toFixed(t < 10 ? 1 : 0).replace('.', ',')} t`;

/** Compact amount without the currency prefix, for tables headed in US$. */
export const amount = (n: number) => money(n).replace('US$ ', '');
