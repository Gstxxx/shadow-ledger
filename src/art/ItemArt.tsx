import { useId, useState, type CSSProperties } from 'react';
import { GameIcon } from './icons/GameIcon';
import { OperativePortrait } from './portraits';
import { ITEM_PHOTOS } from './itemPhotos';

// ══════════════════════════════════════════════════════════════════════
// ItemArt — arte de um item do Mercado.
//  1. foto tratada em public/items/<id>-96.webp | <id>-480.webp, quando o id
//     está em ITEM_PHOTOS (equipamento: veículos, aeronaves, armamento);
//  2. senão, uma prancha ilustrada no estilo do kit (Pessoal = retrato duotone;
//     Informação e Armas de Destruição em Massa = ícone técnico sobre prancheta);
//  3. em tamanhos ≤ 40px, só o <GameIcon>.
// A moldura (cantos, etiqueta) é desenhada aqui, então uma imagem nova com o
// mesmo nome de arquivo herda o mesmo acabamento.
// ══════════════════════════════════════════════════════════════════════

export type ItemArtCategory = 'personnel' | 'vehicle' | 'air' | 'arms' | 'intel' | 'wmd';

const PERSONNEL = new Set(['bodyguard', 'thug', 'police', 'swat', 'soldier', 'commando', 'agent', 'lawyer1', 'lawyer2', 'lawyer3', 'liaison1', 'liaison2', 'liaison3']);
const WMD = new Set(['chem', 'bio', 'nuclear']);
const INTEL = new Set(['intel', 'docs', 'secret', 'tech', 'space']);
const AIR = new Set(['heli1', 'heli3', 'jet1', 'jet2', 'jet3', 'bomber', 'cargo0', 'cargo1', 'cargo2', 'cargo3']);
const ARMS = new Set(['rifles', 'mg', 'rpg', 'atgm']);

export function itemCategory(id: string): ItemArtCategory {
  if (PERSONNEL.has(id)) return 'personnel';
  if (WMD.has(id)) return 'wmd';
  if (INTEL.has(id)) return 'intel';
  if (AIR.has(id)) return 'air';
  if (ARMS.has(id)) return 'arms';
  return 'vehicle';
}

const PLATE: Record<ItemArtCategory, { bg0: string; bg1: string; ink: string; accent: string }> = {
  personnel: { bg0: '#1b3a3f', bg1: '#081417', ink: '#a8f4f2', accent: 'cold' },
  vehicle: { bg0: '#2a2f22', bg1: '#0b0d09', ink: '#d6dccb', accent: 'warm' },
  air: { bg0: '#1c2e3c', bg1: '#070c11', ink: '#cfe4f2', accent: 'cold' },
  arms: { bg0: '#33281a', bg1: '#0d0a06', ink: '#efd9b0', accent: 'warm' },
  intel: { bg0: '#16323a', bg1: '#06100f', ink: '#bfeff0', accent: 'cold' },
  wmd: { bg0: '#3d1512', bg1: '#110504', ink: '#ffc9c2', accent: 'signal' },
};

/** Proporção das pranchas e fotos: 4:3. */
export const ITEM_ART_RATIO = 3 / 4;

export interface ItemArtProps {
  id: string;
  /** largura em px; a altura segue 4:3. ≤ 40 mostra só o ícone. */
  size?: number;
  /** texto alternativo (nome do item); vazio = decorativo */
  alt?: string;
  /** etiqueta no canto (ex.: 'Veículo'); `false` esconde */
  tag?: string | false;
  /** força a ilustração mesmo havendo foto */
  illustration?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ItemArt({ id, size = 96, alt = '', tag, illustration, className, style }: ItemArtProps) {
  const [failed, setFailed] = useState(false);
  const uid = useId().replace(/:/g, '');
  if (size <= 40) return <GameIcon id={id} size={size} title={alt || undefined} className={className} style={style} />;
  const cat = itemCategory(id);
  const pal = PLATE[cat];
  const w = size;
  const h = Math.round(size * ITEM_ART_RATIO);
  const usePhoto = !illustration && !failed && ITEM_PHOTOS.has(id);
  const file = size <= 160 ? 96 : 480;
  const big = size >= 200;
  const corner = Math.max(6, Math.round(size * 0.05));

  return (
    <figure
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{
        position: 'relative',
        margin: 0,
        width: w,
        height: h,
        flex: 'none',
        overflow: 'hidden',
        background: `radial-gradient(120% 120% at 50% 35%, ${pal.bg0}, ${pal.bg1} 75%)`,
        clipPath: `polygon(${corner}px 0, 100% 0, 100% calc(100% - ${corner}px), calc(100% - ${corner}px) 100%, 0 100%, 0 ${corner}px)`,
        boxShadow: 'inset 0 0 0 1px rgba(214,222,232,0.16)',
        ...style,
      }}
    >
      {usePhoto ? (
        <img
          src={`/items/${id}-${file}.webp`}
          alt=""
          width={w}
          height={h}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : cat === 'personnel' ? (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'end center' }}>
          <OperativePortrait seed={`item-${id}`} size={Math.round(h * 0.92)} frame={false} tone="cold" style={{ display: 'block', marginBottom: -Math.round(h * 0.02) }} />
          <span style={{ position: 'absolute', right: Math.round(w * 0.04), top: Math.round(h * 0.06), color: pal.ink, filter: `drop-shadow(0 0 6px ${pal.ink}55)` }}>
            <GameIcon id={id} size={Math.round(h * 0.26)} accent={pal.accent} />
          </span>
        </div>
      ) : (
        <svg viewBox="0 0 400 300" width={w} height={h} style={{ position: 'absolute', inset: 0 }} aria-hidden>
          <defs>
            <pattern id={`g${uid}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke={pal.ink} strokeOpacity="0.07" strokeWidth="1" />
            </pattern>
            <radialGradient id={`v${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0.55" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.6" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#g${uid})`} />
          {cat === 'wmd' ? (
            <g opacity="0.22">
              {Array.from({ length: 14 }, (_, i) => (
                <path key={i} d={`M${i * 40 - 120} 300L${i * 40 + 40} 0`} stroke={pal.ink} strokeWidth="9" />
              ))}
            </g>
          ) : (
            <g stroke={pal.ink} strokeOpacity="0.22" fill="none">
              <circle cx="200" cy="140" r="104" />
              <circle cx="200" cy="140" r="70" strokeDasharray="4 6" />
              <path d="M200 20v240M70 140h260" strokeDasharray="2 6" />
            </g>
          )}
          <rect width="400" height="300" fill={`url(#v${uid})`} />
        </svg>
      )}
      {!usePhoto && cat !== 'personnel' ? (
        <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingBottom: big ? h * 0.06 : 0, color: pal.ink, filter: `drop-shadow(0 0 ${big ? 14 : 6}px ${pal.ink}66)` }}>
          <GameIcon id={id} size={Math.round(h * (big ? 0.58 : 0.66))} accent={pal.accent} detail={big} />
        </span>
      ) : null}
      {/* grão + linhas finas por cima de tudo (foto e ilustração) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 3px)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
      {/* cantos de dossiê */}
      {big
        ? (['tl', 'tr', 'bl', 'br'] as const).map((k) => (
            <span
              key={k}
              aria-hidden
              style={{
                position: 'absolute',
                width: 16,
                height: 16,
                borderColor: 'rgba(242,169,59,0.85)',
                borderStyle: 'solid',
                borderWidth: `${k[0] === 't' ? 2 : 0}px ${k[1] === 'r' ? 2 : 0}px ${k[0] === 'b' ? 2 : 0}px ${k[1] === 'l' ? 2 : 0}px`,
                top: k[0] === 't' ? 10 : undefined,
                bottom: k[0] === 'b' ? 10 : undefined,
                left: k[1] === 'l' ? 10 : undefined,
                right: k[1] === 'r' ? 10 : undefined,
              }}
            />
          ))
        : null}
      {big && tag !== false ? (
        <figcaption
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            padding: '3px 8px 3px 14px',
            font: '600 11px/1.2 var(--g-font-mono, ui-monospace)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#1b1203',
            background: 'linear-gradient(180deg, #ffcb6b, #f2a93b)',
            clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 7px 100%, 0 50%)',
          }}
        >
          {tag ?? CATEGORY_TAG[cat]}
        </figcaption>
      ) : null}
    </figure>
  );
}

const CATEGORY_TAG: Record<ItemArtCategory, string> = {
  personnel: 'Pessoal',
  vehicle: 'Veículo',
  air: 'Aeronave',
  arms: 'Armamento',
  intel: 'Informação',
  wmd: 'Destruição em massa',
};
