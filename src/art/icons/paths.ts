/**
 * Desenho dos ícones do jogo. Grade 24×24, área útil 2..22, traço herdado do <svg>
 * (currentColor, cantos/pontas redondos). Cada ícone é markup SVG interno:
 *  - `base`: sempre desenhado; legível a 20px.
 *  - `detail`: só a partir de ~40px (rebites, painéis, hachuras).
 * O acento (`--sl-icon-accent`) marca a parte "quente" de cada ícone.
 */

export interface IconDef {
  base: string;
  detail?: string;
  /** Rótulo pt-BR curto para galeria/aria. */
  label: string;
  group: IconGroup;
}

export type IconGroup =
  | 'pessoal'
  | 'veiculos'
  | 'aeronaves'
  | 'cargueiros'
  | 'armamento'
  | 'informacao'
  | 'adm'
  | 'estacoes'
  | 'sistemas'
  | 'taticas'
  | 'combate'
  | 'estados'
  | 'origens';

// ── primitivas de markup ─────────────────────────────────────────────
const ACC = 'style="stroke:var(--sl-icon-accent,currentColor)"';
const ACCF = 'style="fill:var(--sl-icon-accent,currentColor)" stroke="none"';
/** contorno com preenchimento tênue */
const S = (d: string) => `<path d="${d}" fill="currentColor" fill-opacity=".14"/>`;
/** só contorno */
const P = (d: string) => `<path d="${d}"/>`;
/** contorno no acento */
const A = (d: string) => `<path d="${d}" ${ACC}/>`;
/** preenchido no acento */
const AF = (d: string) => `<path d="${d}" ${ACCF}/>`;
/** preenchido na cor do traço */
const F = (d: string) => `<path d="${d}" fill="currentColor" stroke="none"/>`;
const C = (cx: number, cy: number, r: number, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
const CT = (cx: number, cy: number, r: number) => C(cx, cy, r, 'fill="currentColor" fill-opacity=".14"');
const CA = (cx: number, cy: number, r: number) => C(cx, cy, r, ACC);
const CAF = (cx: number, cy: number, r: number) => C(cx, cy, r, ACCF);
/** detalhe fino (meio traço) */
const H = (d: string) => `<path d="${d}" stroke-width=".75" opacity=".7"/>`;

const r1 = (n: number) => Math.round(n * 100) / 100;
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`;
};
/** setor de anel (graus, 0 = leste, horário) */
const sector = (cx: number, cy: number, ri: number, ro: number, a0: number, a1: number) =>
  `M${pt(cx, cy, ri, a0)}L${pt(cx, cy, ro, a0)}A${ro} ${ro} 0 0 1 ${pt(cx, cy, ro, a1)}L${pt(cx, cy, ri, a1)}A${ri} ${ri} 0 0 0 ${pt(cx, cy, ri, a0)}Z`;
const star = (cx: number, cy: number, ro: number, ri: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) d += (i ? 'L' : 'M') + pt(cx, cy, i % 2 ? ri : ro, -90 + i * 36);
  return d + 'Z';
};

/** barras de patente no canto superior esquerdo (1..3) */
const pips = (n: number) => {
  let d = '';
  for (let i = 0; i < n; i++) d += `M2.6 ${r1(3 + i * 2.1)}h2.8`;
  return d ? A(d) : '';
};

// ── busto base do Pessoal ────────────────────────────────────────────
const SHOULDERS = 'M4.5 21.5v-1.8a5.6 5.6 0 0 1 5.6-5.6h3.8a5.6 5.6 0 0 1 5.6 5.6v1.8';
const bust = (head = true) => S(SHOULDERS) + (head ? CT(12, 8.2, 3.6) + C(12, 8.2, 3.6) : '');
const TIE = 'M12 14.3l-1 1.6 1 4 1-4z';

// ── chassis de veículos (perfil, virado à direita) ───────────────────
const wheel = (x: number, y = 17.6, r = 1.9) => CT(x, y, r) + C(x, y, r) + C(x, y, 0.5, 'fill="currentColor"');
const TRACK = 'M4 15.6h16a2.1 2.1 0 0 1 0 4.2H4a2.1 2.1 0 0 1 0-4.2z';
const trackWheels = H('M5.5 17.7h.01M8.5 17.7h.01M11.5 17.7h.01M14.5 17.7h.01M17.5 17.7h.01') ;
const GROUND = H('M1.5 21h21');

// ── aeronaves vistas de cima (nariz para cima) ───────────────────────
const fighterLight =
  'M12 2.5C13 3.7 13.4 5.5 13.4 7.5V10L21 14.6v1.6l-7.6-1.4v2.8l2.8 2.2v1.4l-4.2-1-4.2 1v-1.4l2.8-2.2v-2.8L3 16.2v-1.6L10.6 10V7.5C10.6 5.5 11 3.7 12 2.5z';
const fighterMulti =
  'M12 2C12.9 3.4 13.3 5 13.3 7v2l8.2 6.5V17l-7-.8 1 2.3 2 1V21l-5.5-1-5.5 1v-1.5l2-1 1-2.3-7 .8v-1.5L10.7 9V7c0-2 .4-3.6 1.3-5z';
const fighterStealth = 'M12 2.5l2.6 6 6.9 6.5-2 2.5-4.5-1.5-1.5 4.5L12 19l-1.5 1.5L9 16l-4.5 1.5-2-2.5 6.9-6.5z';
const bomberShape =
  'M12 2c.8 1 1.1 2.5 1.1 4.5V9l9.4 5.2v1.5l-9.4-2.4v4.4l3.4 2.4v1.5l-4.5-1-4.5 1v-1.5l3.4-2.4v-4.4l-9.4 2.4v-1.5L10.9 9V6.5C10.9 4.5 11.2 3 12 2z';

const cargoTurbo =
  'M12 2.5c1.2 0 1.7 1.4 1.7 3.4v2.6h7.8v2.2h-7.8v6.4l3.1 1.4v1.6h-3.1L12 21.6l-1.7-1.5H7.2v-1.6l3.1-1.4v-6.4H2.5V8.5h7.8V5.9c0-2 .5-3.4 1.7-3.4z';
const cargoMid =
  'M12 2.2c1.1 0 1.6 1.4 1.6 3.4v3.6l8 4.8v1.6l-8-2.2v4.2l2.9 1.8v1.4L12 20l-4.5.8v-1.4l2.9-1.8v-4.2l-8 2.2V14l8-4.8V5.6c0-2 .5-3.4 1.6-3.4z';
const cargoWide =
  'M12 1.8c1.5 0 2.2 1.6 2.2 3.8V9l7.8 4.2V15l-7.8-1.6v4l3.2 1.9v1.5L12 20l-5.4.8v-1.5l3.2-1.9v-4L2 15v-1.8L9.8 9V5.6c0-2.2.7-3.8 2.2-3.8z';

export const ICONS: Record<string, IconDef> = {
  // ═══ Pessoal ═══════════════════════════════════════════════════════
  bodyguard: {
    label: 'Guarda-costas',
    group: 'pessoal',
    base: bust() + F('M8.3 7.3h7.4v1.5a.6.6 0 0 1-.6.6h-2.1l-.6-.8-.6.8H8.9a.6.6 0 0 1-.6-.6z') + P(TIE) + A('M15.9 9.5c1.2.6 1.3 2.4.4 3.4'),
    detail: H('M9.2 14.4l2.8 3.2 2.8-3.2'),
  },
  thug: {
    label: 'Pistoleiro de Aluguel',
    group: 'pessoal',
    base:
      bust() +
      F('M8.4 7.6a3.6 3.6 0 0 1 7.2 0c0 .2-.9.4-3.6.4s-3.6-.2-3.6-.4z') +
      P('M10.2 14.2l1.8 2.4 1.8-2.4') +
      A('M14.2 18.2h6.2v1.6h-3.6l-.7 1.9h-1.6l.4-1.9h-.7z'),
  },
  police: {
    label: 'Policial Mercenário',
    group: 'pessoal',
    base:
      bust() +
      S('M7.4 6.4h9.2l-.9-2.6c-2.3-1-5.1-1-7.4 0z') +
      P('M7 6.4h10') +
      A('M8.6 16.3l1.4-.6 1.4.6v1.5c0 .9-.6 1.6-1.4 1.9-.8-.3-1.4-1-1.4-1.9z'),
  },
  swat: {
    label: 'Operador Tático',
    group: 'pessoal',
    base:
      S(SHOULDERS) +
      S('M7.8 9.6V8a4.2 4.2 0 0 1 8.4 0v1.6') +
      C(12, 9.4, 3.2) +
      A('M8.4 9.1h7.2') +
      S('M8.6 15.2h6.8v6.3H8.6z'),
    detail: H('M8.6 17.6h6.8M10.4 15.2v6.3M13.6 15.2v6.3'),
  },
  soldier: {
    label: 'Soldado Contratado',
    group: 'pessoal',
    base:
      bust() +
      S('M7.4 7.8a4.6 4.6 0 0 1 9.2 0l1 .3H6.4z') +
      P('M8 14.6l3 6.9M16 14.6l-3 6.9') +
      A('M10.6 18.4h2.8'),
  },
  commando: {
    label: 'Comando de Elite',
    group: 'pessoal',
    base:
      bust() +
      F('M8.2 6.3c.4-2 2.6-3 5-2.6 2 .3 3.3 1.3 3.2 2.3-2.4.6-5.9.7-8.2.3z') +
      A('M9 16.6l3 1.6 3-1.6M9 19.2l3 1.6 3-1.6'),
  },
  agent: {
    label: 'Agente de Campo',
    group: 'pessoal',
    base:
      bust() +
      F('M8.6 6.1l.7-2.8c1.8-.7 3.6-.7 5.4 0l.7 2.8z') +
      P('M6.2 6.1h11.6') +
      P('M8.8 14.4l3.2 4.4 3.2-4.4') +
      A('M12 18.8v2.7'),
  },
  lawyer1: {
    label: 'Advogado Associado',
    group: 'pessoal',
    base: bust() + P(TIE) + S('M14.3 16.6h6.2v4.6h-6.2z') + A('M16.2 16.6v-1.1h2.4v1.1') + pips(1),
  },
  lawyer2: {
    label: 'Advogada Sênior',
    group: 'pessoal',
    base: bust() + P(TIE) + S('M14.3 16.6h6.2v4.6h-6.2z') + A('M16.2 16.6v-1.1h2.4v1.1') + pips(2),
  },
  lawyer3: {
    label: 'Sócio de Escritório Internacional',
    group: 'pessoal',
    base: bust() + P(TIE) + S('M14.3 16.6h6.2v4.6h-6.2z') + A('M16.2 16.6v-1.1h2.4v1.1') + pips(3),
  },
  liaison1: {
    label: 'Agente de Influência',
    group: 'pessoal',
    base: bust() + A('M15.8 2.6h5.6a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8h-2.6l-1.8 1.6V7.6h-1.2a.8.8 0 0 1-.8-.8V3.4a.8.8 0 0 1 .8-.8z') + pips(1),
    detail: H('M17.2 5.1h3'),
  },
  liaison2: {
    label: 'Agente de Influência Veterano',
    group: 'pessoal',
    base: bust() + A('M15.8 2.6h5.6a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8h-2.6l-1.8 1.6V7.6h-1.2a.8.8 0 0 1-.8-.8V3.4a.8.8 0 0 1 .8-.8z') + pips(2),
    detail: H('M17.2 5.1h3'),
  },
  liaison3: {
    label: 'Mestre de Influência',
    group: 'pessoal',
    base: bust() + A('M15.8 2.6h5.6a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8h-2.6l-1.8 1.6V7.6h-1.2a.8.8 0 0 1-.8-.8V3.4a.8.8 0 0 1 .8-.8z') + pips(3),
    detail: H('M17.2 5.1h3'),
  },
  director: {
    label: 'Diretor',
    group: 'pessoal',
    base: bust() + P('M9 14.4l3 3.6 3-3.6') + A('M12 16.6l-.9 1.3.9 3.6.9-3.6z'),
    detail: AF(star(12, 3.2, 1.3, 0.55)),
  },

  // ═══ Veículos ══════════════════════════════════════════════════════
  patrolcar: {
    label: 'Viatura Interceptadora',
    group: 'veiculos',
    base: S('M2.3 17v-2.6l2.4-.8 2.8-3.4h8l3.6 3.4 2.6.8V17z') + wheel(6.8) + wheel(17.2) + A('M10 9.3h3.6') + P('M9.6 10.3v3.3'),
    detail: GROUND + H('M8 13.6h11'),
  },
  technical: {
    label: 'Picape Armada',
    group: 'veiculos',
    base: S('M2.3 17v-4h8.2V9.5h5l3 3.5 3.2.6V17z') + wheel(6.6) + wheel(17.6) + P('M6 13V9.6') + A('M2.6 9.4h7.6M4.2 9.4V8.2'),
    detail: GROUND + H('M11.8 10.8h2.8l1.8 2.2h-4.6z'),
  },
  apc: {
    label: 'Blindado 6x6',
    group: 'veiculos',
    base: S('M2.3 16.6v-4.4l2.2-2.8h11.8l3.6 2.8h1.8v4.4z') + wheel(5.6) + wheel(11) + wheel(16.4) + A('M8 9.4V7.8h3.4v1.6') ,
    detail: GROUND + H('M4 12.2h16M13.5 9.4v2.8'),
  },
  ifv: {
    label: 'Blindado de Combate',
    group: 'veiculos',
    base: S(TRACK) + S('M3 15.6l1.6-3.2h14.8l1.6 3.2') + S('M8.4 12.4V10h5.8l1.4 2.4') + A('M14.6 11h7') + trackWheels,
    detail: GROUND + H('M10 10V8.8h1.6'),
  },
  tank1: {
    label: 'Carro de Combate Clássico',
    group: 'veiculos',
    base: S(TRACK) + S('M2.6 15.6l2-3.2h14.8l2 3.2') + S('M7.2 12.4a4.8 3.8 0 0 1 9.6 0') + A('M16 10h6.4') + trackWheels,
    detail: GROUND + H('M11 8.8v-1h1.6'),
  },
  tank3: {
    label: 'Tanque de 4ª Geração',
    group: 'veiculos',
    base: S(TRACK) + S('M2.6 15.6l1.6-3.2h15.6l1.6 3.2') + S('M6.4 12.4l1.2-3.2h8.8l1.8 3.2z') + A('M18 10.6h4.4M21.6 9.8v1.6') + trackWheels,
    detail: GROUND + H('M9 9.2V8h2.4v1.2M14 9.2v-.8'),
  },
  sam1: {
    label: 'Bateria Antiaérea Móvel',
    group: 'veiculos',
    base:
      S('M15.4 17.2v-4.8h3.2l2.9 2.8v2z') +
      S('M2.3 17.2v-2.6h13.1') +
      wheel(5.4) +
      wheel(9.6) +
      wheel(18.4) +
      A('M3.6 13.2l8.4-5.4 1.1 1.7-8.4 5.4zM5.4 10.6l7-4.5') ,
    detail: GROUND,
  },
  sam3: {
    label: 'Sistema SAM de Longo Alcance',
    group: 'veiculos',
    base:
      S('M2.3 17.2v-3h17.4v3') +
      wheel(5) +
      wheel(9.4) +
      wheel(16.6) +
      S('M5.2 14.2l4.2-9.6 3.6 1.6-3.4 8') +
      A('M9.4 4.6l3.6 1.6') +
      P('M17.5 14.2V9.4') +
      A('M15.2 8.6a3.2 3.2 0 0 0 4.6-2.4') ,
    detail: GROUND + H('M7 10.4l3.6 1.6'),
  },

  // ═══ Aeronaves ═════════════════════════════════════════════════════
  heli1: {
    label: 'Helicóptero Utilitário',
    group: 'aeronaves',
    base:
      S('M3.4 14.2c0-2.3 1.9-4.2 4.2-4.2h6.2c2.1 0 3.8 1.6 3.8 3.6v1.4H3.4z') +
      P('M17.6 12.4h3.4l1-2.6') +
      A('M2.5 6.8h17') +
      P('M11 6.8V10M5 18.4h10.8M7 15v3.4M13.6 15v3.4') +
      P('M6.4 10.4l-.8 2.4h3.2v-2.6'),
    detail: H('M10.4 11.4h3.8v2.4h-3.8z'),
  },
  heli3: {
    label: 'Helicóptero de Ataque',
    group: 'aeronaves',
    base:
      S('M3.2 14.4l2.6-3.2h3.4l1.4-1.6h3l1.2 1.6h1.8l2.2 1.8H22v1.4z') +
      A('M3.5 7.4h16.5') +
      P('M11.6 7.4v2.2M9.4 16.6h5.4M2.4 15.6l1.6 1') +
      P('M8.6 14.4l-.4 2.2M14.8 14.4l.4 2.2') +
      P('M22 11.8v3.2'),
    detail: H('M10.6 10.8h3.6M5.6 13h2.6'),
  },
  jet1: { label: 'Caça Leve', group: 'aeronaves', base: S(fighterLight) + A('M12 4.6v3.2'), detail: H('M12 9.6v7') },
  jet2: { label: 'Caça Multimissão', group: 'aeronaves', base: S(fighterMulti) + A('M12 4.2v3.2'), detail: H('M10.3 10.4v4.2M13.7 10.4v4.2') },
  jet3: { label: 'Caça Furtivo', group: 'aeronaves', base: S(fighterStealth) + A('M11 7.2l1-2.4 1 2.4'), detail: H('M9.4 8.5 12 11l2.6-2.5M12 11v6') },
  bomber: {
    label: 'Bombardeiro Tático',
    group: 'aeronaves',
    base: S(bomberShape) + A('M12 9.6v6.6') + P('M7 12.6v1.8M17 12.6v1.8'),
    detail: H('M12 3.8v2.2'),
  },

  // ═══ Cargueiros ════════════════════════════════════════════════════
  cargo0: {
    label: 'Turboélice de Carga',
    group: 'cargueiros',
    base: S(cargoTurbo) + P('M6.2 8.5V7M17.8 8.5V7') + A('M4.4 6.9h3.6M16 6.9h3.6') + pips(0),
  },
  cargo1: {
    label: 'Jato de Carga Médio',
    group: 'cargueiros',
    base: S(cargoMid) + A('M6.6 12.2h1.6v2.4H6.6zM15.8 12.2h1.6v2.4h-1.6z') + pips(1),
  },
  cargo2: {
    label: 'Cargueiro Widebody',
    group: 'cargueiros',
    base: S(cargoWide) + A('M5.6 11.4h2v3h-2zM16.4 11.4h2v3h-2z') + pips(2),
    detail: H('M12 4.5v12'),
  },
  cargo3: {
    label: 'Cargueiro Estratégico',
    group: 'cargueiros',
    base:
      S('M12 1.8c1.7 0 2.5 1.7 2.5 4v1.8h8v2.4l-8 1v6.4l1.2 1.4h4.2v2H4.1v-2h4.2l1.2-1.4V11l-8-1V7.6h8V5.8c0-2.3.8-4 2.5-4z') +
      A('M4.2 10.6v2M7.4 11v2M16.6 11v2M19.8 10.6v2') +
      pips(3),
    detail: H('M12 4.6v13'),
  },
  fleet: {
    label: 'Frota',
    group: 'cargueiros',
    base:
      S('M8 2.2c.9 0 1.3 1.1 1.3 2.6v2.4l5.4 3.4v1.3l-5.4-1.5v3l2 1.3v1.1L8 15.2l-3.3.6v-1.1l2-1.3v-3L1.3 11.9v-1.3l5.4-3.4V4.8c0-1.5.4-2.6 1.3-2.6z') +
      A('M16.6 8.6c.8 0 1.2 1 1.2 2.3v2.2l4.9 3.1v1.2l-4.9-1.3v2.7l1.8 1.2v1l-3-.5-3 .5v-1l1.8-1.2v-2.7l-4.9 1.3v-1.2l4.9-3.1v-2.2c0-1.3.4-2.3 1.2-2.3z'),
  },

  // ═══ Armamento leve ════════════════════════════════════════════════
  rifles: {
    label: 'Fuzis de Assalto',
    group: 'armamento',
    base:
      S('M2.3 11.2l4.4-1.2h10.6V9.2h4.4v1.2h-4v1.6h-3.4l-.4.6c.2 1.5.8 2.8 1.6 3.7l-1.8 1.1c-1-1.3-1.6-2.8-1.7-4.4H9.6l-.7 1.9H7.3l.4-1.9-5.4 1.4z') +
      A('M13.6 12.6c.2 1.5.8 2.8 1.6 3.7l-1.8 1.1c-1-1.3-1.6-2.8-1.7-4.4') +
      P('M14 9.2V8.2h4.6'),
    detail: H('M7.2 10h4'),
  },
  mg: {
    label: 'Metralhadoras',
    group: 'armamento',
    base:
      S('M2.3 10.6l3.6-.6h9.4v-.8h6.4v1.2h-6v2H8.6l-.7 1.9H6.3l.3-1.9-4.3.6z') +
      P('M17.2 10.4l-1.6 6M17.2 10.4l1.6 6') +
      S('M9.4 12.4h3.6v3.2H9.4z') +
      A('M13 14.2c1.4.4 2 1.4 1.6 3.4'),
    detail: H('M9.4 14h3.6'),
  },
  rpg: {
    label: 'Lança-foguetes',
    group: 'armamento',
    base:
      S('M2.3 10.9h12.8v2.2H2.3z') +
      A('M15.1 10.2l3.4-.9c2.2.5 3.4 1.6 3.4 2.7s-1.2 2.2-3.4 2.7l-3.4-.9z') +
      P('M7.6 13.1v3M10.8 13.1v2.4M8.6 10.9V8.8h1.8'),
    detail: H('M4.4 10.9v2.2M13 10.9v2.2'),
  },
  atgm: {
    label: 'Mísseis Antitanque Guiados',
    group: 'armamento',
    base:
      S('M4.2 10.8h12.4c1.7 0 4.5.6 5.1 1.2-.6.6-3.4 1.2-5.1 1.2H4.2z') +
      P('M9 10.8 7.6 7.6h2l2 3.2M9 13.2l-1.4 3.2h2l2-3.2') +
      P('M4.2 10.8 2.6 8.8M4.2 13.2l-1.6 2') +
      A('M2.6 12c-.8 1.6.6 3-.2 4.6s.8 3.2 0 4.6'),
    detail: H('M15 10.8v2.4'),
  },

  // ═══ Informação e programas ════════════════════════════════════════
  intel: {
    label: 'Relatório de Inteligência',
    group: 'informacao',
    base: S('M4.5 2.5h9.2l4 4v15h-13.2z') + P('M13.7 2.5v4h4M7.4 9h7M7.4 12h5') + CT(15.6, 16, 3) + CA(15.6, 16, 3) + A('M17.8 18.2l3.2 3.2'),
    detail: H('M7.4 15h3'),
  },
  docs: {
    label: 'Documentação Técnica',
    group: 'informacao',
    base:
      S('M2.5 4.5h16.4l2.6 2.6v12.4h-19z') +
      A('M12 8.6v7.8M8.1 12.5h7.8') +
      C(12, 12.5, 3.2) +
      P('M5 17.4h3M5 17.4v-1M8 17.4v-1'),
    detail: H('M2.5 8h19M2.5 11.5h19M2.5 15h19M6 4.5v15M9.5 4.5v15M13 4.5v15M16.5 4.5v15'),
  },
  secret: {
    label: 'Segredo de Estado',
    group: 'informacao',
    base: S('M2.5 5.6h6.6l1.8 2h10.6v12.8h-19z') + F('M5.4 11.2h9v1.8h-9zM5.4 14.6h6v1.8h-6z') + CAF(17.6, 16.2, 2.4),
    detail: H('M2.5 9.2h19'),
  },
  tech: {
    label: 'Pacote de Tecnologia',
    group: 'informacao',
    base:
      S('M6.5 6.5h11v11h-11z') +
      P('M9.5 6.5v-3M12 6.5v-3M14.5 6.5v-3M9.5 17.5v3M12 17.5v3M14.5 17.5v3M6.5 9.5h-3M6.5 12h-3M6.5 14.5h-3M17.5 9.5h3M17.5 12h3M17.5 14.5h3') +
      AF('M9.6 9.6h4.8v4.8H9.6z'),
    detail: H('M7.8 7.8h.01'),
  },
  space: {
    label: 'Programa Espacial',
    group: 'informacao',
    base:
      S('M12 8.6 15.4 12 12 15.4 8.6 12z') +
      S('M2.6 6.2 6.2 2.6 9.4 5.8 5.8 9.4z') +
      S('M14.6 18.2l3.6-3.6 3.2 3.2-3.6 3.6z') +
      P('M7.6 7.6l2.2 2.2M14.2 14.2l2.2 2.2') +
      A('M14.6 6.2a3.4 3.4 0 0 1 3.2 3.2M15.4 2.6a7 7 0 0 1 6 6'),
    detail: H('M4.4 4.4l3.2 3.2M16.4 16.4l3.2 3.2'),
  },

  // ═══ Armas de Destruição em Massa ══════════════════════════════════
  chem: {
    label: 'Agente Químico',
    group: 'adm',
    base:
      P('M9.2 2.5h5.6M10.2 2.6v6L4.8 18.8a1.8 1.8 0 0 0 1.6 2.7h11.2a1.8 1.8 0 0 0 1.6-2.7l-5.4-10.2v-6') +
      AF('M7.5 14h9l2.3 4.4c.4.9-.2 1.9-1.2 1.9H6.4c-1 0-1.6-1-1.2-1.9z') +
      C(12.6, 10.6, 0.7, 'fill="currentColor" stroke="none"') +
      C(11, 12.2, 0.5, 'fill="currentColor" stroke="none"'),
  },
  bio: {
    label: 'Agente Biológico',
    group: 'adm',
    base:
      CA(12, 8.2, 4.6) +
      CA(8.4, 14.4, 4.6) +
      CA(15.6, 14.4, 4.6) +
      C(12, 12.3, 2.4, 'fill="currentColor" fill-opacity=".14"') +
      C(12, 12.3, 1, 'fill="currentColor" stroke="none"'),
  },
  nuclear: {
    label: 'Material Nuclear',
    group: 'adm',
    base:
      C(12, 12, 9.6) +
      AF(sector(12, 12, 2.6, 8.4, -120, -60)) +
      AF(sector(12, 12, 2.6, 8.4, 0, 60)) +
      AF(sector(12, 12, 2.6, 8.4, 120, 180)) +
      C(12, 12, 1.4, 'fill="currentColor" stroke="none"'),
  },

  // ═══ Estações por Nível ════════════════════════════════════════════
  'station-cell': {
    label: 'Estação · Célula',
    group: 'estacoes',
    base: P('M2 20.6h20') + S('M8.6 20.6v-6.2h6.8v6.2') + P('M12 14.4V8.6') + A('M9.4 7a3.6 3.6 0 0 1 5.2 0M7.6 5a6.2 6.2 0 0 1 8.8 0'),
    detail: H('M11 20.6v-3h2v3'),
  },
  'station-safehouse': {
    label: 'Estação · Casa Segura',
    group: 'estacoes',
    base: P('M2 20.6h20') + S('M5 20.6v-8.8l7-5.6 7 5.6v8.8') + P('M10.4 20.6v-4.4h3.2v4.4') + A('M15.6 8.4V5.2h1.8v4.6'),
    detail: H('M7 13.2h2v2H7zM15 13.2h2v2h-2z'),
  },
  'station-office': {
    label: 'Estação · Escritório',
    group: 'estacoes',
    base:
      P('M2 20.6h20') +
      S('M5.4 20.6V4.2h9.2v16.4') +
      S('M14.6 9.2h4.4v11.4') +
      P('M7.8 7.4h4.4M7.8 10.4h4.4M7.8 13.4h4.4M7.8 16.4h4.4') +
      A('M10 4.2V2'),
    detail: H('M16 12h1.6M16 15h1.6'),
  },
  'station-compound': {
    label: 'Estação · Complexo',
    group: 'estacoes',
    base:
      P('M2 20.6h20') +
      S('M4.6 15V7.6h6V15') +
      S('M12.6 15V4.6h6.8V15') +
      S('M2.4 20.6V15h19.2v5.6') +
      A('M10 20.6v-3h4v3') +
      P('M14.8 7.4h2.4M14.8 10.2h2.4'),
    detail: H('M2.4 17.6h4M17.6 17.6h4M6.4 10h2.2'),
  },
  'station-base': {
    label: 'Estação · Base',
    group: 'estacoes',
    base:
      P('M2 20.6h20') +
      S('M2.4 20.6v-8h2.2v1.8h2.2v-1.8H9v1.8h2.2v-1.8h2.2v8') +
      S('M15.2 20.6V9.6h4.6v11') +
      A('M14.6 6a3 3 0 0 0 4.2 1.4') +
      P('M17.5 9.6V7.4') +
      A('M5.8 12.6V4.4l3.6 1.4-3.6 1.4'),
    detail: H('M16.4 12.4h2.2M16.4 15h2.2'),
  },

  // ═══ Sistemas ══════════════════════════════════════════════════════
  reputation: {
    label: 'Reputação',
    group: 'sistemas',
    base: P('M8.2 2.5l2.6 6.4M15.8 2.5l-2.6 6.4') + CT(12, 14.6, 6) + C(12, 14.6, 6) + AF(star(12, 14.8, 3.4, 1.45)),
  },
  'stance-ally': {
    label: 'Postura · Aliado',
    group: 'sistemas',
    base: S('M12 2.5l7.6 3v6c0 4.6-3.2 8.4-7.6 10-4.4-1.6-7.6-5.4-7.6-10v-6z') + A('M8.4 12.2l2.6 2.6 4.8-5.2'),
  },
  'stance-neutral': {
    label: 'Postura · Neutro',
    group: 'sistemas',
    base: S('M12 2.5l7.6 3v6c0 4.6-3.2 8.4-7.6 10-4.4-1.6-7.6-5.4-7.6-10v-6z') + A('M8.4 12h7.2'),
  },
  'stance-enemy': {
    label: 'Postura · Inimigo do Estado',
    group: 'sistemas',
    base: S('M12 2.5l7.6 3v6c0 4.6-3.2 8.4-7.6 10-4.4-1.6-7.6-5.4-7.6-10v-6z') + A('M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6'),
  },
  exposure: {
    label: 'Exposição',
    group: 'sistemas',
    base:
      S('M2.4 13s3.6-6.4 9.6-6.4 9.6 6.4 9.6 6.4-3.6 6.4-9.6 6.4S2.4 13 2.4 13z') +
      CAF(12, 13, 3) +
      C(12, 13, 1.1, 'fill="currentColor" stroke="none" style="fill:var(--sl-bg,#0b0e12)"') +
      P('M12 1.8v2.2M5.6 3.4l1.3 1.8M18.4 3.4l-1.3 1.8'),
  },
  threat: {
    label: 'Ameaça',
    group: 'sistemas',
    base: CT(12, 12, 8) + C(12, 12, 8) + P('M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22') + A('M12 8.4v4.4') + CAF(12, 15.6, 1.1),
  },
  tension: {
    label: 'Tensão Global',
    group: 'sistemas',
    base:
      CT(12, 12, 9.4) +
      C(12, 12, 9.4) +
      P('M12 2.6c-2.8 2.6-4 5.8-4 9.4s1.2 6.8 4 9.4M12 2.6c2.8 2.6 4 5.8 4 9.4s-1.2 6.8-4 9.4') +
      A('M2.6 12.6h4.2l1.8-3.6 3 7.4 2.4-5.4 1.4 1.6h6'),
  },
  'final-crisis': {
    label: 'Crise Final',
    group: 'sistemas',
    base: CT(12, 12, 9.4) + C(12, 12, 9.4) + P('M2.6 12h6M15.4 12h6M12 2.6c-2.4 2.6-3.4 5.8-3.4 9.4') + A('M13.4 2.8l-2 5.6 3 2-3.2 4.2 1.6 1.2-1.6 5.6'),
  },
  contract: {
    label: 'Contrato',
    group: 'sistemas',
    base:
      S('M4.5 2.5h10l4 4v15h-14z') +
      P('M14.5 2.5v4h4M7.4 8.6h6M7.4 11.4h8') +
      P('M7.2 17c1-1.6 2-1.6 2.4 0s1.6 1.4 2.6-.6') +
      CAF(16, 17.4, 2.4) +
      A('M15 19.6l-.6 2.4M17 19.6l.6 2.4'),
  },
  vault: {
    label: 'Cofre',
    group: 'sistemas',
    base:
      S('M2.8 3.2h18.4v15.4H2.8z') +
      P('M5.6 18.6v2.2M18.4 18.6v2.2') +
      C(11, 10.9, 4.2) +
      A('M11 6.7v1.6M11 13.5v1.6M6.8 10.9h1.6M13.6 10.9h1.6') +
      CAF(11, 10.9, 1.4) +
      A('M18.2 8.6v4.6'),
  },
  team: {
    label: 'Equipe',
    group: 'sistemas',
    base:
      C(6.2, 8, 2.4) +
      C(17.8, 8, 2.4) +
      P('M1.8 17.6v-1a4 4 0 0 1 4-4h1.4M22.2 17.6v-1a4 4 0 0 0-4-4h-1.4') +
      CT(12, 9.4, 3) +
      CA(12, 9.4, 3) +
      S('M6.6 21.4v-1.6a4.8 4.8 0 0 1 4.8-4.8h1.2a4.8 4.8 0 0 1 4.8 4.8v1.6'),
  },
  crate: {
    label: 'Carga',
    group: 'sistemas',
    base: S('M3 7.2 12 3l9 4.2v9.6L12 21l-9-4.2z') + P('M3 7.2l9 4.2 9-4.2M12 11.4V21') + A('M7.4 5.1l9 4.2'),
    detail: H('M5 12.6l5 2.3M5 15l5 2.3'),
  },
  money: {
    label: 'Dinheiro',
    group: 'sistemas',
    base: S('M2.5 6.5h19v11h-19z') + P('M2.5 9.4a3 3 0 0 0 3-2.9M18.5 6.5a3 3 0 0 0 3 2.9M2.5 14.6a3 3 0 0 1 3 2.9M18.5 17.5a3 3 0 0 1 3-2.9') + CA(12, 12, 2.8),
    detail: H('M12 10.4v3.2'),
  },
  event: {
    label: 'Evento',
    group: 'sistemas',
    base: P('M12 21.5V11M8.6 21.5 12 11l3.4 10.5M9.6 17.6h4.8') + CAF(12, 9.4, 1.6) + A('M8.4 6a5 5 0 0 0 0 6.8M15.6 6a5 5 0 0 1 0 6.8M5.6 3.4a9 9 0 0 0 0 12M18.4 3.4a9 9 0 0 1 0 12'),
  },
  rival: {
    label: 'Agência Rival',
    group: 'sistemas',
    base: S('M4 3.5h9.5l-2 4.2 2 4.2H4z') + P('M4 3.5v18') + A('M20 12.5h-9.5l2 4.2-2 4.2H20z'),
  },
  clock: {
    label: 'Prazo',
    group: 'sistemas',
    base: CT(12, 13, 8) + C(12, 13, 8) + P('M12 8.4V13l3 2') + A('M9.6 2.5h4.8M12 2.5v2.5'),
  },
  forecast: {
    label: 'Prévia',
    group: 'sistemas',
    base: S('M3 20.5v-4h3.6v4M10.2 20.5v-8h3.6v8M17.4 20.5V8h3.6v12.5') + A('M3.6 11 9 6l4 3 7.4-6.4') + A('M16.6 2.6h3.8v3.8'),
  },
  'special-op': {
    label: 'Operação Especial',
    group: 'sistemas',
    base: S('M5.4 11.6c0-4.6 3-8.2 6.6-8.2s6.6 3.6 6.6 8.2v5.6c0 2.4-3 4.3-6.6 4.3s-6.6-1.9-6.6-4.3z') + AF('M7.4 10.4h3.8v2.2H7.4zM12.8 10.4h3.8v2.2h-3.8z') + P('M10 17.4h4'),
  },
  coup: {
    label: 'Golpe',
    group: 'sistemas',
    base: S('M4 9.4 7.6 12 12 5.6l4.4 6.4L20 9.4l-1.6 8.4H5.6z') + P('M5.6 20.6h12.8') + A('M13.6 5.8l-2.2 4.4 2 1.6-2.4 3.6'),
  },
  neutralization: {
    label: 'Neutralização',
    group: 'sistemas',
    base: C(12, 12, 7.6) + P('M12 2v4M12 18v4M2 12h4M18 12h4') + A('M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2'),
  },

  // ═══ Táticas ═══════════════════════════════════════════════════════
  'tactic-assault': {
    label: 'Tática · Assalto',
    group: 'taticas',
    base: P('M2.8 6.4 8.4 12l-5.6 5.6') + P('M8.6 6.4l5.6 5.6-5.6 5.6') + A('M14.4 6.4 20 12l-5.6 5.6'),
  },
  'tactic-hold': {
    label: 'Tática · Defensiva',
    group: 'taticas',
    base: S('M2.6 20.6V8.6h3v2.2h3.2V8.6h3v2.2H15V8.6h3v2.2h3.4v9.8') + A('M2.6 15.4h18.8') + P('M8.6 15.4v5.2M15.4 15.4v5.2M12 10.8v4.6'),
  },
  'tactic-infiltrate': {
    label: 'Tática · Infiltração',
    group: 'taticas',
    base:
      S('M9.4 2.6h3.8v11.6H9.4z') +
      `<path d="M3 19.8c5.4.2 10-.6 13-3.6 2.8-2.8 3.6-6.6 3.8-10.6" stroke-dasharray="2.2 2.6" ${ACC}/>` +
      A('M17.4 7.6l2.4-2.8 2.2 2.8'),
    detail: H('M9.4 6.4h3.8M9.4 10.2h3.8'),
  },
  'tactic-negotiate': {
    label: 'Tática · Negociar',
    group: 'taticas',
    base:
      S('M2.5 4.2h11a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1H8l-3.2 2.8v-2.8H3.5a1 1 0 0 1-1-1V5.2a1 1 0 0 1 1-1z') +
      A('M16.8 9.6h3.7a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1h-1.3v2.8L16 17.8h-5.5a1 1 0 0 1-1-1v-2'),
    detail: H('M5.6 7.6h6M5.6 9.4h3.6'),
  },

  // ═══ Tipos de Combate ══════════════════════════════════════════════
  'combat-legal': {
    label: 'Combate · Jurídico',
    group: 'combate',
    base: S('M6.2 4.6l4.2-2.4 3.4 5.8-4.2 2.4z') + P('M12 9.2l6.6 11.4') + S('M3 20.6h10v-2.2H3z') + A('M5.4 3l6 10.4'),
  },
  'combat-urban': {
    label: 'Combate · Urbano',
    group: 'combate',
    base: P('M2 20.6h20') + S('M3.4 20.6V11h4v9.6M9.4 20.6V4.6h5.2v16M16.6 20.6V8.4h4v12.2') + A('M11 7.6h2M11 10.6h2M11 13.6h2'),
    detail: H('M4.6 13.4h1.6M4.6 16h1.6M17.8 11h1.6M17.8 13.6h1.6'),
  },
  'combat-army': {
    label: 'Combate · Militar',
    group: 'combate',
    base:
      P('M7.6 16.4 19.4 4.6M16.4 16.4 4.6 4.6') +
      P('M5.8 14.6l3.6 3.6M18.2 14.6l-3.6 3.6') +
      P('M7.6 16.4l-3 3M16.4 16.4l3 3') +
      AF(star(12, 19.4, 2.7, 1.15)),
  },
  'combat-air': {
    label: 'Combate · Aéreo',
    group: 'combate',
    base:
      S('M12 5.4c.6.7.9 1.9.9 3.2v1.6l5.2 3.2v1.2l-5.2-1v1.9l1.9 1.5v1l-2.8-.6-2.8.6v-1l1.9-1.5v-1.9l-5.2 1v-1.2l5.2-3.2V8.6c0-1.3.3-2.5.9-3.2z') +
      A('M3.6 7a10 10 0 0 1 4-4.2M20.4 7a10 10 0 0 0-4-4.2M2.4 13a10 10 0 0 0 1.6 5M21.6 13a10 10 0 0 1-1.6 5'),
  },

  // ═══ Estados ═══════════════════════════════════════════════════════
  seized: {
    label: 'Interditada',
    group: 'estados',
    base: S('M5 10.6h14v10.8H5z') + P('M8 10.6V7.4a4 4 0 0 1 8 0v3.2') + A('M3 14l18 4.4') + CAF(12, 16, 1.4),
  },
  detained: {
    label: 'Detido',
    group: 'estados',
    base:
      CT(7, 15.8, 4.4) +
      C(7, 15.8, 4.4) +
      CT(17, 8.2, 4.4) +
      C(17, 8.2, 4.4) +
      S('M8.6 10.4h3v1.6h-3zM12.4 13.6h3v1.6h-3z') +
      A('M10.6 12.6l1.4-1.2 1.4 1.2'),
    detail: H('M4.6 15.8a2.4 2.4 0 0 1 2.4-2.4M14.6 8.2a2.4 2.4 0 0 1 2.4-2.4'),
  },
  abducted: {
    label: 'Sequestrado',
    group: 'estados',
    base:
      S(SHOULDERS) +
      S('M7.6 13.2C6.4 8.6 7.8 2.8 12 2.8s5.6 5.8 4.4 10.4z') +
      A('M7.4 13.2h9.2M12 13.2l-1.4 3M12 13.2l1.4 3'),
    detail: H('M9.6 6.6c1.4-.8 3.4-.8 4.8 0'),
  },
  wounded: {
    label: 'Ferida',
    group: 'estados',
    base: S('M3.4 12a8.6 8.6 0 1 0 17.2 0 8.6 8.6 0 1 0-17.2 0z') + A('M3.4 12.4h4l1.6-3.6 2.8 7.2 2.4-5.2 1.4 1.6h5'),
  },
  damaged: {
    label: 'Danificada',
    group: 'estados',
    base: S('M14.6 3.4a4.4 4.4 0 0 0-4.4 5.8L3.4 16a2 2 0 0 0 2.8 2.8l6.8-6.8a4.4 4.4 0 0 0 5.8-4.4l-2.6 2.6-2.4-.6-.6-2.4z') + A('M15.4 15.6l2 2.4-1 1.6 2.6 2.6'),
  },
  // ═══ Origens do Diretor (emblemas de Vantagem/Desvantagem) ═════════
  'origin-field-agent': {
    label: 'Origem · Ex-Agente de Campo',
    group: 'origens',
    base: S('M3 6.5h18v12H3z') + S('M5.6 9.2h5v6.2h-5z') + P('M13 10h5.4M13 12.8h4M13 15.4h3') + A('M2.4 20.4 21.6 4.6'),
    detail: H('M8.1 10.4a1.3 1.3 0 1 1 0 .01'),
  },
  'origin-banker': {
    label: 'Origem · Banqueira de Genebra',
    group: 'origens',
    base: S('M12 2.4 17 9l-1.6 6.6h-6.8L7 9z') + P('M12 2.4v8.4') + CAF(12, 11.4, 1.3) + P('M8.6 15.6h6.8v2.8H8.6z') + A('M4 21.4c3.4-1.6 6-1.6 8 0s4.6 1.6 8 0'),
  },
  'origin-colonel': {
    label: 'Origem · Coronel da Reserva',
    group: 'origens',
    base: S('M3.4 11.4C4.6 6.6 8 4 12 4s7.4 2.6 8.6 7.4z') + S('M3.4 11.4h17.2v3H3.4z') + P('M3 14.4c3 2.4 6 3.4 9 3.4s6-1 9-3.4') + `<rect x="10" y="6.4" width="4" height="3" rx=".4" stroke-dasharray="1 1" ${ACC}/>`,
  },
  'origin-diplomat': {
    label: 'Origem · Diplomata Caída',
    group: 'origens',
    base:
      P('M8.6 20.6C4.6 18.4 2.8 14.6 3.2 10.4M15.4 20.6c4-2.2 5.8-6 5.4-10.2') +
      S('M4.4 15.4c1.4-.4 2.6.2 3 1.4-1.4.4-2.6-.2-3-1.4zM3.4 11.6c1.4-.6 2.6 0 3.2 1.2-1.4.6-2.6 0-3.2-1.2zM19.6 15.4c-1.4-.4-2.6.2-3 1.4 1.4.4 2.6-.2 3-1.4z') +
      CT(12, 9, 4.4) +
      C(12, 9, 4.4) +
      A('M12.6 4.4 11 8.2l2 1.6-1.4 3.8'),
  },
  'origin-smuggler': {
    label: 'Origem · Contrabandista',
    group: 'origens',
    base: S('M2.6 15.4h15.6v3H2.6z') + AF('M2.6 15.4h4.2v3H2.6z') + P('M20.4 15.4v3') + A('M17.4 12.4c-1.6-1.4-.4-2.8 1-3.6s1.6-2.6.4-3.8M20.6 11.6c-1-1 0-2 .8-2.6'),
  },
  'origin-sigint': {
    label: 'Origem · Analista de Sinais',
    group: 'origens',
    base: P('M3.8 14.6V12a8.2 8.2 0 0 1 16.4 0v2.6') + S('M2.8 13.6h3.6v6.4H2.8zM17.6 13.6h3.6v6.4h-3.6z') + A('M8.4 15.4l1.4-3.4 1.6 6 1.6-8 1.6 6.6 1-2.4'),
  },
};

export type GameIconId = keyof typeof ICONS;

/** Ícone representativo de cada `UnitClass` do catálogo. */
export const CLASS_ICON: Record<string, string> = {
  human: 'soldier',
  lawyer: 'lawyer2',
  influence: 'liaison2',
  vehicle: 'tank1',
  antiair: 'sam1',
  heli: 'heli1',
  jet: 'jet2',
  cargo: 'cargo1',
  arms: 'rifles',
  special: 'intel',
};

/** Ícone da Estação por Nível (0 = Célula … 4 = Base). */
export const STATION_TIER_ICON = [
  'station-cell',
  'station-safehouse',
  'station-office',
  'station-compound',
  'station-base',
] as const;

export const GROUP_LABEL: Record<IconGroup, string> = {
  pessoal: 'Pessoal',
  veiculos: 'Viaturas, blindados e antiaéreo',
  aeronaves: 'Helicópteros e caças',
  cargueiros: 'Cargueiros',
  armamento: 'Armamento leve',
  informacao: 'Informação e programas',
  adm: 'Armas de Destruição em Massa',
  estacoes: 'Estações por Nível',
  sistemas: 'Sistemas',
  taticas: 'Táticas',
  combate: 'Tipos de Combate',
  estados: 'Estados',
  origens: 'Origens do Diretor',
};
