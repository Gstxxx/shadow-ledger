import { describe, expect, it } from 'vitest';
import { COUNTRY_SEEDS } from '../data/countries';
import { ITEMS } from '../data/items';
import { TEAM_NAMES } from '../data/names';
import { OPERATION_LABEL, PRESETS, STATIONS, THREAT_LABEL } from '../data/rules';
import { TRAITS } from '../data/traits';
import { dictionaries } from '../../i18n';
import { countryName, itemName, listedName, operationLabel, presetTitle, renderMsg, stationName, threatLabel, traitName } from '../../i18n/lookup';
import type { Msg } from '../../i18n/lookup';
import { buy, openStation, sell, startOperation, travel } from '../actions';
import type { Result } from '../actions';
import { chooseTactic, finishCombat } from '../combatFlow';
import { advance } from '../sim';
import { newGame, player } from '../state';

describe('nomes pt dos dados batem com o dicionário pt-BR (modo compatível)', () => {
  it('países, itens, Estações, Ameaças, Operações, Traços, cenários, Equipes', () => {
    for (const c of COUNTRY_SEEDS) expect(countryName(c.id, 'pt-BR')).toBe(c.name);
    for (const it of Object.values(ITEMS)) expect(itemName(it.id, 'pt-BR')).toBe(it.name);
    for (const [lvl, st] of Object.entries(STATIONS)) expect(stationName(Number(lvl), 'pt-BR')).toBe(st.name);
    for (const [k, v] of Object.entries(THREAT_LABEL)) expect(threatLabel(k, 'pt-BR')).toBe(v);
    for (const [k, v] of Object.entries(OPERATION_LABEL)) expect(operationLabel(k, 'pt-BR')).toBe(v);
    for (const tr of Object.values(TRAITS)) expect(traitName(tr.id, 'pt-BR')).toBe(tr.name);
    // Cenário sem chave (ex.: tutorial) cai no texto do dado (keyRef em state.ts).
    for (const p of PRESETS) if (presetTitle(p.id, 'pt-BR') !== p.id) expect(presetTitle(p.id, 'pt-BR')).toBe(p.title);
    TEAM_NAMES.forEach((n, i) => expect(listedName('team', i, 'pt-BR')).toBe(n));
  });
});

describe('mensagens estruturadas do motor (modo compatível)', () => {
  const preset = PRESETS.find((p) => p.id === 'first-contract')!;

  const checkMsg = (m: Msg | undefined, text?: string) => {
    expect(m, `sem Msg para "${text}"`).toBeDefined();
    const msg = m!;
    expect(msg.key in dictionaries['pt-BR'], msg.key).toBe(true);
    expect(msg.key in dictionaries.en, msg.key).toBe(true);
    expect(renderMsg(msg, 'en')).not.toBe(msg.key);
    expect(renderMsg(msg, 'en')).not.toMatch(/\{\w+\}/);
  };

  it('Relatório, Eventos, Combate e Results carregam Msg com chave existente', () => {
    // Sem Agências Rivais: as notícias delas (src/game/ai) ainda são texto livre.
    const s = newGame({ preset, difficulty: 2, hardcore: false, seed: 11, rivals: 0 });
    const a = player(s);
    const results: Result[] = [];
    const logStart = s.log.length;
    const evStart = s.uidCounter;
    expect(s.log[0].msg?.key).toBe('msg.state.operationStarted');
    expect(s.log[0].text).toBe(renderMsg(s.log[0].msg!, 'pt-BR'));

    const c = s.countries[a.location];
    const itemId = c.stock.find((id) => ITEMS[id].weight <= 1) ?? c.stock[0];
    results.push(buy(s, a, itemId, 1));
    results.push(sell(s, a, itemId, 1));
    results.push(buy(s, a, '__nope__', 0));
    a.cash += 5_000_000;
    results.push(openStation(s, a));
    results.push(openStation(s, a));
    results.push(startOperation(s, a, 'bank'));
    if (s.pendingCombat) {
      expect(s.pendingCombat.setup.titleMsg?.key).toBe('msg.title.operation');
      expect(chooseTactic(s, 'assault', false)).toBe(true);
      const cs = s.combat!;
      expect(cs.titleMsg?.key).toBe('msg.title.operation');
      finishCombat(s);
      expect(cs.logMsg?.length).toBe(cs.log.length);
      cs.logMsg!.forEach((m, i) => {
        checkMsg(m, cs.log[i]);
        expect(renderMsg(m, 'pt-BR')).toBe(cs.log[i]);
      });
    }
    s.events = [];
    const to = Object.keys(s.countries).find((id) => id !== a.location && a.director.status === 'free')!;
    results.push(travel(s, a, to));
    for (let i = 0; i < 40 && !s.over; i++) {
      advance(s, 24);
      s.events = s.events.filter(() => false);
      if (s.pendingCombat) chooseTactic(s, 'defensive', false);
      if (s.combat) finishCombat(s);
    }

    const logs = s.log.slice(logStart);
    expect(logs.length).toBeGreaterThan(3);
    for (const e of logs) {
      checkMsg(e.msg, e.text);
      if (e.detail) checkMsg(e.detail, e.text);
      const pt = e.detail ? `${renderMsg(e.msg!, 'pt-BR')} — ${renderMsg(e.detail, 'pt-BR')}` : renderMsg(e.msg!, 'pt-BR');
      expect(e.text).toBe(pt);
    }
    const evLogs = logs.filter((e) => e.detail);
    expect(evLogs.length).toBeGreaterThan(0);
    expect(s.uidCounter).toBeGreaterThan(evStart);

    for (const r of results) {
      if (r.msg === undefined) continue;
      checkMsg(r.m, r.msg);
      expect(r.msg).toBe(renderMsg(r.m!, 'pt-BR'));
    }
    expect(results[0].m?.key).toBe('msg.act.bought');
    expect(renderMsg(results[0].m!, 'en')).toMatch(/\$/);
  });

  it('notify grava titleMsg/bodyMsg nos Eventos', () => {
    const s = newGame({ preset, difficulty: 2, hardcore: false, seed: 5, rivals: 0 });
    const a = player(s);
    const to = Object.keys(s.countries).find((id) => id !== a.location)!;
    const r = travel(s, a, to);
    expect(r.ok).toBe(true);
    expect(s.log[s.log.length - 1].msg?.key).toBe('msg.act.fleetTakeoff');
    expect(renderMsg(s.log[s.log.length - 1].msg!, 'en')).toContain('took off');
    for (let i = 0; i < 200 && !s.events.length; i++) advance(s, 1);
    expect(s.events.length).toBeGreaterThan(0);
    for (const ev of s.events) {
      checkMsg(ev.titleMsg, ev.title);
      checkMsg(ev.bodyMsg, ev.body);
      expect(ev.title).toBe(renderMsg(ev.titleMsg!, 'pt-BR'));
      expect(ev.body).toBe(renderMsg(ev.bodyMsg!, 'pt-BR'));
    }
  });
});
