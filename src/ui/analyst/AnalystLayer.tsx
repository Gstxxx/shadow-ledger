// A Analista na tela de jogo: balão compacto num canto do mapa (comenta Eventos e explica cada sistema na
// primeira vez), chip do objetivo guiado e anel de destaque no elemento certo. Só o balão captura cliques.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { AnalystPortrait } from '../../art';
import type { AnalystMood } from '../../art';
import {
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

/** Tela baixa (celular deitado, ~640×360): a altura é o recurso escasso. */
function useCompact(): boolean {
  const query = '(max-height: 520px)';
  const [on, setOn] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const onChange = () => setOn(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return on;
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
  // Dica do objetivo: aberta por padrão; recolhida em tela baixa até o jogador tocar no chip.
  const [hintChoice, setHintOpen] = useState<boolean | null>(null);
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
      setHintOpen(null);
    }
    if (signature(s) !== before) mutate(() => {});
  }, [rev]); // eslint-disable-line react-hooks/exhaustive-deps

  const tut = s ? tutorialOf(s) : undefined;
  const ev = s?.events.find((e) => (e.kind as string) !== 'engage');
  const topic = s && !s.over && !s.combat ? presentTopics(s).find((id) => !mem.seen.includes(id)) : undefined;

  // Um Evento novo torna velha a comemoração anterior.
  useEffect(() => {
    if (ev) setDone(null);
  }, [ev?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  let line: Line | null = null;
  if (!mem.muted && s) {
    if (ev)
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
    () => (targets.length ? findTarget(targets, scrolled, `${step}|${line?.id ?? ''}`) : null),
    [targets.join(), rev],
  );
  const map = useRect(() => document.querySelector('.map-area')?.getBoundingClientRect() ?? null, []);
  // Topo mais alto das barras de baixo (Relatório, barra de ações): o balão fica acima delas.
  const floor = useRect(() => {
    let top = innerHeight;
    for (const el of document.querySelectorAll<HTMLElement>('.log, [data-tour$="-dock"]')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.top > innerHeight / 2) top = Math.min(top, r.top);
    }
    return new DOMRect(0, top, 0, 0);
  }, []);
  const compact = useCompact();
  const hintOpen = hintChoice ?? !compact;

  if (!s) return null;

  const ack = () => {
    if (line?.topic) {
      analystMemory.markSeen(line.topic);
      if (pausedByMe.current === line.topic) {
        pausedByMe.current = null;
        useGameStore.setState({ paused: false });
      }
    } else if (line?.id.startsWith('dn-')) setDone(null);
  };

  const progress = tut ? guideProgress(tut) : null;
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
          {guiding && progress && !(compact && line) && (
            <div className="analyst-objective">
              <button className="analyst-objective-head" onClick={() => setHintOpen(!hintOpen)} aria-expanded={hintOpen}>
                <span className="mono analyst-kicker">
                  {t('analyst.objective', {
                    n: progress.n,
                    total: progress.total,
                  })}
                </span>
                <span className="analyst-objective-title">{t(akey(`analyst.step.${step}.title`))}</span>
              </button>
              {hintOpen && (
                <p className="analyst-objective-hint">
                  {t(akey(`analyst.step.${step}.hint`))}{' '}
                  {onOpenDrawer && (step === 'buy' || step === 'sell' || step === 'station') && !ring && (
                    <button
                      className="analyst-link"
                      onClick={() => onOpenDrawer('left')}
                      aria-label={t('analyst.openPanel')}
                      title={t('analyst.openPanel')}
                    >
                      <PanelLeftOpen size={14} />
                    </button>
                  )}
                  <button className="analyst-link" onClick={() => mutate((g) => skipGuide(g))}>
                    {t('analyst.skipGuide')}
                  </button>
                </p>
              )}
            </div>
          )}
          {line ? (
            <div className={`analyst-balloon mood-${line.mood}`} key={line.id}>
              <AnalystPortrait mood={line.mood} size={56} speaking={speaking} className="analyst-face" title={t('analyst.name')} />
              <div className="analyst-body">
                <span className="mono analyst-kicker">{line.title ?? t('analyst.name')}</span>
                <p className="analyst-text">{line.text}</p>
                <div className="analyst-actions">
                  {(line.topic || line.id.startsWith('dn-')) && (
                    <button className="btn sm primary" onClick={ack}>
                      {t('analyst.ok')}
                    </button>
                  )}
                  <button className="analyst-link" onClick={() => analystMemory.setMuted(true)}>
                    {t('analyst.mute')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            mem.muted && (
              <button
                className="analyst-mini"
                onClick={() => analystMemory.setMuted(false)}
                aria-label={t('analyst.unmute')}
                title={t('analyst.unmute')}
              >
                <AnalystPortrait mood="neutral" size={36} blink={false} />
              </button>
            )
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
