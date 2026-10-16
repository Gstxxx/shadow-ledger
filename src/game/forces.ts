import { ITEMS } from './data/items';
import { pick, rand } from './rng';
import type { CombatType, Unit } from './types';
import { makeUnit, strOf } from './units';
import type { MintCtx } from './units';

/** Hostile factions and what they field. */
export type Faction = 'police' | 'court' | 'criminal' | 'military' | 'security' | 'group';

const POOLS: Record<Faction, string[]> = {
  police: ['police', 'swat', 'patrolcar', 'bodyguard'],
  court: ['lawyer1', 'lawyer2', 'lawyer3'],
  criminal: ['thug', 'technical', 'bodyguard', 'soldier', 'swat'],
  military: ['soldier', 'apc', 'tank1', 'commando', 'heli1', 'ifv', 'sam1'],
  security: ['bodyguard', 'police', 'swat', 'patrolcar'],
  group: ['soldier', 'commando', 'technical', 'apc', 'thug', 'swat'],
};

export const FACTION_LABEL: Record<Faction, string> = {
  police: 'Polícia',
  court: 'Promotoria',
  criminal: 'Crime organizado',
  military: 'Forças Armadas',
  security: 'Segurança',
  group: 'Grupo hostil',
};

const MAX_UNITS = 9;

/**
 * Hostile units whose summed strength in `type` reaches `strength`.
 * Picks unit sizes near the strength-per-slot so big forces are not a swarm of pistoleiros.
 */
export function buildForce(s: MintCtx, faction: Faction, strength: number, type: CombatType): Unit[] {
  const pool = POOLS[faction].filter((id) => ITEMS[id] && ITEMS[id].str[type] > 0);
  const usable = pool.length ? pool : ['bodyguard'];
  const target = Math.max(2, strength);
  const units: Unit[] = [];
  let total = 0;
  while (total < target && units.length < MAX_UNITS) {
    const slotsLeft = MAX_UNITS - units.length;
    const want = (target - total) / Math.min(slotsLeft, Math.max(2, Math.ceil(slotsLeft / 2)));
    const sorted = [...usable].sort(
      (a, b) => Math.abs(ITEMS[a].str[type] - want) - Math.abs(ITEMS[b].str[type] - want) + (rand(s) - 0.5) * 1.5,
    );
    const id = rand(s) < 0.8 ? sorted[0] : pick(s, usable);
    const u = makeUnit(s, id, 0);
    // Seasoned opposition at higher strengths.
    u.xp = Math.min(60, Math.round(target * 0.8 * rand(s)));
    units.push(u);
    total += strOf(u, type);
  }
  return units;
}
