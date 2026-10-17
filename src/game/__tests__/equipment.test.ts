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
