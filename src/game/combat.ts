import { chance, rand, shuffle } from './rng';
import type { CombatReason, CombatState, CombatType, CombatUnitRef, GameState, Unit } from './types';
import { canFight, def, FORT_ID, makeFort, nextUid, strOf, usesConvert } from './units';

export const ROWS = 3;
export const COLS = 8;
export const DEPLOY_COLS = 3;
export const MAX_TURNS = 10;
const EXCHANGES = 3;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export interface CombatSetup {
  type: CombatType;
  reason: CombatReason;
  title: string;
  player: Unit[];
  enemy: Unit[];
  /** When the player has no fighting units here, the station defends itself with this strength per row. */
  fort?: number;
  canRetreat?: boolean;
}

export function createCombat(s: GameState, setup: CombatSetup): CombatState {
  const c: CombatState = {
    id: nextUid(s, 'c'),
    type: setup.type,
    reason: setup.reason,
    title: setup.title,
    turn: 0,
    maxTurns: MAX_TURNS,
    cols: COLS,
    rows: ROWS,
    deployCols: DEPLOY_COLS,
    units: [],
    reserve: clone(setup.player.filter((u) => canFight(u, setup.type))),
    reach: Array(ROWS).fill(DEPLOY_COLS - 1),
    canRetreat: !!setup.canRetreat,
    log: [],
    fx: [],
    converted: [],
  };

  // Enemy deploys strongest units at its front line, spreading across rows.
  const enemy = clone(setup.enemy.filter((u) => canFight(u, setup.type))).sort(
    (a, b) => strOf(b, setup.type) - strOf(a, setup.type),
  );
  const slots: [number, number][] = [];
  for (let col = COLS - DEPLOY_COLS; col < COLS; col++) for (let row = 0; row < ROWS; row++) slots.push([row, col]);
  enemy.slice(0, slots.length).forEach((u, i) => {
    const [row, col] = slots[i];
    c.units.push({ key: u.uid, side: 'e', unit: u, row, col });
  });

  if (setup.fort && c.reserve.length === 0) {
    for (let row = 0; row < ROWS; row++) {
      const f = makeFort(s, setup.fort, setup.type);
      c.units.push({ key: f.uid, side: 'p', unit: f, row, col: 0 });
    }
    c.log.push('A estação não tem unidades: as defesas fixas vão segurar a linha.');
  }
  return c;
}

const at = (c: CombatState, row: number, col: number) => c.units.find((u) => u.row === row && u.col === col);

export function canPlace(c: CombatState, row: number, col: number): boolean {
  if (row < 0 || row >= c.rows || col < 0) return false;
  if (at(c, row, col)) return false;
  const limit = c.turn === 0 ? c.deployCols - 1 : c.reach[row];
  const enemyFront = Math.min(...c.units.filter((u) => u.side === 'e' && u.row === row).map((u) => u.col), c.cols);
  return col <= limit && col < enemyFront;
}

/** Deploy a reserve unit, or move an already deployed player unit, into a cell. */
export function place(c: CombatState, uid: string, row: number, col: number): boolean {
  if (c.result || !canPlace(c, row, col)) return false;
  const deployed = c.units.find((u) => u.key === uid && u.side === 'p');
  if (deployed) {
    if (deployed.unit.itemId === FORT_ID) return false;
    deployed.row = row;
    deployed.col = col;
    return true;
  }
  if (c.turn > 0) return false;
  const i = c.reserve.findIndex((u) => u.uid === uid);
  if (i < 0) return false;
  const [unit] = c.reserve.splice(i, 1);
  c.units.push({ key: unit.uid, side: 'p', unit, row, col });
  return true;
}

export function unplace(c: CombatState, uid: string): boolean {
  if (c.turn > 0) return false;
  const i = c.units.findIndex((u) => u.key === uid && u.side === 'p' && u.unit.itemId !== FORT_ID);
  if (i < 0) return false;
  const [ref] = c.units.splice(i, 1);
  c.reserve.push(ref.unit);
  return true;
}

/** Strongest units to the front column, spread across rows. */
export function autoDeploy(c: CombatState) {
  if (c.turn > 0) return;
  const sorted = [...c.reserve].sort((a, b) => strOf(b, c.type) - strOf(a, c.type));
  for (const u of sorted) {
    let placed = false;
    for (let col = c.deployCols - 1; col >= 0 && !placed; col--) {
      for (let row = 0; row < c.rows && !placed; row++) {
        if (canPlace(c, row, col)) placed = place(c, u.uid, row, col);
      }
    }
  }
}

const eff = (u: Unit, type: CombatType) => strOf(u, type) * (1 + u.xp * 0.006);

function gainXp(u: Unit, n: number) {
  if (u.itemId !== FORT_ID) u.xp = Math.min(100, u.xp + n);
}

function damage(u: Unit, type: CombatType) {
  if (usesConvert(u, type)) u.hp.convert = Math.max(0, u.hp.convert - 1);
  else u.hp[type] = Math.max(0, u.hp[type] - 1);
}

function duel(s: GameState, c: CombatState, a: CombatUnitRef, b: CombatUnitRef) {
  for (let i = 0; i < EXCHANGES; i++) {
    const ea = eff(a.unit, c.type);
    const eb = eff(b.unit, c.type);
    const aWins = rand(s) < ea / (ea + eb);
    const [w, l] = aWins ? [a, b] : [b, a];
    gainXp(w.unit, 1);

    // Influence agents try to turn the opponent instead of hurting it.
    if (usesConvert(w.unit, c.type) && l.unit.itemId !== FORT_ID) {
      const conv = strOf(w.unit, c.type);
      if (chance(s, (0.45 * conv) / (conv + strOf(l.unit, c.type)))) {
        c.units = c.units.filter((u) => u !== l);
        c.fx.push({ kind: 'convert', key: l.key, row: l.row, col: l.col });
        c.log.push(`${w.unit.name} convenceu ${l.unit.name} a trocar de lado.`);
        gainXp(w.unit, 6);
        if (l.side === 'e') c.converted.push(l.unit);
        return;
      }
    }

    damage(l.unit, c.type);
    c.fx.push({ kind: 'hit', key: l.key, row: l.row, col: l.col, dmg: 1 });
    if (strOf(l.unit, c.type) <= 0) {
      c.units = c.units.filter((u) => u !== l);
      c.fx.push({ kind: 'kill', key: l.key, row: l.row, col: l.col });
      c.log.push(`${w.unit.name} derrubou ${l.unit.name}.`);
      gainXp(w.unit, 6);
      return;
    }
  }
}

function front(c: CombatState, row: number, side: 'p' | 'e') {
  const list = c.units.filter((u) => u.row === row && u.side === side);
  if (!list.length) return undefined;
  return list.reduce((best, u) => (side === 'p' ? (u.col > best.col ? u : best) : u.col < best.col ? u : best));
}

/** Advance the battle by one turn. */
export function stepCombat(s: GameState, c: CombatState) {
  if (c.result) return;
  c.turn += 1;
  c.fx = [];

  for (const row of shuffle(s, [...Array(c.rows).keys()])) {
    if (c.result) break;
    const p = front(c, row, 'p');
    const e = front(c, row, 'e');

    if (p && e && e.col - p.col === 1) {
      duel(s, c, p, e);
      continue;
    }

    const movers: (() => void)[] = [];
    if (p && p.unit.itemId !== FORT_ID) {
      movers.push(() => {
        const target = p.col + 1;
        if (target >= c.cols) {
          if (!front(c, row, 'e')) {
            c.result = 'win';
            c.fx.push({ kind: 'breach', key: p.key, row, col: p.col });
            c.log.push(`${p.unit.name} rompeu a linha inimiga!`);
          }
          return;
        }
        if (!at(c, row, target)) {
          p.col = target;
          c.reach[row] = Math.max(c.reach[row], target);
          c.fx.push({ kind: 'move', key: p.key, row, col: target });
        }
      });
    }
    if (e) {
      movers.push(() => {
        const target = e.col - 1;
        if (target < 0) {
          if (!front(c, row, 'p')) {
            c.result = 'lose';
            c.fx.push({ kind: 'breach', key: e.key, row, col: e.col });
            c.log.push(`${e.unit.name} alcançou seu alvo.`);
          }
          return;
        }
        if (!at(c, row, target)) {
          e.col = target;
          c.fx.push({ kind: 'move', key: e.key, row, col: target });
        }
      });
    }
    shuffle(s, movers).forEach((m) => m());
  }

  if (!c.result) {
    const enemiesLeft = c.units.some((u) => u.side === 'e');
    if (!enemiesLeft) {
      c.result = 'win';
      c.log.push('Todas as unidades inimigas foram neutralizadas.');
    } else if (c.turn >= c.maxTurns) {
      c.result = 'draw';
      c.log.push('O confronto terminou sem vencedor.');
    }
  }
}

export function runToEnd(s: GameState, c: CombatState) {
  let guard = 0;
  while (!c.result && guard++ < 50) stepCombat(s, c);
}

/** Player units that survived (deployed or kept in reserve), forts excluded. */
export function survivors(c: CombatState): Unit[] {
  return [...c.units.filter((u) => u.side === 'p' && u.unit.itemId !== FORT_ID).map((u) => u.unit), ...c.reserve];
}

/** Write combat results back onto the real unit list: update hp/xp, drop the dead. */
export function applyCasualties(c: CombatState, units: Unit[], considered: (u: Unit) => boolean): { lost: Unit[]; kept: Unit[] } {
  const alive = new Map(survivors(c).map((u) => [u.uid, u]));
  const lost: Unit[] = [];
  const kept: Unit[] = [];
  for (const u of units) {
    if (!considered(u)) {
      kept.push(u);
      continue;
    }
    const after = alive.get(u.uid);
    if (after) kept.push({ ...u, hp: after.hp, xp: after.xp });
    else lost.push(u);
  }
  return { lost, kept };
}

export const fighterCount = (units: Unit[], type: CombatType) => units.filter((u) => canFight(u, type)).length;

export const isFort = (u: Unit) => def(u.itemId).id === FORT_ID;
