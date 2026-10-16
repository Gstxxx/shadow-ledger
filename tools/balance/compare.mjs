// Resumo rápido lado a lado de várias execuções (lê out/<nome>/parts/*.json).
// Uso: node tools/balance/compare.mjs base4 lote0 lote1
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const crisisRe = /Crise Final|Tensão Global ficou no Topo/i;
const med = (xs) => {
  if (!xs.length) return NaN;
  const v = [...xs].sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const pct = (x) => `${Math.round(x * 100)}%`.padStart(4);
const M = (x) => (Number.isFinite(x) ? (x / 1e6).toFixed(1) : '—').padStart(7);

for (const name of process.argv.slice(2)) {
  const dir = join('tools/balance/out', name, 'parts');
  if (!existsSync(dir)) {
    console.log(`== ${name}: sem dados`);
    continue;
  }
  const rows = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json') || f === 'routes.json') continue;
    const long = f.startsWith('long');
    for (const r of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
      const key = long ? `LONGA ${r.bot} d${r.difficulty}` : `${r.preset} ${r.bot} d${r.difficulty}`;
      const g = rows.get(key) ?? { n: 0, w: 0, c: 0, p: [], cd: [] };
      g.n++;
      if (r.won) g.w++;
      if (crisisRe.test(r.reason)) {
        g.c++;
        g.cd.push(r.days);
      }
      g.p.push(r.finalProfit);
      rows.set(key, g);
    }
  }
  console.log(`== ${name}`);
  for (const [k, g] of [...rows].sort())
    console.log(`${k.padEnd(34)} vit ${pct(g.w / g.n)}  crise ${pct(g.c / g.n)} (dia ${Math.round(med(g.cd)) || '—'})  lucro med ${M(med(g.p))}  n ${g.n}`);
}
