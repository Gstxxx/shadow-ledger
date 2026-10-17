// Textos da tela Nova partida: camada fina sobre src/i18n (chaves menu.new.*, menu.difficulty.*, common.*).

import { useMemo } from 'react';
import { useT, type Key, type Params } from '../../../i18n';
import type { ObjectiveKind } from '../../../game/types';

/** "1" → número (plural singular); "3–4" e afins seguem como texto (plural "other"). */
const plural = (n: string): number | string => (/^\d+$/.test(n) ? Number(n) : n);

function build(t: (key: Key, params?: Params) => string, money: (v: number) => string) {
  return {
    stepScenario: t('menu.new.step.scenario'),
    stepConfigure: t('menu.new.step.configure'),
    stepOf: (n: number, total: number) => t('menu.new.step.of', { n, total }),
    next: t('menu.new.next'),
    backToScenarios: t('menu.new.backToScenarios'),
    chooseThis: t('menu.new.chooseThis'),
    startHere: t('menu.new.startHere'),
    tutorialNote: t('menu.new.tutorialNote'),
    sandboxTitle: t('menu.new.sandbox.title'),
    sandboxBrief: t('menu.new.sandbox.brief'),
    sandboxOutcome: t('menu.new.sandbox.outcome'),

    outcome: (kind: ObjectiveKind, days: number, target?: number) => {
      switch (kind) {
        case 'profit':
          // Com meta (Presets "Lucro no prazo"), a frase diz quanto; sem meta, basta terminar no azul.
          if (days && target) return t('menu.new.outcome.profitGoal', { target: money(target), days });
          return days ? t('menu.new.outcome.profit', { days }) : t('menu.new.outcome.profitOpen');
        case 'quick':
          return t('menu.new.outcome.quick', { target: money(target ?? 0) });
        case 'destroy':
          return days ? t('menu.new.outcome.destroy', { days }) : t('menu.new.outcome.destroyOpen');
        case 'rescue':
          return days ? t('menu.new.outcome.rescue', { days }) : t('menu.new.outcome.rescueOpen');
      }
    },
    noDeadline: t('menu.new.noDeadline'),
    days: (n: number) => t('common.days', { n }),
    region: t('menu.new.region'),
    regionAria: (list: string) => t('menu.new.regionAria', { list }),
    suggested: t('menu.new.suggested'),
    levelOf: (n: number) => t('menu.new.levelOf', { n }),

    youStartWith: t('menu.new.youStartWith'),
    fleet: t('menu.new.fleet'),
    escort: t('menu.new.escort'),
    stations: t('menu.new.stations'),
    cash: t('menu.new.cash'),
    rivals: t('menu.new.rivals'),
    rivalsBy: (n: string, diff: string) => t('menu.new.rivalsBy', { n, diff }),
    homeBase: t('menu.new.homeBase'),

    names: t('menu.new.names'),
    directorName: t('menu.new.directorName'),
    agencyName: t('menu.new.agencyName'),
    rollAria: (field: string) => t('menu.new.rollAria', { field }),
    difficulty: t('menu.difficulty.title'),
    difficultyCards: [1, 2, 3].map((d) => ({ name: t(`menu.difficulty.${d}` as Key), text: t(`menu.new.difficulty.${d}.text` as Key) })),
    rivalsLine: (n: string) => t('menu.new.rivalsLine', { n: plural(n) }),
    hardcore: t('menu.new.hardcore'),
    hardcoreOff: t('menu.new.hardcoreOff'),
    hardcoreOn: t('menu.new.hardcoreOn'),
    world: t('menu.new.world'),
    summary: t('menu.new.summary'),
    scenario: t('menu.new.scenario'),
    objective: t('menu.new.objective'),
    director: t('menu.new.director'),
    agency: t('menu.new.agency'),
    start: t('menu.new.begin'),
    on: t('common.on'),
    off: t('common.off'),
    nameRequired: t('menu.new.nameRequired'),
    tiers: ['', ...[1, 2, 3, 4, 5].map((i) => t(`menu.new.tier.${i}` as Key))],
    money,
  };
}

export type NewGameStrings = ReturnType<typeof build>;

export function useNewGameStrings(): NewGameStrings {
  const { t, fmt, lang } = useT();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => build(t, fmt.money), [lang]);
}
