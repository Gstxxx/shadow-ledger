// Pessoal: corpo inteiro em contraluz (sem rosto), luz forte atrás e borda clara à esquerda.
// Cada função muda roupa, cobertura da cabeça, pose e o objeto na mão.
import { C, GROUND as G, type Ink } from './kit';

type Head = 'bare' | 'helmet' | 'nvg' | 'cap' | 'hood' | 'fedora' | 'bun' | 'long';
type Torso = 'suit' | 'tac' | 'shirt' | 'hoodie' | 'coat' | 'skirt' | 'dress' | 'broad';
type Arms = 'down' | 'crossed' | 'rifle' | 'phone' | 'glass';
type Prop = 'none' | 'pistol' | 'briefcase' | 'folder' | 'clutch' | 'pack';

export interface Figure {
  head: Head;
  torso: Torso;
  arms: Arms;
  prop?: Prop;
  /** acento claro (gravata-borboleta, distintivo). */
  accent?: 'bow' | 'badge' | 'earpiece';
  /** ambiente: operação (porta de concreto e neblina), escritório (persiana) ou recepção (bokeh quente). */
  scene: 'ops' | 'office' | 'gala';
}

const X = 240;

function headPath(h: Head) {
  const face = <ellipse cx={X} cy={62} rx={14} ry={18} />;
  switch (h) {
    case 'helmet':
      return (
        <>
          {face}
          <path d="M220 62 Q219 34 240 33 Q261 34 260 62 L264 66 L216 66 Z" />
        </>
      );
    case 'nvg':
      return (
        <>
          {face}
          <path d="M220 62 Q219 34 240 33 Q261 34 260 62 L264 66 L216 66 Z" />
          <rect x="244" y="38" width="22" height="12" rx="4" />
        </>
      );
    case 'cap':
      return (
        <>
          {face}
          <path d="M222 50 Q222 36 240 36 Q258 36 258 50 Z" />
          <path d="M240 50 L270 52 L270 55 L240 55 Z" />
        </>
      );
    case 'hood':
      return <path d="M220 72 Q216 36 240 34 Q264 36 260 72 L268 96 L212 96 Z" />;
    case 'fedora':
      return (
        <>
          {face}
          <path d="M222 48 Q222 30 240 30 Q258 30 258 48 Z" />
          <ellipse cx={X} cy={48} rx={28} ry={4.5} />
        </>
      );
    case 'bun':
      return (
        <>
          <ellipse cx={X} cy={64} rx={13} ry={17} />
          <circle cx={X - 4} cy={44} r={9} />
        </>
      );
    case 'long':
      return (
        <>
          <ellipse cx={X} cy={62} rx={13} ry={17} />
          <path d="M226 56 Q226 40 240 40 Q256 40 256 58 L258 96 L222 96 Z" />
        </>
      );
    default:
      return face;
  }
}

function torsoPath(t: Torso) {
  switch (t) {
    case 'tac':
      return (
        <>
          <path d="M198 92 Q240 82 282 92 L286 172 Q240 180 194 172 Z" />
          <path d="M200 170 L238 174 L236 264 L206 264 Z M242 174 L280 170 L274 264 L244 264 Z" />
        </>
      );
    case 'hoodie':
      return (
        <>
          <path d="M202 94 Q240 86 278 94 L284 184 Q240 190 196 184 Z" />
          <path d="M204 182 L238 184 L234 264 L208 264 Z M242 184 L276 182 L272 264 L246 264 Z" />
        </>
      );
    case 'coat':
      return (
        <>
          <path d="M204 90 Q240 82 276 90 L294 226 Q240 232 186 226 Z" />
          <path d="M212 224 L236 226 L234 264 L214 264 Z M244 226 L268 224 L266 264 L246 264 Z" />
          <path d="M226 84 L240 100 L254 84 L256 92 L240 108 L224 92 Z" />
        </>
      );
    case 'skirt':
      return (
        <>
          <path d="M212 92 Q240 86 268 92 L266 172 Q240 176 214 172 Z" />
          <path d="M214 168 L266 168 L262 216 L218 216 Z" />
          <path d="M222 214 L234 214 L232 262 L226 262 Z M246 214 L258 214 L254 262 L248 262 Z" />
        </>
      );
    case 'dress':
      return (
        <>
          <path d="M214 92 Q240 86 266 92 L262 150 L280 264 L200 264 L218 150 Z" />
        </>
      );
    case 'broad':
      return (
        <>
          <path d="M196 92 Q240 82 284 92 L290 214 Q240 220 190 214 Z" />
          <path d="M206 210 L238 212 L234 264 L210 264 Z M242 212 L274 210 L270 264 L246 264 Z" />
        </>
      );
    case 'shirt':
      return (
        <>
          <path d="M206 92 Q240 84 274 92 L276 168 Q240 174 204 168 Z" />
          <path d="M204 166 L238 170 L234 264 L210 264 Z M242 170 L276 166 L270 264 L246 264 Z" />
          <rect x="198" y="160" width="84" height="8" />
        </>
      );
    default:
      return (
        <>
          <path d="M206 92 Q240 84 274 92 L280 178 Q240 184 200 178 Z" />
          <path d="M204 176 L238 178 L234 264 L210 264 Z M242 178 L276 176 L270 264 L246 264 Z" />
        </>
      );
  }
}

function armsPath(a: Arms, t: Torso) {
  const w = t === 'tac' || t === 'broad' ? 8 : 4;
  const L = 206 - w;
  const R = 274 + w;
  switch (a) {
    case 'crossed':
      return (
        <>
          <path d={`M${L} 94 Q${L - 12} 100 ${L - 10} 128 L${L + 2} 150 L${L + 14} 142 L${L + 10} 120 Z`} />
          <path d={`M${R} 94 Q${R + 12} 100 ${R + 10} 128 L${R - 2} 150 L${R - 14} 142 L${R - 10} 120 Z`} />
          <rect x={L + 2} y="138" width={R - L - 4} height="16" rx="7" />
        </>
      );
    case 'rifle':
      return (
        <>
          <path d={`M${L} 94 Q${L - 12} 104 ${L - 6} 132 L${L + 26} 150 L${L + 30} 140 L${L + 6} 122 Z`} />
          <path d={`M${R} 94 Q${R + 12} 104 ${R + 8} 128 L${R - 18} 112 L${R - 12} 104 Z`} />
          <g transform="rotate(-34 240 128)">
            <rect x="160" y="124" width="170" height="8" rx="2" />
            <rect x="228" y="130" width="10" height="18" rx="2" />
            <rect x="160" y="122" width="40" height="13" rx="3" />
          </g>
        </>
      );
    case 'phone':
      return (
        <>
          <path d={`M${L} 94 Q${L - 12} 100 ${L - 10} 130 L${L - 6} 180 L${L + 6} 180 L${L + 8} 128 Z`} />
          <path d={`M${R} 94 Q${R + 14} 104 ${R + 8} 120 L${R - 14} 74 L${R - 22} 78 L${R - 6} 112 Z`} />
          <rect x="250" y="56" width="8" height="20" rx="2" />
        </>
      );
    case 'glass':
      return (
        <>
          <path d={`M${L} 94 Q${L - 12} 100 ${L - 10} 130 L${L - 6} 180 L${L + 6} 180 L${L + 8} 128 Z`} />
          <path d={`M${R} 94 Q${R + 14} 104 ${R + 10} 138 L${R - 10} 126 L${R - 6} 114 Z`} />
          <path d="M262 106 L276 106 L272 124 L266 124 Z" fill="#f4dca8" fillOpacity="0.5" />
        </>
      );
    default:
      return (
        <>
          <path d={`M${L} 94 Q${L - 12} 100 ${L - 10} 130 L${L - 6} 180 L${L + 6} 180 L${L + 8} 128 Z`} />
          <path d={`M${R} 94 Q${R + 12} 100 ${R + 10} 130 L${R + 6} 180 L${R - 6} 180 L${R - 8} 128 Z`} />
        </>
      );
  }
}

function propPath(p: Prop) {
  switch (p) {
    case 'pistol':
      return <path d="M276 182 L290 182 L290 188 L282 188 L280 198 L274 198 Z" />;
    case 'briefcase':
      return (
        <>
          <rect x="268" y="184" width="40" height="30" rx="3" />
          <path d="M280 184 L280 178 L296 178 L296 184" fill="none" stroke="#0a0c0e" strokeWidth="3" />
        </>
      );
    case 'folder':
      return <rect x="186" y="120" width="12" height="46" rx="2" transform="rotate(-8 192 143)" />;
    case 'clutch':
      return <rect x="190" y="176" width="26" height="12" rx="3" />;
    case 'pack':
      return <rect x="186" y="96" width="18" height="70" rx="6" />;
    default:
      return null;
  }
}

export function Person({ ink, fig }: { ink: Ink; fig: Figure }) {
  const parts = (
    <>
      {propPath(fig.prop ?? 'none')}
      {torsoPath(fig.torso)}
      {armsPath(fig.arms, fig.torso)}
      <rect x="233" y="74" width="14" height="18" />
      {headPath(fig.head)}
      {/* sapatos */}
      <ellipse cx="222" cy={G + 2} rx="14" ry="5" />
      <ellipse cx="258" cy={G + 2} rx="14" ry="5" />
    </>
  );
  return (
    <g>
      {/* luz forte atrás (janela de neblina) */}
      <radialGradient id={ink.k('halo')} cx="0.5" cy="0.42" r="0.5">
        <stop offset="0" stopColor="#ffe7c0" stopOpacity="0.95" />
        <stop offset="0.45" stopColor="#d9c4a0" stopOpacity="0.45" />
        <stop offset="1" stopColor="#d9c4a0" stopOpacity="0" />
      </radialGradient>
      {fig.scene === 'office' && (
        <g>
          <rect x="120" y="20" width="240" height="210" fill="#f1dfb8" opacity="0.85" />
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x="120" y={28 + i * 15} width="240" height="7" fill="#2b2620" opacity="0.8" />
          ))}
          <rect x="236" y="20" width="8" height="210" fill="#2b2620" />
        </g>
      )}
      {fig.scene === 'gala' &&
        Array.from({ length: 16 }, (_, i) => (
          <circle key={i} cx={40 + ((i * 97) % 400)} cy={30 + ((i * 53) % 160)} r={10 + (i % 4) * 6} fill="#f2a93b" opacity={0.18 + (i % 3) * 0.08} />
        ))}
      {fig.scene === 'ops' && (
        <g fill="#1a1f24" opacity="0.85">
          <rect x="128" y="0" width="34" height={G} />
          <rect x="318" y="0" width="34" height={G} />
          <rect x="128" y="0" width="224" height="22" />
        </g>
      )}
      <ellipse cx={X} cy={150} rx={190} ry={170} fill={ink.u('halo')} />
      {fig.scene === 'ops' && <rect y={G - 30} width="480" height="40" fill="#c9d1d8" opacity="0.18" />}
      <ellipse cx={X} cy={G + 4} rx={70} ry={8} fill="#000" opacity="0.55" />
      <g fill={ink.u('body')} stroke={ink.u('rim')} strokeWidth="2.6" strokeLinejoin="round">
        {parts}
      </g>
      {fig.accent === 'bow' && <path d="M232 90 L240 94 L248 90 L248 98 L240 94 L232 98 Z" fill={C.fleetHi} opacity="0.8" />}
      {fig.accent === 'badge' && <path d="M222 112 l4 -8 l4 8 l-4 4 Z" fill={C.amber} />}
      {fig.accent === 'earpiece' && <path d="M228 64 Q222 76 226 92" stroke={C.fleet} strokeWidth="1.2" fill="none" opacity="0.8" />}
    </g>
  );
}

export const FIGURES: Record<string, Figure> = {
  bodyguard: { head: 'bare', torso: 'suit', arms: 'crossed', accent: 'earpiece', scene: 'ops' },
  thug: { head: 'hood', torso: 'hoodie', arms: 'down', prop: 'pistol', scene: 'ops' },
  police: { head: 'cap', torso: 'shirt', arms: 'down', accent: 'badge', scene: 'ops' },
  swat: { head: 'helmet', torso: 'tac', arms: 'rifle', scene: 'ops' },
  soldier: { head: 'helmet', torso: 'tac', arms: 'rifle', prop: 'pack', scene: 'ops' },
  commando: { head: 'nvg', torso: 'tac', arms: 'rifle', prop: 'pack', scene: 'ops' },
  agent: { head: 'fedora', torso: 'coat', arms: 'down', prop: 'briefcase', scene: 'ops' },
  lawyer1: { head: 'bare', torso: 'suit', arms: 'down', prop: 'briefcase', scene: 'office' },
  lawyer2: { head: 'bun', torso: 'skirt', arms: 'down', prop: 'folder', scene: 'office' },
  lawyer3: { head: 'bare', torso: 'broad', arms: 'phone', scene: 'office' },
  liaison1: { head: 'bare', torso: 'suit', arms: 'glass', scene: 'gala' },
  liaison2: { head: 'long', torso: 'dress', arms: 'down', prop: 'clutch', scene: 'gala' },
  liaison3: { head: 'bare', torso: 'suit', arms: 'glass', accent: 'bow', scene: 'gala' },
};
