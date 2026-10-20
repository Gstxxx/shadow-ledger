// O que a Analista lembra entre partidas: tópicos já explicados e se foi silenciada. Fica no navegador
// (localStorage); sem storage, ela só esquece ao recarregar.
import { useSyncExternalStore } from 'react';
import type { TopicId } from '../../game/tutorial';

const KEY = 'sl.analyst';

export interface AnalystMemory {
  seen: TopicId[];
  muted: boolean;
}

function read(): AnalystMemory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<AnalystMemory>;
      return { seen: Array.isArray(m.seen) ? m.seen : [], muted: !!m.muted };
    }
  } catch {
    /* sem storage ou JSON ruim */
  }
  return { seen: [], muted: false };
}

let state = read();
const listeners = new Set<() => void>();

function write(next: AnalystMemory) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sem storage: vale só nesta sessão */
  }
  listeners.forEach((l) => l());
}

export const analystMemory = {
  get: () => state,
  markSeen(id: TopicId) {
    if (!state.seen.includes(id)) write({ ...state, seen: [...state.seen, id] });
  },
  setMuted(muted: boolean) {
    write({ ...state, muted });
  },
  /** Esquece tudo (Configurações → rever o tutorial). */
  reset() {
    write({ seen: [], muted: false });
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAnalystMemory = (): AnalystMemory => useSyncExternalStore(subscribe, analystMemory.get, analystMemory.get);
