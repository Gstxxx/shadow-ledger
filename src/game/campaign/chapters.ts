// Os 10 Capítulos da Campanha "Herança" como Presets (docs/CAMPANHA.md). Textos em src/i18n/*/campaign.ts.
import { M, say } from '../msg';
import type { Key } from '../../i18n';
import type { Continent, ObjectiveKind, PresetDef, StationLevel } from '../types';
import type { ChapterDef, RivalStrength } from './types';

/** Nome fixo da Agência Rival da Campanha. */
export const MORAVIA = 'Casa Moravia';

const k = (n: number, part: string) => `campaign.ch.${n}.${part}` as Key;

interface Spec {
  n: number;
  objective: ObjectiveKind;
  days: number;
  target?: number;
  cash: number;
  startCountry: string;
  stations: [string, StationLevel][];
  units: string[];
  challenge: 1 | 2 | 3;
  region?: Continent[];
  rival?: RivalStrength;
  hostage?: string;
  group?: string;
}

const SPECS: Spec[] = [
  { n: 1, objective: 'profit', days: 60, target: 4_500_000, cash: 3_000_000, startCountry: '484', stations: [['484', 1]], units: ['cargo0', 'bodyguard', 'lawyer1'], challenge: 1 },
  { n: 2, objective: 'quick', days: 45, target: 8_000_000, cash: 5_000_000, startCountry: '380', stations: [['300', 1]], units: ['cargo1', 'bodyguard', 'police', 'lawyer1'], challenge: 1 },
  { n: 3, objective: 'rescue', days: 55, cash: 6_000_000, startCountry: '276', stations: [['276', 1]], units: ['cargo1', 'swat', 'soldier', 'liaison1'], challenge: 1, region: ['EU'], hostage: 'Irene Vasko' },
  { n: 4, objective: 'destroy', days: 65, cash: 7_000_000, startCountry: '818', stations: [['818', 2]], units: ['cargo1', 'soldier', 'soldier', 'technical'], challenge: 2, region: ['AF', 'ME'] },
  { n: 5, objective: 'profit', days: 60, target: 25_000_000, cash: 9_000_000, startCountry: '616', stations: [['616', 1], ['804', 1]], units: ['cargo1', 'police', 'soldier', 'lawyer1'], challenge: 2, rival: 'weak' },
  { n: 6, objective: 'quick', days: 55, target: 30_000_000, cash: 12_000_000, startCountry: '250', stations: [['756', 2]], units: ['cargo1', 'swat', 'bodyguard', 'lawyer2'], challenge: 2, rival: 'normal' },
  { n: 7, objective: 'destroy', days: 75, cash: 12_000_000, startCountry: '682', stations: [['682', 2], ['784', 1]], units: ['cargo1', 'commando', 'soldier', 'technical'], challenge: 3, region: ['ME'], rival: 'normal', group: MORAVIA },
  { n: 8, objective: 'rescue', days: 60, cash: 10_000_000, startCountry: '076', stations: [['076', 1], ['604', 1]], units: ['cargo1', 'commando', 'swat', 'liaison1'], challenge: 3, region: ['SA'], rival: 'normal', hostage: 'Duarte Leme' },
  { n: 9, objective: 'profit', days: 75, target: 170_000_000, cash: 18_000_000, startCountry: '392', stations: [['392', 2], ['410', 1]], units: ['cargo2', 'swat', 'police', 'lawyer2'], challenge: 3, rival: 'normal' },
  { n: 10, objective: 'destroy', days: 90, cash: 25_000_000, startCountry: '826', stations: [['826', 2], ['682', 1]], units: ['cargo2', 'commando', 'commando', 'soldier', 'ifv'], challenge: 3, region: ['EU', 'ME', 'AF', 'AS'], rival: 'strong', group: MORAVIA },
];

/** Momentos das falas do Analista: início, meio e perto do fim do prazo. */
const BEAT_AT = [0, 0.5, 0.8];

function chapter(sp: Spec): ChapterDef {
  const preset: PresetDef = {
    id: `campaign-${sp.n}`,
    objective: sp.objective,
    title: say(M(k(sp.n, 'title'))),
    brief: say(M(k(sp.n, 'hook'))),
    days: sp.days,
    target: sp.target,
    cash: sp.cash,
    startCountry: sp.startCountry,
    startStations: sp.stations.map(([countryId, level]) => ({ countryId, level })),
    startUnits: sp.units,
    challenge: sp.challenge,
    region: sp.region,
  };
  return {
    n: sp.n,
    preset,
    rival: sp.rival,
    hostage: sp.hostage,
    group: sp.group,
    beats: BEAT_AT.map((at, i) => ({ at, key: k(sp.n, `inGame.${i + 1}`) })),
    dossier: sp.n,
  };
}

export const CHAPTERS: ChapterDef[] = SPECS.map(chapter);
export const CHAPTER_COUNT = CHAPTERS.length;

export const chapterDef = (n: number): ChapterDef => CHAPTERS[Math.max(1, Math.min(CHAPTER_COUNT, n)) - 1];

/** Chaves do Dossiê de uma pista. */
export const dossierKeys = (n: number) => ({ title: k(n, 'clue.title'), body: k(n, 'clue.body') });
