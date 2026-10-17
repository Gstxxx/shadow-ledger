import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { audio, type Sfx } from '../audio/engine';
import { GameIcon } from './icons/GameIcon';
import './game-ui.css';

// ══════════════════════════════════════════════════════════════════════
// Componentes de JOGO. Visual em game-ui.css (classes .g-*), que também
// pode ser usado direto em JSX existente sem estes wrappers.
// Som: só chama audio.sfx() da API existente; `sfx={false}` desliga.
// ══════════════════════════════════════════════════════════════════════

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const canHover = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches;

/** Som de UI: clique no press e "hover" leve só em aparelhos com mouse. */
export function uiSound(name: Sfx | false | undefined) {
  if (!name) return;
  try {
    audio.sfx(name);
  } catch {
    /* sem áudio: silêncio */
  }
}

const iconNode = (icon: ReactNode | string | undefined, size = 18) =>
  typeof icon === 'string' ? <GameIcon id={icon} size={size} accent="none" /> : icon;

// ── Botão ────────────────────────────────────────────────────────────

export type GButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface GButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: GButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /** id de <GameIcon> ou um nó */
  icon?: ReactNode | string;
  /** ícone depois do texto */
  iconEnd?: ReactNode | string;
  /** texto menor ao lado (preço, atalho) */
  sub?: ReactNode;
  block?: boolean;
  busy?: boolean;
  /** som no clique (padrão 'click'); false = mudo */
  sfx?: Sfx | false;
  children?: ReactNode;
}

export const GButton = forwardRef<HTMLButtonElement, GButtonProps>(function GButton(
  { variant = 'secondary', size = 'md', icon, iconEnd, sub, block, busy, sfx = 'click', className, onClick, onPointerEnter, children, type = 'button', ...rest },
  ref,
) {
  const iconOnly = children == null && sub == null && !!(icon || iconEnd);
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'g-btn',
        `g-btn--${variant}`,
        size !== 'md' && `g-btn--${size}`,
        block && 'g-btn--block',
        iconOnly && 'g-btn--icon',
        busy && 'is-busy',
        className,
      )}
      aria-busy={busy || undefined}
      onPointerEnter={(e) => {
        if (canHover() && !e.currentTarget.disabled) uiSound(sfx ? 'hover' : false);
        onPointerEnter?.(e);
      }}
      onClick={(e) => {
        uiSound(sfx);
        onClick?.(e);
      }}
      {...rest}
    >
      {size === 'sm' ? <span className="g-hit" aria-hidden /> : null}
      {icon ? iconNode(icon, size === 'lg' ? 22 : 18) : null}
      {children != null ? <span>{children}</span> : null}
      {sub != null ? <span className="g-btn__sub">{sub}</span> : null}
      {iconEnd ? iconNode(iconEnd, size === 'lg' ? 22 : 18) : null}
    </button>
  );
});

export interface GIconButtonProps extends Omit<GButtonProps, 'children' | 'icon' | 'sub'> {
  /** nome acessível (obrigatório: botão só de ícone) */
  label: string;
  icon: ReactNode | string;
}

export const GIconButton = forwardRef<HTMLButtonElement, GIconButtonProps>(function GIconButton({ label, icon, ...rest }, ref) {
  return <GButton ref={ref} aria-label={label} title={label} icon={icon} {...rest} />;
});

// ── Controle segmentado ───────────────────────────────────────────────

export interface GSegOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode | string;
  /** nome acessível quando o rótulo é só símbolo */
  aria?: string;
}

export interface GSegmentedProps<T extends string> {
  options: GSegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  sfx?: Sfx | false;
  className?: string;
  style?: CSSProperties;
}

/** Grupo de opções exclusivas (velocidade, camadas do mapa). Setas mudam a seleção. */
export function GSegmented<T extends string>({ options, value, onChange, label, sfx = 'click', className, style }: GSegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    refs.current[n]?.focus();
    uiSound(sfx);
    onChange(options[n].value);
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx('g-seg', className)} style={style}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.aria}
            tabIndex={on ? 0 : -1}
            className="g-seg__opt"
            onKeyDown={(e) => move(e, i)}
            onClick={() => {
              if (!on) uiSound(sfx);
              onChange(o.value);
            }}
          >
            {o.icon ? iconNode(o.icon, 16) : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Painel ───────────────────────────────────────────────────────────

export interface GPanelProps {
  label?: ReactNode;
  code?: ReactNode;
  tone?: 'default' | 'action' | 'alert' | 'paper' | 'sunken';
  raised?: boolean;
  /** padding CSS (padrão 14px 16px 16px) */
  pad?: string | number;
  as?: 'section' | 'div' | 'aside' | 'article';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Painel de equipamento: cantos chanfrados, rebites, textura de chapa e cabeçalho com marca. */
export function GPanel({ label, code, tone = 'default', raised, pad, as: Tag = 'section', className, style, children }: GPanelProps) {
  return (
    <Tag
      className={cx('g-panel', tone !== 'default' && `g-panel--${tone}`, raised && 'g-panel--raised', className)}
      style={{ ...(pad != null ? { ['--g-pad' as string]: typeof pad === 'number' ? `${pad}px` : pad } : null), ...style }}
    >
      {label != null || code != null ? (
        <header className="g-panel__head">
          {label != null ? <span className="g-panel__title">{label}</span> : null}
          <span className="g-panel__rule" aria-hidden />
          {code != null ? <span className="g-panel__code">{code}</span> : null}
        </header>
      ) : null}
      {children}
    </Tag>
  );
}

// ── Abas de fichário ─────────────────────────────────────────────────

export interface GTabItem<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode | string;
  count?: number;
  alert?: boolean;
  /** id do painel controlado (aria-controls) */
  panel?: string;
}

export interface GTabsProps<T extends string> {
  items: GTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** mostra só ícones (rótulo vira aria-label) */
  compact?: boolean;
  sfx?: Sfx | false;
  className?: string;
  style?: CSSProperties;
}

export function GTabs<T extends string>({ items, value, onChange, label, compact, sfx = 'click', className, style }: GTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    if (n < 0) return;
    e.preventDefault();
    refs.current[n]?.focus();
    uiSound(sfx);
    onChange(items[n].id);
  };
  return (
    <div role="tablist" aria-label={label} className={cx('g-tabs', className)} style={style}>
      {items.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={t.panel}
            aria-label={compact && typeof t.label === 'string' ? t.label : undefined}
            tabIndex={on ? 0 : -1}
            className={cx('g-tab', t.alert && 'g-tab--alert')}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => {
              if (!on) uiSound(sfx);
              onChange(t.id);
            }}
          >
            {t.icon ? iconNode(t.icon, 16) : null}
            {compact ? null : <span>{t.label}</span>}
            {t.count ? <GBadge tone={t.alert ? 'alert' : 'neutral'}>{t.count}</GBadge> : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Etiqueta, contador ───────────────────────────────────────────────

export interface GChipProps {
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'live';
  icon?: ReactNode | string;
  title?: string;
  className?: string;
  children?: ReactNode;
}

/** Etiqueta de bagagem: traços, estados, "ao vivo" (tom live pisca um ponto). */
export function GChip({ tone = 'neutral', icon, title, className, children }: GChipProps) {
  return (
    <span className={cx('g-chip', tone !== 'neutral' && `g-chip--${tone}`, className)} title={title}>
      {tone === 'live' ? <span className="g-dot" aria-hidden /> : null}
      {icon ? iconNode(icon, 13) : null}
      {children}
    </span>
  );
}

export function GBadge({ tone = 'neutral', children }: { tone?: 'neutral' | 'alert' | 'action'; children: ReactNode }) {
  return <span className={cx('g-badge', tone !== 'neutral' && `g-badge--${tone}`)}>{children}</span>;
}

// ── Barra de HUD ─────────────────────────────────────────────────────

export interface GMeterProps {
  /** 0..1, ou 0..max */
  value: number;
  max?: number;
  tone?: 'action' | 'danger' | 'live' | 'ok' | 'neutral';
  segmented?: boolean;
  thin?: boolean;
  /** marcador de limiar (mesma escala de value) */
  mark?: number;
  /** rótulo à esquerda e valor à direita (vira uma linha de HUD) */
  label?: ReactNode;
  valueText?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GMeter({ value, max = 1, tone = 'action', segmented, thin, mark, label, valueText, className, style }: GMeterProps) {
  const v = Math.max(0, Math.min(1, value / max));
  const bar = (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={typeof label === 'string' ? label : undefined}
      className={cx('g-meter', tone !== 'action' && `g-meter--${tone}`, segmented && 'g-meter--segmented', thin && 'g-meter--thin', !label && className)}
      style={{ ['--v' as string]: v, ...(label ? null : style) }}
    >
      <span className="g-meter__fill" />
      {mark != null ? <span className="g-meter__mark" style={{ ['--m' as string]: Math.max(0, Math.min(1, mark / max)) }} /> : null}
    </div>
  );
  if (!label) return bar;
  return (
    <div className={cx('g-meterrow', className)} style={style}>
      <span className="g-label">{label}</span>
      {bar}
      <span className="g-counter">{valueText ?? Math.round(v * 100)}</span>
    </div>
  );
}

export interface GCounterProps {
  value: number;
  format?: (n: number) => string;
  /** prefixo pequeno (ex.: 'US$') */
  unit?: string;
  suffix?: string;
  /** colore pelo sinal (ganho/perda) */
  signed?: boolean;
  /** pisca verde/vermelho quando o valor muda */
  flash?: boolean;
  size?: 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

/** Número de HUD em algarismos tabulares, com unidade e flash de variação. */
export function GCounter({ value, format = (n) => n.toLocaleString('pt-BR'), unit, suffix, signed, flash = true, size = 'md', className, style }: GCounterProps) {
  const prev = useRef(value);
  const [dir, setDir] = useState<'' | 'up' | 'down'>('');
  useEffect(() => {
    if (!flash || value === prev.current) return;
    setDir(value > prev.current ? 'up' : 'down');
    prev.current = value;
    const t = setTimeout(() => setDir(''), 620);
    return () => clearTimeout(t);
  }, [value, flash]);
  return (
    <span
      className={cx(
        'g-counter',
        size === 'lg' && 'g-counter--lg',
        signed && value > 0 && 'g-counter--up',
        signed && value < 0 && 'g-counter--down',
        dir && `is-${dir}`,
        className,
      )}
      style={style}
    >
      {unit ? <span className="g-counter__unit">{unit}</span> : null}
      {signed && value > 0 ? '+' : ''}
      {format(value)}
      {suffix ? <span className="g-counter__suffix">{suffix}</span> : null}
    </span>
  );
}

// ── Item de menu, ajuda ──────────────────────────────────────────────

export interface GMenuItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: ReactNode;
  meta?: ReactNode;
  current?: boolean;
  sfx?: Sfx | false;
}

/** Linha do menu principal: marcador ▶ desliza no hover/foco, faixa âmbar. */
export function GMenuItem({ label, meta, current, sfx = 'click', className, onClick, onPointerEnter, onFocus, ...rest }: GMenuItemProps) {
  return (
    <button
      type="button"
      className={cx('g-menu-item', className)}
      aria-current={current || undefined}
      onPointerEnter={(e) => {
        if (canHover()) uiSound('hover');
        onPointerEnter?.(e);
      }}
      onFocus={onFocus}
      onClick={(e) => {
        uiSound(sfx);
        onClick?.(e);
      }}
      {...rest}
    >
      <span>{label}</span>
      {meta != null ? <span className="g-menu-item__meta">{meta}</span> : null}
    </button>
  );
}

/** Botão "?" de glossário: 20px visível, 44px de área de toque. */
export function GHelp({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button type="button" className="g-help" aria-label={label} title={label} onClick={onClick}>
      ?
    </button>
  );
}
