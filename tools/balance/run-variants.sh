#!/usr/bin/env bash
# Roda a grade para a base e para cada variante pedida, em sequência.
# Uso: SEEDS=4 LONG_SEEDS=6 bash tools/balance/run-variants.sh base lote1 lote2
set -e
cd "$(dirname "$0")/../.."
for v in "$@"; do
  if [ "$v" = base ]; then
    OUT=${OUT_BASE:-tools/balance/out/base} npx vitest run --config tools/balance/vitest.config.ts > "tools/balance/out/$v.log" 2>&1 || true
  else
    VARIANT=$v npx vitest run --config tools/balance/vitest.config.ts > "tools/balance/out/$v.log" 2>&1 || true
  fi
  echo "$v pronto"
done
