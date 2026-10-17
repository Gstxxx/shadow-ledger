// Aeronaves em perfil (nariz para a direita), em voo sobre céu de arquivo; luz de cima-esquerda.
import { C, Shine, type Ink } from './kit';

const Canopy = ({ ink, d }: { ink: Ink; d: string }) => (
  <g>
    <path d={d} fill={ink.u('glass')} />
    <path d={d} fill="none" stroke="#0a0f15" strokeWidth="1" />
  </g>
);

/** Motor em nacele: cilindro com entrada escura e escape. */
const Engine = ({ ink, x, y, len, r }: { ink: Ink; x: number; y: number; len: number; r: number }) => (
  <g>
    <rect x={x} y={y - r} width={len} height={r * 2} rx={r} fill={ink.u('tube')} />
    <ellipse cx={x + len - 2} cy={y} rx={r * 0.35} ry={r * 0.9} fill="#0b0f13" />
    <rect x={x - 8} y={y - r * 0.6} width="10" height={r * 1.2} fill="#2a3138" />
  </g>
);

/** Rotor girando: disco translúcido (borrão de movimento) com uma pá nítida. */
const Rotor = ({ cx, cy, rx }: { cx: number; cy: number; rx: number }) => (
  <g>
    <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.05} fill="#1a1f24" opacity="0.28" />
    <rect x={cx - rx * 0.9} y={cy - 1.5} width={rx * 1.3} height="3" fill="#15191d" opacity="0.8" />
    <rect x={cx - 5} y={cy} width="10" height="16" fill="#1f252b" />
  </g>
);

export function HeliUtility({ ink }: { ink: Ink }) {
  return (
    <g>
      <path d="M252 132 L60 150 L60 162 L250 178 Z" fill={ink.u('olive')} />
      <path d="M48 116 L74 116 L82 162 L60 162 Z" fill={ink.u('olive')} />
      <circle cx="58" cy="140" r="26" fill="#1a1f24" opacity="0.25" />
      <path d="M170 120 Q184 96 240 94 L330 94 Q392 98 414 138 Q420 168 392 190 L232 196 Q186 194 176 172 Z" fill={ink.u('olive')} />
      <Canopy ink={ink} d="M340 104 Q384 108 404 138 L404 152 L350 152 Z" />
      <rect x="250" y="118" width="70" height="58" rx="3" fill="#2f3727" stroke="#1d2218" />
      <rect x="262" y="126" width="22" height="18" fill={ink.u('glass')} />
      <rect x="290" y="126" width="22" height="18" fill={ink.u('glass')} />
      <path d="M262 150 L250 200" stroke="#14181c" strokeWidth="5" />
      <rect x="214" y="78" width="90" height="18" rx="8" fill={ink.u('olive')} />
      <Rotor cx={262} cy={74} rx={210} />
      <path d="M200 208 L390 208" stroke="#14181c" strokeWidth="5" strokeLinecap="round" />
      <path d="M240 194 L230 208 M350 194 L360 208" stroke="#14181c" strokeWidth="4" />
      <Shine d="M178 118 Q190 98 240 96 L330 96 Q380 100 404 128" />
    </g>
  );
}

export function HeliAttack({ ink }: { ink: Ink }) {
  return (
    <g>
      <path d="M240 140 L60 152 L58 162 L240 170 Z" fill={ink.u('steel')} />
      <path d="M44 120 L70 118 L78 162 L56 162 Z" fill={ink.u('steel')} />
      <circle cx="54" cy="146" r="22" fill="#1a1f24" opacity="0.25" />
      {/* fuselagem estreita, cabines em tandem */}
      <path d="M180 132 Q200 112 262 110 L360 116 Q412 124 430 150 Q424 168 394 172 L250 176 Q200 172 186 156 Z" fill={ink.u('steel')} />
      <Canopy ink={ink} d="M300 112 Q330 98 352 112 L352 126 L300 126 Z" />
      <Canopy ink={ink} d="M356 116 Q392 108 412 132 L410 140 L356 136 Z" />
      {/* asa curta com casulos de foguetes e mísseis */}
      <rect x="236" y="160" width="74" height="8" rx="3" fill="#2e353c" />
      <rect x="240" y="168" width="34" height="16" rx="7" fill={ink.u('tube')} />
      <rect x="280" y="170" width="44" height="6" rx="3" fill="#3a434c" />
      <rect x="280" y="178" width="44" height="6" rx="3" fill="#3a434c" />
      {/* canhão sob o queixo */}
      <rect x="392" y="172" width="40" height="5" fill="#15191d" />
      <rect x="236" y="96" width="70" height="16" rx="7" fill={ink.u('steel')} />
      <Rotor cx={270} cy={92} rx={200} />
      <path d="M232 176 L226 198 M370 172 L374 198" stroke="#14181c" strokeWidth="4" />
      <Shine d="M186 130 Q204 114 262 112 L360 118 Q404 126 424 146" />
    </g>
  );
}

/** Caça em perfil: fuselagem, deriva, asa (vista de raspão), tanques sob a asa. */
function Fighter({ ink, tone, stealth, tanks, twin }: { ink: Ink; tone: string; stealth?: boolean; tanks?: boolean; twin?: boolean }) {
  const body = stealth
    ? 'M60 162 L120 150 L250 136 L360 136 L452 158 L360 172 L250 178 L120 176 Z'
    : 'M60 160 L110 150 L250 140 Q300 132 360 138 Q420 146 456 160 Q420 170 360 174 L250 176 L110 172 Z';
  return (
    <g>
      {twin && <path d="M82 152 L108 98 L132 98 L144 150 Z" fill={tone} opacity="0.6" />}
      <path d={stealth ? 'M70 154 L96 92 L124 94 L138 152 Z' : 'M64 154 L92 88 L118 90 L132 152 Z'} fill={ink.u(tone === C.steel ? 'steel' : 'dark')} />
      <path d={body} fill={ink.u(tone === C.steel ? 'steel' : 'dark')} />
      {/* asa vista de raspão, um pouco abaixo do eixo */}
      <path d={stealth ? 'M150 166 L250 164 L300 176 L140 180 Z' : 'M160 164 L270 162 L300 172 L150 176 Z'} fill="#1a2027" opacity="0.85" />
      <Canopy ink={ink} d={stealth ? 'M330 138 Q356 124 392 138 L392 144 L330 142 Z' : 'M318 140 Q348 120 392 138 L394 146 L318 146 Z'} />
      <rect x="230" y="150" width="40" height="10" rx="3" fill="#0e1217" />
      <ellipse cx="62" cy="161" rx="6" ry="9" fill="#0b0e11" />
      {!stealth && <ellipse cx="56" cy="161" rx="10" ry="6" fill={C.amber} opacity="0.6" />}
      {tanks && <rect x="190" y="180" width="70" height="12" rx="6" fill={ink.u('tube')} />}
      {tanks && <rect x="290" y="180" width="54" height="5" rx="2.5" fill="#3a434c" />}
      <Shine d={stealth ? 'M122 150 L250 137 L360 137 L448 157' : 'M112 151 L250 141 Q300 133 360 139 Q416 146 450 158'} />
    </g>
  );
}

export const JetLight = ({ ink }: { ink: Ink }) => <Fighter ink={ink} tone={C.steel} />;
export const JetMulti = ({ ink }: { ink: Ink }) => <Fighter ink={ink} tone={C.steel} tanks twin />;
export const JetStealth = ({ ink }: { ink: Ink }) => <Fighter ink={ink} tone={C.ink} stealth twin />;

export function Bomber({ ink }: { ink: Ink }) {
  return (
    <g>
      <path d="M42 150 L74 76 L104 78 L120 148 Z" fill={ink.u('steel')} />
      <path d="M40 158 L90 148 L300 140 Q380 140 444 156 Q460 162 444 168 Q380 178 300 178 L90 172 Z" fill={ink.u('steel')} />
      <path d="M150 168 L330 164 L380 184 L140 186 Z" fill="#1e252c" opacity="0.85" />
      <Canopy ink={ink} d="M392 144 Q420 138 446 154 L392 156 Z" />
      <rect x="196" y="176" width="110" height="20" rx="10" fill={ink.u('tube')} />
      <ellipse cx="304" cy="186" rx="4" ry="8" fill="#0b0e11" />
      <rect x="150" y="170" width="70" height="6" fill="#20262c" />
      <Shine d="M92 149 L300 141 Q376 141 440 155" />
    </g>
  );
}

/** Cargueiro: fuselagem longa, asa alta ou baixa, motores, empenagem em T opcional. */
function Freighter({
  ink,
  len,
  high,
  props,
  engines,
  tTail,
  thick,
}: {
  ink: Ink;
  len: number;
  high?: boolean;
  props?: boolean;
  engines: number;
  tTail?: boolean;
  thick: number;
}) {
  const x0 = 240 - len / 2;
  const x1 = 240 + len / 2;
  const top = 160 - thick / 2;
  const bot = 160 + thick / 2;
  const wingY = high ? top + 4 : bot - 8;
  return (
    <g>
      <path d={`M${x0 + 10} ${top + 8} L${x0 + 34} ${top - 50} L${x0 + 66} ${top - 50} L${x0 + 84} ${top + 4} Z`} fill={ink.u('fleet')} />
      {tTail && <rect x={x0 + 18} y={top - 56} width="70" height="8" rx="3" fill={C.fleet} />}
      <path
        d={`M${x0} ${top + 10} Q${x0 + 40} ${top} ${x0 + 90} ${top} L${x1 - 50} ${top} Q${x1} ${top + 2} ${x1 + 10} ${160} Q${x1} ${bot} ${x1 - 50} ${bot} L${x0 + 90} ${bot} Q${x0 + 30} ${bot} ${x0} ${top + 18} Z`}
        fill={ink.u('fleet')}
      />
      <path d={`M${x0 + 90} ${bot - 6} L${x1 - 60} ${bot - 6}`} stroke={C.fleetLo} strokeWidth="2" opacity="0.6" />
      <Canopy ink={ink} d={`M${x1 - 30} ${top + 6} Q${x1 - 6} ${top + 8} ${x1 + 2} ${top + 20} L${x1 - 30} ${top + 20} Z`} />
      <path d={`M${x0 + len * 0.36} ${wingY} L${x0 + len * 0.62} ${wingY - 2} L${x0 + len * 0.68} ${wingY + 8} L${x0 + len * 0.32} ${wingY + 10} Z`} fill="#4d5762" opacity="0.9" />
      {Array.from({ length: engines }, (_, i) => {
        const ex = x0 + len * (0.4 + i * (0.2 / Math.max(1, engines - 1))) - (engines > 2 ? 12 : 0);
        const ey = high ? wingY + 18 + (i % 2) * 4 : wingY + 20;
        return props ? (
          <g key={i}>
            <rect x={ex} y={ey - 9} width="46" height="18" rx="8" fill={ink.u('tube')} />
            <ellipse cx={ex + 50} cy={ey} rx="3" ry="30" fill="#1a1f24" opacity="0.3" />
          </g>
        ) : (
          <Engine key={i} ink={ink} x={ex} y={ey} len={thick * 0.95} r={thick * 0.22} />
        );
      })}
      {high && <path d={`M${x0 + 70} ${bot} L${x0 + 110} ${bot + 8} L${x0 + 150} ${bot}`} fill="#9aa4ae" />}
      <Shine d={`M${x0 + 30} ${top + 4} Q${x0 + 60} ${top} ${x0 + 90} ${top + 1} L${x1 - 50} ${top + 1} Q${x1 - 6} ${top + 4} ${x1 + 6} ${158}`} />
    </g>
  );
}

export const CargoProp = ({ ink }: { ink: Ink }) => <Freighter ink={ink} len={330} high props engines={2} thick={44} />;
export const CargoJet = ({ ink }: { ink: Ink }) => <Freighter ink={ink} len={360} high tTail engines={2} thick={46} />;
export const CargoWide = ({ ink }: { ink: Ink }) => <Freighter ink={ink} len={400} engines={2} thick={56} />;
export const CargoStrategic = ({ ink }: { ink: Ink }) => <Freighter ink={ink} len={420} high tTail engines={4} thick={64} />;
