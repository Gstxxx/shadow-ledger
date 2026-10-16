// "Como jogar": o esqueleto (seções, ícones, tipos de bloco) fica aqui; o texto vem de src/i18n (chaves menu.guide.*,
// espelho de docs/COMO-JOGAR.md). **termo** vira negrito; se o termo estiver em TERM_ICON, ganha o ícone de src/art.

import { useMemo } from 'react';
import { useT, type Key, type Params } from '../../../i18n';

export type Block =
  | { p: string }
  | { ol: string[] }
  | { ul: (string | { text: string; sub: string[] })[] }
  | { tip: string };

export interface Section {
  id: string;
  /** Rótulo curto para a navegação. */
  nav: string;
  title: string;
  icon: string;
  highlight?: boolean;
  blocks: Block[];
}

export interface Guide {
  title: string;
  intro: string;
  sectionsLabel: string;
  quickLabel: string;
  sections: Section[];
}

/** Forma de cada bloco: ol/ul com N itens (um item de ul pode ter sub-itens), p e tip de uma linha. */
type Shape = { ol: number } | { ul: (number | { sub: number })[] } | 'p' | 'tip';

const SKELETON: { id: string; icon: string; highlight?: boolean; blocks: Shape[] }[] = [
  { id: 'quick', icon: 'clock', highlight: true, blocks: [{ ol: 5 }] },
  { id: 'start', icon: 'director', blocks: [{ ol: 3 }] },
  { id: 'time', icon: 'clock', blocks: [{ ul: [1, 1, 1] }] },
  { id: 'trade', icon: 'crate', blocks: [{ ol: 5 }, 'p', { ul: [1, 1, 1, 1, 1] }] },
  { id: 'stations', icon: 'station-safehouse', blocks: [{ ul: [1, 1] }, 'tip'] },
  { id: 'threats', icon: 'threat', blocks: [{ ul: [1, 1, { sub: 2 }] }] },
  { id: 'units', icon: 'team', blocks: [{ ul: [1, 1, 1, 1] }] },
  { id: 'combat', icon: 'combat-urban', blocks: [{ ul: [1, 1, 1, 1] }] },
  { id: 'late', icon: 'tension', blocks: [{ ul: [1, 1, 1, 1] }] },
];

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function build(t: (key: Key, params?: Params) => string): Guide {
  const k = (s: string) => t(`menu.guide.${s}` as Key);
  return {
    title: k('title'),
    intro: k('intro'),
    sectionsLabel: k('sectionsLabel'),
    quickLabel: k('quickLabel'),
    sections: SKELETON.map((sec) => ({
      id: sec.id,
      icon: sec.icon,
      highlight: sec.highlight,
      nav: k(`${sec.id}.nav`),
      title: k(`${sec.id}.title`),
      blocks: sec.blocks.map((shape, b): Block => {
        const base = `${sec.id}.${b + 1}`;
        if (shape === 'p') return { p: k(`${base}.p`) };
        if (shape === 'tip') return { tip: k(`${base}.tip`) };
        if ('ol' in shape) return { ol: range(shape.ol).map((i) => k(`${base}.ol.${i}`)) };
        return {
          ul: shape.ul.map((item, i) =>
            typeof item === 'number'
              ? k(`${base}.ul.${i + 1}`)
              : { text: k(`${base}.ul.${i + 1}.text`), sub: range(item.sub).map((j) => k(`${base}.ul.${i + 1}.sub.${j}`)) },
          ),
        };
      }),
    })),
  };
}

/** O guia no idioma atual. */
export function useGuide(): Guide {
  const { t, lang } = useT();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => build(t), [lang]);
}

/** Termo em negrito → ícone de src/art (pt-BR e en, em minúsculas). Se o texto de um termo mudar no i18n, atualize aqui. */
export const TERM_ICON: Record<string, string> = {
  diretor: 'director', director: 'director',
  'estações': 'station-safehouse', 'estação': 'station-safehouse', stations: 'station-safehouse', station: 'station-safehouse',
  'célula': 'station-cell', cell: 'station-cell', base: 'station-base',
  frota: 'fleet', fleet: 'fleet',
  escolta: 'team', escort: 'team', equipes: 'team', 'teams:': 'team', 'equipes:': 'team',
  eventos: 'event', events: 'event',
  lucro: 'money', profit: 'money',
  'reputação:': 'reputation', 'reputation:': 'reputation',
  'exposição:': 'exposure', 'exposure:': 'exposure',
  'ameaças': 'threat', threats: 'threat',
  aliado: 'stance-ally', ally: 'stance-ally', neutro: 'stance-neutral', neutral: 'stance-neutral',
  'inimigo do estado': 'stance-enemy', 'enemy of the state': 'stance-enemy',
  interditada: 'seized', seized: 'seized',
  detidas: 'detained', detido: 'detained', detained: 'detained',
  sequestrado: 'abducted', abducted: 'abducted',
  'prévia': 'forecast', forecast: 'forecast',
  assalto: 'tactic-assault', assault: 'tactic-assault',
  defensiva: 'tactic-hold', hold: 'tactic-hold',
  'infiltração': 'tactic-infiltrate', infiltrate: 'tactic-infiltrate',
  negociar: 'tactic-negotiate', negotiate: 'tactic-negotiate',
  urbano: 'combat-urban', urban: 'combat-urban',
  militar: 'combat-army', military: 'combat-army',
  'jurídico': 'combat-legal', legal: 'combat-legal',
  'aéreo': 'combat-air', air: 'combat-air',
  'operações especiais': 'special-op', 'special operations': 'special-op',
  'neutralização': 'neutralization', neutralization: 'neutralization',
  'agências rivais': 'rival', 'rival agencies': 'rival',
  contratos: 'contract', contracts: 'contract',
  'tensão global:': 'tension', 'global tension:': 'tension',
  'crise final': 'final-crisis', 'final crisis': 'final-crisis',
  'agentes de influência': 'influence', 'influence agents': 'influence',
  'manutenção': 'clock', upkeep: 'clock',
  'saturação:': 'money', 'saturation:': 'money',
};
