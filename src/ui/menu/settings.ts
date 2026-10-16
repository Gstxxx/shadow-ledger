import { useCallback, useEffect, useState } from 'react';
import { audio, type Sfx } from '../../audio/engine';
import type { MenuSettings } from './types';

const KEY = 'sl.settings';

function systemReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function defaultSettings(): MenuSettings {
  const lang = typeof navigator !== 'undefined' && !navigator.language?.toLowerCase().startsWith('pt') ? 'en' : 'pt-BR';
  return {
    lang,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    defaultSpeed: 1,
    analystMuted: false,
    reducedMotion: systemReducedMotion(),
  };
}

function load(): MenuSettings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<MenuSettings>) };
  } catch {
    /* sem storage: usa o padrão */
  }
  return base;
}

/** Configurações controladas pelo App quando ele passa `settings`; senão, locais. */
export function useMenuSettings(
  controlled: MenuSettings | undefined,
  onChange: ((next: MenuSettings) => void) | undefined,
): [MenuSettings, (patch: Partial<MenuSettings>) => void] {
  const [local, setLocal] = useState<MenuSettings>(() => controlled ?? load());
  const value = controlled ?? local;

  const update = useCallback(
    (patch: Partial<MenuSettings>) => {
      const next = { ...value, ...patch };
      if (!controlled) {
        setLocal(next);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      onChange?.(next);
    },
    [value, controlled, onChange],
  );

  useEffect(() => {
    audio.setMusicVolume(value.musicVolume);
    audio.setSfxVolume(value.sfxVolume);
  }, [value.musicVolume, value.sfxVolume]);

  useEffect(() => {
    document.documentElement.lang = value.lang;
  }, [value.lang]);

  return [value, update];
}

export function sfx(name: Sfx): void {
  try {
    audio.sfx(name);
  } catch {
    /* áudio é opcional */
  }
}
