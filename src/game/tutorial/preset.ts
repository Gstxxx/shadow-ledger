// Preset Tutorial: curto, roteirizado pelo objetivo guiado, com os sistemas avançados desligados até o fim.
import type { PresetDef } from '../types';
import type { SystemId } from './types';

export const TUTORIAL_ID = 'tutorial';

export const TUTORIAL_PRESET: PresetDef & { locked: SystemId[] } = {
  id: TUTORIAL_ID,
  objective: 'profit',
  title: 'Tutorial: Primeira Rota',
  brief: 'A Analista acompanha seus primeiros passos: comprar, voar, vender e abrir uma Estação. Termine 30 dias no azul.',
  days: 30,
  cash: 3_000_000,
  // Estados Unidos: mercado grande, perto de vizinhos com política variada.
  startCountry: '840',
  startStations: [],
  startUnits: ['cargo0', 'bodyguard', 'lawyer1'],
  challenge: 1,
  locked: ['teams', 'operations', 'rivals', 'tension'],
};

export const isTutorialPreset = (p: PresetDef) => p.id === TUTORIAL_ID;
