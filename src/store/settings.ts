import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audio } from '../audio/engine';

export type Speed = 1 | 2 | 4;

interface SettingsState {
  music: number;
  sfx: number;
  defaultSpeed: Speed;
  /** Reduce motion: skip the title sequence and long transitions. */
  reducedMotion: boolean;
  setMusic(v: number): void;
  setSfx(v: number): void;
  setDefaultSpeed(v: Speed): void;
  setReducedMotion(v: boolean): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      music: 0.6,
      sfx: 0.8,
      defaultSpeed: 1,
      reducedMotion: false,
      setMusic: (v) => {
        audio.setMusicVolume(v);
        set({ music: v });
      },
      setSfx: (v) => {
        audio.setSfxVolume(v);
        set({ sfx: v });
      },
      setDefaultSpeed: (v) => set({ defaultSpeed: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
    }),
    {
      name: 'shadow-ledger.settings',
      onRehydrateStorage: () => (st) => {
        if (!st) return;
        audio.setMusicVolume(st.music);
        audio.setSfxVolume(st.sfx);
      },
    },
  ),
);
