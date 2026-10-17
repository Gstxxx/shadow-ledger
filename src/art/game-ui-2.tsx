import { useEffect, useId, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { GameIcon } from './icons/GameIcon';
import { GButton, GTabs, uiSound, type GTabItem } from './game-ui';
import './game-ui.css';

// Fase 2 dos componentes de jogo: wrappers finos sobre as classes de game-ui-2.css.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ── HUD ───────────────────────────────────────────────────────────────

export interface GDialProps {
  label: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'ok' | 'danger' | 'action';
  size?: 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

/** Mostrador de HUD: rótulo mono pequeno sobre um valor tabular numa janela rebaixada. */
export function GDial({ label, children, tone = 'default', size = 'md', className, style }: GDialProps) {
  return (
    <div className={cx('g-dial', tone !== 'default' && `g-dial--${tone}`, size === 'lg' && 'g-dial--lg', className)} style={style}>
      <span className="g-dial__k">{label}</span>
      <span className="g-dial__v">{children}</span>
    </div>
  );
}

// ── Ficha de Mercado ─────────────────────────────────────────────────

export interface GCardProps {
  /** id de <GameIcon> ou nó para o poço à esquerda */
  icon?: ReactNode | string;
  title: ReactNode;
  meta?: ReactNode;
  /** selo carimbado à direita (ex.: '+23%') */
  seal?: ReactNode;
  sealSub?: ReactNode;
  sealTone?: 'action' | 'ok' | 'danger';
  /** ações (botões) à direita, depois do selo */
  actions?: ReactNode;
  tone?: 'default' | 'hot' | 'danger' | 'off';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function GCard({ icon, title, meta, seal, sealSub, sealTone = 'action', actions, tone = 'default', className, style, children }: GCardProps) {
  return (
    <div
      className={cx('g-card', tone !== 'default' && `g-card--${tone}`, className)}
      style={{ gridTemplateColumns: `${icon ? 'auto ' : ''}1fr${seal != null ? ' auto' : ''}${actions ? ' auto' : ''}`, ...style }}
    >
      {icon ? <span className="g-well">{typeof icon === 'string' ? <GameIcon id={icon} size={28} /> : icon}</span> : null}
      <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
        <span className="g-card__title">{title}</span>
        {meta != null ? <span className="g-card__meta">{meta}</span> : null}
        {children}
      </div>
      {seal != null ? <GSeal tone={sealTone} sub={sealSub}>{seal}</GSeal> : null}
      {actions ? <div style={{ display: 'grid', gap: 6 }}>{actions}</div> : null}
    </div>
  );
}

export function GSeal({ tone = 'action', sub, small, children }: { tone?: 'action' | 'ok' | 'danger'; sub?: ReactNode; small?: boolean; children: ReactNode }) {
  return (
    <span className={cx('g-seal', tone !== 'action' && `g-seal--${tone}`, small && 'g-seal--sm')}>
      <span>
        {children}
        {sub != null ? <small>{sub}</small> : null}
      </span>
    </span>
  );
}

// ── Carta de Unidade ─────────────────────────────────────────────────

export interface GUnitCardProps {
  portrait: ReactNode;
  name: ReactNode;
  role?: ReactNode;
  /** 0..3 barras de patente */
  rank?: number;
  stats?: ReactNode;
  side?: ReactNode;
  /** só para cartas alternáveis (seleção de Equipe); omita quando o clique abre a ficha */
  selected?: boolean;
  /** fora de ação: Ferida, Detida, Danificada… (texto da tarja) */
  out?: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export function GUnitCard({ portrait, name, role, rank = 0, stats, side, selected, out, onClick, className, children }: GUnitCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cx('g-unit', selected && 'is-selected', out && 'g-unit--out', className)}
      aria-pressed={onClick && selected !== undefined ? selected : undefined}
      onClick={
        onClick
          ? () => {
              uiSound('click');
              onClick();
            }
          : undefined
      }
    >
      <span className="g-unit__portrait" data-status={out}>
        {portrait}
        <span className="g-unit__rank" aria-hidden>
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < rank ? 'on' : undefined} />
          ))}
        </span>
      </span>
      <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <span className="g-unit__name">{name}</span>
        {role != null ? <span className="g-unit__role">{role}</span> : null}
        {stats != null ? <span className="g-unit__stats">{stats}</span> : null}
        {children}
      </span>
      {side != null ? <span style={{ textAlign: 'right' }}>{side}</span> : null}
    </Tag>
  );
}

// ── Modal ────────────────────────────────────────────────────────────

export interface GModalProps {
  open: boolean;
  onClose?: () => void;
  kicker?: ReactNode;
  title: ReactNode;
  tone?: 'action' | 'good' | 'bad' | 'intel';
  variant?: 'command' | 'dossier';
  /** md = 560px (padrão) · lg ≈ 1100px · xl = quase a tela toda; em pé estreito, lg/xl ocupam a tela */
  size?: 'md' | 'lg' | 'xl';
  /** ações do rodapé */
  actions?: ReactNode;
  closeLabel?: string;
  /** largura máxima explícita (px); sobrepõe o `size` só na largura */
  width?: number;
  /** abas do conteúdo (fichário); o painel é `children` da aba ativa */
  tabs?: GTabItem<string>[];
  tab?: string;
  onTab?: (id: string) => void;
  tabsLabel?: string;
  /** 'top', 'side' ou 'auto' (lateral quando deitado e baixo, ≤ 560px de altura) */
  tabsPlacement?: 'top' | 'side' | 'auto';
  /** voltar no cabeçalho (histórico de modais) */
  onBack?: () => void;
  backLabel?: string;
  /** muda a cada conteúdo novo (troca de modal no histórico) para tocar a transição de troca */
  contentKey?: string | number;
  children?: ReactNode;
}

const SIDE_TABS_QUERY = '(orientation: landscape) and (max-height: 560px)';

function useMedia(q: string) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

/**
 * Modal de jogo (ADR 0006): tela de comando ou dossiê, com abas de fichário no topo ou na lateral,
 * voltar no cabeçalho, tamanhos md/lg/xl, foco preso, Esc fecha, foco volta ao fechar.
 */
export function GModal({
  open,
  onClose,
  kicker,
  title,
  tone = 'action',
  variant = 'command',
  size = 'md',
  actions,
  closeLabel = 'Fechar',
  width,
  tabs,
  tab,
  onTab,
  tabsLabel = 'Seções',
  tabsPlacement = 'auto',
  onBack,
  backLabel = 'Voltar',
  contentKey,
  children,
}: GModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  const pid = useId();
  // onClose/onBack em refs: o jogo re-renderiza várias vezes por segundo e um callback
  // inline não pode refazer o efeito (som de abrir, foco) a cada quadro.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const backRef = useRef(onBack);
  backRef.current = onBack;
  const canClose = !!onClose;
  const autoSide = useMedia(SIDE_TABS_QUERY);
  const hasTabs = !!tabs && tabs.length > 0;
  const side = hasTabs && (tabsPlacement === 'side' || (tabsPlacement === 'auto' && autoSide));
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    uiSound('open');
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) {
        e.preventDefault();
        uiSound('close');
        closeRef.current();
        return;
      }
      // foco preso dentro do modal
      if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        );
        if (!items.length) {
          e.preventDefault();
          ref.current.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const cur = document.activeElement;
        if (e.shiftKey && (cur === first || cur === ref.current || !ref.current.contains(cur))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (cur === last || !ref.current.contains(cur))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && document.contains(prev)) prev.focus();
    };
  }, [open]);
  if (!open) return null;
  const active = hasTabs ? (tab ?? tabs[0].id) : undefined;
  const paneKey = String(contentKey ?? '') + ':' + String(active ?? '');
  return (
    <div className="g-modal-scrim" style={{ zIndex: 300 }} onClick={() => closeRef.current?.()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tid}
        tabIndex={-1}
        className={cx(
          'g-modal',
          size !== 'md' && `g-modal--${size}`,
          hasTabs && 'g-modal--tabs',
          side && 'g-modal--side',
          tone !== 'action' && `g-modal--${tone}`,
          variant === 'dossier' && 'g-modal--dossier',
        )}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="g-modal__bar">
          {onBack ? (
            <GButton variant="ghost" size="sm" aria-label={backLabel} icon={<span aria-hidden>←</span>} sfx="close" onClick={() => backRef.current?.()} />
          ) : null}
          <div style={{ display: 'grid', gap: 4, flex: 1, minWidth: 0 }}>
            {kicker != null ? <span className="g-modal__kicker">{kicker}</span> : null}
            <h2 id={tid} className="g-modal__title">
              {title}
            </h2>
          </div>
          {canClose ? (
            <GButton variant="ghost" size="sm" aria-label={closeLabel} icon={<span aria-hidden>✕</span>} sfx="close" onClick={() => closeRef.current?.()} />
          ) : null}
        </div>
        {hasTabs ? (
          <div className="g-modal__main">
            <GTabs
              className="g-modal__tabs"
              label={tabsLabel}
              items={tabs.map((t) => ({ ...t, panel: pid }))}
              value={active as string}
              onChange={(id) => onTab?.(id)}
              orientation={side ? 'vertical' : 'horizontal'}
            />
            <div key={paneKey} id={pid} role="tabpanel" className="g-modal__body g-modal__pane">
              {children}
            </div>
          </div>
        ) : (
          <div key={contentKey} className={cx('g-modal__body', contentKey != null && 'g-modal__pane')}>
            {children}
          </div>
        )}
        {actions ? <div className="g-modal__foot">{actions}</div> : null}
      </div>
    </div>
  );
}

/**
 * Histórico de modais (ADR 0006): um modal por vez; abrir outro empilha, voltar desempilha.
 * `current` é o topo; passe um id dele como `contentKey` do GModal.
 */
export function useModalStack<T>() {
  const [stack, setStack] = useState<T[]>([]);
  return {
    current: stack.length ? stack[stack.length - 1] : undefined,
    depth: stack.length,
    canBack: stack.length > 1,
    /** abre por cima do atual (com histórico) */
    push: (m: T) => setStack((s) => [...s, m]),
    /** troca o atual sem histórico */
    replace: (m: T) => setStack((s) => (s.length ? [...s.slice(0, -1), m] : [m])),
    /** abre do zero (descarta o histórico) */
    open: (m: T) => setStack([m]),
    back: () => setStack((s) => s.slice(0, -1)),
    close: () => setStack([]),
  };
}

// ── Barra de ações (dock sobre o mapa) ───────────────────────────────

export interface GDockItem {
  id: string;
  label: ReactNode;
  icon: ReactNode | string;
  count?: number;
  alert?: boolean;
  disabled?: boolean;
}

export interface GActionBarProps {
  items: GDockItem[];
  /** item cujo modal está aberto */
  active?: string;
  onSelect: (id: string) => void;
  label: string;
  /** só ícones (rótulo vira aria-label), para telas muito estreitas */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Barra de ações de jogo para flutuar sobre o mapa: botões grandes com ícone, rótulo e contador. A posição fica com quem usa. */
export function GActionBar({ items, active, onSelect, label, compact, className, style }: GActionBarProps) {
  return (
    <nav aria-label={label} className={cx('g-dock', compact && 'g-dock--compact', className)} style={style}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={cx('g-dock__btn', it.alert && 'g-dock__btn--alert')}
          aria-current={active === it.id ? 'true' : undefined}
          aria-label={compact && typeof it.label === 'string' ? it.label : undefined}
          disabled={it.disabled}
          onPointerEnter={() => {
            if (typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches) uiSound('hover');
          }}
          onClick={() => {
            uiSound('open');
            onSelect(it.id);
          }}
        >
          <span className="g-dock__icon">{typeof it.icon === 'string' ? <GameIcon id={it.icon} size={24} accent={it.alert ? 'signal' : 'warm'} /> : it.icon}</span>
          {compact ? null : <span className="g-dock__label">{it.label}</span>}
          {it.count ? <span className={cx('g-badge', it.alert ? 'g-badge--alert' : 'g-badge--action', 'g-dock__count')}>{it.count}</span> : null}
        </button>
      ))}
    </nav>
  );
}

// ── Teletipo ─────────────────────────────────────────────────────────

export function GToast({ tone = 'neutral', kicker, children }: { tone?: 'neutral' | 'good' | 'ok' | 'bad' | 'intel'; kicker?: ReactNode; children: ReactNode }) {
  return (
    <div role="status" className={cx('g-toast', tone !== 'neutral' && `g-toast--${tone}`)}>
      <span>
        {kicker != null ? <span className="g-toast__k">{kicker}</span> : null}
        {children}
      </span>
    </div>
  );
}

export function GTip({ kicker, children, style }: { kicker?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div role="tooltip" className="g-tip" style={style}>
      {kicker != null ? <span className="g-tip__k">{kicker}</span> : null}
      {children}
    </div>
  );
}

// ── Controles de painel ──────────────────────────────────────────────

export interface GRangeProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

/** Fader: trilho com marcas, cabo usinado; preenchimento âmbar até o valor. */
export function GRange({ value, min = 0, max = 100, onChange, className, style, ...rest }: GRangeProps) {
  const p = ((value - min) / (max - min || 1)) * 100;
  return (
    <input
      type="range"
      className={cx('g-range', className)}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ['--p' as string]: `${p}%`, ...style }}
      {...rest}
    />
  );
}

export interface GStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (n: number) => ReactNode;
  /** rótulos acessíveis dos botões */
  decLabel?: string;
  incLabel?: string;
  /** 'md' (padrão) = botões de 44px para toque; 'sm' = 34px, só para listas densas com mouse */
  size?: 'sm' | 'md';
}

export function GStepper({ value, min = -Infinity, max = Infinity, step = 1, onChange, format = (n) => n, decLabel = '−', incLabel = '+', size = 'md' }: GStepperProps) {
  return (
    <div className={cx('g-stepper', size === 'sm' && 'g-stepper--sm')}>
      <GButton size={size} aria-label={decLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} icon={<span aria-hidden>−</span>} />
      <output className="g-stepper__v" aria-live="polite">
        {format(value)}
      </output>
      <GButton size={size} aria-label={incLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} icon={<span aria-hidden>+</span>} />
    </div>
  );
}

export function GToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="g-toggle"
      onClick={() => {
        uiSound('click');
        onChange(!checked);
      }}
    />
  );
}

// ── Telex ────────────────────────────────────────────────────────────

export function GTelex({ kicker, children, dark, style }: { kicker?: ReactNode; children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return (
    <div className={cx('g-telex', dark && 'g-telex--dark')} style={style}>
      {kicker != null ? <span className="g-telex__k">{kicker}</span> : null}
      <span className="g-telex__t">{children}</span>
    </div>
  );
}

// ── Mapa (SVG) ───────────────────────────────────────────────────────

export type GMarkerKind = 'country' | 'selected' | 'station' | 'rival' | 'threat' | 'director';

export interface GMapMarkerProps {
  kind: GMarkerKind;
  x: number;
  y: number;
  /** escala inversa do zoom (1 / k), já com a compensação do SVG encolhido no celular; também afina o contorno do rótulo */
  inv?: number;
  label?: string;
  /** nível da Estação (0..4) — vira marcas sob o hexágono */
  tier?: number;
  onClick?: () => void;
}

const MARK_COLOR: Record<GMarkerKind, string> = {
  country: '#a7b0ba',
  selected: '#f2a93b',
  station: '#4fd8e0',
  rival: '#a58cf0',
  threat: '#e5484d',
  director: '#f2a93b',
};

/** Marcador de mapa em SVG com brilho; usar dentro do <g> transformado do mapa. */
export function GMapMarker({ kind, x, y, inv = 1, label, tier = 0, onClick }: GMapMarkerProps) {
  const c = MARK_COLOR[kind];
  const s = inv;
  let shape: ReactNode;
  switch (kind) {
    case 'station': {
      const r = 6 * s;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${Math.cos(a) * r},${Math.sin(a) * r}`;
      }).join(' ');
      shape = (
        <>
          <polygon points={pts} fill="#0b1a1d" stroke={c} strokeWidth={1.4 * s} />
          <circle r={1.8 * s} fill={c} />
          {Array.from({ length: tier + 1 }, (_, i) => (
            <rect key={i} x={(-((tier + 1) * 3) / 2 + i * 3) * s} y={8 * s} width={2 * s} height={2.4 * s} fill={c} />
          ))}
        </>
      );
      break;
    }
    case 'rival':
      shape = <path d={`M0 ${-6 * s}L${5.5 * s} ${4 * s}H${-5.5 * s}Z`} fill="#1a1428" stroke={c} strokeWidth={1.4 * s} />;
      break;
    case 'threat':
      shape = (
        <>
          <circle r={10 * s} fill="none" stroke={c} strokeWidth={1.2 * s} className="pulse" />
          <path d={`M0 ${-5 * s}L${5 * s} 0L0 ${5 * s}L${-5 * s} 0Z`} fill={c} stroke="#0b0d10" strokeWidth={s} />
        </>
      );
      break;
    case 'director':
      shape = (
        <>
          <circle r={9 * s} fill="none" stroke={c} strokeWidth={1.2 * s} className="pulse slow" />
          <circle r={4.2 * s} fill="#1b1203" stroke={c} strokeWidth={1.4 * s} />
          <circle r={1.8 * s} fill={c} />
        </>
      );
      break;
    default:
      shape = <path d={`M0 ${-4 * s}L${4 * s} 0L0 ${4 * s}L${-4 * s} 0Z`} fill={kind === 'selected' ? c : '#151a20'} stroke={c} strokeWidth={1.2 * s} />;
  }
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cx('g-mapmark', `g-mapmark--${kind}`)}
      style={{ ['--mk' as string]: c, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      {shape}
      {label ? (
        <text className="g-maplabel" y={(kind === 'station' ? 18 : 14) * s} fontSize={9.5 * s} textAnchor="middle" style={{ strokeWidth: 3 * s, ...(kind === 'selected' ? { fill: c } : null) }}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

// ── Tabuleiro de Combate ─────────────────────────────────────────────

export interface GBoardProps {
  cols?: number;
  rows?: number;
  /** estado por casa "col,row" → 'deploy' | 'target' | 'enemy' */
  cells?: Record<string, 'deploy' | 'target' | 'enemy'>;
  children?: ReactNode;
  style?: CSSProperties;
}

/** Tabuleiro tático; filhos posicionados com `gridColumn`/`gridRow` (1-based). */
export function GBoard({ cols = 8, rows = 3, cells = {}, children, style }: GBoardProps) {
  return (
    <div className="g-board" style={{ ['--cols' as string]: cols, ['--rows' as string]: rows, ...style }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const st = cells[`${c},${r}`];
        return <span key={i} className={cx('g-board__cell', st && `g-board__cell--${st}`)} style={{ gridColumn: c + 1, gridRow: r + 1 }} />;
      })}
      {children}
    </div>
  );
}

export function GToken({ portrait, hp = 1, hpMax = 5, enemy, col, row, label }: { portrait: ReactNode; hp?: number; hpMax?: number; enemy?: boolean; col: number; row: number; label?: string }) {
  return (
    <div className={cx('g-token', enemy && 'g-token--enemy')} style={{ gridColumn: col, gridRow: row, placeSelf: 'center', zIndex: 2 }} aria-label={label}>
      <span className="g-token__card">
        {portrait}
        <span className="g-token__hp" aria-hidden>
          {Array.from({ length: hpMax }, (_, i) => (
            <i key={i} className={i < hp ? 'on' : undefined} />
          ))}
        </span>
      </span>
    </div>
  );
}
