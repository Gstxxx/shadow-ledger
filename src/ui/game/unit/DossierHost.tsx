import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { UnitDossier } from './UnitDossier';
import { useStage } from '../stage/context';

const OpenUnit = createContext<(uid: string) => void>(() => {});

/** Abre a ficha de qualquer Unidade a partir de qualquer lista da tela de jogo. */
export const useOpenUnit = () => useContext(OpenUnit);

export function DossierHost({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const close = useCallback(() => setUid(null), []);
  // No palco (ADR 0006, etapa 3) a ficha é um modal central com voltar; fora dele, o modal próprio.
  const stage = useStage();
  const open = useCallback((id: string) => (stage ? stage.push({ kind: 'unit', uid: id }) : setUid(id)), [stage]);
  return (
    <OpenUnit.Provider value={open}>
      {children}
      {uid && <UnitDossier uid={uid} onClose={close} />}
    </OpenUnit.Provider>
  );
}
