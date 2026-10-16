import type { CombatType, MissionDef, Politics, Standing, StationTier, UnitClass } from '../types';

export interface StationSpec {
  tier: StationTier;
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

const HUMANS: UnitClass[] = ['human', 'lawyer', 'secretary'];
const GROUND: UnitClass[] = [...HUMANS, 'vehicle', 'antiair'];

export const STATIONS: Record<StationTier, StationSpec> = {
  1: { tier: 1, name: 'Célula', cost: 250_000, capacity: 2, allows: HUMANS, fort: { legal: 2, urban: 2, army: 2, air: 2 }, income: 3_500, wideIntel: false },
  2: { tier: 2, name: 'Casa Segura', cost: 800_000, capacity: 4, allows: HUMANS, fort: { legal: 3, urban: 3, army: 3, air: 3 }, income: 9_000, wideIntel: false },
  3: { tier: 3, name: 'Escritório', cost: 2_500_000, capacity: 6, allows: GROUND, fort: { legal: 4, urban: 4, army: 4, air: 4 }, income: 24_000, wideIntel: false },
  4: { tier: 4, name: 'Complexo', cost: 6_000_000, capacity: 8, allows: [...GROUND, 'heli'], fort: { legal: 4, urban: 5, army: 5, air: 5 }, income: 52_000, wideIntel: true },
  5: { tier: 5, name: 'Base', cost: 14_000_000, capacity: 10, allows: [...GROUND, 'heli', 'jet'], fort: { legal: 4, urban: 5, army: 6, air: 6 }, income: 105_000, wideIntel: true },
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

export const STANDING_LABEL: Record<Standing, string> = { enemy: 'Inimigo do Estado', neutral: 'Neutro', ally: 'Aliado' };
export const STANDING_COLOR: Record<Standing, string> = { enemy: '#ef4444', neutral: '#94a3b8', ally: '#22c55e' };

export const COMBAT_LABEL: Record<CombatType, string> = { legal: 'Jurídico', urban: 'Urbano', army: 'Militar', air: 'Aéreo' };

export const standingOf = (v: number): Standing => (v <= -30 ? 'enemy' : v >= 30 ? 'ally' : 'neutral');

export const MISSIONS: MissionDef[] = [
  {
    id: 'first-contract',
    kind: 'profit',
    title: 'Primeiro Contrato',
    brief: 'Uma agência recém-aberta nas Américas. Compre barato, venda caro e termine 90 dias no azul.',
    days: 90,
    cash: 4_000_000,
    startCountry: '840',
    startStations: [{ countryId: '484', tier: 1 }],
    startUnits: ['cargo0', 'bodyguard', 'bodyguard', 'lawyer1'],
    difficulty: 1,
  },
  {
    id: 'med-corridor',
    kind: 'profit',
    title: 'Corredor do Mediterrâneo',
    brief: 'Europa e Oriente Médio em ebulição. 120 dias para transformar instabilidade em margem.',
    days: 120,
    cash: 7_000_000,
    startCountry: '380',
    startStations: [{ countryId: '300', tier: 1 }, { countryId: '818', tier: 2 }],
    startUnits: ['cargo1', 'police', 'soldier', 'soldier', 'lawyer1', 'liaison1'],
    difficulty: 2,
  },
  {
    id: 'quick-swiss',
    kind: 'quick',
    title: 'Conta Numerada',
    brief: 'Um cliente em Genebra quer ver US$ 25 milhões de lucro. Sem prazo — mas o placar mede cada dia.',
    days: 0,
    target: 25_000_000,
    cash: 10_000_000,
    startCountry: '756',
    startStations: [{ countryId: '756', tier: 2 }],
    startUnits: ['cargo1', 'swat', 'bodyguard', 'lawyer2'],
    difficulty: 2,
  },
  {
    id: 'sahel-hunt',
    kind: 'destroy',
    title: 'Caçada no Sahel',
    brief: 'Um grupo armado circula pela África e Oriente Médio. Use estações como olhos e elimine-o em 120 dias.',
    days: 120,
    cash: 8_000_000,
    startCountry: '818',
    startStations: [{ countryId: '818', tier: 3 }, { countryId: '566', tier: 1 }],
    startUnits: ['cargo1', 'commando', 'soldier', 'soldier', 'swat', 'technical', 'liaison1'],
    difficulty: 2,
    region: ['AF', 'ME'],
  },
  {
    id: 'andes-rescue',
    kind: 'rescue',
    title: 'Resgate nos Andes',
    brief: 'Uma engenheira foi sequestrada e é levada de país em país pelas Américas. Encontre e liberte-a em 90 dias.',
    days: 90,
    cash: 6_000_000,
    startCountry: '591',
    startStations: [{ countryId: '170', tier: 1 }, { countryId: '604', tier: 1 }],
    startUnits: ['cargo1', 'commando', 'swat', 'swat', 'soldier', 'liaison1'],
    difficulty: 2,
    region: ['SA', 'NA'],
  },
  {
    id: 'red-line',
    kind: 'destroy',
    title: 'Linha Vermelha',
    brief: 'Uma rede criminosa cruza a Europa com escolta pesada. 100 dias, nenhuma desculpa.',
    days: 100,
    cash: 12_000_000,
    startCountry: '276',
    startStations: [{ countryId: '276', tier: 2 }, { countryId: '616', tier: 1 }],
    startUnits: ['cargo1', 'commando', 'commando', 'swat', 'apc', 'liaison2', 'lawyer2'],
    difficulty: 3,
    region: ['EU'],
  },
  {
    id: 'pacific-cold',
    kind: 'profit',
    title: 'Frio no Pacífico',
    brief: 'Ásia e Oceania sob tensão permanente. 180 dias, capital grande, rivais estatais atentos.',
    days: 180,
    cash: 20_000_000,
    startCountry: '392',
    startStations: [{ countryId: '392', tier: 2 }, { countryId: '764', tier: 1 }],
    startUnits: ['cargo2', 'swat', 'swat', 'soldier', 'lawyer2', 'liaison2', 'jet1'],
    difficulty: 3,
  },
];

export const DIFFICULTY_LABEL = ['', 'Recruta', 'Operador', 'Diretor'];
