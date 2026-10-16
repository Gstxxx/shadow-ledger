// Shadow Ledger procedural audio engine (Web Audio API only, no assets).
//
// Graph:
//   scene players ─► musicBus ─┐
//   scene verb sends ─► musicVerb ─► convolver ─► verbReturn ─┤
//   sfx voices ─► sfxBus ──────┤          ▲ sfxVerb            ├─► compressor ─► master ─► destination
//
// Timing follows "A Tale of Two Clocks": a 25 ms setInterval schedules every
// note ~0.12 s ahead against ctx.currentTime.

import { clamp01, makeImpulse, makeNoiseBuffer } from './dsp';
import { createPlayer, type ScenePlayer } from './music';
import { playSfx } from './sfx';

export type Scene = 'off' | 'menu' | 'map' | 'combat';
export type Sfx =
  | 'click'
  | 'hover'
  | 'open'
  | 'close'
  | 'buy'
  | 'sell'
  | 'alert'
  | 'arrive'
  | 'depart'
  | 'hit'
  | 'kill'
  | 'win'
  | 'lose'
  | 'type'
  | 'redact';

const TICK_MS = 25;
const LOOKAHEAD = 0.12;
const CROSSFADE = 2;
const MUSIC_LEVEL = 0.9;
const SFX_LEVEL = 1;

interface Graph {
  ctx: AudioContext;
  music: GainNode;
  musicVerb: GainNode;
  sfx: GainNode;
  sfxVerb: GainNode;
  noise: AudioBuffer;
}

type AudioCtor = typeof AudioContext;

function getCtor(): AudioCtor | undefined {
  const w = globalThis as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

let graph: Graph | null = null;
let musicVol = 0.6;
let sfxVol = 0.8;
let tension = 0;
let wantedScene: Scene = 'off';
let activeScene: Scene = 'off';
let current: ScenePlayer | null = null;
const retiring: ScenePlayer[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
const lastSfxAt: Partial<Record<Sfx, number>> = {};

// Perceptual-ish volume curve.
const curve = (v: number): number => v * v;

function build(Ctor: AudioCtor): Graph {
  const ctx = new Ctor();

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  comp.connect(master);
  master.connect(ctx.destination);

  const music = ctx.createGain();
  music.gain.value = curve(musicVol) * MUSIC_LEVEL;
  music.connect(comp);

  const sfx = ctx.createGain();
  sfx.gain.value = curve(sfxVol) * SFX_LEVEL;
  sfx.connect(comp);

  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(ctx, 3.2, 3);
  const verbReturn = ctx.createGain();
  verbReturn.gain.value = 0.55;
  convolver.connect(verbReturn);
  verbReturn.connect(comp);

  const musicVerb = ctx.createGain();
  musicVerb.gain.value = music.gain.value;
  musicVerb.connect(convolver);
  const sfxVerb = ctx.createGain();
  sfxVerb.gain.value = sfx.gain.value;
  sfxVerb.connect(convolver);

  return { ctx, music, musicVerb, sfx, sfxVerb, noise: makeNoiseBuffer(ctx, 2) };
}

function tick(): void {
  const g = graph;
  if (!g || g.ctx.state !== 'running') return;
  try {
    const now = g.ctx.currentTime;
    const horizon = now + LOOKAHEAD;
    current?.schedule(horizon);
    for (let i = retiring.length - 1; i >= 0; i--) {
      const p = retiring[i];
      if (now >= p.disposeAt) {
        p.dispose();
        retiring.splice(i, 1);
      } else {
        p.schedule(horizon);
      }
    }
  } catch {
    /* never let audio break the game loop */
  }
}

function applyScene(): void {
  const g = graph;
  if (!g || wantedScene === activeScene) return;
  if (current) {
    current.retire(CROSSFADE);
    retiring.push(current);
    current = null;
  }
  activeScene = wantedScene;
  if (wantedScene === 'off') return;
  current = createPlayer(wantedScene, {
    ctx: g.ctx,
    bus: g.music,
    reverb: g.musicVerb,
    noise: g.noise,
  });
  current.setTension(tension);
  current.fadeTo(1, CROSSFADE);
}

function rampGain(param: AudioParam, value: number, ctx: AudioContext): void {
  param.setTargetAtTime(value, ctx.currentTime, 0.12);
}

const SFX_MIN_GAP: Partial<Record<Sfx, number>> = { hover: 0.04, type: 0.025 };

export const audio: {
  unlock(): void;
  readonly unlocked: boolean;
  setMusicVolume(v: number): void;
  setSfxVolume(v: number): void;
  setScene(scene: Scene): void;
  setTension(t: number): void;
  sfx(name: Sfx): void;
} = {
  unlock(): void {
    try {
      if (!graph) {
        const Ctor = getCtor();
        if (!Ctor) return;
        graph = build(Ctor);
        timer ??= setInterval(tick, TICK_MS);
        applyScene();
      }
      const ctx = graph.ctx;
      if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {
          /* will retry on next gesture */
        });
      }
    } catch {
      graph = null;
    }
  },

  get unlocked(): boolean {
    return graph !== null;
  },

  setMusicVolume(v: number): void {
    musicVol = clamp01(v);
    const g = graph;
    if (!g) return;
    try {
      const level = curve(musicVol) * MUSIC_LEVEL;
      rampGain(g.music.gain, level, g.ctx);
      rampGain(g.musicVerb.gain, level, g.ctx);
    } catch {
      /* ignore */
    }
  },

  setSfxVolume(v: number): void {
    sfxVol = clamp01(v);
    const g = graph;
    if (!g) return;
    try {
      const level = curve(sfxVol) * SFX_LEVEL;
      rampGain(g.sfx.gain, level, g.ctx);
      rampGain(g.sfxVerb.gain, level, g.ctx);
    } catch {
      /* ignore */
    }
  },

  setScene(scene: Scene): void {
    wantedScene = scene;
    try {
      applyScene();
    } catch {
      /* ignore */
    }
  },

  setTension(t: number): void {
    tension = clamp01(t);
    try {
      current?.setTension(tension);
    } catch {
      /* ignore */
    }
  },

  sfx(name: Sfx): void {
    const g = graph;
    if (!g || g.ctx.state !== 'running') return;
    try {
      const now = g.ctx.currentTime;
      const last = lastSfxAt[name];
      if (last !== undefined && now - last < (SFX_MIN_GAP[name] ?? 0.02)) return;
      lastSfxAt[name] = now;
      playSfx({ ctx: g.ctx, out: g.sfx, reverb: g.sfxVerb, noise: g.noise }, name);
    } catch {
      /* ignore */
    }
  },
};
