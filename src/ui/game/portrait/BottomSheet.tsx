import { useLayoutEffect, useRef, useState } from 'react';
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
  const probe = useRef<HTMLSpanElement>(null);
  // Altura do contêiner e do home indicator, medidas depois de montar e a cada mudança de tamanho
  // (no primeiro render a folha ainda não está no DOM).
  const [box, setBox] = useState<{ h: number; safeB: number }>({ h: 0, safeB: 0 });
  useLayoutEffect(() => {
    const parent = root.current?.parentElement;
    if (!parent) return;
    const measure = () => setBox({ h: parent.clientHeight, safeB: probe.current?.offsetHeight ?? 0 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  const offsets = () => {
    const h = box.h || root.current?.parentElement?.clientHeight || window.innerHeight;
    // Recolhida, as abas ficam acima do home indicator (--safe-b, medido pela sonda).
    return { full: 0, half: Math.round(h * 0.5), peek: Math.max(0, h - PEEK_PX - box.safeB) } as Record<SheetSnap, number>;
  };

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
      className={`gsheet snap-${snap}${dragOff !== null ? ' dragging' : ''}`}
      style={{ transform: `translateY(${off}px)`, ['--sheet-off' as string]: `${off}px` }}
      data-snap={snap}
    >
      <span ref={probe} className="safe-probe" aria-hidden />
      <div className="gsheet-head" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <button
          type="button"
          className="gsheet-grip"
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
        <div className="gsheet-tabs" role="tablist">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              data-tour={x.tour}
              aria-selected={tab === x.id}
              className={`gsheet-tab${x.hot ? ' hot' : ''}`}
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
              {x.badge ? <span className="gsheet-badge">{x.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>
      {/* A folha é deslocada para baixo; o padding dela faz a área visível terminar acima do home indicator. */}
      <div className="gsheet-body" aria-hidden={snap === 'peek'}>
        {children}
      </div>
    </div>
  );
}
