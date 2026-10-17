import { useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { useT } from '../../../i18n';
import { formatDate } from '../../../game/state';
import './price-chart.css';

export interface PricePoint {
  /** horas de jogo */
  t: number;
  buy: number;
  sell: number;
}
export interface PriceMark {
  t: number;
  kind: string;
  text: string;
}

/**
 * Gráfico de linha do preço (dataviz): Compra e Venda no tempo, média mundial tracejada, o que você pagou
 * como linha horizontal, "hoje" no fim e marcadores de eventos (guerra, sanção, suas compras/vendas).
 * Crosshair com tooltip ao passar/tocar. SVG próprio, ≈120 px de altura.
 */
export function PriceChart({
  points,
  world,
  paid,
  marks = [],
  labels,
}: {
  points: PricePoint[];
  world?: number;
  paid?: number;
  marks?: PriceMark[];
  labels: { buy: string; sell: string; world: string; paid: string; today: string };
}) {
  const { fmt } = useT();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(200, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (points.length < 2) return null;

  const H = 120;
  const padL = 4;
  const padR = 84; // espaço para os rótulos diretos no fim das linhas
  const padT = 14;
  const padB = 18;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const vals = points.flatMap((p) => [p.buy, p.sell].filter((v) => v > 0));
  if (world) vals.push(world);
  if (paid) vals.push(paid);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || hi * 0.05 || 1;
  lo -= pad;
  hi += pad;
  const x = (t: number) => padL + ((t - t0) / (t1 - t0 || 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
  const path = (k: 'buy' | 'sell') =>
    points
      .filter((p) => p[k] > 0)
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`)
      .join(' ');
  const last = points[points.length - 1];

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * w;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].t) - px) < Math.abs(x(points[best].t) - px)) best = i;
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;
  const near = hp ? marks.filter((m) => Math.abs(m.t - hp.t) <= (t1 - t0) / points.length) : [];

  return (
    <div className="pchart" ref={box}>
      <ul className="pchart-legend" aria-hidden>
        <li>
          <i className="sw buy" /> {labels.buy}
        </li>
        <li>
          <i className="sw sell" /> {labels.sell}
        </li>
        {world ? (
          <li>
            <i className="sw world" /> {labels.world}
          </li>
        ) : null}
        {paid ? (
          <li>
            <i className="sw paid" /> {labels.paid}
          </li>
        ) : null}
      </ul>
      <svg
        className="pchart-svg"
        width={w}
        height={H}
        viewBox={`0 0 ${w} ${H}`}
        role="img"
        aria-label={`${labels.buy} ${fmt.money(last.buy)} · ${labels.sell} ${fmt.money(last.sell)}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* grade recessiva: 3 linhas */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="grid" x1={padL} x2={w - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} />
        ))}
        {world ? <line className="ref world" x1={padL} x2={w - padR} y1={y(world)} y2={y(world)} /> : null}
        {paid ? <line className="ref paid" x1={padL} x2={w - padR} y1={y(paid)} y2={y(paid)} /> : null}
        <path className="ln buy" d={path('buy')} />
        <path className="ln sell" d={path('sell')} />
        {/* marcadores de eventos no topo */}
        {marks.map((m, i) => (
          <g key={i} className={`mk mk-${m.kind}`} transform={`translate(${x(m.t)} ${padT - 7})`}>
            <path d="M-4,-4 L4,-4 L0,3 Z" />
            <title>{`${formatDate(m.t)} · ${m.text}`}</title>
          </g>
        ))}
        {/* hoje */}
        <line className="today" x1={x(last.t)} x2={x(last.t)} y1={padT} y2={H - padB} />
        <text className="axis" x={x(last.t)} y={H - 4} textAnchor="end">
          {labels.today}
        </text>
        <text className="axis" x={padL} y={H - 4}>
          {formatDate(t0)}
        </text>
        {/* rótulos diretos no fim das linhas (texto em tinta neutra; a cor fica na marca) */}
        {last.buy > 0 && (
          <g transform={`translate(${x(last.t) + 6} ${y(last.buy)})`}>
            <circle className="dot buy" r={4} cx={-6} />
            <text className="lbl" dy={4}>
              {fmt.money(last.buy)}
            </text>
          </g>
        )}
        {last.sell > 0 && (
          <g transform={`translate(${x(last.t) + 6} ${y(last.sell)})`}>
            <circle className="dot sell" r={4} cx={-6} />
            <text className="lbl" dy={4}>
              {fmt.money(last.sell)}
            </text>
          </g>
        )}
        {hp && (
          <g className="cross">
            <line x1={x(hp.t)} x2={x(hp.t)} y1={padT} y2={H - padB} />
            {hp.buy > 0 && <circle className="dot buy" cx={x(hp.t)} cy={y(hp.buy)} r={4} />}
            {hp.sell > 0 && <circle className="dot sell" cx={x(hp.t)} cy={y(hp.sell)} r={4} />}
          </g>
        )}
      </svg>
      {hp && (
        <div className="pchart-tip" style={{ left: Math.min(Math.max(0, x(hp.t) - 70), w - 150) }} role="status">
          <b>{formatDate(hp.t)}</b>
          <span>
            <i className="sw buy" /> {labels.buy} <span className="num">{fmt.money(hp.buy)}</span>
          </span>
          <span>
            <i className="sw sell" /> {labels.sell} <span className="num">{fmt.money(hp.sell)}</span>
          </span>
          {near.map((m, i) => (
            <span key={i} className="tip-mk">
              ▼ {m.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
