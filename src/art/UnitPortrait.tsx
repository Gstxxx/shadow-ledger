import { memo, useId, type CSSProperties } from 'react';
import { Backdrop, Defs, type Ink } from '../ui/item-illustrations/kit';
import { FIGURES, Person, type Figure } from '../ui/item-illustrations/people';
import { ItemIllustration } from '../ui/item-illustrations';
import './art.css';

// ══════════════════════════════════════════════════════════════════════
// UnitPortrait — retrato de Unidade no mesmo estilo realista das ilustrações
// de itens (src/ui/item-illustrations): Pessoal em busto (cabeça e ombros) da
// figura da função, com variação estável por `seed` (cabelo, corpo, tom da
// roupa); máquinas com a ilustração inteira do próprio item, levemente ampliada.
// Sem imagens externas.
// ══════════════════════════════════════════════════════════════════════

type Head = Figure['head'];

/** Cabelos/cobertura possíveis por função (o primeiro é o da ilustração do Mercado). */
const HEADS: Record<string, Head[]> = {
  bodyguard: ['crop', 'slick', 'bald', 'bun'],
  thug: ['crop', 'bald', 'balaclava', 'long'],
  police: ['cap'],
  swat: ['helmet'],
  soldier: ['helmet'],
  commando: ['nvg', 'balaclava', 'helmet'],
  agent: ['hat', 'crop', 'slick', 'bun'],
  lawyer1: ['slick', 'crop', 'bald', 'bun'],
  lawyer2: ['bun', 'long', 'slick'],
  lawyer3: ['bald', 'slick', 'crop'],
  liaison1: ['slick', 'long', 'bun', 'crop'],
  liaison2: ['long', 'bun', 'slick'],
  liaison3: ['slick', 'long', 'crop'],
};

/** Primeiros nomes femininos de src/game/data/names.ts (o corpo segue o nome quando ele é passado). */
const FEM_NAMES = new Set(['Ana', 'Leila', 'Yuki', 'Sofia', 'Ingrid', 'Nadia', 'Isabela', 'Amara', 'Mei', 'Clara', 'Priya', 'Elena', 'Zara', 'Aisha', 'Lucía', 'Noor', 'Katya', 'Ines', 'Freya', 'Bianca', 'Yara', 'Camila', 'Astrid', 'Svetlana']);

/** Roupas que só existem no corpo feminino da ilustração. */
const FEM_ONLY = new Set<Figure['outfit']>(['gown', 'skirtsuit']);

function rng(seed: number | string) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function tint(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Figura da função com variação estável pela semente. */
export function unitFigure(itemId: string, seed: number | string, name?: string): Figure | undefined {
  const base = FIGURES[itemId];
  if (!base) return undefined;
  const r = rng(`${itemId}:${seed}`);
  const first = name?.split(' ')[0];
  const byName = first ? FEM_NAMES.has(first) : undefined;
  const all = HEADS[itemId] ?? [base.head];
  // com nome, o cabelo tem de combinar com o corpo; sem nome, o cabelo decide
  const fit = byName === undefined ? all : all.filter((h) => (byName ? h !== 'bald' : h !== 'long' && h !== 'bun'));
  const heads = fit.length ? fit : all;
  const head = heads[Math.floor(r() * heads.length)];
  const fem =
    byName ?? (FEM_ONLY.has(base.outfit) ? true : head === 'long' || head === 'bun' ? true : head === 'bald' || head === 'slick' ? false : r() < 0.3);
  const outfit = !fem && FEM_ONLY.has(base.outfit) ? 'suit' : base.outfit;
  const f = 0.8 + r() * 0.45;
  return {
    ...base,
    head,
    fem,
    outfit,
    top: tint(base.top, f),
    bottom: base.bottom ? tint(base.bottom, f * (0.92 + r() * 0.12)) : undefined,
    earpiece: base.earpiece || (itemId === 'agent' && r() < 0.4),
  };
}

export interface UnitPortraitProps {
  /** id do item da Unidade (src/game/data/items.ts) */
  itemId: string;
  /** semente estável da Unidade (unit.seed) */
  seed: number | string;
  /** nome da Unidade (unit.name): o corpo e o cabelo seguem o primeiro nome */
  name?: string;
  /** lado em px (retrato quadrado) */
  size?: number;
  /** força hostil: moldura vermelha */
  hostile?: boolean;
  /** Ferida/Danificada: dessatura e marca */
  hurt?: boolean;
  /** fora de ação (Detida etc.): esmaecido */
  out?: boolean;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/** Retrato de Unidade: Pessoal em busto realista; máquinas pela ilustração do item. */
export const UnitPortrait = memo(function UnitPortrait({ itemId, seed, name, size = 36, hostile, hurt, out, alt = '', className, style }: UnitPortraitProps) {
  const uid = useId().replace(/:/g, '');
  const fig = unitFigure(itemId, seed, name);
  const ink: Ink = { u: (n) => `url(#${uid}-${n})`, k: (n) => `${uid}-${n}`, lg: false };
  const cls = ['sl-unitp', hostile && 'sl-unitp--hostile', hurt && 'sl-unitp--hurt', out && 'sl-unitp--out', className].filter(Boolean).join(' ');
  return (
    <span className={cls} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} style={{ width: size, height: size, ...style }}>
      {fig ? (
        <svg viewBox="202 6 84 84" width={size} height={size} preserveAspectRatio="xMidYMid slice">
          <Defs ink={ink} />
          <Backdrop ink={ink} kind="studio" />
          <Person ink={ink} fig={fig} />
          <radialGradient id={`${uid}-pv`} cx="0.5" cy="0.42" r="0.62">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <rect x="202" y="6" width="84" height="84" fill={`url(#${uid}-pv)`} />
        </svg>
      ) : (
        <ItemIllustration id={itemId} size="sm" alt="" className="sl-unitp__machine" />
      )}
    </span>
  );
});
