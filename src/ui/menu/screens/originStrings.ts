// Textos e retratos das Origens do Diretor para o passo Diretor da Nova partida.
// Textos pelas chaves origin.<id>.name/.desc/.advantage/.disadvantage e menu.new.origin.* (src/i18n).

import { useMemo } from 'react';
import { useT, type Key, type Params } from '../../../i18n';
import { ORIGINS } from '../../../game/data/origins';
import type { OriginId } from '../../../game/types';
import type { DirectorOrigin } from '../../../art/directors';

/** O motor e a arte nomeiam duas Origens de jeitos diferentes. */
const ART_ID: Record<Exclude<OriginId, 'none'>, DirectorOrigin> = {
  exagent: 'field-agent',
  banker: 'banker',
  colonel: 'colonel',
  diplomat: 'diplomat',
  smuggler: 'smuggler',
  analyst: 'sigint',
};

/** Id de retrato (src/art) de uma Origem do motor; `undefined` para a Origem neutra. */
export const artOrigin = (id: OriginId | undefined): DirectorOrigin | undefined => (id && id !== 'none' ? ART_ID[id] : undefined);

export interface OriginText {
  id: Exclude<OriginId, 'none'>;
  art: DirectorOrigin;
  code: string;
  name: string;
  desc: string;
  advantage: string;
  disadvantage: string;
}

function build(t: (key: Key, params?: Params) => string) {
  const origins: OriginText[] = ORIGINS.filter((o) => o.id !== 'none').map((o, i) => {
    const id = o.id as Exclude<OriginId, 'none'>;
    return {
      id,
      art: ART_ID[id],
      code: t('menu.new.origin.code', { n: String(i + 1).padStart(2, '0') }),
      name: t(`origin.${id}.name` as Key),
      desc: t(`origin.${id}.desc` as Key),
      advantage: t(`origin.${id}.advantage` as Key),
      disadvantage: t(`origin.${id}.disadvantage` as Key),
    };
  });
  return {
    step: t('menu.new.step.director'),
    next: t('menu.new.nextDirector'),
    back: t('menu.new.backToDirector'),
    title: t('menu.new.origin.title'),
    choose: t('menu.new.origin.choose'),
    advantage: t('menu.new.origin.advantage'),
    disadvantage: t('menu.new.origin.disadvantage'),
    origins,
  };
}

export type OriginStrings = ReturnType<typeof build>;

export function useOriginStrings(): OriginStrings {
  const { t, lang } = useT();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => build(t), [lang]);
}
