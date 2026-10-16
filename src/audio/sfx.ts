// One-shot UI / game sound effects, all synthesized on demand.

import { mtof, noise, rand, tone, type Send } from './dsp';
import type { Sfx } from './engine';

export interface SfxIO {
  ctx: BaseAudioContext;
  out: AudioNode;
  reverb: AudioNode;
  noise: AudioBuffer;
}

export function playSfx(io: SfxIO, name: Sfx): void {
  const { ctx, out } = io;
  const nb = io.noise;
  const t = ctx.currentTime + 0.005;
  const rv = (amount: number): Send[] => [{ node: io.reverb, amount }];

  switch (name) {
    case 'click':
      tone(ctx, { type: 'square', freq: 2200, to: 1400, glide: 0.02, t, attack: 0.001, release: 0.03, peak: 0.05, dest: out, filter: { type: 'bandpass', freq: 2500, q: 1 } });
      noise(ctx, nb, { t, attack: 0.001, release: 0.018, peak: 0.05, dest: out, filter: { type: 'highpass', freq: 3000 } });
      break;

    case 'hover':
      tone(ctx, { freq: 3200, t, attack: 0.001, release: 0.015, peak: 0.018, dest: out });
      break;

    case 'open':
      tone(ctx, { type: 'triangle', freq: 300, to: 900, glide: 0.09, t, attack: 0.005, release: 0.12, peak: 0.08, dest: out, filter: { type: 'lowpass', freq: 3000 } });
      tone(ctx, { freq: 1800, t: t + 0.07, attack: 0.002, release: 0.08, peak: 0.03, dest: out, sends: rv(0.2) });
      break;

    case 'close':
      tone(ctx, { type: 'triangle', freq: 900, to: 280, glide: 0.1, t, attack: 0.005, release: 0.12, peak: 0.07, dest: out, filter: { type: 'lowpass', freq: 2500 } });
      break;

    case 'buy':
    case 'sell': {
      // Digital register: buy = descending, sell = ascending.
      const [a, b] = name === 'sell' ? [1175, 1568] : [1568, 1175];
      const f = { type: 'lowpass' as const, freq: 4000 };
      tone(ctx, { type: 'square', freq: a, t, attack: 0.002, hold: 0.05, release: 0.05, peak: 0.045, dest: out, filter: f });
      tone(ctx, { type: 'square', freq: b, t: t + 0.08, attack: 0.002, hold: 0.04, release: 0.18, peak: 0.045, dest: out, filter: f, sends: rv(0.2) });
      noise(ctx, nb, { t, attack: 0.001, release: 0.015, peak: 0.04, dest: out, filter: { type: 'highpass', freq: 4000 } });
      break;
    }

    case 'alert':
      for (const dt of [0, 0.16]) {
        tone(ctx, { type: 'square', freq: 988, t: t + dt, attack: 0.003, hold: 0.08, release: 0.03, peak: 0.06, dest: out, filter: { type: 'lowpass', freq: 3200 }, sends: rv(0.15) });
        tone(ctx, { type: 'sine', freq: 1976, t: t + dt, attack: 0.003, hold: 0.08, release: 0.03, peak: 0.02, dest: out });
      }
      break;

    case 'arrive':
      [62, 65, 69, 76].forEach((m, i) => {
        tone(ctx, { type: 'triangle', freq: mtof(m), t: t + i * 0.025, attack: 0.04, hold: 0.05, release: 1.2, peak: 0.032, dest: out, sends: rv(0.5) });
      });
      break;

    case 'depart':
      tone(ctx, { type: 'sawtooth', freq: 180, to: 1400, glide: 0.35, t, attack: 0.02, hold: 0.25, release: 0.15, peak: 0.045, dest: out, filter: { type: 'lowpass', freq: 400, to: 5000, time: 0.35, q: 3 }, sends: rv(0.3) });
      noise(ctx, nb, { t, attack: 0.05, hold: 0.2, release: 0.15, peak: 0.02, dest: out, filter: { type: 'bandpass', freq: 600, to: 4000, time: 0.35, q: 2 } });
      break;

    case 'hit':
      noise(ctx, nb, { t, attack: 0.001, release: 0.07, peak: 0.22, dest: out, filter: { type: 'bandpass', freq: 1800, q: 0.8 } });
      tone(ctx, { freq: 160, to: 55, glide: 0.08, t, attack: 0.002, release: 0.12, peak: 0.32, dest: out });
      break;

    case 'kill':
      tone(ctx, { freq: 110, to: 32, glide: 0.35, t, attack: 0.003, hold: 0.05, release: 0.5, peak: 0.5, dest: out, sends: rv(0.25) });
      noise(ctx, nb, { t, attack: 0.002, release: 0.3, peak: 0.12, dest: out, filter: { type: 'lowpass', freq: 400 } });
      break;

    case 'win':
      [62, 66, 69, 74].forEach((m, i, arr) => {
        const last = i === arr.length - 1;
        tone(ctx, { type: 'triangle', freq: mtof(m), t: t + i * 0.07, attack: 0.004, hold: last ? 0.1 : 0, release: last ? 0.9 : 0.35, peak: 0.06, dest: out, sends: rv(0.35) });
      });
      break;

    case 'lose':
      for (const m of [62, 63, 65]) {
        const f = mtof(m);
        tone(ctx, { type: 'sawtooth', freq: f, to: f / 2, glide: 1.2, t, attack: 0.02, hold: 0.4, release: 0.8, peak: 0.035, dest: out, filter: { type: 'lowpass', freq: 1800, to: 300, time: 1.2 }, sends: rv(0.35) });
      }
      break;

    case 'type':
      noise(ctx, nb, { t, attack: 0.001, release: 0.025, peak: 0.1, dest: out, filter: { type: 'highpass', freq: 2500 }, filter2: { type: 'bandpass', freq: rand(2500, 4000), q: 3 } });
      tone(ctx, { type: 'square', freq: rand(140, 180), t, attack: 0.001, release: 0.02, peak: 0.035, dest: out, filter: { type: 'lowpass', freq: 600 } });
      break;

    case 'redact':
      // Felt marker dragged across paper: swept band-passed noise, 250 ms.
      noise(ctx, nb, { t, attack: 0.03, hold: 0.15, release: 0.07, peak: 0.13, dest: out, filter: { type: 'bandpass', freq: 700, to: 2600, time: 0.25, q: 1.5 } });
      noise(ctx, nb, { t, attack: 0.04, hold: 0.13, release: 0.08, peak: 0.03, dest: out, rate: 0.5, filter: { type: 'highpass', freq: 5000 } });
      break;
  }
}
