import { useState } from 'react';
import { Briefcase, Building2, Crown, Gavel, Landmark, PlaneTakeoff, ShieldAlert, Cpu, UserX } from 'lucide-react';
import * as A from '../../game/actions';
import { cargoQty } from '../../game/cargo';
import { CONTINENT_LABEL } from '../../game/data/countries';
import { CLASS_LABEL, ITEMS } from '../../game/data/items';
import { OPERATION_BLURB, OPERATION_LABEL, POLITICS_COLOR, POLITICS_LABEL, STATIONS } from '../../game/data/rules';
import { buyPrice, fleetSpeed, freeCargo, interested, quoteBuy, quoteSell, rollRecruits, sellPrice } from '../../game/market';
import { directorAt, formatDuration, intelCountries, player, postureIn, standing, stationIn } from '../../game/state';
import type { OperationKind, StationLevel } from '../../game/types';
import { def } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { amount, money, tons } from '../fmt';
import { Empty, ExpBar, PostureChip, RepBar, Section, Stepper } from './bits';
import { UnitRow } from './UnitRow';

const OP_ICON: Record<OperationKind, typeof Landmark> = { bank: Landmark, tech: Cpu, neutralize: UserX };

export function CountryPanel() {
  const s = useGame();
  const a = player(s);
  const id = useGameStore((st) => st.selected) ?? a.location;
  const act = useGameStore((st) => st.act);
  const c = s.countries[id];
  const here = directorAt(a, id);
  const sd = standing(a, id);
  const live = intelCountries(a).has(id);
  const [open, setOpen] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const marketItems = [...new Set([...c.stock, ...(here ? a.cargo.map((l) => l.itemId) : [])])];

  const maxBuy = (itemId: string) => {
    const w = ITEMS[itemId].weight;
    const byCargo = w > 0 ? Math.floor((freeCargo(a) + 1e-6) / w) : 99;
    let n = 0;
    while (n < Math.min(99, byCargo) && quoteBuy(c, itemId, n + 1).total <= a.cash) n++;
    return n;
  };

  return (
    <div className="panel-scroll">
      <header className="cty-head">
        <div className="cty-title">
          <h2>{c.name}</h2>
          <span className="mono cty-sub">
            {CONTINENT_LABEL[c.continent]} · nível {c.level} ·{' '}
            <span style={{ color: POLITICS_COLOR[c.politics] }}>{POLITICS_LABEL[c.politics]}</span>
            {c.couped && ' · governo pós-Golpe'}
          </span>
        </div>
        <PostureChip posture={postureIn(a, id)} />
      </header>
      <div className="kv">
        <span className="k">Reputação</span>
        <RepBar value={sd.reputation} />
        <span className="v num">{Math.round(sd.reputation)}</span>
        <span className="k">Exposição</span>
        <ExpBar value={sd.exposure} />
        <span className="v num">{Math.round(sd.exposure)}</span>
      </div>

      {!here && (
        <TravelBox countryId={id} />
      )}

      <Section
        title="Mercado"
        right={
          <span className="mono hint-sm">
            {live ? 'ao vivo' : sd.seen ? `visto há ${formatDuration(s.time - sd.seen.at)}` : 'sem informação'}
          </span>
        }
      >
        {!live && !sd.seen && <Empty>Sem Estação aqui, os preços só aparecem quando o Diretor visita.</Empty>}
        {(live || sd.seen) && (
          <div className="market">
            <div className="mk-row mk-head mono">
              <span>Item</span>
              <span>Compra US$</span>
              <span>Venda US$</span>
              <span>Carga</span>
            </div>
            {marketItems.map((itemId) => {
              const it = ITEMS[itemId];
              const inStock = c.stock.includes(itemId);
              const sat = c.saturation[itemId] ?? 0;
              const seenMid = sd.seen?.prices[itemId];
              const b = live ? (inStock ? buyPrice(c, itemId) : 0) : seenMid ? Math.round(seenMid * 1.04) : 0;
              const sp = live ? sellPrice(c, itemId) : seenMid && interested(c, it) ? Math.round(seenMid * 0.94) : 0;
              const owned = cargoQty(a, itemId);
              const isOpen = open === itemId && here;
              return (
                <div key={itemId} className={`mk-item${isOpen ? ' open' : ''}${it.wmd ? ' wmd' : ''}`}>
                  <button
                    className="mk-row"
                    disabled={!here}
                    onClick={() => {
                      setOpen(isOpen ? null : itemId);
                      setQty(1);
                    }}
                  >
                    <span className="mk-name">
                      {it.name}
                      <small>{it.wmd ? 'Arma de Destruição em Massa' : CLASS_LABEL[it.cls]}</small>
                    </span>
                    <span className="num">{b ? amount(b) : '—'}</span>
                    <span className="num">
                      {sp ? amount(sp) : '—'}
                      {live && Math.abs(sat) >= 0.02 && (
                        <small className={sat < 0 ? 'neg' : 'pos'}>
                          {sat > 0 ? '+' : '−'}
                          {Math.round(Math.abs(sat) * 100)}%
                        </small>
                      )}
                    </span>
                    <span className="num">{owned || '·'}</span>
                  </button>
                  {isOpen && (() => {
                    const canBuy = inStock ? maxBuy(itemId) : 0;
                    const nBuy = Math.min(qty, canBuy);
                    const nSell = sp ? Math.min(qty, owned) : 0;
                    return (
                    <div className="mk-trade">
                      <Stepper value={qty} max={Math.max(canBuy, owned, 1)} onChange={setQty} />
                      <div className="mk-btns">
                        <button
                          className="btn sm"
                          disabled={nBuy < 1}
                          onClick={() => act((g, ag) => A.buy(g, ag, itemId, nBuy), 'buy')}
                        >
                          {nBuy ? `Comprar ${nBuy} · ${money(quoteBuy(c, itemId, nBuy).total)}` : inStock ? 'Sem caixa ou espaço' : 'Não vende aqui'}
                        </button>
                        <button
                          className="btn sm primary"
                          disabled={nSell < 1}
                          onClick={() => act((g, ag) => A.sell(g, ag, itemId, nSell), 'sell')}
                        >
                          {nSell ? `Vender ${nSell} · ${money(quoteSell(c, itemId, nSell).total)}` : sp ? 'Nada na Carga' : 'Não compra aqui'}
                        </button>
                      </div>
                      <p className="hint-sm">
                        {tons(it.weight)} por unidade. {it.blurb} Cada venda derruba o preço local (Saturação), que se recupera em alguns dias.
                      </p>
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {here && <RecruitSection countryId={id} />}

      <StationSection countryId={id} />

      {here && <ContractsHere countryId={id} />}

      {here && (
        <Section title="Operações Especiais">
          <div className="ops">
            {(['bank', 'tech', 'neutralize'] as OperationKind[]).map((op) => {
              const Icon = OP_ICON[op];
              const blocked = A.operationBlocked(s, id, op);
              return (
                <button
                  key={op}
                  className="op"
                  disabled={!!blocked || !a.escort.length}
                  onClick={() => act((g, ag) => A.startOperation(g, ag, op), 'open')}
                >
                  <Icon size={18} />
                  <span className="op-name">{OPERATION_LABEL[op]}</span>
                  <span className="op-meta mono">força hostil ~{A.operationStrength(s, a, id, op)}</span>
                  <span className="op-blurb">{blocked ?? OPERATION_BLURB[op]}</span>
                </button>
              );
            })}
            <button className="op coup" disabled={!a.escort.length || !!c.couped} onClick={() => act((g, ag) => A.startCoup(g, ag), 'open')}>
              <Crown size={18} />
              <span className="op-name">Golpe</span>
              <span className="op-meta mono">força hostil ~{A.operationStrength(s, a, id, 'coup')}</span>
              <span className="op-blurb">Derruba o governo. Só com o Diretor presente. O novo governo vira Aliado.</span>
            </button>
          </div>
          <p className="hint-sm">Operações derrubam a Reputação e disparam a Exposição neste país. A Prévia aparece antes do contato.</p>
        </Section>
      )}
    </div>
  );
}

function TravelBox({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const hours = A.flightHours(a, countryId);
  const reason =
    a.director.status !== 'free'
      ? 'O Diretor não está livre.'
      : a.flight
        ? 'A Frota está em voo.'
        : !Number.isFinite(hours)
          ? 'Nenhum cargueiro operante.'
          : null;
  return (
    <div className="travel">
      <button className="btn primary" disabled={!!reason} onClick={() => act((g, ag) => A.travel(g, ag, countryId), 'depart')}>
        <PlaneTakeoff size={16} /> Voar para cá
      </button>
      <span className="mono hint-sm">{reason ?? `${formatDuration(hours)} de voo · Frota a ${fleetSpeed(a)} km/h`}</span>
    </div>
  );
}

function RecruitSection({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const c = s.countries[countryId];
  return (
    <Section title="Contratar">
      <div className="recruits">
        {rollRecruits(c).map((itemId) => {
          const it = ITEMS[itemId];
          const price = A.recruitPrice(countryId, itemId);
          return (
            <button key={itemId} className="recruit" disabled={price > a.cash} onClick={() => act((g, ag) => A.recruit(g, ag, itemId), 'buy')}>
              <Briefcase size={14} />
              <span>
                {it.name}
                <small>{it.cls === 'cargo' ? `${it.weight} t · ${it.speed} km/h` : CLASS_LABEL[it.cls]}</small>
              </span>
              <span className="num">{money(price)}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function ContractsHere({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const list = s.contracts.filter((k) => k.countryId === countryId && k.status === 'accepted' && k.agencyId === a.id);
  if (!list.length) return null;
  return (
    <Section title="Entregas aqui">
      {list.map((k) => (
        <div key={k.id} className="row-line">
          <span>
            {k.qty}× {ITEMS[k.itemId].name} para {k.buyer}
            <small className="mono"> · tem {cargoQty(a, k.itemId)}</small>
          </span>
          <button className="btn sm primary" disabled={cargoQty(a, k.itemId) < k.qty} onClick={() => act((g, ag) => A.deliverContract(g, ag, k.id), 'sell')}>
            Entregar {money(k.reward)}
          </button>
        </div>
      ))}
    </Section>
  );
}

function StationSection({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const here = directorAt(a, countryId);
  const st = stationIn(a, countryId);

  if (!st) {
    if (!here) return null;
    return (
      <Section title="Estação">
        <div className="row-line">
          <span>
            <Building2 size={14} /> Abrir uma Célula: renda diária, preços ao vivo e defesa local.
          </span>
          <button className="btn sm primary" onClick={() => act((g, ag) => A.openStation(g, ag), 'buy')}>
            Abrir {money(A.stationCost(a, countryId, 1))}
          </button>
        </div>
      </Section>
    );
  }
  const spec = STATIONS[st.level];
  const next = st.level < 5 ? STATIONS[(st.level + 1) as StationLevel] : null;
  return (
    <Section title={`Estação · ${spec.name}`} right={<span className="mono hint-sm">{st.units.length}/{spec.capacity} Unidades</span>}>
      {st.interdicted && (
        <div className="alert bad">
          <ShieldAlert size={16} />
          <span>Interditada: não rende nem informa. {st.detained.length} Unidade(s) Detida(s).</span>
          <div className="alert-actions">
            <button className="btn sm" disabled={a.cash < st.interdicted.fine} onClick={() => act((g, ag) => A.payFine(g, ag, countryId), 'buy')}>
              Pagar multa {money(st.interdicted.fine)}
            </button>
            {here && (
              <button className="btn sm" onClick={() => act((g, ag) => A.appeal(g, ag), 'open')}>
                <Gavel size={14} /> Recorrer
              </button>
            )}
          </div>
        </div>
      )}
      {here && next && !st.interdicted && (
        <div className="row-line">
          <span className="hint-sm">
            {next.name}: {next.capacity} Unidades, renda {money(next.income)}/dia{next.wideIntel ? ', informa países vizinhos' : ''}.
          </span>
          <button className="btn sm" onClick={() => act((g, ag) => A.upgradeStation(g, ag), 'buy')}>
            Subir {money(A.stationCost(a, countryId, next.level))}
          </button>
        </div>
      )}
      <div className="unit-list">
        {st.units.map((u) => (
          <UnitRow
            key={u.uid}
            unit={u}
            action={
              here && !st.interdicted ? (
                <button className="btn sm" onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'escort'))}>
                  → Escolta
                </button>
              ) : undefined
            }
          />
        ))}
        {!st.units.length && <Empty>Sem Unidades de Estação: só as defesas fixas protegem o lugar.</Empty>}
      </div>
      {here && !st.interdicted && a.escort.length > 0 && (
        <details className="details">
          <summary>Deixar Unidades da Escolta aqui</summary>
          <div className="unit-list">
            {a.escort.map((u) => (
              <UnitRow
                key={u.uid}
                unit={u}
                action={
                  <button
                    className="btn sm"
                    disabled={!spec.allows.includes(def(u.itemId).cls) || st.units.length >= spec.capacity}
                    onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'station'))}
                  >
                    → Estação
                  </button>
                }
              />
            ))}
          </div>
        </details>
      )}
      <div className="vault">
        <span className="mono hint-sm">
          Cofre · {tons(A.vaultWeight(st))} de {tons(A.vaultWeight(st) + A.vaultFree(st))}
        </span>
        {st.vault.map((l) => (
          <div key={l.lid} className="row-line">
            <span>
              {l.qty}× {ITEMS[l.itemId].name}
            </span>
            {here && !st.interdicted && (
              <button className="btn sm" onClick={() => act((g, ag) => A.withdraw(g, ag, l.itemId, l.qty))}>
                Retirar
              </button>
            )}
          </div>
        ))}
        {!st.vault.length && <span className="hint-sm">vazio</span>}
      </div>
    </Section>
  );
}
