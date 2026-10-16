// Low-level procedural synthesis helpers. Every voice is a short-lived node
// graph with a click-free envelope that disconnects itself on `onended`.

export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const chance = (p: number): boolean => Math.random() < p;
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
export const clamp01 = (v: number): number =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

export function makeNoiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Stereo impulse response: decorrelated noise with a power-law decay. */
export function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const pre = Math.floor(ctx.sampleRate * 0.012);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      if (i < pre) {
        d[i] = 0;
        continue;
      }
      const x = (i - pre) / (len - pre);
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, decay);
    }
  }
  return buf;
}

export interface Send {
  node: AudioNode;
  amount: number;
}

export interface FilterSpec {
  type: BiquadFilterType;
  freq: number;
  /** Exponential sweep target. */
  to?: number;
  /** Sweep duration (s). */
  time?: number;
  q?: number;
}

interface EnvSpec {
  t: number;
  attack?: number;
  hold?: number;
  release: number;
  peak: number;
}

/** Attack (linear) → hold → exponential release. Returns the stop time. */
function envelope(param: AudioParam, e: EnvSpec): number {
  const attack = Math.max(0.001, e.attack ?? 0.005);
  const hold = Math.max(0, e.hold ?? 0);
  const release = Math.max(0.005, e.release);
  param.setValueAtTime(0, e.t);
  param.linearRampToValueAtTime(e.peak, e.t + attack);
  param.setTargetAtTime(0, e.t + attack + hold, release / 6);
  return e.t + attack + hold + release;
}

function makeFilter(ctx: BaseAudioContext, f: FilterSpec, t: number): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = f.type;
  node.Q.value = f.q ?? 0.7;
  node.frequency.setValueAtTime(f.freq, t);
  if (f.to !== undefined) {
    node.frequency.exponentialRampToValueAtTime(Math.max(20, f.to), t + (f.time ?? 0.1));
  }
  return node;
}

function wire(
  ctx: BaseAudioContext,
  src: AudioScheduledSourceNode,
  chain: AudioNode[],
  amp: GainNode,
  dest: AudioNode,
  sends: readonly Send[] | undefined,
): void {
  let head: AudioNode = src;
  for (const n of chain) {
    head.connect(n);
    head = n;
  }
  head.connect(amp);
  amp.connect(dest);
  const sendNodes: GainNode[] = [];
  if (sends) {
    for (const s of sends) {
      if (s.amount <= 0) continue;
      const g = ctx.createGain();
      g.gain.value = s.amount;
      amp.connect(g);
      g.connect(s.node);
      sendNodes.push(g);
    }
  }
  src.onended = () => {
    src.disconnect();
    for (const n of chain) n.disconnect();
    amp.disconnect();
    for (const g of sendNodes) g.disconnect();
  };
}

export interface ToneOpts extends EnvSpec {
  freq: number;
  /** Exponential pitch glide target. */
  to?: number;
  glide?: number;
  type?: OscillatorType;
  detune?: number;
  filter?: FilterSpec;
  dest: AudioNode;
  sends?: readonly Send[];
}

export function tone(ctx: BaseAudioContext, o: ToneOpts): void {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, o.t);
  if (o.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), o.t + (o.glide ?? 0.1));
  }
  if (o.detune) osc.detune.value = o.detune;
  const amp = ctx.createGain();
  const end = envelope(amp.gain, o);
  const chain: AudioNode[] = o.filter ? [makeFilter(ctx, o.filter, o.t)] : [];
  wire(ctx, osc, chain, amp, o.dest, o.sends);
  osc.start(o.t);
  osc.stop(end + 0.03);
}

export interface NoiseOpts extends EnvSpec {
  filter?: FilterSpec;
  /** Optional second filter in series. */
  filter2?: FilterSpec;
  rate?: number;
  dest: AudioNode;
  sends?: readonly Send[];
}

export function noise(ctx: BaseAudioContext, buf: AudioBuffer, o: NoiseOpts): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  if (o.rate) src.playbackRate.value = o.rate;
  const amp = ctx.createGain();
  const end = envelope(amp.gain, o);
  const chain: AudioNode[] = [];
  if (o.filter) chain.push(makeFilter(ctx, o.filter, o.t));
  if (o.filter2) chain.push(makeFilter(ctx, o.filter2, o.t));
  wire(ctx, src, chain, amp, o.dest, o.sends);
  src.start(o.t, Math.random() * Math.max(0, buf.duration - 0.5));
  src.stop(end + 0.03);
}
