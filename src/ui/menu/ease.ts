// Curvas medidas (motionmaxxing: 12 curvas ajustadas a filmes feitos por motion designers).
// Cada uma é t -> valor com f(0)=0 e f(1)=1; o GSAP aceita a função direto em `ease`.

const powerOut = (p: number) => (t: number) => 1 - Math.pow(1 - t, p);
const powerIn = (p: number) => (t: number) => Math.pow(t, p);
const expoOut = (k: number) => {
  const d = 1 - Math.exp(-k);
  return (t: number) => (1 - Math.exp(-k * t)) / d;
};
const snapRamp = (w: number, tau: number) => {
  const n = w * (1 - Math.exp(-1 / tau)) + (1 - w);
  return (t: number) => (w * (1 - Math.exp(-t / tau)) + (1 - w) * t) / n;
};
const smoothP = (p: number) => (t: number) => {
  const a = Math.pow(t, p);
  const b = Math.pow(1 - t, p);
  return a / (a + b);
};
const guard = (f: (t: number) => number) => (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : f(t));

export const ease = {
  /** Entrada de herói: 54% do curso nos primeiros 10% do tempo, cauda longa. */
  snapSettle: guard(snapRamp(0.942, 0.118)),
  /** Desaceleração firme: texto e painéis pousando. */
  softLand: guard(expoOut(3.41)),
  /** Movimento grande e rápido que desacelera. */
  whip: guard(powerOut(2.52)),
  /** Ease-out suave para movimentos médios. */
  glide: guard(powerOut(1.7)),
  /** Linear: deriva, câmera lenta, luz. */
  cruise: (t: number) => t,
  /** S simétrico para opacidade e luz. */
  softInOut: guard(smoothP(1.42)),
  /** Aceleração leve. */
  gentleIn: guard(powerIn(2.07)),
  /** A curva de saída: sai acelerando, velocidade máxima no corte. */
  accelExit: guard(powerIn(2.6)),
  /** Aceleração forte até um corte. */
  crashOut: guard(powerIn(3.97)),
};

/** Quadros a 30 fps → segundos. */
export const f = (frames: number) => frames / 30;
