import { useId, type ReactNode } from 'react';
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
      <div className="slm-seg" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className="slm-seg-btn"
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
        <span className="slm-toggle-track" aria-hidden="true">
          <span className="slm-toggle-thumb" />
        </span>
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
      <input
        id={id}
        className="slm-range"
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
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
  const set = (v: number) => {
    const n = Math.max(min, Math.min(max, v));
    if (n !== value) sfx('click');
    onChange(n);
  };
  return (
    <div className="slm-field">
      <span className="slm-field-label" id={id}>
        {label}
      </span>
      <div className="slm-stepper" role="group" aria-labelledby={id}>
        <button type="button" className="slm-step-btn" aria-label="−" disabled={value <= min} onClick={() => set(value - 1)}>
          −
        </button>
        <output className="slm-step-value" aria-live="polite">
          {format ? format(value) : value}
        </output>
        <button type="button" className="slm-step-btn" aria-label="+" disabled={value >= max} onClick={() => set(value + 1)}>
          +
        </button>
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
    <button type={type} className={`slm-btn slm-btn--${variant}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
