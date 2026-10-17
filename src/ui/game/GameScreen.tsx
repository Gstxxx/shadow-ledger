import { useEffect, useState } from 'react';
import { Briefcase, MapPin, X } from 'lucide-react';
import { player, standing } from '../../game/state';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import type { Key } from '../../i18n';
import { SettingsPanel } from '../title/Settings';
import { AgencyPanel } from './AgencyPanel';
import { CombatOverlay } from './CombatOverlay';
import { CountryPanel } from './CountryPanel';
import { DirectorBanner, EventModal, GameOver, LogPanel } from './Overlays';
import { TopBar } from './TopBar';
import { WorldMap } from './WorldMap';
import { DossierHost } from './unit/DossierHost';
import { BottomSheet } from './portrait/BottomSheet';
import type { SheetSnap } from './portrait/BottomSheet';
import { PORTRAIT_QUERY, usePortrait } from './portrait/usePortrait';
import { installSafeAreaDebug } from './portrait/safeArea';
import './portrait/safe.css';

installSafeAreaDebug();
import { countryName } from '../../i18n/lookup';
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
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
  const portrait = usePortrait();
  const [sheetTab, setSheetTab] = useState<'country' | 'agency'>('country');
  const [snap, setSnap] = useState<SheetSnap>('half');
  const [menu, setMenu] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const a = player(s);
  const selected = useGameStore((st) => st.selected);

  // Ao pousar (ou sair de Detido/Sequestrado), o painel do país segue o Diretor.
  const select = useGameStore((st) => st.select);
  const landedAt = a.flight ? null : a.location;
  useEffect(() => {
    if (landedAt) select(landedAt);
  }, [landedAt, select]);

  // On phones the country drawer (or, standing up, the sheet's country tab) opens when a country is picked.
  useEffect(() => {
    if (!selected) return;
    if (window.matchMedia(PORTRAIT_QUERY).matches) {
      setSheetTab('country');
      setSnap((v) => (v === 'peek' ? 'half' : v));
    } else if (window.matchMedia('(max-width: 900px), (max-height: 520px)').matches) setDrawer('left');
  }, [selected]);

  // Depuração (só em dev): window.__slSheet('peek'|'half'|'full', 'country'|'agency') para screenshots.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __slSheet?: unknown }).__slSheet = (s: SheetSnap, tab?: 'country' | 'agency') => {
      setSnap(s);
      if (tab) setSheetTab(tab);
    };
  }, []);

  /** Abre o painel pedido no layout atual (gaveta deitado, aba da folha em pé). */
  const openPanel = (side: 'left' | 'right') => {
    if (portrait) {
      setSheetTab(side === 'left' ? 'country' : 'agency');
      setSnap((v) => (v === 'peek' ? 'half' : v));
    } else setDrawer(side);
  };

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

  const mapArea = (
    <main className="map-area" data-tour="map">
      <WorldMap mode={mode} />
      <div className="map-modes" role="group" aria-label={t('game.screen.mapLayer')}>
        {MODES.map((m) => (
          <button key={m.id} className="btn sm" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {t(m.labelKey)}
          </button>
        ))}
      </div>
      <LogPanel open={logOpen} onToggle={() => setLogOpen(!logOpen)} />
    </main>
  );

  return (
    <DossierHost>
    <div className={`game${portrait ? ` upright sheet-${snap}` : ''}`}>
      <TopBar onMenu={openMenu} onLeft={() => (drawer === 'left' ? setDrawer(null) : openPanel('left'))} onRight={() => (drawer === 'right' ? setDrawer(null) : openPanel('right'))} />
      <DirectorBanner />
      {portrait ? (
        <div className="game-body">
          {mapArea}
          <BottomSheet
            tabs={[
              { id: 'country', label: countryName(selected ?? a.location), icon: <MapPin size={16} />, tour: 'drawer-left' },
              {
                id: 'agency',
                label: t('game.topbar.agency'),
                icon: <Briefcase size={16} />,
                badge: a.threats.length || undefined,
                hot: a.threats.length > 0,
                tour: 'drawer-right',
              },
            ]}
            tab={sheetTab}
            onTab={(id) => setSheetTab(id as 'country' | 'agency')}
            snap={snap}
            onSnap={setSnap}
          >
            {sheetTab === 'country' ? <CountryPanel /> : <AgencyPanel />}
          </BottomSheet>
        </div>
      ) : (
      <div className="game-body">
        <aside className={`side left${drawer === 'left' ? ' open' : ''}`}>
          <button className="btn icon ghost drawer-close only-narrow" aria-label={t('common.close')} onClick={() => setDrawer(null)}>
            <X size={18} />
          </button>
          <CountryPanel />
        </aside>
        {mapArea}
        <aside className={`side right${drawer === 'right' ? ' open' : ''}`}>
          <button className="btn icon ghost drawer-close only-narrow" aria-label={t('common.close')} onClick={() => setDrawer(null)}>
            <X size={18} />
          </button>
          <AgencyPanel />
        </aside>
      </div>
      )}
      <EventModal />
      <CombatOverlay />
      <GameOver onQuit={quit} />
      {menu && (
        <div className="scrim" onClick={() => setMenu(false)}>
          <div className="event-card" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2>{t('game.screen.pauseTitle')}</h2>
            <SettingsPanel embedded />
            <div className="event-actions">
              <button className="btn" onClick={() => (audio.sfx('close'), quit())}>
                {t('game.screen.saveQuit')}
              </button>
              <button className="btn primary" onClick={() => (audio.sfx('click'), setMenu(false))}>
                {t('game.screen.backToGame')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DossierHost>
  );
}
