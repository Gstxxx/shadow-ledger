import { useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { audio } from '../../audio/engine';
import { hasSave, useGameStore } from '../../store/game';
import type { Screen } from '../../store/game';
import { useSettings } from '../../store/settings';
import { readSaveSummary } from './saveSummary';
import { sweepOut } from './sweep';

interface Item {
  key: Screen | 'continue';
  label: string;
  meta: string;
  disabled?: boolean;
}

/** Title: the name arrives as two redaction bars; menu rows are ledger lines. */
export function TitleScreen({ intro }: { intro: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const go = useGameStore((s) => s.go);
  const continueSaved = useGameStore((s) => s.continueSaved);
  const reduced = useSettings((s) => s.reducedMotion);
  const summary = useMemo(() => (hasSave() ? readSaveSummary() : null), []);

  const items: Item[] = [
    { key: 'newgame', label: 'Nova partida', meta: 'Sandbox · Presets' },
    {
      key: 'continue',
      label: 'Continuar',
      meta: summary ?? 'Nenhuma partida salva',
      disabled: !summary,
    },
    { key: 'settings', label: 'Configurações', meta: 'Som · ritmo · save' },
    { key: 'credits', label: 'Créditos', meta: 'Quem assina' },
  ];

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      const full = intro && !reduced;
      if (full) {
        tl.from('.logo-bar', {
          scale: 3.4,
          xPercent: (i: number) => (i ? 18 : -18),
          duration: 0.62,
          stagger: 0.16,
          ease: 'expo.out',
        })
          .fromTo(
            '.logo-bar',
            { clipPath: 'inset(0 100% 0 0)' },
            { clipPath: 'inset(0 0% 0 0)', duration: 0.42, stagger: 0.16, ease: 'power4.out', onStart: () => audio.sfx('redact') },
            0,
          )
          .from('.tagline .w', { y: 10, opacity: 0, duration: 0.3, stagger: 0.12, ease: 'power3.out' }, 0.7)
          .from('.menu-row', { clipPath: 'inset(0 100% 0 0)', x: -24, duration: 0.5, stagger: 0.08 }, 1.05)
          .from('.title-foot', { opacity: 0, duration: 0.4 }, 1.5);
      } else {
        tl.from('.menu-root', { clipPath: 'inset(0 100% 0 0)', duration: 0.45 });
      }
      const skip = () => tl.progress(1);
      el.addEventListener('pointerdown', skip, { once: true });
    }, el);
    return () => ctx.revert();
  }, [intro, reduced]);

  const choose = (it: Item) => {
    if (it.disabled) return;
    audio.unlock();
    audio.sfx('click');
    sweepOut(root.current, () => {
      if (it.key === 'continue') continueSaved();
      else go(it.key);
    });
  };

  return (
    <div className="title-screen" ref={root}>
      <div className="menu-root">
        <h1 className="logo" aria-label="Shadow Ledger">
          <span className="logo-bar">
            <span>SHADOW</span>
          </span>
          <span className="logo-bar two">
            <span>LEDGER</span>
          </span>
        </h1>
        <p className="tagline">
          {'Armas, informação e mercenários. Ninguém assina nada.'.split(' ').map((w, i) => (
            <span key={i} className="w">
              {w}{' '}
            </span>
          ))}
        </p>
        <nav className="menu" aria-label="Menu principal">
          {items.map((it, i) => (
            <button
              key={it.key}
              className="menu-row"
              disabled={it.disabled}
              onPointerEnter={() => !it.disabled && audio.sfx('hover')}
              onClick={() => choose(it)}
            >
              <span className="menu-no mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="menu-label">{it.label}</span>
              <span className="menu-meta mono">{it.meta}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="title-foot mono">v0.1 · protótipo jogável</div>
    </div>
  );
}
