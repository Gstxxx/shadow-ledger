import { useCallback, useEffect, useState } from 'react';
import { player, standing } from '../../game/state';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import type { Key } from '../../i18n';
import { SettingsPanel } from '../title/Settings';
import { CombatOverlay } from './CombatOverlay';
import { DirectorBanner, EventModal, GameOver, LogPanel } from './Overlays';
import { TopBar } from './TopBar';
import { AnalystLayer } from '../analyst';
import { CinematicHost } from '../cinematics';
import { WorldMap } from './WorldMap';
import { DossierHost } from './unit/DossierHost';
import { useMedia, usePortrait } from './portrait/usePortrait';
import { StageDock, StageModals } from './stage/Stage';
import { StageCtx } from './stage/context';
import { useStageHistory } from './stage/history';
import type { StageApi, StageModal } from './stage/context';
import { installSafeAreaDebug } from './portrait/safeArea';
// Regras de pé (modais e Combate em tela cheia, grade vertical); antes vinham junto com a folha inferior.
import './portrait/portrait.css';
import './portrait/safe.css';

installSafeAreaDebug();
import { GModal, GSegmented, useModalStack } from '../../art';
import '../../art/game-ui.css';
import type { MapMode } from './WorldMap';
import './game.css';

const MODES: { id: MapMode; labelKey: Key }[] = [
  { id: 'posture', labelKey: 'game.screen.mode.posture' },
  { id: 'exposure', labelKey: 'game.screen.mode.exposure' },
  { id: 'politics', labelKey: 'game.screen.mode.politics' },
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
  const { t } = useT();
  const s = useGame();
  const quit = useGameStore((st) => st.quit);
  const togglePause = useGameStore((st) => st.togglePause);
  const setSpeed = useGameStore((st) => st.setSpeed);
  const [mode, setMode] = useState<MapMode>('posture');
  const portrait = usePortrait();
  const tiny = useMedia('(max-width: 380px)');
  const [menu, setMenu] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const a = player(s);

  // ADR 0006: o mapa é o palco; País, Agência e Item abrem um modal central por vez, com voltar.
  const stack = useModalStack<StageModal>();
  // O palco fica na URL (?m=…) e o voltar do navegador/celular volta um modal.
  const stage: StageApi = useStageHistory(stack);

  // Ao pousar (ou sair de Detido/Sequestrado), o país escolhido segue o Diretor.
  const select = useGameStore((st) => st.select);
  const landedAt = a.flight ? null : a.location;
  useEffect(() => {
    if (landedAt) select(landedAt);
  }, [landedAt, select]);

  // Tocar num país do mapa abre o modal dele.
  const onPickCountry = useCallback((id: string) => stack.open({ kind: 'country', id, tab: 'overview' }), []); // eslint-disable-line react-hooks/exhaustive-deps

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
      else if (e.key === '8') setSpeed(8);
      // Esc abre a pausa só sem outro diálogo aberto (cada modal fecha com o próprio Esc).
      // …nem durante Prévia, Combate ou cena (o Esc ali pula a cena do Golpe).
      else if (e.key === 'Escape') {
        const g = useGameStore.getState().game;
        if (!document.querySelector('[role="dialog"], .combat-screen, .cc-root') && !g?.combat && !g?.pendingCombat) setMenu(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, setSpeed]);

  const closeMenu = useCallback(() => setMenu(false), []);
  const openMenu = () => {
    audio.sfx('open');
    setMenu(true);
    useGameStore.setState({ paused: true });
  };

  return (
    <StageCtx.Provider value={stage}>
    <DossierHost>
    <div className={`game g-skin stage${portrait ? ' upright' : ''}${stage.current ? ' stage-open' : ''}${s.combat || s.pendingCombat ? ' combat-open' : ''}`}>
      <TopBar onMenu={openMenu} />
      <DirectorBanner />
      <div className="game-body">
        <main className="map-area" data-tour="map">
          <WorldMap mode={mode} onPickCountry={onPickCountry} />
          <GSegmented
            className="map-modes"
            label={t('game.screen.mapLayer')}
            options={MODES.map((m) => ({ value: m.id, label: t(m.labelKey) }))}
            value={mode}
            onChange={setMode}
          />
          <div className="stage-foot">
            <LogPanel open={logOpen} onToggle={() => setLogOpen(!logOpen)} />
            <StageDock stage={stage} compact={tiny} />
          </div>
        </main>
      </div>
      <StageModals stage={stage} />
      <EventModal />
      <CombatOverlay />
      <CinematicHost />
      <GameOver onQuit={quit} />
      {/* Analista (rival-ai): sem gavetas no palco, "abrir painel" abre o país do Diretor ou a Agência. */}
      <AnalystLayer
        onOpenDrawer={(side) =>
          stage.open(side === 'left' ? { kind: 'country', id: a.location, tab: 'market' } : { kind: 'agency', tab: 'director' })
        }
      />
      <GModal
        open={menu}
        onClose={closeMenu}
        closeLabel={t('common.close')}
        title={t('game.screen.pauseTitle')}
        actions={
          <>
            <button className="btn" onClick={() => (audio.sfx('close'), quit())}>
              {t('game.screen.saveQuit')}
            </button>
            <button className="btn primary" onClick={closeMenu}>
              {t('game.screen.backToGame')}
            </button>
          </>
        }
      >
        <SettingsPanel embedded />
      </GModal>
    </div>
    </DossierHost>
    </StageCtx.Provider>
  );
}
