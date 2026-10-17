import type { ReactNode } from 'react';
import { GMeter, GStepper } from '../../art';
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
    <span className="g-meter-wrap" aria-label={t('game.bits.reputation', { n: Math.round(v) })}>
      <GMeter bipolar value={v + 100} max={200} tone={v >= 30 ? 'ok' : v <= -30 ? 'danger' : 'neutral'} thin />
    </span>
  );
}

/** Exposição: 0..100. */
export function ExpBar({ value }: { value: number }) {
  const { t } = useT();
  return (
    <span className="g-meter-wrap" aria-label={t('game.bits.exposure', { n: Math.round(value) })}>
      <GMeter value={Math.min(100, value)} max={100} tone={value > 60 ? 'danger' : 'action'} thin />
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
  const top = Math.max(1, max);
  return (
    <span className="stepper">
      <GStepper value={value} min={1} max={top} onChange={onChange} decLabel={t('game.bits.less')} incLabel={t('game.bits.more')} />
      <button className="btn sm" onClick={() => onChange(top)}>
        {t('game.bits.max')}
      </button>
    </span>
  );
}
