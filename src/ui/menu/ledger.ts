// Linhas do livro-caixa que aparecem na abertura e no fundo do menu.
// Só códigos e números (ISO numérico do país, id do item, quantidade, valor): funcionam em qualquer idioma
// e vêm dos dados reais do jogo.

import { COUNTRY_SEEDS } from '../../game/data/countries';
import { ITEM_LIST } from '../../game/data/items';

export interface LedgerRow {
  date: string;
  route: string;
  item: string;
  qty: string;
  amount: string;
  /** Tarjas de censura, em colunas de caractere (ch) a partir do início da linha. */
  bars: { from: number; to: number }[];
}

/** Larguras das colunas em ch; a soma (com espaços) é LEDGER_CH. */
export const COLS = { date: 5, route: 11, item: 10, qty: 5, amount: 12 } as const;
const GAP = 2;
export const LEDGER_CH = COLS.date + COLS.route + COLS.item + COLS.qty + COLS.amount + GAP * 4;

const START = {
  route: COLS.date + GAP,
  item: COLS.date + COLS.route + GAP * 2,
  qty: COLS.date + COLS.route + COLS.item + GAP * 3,
  amount: COLS.date + COLS.route + COLS.item + COLS.qty + GAP * 4,
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOODS = ITEM_LIST.filter(
  (it) => (it.cls === 'arms' || it.cls === 'vehicle' || it.cls === 'special') && !['chem', 'bio', 'nuclear'].includes(it.id),
);

const fmtAmount = (v: number) => v.toLocaleString('de-DE');

export function ledgerRows(count: number, seed = 2031): LedgerRow[] {
  const r = rng(seed);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const rows: LedgerRow[] = [];
  let day = 1 + Math.floor(r() * 4);
  let month = 3;
  for (let i = 0; i < count; i++) {
    day += r() < 0.55 ? 0 : 1 + Math.floor(r() * 2);
    if (day > 30) {
      day -= 30;
      month += 1;
    }
    const a = pick(COUNTRY_SEEDS);
    let b = pick(COUNTRY_SEEDS);
    if (b.id === a.id) b = COUNTRY_SEEDS[(COUNTRY_SEEDS.indexOf(a) + 7) % COUNTRY_SEEDS.length];
    const good = pick(GOODS);
    const qty = good.cls === 'special' ? 1 + Math.floor(r() * 3) : 2 + Math.floor(r() * 60);
    const amount = Math.round((good.price * qty * (0.8 + r() * 0.7)) / 1000) * 1000;
    const kind = r();
    const bars =
      kind < 0.3
        ? [{ from: START.route - 0.5, to: START.route + COLS.route + 0.5 }]
        : kind < 0.55
          ? [{ from: START.item - 0.5, to: START.qty + COLS.qty + 0.5 }]
          : kind < 0.8
            ? [
                { from: START.route - 0.5, to: START.route + COLS.route + 0.5 },
                { from: START.amount - 0.5, to: LEDGER_CH + 0.5 },
              ]
            : [{ from: START.route - 0.5, to: LEDGER_CH + 0.5 }];
    rows.push({
      date: `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`,
      route: `${a.id} → ${b.id}`,
      item: good.id.toUpperCase(),
      qty: `×${qty}`,
      amount: fmtAmount(amount),
      bars,
    });
  }
  return rows;
}
