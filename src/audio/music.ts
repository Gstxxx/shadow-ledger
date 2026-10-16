// Generative scene players. Each player owns a small persistent graph
// (fader, delay line, filters, drones) and is driven step-by-step (16th notes)
// by the engine's lookahead scheduler.

import { chance, mtof, noise, pick, rand, tone } from './dsp';
import type { Scene } from './engine';

export interface MusicIO {
  ctx: BaseAudioContext;
  /** Dry music bus. */
  bus: AudioNode;
  /** Music reverb send bus. */
  reverb: AudioNode;
  noise: AudioBuffer;
}

export abstract class ScenePlayer {
  /** Scene fader (dry + delay). */
  readonly out: GainNode;
  /** Reverb send, gated with the same fader automation as `out`. */
  protected readonly verb: GainNode;
  protected readonly delayIn: GainNode;
  protected readonly tensionBus: GainNode;
  protected readonly ctx: BaseAudioContext;
  protected readonly io: MusicIO;
  protected readonly stepDur: number;
  protected tension = 0;
  disposeAt = Number.POSITIVE_INFINITY;

  private nextTime: number;
  private stepIndex = 0;
  private readonly nodes: AudioNode[] = [];
  private readonly sources: AudioScheduledSourceNode[] = [];

  constructor(io: MusicIO, bpm: number, delaySteps: number, feedback: number) {
    this.io = io;
    this.ctx = io.ctx;
    this.stepDur = 60 / bpm / 4;

    this.out = this.gain(0);
    this.out.connect(io.bus);
    this.verb = this.gain(0);
    this.verb.connect(io.reverb);
    this.tensionBus = this.gain(0);
    this.tensionBus.connect(this.out);

    // Spy-echo: filtered feedback delay synced to the tempo.
    this.delayIn = this.gain(1);
    const delay = this.own(this.ctx.createDelay(2));
    delay.delayTime.value = Math.min(1.9, this.stepDur * delaySteps);
    const damp = this.filter('lowpass', 2200, 0.5);
    const fb = this.gain(feedback);
    const wet = this.gain(0.7);
    const wetVerb = this.gain(0.35);
    this.delayIn.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(wet);
    wet.connect(this.out);
    damp.connect(wetVerb);
    wetVerb.connect(this.verb);

    this.nextTime = this.ctx.currentTime + 0.08;
  }

  // ---- lifecycle -------------------------------------------------------

  schedule(horizon: number): void {
    const now = this.ctx.currentTime;
    if (this.nextTime < now - 0.05) {
      // Tab was throttled: skip missed steps instead of bursting them.
      const skip = Math.ceil((now - this.nextTime) / this.stepDur);
      this.nextTime += skip * this.stepDur;
      this.stepIndex += skip;
    }
    while (this.nextTime < horizon) {
      this.play(this.stepIndex, this.nextTime);
      this.nextTime += this.stepDur;
      this.stepIndex++;
    }
  }

  fadeTo(target: number, dur: number): void {
    const now = this.ctx.currentTime;
    for (const p of [this.out.gain, this.verb.gain]) {
      const v = p.value;
      p.cancelScheduledValues(now);
      p.setValueAtTime(v, now);
      p.linearRampToValueAtTime(target, now + dur);
    }
  }

  retire(dur: number): void {
    this.fadeTo(0, dur);
    this.disposeAt = this.ctx.currentTime + dur + 0.3;
  }

  setTension(t: number): void {
    this.tension = t;
    const now = this.ctx.currentTime;
    this.tensionBus.gain.setTargetAtTime(t, now, 0.5);
    this.onTension(t, now);
  }

  dispose(): void {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.nodes.length = 0;
    this.sources.length = 0;
  }

  protected abstract play(step: number, t: number): void;
  protected onTension(_t: number, _now: number): void {
    /* optional per scene */
  }

  // ---- persistent node helpers -----------------------------------------

  protected own<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }

  protected ownSource<T extends AudioScheduledSourceNode>(s: T): T {
    this.sources.push(s);
    return this.own(s);
  }

  protected gain(v: number): GainNode {
    const g = this.own(this.ctx.createGain());
    g.gain.value = v;
    return g;
  }

  protected filter(type: BiquadFilterType, freq: number, q: number): BiquadFilterNode {
    const f = this.own(this.ctx.createBiquadFilter());
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  protected lfo(rate: number, depth: number, target: AudioParam): void {
    const o = this.ownSource(this.ctx.createOscillator());
    o.frequency.value = rate;
    const d = this.gain(depth);
    o.connect(d);
    d.connect(target);
    o.start();
  }

  // ---- instruments -----------------------------------------------------

  /** Detuned saw pad with a sine sub; long overlapping envelopes. */
  protected pad(notes: readonly number[], t: number, dur: number, dest: AudioNode, peak: number): void {
    const attack = Math.min(1.8, dur * 0.35);
    for (const m of notes) {
      for (const det of [-9, 7]) {
        tone(this.ctx, {
          type: 'sawtooth',
          freq: mtof(m),
          detune: det + rand(-2, 2),
          t,
          attack,
          hold: dur - attack,
          release: 2.8,
          peak,
          dest,
        });
      }
    }
    tone(this.ctx, {
      freq: mtof(notes[0] - 12),
      t,
      attack,
      hold: dur - attack,
      release: 2.5,
      peak: peak * 1.6,
      dest,
    });
  }

  /** Inharmonic bell ping into the delay + reverb. */
  protected bell(m: number, t: number, peak: number, delay = 0.5, verb = 0.35): void {
    const f = mtof(m);
    tone(this.ctx, {
      freq: f,
      t,
      attack: 0.004,
      release: 1.8,
      peak,
      dest: this.out,
      sends: [
        { node: this.delayIn, amount: delay },
        { node: this.verb, amount: verb },
      ],
    });
    tone(this.ctx, {
      freq: f * 2.76,
      t,
      attack: 0.002,
      release: 0.4,
      peak: peak * 0.35,
      dest: this.out,
      sends: [{ node: this.delayIn, amount: delay * 0.6 }],
    });
  }

  /** Analog-style plucked note with a decaying lowpass. */
  protected pluck(
    m: number,
    t: number,
    peak: number,
    cutoff: number,
    dest: AudioNode,
    type: OscillatorType = 'sawtooth',
    release = 0.14,
  ): void {
    tone(this.ctx, {
      type,
      freq: mtof(m),
      t,
      attack: 0.004,
      release,
      peak,
      dest,
      filter: { type: 'lowpass', freq: cutoff, to: Math.max(120, cutoff * 0.2), time: release, q: 4 },
    });
  }

  protected hat(t: number, peak: number, freq: number, release: number): void {
    noise(this.ctx, this.io.noise, {
      t,
      attack: 0.001,
      release,
      peak,
      dest: this.out,
      filter: { type: 'highpass', freq, q: 0.8 },
    });
  }

  protected kick(t: number, peak: number): void {
    tone(this.ctx, { freq: 150, to: 42, glide: 0.11, t, attack: 0.002, hold: 0.02, release: 0.34, peak, dest: this.out });
    noise(this.ctx, this.io.noise, {
      t,
      attack: 0.001,
      release: 0.012,
      peak: peak * 0.15,
      dest: this.out,
      filter: { type: 'bandpass', freq: 3000, q: 1 },
    });
  }
}

// ---------------------------------------------------------------- MENU --
// D phrygian, 84 BPM: Dm – Eb – Bb – Am, 2 bars each.

const MENU_CHORDS: readonly (readonly number[])[] = [
  [50, 53, 57],
  [51, 55, 58],
  [46, 50, 53],
  [45, 48, 52],
];
const PHRYGIAN: readonly number[] = [62, 63, 65, 67, 69, 70, 72];
const MENU_MASK: readonly number[] = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0];

class MenuPlayer extends ScenePlayer {
  private readonly padFilter: BiquadFilterNode;
  private mask: number[] = MENU_MASK.slice();

  constructor(io: MusicIO) {
    super(io, 84, 3, 0.42);
    this.padFilter = this.filter('lowpass', 520, 2.5);
    this.padFilter.connect(this.out);
    const send = this.gain(0.45);
    this.padFilter.connect(send);
    send.connect(this.verb);
    this.lfo(0.055, 260, this.padFilter.frequency);
  }

  protected play(step: number, t: number): void {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const chord = MENU_CHORDS[Math.floor(bar / 2) % MENU_CHORDS.length];

    if (step % 32 === 0) this.pad(chord, t, this.stepDur * 32, this.padFilter, 0.022);

    if (s === 0) this.mutateMask();
    if (this.mask[s]) {
      const accent = s % 4 === 0;
      const m = chord[0] - 12 + (s === 14 && chance(0.35) ? 12 : 0);
      this.pluck(m, t, accent ? 0.07 : 0.04, accent ? 900 : 620, this.out);
    }

    if (s % 2 === 0 && chance(s === 0 ? 0.25 : 0.05)) {
      const m = chance(0.6) ? pick(chord) + 24 : pick(PHRYGIAN) + 12;
      this.bell(m, t, rand(0.025, 0.045));
      if (chance(0.25)) this.bell(m + pick([7, 12, -5]), t + this.stepDur * 3, 0.018);
    }
  }

  private mutateMask(): void {
    this.mask = MENU_MASK.slice();
    for (let i = 0; i < 2; i++) {
      const k = 1 + Math.floor(Math.random() * 15);
      if (chance(0.5)) this.mask[k] = this.mask[k] ? 0 : 1;
    }
  }
}

// ----------------------------------------------------------------- MAP --
// Calmer, 72 BPM: Dm(add9) – Bbmaj7 – Gm – Ebmaj7. Tension adds an ostinato.

const MAP_CHORDS: readonly (readonly number[])[] = [
  [50, 53, 57, 64],
  [46, 50, 53, 57],
  [43, 50, 55, 58],
  [51, 55, 58, 62],
];
const MAP_ROOTS: readonly number[] = [38, 34, 31, 39];
const MAP_OSTINATO: readonly number[] = [0, 7, 12, 7, 0, 7, 13, 7, 0, 7, 12, 15, 13, 12, 7, 5];

class MapPlayer extends ScenePlayer {
  private readonly padFilter: BiquadFilterNode;
  private readonly ostFilter: BiquadFilterNode;

  constructor(io: MusicIO) {
    super(io, 72, 3, 0.5);
    this.padFilter = this.filter('lowpass', 380, 2);
    this.padFilter.connect(this.out);
    const send = this.gain(0.6);
    this.padFilter.connect(send);
    send.connect(this.verb);
    this.lfo(0.04, 150, this.padFilter.frequency);

    this.ostFilter = this.filter('bandpass', 1400, 1.2);
    this.ostFilter.connect(this.tensionBus);
    const ostEcho = this.gain(0.25);
    this.ostFilter.connect(ostEcho);
    ostEcho.connect(this.delayIn);
  }

  protected play(step: number, t: number): void {
    const s = step % 16;
    const idx = Math.floor(step / 32) % MAP_CHORDS.length;
    const chord = MAP_CHORDS[idx];
    const root = MAP_ROOTS[idx];

    if (step % 32 === 0) this.pad(chord, t, this.stepDur * 32, this.padFilter, 0.016);

    if (s === 0 || (s === 8 && chance(0.6))) {
      tone(this.ctx, {
        freq: mtof(root),
        t,
        attack: 0.03,
        hold: this.stepDur * 4,
        release: 0.9,
        peak: 0.09,
        dest: this.out,
      });
    }

    if (s % 2 === 0 && !chance(0.12)) this.hat(t, s % 4 === 2 ? 0.011 : 0.005, 8000, 0.03);

    if (s % 4 === 0 && chance(0.05)) this.bell(pick(chord) + 24, t, 0.022, 0.6, 0.5);

    if (this.tension > 0.02) {
      const m = root + 24 + MAP_OSTINATO[s];
      const cutoff = 1200 + this.tension * 2500;
      this.pluck(m, t, s % 4 === 0 ? 0.05 : 0.032, cutoff, this.ostFilter, 'square', 0.1);
      if (this.tension > 0.5 && s % 2 === 0) this.pluck(root, t, 0.05, 500, this.tensionBus);
    }
  }

  protected onTension(t: number, now: number): void {
    this.padFilter.frequency.setTargetAtTime(380 + t * 1500, now, 0.8);
  }
}

// -------------------------------------------------------------- COMBAT --
// 120 BPM ostinato with a minor-second rub, kick, swept band-passed noise.

const COMBAT_OST: readonly number[] = [0, 0, 12, 0, 1, 0, 12, 0, 0, 0, 12, 1, 0, 3, 1, 12];
const COMBAT_ROOTS: readonly number[] = [38, 38, 34, 39];

class CombatPlayer extends ScenePlayer {
  private readonly droneFilter: BiquadFilterNode;
  private readonly sweep: BiquadFilterNode;

  constructor(io: MusicIO) {
    super(io, 120, 3, 0.35);

    // Dissonant drone: D1 + D2 + Eb2.
    this.droneFilter = this.filter('lowpass', 260, 5);
    const droneGain = this.gain(0.045);
    this.droneFilter.connect(droneGain);
    droneGain.connect(this.out);
    for (const [m, det] of [
      [26, 0],
      [38, -6],
      [39, 5],
    ] as const) {
      const o = this.ownSource(this.ctx.createOscillator());
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = det;
      o.connect(this.droneFilter);
      o.start();
    }
    this.lfo(0.13, 90, this.droneFilter.frequency);

    // Band-pass noise riser, re-swept every 2 bars.
    const src = this.ownSource(this.ctx.createBufferSource());
    src.buffer = io.noise;
    src.loop = true;
    this.sweep = this.filter('bandpass', 300, 7);
    const sweepGain = this.gain(0.05);
    const sweepVerb = this.gain(0.4);
    src.connect(this.sweep);
    this.sweep.connect(sweepGain);
    sweepGain.connect(this.out);
    sweepGain.connect(sweepVerb);
    sweepVerb.connect(this.verb);
    src.start();
  }

  protected play(step: number, t: number): void {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const root = COMBAT_ROOTS[Math.floor(bar / 2) % COMBAT_ROOTS.length];

    if (step % 32 === 0) {
      const len = this.stepDur * 32;
      const f = this.sweep.frequency;
      f.setValueAtTime(300, t);
      f.exponentialRampToValueAtTime(2800 + this.tension * 2000, t + len * 0.7);
      f.exponentialRampToValueAtTime(300, t + len - 0.02);
    }

    let m = root + COMBAT_OST[s];
    if (chance(0.08)) m += 12;
    const accent = s % 4 === 0;
    this.pluck(m, t, accent ? 0.07 : 0.045, 700 + this.tension * 1800 + (accent ? 400 : 0), this.out, 'sawtooth', 0.11);

    const fill = bar % 4 === 3 && s >= 12;
    if (s === 0 || s === 8 || (s === 10 && chance(0.35)) || (s === 14 && chance(0.15)) || (fill && chance(0.4))) {
      this.kick(t, 0.42);
    }

    this.hat(t, s % 4 === 2 ? 0.018 : 0.007, 7500, 0.025);

    if (s === 4 || s === 12) {
      noise(this.ctx, this.io.noise, {
        t,
        attack: 0.002,
        release: 0.12,
        peak: 0.05,
        dest: this.out,
        filter: { type: 'bandpass', freq: 1500, q: 1.5 },
        sends: [{ node: this.verb, amount: 0.4 }],
      });
    }

    if (step % 64 === 0) {
      this.bell(74, t, 0.028, 0.5, 0.4);
      this.bell(75, t + 0.012, 0.024, 0.5, 0.4);
    }

    if (this.tension > 0.3 && s % 2 === 1) {
      this.pluck(root + 36 + COMBAT_OST[(s + 5) % 16], t, 0.025, 2600, this.tensionBus, 'square', 0.07);
    }
  }

  protected onTension(t: number, now: number): void {
    this.droneFilter.frequency.setTargetAtTime(260 + t * 700, now, 0.5);
  }
}

export function createPlayer(scene: Exclude<Scene, 'off'>, io: MusicIO): ScenePlayer {
  switch (scene) {
    case 'menu':
      return new MenuPlayer(io);
    case 'map':
      return new MapPlayer(io);
    case 'combat':
      return new CombatPlayer(io);
  }
}
