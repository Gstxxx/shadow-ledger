import { useEffect, useState } from 'react';

/** Celular em pé (ADR 0005): retrato e estreito. Deitado e desktop seguem o layout de gavetas. */
export const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 820px)';

export const usePortrait = (): boolean => useMedia(PORTRAIT_QUERY);

/** Acompanha uma media query (true/false). */
export function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setOn(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return on;
}
