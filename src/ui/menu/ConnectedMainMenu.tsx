// Liga o MainMenu aos stores do jogo (src/store) sem que o App precise montar o contrato à mão:
//   {screen !== 'game' && <ConnectedMainMenu skipIntro={!firstTitle} />}
// Só lê/chama as APIs públicas dos stores; não altera arquivos de outras áreas.

import { useCallback, useMemo, useState } from 'react';
import { profit } from '../../game/state';
import type { GameOptions, GameState } from '../../game/types';
import { deleteSave, exportSave, hasSave, importSave, useGameStore } from '../../store/game';
import { useSettings } from '../../store/settings';
import { MainMenu } from './MainMenu';
import { translate, useLang } from '../../i18n';
import { presetText } from './strings';
import type { Lang, MenuSettings, SaveSlot, StartConfig } from './types';

/** Preferência que o store de configurações ainda não guarda (o idioma é de src/i18n). */
const EXTRA_KEY = 'sl.menu.extra';
interface Extra {
  analystMuted: boolean;
}

function readExtra(): Extra {
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    if (raw) return { analystMuted: !!(JSON.parse(raw) as Partial<Extra>).analystMuted };
  } catch {
    /* ignore */
  }
  return { analystMuted: false };
}

function summarize(lang: Lang): SaveSlot[] {
  if (!hasSave()) return [];
  const raw = exportSave();
  if (!raw) return [];
  try {
    const g = JSON.parse(raw) as GameState;
    const p = g.options.preset;
    return [
      {
        id: 'auto',
        label: translate(lang, 'menu.continue.autosave'),
        presetTitle: p.id === 'sandbox' ? translate(lang, 'menu.new.tab.sandbox') : presetText(lang, p).title,
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
  const lang = useLang();
  const [extra, setExtra] = useState(readExtra);
  const [rev, setRev] = useState(0);

  const settings = useMemo<MenuSettings>(
    () => ({
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
      if (n.analystMuted !== extra.analystMuted) {
        const next = { analystMuted: n.analystMuted };
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
  const saves = useMemo(() => summarize(lang), [lang, rev]);

  const onStart = useCallback(
    (cfg: StartConfig) => {
      const opts: GameOptions = {
        preset: cfg.preset,
        difficulty: cfg.difficulty,
        hardcore: cfg.hardcore,
        rivals: cfg.rivals,
        origin: cfg.origin,
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
      if (!importSave(text)) throw new Error(translate(lang, 'menu.continue.importFail'));
      setRev((r) => r + 1);
    },
    [lang],
  );

  return (
    <MainMenu
      skipIntro={skipIntro}
      settings={settings}
      onSettingsChange={onSettingsChange}
      saves={saves}
      onStart={onStart}
      onContinue={() => continueSaved()}
      onDeleteSave={() => {
        deleteSave();
        setRev((r) => r + 1);
      }}
      onExportSave={onExportSave}
      onImportSave={onImportSave}
    />
  );
}
