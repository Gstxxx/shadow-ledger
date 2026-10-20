// Fluxo da Campanha: monta a partida de cada Capítulo a partir do estado da Campanha, mede o resultado
// e leva Diretor, Origem, Veteranos, Reputação e bônus de caixa para o próximo. Puro: não toca o storage.
import type { Key } from '../../i18n';
import { CAMPAIGN } from '../data/rules';
import { M } from '../msg';
import { allUnits, assets, dayOf, newGame, notify, player, profit, standing } from '../state';
import type { GameState, Unit } from '../types';
import { def, isPersonnel, nextUid } from '../units';
import { CHAPTER_COUNT, chapterDef, MORAVIA } from './chapters';
import type { CampaignState, ChapterResult, NewCampaignOptions } from './types';

/** Suba quando CampaignState mudar de forma (e migre em loadCampaign). */
export const CAMPAIGN_VERSION = 1;

export function newCampaign(o: NewCampaignOptions): CampaignState {
  return {
    campaignVersion: CAMPAIGN_VERSION,
    seed: o.seed ?? Math.floor(Math.random() * 2 ** 31),
    difficulty: o.difficulty,
    hardcore: o.hardcore,
    origin: o.origin,
    directorName: o.directorName?.trim() || undefined,
    agencyName: o.agencyName?.trim() || undefined,
    chapter: 1,
    attempts: 0,
    veterans: [],
    reputation: {},
    lastProfit: 0,
    dossier: [],
    history: [],
    status: 'active',
  };
}

/** Bônus de caixa do Capítulo `n` sobre o Lucro anterior: 20%, com teto, nunca negativo. */
export function cashBonus(lastProfit: number, n: number): number {
  const base = chapterDef(n).preset.cash;
  return Math.round(Math.max(0, Math.min(lastProfit * CAMPAIGN.cashBonusRate, base * CAMPAIGN.cashBonusCap)));
}

/** Veterano pronto para o próximo Capítulo: Feridas saradas, força cheia, sem estado de partida. */
export function healVeteran(u: Unit): Unit {
  const v: Unit = JSON.parse(JSON.stringify(u)) as Unit;
  v.hp = { ...def(v.itemId).str };
  delete v.injury;
  delete v.idle;
  delete v.temp;
  return v;
}

/** Semente de uma tentativa: a mesma Campanha e tentativa geram o mesmo mundo. */
const chapterSeed = (c: CampaignState) => (c.seed + c.chapter * 7919 + c.attempts * 104729) % 2 ** 31;

/** Monta a partida do Capítulo atual. Não altera a Campanha (o retry parte do mesmo estado). */
export function startChapter(c: CampaignState): GameState {
  const ch = chapterDef(c.chapter);
  const s = newGame({
    preset: ch.preset,
    difficulty: c.difficulty,
    hardcore: c.hardcore,
    origin: c.origin,
    directorName: c.directorName,
    agencyName: c.agencyName,
    rivals: ch.rival ? 1 : 0,
    seed: chapterSeed(c),
  });
  s.campaign = { chapter: ch.n, beats: [] };
  const a = player(s);

  // Reputação levada: substitui o sorteio, mas o país inicial e as Estações mantêm o piso do Preset.
  for (const [id, rep] of Object.entries(c.reputation)) if (s.countries[id]) standing(a, id).reputation = rep;
  standing(a, ch.preset.startCountry).reputation = Math.max(standing(a, ch.preset.startCountry).reputation, 25);
  for (const st of ch.preset.startStations) standing(a, st.countryId).reputation = Math.max(standing(a, st.countryId).reputation, 10);

  // Veteranos entram na Escolta com uid novo (evita colisão com as Unidades desta partida).
  for (const v of c.veterans) a.escort.push({ ...healVeteran(v), uid: nextUid(s) });
  a.cash += cashBonus(c.lastProfit, ch.n);

  // Casa Moravia: nome fixo e força do Capítulo.
  const rival = s.agencies.find((x) => !x.isPlayer);
  if (rival && ch.rival) {
    rival.name = MORAVIA;
    rival.cash = Math.round(rival.cash * CAMPAIGN.rivalCash[ch.rival]);
    if (ch.rival === 'weak') rival.escort = rival.escort.slice(0, Math.max(1, Math.ceil(rival.escort.length / 2)));
    rival.capital = assets(rival);
  }
  if (s.group) {
    if (ch.group) s.group.name = ch.group;
    if (ch.hostage && s.group.hostage) s.group.hostage = ch.hostage;
  }
  // O Lucro do Capítulo começa em zero, com Veteranos e bônus já no caixa.
  a.capital = assets(a);
  tickCampaign(s);
  return s;
}

/** Falas do Analista: dispara as que já chegaram ao seu momento do prazo. Chamado pelo relógio. */
export function tickCampaign(s: GameState) {
  const mark = s.campaign;
  if (!mark || s.over) return;
  const ch = chapterDef(mark.chapter);
  const total = ch.preset.days * 24;
  ch.beats.forEach((b, i) => {
    if (mark.beats.includes(i) || s.time < b.at * total) return;
    mark.beats.push(i);
    notify(s, player(s), 'intel', M('campaign.brief.analyst' as Key), M(b.key as Key), 'info');
  });
}

/** Pessoal vivo que pode virar Veterano (fora Detidos e segurança temporária). */
export function veteranCandidates(s: GameState): Unit[] {
  return allUnits(player(s)).filter((u) => isPersonnel(u) && !u.temp);
}

/** Resultado do Capítulo terminado (s.over), para o Debriefing ou a tela de derrota. */
export function chapterResult(c: CampaignState, s: GameState): ChapterResult {
  const won = !!s.over?.won;
  const ch = chapterDef(c.chapter);
  const p = Math.round(profit(player(s)));
  return {
    won,
    hardcoreLost: !won && c.hardcore,
    final: won && ch.n === CHAPTER_COUNT,
    chapter: ch.n,
    objective: ch.preset.objective,
    dossier: won ? ch.dossier : undefined,
    candidates: won ? veteranCandidates(s) : [],
    maxVeterans: CAMPAIGN.maxVeterans,
    profit: p,
    cashBonusNext: won && ch.n < CHAPTER_COUNT ? cashBonus(p, ch.n + 1) : 0,
  };
}

/**
 * Fecha um Capítulo vencido: guarda até 3 Veteranos escolhidos, a Reputação a meio caminho de Neutro,
 * o Lucro e a pista do Dossiê, e avança. Devolve uma Campanha nova (não muta a antiga).
 */
export function commitChapter(c: CampaignState, s: GameState, veteranUids: string[]): CampaignState {
  if (!s.over?.won) throw new Error('commitChapter: o Capítulo não foi vencido');
  const ch = chapterDef(c.chapter);
  const a = player(s);
  const pool = veteranCandidates(s);
  const picked = [...new Set(veteranUids)]
    .map((uid) => pool.find((u) => u.uid === uid))
    .filter((u): u is Unit => !!u)
    .slice(0, CAMPAIGN.maxVeterans)
    .map(healVeteran);
  const reputation: Record<string, number> = {};
  for (const [id, st] of Object.entries(a.standing)) {
    const r = Math.trunc(st.reputation * CAMPAIGN.reputationKeep);
    if (r) reputation[id] = r;
  }
  const p = Math.round(profit(a));
  const final = ch.n >= CHAPTER_COUNT;
  return {
    ...c,
    chapter: final ? ch.n : ch.n + 1,
    attempts: 0,
    veterans: picked,
    reputation,
    lastProfit: p,
    dossier: c.dossier.includes(ch.dossier) ? c.dossier : [...c.dossier, ch.dossier],
    history: [...c.history, { n: ch.n, profit: p, day: dayOf(s.time), attempts: c.attempts + 1 }],
    status: final ? 'won' : 'active',
  };
}

/** Capítulo perdido: no Hardcore a Campanha acaba; senão, nova tentativa a partir do mesmo estado. */
export function failChapter(c: CampaignState): CampaignState {
  if (c.hardcore) return { ...c, status: 'lost' };
  return { ...c, attempts: c.attempts + 1 };
}

/** Lê o save da Campanha. Null para formato desconhecido ou mais novo que este build. */
export function loadCampaign(json: string): CampaignState | null {
  let raw: Partial<CampaignState>;
  try {
    raw = JSON.parse(json) as Partial<CampaignState>;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || typeof raw.campaignVersion !== 'number') return null;
  if (raw.campaignVersion > CAMPAIGN_VERSION || typeof raw.chapter !== 'number' || !Array.isArray(raw.veterans)) return null;
  return { ...newCampaign({ difficulty: 2, hardcore: false, origin: 'none', seed: 0 }), ...raw, campaignVersion: CAMPAIGN_VERSION };
}
