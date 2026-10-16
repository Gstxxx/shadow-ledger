// Textos da tela Nova partida (pt-BR de autoria; inglês com os termos de docs/GLOSSARY-EN.md).

import type { ObjectiveKind } from '../../../game/types';
import type { Lang } from '../types';

const pt = {
  stepScenario: 'Cenário',
  stepConfigure: 'Configurar',
  stepOf: (n: number, total: number) => `Passo ${n} de ${total}`,
  next: 'Próximo: Configurar',
  backToScenarios: 'Cenários',
  chooseThis: 'Escolher este cenário',
  details: 'Ver detalhes',
  startHere: 'Comece aqui',
  tutorialNote: 'Tutorial com a Analista: Comércio, Estações e Equipes, um sistema por vez.',
  sandboxTitle: 'Sandbox personalizado',
  sandboxBrief: 'Monte o mundo do seu jeito: região inicial, capital, Objetivo e prazo. As Agências Rivais seguem a Dificuldade.',
  sandboxOutcome: 'Você define o Objetivo',

  outcome: (kind: ObjectiveKind, days: number, target?: number) => {
    const d = days ? `${days} dias` : '';
    switch (kind) {
      case 'profit':
        return days ? `Termine ${d} no lucro` : 'Feche no lucro';
      case 'quick':
        return `Chegue a ${money(target ?? 0, ',')} de lucro o quanto antes`;
      case 'destroy':
        return days ? `Encontre e elimine um grupo armado em ${d}` : 'Encontre e elimine um grupo armado';
      case 'rescue':
        return days ? `Encontre e liberte um refém em ${d}` : 'Encontre e liberte um refém';
    }
  },
  duration: 'Duração',
  noDeadline: 'Sem prazo',
  days: (n: number) => `${n} dias`,
  capital: 'Caixa inicial',
  region: 'Região',
  suggested: 'Dificuldade sugerida',
  levelOf: (n: number) => `${n} de 3`,

  youStartWith: 'Você começa com',
  fleet: 'Frota',
  escort: 'Escolta',
  stations: 'Estações',
  cash: 'Caixa',
  rivals: 'Agências Rivais',
  rivalsBy: (n: string, diff: string) => `${n} na Dificuldade ${diff}`,
  homeBase: 'Base de partida',

  names: 'Identidade',
  directorName: 'Nome do Diretor',
  agencyName: 'Nome da agência',
  shuffle: 'Sortear outro nome',
  shuffleBoth: 'Sortear nomes',
  difficulty: 'Dificuldade',
  difficultyCards: [
    { name: 'Recruta', text: 'Rivais lentos e pouco agressivos, Ameaças avisadas com folga e mais caixa.' },
    { name: 'Operador', text: 'O equilíbrio pensado para o jogo: rivais atentos, margens justas.' },
    { name: 'Diretor', text: 'Rivais agressivos e bem financiados, margens estreitas, pouca folga para erro.' },
  ],
  rivalsLine: (n: string) => `${n} Agência${n === '1' ? '' : 's'} Rival${n === '1' ? '' : 'is'}`,
  hardcore: 'Modo Hardcore',
  hardcoreOff: 'Desligado: se o Diretor perder um Combate, fica Detido ou é Sequestrado e pode ser resgatado.',
  hardcoreOn: 'Ligado: se o Diretor perder um Combate, morre e a partida acaba.',
  world: 'Mundo do Sandbox',
  summary: 'Resumo da operação',
  scenario: 'Cenário',
  objective: 'Objetivo',
  director: 'Diretor',
  agency: 'Agência',
  start: 'Começar operação',
  on: 'Ligado',
  off: 'Desligado',
  nameRequired: 'Dê um nome ao Diretor e à agência.',
  tiers: ['', 'Célula', 'Casa Segura', 'Escritório', 'Complexo', 'Base'],
  money: (v: number) => money(v, ','),
};

export type NewGameStrings = typeof pt;

const en: NewGameStrings = {
  ...pt,
  stepScenario: 'Scenario',
  stepConfigure: 'Configure',
  stepOf: (n, total) => `Step ${n} of ${total}`,
  next: 'Next: Configure',
  backToScenarios: 'Scenarios',
  chooseThis: 'Choose this scenario',
  details: 'See details',
  startHere: 'Start here',
  tutorialNote: 'Tutorial with the Analyst: Trade, Stations and Teams, one system at a time.',
  sandboxTitle: 'Custom Sandbox',
  sandboxBrief: 'Build the world your way: starting region, capital, Objective and deadline. Rival Agencies follow the Difficulty.',
  sandboxOutcome: 'You set the Objective',
  outcome: (kind, days, target) => {
    const d = days ? `${days} days` : '';
    switch (kind) {
      case 'profit':
        return days ? `Finish ${d} in profit` : 'End in profit';
      case 'quick':
        return `Reach ${money(target ?? 0, '.')} in profit as fast as you can`;
      case 'destroy':
        return days ? `Find and eliminate an armed group within ${d}` : 'Find and eliminate an armed group';
      case 'rescue':
        return days ? `Find and free a hostage within ${d}` : 'Find and free a hostage';
    }
  },
  duration: 'Duration',
  noDeadline: 'No deadline',
  days: (n) => `${n} days`,
  capital: 'Starting cash',
  region: 'Region',
  suggested: 'Suggested difficulty',
  levelOf: (n) => `${n} of 3`,
  youStartWith: 'You start with',
  fleet: 'Fleet',
  escort: 'Escort',
  stations: 'Stations',
  cash: 'Cash',
  rivals: 'Rival Agencies',
  rivalsBy: (n, diff) => `${n} on ${diff} Difficulty`,
  homeBase: 'Home base',
  names: 'Identity',
  directorName: 'Director name',
  agencyName: 'Agency name',
  shuffle: 'Roll another name',
  shuffleBoth: 'Roll names',
  difficulty: 'Difficulty',
  difficultyCards: [
    { name: 'Recruit', text: 'Slow, cautious rivals, Threats announced well in advance and more cash.' },
    { name: 'Operator', text: 'The balance the game is designed around: watchful rivals, fair margins.' },
    { name: 'Director', text: 'Aggressive, well-funded rivals, thin margins, little room for error.' },
  ],
  rivalsLine: (n) => `${n} Rival Agenc${n === '1' ? 'y' : 'ies'}`,
  hardcore: 'Hardcore Mode',
  hardcoreOff: 'Off: if the Director loses an Engagement, they are Detained or Abducted and can be rescued.',
  hardcoreOn: 'On: if the Director loses an Engagement, they die and the game ends.',
  world: 'Sandbox world',
  summary: 'Operation summary',
  scenario: 'Scenario',
  objective: 'Objective',
  director: 'Director',
  agency: 'Agency',
  start: 'Begin operation',
  on: 'On',
  off: 'Off',
  nameRequired: 'Give the Director and the agency a name.',
  tiers: ['', 'Cell', 'Safehouse', 'Office', 'Compound', 'Base'],
  money: (v) => money(v, '.'),
};

function money(v: number, decimal: string): string {
  if (Math.abs(v) < 950_000) return `US$ ${Math.round(v / 1000)}k`;
  const m = v / 1_000_000;
  return `US$ ${Number.isInteger(m) ? m : m.toFixed(1).replace('.', decimal)}M`;
}

export const newGameStrings = (lang: Lang): NewGameStrings => (lang === 'en' ? en : pt);

/** Nomes de Unidades em inglês, por id de item (o pt-BR vem de ITEMS). */
export const UNIT_EN: Record<string, string> = {
  cargo0: 'Cargo Turboprop',
  cargo1: 'Medium Cargo Jet',
  cargo2: 'Widebody Freighter',
  cargo3: 'Heavy Strategic Freighter',
  bodyguard: 'Bodyguard',
  thug: 'Hired Gun',
  police: 'Mercenary Cop',
  swat: 'Tactical Operator',
  soldier: 'Contract Soldier',
  commando: 'Elite Commando',
  agent: 'Field Agent',
  lawyer1: 'Associate Lawyer',
  lawyer2: 'Senior Lawyer',
  lawyer3: 'International Partner',
  liaison1: 'Influence Agent',
  liaison2: 'Veteran Influence Agent',
  liaison3: 'Master Influence Agent',
  patrolcar: 'Patrol Car',
  technical: 'Armed Pickup',
  apc: '6x6 APC',
  ifv: 'Infantry Fighting Vehicle',
  jet1: 'Light Fighter',
};

/** Nomes de países em inglês, por ISO numérico (o pt-BR vem de COUNTRY_SEEDS). */
export const COUNTRY_EN: Record<string, string> = {
  '840': 'United States', '124': 'Canada', '484': 'Mexico', '192': 'Cuba', '591': 'Panama', '076': 'Brazil',
  '032': 'Argentina', '152': 'Chile', '170': 'Colombia', '862': 'Venezuela', '604': 'Peru', '826': 'United Kingdom',
  '250': 'France', '276': 'Germany', '756': 'Switzerland', '380': 'Italy', '724': 'Spain', '752': 'Sweden',
  '616': 'Poland', '804': 'Ukraine', '643': 'Russia', '792': 'Turkey', '300': 'Greece', '688': 'Serbia',
  '376': 'Israel', '682': 'Saudi Arabia', '784': 'United Arab Emirates', '364': 'Iran', '818': 'Egypt', '368': 'Iraq',
  '760': 'Syria', '887': 'Yemen', '004': 'Afghanistan', '710': 'South Africa', '566': 'Nigeria', '404': 'Kenya',
  '434': 'Libya', '024': 'Angola', '504': 'Morocco', '180': 'DR Congo', '231': 'Ethiopia', '466': 'Mali',
  '156': 'China', '392': 'Japan', '410': 'South Korea', '356': 'India', '408': 'North Korea', '586': 'Pakistan',
  '764': 'Thailand', '360': 'Indonesia', '704': 'Vietnam', '608': 'Philippines', '398': 'Kazakhstan',
  '036': 'Australia', '554': 'New Zealand',
};
