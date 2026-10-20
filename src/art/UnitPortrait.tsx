import { memo, useId, type CSSProperties } from 'react';
import { Backdrop, Defs, type Ink } from '../ui/item-illustrations/kit';
import { FIGURES, Person, type Figure } from '../ui/item-illustrations/people';
import { ItemIllustration } from '../ui/item-illustrations';
import { findAnim, spriteUrl, useSpriteAtlas } from './sprites';
import './art.css';

// ══════════════════════════════════════════════════════════════════════
// UnitPortrait — retrato de Unidade no mesmo estilo realista das ilustrações
// de itens (src/ui/item-illustrations): Pessoal em busto (cabeça e ombros) da
// figura da função, com variação estável por `seed` (cabelo, corpo, tom da
// roupa); máquinas com a ilustração inteira do próprio item, levemente ampliada.
// Sem imagens externas. Com `look="sprite"`, mostra o quadro parado do sprite
// isométrico de voxel (public/sprites) da Unidade.
// ══════════════════════════════════════════════════════════════════════

/** Sprite de cada item: [atlas, animação, quadro, variante feminina?]. */
const SPRITE_OF: Record<string, [string, string, number, [string, string]?]> = {
  bodyguard: ['urban', 'idle', 0, ['women', 'guard_idle']],
  thug: ['criminal', 'idle', 0],
  police: ['police', 'idle', 0],
  swat: ['police', 'idle', 0],
  soldier: ['military', 'idle', 0],
  commando: ['military', 'idle', 0],
  agent: ['director', 'exagent_idle', 0],
  lawyer1: ['legal', 'idle', 0, ['women', 'lawyer_idle']],
  lawyer2: ['legal', 'idle', 0, ['women', 'lawyer_idle']],
  lawyer3: ['legal', 'idle', 0, ['women', 'lawyer_idle']],
  liaison1: ['influence', 'idle', 0],
  liaison2: ['influence', 'idle', 0],
  liaison3: ['influence', 'idle', 0],
  technical: ['vehicles-light', 'technical_move', 0],
  patrolcar: ['vehicles-light', 'patrolcar_idle', 0],
  apc: ['vehicles-light', 'apc_move', 0],
  ifv: ['vehicles-light', 'apc_move', 0],
  tank1: ['vehicles-armor', 'tank1_move', 0],
  tank3: ['vehicles-armor', 'tank3_move', 0],
  heli1: ['vehicles-heli', 'heli1_hover', 0],
  heli3: ['vehicles-heli', 'heli3_hover', 0],
  jet1: ['aircraft-fighters', 'jet1_fly', 0],
  jet2: ['aircraft-fighters', 'jet2_fly', 0],
  jet3: ['aircraft-fighters', 'jet3_fly', 0],
  bomber: ['aircraft-bomber-aa', 'bomber_fly', 0],
  sam1: ['aircraft-bomber-aa', 'sam1_move', 0],
  sam3: ['aircraft-bomber-aa', 'sam3_raise', 0],
  cargo0: ['cargo-planes-a', 'cargo0_fly', 0],
  cargo1: ['cargo-planes-a', 'cargo1_fly', 0],
  cargo2: ['cargo-planes-b', 'cargo2_fly', 0],
  cargo3: ['cargo-planes-b', 'cargo3_fly', 0],
};

/** Itens que têm sprite isométrico (para `look="sprite"`). */
export const UNIT_SPRITE_IDS: ReadonlySet<string> = new Set(Object.keys(SPRITE_OF));

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

/** Cenários alternativos por função (muda o fundo e a cor da luz de contorno). */
const SCENES: Record<string, Figure['scene'][]> = {
  bodyguard: ['corridor', 'street', 'palace'],
  thug: ['street', 'corridor'],
  police: ['street', 'corridor'],
  swat: ['corridor', 'street'],
  soldier: ['field', 'corridor'],
  commando: ['field', 'street'],
  agent: ['street', 'palace', 'corridor'],
  lawyer1: ['office', 'palace'],
  lawyer2: ['office', 'palace'],
  lawyer3: ['office', 'palace'],
  liaison1: ['palace', 'office', 'street'],
  liaison2: ['palace', 'office'],
  liaison3: ['palace', 'street'],
};
/** Cores de tecido e gravata para sortear (mesma família sóbria das ilustrações). */
const CLOTH = ['#22262b', '#1d2a3e', '#2c2f36', '#3a2f28', '#2a3328', '#1a1c20', '#3b3f46', '#402626'];
const TIES = ['#0e1013', '#5a1c1c', '#24345a', '#3d2a14', '#1f4a3a', '#5a4a1c'];

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
  const scenes = SCENES[itemId] ?? [base.scene];
  const scene = scenes[Math.floor(r() * scenes.length)];
  // roupa civil troca de cor; farda e camuflado só variam o tom
  const uniform = ['uniform', 'tactical', 'camo', 'commando'].includes(outfit);
  const top = uniform ? tint(base.top, 0.8 + r() * 0.4) : tint(CLOTH[Math.floor(r() * CLOTH.length)], 0.85 + r() * 0.35);
  const bottom = base.bottom ? (uniform ? tint(base.bottom, 0.85 + r() * 0.3) : tint(top, 0.8 + r() * 0.15)) : undefined;
  return {
    ...base,
    scene,
    head,
    fem,
    outfit,
    top,
    bottom,
    tie: base.tie ? TIES[Math.floor(r() * TIES.length)] : undefined,
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
  /**
   * 'illustration': busto realista / ilustração do item; 'sprite': quadro parado do sprite de voxel;
   * 'auto' (padrão): sprite onde ele lê bem nesse tamanho (UNIT_SPRITE_DEFAULT), ilustração no resto.
   */
  look?: 'auto' | 'sprite' | 'illustration';
  className?: string;
  style?: CSSProperties;
}

/** Retrato de Unidade: Pessoal em busto realista; máquinas pela ilustração do item. */
export const UnitPortrait = memo(function UnitPortrait({ itemId, seed, name, size = 36, hostile, hurt, out, alt = '', look = 'auto', className, style }: UnitPortraitProps) {
  const uid = useId().replace(/:/g, '');
  const fig = unitFigure(itemId, seed, name);
  // metade das Unidades olha para o outro lado (espelho em torno do centro do recorte, x = 244)
  const flip = rng(`flip:${itemId}:${seed}`)() < 0.5;
  const sprite = SPRITE_OF[itemId] && (look === 'sprite' || (look === 'auto' && UNIT_SPRITE_DEFAULT.has(itemId)));
  if (sprite) {
    const [set, anim, frame, femAlt] = SPRITE_OF[itemId];
    const pick: [string, string] = fig?.fem && femAlt ? femAlt : [set, anim];
    const cls = ['sl-unitp', 'sl-unitp--sprite', hostile && 'sl-unitp--hostile', hurt && 'sl-unitp--hurt', out && 'sl-unitp--out', className].filter(Boolean).join(' ');
    return (
      <span className={cls} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} style={{ width: size, height: size, ...style }}>
        <SpriteFrame set={pick[0]} anim={pick[1]} frame={frame} size={size} mirror={flip} bust={itemId in FIGURES} />
      </span>
    );
  }
  const ink: Ink = { u: (n) => `url(#${uid}-${n})`, k: (n) => `${uid}-${n}`, lg: false };
  const cls = ['sl-unitp', hostile && 'sl-unitp--hostile', hurt && 'sl-unitp--hurt', out && 'sl-unitp--out', className].filter(Boolean).join(' ');
  return (
    <span className={cls} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} style={{ width: size, height: size, ...style }}>
      {fig ? (
        <svg viewBox="202 6 84 84" width={size} height={size} preserveAspectRatio="xMidYMid slice">
          <Defs ink={ink} />
          <Backdrop ink={ink} kind="studio" />
          <g transform={flip ? 'translate(488 0) scale(-1 1)' : undefined}>
            <Person ink={ink} fig={fig} />
          </g>
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

/**
 * Onde o sprite é o padrão de `look="auto"`: as máquinas (o veículo inteiro lê bem já a 36 px).
 * No Pessoal o busto realista continua padrão; o sprite de corpo inteiro fica pequeno num retrato.
 */
export const UNIT_SPRITE_DEFAULT: ReadonlySet<string> = new Set(Object.keys(SPRITE_OF).filter((id) => !(id in FIGURES)));

/** Um quadro do atlas recortado num quadrado: busto (pessoas) ou o quadro inteiro (máquinas). */
function SpriteFrame({ set, anim, frame, size, mirror, bust }: { set: string; anim: string; frame: number; size: number; mirror: boolean; bust: boolean }) {
  const atlas = useSpriteAtlas(set);
  const a = atlas && findAnim(atlas, anim);
  if (!atlas || !a) return null;
  // região do quadro (px 1x) mostrada no quadrado: lado `side`, centro (cx, cy)
  let side: number, cx: number, cy: number;
  if (bust) {
    // cabeça e tronco, ~30 px acima dos pés; escala inteira para o pixel ficar nítido
    side = size / Math.max(1, Math.round(size / 30));
    cx = atlas.anchor.x + 1;
    cy = atlas.anchor.y - 29;
  } else {
    // máquina: a caixa opaca do 1º quadro (manifesto `box`) com 6% de folga
    const [bx, by, bw, bh] = a.box ?? [0, 0, atlas.frameWidth, atlas.frameHeight];
    side = Math.max(bw, bh) * 1.06;
    cx = bx + bw / 2;
    cy = by + bh / 2;
  }
  const k = size / side;
  const fx = Math.min(frame, a.frames - 1) * atlas.frameWidth;
  const fy = a.row * atlas.frameHeight;
  return (
    <span
      aria-hidden
      className="sl-unitp__sprite"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${spriteUrl(atlas.image)})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${atlas.width * k}px ${atlas.height * k}px`,
        backgroundPosition: `${-(fx + cx - side / 2) * k}px ${-(fy + cy - side / 2) * k}px`,
        // nítido quando amplia; suave quando reduz (veículo grande num retrato pequeno)
        imageRendering: k >= 1 ? 'pixelated' : 'auto',
        transform: mirror ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}
