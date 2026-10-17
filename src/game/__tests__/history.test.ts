import { describe, expect, it } from 'vitest';
import { buy, openStation, sell, travel } from '../actions';
import { PRESETS } from '../data/rules';
import { HISTORY_DAYS, historyOf, priceHistory, worldAverageHistory } from '../history';
import { loadSave } from '../save';
import { advance } from '../sim';
import { newGame, player } from '../state';

const preset = { ...PRESETS.find((p) => p.id === 'first-contract')!, days: 0 };
const game = (seed = 12) => newGame({ preset, difficulty: 2, hardcore: false, seed });

function play(days: number, seed = 12) {
  const s = game(seed);
  const a = player(s);
  for (let d = 0; d < days; d++) {
    s.events = [];
    s.pendingCombat = undefined;
    s.combat = undefined;
    if (d === 2) {
      const item = s.countries[a.location].stock[0];
      buy(s, a, item, 2);
      sell(s, a, item, 2);
    }
    if (d === 5) travel(s, a, '484');
    if (d === 10) openStation(s, a);
    advance(s, 24);
  }
  return s;
}

describe('Histórico de preços', () => {
  it('amostra diária onde há informação, com compra e venda do ponto de vista do jogador', () => {
    const s = play(20);
    const a = player(s);
    const item = s.countries[a.location].stock[0];
    const pts = priceHistory(s, a.location, item);
    expect(pts.length).toBeGreaterThan(5);
    for (const p of pts) {
      expect(p.buy).toBeGreaterThan(0);
      if (p.sell) expect(p.sell).toBeLessThan(p.buy);
    }
    for (let i = 1; i < pts.length; i++) expect(pts[i].day).toBeGreaterThan(pts[i - 1].day);
  });

  it('registra o Comércio do jogador como evento que explica picos', () => {
    const s = play(5);
    const ev = historyOf(s).events;
    expect(ev.some((e) => e.kind === 'playerBuy')).toBe(true);
    expect(ev.some((e) => e.kind === 'playerSell')).toBe(true);
  });

  it('guarda no máximo 60 dias e o save não cresce demais', () => {
    const s = play(200);
    const h = historyOf(s);
    for (const ser of Object.values(h.series)) {
      expect(ser.d.length).toBeLessThanOrEqual(HISTORY_DAYS);
      expect(ser.d[ser.d.length - 1] - ser.d[0]).toBeLessThan(HISTORY_DAYS);
    }
    const bytes = JSON.stringify(h).length;
    // Algumas Estações e o país do Diretor, ~20 itens cada: dezenas de KB, não MB.
    expect(bytes).toBeLessThan(120_000);
  });

  it('média mundial conhecida por dia', () => {
    const s = play(15);
    const a = player(s);
    const item = s.countries[a.location].stock[0];
    const avg = worldAverageHistory(s, item);
    expect(avg.length).toBeGreaterThan(0);
    expect(avg.every((x) => x.mid > 0 && x.countries >= 1)).toBe(true);
  });

  it('saves antigos ganham histórico vazio', () => {
    const s = game() as unknown as Record<string, unknown>;
    s.saveVersion = 5;
    delete s.priceHistory;
    expect(loadSave(JSON.stringify(s))?.priceHistory).toEqual({ series: {}, events: [] });
  });
});
