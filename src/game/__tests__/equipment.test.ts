import { describe, expect, it } from 'vitest';
import { GEAR } from '../data/equipment';
import { arsenalOffer, buyGear, equipBonus, equipGear, gearStock } from '../equipment';
import { unitStrength } from '../strength';
import { strOf } from '../units';
import { PRESETS } from '../data/rules';
import { allUnits, newGame, player } from '../state';
import { isPersonnel } from '../units';

const game = () => newGame({ preset: PRESETS[0], difficulty: 2, hardcore: false, seed: 7 } as never);
const person = (a: ReturnType<typeof player>) => allUnits(a).find(isPersonnel)!;

describe('Equipamento e Arsenal', () => {
  it('soma força por tipo de Combate, só no tipo do bônus, pelo gancho de força', () => {
    const s = game();
    const a = player(s);
    const u = person(a);
    expect(equipBonus(u, 'urban')).toBe(0);
    u.gear = { weapon: 'carbine', armor: 'plate' };
    expect(equipBonus(u, 'army')).toBe(GEAR.carbine.bonus.army! + GEAR.plate.bonus.army!);
    expect(equipBonus(u, 'legal')).toBe(0);
    if (strOf(u, 'urban') > 0) expect(unitStrength(u, 'urban')).toBe(strOf(u, 'urban') + equipBonus(u, 'urban'));
  });

  it('país em guerra vende mais e mais barato', () => {
    const s = game();
    const c = Object.values(s.countries).find((x) => x.level <= 2)!;
    const peace = arsenalOffer({ ...c, politics: 'peace' });
    const war = arsenalOffer({ ...c, politics: 'war' });
    expect(war.length).toBeGreaterThan(peace.length);
    expect(war.find((o) => o.def.id === 'pistol')!.price).toBeLessThan(peace.find((o) => o.def.id === 'pistol')!.price);
  });

  it('compra vai para o estoque; equipar e tirar movem entre estoque e slot', () => {
    const s = game();
    const a = player(s);
    const u = person(a);
    const cash = a.cash;
    expect(buyGear(s, a, 'pistol').ok).toBe(true);
    expect(a.cash).toBeLessThan(cash);
    expect(gearStock(a, 'pistol')).toBe(1);
    expect(equipGear(a, u.uid, 'weapon', 'pistol').ok).toBe(true);
    expect(u.gear?.weapon).toBe('pistol');
    expect(gearStock(a, 'pistol')).toBe(0);
    expect(equipGear(a, u.uid, 'armor', 'pistol').ok).toBe(false);
    expect(equipGear(a, u.uid, 'weapon', null).ok).toBe(true);
    expect(gearStock(a, 'pistol')).toBe(1);
  });
});

describe('Arsenal: catálogo e restrições', () => {
  it('tem 24 itens, 8 por slot, e cobre os 4 tipos de Combate', async () => {
    const { GEAR_IDS, GEAR } = await import('../data/equipment');
    expect(GEAR_IDS.length).toBe(24);
    for (const slot of ['weapon', 'armor', 'kit']) expect(GEAR_IDS.filter((id) => GEAR[id].slot === slot).length).toBe(8);
    for (const ty of ['legal', 'urban', 'army', 'air'] as const) expect(GEAR_IDS.filter((id) => GEAR[id].bonus[ty]).length).toBeGreaterThanOrEqual(4);
    // faixa do balanceamento: ≤ 300 mil e ~30 mil por ponto (± folga)
    for (const id of GEAR_IDS) {
      const pts = Object.values(GEAR[id].bonus).reduce((a, b) => a + (b ?? 0), 0);
      expect(GEAR[id].price).toBeLessThanOrEqual(300_000);
      expect(GEAR[id].price / pts).toBeGreaterThanOrEqual(25_000);
      expect(GEAR[id].price / pts).toBeLessThanOrEqual(100_000);
    }
  });

  it('armamento pesado só no fim do jogo; região e Nível limitam a oferta', () => {
    const s = game();
    const c = Object.values(s.countries)[0];
    const war = { ...c, politics: 'war' as const, level: 5, continent: 'EU' as const };
    expect(arsenalOffer(war, 5).some((o) => o.def.id === 'lmg')).toBe(false);
    expect(arsenalOffer(war, 40).some((o) => o.def.id === 'lmg')).toBe(true);
    expect(arsenalOffer(war, 40).some((o) => o.def.id === 'camo')).toBe(false);
    expect(arsenalOffer({ ...war, continent: 'AF' }, 40).some((o) => o.def.id === 'camo')).toBe(true);
    expect(arsenalOffer({ ...war, level: 2 }, 40).some((o) => o.def.id === 'immunity')).toBe(false);
  });
});
