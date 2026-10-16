import { useEffect, useState } from 'react';
import { GameIcon } from '../../../art';
import * as A from '../../../game/actions';
import { CLASS_LABEL, ITEMS } from '../../../game/data/items';
import { maxCargo, quoteBuy, quoteSell, usedCargo } from '../../../game/market';
import { directorAt, formatDuration, intelCountries, player, standing } from '../../../game/state';
import { useGame, useGameStore } from '../../../store/game';
import { money, tons } from '../../fmt';
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
import type { MarketRow, Opportunity, Segment } from './model';
import './market.css';

const signed = (n: number) => (n > 0 ? `+${money(n)}` : money(n));
const pctTxt = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.round(Math.abs(v) * 100)}%`;

/**
 * Mercado de um país, redesenhado para quem joga pela primeira vez: frase-guia, segmentos por categoria,
 * Oportunidades primeiro e linhas com "Você paga / Você recebe".
 */
export function MarketPanel({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  const c = s.countries[countryId];
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
    <section className="mkt" aria-label={`Mercado de ${c.name}`}>
      <header className="mkt-head">
        <div className="mkt-title">
          <h3>Mercado</h3>
          <span className={`mkt-live mono${live ? ' on' : ''}`}>
            {live ? 'preços ao vivo' : seen ? `preços de ${formatDuration(s.time - seen.at)} atrás` : 'preços desconhecidos'}
          </span>
        </div>
        <p className="mkt-guide">Compre barato aqui, voe e venda onde pagam mais.</p>
        <div className="mkt-cap" aria-label={`Espaço no avião: ${tons(used)} de ${tons(max)} usados`}>
          <span className="mkt-cap-k">
            <Help term="cargo">Espaço no avião</Help>
          </span>
          <span className="mkt-cap-bar" aria-hidden>
            <span
              style={{
                width: `${max ? Math.min(100, (used / max) * 100) : 100}%`,
              }}
              className={used / (max || 1) > 0.9 ? 'full' : ''}
            />
          </span>
          <span className="mkt-cap-v num">
            {tons(used)} de {tons(max)}
          </span>
        </div>
      </header>

      {!live && !seen ? (
        <div className="mkt-empty">
          <GameIcon id="station-cell" size={28} accent="cold" />
          <p>
            Você ainda não conhece os preços de {c.name}. <b>Voe para cá</b> com o Diretor ou <b>abra uma Estação</b> no país para ver o
            mercado ao vivo.
          </p>
        </div>
      ) : (
        <>
          <div className="mkt-segs" role="tablist" aria-label="Categorias do mercado">
            {segs.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={active === g.id}
                className={`mkt-seg${g.id === 'hire' ? ' hire' : ''}`}
                onClick={() => {
                  setSeg(g.id);
                  setOpen(null);
                }}
              >
                <GameIcon id={g.icon} size={18} accent={active === g.id ? 'warm' : 'none'} />
                <span>{g.label}</span>
                {counts[g.id] > 0 && <span className="mkt-count num">{counts[g.id]}</span>}
              </button>
            ))}
          </div>
          <p className="mkt-seg-hint">{meta.hint}</p>

          {active === 'opps' && <OppList opps={opps} countryId={countryId} onFocus={focusItem} hasStations={a.stations.length > 0} />}

          {active === 'hire' && <HireList countryId={countryId} />}

          {active !== 'opps' && active !== 'hire' && (
            <ul className="mkt-rows">
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
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const select = useGameStore((st) => st.select);
  const here = directorAt(a, countryId);
  const name = (id: string) => s.countries[id]?.name ?? '?';

  if (!opps.length)
    return (
      <div className="mkt-empty">
        <GameIcon id="forecast" size={28} accent="cold" />
        <p>
          {hasStations
            ? 'Nenhum negócio lucrativo conhecido a partir daqui. Veja as categorias ou abra mais Estações para conhecer outros preços.'
            : 'Você só conhece os preços dos lugares onde está ou tem Estação. Abra Estações em outros países para revelar onde cada item vale mais.'}
        </p>
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
                {o.kind !== 'buy-here' && <span className="opp-tag">na sua Carga</span>}
              </span>
              <span className="opp-route">
                {o.kind === 'buy-here' ? 'Compre aqui' : 'Você pagou'} <span className="num">{money(o.buyEach)}</span>
                <span aria-hidden> → </span>
                <span className="sr-only"> e </span>
                {o.kind === 'sell-here' ? 'aqui pagam' : `${name(o.to)} paga`} <span className="num">{money(o.sellEach)}</span>
              </span>
              <span className="opp-meta mono">
                <span className="pos num">{pctTxt(o.pct)}/un</span>
                {o.qty > 0 && (
                  <>
                    {' · '}
                    {o.kind === 'buy-here' ? `${o.qty} cabem` : `${o.qty} un`} = <span className="pos num">{signed(o.profit)}</span>
                  </>
                )}
                {o.hours > 0 && ` · ${formatDuration(o.hours)} de voo`}
                {!o.live && ' · preço antigo'}
                {o.block && <span className="neg"> · {o.block}</span>}
              </span>
            </div>
            <div className="opp-actions">
              {o.kind !== 'sell-there' ? (
                <button className={`btn sm${o.block ? '' : ' primary'}`} disabled={!here || !!o.block} onClick={() => onFocus(o.itemId)}>
                  {o.kind === 'buy-here' ? 'Comprar' : 'Vender'}
                </button>
              ) : (
                <button className="btn sm primary" disabled={travelBlocked} onClick={() => act((g, ag) => A.travel(g, ag, o.to), 'depart')}>
                  Voar
                </button>
              )}
              <button className="btn sm ghost" onClick={() => select(o.to)}>
                Ver {name(o.to)}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Nome curto do item: sem o "(cx. 100)" que já aparece no detalhe.
const shortName = (itemId: string) => ITEMS[itemId].name.replace(/\s*\(.*\)$/, '');

function MarketItem({ row, countryId, open, onToggle }: { row: MarketRow; countryId: string; open: boolean; onToggle: () => void }) {
  const r = row;
  const s = useGame();
  const a = player(s);
  const here = directorAt(a, countryId);
  // Quem compra aqui quer preço abaixo da média; se o país só compra o item, acima da média é bom para vender.
  const sellSide = !r.buy && r.sell > 0;
  const pctAbs = Math.round(Math.abs(r.dealPct) * 100);
  const good = r.deal === 'fair' ? null : sellSide ? r.deal === 'pricey' : r.deal === 'cheap';
  const dealText = r.deal === 'fair' ? '≈ na média' : r.deal === 'cheap' ? `▼ ${pctAbs}% abaixo da média` : `▲ ${pctAbs}% acima da média`;
  return (
    <li className={`mkt-item${open ? ' open' : ''}${r.it.wmd ? ' wmd' : ''}${r.owned ? ' owned' : ''}`}>
      <button className="mkt-row" aria-expanded={open} onClick={onToggle}>
        <GameIcon id={r.itemId} size={28} accent={r.it.wmd ? 'signal' : 'warm'} />
        <span className="mkt-name">
          <span className="mkt-name-t">{r.it.name}</span>
          <span className="mkt-name-s">
            {r.it.wmd ? 'Arma de Destruição em Massa' : CLASS_LABEL[r.it.cls]} · {tons(r.it.weight)}/un
          </span>
          {(r.buy > 0 || r.sell > 0) && (
            <span
              className={`mkt-deal ${good === null ? 'fair' : good ? 'good' : 'bad'}`}
              title={
                r.dealKnown
                  ? 'Comparado com os preços que você conhece no mundo.'
                  : 'Você conhece poucos mercados: a média usa também o preço de catálogo.'
              }
            >
              {dealText}
              {!r.dealKnown && <span className="mkt-deal-src"> · poucos dados</span>}
            </span>
          )}
        </span>
        <span className="mkt-prices">
          <span className="mkt-p">
            <span className="k">Você paga</span>
            <span className="v num">{r.buy ? money(r.buy) : 'não vende'}</span>
          </span>
          <span className="mkt-p">
            <span className="k">Você recebe</span>
            <span className="v num">{r.sell ? money(r.sell) : 'não compra'}</span>
          </span>
        </span>
        {r.owned > 0 && (
          <span className="mkt-own">
            <span className="num">{r.owned} na Carga</span>
            {r.sell > 0 && <span className={`${r.plEach >= 0 ? 'pos' : 'neg'}`}>{signed(r.plEach)}/un vendendo aqui</span>}
          </span>
        )}
      </button>
      {open &&
        (here ? (
          <TradeBox row={r} countryId={countryId} />
        ) : (
          <p className="mkt-away">
            Voe para {s.countries[countryId].name} para negociar. {r.it.blurb}
          </p>
        ))}
    </li>
  );
}

function TradeBox({ row, countryId }: { row: MarketRow; countryId: string }) {
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

  const buyBlock = r.buy ? whyCantBuy(s, a, countryId, r.itemId, q) : 'Este país não vende o item.';
  const sellBlock = r.sell ? whyCantSell(s, a, countryId, r.itemId, q) : 'Ninguém aqui compra este item.';
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
          Quantidade
        </label>
        <div className="mkt-stepper">
          <button className="btn sm icon" aria-label="Menos" disabled={q <= 1} onClick={() => setQty(Math.max(1, q - 1))}>
            −
          </button>
          <input
            id={`q-${r.itemId}`}
            type="range"
            min={1}
            max={limit}
            value={q}
            onChange={(e) => setQty(Number(e.target.value))}
            aria-valuetext={`${q} unidades`}
          />
          <button className="btn sm icon" aria-label="Mais" disabled={q >= limit} onClick={() => setQty(Math.min(limit, q + 1))}>
            +
          </button>
          <span className="mkt-q num" aria-live="polite">
            {q}
          </span>
        </div>
        <div className="mkt-quick">
          {canBuyMax > 0 && (
            <button className="btn sm ghost" onClick={() => setQty(canBuyMax)}>
              Máx. compra ({canBuyMax})
            </button>
          )}
          {r.owned > 0 && (
            <button className="btn sm ghost" onClick={() => setQty(r.owned)}>
              Tudo da Carga ({r.owned})
            </button>
          )}
          {breakEven > 0 && breakEven < r.owned && (
            <button className="btn sm ghost" onClick={() => setQty(breakEven)}>
              Até empatar ({breakEven})
            </button>
          )}
        </div>
      </div>

      <div className="mkt-sides">
        {r.buy > 0 && (
          <div className="mkt-side">
            <button
              className={`btn${!buyBlock && r.owned === 0 ? ' primary' : ''}`}
              disabled={!!buyBlock}
              onClick={() => act((g, ag) => A.buy(g, ag, r.itemId, q), 'buy')}
            >
              Comprar {q} · <span className="num">{money(buyQ.total)}</span>
            </button>
            <span className={`mkt-why${buyBlock ? ' bad' : ''}`}>
              {buyBlock ?? `${tons(r.it.weight * q)} no avião · preço local sobe ${pctTxt(satBuy)} depois`}
            </span>
          </div>
        )}
        {r.owned > 0 ? (
          <div className="mkt-side">
            <button
              className={`btn ${!sellBlock && sellPL >= 0 ? 'primary' : ''}${!sellBlock && sellPL < 0 ? ' loss' : ''}`}
              disabled={!!sellBlock}
              onClick={() => act((g, ag) => A.sell(g, ag, r.itemId, q), 'sell')}
            >
              Vender {q} · <span className="num">{money(sellQ.total)}</span>
            </button>
            <span className={`mkt-why${sellBlock ? ' bad' : ''}`}>
              {sellBlock ?? (
                <>
                  <span className={sellPL >= 0 ? 'pos' : 'neg'}>
                    {sellPL >= 0 ? 'Lucro' : 'Prejuízo'} {money(Math.abs(sellPL))}
                  </span>{' '}
                  vs. o que pagou · preço cai {pctTxt(satSell)} <Help term="saturation" />
                </>
              )}
            </span>
          </div>
        ) : (
          <p className="mkt-why">
            {r.sell
              ? `Aqui pagam ${money(r.sell)} por unidade. Compre onde for mais barato e volte com Carga.`
              : 'Ninguém aqui compra este item: venda em outro país.'}
          </p>
        )}
      </div>
      <PriceRange itemId={r.itemId} countryId={countryId} />
      <p className="mkt-blurb">{r.it.blurb}</p>
    </div>
  );
}

/** Onde o item está mais barato e onde pagam mais, entre os preços que o jogador conhece. */
function PriceRange({ itemId, countryId }: { itemId: string; countryId: string }) {
  const s = useGame();
  const a = player(s);
  const select = useGameStore((st) => st.select);
  const { cheapest, best, samples } = priceRange(s, a, itemId);
  const name = (id: string) => (id === countryId ? `${s.countries[id].name} (aqui)` : s.countries[id].name);
  if (samples < 2) return <p className="mkt-range">Você só conhece este preço aqui. Abra Estações em outros países para comparar.</p>;
  return (
    <div className="mkt-range">
      {cheapest && (
        <span>
          Mais barato:{' '}
          <button className="linkish" onClick={() => select(cheapest.countryId)}>
            {name(cheapest.countryId)}
          </button>{' '}
          <span className="num">{money(cheapest.buy)}</span>
        </span>
      )}
      {best && (
        <span>
          Paga mais:{' '}
          <button className="linkish" onClick={() => select(best.countryId)}>
            {name(best.countryId)}
          </button>{' '}
          <span className="num">{money(best.sell)}</span>
        </span>
      )}
      <span className="mkt-why">Entre {samples} mercados que você conhece.</span>
    </div>
  );
}

function HireList({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const list = recruitRows(s, a, countryId);
  if (!list.length)
    return (
      <div className="mkt-empty">
        <p>Ninguém disponível para contratar aqui hoje.</p>
      </div>
    );
  return (
    <ul className="mkt-rows">
      {list.map((r) => (
        <li key={r.itemId} className="mkt-item hire">
          <div className="mkt-row static">
            <GameIcon id={r.itemId} size={28} accent="cold" />
            <span className="mkt-name">
              <span className="mkt-name-t">{r.it.name}</span>
              <span className="mkt-name-s">
                {r.it.cls === 'cargo'
                  ? `Cargueiro · ${r.it.weight} t · ${r.it.speed} km/h`
                  : `${CLASS_LABEL[r.it.cls]} · vai para a Escolta`}
              </span>
            </span>
            <span className="mkt-hire">
              <button className="btn sm primary" disabled={!!r.block} onClick={() => act((g, ag) => A.recruit(g, ag, r.itemId), 'buy')}>
                Contratar · <span className="num">{money(r.price)}</span>
              </button>
              <span className={`mkt-why${r.block ? ' bad' : ''}`}>{r.block ?? r.it.blurb}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
