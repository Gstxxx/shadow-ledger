// Config própria do balanceamento: roda só as simulações de tools/balance, sem pesar no `npm test`.
// Uso: npx vitest run --config tools/balance/vitest.config.ts
//   SEEDS=8 (sementes por célula Preset × Dificuldade × Bot), LONG_SEEDS=12, LONG_DAYS=365, OUT=tools/balance/out
//   VARIANT=<lote> mede as propostas de proposals.ts numa cópia do motor (src/game não é tocado).
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { buildVariant } from './variant';

const root = fileURLToPath(new URL('../..', import.meta.url));
const variant = process.env.VARIANT;
// A cópia do motor precisa existir antes de qualquer import de teste.
if (variant) buildVariant(root, variant);

export default defineConfig({
  root,
  resolve: variant
    ? { alias: [{ find: /^(\.\.\/)+src\/game\//, replacement: `${root}/node_modules/.cache/shadow-balance/${variant}/src/game/` }] }
    : undefined,
  test: {
    include: ['tools/balance/**/*.bench.test.ts'],
    environment: 'node',
    globalSetup: ['tools/balance/setup.ts'],
    testTimeout: 3 * 60 * 60 * 1000,
    hookTimeout: 60 * 1000,
    env: { BALANCE: '1' },
    pool: 'forks',
  },
});
