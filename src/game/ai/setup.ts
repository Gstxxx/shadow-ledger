// Criação das Agências Rivais no início da partida, pela createAgency do motor.
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { pick, randInt, randRange, shuffle } from '../rng';
import { log } from '../state';
import type { Continent, GameState, PresetDef } from '../types';
import { E } from './engine';
import { aiState } from './memory';
import { DIFFICULTY_AI, PERSONALITIES, PERSONALITY_ORDER, RIVAL_NAMES } from './profiles';
import type { PersonalityId } from './types';

/** Recruta só enfrenta as personalidades menos belicosas. */
const GENTLE: PersonalityId[] = ['mercador', 'fantasma'];

/**
 * Cria as rivais da Dificuldade escolhida, cada uma com uma Célula num país de nível 3+ fora da área
 * inicial do jogador, o mesmo plantel inicial do Preset e o capital ajustado pela Dificuldade.
 * Idempotente: não faz nada se a partida já tem rivais.
 */
export function setupRivals(s: GameState) {
  if (s.agencies.some((a) => !a.isPlayer)) return;
  const D = DIFFICULTY_AI[s.options.difficulty];
  const preset = s.options.preset;
  const n = randInt(s, D.count[0], D.count[1]);
  const taken = new Set([preset.startCountry, ...preset.startStations.map((x) => x.countryId)]);
  const usedContinents = new Set<Continent>([s.countries[preset.startCountry].continent]);
  const names = shuffle(s, RIVAL_NAMES.filter((x) => x !== s.group?.name));
  const personalities = shuffle(s, [...(s.options.difficulty === 1 ? GENTLE : PERSONALITY_ORDER)]);

  for (let i = 0; i < n; i++) {
    const pool = Object.values(s.countries).filter((c) => c.level >= 3 && !taken.has(c.id));
    const fresh = pool.filter((c) => !usedContinents.has(c.continent));
    const start = pick(s, fresh.length ? fresh : pool);
    taken.add(start.id);
    usedContinents.add(start.continent);
    const rivalPreset: PresetDef = { ...preset, startCountry: start.id, startStations: [{ countryId: start.id, level: 1 }] };
    const a = E.createAgency(s, rivalPreset, {
      id: `rival${i + 1}`,
      name: names[i % names.length],
      isPlayer: false,
      director: `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}`,
      cashMult: D.cash,
    });
    s.agencies.push(a);
    const personality = personalities[i % personalities.length];
    aiState(s).rivals[a.id] = {
      agencyId: a.id,
      personality,
      nextAt: s.time + randRange(s, 1, D.interval[1]),
      lastAt: s.time,
      orders: [],
      grudge: {},
      lastStrikeAt: s.time,
      decisions: 0,
    };
    log(s, `Agência Rival: ${a.name} (${PERSONALITIES[personality].label}) opera a partir de ${start.name}.`, 'intel', start.id);
  }
}
