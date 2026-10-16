import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Radio, XCircle } from 'lucide-react';
import * as A from '../../game/actions';
import { formatClock, formatDate, formatDuration, player } from '../../game/state';
import type { Tone } from '../../game/types';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { countryName, presetTitle } from '../../i18n/lookup';

const TONE_ICON: Record<Tone, typeof Info> = {
  info: Info,
  good: CheckCircle2,
  bad: XCircle,
  warn: AlertTriangle,
  intel: Radio,
};

/** Evento: pausa o relógio até o jogador reconhecer. */
export function EventModal() {
  const { t } = useT();
  const s = useGame();
  const ack = useGameStore((st) => st.ackEvent);
  const select = useGameStore((st) => st.select);
  const btn = useRef<HTMLButtonElement>(null);
  const ev = s.events.find((e) => e.kind !== 'engage');
  useEffect(() => {
    btn.current?.focus();
  }, [ev?.id]);
  if (!ev || s.pendingCombat || s.combat) return null;
  const Icon = TONE_ICON[ev.tone];
  const more = s.events.filter((e) => e.kind !== 'engage').length - 1;
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
          {more > 0 && <span className="mono hint-sm">{t('game.overlay.queued', { n: more })}</span>}
          {ev.countryId && (
            <button
              className="btn"
              onClick={() => {
                select(ev.countryId!);
                ack(ev.id);
              }}
            >
              {t('game.overlay.viewOnMap')}
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
            {t('game.overlay.ack')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Diretor Detido ou Sequestrado: o que dá para fazer. */
export function DirectorBanner() {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const d = a.director;
  if (d.status !== 'detained' && d.status !== 'kidnapped') return null;
  const where = d.heldIn ? countryName(s.countries[d.heldIn].id) : '';
  return (
    <div className="director-banner">
      <XCircle size={18} />
      <span>
        <strong>{d.status === 'detained' ? t('game.overlay.banner.detained') : t('game.overlay.banner.kidnapped')}</strong> {t('game.overlay.banner.where', { where })}{' '}
        {d.status === 'detained' && d.releaseAt !== undefined && `${t('game.overlay.banner.releaseIn', { time: formatDuration(d.releaseAt - s.time) })} `}
        {t('game.overlay.banner.rescueHint')}
      </span>
      <button className="btn sm danger" disabled={a.cash < (d.price ?? 0)} onClick={() => act((g, ag) => A.payRelease(g, ag), 'buy')}>
        {d.status === 'detained' ? t('game.overlay.payBail', { price: fmt.money(d.price ?? 0) }) : t('game.overlay.payRansom', { price: fmt.money(d.price ?? 0) })}
      </button>
    </div>
  );
}

export function GameOver({ onQuit }: { onQuit: () => void }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  if (!s.over || s.events.length) return null;
  return (
    <div className="scrim">
      <div className={`event-card big tone-${s.over.won ? 'good' : 'bad'}`} role="dialog" aria-modal>
        <span className="event-stamp mono">{presetTitle(s.options.preset.id)}</span>
        <h2>{s.over.won ? t('game.overlay.over.won') : t('game.overlay.over.lost')}</h2>
        <p>{s.over.reason}</p>
        <div className="kv-grid mono">
          <span>{t('game.overlay.over.days')}</span>
          <b>{Math.floor(s.time / 24)}</b>
          <span>{t('game.overlay.over.score')}</span>
          <b>{fmt.num(s.over.score)}</b>
          <span>{t('game.overlay.over.combats')}</span>
          <b>
            {t('game.overlay.over.combatsValue', { won: a.stats.combatsWon, lost: a.stats.combatsLost })}
          </b>
          <span>{t('game.overlay.over.opsCoups')}</span>
          <b>
            {a.stats.operations} / {a.stats.coups}
          </b>
          <span>{t('game.overlay.over.contracts')}</span>
          <b>{a.stats.contractsDone}</b>
          <span>{t('game.overlay.over.bestProfit')}</span>
          <b>{fmt.money(a.stats.peakProfit)}</b>
        </div>
        <div className="event-actions">
          <button className="btn primary" onClick={onQuit}>
            {t('game.overlay.backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LogPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useT();
  const s = useGame();
  const select = useGameStore((st) => st.select);
  const list = s.log.slice(-60).reverse();
  return (
    <aside className={`log${open ? ' open' : ''}`}>
      <button className="log-head mono" onClick={onToggle}>
        {t('game.overlay.log')} {open ? '▾' : '▴'}
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
