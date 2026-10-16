import type { ReactNode } from 'react';
import { POSTURE_COLOR } from '../../game/data/rules';
import type { Posture } from '../../game/types';
import { useT } from '../../i18n';
import { postureLabel } from '../../i18n/lookup';

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
  const { t } = useT();
  const v = Math.max(-100, Math.min(100, value));
  return (
    <span className="meter rep" aria-label={t('game.bits.reputation', { n: Math.round(v) })}>
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
  const { t } = useT();
  return (
    <span className="meter" aria-label={t('game.bits.exposure', { n: Math.round(value) })}>
      <span
        className="meter-fill"
        style={{ left: 0, width: `${Math.min(100, value)}%`, background: value > 60 ? 'var(--red)' : 'var(--amber)' }}
      />
    </span>
  );
}

export function PostureChip({ posture }: { posture: Posture }) {
  const { lang } = useT();
  return (
    <span className="chip" style={{ color: POSTURE_COLOR[posture], borderColor: POSTURE_COLOR[posture] + '66' }}>
      {postureLabel(posture, lang)}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const { t } = useT();
  const clamp = (v: number) => Math.max(1, Math.min(Math.max(1, max), v));
  return (
    <span className="stepper">
      <button className="btn sm icon" aria-label={t('game.bits.less')} onClick={() => onChange(clamp(value - 1))}>
        −
      </button>
      <span className="num stepper-v">{value}</span>
      <button className="btn sm icon" aria-label={t('game.bits.more')} onClick={() => onChange(clamp(value + 1))}>
        +
      </button>
      <button className="btn sm" onClick={() => onChange(clamp(max))}>
        {t('game.bits.max')}
      </button>
    </span>
  );
}
