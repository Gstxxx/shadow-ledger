import { useEffect, useMemo, useRef } from 'react';
import { runGlobe } from '../art/globe';
import { ledgerLine } from './ledgerLines';
import { useSettings } from '../../store/settings';

const ROWS = 34;

/** Title world: a ledger drifting under a dotted planet horizon, with grain on top. */
export function Backdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useSettings((s) => s.reducedMotion);
  const lines = useMemo(() => Array.from({ length: ROWS * 2 }, () => ledgerLine()), []);
  const redacted = useMemo(() => new Set(Array.from({ length: 10 }, () => Math.floor(Math.random() * ROWS * 2))), []);

  useEffect(() => {
    if (!canvas.current) return;
    return runGlobe(canvas.current, { reduced });
  }, [reduced]);

  return (
    <div className="backdrop" aria-hidden>
      <div className="ledger">
        <div className="ledger-scroll">
          {lines.map((l, i) => (
            <div key={i} className="ledger-row">
              <span className="ledger-no">{String(1000 + i).padStart(5, '0')}</span>
              <span className="ledger-text">{l}</span>
              {redacted.has(i) && <span className="ledger-bar" style={{ animationDelay: `${(i % 9) * 1.7}s` }} />}
            </div>
          ))}
        </div>
      </div>
      <canvas ref={canvas} className="globe" />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}
