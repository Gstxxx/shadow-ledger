import { useEffect, useRef, useState } from 'react';
import { RotateCw, Volume2, VolumeX } from 'lucide-react';
import { audio } from './audio/engine';
import { useGameStore } from './store/game';
import { useSettings } from './store/settings';
import { GameScreen } from './ui/game/GameScreen';
import { ErrorBoundary } from './ui/game/ErrorBoundary';
import { Toasts } from './ui/game/Toasts';
import { ConnectedMainMenu } from './ui/menu';
import './ui/title/title.css';

export default function App() {
  const rawScreen = useGameStore((s) => s.screen);
  const hasGame = useGameStore((s) => !!s.game);
  // Never render the game without a game loaded (e.g. after a hot reload).
  const screen = rawScreen === 'game' && !hasGame ? 'title' : rawScreen;
  const inCombat = useGameStore((s) => !!s.game?.combat || !!s.game?.pendingCombat);
  const music = useSettings((s) => s.music);
  const [muted, setMuted] = useState(false);
  const firstTitle = useRef(true);
  const [intro, setIntro] = useState(true);

  // Autoplay policy: audio starts on the first gesture.
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    audio.setScene(screen === 'game' ? (inCombat ? 'combat' : 'map') : 'menu');
  }, [screen, inCombat]);

  useEffect(() => {
    audio.setMusicVolume(muted ? 0 : music);
  }, [muted, music]);

  useEffect(() => {
    if (screen !== 'title' && firstTitle.current) {
      firstTitle.current = false;
      setIntro(false);
    }
  }, [screen]);

  return (
    <>
      {screen !== 'game' && <ConnectedMainMenu skipIntro={!intro} />}
      {screen === 'game' && (
        <ErrorBoundary>
          <GameScreen />
        </ErrorBoundary>
      )}
      {screen !== 'game' && (
        <button className="btn icon ghost sound-toggle" aria-label={muted ? 'Ligar música' : 'Silenciar música'} onClick={() => setMuted(!muted)}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}
      <Toasts />
      <div className="rotate-notice">
        <RotateCw size={40} color="var(--amber)" />
        <div>Gire o aparelho: Shadow Ledger é jogado na horizontal.</div>
      </div>
    </>
  );
}
