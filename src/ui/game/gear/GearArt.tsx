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

// ── Peças parametrizadas: armas longas e coletes no mesmo desenho, variando proporção e acessórios ──
interface GunOpts {
  len: number;
  body?: 'olive' | 'dark' | 'sand';
  scope?: boolean;
  bipod?: boolean;
  suppressor?: boolean;
  drum?: boolean;
  tube?: boolean;
  stock?: boolean;
}
const gun =
  (o: GunOpts): Draw =>
  ({ ink }) => {
    const L = o.len;
    const fill = ink.u(o.body ?? 'dark');
    return (
      <g>
        <Shadow ink={ink} cx={240} rx={L / 2 + 10} />
        <g transform={`translate(${240 - L / 2} 136) rotate(-3 ${L / 2} 40)`}>
          {o.stock !== false && <path d="M0 40L60 26H84V60H60L6 72Z" fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />}
          <rect x={84} y={20} width={L * 0.36} height={40} rx={4} fill={fill} stroke={C.ink} strokeWidth={2} />
          {o.scope && (
            <g>
              <rect x={96} y={-2} width={L * 0.28} height={16} rx={7} fill={C.steelLo} stroke={C.ink} strokeWidth={1.5} />
              <circle cx={96 + L * 0.28} cy={6} r={9} fill={C.glass} stroke={C.ink} strokeWidth={1.5} />
              <rect x={120} y={14} width={8} height={8} fill={C.steelLo} />
            </g>
          )}
          {o.drum ? (
            <circle cx={110 + L * 0.1} cy={86} r={24} fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
          ) : (
            <path d={`M${100 + L * 0.12} 60h24l-6 62q-1 6-8 6h-12z`} fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
          )}
          <path d={`M${84 + L * 0.3} 60h12l-6 36-10-2z`} fill="#1c2026" stroke={C.ink} strokeWidth={2} />
          <rect x={84 + L * 0.36} y={26} width={L * 0.3} height={28} rx={3} fill={fill} stroke={C.ink} strokeWidth={2} />
          {o.tube && <rect x={84 + L * 0.38} y={54} width={L * 0.22} height={22} rx={10} fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />}
          <rect x={84 + L * 0.66} y={34} width={L * 0.3} height={10} fill={ink.u('steel')} stroke={C.ink} strokeWidth={1.5} />
          {o.suppressor && <rect x={84 + L * 0.86} y={29} width={L * 0.16} height={20} rx={6} fill="#14181d" stroke={C.ink} strokeWidth={2} />}
          {o.bipod && <path d={`M${84 + L * 0.62} 46l-22 66M${84 + L * 0.62} 46l14 66`} stroke={C.steelLo} strokeWidth={4} strokeLinecap="round" />}
          <Shine d={`M90 24H${80 + L * 0.36}`} />
        </g>
      </g>
    );
  };

const vest =
  (body: 'dark' | 'olive' | 'sand', pouches: number, heavy = false): Draw =>
  ({ ink }) => (
    <g>
      <Shadow ink={ink} cx={240} rx={heavy ? 150 : 130} />
      <path
        d={
          heavy
            ? 'M138 60L196 50Q220 84 240 84Q260 84 284 50L342 60L362 150L352 256Q240 276 128 256L118 150Z'
            : 'M150 70L196 58Q220 92 240 92Q260 92 284 58L330 70L346 140L338 248Q240 266 142 248L134 140Z'
        }
        fill={ink.u(body)}
        stroke={C.ink}
        strokeWidth={2}
      />
      {heavy && <path d="M150 96H330L336 236Q240 254 144 236Z" fill={ink.u('steel')} opacity={0.45} stroke={C.ink} />}
      {Array.from({ length: pouches }, (_, i) => {
        const w = 150 / pouches;
        return <rect key={i} x={164 + i * w} y={164} width={w - 8} height={44} rx={4} fill="#1d232b" opacity={0.85} stroke={C.ink} strokeWidth={1.5} />;
      })}
      {heavy && <path d="M118 150Q100 120 130 96M362 150Q380 120 350 96" fill="none" stroke={C.ink} strokeWidth={14} strokeLinecap="round" opacity={0.6} />}
      <Shine d="M156 76L196 64" />
    </g>
  );

const Smg = gun({ len: 340, suppressor: true, stock: false });
const Sniper = gun({ len: 400, body: 'sand', scope: true, bipod: true });
const Grenadel = gun({ len: 330, body: 'olive', tube: true });
const Lmg = gun({ len: 400, drum: true, bipod: true });
const Camo = vest('olive', 3);
const Heavy = vest('dark', 4, true);

const GasMask: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={110} />
    <path d="M170 110Q170 66 240 62Q310 66 310 110L300 190Q240 222 180 190Z" fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
    {[200, 280].map((x) => (
      <circle key={x} cx={x} cy={128} r={24} fill={C.glass} stroke={C.ink} strokeWidth={4} />
    ))}
    <circle cx={240} cy={206} r={30} fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M220 ${196 + i * 7}H260`} stroke={C.oliveLo} strokeWidth={3} />
    ))}
    <Shine d="M186 120Q190 90 214 104" />
  </g>
);

const Dossier: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} cy={GROUND - 4} rx={140} />
    <g transform="rotate(-5 240 180)">
      <path d="M130 84h80l10 -12h70v12" fill={ink.u('sand')} stroke={C.ink} strokeWidth={2} />
      <rect x={130} y={84} width={220} height={160} rx={3} fill={ink.u('sand')} stroke={C.ink} strokeWidth={2} />
      <rect x={150} y={110} width={84} height={64} fill={C.steel} stroke={C.ink} />
      <circle cx={192} cy={136} r={14} fill={C.fleetLo} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M248 ${120 + i * 16}H330`} stroke={C.sandLo} strokeWidth={3} />
      ))}
      <rect x={196} y={190} width={110} height={30} fill="none" stroke={C.red} strokeWidth={4} transform="rotate(-8 250 205)" />
    </g>
  </g>
);

const Helmet: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={110} />
    <path d="M140 210Q140 96 240 92Q340 96 340 210Z" fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />
    <path d="M150 196H330" stroke={C.oliveLo} strokeWidth={8} />
    <path d="M178 196Q180 236 240 238Q300 236 302 196" fill={C.glass} opacity={0.85} stroke={C.ink} strokeWidth={2} />
    <rect x={226} y={96} width={28} height={20} rx={3} fill={C.steelLo} />
    <Shine d="M168 150Q190 108 236 104" w={3} />
  </g>
);

const Suit: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={120} />
    <path d="M150 74L210 58L240 120L270 58L330 74L346 250Q240 268 134 250Z" fill="#20252e" stroke={C.ink} strokeWidth={2} />
    <path d="M210 58L240 120L270 58L254 56L240 86L226 56Z" fill={C.fleetHi} stroke={C.ink} />
    <path d="M234 92L246 92L250 170L240 182L230 170Z" fill={C.red} stroke={C.ink} />
    <path d="M210 58L196 150L240 120M270 58L284 150L240 120" fill="none" stroke="#0d1015" strokeWidth={3} />
    <rect x={290} y={150} width={30} height={6} fill={C.fleetLo} />
    <Shine d="M160 80L206 66" />
  </g>
);

const Chute: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={110} />
    <path d="M190 90V60M290 90V60" stroke="#262c20" strokeWidth={14} strokeLinecap="round" />
    <rect x={166} y={90} width={148} height={150} rx={18} fill={ink.u('olive')} stroke={C.ink} strokeWidth={2} />
    <rect x={182} y={110} width={116} height={50} rx={8} fill={C.oliveLo} stroke={C.ink} />
    <path d="M166 176H314" stroke="#262c20" strokeWidth={8} />
    <circle cx={240} cy={206} r={16} fill={C.red} stroke={C.ink} strokeWidth={2} />
    <Shine d="M176 98H300" />
  </g>
);

const Lawyer: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={140} />
    <path d="M200 120V100Q200 90 210 90H270Q280 90 280 100V120" fill="none" stroke={C.ink} strokeWidth={8} />
    <rect x={130} y={120} width={220} height={130} rx={10} fill={ink.u('wood')} stroke={C.ink} strokeWidth={2} />
    <path d="M130 170H350" stroke="#33291c" strokeWidth={4} />
    {[170, 310].map((x) => (
      <rect key={x} x={x - 12} y={160} width={24} height={20} rx={3} fill={ink.u('steel')} stroke={C.ink} />
    ))}
    <rect x={300} y={60} width={56} height={92} rx={8} fill="#11161c" stroke={C.ink} strokeWidth={2} transform="rotate(12 328 106)" />
    <Shine d="M138 128H342" />
  </g>
);

const Breach: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={170} />
    <g transform="rotate(-14 240 180)">
      <rect x={80} y={168} width={300} height={14} rx={6} fill={ink.u('steel')} stroke={C.ink} strokeWidth={2} />
      <path d="M380 160Q410 168 400 190L378 182Z" fill={C.steelLo} stroke={C.ink} strokeWidth={2} />
      <path d="M80 160L64 150L70 186L84 184Z" fill={C.steelLo} stroke={C.ink} strokeWidth={2} />
      <rect x={120} y={164} width={70} height={22} rx={4} fill={C.red} opacity={0.9} />
    </g>
    <g transform="rotate(10 300 220)">
      <rect x={260} y={190} width={110} height={30} rx={4} fill={ink.u('dark')} stroke={C.ink} strokeWidth={2} />
      <rect x={366} y={196} width={30} height={18} fill={C.steelLo} stroke={C.ink} />
    </g>
    <Shine d="M86 170H370" />
  </g>
);

const ROTORS: [number, number][] = [
  [130, 110],
  [350, 110],
  [130, 210],
  [350, 210],
];
const Drone: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={150} ry={7} />
    {ROTORS.map(([x, y], i) => (
      <g key={i}>
        <path d={`M240 160L${x} ${y}`} stroke={C.ink} strokeWidth={10} />
        <path d={`M240 160L${x} ${y}`} stroke={C.steel} strokeWidth={6} />
        <ellipse cx={x} cy={y - 8} rx={46} ry={6} fill="rgba(200,210,220,0.25)" stroke={C.steelLo} />
        <circle cx={x} cy={y} r={9} fill={C.steelLo} stroke={C.ink} />
      </g>
    ))}
    <rect x={204} y={136} width={72} height={48} rx={12} fill={ink.u('fleet')} stroke={C.ink} strokeWidth={2} />
    <circle cx={240} cy={194} r={12} fill={C.glass} stroke={C.ink} strokeWidth={2} />
    <circle cx={262} cy={146} r={3} fill={C.red} />
    <Shine d="M210 142H270" />
  </g>
);

const Laser: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} rx={140} />
    <path d="M200 236L240 170L280 236M240 170V244" fill="none" stroke={C.steelLo} strokeWidth={6} />
    <rect x={164} y={96} width={70} height={24} rx={4} fill={C.sandLo} stroke={C.ink} />
    <rect x={150} y={120} width={190} height={56} rx={8} fill={ink.u('sand')} stroke={C.ink} strokeWidth={2} />
    <circle cx={346} cy={148} r={22} fill={C.glass} stroke={C.ink} strokeWidth={3} />
    <circle cx={346} cy={148} r={7} fill={C.red} />
    <path d="M368 148L470 120" stroke={C.red} strokeWidth={2} opacity={0.7} />
    <Shine d="M158 126H330" />
  </g>
);

const Immunity: Draw = ({ ink }) => (
  <g>
    <Shadow ink={ink} cx={240} cy={GROUND - 4} rx={130} />
    <g transform="rotate(-6 240 170)">
      <rect x={156} y={70} width={150} height={196} rx={6} fill="#1f3a5c" stroke={C.ink} strokeWidth={2} />
      <circle cx={231} cy={150} r={34} fill="none" stroke={C.amber} strokeWidth={3} />
      <path d="M197 150H265M231 116V184M206 128Q231 150 206 172M256 128Q231 150 256 172" fill="none" stroke={C.amber} strokeWidth={2} />
      <rect x={186} y={206} width={90} height={10} fill={C.amber} opacity={0.8} />
    </g>
    <g transform="rotate(10 320 220)">
      <rect x={270} y={196} width={120} height={50} rx={4} fill={ink.u('paper')} stroke={C.ink} />
      <circle cx={364} cy={221} r={14} fill={C.red} opacity={0.85} />
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
  dossier: { draw: Dossier, bg: 'desk' },
  smg: { draw: Smg, bg: 'studio' },
  sniper: { draw: Sniper, bg: 'yard' },
  grenadel: { draw: Grenadel, bg: 'yard' },
  lmg: { draw: Lmg, bg: 'yard' },
  helmet: { draw: Helmet, bg: 'sky' },
  camo: { draw: Camo, bg: 'yard' },
  suit: { draw: Suit, bg: 'studio' },
  gasmask: { draw: GasMask, bg: 'studio' },
  chute: { draw: Chute, bg: 'sky' },
  heavyarmor: { draw: Heavy, bg: 'yard' },
  lawyer: { draw: Lawyer, bg: 'desk' },
  breach: { draw: Breach, bg: 'studio' },
  drone: { draw: Drone, bg: 'sky' },
  laser: { draw: Laser, bg: 'yard' },
  immunity: { draw: Immunity, bg: 'desk' },
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
