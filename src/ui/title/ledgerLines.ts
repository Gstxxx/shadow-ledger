import { COUNTRY_SEEDS } from '../../game/data/countries';
import { ITEM_LIST } from '../../game/data/items';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const r = (n: number) => Math.floor(Math.random() * n);
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s + ' '.repeat(n - s.length));

/** A fictional ledger entry, built from the game's own countries and catalog. */
export function ledgerLine(): string {
  const c = COUNTRY_SEEDS[r(COUNTRY_SEEDS.length)];
  const it = ITEM_LIST.filter((x) => x.tradable && !x.wmd)[r(30)] ?? ITEM_LIST[0];
  const qty = 1 + r(40);
  const value = (it.price * qty * (0.8 + Math.random() * 0.6)) / 1_000_000;
  const time = `${String(r(24)).padStart(2, '0')}${String(r(60)).padStart(2, '0')}Z`;
  const date = `${String(1 + r(28)).padStart(2, '0')} ${MONTHS[r(12)]}`;
  const flow = Math.random() < 0.5 ? 'ENTRADA' : 'SAÍDA  ';
  return `${time}  ${date}  ${pad(c.name.toUpperCase(), 16)} ${flow}  ${pad(`${qty}× ${it.name.toUpperCase()}`, 38)} US$ ${value.toFixed(2).replace('.', ',')} MI`;
}
