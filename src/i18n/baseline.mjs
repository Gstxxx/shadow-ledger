// Regenera src/i18n/__tests__/loose-baseline.json com as contagens atuais (rode após migrar arquivos).
// Uso: node src/i18n/baseline.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BRAND = /^(Shadow Ledger|Natural Earth|React|GSAP|zustand|TopoJSON|d3-geo)$/i;
const looksPt = (s) => /[A-Za-zÀ-ú]{3,}/.test(s) && !BRAND.test(s.trim());

function count(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  let n = 0;
  for (const m of code.matchAll(/>([^<>{}=;()]+)</g)) {
    const t = m[1].replace(/\s+/g, ' ').trim();
    if (t && looksPt(t)) n++;
  }
  for (const m of code.matchAll(/\b(?:title|aria-label|placeholder|alt|label)="([^"{}]+)"/g)) if (looksPt(m[1])) n++;
  return n;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (['i18n', '__tests__', 'node_modules'].includes(name)) continue;
      walk(p, out);
    } else if (name.endsWith('.tsx') && !name.startsWith('proto-')) out.push(p);
  }
  return out;
}

const counts = {};
for (const f of walk(root)) {
  const n = count(readFileSync(f, 'utf8'));
  if (n > 0) counts[relative(root, f).split(sep).join('/')] = n;
}
const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(root, 'i18n', '__tests__', 'loose-baseline.json'), JSON.stringify(sorted, null, 2) + '\n');
console.log(`baseline: ${Object.keys(sorted).length} arquivos, ${Object.values(sorted).reduce((a, b) => a + b, 0)} textos soltos`);
