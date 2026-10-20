// Sistemas que a Analista explica na primeira vez que aparecem. `presentTopics` diz quais estão em cena
// agora, só lendo o estado; quem lembra o que o jogador já viu (entre partidas) é a camada de UI.
import { player } from '../state';
import type { GameState } from '../types';
import { isLocked, tutorialOf } from './locks';

export type TopicId =
  | 'fleet'
  | 'buy'
  | 'fly'
  | 'saturation'
  | 'station'
  | 'reputation'
  | 'threat'
  | 'combat'
  | 'upkeep'
  | 'team'
  | 'contract'
  | 'rival'
  | 'tension';

/** Ordem de prioridade quando vários aparecem juntos: o urgente primeiro. */
export const TOPIC_ORDER: TopicId[] = [
  'combat',
  'threat',
  'fleet',
  'buy',
  'fly',
  'saturation',
  'station',
  'reputation',
  'upkeep',
  'contract',
  'team',
  'rival',
  'tension',
];

/** Âncoras `data-tour` que a Analista destaca enquanto explica cada tópico. */
export const TOPIC_TARGETS: Partial<Record<TopicId, string[]>> = {
  fleet: ['fleet', 'drawer-right'],
  buy: ['market', 'buy', 'market-dock'],
  fly: ['speed'],
  station: ['open-station', 'drawer-left'],
  threat: ['tab-threats', 'threats-dock'],
  combat: ['combat-dock'],
  contract: ['tab-contracts', 'drawer-right'],
  team: ['tab-teams', 'drawer-right'],
  tension: ['tension'],
};

/** Tensão Global a partir da qual a Analista fala dela (faixa Alta). */
export const TENSION_TOPIC = 55;
/** Dias antes da primeira Manutenção em que a Analista avisa. */
const UPKEEP_WARN_DAY = 25;

/** Tópicos em cena agora, na ordem de prioridade. O(países) no pior caso. */
export function presentTopics(s: GameState): TopicId[] {
  const a = player(s);
  const t = tutorialOf(s);
  const landed = a.director.status === 'free' && !a.flight;
  const step = t?.step;
  const on: Record<TopicId, boolean> = {
    combat: s.pendingCombat?.agencyId === a.id || s.combat?.agencyId === a.id,
    threat: a.threats.length > 0,
    fleet: true,
    buy: landed,
    fly: !!a.flight || (!!step && step !== 'buy'),
    // Depois da primeira venda (compra + venda), onde o preço já se mexeu.
    saturation: a.stats.trades >= 2 && (!t || t.done.includes('sell')) && Object.keys(s.countries[a.location]?.saturation ?? {}).length > 0,
    station: a.stations.length > 0 || step === 'station',
    reputation: Object.values(a.standing).some((st) => st.exposure >= 8),
    upkeep: s.time >= UPKEEP_WARN_DAY * 24 || s.events.some((e) => e.kind === 'maintenance'),
    contract: s.contracts.some((k) => k.status === 'offered') && (!step || step === 'contract' || step === 'free' || !!t?.skipped),
    team: !isLocked(s, 'teams') && (a.teams.length > 0 || step === 'free' || !!t?.skipped),
    rival: s.agencies.some((x) => !x.isPlayer),
    tension: !isLocked(s, 'tension') && s.tension >= TENSION_TOPIC,
  };
  return TOPIC_ORDER.filter((id) => on[id]);
}
