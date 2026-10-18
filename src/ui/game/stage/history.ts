import { useEffect, useMemo, useRef } from 'react';
import type { StageApi, StageModal } from './context';

/**
 * Palco na URL (auditoria 2, item 3): o modal aberto e a aba ficam em `?m=…`, abrir/empilhar cria uma
 * entrada no histórico e o "voltar" do navegador ou do celular volta um modal (ou fecha o palco).
 * Formatos: c.<país>.<aba> · a.<aba> · i.<país>.<item>.<lado> · u.<uid>.
 */
export function encodeStage(m: StageModal): string {
  switch (m.kind) {
    case 'country':
      return `c.${m.id}.${m.tab}`;
    case 'agency':
      return `a.${m.tab}`;
    case 'item':
      return `i.${m.countryId}.${m.itemId}.${m.side ?? ''}`;
    case 'unit':
      return `u.${m.uid}`;
    case 'combat':
      return `k.${m.tab}`;
  }
}

export function decodeStage(v: string | null): StageModal | null {
  if (!v) return null;
  const [k, a, b, c] = v.split('.');
  if (k === 'c' && a && b) return { kind: 'country', id: a, tab: b as never };
  if (k === 'a' && a) return { kind: 'agency', tab: a as never };
  if (k === 'i' && a && b) return { kind: 'item', countryId: a, itemId: b, side: c === 'buy' || c === 'sell' ? c : undefined };
  if (k === 'u' && a) return { kind: 'unit', uid: a };
  if (k === 'k' && (a === 'contracts' || a === 'hunts')) return { kind: 'combat', tab: a };
  return null;
}

const urlWith = (v: string | null) => {
  const u = new URL(window.location.href);
  if (v) u.searchParams.set('m', v);
  else u.searchParams.delete('m');
  return `${u.pathname}${u.search}${u.hash}`;
};

interface Stack {
  current: StageModal | undefined;
  depth: number;
  canBack: boolean;
  open: (m: StageModal) => void;
  push: (m: StageModal) => void;
  replace: (m: StageModal) => void;
  back: () => void;
  close: () => void;
}

export function useStageHistory(stack: Stack): StageApi {
  // Quantas entradas o palco pôs no histórico além da de base.
  const pushed = useRef(0);
  const closing = useRef(false);
  const ref = useRef(stack);
  ref.current = stack;

  // Voltar do navegador/celular: um modal para trás, ou fecha o palco.
  useEffect(() => {
    const onPop = () => {
      const s = ref.current;
      if (closing.current) {
        closing.current = false;
        s.close();
        return;
      }
      if (pushed.current > 0) {
        pushed.current--;
        if (s.depth > 1) s.back();
        else s.close();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Deep link: ?m=… abre o modal ao entrar no jogo.
  useEffect(() => {
    const m = decodeStage(new URLSearchParams(window.location.search).get('m'));
    if (m) ref.current.open(m);
  }, []);

  // A URL acompanha o modal e a aba (sem criar entradas; quem cria são open/push).
  useEffect(() => {
    window.history.replaceState(window.history.state, '', urlWith(stack.current ? encodeStage(stack.current) : null));
  }, [stack.current]);

  return useMemo<StageApi>(
    () => ({
      current: stack.current,
      canBack: stack.canBack,
      open: (m) => {
        if (pushed.current === 0) {
          window.history.pushState(null, '', urlWith(encodeStage(m)));
          pushed.current = 1;
        }
        ref.current.open(m);
      },
      push: (m) => {
        window.history.pushState(null, '', urlWith(encodeStage(m)));
        pushed.current++;
        ref.current.push(m);
      },
      replace: (m) => ref.current.replace(m),
      back: () => {
        if (pushed.current > 0) window.history.back();
        else ref.current.back();
      },
      close: () => {
        if (pushed.current > 0) {
          closing.current = true;
          const n = pushed.current;
          pushed.current = 0;
          window.history.go(-n);
        } else ref.current.close();
      },
    }),
    [stack.current, stack.canBack], // eslint-disable-line react-hooks/exhaustive-deps
  );
}
