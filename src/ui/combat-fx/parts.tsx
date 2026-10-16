import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ease, f } from '../menu/ease';

function prefersReduced() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Título do Combate que entra sob tarja: a tarja recua acelerando e revela o texto (como na abertura).
 * Use no lugar do texto do título: <RedactedTitle>{c.title}</RedactedTitle>.
 */
export function RedactedTitle({ children, reduced, delay = 0.12 }: { children: ReactNode; reduced?: boolean; delay?: number }) {
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const b = bar.current;
    if (!b) return;
    if (reduced ?? prefersReduced()) {
      gsap.set(b, { autoAlpha: 0 });
      return;
    }
    const tw = gsap.fromTo(b, { scaleX: 1 }, { scaleX: 0, duration: f(10), ease: ease.accelExit, delay });
    return () => {
      tw.kill();
    };
  }, [reduced, delay]);
  return (
    <span className="cfx-title">
      {children}
      <span ref={bar} className="cfx-title-bar" aria-hidden="true" />
    </span>
  );
}

/**
 * Número que rola quando muda (contador de turno): o antigo sobe e sai acelerando, o novo chega de baixo e assenta.
 * <RollingNumber value={c.turn} />
 */
export function RollingNumber({ value, reduced }: { value: number; reduced?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useLayoutEffect(() => {
    const host = box.current;
    if (!host || prev.current === value) return;
    const old = prev.current;
    prev.current = value;
    if (reduced ?? prefersReduced()) return;
    const cur = host.querySelector<HTMLSpanElement>('.cfx-roll-in');
    const out = document.createElement('span');
    out.className = 'cfx-roll-out';
    out.textContent = String(old);
    host.appendChild(out);
    const dir = value > old ? 1 : -1;
    const tl = gsap.timeline({ onComplete: () => out.remove() });
    tl.fromTo(out, { yPercent: 0, opacity: 1 }, { yPercent: -100 * dir, opacity: 0, duration: f(6), ease: ease.accelExit }, 0).fromTo(
      cur,
      { yPercent: 100 * dir, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: f(8), ease: ease.softLand },
      f(1),
    );
    return () => {
      tl.progress(1);
    };
  }, [value, reduced]);
  return (
    <span ref={box} className="cfx-roll">
      <span className="cfx-roll-in">{value}</span>
    </span>
  );
}
