// Combat orchestration: gather forces, Prévia, Tática, Combate Automático, and outcomes.
import { addCargo, addLot, lotId } from './cargo';
import { applyCasualties, autoDeploy, createCombat, estimateWin, runToEnd, succeeded, TACTICS } from './combat';
import type { CombatSetup } from './combat';
import { ITEMS, STEAL_TABLE } from './data/items';
import { OPERATION_LABEL, STATIONS, THREAT_BY_STATE, THREAT_LABEL } from './data/rules';
import { TRAITS } from './data/traits';
import { checkObjective } from './objective';
import { pick, randInt, randRange } from './rng';
import {
  addExposure,
  addReputation,
  addTension,
  agencyById,
  note,
  notify,
  player,
  standing,
  stationIn,
} from './state';
import type { Agency, CombatSetupData, CombatState, ForceSource, GameState, StationLevel, Tactic, Unit } from './types';
import { def, promote, restore, traitMult } from './units';

const money = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;

export function forceUnits(a: Agency, src: ForceSource): Unit[] {
  switch (src.kind) {
    case 'escort':
      return a.escort;
    case 'station':
      return stationIn(a, src.countryId)?.units ?? [];
    case 'team':
      return a.teams.find((t) => t.id === src.teamId)?.units ?? [];
  }
}

function setForceUnits(a: Agency, src: ForceSource, units: Unit[]) {
  switch (src.kind) {
    case 'escort':
      a.escort = units;
      return;
    case 'station': {
      const st = stationIn(a, src.countryId);
      if (st) st.units = units;
      return;
    }
    case 'team': {
      const t = a.teams.find((x) => x.id === src.teamId);
      if (t) t.units = units;
      return;
    }
  }
}

function toSetup(a: Agency, data: CombatSetupData): Omit<CombatSetup, 'tactic'> {
  return {
    agencyId: a.id,
    type: data.type,
    reason: data.reason,
    title: data.title,
    enemy: data.enemy,
    player: data.sources.flatMap((src) => forceUnits(a, src)),
    playerDefends: data.playerDefends,
    sources: data.sources,
    directorPresent: data.directorPresent,
    fort: data.fort,
  };
}

/** Prévia for every Tática. Uses a scratch rng derived from the game, never the game's own cursor. */
export function previewAll(s: GameState, a: Agency, data: CombatSetupData, runs = 60): Record<Tactic, number> {
  const setup = toSetup(a, data);
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
 * Start a combat. With the player's Diretor present it waits for the Tática (pendingCombat);
 * otherwise it is a Combate Automático resolved on the spot with the best Tática by Prévia.
 */
export function beginCombat(s: GameState, a: Agency, data: CombatSetupData) {
  if (data.directorPresent && a.isPlayer) {
    s.pendingCombat = { agencyId: a.id, setup: data, preview: previewAll(s, a, data) };
    notify(s, a, 'engage', data.title, 'Escolha a Tática. A Prévia mostra a chance estimada de cada uma.', 'warn', data.reason.countryId);
    return;
  }
  const preview = previewAll(s, a, data, 24);
  const tactic = TACTICS.filter((t) => t !== 'negotiate').reduce(
    (best, t) => (preview[t] > preview[best] ? t : best),
    'defensive' as Tactic,
  );
  const c = createCombat(s, { ...toSetup(a, data), tactic });
  autoDeploy(c);
  runToEnd(s, c);
  resolveCombat(s, c);
}

/** Player picked a Tática for the pending combat. `manual` = assumir a grade. */
export function chooseTactic(s: GameState, tactic: Tactic, manual: boolean): boolean {
  const pend = s.pendingCombat;
  if (!pend) return false;
  const a = agencyById(s, pend.agencyId) ?? player(s);
  if (tactic === 'negotiate') {
    const cost = negotiateCost(s, pend.setup);
    if (a.cash < cost) return false;
    a.cash -= cost;
  }
  const c = createCombat(s, { ...toSetup(a, pend.setup), tactic });
  if (!manual) autoDeploy(c);
  s.pendingCombat = undefined;
  s.combat = c;
  s.events = s.events.filter((e) => e.kind !== 'engage');
  return true;
}

/** Abort a pending combat the player started (Operações, Golpe, recurso). Ameaças cannot be refused. */
export function abortPending(s: GameState): boolean {
  const pend = s.pendingCombat;
  if (!pend || pend.setup.reason.kind === 'threat' || pend.setup.reason.kind === 'group') return false;
  s.pendingCombat = undefined;
  s.events = s.events.filter((e) => e.kind !== 'engage');
  note(s, player(s), `${pend.setup.title}: abortado antes do contato.`, 'info', pend.setup.reason.countryId);
  return true;
}

/** Finish the live combat (after the player watched or played it). */
export function finishCombat(s: GameState) {
  const c = s.combat;
  if (!c) return;
  if (!c.result) {
    if (c.turn === 0) autoDeploy(c);
    runToEnd(s, c);
  }
  s.combat = undefined;
  resolveCombat(s, c);
}

/** Diretor perde: Detido (Estado), Sequestrado (crime) ou morto (Modo Hardcore). */
export function captureDirector(s: GameState, a: Agency, byState: boolean, countryId: string) {
  const c = s.countries[countryId];
  if (s.options.hardcore && a.isPlayer) {
    a.director.status = 'dead';
    notify(s, a, 'director', 'Diretor morto', `O Diretor caiu em ${c.name}. No Modo Hardcore não há segunda chance.`, 'bad', countryId);
    checkObjective(s);
    return;
  }
  a.director.heldIn = countryId;
  if (byState) {
    a.director.status = 'detained';
    a.director.releaseAt = s.time + randInt(s, 6, 14) * 24;
    a.director.price = Math.round(150_000 * c.level * (1 + s.options.difficulty * 0.3));
    notify(s, a, 'director', 'Diretor Detido', `As autoridades de ${c.name} prenderam o Diretor. Pague a fiança ou espere a soltura.`, 'bad', countryId);
  } else {
    a.director.status = 'kidnapped';
    a.director.releaseAt = undefined;
    a.director.price = Math.round(400_000 * c.level * (1 + s.options.difficulty * 0.4));
    notify(s, a, 'director', 'Diretor Sequestrado', `Criminosos levaram o Diretor em ${c.name}. Pague o resgate ou mande uma Equipe.`, 'bad', countryId);
  }
}

export function stationLosesLevel(s: GameState, a: Agency, countryId: string) {
  const st = stationIn(a, countryId);
  if (!st) return;
  const name = s.countries[countryId].name;
  if (st.level === 1) {
    a.stations = a.stations.filter((x) => x !== st);
    notify(s, a, 'station', 'Célula destruída', `A Célula em ${name} foi destruída, com o Cofre e as Unidades que sobraram.`, 'bad', countryId);
    return;
  }
  st.level = (st.level - 1) as StationLevel;
  const spec = STATIONS[st.level];
  // Units that no longer fit or are no longer allowed are lost.
  const keep = st.units.filter((u) => spec.allows.includes(def(u.itemId).cls)).slice(0, spec.capacity);
  const lost = st.units.length - keep.length;
  st.units = keep;
  notify(s, a, 'station', 'Estação rebaixada', `A Estação em ${name} caiu para ${spec.name}${lost ? ` e perdeu ${lost} Unidade(s)` : ''}.`, 'bad', countryId);
}

function interdict(s: GameState, a: Agency, countryId: string) {
  const st = stationIn(a, countryId);
  if (!st) return;
  const c = s.countries[countryId];
  const fine = Math.round(STATIONS[st.level].cost * 0.35 + 120_000 * c.level);
  st.interdicted = { fine, since: s.time };
  st.detained.push(...st.units);
  st.units = [];
  notify(
    s,
    a,
    'station',
    'Estação Interditada',
    `O Estado apreendeu a Estação em ${c.name}; ${st.detained.length} Unidade(s) Detida(s). Multa: ${money(fine)}.`,
    'bad',
    countryId,
  );
}

export function liftInterdiction(a: Agency, countryId: string) {
  const st = stationIn(a, countryId);
  if (!st?.interdicted) return;
  st.interdicted = undefined;
  st.units.push(...st.detained);
  st.detained = [];
}

const stealByLevel = (level: number) => STEAL_TABLE[Math.min(STEAL_TABLE.length - 1, Math.max(0, level - 1))];

/** Exposição multiplier from Discreto members of the force. */
const discretion = (units: Unit[]) => Math.min(1, ...units.map((u) => traitMult(u, 'exposure')));

/** Write results back, then apply what the outcome means for the agency. */
export function resolveCombat(s: GameState, c: CombatState) {
  const a = agencyById(s, c.agencyId) ?? player(s);
  const ok = succeeded(c);
  let lostTotal = 0;
  let downedTotal = 0;
  const involved: Unit[] = [];
  for (const src of c.sources) {
    const { lost, kept, downed } = applyCasualties(c, forceUnits(a, src));
    lostTotal += lost.length;
    downedTotal += downed.length;
    involved.push(...kept);
    setForceUnits(a, src, kept);
  }
  for (const u of involved) {
    const t = promote(s, u);
    if (t) note(s, a, `${u.name} subiu de patente e ganhou o Traço ${TRAITS[t].name}.`, 'good');
  }
  // Converted enemies join the first force on the field.
  if (c.converted.length && c.sources.length) {
    const first = c.sources[0];
    const joined = c.converted.map((u) => {
      const v = { ...u, paid: ITEMS[u.itemId]?.price ?? 0, injury: undefined };
      restore(v);
      return v;
    });
    setForceUnits(a, first, [...forceUnits(a, first), ...joined]);
    note(s, a, `${joined.length} Unidade(s) inimiga(s) convertida(s) agora trabalham para a agência.`, 'good');
  }
  if (ok) a.stats.combatsWon++;
  else a.stats.combatsLost++;

  const r = c.reason;
  const cty = s.countries[r.countryId];
  const parts: string[] = [];
  if (downedTotal) parts.push(`${downedTotal} fora de ação (Feridas/Danificadas)`);
  if (lostTotal) parts.push(`${lostTotal} convertida(s) pelo outro lado`);
  const casualty = parts.length ? ` ${parts.join('; ')}.` : '';
  const quiet = discretion(involved);

  switch (r.kind) {
    case 'threat': {
      a.threats = a.threats.filter((t) => t.id !== r.threatId);
      const byState = THREAT_BY_STATE[r.threatKind];
      if (ok) {
        notify(s, a, 'combat', `${THREAT_LABEL[r.threatKind]}: defesa bem-sucedida`, `A agência segurou a posição em ${cty.name}.${casualty}`, 'good', r.countryId);
        addReputation(a, r.countryId, byState ? -4 : 3);
        addExposure(a, r.countryId, 6);
      } else {
        if (r.target === 'station') {
          if (r.threatKind === 'raid' || r.threatKind === 'lawsuit') interdict(s, a, r.countryId);
          else stationLosesLevel(s, a, r.countryId);
        } else {
          notify(s, a, 'combat', `${THREAT_LABEL[r.threatKind]}: derrota`, `A Escolta não segurou o ataque em ${cty.name}.${casualty}`, 'bad', r.countryId);
        }
        if (c.directorPresent) captureDirector(s, a, byState, r.countryId);
      }
      break;
    }
    case 'operation': {
      a.stats.operations++;
      const team = r.by === 'director' ? undefined : a.teams.find((t) => t.id === r.by);
      addReputation(a, r.countryId, ok ? -20 : -12);
      addExposure(a, r.countryId, (ok ? 35 : 45) * quiet);
      addTension(s, r.op === 'neutralize' ? 6 : 3);
      if (ok) {
        if (r.op === 'bank') {
          const loot = Math.round(cty.level * 450_000 * randRange(s, 0.7, 1.3));
          a.cash += loot;
          cty.bankRobbedAt = s.time;
          notify(s, a, 'combat', 'Roubo a banco concluído', `O cofre central em ${cty.name} rendeu ${money(loot)}.${casualty}`, 'good', r.countryId);
        } else if (r.op === 'tech') {
          const itemId = stealByLevel(cty.level);
          const paid = Math.round(ITEMS[itemId].price * 0.5);
          if (team) {
            addLot(team.spoils, lotId, itemId, 1, paid);
            for (const l of team.spoils) if (l.itemId === itemId) l.fresh = true;
          }
          else addCargo(a, itemId, 1, paid);
          notify(
            s,
            a,
            'combat',
            'Roubo de tecnologia concluído',
            team
              ? `${team.name} capturou ${ITEMS[itemId].name} em ${cty.name}. Venda agora ao Receptador ou leve a um Cofre ou ao Diretor.${casualty}`
              : `${ITEMS[itemId].name} capturado em ${cty.name} e embarcado na Frota.${casualty}`,
            'good',
            r.countryId,
          );
        } else {
          cty.politics = pick(s, ['disorder', 'civilwar'] as const);
          notify(s, a, 'combat', 'Neutralização concluída', `O alvo saiu de cena. ${cty.name} entra em instabilidade e as armas encarecem.${casualty}`, 'good', r.countryId);
        }
      } else {
        notify(s, a, 'combat', `${OPERATION_LABEL[r.op]} fracassou`, `A ação em ${cty.name} deu errado.${casualty}`, 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, a, true, r.countryId);
      }
      break;
    }
    case 'coup': {
      addTension(s, 12);
      if (ok) {
        a.stats.coups++;
        standing(a, r.countryId).reputation = 75;
        cty.politics = 'disorder';
        cty.couped = true;
        addExposure(a, r.countryId, 50);
        const bonus = cty.level * 800_000;
        a.cash += bonus;
        notify(s, a, 'combat', 'Golpe vitorioso', `O novo governo de ${cty.name} deve tudo à agência: Aliado, e um "agradecimento" de ${money(bonus)}.`, 'good', r.countryId);
      } else {
        standing(a, r.countryId).reputation = -80;
        notify(s, a, 'combat', 'Golpe fracassado', `O governo de ${cty.name} resistiu e agora caça a agência.${casualty}`, 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, a, true, r.countryId);
      }
      break;
    }
    case 'group': {
      const g = s.group;
      if (ok && g) {
        g.defeated = true;
        notify(
          s,
          a,
          'objective',
          g.hostage ? 'Refém resgatado' : 'Grupo eliminado',
          g.hostage ? `${g.hostage} está a salvo. ${g.name} foi desmantelado.` : `${g.name} deixou de existir em ${cty.name}.`,
          'good',
          r.countryId,
        );
      } else {
        notify(s, a, 'combat', 'Confronto perdido', `${g?.name ?? 'O grupo'} escapou em ${cty.name}.${casualty}`, 'bad', r.countryId);
        if (c.directorPresent) captureDirector(s, a, false, r.countryId);
      }
      break;
    }
    case 'appeal': {
      const st = stationIn(a, r.countryId);
      if (ok) {
        liftInterdiction(a, r.countryId);
        notify(s, a, 'station', 'Recurso vencido', `A Justiça de ${cty.name} devolveu a Estação e liberou as Unidades Detidas.`, 'good', r.countryId);
      } else if (st?.interdicted) {
        st.interdicted.fine = Math.round(st.interdicted.fine * 1.25);
        notify(s, a, 'station', 'Recurso negado', `A multa em ${cty.name} subiu para ${money(st.interdicted.fine)}.`, 'bad', r.countryId);
      }
      break;
    }
    case 'hostile': {
      const target = agencyById(s, r.targetId);
      addReputation(a, r.countryId, -10);
      addExposure(a, r.countryId, 30 * quiet);
      if (!target) break;
      const label = r.act === 'sabotage' ? 'Sabotagem' : 'Assalto ao Cofre';
      if (ok) {
        if (r.act === 'sabotage') stationLosesLevel(s, target, r.countryId);
        else {
          const st = stationIn(target, r.countryId);
          const team = a.teams.find((t) => t.id === r.teamId);
          if (st && team) {
            for (const l of st.vault) addLot(team.spoils, lotId, l.itemId, l.qty, l.paidEach);
            for (const l of team.spoils) l.fresh = true;
            st.vault = [];
          }
        }
        notify(s, a, 'combat', `${label} concluído`, `A ação contra ${target.name} em ${cty.name} deu certo.${casualty}`, 'good', r.countryId);
        notify(s, target, 'station', `${label} sofrido`, `${a.name} atacou a Estação em ${cty.name}.`, 'bad', r.countryId);
      } else {
        notify(s, a, 'combat', `${label} fracassou`, `A Estação de ${target.name} em ${cty.name} resistiu.${casualty}`, 'bad', r.countryId);
        notify(s, target, 'station', 'Ataque repelido', `A Estação em ${cty.name} repeliu ${a.name}.`, 'good', r.countryId);
      }
      break;
    }
    case 'intercept': {
      const team = a.teams.find((t) => t.id === r.teamId);
      if (ok) {
        notify(s, a, 'team', 'Interceptação evitada', `${team?.name ?? 'A Equipe'} passou pela polícia de ${cty.name} com a carga.${casualty}`, 'good', r.countryId);
      } else if (team) {
        team.spoils = [];
        notify(s, a, 'team', 'Itens apreendidos', `A polícia de ${cty.name} apreendeu o que a ${team.name} carregava.${casualty}`, 'bad', r.countryId);
      }
      break;
    }
    case 'rescue': {
      if (ok) {
        a.director.status = 'free';
        a.director.heldIn = undefined;
        a.director.price = undefined;
        a.director.releaseAt = undefined;
        notify(s, a, 'director', 'Diretor resgatado', `A Equipe tirou o Diretor do cativeiro em ${cty.name}.`, 'good', r.countryId);
      } else {
        notify(s, a, 'team', 'Resgate fracassou', `A Equipe não conseguiu chegar ao Diretor em ${cty.name}.${casualty}`, 'bad', r.countryId);
      }
      break;
    }
  }
  // Hired local security leaves once the fight is over.
  for (const st of a.stations) st.units = st.units.filter((u) => !u.temp);
  // Teams with nobody left are dissolved; a Cargueiro Destacado flies back to the Frota.
  for (const t of [...a.teams]) {
    if (t.units.length === 0 && t.spoils.length === 0) {
      if (t.freighter) a.fleet.push(t.freighter);
      a.teams = a.teams.filter((x) => x !== t);
      note(s, a, `${t.name} foi desfeita: não sobrou ninguém.`, 'bad');
    }
  }
  checkObjective(s);
}
