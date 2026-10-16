import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-110m.json';
import { POLITICS_COLOR } from '../../game/data/rules';
import { player, postureIn, standing } from '../../game/state';
import type { Flight, GameState } from '../../game/types';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';

const W = 1000;
const H = 520;

export type MapMode = 'posture' | 'exposure' | 'politics';

interface Shape {
  id: string;
  d: string;
}

const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 6],
    [W - 6, H - 6],
  ],
  { type: 'Sphere' },
);
const pathGen = geoPath(projection);

let shapesCache: Shape[] | null = null;
function shapes(): Shape[] {
  if (shapesCache) return shapesCache;
  const topo = countriesTopo as unknown as Topology;
  const fc = feature(topo, topo.objects.countries) as unknown as { features: { id: string; geometry: GeoPermissibleObjects }[] };
  shapesCache = fc.features
    .filter((f) => f.id !== '010') // Antarctica
    .map((f) => ({ id: String(f.id), d: pathGen(f as unknown as GeoPermissibleObjects) ?? '' }));
  return shapesCache;
}
const SPHERE = pathGen({ type: 'Sphere' }) ?? '';
const GRATICULE = pathGen(geoGraticule10()) ?? '';

const project = (lon: number, lat: number) => projection([lon, lat]) ?? [0, 0];

function fillFor(s: GameState, id: string, mode: MapMode): string {
  const c = s.countries[id];
  if (!c) return '#14171c';
  const a = player(s);
  if (mode === 'politics') return POLITICS_COLOR[c.politics] + '55';
  if (mode === 'exposure') {
    const e = standing(a, id).exposure / 100;
    if (e < 0.02) return '#20242b';
    return `rgba(${Math.round(242 - e * 13)}, ${Math.round(169 - e * 97)}, ${Math.round(59 + e * 18)}, ${0.18 + e * 0.6})`;
  }
  const rep = standing(a, id).reputation;
  const p = postureIn(a, id);
  if (p === 'ally') return `rgba(70,185,141,${0.22 + Math.min(1, rep / 100) * 0.4})`;
  if (p === 'enemy') return `rgba(229,72,77,${0.22 + Math.min(1, -rep / 100) * 0.4})`;
  return '#262b33';
}

/** Point along a great-circle flight at the current time. */
function flightPos(f: Flight, s: GameState): [number, number] {
  const a = s.countries[f.from];
  const b = s.countries[f.to];
  const t = Math.max(0, Math.min(1, (s.time - f.depart) / (f.arrive - f.depart)));
  return geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(t);
}

function routePath(f: Flight, s: GameState): string {
  const a = s.countries[f.from];
  const b = s.countries[f.to];
  return pathGen({ type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] }) ?? '';
}

function bearing(f: Flight, s: GameState): number {
  const p0 = flightPos(f, s);
  const t = Math.min(1, (s.time - f.depart) / (f.arrive - f.depart) + 0.02);
  const a = s.countries[f.from];
  const b = s.countries[f.to];
  const p1 = geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(t);
  const [x0, y0] = project(p0[0], p0[1]);
  const [x1, y1] = project(p1[0], p1[1]);
  return (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
}

const Countries = memo(function Countries({
  fills,
  selected,
  onPick,
}: {
  fills: Record<string, string>;
  selected: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <g className="countries">
      {shapes().map((sh) => {
        const playable = sh.id in fills;
        return (
          <path
            key={sh.id}
            d={sh.d}
            className={playable ? 'cty playable' : 'cty'}
            fill={playable ? fills[sh.id] : '#15181d'}
            stroke={selected === sh.id ? 'var(--amber)' : undefined}
            strokeWidth={selected === sh.id ? 1.4 : undefined}
            onClick={playable ? () => onPick(sh.id) : undefined}
          />
        );
      })}
    </g>
  );
});

interface View {
  k: number;
  x: number;
  y: number;
}

export function WorldMap({ mode }: { mode: MapMode }) {
  const s = useGame();
  const a = player(s);
  const selected = useGameStore((st) => st.selected);
  const select = useGameStore((st) => st.select);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: number; pinch?: number } | null>(null);

  const fills = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of Object.keys(s.countries)) out[id] = fillFor(s, id, mode);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, mode, s.lastDay, a.stations.length, Math.round(s.time / 6)]);

  const onPick = useCallback(
    (id: string) => {
      if (drag.current && drag.current.moved > 6) return;
      audio.sfx('click');
      select(id);
    },
    [select],
  );

  const toSvg = (cx: number, cy: number) => {
    const r = svg.current!.getBoundingClientRect();
    const scale = Math.max(W / r.width, H / r.height);
    const ox = (r.width * scale - W) / 2;
    const oy = (r.height * scale - H) / 2;
    return { x: (cx - r.left) * scale - ox, y: (cy - r.top) * scale - oy };
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.max(1, Math.min(8, v.k * factor));
      const f = k / v.k;
      const x = px - (px - v.x) * f;
      const y = py - (py - v.y) * f;
      return clampView({ k, x, y });
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    const p = toSvg(e.clientX, e.clientY);
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.18 : 1 / 1.18);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { moved: 0 };
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      drag.current.pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !drag.current) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && drag.current.pinch) {
      const [p1, p2] = [...pointers.current.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const mid = toSvg((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      zoomAt(mid.x, mid.y, dist / drag.current.pinch);
      drag.current.pinch = dist;
      drag.current.moved += 10;
      return;
    }
    const a0 = toSvg(prev.x, prev.y);
    const a1 = toSvg(cur.x, cur.y);
    drag.current.moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
    if (drag.current.moved > 4) setView((v) => clampView({ ...v, x: v.x + (a1.x - a0.x), y: v.y + (a1.y - a0.y) }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setTimeout(() => (drag.current = null), 0);
  };

  const k = view.k;
  const inv = 1 / k;
  const here = s.countries[a.location];
  const [hx, hy] = project(here.lon, here.lat);
  const g = s.group;

  return (
    <div className="map-wrap">
      <svg
        ref={svg}
        className="map"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <radialGradient id="map-sea" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#10141a" />
            <stop offset="100%" stopColor="#090b0e" />
          </radialGradient>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
          <path d={SPHERE} fill="url(#map-sea)" stroke="rgba(233,228,216,0.08)" strokeWidth={inv} />
          <path d={GRATICULE} fill="none" stroke="rgba(233,228,216,0.035)" strokeWidth={0.6 * inv} />
          <g style={{ strokeWidth: 0.5 * inv }}>
            <Countries fills={fills} selected={selected} onPick={onPick} />
          </g>

          {/* Contratos aceitos: pontos de entrega */}
          {s.contracts
            .filter((c) => c.status === 'accepted' && c.agencyId === a.id)
            .map((c) => {
              const cc = s.countries[c.countryId];
              const [x, y] = project(cc.lon, cc.lat);
              return <circle key={c.id} cx={x + 6 * inv} cy={y - 6 * inv} r={3 * inv} fill="var(--blue)" stroke="#0b0d10" strokeWidth={inv} />;
            })}

          {/* Estações */}
          {a.stations.map((st) => {
            const cc = s.countries[st.countryId];
            const [x, y] = project(cc.lon, cc.lat);
            const sz = (5 + st.level) * inv;
            return (
              <g key={st.countryId} transform={`translate(${x} ${y})`} className="pin" onClick={() => onPick(st.countryId)}>
                <rect
                  x={-sz / 2}
                  y={-sz / 2}
                  width={sz}
                  height={sz}
                  fill={st.interdicted ? '#0b0d10' : 'var(--amber)'}
                  stroke={st.interdicted ? 'var(--red)' : '#0b0d10'}
                  strokeWidth={1.2 * inv}
                />
                {st.interdicted && <path d={`M${-sz / 2} ${-sz / 2}L${sz / 2} ${sz / 2}M${sz / 2} ${-sz / 2}L${-sz / 2} ${sz / 2}`} stroke="var(--red)" strokeWidth={1.2 * inv} />}
              </g>
            );
          })}

          {/* Ameaças anunciadas */}
          {a.threats.map((t) => {
            const cc = s.countries[t.countryId];
            const [x, y] = project(cc.lon, cc.lat);
            const left = Math.max(0, t.strikesAt - s.time);
            return (
              <g key={t.id} transform={`translate(${x} ${y})`} className="threat-pin">
                <circle r={11 * inv} fill="none" stroke="var(--red)" strokeWidth={1.4 * inv} className="pulse" />
                <text y={-14 * inv} fontSize={9 * inv} textAnchor="middle" className="map-label hostile">
                  {Math.ceil(left)}h
                </text>
              </g>
            );
          })}

          {/* Grupo hostil (último avistamento) */}
          {g && !g.defeated && g.seenAt && (() => {
            const cc = s.countries[g.seenAt.countryId];
            const [x, y] = project(cc.lon, cc.lat);
            const d = 6 * inv;
            return (
              <g transform={`translate(${x} ${y})`}>
                <path d={`M0 ${-d}L${d} 0L0 ${d}L${-d} 0Z`} fill="var(--red)" stroke="#0b0d10" strokeWidth={inv} />
                <text y={-10 * inv} fontSize={9 * inv} textAnchor="middle" className="map-label hostile">
                  {g.name}
                </text>
              </g>
            );
          })()}

          {/* Equipes */}
          {a.teams.map((t) => {
            const pos = t.travel ? flightPos(t.travel, s) : [s.countries[t.location].lon, s.countries[t.location].lat];
            const [x, y] = project(pos[0], pos[1]);
            const d = 5 * inv;
            return (
              <g key={t.id}>
                {t.travel && <path d={routePath(t.travel, s)} fill="none" stroke="var(--amber)" strokeOpacity={0.5} strokeDasharray={`${2 * inv} ${3 * inv}`} strokeWidth={inv} />}
                <path transform={`translate(${x + 7 * inv} ${y + 5 * inv})`} d={`M0 ${-d}L${d} ${d}L${-d} ${d}Z`} fill="none" stroke="var(--amber)" strokeWidth={1.4 * inv} />
              </g>
            );
          })}

          {/* Diretor e Frota */}
          {a.flight ? (
            (() => {
              const p = flightPos(a.flight, s);
              const [x, y] = project(p[0], p[1]);
              return (
                <g>
                  <path d={routePath(a.flight, s)} fill="none" stroke="var(--amber)" strokeWidth={1.2 * inv} strokeDasharray={`${4 * inv} ${3 * inv}`} />
                  <g transform={`translate(${x} ${y}) rotate(${bearing(a.flight, s)}) scale(${inv})`}>
                    <path d="M9 0 L-6 -6 L-3 0 L-6 6 Z" fill="var(--amber)" stroke="#0b0d10" strokeWidth={1} />
                  </g>
                </g>
              );
            })()
          ) : (
            a.director.status !== 'dead' && (
              <g transform={`translate(${hx} ${hy})`}>
                <circle r={9 * inv} fill="none" stroke="var(--amber)" strokeWidth={1.5 * inv} className="pulse slow" />
                <circle r={2.4 * inv} fill={a.director.status === 'free' ? 'var(--amber)' : 'var(--red)'} />
              </g>
            )
          )}

          {/* Nomes */}
          {Object.values(s.countries).map((c) => {
            const show = k >= 2.2 || c.id === selected || c.id === a.location || a.stations.some((st) => st.countryId === c.id);
            if (!show) return null;
            const [x, y] = project(c.lon, c.lat);
            return (
              <text key={c.id} x={x} y={y + 14 * inv} fontSize={9.5 * inv} textAnchor="middle" className={`map-label${c.id === selected ? ' sel' : ''}`}>
                {c.name}
              </text>
            );
          })}
        </g>
      </svg>
      <div className="map-zoom">
        <button className="btn icon sm" aria-label="Aproximar" onClick={() => zoomAt(W / 2, H / 2, 1.4)}>
          +
        </button>
        <button className="btn icon sm" aria-label="Afastar" onClick={() => zoomAt(W / 2, H / 2, 1 / 1.4)}>
          −
        </button>
      </div>
    </div>
  );
}

function clampView(v: View): View {
  const minX = W - W * v.k;
  const minY = H - H * v.k;
  return { k: v.k, x: Math.min(0, Math.max(minX, v.x)), y: Math.min(0, Math.max(minY, v.y)) };
}
