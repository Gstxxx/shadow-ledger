/**
 * Textura de relevo sugerido para a terra: ruído de valor em 3 oitavas, sombreado com luz rasante do noroeste,
 * gerado uma vez num canvas e usado como <pattern> (barato no celular: nada de filtro SVG por quadro).
 * Pixels claros = encostas iluminadas, escuros = sombra; a média fica transparente.
 */
let cache: string | null = null;

export function reliefTexture(size = 128): string {
  if (cache !== null) return cache;
  if (typeof document === 'undefined') return (cache = '');
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  if (!ctx) return (cache = '');

  // Semente fixa: o mapa é sempre o mesmo.
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const octave = (cells: number) => {
    const g = Array.from({ length: cells * cells }, rnd);
    const at = (i: number, j: number) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
    const sm = (t: number) => t * t * (3 - 2 * t);
    return (x: number, y: number) => {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const u = sm(fx - i);
      const v = sm(fy - j);
      const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
      const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
      return a + (b - a) * v;
    };
  };
  const o = [octave(4), octave(8), octave(16)];
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = o[0](x, y) * 0.55 + o[1](x, y) * 0.3 + o[2](x, y) * 0.15;

  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = (k: number, l: number) => h[((l + size) % size) * size + ((k + size) % size)];
      // derivada na direção da luz (noroeste → sudeste)
      const shade = (p(x - 1, y - 1) - p(x + 1, y + 1)) * 9;
      const lit = shade > 0;
      const i = (y * size + x) * 4;
      const c = lit ? 235 : 0;
      img.data[i] = c;
      img.data[i + 1] = c;
      img.data[i + 2] = lit ? 225 : 0;
      img.data[i + 3] = Math.min(255, Math.abs(shade) * (lit ? 120 : 200));
    }
  ctx.putImageData(img, 0, 0);
  return (cache = cv.toDataURL('image/png'));
}

/** Hora solar local (0–24) a partir da hora UTC do jogo e da longitude. */
export const localHour = (utcHour: number, lon: number) => (((utcHour + lon / 15) % 24) + 24) % 24;
