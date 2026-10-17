import { useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, Radio, XCircle } from 'lucide-react';
import * as A from '../../game/actions';
import { formatClock, formatDate, formatDuration, player } from '../../game/state';
import type { Tone } from '../../game/types';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { countryName, presetTitle } from '../../i18n/lookup';
import { msgText } from './msgText';
import { useStage } from './stage/context';
import { focusCountryOnMap } from './WorldMap';
import { Verdict } from './stage/Verdict';
import { useCanStore } from './VaultPanel';
import { marketRows, opportunities, priceRange } from './market/model';
import { itemName } from '../../i18n/lookup';
import { GModal } from '../../art';
import { profitGoal } from '../../game/objective';

/** Tom do Evento → tom do modal de comando. */
const TONE_MODAL: Record<Tone, 'action' | 'good' | 'bad' | 'intel'> = { good: 'good', bad: 'bad', warn: 'action', info: 'intel', intel: 'intel' };

const TONE_ICON: Record<Tone, typeof Info> = {
  info: Info,
  good: CheckCircle2,
  bad: XCircle,
  warn: AlertTriangle,
  intel: Radio,
};

/** Evento: pausa o relógio até o jogador reconhecer. */
export function EventModal() {
  const { t, lang } = useT();
  const s = useGame();
  const ack = useGameStore((st) => st.ackEvent);
  const select = useGameStore((st) => st.select);
  const stage = useStage();
  const ev = s.events.find((e) => e.kind !== 'engage');
  const evId = ev?.id;
  const arrivalStore = useCanStore(ev?.countryId ?? '');
  // Estável entre renders: o GModal refaz o efeito (e o som de abrir) quando onClose muda.
  const onAck = useCallback(() => {
    if (!evId) return;
    audio.sfx('click');
    ack(evId);
  }, [evId, ack]);
  if (!ev || s.pendingCombat || s.combat) return null;
  const Icon = TONE_ICON[ev.tone];
  const arrival = ev.kind === 'arrival' && !!ev.countryId && !!stage;
  const canStore = arrivalStore;
  const more = s.events.filter((e) => e.kind !== 'engage').length - 1;
  return (
    <GModal
      key={ev.id}
      open
      onClose={onAck}
      closeLabel={t('common.close')}
      tone={TONE_MODAL[ev.tone]}
      kicker={`${formatDate(ev.at)} · ${formatClock(ev.at)}`}
      title={
        <>
          <Icon size={20} /> {msgText(ev.titleMsg, ev.title, lang)}
        </>
      }
      actions={
        arrival ? (
          <>
            {more > 0 && <span className="mono hint-sm ev-queued">{t('game.overlay.queued', { n: more })}</span>}
            <button className="btn ghost" onClick={onAck}>
              {t('game.overlay.ack')}
            </button>
            {canStore && (
              <button
                className="btn ghost"
                onClick={() => {
                  ack(ev.id);
                  stage?.open({ kind: 'country', id: ev.countryId!, tab: 'station' });
                }}
              >
                {t('game.vault.storeHere')}
              </button>
            )}
            <button
              className="btn primary"
              onClick={() => {
                // Chegada: o próximo passo é o Mercado (no modo Vender se a Carga vende aqui).
                audio.sfx('open');
                ack(ev.id);
                stage?.open({ kind: 'country', id: ev.countryId!, tab: 'market' });
              }}
            >
              {t('game.overlay.openMarket')}
            </button>
          </>
        ) : (
        <>
          {more > 0 && <span className="mono hint-sm ev-queued">{t('game.overlay.queued', { n: more })}</span>}
          {ev.countryId && (
            <button
              className="btn ghost"
              onClick={() => {
                // Leva ao mapa: fecha o modal do palco e centra o país.
                stage?.close();
                select(ev.countryId!);
                focusCountryOnMap(ev.countryId!);
                ack(ev.id);
              }}
            >
              {t('game.overlay.viewOnMap')}
            </button>
          )}
          <button className="btn primary" onClick={onAck}>
            {t('game.overlay.ack')}
          </button>
        </>
        )
      }
    >
      {/* Eventos são de uma ou duas frases: cartão compacto, não tela cheia (.ev-compact). */}
      <div className="ev-compact">{arrival ? <ArrivalVerdict countryId={ev.countryId!} /> : <p>{msgText(ev.bodyMsg, ev.body, lang)}</p>}</div>
    </GModal>
  );
}

/**
 * Chegada: o que fazer com o mercado daqui, numa linha (docs/UX-RULES.md).
 * Carga que vende com lucro > Carga que dá prejuízo (e quem paga mais) > o melhor negócio de compra.
 */
function ArrivalVerdict({ countryId }: { countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const rows = marketRows(s, a, countryId);
  const held = new Map<string, { qty: number; paid: number }>();
  for (const l of a.cargo) {
    const h = held.get(l.itemId) ?? { qty: 0, paid: 0 };
    h.paid = (h.paid * h.qty + l.paidEach * l.qty) / (h.qty + l.qty);
    h.qty += l.qty;
    held.set(l.itemId, h);
  }
  const sell = [...held.entries()]
    .map(([itemId, h]) => ({ itemId, ...h, price: rows.find((r) => r.itemId === itemId)?.sell ?? 0 }))
    .filter((x) => x.price > 0)
    .map((x) => ({ ...x, pl: x.price - x.paid }))
    .sort((x, y) => y.pl - x.pl)[0];
  const signed = (n: number) => `${n > 0 ? '+' : ''}${fmt.money(Math.round(n))}`;
  if (sell) {
    const { best } = priceRange(s, a, sell.itemId);
    const better = best && best.countryId !== countryId && best.sell > sell.price ? best : null;
    return (
      <Verdict tone={sell.pl >= 0 ? 'good' : 'bad'}>
        {t('game.qtyItem', { qty: sell.qty, item: itemName(sell.itemId) })} · {t('game.market.opp.herePays')} <b className="num">{fmt.money(sell.price)}</b> (
        {t('game.market.plPerUnit', { pl: signed(sell.pl) })})
        {sell.pl < 0 && better && (
          <>
            {' · '}
            {t('game.market.range.best')} {countryName(better.countryId)} <span className="num">{fmt.money(better.sell)}</span>
          </>
        )}
      </Verdict>
    );
  }
  const buy = opportunities(s, a, countryId).find((o) => o.kind === 'buy-here' && !o.block);
  if (buy)
    return (
      <Verdict tone="good">
        <b>{itemName(buy.itemId)}</b> {t('game.market.opp.buyHere.b', { country: countryName(buy.to) })} · <b className="num">{signed(buy.profit)}</b>
      </Verdict>
    );
  return <Verdict tone="neutral">{t('game.market.guide')}</Verdict>;
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
  const { t, fmt, lang } = useT();
  const s = useGame();
  const a = player(s);
  if (!s.over || s.events.length) return null;
  return (
    <GModal
      open
      width={560}
      tone={s.over.won ? 'good' : 'bad'}
      kicker={presetTitle(s.options.preset.id)}
      title={s.over.won ? t('game.overlay.over.won') : t('game.overlay.over.lost')}
      actions={
        <button className="btn primary" onClick={onQuit}>
          {t('game.overlay.backToMenu')}
        </button>
      }
    >
      <p>{msgText(s.over.reasonMsg, s.over.reason, lang)}</p>
      <div className="kv-grid mono">
        <span>{t('game.overlay.over.days')}</span>
        <b>{Math.floor(s.time / 24)}</b>
        <span>{t('game.overlay.over.score')}</span>
        <b>{fmt.num(s.over.score)}</b>
        <span>{t('game.overlay.over.combats')}</span>
        <b>{t('game.overlay.over.combatsValue', { won: a.stats.combatsWon, lost: a.stats.combatsLost })}</b>
        <span>{t('game.overlay.over.opsCoups')}</span>
        <b>
          {a.stats.operations} / {a.stats.coups}
        </b>
        <span>{t('game.overlay.over.contracts')}</span>
        <b>{a.stats.contractsDone}</b>
        <span>{t('game.overlay.over.bestProfit')}</span>
        <b>{fmt.money(a.stats.peakProfit)}</b>
        {s.options.preset.objective === 'profit' && profitGoal(s) > 1 && (
          <>
            <span>{t('game.overlay.over.profitGoal')}</span>
            <b>{fmt.money(profitGoal(s))}</b>
          </>
        )}
      </div>
    </GModal>
  );
}

export function LogPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t, lang } = useT();
  const s = useGame();
  const select = useGameStore((st) => st.select);
  const list = s.log.slice(-60).reverse();
  return (
    <aside className={`log${open ? ' open' : ''}`}>
      <button className="log-head g-telex g-telex--dark" aria-expanded={open} onClick={onToggle}>
        <span className="g-telex__k">
          {t('game.overlay.log')} {open ? '▾' : '▴'}
        </span>
        {!open && (
          // Nunca vazio: a última linha do Relatório, ou a data e a hora enquanto nada aconteceu.
          <span className="g-telex__t log-peek">{list[0] ? msgText(list[0].msg, list[0].text, lang) : `${formatDate(s.time)} · ${formatClock(s.time)}`}</span>
        )}
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
                  {msgText(l.msg, l.text, lang)}
                </button>
              ) : (
                <span>{msgText(l.msg, l.text, lang)}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
