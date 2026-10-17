import { useEffect, useRef, useState } from 'react';
import { GameIcon, GCard, GMeter, GModeSwitch, GRange, GStepper } from '../../../art';
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
import { useStage } from '../stage/context';
import { ShortList, Verdict } from '../stage/Verdict';

type Mode = 'buy' | 'sell';
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
  const stage = useStage();
  // No palco, o Mercado tem dois modos (pedido do usuário): Comprar aqui | Vender minha Carga.
  const cargoUnits = a.cargo.reduce((x, l) => x + l.qty, 0);
  const sellableHere = a.cargo.some((l) => (rows.find((r) => r.itemId === l.itemId)?.sell ?? 0) > 0);
  const [mode, setMode] = useState<Mode>(sellableHere && here ? 'sell' : 'buy');
  const buyRows = stage ? rows.filter((r) => r.buy > 0) : rows;
  const buyOpps = stage ? opps.filter((o) => o.kind === 'buy-here') : opps;
  counts.opps = buyOpps.length;
  for (const r of buyRows) counts[r.segment]++;
  const segs = SEGMENTS.filter((g) => g.id === 'opps' || counts[g.id] > 0);

  const [seg, setSeg] = useState<Segment>('opps');
  const [open, setOpen] = useState<string | null>(null);
  // Ao trocar de país, volta para Oportunidades e fecha o detalhe.
  useEffect(() => {
    setSeg('opps');
    setOpen(null);
    setMode(sellableHere && here ? 'sell' : 'buy');
  }, [countryId]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // No palco (ADR 0006) o item abre o modal de compra e venda; fora dele (protótipo), expande na lista.
  const focusItem = (itemId: string) => {
    const r = rows.find((x) => x.itemId === itemId);
    if (!r) return;
    if (stage) return stage.push({ kind: 'item', countryId, itemId, side: 'buy' });
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
        {!stage && <p className="mkt-guide">{t('game.market.guide')}</p>}
        <div className="mkt-cap" aria-label={t('game.market.cap.aria', { used: fmt.tons(used), max: fmt.tons(max) })}>
          <span className="mkt-cap-k">
            <Help term="cargo">{t('game.market.cap.label')}</Help>
          </span>
          <span className="mkt-cap-meter" aria-hidden>
            <GMeter value={max ? Math.min(used, max) : 1} max={max || 1} tone={used / (max || 1) > 0.9 ? 'action' : 'neutral'} thin />
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
          {stage && (
            <GModeSwitch
              className="mkt-mode"
              label={t('game.market.title')}
              options={[
                { value: 'buy' as Mode, label: t('game.market.opp.buy'), tone: 'action' },
                { value: 'sell' as Mode, label: cargoUnits ? `${t('game.market.opp.sell')} · ${cargoUnits}` : t('game.market.opp.sell'), tone: 'action' },
              ]}
              value={mode}
              onChange={setMode}
            />
          )}
          {stage && mode === 'sell' ? (
            <SellList countryId={countryId} onBuy={() => setMode('buy')} />
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
          {!stage && <p className="mkt-seg-hint">{t(meta.hintKey)}</p>}

          {active === 'opps' && <OppList opps={buyOpps} countryId={countryId} onFocus={focusItem} hasStations={a.stations.length > 0} />}

          {active === 'hire' && <HireList countryId={countryId} />}

          {active !== 'opps' && active !== 'hire' && (
            <ul className="mkt-rows" data-tour="market">
              <ShortList
                inList
                key={active}
                max={stage ? 5 : 99}
                items={buyRows.filter((r) => r.segment === active)}
                render={(r) => (
                  <MarketItem
                    key={r.itemId}
                    row={r}
                    countryId={countryId}
                    open={!stage && open === r.itemId}
                    onToggle={() => (stage ? focusItem(r.itemId) : setOpen(open === r.itemId ? null : r.itemId))}
                  />
                )}
              />
            </ul>
          )}
          </>
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
  const staged = !!useStage();

  if (!opps.length)
    return (
      <div className="mkt-empty">
        <GameIcon id="forecast" size={28} accent="cold" />
        <p>{hasStations ? t('game.market.opps.emptyWithStations') : t('game.market.opps.emptyNoStations')}</p>
      </div>
    );

  // "Melhores para você agora" (docs/UX-RULES.md, regra 5): primeiro o que cabe no avião e no caixa;
  // o resto fica atrás de "Mais", com o motivo. Se nada for viável, o veredito diz por quê.
  const viable = opps.filter((o) => !o.block);
  const ordered = [...viable, ...opps.filter((o) => o.block)];
  const firstBlocked = opps.find((o) => o.block);
  const used = usedCargo(a);
  const cap = maxCargo(a);
  return (
    <>
    {staged && !viable.length && firstBlocked && (
      <Verdict tone="warn">
        <b>{shortName(firstBlocked.itemId)}</b>: {blockText(t, firstBlocked.block!)} · {t('game.market.cap.label')}{' '}
        {t('game.market.cap.value', { used: fmt.tons(used), max: fmt.tons(cap) })}
      </Verdict>
    )}
    <ul className="opps-list">
      <ShortList inList max={staged ? Math.min(3, viable.length) : 99} items={staged ? ordered : opps} render={(o) => {
        const item = shortName(o.itemId);
        const travelBlocked = !directorAt(a, a.location) || o.to === a.location;
        return (
          <li key={`${o.kind}-${o.itemId}-${o.to}`} className={`opp kind-${o.kind}${o.block ? ' blocked' : ''}`}>
            <GCard
              icon={<GameIcon id={o.itemId} size={28} accent="warm" />}
              tone={o.block ? 'off' : o.kind !== 'buy-here' ? 'hot' : 'default'}
              title={
                <span className="opp-item">
                  {item}
                  {o.kind !== 'buy-here' && <span className="opp-tag">{t('game.market.opp.inCargoTag')}</span>}
                </span>
              }
              meta={
                <span className="opp-route">
                  {o.kind === 'buy-here' ? t('game.market.opp.buyHereLabel') : t('game.market.opp.youPaid')}{' '}
                  <span className="num">{fmt.money(o.buyEach)}</span>
                  <span aria-hidden> → </span>
                  <span className="sr-only"> {t('game.market.opp.and')} </span>
                  {o.kind === 'sell-here' ? t('game.market.opp.herePays') : t('game.market.opp.countryPays', { country: name(o.to) })}{' '}
                  <span className="num">{fmt.money(o.sellEach)}</span>
                </span>
              }
              seal={pctTxt(fmt, o.pct)}
              sealTone={o.block ? 'action' : 'ok'}
              actions={
                <>
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
                </>
              }
            >
              <span className="opp-meta mono">
                {o.qty > 0 && (
                  <>
                    {o.kind === 'buy-here' ? t('game.market.opp.fitsN', { n: o.qty }) : t('game.market.opp.units', { n: o.qty })} ={' '}
                    <span className="pos num">{signed(fmt, o.profit)}</span>
                  </>
                )}
                {o.hours > 0 && `${o.qty > 0 ? ' · ' : ''}${t('game.market.opp.flight', { time: formatDuration(o.hours) })}`}
                {!o.live && ` · ${t('game.market.opp.stale')}`}
                {o.block && <span className="neg"> · {blockText(t, o.block)}</span>}
              </span>
            </GCard>
          </li>
        );
      }} />
    </ul>
    </>
  );
}

// Nome curto do item: sem o "(cx. 100)" que já aparece no detalhe.
const shortName = (itemId: string) => itemName(itemId).replace(/\s*\(.*\)$/, '');

/** Barato/caro frente à média: quem compra quer abaixo; se o país só compra o item, acima é bom para vender. */
export function dealOf(r: MarketRow, t: I18n['t']) {
  const sellSide = !r.buy && r.sell > 0;
  const pctAbs = Math.round(Math.abs(r.dealPct) * 100);
  const good = r.deal === 'fair' ? null : sellSide ? r.deal === 'pricey' : r.deal === 'cheap';
  const text =
    r.deal === 'fair'
      ? t('game.market.deal.fair')
      : r.deal === 'cheap'
        ? t('game.market.deal.below', { pct: pctAbs })
        : t('game.market.deal.above', { pct: pctAbs });
  return { good, text };
}

function MarketItem({ row, countryId, open, onToggle }: { row: MarketRow; countryId: string; open: boolean; onToggle: () => void }) {
  const r = row;
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const here = directorAt(a, countryId);
  const staged = !!useStage();
  const { good, text: dealText } = dealOf(r, t);
  return (
    <li className={`mkt-item${open ? ' open' : ''}${r.it.wmd ? ' wmd' : ''}${r.owned ? ' owned' : ''}`}>
      <button
        className={`mkt-row g-card${r.owned ? ' g-card--hot' : ''}${r.it.wmd ? ' g-card--danger' : ''}${!r.buy && !r.sell ? ' g-card--off' : ''}`}
        aria-expanded={staged ? undefined : open}
        aria-haspopup={staged ? 'dialog' : undefined}
        onClick={onToggle}
      >
        <span className="g-well">
          <GameIcon id={r.itemId} size={28} accent={r.it.wmd ? 'signal' : 'warm'} />
        </span>
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
          {!staged && (
            <span className="mkt-p">
              <span className="k">{t('game.market.youGet')}</span>
              <span className="v num">{r.sell ? fmt.money(r.sell) : t('game.market.notBought')}</span>
            </span>
          )}
        </span>
        {!staged && r.owned > 0 && (
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

function TradeBox({ row, countryId, info = true }: { row: MarketRow; countryId: string; info?: boolean }) {
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
  const used = usedCargo(a);
  const max = maxCargo(a);
  const sellQty = Math.min(q, r.owned);
  /** Caixa (e espaço no avião) antes → depois da operação. */
  const after = (cashDelta: number, tonsDelta: number) => (
    <span className="mkt-after mono">
      {t('game.topbar.cash')} <span className="num">{fmt.money(a.cash)}</span> → <span className="num">{fmt.money(a.cash + cashDelta)}</span>
      {' · '}
      {t('game.market.cap.label')} <span className="num">{fmt.tons(used)}</span> →{' '}
      <span className={`num${used + tonsDelta > max ? ' neg' : ''}`}>{fmt.tons(Math.max(0, used + tonsDelta))}</span>
    </span>
  );

  return (
    <div className="mkt-trade">
      <div className="mkt-qty">
        <label className="mono" htmlFor={`q-${r.itemId}`}>
          {t('game.market.trade.quantity')}
        </label>
        <div className="mkt-stepper">
          <GStepper
            value={q}
            min={1}
            max={limit}
            onChange={setQty}
            decLabel={t('game.market.trade.less')}
            incLabel={t('game.market.trade.more')}
          />
          <GRange
            id={`q-${r.itemId}`}
            min={1}
            max={limit}
            value={q}
            onChange={setQty}
            aria-valuetext={t('game.market.trade.valueText', { n: q })}
          />
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
            {!info && !buyBlock && after(-buyQ.total, r.it.weight * q)}
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
            {!info && !sellBlock && after(sellQ.total, -r.it.weight * sellQty)}
          </div>
        ) : (
          <p className="mkt-why">
            {r.sell ? t('game.market.trade.noCargoHint', { price: fmt.money(r.sell) }) : t('game.market.trade.sellElsewhere')}
          </p>
        )}
      </div>
      {info && <PriceRange itemId={r.itemId} countryId={countryId} />}
      {info && <p className="mkt-blurb">{itemBlurb(r.itemId)}</p>}
    </div>
  );
}

/** Onde o item está mais barato e onde pagam mais, entre os preços que o jogador conhece. */
export function PriceRange({ itemId, countryId }: { itemId: string; countryId: string }) {
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
          <div className="mkt-row static g-card">
            <span className="g-well">
              <GameIcon id={r.itemId} size={28} accent="cold" />
            </span>
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

/** Modo Vender: só o que está na Carga — quanto recebe aqui, lucro por unidade e quem paga mais. */
function SellList({ countryId, onBuy }: { countryId: string; onBuy: () => void }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const stage = useStage();
  const rows = marketRows(s, a, countryId);
  const held = new Map<string, { qty: number; paid: number }>();
  for (const l of a.cargo) {
    const h = held.get(l.itemId) ?? { qty: 0, paid: 0 };
    h.paid = (h.paid * h.qty + l.paidEach * l.qty) / (h.qty + l.qty);
    h.qty += l.qty;
    held.set(l.itemId, h);
  }
  if (!held.size)
    return (
      <Verdict
        tone="neutral"
        action={
          <button className="btn primary" onClick={onBuy}>
            {t('game.market.opp.buy')}
          </button>
        }
      >
        {t('game.agency.cargo.empty')}
      </Verdict>
    );
  const items = [...held.entries()].map(([itemId, h]) => {
    const r = rows.find((x) => x.itemId === itemId);
    const sell = r?.sell ?? 0;
    const { best } = priceRange(s, a, itemId);
    const better = best && best.countryId !== countryId && best.sell > sell ? best : null;
    return { itemId, ...h, sell, pl: sell ? sell - h.paid : 0, better };
  });
  // Primeiro o que dá lucro vendendo aqui; depois o resto.
  items.sort((x, y) => (y.sell ? y.pl : -1e12) - (x.sell ? x.pl : -1e12));
  return (
    <ul className="mkt-rows mkt-sell">
      <ShortList
        inList
        max={5}
        items={items}
        render={(it) => (
          <li key={it.itemId} className="mkt-item">
            <button
              className={`mkt-row g-card${!it.sell ? ' g-card--off' : ''}`}
              aria-haspopup="dialog"
              onClick={() => stage?.push({ kind: 'item', countryId, itemId: it.itemId, side: 'sell' })}
            >
              <span className="g-well">
                <GameIcon id={it.itemId} size={28} accent="warm" />
              </span>
              <span className="mkt-name">
                <span className="mkt-name-t">{itemName(it.itemId)}</span>
                <span className="mkt-name-s">{t('game.market.owned', { n: it.qty })}</span>
                {it.sell > 0 && (
                  <span className={`mkt-pl num ${it.pl >= 0 ? 'pos' : 'neg'}`}>{t('game.market.plPerUnit', { pl: signed(fmt, Math.round(it.pl)) })}</span>
                )}
                {it.better && (
                  <span className="mkt-better">
                    {t('game.market.range.best')} {countryName(it.better.countryId)} <span className="num">{fmt.money(it.better.sell)}</span>
                  </span>
                )}
              </span>
              <span className="mkt-prices">
                <span className="mkt-p">
                  <span className="k">{t('game.market.youGet')}</span>
                  <span className="v num">{it.sell ? fmt.money(it.sell) : t('game.market.notBought')}</span>
                </span>
              </span>
            </button>
          </li>
        )}
      />
    </ul>
  );
}
