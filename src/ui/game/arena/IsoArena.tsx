import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import type { CombatState, CombatType, CombatUnitRef } from '../../../game/types';
import { sceneUrl, useArena } from '../../../art';
import type { ArenaId, ArenaManifest } from '../../../art/sprites';
import { def, FORT_ID } from '../../../game/units';
import './arena.css';

/**
 * Arena isométrica do Combate (piso 2:1 da referência "arena-limpa"): as 8 colunas correm na diagonal
 * de cima-esquerda (jogador) para baixo-direita (inimigo); as 3 linhas vão de frente (0) para o fundo.
 * Só desenho: regras, Tática e Prévia continuam no motor. Os tokens mantêm data-fx-* para os efeitos
 * da combat-fx (que leem offsetLeft/Top e deduzem o eixo de avanço).
 */

/** Altura livre acima do fundo do piso para as figuras em pé, em larguras de casa. */
const HEAD = 0.75;
/** Espessura da laje do piso, em larguras de casa. */
const SLAB = 0.14;

export interface IsoGeom {
  tw: number;
  width: number;
  height: number;
  /** Vértice da grade (i = coluna, j = linha). */
  pt(i: number, j: number): [number, number];
  /** Centro da casa. */
  center(col: number, row: number): [number, number];
  /** Profundidade para o z-index: maior = mais à frente. */
  depth(col: number, row: number): number;
  /** Com fundo de combate: a escala do fundo, que é a mesma do Pessoal (cenário e figuras na mesma escala de voxel). */
  unitScale?: number;
}

export function isoGeom(cols: number, rows: number, tw: number): IsoGeom {
  const n = cols + rows;
  const top = HEAD * tw;
  const pt = (i: number, j: number): [number, number] => [((i + j) * tw) / 2, top + ((i - j + rows) * tw) / 4];
  return {
    tw,
    width: (n * tw) / 2,
    height: top + (n * tw) / 4 + SLAB * tw,
    pt,
    center: (col, row) => pt(col + 0.5, row + 0.5),
    depth: (col, row) => 10 + (col - row + rows) * 2,
  };
}

/**
 * Geometria do fundo de combate (art-kit), lida só do manifesto: vértice (c, r') = origem + c·colStep + r'·rowStep,
 * em px 1× × escala inteira S. No fundo a linha 0 é a de trás; aqui a 0 é a da frente (r' = linhas − j).
 * O pé da Unidade fica 1 px (× S) abaixo do centro da casa, como a art-kit mediu.
 */
export function bgGeom(m: ArenaManifest, rows: number, S: number): IsoGeom {
  const pt = (i: number, j: number): [number, number] => {
    const r = rows - j;
    return [S * (m.gridOrigin.x + i * m.colStep.x + r * m.rowStep.x), S * (m.gridOrigin.y + i * m.colStep.y + r * m.rowStep.y)];
  };
  return {
    tw: S * Math.abs(m.colStep.x - m.rowStep.x),
    width: S * m.frameWidth,
    height: S * m.frameHeight,
    pt,
    center: (col, row) => {
      const [x, y] = pt(col + 0.5, row + 0.5);
      return [x, y + S];
    },
    depth: (col, row) => 10 + (col - row + rows) * 2,
    unitScale: S,
  };
}

/** Fundo do tipo de Combate. */
export const ARENA_OF: Record<CombatType, ArenaId> = { urban: 'urbano', army: 'militar', legal: 'juridico', air: 'aereo' };

/** Largura de casa que cabe no espaço (largura e, se houver, altura). */
export function fitTile(cols: number, rows: number, w: number, h: number): number {
  const n = cols + rows;
  const byW = (w * 2) / n;
  const byH = h > 0 ? h / (HEAD + n / 4 + SLAB) : Infinity;
  return Math.max(24, Math.floor(Math.min(byW, byH, 230)));
}

/** Tamanho da figura por classe (veículos e aeronaves maiores), em larguras de casa. */
export function figureSize(itemId: string): { w: number; h: number; lift: number } {
  if (itemId === FORT_ID) return { w: 0.9, h: 0.9, lift: 0 };
  const cls = def(itemId).cls;
  if (cls === 'vehicle' || cls === 'antiair') return { w: 1.3, h: 1.15, lift: 0 };
  if (cls === 'heli' || cls === 'jet') return { w: 1.3, h: 1.1, lift: 0.35 };
  return { w: 0.82, h: 1.3, lift: 0 };
}

export function IsoArena({
  c,
  boardRef,
  cellClass,
  cellLabel,
  onCell,
  renderUnit,
  zoomLabels,
  children,
  fitAll,
}: {
  c: CombatState;
  boardRef: RefObject<HTMLDivElement>;
  cellClass: (row: number, col: number) => string;
  cellLabel: (row: number, col: number) => string;
  onCell: (row: number, col: number) => void;
  renderUnit: (r: CombatUnitRef, g: IsoGeom) => ReactNode;
  /** Rótulos do botão de zoom (em pé, onde a largura limita o tamanho das casas). */
  zoomLabels: { in: string; out: string };
  /** camada por cima das figuras (efeitos), recebe a geometria */
  children?: (g: IsoGeom) => ReactNode;
  /** Luta em andamento: mostra a arena inteira (os dois lados); o zoom volta no posicionamento. */
  fitAll?: boolean;
}) {
  // Em pé sobra altura: começa com zoom (casas 1,5×), rolando a partir do lado do jogador.
  const portraitStart = () => typeof matchMedia !== 'undefined' && matchMedia('(orientation: portrait)').matches;
  const [zoom, setZoom] = useState(() => !fitAll && portraitStart());
  useEffect(() => {
    setZoom(fitAll ? false : portraitStart());
  }, [fitAll]);
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bg = useArena(ARENA_OF[c.type]);
  let g: IsoGeom;
  if (bg) {
    // Fundo na maior escala que cabe, em meios passos (1, 1,5, 2…): o voxel aguenta e assim ele enche a área
    // (com a escala inteira, 1366×768 caía para 1×). O zoom sobe um nível e rola.
    const fitS = Math.min(box.w / bg.frameWidth, (box.h || Infinity) / bg.frameHeight);
    const S = Math.max(0.5, Math.floor(fitS * 2) / 2);
    g = bgGeom(bg, c.rows, zoom ? S + 1 : S);
  } else {
    const fit = fitTile(c.cols, c.rows, box.w, box.h);
    // Zoom: casas 1,5× maiores; a arena rola dentro da área (começa no lado do jogador).
    g = isoGeom(c.cols, c.rows, zoom ? Math.round(fit * 1.5) : fit);
  }
  const tw = g.tw;
  const cells: { row: number; col: number }[] = [];
  for (let row = c.rows - 1; row >= 0; row--) for (let col = 0; col < c.cols; col++) cells.push({ row, col });
  const poly = (pts: [number, number][]) => pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const slab = SLAB * tw;
  const key = (e: KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCell(row, col);
    }
  };

  return (
    <div className={`iso-wrap${zoom ? ' zoomed' : ''}`} ref={wrap}>
      <button className="btn icon iso-zoom" aria-pressed={zoom} aria-label={zoom ? zoomLabels.out : zoomLabels.in} onClick={() => setZoom(!zoom)}>
        {zoom ? '−' : '+'}
      </button>
      <div ref={boardRef} className={`iso-board${bg ? ' has-bg' : ''}`} style={{ width: g.width, height: g.height }}>
        {bg && <img className="iso-bg" src={sceneUrl(bg, bg.static)} width={g.width} height={g.height} alt="" draggable={false} />}
        <svg className="iso-floor" width={g.width} height={g.height} viewBox={`0 0 ${g.width} ${g.height}`}>
          {/* Laje (só sem fundo): faces da frente (linha 0) e da direita (última coluna) */}
          {!bg && <polygon
            className="iso-slab iso-slab--front"
            points={poly([g.pt(0, 0), g.pt(c.cols, 0), [g.pt(c.cols, 0)[0], g.pt(c.cols, 0)[1] + slab], [g.pt(0, 0)[0], g.pt(0, 0)[1] + slab]])}
          />}
          {!bg && <polygon
            className="iso-slab iso-slab--side"
            points={poly([g.pt(c.cols, 0), g.pt(c.cols, c.rows), [g.pt(c.cols, c.rows)[0], g.pt(c.cols, c.rows)[1] + slab], [g.pt(c.cols, 0)[0], g.pt(c.cols, 0)[1] + slab]])}
          />}
          {cells.map(({ row, col }) => (
            <polygon
              key={`${row}-${col}`}
              className={`iso-cell ${cellClass(row, col)}`}
              points={poly([g.pt(col, row), g.pt(col + 1, row), g.pt(col + 1, row + 1), g.pt(col, row + 1)])}
              role="button"
              tabIndex={0}
              aria-label={cellLabel(row, col)}
              onClick={() => onCell(row, col)}
              onKeyDown={(e) => key(e, row, col)}
            />
          ))}
        </svg>
        {c.units.map((r) => renderUnit(r, g))}
        {children?.(g)}
        {/* objetos do cenário que ficam por cima das Unidades */}
        {bg && <img className="iso-bg-front" src={sceneUrl(bg, bg.front)} width={g.width} height={g.height} alt="" draggable={false} />}
      </div>
    </div>
  );
}
