import { exportSave } from '../../store/game';
import { loadSave } from '../../game/save';

/** One-line summary of the saved game for the Continuar row. */
export function readSaveSummary(): string | null {
  const raw = exportSave();
  if (!raw) return null;
  try {
    const s = loadSave(raw);
    if (!s) return null;
    const day = Math.floor(s.time / 24) + 1;
    const cash = s.agencies[0].cash / 1_000_000;
    return `Dia ${day} · ${s.options.preset.title} · US$ ${cash.toFixed(1).replace('.', ',')} mi`;
  } catch {
    return null;
  }
}
