/**
 * Protótipo isolado (só dev): abre `/src/ui/game/market/proto.html` com `npx vite`.
 * Monta uma partida do Primeiro Contrato pausada e mostra o novo Mercado e a ficha de Unidade
 * sem tocar na tela de jogo atual.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../index.css';
import '../game.css';
import { PRESETS } from '../../../game/data/rules';
import { player } from '../../../game/state';
import { useGame, useGameStore } from '../../../store/game';
import { Toasts } from '../Toasts';
import { FleetSpace, UnitCard, UpkeepBalance } from '../unit/UnitCard';
import { UnitDossier } from '../unit/UnitDossier';
import { MarketPanel } from './MarketPanel';
import { GameScreen } from '../GameScreen';

// `?full` monta a tela de jogo inteira, com os painéis novos ligados.
const FULL = new URLSearchParams(location.search).has('full');

useGameStore.getState().start({ preset: PRESETS.find((p) => p.id === 'first-contract') ?? PRESETS[0], difficulty: 2, hardcore: false, seed: 7 });
useGameStore.setState({ paused: true });

function Proto() {
  const s = useGame();
  const a = player(s);
  const selected = useGameStore((st) => st.selected) ?? a.location;
  const select = useGameStore((st) => st.select);
  const mutate = useGameStore((st) => st.mutate);
  const [uid, setUid] = useState<string | null>(null);
  const ids = Object.keys(s.countries).sort((x, y) => s.countries[x].name.localeCompare(s.countries[y].name));
  return (
    <div className="proto">
      <header className="proto-bar">
        <b>Protótipo</b>
        <label>
          País{' '}
          <select value={selected} onChange={(e) => select(e.target.value)}>
            {ids.map((id) => (
              <option key={id} value={id}>
                {s.countries[id].name}
                {id === a.location ? ' (Diretor)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button className="btn sm" onClick={() => mutate((g) => (player(g).location = selected))}>
          Teleportar Diretor
        </button>
        <span className="mono">Caixa {Math.round(a.cash / 1000)} mil</span>
      </header>
      <div className="proto-cols">
        <aside className="side proto-side">
          <div className="panel-scroll">
            <h2 className="proto-h">{s.countries[selected].name}</h2>
            <MarketPanel countryId={selected} />
          </div>
        </aside>
        <aside className="side proto-side">
          <div className="panel-scroll">
            <h2 className="proto-h">Escolta e Frota</h2>
            <FleetSpace a={a} />
            {[...a.escort, ...a.fleet].map((u) => (
              <UnitCard key={u.uid} unit={u} onOpen={setUid} />
            ))}
            <h2 className="proto-h">Mês</h2>
            <UpkeepBalance a={a} />
          </div>
        </aside>
      </div>
      {uid && <UnitDossier uid={uid} onClose={() => setUid(null)} />}
      <Toasts />
    </div>
  );
}

const css = document.createElement('style');
css.textContent = `
.proto{position:fixed;inset:0;display:flex;flex-direction:column;background:var(--ink-0)}
.proto-bar{display:flex;gap:14px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line);font-size:13px;flex-wrap:wrap}
.proto-bar select{background:var(--ink-3);color:var(--paper);border:1px solid var(--line-2);min-height:36px}
.proto-cols{flex:1;min-height:0;display:grid;grid-template-columns:var(--side) var(--side);gap:24px;padding:0 24px}
.proto-side{border:1px solid var(--line)}
.proto .side.proto-side{position:relative!important;transform:none!important;inset:auto!important;width:auto!important;max-width:none!important;visibility:visible!important;opacity:1!important;box-shadow:none!important}
.proto-h{margin:0;padding:14px 14px 4px;font:650 20px/1.2 var(--display)}
@media (max-height:520px),(max-width:800px){.proto-cols{grid-template-columns:min(380px,88vw);padding:0}.proto-cols>aside:last-child{display:none}}
`;
document.head.appendChild(css);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {FULL ? (
      <>
        <GameScreen />
        <Toasts />
      </>
    ) : (
      <Proto />
    )}
  </StrictMode>,
);
