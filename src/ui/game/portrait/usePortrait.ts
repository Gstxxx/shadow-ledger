import { useEffect, useState } from 'react';

/** Celular em pé (ADR 0005): retrato e estreito. Deitado e desktop seguem o layout de gavetas. */
export const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 820px)';

export function usePortrait(): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(PORTRAIT_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT_QUERY);
    const onChange = () => setOn(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return on;
}
