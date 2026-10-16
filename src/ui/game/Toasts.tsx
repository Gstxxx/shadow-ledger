import { useGameStore } from '../../store/game';
import { useT } from '../../i18n';
import { msgText } from './msgText';

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const { lang } = useT();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone}`}>
          {msgText(t.msg, t.text, lang)}
        </div>
      ))}
    </div>
  );
}
