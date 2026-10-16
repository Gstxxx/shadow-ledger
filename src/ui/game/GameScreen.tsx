import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { player, standing } from '../../game/state';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { SettingsPanel } from '../title/Settings';
import { AgencyPanel } from './AgencyPanel';
import { CombatOverlay } from './CombatOverlay';
import { CountryPanel } from './CountryPanel';
import { DirectorBanner, EventModal, GameOver, LogPanel } from './Overlays';
import { TopBar } from './TopBar';
import { WorldMap } from './WorldMap';
import type { MapMode } from './WorldMap';
import './game.css';

const MODES: { id: MapMode; label: string }[] = [
  { id: 'posture', label: 'Postura' },
  { id: 'exposure', label: 'Exposição' },
  { id: 'politics', label: 'Política' },
];

/** Drives the continuous clock with requestAnimationFrame. */
function useGameLoop() {
  const tick = useGameStore((s) => s.tick);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      tick((now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tick]);
}

export function GameScreen() {
  useGameLoop();
  const s = useGame();
  const quit = useGameStore((st) => st.quit);
  const togglePause = useGameStore((st) => st.togglePause);
  const setSpeed = useGameStore((st) => st.setSpeed);
  const [mode, setMode] = useState<MapMode>('posture');
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
  const [menu, setMenu] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const a = player(s);

  // Map tension follows the worst announced Ameaça and the local Exposição.
  const soon = a.threats.reduce((m, t) => Math.max(m, 1 - Math.min(1, (t.strikesAt - s.time) / 72)), 0);
  const tension = Math.max(soon, a.flight ? 0 : standing(a, a.location).exposure / 100);
  useEffect(() => {
    audio.setTension(tension);
  }, [Math.round(tension * 10)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.key === '1') setSpeed(1);
      else if (e.key === '2') setSpeed(2);
      else if (e.key === '3' || e.key === '4') setSpeed(4);
      else if (e.key === 'Escape') setMenu((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, setSpeed]);

  const openMenu = () => {
    audio.sfx('open');
    setMenu(true);
    useGameStore.setState({ paused: true });
  };

  return (
    <div className="game">
      <TopBar onMenu={openMenu} onLeft={() => setDrawer(drawer === 'left' ? null : 'left')} onRight={() => setDrawer(drawer === 'right' ? null : 'right')} />
      <DirectorBanner />
      <div className="game-body">
        <aside className={`side left${drawer === 'left' ? ' open' : ''}`}>
          <button className="btn icon ghost drawer-close only-narrow" aria-label="Fechar" onClick={() => setDrawer(null)}>
            <X size={18} />
          </button>
          <CountryPanel />
        </aside>
        <main className="map-area">
          <WorldMap mode={mode} />
          <div className="map-modes" role="group" aria-label="Camada do mapa">
            {MODES.map((m) => (
              <button key={m.id} className="btn sm" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <LogPanel open={logOpen} onToggle={() => setLogOpen(!logOpen)} />
        </main>
        <aside className={`side right${drawer === 'right' ? ' open' : ''}`}>
          <button className="btn icon ghost drawer-close only-narrow" aria-label="Fechar" onClick={() => setDrawer(null)}>
            <X size={18} />
          </button>
          <AgencyPanel />
        </aside>
      </div>
      <EventModal />
      <CombatOverlay />
      <GameOver onQuit={quit} />
      {menu && (
        <div className="scrim" onClick={() => setMenu(false)}>
          <div className="event-card" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2>Pausa</h2>
            <SettingsPanel embedded />
            <div className="event-actions">
              <button className="btn" onClick={() => (audio.sfx('close'), quit())}>
                Salvar e sair
              </button>
              <button className="btn primary" onClick={() => (audio.sfx('click'), setMenu(false))}>
                Voltar ao jogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
