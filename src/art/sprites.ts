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

/**
 * Conjuntos com vista de costas `<set>-back` (virados para NE; com `mirror`, para NW — o inimigo de frente
 * para o jogador no combate). Cada atlas de costas tem frameWidth/frameHeight/anchor próprios e a ordem das
 * linhas pode mudar: procure sempre a animação pelo nome. Linhas que não existem de costas (legal phone,
 * pilot board/eject, influence whisper/convinced, director ex_agent/banker/colonel) ficam só na frente.
 */
export const SPRITE_BACK_SETS = ['urban', 'military', 'legal', 'pilot', 'influence', 'police', 'criminal', 'director', 'women', 'vehicles-light', 'vehicles-armor', 'vehicles-heli', 'aircraft-fighters', 'aircraft-bomber-aa'] as const;

/** Conjuntos com 6 variantes de cabeça (pele, cabelo, barba, óculos): `<set>-v0..v5` e `<set>-v0-back..v5-back`. */
export const SPRITE_VARIANT_SETS = ['urban', 'military', 'criminal', 'police', 'women'] as const;
export const SPRITE_VARIANTS = 6;

/** Id do atlas de costas, ou o próprio conjunto quando ele não tem vista de costas. */
export function backSet(set: string) {
  return (SPRITE_BACK_SETS as readonly string[]).includes(set.replace(/-v\d$/, '')) ? `${set}-back` : set;
}

/** Atlas da animação: a de costas quando existe nela, senão a de frente (mesmo nome). */
export async function resolveBackAnim(set: string, anim: string) {
  const back = backSet(set);
  if (back !== set) {
    const m = await loadSpriteAtlas(back).catch(() => undefined);
    if (m && findAnim(m, anim)) return back;
  }
  return set;
}

/**
 * Variante estável de um conjunto por uma chave qualquer (uid da Unidade, seed…): `<set>-v<N>`.
 * Conjuntos sem variantes devolvem o próprio id.
 */
export function variantSet(set: string, key: string | number) {
  if (!(SPRITE_VARIANT_SETS as readonly string[]).includes(set)) return set;
  let h = 2166136261;
  const s = String(key);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return `${set}-v${(h >>> 0) % SPRITE_VARIANTS}`;
}

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

// ── Folhas de ícones de interface (ui-icons-32 / ui-icons-64, kind: 'icons') ──────────────

export interface SpriteIconEntry {
  /** chave estável (pais, mercado, agencia, combate, ameacas, relatorio, cofre, estacao, frota, escolta…) */
  id: string;
  /** rótulo pt-BR de referência (a UI usa o i18n dela) */
  label: string;
  /** id do <GameIcon> equivalente, quando existe */
  gameIcon: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteIconSheet {
  kind: 'icons';
  id: string;
  image: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  icons: SpriteIconEntry[];
}

/** Carrega (uma vez) a folha de ícones de 32 ou 64 px. */
export function loadSpriteIcons(size: 32 | 64) {
  return load<SpriteIconSheet>(`ui-icons-${size}`);
}

/** Folha de ícones como estado React (undefined enquanto carrega). */
export function useSpriteIcons(size: 32 | 64) {
  const id = `ui-icons-${size}`;
  const [sheet, setSheet] = useState<SpriteIconSheet | undefined>(() => loaded.get(id) as SpriteIconSheet | undefined);
  useEffect(() => {
    let alive = true;
    loadSpriteIcons(size).then(
      (m) => alive && setSheet(m),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [size]);
  return sheet;
}

export interface PixelIconProps {
  /** id do ícone (SpriteIconEntry.id) ou, com `byGameIcon`, o id do GameIcon equivalente */
  id: string;
  byGameIcon?: boolean;
  /** lado em px; ≤ 32 usa a folha de 32, acima a de 64. Prefira 32, 64 ou múltiplos */
  size?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/** Ícone de voxel da interface (abas, barra de ações). Nada é desenhado enquanto a folha carrega. */
export function PixelIcon({ id, byGameIcon, size = 32, alt = '', className, style }: PixelIconProps) {
  const sheet = useSpriteIcons(size <= 32 ? 32 : 64);
  const it = sheet?.icons.find((i) => (byGameIcon ? i.gameIcon === id : i.id === id));
  const k = it ? size / it.w : 1;
  return createElement('span', {
    className: ['sl-pixel-icon', className].filter(Boolean).join(' '),
    role: alt ? 'img' : undefined,
    'aria-label': alt || undefined,
    'aria-hidden': alt ? undefined : true,
    style: {
      display: 'inline-block',
      flex: 'none',
      width: size,
      height: size,
      backgroundImage: sheet && it ? `url(${spriteUrl(sheet.image)})` : undefined,
      backgroundRepeat: 'no-repeat',
      backgroundSize: sheet ? `${sheet.width * k}px ${sheet.height * k}px` : undefined,
      backgroundPosition: it ? `${-it.x * k}px ${-it.y * k}px` : undefined,
      imageRendering: Number.isInteger(k) ? 'pixelated' : 'auto',
      ...style,
    } satisfies CSSProperties,
  });
}

// ── Outros conjuntos de misc/ (atlas comuns, usam <Sprite>) ─────────────────────────────

/** Aviões do mapa (atlas 'map-planes', 64×61): `<cargo0..3>_<fly|takeoff|land>_<rumo>` e `contrail_puff`. */
export const MAP_PLANE_HEADINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type MapPlaneHeading = (typeof MAP_PLANE_HEADINGS)[number];

/** Rumo de tela (N = para cima) mais próximo de um vetor dx, dy em px de tela (y para baixo). */
export function mapPlaneHeading(dx: number, dy: number): MapPlaneHeading {
  const a = Math.atan2(dx, -dy); // 0 = N, horário
  return MAP_PLANE_HEADINGS[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}

/** Veículos XL (1,6×, mais contraste, com `*_wreck` em laço): atlas `vehicles-xl-<id>` e `vehicles-xl-<id>-back`. */
export const VEHICLES_XL = ['technical', 'patrolcar', 'apc', 'tank1', 'tank3', 'heli1', 'heli3'] as const;

/** Retratos da história (atlas `portraits-story-128` / `-64`): animação `<id>_idle` de 4 quadros. */
export const STORY_PORTRAITS = ['analyst', 'arrieta', 'moravia_boss', 'moravia_enforcer'] as const;

// ── Fundos de combate e cena do menu (tools/sprites/scenes) ─────────────────────────────

/** Animação de cena em grade (opaca ou não): `columns` × `rows` quadros de frameWidth × frameHeight. */
export interface SceneSheet {
  /** caminho do manifesto sem .json, relativo a public/sprites (ex.: 'arenas/urbano/urbano') */
  path: string;
  name: string;
  /** atlas animado (relativo à pasta do manifesto) */
  image: string;
  /** quadro 0 avulso (relativo à pasta do manifesto) */
  static: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  columns: number;
  rows: number;
}

/**
 * Fundo de combate (kind 'arena'): 768×570 a 1x (escala 10 voxels = 1 m, a dos personagens; célula de 2,8 m),
 * 6 quadros de ambiente, mais uma camada `front` de objetos
 * que vão POR CIMA das Unidades. Grade isométrica de 8 colunas × 3 linhas (jogador 0–2, inimigo 5–7):
 * canto da célula (c, r) = gridOrigin + c·colStep + r·rowStep; centro = canto + (colStep + rowStep) / 2.
 */
export interface ArenaManifest extends SceneSheet {
  kind: 'arena';
  id: ArenaId;
  front: string;
  gridOrigin: { x: number; y: number };
  cellW: number;
  cellH: number;
  colStep: { x: number; y: number };
  rowStep: { x: number; y: number };
  grid: { cols: number; rows: number; cellVoxels: number; playerCols: number[]; enemyCols: number[] };
}

/** Cena do menu principal (kind 'scene'): opaca, 12 quadros, para ampliar em escala inteira (recommendedScale). */
export interface MenuSceneManifest extends SceneSheet {
  kind: 'scene';
  id: 'menu-portrait' | 'menu-landscape';
  recommendedScale: number;
}

/** Fundos de combate. `aereo` é o do combate aéreo. */
export const ARENAS = ['urbano', 'militar', 'juridico', 'aereo'] as const;
export type ArenaId = (typeof ARENAS)[number];

async function loadScene<T extends SceneSheet>(path: string): Promise<T> {
  const m = await load<Omit<T, 'path'>>(path);
  return { ...m, path } as T;
}

/** Carrega (uma vez) o manifesto de um fundo de combate. */
export function loadArena(id: ArenaId) {
  return loadScene<ArenaManifest>(`arenas/${id}/${id}`);
}

/** Carrega (uma vez) a cena do menu no recorte em pé ou deitado. */
export function loadMenuScene(orientation: 'portrait' | 'landscape') {
  return loadScene<MenuSceneManifest>(`menu/menu-${orientation}`);
}

/** URL de um arquivo citado por um manifesto de cena (image, static, front). */
export function sceneUrl(m: SceneSheet, file: string) {
  return spriteUrl(m.path.replace(/[^/]*$/, '') + file);
}

/** Retângulo do quadro i no atlas da cena, em px 1x. */
export function sceneFrameRect(m: SceneSheet, i: number) {
  const f = ((Math.floor(i) % m.frames) + m.frames) % m.frames;
  return { x: (f % m.columns) * m.frameWidth, y: Math.floor(f / m.columns) * m.frameHeight, w: m.frameWidth, h: m.frameHeight };
}

/** Centro da célula (col, row) da arena, em px 1x do fundo (é ali que ficam os pés da Unidade). */
export function arenaCellCenter(m: ArenaManifest, col: number, row: number) {
  return {
    x: m.gridOrigin.x + col * m.colStep.x + row * m.rowStep.x + (m.colStep.x + m.rowStep.x) / 2,
    y: m.gridOrigin.y + col * m.colStep.y + row * m.rowStep.y + (m.colStep.y + m.rowStep.y) / 2,
  };
}

/** Manifesto de cena como estado React (undefined enquanto carrega). */
export function useScene<T extends SceneSheet>(loader: () => Promise<T>, key: string) {
  const [m, setM] = useState<T | undefined>(() => {
    const hit = loaded.get(key);
    return hit ? ({ ...(hit as object), path: key } as T) : undefined;
  });
  useEffect(() => {
    let alive = true;
    loader().then(
      (v) => alive && setM(v),
      () => undefined,
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return m;
}

/** Fundo de combate como estado React. */
export function useArena(id: ArenaId) {
  return useScene(() => loadArena(id), `arenas/${id}/${id}`);
}

/** Cena do menu como estado React. */
export function useMenuScene(orientation: 'portrait' | 'landscape') {
  return useScene(() => loadMenuScene(orientation), `menu/menu-${orientation}`);
}
