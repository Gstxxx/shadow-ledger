import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ease, f } from '../ease';
import type { Strings } from '../strings';

/** Créditos como um documento liberado: cada valor começa sob tarja e a tarja recua, linha a linha. */
export function Credits({ s, reduced }: { s: Strings; reduced: boolean }) {
  const list = useRef<HTMLDListElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.slm-credit-bar',
        { scaleX: 1 },
        { scaleX: 0, duration: f(9), ease: ease.accelExit, stagger: f(4), delay: f(14), transformOrigin: '100% 50%' },
      );
    }, list);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div className="slm-credits">
      <dl ref={list} className="slm-credit-list">
        {s.creditsLines.map(([k, v]) => (
          <div key={k} className="slm-credit" data-enter>
            <dt>{k}</dt>
            <dd>
              <span className="slm-credit-value">{v}</span>
              {!reduced && <i className="slm-credit-bar" aria-hidden="true" />}
            </dd>
          </div>
        ))}
      </dl>
      <p className="slm-help" data-enter>
        {s.creditsNote}
      </p>
    </div>
  );
}
