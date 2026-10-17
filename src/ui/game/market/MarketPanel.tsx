import { useEffect, useRef, useState } from 'react';
import { GameIcon } from '../../../art';
import * as A from '../../../game/actions';
import { maxCargo, quoteBuy, quoteSell, usedCargo } from '../../../game/market';
import { directorAt, formatDuration, intelCountries, player, standing } from '../../../game/state';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import type { I18n } from '../../../i18n';
import { classLabel, countryName, itemBlurb, itemName } from '../../../i18n/lookup';
import { Help } from '../help/Glossary';
import {
  SEGMENTS,
  marketRows,
  maxAffordable,
  opportunities,
  priceRange,
  recruitRows,
  saturationAfter,
  sellUntilBreakEven,
  whyCantBuy,
  whyCantSell,
} from './model';
import type { BlockMsg, MarketRow, Opportunity, Segment } from './model';
import './market.css';

type Fmt = I18n['fmt'];
const signed = (fmt: Fmt, n: number) => (n > 0 ? `+${fmt.money(n)}` : fmt.money(n));
const pctTxt = (fmt: Fmt, v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt.pct(Math.abs(v))}`;
/** Motivo de bloqueio do model: chave traduzida, ou texto que ainda não tem chave. */
const blockText = (t: I18n['t'], b: BlockMsg) => t(b.key, b.params);

/**
 * Mercado de um país, redesenhado para quem joga pela primeira vez: frase-guia, segmentos por categoria,
 * Oportunidades primeiro e linhas com "Você paga / Você recebe".
 */
export function MarketPanel({ countryId }: { countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const here = directorAt(a, countryId);
  const live = intelCountries(a).has(countryId);
  const seen = standing(a, countryId).seen;

  const rows = marketRows(s, a, countryId);
  const opps = opportunities(s, a, countryId);
  const recruits = here ? recruitRows(s, a, countryId) : [];

  const counts: Record<Segment, number> = {
    opps: opps.length,
    arms: 0,
    vehicles: 0,
    air: 0,
    intel: 0,
    people: 0,
    hire: recruits.length,
  };
  for (const r of rows) counts[r.segment]++;
  const segs = SEGMENTS.filter((g) => g.id === 'opps' || counts[g.id] > 0);

  const [seg, setSeg] = useState<Segment>('opps');
  const [open, setOpen] = useState<string | null>(null);
  // Ao trocar de país, volta para Oportunidades e fecha o detalhe.
  useEffect(() => {
    setSeg('opps');
    setOpen(null);
  }, [countryId]);
  const active = segs.some((g) => g.id === seg) ? seg : 'opps';
  // Esmaece a borda das abas quando há mais para rolar (o "Veículos" cortado não parecia rolável).
  const segsRef = useRef<HTMLDivElement>(null);
  const [segFade, setSegFade] = useState('');
  const updateSegFade = () => {
    const el = segsRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setSegFade(`${left ? ' fade-l' : ''}${right ? ' fade-r' : ''}`);
  };
  useEffect(() => {
    updateSegFade();
    window.addEventListener('resize', updateSegFade);
    return () => window.removeEventListener('resize', updateSegFade);
  }, [segs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const meta = SEGMENTS.find((g) => g.id === active)!;

  const used = usedCargo(a);
  const max = maxCargo(a);

  const focusItem = (itemId: string) => {
    const r = rows.find((x) => x.itemId === itemId);
    if (!r) return;
    setSeg(r.segment);
    setOpen(itemId);
  };

  return (
    <section className="mkt" aria-label={t('game.market.aria', { name: countryName(countryId) })}>
      <header className="mkt-head">
        <div className="mkt-title">
          <h3>{t('game.market.title')}</h3>
          <span className={`mkt-live mono${live ? ' on g-chip g-chip--live' : ''}`}>
            {live
              ? t('game.market.live')
              : seen
                ? t('game.market.seenAgo', { time: formatDuration(s.time - seen.at) })
                : t('game.market.unknown')}
          </span>
        </div>
        <p className="mkt-guide">{t('game.market.guide')}</p>
        <div className="mkt-cap" aria-label={t('game.market.cap.aria', { used: fmt.tons(used), max: fmt.tons(max) })}>
          <span className="mkt-cap-k">
            <Help term="cargo">{t('game.market.cap.label')}</Help>
          </span>
          <span className="mkt-cap-bar" aria-hidden>
            <span
              style={{
                width: `${max ? Math.min(100, (used / max) * 100) : 100}%`,
              }}
              className={used / (max || 1) > 0.9 ? 'full' : ''}
            />
          </span>
          <span className="mkt-cap-v num">{t('game.market.cap.value', { used: fmt.tons(used), max: fmt.tons(max) })}</span>
        </div>
      </header>

      {!live && !seen ? (
        <div className="mkt-empty">
          <GameIcon id="station-cell" size={28} accent="cold" />
          <p>
            {t('game.market.noPrices.pre', { name: countryName(countryId) })}
            <b>{t('game.market.noPrices.fly')}</b>
            {t('game.market.noPrices.mid')}
            <b>{t('game.market.noPrices.open')}</b>
            {t('game.market.noPrices.post')}
          </p>
        </div>
      ) : (
        <>
          <div className={`mkt-segs g-tabs${segFade}`} ref={segsRef} onScroll={updateSegFade} role="tablist" aria-label={t('game.market.segmentsAria')}>
            {segs.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={active === g.id}
                className={`mkt-seg g-tab${g.id === 'hire' ? ' hire' : ''}`}
                onClick={() => {
                  setSeg(g.id);
                  setOpen(null);
                }}
              >
                <GameIcon id={g.icon} size={18} accent={active === g.id ? 'warm' : 'none'} />
                <span>{t(g.labelKey)}</span>
                {counts[g.id] > 0 && <span className="mkt-count g-badge">{counts[g.id]}</span>}
              </button>
            ))}
          </div>
          <p className="mkt-seg-hint">{t(meta.hintKey)}</p>

          {active === 'opps' && <OppList opps={opps} countryId={countryId} onFocus={focusItem} hasStations={a.stations.length > 0} />}

          {active === 'hire' && <HireList countryId={countryId} />}

          {active !== 'opps' && active !== 'hire' && (
            <ul className="mkt-rows" data-tour="market">
              {rows
                .filter((r) => r.segment === active)
                .map((r) => (
                  <MarketItem
                    key={r.itemId}
                    row={r}
                    countryId={countryId}
                    open={open === r.itemId}
                    onToggle={() => setOpen(open === r.itemId ? null : r.itemId)}
                  />
                ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function OppList({
  opps,
  countryId,
  onFocus,
  hasStations,
}: {
  opps: Opportunity[];
  countryId: string;
  onFocus: (itemId: string) => void;
  hasStations: boolean;
}) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const select = useGameStore((st) => st.select);
  const here = directorAt(a, countryId);
  const name = (id: string) => (s.countries[id] ? countryName(id) : '?');

  if (!opps.length)
    return (
      <div className="mkt-empty">
        <GameIcon id="forecast" size={28} accent="cold" />
        <p>{hasStations ? t('game.market.opps.emptyWithStations') : t('game.market.opps.emptyNoStations')}</p>
      </div>
    );

  return (
    <ul className="opps-list">
      {opps.map((o) => {
        const item = shortName(o.itemId);
        const travelBlocked = !directorAt(a, a.location) || o.to === a.location;
        return (
          <li key={`${o.kind}-${o.itemId}-${o.to}`} className={`opp kind-${o.kind}${o.block ? ' blocked' : ''}`}>
            <GameIcon id={o.itemId} size={28} accent="warm" />
            <div className="opp-body">
              <span className="opp-item">
                {item}
                {o.kind !== 'buy-here' && <span className="opp-tag">{t('game.market.opp.inCargoTag')}</span>}
              </span>
              <span className="opp-route">
                {o.kind === 'buy-here' ? t('game.market.opp.buyHereLabel') : t('game.market.opp.youPaid')}{' '}
                <span className="num">{fmt.money(o.buyEach)}</span>
                <span aria-hidden> → </span>
                <span className="sr-only"> {t('game.market.opp.and')} </span>
                {o.kind === 'sell-here' ? t('game.market.opp.herePays') : t('game.market.opp.countryPays', { country: name(o.to) })}{' '}
                <span className="num">{fmt.money(o.sellEach)}</span>
              </span>
              <span className="opp-meta mono">
                <span className="pos num">{t('game.market.plPerUnit', { pl: pctTxt(fmt, o.pct) })}</span>
                {o.qty > 0 && (
                  <>
                    {' · '}
                    {o.kind === 'buy-here' ? t('game.market.opp.fitsN', { n: o.qty }) : t('game.market.opp.units', { n: o.qty })} ={' '}
                    <span className="pos num">{signed(fmt, o.profit)}</span>
                  </>
                )}
                {o.hours > 0 && ` · ${t('game.market.opp.flight', { time: formatDuration(o.hours) })}`}
                {!o.live && ` · ${t('game.market.opp.stale')}`}
                {o.block && <span className="neg"> · {blockText(t, o.block)}</span>}
              </span>
            </div>
            <div className="opp-actions">
              {o.kind !== 'sell-there' ? (
                <button className={`btn sm${o.block ? '' : ' primary'}`} disabled={!here || !!o.block} onClick={() => onFocus(o.itemId)}>
                  {o.kind === 'buy-here' ? t('game.market.opp.buy') : t('game.market.opp.sell')}
                </button>
              ) : (
                <button
                  className="btn sm primary"
                  data-tour="fly"
                  disabled={travelBlocked}
                  onClick={() => act((g, ag) => A.travel(g, ag, o.to), 'depart')}
                >
                  {t('game.market.opp.fly')}
                </button>
              )}
              <button className="btn sm ghost" onClick={() => select(o.to)}>
                {t('game.market.opp.view', { country: name(o.to) })}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Nome curto do item: sem o "(cx. 100)" que já aparece no detalhe.
const shortName = (itemId: string) => itemName(itemId).replace(/\s*\(.*\)$/, '');

function MarketItem({ row, countryId, open, onToggle }: { row: MarketRow; countryId: string; open: boolean; onToggle: () => void }) {
  const r = row;
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const here = directorAt(a, countryId);
  // Quem compra aqui quer preço abaixo da média; se o país só compra o item, acima da média é bom para vender.
  const sellSide = !r.buy && r.sell > 0;
  const pctAbs = Math.round(Math.abs(r.dealPct) * 100);
  const good = r.deal === 'fair' ? null : sellSide ? r.deal === 'pricey' : r.deal === 'cheap';
  const dealText =
    r.deal === 'fair'
      ? t('game.market.deal.fair')
      : r.deal === 'cheap'
        ? t('game.market.deal.below', { pct: pctAbs })
        : t('game.market.deal.above', { pct: pctAbs });
  return (
    <li className={`mkt-item${open ? ' open' : ''}${r.it.wmd ? ' wmd' : ''}${r.owned ? ' owned' : ''}`}>
      <button className="mkt-row" aria-expanded={open} onClick={onToggle}>
        <GameIcon id={r.itemId} size={28} accent={r.it.wmd ? 'signal' : 'warm'} />
        <span className="mkt-name">
          <span className="mkt-name-t">{itemName(r.itemId)}</span>
          <span className="mkt-name-s">
            {r.it.wmd ? t('game.market.wmd') : classLabel(r.it.cls)} · {t('game.market.perUnit', { weight: fmt.tons(r.it.weight) })}
          </span>
          {(r.buy > 0 || r.sell > 0) && (
            <span
              className={`mkt-deal ${good === null ? 'fair' : good ? 'good' : 'bad'}`}
              title={r.dealKnown ? t('game.market.deal.srcKnown') : t('game.market.deal.srcCatalog')}
            >
              {dealText}
              {!r.dealKnown && <span className="mkt-deal-src"> · {t('game.market.deal.fewData')}</span>}
            </span>
          )}
        </span>
        <span className="mkt-prices">
          <span className="mkt-p">
            <span className="k">{t('game.market.youPay')}</span>
            <span className="v num">{r.buy ? fmt.money(r.buy) : t('game.market.notSold')}</span>
          </span>
          <span className="mkt-p">
            <span className="k">{t('game.market.youGet')}</span>
            <span className="v num">{r.sell ? fmt.money(r.sell) : t('game.market.notBought')}</span>
          </span>
        </span>
        {r.owned > 0 && (
          <span className="mkt-own">
            <span className="num">{t('game.market.owned', { n: r.owned })}</span>
            {r.sell > 0 && (
              <span className={`${r.plEach >= 0 ? 'pos' : 'neg'}`}>{t('game.market.plSellingHere', { pl: signed(fmt, r.plEach) })}</span>
            )}
          </span>
        )}
      </button>
      {open &&
        (here ? (
          <TradeBox row={r} countryId={countryId} />
        ) : (
          <p className="mkt-away">{t('game.market.away', { country: countryName(countryId), blurb: itemBlurb(r.itemId) })}</p>
        ))}
    </li>
  );
}

function TradeBox({ row, countryId }: { row: MarketRow; countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const c = s.countries[countryId];
  const r = row;
  const canBuyMax = r.buy ? maxAffordable(s, a, c, r.itemId) : 0;
  const limit = Math.max(canBuyMax, r.owned, 1);
  const [qty, setQty] = useState(Math.max(1, Math.min(r.owned || canBuyMax || 1, limit)));
  const q = Math.min(qty, limit);
  useEffect(() => {
    if (qty > limit) setQty(limit);
  }, [limit, qty]);

  const buyBlock: BlockMsg | null = r.buy ? whyCantBuy(s, a, countryId, r.itemId, q) : { key: 'game.market.block.notSold' };
  const sellBlock: BlockMsg | null = r.sell ? whyCantSell(s, a, countryId, r.itemId, q) : { key: 'game.market.block.nobodyBuys' };
  const buyQ = quoteBuy(c, r.itemId, q);
  const sellQ = quoteSell(c, r.itemId, Math.min(q, r.owned || q));
  const sellPL = r.owned ? sellQ.total - r.paidEach * Math.min(q, r.owned) : 0;
  const breakEven = r.owned && r.sell ? sellUntilBreakEven(c, r.itemId, r.owned, r.paidEach) : 0;
  const satBuy = saturationAfter(c, r.itemId, q, 'buy');
  const satSell = saturationAfter(c, r.itemId, q, 'sell');

  return (
    <div className="mkt-trade">
      <div className="mkt-qty">
        <label className="mono" htmlFor={`q-${r.itemId}`}>
          {t('game.market.trade.quantity')}
        </label>
        <div className="mkt-stepper">
          <button
            className="btn sm icon"
            aria-label={t('game.market.trade.less')}
            disabled={q <= 1}
            onClick={() => setQty(Math.max(1, q - 1))}
          >
            −
          </button>
          <input
            id={`q-${r.itemId}`}
            type="range"
            min={1}
            max={limit}
            value={q}
            onChange={(e) => setQty(Number(e.target.value))}
            aria-valuetext={t('game.market.trade.valueText', { n: q })}
          />
          <button
            className="btn sm icon"
            aria-label={t('game.market.trade.more')}
            disabled={q >= limit}
            onClick={() => setQty(Math.min(limit, q + 1))}
          >
            +
          </button>
          <span className="mkt-q num" aria-live="polite">
            {q}
          </span>
        </div>
        <div className="mkt-quick">
          {canBuyMax > 0 && (
            <button className="btn sm ghost" onClick={() => setQty(canBuyMax)}>
              {t('game.market.trade.maxBuy', { n: canBuyMax })}
            </button>
          )}
          {r.owned > 0 && (
            <button className="btn sm ghost" onClick={() => setQty(r.owned)}>
              {t('game.market.trade.allCargo', { n: r.owned })}
            </button>
          )}
          {breakEven > 0 && breakEven < r.owned && (
            <button className="btn sm ghost" onClick={() => setQty(breakEven)}>
              {t('game.market.trade.breakEven', { n: breakEven })}
            </button>
          )}
        </div>
      </div>

      <div className="mkt-sides">
        {r.buy > 0 && (
          <div className="mkt-side">
            <button
              data-tour="buy"
              className={`btn${!buyBlock && r.owned === 0 ? ' primary' : ''}`}
              disabled={!!buyBlock}
              onClick={() => act((g, ag) => A.buy(g, ag, r.itemId, q), 'buy')}
            >
              {t('game.market.trade.buy', { q })} <span className="num">{fmt.money(buyQ.total)}</span>
            </button>
            <span className={`mkt-why${buyBlock ? ' bad' : ''}`}>
              {buyBlock
                ? blockText(t, buyBlock)
                : t('game.market.trade.buyNote', { weight: fmt.tons(r.it.weight * q), pct: pctTxt(fmt, satBuy) })}
            </span>
          </div>
        )}
        {r.owned > 0 ? (
          <div className="mkt-side">
            <button
              data-tour="sell"
              className={`btn ${!sellBlock && sellPL >= 0 ? 'primary' : ''}${!sellBlock && sellPL < 0 ? ' loss' : ''}`}
              disabled={!!sellBlock}
              onClick={() => act((g, ag) => A.sell(g, ag, r.itemId, q), 'sell')}
            >
              {t('game.market.trade.sell', { q })} <span className="num">{fmt.money(sellQ.total)}</span>
            </button>
            <span className={`mkt-why${sellBlock ? ' bad' : ''}`}>
              {sellBlock ? (
                blockText(t, sellBlock)
              ) : (
                <>
                  <span className={sellPL >= 0 ? 'pos' : 'neg'}>
                    {sellPL >= 0 ? t('game.market.trade.profit') : t('game.market.trade.loss')} {fmt.money(Math.abs(sellPL))}
                  </span>{' '}
                  {t('game.market.trade.sellNote', { pct: pctTxt(fmt, satSell) })} <Help term="saturation" />
                </>
              )}
            </span>
          </div>
        ) : (
          <p className="mkt-why">
            {r.sell ? t('game.market.trade.noCargoHint', { price: fmt.money(r.sell) }) : t('game.market.trade.sellElsewhere')}
          </p>
        )}
      </div>
      <PriceRange itemId={r.itemId} countryId={countryId} />
      <p className="mkt-blurb">{itemBlurb(r.itemId)}</p>
    </div>
  );
}

/** Onde o item está mais barato e onde pagam mais, entre os preços que o jogador conhece. */
function PriceRange({ itemId, countryId }: { itemId: string; countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const select = useGameStore((st) => st.select);
  const { cheapest, best, samples } = priceRange(s, a, itemId);
  const name = (id: string) => (id === countryId ? t('game.market.range.here', { country: countryName(id) }) : countryName(id));
  if (samples < 2) return <p className="mkt-range">{t('game.market.range.onlyHere')}</p>;
  return (
    <div className="mkt-range">
      {cheapest && (
        <span>
          {t('game.market.range.cheapest')}{' '}
          <button className="linkish" onClick={() => select(cheapest.countryId)}>
            {name(cheapest.countryId)}
          </button>{' '}
          <span className="num">{fmt.money(cheapest.buy)}</span>
        </span>
      )}
      {best && (
        <span>
          {t('game.market.range.best')}{' '}
          <button className="linkish" onClick={() => select(best.countryId)}>
            {name(best.countryId)}
          </button>{' '}
          <span className="num">{fmt.money(best.sell)}</span>
        </span>
      )}
      <span className="mkt-why">{t('game.market.range.samples', { n: samples })}</span>
    </div>
  );
}

function HireList({ countryId }: { countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const list = recruitRows(s, a, countryId);
  if (!list.length)
    return (
      <div className="mkt-empty">
        <p>{t('game.market.hire.none')}</p>
      </div>
    );
  return (
    <ul className="mkt-rows">
      {list.map((r) => (
        <li key={r.itemId} className="mkt-item hire">
          <div className="mkt-row static">
            <GameIcon id={r.itemId} size={28} accent="cold" />
            <span className="mkt-name">
              <span className="mkt-name-t">{itemName(r.itemId)}</span>
              <span className="mkt-name-s">
                {r.it.cls === 'cargo'
                  ? t('game.market.hire.freighter', { weight: r.it.weight, speed: r.it.speed ?? 0 })
                  : t('game.market.hire.escortClass', { class: classLabel(r.it.cls) })}
              </span>
            </span>
            <span className="mkt-hire">
              <button className="btn sm primary" disabled={!!r.block} onClick={() => act((g, ag) => A.recruit(g, ag, r.itemId), 'buy')}>
                {t('game.market.hire.btn')} <span className="num">{fmt.money(r.price)}</span>
              </button>
              <span className={`mkt-why${r.block ? ' bad' : ''}`}>{r.block ? blockText(t, r.block) : itemBlurb(r.itemId)}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
