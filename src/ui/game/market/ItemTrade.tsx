import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, PlaneTakeoff } from 'lucide-react';
import { GameIcon, GModeSwitch, GRange, GStepper } from '../../../art';
import * as A from '../../../game/actions';
import { maxCargo, quoteBuyFor, quoteSellFor, usedCargo } from '../../../game/market';
import { directorAt, player } from '../../../game/state';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import { classLabel, countryName, itemBlurb } from '../../../i18n/lookup';
import { Help } from '../help/Glossary';
import { marketRows, maxAffordable, priceRange, sellUntilBreakEven, whyCantBuy, whyCantSell } from './model';
import { PriceRange, dealOf } from './MarketPanel';
import { BigNumber, Details, Verdict } from '../stage/Verdict';
import { PriceChart } from './PriceChart';
import { ILLUSTRATED_IDS, ItemIllustration } from '../../item-illustrations';
import type { PriceMark } from './PriceChart';
import { priceHistory, worldAverageHistory } from '../../../game/history';
import { politicsLabel } from '../../../i18n/lookup';
import type { VerdictTone } from '../stage/Verdict';

type Side = 'buy' | 'sell';
type Tone = VerdictTone;

/**
 * Modal de compra e venda (ADR 0006, 2ª versão): abas Comprar | Vender, cada uma com UMA quantidade,
 * UM botão e UM número grande; o veredito no topo diz se é bom negócio e para onde voar.
 * O resto (preço da 1ª unidade, Saturação, faixa de preços, caixa e espaço) fica em "Ver detalhes".
 */
export function ItemTrade({ countryId, itemId, initialSide }: { countryId: string; itemId: string; initialSide?: Side }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const here = directorAt(a, countryId);
  const c = s.countries[countryId];
  const r = marketRows(s, a, countryId).find((x) => x.itemId === itemId);
  const [side, setSide] = useState<Side>(() => initialSide ?? (r && r.owned > 0 && r.sell > 0 ? 'sell' : 'buy'));
  const canBuyMax = r?.buy ? maxAffordable(s, a, c, itemId) : 0;
  const owned = r?.owned ?? 0;
  const limit = side === 'buy' ? Math.max(1, canBuyMax) : Math.max(1, owned);
  const [qBuy, setQBuy] = useState(Math.max(1, Math.min(canBuyMax || 1, 10)));
  const [qSell, setQSell] = useState(Math.max(1, owned));
  const q = Math.min(side === 'buy' ? qBuy : qSell, limit);
  const setQ = side === 'buy' ? setQBuy : setQSell;
  useEffect(() => {
    // Vender começa com tudo o que está na Carga (e acompanha compras e vendas).
    setQSell(Math.max(1, owned));
  }, [owned]);
  if (!r) return <p className="mkt-why">{t('game.market.unknown')}</p>;

  const { cheapest, best } = priceRange(s, a, itemId);
  // Histórico do preço aqui (só onde houve informação ao vivo) e os eventos que explicam os picos.
  const hist = priceHistory(s, countryId, itemId);
  const markText = (k: string) =>
    k === 'coup' ? t('game.country.couped') : k === 'playerBuy' ? t('game.market.opp.buy') : k === 'playerSell' ? t('game.market.opp.sell') : politicsLabel(k);
  const markKind = (k: string) =>
    k === 'war' || k === 'civilwar' || k === 'sanctions' || k === 'coup' ? 'war' : k === 'playerBuy' || k === 'playerSell' ? 'buy' : 'info';
  const marks: PriceMark[] = hist.flatMap((p) => (p.events ?? []).map((k) => ({ t: p.day * 24, kind: markKind(k), text: markText(k) })));
  const deal = dealOf(r, t);
  const used = usedCargo(a);
  const max = maxCargo(a);
  const money = (n: number) => fmt.money(Math.abs(n));
  const canFly = (to: string) => to !== a.location && a.director.status === 'free' && !a.flight && Number.isFinite(A.flightHours(a, to));
  const fly = (to: string) => (
    <button className="btn sm trade-fly" disabled={!canFly(to)} onClick={() => act((g, ag) => A.travel(g, ag, to), 'depart')}>
      <PlaneTakeoff size={15} /> {t('game.market.trade.flyTo', { country: countryName(to) })}
    </button>
  );
  const elsewhere = (k: typeof best) => !!k && k.countryId !== countryId;

  // ── Números da aba ──
  // Mesmas cotações que a compra e a venda usam (com a Origem da agência).
  const buyQ = quoteBuyFor(a, c, itemId, q);
  const sellQ = quoteSellFor(a, c, itemId, Math.min(q, Math.max(1, owned)));
  const nQ = side === 'buy' ? q : Math.min(q, Math.max(1, owned));
  const quote = (n: number) => (side === 'buy' ? quoteBuyFor(a, c, itemId, n) : quoteSellFor(a, c, itemId, n)).total;
  // Preço de cada unidade, na ordem: sobe a cada compra, cai a cada venda.
  const unitPrices = Array.from({ length: Math.min(nQ, 60) }, (_, i) => quote(i + 1) - (i ? quote(i) : 0));
  const first = unitPrices[0] ?? 0;
  const avg = nQ ? Math.round((side === 'buy' ? buyQ.total : sellQ.total) / nQ) : 0;
  const diff = Math.abs(avg - first);
  const total = side === 'buy' ? buyQ.total : sellQ.total;
  const pl = side === 'sell' && owned ? sellQ.total - r.paidEach * Math.min(q, owned) : 0;
  const block = side === 'buy' ? (r.buy ? whyCantBuy(s, a, countryId, itemId, q) : { key: 'game.market.block.notSold' as const }) : r.sell ? whyCantSell(s, a, countryId, itemId, q) : { key: 'game.market.block.nobodyBuys' as const };
  const breakEven = side === 'sell' && owned && r.sell ? sellUntilBreakEven(c, itemId, owned, r.paidEach) : 0;


  // ── Lucro no destino (Comprar): custo aqui (sobe a cada compra) contra a venda lá (cai a cada venda) ──
  // O lucro é côncavo em N: cresce enquanto a próxima unidade ainda dá lucro e depois só cai.
  const dest = side === 'buy' && here && r.buy > 0 && elsewhere(best) && best!.sell > 0 ? s.countries[best!.countryId] : undefined;
  const profitAt = (n: number) => (dest ? quoteSellFor(a, dest, itemId, n).total - quoteBuyFor(a, c, itemId, n).total : 0);
  let destPl = 0;
  let bestN = 0;
  let lossN = 0;
  if (dest) {
    destPl = profitAt(q);
    // Ótimo: a última unidade cujo lucro marginal ainda é positivo.
    let lo = 0;
    let hi = limit;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (profitAt(mid) - profitAt(mid - 1) > 0) lo = mid;
      else hi = mid - 1;
    }
    bestN = lo;
    // Prejuízo: a primeira quantidade depois do ótimo em que o lucro fica negativo.
    if (profitAt(limit) < 0) {
      let l = Math.max(1, bestN);
      let h = limit;
      while (l < h) {
        const mid = Math.floor((l + h) / 2);
        if (profitAt(mid) < 0) h = mid;
        else l = mid + 1;
      }
      lossN = l;
    }
  }
  const signed = (n: number, v: string) => `${n < 0 ? '−' : '+'}${v}`;

  // ── Veredito: uma frase com cor e ícone, e a ação que resolve ──
  let tone: Tone = 'neutral';
  let text: ReactNode;
  let action: ReactNode = null;
  if (!here) {
    tone = 'neutral';
    text = t('game.market.away', { country: countryName(countryId), blurb: '' });
    action = fly(countryId);
  } else if (side === 'sell') {
    if (!owned || !r.sell) {
      tone = 'warn';
      text = t(owned ? 'game.market.block.nobodyBuys' : 'game.market.block.noneInCargo');
      if (owned && elsewhere(best)) {
        text = (
          <>
            {text} {t('game.market.range.best')} <b>{countryName(best!.countryId)}</b> <span className="num">{fmt.money(best!.sell)}</span>
          </>
        );
        action = fly(best!.countryId);
      }
    } else if (block) {
      tone = 'warn';
      text = t(block.key, block.params);
    } else if (pl < 0) {
      tone = 'bad';
      text =
        elsewhere(best) && best!.sell > r.sell ? (
          t('game.market.trade.verdict.sellLoss', { loss: money(pl), country: countryName(best!.countryId), price: fmt.money(best!.sell) })
        ) : (
          <>
            {t('game.market.trade.loss')} <b className="num">{money(pl)}</b>
          </>
        );
      if (elsewhere(best) && best!.sell > r.sell) action = fly(best!.countryId);
    } else {
      tone = 'good';
      text = t('game.market.trade.verdict.sellProfit', { profit: money(pl) });
      if (elsewhere(best) && best!.sell > r.sell * 1.1) action = fly(best!.countryId);
    }
  } else {
    if (!r.buy) {
      tone = 'warn';
      text = t('game.market.block.notSold');
      if (elsewhere(cheapest)) {
        text = (
          <>
            {text} {t('game.market.range.cheapest')} <b>{countryName(cheapest!.countryId)}</b> <span className="num">{fmt.money(cheapest!.buy)}</span>
          </>
        );
        action = fly(cheapest!.countryId);
      }
    } else if (block) {
      tone = 'warn';
      text = t(block.key, block.params);
    } else if (r.deal === 'cheap') {
      // Barato aqui, mas com esta quantidade a venda no destino não paga a compra: aviso, não verde.
      tone = dest && destPl < 0 ? 'warn' : 'good';
      text =
        elsewhere(best) && best!.sell > r.buy
          ? t('game.market.trade.verdict.buyCheap', { pct: Math.round(Math.abs(r.dealPct) * 100), country: countryName(best!.countryId) })
          : deal.text;
    } else {
      tone = r.deal === 'pricey' ? 'warn' : 'neutral';
      text =
        elsewhere(cheapest) && cheapest!.buy < r.buy
          ? t('game.market.trade.verdict.buyExpensive', { country: countryName(cheapest!.countryId), price: fmt.money(cheapest!.buy) })
          : deal.text;
      if (elsewhere(cheapest) && cheapest!.buy < r.buy * 0.9) action = fly(cheapest!.countryId);
    }
  }
  const disabled = !here || !!block || (side === 'sell' && !owned);
  const tonsDelta = (side === 'buy' ? 1 : -1) * r.it.weight * (side === 'buy' ? q : Math.min(q, owned));
  const cashDelta = side === 'buy' ? -buyQ.total : sellQ.total;

  return (
    <div className="trade2">
      {/* Imagem herói do item (ilustração da menu-motion; o ícone do kit se o id não tiver ilustração). */}
      <div className="trade2-hero">
        {ILLUSTRATED_IDS.includes(itemId) ? (
          <ItemIllustration id={itemId} size="lg" className="trade2-illo" />
        ) : (
          <GameIcon id={itemId} size={112} accent={r.it.wmd ? 'signal' : 'warm'} />
        )}
      </div>
      <div className="trade2-id">
        <span className="mono trade2-sub">
          {r.it.wmd ? t('game.market.wmd') : classLabel(r.it.cls)} · {t('game.market.perUnit', { weight: fmt.tons(r.it.weight) })}
        </span>
        {owned > 0 && <span className="g-chip trade2-own">{t('game.market.owned', { n: owned })}</span>}
      </div>

      <GModeSwitch
        className="trade2-tabs"
        label={t('game.market.trade.quantity')}
        options={[
          { value: 'buy' as Side, label: t('game.market.opp.buy'), tone: 'action' },
          { value: 'sell' as Side, label: t('game.market.opp.sell'), tone: 'action' },
        ]}
        value={side}
        onChange={setSide}
      />

      <Verdict tone={tone} action={action}>
        {text}
      </Verdict>
      {hist.length > 1 && (
            <PriceChart
              points={hist.map((p) => ({ t: p.day * 24, buy: p.buy, sell: p.sell }))}
              world={worldAverageHistory(s, itemId).map((p) => ({ t: p.day * 24, v: p.mid }))}
              paid={owned ? Math.round(r.paidEach) : undefined}
              marks={marks}
              labels={{
                buy: t('game.market.youPay'),
                sell: t('game.market.youGet'),
                world: t('game.market.chart.world'),
                paid: t('game.market.opp.youPaid'),
                today: t('game.market.chart.today'),
              }}
            />
          )}

      {here && !(side === 'sell' && !owned) && (side === 'sell' ? r.sell > 0 : r.buy > 0) && (
        <>
          <BigNumber
            label={side === 'buy' ? t('game.market.youPay') : t('game.market.youGet')}
            value={fmt.money(total)}
            note={
              <span className="trade2-unit">
                <span>
                  {nQ > 1 ? t('game.market.trade.avgEach', { price: fmt.money(avg) }) : t('game.market.trade.unitPrice', { price: fmt.money(first) })}
                  {nQ > 1 && diff > 0 && (
                    <>
                      {' · '}
                      <b className={side === 'buy' ? 'up' : 'down'}>
                        {side === 'buy' ? t('game.market.trade.moreEach', { diff: fmt.money(diff) }) : t('game.market.trade.lessEach', { diff: fmt.money(diff) })}
                      </b>
                    </>
                  )}
                </span>
                <span className="trade2-push">
                  {side === 'buy' ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />}
                  {side === 'buy' ? t('game.market.trade.buyPush') : t('game.market.trade.sellPush')} <Help term="saturation" />
                </span>
              </span>
            }
          />

          {dest && (
            <div className={`trade2-dest ${destPl >= 0 ? 'pos' : 'neg'}`} role="status">
              <b className="num">
                {t('game.market.trade.destProfit', {
                  country: countryName(best!.countryId),
                  pl: signed(destPl, money(destPl)),
                  pct: signed(destPl, fmt.pct(buyQ.total ? Math.abs(destPl) / buyQ.total : 0)),
                })}
              </b>
              {bestN > 0 && bestN !== q && (
                <span className="trade2-best">
                  {t('game.market.trade.bestQty', { n: bestN })}
                  <button className="btn sm ghost" onClick={() => setQBuy(bestN)}>
                    {t('game.market.trade.setQty', { n: bestN })}
                  </button>
                </span>
              )}
              {lossN > 0 && <span className="trade2-loss">{t('game.market.trade.lossFrom', { n: lossN })}</span>}
            </div>
          )}

          <div className="trade2-qty">
            <PriceBars prices={unitPrices} side={side} />
            <div className="mkt-stepper">
              <GStepper value={q} min={1} max={limit} onChange={setQ} decLabel={t('game.market.trade.less')} incLabel={t('game.market.trade.more')} />
              <GRange min={1} max={limit} value={q} onChange={setQ} aria-label={t('game.market.trade.quantity')} aria-valuetext={t('game.market.trade.valueText', { n: q })} />
            </div>
            <div className="mkt-quick">
              {side === 'buy' && canBuyMax > 1 && (
                <button className="btn sm ghost" onClick={() => setQBuy(canBuyMax)}>
                  {t('game.market.trade.maxBuy', { n: canBuyMax })}
                </button>
              )}
              {side === 'sell' && owned > 1 && (
                <button className="btn sm ghost" onClick={() => setQSell(owned)}>
                  {t('game.market.trade.allCargo', { n: owned })}
                </button>
              )}
              {side === 'sell' && breakEven > 0 && owned > breakEven && (
                <button className="btn sm ghost" onClick={() => setQSell(breakEven)}>
                  {t('game.market.trade.breakEven', { n: breakEven })}
                </button>
              )}
            </div>
          </div>

          <button
            data-tour={side}
            className={`btn trade2-go${!disabled && (side === 'buy' || pl >= 0) ? ' primary' : ''}`}
            disabled={disabled}
            onClick={() => act((g, ag) => (side === 'buy' ? A.buy(g, ag, itemId, q) : A.sell(g, ag, itemId, Math.min(q, owned))), side)}
          >
            {side === 'buy' ? t('game.market.trade.buy', { q }) : t('game.market.trade.sell', { q: Math.min(q, owned) })} <span className="num">{fmt.money(total)}</span>
          </button>
        </>
      )}

      <Details>
        <dl className="trade2-dl">
          <dt>{t('game.market.youPay')}</dt>
          <dd className="num">{r.buy ? fmt.money(r.buy) : t('game.market.notSold')}</dd>
          <dt>{t('game.market.youGet')}</dt>
          <dd className="num">{r.sell ? fmt.money(r.sell) : t('game.market.notBought')}</dd>
          {(r.buy > 0 || r.sell > 0) && (
            <>
              <dt>{t('game.market.title')}</dt>
              <dd>{deal.text}</dd>
            </>
          )}
          {owned > 0 && r.sell > 0 && (
            <>
              <dt>{t('game.market.opp.youPaid')}</dt>
              <dd className="num">
                {fmt.money(r.paidEach)} · <span className={r.plEach >= 0 ? 'pos' : 'neg'}>{t('game.market.plSellingHere', { pl: `${r.plEach > 0 ? '+' : ''}${fmt.money(r.plEach)}` })}</span>
              </dd>
            </>
          )}
          {here && (
            <>
              <dt>{t('game.topbar.cash')}</dt>
              <dd className="num">
                {fmt.money(a.cash)} → {fmt.money(a.cash + (disabled ? 0 : cashDelta))}
              </dd>
              <dt>{t('game.market.cap.label')}</dt>
              <dd className="num">
                {fmt.tons(used)} → {fmt.tons(Math.max(0, used + (disabled ? 0 : tonsDelta)))} / {fmt.tons(max)}
              </dd>
            </>
          )}
        </dl>
        <PriceRange itemId={itemId} countryId={countryId} />
        <p className="mkt-blurb">{itemBlurb(itemId)}</p>
      </Details>
    </div>
  );
}

/** Uma barra por unidade (até 60): mais altas a cada compra, mais baixas a cada venda. Anima quando a quantidade muda. */
function PriceBars({ prices, side }: { prices: number[]; side: Side }) {
  if (prices.length < 2) return null;
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = hi - lo || 1;
  return (
    <div className={`price-bars ${side}`} aria-hidden>
      {prices.map((p, i) => (
        <i key={i} style={{ height: `${35 + ((p - lo) / span) * 65}%` }} />
      ))}
    </div>
  );
}
