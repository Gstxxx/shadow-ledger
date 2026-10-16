// Camada fina sobre src/i18n para o menu: mesma forma de objeto que os componentes já usam (`s.menuNew`…),
// com cada texto vindo de t(). Os textos vivem em src/i18n/{pt-BR,en}/menu.ts (chaves menu.*, preset.*, common.*).

import { useMemo } from 'react';
import { dictionaries, useT, type Key, type Lang, type Params } from '../../i18n';
import { presetBrief, presetTitle } from '../../i18n/lookup';
import type { Continent, ObjectiveKind } from '../../game/types';

const CONTINENTS: Continent[] = ['NA', 'SA', 'EU', 'AF', 'ME', 'AS', 'OC'];
const OBJECTIVES: ObjectiveKind[] = ['profit', 'quick', 'destroy', 'rescue'];

// Reserva das chaves de instalação do PWA até elas entrarem em src/i18n (pedidas à sessão de i18n).
const INSTALL_FALLBACK: Record<string, [string, string]> = {
  'menu.install.cta': ['Instalar o app', 'Install the app'],
  'menu.install.meta': ['Tela cheia, abre pelo ícone', 'Full screen, opens from an icon'],
  'menu.install.title': ['App', 'App'],
  'menu.install.help': ['Instale para jogar em tela cheia e abrir pelo ícone, mesmo sem internet.', 'Install to play full screen and launch from an icon, even offline.'],
  'menu.install.installed': ['Instalado neste aparelho.', 'Installed on this device.'],
  'menu.install.iosTitle': ['Instalar no iPhone ou iPad', 'Install on iPhone or iPad'],
  'menu.install.iosStep1': ['Toque em Compartilhar na barra do Safari.', 'Tap Share in the Safari toolbar.'],
  'menu.install.iosStep2': ['Escolha Adicionar à Tela de Início.', 'Choose Add to Home Screen.'],
};

function build(t: (key: Key, params?: Params) => string, money: (v: number) => string, date: (ms: number) => string, lang: Lang) {
  const tx = (key: string) => ((dictionaries[lang] as Record<string, string>)[key] ? t(key as Key) : INSTALL_FALLBACK[key][lang === 'en' ? 1 : 0]);
  return {
    appName: t('menu.appName'),
    skipHint: t('menu.hint.skip'),
    soundHint: t('menu.hint.sound'),

    menuNew: t('menu.nav.new'),
    menuContinue: t('menu.nav.continue'),
    menuHowTo: t('menu.nav.howto'),
    menuSettings: t('menu.nav.settings'),
    menuCredits: t('menu.nav.credits'),
    menuNewMeta: (n: number) => t('menu.nav.newMeta', { n }),
    menuContinueMeta: (n: number) => t('menu.nav.continueMeta', { n }),

    back: t('common.back'),
    day: (n: number) => t('common.day', { n }),

    newTitle: t('menu.new.title'),
    tabSandbox: t('menu.new.tab.sandbox'),
    objective: t('menu.new.objective'),
    deadline: t('menu.new.deadline'),
    capital: t('menu.new.capital'),
    startRegion: t('menu.new.startRegion'),
    rivalsNone: t('menu.new.rivalsNone'),
    hardcore: t('menu.new.hardcore'),
    target: t('menu.new.target'),

    continueTitle: t('menu.continue.title'),
    noSaves: t('menu.continue.none'),
    noSavesHint: t('menu.continue.noneHint'),
    savedAt: t('menu.continue.savedAt'),
    load: t('menu.continue.load'),
    export: t('menu.continue.export'),
    delete: t('menu.continue.delete'),
    confirmDelete: t('menu.continue.confirmDelete'),
    exportAria: (label: string) => t('menu.continue.exportAria', { label }),
    deleteAria: (label: string) => t('menu.continue.deleteAria', { label }),
    importFile: t('menu.continue.import'),
    importing: t('menu.continue.importing'),
    importOk: t('menu.continue.importOk'),
    importFail: t('menu.continue.importFail'),
    profit: t('menu.continue.profit'),
    autosave: t('menu.continue.autosave'),

    settingsTitle: t('menu.settings.title'),
    language: t('menu.settings.language'),
    music: t('menu.settings.music'),
    sfx: t('menu.settings.sfx'),
    defaultSpeed: t('menu.settings.speed'),
    analystMuted: t('menu.settings.analystMuted'),
    analystMutedHelp: t('menu.settings.analystMutedHelp'),
    reducedMotion: t('menu.settings.reducedMotion'),
    reducedMotionHelp: t('menu.settings.reducedMotionHelp'),

    creditsTitle: t('menu.credits.title'),
    creditsLines: [1, 2, 3, 4, 5].map((i) => [t(`menu.credits.${i}.label` as Key), t(`menu.credits.${i}.value` as Key)] as const),
    creditsNote: t('menu.credits.note'),

    objectiveNames: Object.fromEntries(OBJECTIVES.map((o) => [o, t(`menu.objective.${o}` as Key)])) as Record<ObjectiveKind, string>,
    continents: Object.fromEntries(CONTINENTS.map((c) => [c, t(`menu.continent.${c}` as Key)])) as Record<Continent, string>,
    install: {
      cta: tx('menu.install.cta'),
      meta: tx('menu.install.meta'),
      title: tx('menu.install.title'),
      help: tx('menu.install.help'),
      installed: tx('menu.install.installed'),
      iosTitle: tx('menu.install.iosTitle'),
      iosStep1: tx('menu.install.iosStep1'),
      iosStep2: tx('menu.install.iosStep2'),
      close: t('common.close'),
    },
    money,
    date,
  };
}

export type Strings = ReturnType<typeof build>;

/** Textos do menu no idioma atual; o componente re-renderiza na troca de idioma. */
export function useStrings(): Strings {
  const { t, fmt, lang } = useT();
  // t e fmt são recriados a cada render; o conteúdo só muda com o idioma.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => build(t, fmt.money, (ms) => fmt.date(ms), lang), [lang]);
}

/** Título e briefing de um Preset; um Preset sem chave no i18n usa o texto do próprio PresetDef. */
export function presetText(lang: Lang, p: { id: string; title: string; brief: string }) {
  const title = presetTitle(p.id, lang);
  const brief = presetBrief(p.id, lang);
  return { title: title === p.id ? p.title : title, brief: brief || p.brief };
}
