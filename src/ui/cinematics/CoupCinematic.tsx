import { useLayoutEffect, useRef } from 'react';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { buildCoup, type CoupSlot } from './coup';
import './coup.css';

export interface CoupCinematicProps {
  /** Nome do país, já traduzido. */
  country: string;
  /** Chamado no corte seco (fim ou toque): monte o tabuleiro do Combate aqui. */
  onDone(): void;
  reduced?: boolean;
  /** Imagens geradas por camada (opcional; sem elas a cena usa os desenhos SVG). */
  images?: Partial<Record<CoupSlot, string>>;
}

/** Cena curta (7 s; 1,5 s com reduzir movimento) antes do Combate de um Golpe. Toque, Esc ou Enter pulam. */
export function CoupCinematic({ country, onDone, reduced, images }: CoupCinematicProps) {
  const { t } = useT();
  const host = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useLayoutEffect(() => {
    if (!host.current) return;
    const h = buildCoup(host.current, {
      text: {
        kicker: t('cine.coup.kicker'),
        title: t('cine.coup.title', { country }),
        telex: [t('cine.coup.telex.1'), t('cine.coup.telex.2'), t('cine.coup.telex.3')],
        map: t('cine.coup.map'),
        skip: t('cine.skip'),
      },
      reduced: reduced ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      images,
      sound: (n) => audio.sfx(n),
      onDone: () => done.current(),
    });
    h.tl.play(0);
    return () => h.destroy();
    // Uma cena por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={host} />;
}
