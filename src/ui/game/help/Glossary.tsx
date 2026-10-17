import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useT } from '../../../i18n';
import type { Key } from '../../../i18n';
import './help.css';

/** Definições curtas, na voz de CONTEXT.md, para o ícone "?" ao lado dos termos: [chave do título, chave do texto]. */
export const GLOSSARY = {
  reputation: ['game.help.reputation.title', 'game.help.reputation.text'],
  posture: ['game.help.posture.title', 'game.help.posture.text'],
  exposure: ['game.help.exposure.title', 'game.help.exposure.text'],
  saturation: ['game.help.saturation.title', 'game.help.saturation.text'],
  cargo: ['game.help.cargo.title', 'game.help.cargo.text'],
  escort: ['game.help.escort.title', 'game.help.escort.text'],
  station: ['game.help.station.title', 'game.help.station.text'],
  team: ['game.help.team.title', 'game.help.team.text'],
  upkeep: ['game.help.upkeep.title', 'game.help.upkeep.text'],
  trait: ['game.help.trait.title', 'game.help.trait.text'],
  contract: ['game.help.contract.title', 'game.help.contract.text'],
  threat: ['game.help.threat.title', 'game.help.threat.text'],
  strength: ['game.help.strength.title', 'game.help.strength.text'],
  deal: ['game.help.deal.title', 'game.help.deal.text'],
} as const satisfies Record<string, readonly [Key, Key]>;

export type TermId = keyof typeof GLOSSARY;

/**
 * Ícone "?" de 44 px de área de toque que abre uma definição. Funciona com toque, clique e teclado
 * (Enter/Espaço abre, Esc fecha); nada depende de hover.
 */
export function Help({ term, children }: { term: TermId; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const { t } = useT();
  const [titleKey, textKey] = GLOSSARY[term];
  const title = t(titleKey);
  const text = t(textKey);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <span className="help" ref={ref}>
      {children}
      <button
        type="button"
        className="help-btn"
        aria-label={t('game.help.whatIs', { title })}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <span className="g-help" aria-hidden>
          ?
        </span>
      </button>
      {open && (
        <span id={id} role="tooltip" className="help-pop">
          <b>{title}</b>
          {text}
        </span>
      )}
    </span>
  );
}
