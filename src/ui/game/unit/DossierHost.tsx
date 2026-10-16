import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { UnitDossier } from './UnitDossier';

const OpenUnit = createContext<(uid: string) => void>(() => {});

/** Abre a ficha de qualquer Unidade a partir de qualquer lista da tela de jogo. */
export const useOpenUnit = () => useContext(OpenUnit);

export function DossierHost({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const close = useCallback(() => setUid(null), []);
  return (
    <OpenUnit.Provider value={setUid}>
      {children}
      {uid && <UnitDossier uid={uid} onClose={close} />}
    </OpenUnit.Provider>
  );
}
