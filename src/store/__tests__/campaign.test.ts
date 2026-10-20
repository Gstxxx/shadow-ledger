import { describe, expect, it } from 'vitest';
import { player } from '../../game/state';
import { useGameStore } from '../game';

const st = () => useGameStore.getState();
const end = (won: boolean) => st().mutate((g) => (g.over = { won, reason: 'x', score: 0 }));

describe('Campanha na store', () => {
  it('criar, jogar, vencer, levar Veterano e voltar ao menu', () => {
    st().campaignNew({ difficulty: 2, hardcore: false, origin: 'banker', seed: 7 });
    expect(st().campaign?.chapter).toBe(1);
    st().campaignPlay();
    expect(st().screen).toBe('game');
    expect(st().game?.campaign?.chapter).toBe(1);
    expect(st().campaignResult).toBeNull();
    end(true);
    const r = st().campaignResult!;
    expect(r.won).toBe(true);
    st().campaignAdvance([r.candidates[0].uid]);
    expect(st().campaign?.chapter).toBe(2);
    expect(st().campaign?.veterans).toHaveLength(1);
    expect(st().campaignResult).toBeNull();
    expect(st().screen).toBe('title');
  });

  it('perder e tentar de novo; no Hardcore a Campanha acaba', () => {
    st().campaignNew({ difficulty: 2, hardcore: false, origin: 'none', seed: 8 });
    st().campaignPlay();
    const cash = player(st().game!).cash;
    end(false);
    expect(st().campaignResult?.won).toBe(false);
    st().campaignRetry();
    expect(st().campaign?.attempts).toBe(1);
    expect(st().game?.over).toBeUndefined();
    expect(player(st().game!).cash).toBe(cash);

    st().campaignNew({ difficulty: 2, hardcore: true, origin: 'none', seed: 9 });
    st().campaignPlay();
    end(false);
    expect(st().campaignResult?.hardcoreLost).toBe(true);
    st().campaignRetry();
    expect(st().campaign?.status).toBe('lost');
    expect(st().screen).toBe('title');
    st().campaignAbandon();
    expect(st().campaign).toBeNull();
  });
});
