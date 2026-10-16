import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import Gallery from './Gallery';
import { AnalystPortrait, GameIcon, ICONS, Logo, OperativePortrait, type AnalystMood } from './index';

// Montagem temporária para revisão. `?solo=...` mostra um asset grande para inspeção:
//   ?solo=analyst&mood=alert · ?solo=icons&size=48&from=0 · ?solo=logo · ?solo=ops
const q = new URLSearchParams(location.search);
const solo = q.get('solo');

function Solo(): ReactNode {
  const wrap = (c: ReactNode) => (
    <div style={{ minHeight: '100vh', background: 'var(--sl-bg)', color: 'var(--sl-text)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center', padding: 16 }}>{c}</div>
  );
  if (solo === 'analyst') {
    const moods: AnalystMood[] = q.get('mood') ? [q.get('mood') as AnalystMood] : ['neutral', 'concerned', 'alert', 'pleased'];
    return wrap(moods.map((m) => <AnalystPortrait key={m} mood={m} size={moods.length > 1 ? 300 : 560} blink={false} />));
  }
  if (solo === 'icons') {
    const size = Number(q.get('size') ?? 64);
    const from = Number(q.get('from') ?? 0);
    const n = Number(q.get('n') ?? 40);
    return wrap(
      Object.keys(ICONS)
        .slice(from, from + n)
        .map((id) => (
          <div key={id} style={{ display: 'grid', placeItems: 'center', gap: 4, width: size + 24 }}>
            <GameIcon id={id} size={size} />
            <span style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 10, color: 'var(--sl-text-muted)' }}>{id}</span>
          </div>
        )),
    );
  }
  if (solo === 'logo') return wrap(<Logo variant="full" height={140} />);
  if (solo === 'ops') return wrap(['raven-07', 'mbeki', 'ito-kenji'].map((s, i) => <OperativePortrait key={s} seed={s} size={300} status={i === 2 ? 'DETIDO' : undefined} code={i === 1 ? undefined : 'OP-0417'} name={i ? undefined : 'Raven'} />));
  return null;
}

document.body.style.margin = '0';
createRoot(document.getElementById('root')!).render(<StrictMode>{solo ? <Solo /> : <Gallery />}</StrictMode>);
