import { describe, expect, it } from 'vitest';
import type { CombatState, CombatUnitRef, Unit } from '../../../../game/types';
import { posesOf, unitSprite } from '../unitSprites';

const unit = (itemId: string): Unit => ({ uid: itemId, itemId, name: itemId, hp: { legal: 0, urban: 3, army: 0, air: 0, convert: 0 }, xp: 0, paid: 0, seed: 1, traits: [], ranked: 0 });
const ref = (key: string, side: 'p' | 'e', itemId: string, row: number, col: number): CombatUnitRef => ({ key, side, unit: unit(itemId), row, col });

describe('Arena: sprites e poses', () => {
  it('escolhe o conjunto pela classe e pelo lado', () => {
    expect(unitSprite(ref('a', 'p', 'bodyguard', 0, 0))?.set).toBe('urban');
    expect(unitSprite(ref('b', 'e', 'police', 0, 7))?.set).toBe('police');
    expect(unitSprite(ref('c', 'e', 'thug', 0, 7))?.set).toBe('criminal');
    expect(unitSprite(ref('d', 'p', 'soldier', 0, 0))?.set).toBe('military');
    expect(unitSprite(ref('e', 'p', 'tank3', 0, 0))?.anims.shoot).toBe('tank3_shoot');
    expect(unitSprite(ref('f', 'p', 'heli3', 0, 0))?.set).toBe('vehicles-xl-heli3');
    expect(unitSprite(ref('g', 'e', 'ifv', 0, 7))?.xl).toBe('apc');
  });

  it('marca quem andou, quem levou dano e o atirador mais próximo na mesma linha', () => {
    const units = [ref('p1', 'p', 'bodyguard', 1, 2), ref('p2', 'p', 'bodyguard', 0, 1), ref('e1', 'e', 'police', 1, 4), ref('e2', 'e', 'police', 2, 6)];
    const c = {
      units,
      fx: [
        { kind: 'move', key: 'p2', row: 0, col: 1 },
        { kind: 'hit', key: 'e1', row: 1, col: 4 },
      ],
    } as unknown as CombatState;
    const m = posesOf(c);
    expect(m.get('p2')).toBe('walk');
    expect(m.get('e1')).toBe('hurt');
    expect(m.get('p1')).toBe('shoot');
    expect(m.has('e2')).toBe(false);
  });
});
