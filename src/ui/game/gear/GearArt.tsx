import { useId, type ComponentType } from 'react';
import { Backdrop, C, Defs, Finish, GROUND, Shadow, Shine, VH, VW, type Backdrop as BackdropKind, type Ink } from '../../item-illustrations/kit';

/**
 * Ilustração "foto de arquivo" do Equipamento, no mesmo kit das ilustrações de itens (palco 480×320,
 * luz rasante de cima-esquerda, metal frio, grão e desfoque no tamanho grande). 100% SVG por código.
 */
type Draw = ComponentType<{ ink: Ink }>;

// Marcas pintadas no objeto (parte do desenho, não texto de interface).
const STENCIL_FWD = '▲ FWD';
const RADIO_LCD = 'CH 07';

const Pistol: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={120} />
    <g transform="translate(118 150) rotate(-4)">
      {/* ferrolho */}
      <path d="M0 0H232Q240 0 240 8V34H0Z" fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
      {[150, 162, 174, 186, 198].map((x) => (
        <path key={x} d={`M${x} 6V28`} stroke="#0a0f15" strokeWidth={3} />
      ))}
      <rect x={6} y={-6} width={10} height={6} fill={C.steelLo} />
      <rect x={222} y={-5} width={8} height={5} fill={C.steelLo} />
      {/* armação e guarda-mato */}
      <path d="M20 34H220V52H150Q140 52 136 62L128 80Q118 92 104 84L108 60Q110 52 96 52H20Z" fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
      {/* empunhadura */}
      <path d="M150 50L210 50L236 150Q238 162 226 164L184 166Q172 166 170 154Z" fill="#1c2026" stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M${186 + i * 4} ${70 + i * 12}L${222 + i * 1.5} ${68 + i * 12}`} stroke="#2c323a" strokeWidth={2} />
      ))}
      <Shine d="M8 4H228" />
    </g>
  </g>
);

const Carbine: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={200} />
    <g transform="translate(36 132) rotate(-3)">
      <path d="M0 40L70 26H96V60H70L8 74Z" fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />
      <rect x={96} y={20} width={150} height={40} rx={4} fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
      <rect x={120} y={4} width={90} height={14} rx={3} fill={C.steelLo} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={130} cy={11} r={6} fill={C.glass} stroke={C.ink} />
      <path d="M150 60L176 60L170 128Q168 134 160 134L146 132Z" fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
      <path d="M200 60L214 60L208 100L196 98Z" fill="#1c2026" stroke={C.ink} strokeWidth={2} />
      <rect x={246} y={24} width={110} height={30} rx={3} fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />
      {[262, 278, 294, 310, 326, 342].map((x) => (
        <rect key={x} x={x} y={30} width={8} height={4} fill={C.oliveLo} />
      ))}
      <rect x={356} y={34} width={52} height={10} fill={ink.u('steel')} stroke={C.ink} strokeWidth={1.5} />
      <rect x={404} y={31} width={14} height={16} rx={2} fill={C.steelLo} />
      <Shine d="M100 24H240" />
    </g>
  </g>
);

const Manpads: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={210} />
    <g transform="translate(30 120) rotate(-6)">
      <rect x={0} y={30} width={420} height={44} rx={22} fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={420} cy={52} rx={10} ry={22} fill={C.oliveLo} stroke={C.ink} strokeWidth={2} />
      <ellipse cx={4} cy={52} rx={9} ry={21} fill="#0b0f14" stroke={C.ink} strokeWidth={2} />
      <rect x={60} y={26} width={12} height={52} fill={C.oliveLo} />
      <rect x={330} y={26} width={12} height={52} fill={C.oliveLo} />
      <path d="M150 74H200L196 140Q194 146 186 146H170Q162 146 162 138Z" fill="#1f2328" stroke={C.ink} strokeWidth={2} />
      <path d="M120 30V4H190V30" fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
      <rect x={196} y={0} width={40} height={18} rx={4} fill={C.steelLo} stroke={C.ink} />
      <text x={250} y={58} fontFamily="monospace" fontSize={12} fill={C.amber} opacity={0.75}>
        {STENCIL_FWD}
      </text>
      <Shine d="M24 36H400" />
    </g>
  </g>
);

const Vest: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={130} />
    <path
      d="M150 70L196 58Q220 92 240 92Q260 92 284 58L330 70L346 140L338 248Q240 266 142 248L134 140Z"
      fill={ink.u('dark')}
      stroke={C.ink}
      strokeWidth={2}
    />
    <path d="M196 58Q220 92 240 92Q260 92 284 58" fill="none" stroke="#2c3440" strokeWidth={6} />
    {[156, 196, 236, 276].map((x) => (
      <rect key={x} x={x} y={150} width={34} height={46} rx={4} fill="#20262e" stroke={C.ink} strokeWidth={1.5} />
    ))}
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M150 ${212 + i * 10}H330`} stroke="#2a313b" strokeWidth={3} />
    ))}
    <rect x={210} y={110} width={60} height={22} rx={2} fill={C.paperLo} opacity={0.75} />
    <Shine d="M156 76L196 64" />
  </g>
);

const Plate: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={140} />
    <path
      d="M146 66L198 54Q222 86 240 86Q258 86 282 54L334 66L352 150L344 250Q240 270 136 250L128 150Z"
      fill={ink.u('olive')}
      stroke={C.ink}
      strokeWidth={2}
    />
    <path d="M176 104H304L310 210Q240 224 170 210Z" fill={ink.u('sand')} stroke={C.ink} strokeWidth={2} />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M140 ${120 + i * 26}H176M304 ${120 + i * 26}H340`} stroke={C.oliveLo} strokeWidth={6} />
    ))}
    {[188, 222, 256].map((x) => (
      <rect key={x} x={x} y={226} width={28} height={30} rx={3} fill={C.oliveLo} stroke={C.ink} />
    ))}
    <Shine d="M182 110H298" />
  </g>
);

const Radio: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={80} />
    <rect x={202} y={36} width={8} height={70} rx={3} fill={C.steelLo} stroke={C.ink} />
    <rect x={180} y={100} width={120} height={162} rx={10} fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
    <rect x={196} y={118} width={88} height={34} rx={3} fill="#2d4a2f" stroke={C.ink} />
    <text x={204} y={141} fontFamily="monospace" fontSize={15} fill="#a7f0a0">
      {RADIO_LCD}
    </text>
    {Array.from({ length: 9 }, (_, i) => (
      <rect key={i} x={198 + (i % 3) * 30} y={166 + Math.floor(i / 3) * 24} width={22} height={16} rx={3} fill="#2a313a" stroke={C.ink} />
    ))}
    <circle cx={270} cy={92} r={10} fill={C.steelLo} stroke={C.ink} />
    <circle cx={198} cy={248} r={3} fill={C.red} />
    <Shine d="M186 106H294" />
  </g>
);

const Nvg: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={130} />
    <path d="M130 150Q130 110 170 104H310Q350 110 350 150V176H130Z" fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
    {[186, 294].map((x) => (
      <g key={x}>
        <rect x={x - 38} y={150} width={76} height={88} rx={10} fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />
        <circle cx={x} cy={240} r={32} fill="#0b0f14" stroke={C.ink} strokeWidth={3} />
        <circle cx={x} cy={240} r={22} fill="#123a26" />
        <circle cx={x - 8} cy={232} r={6} fill="#9cf0b4" opacity={0.55} />
      </g>
    ))}
    <rect x={226} y={120} width={28} height={30} fill={C.steelLo} stroke={C.ink} />
    <Shine d="M140 118H340" />
  </g>
);

const Papers: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} cy={GROUND - 4} rx={150} />
    <g transform="rotate(-6 240 180)">
      <rect x={110} y={90} width={200} height={150} rx={4} fill={ink.u('paper')} stroke={C.ink} strokeWidth={1.5} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M128 ${140 + i * 14}H${290 - (i % 2) * 40}`} stroke={C.paperLo} strokeWidth={3} />
      ))}
      <circle cx={268} cy={212} r={20} fill="none" stroke={C.red} strokeWidth={3} opacity={0.8} />
    </g>
    <g transform="rotate(8 300 200)">
      <rect x={232} y={140} width={150} height={96} rx={8} fill="#e9eef3" stroke={C.ink} strokeWidth={1.5} />
      <rect x={232} y={140} width={150} height={22} rx={8} fill={C.glass} />
      <rect x={244} y={172} width={44} height={52} rx={3} fill={C.steel} />
      <circle cx={266} cy={190} r={10} fill={C.fleetLo} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M300 ${180 + i * 14}H368`} stroke={C.fleetLo} strokeWidth={3} />
      ))}
      <rect x={340} y={146} width={34} height={10} rx={2} fill={C.amber} />
    </g>
  </g>
);

const SCENES: Record<string, { draw: Draw; bg: BackdropKind }> = {
  pistol: { draw: Pistol, bg: 'studio' },
  carbine: { draw: Carbine, bg: 'studio' },
  manpads: { draw: Manpads, bg: 'yard' },
  vest: { draw: Vest, bg: 'studio' },
  plate: { draw: Plate, bg: 'studio' },
  radio: { draw: Radio, bg: 'desk' },
  nvg: { draw: Nvg, bg: 'studio' },
  papers: { draw: Papers, bg: 'desk' },
};

export function GearArt({ id, size = 'sm', alt = '' }: { id: string; size?: 'sm' | 'lg'; alt?: string }) {
  const uid = useId().replace(/:/g, '');
  const scene = SCENES[id];
  if (!scene) return null;
  const lg = size === 'lg';
  const ink: Ink = { u: (n) => `url(#${uid}-${n})`, k: (n) => `${uid}-${n}`, lg };
  const w = lg ? 480 : 96;
  const Draw = scene.draw;
  return (
    <svg
      className={`ii ii--${size} gear-art`}
      viewBox={`0 0 ${VW} ${VH}`}
      width={w}
      height={(w * VH) / VW}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <Defs ink={ink} />
      <Backdrop ink={ink} kind={scene.bg} />
      <Draw ink={ink} />
      <Finish ink={ink} />
    </svg>
  );
}
