import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft } from 'lucide-react';
import { ease, f } from './ease';
import { sfx } from './settings';

interface Props {
  title: string;
  backLabel: string;
  closing: boolean;
  reduced: boolean;
  onRequestClose(): void;
  onClosed(): void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Pasta de dossiê jogada sobre o livro-caixa: entra deslizando da direita com um leve giro
 * que assenta (softLand), sai acelerando para fora (accelExit). As linhas do conteúdo pousam
 * com 2 quadros de intervalo.
 */
export function Dossier({ title, backLabel, closing, reduced, onRequestClose, onClosed, children, footer }: Props) {
  const el = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const node = el.current!;
    sfx('open');
    if (reduced) {
      back.current?.focus();
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { xPercent: 104, rotation: 2.2, transformOrigin: '0% 100%' },
        { xPercent: 0, rotation: 0, duration: f(13), ease: ease.softLand },
      );
      gsap.fromTo(
        node.querySelectorAll('[data-enter]'),
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: f(12), ease: ease.softLand, stagger: f(2), delay: f(5) },
      );
    }, node);
    back.current?.focus({ preventScroll: true });
    return () => ctx.revert();
  }, [reduced]);

  useEffect(() => {
    if (!closing) return;
    sfx('close');
    if (reduced) {
      onClosed();
      return;
    }
    const tw = gsap.to(el.current, { xPercent: 106, rotation: 1.2, duration: f(9), ease: ease.accelExit, onComplete: onClosed });
    return () => {
      tw.kill();
    };
  }, [closing, reduced, onClosed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onRequestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRequestClose]);

  return (
    <section className="slm-dossier" ref={el} role="dialog" aria-modal="true" aria-label={title}>
      <div className="slm-dossier-tab" aria-hidden="true" />
      <header className="slm-dossier-head">
        <button ref={back} type="button" className="slm-back" onClick={onRequestClose}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          <span>{backLabel}</span>
        </button>
        <h2 className="slm-dossier-title">{title}</h2>
      </header>
      <div className="slm-dossier-body">{children}</div>
      {footer && <footer className="slm-dossier-foot">{footer}</footer>}
    </section>
  );
}
