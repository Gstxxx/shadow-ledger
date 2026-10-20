import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  MORAVIA,
  cashBonus,
  chapterResult,
  commitChapter,
  failChapter,
  loadCampaign,
  newCampaign,
  startChapter,
  veteranCandidates,
} from '../campaign';
import { CAMPAIGN } from '../data/rules';
import { advance } from '../sim';
import { loadSave } from '../save';
import { allUnits, player, profit, standing } from '../state';
import type { GameState } from '../types';
import { isPersonnel } from '../units';

const camp = (hardcore = false) => newCampaign({ difficulty: 2, hardcore, origin: 'banker', directorName: 'Vera Lins', seed: 42 });

/** Vence o Capítulo na marra, com Lucro definido. */
function win(s: GameState, gain = 0) {
  player(s).cash += gain;
  s.over = { won: true, reason: 'ok', score: 1 };
}

describe('Capítulos', () => {
  it('são 10, com Casa Moravia nos capítulos de rival e no último Grupo Hostil', () => {
    expect(CHAPTERS).toHaveLength(10);
    expect(CHAPTERS.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(CHAPTERS[0].rival).toBeUndefined();
    expect(CHAPTERS[4].rival).toBe('weak');
    expect(CHAPTERS[9].preset.objective).toBe('destroy');
    expect(CHAPTERS[9].group).toBe(MORAVIA);
    for (const ch of CHAPTERS) expect(ch.beats).toHaveLength(3);
  });

  it('cada Capítulo monta uma partida jogável', () => {
    for (const ch of CHAPTERS) {
      const c = { ...camp(), chapter: ch.n };
      const s = startChapter(c);
      expect(s.campaign?.chapter).toBe(ch.n);
      expect(s.options.preset.id).toBe(`campaign-${ch.n}`);
      const rivals = s.agencies.filter((a) => !a.isPlayer);
      if (ch.rival) expect(rivals.map((a) => a.name)).toEqual([MORAVIA]);
      else expect(rivals).toHaveLength(0);
      if (ch.group) expect(s.group?.name).toBe(ch.group);
      expect(Math.abs(profit(player(s)))).toBeLessThan(1);
      advance(s, 24 * 2);
    }
  });

  it('a primeira fala do Analista sai no início; as outras no meio e perto do fim', () => {
    const s = startChapter(camp());
    expect(s.campaign?.beats).toEqual([0]);
    expect(s.events.some((e) => (e.bodyMsg?.key as string) === 'campaign.ch.1.analyst.1')).toBe(true);
    for (let d = 0; d < 50 && !s.over; d++) {
      s.events = [];
      s.pendingCombat = undefined;
      s.combat = undefined;
      advance(s, 24);
    }
    expect(s.campaign?.beats).toEqual([0, 1, 2]);
  });
});

describe('Carry-over', () => {
  it('Diretor, Origem, Veteranos curados, Reputação a meio caminho e bônus com teto', () => {
    const c0 = camp();
    const s1 = startChapter(c0);
    const a1 = player(s1);
    const vet = a1.escort.find(isPersonnel)!;
    vet.injury = { kind: 'wounded', days: 5 };
    vet.hp = { ...vet.hp, ...Object.fromEntries(Object.keys(vet.hp).map((k) => [k, 0])) };
    vet.traits = ['loyal'];
    standing(a1, '076').reputation = 40;
    standing(a1, '250').reputation = -31;
    win(s1, 100_000_000);
    const res = chapterResult(c0, s1);
    expect(res.won).toBe(true);
    expect(res.dossier).toBe(1);
    expect(res.candidates.map((u) => u.uid)).toContain(vet.uid);

    const c1 = commitChapter(c0, s1, [vet.uid, vet.uid]);
    expect(c1.chapter).toBe(2);
    expect(c1.dossier).toEqual([1]);
    expect(c1.veterans).toHaveLength(1);
    expect(c1.reputation['076']).toBe(20);
    expect(c1.reputation['250']).toBe(-15);
    expect(c0.chapter).toBe(1);

    const s2 = startChapter(c1);
    const a2 = player(s2);
    expect(a2.director.name).toBe('Vera Lins');
    expect(a2.origin).toBe('banker');
    const carried = a2.escort.find((u) => u.name === vet.name)!;
    expect(carried).toBeDefined();
    expect(carried.injury).toBeUndefined();
    expect(carried.traits).toContain('loyal');
    expect(Object.values(carried.hp).some((x) => x > 0)).toBe(true);
    expect(standing(a2, '076').reputation).toBe(20);
    // Lucro enorme: o bônus bate no teto.
    const base = CHAPTERS[1].preset.cash;
    expect(cashBonus(c1.lastProfit, 2)).toBe(Math.round(base * CAMPAIGN.cashBonusCap));
    expect(Math.abs(profit(a2))).toBeLessThan(1);
  });

  it('no máximo 3 Veteranos; prejuízo não dá bônus', () => {
    const c0 = camp();
    const s1 = startChapter(c0);
    const a1 = player(s1);
    for (let i = 0; i < 4; i++) a1.escort.push({ ...a1.escort.find(isPersonnel)!, uid: `x${i}`, name: `Extra ${i}` });
    win(s1, -2_000_000);
    const uids = veteranCandidates(s1).map((u) => u.uid);
    expect(uids.length).toBeGreaterThan(3);
    const c1 = commitChapter(c0, s1, uids);
    expect(c1.veterans).toHaveLength(3);
    expect(cashBonus(c1.lastProfit, 2)).toBe(0);
  });

  it('Estações, Frota e Carga não passam', () => {
    const c0 = camp();
    const s1 = startChapter(c0);
    player(s1).stations.push({ countryId: '076', level: 3, units: [], founded: 0, vault: [], detained: [] });
    win(s1);
    const s2 = startChapter(commitChapter(c0, s1, []));
    expect(player(s2).stations.map((x) => x.countryId)).toEqual(CHAPTERS[1].preset.startStations.map((x) => x.countryId));
  });
});

describe('Derrota e retry', () => {
  it('retry parte do mesmo estado da Campanha, com outro mundo', () => {
    const c0 = camp();
    const first = startChapter(c0);
    const c1 = failChapter(c0);
    expect(c1.status).toBe('active');
    expect(c1.chapter).toBe(1);
    expect(c1.attempts).toBe(1);
    const again = startChapter(c1);
    expect(player(again).cash).toBe(player(first).cash);
    expect(again.seed).not.toBe(first.seed);
    // A mesma tentativa gera o mesmo mundo.
    expect(startChapter(c1).seed).toBe(again.seed);
  });

  it('no Hardcore, perder encerra a Campanha', () => {
    const c0 = camp(true);
    const s = startChapter(c0);
    s.over = { won: false, reason: 'x', score: 0 };
    expect(chapterResult(c0, s).hardcoreLost).toBe(true);
    expect(failChapter(c0).status).toBe('lost');
  });

  it('vencer o Capítulo 10 encerra a Campanha vencida', () => {
    const c = { ...camp(), chapter: 10 };
    const s = startChapter(c);
    win(s);
    expect(chapterResult(c, s).final).toBe(true);
    const end = commitChapter(c, s, []);
    expect(end.status).toBe('won');
    expect(end.dossier).toContain(10);
  });
});

describe('Save', () => {
  it('Campanha e partida do Capítulo voltam iguais do JSON', () => {
    const c0 = camp();
    const s1 = startChapter(c0);
    win(s1, 5_000_000);
    const vet = veteranCandidates(s1)[0];
    const c1 = commitChapter(c0, s1, [vet.uid]);
    const back = loadCampaign(JSON.stringify(c1));
    expect(back).toEqual(c1);
    expect(loadCampaign(JSON.stringify({ ...c1, campaignVersion: 99 }))).toBeNull();
    expect(loadCampaign('nope')).toBeNull();

    const s2 = startChapter(back!);
    const g = loadSave(JSON.stringify(s2))!;
    expect(g.campaign).toEqual(s2.campaign);
    expect(allUnits(player(g)).some((u) => u.name === vet.name)).toBe(true);
  });
});
