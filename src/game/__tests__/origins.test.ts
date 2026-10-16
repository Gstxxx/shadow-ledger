import { describe, expect, it } from 'vitest';
import { buy, stationCost } from '../actions';
import { autoDeploy, createCombat, estimateWin } from '../combat';
import { beginCombat } from '../combatFlow';
import { ORIGINS, originMods } from '../data/origins';
import { PRESETS } from '../data/rules';
import { buildForce } from '../forces';
import { fleetSpeed, maxCargo, quoteBuyFor, quoteSellFor } from '../market';
import { loadSave } from '../save';
import { addExposure, addReputation, intelCountries, newGame, player, standing } from '../state';
import type { OriginId } from '../types';
import { def } from '../units';

const preset = PRESETS.find((p) => p.id === 'first-contract')!;
const game = (origin?: OriginId, seed = 8) => newGame({ preset, difficulty: 2, hardcore: false, seed, origin, rivals: 0 });

describe('Origens do Diretor', () => {
  it('são seis, com Vantagem e Desvantagem', () => {
    expect(ORIGINS).toHaveLength(6);
    for (const o of ORIGINS) {
      expect(o.advantage.length).toBeGreaterThan(10);
      expect(o.disadvantage.length).toBeGreaterThan(10);
    }
  });

  it('a Origem fica na agência; sem escolha é neutra; no Tutorial é Contrabandista', () => {
    expect(player(game('colonel')).origin).toBe('colonel');
    expect(player(game()).origin).toBe('none');
    const tut = newGame({ preset: PRESETS.find((p) => p.id === 'tutorial')!, difficulty: 1, hardcore: false, seed: 1 });
    expect(player(tut).origin).toBe('smuggler');
  });

  it('Ex-Agente: menos Exposição em Operações e Reputação −10 nos países nível 5', () => {
    const base = game();
    const ex = game('exagent');
    const l5 = Object.values(ex.countries).find((c) => c.level === 5 && c.id !== preset.startCountry)!;
    expect(standing(player(ex), l5.id).reputation).toBe(standing(player(base), l5.id).reputation - 10);
    const c = Object.values(ex.countries).find((x) => x.politics !== 'peace')!.id;
    addExposure(ex, player(ex), c, 40, true);
    expect(standing(player(ex), c).exposure).toBeCloseTo(30, 5);
  });

  it('Banqueira: vende 4% mais caro, Estação 10% mais barata e uma Unidade a menos', () => {
    const b = game('banker');
    const n = game();
    const c = b.countries[player(b).location];
    const item = c.stock.find((id) => quoteSellFor(player(n), c, id, 1).total > 0)!;
    expect(quoteSellFor(player(b), c, item, 1).total).toBeGreaterThan(quoteSellFor(player(n), c, item, 1).total);
    expect(stationCost(player(b), c.id, 1)).toBeLessThan(stationCost(player(n), c.id, 1));
    expect(player(b).escort.length).toBe(player(n).escort.length - 1);
  });

  it('Coronel: veículos 10% mais baratos e mais Exposição em países em Paz', () => {
    const col = game('colonel');
    const n = game();
    const c = col.countries[player(col).location];
    const veh = c.stock.find((id) => def(id).cls === 'vehicle');
    if (veh) expect(quoteBuyFor(player(col), c, veh, 1).total).toBeLessThan(quoteBuyFor(player(n), c, veh, 1).total);
    const peace = Object.values(col.countries).find((x) => x.politics === 'peace')!.id;
    standing(player(col), peace).exposure = 0;
    addExposure(col, player(col), peace, 20);
    expect(standing(player(col), peace).exposure).toBeCloseTo(23, 5);
    expect(buy(col, player(col), c.stock[0], 1).ok).toBe(true);
  });

  it('Diplomata: Reputação sobe 50% mais rápido; quedas não mudam', () => {
    const d = game('diplomat');
    const a = player(d);
    const id = Object.keys(d.countries)[3];
    const r0 = standing(a, id).reputation;
    addReputation(a, id, 10);
    expect(standing(a, id).reputation).toBeCloseTo(r0 + 15, 5);
    addReputation(a, id, -10);
    expect(standing(a, id).reputation).toBeCloseTo(r0 + 5, 5);
  });

  it('Contrabandista: Frota maior e mais rápida, menos Saturação', () => {
    const sm = game('smuggler');
    const n = game();
    expect(maxCargo(player(sm))).toBeCloseTo(maxCargo(player(n)) * 1.2, 5);
    expect(fleetSpeed(player(sm))).toBeGreaterThan(fleetSpeed(player(n)));
    const c = sm.countries[player(sm).location];
    const item = c.stock.find((id) => quoteSellFor(player(n), c, id, 5).total > 0)!;
    expect(quoteSellFor(player(sm), c, item, 5).after).toBeGreaterThan(quoteSellFor(player(n), c, item, 5).after);
  });

  it('Analista de Sinais: vê vizinhos das Estações, Prévia com margem e Escolta sem combatentes', () => {
    const an = game('analyst');
    const n = game();
    expect(intelCountries(player(an)).size).toBeGreaterThan(intelCountries(player(n)).size);
    const classes = player(an).escort.map((u) => def(u.itemId).cls);
    expect(classes.every((c) => c === 'lawyer' || c === 'influence')).toBe(true);
    const a = player(an);
    beginCombat(an, a, {
      type: 'legal',
      reason: { kind: 'appeal', countryId: a.location },
      title: 't',
      enemy: buildForce(an, 'court', 6, 'legal'),
      sources: [{ kind: 'escort' }],
      playerDefends: false,
      directorPresent: true,
    });
    expect(an.pendingCombat?.margin).toBeDefined();
  });

  it('Força da Origem entra no Combate (Ex-Agente +1 Urbano vence mais)', () => {
    const ctx = { rng: 3, uidCounter: 0 };
    const ex = game('exagent');
    const units = player(ex).escort;
    const enemy = buildForce(ctx, 'police', 6, 'urban');
    const setup = {
      agencyId: 'player',
      type: 'urban' as const,
      reason: { kind: 'operation' as const, op: 'bank' as const, countryId: '840', by: 'director' },
      title: 't',
      player: units,
      enemy,
      playerDefends: false,
      sources: [{ kind: 'escort' as const }],
      directorPresent: true,
    };
    const plain = estimateWin(setup, 'assault', 5, 200);
    const boosted = estimateWin({ ...setup, originBonus: { all: originMods(player(ex)).strength?.urban ?? 0, military: 0 } }, 'assault', 5, 200);
    expect(boosted).toBeGreaterThanOrEqual(plain);
    const c = createCombat(ctx, { ...setup, tactic: 'assault', originBonus: { all: 1, military: 0 } });
    autoDeploy(c);
    expect(c.originBonus?.all).toBe(1);
  });

  it('saves antigos ganham a Origem neutra', () => {
    const s = game() as unknown as Record<string, unknown>;
    s.saveVersion = 4;
    for (const a of s.agencies as Record<string, unknown>[]) delete a.origin;
    const loaded = loadSave(JSON.stringify(s));
    expect(loaded?.agencies.every((a) => a.origin === 'none')).toBe(true);
  });
});
