// Camada fina sobre src/i18n para o menu: mesma forma de objeto que os componentes já usam (`s.menuNew`…),
// com cada texto vindo de t(). Os textos vivem em src/i18n/{pt-BR,en}/menu.ts (chaves menu.*, preset.*, common.*).

import { useMemo } from 'react';
import { useT, type Key, type Lang, type Params } from '../../i18n';
import { presetBrief, presetTitle } from '../../i18n/lookup';
import type { Continent, ObjectiveKind } from '../../game/types';

const CONTINENTS: Continent[] = ['NA', 'SA', 'EU', 'AF', 'ME', 'AS', 'OC'];
const OBJECTIVES: ObjectiveKind[] = ['profit', 'quick', 'destroy', 'rescue'];

function build(t: (key: Key, params?: Params) => string, money: (v: number) => string, date: (ms: number) => string) {
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
  return useMemo(() => build(t, fmt.money, (ms) => fmt.date(ms)), [lang]);
}

/** Título e briefing de um Preset; um Preset sem chave no i18n usa o texto do próprio PresetDef. */
export function presetText(lang: Lang, p: { id: string; title: string; brief: string }) {
  const title = presetTitle(p.id, lang);
  const brief = presetBrief(p.id, lang);
  return { title: title === p.id ? p.title : title, brief: brief || p.brief };
}
