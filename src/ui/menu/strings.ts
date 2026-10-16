// Textos do menu inicial. pt-BR é o idioma de autoria; o inglês usa os termos de docs/GLOSSARY-EN.md.
// Quando existir src/i18n, estas chaves migram para lá sem mudar os componentes (use `useStrings`).

import type { Continent, ObjectiveKind } from '../../game/types';
import type { Lang } from './types';

const ptBR = {
  appName: 'Shadow Ledger',
  skipHint: 'Toque para pular',
  soundHint: 'Toque em qualquer lugar para ativar o som',

  menuNew: 'Nova partida',
  menuContinue: 'Continuar',
  menuSettings: 'Configurações',
  menuCredits: 'Créditos',
  menuNewMeta: (n: number) => `${n} Presets`,
  menuContinueMeta: (n: number) => (n === 0 ? 'nenhum arquivo' : n === 1 ? '1 arquivo' : `${n} arquivos`),

  back: 'Voltar',
  close: 'Fechar',

  // Nova partida
  newTitle: 'Nova partida',
  tabPresets: 'Presets',
  tabSandbox: 'Sandbox',
  tutorialKicker: 'Primeira vez?',
  tutorialTitle: 'Tutorial',
  tutorialBody: 'Um Preset curto que apresenta Comércio, Estações e Equipes um de cada vez, com a Analista ao seu lado.',
  tutorialCta: 'Começar o Tutorial',
  briefing: 'Briefing',
  objective: 'Objetivo',
  deadline: 'Prazo',
  noDeadline: 'Sem prazo',
  days: (n: number) => `${n} dias`,
  capital: 'Capital',
  challenge: 'Desafio',
  startRegion: 'Região inicial',
  rivals: 'Agências Rivais',
  rivalsNone: 'Nenhuma',
  difficulty: 'Dificuldade',
  difficultyNames: ['', 'Recruta', 'Operador', 'Diretor'] as readonly string[],
  difficultyHelp: [
    '',
    'Rivais lentos e Ameaças avisadas com folga.',
    'O equilíbrio pensado para o jogo.',
    'Rivais agressivos, margens estreitas.',
  ] as readonly string[],
  hardcore: 'Modo Hardcore',
  hardcoreHelp: 'Se o Diretor perder um Combate, morre. Fim de jogo.',
  start: 'Iniciar operação',
  target: 'Lucro alvo',

  // Continuar
  continueTitle: 'Continuar',
  noSaves: 'Nenhuma partida salva neste aparelho.',
  noSavesHint: 'Os saves ficam no navegador. Para levar uma partida a outro aparelho, exporte o arquivo.',
  savedAt: 'Salvo em',
  day: (n: number) => `Dia ${n}`,
  load: 'Carregar',
  export: 'Exportar',
  delete: 'Apagar',
  confirmDelete: 'Apagar mesmo?',
  importFile: 'Importar arquivo',
  importing: 'Lendo arquivo…',
  importOk: 'Arquivo importado.',
  importFail: 'Arquivo inválido.',
  profit: 'Lucro',

  // Configurações
  settingsTitle: 'Configurações',
  language: 'Idioma',
  music: 'Música',
  sfx: 'Efeitos',
  defaultSpeed: 'Velocidade padrão',
  analystMuted: 'Silenciar a Analista',
  analystMutedHelp: 'Ela não comenta Eventos nem apresenta sistemas novos.',
  reducedMotion: 'Reduzir movimento',
  reducedMotionHelp: 'Troca animações e a abertura por cortes simples.',
  on: 'Ligado',
  off: 'Desligado',

  // Créditos
  creditsTitle: 'Créditos',
  creditsLines: [
    ['Jogo', 'Shadow Ledger'],
    ['Inspiração', 'Guns, Girls, Lawyers & Spies (2006), com nomes, textos e arte novos'],
    ['Música e efeitos', 'Síntese procedural em Web Audio, gerada ao vivo'],
    ['Mapa', 'Natural Earth, via world-atlas'],
    ['Feito com', 'React, GSAP, d3-geo, zustand, TopoJSON'],
  ] as readonly (readonly [string, string])[],
  creditsNote: 'Os países são reais. Governos, guerras, alvos e pessoas são inventados pelo jogo.',

  objectiveNames: {
    profit: 'Lucro em N dias',
    quick: 'Lucro rápido',
    destroy: 'Eliminar um grupo',
    rescue: 'Resgatar um refém',
  } as Record<ObjectiveKind, string>,
  continents: {
    NA: 'América do Norte',
    SA: 'América do Sul',
    EU: 'Europa',
    AF: 'África',
    ME: 'Oriente Médio',
    AS: 'Ásia',
    OC: 'Oceania',
  } as Record<Continent, string>,
  money: (v: number) => `US$ ${formatMillions(v, ',')}`,
};

export type Strings = typeof ptBR;

const en: Strings = {
  ...ptBR,
  skipHint: 'Tap to skip',
  soundHint: 'Tap anywhere to turn on sound',
  menuNew: 'New game',
  menuContinue: 'Continue',
  menuSettings: 'Settings',
  menuCredits: 'Credits',
  menuNewMeta: (n) => `${n} Scenarios`,
  menuContinueMeta: (n) => (n === 0 ? 'no files' : n === 1 ? '1 file' : `${n} files`),
  back: 'Back',
  close: 'Close',
  newTitle: 'New game',
  tabPresets: 'Scenarios',
  tabSandbox: 'Sandbox',
  tutorialKicker: 'First time?',
  tutorialTitle: 'Tutorial',
  tutorialBody: 'A short Scenario that introduces Trade, Stations and Teams one at a time, with the Analyst at your side.',
  tutorialCta: 'Start the Tutorial',
  briefing: 'Briefing',
  objective: 'Objective',
  deadline: 'Deadline',
  noDeadline: 'No deadline',
  days: (n) => `${n} days`,
  capital: 'Capital',
  challenge: 'Challenge',
  startRegion: 'Starting region',
  rivals: 'Rival Agencies',
  rivalsNone: 'None',
  difficulty: 'Difficulty',
  difficultyNames: ['', 'Recruit', 'Operator', 'Director'],
  difficultyHelp: [
    '',
    'Slow rivals, Threats announced well in advance.',
    'The balance the game is designed around.',
    'Aggressive rivals, thin margins.',
  ],
  hardcore: 'Hardcore Mode',
  hardcoreHelp: 'If the Director loses an Engagement, they die. Game over.',
  start: 'Begin operation',
  target: 'Profit target',
  continueTitle: 'Continue',
  noSaves: 'No saved games on this device.',
  noSavesHint: 'Saves live in the browser. To move a game to another device, export the file.',
  savedAt: 'Saved',
  day: (n) => `Day ${n}`,
  load: 'Load',
  export: 'Export',
  delete: 'Delete',
  confirmDelete: 'Really delete?',
  importFile: 'Import file',
  importing: 'Reading file…',
  importOk: 'File imported.',
  importFail: 'Invalid file.',
  profit: 'Profit',
  settingsTitle: 'Settings',
  language: 'Language',
  music: 'Music',
  sfx: 'Effects',
  defaultSpeed: 'Default speed',
  analystMuted: 'Mute the Analyst',
  analystMutedHelp: 'She will not comment on Events or introduce new systems.',
  reducedMotion: 'Reduce motion',
  reducedMotionHelp: 'Replaces animations and the opening with simple cuts.',
  on: 'On',
  off: 'Off',
  creditsTitle: 'Credits',
  creditsLines: [
    ['Game', 'Shadow Ledger'],
    ['Inspired by', 'Guns, Girls, Lawyers & Spies (2006), with new names, writing and art'],
    ['Music and sound', 'Procedural Web Audio synthesis, generated live'],
    ['Map', 'Natural Earth, via world-atlas'],
    ['Built with', 'React, GSAP, d3-geo, zustand, TopoJSON'],
  ],
  creditsNote: 'The countries are real. Governments, wars, targets and people are invented by the game.',
  objectiveNames: {
    profit: 'Profit in N days',
    quick: 'Quick profit',
    destroy: 'Eliminate a group',
    rescue: 'Rescue a hostage',
  },
  continents: {
    NA: 'North America',
    SA: 'South America',
    EU: 'Europe',
    AF: 'Africa',
    ME: 'Middle East',
    AS: 'Asia',
    OC: 'Oceania',
  },
  money: (v) => `US$ ${formatMillions(v, '.')}`,
};

function formatMillions(v: number, decimal: string): string {
  if (Math.abs(v) < 950_000) return `${Math.round(v / 1000)}k`;
  const m = v / 1_000_000;
  const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', decimal);
  return `${s}M`;
}

/** Títulos e briefings dos Presets em inglês, por id (o pt-BR vem de PRESETS). */
export const PRESET_EN: Record<string, { title: string; brief: string }> = {
  'first-contract': {
    title: 'First Contract',
    brief: 'A newly opened agency in the Americas. Buy low, sell high and finish 90 days in the black.',
  },
  'med-corridor': {
    title: 'Mediterranean Corridor',
    brief: 'Europe and the Middle East are boiling over. 120 days to turn instability into margin.',
  },
  'quick-swiss': {
    title: 'Numbered Account',
    brief: 'A client in Geneva wants to see US$ 25 million in profit. No deadline — but the scoreboard counts every day.',
  },
  'sahel-hunt': {
    title: 'Hunt in the Sahel',
    brief: 'An armed group roams Africa and the Middle East. Use Stations as eyes and eliminate it within 120 days.',
  },
  'andes-rescue': {
    title: 'Rescue in the Andes',
    brief: 'An engineer has been abducted and is moved from country to country across the Americas. Find and free her within 90 days.',
  },
  'red-line': {
    title: 'Red Line',
    brief: 'A criminal network crosses Europe under heavy escort. 100 days, no excuses.',
  },
  'pacific-cold': {
    title: 'Pacific Chill',
    brief: 'Asia and Oceania under permanent tension. 180 days, deep pockets, watchful state rivals.',
  },
};

const TABLE: Record<Lang, Strings> = { 'pt-BR': ptBR, en };

export const stringsFor = (lang: Lang): Strings => TABLE[lang] ?? ptBR;

export function presetText(lang: Lang, p: { id: string; title: string; brief: string }) {
  if (lang === 'en' && PRESET_EN[p.id]) return PRESET_EN[p.id];
  return { title: p.title, brief: p.brief };
}

export function formatDate(lang: Lang, ms: number): string {
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }
}
