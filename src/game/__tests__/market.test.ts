import { describe, expect, it } from 'vitest';
import { buy, sell } from '../actions';
import { midPrice, quoteBuy, quoteSell, recoverSaturation, SATURATION_LIMIT } from '../market';
import { newGame, player } from '../state';
import { PRESETS } from '../data/rules';
import { cargoQty } from '../cargo';

const game = () => newGame({ preset: PRESETS.find((p) => p.id === 'first-contract')!, difficulty: 2, hardcore: false, seed: 42 });

describe('Saturação', () => {
  it('vender empurra o preço local para baixo e cada unidade sai mais barata', () => {
    const s = game();
    const c = s.countries[player(s).location];
    const item = c.stock.find((id) => quoteSell(c, id, 1).total > 0)!;
    const one = quoteSell(c, item, 1);
    const ten = quoteSell(c, item, 10);
    expect(ten.total).toBeLessThan(one.total * 10);
    expect(ten.after).toBeLessThan(0);
  });

  it('comprar empurra o preço para cima', () => {
    const s = game();
    const c = s.countries[player(s).location];
    const item = c.stock[0];
    const before = midPrice(c, item);
    const q = quoteBuy(c, item, 5);
    c.saturation[item] = q.after;
    expect(midPrice(c, item)).toBeGreaterThan(before);
  });

  it('a Saturação se dissipa com o tempo', () => {
    const s = game();
    const c = s.countries[player(s).location];
    c.saturation.rifles = -0.4;
    recoverSaturation(c, 24);
    const after1 = c.saturation.rifles;
    expect(after1).toBeGreaterThan(-0.4);
    recoverSaturation(c, 24 * 60);
    expect(c.saturation.rifles ?? 0).toBeCloseTo(0, 2);
  });

  it('a Saturação é limitada', () => {
    const s = game();
    const c = s.countries[player(s).location];
    const q = quoteSell(c, 'rifles', 500);
    expect(q.after).toBeGreaterThanOrEqual(-SATURATION_LIMIT);
  });

  it('comprar e revender na hora no mesmo país dá prejuízo (spread + Saturação)', () => {
    const s = game();
    const c = s.countries[player(s).location];
    const item = c.stock.find((id) => id === 'rifles' || id === 'mg' || id === 'thug') ?? c.stock[0];
    const a = player(s);
    const cash0 = a.cash;
    const r = buy(s, a, item, 3);
    expect(r.ok).toBe(true);
    expect(cargoQty(a, item)).toBe(3);
    const r2 = sell(s, a, item, 3);
    expect(r2.ok).toBe(true);
    expect(a.cash).toBeLessThan(cash0);
  });
});
