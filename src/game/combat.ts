import { chance, rand, shuffle } from './rng';
import type { RngHolder } from './rng';
import type {
  CombatReason,
  CombatState,
  CombatType,
  CombatUnitRef,
  ForceSource,
  Tactic,
  Unit,
} from './types';
import { canFight, def, FORT_ID, makeFort, nextUid, strOf, usesConvert } from './units';
import type { MintCtx } from './units';

export const ROWS = 3;
export const COLS = 8;
export const DEPLOY_COLS = 3;
export const MAX_TURNS = 10;
const EXCHANGES = 3;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export const TACTICS: Tactic[] = ['assault', 'defensive', 'infiltration', 'negotiate'];

export const TACTIC_LABEL: Record<Tactic, string> = {
  assault: 'Assalto',
  defensive: 'Defensiva',
  infiltration: 'Infiltração',
  negotiate: 'Negociar',
};

export const TACTIC_BLURB: Record<Tactic, string> = {
  assault: 'Avança primeiro e bate mais forte, mas expõe as Unidades a mais dano.',
  defensive: 'Segura a linha de implantação com cobertura. Ótima para defender, ruim para tomar o alvo.',
  infiltration: 'Contorna parte das forças hostis antes do contato; as Unidades lutam com menos apoio.',
  negotiate: 'Abre canal com o outro lado: Agentes de Influência convertem muito mais e advogados rendem mais. Custa dinheiro.',
};

interface TacticMod {
  /** Multiplier on player effective strength. */
  player: number;
  /** Multiplier on enemy effective strength. */
  enemy: number;
  /** Multiplier on conversion chance. */
  convert: number;
  /** Player front never leaves the deploy zone. */
  hold: boolean;
  /** Player moves before enemy within a row. */
  first: boolean;
  /** Share of weakest enemies bypassed at the start. */
  bypass: number;
}

export function tacticMod(t: Tactic, type: CombatType): TacticMod {
  switch (t) {
    case 'assault':
      return { player: 1.25, enemy: 1.12, convert: 1, hold: false, first: true, bypass: 0 };
    case 'defensive':
      return { player: 1, enemy: 0.8, convert: 1, hold: true, first: false, bypass: 0 };
    case 'infiltration':
      return {
        player: 0.92,
        enemy: 1,
        convert: 1,
        hold: false,
        first: false,
        bypass: type === 'urban' || type === 'legal' ? 0.34 : 0.15,
      };
    case 'negotiate':
      return { player: type === 'legal' ? 1.2 : 1, enemy: 0.92, convert: 1.8, hold: false, first: false, bypass: 0 };
  }
}

export interface CombatSetup {
  type: CombatType;
  reason: CombatReason;
  title: string;
  player: Unit[];
  enemy: Unit[];
  tactic: Tactic;
  playerDefends: boolean;
  sources: ForceSource[];
  directorPresent: boolean;
  /** When the player has no fighting units here, the Estação defends itself with this strength per row. */
  fort?: number;
}

export function createCombat(s: MintCtx, setup: CombatSetup): CombatState {
  const mod = tacticMod(setup.tactic, setup.type);
  const c: CombatState = {
    id: nextUid(s, 'c'),
    type: setup.type,
    reason: setup.reason,
    title: setup.title,
    playerDefends: setup.playerDefends,
    tactic: setup.tactic,
    turn: 0,
    maxTurns: MAX_TURNS,
    cols: COLS,
    rows: ROWS,
    deployCols: DEPLOY_COLS,
    units: [],
    reserve: clone(setup.player.filter((u) => canFight(u, setup.type))),
    reach: Array(ROWS).fill(DEPLOY_COLS - 1),
    log: [],
    fx: [],
    converted: [],
    sources: setup.sources,
    directorPresent: setup.directorPresent,
  };

  // Enemy deploys strongest units at its front line, spreading across rows.
  let enemy = clone(setup.enemy.filter((u) => canFight(u, setup.type))).sort(
    (a, b) => strOf(b, setup.type) - strOf(a, setup.type),
  );
  if (mod.bypass > 0 && enemy.length > 1) {
    const skip = Math.min(enemy.length - 1, Math.floor(enemy.length * mod.bypass));
    if (skip > 0) {
      enemy = enemy.slice(0, enemy.length - skip);
      c.log.push(`Infiltração: ${skip} posição(ões) hostil(is) contornada(s) antes do contato.`);
    }
  }
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
    c.log.push('Sem Unidades no local: as defesas fixas da Estação seguram a linha.');
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

/** Combate Automático: strongest units to the front column, spread across rows. */
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

function eff(c: CombatState, ref: CombatUnitRef) {
  const mod = tacticMod(c.tactic, c.type);
  const base = strOf(ref.unit, c.type) * (1 + ref.unit.xp * 0.006);
  return base * (ref.side === 'p' ? mod.player : mod.enemy);
}

function gainXp(u: Unit, n: number) {
  if (u.itemId !== FORT_ID) u.xp = Math.min(100, u.xp + n);
}

function damage(u: Unit, type: CombatType) {
  if (usesConvert(u, type)) u.hp.convert = Math.max(0, u.hp.convert - 1);
  else u.hp[type] = Math.max(0, u.hp[type] - 1);
}

function duel(s: RngHolder, c: CombatState, a: CombatUnitRef, b: CombatUnitRef) {
  const mod = tacticMod(c.tactic, c.type);
  for (let i = 0; i < EXCHANGES; i++) {
    const ea = eff(c, a);
    const eb = eff(c, b);
    const aWins = rand(s) < ea / (ea + eb || 1);
    const [w, l] = aWins ? [a, b] : [b, a];
    gainXp(w.unit, 1);

    // Agentes de Influência try to turn the opponent instead of hurting it.
    if (usesConvert(w.unit, c.type) && l.unit.itemId !== FORT_ID) {
      const conv = strOf(w.unit, c.type);
      const boost = w.side === 'p' ? mod.convert : 1;
      if (chance(s, Math.min(0.9, (0.45 * boost * conv) / (conv + strOf(l.unit, c.type) || 1)))) {
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
export function stepCombat(s: RngHolder, c: CombatState) {
  if (c.result) return;
  const mod = tacticMod(c.tactic, c.type);
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
    const holdLimit = mod.hold ? c.deployCols - 1 : c.cols;
    if (p && p.unit.itemId !== FORT_ID) {
      movers.push(() => {
        const target = p.col + 1;
        if (target >= c.cols) {
          if (!front(c, row, 'e')) {
            c.result = 'win';
            c.fx.push({ kind: 'breach', key: p.key, row, col: p.col });
            c.log.push(`${p.unit.name} rompeu a linha hostil!`);
          }
          return;
        }
        if (target > holdLimit) return;
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
            c.log.push(`${e.unit.name} alcançou o alvo.`);
          }
          return;
        }
        if (!at(c, row, target)) {
          e.col = target;
          c.fx.push({ kind: 'move', key: e.key, row, col: target });
        }
      });
    }
    if (mod.first) movers.forEach((m) => m());
    else shuffle(s, movers).forEach((m) => m());
  }

  if (!c.result) {
    const enemiesLeft = c.units.some((u) => u.side === 'e');
    const playerLeft = c.units.some((u) => u.side === 'p') || c.reserve.length > 0;
    if (!enemiesLeft) {
      c.result = 'win';
      c.log.push('Todas as forças hostis foram neutralizadas.');
    } else if (!playerLeft) {
      c.result = 'lose';
      c.log.push('Não sobrou ninguém para segurar a linha.');
    } else if (c.turn >= c.maxTurns) {
      c.result = 'draw';
      c.log.push(c.playerDefends ? 'A linha aguentou até o fim.' : 'O tempo acabou antes de tomar o alvo.');
    }
  }
}

export function runToEnd(s: RngHolder, c: CombatState) {
  let guard = 0;
  while (!c.result && guard++ < 50) stepCombat(s, c);
}

/** Did the player achieve its goal? A draw favors whoever defends. */
export const succeeded = (c: CombatState) => c.result === 'win' || (c.result === 'draw' && c.playerDefends);

/** Player units that survived (deployed or kept in reserve), forts excluded. */
export function survivors(c: CombatState): Unit[] {
  return [...c.units.filter((u) => u.side === 'p' && u.unit.itemId !== FORT_ID).map((u) => u.unit), ...c.reserve];
}

/** Write combat results back onto a real unit list: update hp/xp, drop the dead. */
export function applyCasualties(c: CombatState, units: Unit[]): { lost: Unit[]; kept: Unit[] } {
  const alive = new Map(survivors(c).map((u) => [u.uid, u]));
  const lost: Unit[] = [];
  const kept: Unit[] = [];
  for (const u of units) {
    if (!canFight(u, c.type) && !alive.has(u.uid)) {
      kept.push(u); // did not take part
      continue;
    }
    const after = alive.get(u.uid);
    if (after) kept.push({ ...u, hp: after.hp, xp: after.xp });
    else lost.push(u);
  }
  return { lost, kept };
}

/** Prévia: chance of success for a Tática, by Monte Carlo over automatic combats on a scratch rng. */
export function estimateWin(setup: Omit<CombatSetup, 'tactic'>, tactic: Tactic, seed: number, runs = 60): number {
  if (!setup.player.some((u) => canFight(u, setup.type)) && !setup.fort) return 0;
  const ctx = { rng: seed | 0, uidCounter: 0 };
  let ok = 0;
  for (let i = 0; i < runs; i++) {
    const c = createCombat(ctx, { ...setup, tactic });
    autoDeploy(c);
    runToEnd(ctx, c);
    if (succeeded(c)) ok++;
  }
  return ok / runs;
}

export const fighterCount = (units: Unit[], type: CombatType) => units.filter((u) => canFight(u, type)).length;

export const isFort = (u: Unit) => def(u.itemId).id === FORT_ID;

export const forceStrength = (units: Unit[], type: CombatType) =>
  units.filter((u) => canFight(u, type)).reduce((a, u) => a + strOf(u, type), 0);
