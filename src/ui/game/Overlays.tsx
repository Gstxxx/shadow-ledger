import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Radio, XCircle } from 'lucide-react';
import * as A from '../../game/actions';
import { formatClock, formatDate, formatDuration, player } from '../../game/state';
import type { Tone } from '../../game/types';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { money } from '../fmt';

const TONE_ICON: Record<Tone, typeof Info> = {
  info: Info,
  good: CheckCircle2,
  bad: XCircle,
  warn: AlertTriangle,
  intel: Radio,
};

/** Evento: pausa o relógio até o jogador reconhecer. */
export function EventModal() {
  const s = useGame();
  const ack = useGameStore((st) => st.ackEvent);
  const select = useGameStore((st) => st.select);
  const btn = useRef<HTMLButtonElement>(null);
  const ev = s.events.find((e) => e.kind !== 'combat');
  useEffect(() => {
    btn.current?.focus();
  }, [ev?.id]);
  if (!ev || s.pendingCombat || s.combat) return null;
  const Icon = TONE_ICON[ev.tone];
  const more = s.events.filter((e) => e.kind !== 'combat').length - 1;
  return (
    <div className="scrim">
      <div className={`event-card tone-${ev.tone}`} role="dialog" aria-modal aria-labelledby="ev-title" key={ev.id}>
        <span className="event-stamp mono">
          {formatDate(ev.at)} · {formatClock(ev.at)}
        </span>
        <h2 id="ev-title">
          <Icon size={20} /> {ev.title}
        </h2>
        <p>{ev.body}</p>
        <div className="event-actions">
          {more > 0 && <span className="mono hint-sm">+{more} na fila</span>}
          {ev.countryId && (
            <button
              className="btn"
              onClick={() => {
                select(ev.countryId!);
                ack(ev.id);
              }}
            >
              Ver no mapa
            </button>
          )}
          <button
            ref={btn}
            className="btn primary"
            onClick={() => {
              audio.sfx('click');
              ack(ev.id);
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

/** Diretor Detido ou Sequestrado: o que dá para fazer. */
export function DirectorBanner() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const d = a.director;
  if (d.status !== 'detained' && d.status !== 'kidnapped') return null;
  const where = d.heldIn ? s.countries[d.heldIn].name : '';
  return (
    <div className="director-banner">
      <XCircle size={18} />
      <span>
        <strong>Diretor {d.status === 'detained' ? 'Detido' : 'Sequestrado'}</strong> em {where}.{' '}
        {d.status === 'detained' && d.releaseAt !== undefined && `Soltura em ${formatDuration(d.releaseAt - s.time)}. `}
        Uma Equipe no país pode tentar o resgate.
      </span>
      <button className="btn sm danger" disabled={a.cash < (d.price ?? 0)} onClick={() => act((g, ag) => A.payRelease(g, ag), 'buy')}>
        {d.status === 'detained' ? 'Pagar fiança' : 'Pagar resgate'} {money(d.price ?? 0)}
      </button>
    </div>
  );
}

export function GameOver({ onQuit }: { onQuit: () => void }) {
  const s = useGame();
  const a = player(s);
  if (!s.over || s.events.length) return null;
  return (
    <div className="scrim">
      <div className={`event-card big tone-${s.over.won ? 'good' : 'bad'}`} role="dialog" aria-modal>
        <span className="event-stamp mono">{s.options.preset.title}</span>
        <h2>{s.over.won ? 'Objetivo cumprido' : 'Fim de operação'}</h2>
        <p>{s.over.reason}</p>
        <div className="kv-grid mono">
          <span>Dias</span>
          <b>{Math.floor(s.time / 24)}</b>
          <span>Pontuação</span>
          <b>{s.over.score.toLocaleString('pt-BR')}</b>
          <span>Combates</span>
          <b>
            {a.stats.combatsWon} vencidos · {a.stats.combatsLost} perdidos
          </b>
          <span>Operações / Golpes</span>
          <b>
            {a.stats.operations} / {a.stats.coups}
          </b>
          <span>Contratos</span>
          <b>{a.stats.contractsDone}</b>
          <span>Melhor lucro</span>
          <b>{money(a.stats.peakProfit)}</b>
        </div>
        <div className="event-actions">
          <button className="btn primary" onClick={onQuit}>
            Voltar ao menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function LogPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const s = useGame();
  const select = useGameStore((st) => st.select);
  const list = s.log.slice(-60).reverse();
  return (
    <aside className={`log${open ? ' open' : ''}`}>
      <button className="log-head mono" onClick={onToggle}>
        Relatório {open ? '▾' : '▴'}
        {!open && list[0] && <span className="log-peek">{list[0].text}</span>}
      </button>
      {open && (
        <ol className="log-list">
          {list.map((l, i) => (
            <li key={`${l.at}-${i}`} className={`tone-${l.tone}`}>
              <span className="mono log-t">
                {formatDate(l.at)} {formatClock(l.at)}
              </span>
              {l.countryId ? (
                <button className="link" onClick={() => select(l.countryId!)}>
                  {l.text}
                </button>
              ) : (
                <span>{l.text}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
