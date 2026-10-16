import { describe, expect, it } from 'vitest';
import { denounce, formTeam, raidVault, sabotageStation } from '../actions';
import { addLot, lotId } from '../cargo';
import { finishCombat } from '../combatFlow';
import { PRESETS } from '../data/rules';
import { newGame, player, standing, stationIn } from '../state';
import { makeUnit } from '../units';

const game = () => {
  const s = newGame({ preset: PRESETS.find((p) => p.id === 'first-contract')!, difficulty: 2, hardcore: false, seed: 11 });
  const me = player(s);
  const rival = s.agencies.find((x) => !x.isPlayer)!;
  // The rival opens a Célula where the player is.
  rival.stations.push({ countryId: me.location, level: 2, units: [], founded: 0, vault: [], detained: [] });
  return { s, me, rival };
};

describe('Ações hostis entre agências', () => {
  it('existem rivais na partida', () => {
    const { s } = game();
    expect(s.agencies.length).toBeGreaterThan(1);
  });

  it('denúncia sobe a Exposição do alvo e custa caro', () => {
    const { s, me, rival } = game();
    const cash = me.cash;
    const before = standing(rival, me.location).exposure;
    expect(denounce(s, me, rival.id, me.location).ok).toBe(true);
    expect(standing(rival, me.location).exposure).toBeGreaterThan(before);
    expect(me.cash).toBeLessThan(cash);
  });

  it('sabotagem forte derruba um Nível da Estação rival', () => {
    const { s, me, rival } = game();
    const squad = Array.from({ length: 6 }, () => makeUnit(s, 'commando'));
    me.escort.push(...squad);
    expect(formTeam(s, me, 'escort', squad.map((u) => u.uid)).ok).toBe(true);
    const r = sabotageStation(s, me, me.teams[0].id, rival.id);
    expect(r.ok).toBe(true);
    if (s.combat) finishCombat(s);
    expect(stationIn(rival, me.location)?.level ?? 0).toBeLessThan(2);
  });

  it('assalto ao Cofre leva o conteúdo como itens capturados', () => {
    const { s, me, rival } = game();
    addLot(stationIn(rival, me.location)!.vault, lotId, 'intel', 2, 300_000);
    const squad = Array.from({ length: 6 }, () => makeUnit(s, 'commando'));
    me.escort.push(...squad);
    formTeam(s, me, 'escort', squad.map((u) => u.uid));
    expect(raidVault(s, me, me.teams[0].id, rival.id).ok).toBe(true);
    if (s.combat) finishCombat(s);
    expect(me.teams[0].spoils.some((l) => l.itemId === 'intel')).toBe(true);
  });
});
