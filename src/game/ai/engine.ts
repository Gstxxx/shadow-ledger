// Única porta da IA para mudar o jogo (ADR 0002): toda mudança de caixa, Carga, Unidade ou Estação de uma
// rival passa por uma destas funções do motor, as mesmas que o jogador usa. Os testes embrulham este objeto
// para provar que a IA não ganha nada por fora.
import * as actions from '../actions';
import type { Result } from '../actions';
import { createAgency } from '../state';
import type { Agency, GameState } from '../types';

/** Ações hostis entre agências; existem quando o motor as expõe (pedidas ao game-builder). */
type StrikeFn = (s: GameState, a: Agency, teamId: string, targetId: string) => Result;
type DenounceFn = (s: GameState, a: Agency, targetId: string, countryId: string) => Result;

const optional = <T>(name: string): T | undefined => {
  const fn = (actions as unknown as Record<string, unknown>)[name];
  return typeof fn === 'function' ? (fn as T) : undefined;
};

export const E = {
  createAgency,
  travel: actions.travel,
  buy: actions.buy,
  sell: actions.sell,
  enlist: actions.enlist,
  recruit: actions.recruit,
  openStation: actions.openStation,
  upgradeStation: actions.upgradeStation,
  transferUnit: actions.transferUnit,
  repair: actions.repair,
  payFine: actions.payFine,
  react: actions.react,
  acceptContract: actions.acceptContract,
  deliverContract: actions.deliverContract,
  startOperation: actions.startOperation,
  payRelease: actions.payRelease,
  payArrears: actions.payArrears,
  formTeam: actions.formTeam,
  sendTeam: actions.sendTeam,
  teamOperation: actions.teamOperation,
  teamRescue: actions.teamRescue,
  mergeTeam: actions.mergeTeam,
  fenceSpoils: actions.fenceSpoils,
  stashSpoils: actions.stashSpoils,
  // Resolvidas na hora da chamada: o motor pode expô-las depois (e o import circular não as congela).
  get sabotageStation() {
    return optional<StrikeFn>('sabotageStation');
  },
  get raidVault() {
    return optional<StrikeFn>('raidVault');
  },
  get denounce() {
    return optional<DenounceFn>('denounce');
  },
};

export type EnginePort = typeof E;
