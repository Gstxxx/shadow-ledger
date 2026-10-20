/**
 * Selo único de Ameaça no mapa: pílula opaca com um alarme pequeno e as horas que faltam ("37h"), presa no canto
 * superior direito do que está no país (a Estação, ou o ponto do país quando o alvo é o Diretor). Nunca cobre a
 * Estação: fica fora da caixa dela. Toque ≥ 44 px. Tudo em unidades de tela (× inv), como os outros marcadores.
 */
export function ThreatBadge({
  x,
  y,
  inv,
  hours,
  anchorPx = 24,
  label,
  onClick,
}: {
  /** centro do que o selo acompanha (Estação ou país) */
  x: number;
  y: number;
  inv: number;
  hours: number;
  /** largura na tela (px) do que fica embaixo; o selo vai para fora dessa caixa */
  anchorPx?: number;
  label?: string;
  onClick?: () => void;
}) {
  const text = `${Math.max(0, Math.ceil(hours))}h`;
  const h = 16;
  const w = 22 + text.length * 6.4;
  // Canto superior direito, fora da caixa: metade da largura para a direita e para cima.
  const bx = x + (anchorPx / 2 + 2) * inv;
  const by = y - (anchorPx / 2 + h / 2) * inv;
  return (
    <g
      className={`threat-badge${onClick ? ' pin' : ''}`}
      transform={`translate(${bx} ${by}) scale(${inv})`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={label ? `${label} · ${text}` : text}
    >
      {onClick && <rect x={w / 2 - 22} y={h / 2 - 22} width={44} height={44} fill="transparent" />}
      <rect x={0} y={0} width={w} height={h} rx={h / 2} fill="#1a0b0d" stroke="var(--red)" strokeWidth={1.2} />
      {/* alarme pequeno: sino com dois traços */}
      <g transform={`translate(${h / 2 + 1} ${h / 2})`} fill="var(--red)">
        <path d="M-3.6 2.4H3.6L2.8 1.2V-1.2A2.8 2.8 0 0 0 -2.8 -1.2V1.2Z" />
        <rect x={-1} y={2.8} width={2} height={1.4} rx={0.7} />
        <path d="M-5.6 -2.6L-4.2 -1.6M5.6 -2.6L4.2 -1.6" stroke="var(--red)" strokeWidth={1} strokeLinecap="round" />
      </g>
      <text x={h + 2} y={h / 2 + 3.6} fontSize={10} fontFamily="var(--mono)" fontWeight={700} fill="#ffb3b5">
        {text}
      </text>
    </g>
  );
}
