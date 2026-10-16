import type { TraitId } from '../types';

export interface TraitDef {
  id: TraitId;
  name: string;
  blurb: string;
  /** Multiplier on combat strength. */
  strength?: number;
  /** Multiplier on Manutenção. */
  upkeep?: number;
  /** Multiplier on recovery speed from Ferida. */
  recovery?: number;
  /** Multiplier on XP gain. */
  xp?: number;
  /** Multiplier on conversion chance. */
  convert?: number;
  /** Multiplier on Exposição from the operations they take part in. */
  exposure?: number;
  /** Never deserts over unpaid Manutenção. */
  loyal?: boolean;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  coldblood: { id: 'coldblood', name: 'Sangue-frio', blurb: '+10% de força em Combate.', strength: 1.1 },
  loyal: { id: 'loyal', name: 'Leal', blurb: 'Nunca deserta por Manutenção atrasada.', loyal: true },
  frugal: { id: 'frugal', name: 'Modesto', blurb: '−30% de Manutenção.', upkeep: 0.7 },
  demanding: { id: 'demanding', name: 'Exigente', blurb: '+40% de Manutenção, +15% de força.', upkeep: 1.4, strength: 1.15 },
  resilient: { id: 'resilient', name: 'Resistente', blurb: 'Recupera de Ferida duas vezes mais rápido.', recovery: 2 },
  quick: { id: 'quick', name: 'Aprende rápido', blurb: '+50% de experiência.', xp: 1.5 },
  discreet: { id: 'discreet', name: 'Discreto', blurb: 'Operações com ele geram menos Exposição.', exposure: 0.8 },
  persuasive: { id: 'persuasive', name: 'Persuasivo', blurb: '+30% de chance de conversão.', convert: 1.3 },
  nervous: { id: 'nervous', name: 'Nervoso', blurb: '−10% de força em Combate.', strength: 0.9 },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
/** Traços gained on promotion are never negative. */
export const PROMOTION_TRAITS = TRAIT_IDS.filter((t) => t !== 'nervous' && t !== 'demanding');

const CLASHES: [TraitId, TraitId][] = [
  ['frugal', 'demanding'],
  ['coldblood', 'nervous'],
];
export const clashes = (a: TraitId, b: TraitId) => CLASHES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
