// Sprites isométricos (pixel art, art-kit: public/sprites/*) no mapa e nas Estações.
// Lê os manifestos estáticos (tamanho e âncora de cada PNG) e desenha com <image> no SVG do mapa ou <img> no HTML,
// sempre com image-rendering: pixelated e sem filtros (o mapa recalcula a cada 6 h de jogo).
import { useEffect, useState, type ReactNode } from 'react';
import { loadSpriteStatic, Sprite, spriteAtlasSync, SpriteStill, type SpriteStaticGroup } from '../../art/sprites';
import { useSettings } from '../../store/settings';
import type { OriginId, StationLevel } from '../../game/types';
import { StationPin } from '../game/map/StationPin';
import './sprites.css';

interface Still {
  id: string;
  state?: string;
  image: string;
  width: number;
  height: number;
  anchor: { x: number; y: number };
}

const url = (p: string) => `${import.meta.env.BASE_URL}sprites/${p}`;
// Manifestos carregados em tempo de execução (public/sprites/*.json, da art-kit): o build não depende deles e,
// até chegarem, o mapa usa a plaquinha e os marcadores antigos.
const cache = new Map<string, Still[]>();
function useStills(group: string): Still[] | undefined {
  const [items, setItems] = useState<Still[] | undefined>(() => cache.get(group) ?? (spriteAtlasSync(group) as unknown as SpriteStaticGroup | undefined)?.items);
  useEffect(() => {
    if (items) return;
    let alive = true;
    loadSpriteStatic(group).then(
      (g) => {
        cache.set(group, g.items as Still[]);
        if (alive) setItems(g.items as Still[]);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [group, items]);
  return items;
}

/** Nível da Estação → id do prédio no manifesto. */
export const LEVEL_ID: Record<StationLevel, string> = { 1: 'cell', 2: 'safehouse', 3: 'office', 4: 'compound', 5: 'base' };
export type StationState = 'normal' | 'damaged' | 'interdicted';
export type MarkerKind = 'hostile_group' | 'threat' | 'rival_agency' | 'player_station' | 'director' | 'contract' | 'hunt' | 'vault' | 'flight';

const stationStill = (list: Still[], level: StationLevel, state: StationState) =>
  list.find((x) => x.id === LEVEL_ID[level] && x.state === state) ?? list.find((x) => x.id === LEVEL_ID[level]);

/** Imagem de sprite no SVG, com o ponto (0,0) na âncora do PNG e largura `w` em unidades do mapa. */
function SvgStill({ still, w }: { still: Still; w: number }) {
  const k = w / still.width;
  return (
    <image
      href={url(still.image)}
      x={-still.anchor.x * k}
      y={-still.anchor.y * k}
      width={still.width * k}
      height={still.height * k}
      className="msp-img"
      preserveAspectRatio="none"
    />
  );
}

/** Abaixo deste zoom o mapa mostra a plaquinha (menos poluição com o mundo inteiro na tela). */
export const SPRITE_MIN_ZOOM = 1.7;

/** Largura na tela (px) do prédio de cada Nível: cresce com o Nível, mas não pesa no mapa. */
const LEVEL_PX: Record<StationLevel, number> = { 1: 44, 2: 52, 3: 58, 4: 66, 5: 76 };

/**
 * Estação no mapa: o prédio isométrico do Nível (normal, danificado sob Ameaça, interditado), no lugar da plaquinha.
 * Mesmas props do StationPin; com o zoom baixo (`k` < SPRITE_MIN_ZOOM) desenha a plaquinha. Toque ≥ 44 px.
 */
export function StationSprite(props: {
  x: number;
  y: number;
  inv: number;
  k: number;
  level: StationLevel;
  color: string;
  interdicted?: boolean;
  threatened?: boolean;
  damaged?: boolean;
  scale?: number;
  label?: string;
  onClick?: () => void;
}) {
  const { x, y, inv, k, level, interdicted, threatened, damaged, scale = 1, label, onClick } = props;
  const stations = useStills('stations');
  const state: StationState = interdicted ? 'interdicted' : damaged || threatened ? 'damaged' : 'normal';
  const still = stations && stationStill(stations, level, state);
  if (k < SPRITE_MIN_ZOOM || !still) return <StationPin {...props} />;
  const w = LEVEL_PX[level] * scale * inv;
  return (
    <g className={`msp-station${onClick ? ' pin' : ''}`} transform={`translate(${x} ${y})`} onClick={onClick} role={onClick ? 'button' : undefined} aria-label={label}>
      {label ? <title>{label}</title> : null}
      {onClick && <circle r={22 * inv} fill="transparent" />}
      {threatened && <circle className="stpin-pulse" r={w * 0.42} fill="none" stroke="var(--red)" strokeWidth={1.6 * inv} />}
      <SvgStill still={still} w={w} />
    </g>
  );
}

/** Marcador isométrico no mapa (Agência Rival, grupo hostil, Ameaça, contrato, Caçada…), com tamanho fixo na tela. */
export function MapMarker({ kind, x, y, inv, px = 26, children, ...rest }: { kind: MarkerKind; x: number; y: number; inv: number; px?: number; children?: ReactNode } & React.SVGProps<SVGGElement>) {
  const still = useStills('markers-stills')?.find((m) => m.id === kind);
  if (!still) return null;
  return (
    <g transform={`translate(${x} ${y})`} {...rest}>
      <SvgStill still={still} w={px * inv} />
      {children}
    </g>
  );
}

/** Interior da Estação (imagem de destaque da aba/modal), em escala inteira para o pixel ficar nítido. */
export function StationInterior({ level, maxWidth = 320, maxHeight = 190, className, alt = '' }: { level: StationLevel; maxWidth?: number; maxHeight?: number; className?: string; alt?: string }) {
  const still = useStills('interiors')?.find((x) => x.id === LEVEL_ID[level]);
  if (!still) return null;
  const n = Math.max(1, Math.min(Math.floor(maxWidth / still.width), Math.floor(maxHeight / still.height)));
  return <SpriteStill group="interiors" id={still.id} scale={n} alt={alt} className={`msp-interior${className ? ` ${className}` : ''}`} />;
}

/** Variante do Diretor por Origem: linha `<origem>_idle` do atlas (as 6 Origens, ids de origins.ts). */
const originAnim = (origin?: OriginId) => (origin && origin !== 'none' ? `${origin}_idle` : 'director_idle');

/** Diretor em pixel art (atlas "director"), animado; com reduzir movimento mostra o 1º quadro (Sprite da art-kit). */
export function DirectorSprite({ origin, scale = 2, className, title = '' }: { origin?: OriginId; scale?: number; className?: string; title?: string }) {
  const anim = originAnim(origin);
  // Reduzir movimento das Configurações também para a animação (o Sprite já respeita o do sistema).
  const still = useSettings((st) => st.reducedMotion);
  return <Sprite set="director" anim={anim} playing={!still} scale={scale} alt={title} className={`msp-dir${className ? ` ${className}` : ''}`} />;
}
