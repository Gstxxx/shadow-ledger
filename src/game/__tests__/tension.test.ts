import { describe, expect, it } from 'vitest';
import { PRESETS } from '../data/rules';
import { loadSave, SAVE_VERSION } from '../save';
import { advance } from '../sim';
import { newGame } from '../state';
import { CRISIS_DAYS, tensionBand, TENSION_TOP } from '../tension';

const game = () => newGame({ preset: { ...PRESETS.find((p) => p.id === 'first-contract')!, days: 0 }, difficulty: 2, hardcore: false, seed: 5, rivals: 0 });

describe('Tensão Global', () => {
  it('faixas Baixa → Média → Alta → Topo', () => {
    expect(tensionBand(10)).toBe('low');
    expect(tensionBand(40)).toBe('medium');
    expect(tensionBand(60)).toBe('high');
    expect(tensionBand(TENSION_TOP)).toBe('top');
  });

  it('no Topo por tempo demais, a Crise Final derrota todas as agências', () => {
    const s = game();
    let guard = 0;
    while (!s.over && guard++ < 400) {
      s.tension = 100;
      s.events = [];
      s.pendingCombat = undefined;
      s.combat = undefined;
      advance(s, 24);
    }
    expect(s.over?.won).toBe(false);
    expect(s.over?.reason).toMatch(/arma/);
    expect(s.time / 24).toBeGreaterThanOrEqual(CRISIS_DAYS - 1);
  });
});

describe('Save', () => {
  it('migra um save da versão 3 para a atual', () => {
    const s = game() as unknown as Record<string, unknown>;
    delete s.saveVersion;
    delete s.crisis;
    s.version = 3;
    const loaded = loadSave(JSON.stringify(s));
    expect(loaded?.saveVersion).toBe(SAVE_VERSION);
    expect(loaded?.crisis).toEqual({ hours: 0 });
  });

  it('recusa lixo e versões futuras', () => {
    expect(loadSave('{oops')).toBeNull();
    const s = game();
    expect(loadSave(JSON.stringify({ ...s, saveVersion: SAVE_VERSION + 1 }))).toBeNull();
  });
});
