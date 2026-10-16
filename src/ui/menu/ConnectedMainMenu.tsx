// Liga o MainMenu aos stores do jogo (src/store) sem que o App precise montar o contrato à mão:
//   {screen !== 'game' && <ConnectedMainMenu skipIntro={!firstTitle} />}
// Só lê/chama as APIs públicas dos stores; não altera arquivos de outras áreas.

import { useCallback, useMemo, useState } from 'react';
import { profit } from '../../game/state';
import type { GameOptions, GameState } from '../../game/types';
import { exportSave, hasSave, importSave, useGameStore } from '../../store/game';
import { useSettings } from '../../store/settings';
import { MainMenu } from './MainMenu';
import { defaultSettings } from './settings';
import { stringsFor } from './strings';
import type { Lang, MenuSettings, SaveSlot, StartConfig } from './types';

/** Preferências que o store de configurações ainda não guarda. */
const EXTRA_KEY = 'sl.menu.extra';
interface Extra {
  lang: Lang;
  analystMuted: boolean;
}

function readExtra(): Extra {
  const d = defaultSettings();
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    if (raw) return { lang: d.lang, analystMuted: false, ...(JSON.parse(raw) as Partial<Extra>) };
  } catch {
    /* ignore */
  }
  return { lang: d.lang, analystMuted: false };
}

function summarize(lang: Lang): SaveSlot[] {
  if (!hasSave()) return [];
  const raw = exportSave();
  if (!raw) return [];
  try {
    const g = JSON.parse(raw) as GameState & { savedAt?: number };
    const s = stringsFor(lang);
    return [
      {
        id: 'auto',
        label: lang === 'en' ? 'Autosave' : 'Salvamento automático',
        presetTitle: g.options.preset.id === 'sandbox' ? s.tabSandbox : g.options.preset.title,
        savedAt: g.savedAt ?? Date.now(),
        gameDay: Math.floor(g.time / 24) + 1,
        profit: profit(g.agencies[0]),
        hardcore: g.options.hardcore,
      },
    ];
  } catch {
    return [];
  }
}

export function ConnectedMainMenu({ skipIntro }: { skipIntro?: boolean }) {
  const st = useSettings();
  const start = useGameStore((s) => s.start);
  const continueSaved = useGameStore((s) => s.continueSaved);
  const [extra, setExtra] = useState(readExtra);
  const [rev, setRev] = useState(0);

  const settings = useMemo<MenuSettings>(
    () => ({
      lang: extra.lang,
      musicVolume: st.music,
      sfxVolume: st.sfx,
      defaultSpeed: st.defaultSpeed,
      analystMuted: extra.analystMuted,
      reducedMotion: st.reducedMotion,
    }),
    [extra, st.music, st.sfx, st.defaultSpeed, st.reducedMotion],
  );

  const onSettingsChange = useCallback(
    (n: MenuSettings) => {
      if (n.musicVolume !== st.music) st.setMusic(n.musicVolume);
      if (n.sfxVolume !== st.sfx) st.setSfx(n.sfxVolume);
      if (n.defaultSpeed !== st.defaultSpeed) st.setDefaultSpeed(n.defaultSpeed);
      if (n.reducedMotion !== st.reducedMotion) st.setReducedMotion(n.reducedMotion);
      if (n.lang !== extra.lang || n.analystMuted !== extra.analystMuted) {
        const next = { lang: n.lang, analystMuted: n.analystMuted };
        setExtra(next);
        try {
          localStorage.setItem(EXTRA_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
    },
    [st, extra],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saves = useMemo(() => summarize(extra.lang), [extra.lang, rev]);

  const onStart = useCallback(
    (cfg: StartConfig) => {
      const opts: GameOptions & { rivals: number } = {
        preset: cfg.preset,
        difficulty: cfg.difficulty,
        hardcore: cfg.hardcore,
        rivals: cfg.rivals,
        directorName: cfg.directorName,
        agencyName: cfg.agencyName,
      };
      start(opts);
    },
    [start],
  );

  const onExportSave = useCallback(() => {
    const raw = exportSave();
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadow-ledger-${new Date().toISOString().slice(0, 10)}.slsave`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const onImportSave = useCallback(
    async (file: File) => {
      const text = await file.text();
      if (!importSave(text)) throw new Error(stringsFor(extra.lang).importFail);
      setRev((r) => r + 1);
    },
    [extra.lang],
  );

  return (
    <MainMenu
      skipIntro={skipIntro}
      settings={settings}
      onSettingsChange={onSettingsChange}
      saves={saves}
      onStart={onStart}
      onContinue={() => continueSaved()}
      onExportSave={onExportSave}
      onImportSave={onImportSave}
    />
  );
}
