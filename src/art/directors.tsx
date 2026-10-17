import { useId, type CSSProperties, type ReactNode } from 'react';
import './art.css';
import { FACES, FACE_PATH, type AnalystMood } from './portraits';

// ══════════════════════════════════════════════════════════════════════
// DirectorPortrait — as 6 Origens do Diretor (docs/ORIGENS.md).
// Mesmo rig da Analista (rosto, olhos e expressões), com cabelo, roupa,
// acessórios, luz rasante e fundo próprios para cada personagem.
// Em tamanhos pequenos (≤ 72px) o enquadramento fecha na cabeça.
// ══════════════════════════════════════════════════════════════════════

export type DirectorOrigin = 'field-agent' | 'banker' | 'colonel' | 'diplomat' | 'smuggler' | 'sigint';
export type DirectorMood = AnalystMood;

export const DIRECTOR_ORIGINS: DirectorOrigin[] = ['field-agent', 'banker', 'colonel', 'diplomat', 'smuggler', 'sigint'];

/** Rótulos pt-BR (docs/ORIGENS.md) e o ícone-emblema de cada Origem em <GameIcon>. */
export const ORIGIN_INFO: Record<DirectorOrigin, { label: string; labelEn: string; emblem: string }> = {
  'field-agent': { label: 'Ex-Agente de Campo', labelEn: 'Former Field Agent', emblem: 'origin-field-agent' },
  banker: { label: 'Banqueira de Genebra', labelEn: 'Geneva Banker', emblem: 'origin-banker' },
  colonel: { label: 'Coronel da Reserva', labelEn: 'Reserve Colonel', emblem: 'origin-colonel' },
  diplomat: { label: 'Diplomata Caída', labelEn: 'Fallen Diplomat', emblem: 'origin-diplomat' },
  smuggler: { label: 'Contrabandista', labelEn: 'Smuggler', emblem: 'origin-smuggler' },
  sigint: { label: 'Analista de Sinais', labelEn: 'Signals Analyst', emblem: 'origin-sigint' },
};

const MALE_FACE =
  'M71 88c0-22.4 12.6-36.6 29.2-36.6S129.6 65.6 129.6 88c0 15-2.6 28.4-7.4 38.6-5.6 11.6-13 20.4-22 20.4s-16.4-8.8-22-20.4C73.4 116.4 71 103 71 88z';

interface Skin {
  base: string;
  mid: string;
  sh: string;
}

type U = (s: string) => string;

interface Look {
  male: boolean;
  skin: Skin;
  brow: string;
  iris: string;
  lip: string;
  /** cor da luz de contorno (lado esquerdo) */
  rim: string;
  /** luz rasante/quente do outro lado */
  key: string;
  bg: (u: U) => ReactNode;
  defs?: (id: U) => ReactNode;
  hairBack?: (u: U) => ReactNode;
  body: (u: U) => ReactNode;
  /** sobre o rosto, antes do cabelo da frente (cicatriz, barba, óculos, cigarro) */
  face?: (u: U) => ReactNode;
  hairFront?: (u: U) => ReactNode;
  /** chapéu, fones etc. — por cima de tudo */
  top?: (u: U) => ReactNode;
}

// ── personagens ─────────────────────────────────────────────────────

const LOOKS: Record<DirectorOrigin, Look> = {
  // Ex-Agente de Campo: sobretudo de gola alta, olhar cansado, cicatriz. Noite de chuva, poste âmbar.
  'field-agent': {
    male: true,
    skin: { base: '#b98669', mid: '#8b5b47', sh: '#4c3128' },
    brow: '#57524c',
    iris: '#3b4a52',
    lip: '#6e3f36',
    rim: '#a8fbff',
    key: '#f5b04a',
    bg: (u) => (
      <>
        <rect width="200" height="240" fill={u('bg')} />
        <circle cx="168" cy="26" r="46" fill="#f5b04a" fillOpacity="0.12" />
        <circle cx="168" cy="26" r="10" fill="#ffcf7a" fillOpacity="0.35" />
        <g stroke="#a8fbff" strokeOpacity="0.12" strokeWidth="0.8">
          {Array.from({ length: 22 }, (_, i) => (
            <path key={i} d={`M${(i * 37) % 200} ${(i * 53) % 150}l-6 18`} />
          ))}
        </g>
      </>
    ),
    defs: (id) => (
      <linearGradient id={id('bg')} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="#152330" />
        <stop offset="1" stopColor="#06090c" />
      </linearGradient>
    ),
    body: () => (
      <>
        <path d="M18 240c2-38 22-60 54-68l28 10 28-10c32 8 52 30 54 68z" fill="#3d3628" />
        <path d="M86 150l14 22 14-22v20l-14 14-14-14z" fill="#d8d2c4" />
        <path d="M97 170l3 4 3-4 3 26-6 8-6-8z" fill="#2a2f36" />
        {/* gola alta do sobretudo */}
        <path d="M66 176l12-38 16 28-8 34z" fill="#4a4231" />
        <path d="M134 176l-12-38-16 28 8 34z" fill="#2c271c" />
        <path d="M66 176l12-38 16 28" fill="none" stroke="#a8fbff" strokeOpacity="0.4" strokeWidth="1" />
        <path d="M86 200l-14 40M114 200l14 40" stroke="#16130d" strokeWidth="2" />
        <path d="M18 240c2-38 22-60 54-68" fill="none" stroke="#a8fbff" strokeOpacity="0.3" strokeWidth="1" />
      </>
    ),
    face: () => (
      <>
        {/* barba por fazer */}
        <path d="M78 118c4 18 12 28 22 28s18-10 22-28c-6 12-14 18-22 18s-16-6-22-18z" fill="#5d6166" opacity="0.28" />
        {/* olheiras */}
        <path d="M81.6 101c3.6 1.8 9 1.8 13 0M106.6 101c4 1.8 9.4 1.8 13 0" fill="none" stroke="#6a4436" strokeWidth="1" strokeLinecap="round" />
        {/* cicatriz sobre a sobrancelha esquerda */}
        <path d="M85 79l5 28" stroke="#d9a893" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M84.6 83l2.6-.6M86 89l2.6-.6M87.4 95l2.4-.6" stroke="#a46e5c" strokeWidth="0.9" />
      </>
    ),
    hairFront: () => (
      <>
        <path d="M71 86c-2-22 10-36 29-37 19-1 31 13 30 35-4-9-9-15-16-17-7 4-19 4-27 1-8 3-13 9-16 18z" fill="#4f4b46" />
        <path d="M76 70c6-10 14-15 24-16M110 56c8 2 14 6 18 14" fill="none" stroke="#9e978e" strokeWidth="1.2" strokeOpacity="0.8" />
        <path d="M71 86c-1-14 4-25 13-31" fill="none" stroke="#a8fbff" strokeOpacity="0.5" strokeWidth="1" />
      </>
    ),
  },

  // Banqueira de Genebra: terno impecável, coque baixo, caneta-tinteiro. Abajur dourado.
  banker: {
    male: false,
    skin: { base: '#e2b79c', mid: '#b88771', sh: '#7a5244' },
    brow: '#7a5c34',
    iris: '#4a5a3e',
    lip: '#9a3b36',
    rim: '#ffcf7a',
    key: '#f5b04a',
    bg: (u) => (
      <>
        <rect width="200" height="240" fill={u('bg')} />
        <circle cx="20" cy="200" r="80" fill="#f5b04a" fillOpacity="0.14" />
        <g stroke="#f5b04a" strokeOpacity="0.16" strokeWidth="1">
          <path d="M120 40h70M120 52h52M120 64h62" />
          <path d="M130 120l12-10 10 6 14-18 12 8 12-14" fill="none" />
        </g>
      </>
    ),
    defs: (id) => (
      <radialGradient id={id('bg')} cx="20%" cy="80%" r="100%">
        <stop offset="0" stopColor="#2a1e10" />
        <stop offset="0.6" stopColor="#120d08" />
        <stop offset="1" stopColor="#070504" />
      </radialGradient>
    ),
    body: () => (
      <>
        <path d="M22 240c2-36 22-58 52-66l26 10 26-10c30 8 50 30 52 66z" fill="#1c2431" />
        {/* camisa branca, colarinho */}
        <path d="M84 158l16 30 16-30 6 14-22 30-22-30z" fill="#eef0f2" />
        <path d="M84 158l16 30M116 158l-16 30" stroke="#c5cad1" strokeWidth="1" />
        {/* lapelas */}
        <path d="M74 174l14-14 12 38-10 42z" fill="#263044" />
        <path d="M126 174l-14-14-12 38 10 42z" fill="#141a24" />
        <path d="M74 174l14-14 12 38" fill="none" stroke="#ffcf7a" strokeOpacity="0.35" strokeWidth="1" />
        {/* caneta-tinteiro no bolso */}
        <path d="M58 212l4-26" stroke="#0b0b0b" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M61.6 188l.6-4" stroke="#f5b04a" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M60.2 196l.6-6" stroke="#f5b04a" strokeWidth="0.9" />
        <path d="M50 212h18" stroke="#0e131b" strokeWidth="2" />
      </>
    ),
    face: () => (
      <>
        <circle cx="72" cy="114" r="2.4" fill="#f5b04a" />
        <circle cx="71.4" cy="113.4" r="0.8" fill="#fff4d6" />
      </>
    ),
    hairFront: () => (
      <>
        <path d="M70 94c-3-28 11-44 31-44 20 0 32 15 30 40-5-15-16-24-30-24-14 0-25 11-31 28z" fill="#b8955b" />
        <path d="M74 80c6-14 16-22 28-23M104 56c10 0 20 6 25 16" fill="none" stroke="#ead29b" strokeWidth="1.3" strokeOpacity="0.9" />
        <path d="M86 70c6-6 14-8 22-6" fill="none" stroke="#7d6236" strokeWidth="1" />
      </>
    ),
  },

  // Coronel da Reserva: farda sem insígnias, quepe, bigode grisalho. Luz dura de cima.
  colonel: {
    male: true,
    skin: { base: '#a9785d', mid: '#7c5040', sh: '#432a21' },
    brow: '#8f8d86',
    iris: '#2c2620',
    lip: '#5e352c',
    rim: '#cdbd9c',
    key: '#ffcf7a',
    bg: (u) => (
      <>
        <rect width="200" height="240" fill={u('bg')} />
        <g stroke="#cdbd9c" strokeOpacity="0.08" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M0 ${i * 28}H200M${i * 28} 0V240`} />
          ))}
        </g>
        <path d="M24 60l30 20 26-8 20 18" fill="none" stroke="#e5372f" strokeOpacity="0.25" strokeWidth="1.4" strokeDasharray="3 3" />
      </>
    ),
    defs: (id) => (
      <radialGradient id={id('bg')} cx="50%" cy="10%" r="100%">
        <stop offset="0" stopColor="#2b2e20" />
        <stop offset="1" stopColor="#090a06" />
      </radialGradient>
    ),
    body: () => (
      <>
        <path d="M18 240c2-38 22-60 54-68l28 6 28-6c32 8 52 30 54 68z" fill="#3a4130" />
        {/* dragonas vazias */}
        <path d="M40 186l30-12 4 10-30 12zM160 186l-30-12-4 10 30 12z" fill="#2c3224" />
        <path d="M54 182l6-2M146 182l-6-2" stroke="#6a705a" strokeWidth="1.2" strokeDasharray="1 1.4" />
        {/* gola fechada */}
        <path d="M84 156v16c8 6 24 6 32 0v-16c-8 6-24 6-32 0z" fill="#2f3527" />
        <path d="M100 178v62" stroke="#22271b" strokeWidth="1.6" />
        <circle cx="100" cy="196" r="2" fill="#8a8466" />
        <circle cx="100" cy="216" r="2" fill="#8a8466" />
        {/* bolsos e marca de condecorações removidas */}
        <path d="M58 206h26v20H58zM116 206h26v20h-26z" fill="none" stroke="#262b1e" strokeWidth="1.4" />
        <rect x="118" y="194" width="20" height="6" fill="#4a523b" />
        <path d="M120 197h16" stroke="#2b3123" strokeDasharray="1 1.5" />
        <path d="M18 240c2-38 22-60 54-68" fill="none" stroke="#cdbd9c" strokeOpacity="0.3" strokeWidth="1" />
      </>
    ),
    face: () => (
      <>
        {/* têmporas grisalhas */}
        <path d="M71.8 86c-.2 5 .2 10 1.2 15l2.4-1.4c-.8-5-1-9.6-.6-13.6zM128.8 86c.2 5-.2 10-1.2 15l-2.4-1.4c.8-5 1-9.6.6-13.6z" fill="#7d7b74" />
        {/* bigode */}
        <path d="M88 124c4-4 9-4 12-2 3-2 8-2 12 2-2 2.6-6 3.4-12 2.2-6 1.2-10 .4-12-2.2z" fill="#9b988f" />
        {/* sulcos */}
        <path d="M86 116c-2 4-2 8 0 12M114 116c2 4 2 8 0 12" fill="none" stroke="#5a3a2e" strokeWidth="1" />
      </>
    ),
    top: () => (
      <>
        {/* quepe */}
        <path d="M60 72c2-20 20-32 42-32s40 10 40 30l-4 6H64z" fill="#3f4632" />
        <path d="M62 70c4-14 18-24 38-24" fill="none" stroke="#cdbd9c" strokeOpacity="0.35" strokeWidth="1" />
        <path d="M64 68h74v10H64z" fill="#1f2318" />
        {/* lugar do distintivo arrancado */}
        <rect x="93" y="53" width="16" height="11" rx="1" fill="#4c543d" />
        <path d="M94 54h14M94 63h14" stroke="#2a2f22" strokeWidth="0.7" strokeDasharray="1 1.2" />
        {/* pala */}
        <path d="M62 78c12 6 26 9 40 9s28-3 38-10l-1 4c-10 7-24 10-37 10s-29-3-40-9z" fill="#0b0c0a" />
        <path d="M70 82c10 4 20 6 32 6" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.9" />
        {/* sombra da pala sobre os olhos */}
        <path d="M74 86c8 6 18 8 27 8s19-2 27-8v6c-8 6-18 8-27 8s-19-2-27-8z" fill="#2a1a14" opacity="0.35" />
      </>
    ),
  },

  // Diplomata Caída: óculos, lenço de seda, coque grisalho desfeito. Luz fria de janela.
  diplomat: {
    male: false,
    skin: { base: '#c99678', mid: '#9b6a55', sh: '#5c3c32' },
    brow: '#4a3a32',
    iris: '#3e2c22',
    lip: '#7e4038',
    rim: '#a8fbff',
    key: '#dde3e9',
    bg: (u) => (
      <>
        <rect width="200" height="240" fill={u('bg')} />
        <path d="M0 0h70v240H0z" fill="#a8fbff" fillOpacity="0.05" />
        <path d="M34 0v240M0 80h70M0 160h70" stroke="#a8fbff" strokeOpacity="0.1" strokeWidth="2" />
        <path d="M150 30l12 8-4 14-14 2-6-12z" fill="none" stroke="#cdbd9c" strokeOpacity="0.15" />
      </>
    ),
    defs: (id) => (
      <linearGradient id={id('bg')} x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0" stopColor="#1a2a30" />
        <stop offset="1" stopColor="#07090b" />
      </linearGradient>
    ),
    hairBack: () => (
      <>
        <path d="M64 96c-4-34 12-56 37-56 26 0 41 22 36 56-2 10 0 18 4 24-12 2-20-2-24-8H82c-4 6-12 10-22 8 4-6 6-14 4-24z" fill="#3a2b25" />
        <circle cx="102" cy="40" r="15" fill="#3a2b25" />
        <path d="M92 32c6-6 16-6 22 0" fill="none" stroke="#9d948c" strokeWidth="1.4" />
      </>
    ),
    body: () => (
      <>
        <path d="M20 240c2-36 22-58 52-66l28 8 28-8c30 8 50 30 52 66z" fill="#3a2f25" />
        <path d="M72 174l16-8 4 74H70zM128 174l-16-8-4 74h22z" fill="#2a2219" />
        {/* lenço de seda */}
        <path d="M80 150c8 14 32 14 40 0l6 16c-10 14-42 14-52 0z" fill="#8e2a26" />
        <path d="M114 162l14 6-4 26-10-8 2 24-10-6 2-24z" fill="#a8352f" />
        <path d="M84 160c8 8 24 8 32 0" fill="none" stroke="#e06a5e" strokeWidth="1.2" strokeOpacity="0.7" />
        <g fill="#f5b04a" fillOpacity="0.7">
          <circle cx="90" cy="164" r="1.2" />
          <circle cx="100" cy="167" r="1.2" />
          <circle cx="110" cy="164" r="1.2" />
          <circle cx="120" cy="182" r="1.2" />
        </g>
        <path d="M20 240c2-36 22-58 52-66" fill="none" stroke="#a8fbff" strokeOpacity="0.3" strokeWidth="1" />
      </>
    ),
    face: () => (
      <>
        {/* óculos de aro fino */}
        <g fill="none" stroke="#c9a66b" strokeWidth="1.5">
          <rect x="78" y="89" width="20" height="14" rx="4" />
          <rect x="103" y="89" width="20" height="14" rx="4" />
          <path d="M98 94c1.6-1.4 3.4-1.4 5 0M78 93l-6-2M123 93l5-2" />
        </g>
        <path d="M81 91l6 10M106 91l6 10" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
      </>
    ),
    hairFront: () => (
      <>
        <path d="M68 96c-2-26 10-42 32-44 18-2 32 10 34 30-8-10-18-16-32-14-14 2-26 12-34 28z" fill="#3a2b25" />
        <path d="M80 66c10-8 24-10 36-6" fill="none" stroke="#9d948c" strokeWidth="1.6" />
        <path d="M70 100c-4 8-4 18 0 26M131 92c3 10 3 20 0 28" fill="none" stroke="#3a2b25" strokeWidth="1.4" />
        <path d="M68 96c-1-14 4-26 14-34" fill="none" stroke="#a8fbff" strokeOpacity="0.5" strokeWidth="1" />
      </>
    ),
  },

  // Contrabandista: jaqueta de couro, cigarro apagado, undercut. Luz de sódio do hangar.
  smuggler: {
    male: false,
    skin: { base: '#94603f', mid: '#6c4230', sh: '#3a2219' },
    brow: '#120d0b',
    iris: '#24170f',
    lip: '#5a2c24',
    rim: '#ffcf7a',
    key: '#ff8f3a',
    bg: (u) => (
      <>
        <rect width="200" height="240" fill={u('bg')} />
        <path d="M0 40L200 0M0 90L200 50" stroke="#f5b04a" strokeOpacity="0.12" strokeWidth="6" />
        <path d="M140 150h50v40h-50zM150 150v40M140 170h50" fill="none" stroke="#f5b04a" strokeOpacity="0.18" strokeWidth="1.4" />
        <circle cx="180" cy="40" r="60" fill="#ff8f3a" fillOpacity="0.1" />
      </>
    ),
    defs: (id) => (
      <radialGradient id={id('bg')} cx="90%" cy="20%" r="100%">
        <stop offset="0" stopColor="#3a210c" />
        <stop offset="0.6" stopColor="#140b05" />
        <stop offset="1" stopColor="#070403" />
      </radialGradient>
    ),
    body: () => (
      <>
        <path d="M86 150c6 10 22 10 28 0v20H86z" fill="#1f1a17" />
        <path d="M18 240c2-38 22-60 54-68l28 14 28-14c32 8 52 30 54 68z" fill="#2b1c13" />
        {/* gola larga de couro */}
        <path d="M68 172l18-16 14 30-12 22zM132 172l-18-16-14 30 12 22z" fill="#3a271a" />
        <path d="M100 186v54" stroke="#9a8a70" strokeWidth="1.4" strokeDasharray="2 1.4" />
        {/* brilho do couro */}
        <path d="M40 210c4-14 12-24 24-30M150 196c8 8 12 18 14 30" fill="none" stroke="#ffcf7a" strokeOpacity="0.35" strokeWidth="1.4" />
        <path d="M68 172l18-16 14 30" fill="none" stroke="#ffcf7a" strokeOpacity="0.45" strokeWidth="1" />
      </>
    ),
    face: () => (
      <>
        {/* argola */}
        <circle cx="71" cy="116" r="3.4" fill="none" stroke="#e5c07b" strokeWidth="1.2" />
        {/* cigarro apagado no canto da boca */}
        <path d="M104 131.4l20 4.6" stroke="#ece6da" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M104 131.4l5 1.2" stroke="#c98a4a" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M123.4 135.8l.8.2" stroke="#3a3330" strokeWidth="2.8" strokeLinecap="round" />
      </>
    ),
    hairFront: () => (
      <>
        {/* lateral raspada */}
        <path d="M71 96c-2-14 0-24 6-32l4 2c-4 8-6 18-6 30z" fill="#2a1f1a" opacity="0.8" />
        <path d="M76 70c2-18 14-28 30-28 18 0 30 12 28 30-2 12-6 20-10 26 0-12-4-22-10-28-10 4-24 4-38 0z" fill="#141010" />
        <path d="M84 52c10-8 26-8 36 0M118 56c8 6 12 14 12 24" fill="none" stroke="#ffcf7a" strokeOpacity="0.4" strokeWidth="1.1" />
      </>
    ),
  },

  // Analista de Sinais: fones no pescoço, tela refletida nos óculos. Luz ciano de baixo.
  sigint: {
    male: true,
    skin: { base: '#d2a684', mid: '#a3765c', sh: '#5f4335' },
    brow: '#2a1f19',
    iris: '#3a2a20',
    lip: '#7a4a3c',
    rim: '#a8fbff',
    key: '#33d6e0',
    bg: (u) => (
      <>
        <rect width="200" height="240" fill={u('bg')} />
        <g stroke="#6ef0f5" strokeOpacity="0.2" strokeWidth="1.2">
          {Array.from({ length: 24 }, (_, i) => {
            const h = 6 + ((i * 37) % 23);
            return <path key={i} d={`M${8 + i * 8} ${220 - h}v${h}`} />;
          })}
        </g>
        <path d="M0 60c20-10 30 10 50 0s30-20 50 0 30 10 50-6 30 6 50 0" fill="none" stroke="#6ef0f5" strokeOpacity="0.18" strokeWidth="1.2" />
      </>
    ),
    defs: (id) => (
      <radialGradient id={id('bg')} cx="50%" cy="100%" r="100%">
        <stop offset="0" stopColor="#0c3338" />
        <stop offset="0.6" stopColor="#081418" />
        <stop offset="1" stopColor="#04080a" />
      </radialGradient>
    ),
    hairBack: () => <path d="M68 94c-6-32 10-54 34-54 24 0 40 20 34 54z" fill="#2a1f19" />,
    body: () => (
      <>
        <path d="M18 240c2-38 22-60 54-68l28 6 28-6c32 8 52 30 54 68z" fill="#2a3038" />
        <path d="M80 160c8 12 32 12 40 0l4 18c-12 10-36 10-48 0z" fill="#1d2228" />
        <path d="M92 182l-4 58M108 182l4 58" stroke="#3a424c" strokeWidth="2" />
        {/* fones no pescoço */}
        <path d="M74 168c4 16 48 16 52 0" fill="none" stroke="#11161b" strokeWidth="4" />
        <rect x="64" y="158" width="16" height="22" rx="7" fill="#151b21" stroke="#6ef0f5" strokeOpacity="0.6" strokeWidth="1" />
        <rect x="120" y="158" width="16" height="22" rx="7" fill="#151b21" stroke="#6ef0f5" strokeOpacity="0.6" strokeWidth="1" />
        <circle cx="128" cy="169" r="1.4" fill="#6ef0f5" />
        <path d="M18 240c2-38 22-60 54-68" fill="none" stroke="#a8fbff" strokeOpacity="0.3" strokeWidth="1" />
      </>
    ),
    face: () => (
      <>
        {/* óculos com a tela refletida */}
        <g>
          <rect x="77" y="88" width="22" height="15" rx="2" fill="#0b2a2e" fillOpacity="0.55" stroke="#11161b" strokeWidth="2" />
          <rect x="102" y="88" width="22" height="15" rx="2" fill="#0b2a2e" fillOpacity="0.55" stroke="#11161b" strokeWidth="2" />
          <path d="M99 93h3M77 92l-6-1M124 92l6-1" stroke="#11161b" strokeWidth="2" />
          <path d="M80 91h10v5H80zM105 91h10v5h-10z" fill="#6ef0f5" fillOpacity="0.6" />
          <path d="M81 98h7M106 98h7" stroke="#f5b04a" strokeOpacity="0.7" strokeWidth="0.9" />
        </g>
      </>
    ),
    hairFront: () => (
      <path
        d="M70 88c-4-10 0-20 6-26-2-6 4-12 10-12 2-6 10-8 16-6 6-4 14-2 18 2 6 0 12 6 12 12 6 6 6 16 2 26-2-8-6-14-10-16-4 4-10 4-14 0-4 4-12 4-16 0-6 4-14 4-18 0-4 4-6 12-6 20z"
        fill="#2a1f19"
      />
    ),
  },
};

export interface DirectorPortraitProps {
  origin: DirectorOrigin;
  mood?: DirectorMood;
  /** largura em px */
  size?: number;
  /** 'head' fecha na cabeça (ícones); 'bust' mostra até os ombros. Padrão: head se size ≤ 72. */
  crop?: 'head' | 'bust';
  /** fundo ilustrado; `false` = transparente */
  background?: boolean;
  blink?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** Retrato do Diretor por Origem. Quadrado em `head`, 5:6 em `bust`. */
export function DirectorPortrait({ origin, mood = 'neutral', size = 200, crop, background = true, blink = true, title, className, style }: DirectorPortraitProps) {
  const uid = useId().replace(/:/g, '');
  const L = LOOKS[origin];
  const f = FACES[mood];
  const id = (s: string) => `${s}${uid}`;
  const url = (s: string) => `url(#${s}${uid})`;
  const mode = crop ?? (size <= 72 ? 'head' : 'bust');
  const vb = mode === 'head' ? '44 34 112 112' : '0 0 200 240';
  const h = mode === 'head' ? size : (size * 240) / 200;
  const facePath = L.male ? MALE_FACE : FACE_PATH;
  const sk = L.skin;
  const small = size <= 72;

  return (
    <svg
      viewBox={vb}
      width={size}
      height={h}
      role="img"
      aria-label={title ?? ORIGIN_INFO[origin].label}
      className={className}
      style={{ flex: 'none', ...style }}
    >
      <defs>
        {L.defs?.(id)}
        <clipPath id={id('face')}>
          <path d={facePath} />
        </clipPath>
        <clipPath id={id('frame')}>
          <rect x={mode === 'head' ? 44 : 0} y={mode === 'head' ? 34 : 0} width={mode === 'head' ? 112 : 200} height={mode === 'head' ? 112 : 240} />
        </clipPath>
        <linearGradient id={id('lt')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={L.rim} stopOpacity="0.26" />
          <stop offset="0.4" stopColor={L.rim} stopOpacity="0" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#120804" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={id('kl')} x1="1" y1="1" x2="0.2" y2="0.1">
          <stop offset="0" stopColor={L.key} stopOpacity="0.4" />
          <stop offset="0.55" stopColor={L.key} stopOpacity="0" />
        </linearGradient>
        <pattern id={id('scan')} width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" fillOpacity="0.22" />
        </pattern>
        <radialGradient id={id('vig')} cx="50%" cy="42%" r="70%">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      <g clipPath={url('frame')}>
        {background ? L.bg(url) : null}
        {L.hairBack?.(url)}
        {L.body(url)}

        {/* pescoço */}
        <path d="M87 134v24c8 6 18 6 26 0v-24z" fill={sk.mid} />
        <path d="M87 136c6 10 20 10 26 0v9c-6 8-20 8-26 0z" fill={sk.sh} opacity="0.85" />

        {/* rosto e sombreamento */}
        <path d={facePath} fill={sk.base} />
        <g clipPath={url('face')}>
          <path d="M112 50c18 8 22 26 20 44-2 22-8 40-18 52-6 6-10 6-14 4 10-10 16-28 17-50 1-20-1-36-5-50z" fill={sk.sh} opacity="0.8" />
          <path d="M100 150c-10 0-20-8-24-18 8 6 16 8 24 8s16-2 24-8c-4 10-14 18-24 18z" fill={sk.sh} opacity="0.5" />
          <path d="M70 78c10-10 22-14 34-14 10 0 20 4 28 12v6c-8-6-18-10-28-10-12 0-24 4-34 12z" fill={sk.sh} opacity="0.4" />
          <rect x="60" y="40" width="80" height="120" fill={url('lt')} />
          <rect x="60" y="40" width="80" height="120" fill={url('kl')} />
        </g>
        <path d={L.male ? 'M100.2 51.4c-16.6 0-29.2 14.2-29.2 36.6 0 15 2.4 28.4 7.4 38.6 3.6 7.6 8 13.8 13 17.4' : 'M100.4 51.6c-16 0-28 14.4-28 36.4 0 16 3 30.4 8.6 41.6 4.2 8.4 8.6 14.2 13 17.4'} fill="none" stroke={L.rim} strokeOpacity="0.7" strokeWidth="1.1" />
        <path d="M72.4 96c-4-1.6-6.2 1.6-5.6 6 .6 4.6 2.6 8.6 6.6 9.2" fill={sk.mid} />
        <path d="M128 96c4-1.6 6.2 1.6 5.6 6-.6 4.6-2.6 8.6-6.6 9.2" fill={sk.sh} />

        {/* olhos */}
        {(['L', 'R'] as const).map((side) => {
          const cx = side === 'L' ? 88 : 113;
          return (
            <g key={side}>
              <path d={side === 'L' ? 'M80.2 96.4c4-3.6 11.4-3.8 15.6 0-4 3.2-11.4 3.4-15.6 0z' : 'M105.2 96.4c4.2-3.8 11.6-3.6 15.6 0-4.2 3.4-11.4 3.2-15.6 0z'} fill="#d8cbb6" />
              <circle cx={cx} cy={f.irisY} r="3.1" fill={L.iris} />
              <circle cx={cx} cy={f.irisY} r="1.5" fill="#0a0706" />
              <circle cx={cx - 1} cy={f.irisY - 1.1} r="0.75" fill="#f4fbff" />
              <path d={side === 'L' ? f.lidL : f.lidR} fill="none" stroke="#140d0b" strokeWidth="2.1" strokeLinecap="round" />
              {(side === 'L' ? f.lowL : f.lowR) ? <path d={(side === 'L' ? f.lowL : f.lowR)!} fill="none" stroke={sk.sh} strokeWidth="1.1" strokeLinecap="round" /> : null}
              {blink && !small ? (
                <path
                  className="sl-analyst__lids"
                  d={side === 'L' ? 'M79.4 92.2h17.2v7.2H79.4z' : 'M104.4 92.2h17.2v7.2h-17.2z'}
                  fill={side === 'L' ? sk.base : sk.mid}
                  style={{ animationDelay: origin.length * 0.37 + 's' }}
                />
              ) : null}
            </g>
          );
        })}
        <path d={f.browL} fill="none" stroke={L.brow} strokeWidth={L.male ? 3.6 : 3} strokeLinecap="round" />
        <path d={f.browR} fill="none" stroke={L.brow} strokeWidth={L.male ? 3.6 : 3} strokeLinecap="round" />

        {/* nariz e boca */}
        <path d="M101.6 99c.4 6 1.8 11.6 3.4 15.4-1.6 1.6-4 2-6.2 1.4" fill="none" stroke={sk.sh} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M94 133.6c3.4 1.6 9.2 1.6 12.4 0" fill="none" stroke={L.lip} strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
        <path d={f.mouth} fill="none" stroke={L.lip} strokeWidth="1.9" strokeLinecap="round" />

        {L.face?.(url)}
        {L.hairFront?.(url)}
        {L.top?.(url)}

        <rect x="0" y="0" width="200" height="240" fill={url('scan')} opacity={small ? 0 : 0.2} />
        <rect x="0" y="0" width="200" height="240" fill={url('vig')} />
      </g>
    </svg>
  );
}

export interface DirectorCardProps {
  origin: DirectorOrigin;
  mood?: DirectorMood;
  /** largura do cartão em px */
  width?: number;
  selected?: boolean;
  /** código de arquivo no rodapé */
  code?: string;
  className?: string;
  style?: CSSProperties;
}

/** Cartão de seleção de Origem: retrato com moldura de dossiê, nome e código. Sem texto de regras. */
export function DirectorCard({ origin, mood = 'neutral', width = 320, selected = false, code, className, style }: DirectorCardProps) {
  const info = ORIGIN_INFO[origin];
  const c = selected ? 'var(--sl-warm)' : 'var(--sl-line-strong)';
  return (
    <figure
      className={className}
      style={{
        position: 'relative',
        margin: 0,
        width,
        background: 'var(--sl-surface)',
        border: `1px solid ${selected ? 'var(--sl-warm)' : 'var(--sl-line)'}`,
        boxShadow: selected ? 'var(--sl-glow-warm)' : 'var(--sl-shadow-2)',
        transition: 'box-shadow var(--sl-dur-base) var(--sl-ease-out), border-color var(--sl-dur-base) var(--sl-ease-out)',
        ...style,
      }}
    >
      <DirectorPortrait origin={origin} mood={mood} size={width - 2} crop="bust" style={{ display: 'block' }} />
      {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
        <span
          key={k}
          aria-hidden
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderColor: c,
            borderStyle: 'solid',
            borderWidth: `${k[0] === 't' ? 2 : 0}px ${k[1] === 'r' ? 2 : 0}px ${k[0] === 'b' ? 2 : 0}px ${k[1] === 'l' ? 2 : 0}px`,
            top: k[0] === 't' ? -1 : undefined,
            bottom: k[0] === 'b' ? -1 : undefined,
            left: k[1] === 'l' ? -1 : undefined,
            right: k[1] === 'r' ? -1 : undefined,
          }}
        />
      ))}
      <figcaption
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '28px 14px 10px',
          background: 'linear-gradient(transparent, rgba(5,6,8,0.92) 45%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 'var(--sl-fs-2xs)', letterSpacing: 'var(--sl-tracking-label)', color: 'var(--sl-text-muted)', textTransform: 'uppercase' }}>
          {code ?? `Origem · ${String(DIRECTOR_ORIGINS.indexOf(origin) + 1).padStart(2, '0')}`}
        </span>
        <span style={{ fontFamily: 'var(--sl-font-display)', fontWeight: 700, fontSize: Math.max(18, width * 0.085), lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.04em', color: selected ? 'var(--sl-warm)' : 'var(--sl-text)' }}>
          {info.label}
        </span>
      </figcaption>
    </figure>
  );
}
