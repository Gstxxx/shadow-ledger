import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import { GameIcon } from '../../../art/icons/GameIcon';
import { sfx } from '../settings';
import { useLang } from '../../../i18n';
import { TERM_ICON, useGuide, type Block } from './guideContent';
import './howto.css';

/** **termo** → <strong>, com o ícone de src/art quando o termo é um conceito do jogo. */
function rich(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const icon = TERM_ICON[part.toLowerCase()];
    return (
      <strong key={i} className={icon ? 'slm-term' : undefined}>
        {icon && <GameIcon id={icon} size={16} accent="var(--sl-stamp-red)" />}
        {part}
      </strong>
    );
  });
}

function renderBlock(b: Block, i: number): ReactNode {
  if ('p' in b) return <p key={i}>{rich(b.p)}</p>;
  if ('tip' in b)
    return (
      <p key={i} className="slm-howto-tip">
        <Lightbulb size={18} aria-hidden="true" />
        <span>{rich(b.tip)}</span>
      </p>
    );
  if ('ol' in b)
    return (
      <ol key={i}>
        {b.ol.map((x, j) => (
          <li key={j}>{rich(x)}</li>
        ))}
      </ol>
    );
  return (
    <ul key={i}>
      {b.ul.map((x, j) =>
        typeof x === 'string' ? (
          <li key={j}>{rich(x)}</li>
        ) : (
          <li key={j}>
            {rich(x.text)}
            <ul>
              {x.sub.map((y, k) => (
                <li key={k}>{rich(y)}</li>
              ))}
            </ul>
          </li>
        ),
      )}
    </ul>
  );
}

export function HowToPlay({ reduced }: { reduced: boolean }) {
  const g = useGuide();
  const lang = useLang();
  const [active, setActive] = useState(g.sections[0].id);
  const root = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLElement>(null);

  // A seção visível no topo da área de leitura fica marcada na navegação.
  useEffect(() => {
    const scroller = root.current?.closest('.slm-dossier-body');
    if (!scroller) return;
    const els = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-section]'));
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive((top.target as HTMLElement).dataset.section!);
      },
      { root: scroller, rootMargin: '0px 0px -65% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  // No celular, o chip ativo rola para dentro da faixa (só a faixa; scrollIntoView rolaria a tela toda).
  useEffect(() => {
    const strip = chips.current?.querySelector<HTMLElement>('ul');
    const chip = strip?.querySelector<HTMLElement>(`[data-target="${active}"]`);
    if (!strip || !chip || strip.scrollWidth <= strip.clientWidth) return;
    const left = chip.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: left - 12, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [active, reduced]);

  const go = (id: string) => {
    sfx('type');
    const el = root.current?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    const scroller = root.current?.closest<HTMLElement>('.slm-dossier-body');
    if (el && scroller) {
      // No celular a faixa de chips fica presa no topo e cobriria o título da seção.
      const sticky = window.matchMedia('(max-width: 819px)').matches ? (chips.current?.offsetHeight ?? 0) : 0;
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - sticky - 8;
      scroller.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    }
    setActive(id);
    el?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
  };

  return (
    <div className="slm-howto" ref={root}>
      <nav className="slm-howto-nav" aria-label={g.sectionsLabel} ref={chips}>
        <ul>
          {g.sections.map((sec) => (
            <li key={sec.id}>
              <button
                type="button"
                data-target={sec.id}
                className={`slm-howto-link${sec.highlight ? ' is-quick' : ''}`}
                aria-current={active === sec.id ? 'location' : undefined}
                onClick={() => go(sec.id)}
              >
                <GameIcon id={sec.icon} size={18} accent={sec.highlight ? 'var(--sl-stamp-blue)' : 'var(--sl-stamp-red)'} />
                <span>{sec.nav}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="slm-howto-doc">
        <p className="slm-howto-intro" data-enter>
          {rich(g.intro)}
        </p>
        {g.sections.map((sec) => (
          <section key={sec.id} data-section={sec.id} className={`slm-howto-sec${sec.highlight ? ' is-quick' : ''}`} aria-labelledby={`howto-${sec.id}`}>
            {sec.highlight && <span className="slm-card-badge">{g.quickLabel}</span>}
            <h3 id={`howto-${sec.id}`} tabIndex={-1}>
              <GameIcon id={sec.icon} size={22} accent={sec.highlight ? 'var(--sl-stamp-blue)' : 'var(--sl-stamp-red)'} />
              {sec.title}
            </h3>
            {sec.blocks.map(renderBlock)}
          </section>
        ))}
      </div>
    </div>
  );
}
