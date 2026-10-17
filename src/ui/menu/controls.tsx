import { useId, type ReactNode } from 'react';
import { GDetails } from '../../art/game-ui-3';
import '../../art/game-ui-3.css';
import { GRange, GStepper } from '../../art/game-ui-2';
import { sfx } from './settings';

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
  help?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="slm-field">
      <span className="slm-field-label" id={id}>
        {label}
      </span>
      <div className="g-seg slm-seg" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className="g-seg__opt slm-seg-btn"
            onClick={() => {
              if (o.value !== value) sfx('click');
              onChange(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {help && <p className="slm-help">{help}</p>}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  help,
  tone,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
  help?: ReactNode;
  tone?: 'danger';
}) {
  const id = useId();
  return (
    <div className={`slm-field slm-toggle-field${tone ? ` slm-toggle--${tone}` : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={help ? id : undefined}
        className="slm-toggle"
        onClick={() => {
          sfx('click');
          onChange(!checked);
        }}
      >
        <span className="slm-toggle-label">{label}</span>
        {/* Interruptor basculante do kit de jogo: o estilo lê aria-checked do próprio trilho. */}
        <span className="g-toggle" aria-checked={checked} aria-hidden="true" />
      </button>
      {help && (
        <p className="slm-help" id={id}>
          {help}
        </p>
      )}
    </div>
  );
}

export function Slider({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  onChange(v: number): void;
  onCommit?(): void;
}) {
  const id = useId();
  const pct = Math.round(value * 100);
  return (
    <div className="slm-field">
      <label className="slm-field-label slm-field-label--row" htmlFor={id}>
        <span>{label}</span>
        <span className="slm-mono">{pct}%</span>
      </label>
      <GRange id={id} className="slm-range" min={0} max={100} step={5} value={pct} onChange={(v) => onChange(v / 100)} onPointerUp={onCommit} onKeyUp={onCommit} />
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange(v: number): void;
  format?(v: number): string;
}) {
  const id = useId();
  return (
    <div className="slm-field">
      <span className="slm-field-label" id={id}>
        {label}
      </span>
      <div className="slm-stepper" role="group" aria-labelledby={id}>
        <GStepper value={value} min={min} max={max} onChange={onChange} format={format ? (n) => format(n) : undefined} />
      </div>
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?(): void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`g-btn g-btn--${variant}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/** Bloco recolhível ("Avançado", "Detalhes"): o GDetails do kit, com o resumo curto como `hint`. */
export function Disclosure({
  label,
  hint,
  children,
  defaultOpen = false,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  reduced?: boolean;
  className?: string;
}) {
  return (
    <GDetails label={label} summary={hint} defaultOpen={defaultOpen} className={`slm-disc${className ? ` ${className}` : ''}`}>
      {children}
    </GDetails>
  );
}
