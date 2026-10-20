import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import Gallery from './proto-gallery';
import { GameScreenMock } from './proto-gamekit';
import { StageDemo } from './proto-stage';
import { SimpleDemo } from './proto-simple';
import { UnitPortrait } from './UnitPortrait';
import { ITEMS } from '../game/data/items';
import { DIRECTOR_ORIGINS, DirectorPortrait, AnalystPortrait, GameIcon, ICONS, Logo, OperativePortrait, type AnalystMood } from './index';

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
  if (solo === 'directors') {
    const size = Number(q.get('size') ?? 300);
    const mood = (q.get('mood') ?? 'neutral') as AnalystMood;
    const list = q.get('o') ? [q.get('o') as (typeof DIRECTOR_ORIGINS)[number]] : DIRECTOR_ORIGINS;
    return wrap(list.map((o) => <DirectorPortrait key={o} origin={o} mood={mood} size={size} blink={false} />));
  }
  if (solo === 'units') {
    const size = Number(q.get('size') ?? 72);
    const n = Number(q.get('n') ?? 3);
    return wrap(
      Object.values(ITEMS)
        .filter((it) => !['arms', 'special'].includes(it.cls))
        .flatMap((it) =>
          Array.from({ length: n }, (_, k) => (
            <div key={it.id + k} style={{ display: 'grid', gap: 3, justifyItems: 'center' }}>
              <UnitPortrait itemId={it.id} seed={k * 7919 + 13} size={size} hostile={k === 2} hurt={k === 1 && size > 40} alt={it.name} />
              {k === 0 ? <span style={{ fontFamily: 'var(--sl-font-mono)', fontSize: 9, color: 'var(--sl-text-muted)' }}>{it.id}</span> : null}
            </div>
          )),
        ),
    );
  }
  if (solo === 'simple') return <SimpleDemo screen={(q.get('s') as 'trade' | 'country' | 'kit') ?? 'trade'} />;
  if (solo === 'stage') return <StageDemo initial={(q.get('m') as 'country' | 'agency' | 'item' | 'none') ?? 'country'} />;
  if (solo === 'game') return <div style={{ background: 'var(--g-bg)', minHeight: '100vh' }}><GameScreenMock width={Number(q.get('w') ?? 1440)} /></div>;
  if (solo === 'logo') return wrap(<Logo variant="full" height={140} />);
  if (solo === 'ops') return wrap(['raven-07', 'mbeki', 'ito-kenji'].map((s, i) => <OperativePortrait key={s} seed={s} size={300} status={i === 2 ? 'DETIDO' : undefined} code={i === 1 ? undefined : 'OP-0417'} name={i ? undefined : 'Raven'} />));
  return null;
}

document.body.style.margin = '0';
// simula áreas seguras como o ?safe= do jogo: ?safe=top,right,bottom,left
const safe = q.get('safe');
if (safe) {
  const [t = 0, r = 0, b = 0, l = 0] = safe.split(',').map(Number);
  const st = document.documentElement.style;
  st.setProperty('--safe-t', `${t}px`);
  st.setProperty('--safe-r', `${r}px`);
  st.setProperty('--safe-b', `${b}px`);
  st.setProperty('--safe-l', `${l}px`);
}
createRoot(document.getElementById('root')!).render(<StrictMode>{solo ? <Solo /> : <Gallery />}</StrictMode>);
