// Veículos terrestres e antiaéreos em perfil técnico (lado esquerdo, frente para a direita), luz de cima-esquerda.
import { Barrel, C, GROUND as G, Shadow, Shine, Track, Wheel, type Ink } from './kit';

const Glass = ({ ink, d }: { ink: Ink; d: string }) => (
  <g>
    <path d={d} fill={ink.u('glass')} />
    <path d={d} fill="none" stroke="#0a0f15" strokeWidth="1.2" />
  </g>
);

export function PatrolCar({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={190} />
      <path d={`M58 ${G - 22} L60 ${G - 52} Q64 ${G - 64} 92 ${G - 68} L152 ${G - 74} L196 ${G - 112} Q206 ${G - 120} 228 ${G - 120} L318 ${G - 120} Q336 ${G - 120} 350 ${G - 108} L384 ${G - 76} L418 ${G - 70} Q438 ${G - 66} 440 ${G - 46} L442 ${G - 24} Q440 ${G - 14} 428 ${G - 14} L62 ${G - 14} Q56 ${G - 16} 58 ${G - 22} Z`} fill={ink.u('dark')} />
      <path d={`M60 ${G - 50} L440 ${G - 46} L440 ${G - 36} L60 ${G - 40} Z`} fill={C.fleet} opacity="0.9" />
      <Glass ink={ink} d={`M204 ${G - 108} Q210 ${G - 114} 228 ${G - 114} L268 ${G - 114} L268 ${G - 78} L166 ${G - 76} Z`} />
      <Glass ink={ink} d={`M276 ${G - 114} L318 ${G - 114} Q332 ${G - 114} 342 ${G - 104} L372 ${G - 78} L276 ${G - 78} Z`} />
      <rect x="236" y={G - 132} width="64" height="10" rx="3" fill="#1b2026" />
      <rect x="238" y={G - 131} width="29" height="7" rx="2" fill="#d6332a" />
      <rect x="269" y={G - 131} width="29" height="7" rx="2" fill="#2f6fe0" />
      <rect x="424" y={G - 60} width="14" height="9" rx="2" fill="#fff4d6" />
      <rect x="60" y={G - 60} width="8" height="9" rx="2" fill="#b3261e" />
      <Shine d={`M98 ${G - 66} L152 ${G - 72} L198 ${G - 110} Q208 ${G - 118} 228 ${G - 118} L318 ${G - 118}`} />
      <path d={`M272 ${G - 76} L272 ${G - 26}`} stroke="#05080b" strokeWidth="1.5" />
      <path d={`M168 ${G - 74} L168 ${G - 26}`} stroke="#05080b" strokeWidth="1.5" />
      <Wheel ink={ink} cx={128} cy={G - 26} r={30} />
      <Wheel ink={ink} cx={366} cy={G - 26} r={30} />
    </g>
  );
}

export function Technical({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={185} />
      {/* caçamba */}
      <path d={`M56 ${G - 34} L58 ${G - 92} L232 ${G - 92} L232 ${G - 34} Z`} fill={ink.u('sand')} />
      <path d={`M58 ${G - 92} L232 ${G - 92} L232 ${G - 86} L58 ${G - 86} Z`} fill={C.sandHi} />
      {/* cabine */}
      <path d={`M232 ${G - 34} L232 ${G - 132} Q234 ${G - 142} 248 ${G - 142} L320 ${G - 142} Q332 ${G - 140} 340 ${G - 128} L362 ${G - 96} L420 ${G - 88} Q438 ${G - 84} 438 ${G - 64} L438 ${G - 34} Z`} fill={ink.u('sand')} />
      <Glass ink={ink} d={`M246 ${G - 134} L314 ${G - 134} Q324 ${G - 132} 330 ${G - 122} L350 ${G - 98} L246 ${G - 98} Z`} />
      <rect x="420" y={G - 80} width="16" height="8" rx="2" fill="#fff1c9" />
      <path d={`M232 ${G - 34} L438 ${G - 34}`} stroke={C.sandLo} strokeWidth="3" />
      <Shine d={`M248 ${G - 140} L320 ${G - 140} Q330 ${G - 138} 338 ${G - 126}`} />
      {/* metralhadora pesada no pedestal com escudo */}
      <rect x="128" y={G - 156} width="10" height="66" fill="#20262c" />
      <path d={`M112 ${G - 182} L152 ${G - 182} L156 ${G - 146} L108 ${G - 146} Z`} fill={ink.u('steel')} />
      <Barrel ink={ink} x={148} y={G - 168} len={104} r={4} angle={-8} />
      <rect x="96" y={G - 176} width="56" height="16" rx="3" fill="#2a3138" />
      <rect x="138" y={G - 162} width="16" height="16" fill="#3b4148" />
      <Wheel ink={ink} cx={122} cy={G - 28} r={30} />
      <Wheel ink={ink} cx={370} cy={G - 28} r={30} />
    </g>
  );
}

/** Casco blindado com frente inclinada (APC/IFV/tanques), em oliva. */
const hull = (x0: number, x1: number, top: number, bottom: number, nose = 40) =>
  `M${x0} ${bottom} L${x0 + 6} ${top + 10} L${x0 + 20} ${top} L${x1 - nose} ${top} L${x1} ${top + 26} L${x1 - 8} ${bottom} Z`;

export function Apc({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={200} />
      <path d={hull(48, 440, G - 132, G - 40, 64)} fill={ink.u('olive')} />
      <path d={`M68 ${G - 132} L376 ${G - 132} L384 ${G - 126} L62 ${G - 126} Z`} fill={C.oliveHi} />
      {[120, 210, 300].map((x) => (
        <rect key={x} x={x} y={G - 116} width="34" height="22" rx="2" fill="#323a2b" stroke="#1c2117" />
      ))}
      <rect x="300" y={G - 108} width="26" height="6" fill={ink.u('glass')} />
      {/* torre pequena com metralhadora */}
      <path d={`M200 ${G - 132} L208 ${G - 160} L270 ${G - 160} L282 ${G - 132} Z`} fill={ink.u('olive')} />
      <Barrel ink={ink} x={270} y={G - 150} len={80} r={3.6} />
      <rect x="96" y={G - 140} width="40" height="8" rx="2" fill="#2f3627" />
      <Shine d={`M70 ${G - 131} L374 ${G - 131} L438 ${G - 106}`} />
      {[104, 244, 384].map((x) => (
        <Wheel key={x} ink={ink} cx={x} cy={G - 30} r={30} />
      ))}
    </g>
  );
}

export function Ifv({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={205} />
      <Track ink={ink} x={52} y={G - 52} w={374} h={52} n={6} />
      <path d={hull(46, 446, G - 128, G - 50, 70)} fill={ink.u('olive')} />
      <path d={`M66 ${G - 128} L376 ${G - 128} L384 ${G - 122} L60 ${G - 122} Z`} fill={C.oliveHi} />
      {/* torre com canhão automático e lançador de mísseis */}
      <path d={`M170 ${G - 128} L180 ${G - 166} L292 ${G - 166} L312 ${G - 128} Z`} fill={ink.u('olive')} />
      <Barrel ink={ink} x={300} y={G - 150} len={128} r={4.2} />
      <rect x="196" y={G - 196} width="74" height="24" rx="3" fill={ink.u('olive')} stroke={C.oliveLo} />
      <circle cx="262" cy={G - 184} r="7" fill="#1a1f17" />
      <circle cx="240" cy={G - 184} r="7" fill="#1a1f17" />
      <rect x="182" y={G - 160} width="22" height="12" fill={ink.u('glass')} />
      <Shine d={`M68 ${G - 127} L374 ${G - 127} L444 ${G - 100}`} />
      <Shine d={`M182 ${G - 165} L290 ${G - 165}`} o={0.35} />
    </g>
  );
}

export function TankClassic({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={230} rx={210} />
      <Track ink={ink} x={50} y={G - 56} w={360} h={56} n={5} />
      <path d={hull(40, 420, G - 106, G - 54, 46)} fill={ink.u('olive')} />
      {/* torre fundida arredondada */}
      <path d={`M150 ${G - 106} Q156 ${G - 162} 232 ${G - 166} Q292 ${G - 166} 306 ${G - 106} Z`} fill={ink.u('olive')} />
      <Barrel ink={ink} x={290} y={G - 132} len={170} r={5.4} />
      <rect x="360" y={G - 139} width="22" height="14" rx="6" fill={ink.u('tube')} />
      {/* tambores na traseira */}
      <rect x="44" y={G - 128} width="40" height="22" rx="6" fill={ink.u('tube')} />
      <rect x="196" y={G - 178} width="38" height="12" rx="5" fill={C.oliveLo} />
      <Shine d={`M160 ${G - 140} Q176 ${G - 160} 232 ${G - 163}`} />
      <Shine d={`M62 ${G - 105} L372 ${G - 105}`} o={0.3} />
    </g>
  );
}

export function TankModern({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={230} rx={215} />
      <Track ink={ink} x={48} y={G - 54} w={366} h={54} n={7} />
      <path d={hull(36, 424, G - 110, G - 52, 52)} fill={ink.u('sand')} />
      {/* saias laterais */}
      <path d={`M54 ${G - 64} L410 ${G - 64} L404 ${G - 36} L62 ${G - 36} Z`} fill={C.sand} stroke={C.sandLo} />
      {[110, 170, 230, 290, 350].map((x) => (
        <path key={x} d={`M${x} ${G - 64} L${x - 4} ${G - 36}`} stroke={C.sandLo} />
      ))}
      {/* torre angular de blindagem composta */}
      <path d={`M120 ${G - 110} L132 ${G - 154} L262 ${G - 160} L316 ${G - 136} L322 ${G - 110} Z`} fill={ink.u('sand')} />
      <path d={`M132 ${G - 154} L262 ${G - 160} L262 ${G - 152} L134 ${G - 146} Z`} fill={C.sandHi} />
      <Barrel ink={ink} x={312} y={G - 128} len={160} r={5} />
      <rect x="226" y={G - 182} width="24" height="20" rx="3" fill="#2e2a20" />
      <rect x="230" y={G - 178} width="16" height="9" fill={ink.u('glass')} />
      <rect x="150" y={G - 172} width="40" height="10" rx="2" fill={C.sandLo} />
      <Shine d={`M134 ${G - 153} L262 ${G - 159} L314 ${G - 136}`} />
    </g>
  );
}

export function SamMobile({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={200} />
      <Track ink={ink} x={60} y={G - 50} w={360} h={50} n={6} />
      <path d={hull(52, 432, G - 112, G - 48, 54)} fill={ink.u('olive')} />
      {/* radar de busca girando (disco) */}
      <rect x="112" y={G - 172} width="8" height="60" fill="#20251b" />
      <ellipse cx="116" cy={G - 178} rx="40" ry="10" fill={ink.u('steel')} transform={`rotate(-12 116 ${G - 178})`} />
      {/* quatro tubos de mísseis inclinados */}
      <g transform={`rotate(-28 250 ${G - 120})`}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="210" y={G - 156 + i * 15} width="170" height="13" rx="5" fill={ink.u('tube')} />
        ))}
      </g>
      <rect x="220" y={G - 128} width="66" height="18" fill={C.oliveLo} />
      <Shine d={`M74 ${G - 111} L376 ${G - 111}`} o={0.3} />
    </g>
  );
}

export function SamLong({ ink }: { ink: Ink }) {
  return (
    <g>
      <Shadow ink={ink} cx={240} rx={215} />
      {/* caminhão lançador 8x8: cabine à direita, casulos elevados */}
      <rect x="40" y={G - 70} width="330" height="26" fill="#2b3226" />
      <path d={`M370 ${G - 44} L370 ${G - 118} Q372 ${G - 126} 384 ${G - 126} L420 ${G - 126} Q432 ${G - 124} 438 ${G - 112} L444 ${G - 80} L444 ${G - 44} Z`} fill={ink.u('olive')} />
      <Glass ink={ink} d={`M384 ${G - 118} L418 ${G - 118} Q426 ${G - 116} 430 ${G - 106} L434 ${G - 90} L384 ${G - 90} Z`} />
      <g transform={`rotate(-38 70 ${G - 70})`}>
        <rect x="70" y={G - 120} width="290" height="26" rx="6" fill={ink.u('olive')} stroke={C.oliveLo} />
        <rect x="70" y={G - 94} width="290" height="26" rx="6" fill={ink.u('olive')} stroke={C.oliveLo} />
        <rect x="352" y={G - 120} width="10" height="52" fill="#1e2318" />
        <Shine d={`M76 ${G - 118} L354 ${G - 118}`} o={0.35} />
      </g>
      <path d={`M120 ${G - 70} L176 ${G - 168}`} stroke="#1f241a" strokeWidth="9" />
      {[78, 146, 290, 352].map((x) => (
        <Wheel key={x} ink={ink} cx={x} cy={G - 24} r={24} />
      ))}
    </g>
  );
}
