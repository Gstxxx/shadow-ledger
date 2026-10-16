import type { ReactNode } from 'react';
import { POSTURE_COLOR, POSTURE_LABEL } from '../../game/data/rules';
import type { Posture } from '../../game/types';

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="sec">
      <header className="sec-head">
        <h3>{title}</h3>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Reputação: -100..100, centered bar. */
export function RepBar({ value }: { value: number }) {
  const v = Math.max(-100, Math.min(100, value));
  return (
    <span className="meter rep" aria-label={`Reputação ${Math.round(v)}`}>
      <span className="meter-mid" />
      <span
        className="meter-fill"
        style={{
          left: v >= 0 ? '50%' : `${50 + v / 2}%`,
          width: `${Math.abs(v) / 2}%`,
          background: v >= 30 ? 'var(--green)' : v <= -30 ? 'var(--red)' : 'var(--paper-3)',
        }}
      />
    </span>
  );
}

/** Exposição: 0..100. */
export function ExpBar({ value }: { value: number }) {
  return (
    <span className="meter" aria-label={`Exposição ${Math.round(value)}`}>
      <span
        className="meter-fill"
        style={{ left: 0, width: `${Math.min(100, value)}%`, background: value > 60 ? 'var(--red)' : 'var(--amber)' }}
      />
    </span>
  );
}

export function PostureChip({ posture }: { posture: Posture }) {
  return (
    <span className="chip" style={{ color: POSTURE_COLOR[posture], borderColor: POSTURE_COLOR[posture] + '66' }}>
      {POSTURE_LABEL[posture]}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(1, Math.min(Math.max(1, max), v));
  return (
    <span className="stepper">
      <button className="btn sm icon" aria-label="Menos" onClick={() => onChange(clamp(value - 1))}>
        −
      </button>
      <span className="num stepper-v">{value}</span>
      <button className="btn sm icon" aria-label="Mais" onClick={() => onChange(clamp(value + 1))}>
        +
      </button>
      <button className="btn sm" onClick={() => onChange(clamp(max))}>
        máx
      </button>
    </span>
  );
}
