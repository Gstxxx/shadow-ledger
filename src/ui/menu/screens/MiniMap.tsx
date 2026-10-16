import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import countriesUrl from 'world-atlas/countries-110m.json?url';
import { COUNTRY_SEEDS } from '../../../game/data/countries';
import type { Continent } from '../../../game/types';

type Countries = FeatureCollection<Geometry, { name: string }>;

let cache: Promise<Countries> | null = null;
function loadCountries(): Promise<Countries> {
  cache ??= fetch(countriesUrl)
    .then((r) => r.json())
    .then((topo: Topology<{ countries: GeometryCollection<{ name: string }> }>) => feature(topo, topo.objects.countries) as Countries);
  return cache;
}

const CONTINENT_OF = new Map(COUNTRY_SEEDS.map((c) => [c.id, c.continent]));
const SEED_OF = new Map(COUNTRY_SEEDS.map((c) => [c.id, c]));

interface Props {
  region: Continent[];
  home: string;
  stations: string[];
  label: string;
}

const W = 320;
const H = 160;

/** Mini-mapa da região do cenário: países da região realçados, base de partida em vermelho, Estações em azul. */
export function MiniMap({ region, home, stations, label }: Props) {
  const [data, setData] = useState<Countries | null>(null);

  useEffect(() => {
    let alive = true;
    loadCountries()
      .then((d) => alive && setData(d))
      .catch(() => {
        /* decorativo: sem mapa, segue sem ele */
      });
    return () => {
      alive = false;
    };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const inRegion = (f: Feature<Geometry, { name: string }>) => {
      const id = String(f.id ?? '').padStart(3, '0');
      const c = CONTINENT_OF.get(id);
      return (c && region.includes(c)) || id === home || stations.includes(id);
    };
    const focus: Countries = { type: 'FeatureCollection', features: data.features.filter(inRegion) };
    const projection = geoNaturalEarth1().fitExtent(
      [
        [10, 10],
        [W - 10, H - 10],
      ],
      focus.features.length ? focus : data,
    );
    const path = geoPath(projection);
    const pin = (id: string) => {
      const s = SEED_OF.get(id);
      return s ? projection([s.lon, s.lat]) : null;
    };
    return {
      shapes: data.features.map((f) => ({ id: String(f.id), d: path(f) ?? '', on: inRegion(f) })),
      home: pin(home),
      stations: stations.filter((id) => id !== home).map(pin).filter((p): p is [number, number] => !!p),
    };
  }, [data, region, home, stations]);

  return (
    <figure className="slm-minimap" aria-label={label} role="img">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {view?.shapes.map((s) => (
          <path key={s.id} d={s.d} className={s.on ? 'on' : undefined} />
        ))}
        {view?.stations.map(([x, y], i) => (
          <rect key={i} x={x - 4} y={y - 4} width={8} height={8} className="slm-minimap-station" />
        ))}
        {view?.home && (
          <g transform={`translate(${view.home[0]} ${view.home[1]})`}>
            <circle r={9} className="slm-minimap-ring" />
            <circle r={4} className="slm-minimap-home" />
          </g>
        )}
      </svg>
    </figure>
  );
}
