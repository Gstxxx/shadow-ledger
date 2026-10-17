// Cargas: caixas de armamento (3/4 isométrico, tampa aberta), papéis e mídia sobre a mesa, programas e agentes perigosos.
import { C, GROUND as G, Shadow, Shine, type Ink } from './kit';

// ── Caixa aberta em 3/4 ─────────────────────────────────────────────
const DX = 74;
const DY = -42;
const X0 = 96;
const X1 = 330;
const TOP = 168;

function Crate({ ink, children, hero }: { ink: Ink; children: (t: number) => JSX.Element; hero?: JSX.Element }) {
  const rows = [0.18, 0.42, 0.66];
  return (
    <g>
      <Shadow ink={ink} cx={250} cy={G + 2} rx={190} ry={14} />
      {/* tampa encostada atrás */}
      <path d={`M${X0 + DX + 6} ${TOP + DY} L${X0 + DX + 20} ${TOP + DY - 96} L${X1 + DX + 24} ${TOP + DY - 100} L${X1 + DX} ${TOP + DY} Z`} fill={ink.u('olive')} />
      {[0.33, 0.66].map((p) => (
        <path key={p} d={`M${X0 + DX + 6 + (X1 - X0) * p} ${TOP + DY} l14 -97`} stroke={C.oliveLo} strokeWidth="3" />
      ))}
      {/* interior */}
      <path d={`M${X0} ${TOP} L${X1} ${TOP} L${X1 + DX} ${TOP + DY} L${X0 + DX} ${TOP + DY} Z`} fill="#141a12" />
      {rows.map((t) => children(t))}
      {/* frente */}
      <rect x={X0} y={TOP} width={X1 - X0} height={G - TOP} fill={ink.u('olive')} />
      {/* lateral */}
      <path d={`M${X1} ${TOP} L${X1 + DX} ${TOP + DY} L${X1 + DX} ${G + DY} L${X1} ${G} Z`} fill={C.oliveLo} />
      {/* ripas, cantoneiras e alças */}
      <path d={`M${X0} ${TOP + 30} L${X1} ${TOP + 30} M${X0} ${TOP + 62} L${X1} ${TOP + 62}`} stroke={C.oliveLo} strokeWidth="2" />
      <rect x={X0} y={TOP} width="10" height={G - TOP} fill="#33392a" />
      <rect x={X1 - 10} y={TOP} width="10" height={G - TOP} fill="#33392a" />
      <rect x={X0 + 90} y={TOP + 38} width="54" height="10" rx="4" fill="#20251b" />
      {/* marcação em estêncil (barras e números, sem texto) */}
      <g fill="#d9d2b8" opacity="0.75">
        <rect x={X0 + 22} y={TOP + 70} width="50" height="10" />
        <rect x={X0 + 80} y={TOP + 70} width="24" height="10" />
        <rect x={X0 + 22} y={TOP + 8} width="36" height="16" />
      </g>
      <rect x={X1 - 70} y={TOP + 66} width="50" height="18" fill="none" stroke="#d9d2b8" strokeOpacity="0.7" strokeWidth="2" />
      <Shine d={`M${X0} ${TOP} L${X1} ${TOP} L${X1 + DX} ${TOP + DY}`} />
      {/* peça de amostra no chão, à frente da caixa: é o que identifica o conteúdo em 96 px */}
      {hero && (
        <g transform="translate(96 270) rotate(-5) scale(1.35)">
          <ellipse cx="96" cy="16" rx="100" ry="6" fill="#000" opacity="0.45" />
          <g stroke="#c9d3dc" strokeOpacity="0.55" strokeWidth="1.2">{hero}</g>
        </g>
      )}
    </g>
  );
}

const at = (t: number, x: number, y: number) => `translate(${X0 + 22 + x + DX * t} ${TOP - 6 + y + DY * t})`;

const RIFLE = 'M0 6 L34 2 L40 0 L112 0 L116 -3 L176 -3 L176 1 L116 1 L112 6 L86 6 Q82 18 74 26 L66 24 Q72 14 72 6 L44 6 L36 12 L0 14 Z';

export const Rifles = ({ ink }: { ink: Ink }) => (
  <Crate ink={ink} hero={<path d={RIFLE} fill="#101316" />}>
    {(t) => (
      <g key={t} transform={at(t, 0, 0)}>
        <path d={RIFLE} fill="#0b0d0f" />
        <path d="M40 0 L112 0" stroke="#5b646d" strokeWidth="1.2" />
        <path d={RIFLE} transform="translate(8 9)" fill="#14171a" />
      </g>
    )}
  </Crate>
);

export const MachineGuns = ({ ink }: { ink: Ink }) => (
  <Crate ink={ink} hero={<g fill="#101316"><path d="M0 8 L30 2 L40 -2 L130 -2 L134 -5 L196 -5 L196 0 L134 0 L130 10 L50 10 L42 16 L0 18 Z" /><path d="M150 0 L140 22 M150 0 L162 22" strokeWidth="3" stroke="#101316" /></g>}>
    {(t) => (
      <g key={t} transform={at(t, 0, -2)}>
        <path d="M0 8 L30 2 L40 -2 L130 -2 L134 -5 L196 -5 L196 0 L134 0 L130 10 L50 10 L42 16 L0 18 Z" fill="#0b0d0f" />
        <rect x="58" y="10" width="28" height="12" fill="#1d2126" />
        <path d="M150 0 L140 22 M150 0 L162 22" stroke="#0b0d0f" strokeWidth="3" />
        <rect x="90" y="-10" width="30" height="8" fill="#1d2126" />
      </g>
    )}
  </Crate>
);

export const Rockets = ({ ink }: { ink: Ink }) => (
  <Crate ink={ink} hero={<g><rect x="0" y="-6" width="150" height="13" rx="5" fill="#2f363c" /><path d="M150 -10 L176 -6 L196 0 L176 6 L150 10 Z" fill="#4a5640" /></g>}>
    {(t) => (
      <g key={t} transform={at(t, 0, -4)}>
        <rect x="0" y="-6" width="150" height="13" rx="5" fill={ink.u('tube')} />
        <path d="M150 -10 L176 -6 L196 0 L176 6 L150 10 Z" fill="#3e4a36" />
        <path d="M150 -10 L176 -6 L196 0" stroke="#a7b38f" strokeOpacity="0.5" fill="none" />
        <rect x="50" y="6" width="12" height="12" fill="#14171a" />
      </g>
    )}
  </Crate>
);

export const Missiles = ({ ink }: { ink: Ink }) => (
  <Crate ink={ink} hero={<g><rect x="0" y="-9" width="190" height="20" rx="9" fill="#3a434c" /><rect x="18" y="-9" width="10" height="20" fill="#f2a93b" /><rect x="160" y="-9" width="10" height="20" fill="#f2a93b" /></g>}>
    {(t) => (
      <g key={t} transform={at(t, 0, -6)}>
        <rect x="0" y="-9" width="190" height="20" rx="9" fill={ink.u('tube')} />
        <rect x="18" y="-9" width="10" height="20" fill={C.amber} opacity="0.85" />
        <rect x="160" y="-9" width="10" height="20" fill={C.amber} opacity="0.85" />
        <ellipse cx="190" cy="1" rx="4" ry="9" fill="#0d1013" />
      </g>
    )}
  </Crate>
);

// ── Papéis e mídia na mesa ───────────────────────────────────────────
const Sheet = ({ ink, x, y, w, h, r = 0, children }: { ink: Ink; x: number; y: number; w: number; h: number; r?: number; children?: JSX.Element | JSX.Element[] }) => (
  <g transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
    <rect x={x + 6} y={y + 8} width={w} height={h} fill="#000" opacity="0.35" />
    <rect x={x} y={y} width={w} height={h} fill={ink.u('paper')} />
    {children}
  </g>
);

const Lines = ({ x, y, w, n, gap = 12, redact = [] as number[] }: { x: number; y: number; w: number; n: number; gap?: number; redact?: number[] }) => (
  <g>
    {Array.from({ length: n }, (_, i) => (
      <rect key={i} x={x} y={y + i * gap} width={w * (0.62 + ((i * 37) % 30) / 100)} height={redact.includes(i) ? 8 : 3} fill={redact.includes(i) ? '#0a0a0a' : '#5c5240'} opacity={redact.includes(i) ? 0.95 : 0.55} />
    ))}
  </g>
);

/** Carimbo de tinta vermelha: anel duplo com estrela (sem palavras). */
const Stamp = ({ x, y, r = 30, rot = -14 }: { x: number; y: number; r?: number; rot?: number }) => (
  <g transform={`rotate(${rot} ${x} ${y})`} fill="none" stroke={C.red} strokeOpacity="0.8">
    <circle cx={x} cy={y} r={r} strokeWidth="4" />
    <circle cx={x} cy={y} r={r * 0.74} strokeWidth="1.5" />
    <path d={`M${x} ${y - r * 0.45} L${x + r * 0.14} ${y - r * 0.12} L${x + r * 0.45} ${y - r * 0.1} L${x + r * 0.2} ${y + r * 0.1} L${x + r * 0.28} ${y + r * 0.42} L${x} ${y + r * 0.24} L${x - r * 0.28} ${y + r * 0.42} L${x - r * 0.2} ${y + r * 0.1} L${x - r * 0.45} ${y - r * 0.1} L${x - r * 0.14} ${y - r * 0.12} Z`} fill={C.red} fillOpacity="0.7" stroke="none" />
  </g>
);

const Clip = ({ x, y }: { x: number; y: number }) => (
  <path d={`M${x} ${y + 26} L${x} ${y - 6} Q${x} ${y - 14} ${x + 8} ${y - 14} Q${x + 16} ${y - 14} ${x + 16} ${y - 6} L${x + 16} ${y + 18}`} stroke="#c3ccd5" strokeWidth="3" fill="none" />
);

export function Intel({ ink }: { ink: Ink }) {
  return (
    <g>
      <g transform="rotate(-6 240 170)">
        <rect x="70" y="56" width="340" height="230" rx="6" fill="#000" opacity="0.4" transform="translate(8 10)" />
        <rect x="70" y="56" width="340" height="230" rx="6" fill="#c9a46a" />
        <path d="M70 70 L120 56 L190 56 L196 70 Z" fill="#b8925a" />
      </g>
      <Sheet ink={ink} x={130} y={70} w={220} h={200} r={-3}>
        <Lines x={150} y={96} w={180} n={11} gap={14} redact={[2, 5, 6, 9]} />
      </Sheet>
      <g transform="rotate(7 330 120)">
        <rect x="282" y="66" width="120" height="90" fill="#f2f2ee" />
        <rect x="290" y="74" width="104" height="74" fill="#46505a" />
        <path d="M290 132 L326 116 L348 124 L394 106 L394 148 L290 148 Z" fill="#20262c" />
        <rect x="318" y="118" width="40" height="16" rx="4" fill="#0e1216" />
        <rect x="290" y="74" width="104" height="74" fill="#c9d3dc" opacity="0.15" />
      </g>
      <Clip x={330} y={62} />
      <Stamp x={196} y={232} />
    </g>
  );
}

export function TechDocs({ ink }: { ink: Ink }) {
  return (
    <g>
      <g transform="rotate(-8 230 170)">
        <rect x="60" y="60" width="330" height="210" fill="#000" opacity="0.4" transform="translate(8 10)" />
        <rect x="60" y="60" width="330" height="210" fill="#1f4a7a" />
        <g stroke="#cfe0f2" strokeOpacity="0.25" strokeWidth="1">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${60 + i * 28} 60 L${60 + i * 28} 270`} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M60 ${60 + i * 28} L390 ${60 + i * 28}`} />
          ))}
        </g>
        {/* desenho técnico de uma turbina em corte */}
        <g stroke="#e6f0fa" strokeWidth="2" fill="none" strokeOpacity="0.85">
          <path d="M110 130 L290 118 L340 140 L340 190 L290 212 L110 200 Z" />
          <ellipse cx="110" cy="165" rx="14" ry="35" />
          {[150, 180, 210, 240].map((x) => (
            <path key={x} d={`M${x} ${127 - (x - 150) * 0.06} L${x} ${203 + (x - 150) * 0.06}`} />
          ))}
          <path d="M120 165 L330 165" strokeDasharray="8 5" />
          <path d="M110 230 L340 230 M110 225 L110 235 M340 225 L340 235" />
        </g>
      </g>
      {/* rolo de plantas e manual */}
      <rect x="300" y="226" width="170" height="30" rx="15" fill={ink.u('tube')} opacity="0.9" transform="rotate(-14 385 241)" />
      <ellipse cx="456" cy="214" rx="8" ry="15" fill="#9fb2c6" transform="rotate(-14 456 214)" />
      <rect x="30" y="200" width="120" height="90" rx="4" fill="#2b3640" transform="rotate(10 90 245)" />
      <rect x="44" y="214" width="60" height="10" fill="#cfd6dd" opacity="0.6" transform="rotate(10 90 245)" />
    </g>
  );
}

export function StateSecret({ ink }: { ink: Ink }) {
  return (
    <g>
      <g transform="rotate(4 240 160)">
        <rect x="90" y="54" width="300" height="220" fill="#000" opacity="0.4" transform="translate(8 10)" />
        <rect x="90" y="54" width="300" height="220" fill="#d8c7a0" />
        <rect x="96" y="60" width="288" height="208" fill="none" stroke={C.red} strokeWidth="10" strokeDasharray="18 12" />
        <rect x="140" y="100" width="200" height="16" fill="#0a0a0a" />
        <rect x="140" y="124" width="150" height="8" fill="#5c5240" opacity="0.5" />
        {/* barbante e lacre */}
        <path d="M90 170 L390 170" stroke="#7a5c3a" strokeWidth="3" />
        <circle cx="240" cy="170" r="30" fill="#8e1e18" />
        <circle cx="240" cy="170" r="22" fill="none" stroke="#c4473c" strokeWidth="3" />
        <circle cx="232" cy="161" r="6" fill="#fff" opacity="0.18" />
      </g>
      {/* lata de microfilme */}
      <circle cx="398" cy="252" r="46" fill={ink.u('hub')} />
      <circle cx="398" cy="252" r="34" fill="none" stroke="#2b3138" strokeWidth="2" />
      <circle cx="398" cy="252" r="8" fill="#20262c" />
      <Stamp x={150} y={228} r={26} rot={12} />
    </g>
  );
}

export function TechPackage({ ink }: { ink: Ink }) {
  return (
    <g>
      {/* maleta rígida aberta: tampa com espuma em cima, base com placas e discos */}
      <rect x="70" y="20" width="340" height="120" rx="14" fill="#1a1f24" />
      <rect x="82" y="30" width="316" height="100" rx="8" fill="#2a3036" />
      <g fill="#3a4148">
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={96 + (i % 10) * 32} cy={44 + Math.floor(i / 10) * 24} r="9" />
        ))}
      </g>
      <rect x="60" y="140" width="360" height="150" rx="14" fill="#15191d" />
      <rect x="72" y="150" width="336" height="128" rx="8" fill="#22282e" />
      <rect x="88" y="162" width="190" height="104" rx="4" fill="#1d4a4a" />
      <g stroke="#b8a46a" strokeWidth="1.4" opacity="0.8" fill="none">
        <path d="M100 180 L150 180 L160 190 L260 190 M100 240 L180 240 L190 228 L260 228 M120 170 L120 256" />
      </g>
      <rect x="160" y="196" width="40" height="40" rx="3" fill="#0f1214" />
      <rect x="166" y="202" width="28" height="28" fill="#2b3036" />
      <circle cx="252" cy="176" r="4" fill={C.amber} />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={296} y={164 + i * 52} width="98" height="42" rx="4" fill={ink.u('steel')} />
          <rect x={304} y={174 + i * 52} width="40" height="6" fill="#1f252b" />
        </g>
      ))}
      <Shine d="M84 142 L406 142" o={0.3} />
    </g>
  );
}

export function SpaceProgram({ ink }: { ink: Ink }) {
  return (
    <g>
      {/* torre de serviço */}
      <g stroke="#2a2420" strokeWidth="3" fill="none">
        <path d="M300 40 L300 262 M340 40 L340 262" />
        {Array.from({ length: 11 }, (_, i) => (
          <path key={i} d={`M300 ${50 + i * 20} L340 ${70 + i * 20} M340 ${50 + i * 20} L300 ${70 + i * 20}`} />
        ))}
        <path d="M262 90 L300 90 M262 150 L300 150" strokeWidth="5" />
      </g>
      {/* foguete iluminado pelos holofotes */}
      <rect x="216" y="70" width="46" height="192" fill={ink.u('tubeV')} />
      <path d="M216 70 Q239 22 262 70 Z" fill="#d7dde3" />
      <rect x="216" y="150" width="46" height="8" fill="#20262c" />
      <path d="M216 230 L196 262 L216 262 Z M262 230 L282 262 L262 262 Z" fill="#9aa4ae" />
      <rect x="216" y="70" width="12" height="192" fill="#fff" opacity="0.15" />
      <rect x="150" y="262" width="180" height="10" fill="#2b2620" />
      {/* holofotes e vapor */}
      <path d="M40 262 L230 90 L250 100 L80 262 Z" fill="#ffe8bf" opacity="0.1" />
      <ellipse cx="240" cy="266" rx="150" ry="14" fill="#d9dee3" opacity="0.25" />
    </g>
  );
}

/** Tambor de aço em pé, com faixa e losango de perigo. */
const Drum = ({ ink, x, y, h = 120, w = 74 }: { ink: Ink; x: number; y: number; h?: number; w?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={ink.u('tubeV')} />
    <ellipse cx={x + w / 2} cy={y} rx={w / 2} ry="10" fill="#7d8792" />
    <ellipse cx={x + w / 2} cy={y} rx={w / 2 - 6} ry="7" fill="#4b545d" />
    {[0.3, 0.7].map((p) => (
      <path key={p} d={`M${x} ${y + h * p} Q${x + w / 2} ${y + h * p + 8} ${x + w} ${y + h * p}`} stroke="#20262c" strokeWidth="3" fill="none" />
    ))}
    <rect x={x + w / 2 - 14} y={y + h * 0.42} width="28" height="28" fill="#e07a1f" transform={`rotate(45 ${x + w / 2} ${y + h * 0.42 + 14})`} />
    <rect x={x + w / 2 - 8} y={y + h * 0.42 + 6} width="16" height="16" fill="#111" opacity="0.8" transform={`rotate(45 ${x + w / 2} ${y + h * 0.42 + 14})`} />
  </g>
);

export function Chemical({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={180} ry={12} />
      <rect x="80" y={G - 18} width="320" height="18" fill={ink.u('wood')} />
      <Drum ink={ink} x={110} y={G - 150} />
      <Drum ink={ink} x={200} y={G - 146} />
      <Drum ink={ink} x={290} y={G - 150} />
      <Drum ink={ink} x={160} y={G - 270} h={110} />
    </g>
  );
}

/** Trevo de risco biológico simplificado (três anéis abertos em volta de um centro). */
const BioMark = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <g fill="none" stroke={C.red} strokeWidth={r * 0.16}>
    {[0, 120, 240].map((a) => (
      <circle key={a} cx={x + Math.cos(((a - 90) * Math.PI) / 180) * r * 0.42} cy={y + Math.sin(((a - 90) * Math.PI) / 180) * r * 0.42} r={r * 0.42} />
    ))}
    <circle cx={x} cy={y} r={r * 0.2} />
  </g>
);

export function Biological({ ink }: { ink: Ink }) {
  return (
    <g>
      <rect x="70" y="40" width="340" height="96" rx="12" fill={ink.u('fleet')} />
      <rect x="82" y="50" width="316" height="76" rx="6" fill="#e1e5e9" />
      <BioMark x={240} y={88} r={34} />
      <rect x="60" y="136" width="360" height="150" rx="12" fill={ink.u('fleet')} />
      <rect x="74" y="148" width="332" height="124" rx="6" fill="#1f2429" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <rect x={98 + i * 44} y={160} width="24" height="96" rx="11" fill="#cfe2ec" opacity="0.35" />
          <rect x={100 + i * 44} y={206} width="20" height="48" rx="9" fill={i % 3 === 1 ? '#c8a23a' : '#6fa58c'} opacity="0.85" />
          <rect x={96 + i * 44} y={152} width="28" height="14" rx="3" fill={i % 2 ? '#c8352c' : '#5b6976'} />
          <rect x={102 + i * 44} y={168} width="5" height="80" fill="#fff" opacity="0.35" />
        </g>
      ))}
    </g>
  );
}

/** Trevo de radiação. */
const RadMark = ({ x, y, r }: { x: number; y: number; r: number }) => {
  const blade = (a: number) => {
    const p = (d: number, rr: number) => `${x + Math.cos(((a + d) * Math.PI) / 180) * rr} ${y + Math.sin(((a + d) * Math.PI) / 180) * rr}`;
    return `M${p(-30, r * 0.24)} L${p(-30, r)} A${r} ${r} 0 0 1 ${p(30, r)} L${p(30, r * 0.24)} A${r * 0.24} ${r * 0.24} 0 0 0 ${p(-30, r * 0.24)} Z`;
  };
  return (
    <g fill="#111">
      {[-90, 30, 150].map((a) => (
        <path key={a} d={blade(a)} />
      ))}
      <circle cx={x} cy={y} r={r * 0.15} />
    </g>
  );
};

export function Nuclear({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={150} ry={14} />
      <rect x="140" y="76" width="200" height={G - 76} fill={ink.u('tubeV')} />
      <ellipse cx="240" cy="76" rx="100" ry="20" fill="#8a949e" />
      <ellipse cx="240" cy="76" rx="70" ry="13" fill="#5d6771" />
      {[110, 190].map((y) => (
        <g key={y}>
          <rect x="136" y={y} width="208" height="14" fill="#2a3138" />
          {[150, 200, 250, 300].map((x) => (
            <circle key={x} cx={x + 14} cy={y + 7} r="3" fill="#8b959f" />
          ))}
        </g>
      ))}
      <rect x="190" y="132" width="100" height="52" rx="4" fill="#f0c419" />
      <RadMark x={240} y={158} r={22} />
      <rect x="140" y="76" width="22" height={G - 76} fill="#fff" opacity="0.12" />
    </g>
  );
}
