import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { geoInterpolate, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import landUrl from 'world-atlas/land-110m.json?url';
import { COUNTRY_SEEDS } from '../../game/data/countries';
import { ease } from './ease';

interface Props {
  /** Liga as rotas animadas; desligado, mostra um conjunto fixo. */
  animate: boolean;
  /** Começa a desenhar só quando visível. */
  active: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Mapa-múndi em pontos com rotas de carga sendo traçadas entre capitais (fundo do Título). */
export function WorldRoutes({ animate, active }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!active) return;
    const host = wrap.current!;
    const cv = canvas.current!;
    const sv = svg.current!;
    let disposed = false;
    let projection: GeoProjection | null = null;
    let timer: gsap.core.Tween | null = null;
    const live = new Set<gsap.core.Timeline>();

    const draw = async () => {
      const res = await fetch(landUrl);
      const topo = (await res.json()) as Topology<{ land: GeometryCollection }>;
      if (disposed) return;
      const land = feature(topo, topo.objects.land);
      const { width, height } = host.getBoundingClientRect();
      if (width < 10 || height < 10) return;
      projection = geoNaturalEarth1().fitExtent(
        [
          [width * 0.02, height * 0.04],
          [width * 0.98, height * 0.96],
        ],
        { type: 'Sphere' },
      );

      // Terra em pontos: rasteriza a silhueta numa tela fora da página e amostra uma grade.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const off = document.createElement('canvas');
      off.width = Math.ceil(width);
      off.height = Math.ceil(height);
      const oc = off.getContext('2d', { willReadFrequently: true })!;
      oc.fillStyle = '#fff';
      oc.beginPath();
      geoPath(projection, oc)(land);
      oc.fill();
      const data = oc.getImageData(0, 0, off.width, off.height).data;
      cv.width = Math.ceil(width * dpr);
      cv.height = Math.ceil(height * dpr);
      cv.style.width = `${width}px`;
      cv.style.height = `${height}px`;
      const c = cv.getContext('2d')!;
      c.scale(dpr, dpr);
      const step = Math.max(5, Math.round(width / 150));
      const r = Math.max(0.8, step * 0.16);
      c.fillStyle = 'rgba(183, 192, 202, 0.30)';
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          const i = (Math.floor(y) * off.width + Math.floor(x)) * 4;
          if (data[i + 3] > 128) {
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
      sv.setAttribute('viewBox', `0 0 ${width} ${height}`);
      if (animate) loop();
      else staticRoutes();
    };

    const heavy = COUNTRY_SEEDS.filter((c) => c.level >= 3);
    const route = (a: (typeof COUNTRY_SEEDS)[number], b: (typeof COUNTRY_SEEDS)[number]) => {
      const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 48; i++) {
        const p = projection!(interp(i / 48));
        if (p) pts.push(p as [number, number]);
      }
      // Corta saltos de borda (rota que cruzaria a antimeridiana).
      for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - pts[i - 1][0]) > 200) return null;
      return 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L');
    };

    const mark = (x: number, y: number, cls: string) => {
      const m = document.createElementNS(SVG_NS, 'rect');
      m.setAttribute('x', String(x - 3));
      m.setAttribute('y', String(y - 3));
      m.setAttribute('width', '6');
      m.setAttribute('height', '6');
      m.setAttribute('class', cls);
      sv.appendChild(m);
      return m;
    };

    const one = () => {
      if (!projection) return;
      const a = heavy[Math.floor(Math.random() * heavy.length)];
      let b = heavy[Math.floor(Math.random() * heavy.length)];
      if (a === b) b = heavy[(heavy.indexOf(a) + 5) % heavy.length];
      const d = route(a, b);
      const pa = projection([a.lon, a.lat]);
      const pb = projection([b.lon, b.lat]);
      if (!d || !pa || !pb) return;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'slm-route');
      sv.appendChild(path);
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len} ${len}`;
      const from = mark(pa[0], pa[1], 'slm-route-node');
      const to = mark(pb[0], pb[1], 'slm-route-node slm-route-node--end');
      to.style.opacity = '0';
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '2.6');
      dot.setAttribute('class', 'slm-route-dot');
      sv.appendChild(dot);
      const head = { p: 0 };
      const travel = Math.min(2.6, 0.9 + len / 420);
      const tl = gsap.timeline({
        onComplete: () => {
          live.delete(tl);
          path.remove();
          from.remove();
          to.remove();
          dot.remove();
        },
      });
      tl.fromTo(
        head,
        { p: 0 },
        {
          p: 1,
          duration: travel,
          ease: ease.softInOut,
          onUpdate: () => {
            path.style.strokeDashoffset = String(len * (1 - head.p));
            const pt = path.getPointAtLength(len * head.p);
            dot.setAttribute('cx', String(pt.x));
            dot.setAttribute('cy', String(pt.y));
          },
        },
      )
        // Chegada: o nó de destino entra num corte seco (estado, não animação).
        .set(to, { opacity: 1 })
        .set(dot, { opacity: 0 })
        // Saída com movimento novo: a linha é recolhida a partir da origem, acelerando.
        .fromTo(
          path,
          { strokeDashoffset: 0 },
          { strokeDashoffset: -len, duration: 0.7, ease: ease.accelExit },
          '+=1.4',
        )
        .set(from, { opacity: 0 }, '<0.1')
        .set(to, { opacity: 0 }, '>-0.05');
      live.add(tl);
    };

    const loop = () => {
      one();
      timer = gsap.delayedCall(1.1 + Math.random() * 1.3, loop);
    };

    const staticRoutes = () => {
      if (!projection) return;
      for (let i = 0; i < 3; i++) {
        const a = heavy[(i * 7) % heavy.length];
        const b = heavy[(i * 7 + 11) % heavy.length];
        const d = route(a, b);
        if (!d) continue;
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'slm-route');
        sv.appendChild(path);
      }
    };

    draw().catch(() => {
      /* fundo decorativo: sem mapa, segue sem ele */
    });

    return () => {
      disposed = true;
      timer?.kill();
      live.forEach((tl) => tl.kill());
      live.clear();
      while (sv.firstChild) sv.removeChild(sv.firstChild);
    };
  }, [animate, active]);

  return (
    <div className="slm-world" ref={wrap} aria-hidden="true">
      <canvas ref={canvas} />
      <svg ref={svg} />
    </div>
  );
}
