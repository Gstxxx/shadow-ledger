// Harness de demonstração para gravar vídeos (headless Chrome). Só liga pela URL:
//   ?demo=combat[&type=urbano|militar|juridico]  → Combate real 9 × 9 que joga sozinho
//   ?demo=markers                                 → mapa com Ameaça, Grupo Hostil, Caçada, Contrato e Estação rival
// Nunca toca no save real: com o demo ligado, gravações em chaves "shadow-ledger*" do localStorage são ignoradas.
import { autoDeploy, createCombat, TACTICS } from '../../../game/combat';
import { PRESETS } from '../../../game/data/rules';
import { newGame, player } from '../../../game/state';
import type { CombatType, GameState, Unit } from '../../../game/types';
import { makeUnit } from '../../../game/units';
import { useGameStore } from '../../../store/game';

const TYPES: Record<string, CombatType> = { urbano: 'urban', urban: 'urban', militar: 'army', army: 'army', juridico: 'legal', legal: 'legal' };

/** Unidades por tipo de Combate: Pessoal e veículos misturados (o Jurídico não usa veículos). */
const ROSTER: Record<CombatType, { p: string[]; e: string[] }> = {
  urban: {
    p: ['bodyguard', 'bodyguard', 'bodyguard', 'bodyguard', 'agent', 'agent', 'patrolcar', 'technical', 'apc'],
    e: ['thug', 'thug', 'thug', 'thug', 'police', 'police', 'swat', 'technical', 'patrolcar'],
  },
  army: {
    p: ['soldier', 'soldier', 'soldier', 'soldier', 'commando', 'commando', 'apc', 'tank1', 'heli1'],
    e: ['soldier', 'soldier', 'soldier', 'soldier', 'commando', 'technical', 'apc', 'tank3', 'heli1'],
  },
  legal: {
    p: ['lawyer1', 'lawyer1', 'lawyer1', 'lawyer2', 'lawyer2', 'lawyer3', 'liaison1', 'liaison1', 'liaison2'],
    e: ['lawyer1', 'lawyer1', 'lawyer1', 'lawyer1', 'lawyer2', 'lawyer2', 'lawyer2', 'lawyer3', 'lawyer3'],
  },
  air: { p: [], e: [] },
};

function guardSaves() {
  const proto = Storage.prototype;
  const set = proto.setItem;
  const del = proto.removeItem;
  proto.setItem = function (k: string, v: string) {
    if (this === localStorage && k.startsWith('shadow-ledger')) return;
    return set.call(this, k, v);
  };
  proto.removeItem = function (k: string) {
    if (this === localStorage && k.startsWith('shadow-ledger')) return;
    return del.call(this, k);
  };
}

function seededGame(): GameState {
  const preset = PRESETS.find((p) => p.id === 'first-contract') ?? PRESETS[0];
  const g = newGame({ preset, difficulty: 2, hardcore: false, seed: 4242 });
  g.events = [];
  return g;
}

function combatDemo(type: CombatType): GameState {
  const g = seededGame();
  const a = player(g);
  const roster = ROSTER[type].p.length ? ROSTER[type] : ROSTER.urban;
  const mk = (ids: string[]): Unit[] => ids.map((id) => makeUnit(g, id));
  const mine = mk(roster.p);
  a.escort = mine;
  const c = createCombat(g, {
    agencyId: a.id,
    type,
    reason: { kind: 'operation', op: 'bank', countryId: a.location, by: 'director' },
    title: 'Demo',
    tactic: TACTICS[0],
    player: mine,
    enemy: mk(roster.e),
    playerDefends: false,
    sources: [{ kind: 'escort' }],
    directorPresent: true,
  });
  autoDeploy(c);
  g.combat = c;
  return g;
}

function markersDemo(): GameState {
  const g = seededGame();
  const a = player(g);
  const t = g.time;
  // Ameaça contra a Estação inicial (ou contra o Diretor, se não houver Estação).
  const st = a.stations[0];
  a.threats.push({ id: 'demo-threat', kind: 'raid', countryId: st?.countryId ?? a.location, target: st ? 'station' : 'director', announcedAt: t, strikesAt: t + 36, strength: 14, reactions: [] });
  // Grupo Hostil avistado no México, Caçada na Colômbia, Contrato no Canadá.
  g.group = { name: 'Os Coiotes', countryId: '484', units: [makeUnit(g, 'thug'), makeUnit(g, 'technical')], nextMoveAt: t + 9999, region: ['NA'], seenAt: { countryId: '484', at: t } };
  g.hostiles = [...(g.hostiles ?? []), { id: 'demo-band', name: 'Bando Serrano', countryId: '170', strength: 22, units: [makeUnit(g, 'soldier')], bounty: 600_000, nextMoveAt: t + 9999, seenAt: { countryId: '170', at: t } }];
  g.contracts.push({ id: 'demo-contract', countryId: '124', buyer: 'Demo', itemId: 'rifles', qty: 5, reward: 450_000, offeredAt: t, offerExpires: t + 99, deadline: t + 240, status: 'accepted', agencyId: a.id, reputation: 5 });
  // Estação de uma Agência Rival em Cuba.
  const rival = g.agencies.find((x) => !x.isPlayer);
  if (rival) rival.stations.push({ countryId: '192', level: 2, units: [], founded: t, vault: [], detained: [] });
  return g;
}

/** Liga o demo se a URL pedir; devolve true quando ligou. */
export function startDemoFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  const mode = q.get('demo');
  if (mode !== 'combat' && mode !== 'markers') return false;
  guardSaves();
  const g = mode === 'combat' ? combatDemo(TYPES[q.get('type') ?? 'urbano'] ?? 'urban') : markersDemo();
  useGameStore.getState().load(g, true);
  return true;
}
