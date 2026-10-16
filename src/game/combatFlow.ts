// Combat orchestration: gather forces, Prévia, Tática, Combate Automático, and outcomes.
import { applyCasualties, autoDeploy, createCombat, estimateWin, runToEnd, succeeded, TACTICS } from './combat';
import type { CombatSetup } from './combat';
import { ITEMS, STEAL_TABLE } from './data/items';
import { OPERATION_LABEL, STATIONS, THREAT_BY_STATE, THREAT_LABEL } from './data/rules';
import { addCargo } from './cargo';
import { checkMission } from './mission';
import { pick, randInt, randRange } from './rng';
import { log, pushEvent, stationIn } from './state';
import type { CombatSetupData, CombatState, ForceSource, GameState, StationLevel, Tactic, Unit } from './types';
import { def } from './units';

export function forceUnits(s: GameState, src: ForceSource): Unit[] {
  switch (src.kind) {
    case 'escort':
      return s.escort;
    case 'station':
      return stationIn(s, src.countryId)?.units ?? [];
    case 'team':
      return s.teams.find((t) => t.id === src.teamId)?.units ?? [];
  }
}

function setForceUnits(s: GameState, src: ForceSource, units: Unit[]) {
  switch (src.kind) {
    case 'escort':
      s.escort = units;
      return;
    case 'station': {
      const st = stationIn(s, src.countryId);
      if (st) st.units = units;
      return;
    }
    case 'team': {
      const t = s.teams.find((x) => x.id === src.teamId);
      if (t) t.units = units;
      return;
    }
  }
}

function toSetup(s: GameState, data: CombatSetupData): Omit<CombatSetup, 'tactic'> {
  return {
    type: data.type,
    reason: data.reason,
    title: data.title,
    enemy: data.enemy,
    player: data.sources.flatMap((src) => forceUnits(s, src)),
    playerDefends: data.playerDefends,
    sources: data.sources,
    directorPresent: data.directorPresent,
    fort: data.fort,
  };
}

/** Prévia for every Tática. Uses a scratch rng derived from the game, never the game's own cursor. */
export function previewAll(s: GameState, data: CombatSetupData, runs = 60): Record<Tactic, number> {
  const setup = toSetup(s, data);
  const base = (s.rng ^ 0x5bd1e995) | 0;
  const out = {} as Record<Tactic, number>;
  TACTICS.forEach((t, i) => (out[t] = estimateWin(setup, t, base + i * 7919, runs)));
  return out;
}

/** Custo da Tática Negociar. */
export function negotiateCost(s: GameState, data: CombatSetupData): number {
  const lvl = s.countries[data.reason.countryId]?.level ?? 3;
  return 60_000 * lvl;
}

/**
 * Start a combat. With the Diretor present it waits for the player's Tática (pendingCombat);
 * otherwise it is a Combate Automático resolved on the spot with the best Tática by Prévia.
 */
export function beginCombat(s: GameState, data: CombatSetupData) {
  if (data.directorPresent) {
    s.pendingCombat = { setup: data, preview: previewAll(s, data) };
    pushEvent(s, 'combat', data.title, 'Escolha a Tática. A Prévia mostra a chance estimada de cada uma.', 'warn', data.reason.countryId);
    return;
  }
  const preview = previewAll(s, data, 24);
  const tactic = TACTICS.filter((t) => t !== 'negotiate').reduce((best, t) => (preview[t] > preview[best] ? t : best), 'defensive' as Tactic);
  const c = createCombat(s, { ...toSetup(s, data), tactic });
  autoDeploy(c);
  runToEnd(s, c);
  resolveCombat(s, c);
}

/** Player picked a Tática for the pending combat. `manual` = assumir a grade. */
export function chooseTactic(s: GameState, tactic: Tactic, manual: boolean): boolean {
  const pend = s.pendingCombat;
  if (!pend) return false;
  if (tactic === 'negotiate') {
    const cost = negotiateCost(s, pend.setup);
    if (s.cash < cost) return false;
    s.cash -= cost;
  }
  const c = createCombat(s, { ...toSetup(s, pend.setup), tactic });
  if (!manual) autoDeploy(c);
  s.pendingCombat = undefined;
  s.combat = c;
  s.events = s.events.filter((e) => e.kind !== 'combat');
  return true;
}

/** Abort a pending combat the player started (Operações, Golpe, recurso). Ameaças cannot be refused. */
export function abortPending(s: GameState): boolean {
  const pend = s.pendingCombat;
  if (!pend || pend.setup.reason.kind === 'threat' || pend.setup.reason.kind === 'group') return false;
  s.pendingCombat = undefined;
  s.events = s.events.filter((e) => e.kind !== 'combat');
  log(s, `${pend.setup.title}: abortado antes do contato.`, 'info', pend.setup.reason.countryId);
  return true;
}

/** Finish the live combat (after the player watched/played it). */
export function finishCombat(s: GameState) {
  const c = s.combat;
  if (!c) return;
  if (!c.result) {
    autoDeploy(c);
    runToEnd(s, c);
  }
  s.combat = undefined;
  resolveCombat(s, c);
}

/** Diretor perde: Detido (Estado), Sequestrado (crime) ou morto (Modo Hardcore). */
export function captureDirector(s: GameState, byState: boolean, countryId: string) {
  const c = s.countries[countryId];
  if (s.options.hardcore) {
    s.director.status = 'dead';
    pushEvent(s, 'director', 'Diretor morto', `O Diretor caiu em ${c.name}. No Modo Hardcore não há segunda chance.`, 'bad', countryId);
    checkMission(s);
    return;
  }
  s.director.heldIn = countryId;
  if (byState) {
    s.director.status = 'detained';
    s.director.releaseAt = s.time + randInt(s, 6, 14) * 24;
    s.director.price = Math.round(150_000 * c.level * (1 + s.options.difficulty * 0.3));
    pushEvent(s, 'director', 'Diretor Detido', `O Estado de ${c.name} prendeu o Diretor. Pague a fiança ou espere a soltura.`, 'bad', countryId);
  } else {
    s.director.status = 'kidnapped';
    s.director.releaseAt = undefined;
    s.director.price = Math.round(400_000 * c.level * (1 + s.options.difficulty * 0.4));
    pushEvent(s, 'director', 'Diretor Sequestrado', `Criminosos levaram o Diretor em ${c.name}. Pague o resgate ou mande uma Equipe.`, 'bad', countryId);
  }
}

function stationLosesLevel(s: GameState, countryId: string) {
  const st = stationIn(s, countryId);
  if (!st) return;
  const name = s.countries[countryId].name;
  if (st.level === 1) {
    s.stations = s.stations.filter((x) => x !== st);
    pushEvent(s, 'station', 'Célula destruída', `A Célula em ${name} foi destruída. As Unidades que sobraram se perderam.`, 'bad', countryId);
    return;
  }
  st.level = (st.level - 1) as StationLevel;
  const spec = STATIONS[st.level];
  // Units that no longer fit or are no longer allowed are lost.
  const keep = st.units.filter((u) => spec.allows.includes(def(u.itemId).cls)).slice(0, spec.capacity);
  const lost = st.units.length - keep.length;
  st.units = keep;
  pushEvent(
    s,
    'station',
    'Estação rebaixada',
    `A Estação em ${name} caiu para ${spec.name}${lost ? ` e perdeu ${lost} Unidade(s)` : ''}.`,
    'bad',
    countryId,
  );
}

function interdict(s: GameState, countryId: string) {
  const st = stationIn(s, countryId);
  if (!st) return;
  const c = s.countries[countryId];
  const fine = Math.round(STATIONS[st.level].cost * 0.35 + 120_000 * c.level);
  st.interdicted = { fine, since: s.time };
  st.detained.push(...st.units);
  st.units = [];
  pushEvent(
    s,
    'station',
    'Estação Interditada',
    `O Estado apreendeu a Estação em ${c.name}; ${st.detained.length} Unidade(s) Detida(s). Multa: US$ ${fine.toLocaleString('pt-BR')}.`,
    'bad',
    countryId,
  );
}

export function liftInterdiction(s: GameState, countryId: string) {
  const st = stationIn(s, countryId);
  if (!st?.interdicted) return;
  st.interdicted = undefined;
  st.units.push(...st.detained);
  st.detained = [];
}

const STEAL_BY_LEVEL = (level: number) => STEAL_TABLE[Math.min(STEAL_TABLE.length - 1, Math.max(0, level - 1))];

/** Write casualties back, then apply what the result means for the agency. */
export function resolveCombat(s: GameState, c: CombatState) {
  const ok = succeeded(c);
  let lostTotal = 0;
  for (const src of c.sources) {
    const { lost, kept } = applyCasualties(c, forceUnits(s, src));
    lostTotal += lost.length;
    setForceUnits(s, src, kept);
  }
  // Converted enemies join the first force on the field.
  if (c.converted.length && c.sources.length) {
    const first = c.sources[0];
    const joined = c.converted.map((u) => ({ ...u, paid: ITEMS[u.itemId]?.price ?? 0, hp: { ...def(u.itemId).str } }));
    setForceUnits(s, first, [...forceUnits(s, first), ...joined]);
    log(s, `${joined.length} Unidade(s) inimiga(s) convertida(s) agora trabalham para a agência.`, 'good');
  }
  if (ok) s.stats.combatsWon++;
  else s.stats.combatsLost++;

  const r = c.reason;
  const cty = s.countries[r.countryId];
  const casualty = lostTotal ? ` Baixas: ${lostTotal}.` : '';

  switch (r.kind) {
    case 'threat': {
      s.threats = s.threats.filter((t) => t.id !== r.threatId);
      const byState = THREAT_BY_STATE[r.threatKind];
      if (ok) {
        pushEvent(s, 'combat', `${THREAT_LABEL[r.threatKind]} repelido`, `A agência segurou a posição em ${cty.name}.${casualty}`, 'good', r.countryId);
        if (byState) cty.reputation -= 4;
        else cty.reputation += 3;
        cty.exposure = Math.min(100, cty.exposure + 6);
      } else {
        if (r.target === 'station') {
          if (r.threatKind === 'raid' || r.threatKind === 'lawsuit') interdict(s, r.countryId);
          else stationLosesLevel(s, r.countryId);
        } else {
          pushEvent(s, 'combat', `${THREAT_LABEL[r.threatKind]}: derrota`, `A Escolta não segurou o ataque em ${cty.name}.${casualty}`, 'bad', r.countryId);
        }
        if (c.directorPresent) captureDirector(s, byState, r.countryId);
      }
      break;
    }
    case 'operation': {
      s.stats.operations++;
      const team = r.by === 'director' ? undefined : s.teams.find((t) => t.id === r.by);
      cty.reputation -= ok ? 20 : 12;
      cty.exposure = Math.min(100, cty.exposure + (ok ? 35 : 45));
      if (ok) {
        if (r.op === 'bank') {
          const loot = Math.round(cty.level * 450_000 * randRange(s, 0.7, 1.3));
          s.cash += loot;
          cty.bankRobbedAt = s.time;
          pushEvent(s, 'combat', 'Roubo a banco concluído', `O cofre em ${cty.name} rendeu US$ ${loot.toLocaleString('pt-BR')}.${casualty}`, 'good', r.countryId);
        } else if (r.op === 'tech') {
          const itemId = STEAL_BY_LEVEL(cty.level);
          const lot = { lid: `l${++s.uidCounter}`, itemId, qty: 1, paidEach: Math.round(ITEMS[itemId].price * 0.5) };
          if (team) team.spoils.push(lot);
          else addCargo(s, itemId, 1, lot.paidEach);
          pushEvent(
            s,
            'combat',
            'Roubo de tecnologia concluído',
            `${ITEMS[itemId].name} capturado em ${cty.name}${team ? ` e guardado pela ${team.name}` : ' e embarcado na Frota'}.${casualty}`,
            'good',
            r.countryId,
          );
        } else {
          cty.politics = pick(s, ['disorder', 'civilwar'] as const);
          pushEvent(s, 'combat', 'Eliminação política concluída', `${cty.name} mergulha em instabilidade; a procura por armas dispara.${casualty}`, 'good', r.countryId);
        }
      } else {
        pushEvent(s, 'combat', `${OPERATION_LABEL[r.op]} fracassou`, `A ação em ${cty.name} deu errado.${casualty}`, 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, true, r.countryId);
      }
      break;
    }
    case 'coup': {
      if (ok) {
        s.stats.coups++;
        cty.reputation = 75;
        cty.politics = 'disorder';
        cty.couped = true;
        cty.exposure = Math.min(100, cty.exposure + 50);
        const bonus = cty.level * 800_000;
        s.cash += bonus;
        pushEvent(s, 'combat', 'Golpe vitorioso', `O novo governo de ${cty.name} deve tudo à agência: Aliado e um "agradecimento" de US$ ${bonus.toLocaleString('pt-BR')}.`, 'good', r.countryId);
      } else {
        cty.reputation = -80;
        pushEvent(s, 'combat', 'Golpe fracassado', `O governo de ${cty.name} resistiu e agora caça a agência.${casualty}`, 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, true, r.countryId);
      }
      break;
    }
    case 'group': {
      const g = s.group;
      if (ok && g) {
        g.defeated = true;
        pushEvent(
          s,
          'mission',
          g.hostage ? 'Refém resgatado' : 'Grupo eliminado',
          g.hostage ? `${g.hostage} está a salvo. ${g.name} foi desmantelado.` : `${g.name} deixou de existir em ${cty.name}.`,
          'good',
          r.countryId,
        );
      } else {
        pushEvent(s, 'combat', 'Confronto perdido', `${g?.name ?? 'O grupo'} escapou em ${cty.name}.${casualty}`, 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, false, r.countryId);
      }
      break;
    }
    case 'appeal': {
      const st = stationIn(s, r.countryId);
      if (ok) {
        liftInterdiction(s, r.countryId);
        pushEvent(s, 'station', 'Recurso vencido', `A Justiça de ${cty.name} devolveu a Estação e liberou as Unidades Detidas.`, 'good', r.countryId);
      } else if (st?.interdicted) {
        st.interdicted.fine = Math.round(st.interdicted.fine * 1.25);
        pushEvent(s, 'station', 'Recurso negado', `A multa em ${cty.name} subiu para US$ ${st.interdicted.fine.toLocaleString('pt-BR')}.`, 'bad', r.countryId);
      }
      break;
    }
    case 'rescue': {
      if (ok) {
        s.director.status = 'free';
        s.director.heldIn = undefined;
        s.director.price = undefined;
        s.director.releaseAt = undefined;
        pushEvent(s, 'director', 'Diretor resgatado', `A Equipe tirou o Diretor do cativeiro em ${cty.name}.`, 'good', r.countryId);
      } else {
        pushEvent(s, 'team', 'Resgate fracassou', `A Equipe não conseguiu chegar ao Diretor em ${cty.name}.${casualty}`, 'bad', r.countryId);
      }
      break;
    }
  }
  // Teams wiped out disappear (their freighter returns home empty).
  for (const t of [...s.teams]) {
    if (t.units.length === 0 && t.spoils.length === 0) {
      if (t.freighter) s.fleet.push(t.freighter);
      s.teams = s.teams.filter((x) => x !== t);
      log(s, `${t.name} foi desfeita: ninguém sobrou.`, 'bad');
    }
  }
  for (const k of Object.keys(s.countries)) {
    const cc = s.countries[k];
    cc.reputation = Math.max(-100, Math.min(100, cc.reputation));
  }
  checkMission(s);
}
