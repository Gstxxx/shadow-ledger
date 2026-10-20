import { afterEach, describe, expect, it } from 'vitest';
import { chooseTactic, finishCombat } from '../../combatFlow';
import { PRESETS } from '../../data/rules';
import { advance } from '../../sim';
import { allUnits, assets, newGame, player } from '../../state';
import type { Agency, Difficulty, GameState } from '../../types';
import { decide, memoryOf, recordAggression, setupRivals, tickRivals } from '..';
import { E } from '../engine';

const SANDBOX = { ...PRESETS.find((p) => p.id === 'first-contract')!, days: 0 };

function game(seed: number, difficulty: Difficulty = 3): GameState {
  const s = newGame({ preset: SANDBOX, difficulty, hardcore: false, seed });
  setupRivals(s); // no-op quando o motor já chama no newGame
  return s;
}

const rivals = (s: GameState) => s.agencies.filter((a) => !a.isPlayer);

/** Jogador passivo: não faz nada, só deixa os combates dele se resolverem e dispensa os Eventos. */
function unblock(s: GameState) {
  if (s.pendingCombat) chooseTactic(s, 'defensive', false);
  if (s.combat) finishCombat(s);
  s.events = [];
}

/** Roda `days` dias; `each` roda a cada passo de `step` horas. */
function run(s: GameState, days: number, step = 2, each?: () => void) {
  const end = days * 24;
  while (s.time < end - 1e-9 && !s.over) {
    const target = Math.min(end, s.time + step);
    let guard = 0;
    while (s.time < target - 1e-9 && guard++ < 100) {
      unblock(s);
      advance(s, target - s.time);
    }
    unblock(s);
    tickRivals(s); // idempotente quando o motor já chama no tick
    each?.();
  }
}

function assertSane(s: GameState) {
  const bad = (label: string, v: number) => {
    if (!Number.isFinite(v)) throw new Error(`${label} = ${v} at t=${s.time}`);
  };
  bad('tension', s.tension);
  for (const a of s.agencies) {
    bad(`${a.name} cash`, a.cash);
    bad(`${a.name} assets`, assets(a));
    for (const [id, st] of Object.entries(a.standing)) {
      bad(`${a.name} rep ${id}`, st.reputation);
      bad(`${a.name} exp ${id}`, st.exposure);
    }
    for (const u of allUnits(a)) for (const v of Object.values(u.hp)) bad(`${a.name} hp ${u.name}`, v);
  }
  for (const c of Object.values(s.countries)) for (const [k, v] of Object.entries(c.saturation)) bad(`sat ${c.name} ${k}`, v);
}

/** Tudo que uma agência tem e que só pode mudar por ação do motor. */
function fingerprint(a: Agency) {
  return {
    cash: a.cash,
    units: allUnits(a).length + a.stations.reduce((x, st) => x + st.detained.length, 0),
    stations: a.stations.reduce((x, st) => x + st.level, 0),
    goods:
      a.cargo.reduce((x, l) => x + l.qty, 0) +
      a.stations.reduce((x, st) => x + st.vault.reduce((y, l) => y + l.qty, 0), 0) +
      a.teams.reduce((x, t) => x + t.spoils.reduce((y, l) => y + l.qty, 0), 0),
  };
}
type Print = ReturnType<typeof fingerprint>;
const KEYS: (keyof Print)[] = ['cash', 'units', 'stations', 'goods'];

/** Embrulha todas as funções de E e soma o que mudou dentro delas. */
function instrument(s: GameState) {
  const inside = new Map<string, Print>();
  const calls: string[] = [];
  const restore: (() => void)[] = [];
  const wrap =
    <F extends (...args: never[]) => unknown>(name: string, fn: F) =>
    (...args: Parameters<F>) => {
      const before = new Map(s.agencies.map((a) => [a.id, fingerprint(a)]));
      const out = fn(...args);
      calls.push(name);
      for (const a of s.agencies) {
        const b = before.get(a.id);
        if (!b) continue;
        const now = fingerprint(a);
        const acc = inside.get(a.id) ?? { cash: 0, units: 0, stations: 0, goods: 0 };
        for (const k of KEYS) acc[k] += now[k] - b[k];
        inside.set(a.id, acc);
      }
      return out;
    };
  for (const key of Object.keys(E) as (keyof typeof E)[]) {
    const desc = Object.getOwnPropertyDescriptor(E, key)!;
    if (desc.get) {
      const get = desc.get;
      Object.defineProperty(E, key, {
        configurable: true,
        get: () => {
          const fn = get.call(E) as ((...args: never[]) => unknown) | undefined;
          return fn && wrap(key, fn);
        },
      });
    } else {
      Object.defineProperty(E, key, { ...desc, value: wrap(key, desc.value) });
    }
    restore.push(() => Object.defineProperty(E, key, desc));
  }
  return { inside, calls, restore: () => restore.forEach((r) => r()) };
}

describe('Agências Rivais', () => {
  it('a Dificuldade define quantas rivais existem', () => {
    expect(rivals(game(1, 1))).toHaveLength(1);
    expect(rivals(game(2, 2))).toHaveLength(2);
    for (const seed of [3, 4, 5, 6]) {
      const n = rivals(game(seed, 3)).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(4);
    }
    // Recruta só enfrenta personalidades pouco belicosas.
    for (const seed of [7, 8, 9]) {
      const s = game(seed, 1);
      expect(['mercador', 'fantasma']).toContain(memoryOf(s, rivals(s)[0].id)!.personality);
    }
  });

  it('o número escolhido no menu vence o sorteio da Dificuldade', () => {
    for (const [difficulty, rivalsWanted] of [[1, 3], [3, 0], [2, 4]] as const) {
      const s = newGame({ preset: SANDBOX, difficulty, hardcore: false, seed: 70 + rivalsWanted, rivals: rivalsWanted });
      expect(rivals(s)).toHaveLength(rivalsWanted);
    }
  });

  it('setupRivals é idempotente e cada rival começa num país próprio', () => {
    const s = game(11, 3);
    const n = s.agencies.length;
    setupRivals(s);
    expect(s.agencies).toHaveLength(n);
    const starts = rivals(s).map((a) => a.location);
    expect(new Set(starts).size).toBe(starts.length);
    expect(starts).not.toContain(player(s).location);
  });

  it('365 dias com 4 rivais na Dificuldade Diretor: sem erro, sem NaN, patrimônio plausível', () => {
    let s = game(21, 3);
    for (let seed = 22; rivals(s).length < 4; seed++) s = game(seed, 3);
    const t0 = performance.now();
    // A Crise Final é balanço do motor e tem teste próprio; aqui o ano inteiro precisa rodar.
    let topDays = 0;
    run(s, 365, 6, () => {
      assertSane(s);
      const c = (s as GameState & { crisis?: { hours: number } }).crisis;
      if (c?.hours) {
        topDays += 0.25;
        c.hours = 0;
      }
    });
    const ms = performance.now() - t0;
    assertSane(s);
    expect(s.over).toBeUndefined();
    expect(Math.round(s.time)).toBe(365 * 24);
    console.log(`Tensão final ${s.tension.toFixed(0)}; dias no Topo: ${topDays}`);

    const me = player(s);
    const rs = rivals(s);
    const report = rs.map((a) => ({
      name: a.name,
      personality: memoryOf(s, a.id)!.personality,
      assets: assets(a),
      capital: a.capital,
      trades: a.stats.trades,
      stations: a.stations.map((st) => st.level).join(''),
      ops: a.stats.operations,
      decisions: memoryOf(s, a.id)!.decisions,
    }));
    console.log(`365 dias em ${Math.round(ms)} ms; jogador passivo: ${assets(me)}`, report);

    for (const a of rs) {
      expect(memoryOf(s, a.id)!.decisions).toBeGreaterThan(300);
      expect(a.stats.trades).toBeGreaterThan(10);
      expect(assets(a)).toBeLessThan(Math.max(assets(me), 1_000_000) * 100);
    }
    // Nem todas falidas: ao menos uma cresceu além do capital inicial.
    expect(rs.some((a) => assets(a) > a.capital)).toBe(true);
    expect(rs.filter((a) => assets(a) < a.capital * 0.2).length).toBeLessThan(rs.length);
    // As rivais mexem no mundo: Estações abertas e Saturação causada.
    expect(rs.reduce((x, a) => x + a.stations.length, 0)).toBeGreaterThan(rs.length);

    // Custo de uma decisão no fim do ano (mundo cheio): folgado para 4 rivais a 4× no celular.
    const t1 = performance.now();
    for (let i = 0; i < 50; i++) for (const a of rs) decide(s, a, memoryOf(s, a.id)!);
    const perDecision = (performance.now() - t1) / (50 * rs.length);
    console.log(`decisão média: ${perDecision.toFixed(3)} ms`);
    expect(perDecision).toBeLessThan(5);
  }, 120_000);

  it('é determinística a partir da semente', () => {
    const summary = (s: GameState) =>
      JSON.stringify(rivals(s).map((a) => [a.cash, a.location, a.stations.length, a.stats.trades, allUnits(a).length]));
    const a = game(31, 3);
    const b = game(31, 3);
    run(a, 60);
    run(b, 60);
    expect(summary(a)).toBe(summary(b));
    expect(a.tension).toBe(b.tension);
  }, 60_000);

  it('ADR 0002: a rival só ganha dinheiro, Unidade, Estação ou Carga dentro de funções do motor', () => {
    const s = game(41, 3);
    const probe = instrument(s);
    try {
      run(s, 120, 6, () => {
        for (const a of rivals(s)) {
          probe.inside.clear();
          const before = new Map(s.agencies.map((x) => [x.id, fingerprint(x)]));
          decide(s, a, memoryOf(s, a.id)!);
          for (const x of s.agencies) {
            const b = before.get(x.id)!;
            const now = fingerprint(x);
            const inside = probe.inside.get(x.id) ?? { cash: 0, units: 0, stations: 0, goods: 0 };
            for (const k of KEYS) expect(now[k] - b[k], `${x.name} ${k} mudou fora do motor`).toBeCloseTo(inside[k], 6);
          }
        }
      });
      expect(probe.calls).toContain('buy');
      expect(probe.calls).toContain('sell');
      expect(probe.calls).toContain('travel');
    } finally {
      probe.restore();
    }
  }, 120_000);

  it('o código da IA nunca escreve direto em caixa, Unidades, Estações ou Carga', () => {
    const files = import.meta.glob<string>('../*.ts', { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(files).length).toBeGreaterThan(5);
    const forbidden = /\b(a|agency|target|rival|me)\.(cash|escort|fleet|stations|cargo|teams|arrears|capital)\s*(=[^=]|\+=|-=|\.push|\.splice)|\.(units|vault|spoils|detained)\s*(=[^=]|\.push|\.splice)/;
    for (const [f, src] of Object.entries(files)) {
      src.split('\n').forEach((line, i) => expect(forbidden.test(line), `${f}:${i + 1}: ${line.trim()}`).toBe(false));
    }
  });

  it('Mercador nunca toca em Armas de Destruição em Massa; Estado-Sombra não recua da Crise Final', () => {
    const s = game(51, 3);
    for (const a of rivals(s)) memoryOf(s, a.id)!.personality = 'mercador';
    s.tension = 96;
    run(s, 40, 6, () => (s.tension = Math.max(s.tension, 90)));
    for (const a of rivals(s)) {
      expect(a.cargo.some((l) => ['chem', 'bio', 'nuclear'].includes(l.itemId))).toBe(false);
      expect(memoryOf(s, a.id)!.plan?.itemId ?? '').not.toMatch(/chem|bio|nuclear/);
    }
    const t = game(52, 3);
    const r = rivals(t)[0];
    memoryOf(t, r.id)!.personality = 'sombra';
    t.tension = 99;
    decide(t, r, memoryOf(t, r.id)!);
    expect(memoryOf(t, r.id)!.wmdRetreat).toBeFalsy();
  }, 60_000);

  describe('retaliação', () => {
    const saved = Object.getOwnPropertyDescriptors(E);
    afterEach(() => {
      for (const k of ['denounce', 'sabotageStation', 'raidVault'] as const) Object.defineProperty(E, k, saved[k]);
    });

    it('rancor contra o jogador vira denúncia quando o motor expõe a ação', () => {
      const s = game(61, 3);
      const me = player(s);
      const r = rivals(s)[0];
      const mem = memoryOf(s, r.id)!;
      mem.personality = 'mercador';
      const hits: { by: string; target: string; country: string }[] = [];
      Object.defineProperty(E, 'denounce', {
        configurable: true,
        get: () => (_s: GameState, a: Agency, targetId: string, countryId: string) => {
          hits.push({ by: a.id, target: targetId, country: countryId });
          return { ok: true as const };
        },
      });
      Object.defineProperty(E, 'sabotageStation', { configurable: true, get: () => undefined });
      Object.defineProperty(E, 'raidVault', { configurable: true, get: () => undefined });

      recordAggression(s, me.id, r.id, 6);
      expect(mem.grudge[me.id]).toBe(6);
      for (let i = 0; i < 20 && !hits.length; i++) {
        // O Diretor rival pousado no país do jogador: tem olhos para denunciar.
        r.flight = undefined;
        r.location = me.location;
        mem.lastStrikeAt = -1e9;
        decide(s, r, mem);
      }
      expect(hits[0]).toMatchObject({ by: r.id, target: me.id });
      expect(mem.grudge[me.id]).toBeLessThan(6);
    });

    it('com as ações reais do motor, a rival denuncia o jogador onde tem olhos', () => {
      const s = game(63, 3);
      const me = player(s);
      const r = rivals(s)[0];
      const mem = memoryOf(s, r.id)!;
      mem.personality = 'mercador';
      const where = me.stations[0].countryId;
      const before = me.standing[where].exposure;
      r.cash = 50_000_000; // folga para brigar (rival sem caixa não compra briga)
      recordAggression(s, me.id, r.id, 6);
      for (let i = 0; i < 30 && me.standing[where].exposure === before; i++) {
        r.flight = undefined;
        r.location = where;
        mem.lastStrikeAt = -1e9;
        s.tension = 20;
        decide(s, r, mem);
      }
      expect(me.standing[where].exposure).toBeGreaterThanOrEqual(before + 25);
      expect(s.events.some((e) => e.title === 'Denúncia')).toBe(true);
      expect(s.log.some((l) => l.text.startsWith(`${r.name} denunciou ${me.name}`))).toBe(true);
    });

    it('sem a ação no motor, a IA não inventa a agressão', () => {
      const s = game(62, 3);
      Object.defineProperty(E, 'denounce', { configurable: true, get: () => undefined });
      Object.defineProperty(E, 'sabotageStation', { configurable: true, get: () => undefined });
      Object.defineProperty(E, 'raidVault', { configurable: true, get: () => undefined });
      const me = player(s);
      const exposure = JSON.stringify(me.standing);
      for (const r of rivals(s)) recordAggression(s, me.id, r.id, 10);
      for (let i = 0; i < 10; i++) for (const r of rivals(s)) decide(s, r, memoryOf(s, r.id)!);
      expect(JSON.stringify(me.standing)).toBe(exposure);
    });
  });
});
