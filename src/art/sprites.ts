import { createElement, useEffect, useRef, useState, type CSSProperties } from 'react';

// ══════════════════════════════════════════════════════════════════════
// Sprites isométricos de voxel (public/sprites/, gerados por tools/sprites/build.py).
//  • atlas: uma linha por animação, quadros da esquerda para a direita;
//  • avulsos: prédios das Estações (3 estados), interiores, marcadores e carga.
// `anchor` é o ponto do chão (pés / origem do mundo) dentro do quadro, em px 1x.
// ══════════════════════════════════════════════════════════════════════

export interface SpriteAnim {
  /** chave estável em inglês: idle, walk, run, aim, shoot, reload, cover, hurt, death… */
  name: string;
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  /** caixa opaca do 1º quadro dentro do quadro: [x, y, w, h] em px 1x */
  box?: [number, number, number, number];
}

export interface SpriteAtlas {
  kind: 'atlas';
  id: string;
  image: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  anchor: { x: number; y: number };
  animations: SpriteAnim[];
}

export interface SpriteStaticItem {
  id: string;
  /** só nos prédios das Estações: normal | damaged | interdicted */
  state?: string;
  image: string;
  width: number;
  height: number;
  anchor: { x: number; y: number };
}

export interface SpriteStaticGroup {
  kind: 'static';
  id: string;
  items: SpriteStaticItem[];
}

/** Conjuntos de atlas publicados (public/sprites/index.json). */
export const SPRITE_SETS = [
  'urban', 'military', 'legal', 'pilot', 'influence', 'police', 'criminal', 'director', 'women',
  'vehicles-light', 'vehicles-armor', 'vehicles-heli', 'aircraft-fighters', 'aircraft-bomber-aa', 'cargo-planes-a', 'cargo-planes-b', 'vfx', 'vfx-extra', 'markers', 'cargo',
  'station-cell', 'station-safehouse', 'station-office', 'station-compound', 'station-base',
] as const;
export type SpriteSetId = (typeof SPRITE_SETS)[number];

/** Grupos de imagens avulsas. */
export type SpriteStaticId = 'stations' | 'interiors' | 'markers-stills' | 'cargo-stills';

/** Ids dos níveis de Estação, do 1 ao 5 (prédios e interiores). */
export const STATION_SPRITE_IDS = ['cell', 'safehouse', 'office', 'compound', 'base'] as const;

const BASE = `${import.meta.env.BASE_URL}sprites/`;

/** URL pública de uma imagem citada num manifesto. */
export function spriteUrl(image: string) {
  return BASE + image;
}

const cache = new Map<string, Promise<unknown>>();
const loaded = new Map<string, unknown>();

function load<T>(id: string): Promise<T> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`${BASE}${id}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`sprite ${id}: HTTP ${r.status}`);
        return r.json();
      })
      .then((m) => {
        loaded.set(id, m);
        return m;
      });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p as Promise<T>;
}

/** Carrega (uma vez) o manifesto de um atlas. */
export function loadSpriteAtlas(id: SpriteSetId | string) {
  return load<SpriteAtlas>(id);
}

/** Carrega (uma vez) um grupo de imagens avulsas. */
export function loadSpriteStatic(id: SpriteStaticId | string) {
  return load<SpriteStaticGroup>(id);
}

/** Pré-carrega manifesto e imagem (ex.: antes de abrir o combate). */
export async function preloadSprites(ids: readonly string[]) {
  await Promise.all(
    ids.map(async (id) => {
      const m = await loadSpriteAtlas(id);
      await new Promise<void>((ok) => {
        const img = new Image();
        img.onload = img.onerror = () => ok();
        img.src = spriteUrl(m.image);
      });
    }),
  );
}

/** Manifesto já carregado (ou undefined), sem disparar rede. */
export function spriteAtlasSync(id: string) {
  return loaded.get(id) as SpriteAtlas | undefined;
}

export function findAnim(atlas: SpriteAtlas, name: string): SpriteAnim | undefined {
  return atlas.animations.find((a) => a.name === name);
}

/** Retângulo do quadro no atlas, em px 1x. O quadro é limitado a [0, frames - 1]. */
export function frameRect(atlas: SpriteAtlas, anim: string | SpriteAnim, frame = 0) {
  const a = typeof anim === 'string' ? findAnim(atlas, anim) : anim;
  if (!a) throw new Error(`sprite ${atlas.id}: animação "${String(anim)}" não existe`);
  const i = Math.max(0, Math.min(a.frames - 1, Math.floor(frame)));
  return { x: i * atlas.frameWidth, y: a.row * atlas.frameHeight, w: atlas.frameWidth, h: atlas.frameHeight };
}

/** Quadro de uma animação no tempo `ms` (laço ou parado no último quadro). */
export function frameAt(anim: SpriteAnim, ms: number) {
  const f = Math.floor((ms / 1000) * anim.fps);
  return anim.loop ? f % anim.frames : Math.min(anim.frames - 1, f);
}

/** Duração de uma passada da animação, em ms. */
export function animDuration(anim: SpriteAnim) {
  return (anim.frames / anim.fps) * 1000;
}

/** Manifesto de atlas como estado React (undefined enquanto carrega). */
export function useSpriteAtlas(id: string) {
  const [atlas, setAtlas] = useState<SpriteAtlas | undefined>(() => spriteAtlasSync(id));
  useEffect(() => {
    let alive = true;
    const now = spriteAtlasSync(id);
    setAtlas(now);
    if (!now)
      loadSpriteAtlas(id).then(
        (m) => alive && setAtlas(m),
        () => undefined,
      );
    return () => {
      alive = false;
    };
  }, [id]);
  return atlas;
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface SpriteProps {
  /** id do atlas (SPRITE_SETS) */
  set: SpriteSetId | string;
  /** chave da animação (idle, walk, run…) */
  anim: string;
  /** quadro fixo; ignorado quando `playing` */
  frame?: number;
  /** anima no fps do manifesto (laço ou para no último quadro) */
  playing?: boolean;
  /** espelha na horizontal (virado para SW); com `anchored`, em torno dos pés */
  mirror?: boolean;
  /** escala inteira recomendada (1, 2, 3…); padrão 2 */
  scale?: number;
  /**
   * true: o elemento é posicionado pela âncora — a origem do elemento (left/top do pai)
   * passa a ser o ponto dos pés. Útil num palco com position: relative.
   */
  anchored?: boolean;
  /** velocidade (1 = fps do manifesto) */
  speed?: number;
  /** chamado uma vez quando uma animação sem laço chega ao último quadro */
  onEnd?: () => void;
  /** texto alternativo; vazio = decorativo */
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Sprite de um atlas, desenhado com background-position (sem canvas) e image-rendering: pixelated.
 * Com prefers-reduced-motion, mostra o 1º quadro (laço) ou o último (sem laço).
 */
export function Sprite({ set, anim, frame = 0, playing, mirror, scale = 2, anchored, speed = 1, onEnd, alt = '', className, style }: SpriteProps) {
  const atlas = useSpriteAtlas(set);
  const a = atlas ? findAnim(atlas, anim) : undefined;
  const [tick, setTick] = useState(0);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    setTick(0);
    if (!a || !playing) return;
    if (reducedMotion()) {
      setTick(a.loop ? 0 : a.frames - 1);
      if (!a.loop) endRef.current?.();
      return;
    }
    let raf = 0;
    let last = -1;
    let ended = false;
    const t0 = performance.now();
    const step = (now: number) => {
      const f = frameAt(a, (now - t0) * speed);
      if (f !== last) {
        last = f;
        setTick(f);
      }
      if (!a.loop && f >= a.frames - 1) {
        if (!ended) {
          ended = true;
          endRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [a, playing, speed]);

  const w = (atlas?.frameWidth ?? 0) * scale;
  const h = (atlas?.frameHeight ?? 0) * scale;
  const r = atlas && a ? frameRect(atlas, a, playing ? tick : frame) : undefined;
  const ax = (atlas?.anchor.x ?? 0) * scale;
  const ay = (atlas?.anchor.y ?? 0) * scale;
  const transforms = [anchored ? `translate(${-ax}px, ${-ay}px)` : '', mirror ? 'scaleX(-1)' : ''].filter(Boolean).join(' ');

  return createElement('span', {
    className: ['sl-sprite', className].filter(Boolean).join(' '),
    role: alt ? 'img' : undefined,
    'aria-label': alt || undefined,
    'aria-hidden': alt ? undefined : true,
    'data-anim': anim,
    style: {
      display: 'inline-block',
      flex: 'none',
      width: w,
      height: h,
      backgroundImage: atlas ? `url(${spriteUrl(atlas.image)})` : undefined,
      backgroundRepeat: 'no-repeat',
      backgroundSize: atlas ? `${atlas.width * scale}px ${atlas.height * scale}px` : undefined,
      backgroundPosition: r ? `${-r.x * scale}px ${-r.y * scale}px` : undefined,
      imageRendering: 'pixelated',
      transform: transforms || undefined,
      // ancorado: espelha em torno dos pés; solto: em torno do centro da caixa
      transformOrigin: anchored ? `${ax}px ${ay}px` : 'center',
      position: anchored ? 'absolute' : undefined,
      left: anchored ? 0 : undefined,
      top: anchored ? 0 : undefined,
      pointerEvents: 'none',
      ...style,
    } satisfies CSSProperties,
  });
}

export interface SpriteStillProps {
  group: SpriteStaticId | string;
  id: string;
  /** prédios das Estações: normal | damaged | interdicted */
  state?: string;
  scale?: number;
  anchored?: boolean;
  mirror?: boolean;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/** Imagem avulsa (prédio de Estação, interior, marcador, carga) num <img> pixelado. */
export function SpriteStill({ group, id, state, scale = 2, anchored, mirror, alt = '', className, style }: SpriteStillProps) {
  const [g, setG] = useState<SpriteStaticGroup | undefined>(() => loaded.get(group) as SpriteStaticGroup | undefined);
  useEffect(() => {
    let alive = true;
    loadSpriteStatic(group).then(
      (m) => alive && setG(m),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [group]);
  const it = g?.items.find((i) => i.id === id && (state === undefined || i.state === state));
  if (!it) return null;
  const ax = it.anchor.x * scale;
  const ay = it.anchor.y * scale;
  const transforms = [anchored ? `translate(${-ax}px, ${-ay}px)` : '', mirror ? 'scaleX(-1)' : ''].filter(Boolean).join(' ');
  return createElement('img', {
    src: spriteUrl(it.image),
    alt,
    'aria-hidden': alt ? undefined : true,
    width: it.width * scale,
    height: it.height * scale,
    decoding: 'async',
    draggable: false,
    className: ['sl-sprite', className].filter(Boolean).join(' '),
    style: {
      display: 'block',
      imageRendering: 'pixelated',
      transform: transforms || undefined,
      transformOrigin: anchored ? `${ax}px ${ay}px` : 'center',
      position: anchored ? 'absolute' : undefined,
      left: anchored ? 0 : undefined,
      top: anchored ? 0 : undefined,
      pointerEvents: 'none',
      ...style,
    } satisfies CSSProperties,
  });
}
