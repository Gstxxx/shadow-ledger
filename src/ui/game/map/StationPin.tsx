import type { StationLevel } from '../../../game/types';

/**
 * Estação no mapa: placa de metal com bisel e o desenho do Nível (Célula = porta, Casa Segura = casa,
 * Escritório = prédio, Complexo = conjunto murado, Base = pista com antena), na cor da agência.
 * Interditada leva faixa vermelha com cadeado; sob Ameaça, um anel vermelho pulsa (CSS, reduced-motion respeitado).
 * Desenho em unidades de tela (×inv), como os outros marcadores do mapa.
 */
const GLYPH: Record<StationLevel, string> = {
  // porta com batente e maçaneta
  1: 'M-3.2 5.2V-4.6Q-3.2-5.6-2.2-5.6H2.2Q3.2-5.6 3.2-4.6V5.2ZM-1.8 4V-4.2H1.8V4Z',
  // casa: telhado, paredes e porta
  2: 'M-6 0.2L0-5.6L6 0.2H4.4V5.2H-4.4V0.2ZM-1.3 5.2V1.6H1.3V5.2Z',
  // prédio alto com janelas
  3: 'M-3.6 5.4V-5.6H3.6V5.4ZM-2.2-4.2V-2.8H-0.6V-4.2ZM0.6-4.2V-2.8H2.2V-4.2ZM-2.2-1.6V-0.2H-0.6V-1.6ZM0.6-1.6V-0.2H2.2V-1.6ZM-2.2 1V2.4H-0.6V1ZM0.6 1V2.4H2.2V1Z',
  // muro com dois blocos dentro
  4: 'M-6-5.4H6V5.4H-6ZM-4.6-4V4H4.6V-4ZM-3.4-2.6V0.8H-0.6V-2.6ZM0.8-1.2V2.8H3.4V-1.2Z',
  // pista inclinada e antena
  5: 'M-6.2 5L-1.8 0.6L-0.6 1.8L-5 6.2ZM2.6 5.4V-2.4H3.6V5.4ZM3.1-5.8A1.7 1.7 0 1 1 3.09-5.8ZM0.2-0.6A3.4 3.4 0 0 1 6-0.6L5.2-0.1A2.5 2.5 0 0 0 1-0.1Z',
};

export function StationPin({
  x,
  y,
  inv,
  level,
  color,
  interdicted,
  threatened,
  scale = 1.3,
  label,
  onClick,
}: {
  x: number;
  y: number;
  inv: number;
  level: StationLevel;
  color: string;
  interdicted?: boolean;
  threatened?: boolean;
  scale?: number;
  label?: string;
  onClick?: () => void;
}) {
  const s = inv * scale;
  return (
    <g className={`stpin${onClick ? ' pin' : ''}`} transform={`translate(${x} ${y}) scale(${s})`} onClick={onClick} role={onClick ? 'button' : undefined} aria-label={label}>
      {label ? <title>{label}</title> : null}
      {/* área de toque ≥ 44 px */}
      {onClick && <circle r={22 / scale} fill="transparent" />}
      {threatened && <circle className="stpin-pulse" r={11} fill="none" stroke="var(--red)" strokeWidth={1.6} />}
      {/* brilho na cor da agência */}
      <circle r={11.5} fill={color} opacity={0.16} />
      {/* placa: aro de metal com bisel e face escura */}
      <rect x={-9} y={-9} width={18} height={18} rx={3} fill="url(#stpin-metal)" stroke="#07090b" strokeWidth={0.8} />
      <rect x={-7.4} y={-7.4} width={14.8} height={14.8} rx={2} fill="url(#stpin-face)" stroke={color} strokeWidth={0.9} />
      <path d="M-6.6-6.9H6.6" stroke="rgba(255,255,255,0.28)" strokeWidth={0.6} />
      <path d={GLYPH[level]} fill={color} fillRule="evenodd" />
      {interdicted && (
        <g>
          <path d="M-9 5L5-9H9V-5L-5 9H-9Z" fill="var(--red)" opacity={0.85} />
          <g transform="translate(6.5 6.5)">
            <rect x={-3.4} y={-1.6} width={6.8} height={5} rx={0.8} fill="var(--red)" stroke="#07090b" strokeWidth={0.6} />
            <path d="M-2-1.6V-3A2 2 0 0 1 2-3V-1.6" fill="none" stroke="var(--red)" strokeWidth={1.1} />
          </g>
        </g>
      )}
    </g>
  );
}

/** Gradientes da placa; uma vez por mapa, dentro de <defs>. */
export function StationPinDefs() {
  return (
    <>
      <linearGradient id="stpin-metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d9dde2" />
        <stop offset="45%" stopColor="#8b929b" />
        <stop offset="100%" stopColor="#3a4048" />
      </linearGradient>
      <linearGradient id="stpin-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1c2129" />
        <stop offset="100%" stopColor="#0c0f13" />
      </linearGradient>
    </>
  );
}
