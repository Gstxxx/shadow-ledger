import type { CombatState, CombatUnitRef } from '../../../game/types';
import { def, FORT_ID } from '../../../game/units';
import { backSet, variantSet } from '../../../art';

/** Estado visual de uma figura na arena num turno. */
export type Pose = 'idle' | 'walk' | 'shoot' | 'hurt';

export interface UnitSprite {
  set: string;
  /** chave da animação por pose; `null` = quadro fixo da pose idle */
  anims: Record<Pose, string>;
  /** idle animado (helicóptero pairando, jato voando) ou parado no 1º quadro */
  idleLoops: boolean;
  /** veículo do pacote XL (atlas próprio por veículo, `vehicles-xl-<id>` e `-back`) */
  xl?: string;
}

const person = (set: string): UnitSprite => ({ set, anims: { idle: 'idle', walk: 'walk', shoot: 'shoot', hurt: 'hurt' }, idleLoops: true });
const ground = (set: string, id: string, idle = `${id}_move`): UnitSprite => ({
  set,
  anims: { idle, walk: `${id}_move`, shoot: `${id}_shoot`, hurt: `${id}_move` },
  idleLoops: idle !== `${id}_move`,
});

/**
 * Classe da Unidade → conjunto de sprites (art-kit, public/sprites). O lado e o tipo de inimigo escolhem o
 * Pessoal: guarda-costas e agentes são "urban"; capangas, "criminal"; polícia e SWAT, "police"; tropa, "military".
 */
const XL = new Set(['technical', 'patrolcar', 'apc', 'tank1', 'tank3', 'heli1', 'heli3']);

export function unitSprite(r: CombatUnitRef): UnitSprite | null {
  const sp = baseSprite(r);
  const id = r.unit.itemId === 'ifv' ? 'apc' : r.unit.itemId;
  // Veículos XL (art-kit, 24e91ee): mesmo nome de animação, um atlas por veículo.
  return sp && XL.has(id) ? { ...sp, set: `vehicles-xl-${id}`, xl: id } : sp;
}

function baseSprite(r: CombatUnitRef): UnitSprite | null {
  const id = r.unit.itemId;
  if (id === FORT_ID) return null;
  switch (id) {
    case 'thug':
      return person('criminal');
    case 'police':
    case 'swat':
      return person('police');
    case 'soldier':
    case 'commando':
      return person('military');
    case 'bodyguard':
    case 'agent':
      return person('urban');
    case 'patrolcar':
      return ground('vehicles-light', 'patrolcar', 'patrolcar_idle');
    case 'technical':
      return ground('vehicles-light', 'technical');
    case 'apc':
    case 'ifv':
      return ground('vehicles-light', 'apc');
    case 'tank1':
    case 'tank3':
      return ground('vehicles-armor', id);
    case 'sam1':
      return { set: 'aircraft-bomber-aa', anims: { idle: 'sam1_move', walk: 'sam1_move', shoot: 'sam1_launch', hurt: 'sam1_move' }, idleLoops: false };
    case 'sam3':
      return { set: 'aircraft-bomber-aa', anims: { idle: 'sam3_raise', walk: 'sam3_raise', shoot: 'sam3_launch', hurt: 'sam3_raise' }, idleLoops: false };
    case 'heli1':
      return { set: 'vehicles-heli', anims: { idle: 'heli1_hover', walk: 'heli1_fly', shoot: 'heli1_shoot', hurt: 'heli1_hover' }, idleLoops: true };
    case 'heli3':
      return { set: 'vehicles-heli', anims: { idle: 'heli3_hover', walk: 'heli3_fly', shoot: 'heli3_cannon', hurt: 'heli3_hover' }, idleLoops: true };
    case 'jet1':
    case 'jet2':
    case 'jet3':
      return { set: 'aircraft-fighters', anims: { idle: `${id}_fly`, walk: `${id}_fly`, shoot: `${id}_missile`, hurt: `${id}_fly` }, idleLoops: true };
    case 'bomber':
      return { set: 'aircraft-bomber-aa', anims: { idle: 'bomber_fly', walk: 'bomber_fly', shoot: 'bomber_bomb', hurt: 'bomber_fly' }, idleLoops: true };
  }
  const cls = def(id).cls;
  if (cls === 'lawyer') return person('legal');
  if (cls === 'influence') return person('influence');
  if (cls === 'human') return person(r.side === 'e' ? 'criminal' : 'urban');
  return null;
}

export const isMachine = (r: CombatUnitRef) => {
  const cls = def(r.unit.itemId).cls;
  return cls === 'vehicle' || cls === 'antiair' || cls === 'heli' || cls === 'jet';
};

/**
 * Poses do turno a partir dos eventos do motor (c.fx): quem andou, quem levou dano e quem atirou.
 * O motor só registra o alvo; o atirador é o oponente vivo mais próximo na mesma linha (senão o mais próximo).
 */
export function posesOf(c: CombatState): Map<string, Pose> {
  const m = new Map<string, Pose>();
  for (const f of c.fx) {
    if (f.kind === 'move') m.set(f.key, 'walk');
  }
  for (const f of c.fx) {
    if (f.kind !== 'hit' && f.kind !== 'down' && f.kind !== 'convert') continue;
    const target = c.units.find((u) => u.key === f.key);
    const side = target?.side ?? (c.units.some((u) => u.key === f.key && u.side === 'p') ? 'p' : 'e');
    const foes = c.units.filter((u) => u.side !== side);
    const dist = (u: CombatUnitRef) => Math.abs(u.col - f.col) + (u.row === f.row ? 0 : 10 * Math.abs(u.row - f.row));
    const shooter = foes.sort((a, b) => dist(a) - dist(b))[0];
    if (shooter && !m.has(shooter.key)) m.set(shooter.key, 'shoot');
    if (target) m.set(f.key, 'hurt');
  }
  return m;
}

/**
 * Atlas exatos que as figuras vão pedir (o IsoToken escolhe a variante por uid e, no inimigo, a vista de costas),
 * mais o vfx: pré-carregar o conjunto base não basta, a variante e o -back chegavam no meio da luta.
 */
export function spriteIdsOf(refs: readonly Pick<CombatUnitRef, 'side' | 'unit'>[]): string[] {
  const ids = new Set<string>(['vfx']);
  for (const r of refs) {
    const sp = unitSprite({ ...r, key: r.unit.uid, row: 0, col: 0 });
    if (!sp) continue;
    const base = sp.xl ? sp.set : variantSet(sp.set, r.unit.uid);
    ids.add(base);
    if (r.side === 'e') ids.add(sp.xl ? `${base}-back` : backSet(base));
  }
  return [...ids];
}

/** Atlas usados neste Combate (para pré-carregar): em campo e na Reserva. */
export const setsOf = (c: CombatState) => spriteIdsOf([...c.units, ...c.reserve.map((unit) => ({ side: 'p' as const, unit }))]);
