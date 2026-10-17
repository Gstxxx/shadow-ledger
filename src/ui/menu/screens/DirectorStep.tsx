import { useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { gsap } from 'gsap';
import { Check, ShieldCheck, TriangleAlert } from 'lucide-react';
import { DirectorPortrait } from '../../../art/directors';
import { GameIcon } from '../../../art/icons/GameIcon';
import type { OriginId } from '../../../game/types';
import { Disclosure } from '../controls';
import { ease, f } from '../ease';
import { sfx } from '../settings';
import type { OriginStrings, OriginText } from './originStrings';
import './director.css';

interface Props {
  o: OriginStrings;
  value: Exclude<OriginId, 'none'>;
  onChange(id: Exclude<OriginId, 'none'>): void;
  /** Escolher de novo a já escolhida avança (Enter/duplo toque). */
  onConfirm(): void;
  reduced: boolean;
}

/**
 * Passo Diretor: 6 fichas de Origem (retrato, nome, emblema) e, ao lado, o dossiê aberto da escolhida.
 * Ao trocar de Origem, a capa de pasta gira para fora como quem abre a ficha e a página de dentro pousa
 * (motion da abertura: saída acelerando, entrada desacelerando, linhas com 2 quadros entre si).
 */
export function DirectorStep({ o, value, onChange, onConfirm, reduced }: Props) {
  const current = o.origins.find((x) => x.id === value) ?? o.origins[0];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: ReactKeyboardEvent) => {
    const i = o.origins.findIndex((x) => x.id === value);
    const cols = 3;
    let j = -1;
    if (e.key === 'ArrowRight') j = Math.min(o.origins.length - 1, i + 1);
    if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
    if (e.key === 'ArrowDown') j = Math.min(o.origins.length - 1, i + cols);
    if (e.key === 'ArrowUp') j = Math.max(0, i - cols);
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = o.origins.length - 1;
    if (j < 0) return;
    e.preventDefault();
    onChange(o.origins[j].id);
    refs.current[o.origins[j].id]?.focus();
  };

  return (
    <div className="slm-dir is-simple">
      <div className="slm-dir-pick">
        <h4 className="slm-dir-q">{o.choose}</h4>
        <div className="slm-dir-grid" role="radiogroup" aria-label={o.title} onKeyDown={onKey}>
          {o.origins.map((x) => {
            const on = x.id === value;
            return (
              <button
                key={x.id}
                ref={(b) => {
                  refs.current[x.id] = b;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                className="slm-dir-card"
                onClick={() => {
                  if (on) onConfirm();
                  else {
                    sfx('open');
                    onChange(x.id);
                  }
                }}
              >
                <span className="slm-dir-face" aria-hidden="true">
                  <DirectorPortrait origin={x.art} size={64} crop="head" blink={false} />
                </span>
                <span className="slm-dir-name">{x.name}</span>
                <span className="slm-dir-pc slm-dir-pc--pro">
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span className="slm-sr">{o.advantage}:</span> {x.pro}
                </span>
                <span className="slm-dir-pc slm-dir-pc--con">
                  <TriangleAlert size={14} aria-hidden="true" />
                  <span className="slm-sr">{o.disadvantage}:</span> {x.con}
                </span>
                <span className="slm-card-check" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
        <Disclosure label={`${o.more}: ${current.name}`} reduced={reduced} className="slm-dir-more">
          <Dossier key={current.id} item={current} o={o} reduced={reduced} />
        </Disclosure>
      </div>
    </div>
  );
}

function Dossier({ item, o, reduced }: { item: OriginText; o: OriginStrings; reduced: boolean }) {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const cover = el.querySelector('.slm-dir-cover');
    const lines = el.querySelectorAll('[data-line]');
    const face = el.querySelector('.slm-dir-big');
    if (reduced) {
      gsap.set(cover, { autoAlpha: 0 });
      return;
    }
    const tl = gsap.timeline();
    // A capa gira na dobra (borda esquerda) e sai acelerando; a página de dentro já está lá embaixo.
    tl.fromTo(cover, { rotationY: 0, autoAlpha: 1 }, { rotationY: -118, duration: f(10), ease: ease.gentleIn, transformOrigin: '0% 50%' }, 0)
      .set(cover, { autoAlpha: 0 }, f(10))
      .fromTo(face, { scale: 1.06, filter: 'brightness(0.6)' }, { scale: 1, filter: 'brightness(1)', duration: f(14), ease: ease.softLand }, f(3))
      .fromTo(lines, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: f(10), ease: ease.softLand, stagger: f(2) }, f(5));
    return () => {
      tl.progress(1).kill();
    };
  }, [reduced]);

  return (
    <article ref={root} className="slm-dir-dossier" aria-live="polite" aria-label={item.name}>
      <div className="slm-dir-page">
        <div className="slm-dir-big">
          <DirectorPortrait origin={item.art} mood="neutral" size={168} crop="bust" />
        </div>
        <div className="slm-dir-text">
          <span className="slm-dir-kicker" data-line>
            <GameIcon id={`origin-${item.art}`} size={16} accent="var(--sl-stamp-red)" />
            {item.code}
          </span>
          <h3 className="slm-dir-title" data-line>
            {item.name}
          </h3>
          <p className="slm-dir-bio" data-line>
            {item.desc}
          </p>
          <p className="slm-dir-pro" data-line>
            <ShieldCheck size={18} aria-hidden="true" />
            <span>
              <strong>{o.advantage}</strong> {item.advantage}
            </span>
          </p>
          <p className="slm-dir-con" data-line>
            <TriangleAlert size={18} aria-hidden="true" />
            <span>
              <strong>{o.disadvantage}</strong> {item.disadvantage}
            </span>
          </p>
        </div>
      </div>
      <div className="slm-dir-cover" aria-hidden="true">
        <span className="slm-dir-cover-tab" />
        <GameIcon id={`origin-${item.art}`} size={44} accent="var(--sl-stamp-red)" />
        <span className="slm-dir-cover-code">{item.code}</span>
      </div>
    </article>
  );
}
