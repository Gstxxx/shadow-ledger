// Foco no combate (backlog item 3): Contratos de combate (proteção de comboio, extração, defesa) e
// Caçadas a grupos hostis com recompensa. Executados pelo Diretor (com a Escolta) ou por uma Equipe no país.
import type { Result } from './actions';
import { estimateWin, TACTICS } from './combat';
import { beginCombat, forceUnits } from './combatFlow';
import { COUNTRY_SEEDS, neighbors } from './data/countries';
import { BUYERS, GROUP_NAMES } from './data/names';
import { COMBAT_JOB, HUNT } from './data/rules';
import { buildForce } from './forces';
import type { Faction } from './forces';
import { chance, pick, randInt, randRange } from './rng';
import { addExposure, addReputation, directorAt, intelCountries, log, M, note, player, ref, say } from './state';
import type {
  Agency,
  CombatContract,
  CombatContractKind,
  CombatSetupData,
  CombatType,
  ForceSource,
  GameState,
  HostileBand,
  Tactic,
} from './types';
import { canFight } from './units';

const ok = (m?: ReturnType<typeof M>): Result => (m ? { ok: true, msg: say(m), m } : { ok: true });
const no = (m: ReturnType<typeof M>): Result => ({ ok: false, msg: say(m), m });

export const COMBAT_JOB_KINDS: CombatContractKind[] = ['convoy', 'extraction', 'defense'];

/** Tipo de Combate, facção inimiga e se a agência defende, por tipo de Contrato de combate. */
export const JOB_SHAPE: Record<CombatContractKind, { type: CombatType; faction: Faction; defends: boolean }> = {
  convoy: { type: 'urban', faction: 'criminal', defends: true },
  extraction: { type: 'urban', faction: 'criminal', defends: false },
  defense: { type: 'army', faction: 'military', defends: true },
};

export const jobsOf = (s: GameState): CombatContract[] => (s.combatContracts ??= []);
export const bandsOf = (s: GameState): HostileBand[] => (s.hostiles ??= []);

// ── Quem luta ───────────────────────────────────────────────

export type JobForce = 'director' | string; // 'director' ou id da Equipe

/** Forças da agência que podem agir num país agora: o Diretor (pousado e livre) e Equipes paradas lá. */
export function forcesIn(a: Agency, countryId: string): JobForce[] {
  const out: JobForce[] = [];
  if (directorAt(a, countryId) && a.escort.length) out.push('director');
  for (const t of a.teams) if (!t.travel && t.location === countryId && t.units.length) out.push(t.id);
  return out;
}

const sourcesFor = (by: JobForce): ForceSource[] => (by === 'director' ? [{ kind: 'escort' }] : [{ kind: 'team', teamId: by }]);

/** Prévia rápida de uma força contra um Contrato ou Caçada: a melhor Tática, em 0..1. */
export function previewForce(s: GameState, a: Agency, by: JobForce, type: CombatType, strength: number, defends: boolean, faction: Faction): number {
  const player = sourcesFor(by).flatMap((src) => forceUnits(a, src));
  if (!player.some((u) => canFight(u, type))) return 0;
  const ctx = { rng: (s.rng ^ 0x2f6b) | 0, uidCounter: 0 };
  const enemy = buildForce(ctx, faction, strength, type);
  const setup = {
    agencyId: a.id,
    type,
    reason: { kind: 'appeal' as const, countryId: a.location },
    title: '',
    player,
    enemy,
    playerDefends: defends,
    sources: sourcesFor(by),
    directorPresent: by === 'director',
  };
  return Math.max(...TACTICS.filter((t) => t !== 'negotiate').map((t: Tactic) => estimateWin(setup, t, ctx.rng, 24)));
}

/** Melhor chance entre as forças disponíveis no país (ou a Escolta, se ninguém está lá): o "risco" mostrado antes de aceitar. */
export function jobRisk(s: GameState, a: Agency, job: CombatContract): { chance: number; by: JobForce; present: boolean } {
  const shape = JOB_SHAPE[job.kind];
  const here = forcesIn(a, job.countryId);
  const candidates: JobForce[] = here.length ? here : a.escort.length ? ['director'] : a.teams.map((t) => t.id);
  let best = { chance: 0, by: candidates[0] ?? 'director', present: here.length > 0 };
  for (const by of candidates) {
    const c = previewForce(s, a, by, shape.type, job.strength, shape.defends, shape.faction);
    if (c > best.chance) best = { chance: c, by, present: here.includes(by) };
  }
  return best;
}

// ── Contratos de combate ────────────────────────────────────

export function rollCombatJobs(s: GameState) {
  const open = jobsOf(s).filter((k) => k.status === 'offered').length;
  if (open >= COMBAT_JOB.maxOffers || !chance(s, COMBAT_JOB.dailyChance)) return;
  const me = player(s);
  // Perto do jogador: países com Estação, o do Diretor e vizinhos — trabalho que ele consegue alcançar.
  const near = new Set<string>([me.location, ...me.stations.map((st) => st.countryId)]);
  for (const id of [...near]) neighbors(id, 4).forEach((n) => near.add(n));
  const pool = [...near].filter((id) => s.countries[id]);
  const countryId = pick(s, pool.length ? pool : Object.keys(s.countries));
  const c = s.countries[countryId];
  const kind = pick(s, COMBAT_JOB_KINDS);
  const days = s.time / 24;
  const strength = Math.round(
    (COMBAT_JOB.baseStrength + c.level * COMBAT_JOB.strengthPerLevel + days * COMBAT_JOB.strengthPerDay) *
      (0.8 + s.options.difficulty * 0.1) *
      randRange(s, 0.6, 1.4),
  );
  const reward = Math.round((strength * COMBAT_JOB.rewardPerStrength * (0.7 + c.level * 0.12)) / 10_000) * 10_000;
  s.uidCounter += 1;
  const job: CombatContract = {
    id: `cj${s.uidCounter}`,
    countryId,
    kind,
    client: pick(s, BUYERS),
    strength,
    reward,
    reputation: randInt(s, 4, 9),
    offeredAt: s.time,
    offerExpires: s.time + randInt(s, 3, 6) * 24,
    deadline: s.time + randInt(s, 8, 16) * 24,
    status: 'offered',
  };
  jobsOf(s).push(job);
  log(s, M('msg.cboard.offered', { kind: { msg: M(`combat.board.kind.${kind}` as never) }, country: ref.country(countryId) }), 'intel', countryId);
}

export function tickCombatJobs(s: GameState) {
  for (const k of jobsOf(s)) {
    if (k.status === 'offered' && s.time >= k.offerExpires) k.status = 'expired';
    if (k.status === 'accepted' && s.time >= k.deadline) {
      k.status = 'failed';
      const a = s.agencies.find((x) => x.id === k.agencyId);
      if (a) {
        addReputation(a, k.countryId, -COMBAT_JOB.failReputation);
        note(s, a, M('msg.cboard.expired', { country: ref.country(k.countryId) }), 'bad', k.countryId);
      }
    }
  }
  s.combatContracts = jobsOf(s).filter((k) => k.status === 'offered' || k.status === 'accepted' || s.time - k.offeredAt < 24 * 15);
}

export function acceptCombatJob(s: GameState, a: Agency, id: string): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const k = jobsOf(s).find((x) => x.id === id);
  if (!k || k.status !== 'offered') return no(M('msg.act.offerUnavailable'));
  if (jobsOf(s).filter((x) => x.status === 'accepted' && x.agencyId === a.id).length >= COMBAT_JOB.maxActive)
    return no(M('msg.cboard.maxActive', { n: COMBAT_JOB.maxActive }));
  k.status = 'accepted';
  k.agencyId = a.id;
  return ok(M('msg.cboard.accepted'));
}

/** Cumpre o Contrato agora: a força escolhida precisa estar no país. Diretor = Prévia e Tática; Equipe = Combate Automático. */
export function fightCombatJob(s: GameState, a: Agency, id: string, by: JobForce): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const k = jobsOf(s).find((x) => x.id === id);
  if (!k || (k.status !== 'accepted' && k.status !== 'offered')) return no(M('msg.act.offerUnavailable'));
  if (!forcesIn(a, k.countryId).includes(by)) return no(M('msg.cboard.notHere'));
  if (k.status === 'offered') {
    const r = acceptCombatJob(s, a, id);
    if (!r.ok) return r;
  } else if (k.agencyId !== a.id) return no(M('msg.act.offerUnavailable'));
  const shape = JOB_SHAPE[k.kind];
  const title = M(`msg.cboard.title.${k.kind}` as never, { country: ref.country(k.countryId) });
  const data: CombatSetupData = {
    type: shape.type,
    reason: { kind: 'job', jobId: k.id, countryId: k.countryId, by },
    title: '',
    titleMsg: title,
    enemy: buildForce(s, shape.faction, k.strength, shape.type),
    sources: sourcesFor(by),
    playerDefends: shape.defends,
    directorPresent: by === 'director',
  };
  beginCombat(s, a, data);
  return ok();
}

/** Resultado de um Contrato de combate (chamado por resolveCombat). */
export function resolveCombatJob(s: GameState, a: Agency, jobId: string, won: boolean, casualty: ReturnType<typeof ref.casualty>) {
  const k = jobsOf(s).find((x) => x.id === jobId);
  if (!k) return;
  const country = ref.country(k.countryId);
  if (won) {
    k.status = 'done';
    a.cash += k.reward;
    addReputation(a, k.countryId, k.reputation);
    addExposure(s, a, k.countryId, COMBAT_JOB.exposure);
    a.stats.contractsDone++;
    return { title: M('msg.cboard.wonTitle'), body: M('msg.cboard.wonBody', { client: k.client, reward: ref.money(k.reward), country, casualty }), tone: 'good' as const };
  }
  k.status = 'failed';
  addReputation(a, k.countryId, -COMBAT_JOB.failReputation);
  return { title: M('msg.cboard.lostTitle'), body: M('msg.cboard.lostBody', { country, casualty }), tone: 'bad' as const };
}

// ── Caçadas a grupos hostis ─────────────────────────────────

/** Grupos hostis são bandos armados nas cidades: Combate Urbano. */
const HUNT_TYPE: CombatType = 'urban';

let bandNameCursor = 0;

function spawnBand(s: GameState) {
  // Perto da agência (Estações, Diretor e vizinhos), para a Caçada ser alcançável.
  const me = player(s);
  const near = new Set<string>([me.location, ...me.stations.map((st) => st.countryId)]);
  for (const id of [...near]) neighbors(id, 5).forEach((n) => near.add(n));
  const pool = COUNTRY_SEEDS.filter((c) => c.level <= 4 && near.has(c.id));
  const c = pick(s, pool.length ? pool : COUNTRY_SEEDS.filter((x) => x.level <= 4));
  const days = s.time / 24;
  const strength = Math.round(
    (HUNT.baseStrength + days * HUNT.strengthPerDay) * (0.8 + s.options.difficulty * 0.1) * randRange(s, 0.8, 1.3),
  );
  s.uidCounter += 1;
  const used = new Set(bandsOf(s).map((b) => b.name));
  const free = GROUP_NAMES.filter((n) => !used.has(n) && n !== s.group?.name);
  const name = free.length ? pick(s, free) : `${GROUP_NAMES[bandNameCursor++ % GROUP_NAMES.length]} ${s.uidCounter}`;
  const band: HostileBand = {
    id: `hb${s.uidCounter}`,
    name,
    countryId: c.id,
    strength,
    units: buildForce(s, 'group', strength, HUNT_TYPE),
    bounty: Math.round((strength * HUNT.bountyPerStrength) / 10_000) * 10_000,
    nextMoveAt: s.time + randRange(s, HUNT.moveEveryH[0], HUNT.moveEveryH[1]),
    seenAt: { countryId: c.id, at: s.time },
  };
  bandsOf(s).push(band);
  log(s, M('msg.cboard.bandSpawned', { band: name, bounty: ref.money(band.bounty), country: ref.country(c.id) }), 'intel', c.id);
}

/** Grupos hostis se movem e reaparecem; a agência só sabe onde estão onde tem informação. */
export function tickHunts(s: GameState) {
  const bands = bandsOf(s);
  const me = player(s);
  const intel = intelCountries(me);
  for (const b of bands) {
    if (s.time >= b.nextMoveAt) {
      const near = neighbors(b.countryId, 5);
      b.countryId = pick(s, near.length ? near : [b.countryId]);
      b.nextMoveAt = s.time + randRange(s, HUNT.moveEveryH[0], HUNT.moveEveryH[1]);
    }
    if (intel.has(b.countryId) && b.seenAt?.countryId !== b.countryId) {
      b.seenAt = { countryId: b.countryId, at: s.time };
      log(s, M('msg.cboard.bandSeen', { band: b.name, country: ref.country(b.countryId) }), 'intel', b.countryId);
    }
  }
}

export function dailyHunts(s: GameState) {
  const want = HUNT.bands[s.options.difficulty] ?? 2;
  if (bandsOf(s).length < want && chance(s, 0.35)) spawnBand(s);
}

/** Onde a agência acha que o grupo está (último avistamento). */
export const bandKnownAt = (b: HostileBand) => b.seenAt?.countryId;

export function huntRisk(s: GameState, a: Agency, band: HostileBand): { chance: number; by: JobForce; present: boolean } {
  const here = forcesIn(a, band.countryId);
  const candidates: JobForce[] = here.length ? here : a.escort.length ? ['director'] : a.teams.map((t) => t.id);
  let best = { chance: 0, by: candidates[0] ?? 'director', present: here.length > 0 };
  for (const by of candidates) {
    const c = previewForce(s, a, by, HUNT_TYPE, band.strength, false, 'group');
    if (c > best.chance) best = { chance: c, by, present: here.includes(by) };
  }
  return best;
}

export function huntBand(s: GameState, a: Agency, id: string, by: JobForce): Result {
  if (s.over) return no(M('msg.act.gameOver'));
  const b = bandsOf(s).find((x) => x.id === id);
  if (!b) return no(M('msg.cboard.bandGone'));
  if (!forcesIn(a, b.countryId).includes(by)) return no(M('msg.cboard.bandNotHere'));
  beginCombat(s, a, {
    type: HUNT_TYPE,
    reason: { kind: 'hunt', bandId: b.id, countryId: b.countryId, by },
    title: '',
    titleMsg: M('msg.cboard.huntTitle', { band: b.name, country: ref.country(b.countryId) }),
    enemy: b.units,
    sources: sourcesFor(by),
    playerDefends: false,
    directorPresent: by === 'director',
  });
  return ok();
}

export function resolveHunt(s: GameState, a: Agency, bandId: string, won: boolean, casualty: ReturnType<typeof ref.casualty>) {
  const b = bandsOf(s).find((x) => x.id === bandId);
  if (!b) return;
  const country = ref.country(b.countryId);
  if (won) {
    s.hostiles = bandsOf(s).filter((x) => x !== b);
    a.cash += b.bounty;
    addReputation(a, b.countryId, HUNT.reputation);
    addExposure(s, a, b.countryId, HUNT.exposure);
    return { title: M('msg.cboard.huntWonTitle'), body: M('msg.cboard.huntWonBody', { band: b.name, bounty: ref.money(b.bounty), country, casualty }), tone: 'good' as const };
  }
  // O grupo foge para um vizinho e fica mais esperto.
  b.countryId = pick(s, neighbors(b.countryId, 4));
  b.nextMoveAt = s.time + HUNT.moveEveryH[0];
  return { title: M('msg.cboard.huntLostTitle'), body: M('msg.cboard.huntLostBody', { band: b.name, country, casualty }), tone: 'bad' as const };
}
