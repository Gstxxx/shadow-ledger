// globalSetup do balanceamento: no fim, junta OUT/parts/*.json em OUT/report.md
// (OUT padrão: tools/balance/out/<variante ou base>). O relatório é importado só no teardown, quando
// a cópia do motor da variante (criada pela config) já existe.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameResult } from './harness';

const OUT = process.env.OUT ?? `tools/balance/out/${process.env.VARIANT ?? 'base'}`;

export async function teardown() {
  const dir = join(OUT, 'parts');
  if (!existsSync(dir)) return;
  const parts = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const load = (prefix: string) =>
    parts.filter((f) => f.startsWith(prefix)).flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as GameResult[]);
  const grid = load('grid-');
  const long = load('long-');
  const routes = parts.includes('routes.json') ? JSON.parse(readFileSync(join(dir, 'routes.json'), 'utf8')) : [];
  if (!grid.length && !long.length) return;
  const { buildReport } = await import('./report');
  const md = buildReport(grid, long, routes, process.env.VARIANT ?? 'motor atual');
  writeFileSync(join(OUT, 'report.md'), md);
  console.log(md);
}
