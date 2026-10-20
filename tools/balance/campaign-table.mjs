// Rampa da Campanha: vitória por Capítulo × Dificuldade × bot, com e sem bônus de caixa.
// Uso: node tools/balance/campaign-table.mjs [pasta OUT]  (padrão tools/balance/out/campaign)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.argv[2] ?? 'tools/balance/out/campaign', 'parts');
const rs = readdirSync(dir)
  .filter((f) => f.startsWith('campaign-'))
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const pct = (x) => `${Math.round(x * 100)}%`;
const med = (xs) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[v.length >> 1] : NaN;
};
for (const bonus of [false, true]) {
  console.log(`\n${bonus ? 'Com bônus de 25%' : 'Sem bônus'}: vitória Recruta/Operador/Diretor`);
  console.log('| Cap. | Objetivo | Iniciante | Guloso | Operador | Passivo | Lucro med. Iniciante (M) | Dia med. do fim |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (let n = 1; n <= 10; n++) {
    const id = `campaign-${n}${bonus ? '+bonus' : ''}`;
    const g = rs.filter((r) => r.preset === id);
    if (!g.length) continue;
    const cell = (b) =>
      [1, 2, 3].map((d) => {
        const x = g.filter((r) => r.bot === b && r.difficulty === d);
        return pct(x.filter((r) => r.won).length / x.length);
      }).join(' / ');
    const ini = g.filter((r) => r.bot === 'iniciante');
    console.log(
      `| ${n} | ${g[0].objective} | ${cell('iniciante')} | ${cell('guloso')} | ${cell('operador')} | ${cell('passivo')} | ${[1, 2, 3]
        .map((d) => (med(ini.filter((r) => r.difficulty === d).map((r) => r.finalProfit)) / 1e6).toFixed(1))
        .join(' / ')} | ${Math.round(med(ini.map((r) => r.days)))} |`,
    );
  }
}
