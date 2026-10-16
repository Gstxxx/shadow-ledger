import { useGameStore } from '../../store/game';

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
