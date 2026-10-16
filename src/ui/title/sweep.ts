import gsap from 'gsap';
import { audio } from '../../audio/engine';

/**
 * Menu transition: a redaction bar sweeps over the current panel, then `done` swaps the screen.
 * The next panel unmasks from the bar's trailing edge (see `.panel-enter` in title.css).
 */
export function sweepOut(container: HTMLElement | null, done: () => void) {
  if (!container) return done();
  const bar = document.createElement('div');
  bar.className = 'sweep-bar';
  container.appendChild(bar);
  audio.sfx('redact');
  gsap.fromTo(
    bar,
    { scaleX: 0 },
    {
      scaleX: 1,
      duration: 0.3,
      ease: 'expo.out',
      onComplete: () => {
        done();
        bar.remove();
      },
    },
  );
}
