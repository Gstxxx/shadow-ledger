import { AlertTriangle, Building2, Crown, Gavel, Landmark, PlaneTakeoff, ShieldAlert, Cpu, UserX } from 'lucide-react';
import * as A from '../../game/actions';
import { cargoQty } from '../../game/cargo';
import { POLITICS_COLOR, STATIONS } from '../../game/data/rules';
import { fleetSpeed } from '../../game/market';
import { directorAt, formatDuration, player, postureIn, standing, stationIn } from '../../game/state';
import type { OperationKind, StationLevel } from '../../game/types';
import { def } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { useT } from '../../i18n';
import { continentName, countryName, itemName, operationBlurb, operationLabel, politicsLabel, stationName, threatLabel } from '../../i18n/lookup';
import { Details, Verdict } from './stage/Verdict';
import { VaultPanel } from './VaultPanel';
import { useStage } from './stage/context';
import { opportunities } from './market/model';
import { Empty, ExpBar, PostureChip, RepBar, Section } from './bits';
import { UnitCard } from './unit/UnitCard';
import { useOpenUnit } from './unit/DossierHost';
import { MarketPanel } from './market/MarketPanel';
import { Help } from './help/Glossary';

const OP_ICON: Record<OperationKind, typeof Landmark> = { bank: Landmark, tech: Cpu, neutralize: UserX };

/** Continente · nível · política (vira o "kicker" do modal do país). */
export function CountrySub({ countryId }: { countryId: string }) {
  const { t } = useT();
  const s = useGame();
  const c = s.countries[countryId];
  return (
    <>
      {continentName(c.continent)} · {t('game.country.level', { n: c.level })} ·{' '}
      <span style={{ color: POLITICS_COLOR[c.politics] }}>{politicsLabel(c.politics)}</span>
      {c.couped && ` · ${t('game.country.couped')}`}
    </>
  );
}

/** Postura, Reputação e Exposição do jogador no país. */
function CountryStanding({ countryId }: { countryId: string }) {
  const { t } = useT();
  const s = useGame();
  const a = player(s);
  const sd = standing(a, countryId);
  return (
    <div className="cty-standing">
      <PostureChip posture={postureIn(a, countryId)} />
      <div className="kv">
        <span className="k">
          <Help term="reputation">{t('game.country.reputation')}</Help>
        </span>
        <RepBar value={sd.reputation} />
        <span className="v num">{Math.round(sd.reputation)}</span>
        <span className="k">
          <Help term="exposure">{t('game.country.exposure')}</Help>
        </span>
        <ExpBar value={sd.exposure} />
        <span className="v num">{Math.round(sd.exposure)}</span>
      </div>
    </div>
  );
}

/** Aba "Visão geral" do país: relação, viagem, entregas e Rivais. */
export function CountryOverview({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  const here = directorAt(a, countryId);
  return (
    <div className="cty-overview">
      <CountryVerdict countryId={countryId} />
      <CountryStanding countryId={countryId} />
      {here && <ContractsHere countryId={countryId} />}
      <Details>
        <RivalsHere countryId={countryId} />
        <p className="hint-sm">{t0(s, countryId)}</p>
      </Details>
    </div>
  );
}

/** Linha de contexto do país para os detalhes (continente · nível · política). */
const t0 = (s: ReturnType<typeof useGame>, id: string) => `${continentName(s.countries[id].continent)} · ${politicsLabel(s.countries[id].politics)}`;

/**
 * "O que faço neste país?" (docs/UX-RULES.md): ameaça aqui > voar até lá > o melhor negócio > abrir Célula.
 * Uma frase e uma ação principal.
 */
function CountryVerdict({ countryId, focus }: { countryId: string; focus?: 'station' }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const stage = useStage();
  const here = directorAt(a, countryId);
  const threat = a.threats.find((x) => x.countryId === countryId && !x.cancelled);
  if (threat) {
    return (
      <Verdict
        tone="bad"
        action={
          <button className="btn primary" onClick={() => stage?.open({ kind: 'agency', tab: 'threats' })}>
            <AlertTriangle size={16} /> {t('game.agency.tab.threats')}
          </button>
        }
      >
        <b>{threatLabel(threat.kind)}</b> · {t('game.map.hours', { n: Math.max(0, Math.ceil(threat.strikesAt - s.time)) })} ·{' '}
        {t('game.agency.threats.target', { target: threat.target === 'station' ? t('game.country.station.title') : a.director.name, n: threat.strength })}
      </Verdict>
    );
  }
  if (!here) {
    const hours = A.flightHours(a, countryId);
    const reason =
      a.director.status !== 'free'
        ? t('game.country.travel.notFree')
        : a.flight
          ? t('game.country.travel.inFlight')
          : !Number.isFinite(hours)
            ? t('game.country.travel.noFreighter')
            : null;
    return (
      <Verdict
        tone={reason ? 'warn' : 'neutral'}
        icon={<PlaneTakeoff size={22} />}
        action={
          <button className="btn primary" data-tour="fly" disabled={!!reason} onClick={() => act((g, ag) => A.travel(g, ag, countryId), 'depart')}>
            <PlaneTakeoff size={16} /> {t('game.country.travel.fly')}
          </button>
        }
      >
        {reason ?? t('game.country.travel.info', { time: formatDuration(hours), speed: fleetSpeed(a) })}
      </Verdict>
    );
  }
  const best = focus === 'station' ? undefined : opportunities(s, a, countryId).find((o) => !o.block);
  if (best) {
    const sellThere = best.kind === 'sell-there';
    return (
      <Verdict
        tone="good"
        action={
          sellThere ? (
            <button className="btn primary" onClick={() => act((g, ag) => A.travel(g, ag, best.to), 'depart')}>
              <PlaneTakeoff size={16} /> {t('game.market.opp.fly')} · {countryName(best.to)}
            </button>
          ) : (
            <button className="btn primary" onClick={() => stage?.push({ kind: 'item', countryId, itemId: best.itemId })}>
              {best.kind === 'buy-here' ? t('game.market.opp.buy') : t('game.market.opp.sell')}
            </button>
          )
        }
      >
        <b>{itemName(best.itemId).replace(/\s*\(.*\)$/, '')}</b>{' '}
        {best.kind === 'buy-here' ? t('game.market.opp.buyHere.b', { country: countryName(best.to) }) : best.kind === 'sell-here' ? t('game.market.opp.herePays') : t('game.market.opp.countryPays', { country: countryName(best.to) })}{' '}
        · <b className="num">+{fmt.money(best.profit)}</b>
      </Verdict>
    );
  }
  if (!stationIn(a, countryId)) {
    return (
      <Verdict
        tone="neutral"
        icon={<Building2 size={22} />}
        action={
          <button className="btn primary" data-tour="open-station" onClick={() => act((g, ag) => A.openStation(g, ag), 'buy')}>
            {t('game.country.station.open', { cost: fmt.money(A.stationCost(a, countryId, 1)) })}
          </button>
        }
      >
        {focus === 'station' && a.cargo.length ? t('game.vault.needStation') : t('game.country.station.openCell')}
      </Verdict>
    );
  }
  return <Verdict tone="neutral">{t('game.market.guide')}</Verdict>;
}

/** Aba "Operações Especiais": só com o Diretor no país; fora dele, o caminho é voar até lá. */
export function CountryOps({ countryId }: { countryId: string }) {
  const { t } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const c = s.countries[countryId];
  const here = directorAt(a, countryId);
  const stage = useStage();
  if (!here) return <CountryVerdict countryId={countryId} />;
  return (
    <>
    {a.escort.length ? (
      <Verdict tone="warn">{t('game.country.ops.hint')}</Verdict>
    ) : (
      <Verdict tone="warn" action={<button className="btn primary" onClick={() => stage?.open({ kind: 'agency', tab: 'escort' })}>{t('game.topbar.agency')}</button>}>
        {t('game.agency.escort.empty')}
      </Verdict>
    )}
    <div className="ops">
      {(['bank', 'tech', 'neutralize'] as OperationKind[]).map((op) => {
        const Icon = OP_ICON[op];
        const blocked = A.operationBlocked(s, countryId, op);
        return (
          <button
            key={op}
            className="op"
            disabled={!!blocked || !a.escort.length}
            onClick={() => act((g, ag) => A.startOperation(g, ag, op), 'open')}
          >
            <Icon size={18} />
            <span className="op-name">{operationLabel(op)}</span>
            <span className="op-meta mono">{t('game.country.ops.hostileForce', { n: A.operationStrength(s, a, countryId, op) })}</span>
            {blocked ? <span className="op-blurb">{blocked}</span> : <span className="sr-only">{operationBlurb(op)}</span>}
          </button>
        );
      })}
      <button className="op coup" disabled={!a.escort.length || !!c.couped} onClick={() => act((g, ag) => A.startCoup(g, ag), 'open')}>
        <Crown size={18} />
        <span className="op-name">{t('game.country.ops.coup')}</span>
        <span className="op-meta mono">{t('game.country.ops.hostileForce', { n: A.operationStrength(s, a, countryId, 'coup') })}</span>
        <span className="sr-only">{t('game.country.ops.coupBlurb')}</span>
      </button>
    </div>
    <Details>
      {(['bank', 'tech', 'neutralize'] as OperationKind[]).map((op) => (
        <p key={op} className="hint-sm">
          <b>{operationLabel(op)}</b> · {operationBlurb(op)}
        </p>
      ))}
      <p className="hint-sm">
        <b>{t('game.country.ops.coup')}</b> · {t('game.country.ops.coupBlurb')}
      </p>
    </Details>
    </>
  );
}

/** Aba "Estação": a do jogador no país, ou o convite para abrir uma Célula. */
export function CountryStation({ countryId }: { countryId: string }) {
  const s = useGame();
  const a = player(s);
  if (!stationIn(a, countryId)) return <CountryVerdict countryId={countryId} focus="station" />;
  // O Cofre vem primeiro: guardar e retirar Carga é o que mais se procura aqui.
  return (
    <div className="cty-overview">
      <VaultPanel countryId={countryId} />
      <StationSection countryId={countryId} />
    </div>
  );
}

/** Painel antigo (gaveta/folha), mantido até a etapa 4 do ADR 0006. */
export function CountryPanel() {
  const { t } = useT();
  const s = useGame();
  const a = player(s);
  const id = useGameStore((st) => st.selected) ?? a.location;
  const c = s.countries[id];
  return (
    <div className="panel-scroll">
      <header className="cty-head">
        <div className="cty-title">
          <h2>{countryName(c.id)}</h2>
          <span className="mono cty-sub">
            <CountrySub countryId={id} />
          </span>
        </div>
      </header>
      <CountryOverview countryId={id} />
      <MarketPanel countryId={id} />
      <StationSection countryId={id} />
      {directorAt(a, id) && (
        <Section title={t('game.country.ops.title')}>
          <CountryOps countryId={id} />
        </Section>
      )}
    </div>
  );
}

function RivalsHere({ countryId }: { countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const rivals = s.agencies.filter((r) => !r.isPlayer && r.stations.some((x) => x.countryId === countryId));
  if (!rivals.length) return null;
  const canDenounce = !!stationIn(a, countryId) || directorAt(a, countryId);
  return (
    <Section title={t('game.country.rivals.title')}>
      {rivals.map((r) => {
        const st = r.stations.find((x) => x.countryId === countryId)!;
        return (
          <div key={r.id} className="row-line">
            <span>
              {r.name}
              <small className="mono"> · {stationName(st.level)}{st.interdicted ? ` · ${t('game.country.rivals.seized')}` : ''}</small>
            </span>
            <button
              className="btn sm"
              disabled={!canDenounce || a.cash < A.denounceCost(s, countryId)}
              title={canDenounce ? undefined : t('game.country.rivals.denounceNeeds')}
              onClick={() => act((g, ag) => A.denounce(g, ag, r.id, countryId), 'click')}
            >
              {t('game.country.rivals.denounce', { cost: fmt.money(A.denounceCost(s, countryId)) })}
            </button>
          </div>
        );
      })}
      <p className="hint-sm">{t('game.country.rivals.hint')}</p>
    </Section>
  );
}

function ContractsHere({ countryId }: { countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const list = s.contracts.filter((k) => k.countryId === countryId && k.status === 'accepted' && k.agencyId === a.id);
  if (!list.length) return null;
  return (
    <Section title={t('game.country.deliveries.title')}>
      {list.map((k) => (
        <div key={k.id} className="row-line">
          <span>
            {t('game.country.deliveries.line', { qty: k.qty, item: itemName(k.itemId), buyer: k.buyer })}
            <small className="mono"> · {t('game.country.deliveries.have', { n: cargoQty(a, k.itemId) })}</small>
          </span>
          <button className="btn sm primary" disabled={cargoQty(a, k.itemId) < k.qty} onClick={() => act((g, ag) => A.deliverContract(g, ag, k.id), 'sell')}>
            {t('game.country.deliveries.deliver', { reward: fmt.money(k.reward) })}
          </button>
        </div>
      ))}
    </Section>
  );
}

function StationSection({ countryId }: { countryId: string }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const openUnit = useOpenUnit();
  const act = useGameStore((st) => st.act);
  const here = directorAt(a, countryId);
  const st = stationIn(a, countryId);

  if (!st) {
    if (!here) return null;
    return (
      <Section title={t('game.country.station.title')}>
        <div className="row-line">
          <span>
            <Building2 size={14} /> {t('game.country.station.openCell')}
          </span>
          <button className="btn sm primary" data-tour="open-station" onClick={() => act((g, ag) => A.openStation(g, ag), 'buy')}>
            {t('game.country.station.open', { cost: fmt.money(A.stationCost(a, countryId, 1)) })}
          </button>
        </div>
      </Section>
    );
  }
  const spec = STATIONS[st.level];
  const next = st.level < 5 ? STATIONS[(st.level + 1) as StationLevel] : null;
  return (
    <Section title={t('game.country.station.titleLevel', { name: stationName(st.level) })} right={<span className="mono hint-sm">{t('game.country.station.units', { n: st.units.length, cap: spec.capacity })}</span>}>
      {st.interdicted && (
        <div className="alert bad">
          <ShieldAlert size={16} />
          <span>{t('game.country.station.seizedMsg', { n: st.detained.length })}</span>
          <div className="alert-actions">
            <button className="btn sm" disabled={a.cash < st.interdicted.fine} onClick={() => act((g, ag) => A.payFine(g, ag, countryId), 'buy')}>
              {t('game.country.station.payFine', { fine: fmt.money(st.interdicted.fine) })}
            </button>
            {here && (
              <button className="btn sm" onClick={() => act((g, ag) => A.appeal(g, ag), 'open')}>
                <Gavel size={14} /> {t('game.country.station.appeal')}
              </button>
            )}
          </div>
        </div>
      )}
      {here && next && !st.interdicted && (
        <div className="row-line">
          <span className="hint-sm">
            {t(next.wideIntel ? 'game.country.station.upgradeInfoWide' : 'game.country.station.upgradeInfo', { name: stationName(next.level), cap: next.capacity, income: fmt.money(next.income) })}
          </span>
          <button className="btn sm" onClick={() => act((g, ag) => A.upgradeStation(g, ag), 'buy')}>
            {t('game.country.station.upgrade', { cost: fmt.money(A.stationCost(a, countryId, next.level)) })}
          </button>
        </div>
      )}
      <div className="unit-list">
        {st.units.map((u) => (
          <UnitCard
            key={u.uid}
            unit={u}
            onOpen={openUnit}
            action={
              here && !st.interdicted ? (
                <button className="btn sm" onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'escort'))}>
                  {t('game.country.station.toEscort')}
                </button>
              ) : undefined
            }
          />
        ))}
        {!st.units.length && <Empty>{t('game.country.station.noUnits')}</Empty>}
      </div>
      {here && !st.interdicted && a.escort.length > 0 && (
        <details className="details">
          <summary>{t('game.country.station.leaveEscort')}</summary>
          <div className="unit-list">
            {a.escort.map((u) => (
              <UnitCard
                key={u.uid}
                unit={u}
                onOpen={openUnit}
                action={
                  <button
                    className="btn sm"
                    disabled={!spec.allows.includes(def(u.itemId).cls) || st.units.length >= spec.capacity}
                    onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'station'))}
                  >
                    {t('game.country.station.toStation')}
                  </button>
                }
              />
            ))}
          </div>
        </details>
      )}
    </Section>
  );
}
