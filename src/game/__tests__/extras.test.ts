import { describe, expect, it } from 'vitest';
import { startOperation } from '../actions';
import { abortLive, canAbortLive, chooseTactic, finishCombat } from '../combatFlow';
import { PRESETS } from '../data/rules';
import { tradeOpportunities } from '../opportunities';
import { allUnits, assets, newGame, player, profit } from '../state';
import { openStation } from '../actions';
import { isPersonnel, makeUnit } from '../units';

const preset = PRESETS.find((p) => p.id === 'first-contract')!;
const game = (seed = 3) => newGame({ preset, difficulty: 2, hardcore: false, seed });

describe('Pessoal', () => {
  it('nomes são únicos entre todo o Pessoal vivo da partida', () => {
    const s = game();
    const a = player(s);
    for (let i = 0; i < 300; i++) a.escort.push(makeUnit(s, 'bodyguard'));
    const names = s.agencies.flatMap((x) => allUnits(x)).filter(isPersonnel).map((u) => u.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('Estações', () => {
  it('abrir uma Célula não derruba o Lucro', () => {
    const s = game();
    const a = player(s);
    const before = profit(a);
    expect(openStation(s, a).ok || a.stations.some((x) => x.countryId === a.location)).toBe(true);
    expect(profit(a)).toBeGreaterThanOrEqual(before - 1);
    expect(assets(a)).toBeGreaterThan(0);
  });
});

describe('Oportunidades de comércio', () => {
  it('só usam preços conhecidos e têm margem positiva', () => {
    const s = game();
    const a = player(s);
    const ops = tradeOpportunities(s, a);
    for (const o of ops) {
      expect(o.sellPrice).toBeGreaterThan(o.buyPrice);
      expect(o.margin).toBeGreaterThan(0);
      expect(Number.isFinite(o.hoursToSell)).toBe(true);
    }
  });
});

describe('Abortar Combate', () => {
  it('uma Operação pode ser abortada na grade antes do primeiro turno', () => {
    const s = game();
    const a = player(s);
    expect(startOperation(s, a, 'bank').ok).toBe(true);
    expect(chooseTactic(s, 'assault', true)).toBe(true);
    expect(canAbortLive(s)).toBe(true);
    const escort = a.escort.length;
    expect(abortLive(s)).toBe(true);
    expect(s.combat).toBeUndefined();
    expect(a.escort.length).toBe(escort);
    expect(a.escort.every((u) => !u.injury)).toBe(true);
  });

  it('depois do primeiro turno não dá mais', () => {
    const s = game();
    const a = player(s);
    startOperation(s, a, 'bank');
    chooseTactic(s, 'assault', false);
    s.combat!.turn = 1;
    expect(canAbortLive(s)).toBe(false);
    finishCombat(s);
  });
});

describe('Capacidade da Estação', () => {
  it('Unidades acima do limite (ex.: devolvidas por fim de Interdição) saem como Equipe', async () => {
    const { liftInterdiction } = await import('../combatFlow');
    const s = game();
    const a = player(s);
    a.stations.push({ countryId: '076', level: 1, units: [], founded: 0, vault: [], detained: [], interdicted: { fine: 1, since: 0 } });
    const st = a.stations[a.stations.length - 1];
    for (let i = 0; i < 4; i++) st.detained.push(makeUnit(s, 'bodyguard'));
    st.detained.push(makeUnit(s, 'technical'));
    liftInterdiction(s, a, '076');
    expect(st.units.length).toBeLessThanOrEqual(2);
    const team = a.teams.find((t) => t.location === '076');
    expect(team?.units.length).toBe(3);
  });
});

describe('Contratos de comércio', () => {
  it('cabem na Frota do jogador', async () => {
    const { advance } = await import('../sim');
    const { maxCargo } = await import('../market');
    const { ITEMS } = await import('../data/items');
    const s = game(5);
    for (let d = 0; d < 60; d++) {
      s.events = [];
      s.pendingCombat = undefined;
      s.combat = undefined;
      advance(s, 24);
    }
    const hold = Math.max(4, maxCargo(player(s)));
    for (const k of s.contracts) expect(ITEMS[k.itemId].weight * k.qty).toBeLessThanOrEqual(hold + 1e-6);
  });
});
