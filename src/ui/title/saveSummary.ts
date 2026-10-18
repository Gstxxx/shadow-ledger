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
    const cash = Math.round(s.agencies[0].cash);
    return `Dia ${day} · ${s.options.preset.title} · US$ ${cash.toLocaleString('pt-BR')}`;
  } catch {
    return null;
  }
}
