// Generated world art: land shapes from world-atlas, projected with d3-geo. No downloaded images.
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import landTopo from 'world-atlas/land-110m.json';
import { COUNTRY_SEEDS } from '../../game/data/countries';

let landCache: GeoPermissibleObjects | null = null;
export function land(): GeoPermissibleObjects {
  if (!landCache) {
    const topo = landTopo as unknown as Topology;
    landCache = feature(topo, topo.objects.land) as unknown as GeoPermissibleObjects;
  }
  return landCache;
}

function dotPattern(ctx: CanvasRenderingContext2D, color: string, step: number, r: number): CanvasPattern | null {
  const c = document.createElement('canvas');
  c.width = c.height = step;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = color;
  g.beginPath();
  g.arc(step / 2, step / 2, r, 0, Math.PI * 2);
  g.fill();
  return ctx.createPattern(c, 'repeat');
}

interface Lane {
  a: [number, number];
  b: [number, number];
  t0: number;
  dur: number;
  hostile: boolean;
}

const caps = COUNTRY_SEEDS.map((c) => [c.lon, c.lat] as [number, number]);

/** Animated dotted globe with trade lanes; returns a stop function. */
export function runGlobe(canvas: HTMLCanvasElement, opts: { reduced: boolean }): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let raf = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let pattern: CanvasPattern | null = null;
  const lanes: Lane[] = [];
  const start = performance.now();

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pattern = dotPattern(ctx, 'rgba(233,228,216,0.55)', Math.max(4, Math.round(Math.min(w, h) / 150)), 0.9);
  };
  resize();
  window.addEventListener('resize', resize);

  const spawn = (now: number) => {
    const a = caps[Math.floor(Math.random() * caps.length)];
    let b = caps[Math.floor(Math.random() * caps.length)];
    if (a === b) b = caps[(caps.indexOf(a) + 7) % caps.length];
    lanes.push({ a, b, t0: now, dur: 3200 + Math.random() * 2600, hostile: Math.random() < 0.18 });
  };

  const frame = (now: number) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    const R = Math.max(h * 0.78, w * 0.42);
    const cx = w / 2;
    const cy = h + R * 0.42;
    const proj = geoOrthographic()
      .scale(R)
      .translate([cx, cy])
      .rotate([opts.reduced ? 20 : 20 - t * 2.2, -28, 0])
      .clipAngle(90);
    const path = geoPath(proj, ctx);

    // Atmosphere: light comes from above the horizon.
    const glow = ctx.createRadialGradient(cx, cy - R * 0.9, R * 0.1, cx, cy, R * 1.25);
    glow.addColorStop(0, 'rgba(242,169,59,0.07)');
    glow.addColorStop(0.55, 'rgba(108,156,240,0.035)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Sphere body.
    ctx.beginPath();
    path({ type: 'Sphere' });
    const body = ctx.createLinearGradient(0, cy - R, 0, cy);
    body.addColorStop(0, '#13161b');
    body.addColorStop(1, '#07080a');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,228,216,0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Graticule.
    ctx.beginPath();
    path(geoGraticule10());
    ctx.strokeStyle = 'rgba(233,228,216,0.035)';
    ctx.stroke();

    // Land as halftone dots.
    ctx.save();
    ctx.beginPath();
    path(land());
    ctx.clip();
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
    ctx.beginPath();
    path(land());
    ctx.strokeStyle = 'rgba(233,228,216,0.10)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Trade lanes.
    if (!opts.reduced && (lanes.length < 5 || Math.random() < 0.004)) spawn(now);
    for (let i = lanes.length - 1; i >= 0; i--) {
      const L = lanes[i];
      const p = (now - L.t0) / L.dur;
      if (p >= 1.35) {
        lanes.splice(i, 1);
        continue;
      }
      const interp = geoInterpolate(L.a, L.b);
      const head = Math.min(1, p);
      const tail = Math.max(0, p - 0.45);
      const pts: [number, number][] = [];
      for (let k = 0; k <= 24; k++) pts.push(interp(tail + ((head - tail) * k) / 24));
      ctx.beginPath();
      path({ type: 'LineString', coordinates: pts });
      ctx.strokeStyle = L.hostile ? 'rgba(229,72,77,0.55)' : 'rgba(242,169,59,0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const hp = proj(interp(head));
      if (hp && p < 1) {
        ctx.beginPath();
        ctx.arc(hp[0], hp[1], 2.2, 0, Math.PI * 2);
        ctx.fillStyle = L.hostile ? '#e5484d' : '#f2a93b';
        ctx.fill();
      }
      if (p >= 1) {
        const bp = proj(L.b);
        if (bp) {
          const q = (p - 1) / 0.35;
          ctx.beginPath();
          ctx.arc(bp[0], bp[1], 2 + q * 14, 0, Math.PI * 2);
          ctx.strokeStyle = L.hostile ? `rgba(229,72,77,${0.6 * (1 - q)})` : `rgba(242,169,59,${0.6 * (1 - q)})`;
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}
