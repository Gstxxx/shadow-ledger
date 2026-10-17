import { useLayoutEffect, useRef } from 'react';
import { audio } from '../../audio/engine';
import { buildResult, type ResultItem } from './result';
import './result.css';

export interface CombatResultProps {
  kind: 'win' | 'lose';
  /** Texto do carimbo, já traduzido (ex.: t('game.combat.result.win').toUpperCase()). */
  title: string;
  items: ResultItem[];
  /** Rótulo do botão (ex.: t('game.combat.finish')). */
  doneLabel: string;
  onDone(): void;
  /** Tabuleiro que recua/escurece (vitória) ou dessatura e recebe as tarjas (derrota). */
  board?: HTMLElement | null;
  reduced?: boolean;
}

/** Tela de Vitória/Derrota sobre o Combate. Toque pula até o fim; Concluir aparece depois do clímax. */
export function CombatResult({ kind, title, items, doneLabel, onDone, board, reduced }: CombatResultProps) {
  const host = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useLayoutEffect(() => {
    if (!host.current) return;
    const h = buildResult(host.current, {
      kind,
      title,
      items,
      doneLabel,
      board,
      reduced: reduced ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      onDone: () => done.current(),
      sound: (n) => audio.sfx(n),
    });
    return () => h.destroy();
    // Monta uma vez por resultado; itens e textos são lidos na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);
  return <div ref={host} />;
}
