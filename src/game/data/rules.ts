import type { CombatType, ObjectiveKind, PresetDef, OperationKind, Politics, Posture, StationLevel, ThreatKind, UnitClass } from '../types';

export interface StationSpec {
  level: StationLevel;
  name: string;
  cost: number;
  capacity: number;
  allows: UnitClass[];
  /** Fallback defense when the station has no units. */
  fort: Record<CombatType, number>;
  income: number;
  /** Tracks enemy movement in neighboring countries too. */
  wideIntel: boolean;
}

const HUMANS: UnitClass[] = ['human', 'lawyer', 'influence'];
const GROUND: UnitClass[] = [...HUMANS, 'vehicle', 'antiair'];

export const STATIONS: Record<StationLevel, StationSpec> = {
  1: { level: 1, name: 'Célula', cost: 250_000, capacity: 2, allows: HUMANS, fort: { legal: 2, urban: 2, army: 2, air: 2 }, income: 3_500, wideIntel: false },
  2: { level: 2, name: 'Casa Segura', cost: 800_000, capacity: 4, allows: HUMANS, fort: { legal: 3, urban: 3, army: 3, air: 3 }, income: 9_000, wideIntel: false },
  3: { level: 3, name: 'Escritório', cost: 2_500_000, capacity: 6, allows: GROUND, fort: { legal: 4, urban: 4, army: 4, air: 4 }, income: 24_000, wideIntel: false },
  4: { level: 4, name: 'Complexo', cost: 6_000_000, capacity: 8, allows: [...GROUND, 'heli'], fort: { legal: 4, urban: 5, army: 5, air: 5 }, income: 52_000, wideIntel: true },
  5: { level: 5, name: 'Base', cost: 14_000_000, capacity: 10, allows: [...GROUND, 'heli', 'jet'], fort: { legal: 4, urban: 5, army: 6, air: 6 }, income: 105_000, wideIntel: true },
};

export const POLITICS_LABEL: Record<Politics, string> = {
  peace: 'Paz',
  disorder: 'Instabilidade',
  civilwar: 'Guerra Civil',
  sanctions: 'Sanções',
  coldwar: 'Guerra Fria',
  war: 'Guerra',
};

export const POLITICS_COLOR: Record<Politics, string> = {
  peace: '#3b82f6',
  disorder: '#eab308',
  civilwar: '#f97316',
  sanctions: '#a855f7',
  coldwar: '#06b6d4',
  war: '#ef4444',
};

export const POSTURE_LABEL: Record<Posture, string> = { enemy: 'Inimigo do Estado', neutral: 'Neutro', ally: 'Aliado' };
export const POSTURE_COLOR: Record<Posture, string> = { enemy: '#e5484d', neutral: '#8b93a1', ally: '#3fb68b' };

export const COMBAT_LABEL: Record<CombatType, string> = { legal: 'Jurídico', urban: 'Urbano', army: 'Militar', air: 'Aéreo' };

/** Postura a partir da Reputação. */
export const postureOf = (reputation: number): Posture => (reputation <= -30 ? 'enemy' : reputation >= 30 ? 'ally' : 'neutral');

export const THREAT_LABEL: Record<ThreatKind, string> = {
  raid: 'Batida policial',
  lawsuit: 'Processo judicial',
  criminal: 'Ataque criminoso',
  military: 'Ataque militar',
};

/** Who is behind each Ameaça: the State (Detido / Interditada) or crime (Sequestrado / perde Nível). */
export const THREAT_BY_STATE: Record<ThreatKind, boolean> = { raid: true, lawsuit: true, criminal: false, military: true };

export const THREAT_COMBAT: Record<ThreatKind, CombatType> = { raid: 'urban', lawsuit: 'legal', criminal: 'urban', military: 'army' };

export const OPERATION_LABEL: Record<OperationKind, string> = {
  bank: 'Roubo a banco',
  tech: 'Roubo de tecnologia',
  neutralize: 'Neutralização',
};

export const OPERATION_COMBAT: Record<OperationKind, CombatType> = { bank: 'urban', tech: 'urban', neutralize: 'army' };

export const OPERATION_BLURB: Record<OperationKind, string> = {
  bank: 'Esvazia o cofre central. Rende caixa, derruba a Reputação e dispara a Exposição.',
  tech: 'Invade um laboratório estatal e leva informação classificada como Carga.',
  neutralize: 'Paga pela oposição, tira de cena um alvo político fictício: o país entra em instabilidade e as armas encarecem.',
};

/** Hours of travel for a Voo Comercial (fixed speed) and price per person. */
export const COMMERCIAL_SPEED = 750;
export const COMMERCIAL_FARE_PER_1000KM = 1_800;

/** Presets de Sandbox (antigas missões). */
export const PRESETS: PresetDef[] = [
  {
    id: 'first-contract',
    objective: 'profit',
    title: 'Primeiro Contrato',
    brief: 'Uma agência recém-aberta nas Américas. Compre barato, venda caro e termine 90 dias no azul.',
    days: 90,
    cash: 4_000_000,
    startCountry: '840',
    startStations: [{ countryId: '484', level: 1 }],
    startUnits: ['cargo0', 'bodyguard', 'bodyguard', 'lawyer1'],
    challenge: 1,
  },
  {
    id: 'med-corridor',
    objective: 'profit',
    title: 'Corredor do Mediterrâneo',
    brief: 'Europa e Oriente Médio em ebulição. 120 dias para transformar instabilidade em margem.',
    days: 120,
    cash: 7_000_000,
    startCountry: '380',
    startStations: [{ countryId: '300', level: 1 }, { countryId: '818', level: 2 }],
    startUnits: ['cargo1', 'police', 'soldier', 'soldier', 'lawyer1', 'liaison1'],
    challenge: 2,
  },
  {
    id: 'quick-swiss',
    objective: 'quick',
    title: 'Conta Numerada',
    brief: 'Um cliente em Genebra quer ver US$ 25 milhões de lucro. Sem prazo — mas o placar mede cada dia.',
    days: 0,
    target: 25_000_000,
    cash: 10_000_000,
    startCountry: '756',
    startStations: [{ countryId: '756', level: 2 }],
    startUnits: ['cargo1', 'swat', 'bodyguard', 'lawyer2'],
    challenge: 2,
  },
  {
    id: 'sahel-hunt',
    objective: 'destroy',
    title: 'Caçada no Sahel',
    brief: 'Um grupo armado circula pela África e Oriente Médio. Use estações como olhos e elimine-o em 120 dias.',
    days: 120,
    cash: 8_000_000,
    startCountry: '818',
    startStations: [{ countryId: '818', level: 3 }, { countryId: '566', level: 1 }],
    startUnits: ['cargo1', 'commando', 'soldier', 'soldier', 'swat', 'technical', 'liaison1'],
    challenge: 2,
    region: ['AF', 'ME'],
  },
  {
    id: 'andes-rescue',
    objective: 'rescue',
    title: 'Resgate nos Andes',
    brief: 'Uma engenheira foi sequestrada e é levada de país em país pelas Américas. Encontre e liberte-a em 90 dias.',
    days: 90,
    cash: 6_000_000,
    startCountry: '591',
    startStations: [{ countryId: '170', level: 1 }, { countryId: '604', level: 1 }],
    startUnits: ['cargo1', 'commando', 'swat', 'swat', 'soldier', 'liaison1'],
    challenge: 2,
    region: ['SA', 'NA'],
  },
  {
    id: 'red-line',
    objective: 'destroy',
    title: 'Linha Vermelha',
    brief: 'Uma rede criminosa cruza a Europa com escolta pesada. 100 dias, nenhuma desculpa.',
    days: 100,
    cash: 12_000_000,
    startCountry: '276',
    startStations: [{ countryId: '276', level: 2 }, { countryId: '616', level: 1 }],
    startUnits: ['cargo1', 'commando', 'commando', 'swat', 'apc', 'liaison2', 'lawyer2'],
    challenge: 3,
    region: ['EU'],
  },
  {
    id: 'pacific-cold',
    objective: 'profit',
    title: 'Frio no Pacífico',
    brief: 'Ásia e Oceania sob tensão permanente. 180 dias, capital grande, rivais estatais atentos.',
    days: 180,
    cash: 20_000_000,
    startCountry: '392',
    startStations: [{ countryId: '392', level: 2 }, { countryId: '764', level: 1 }],
    startUnits: ['cargo2', 'swat', 'swat', 'soldier', 'lawyer2', 'liaison2', 'jet1'],
    challenge: 3,
  },
];

export const DIFFICULTY_LABEL = ['', 'Recruta', 'Operador', 'Diretor'];

export const OBJECTIVE_LABEL: Record<ObjectiveKind, string> = {
  profit: 'Lucro em N dias',
  quick: 'Lucro rápido',
  destroy: 'Eliminar um grupo',
  rescue: 'Resgatar um refém',
};

/** Cofre: capacidade em toneladas por Nível de Estação. */
export const VAULT_CAPACITY: Record<StationLevel, number> = { 1: 1, 2: 3, 3: 8, 4: 20, 5: 50 };

/** Receptador: fração do preço-base paga na hora por um item capturado. */
export const FENCE_RATE = 0.45;
