// Criação de Equipes (usada pelas ações e pelo motor quando Unidades sobram numa Estação).
import { STATIONS } from './data/rules';
import { TEAM_NAMES } from './data/names';
import { M, note, say, stationIn } from './state';
import type { Agency, GameState, Team, Unit } from './types';
import { def } from './units';

export function createTeam(s: GameState, a: Agency, location: string, units: Unit[]): Team {
  s.uidCounter += 1;
  const used = new Set(a.teams.map((t) => t.name));
  const teamName = (base: string | { listed: 'team'; index: number }) => say(M('msg.act.teamName', { base }));
  const index = TEAM_NAMES.findIndex((_, i) => !used.has(teamName({ listed: 'team', index: i })));
  const name = teamName(index >= 0 ? { listed: 'team', index } : `${s.uidCounter}`);
  const team: Team = { id: `tm${s.uidCounter}`, name, units: [...units], location, spoils: [] };
  a.teams.push(team);
  return team;
}

/**
 * Mantém a Estação dentro do Nível: Unidades acima da capacidade, ou de classes que o Nível não abriga
 * (ex.: um blindado convertido numa Célula), saem da Estação como uma Equipe parada no país.
 */
export function spillStationOverflow(s: GameState, a: Agency, countryId: string) {
  const st = stationIn(a, countryId);
  if (!st) return;
  const spec = STATIONS[st.level];
  const keep: Unit[] = [];
  const out: Unit[] = [];
  for (const u of st.units) {
    if (spec.allows.includes(def(u.itemId).cls) && keep.length < spec.capacity) keep.push(u);
    else out.push(u);
  }
  if (!out.length) return;
  st.units = keep;
  const team = createTeam(s, a, countryId, out);
  note(s, a, M('msg.act.teamFormed', { team: team.name, n: out.length }), 'info', countryId);
}
