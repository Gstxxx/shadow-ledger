import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-110m.json';
import { POLITICS_COLOR } from '../../game/data/rules';
import { intelCountries, player, postureIn, standing } from '../../game/state';
import type { Flight, GameState } from '../../game/types';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { countryName } from '../../i18n/lookup';
import { GMapMarker } from '../../art';

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
    .map((f, i) => ({ id: f.id === undefined ? `x${i}` : String(f.id), d: pathGen(f as unknown as GeoPermissibleObjects) ?? '' }));
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

/** Visible part of the map in SVG units: follows the container's aspect so the map always fills it. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
let box: Box = { x: 0, y: 0, w: W, h: H };

function boxFor(cw: number, ch: number): Box {
  if (!cw || !ch) return { x: 0, y: 0, w: W, h: H };
  const aspect = ch / cw;
  if (aspect > H / W) {
    const h = W * aspect;
    return { x: 0, y: (H - h) / 2, w: W, h };
  }
  const w = H / aspect;
  return { x: (W - w) / 2, y: 0, w, h: H };
}

interface View {
  k: number;
  x: number;
  y: number;
}

export function WorldMap({ mode, onPickCountry }: { mode: MapMode; onPickCountry?: (id: string) => void }) {
  const { t } = useT();
  const s = useGame();
  const a = player(s);
  const selected = useGameStore((st) => st.selected);
  const select = useGameStore((st) => st.select);
  const [view, setView] = useState<View>(() => {
    const c = s.countries[a.location];
    return focusView(c.lon, c.lat, 1.8);
  });
  // Follow the Diretor when the Frota lands somewhere new.
  useEffect(() => {
    if (a.flight) return;
    const c = s.countries[a.location];
    setView((v) => focusView(c.lon, c.lat, Math.max(v.k, 1.8)));
  }, [a.location, a.flight]); // eslint-disable-line react-hooks/exhaustive-deps
  const svg = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState<Box>(box);
  const fitted = useRef(false);
  // Pixels de tela por unidade do mapa: no celular o SVG encolhe e os marcadores sumiriam.
  const [pxPerUnit, setPxPerUnit] = useState(1);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const firstFit = !fitted.current;
      box = boxFor(r.width, r.height);
      setVb(box);
      if (r.width > 0) setPxPerUnit(r.width / box.w);
      // Primeira medida real, ou um tamanho que força mais zoom (o palco muda depois da montagem): centra no Diretor.
      if (r.width > 0) fitted.current = true;
      const g = useGameStore.getState().game;
      const me = g?.agencies.find((x) => x.isPlayer);
      const loc = me && g?.countries[me.location];
      setView((v) => (loc && (firstFit || v.k < minK()) ? focusView(loc.lon, loc.lat, Math.max(v.k, 1.8)) : clampView(v)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
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
      onPickCountry?.(id);
    },
    [select, onPickCountry],
  );

  const toSvg = (cx: number, cy: number) => {
    const r = svg.current!.getBoundingClientRect();
    const scale = box.w / r.width;
    return { x: box.x + (cx - r.left) * scale, y: box.y + (cy - r.top) * scale };
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.max(minK(), Math.min(10, v.k * factor));
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

  const intel = intelCountries(a);
  const k = view.k;
  const line = 1 / k;
  // Marcadores e nomes: tamanho constante na tela (~0,9px por unidade), no máximo 2,4× no celular.
  const inv = Math.min(2.4, Math.max(1, 0.9 / pxPerUnit)) / k;
  const here = s.countries[a.location];
  const [hx, hy] = project(here.lon, here.lat);
  const g = s.group;

  return (
    <div className="map-wrap">
      <svg
        ref={svg}
        className="map"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
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
          <path d={SPHERE} fill="url(#map-sea)" stroke="rgba(233,228,216,0.08)" strokeWidth={line} />
          <path d={GRATICULE} fill="none" stroke="rgba(233,228,216,0.035)" strokeWidth={0.6 * line} />
          <g style={{ strokeWidth: 0.5 * line }}>
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

          {/* Agências Rivais: Estações e Diretor (este só onde a agência tem informação) */}
          {s.agencies
            .filter((r) => !r.isPlayer)
            .map((r) => (
              <g key={r.id} className="rival">
                {r.stations.map((st) => {
                  const cc = s.countries[st.countryId];
                  const [x, y] = project(cc.lon, cc.lat);
                  return <GMapMarker key={st.countryId} kind="rival" x={x + 9 * inv} y={y - 7 * inv} inv={inv} />;
                })}
                {!r.flight && intel.has(r.location) && (() => {
                  const cc = s.countries[r.location];
                  const [x, y] = project(cc.lon, cc.lat);
                  return <circle cx={x - 8 * inv} cy={y + 6 * inv} r={2.6 * inv} fill="var(--violet)" stroke="#0b0d10" strokeWidth={inv} />;
                })()}
              </g>
            ))}

          {/* Estações: hexágono do kit, com as marcas do nível; Interditada leva um X vermelho */}
          {a.stations.map((st) => {
            const cc = s.countries[st.countryId];
            const [x, y] = project(cc.lon, cc.lat);
            const d = 5 * inv;
            return (
              <g key={st.countryId} className="pin">
                <GMapMarker kind="station" x={x} y={y} inv={inv} tier={Math.max(0, st.level - 1)} onClick={() => onPick(st.countryId)} />
                {st.interdicted && (
                  <path
                    transform={`translate(${x} ${y})`}
                    d={`M${-d} ${-d}L${d} ${d}M${d} ${-d}L${-d} ${d}`}
                    stroke="var(--red)"
                    strokeWidth={1.6 * inv}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}

          {/* Ameaças anunciadas */}
          {a.threats.map((th) => {
            const cc = s.countries[th.countryId];
            const [x, y] = project(cc.lon, cc.lat);
            const left = Math.max(0, th.strikesAt - s.time);
            return (
              <g key={th.id}>
                <GMapMarker kind="threat" x={x} y={y} inv={inv} />
                <text x={x} y={y - 14 * inv} fontSize={9 * inv} textAnchor="middle" className="map-label hostile" style={{ strokeWidth: 3 * inv }}>
                  {t('game.map.hours', { n: Math.ceil(left) })}
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
              <g transform={`translate(${x} ${y})`} className="g-mapmark g-mapmark--threat">
                <path d={`M0 ${-d}L${d} 0L0 ${d}L${-d} 0Z`} fill="var(--red)" stroke="#0b0d10" strokeWidth={inv} />
                <text y={-10 * inv} fontSize={9 * inv} textAnchor="middle" className="map-label hostile" style={{ strokeWidth: 3 * inv }}>
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
                {t.travel && <path className="g-route" d={routePath(t.travel, s)} fill="none" stroke="var(--amber)" strokeOpacity={0.5} strokeDasharray={`${2 * inv} ${3 * inv}`} strokeWidth={inv} />}
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
                  <path className="g-route" d={routePath(a.flight, s)} fill="none" stroke="var(--amber)" strokeWidth={1.2 * inv} strokeDasharray={`${4 * inv} ${3 * inv}`} />
                  <g transform={`translate(${x} ${y}) rotate(${bearing(a.flight, s)}) scale(${inv})`}>
                    <path d="M9 0 L-6 -6 L-3 0 L-6 6 Z" fill="var(--amber)" stroke="#0b0d10" strokeWidth={1} />
                  </g>
                </g>
              );
            })()
          ) : (
            a.director.status !== 'dead' && (
              <g>
                <GMapMarker kind="director" x={hx} y={hy} inv={inv} />
                {a.director.status !== 'free' && <circle cx={hx} cy={hy} r={2.4 * inv} fill="var(--red)" pointerEvents="none" />}
              </g>
            )
          )}

          {/* País escolhido (fora de onde o Diretor está) */}
          {selected && selected !== a.location && s.countries[selected] && (() => {
            const cc = s.countries[selected];
            const [x, y] = project(cc.lon, cc.lat);
            return <GMapMarker kind="selected" x={x} y={y} inv={inv} />;
          })()}

          {/* Nomes */}
          {Object.values(s.countries).map((c) => {
            const show = k >= 2.2 || c.id === selected || c.id === a.location || a.stations.some((st) => st.countryId === c.id);
            if (!show) return null;
            const [x, y] = project(c.lon, c.lat);
            return (
              <text key={c.id} x={x} y={y + 14 * inv} fontSize={9.5 * inv} textAnchor="middle" className={`map-label${c.id === selected ? ' sel' : ''}`} style={{ strokeWidth: 3 * inv }}>
                {countryName(c.id)}
              </text>
            );
          })}
        </g>
      </svg>
      <div className="map-zoom">
        <button className="g-btn g-btn--icon g-btn--sm" aria-label={t('game.map.zoomIn')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 1.4)}>
          +
        </button>
        <button className="g-btn g-btn--icon g-btn--sm" aria-label={t('game.map.zoomOut')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 1 / 1.4)}>
          −
        </button>
      </div>
    </div>
  );
}

const minK = () => Math.max(box.w / W, box.h / H);

function focusView(lon: number, lat: number, want: number): View {
  const [px, py] = project(lon, lat);
  // Centra com o zoom efetivo (no celular em pé o mínimo para cobrir a tela passa do pedido).
  const k = Math.max(minK(), want);
  return clampView({ k, x: box.x + box.w / 2 - px * k, y: box.y + box.h / 2 - py * k });
}

function clampView(v: View): View {
  const k = Math.max(minK(), v.k);
  const x = Math.min(box.x, Math.max(box.x + box.w - W * k, v.x));
  const y = Math.min(box.y, Math.max(box.y + box.h - H * k, v.y));
  return { k, x, y };
}
