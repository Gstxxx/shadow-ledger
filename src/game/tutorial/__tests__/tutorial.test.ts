import { describe, expect, it } from 'vitest';
import * as A from '../../actions';
import { chooseTactic, finishCombat } from '../../combatFlow';
import { ITEMS } from '../../data/items';
import { freeCargo, quoteBuy, quoteSell } from '../../market';
import { PRESETS } from '../../data/rules';
import { advance } from '../../sim';
import { newGame, player } from '../../state';
import type { GameState } from '../../types';
import {
  CONTRACT_PATIENCE_H,
  isLocked,
  presentTopics,
  skipGuide,
  TUTORIAL_PRESET,
  tutorialOf,
  updateTutorial,
} from '..';

const tutorial = (seed = 1) => newGame({ preset: TUTORIAL_PRESET, difficulty: 1, hardcore: false, seed });

/** Avança o relógio como o jogador faria, sem deixar Eventos ou combates travarem. */
function wait(s: GameState, hours: number) {
  const end = s.time + hours;
  let guard = 0;
  while (s.time < end - 1e-9 && !s.over && guard++ < 10_000) {
    if (s.pendingCombat) chooseTactic(s, 'defensive', false);
    if (s.combat) finishCombat(s);
    s.events = [];
    advance(s, Math.min(6, end - s.time));
    updateTutorial(s);
  }
}

/** Item barato e leve que outro país compra mais caro: o primeiro negócio do tutorial. */
function firstDeal(s: GameState) {
  const a = player(s);
  const here = s.countries[a.location];
  let best: { item: string; to: string; gain: number } | undefined;
  for (const item of here.stock) {
    const cost = quoteBuy(here, item, 1).total;
    if (cost > a.cash || ITEMS[item].weight > freeCargo(a)) continue;
    for (const c of Object.values(s.countries)) {
      if (c.id === here.id) continue;
      const gain = quoteSell(c, item, 1).total - cost;
      if (!best || gain > best.gain) best = { item, to: c.id, gain };
    }
  }
  return best!;
}

describe('Tutorial', () => {
  it('começa com Equipes, Operações, Agências Rivais e Tensão Global desligadas', () => {
    const s = tutorial();
    expect(s.agencies.filter((a) => !a.isPlayer)).toHaveLength(0);
    for (const sys of ['teams', 'operations', 'rivals', 'tension'] as const) expect(isLocked(s, sys)).toBe(true);
    // Outros Presets não travam nada.
    const free = newGame({ preset: PRESETS.find((p) => p.id !== TUTORIAL_PRESET.id)!, difficulty: 2, hardcore: false, seed: 2 });
    expect(isLocked(free, 'teams')).toBe(false);
  });

  it('o guia segue pelo estado do jogo do primeiro clique até liberar tudo', () => {
    const s = tutorial(3);
    const a = player(s);
    updateTutorial(s);
    expect(tutorialOf(s)!.step).toBe('buy');

    const deal = firstDeal(s);
    expect(A.buy(s, a, deal.item, 1).ok).toBe(true);
    expect(updateTutorial(s)).toEqual(['buy']);
    expect(tutorialOf(s)!.step).toBe('fly');

    expect(A.travel(s, a, deal.to).ok).toBe(true);
    updateTutorial(s);
    expect(tutorialOf(s)!.step).toBe('sell');
    wait(s, A.flightHours(a, deal.to) + 2);
    expect(a.location).toBe(deal.to);

    expect(A.sell(s, a, deal.item, 1).ok).toBe(true);
    updateTutorial(s);
    expect(tutorialOf(s)!.step).toBe('station');

    expect(A.openStation(s, a).ok).toBe(true);
    updateTutorial(s);
    expect(tutorialOf(s)!.step).toBe('contract');
    expect(isLocked(s, 'rivals')).toBe(true);

    // Sem oferta aceita, o guia segue sozinho depois de uma semana.
    wait(s, CONTRACT_PATIENCE_H + 12);
    const t = tutorialOf(s)!;
    expect(t.step).toBe('free');
    expect(t.done).toEqual(['buy', 'fly', 'sell', 'station', 'contract']);
    expect(isLocked(s, 'teams')).toBe(false);
    expect(isLocked(s, 'tension')).toBe(false);
    expect(s.agencies.filter((x) => !x.isPlayer).length).toBeGreaterThanOrEqual(1);
  });

  it('aceitar um Contrato conclui o passo na hora', () => {
    const s = tutorial(5);
    const t = updateTutorial(s) && tutorialOf(s)!;
    t.step = 'contract';
    t.mark = { ...t.mark, contracts: 0, at: s.time };
    s.contracts.push({
      id: 'kx',
      countryId: player(s).location,
      buyer: 'Teste',
      itemId: 'rifles',
      qty: 1,
      reward: 100_000,
      offeredAt: s.time,
      offerExpires: s.time + 48,
      deadline: s.time + 200,
      status: 'offered',
      reputation: 5,
    });
    expect(A.acceptContract(s, player(s), 'kx').ok).toBe(true);
    expect(updateTutorial(s)).toEqual(['contract']);
  });

  it('pular o guia encerra o Tutorial', () => {
    const s = tutorial(7);
    skipGuide(s);
    updateTutorial(s);
    expect(isLocked(s, 'rivals')).toBe(false);
    expect(s.agencies.some((x) => !x.isPlayer)).toBe(true);
  });

  it('o estado do guia entra no save', () => {
    const s = tutorial(8);
    updateTutorial(s);
    const back = JSON.parse(JSON.stringify(s)) as GameState;
    expect(tutorialOf(back)?.step).toBe('buy');
  });

  it('tópicos da Analista aparecem conforme o jogo mostra cada sistema', () => {
    const s = tutorial(9);
    updateTutorial(s);
    const first = presentTopics(s);
    expect(first).toContain('fleet');
    expect(first).toContain('buy');
    expect(first).not.toContain('rival');
    expect(first).not.toContain('tension');
    expect(first).not.toContain('team');
    s.tension = 80;
    expect(presentTopics(s)).not.toContain('tension'); // travada no Tutorial
    skipGuide(s);
    expect(presentTopics(s)).toEqual(expect.arrayContaining(['tension', 'rival', 'team']));
  });
});
