// Textos e retratos das Origens do Diretor para o passo Diretor da Nova partida.
// Chaves: origin.<id>.name/.desc/.advantage/.disadvantage e menu.new.origin.* (src/i18n). Enquanto uma chave
// não existir, vale a reserva abaixo (pt do motor + inglês com os termos do GLOSSARY-EN).

import { useMemo } from 'react';
import { dictionaries, useT, type Key, type Lang, type Params } from '../../../i18n';
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

const FALLBACK: Record<string, [string, string]> = {
  'menu.new.step.director': ['Diretor', 'Director'],
  'menu.new.nextDirector': ['Próximo: Diretor', 'Next: Director'],
  'menu.new.backToDirector': ['Diretor', 'Director'],
  'menu.new.origin.title': ['Origem', 'Origin'],
  'menu.new.origin.choose': ['Quem dirige a agência?', 'Who runs the agency?'],
  'menu.new.origin.advantage': ['Vantagem', 'Advantage'],
  'menu.new.origin.disadvantage': ['Desvantagem', 'Drawback'],
  'menu.new.origin.code': ['Origem · {n}', 'Origin · {n}'],
  'origin.exagent.name': ['Ex-Agente de Campo', 'Former Field Agent'],
  'origin.banker.name': ['Banqueira de Genebra', 'Geneva Banker'],
  'origin.colonel.name': ['Coronel da Reserva', 'Reserve Colonel'],
  'origin.diplomat.name': ['Diplomata Caída', 'Fallen Diplomat'],
  'origin.smuggler.name': ['Contrabandista', 'Smuggler'],
  'origin.analyst.name': ['Analista de Sinais', 'Signals Analyst'],
  'origin.exagent.desc': [
    'Vinte anos de campo e três identidades queimadas; agora o único cliente é a própria agência.',
    'Twenty years in the field and three burned identities; now the only client is the agency itself.',
  ],
  'origin.banker.desc': ['Conhece cada conta numerada de Genebra e quem está por trás dela.', 'Knows every numbered account in Geneva and who is behind it.'],
  'origin.colonel.desc': ['Deixou o uniforme, não os contatos nos quartéis.', 'Left the uniform behind, not the contacts in the barracks.'],
  'origin.diplomat.desc': [
    'Caiu em desgraça no serviço exterior, mas ainda abre portas em qualquer embaixada.',
    'Fell from grace in the foreign service, yet still opens doors at any embassy.',
  ],
  'origin.smuggler.desc': ['Conhece cada pista de terra e cada fiscal que aceita um envelope.', 'Knows every dirt airstrip and every inspector who takes an envelope.'],
  'origin.analyst.desc': ['Ouve o que os governos dizem quando acham que ninguém escuta.', 'Hears what governments say when they think no one is listening.'],
  'origin.exagent.advantage': ['', 'Special Operations generate 25% less Exposure; the Escort gets +1 Urban strength.'],
  'origin.exagent.disadvantage': ['', 'Starts with −10 Reputation in tier 5 countries: your name is in their files.'],
  'origin.banker.advantage': ['', '+4% on every sale; Stations cost 10% less.'],
  'origin.banker.disadvantage': ['', 'Starting Escort has one Unit fewer; Military Engagement −1 with the Director present.'],
  'origin.colonel.advantage': ['', 'Vehicles and anti-air cost 10% less; Military Units get +1 Military strength.'],
  'origin.colonel.disadvantage': ['', '+15% Exposure in countries at Peace: nobody trusts a colonel.'],
  'origin.diplomat.advantage': ['', 'Reputation rises 50% faster; raids and lawsuits arrive with 2 extra days of warning.'],
  'origin.diplomat.disadvantage': ['', 'Urban Engagement −1 for the whole Escort.'],
  'origin.smuggler.advantage': ['', 'Fleet gets +20% capacity and +10% speed; sales cause 25% less Saturation.'],
  'origin.smuggler.disadvantage': ['', '+30% chance of interception on landing.'],
  'origin.analyst.advantage': ['', 'See prices in countries next to your Stations; the Engagement Forecast shows its margin of error.'],
  'origin.analyst.disadvantage': ['', 'Starts with no fighters in the Escort (only legal and influence Personnel).'],
};

export interface OriginText {
  id: Exclude<OriginId, 'none'>;
  art: DirectorOrigin;
  code: string;
  name: string;
  desc: string;
  advantage: string;
  disadvantage: string;
}

function build(t: (key: Key, params?: Params) => string, lang: Lang) {
  const d = dictionaries[lang] as Record<string, string>;
  const tx = (key: string, params?: Params, engine?: string) => {
    if (d[key]) return t(key as Key, params);
    const fb = FALLBACK[key]?.[lang === 'en' ? 1 : 0];
    const text = fb || engine || key;
    return params ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? '')) : text;
  };
  const origins: OriginText[] = ORIGINS.filter((o) => o.id !== 'none').map((o, i) => {
    const id = o.id as Exclude<OriginId, 'none'>;
    return {
      id,
      art: ART_ID[id],
      code: tx('menu.new.origin.code', { n: String(i + 1).padStart(2, '0') }),
      name: tx(`origin.${id}.name`, undefined, o.name),
      desc: tx(`origin.${id}.desc`),
      advantage: tx(`origin.${id}.advantage`, undefined, o.advantage),
      disadvantage: tx(`origin.${id}.disadvantage`, undefined, o.disadvantage),
    };
  });
  return {
    step: tx('menu.new.step.director'),
    next: tx('menu.new.nextDirector'),
    back: tx('menu.new.backToDirector'),
    title: tx('menu.new.origin.title'),
    choose: tx('menu.new.origin.choose'),
    advantage: tx('menu.new.origin.advantage'),
    disadvantage: tx('menu.new.origin.disadvantage'),
    origins,
  };
}

export type OriginStrings = ReturnType<typeof build>;

export function useOriginStrings(): OriginStrings {
  const { t, lang } = useT();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => build(t, lang), [lang]);
}
