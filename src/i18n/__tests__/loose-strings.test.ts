// Acha texto em português solto no JSX (fora do i18n). Catraca: cada arquivo tem um teto em
// loose-baseline.json; o teste falha se um arquivo passar do teto ou se aparecer arquivo novo com texto solto.
// Ao migrar um arquivo, baixe o teto:  node src/i18n/baseline.mjs
import { describe, expect, it } from 'vitest';
import baseline from './loose-baseline.json';

const files = import.meta.glob(['/src/**/*.tsx', '!/src/i18n/**', '!/src/**/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Qualquer palavra visível (3+ letras) escrita direto no JSX deve passar por t(); marcas como "Shadow Ledger" ficam fora.
const BRAND = /^(Shadow Ledger|Natural Earth|React|GSAP|zustand|TopoJSON|d3-geo)$/i;
const looksPt = (s: string) => /[A-Za-zÀ-ú]{3,}/.test(s) && !BRAND.test(s.trim());

export function looseStrings(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const found: string[] = [];
  // Texto entre tags: >texto<
  for (const m of code.matchAll(/>([^<>{}=;()]+)</g)) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (text && looksPt(text)) found.push(text);
  }
  // Atributos de texto visível.
  for (const m of code.matchAll(/\b(?:title|aria-label|placeholder|alt|label)="([^"{}]+)"/g)) {
    if (looksPt(m[1])) found.push(m[1]);
  }
  return found;
}

describe('texto solto no JSX', () => {
  it('detector reconhece pt-BR solto e ignora código/inglês neutro', () => {
    expect(looseStrings('<p>Comprar agora</p>')).toEqual(['Comprar agora']);
    expect(looseStrings('<button title="Fechar a janela">x</button>')).toEqual(['Fechar a janela']);
    expect(looseStrings('<p>{t("a.b")}</p>')).toEqual([]);
    expect(looseStrings('const x = a > b && c < d;')).toEqual([]);
  });

  it('nenhum arquivo piora a contagem de texto solto', () => {
    const base = baseline as Record<string, number>;
    const worse: string[] = [];
    for (const [path, src] of Object.entries(files)) {
      const f = path.replace(/^\/src\//, '');
      const n = looseStrings(src).length;
      if (n > (base[f] ?? 0)) worse.push(`${f}: ${n} (teto ${base[f] ?? 0})`);
    }
    expect(worse, `texto solto no JSX — use t()/useT():\n${worse.join('\n')}`).toEqual([]);
  });
});
