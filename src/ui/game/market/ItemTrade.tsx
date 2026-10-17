import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info, PlaneTakeoff } from 'lucide-react';
import { GameIcon, GRange, GSegmented, GStepper } from '../../../art';
import * as A from '../../../game/actions';
import { maxCargo, quoteBuy, quoteSell, usedCargo } from '../../../game/market';
import { directorAt, player } from '../../../game/state';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import { classLabel, countryName, itemBlurb } from '../../../i18n/lookup';
import { Help } from '../help/Glossary';
import { marketRows, maxAffordable, priceRange, saturationAfter, sellUntilBreakEven, whyCantBuy, whyCantSell } from './model';
import { PriceRange, dealOf } from './MarketPanel';

type Side = 'buy' | 'sell';
type Tone = 'good' | 'bad' | 'warn' | 'neutral';

/**
 * Modal de compra e venda (ADR 0006, 2ª versão): abas Comprar | Vender, cada uma com UMA quantidade,
 * UM botão e UM número grande; o veredito no topo diz se é bom negócio e para onde voar.
 * O resto (preço da 1ª unidade, Saturação, faixa de preços, caixa e espaço) fica em "Ver detalhes".
 */
export function ItemTrade({ countryId, itemId }: { countryId: string; itemId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const here = directorAt(a, countryId);
  const c = s.countries[countryId];
  const r = marketRows(s, a, countryId).find((x) => x.itemId === itemId);
  const [side, setSide] = useState<Side>(() => (r && r.owned > 0 && r.sell > 0 ? 'sell' : 'buy'));
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
  const deal = dealOf(r, t);
  const used = usedCargo(a);
  const max = maxCargo(a);
  const money = (n: number) => fmt.money(Math.abs(n));
  const canFly = (to: string) => to !== a.location && a.director.status === 'free' && !a.flight && Number.isFinite(A.flightHours(a, to));
  const fly = (to: string) => (
    <button className="btn sm trade-fly" disabled={!canFly(to)} onClick={() => act((g, ag) => A.travel(g, ag, to), 'depart')}>
      <PlaneTakeoff size={15} /> {t('game.market.opp.fly')} · {countryName(to)}
    </button>
  );
  const elsewhere = (k: typeof best) => !!k && k.countryId !== countryId;

  // ── Números da aba ──
  const buyQ = quoteBuy(c, itemId, q);
  const sellQ = quoteSell(c, itemId, Math.min(q, Math.max(1, owned)));
  const total = side === 'buy' ? buyQ.total : sellQ.total;
  const pl = side === 'sell' && owned ? sellQ.total - r.paidEach * Math.min(q, owned) : 0;
  const sat = saturationAfter(c, itemId, q, side);
  const block = side === 'buy' ? (r.buy ? whyCantBuy(s, a, countryId, itemId, q) : { key: 'game.market.block.notSold' as const }) : r.sell ? whyCantSell(s, a, countryId, itemId, q) : { key: 'game.market.block.nobodyBuys' as const };
  const breakEven = side === 'sell' && owned && r.sell ? sellUntilBreakEven(c, itemId, owned, r.paidEach) : 0;

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
      text = (
        <>
          {t('game.market.trade.loss')} <b className="num">{money(pl)}</b>
          {elsewhere(best) && best!.sell > r.sell && (
            <>
              {' · '}
              {t('game.market.range.best')} <b>{countryName(best!.countryId)}</b> <span className="num">{fmt.money(best!.sell)}</span>
            </>
          )}
        </>
      );
      if (elsewhere(best) && best!.sell > r.sell) action = fly(best!.countryId);
    } else {
      tone = 'good';
      text = (
        <>
          {t('game.market.trade.profit')} <b className="num">{money(pl)}</b>
          {elsewhere(best) && best!.sell > r.sell * 1.1 && (
            <>
              {' · '}
              {t('game.market.range.best')} {countryName(best!.countryId)} <span className="num">{fmt.money(best!.sell)}</span>
            </>
          )}
        </>
      );
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
      tone = 'good';
      text = (
        <>
          {deal.text}
          {elsewhere(best) && best!.sell > r.buy && (
            <>
              {' '}
              {t('game.market.opp.buyHere.b', { country: countryName(best!.countryId) })} <span className="num">{fmt.money(best!.sell)}</span>
            </>
          )}
        </>
      );
    } else {
      tone = r.deal === 'pricey' ? 'warn' : 'neutral';
      text = (
        <>
          {deal.text}
          {elsewhere(cheapest) && cheapest!.buy < r.buy && (
            <>
              {' · '}
              {t('game.market.range.cheapest')} <b>{countryName(cheapest!.countryId)}</b> <span className="num">{fmt.money(cheapest!.buy)}</span>
            </>
          )}
        </>
      );
      if (elsewhere(cheapest) && cheapest!.buy < r.buy * 0.9) action = fly(cheapest!.countryId);
    }
  }
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'bad' || tone === 'warn' ? AlertTriangle : Info;
  const disabled = !here || !!block || (side === 'sell' && !owned);
  const tonsDelta = (side === 'buy' ? 1 : -1) * r.it.weight * (side === 'buy' ? q : Math.min(q, owned));
  const cashDelta = side === 'buy' ? -buyQ.total : sellQ.total;

  return (
    <div className="trade2">
      <div className="trade2-id">
        <span className="g-well trade2-icon">
          <GameIcon id={itemId} size={36} accent={r.it.wmd ? 'signal' : 'warm'} />
        </span>
        <span className="mono trade2-sub">
          {r.it.wmd ? t('game.market.wmd') : classLabel(r.it.cls)} · {t('game.market.perUnit', { weight: fmt.tons(r.it.weight) })}
        </span>
        {owned > 0 && <span className="g-chip trade2-own">{t('game.market.owned', { n: owned })}</span>}
      </div>

      <GSegmented
        className="trade2-tabs"
        label={itemBlurb(itemId)}
        options={[
          { value: 'buy', label: t('game.market.opp.buy') },
          { value: 'sell', label: t('game.market.opp.sell') },
        ]}
        value={side}
        onChange={(v) => setSide(v as Side)}
      />

      <div className={`trade2-verdict tone-${tone}`} role="status">
        <Icon size={20} aria-hidden />
        <p>{text}</p>
        {action}
      </div>

      {here && !(side === 'sell' && !owned) && (side === 'sell' ? r.sell > 0 : r.buy > 0) && (
        <>
          <div className="trade2-big">
            <span className="k">{side === 'buy' ? t('game.market.youPay') : t('game.market.youGet')}</span>
            <span className="v num">{fmt.money(total)}</span>
            <span className="note mono">
              {t('game.market.trade.valueText', { n: q })} · {t('game.help.saturation.title')} {sat > 0 ? '+' : sat < 0 ? '−' : ''}
              {fmt.pct(Math.abs(sat))} <Help term="saturation" />
            </span>
          </div>

          <div className="trade2-qty">
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
              {side === 'sell' && breakEven > 0 && breakEven < owned && (
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

      <details className="trade2-more">
        <summary>
          {t('menu.new.details')} <ChevronDown size={14} aria-hidden />
        </summary>
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
      </details>
    </div>
  );
}
