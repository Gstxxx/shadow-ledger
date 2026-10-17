import { useGameStore } from '../../store/game';
import { useT } from '../../i18n';
import { msgText } from './msgText';
import { GToast } from '../../art';

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const { lang } = useT();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <GToast key={t.id} tone={t.tone === 'good' ? 'ok' : t.tone === 'bad' ? 'bad' : 'neutral'}>
          {msgText(t.msg, t.text, lang)}
        </GToast>
      ))}
    </div>
  );
}
