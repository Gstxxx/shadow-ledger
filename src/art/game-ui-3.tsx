import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { GameIcon } from './icons/GameIcon';
import { uiSound } from './game-ui';
import './game-ui.css';

// Fase 3 do kit de jogo: peças para telas simplificadas (docs/UX-RULES.md).

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ── Veredito ─────────────────────────────────────────────────────────

export type GVerdictTone = 'good' | 'neutral' | 'warn' | 'danger' | 'live';

const VERDICT_ACCENT: Record<GVerdictTone, 'ok' | 'warm' | 'signal' | 'cold'> = {
  good: 'ok',
  neutral: 'warm',
  warn: 'warm',
  danger: 'signal',
  live: 'cold',
};

export interface GVerdictProps {
  tone?: GVerdictTone;
  /** id de <GameIcon> ou nó (ícone grande à esquerda) */
  icon?: ReactNode | string;
  /** rótulo curto acima (ex.: 'Veredito', 'Mercado') */
  kicker?: ReactNode;
  /** a frase do veredito: curta, uma linha */
  title: ReactNode;
  /** uma linha de apoio, opcional */
  detail?: ReactNode;
  /** ação primária (ex.: <GButton variant="primary">) */
  primary?: ReactNode;
  /** ação secundária (ex.: <GButton variant="ghost">) */
  secondary?: ReactNode;
  /** papel ARIA: 'status' (padrão) anuncia mudanças; 'alert' para perigo urgente */
  role?: 'status' | 'alert' | 'none';
  className?: string;
  style?: CSSProperties;
}

/** Banner de veredito no topo da tela: ícone grande, frase curta, ação primária e secundária. Abaixo de 460px as ações descem. */
export function GVerdict({ tone = 'neutral', icon, kicker, title, detail, primary, secondary, role = 'status', className, style }: GVerdictProps) {
  return (
    <div role={role === 'none' ? undefined : role} className={cx('g-verdict', `g-verdict--${tone}`, className)} style={style}>
      {icon ? <span className="g-verdict__icon">{typeof icon === 'string' ? <GameIcon id={icon} size={34} accent={VERDICT_ACCENT[tone]} /> : icon}</span> : null}
      <div className="g-verdict__text">
        {kicker != null ? <span className="g-verdict__kicker">{kicker}</span> : null}
        <p className="g-verdict__title">{title}</p>
        {detail != null ? <span className="g-verdict__detail">{detail}</span> : null}
      </div>
      {primary || secondary ? (
        <div className="g-verdict__actions">
          {/* ordem no DOM: secundária, primária (primária à direita); no estreito, row-reverse põe a primária primeiro */}
          {secondary}
          {primary}
        </div>
      ) : null}
    </div>
  );
}

// ── Número grande ────────────────────────────────────────────────────

export interface GBigNumberProps {
  label: ReactNode;
  /** valor já formatado (ex.: '1,2 mi') */
  value: ReactNode;
  /** prefixo/unidade pequena (ex.: 'US$') */
  unit?: ReactNode;
  /** variação; o sinal define a cor e a seta */
  delta?: number;
  /** texto da variação já formatado (padrão: o número com sinal) */
  deltaText?: ReactNode;
  /** linha de apoio abaixo */
  sub?: ReactNode;
  tone?: 'default' | 'ok' | 'danger' | 'action';
  size?: 'md' | 'sm';
  className?: string;
  style?: CSSProperties;
}

/** O número que importa na tela, com rótulo, unidade e variação. Algarismos tabulares. */
export function GBigNumber({ label, value, unit, delta, deltaText, sub, tone = 'default', size = 'md', className, style }: GBigNumberProps) {
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  return (
    <div className={cx('g-big', tone !== 'default' && `g-big--${tone}`, size === 'sm' && 'g-big--sm', className)} style={style}>
      <span className="g-big__k">{label}</span>
      <span className="g-big__v">
        {unit != null ? <span className="g-big__unit">{unit}</span> : null}
        <span>{value}</span>
        {delta != null && delta !== 0 ? (
          <span className={cx('g-big__delta', up && 'g-big__delta--up', down && 'g-big__delta--down')}>
            {up ? '▲' : '▼'} {deltaText ?? `${up ? '+' : '−'}${Math.abs(delta).toLocaleString('pt-BR')}`}
          </span>
        ) : null}
      </span>
      {sub != null ? <span className="g-big__sub">{sub}</span> : null}
    </div>
  );
}

// ── Detalhes recolhíveis ─────────────────────────────────────────────

export interface GDetailsProps {
  label: ReactNode;
  /** resumo à direita do cabeçalho quando fechado/aberto (ex.: '3 itens') */
  summary?: ReactNode;
  /** controlado */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  /** não controlado */
  defaultOpen?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** "Detalhes" recolhível com cara de gaveta: cabeçalho de 44px, corpo rebaixado, abre em 180ms. */
export function GDetails({ label, summary, open, onToggle, defaultOpen = false, children, className, style }: GDetailsProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const bid = useId();
  return (
    <div className={cx('g-details', className)} style={style}>
      <button
        type="button"
        className="g-details__head"
        aria-expanded={isOpen}
        aria-controls={bid}
        onClick={() => {
          uiSound(isOpen ? 'close' : 'open');
          if (open == null) setInner(!isOpen);
          onToggle?.(!isOpen);
        }}
      >
        <span className="g-details__chev" aria-hidden />
        <span>{label}</span>
        {summary != null ? <span className="g-details__summary">{summary}</span> : <span style={{ marginLeft: 'auto' }} />}
        <span className="g-details__grip" aria-hidden />
      </button>
      <div className="g-details__body" data-open={isOpen} id={bid}>
        <div className="g-details__inner" aria-hidden={!isOpen}>
          {/* o conteúdo fica montado para a animação; inert impede foco quando fechado */}
          <div className="g-details__pad" {...(!isOpen ? { inert: '' } : {})}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alavanca de modo ─────────────────────────────────────────────────

export interface GModeOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode | string;
  /** cor do cabo quando esta opção está ativa */
  tone?: 'action' | 'ok' | 'danger';
}

export interface GModeSwitchProps<T extends string> {
  options: GModeOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  style?: CSSProperties;
}

/** Alavanca de modo (ex.: Comprar | Vender): segmentos grandes com um cabo que desliza até o modo ativo. Setas trocam. */
export function GModeSwitch<T extends string>({ options, value, onChange, label, className, style }: GModeSwitchProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const tone = options[i]?.tone ?? 'action';
  const pick = (n: number) => {
    if (n === i) return;
    uiSound('click');
    onChange(options[n].value);
  };
  const onKey = (e: KeyboardEvent, idx: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + options.length) % options.length;
    refs.current[n]?.focus();
    pick(n);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('g-mode', tone !== 'action' && `g-mode--${tone}`, className)}
      style={{ ['--n' as string]: options.length, ['--i' as string]: i, ...style }}
    >
      <span className="g-mode__knob" aria-hidden />
      {options.map((o, idx) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="button"
          role="radio"
          aria-checked={idx === i}
          tabIndex={idx === i ? 0 : -1}
          className="g-mode__opt"
          onKeyDown={(e) => onKey(e, idx)}
          onClick={() => pick(idx)}
        >
          {o.icon ? typeof o.icon === 'string' ? <GameIcon id={o.icon} size={20} accent="none" /> : o.icon : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}
