// Aviões no mapa (atlas "map-planes" da art-kit): o cargueiro líder da Frota voa pela rota com o sprite do seu
// modelo, decola na origem, pousa no destino e deixa baforadas de rastro que somem. A direção vem do ângulo do
// trecho na tela, arredondado para 8 direções (N = para cima). Sem o atlas, o mapa mantém a seta de antes.
// Barato: um <svg> recortado por avião, quadros por CSS steps(), pointer-events: none.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { geoInterpolate } from 'd3-geo';
import { spriteUrl, useSpriteAtlas, type SpriteAtlas } from '../../art/sprites';
import type { Flight } from '../../game/types';
import { useGameStore } from '../../store/game';
import { useSettings } from '../../store/settings';
import './sprites.css';

const HEADINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
type Heading = (typeof HEADINGS)[number];

/** Ângulo de tela (graus, 0 = leste, sentido horário como no SVG) → uma das 8 direções. */
export function headingOf(screenDeg: number): Heading {
  const fromNorth = (screenDeg + 90 + 360) % 360; // 0 = para cima
  return HEADINGS[Math.round(fromNorth / 45) % 8];
}

type Phase = 'takeoff' | 'fly' | 'land';
/** Decolagem no primeiro trecho do voo, pouso no último. */
const phaseOf = (t: number): Phase => (t < 0.08 ? 'takeoff' : t > 0.92 ? 'land' : 'fly');

const PLANES = ['cargo0', 'cargo1', 'cargo2', 'cargo3'];
const modelOf = (itemId?: string) => (itemId && PLANES.includes(itemId) ? itemId : 'cargo0');

const reducedSystem = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Um quadro (ou animação em laço) do atlas no SVG, com a âncora em (x, y) e escala `k` (px do atlas → mapa). */
function AtlasFrame({ atlas, name, x, y, k, play, once, className, style }: { atlas: SpriteAtlas; name: string; x: number; y: number; k: number; play: boolean; once?: boolean; className?: string; style?: CSSProperties }) {
  const a = atlas.animations.find((an) => an.name === name);
  if (!a) return null;
  const { frameWidth: fw, frameHeight: fh } = atlas;
  const anim = {
    '--msp-steps': a.frames,
    '--msp-shift': `${-a.frames * fw}px`,
    '--msp-dur': `${a.frames / a.fps}s`,
    '--msp-iter': once ? 1 : 'infinite',
  } as CSSProperties;
  return (
    <svg x={x - atlas.anchor.x * k} y={y - atlas.anchor.y * k} width={fw * k} height={fh * k} viewBox={`0 0 ${fw} ${fh}`} overflow="hidden" className={className} style={style} aria-hidden="true">
      <image
        href={spriteUrl(atlas.image)}
        x={0}
        y={-a.row * fh}
        width={atlas.width}
        height={atlas.height}
        className={`msp-img${play && a.frames > 1 ? ' msp-vfx-strip' : ''}`}
        style={play ? anim : undefined}
        preserveAspectRatio="none"
      />
    </svg>
  );
}

/**
 * Avião voando no mapa pela rota `flight`. Acompanha o relógio do jogo sozinho (assina o tique da store), então
 * desliza mesmo com o mapa redesenhando só a cada 6 h. `px` é a largura do quadro na tela (64 = escala 1).
 * Sem o atlas, desenha `fallback`.
 */
export function FlightSprite({
  itemId,
  flight,
  project,
  inv,
  px = 64,
  fallback,
}: {
  itemId?: string;
  flight: Flight;
  project: (lon: number, lat: number) => [number, number];
  inv: number;
  px?: number;
  fallback: ReactNode;
}) {
  const atlas = useSpriteAtlas('map-planes');
  const reduced = useSettings((st) => st.reducedMotion) || reducedSystem();
  useGameStore((st) => st.rev);
  const g = useGameStore.getState().game;
  const a = g?.countries[flight.from];
  const b = g?.countries[flight.to];
  const t = g ? Math.max(0, Math.min(1, (g.time - flight.depart) / (flight.arrive - flight.depart))) : 0;
  const path = a && b ? geoInterpolate([a.lon, a.lat], [b.lon, b.lat]) : null;
  const here = path ? path(t) : [0, 0];
  const ahead = path ? path(Math.min(1, t + 0.02)) : [0, 0];
  const behind = path ? path(Math.max(0, t - 0.02)) : [0, 0];
  const [x, y] = project(here[0], here[1]);
  const [x0, y0] = project(behind[0], behind[1]);
  const [x1, y1] = project(ahead[0], ahead[1]);
  const deg = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  const model = modelOf(itemId);
  const heading = headingOf(deg);
  const phase = reduced ? 'fly' : phaseOf(t);

  // Baforadas de rastro: a cada 0,5 s, onde o avião está agora; cada uma some sozinha (CSS) e sai da lista.
  const pos = useRef({ x, y });
  pos.current = { x, y };
  const [puffs, setPuffs] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    if (reduced || !atlas) return;
    let n = 0;
    const timer = setInterval(() => {
      const p = pos.current;
      setPuffs((list) => [...list.slice(-7), { id: n++, x: p.x, y: p.y }]);
    }, 500);
    return () => clearInterval(timer);
  }, [reduced, atlas]);

  if (!atlas) return <>{fallback}</>;
  const k = (px / atlas.frameWidth) * inv;
  const name = `${model}_${phase}_${heading}`;
  const has = atlas.animations.some((a) => a.name === name);
  return (
    <g className="msp-plane" pointerEvents="none">
      {!reduced &&
        puffs.map((p) => <AtlasFrame key={p.id} atlas={atlas} name="contrail_puff" x={p.x} y={p.y} k={k * 0.6} play once className="msp-puff" />)}
      <g className="msp-plane-body" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <AtlasFrame atlas={atlas} name={has ? name : `${model}_fly_${heading}`} x={0} y={0} k={k} play={!reduced} once={phase !== 'fly'} />
      </g>
    </g>
  );
}
