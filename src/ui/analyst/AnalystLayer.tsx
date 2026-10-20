// A Analista na tela de jogo: balão compacto num canto do mapa (comenta Eventos e explica cada sistema na
// primeira vez), chip do objetivo guiado e anel de destaque no elemento certo. Só o balão captura cliques.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronUp, PanelLeftOpen } from 'lucide-react';
import { AnalystPortrait } from '../../art';
import type { AnalystMood } from '../../art';
import {
  guideEnabled,
  guideProgress,
  isTutorialPreset,
  presentTopics,
  skipGuide,
  STEP_TARGETS,
  TOPIC_TARGETS,
  tutorialOf,
  updateTutorial,
} from '../../game/tutorial';
import type { GuideStepId, TopicId } from '../../game/tutorial';
import type { GameEvent, GameState, Tone } from '../../game/types';
import { useGame, useGameStore } from '../../store/game';
import { analystMemory, useAnalystMemory } from './memory';
import { akey, hasAnalystKey, useAnalystT } from './strings';
import type { AnalystKey } from './strings';
import './analyst.css';

const TONE_MOOD: Record<Tone, AnalystMood> = {
  bad: 'alert',
  warn: 'concerned',
  good: 'pleased',
  info: 'neutral',
  intel: 'neutral',
};
const TOPIC_MOOD: Partial<Record<TopicId, AnalystMood>> = {
  combat: 'concerned',
  threat: 'concerned',
  tension: 'alert',
  rival: 'concerned',
};

/** O Evento já é uma fala da Analista (roteiro da Campanha): ela não comenta a própria fala. */
const isAnalystLine = (e: GameEvent) => !!e.bodyMsg?.key.startsWith('campaign.') || !!e.titleMsg?.key.startsWith('campaign.');

/** Comentário curto para um Evento: o mais específico que existir (tipo + tom, tipo, tom). */
function eventKey(e: GameEvent): AnalystKey {
  const tone = e.tone === 'good' ? 'good' : e.tone === 'bad' || e.tone === 'warn' ? 'bad' : '';
  for (const k of [tone && `analyst.event.${e.kind}.${tone}`, `analyst.event.${e.kind}`, tone && `analyst.event.${tone}`])
    if (k && hasAnalystKey(k)) return k;
  return 'analyst.event.intel';
}

/** Ancestral com rolagem mais próximo: o anel é recortado por ele. */
function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** Parte do elemento que está à vista: dentro da tela, do contêiner com rolagem e não coberta por um modal. */
function visibleRect(el: HTMLElement): DOMRect | null {
  let r = el.getBoundingClientRect();
  if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return null;
  const box = scroller(el)?.getBoundingClientRect();
  const left = Math.max(r.left, box?.left ?? 0, 0);
  const top = Math.max(r.top, box?.top ?? 0, 0);
  const right = Math.min(r.right, box?.right ?? innerWidth, innerWidth);
  const bottom = Math.min(r.bottom, box?.bottom ?? innerHeight, innerHeight);
  if (right - left < 8 || bottom - top < 8) return null;
  r = new DOMRect(left, top, right - left, bottom - top);
  // Coberto por outra camada (ex.: o Mercado aberto em modal por cima da barra de baixo)?
  const hit = document.elementFromPoint(left + (right - left) / 2, top + (bottom - top) / 2);
  if (hit && hit !== el && !el.contains(hit) && !hit.closest('.analyst-layer, .analyst-ring')) return null;
  return r;
}

/**
 * Primeiro alvo `[data-tour]` à vista, na ordem de preferência. O alvo principal que existe mas está fora da
 * área visível (ex.: Comprar abaixo da dobra) é rolado para a vista uma vez por `key`.
 */
function findTarget(ids: string[], scrolled?: { current: string | null }, key = ''): DOMRect | null {
  for (const [i, id] of ids.entries()) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
      const r = visibleRect(el);
      if (r) return r;
      if (i === 0 && scrolled && scrolled.current !== key && el.getBoundingClientRect().width) {
        scrolled.current = key;
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }
  return null;
}

/** Botão de fechar do diálogo aberto por cima: quando o alvo do passo está atrás dele, é por ali que se sai. */
function dialogCloser(): DOMRect | null {
  const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]')];
  const top = dialogs.reverse().find((d) => d.getBoundingClientRect().width > 0);
  if (!top) return null;
  for (const b of top.querySelectorAll<HTMLElement>('button[aria-label]')) {
    if (/^(fechar|close)(\s|$)/i.test(b.getAttribute('aria-label') ?? '')) return visibleRect(b);
  }
  return null;
}

/** Posição de um retângulo da tela, revista a cada 300 ms (painéis abrem, o mapa mexe). */
function useRect(read: () => DOMRect | null, deps: unknown[]): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const reader = useRef(read);
  reader.current = read;
  useLayoutEffect(() => {
    const update = () =>
      setRect((prev) => {
        const r = reader.current();
        if (!r && !prev) return prev;
        if (r && prev && r.x === prev.x && r.y === prev.y && r.width === prev.width && r.height === prev.height) return prev;
        return r;
      });
    update();
    const id = window.setInterval(update, 300);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', update);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return rect;
}

interface Line {
  id: string;
  mood: AnalystMood;
  title?: string;
  text: string;
  topic?: TopicId;
}

export interface AnalystLayerProps {
  /** Abre a gaveta lateral no celular quando o alvo do guia está escondido nela. */
  onOpenDrawer?: (side: 'left' | 'right') => void;
}

export function AnalystLayer({ onOpenDrawer }: AnalystLayerProps) {
  const s = useGame();
  const rev = useGameStore((st) => st.rev);
  const mutate = useGameStore((st) => st.mutate);
  const mem = useAnalystMemory();
  const t = useAnalystT();
  const [done, setDone] = useState<{ text: string; at: number } | null>(null);
  // Cartão único: pílula fina por padrão; abre ao tocar ou quando chega fala nova, recolhe no "Entendi".
  const [open, setOpen] = useState(false);
  const pausedByMe = useRef<TopicId | null>(null);

  // Guia: avança pelo estado do jogo e guarda no save quando muda.
  useEffect(() => {
    if (!s || s.over) return;
    const before = signature(s);
    const finished = updateTutorial(s);
    if (finished.length) {
      const last = finished[finished.length - 1];
      const tut = tutorialOf(s)!;
      const text =
        tut.step === 'free'
          ? t(isTutorialPreset(s.options.preset) ? 'analyst.done.unlocked' : 'analyst.done.free')
          : t(akey(`analyst.done.${last}`));
      setDone({ text, at: Date.now() });
    }
    if (signature(s) !== before) mutate(() => {});
  }, [rev]); // eslint-disable-line react-hooks/exhaustive-deps

  const tut = s && guideEnabled(s) ? tutorialOf(s) : undefined;
  const ev = s?.events.find((e) => (e.kind as string) !== 'engage');
  // Combate ocupa a tela inteira (grade, Reserva, resultado): a Analista some até ele acabar.
  const inCombat = !!(s?.combat || s?.pendingCombat);
  const topic = s && !s.over && !inCombat ? presentTopics(s).find((id) => !mem.seen.includes(id)) : undefined;

  // Um Evento novo torna velha a comemoração anterior.
  useEffect(() => {
    if (ev) setDone(null);
  }, [ev?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  let line: Line | null = null;
  if (!mem.muted && s) {
    // Uma voz por vez: com uma fala da Campanha na tela, o balão fica quieto.
    if (ev && isAnalystLine(ev)) line = null;
    else if (ev)
      line = {
        id: `ev-${ev.id}`,
        mood: TONE_MOOD[ev.tone] ?? 'neutral',
        text: t(eventKey(ev)),
      };
    else if (done) line = { id: `dn-${done.at}`, mood: 'pleased', text: done.text };
    else if (topic)
      line = {
        id: `tp-${topic}`,
        mood: TOPIC_MOOD[topic] ?? 'neutral',
        title: t(akey(`analyst.topic.${topic}.title`)),
        text: t(akey(`analyst.topic.${topic}.text`)),
        topic,
      };
  }

  // Um sistema novo pausa o relógio uma vez, para dar tempo de ler; "Entendi" devolve o relógio.
  useEffect(() => {
    if (!line?.topic || ev) return;
    const st = useGameStore.getState();
    if (!st.paused) {
      pausedByMe.current = line.topic;
      useGameStore.setState({ paused: true });
    }
  }, [line?.topic, !!ev]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fala nova (tópico ou passo concluído) abre o cartão; comentário de Evento só acende o ponto.
  useEffect(() => {
    if (line && !line.id.startsWith('ev-')) setOpen(true);
  }, [line?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!line) return;
    setSpeaking(true);
    const id = window.setTimeout(() => setSpeaking(false), Math.min(2600, 600 + line.text.length * 25));
    return () => window.clearTimeout(id);
  }, [line?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const step: GuideStepId | undefined = tut && !tut.skipped ? tut.step : undefined;
  const guiding = !!step && step !== 'free' && !s?.over;
  const blocked = !!(s?.combat || s?.pendingCombat || ev);
  // Enquanto explica um tópico, destaca o elemento dele; senão, o alvo do passo do guia.
  const targets = line?.topic ? (TOPIC_TARGETS[line.topic] ?? []) : guiding && !blocked ? STEP_TARGETS[step!] : [];
  const scrolled = useRef<string | null>(null);
  const ring = useRect(
    () => {
      if (!targets.length) return null;
      // Alvo atrás de um modal (ex.: comprou e agora precisa voar pelo mapa): aponta o botão de fechar.
      return findTarget(targets, scrolled, `${step}|${line?.id ?? ''}`) ?? (line?.topic ? null : dialogCloser());
    },
    [targets.join(), rev],
  );
  const map = useRect(() => document.querySelector('.map-area')?.getBoundingClientRect() ?? null, []);
  const ceiling = useRect(() => document.querySelector('.map-modes')?.getBoundingClientRect() ?? null, []);
  // Topo mais alto das barras de baixo (Relatório, barra de ações): o balão fica acima delas.
  const floor = useRect(() => {
    let top = innerHeight;
    for (const el of document.querySelectorAll<HTMLElement>('.log, [data-tour$="-dock"]')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.top > innerHeight / 2) top = Math.min(top, r.top);
    }
    return new DOMRect(0, top, 0, 0);
  }, []);

  if (!s || inCombat) return null;

  const ack = () => {
    if (line?.topic) {
      analystMemory.markSeen(line.topic);
      if (pausedByMe.current === line.topic) {
        pausedByMe.current = null;
        useGameStore.setState({ paused: false });
      }
    } else if (line?.id.startsWith('dn-')) setDone(null);
    setOpen(false);
  };

  const progress = tut ? guideProgress(tut) : null;
  // Espaço livre entre as camadas do mapa (topo) e as barras de baixo: o cartão aberto não passa disso.
  const room = Math.max(72, (floor?.top ?? innerHeight) - (ceiling?.bottom ?? 0) - 16);
  const corner = {
    left: (map?.left ?? 0) + 10,
    bottom: Math.max(10, innerHeight - (floor?.top ?? innerHeight) + 8),
  };

  return (
    <>
      {/* O anel fica fora da camada: aparece também sobre os modais (Mercado, País), sem capturar cliques. */}
      {ring && (
        <div
          className="analyst-ring"
          style={{
            left: ring.left - 6,
            top: ring.top - 6,
            width: ring.width + 12,
            height: ring.height + 12,
          }}
          aria-hidden
        />
      )}
      <div className="analyst-layer" aria-live="polite">
        <div className="analyst-dock" style={corner}>
          {(guiding || line) && (
            <section
              className={`analyst-card${open ? ' open' : ''} mood-${line?.mood ?? 'neutral'}`}
              style={{ maxHeight: `min(var(--analyst-cap), ${room}px)` }}
            >
              <button className="analyst-pill" onClick={() => setOpen(!open)} aria-expanded={open}>
                <AnalystPortrait
                  mood={line?.mood ?? 'neutral'}
                  size={28}
                  speaking={speaking && open}
                  blink={false}
                  className="analyst-pill-face"
                  title={t('analyst.name')}
                />
                <span className="analyst-pill-text">
                  {guiding && progress ? (
                    <>
                      <span className="mono analyst-kicker">{t('analyst.objective', { n: progress.n, total: progress.total })}</span>{' '}
                      {t(akey(`analyst.step.${step}.title`))}
                    </>
                  ) : (
                    <>
                      <span className="mono analyst-kicker">{t('analyst.name')}</span> {line?.title ?? ''}
                    </>
                  )}
                </span>
                {line && !open && <span className="analyst-dot" aria-hidden />}
                <ChevronUp size={16} className="analyst-chevron" aria-hidden />
              </button>
              {open && (
                <div className="analyst-card-body" key={line?.id ?? 'hint'}>
                  {/* Só o texto rola; os botões ficam sempre à vista. */}
                  <div className="analyst-card-scroll">
                    {line ? (
                      <p className="analyst-text">
                        {line.title && guiding && <strong className="analyst-lead">{line.title}.</strong>} {line.text}
                      </p>
                    ) : (
                      guiding && <p className="analyst-text dim">{t(akey(`analyst.step.${step}.hint`))}</p>
                    )}
                  </div>
                  <div className="analyst-actions">
                    {line && (line.topic || line.id.startsWith('dn-')) && (
                      <button className="btn sm primary" onClick={ack}>
                        {t('analyst.ok')}
                      </button>
                    )}
                    {onOpenDrawer && guiding && (step === 'buy' || step === 'sell' || step === 'station') && !ring && (
                      <button className="analyst-link" onClick={() => onOpenDrawer('left')} aria-label={t('analyst.openPanel')} title={t('analyst.openPanel')}>
                        <PanelLeftOpen size={14} />
                      </button>
                    )}
                    {guiding && (
                      <button className="analyst-link" onClick={() => mutate((g) => skipGuide(g))}>
                        {t('analyst.skipGuide')}
                      </button>
                    )}
                    <button className="analyst-link" onClick={() => analystMemory.setMuted(!mem.muted)}>
                      {t(mem.muted ? 'analyst.unmute' : 'analyst.mute')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
          {!guiding && !line && mem.muted && (
            <button className="analyst-mini" onClick={() => analystMemory.setMuted(false)} aria-label={t('analyst.unmute')} title={t('analyst.unmute')}>
              <AnalystPortrait mood="neutral" size={36} blink={false} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** O que, no guia, muda o save: passo, liberação e a chegada das rivais. */
function signature(s: GameState): string {
  const t = tutorialOf(s);
  return `${t?.step}|${t?.skipped}|${t?.unlocked}|${s.agencies.length}`;
}
