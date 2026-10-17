import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './portrait.css';

export type SheetSnap = 'peek' | 'half' | 'full';

export interface SheetTab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  hot?: boolean;
  tour?: string;
}

/** Altura visível (px) da folha recolhida: alça + abas. */
export const PEEK_PX = 76;

/**
 * Folha inferior com abas para o celular em pé: recolhida (só as abas), meia (o mapa fica na metade de cima)
 * ou cheia. Arraste a alça ou as abas; um toque na alça alterna meia/cheia. Teclado: Enter/Espaço na alça.
 */
export function BottomSheet({
  tabs,
  tab,
  onTab,
  snap,
  onSnap,
  children,
}: {
  tabs: SheetTab[];
  tab: string;
  onTab: (id: string) => void;
  snap: SheetSnap;
  onSnap: (s: SheetSnap) => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; off0: number; moved: boolean; id: number } | null>(null);
  const [dragOff, setDragOff] = useState<number | null>(null);
  const justDragged = useRef(false);

  // Deslocamento (px a partir do topo do contêiner) de cada estado.
  const offsets = () => {
    const h = root.current?.parentElement?.clientHeight ?? window.innerHeight;
    return { full: 0, half: Math.round(h * 0.5), peek: Math.max(0, h - PEEK_PX) } as Record<SheetSnap, number>;
  };
  const [, force] = useState(0);
  useEffect(() => {
    const onResize = () => force((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const off = dragOff ?? offsets()[snap];

  const start = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { y0: e.clientY, off0: offsets()[snap], moved: false, id: e.pointerId };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.abs(dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro sintético ou já liberado: o arraste segue sem captura */
      }
    }
    const o = offsets();
    setDragOff(Math.max(o.full, Math.min(o.peek, d.off0 + dy)));
  };
  const end = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    e.preventDefault();
    const o = offsets();
    const cur = Math.max(o.full, Math.min(o.peek, d.off0 + (e.clientY - d.y0)));
    const vel = e.clientY - d.y0;
    // Escolhe o estado mais próximo, com viés para a direção do gesto.
    const order: SheetSnap[] = ['full', 'half', 'peek'];
    let best: SheetSnap = snap;
    let bestD = Infinity;
    for (const s of order) {
      const dist = Math.abs(o[s] - cur) - (Math.sign(o[s] - d.off0) === Math.sign(vel) ? 40 : 0);
      if (dist < bestD) {
        bestD = dist;
        best = s;
      }
    }
    setDragOff(null);
    justDragged.current = true;
    onSnap(best);
  };
  const toggle = () => onSnap(snap === 'full' ? 'half' : snap === 'half' ? 'full' : 'half');

  return (
    <div
      ref={root}
      className={`sheet snap-${snap}${dragOff !== null ? ' dragging' : ''}`}
      style={{ transform: `translateY(${off}px)` }}
      data-snap={snap}
    >
      <div className="sheet-head" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <button
          type="button"
          className="sheet-grip"
          aria-label={tabs.find((x) => x.id === tab)?.label}
          aria-expanded={snap !== 'peek'}
          onClick={() => {
            if (justDragged.current) {
              justDragged.current = false;
              return;
            }
            toggle();
          }}
        >
          <span aria-hidden />
        </button>
        <div className="sheet-tabs" role="tablist">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              data-tour={x.tour}
              aria-selected={tab === x.id}
              className={`sheet-tab${x.hot ? ' hot' : ''}`}
              onClick={() => {
                if (justDragged.current) {
                  justDragged.current = false;
                  return;
                }
                onTab(x.id);
                if (snap === 'peek') onSnap('half');
              }}
            >
              {x.icon}
              <span>{x.label}</span>
              {x.badge ? <span className="sheet-badge">{x.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>
      {/* O corpo tem a altura toda; o padding compensa a parte que está abaixo da tela. */}
      <div className="sheet-body" aria-hidden={snap === 'peek'} style={{ ['--sheet-off' as string]: `${off}px` }}>
        {children}
      </div>
    </div>
  );
}
