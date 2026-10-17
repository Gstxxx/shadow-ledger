import { useState } from 'react';
import { AlertTriangle, Building2, FileSignature, Plane, Shield, UserRound, Users } from 'lucide-react';
import * as A from '../../game/actions';
import { ITEMS } from '../../game/data/items';
import { STATIONS } from '../../game/data/rules';
import { fleetSpeed, maxCargo, sellPrice, usedCargo } from '../../game/market';
import { directorAt, formatDuration, player, postureIn, stationIn } from '../../game/state';
import type { OperationKind, ThreatReaction } from '../../game/types';
import { isPersonnel } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import type { Key } from '../../i18n';
import { countryName, itemName, operationLabel, postureLabel, stationName, threatLabel } from '../../i18n/lookup';
import { Empty, Section } from './bits';
import { UnitRow } from './UnitRow';
import { FleetSpace, UnitCard, UpkeepBalance } from './unit/UnitCard';
import { useOpenUnit } from './unit/DossierHost';
import './agency.css';
import { DirectorAvatar } from './DirectorAvatar';
import { cargoQty } from '../../game/cargo';
import { upkeepTotal } from '../../game/sim';
import { BigNumber, Details, ShortList, Verdict } from './stage/Verdict';
import { useStage } from './stage/context';
import { opportunities } from './market/model';
import type { Agency } from '../../game/types';

/** Diretor não pode voar (Detido, Sequestrado, morto). */
const d0 = (a: Agency) => a.director.status !== 'free';

export type AgencyTab = 'director' | 'fleet' | 'escort' | 'stations' | 'teams' | 'contracts' | 'threats';
type Tab = AgencyTab;

/** Abas da Agência com contadores (para o fichário do modal). */
export function useAgencyTabs() {
  const s = useGame();
  const a = player(s);
  const { t } = useT();
  const offers = s.contracts.filter((k) => k.status === 'offered').length;
  const cargoUnits = a.cargo.reduce((x, l) => x + l.qty, 0);
  return [
    { id: 'director' as Tab, label: t('game.agency.director.title'), icon: <UserRound size={16} />, alert: a.director.status !== 'free' || a.arrears > 0 },
    { id: 'fleet' as Tab, label: t('game.agency.fleet.title'), icon: <Plane size={16} />, count: cargoUnits || undefined },
    { id: 'escort' as Tab, label: t('game.agency.escort.title'), icon: <Shield size={16} />, count: a.escort.length || undefined },
    { id: 'stations' as Tab, label: t('game.agency.tab.stations'), icon: <Building2 size={16} />, count: a.stations.length || undefined },
    { id: 'teams' as Tab, label: t('game.agency.tab.teams'), icon: <Users size={16} />, count: a.teams.length || undefined },
    { id: 'contracts' as Tab, label: t('game.agency.tab.contracts'), icon: <FileSignature size={16} />, count: offers || undefined },
    { id: 'threats' as Tab, label: t('game.agency.tab.threats'), icon: <AlertTriangle size={16} />, count: a.threats.length || undefined, alert: a.threats.length > 0 },
  ];
}

/** Conteúdo de uma aba da Agência (o fichário fica com quem usa). */
export function AgencyTabBody({ tab }: { tab: AgencyTab }) {
  return (
    <div className="agency agency--bare">
      {tab === 'director' && <DirectorTab />}
      {tab === 'fleet' && <FleetTab />}
      {tab === 'escort' && <EscortTab />}
      {tab === 'stations' && <StationsTab />}
      {tab === 'teams' && <TeamsTab />}
      {tab === 'contracts' && <ContractsTab />}
      {tab === 'threats' && <ThreatsTab />}
    </div>
  );
}

export function AgencyPanel() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('director');
  const tabs = useAgencyTabs().map((x) => ({ id: x.id, label: x.label, icon: x.icon, badge: x.count, badgeLabel: String(x.count ?? ''), hot: !!x.alert }));
  const pick = (id: Tab) => {
    if (id === tab) return;
    audio.sfx('click');
    setTab(id);
  };
  return (
    <div className="agency">
      <nav className="g-tabs ag-tabs" role="tablist" aria-label={t('game.topbar.agency')}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            role="tab"
            data-tour={tb.id === 'contracts' ? 'tab-contracts' : tb.id === 'threats' ? 'tab-threats' : undefined}
            aria-selected={tab === tb.id}
            className={`g-tab${tb.hot ? ' g-tab--alert' : ''}`}
            title={tb.badge ? `${tb.label}: ${tb.badgeLabel}` : tb.label}
            // Troca já no toque/pressão; o clique cobre teclado e leitores de tela.
            onPointerDown={(e) => {
              if (e.button === 0) pick(tb.id);
            }}
            onClick={() => pick(tb.id)}
          >
            {tb.icon}
            <span className="tab-label">{tb.label}</span>
            {tb.badge !== undefined && (
              <span className={`g-badge${tb.hot ? ' g-badge--alert' : ''}`} aria-label={tb.badgeLabel}>
                {tb.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="panel-scroll">
        <AgencyTabBody tab={tab} />
      </div>
    </div>
  );
}

/** Diretor: "minha agência está bem?" — situação do Diretor, atrasos e o saldo do mês. */
function DirectorTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const { t, fmt } = useT();
  const d = a.director;
  const income = a.stations.reduce((x, st) => x + (st.interdicted ? 0 : STATIONS[st.level].income * 30), 0);
  const net = income - upkeepTotal(a);
  const signed = `${net > 0 ? '+' : ''}${fmt.money(net)}`;
  const held = d.status === 'detained' || d.status === 'kidnapped';
  return (
    <div className="ag-screen">
      {held ? (
        <Verdict
          tone="bad"
          action={
            <button className="btn primary" disabled={a.cash < (d.price ?? 0)} onClick={() => act((g, ag) => A.payRelease(g, ag), 'buy')}>
              {t(d.status === 'detained' ? 'game.overlay.payBail' : 'game.overlay.payRansom', { price: fmt.money(d.price ?? 0) })}
            </button>
          }
        >
          <b>{t(d.status === 'detained' ? 'game.overlay.banner.detained' : 'game.overlay.banner.kidnapped')}</b>
          {d.heldIn ? ` · ${countryName(d.heldIn)}` : ''}
        </Verdict>
      ) : a.arrears > 0 ? (
        <Verdict
          tone="bad"
          action={
            <button className="btn primary" onClick={() => act((g, ag) => A.payArrears(g, ag), 'buy')}>
              {t('game.agency.upkeep.settle', { amount: fmt.money(a.arrears) })}
            </button>
          }
        >
          {t('game.agency.upkeep.arrears')}
        </Verdict>
      ) : (
        <Verdict tone={net >= 0 ? 'good' : 'warn'} icon={<DirectorAvatar origin={a.origin} size={40} title={d.name} />}>
          <b>{d.name}</b> · {a.flight ? t('game.agency.director.inFlight') : t('game.agency.director.inCountry', { country: countryName(a.location) })}
        </Verdict>
      )}
      <BigNumber label={t('game.unit.balance.net')} value={signed} note={t('game.agency.upkeep.hint')} />
      <Details>
        <UpkeepBalance a={a} />
      </Details>
    </div>
  );
}

/** Frota: o avião, o que está na Carga e onde vale vender. */
function FleetTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const openUnit = useOpenUnit();
  const stage = useStage();
  const { t, fmt } = useT();
  const here = directorAt(a, a.location);
  const c = s.countries[a.location];
  const st = stationIn(a, a.location);
  const lines = a.cargo.map((l) => {
    const sp = here ? sellPrice(c, l.itemId) : 0;
    return { l, sp, margin: sp ? sp / l.paidEach - 1 : 0 };
  });
  const best = [...lines].filter((x) => x.sp && x.margin > 0).sort((x, y) => y.margin - x.margin)[0];
  return (
    <div className="ag-screen">
      {best ? (
        <Verdict
          tone="good"
          action={
            <button className="btn primary" onClick={() => stage?.push({ kind: 'item', countryId: a.location, itemId: best.l.itemId })}>
              {t('game.market.opp.sell')}
            </button>
          }
        >
          <b>{itemName(best.l.itemId)}</b> · {t('game.agency.cargo.here', { price: fmt.money(best.sp), margin: `+${fmt.pct(best.margin)}` })}
        </Verdict>
      ) : (
        (() => {
          // Sem lucro vendendo aqui: para onde levar a Carga (o melhor destino conhecido).
          const go = opportunities(s, a, a.location).find((o) => o.kind === 'sell-there' && !o.block);
          if (go)
            return (
              <Verdict
                tone="good"
                action={
                  <button className="btn primary" disabled={!!a.flight || d0(a)} onClick={() => act((g, ag) => A.travel(g, ag, go.to), 'depart')}>
                    <Plane size={16} /> {t('game.market.trade.flyTo', { country: countryName(go.to) })}
                  </button>
                }
              >
                <b>{itemName(go.itemId)}</b> · {t('game.market.opp.countryPays', { country: countryName(go.to) })} <b className="num">{fmt.money(go.sellEach)}</b>
              </Verdict>
            );
          return (
            <Verdict tone="neutral">
              {a.cargo.length ? t('game.unit.fleetSpace.free', { w: fmt.tons(Math.max(0, maxCargo(a) - usedCargo(a))) }) : t('game.agency.cargo.empty')}
            </Verdict>
          );
        })()
      )}
      <FleetSpace a={a} />
      <div className="cargo-list">
        <ShortList
          max={5}
          items={lines}
          render={({ l, sp, margin }) => {
            const it = ITEMS[l.itemId];
            return (
              <div key={l.lid} className="cargo-row">
                <span className="cg-main">
                  <span>{t('game.qtyItem', { qty: l.qty, item: itemName(l.itemId) })}</span>
                  <small className="mono">
                    {t('game.agency.cargo.paid', { price: fmt.money(l.paidEach), weight: fmt.tons(it.weight * l.qty) })}
                    {sp ? (
                      <span className={margin >= 0 ? 'pos' : 'neg'}>
                        {' '}
                        · {t('game.agency.cargo.here', { price: fmt.money(sp), margin: `${margin >= 0 ? '+' : ''}${fmt.pct(margin)}` })}
                      </span>
                    ) : null}
                  </small>
                </span>
                <span className="row-actions">
                  {here && sp > 0 && stage && (
                    <button className="btn sm" onClick={() => stage.push({ kind: 'item', countryId: a.location, itemId: l.itemId })}>
                      {t('game.market.opp.sell')}
                    </button>
                  )}
                  {here && it.fieldable && (
                    <button className="btn sm ghost" onClick={() => act((g, ag) => A.enlist(g, ag, l.itemId), 'open')}>
                      {t('game.agency.cargo.enlist')}
                    </button>
                  )}
                  {here && st && !st.interdicted && (
                    <button className="btn sm ghost" onClick={() => act((g, ag) => A.deposit(g, ag, l.itemId, l.qty))}>
                      {t('game.vault.storeAt', { country: countryName(a.location) })}
                    </button>
                  )}
                </span>
              </div>
            );
          }}
        />
      </div>
      <Details>
        <p className="hint-sm">
          {t('game.agency.fleet.title')} · {t('game.agency.fleet.speed', { speed: fleetSpeed(a) })}
        </p>
        <div className="unit-list">
          {a.fleet.map((u) => (
            <UnitCard key={u.uid} unit={u} onOpen={openUnit} />
          ))}
        </div>
      </Details>
    </div>
  );
}

/** Escolta: quem viaja e luta com o Diretor; destacar uma Equipe. */
function EscortTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const openUnit = useOpenUnit();
  const stage = useStage();
  const [picking, setPicking] = useState<string[] | null>(null);
  const { t } = useT();
  const canDetach = a.escort.length > 0 && directorAt(a, a.location);
  return (
    <div className="ag-screen">
      {!a.escort.length ? (
        <Verdict
          tone="warn"
          action={
            stage && directorAt(a, a.location) ? (
              <button className="btn primary" onClick={() => stage.open({ kind: 'country', id: a.location, tab: 'market' })}>
                {t('game.market.seg.hire')}
              </button>
            ) : undefined
          }
        >
          {t('game.agency.escort.empty')}
        </Verdict>
      ) : picking ? (
        <Verdict
          tone="neutral"
          action={
            <>
              <button
                className="btn primary"
                disabled={!picking.length}
                onClick={() => {
                  const r = act((g, ag) => A.formTeam(g, ag, 'escort', picking), 'open');
                  if (r.ok) setPicking(null);
                }}
              >
                {t('game.agency.escort.formTeam', { n: picking.length })}
              </button>
            </>
          }
          secondary={
            <button className="btn ghost" onClick={() => setPicking(null)}>
              {t('game.agency.escort.cancel')}
            </button>
          }
        >
          {t('game.agency.escort.pickHint')}
        </Verdict>
      ) : (
        <Verdict
          tone="neutral"
          icon={<Shield size={26} />}
          action={
            canDetach ? (
              <button className="btn ghost" onClick={() => setPicking([])}>
                {t('game.agency.escort.detachTeam')}
              </button>
            ) : undefined
          }
        >
          {t('game.agency.tab.badge.force', { n: a.escort.length })}
        </Verdict>
      )}
      <div className="unit-list">
        {a.escort.map((u) =>
          picking ? (
            <UnitRow
              key={u.uid}
              unit={u}
              selected={picking.includes(u.uid)}
              onClick={() => setPicking(picking.includes(u.uid) ? picking.filter((x) => x !== u.uid) : [...picking, u.uid])}
            />
          ) : (
            <UnitCard key={u.uid} unit={u} onOpen={openUnit} />
          ),
        )}
      </div>
      <Details>
        <p className="hint-sm">{t('game.agency.escort.hint')}</p>
      </Details>
    </div>
  );
}

function StationsTab() {
  const s = useGame();
  const a = player(s);
  const select = useGameStore((st) => st.select);
  const { t, fmt } = useT();
  const rivals = s.agencies.filter((r) => !r.isPlayer);
  const stage = useStage();
  const seized = a.stations.find((x) => x.interdicted);
  const income = a.stations.reduce((x, st) => x + (st.interdicted ? 0 : STATIONS[st.level].income), 0);
  const open = (id: string) => (stage ? stage.open({ kind: 'country', id, tab: 'station' }) : select(id));
  return (
    <div className="ag-screen">
    {seized ? (
      <Verdict tone="bad" action={<button className="btn primary" onClick={() => open(seized.countryId)}>{countryName(seized.countryId)}</button>}>
        <b>{countryName(seized.countryId)}</b> · {t('game.agency.stations.seizedFine', { fine: fmt.money(seized.interdicted!.fine) })}
      </Verdict>
    ) : a.stations.length ? (
      <Verdict tone="good" icon={<Building2 size={26} />}>
        {t('game.agency.tab.badge.stations', { n: a.stations.length })} · <b className="num">{t('game.agency.stations.incomeBase', { income: fmt.money(income) })}</b>
      </Verdict>
    ) : (
      <Verdict tone="neutral" icon={<Building2 size={26} />}>
        {t('game.agency.stations.empty')}
      </Verdict>
    )}
    <div className="station-list">
      <ShortList max={5} items={a.stations} render={(st) => {
        const spec = STATIONS[st.level];
        return (
          <button key={st.countryId} className="station-row" onClick={() => open(st.countryId)}>
            <span className="st-level" data-level={st.level}>
              {st.level}
            </span>
            <span className="cg-main">
              <span>
                {countryName(st.countryId)} · {stationName(st.level)}
              </span>
              <small className="mono">
                {st.interdicted ? <span className="neg">{t('game.agency.stations.seizedFine', { fine: fmt.money(st.interdicted.fine) })}</span> : t('game.agency.stations.incomeBase', { income: fmt.money(spec.income) })} ·{' '}
                {t('game.agency.stations.units', { n: st.units.length, cap: spec.capacity })} · {postureLabel(postureIn(a, st.countryId))}
              </small>
            </span>
          </button>
        );
      }} />
    </div>
    {rivals.length > 0 && (
      <Details label={t('game.agency.stations.rivals')}>
        {rivals.map((r) => (
          <div key={r.id} className="station-row">
            <span className="st-level rival-mark">◇</span>
            <span className="cg-main">
              <span>{r.name}</span>
              <small className="mono">
                {t('game.agency.stations.rivalStations', { n: r.stations.length })}{' '}
                {r.stations.map((st) => (
                  <button key={st.countryId} className="link" onClick={() => select(st.countryId)}>
                    {countryName(st.countryId)}{' '}
                  </button>
                ))}
              </small>
            </span>
          </div>
        ))}
      </Details>
    )}
    </div>
  );
}

function TeamsTab() {
  const s = useGame();
  const a = player(s);
  const openUnit = useOpenUnit();
  const act = useGameStore((st) => st.act);
  const selected = useGameStore((st) => st.selected);
  const select = useGameStore((st) => st.select);
  const { t, fmt } = useT();
  const [formFrom, setFormFrom] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const stage = useStage();
  const stationsWithUnits = a.stations.filter((x) => !x.interdicted && x.units.length);
  return (
    <>
      <Verdict
        tone="neutral"
        icon={<Users size={26} />}
        action={
          !a.teams.length && a.escort.length > 0 && stage ? (
            <button className="btn ghost" onClick={() => stage.replace({ kind: 'agency', tab: 'escort' })}>
              {t('game.agency.escort.detachTeam')}
            </button>
          ) : undefined
        }
      >
        {a.teams.length ? t('game.agency.tab.badge.teams', { n: a.teams.length }) : t('game.agency.teams.empty')}
      </Verdict>
      {a.teams.length > 0 && (
      <Section title={t('game.agency.teams.title')}>
        {a.teams.map((tm) => {
          const dest = selected && selected !== tm.location ? selected : null;
          const allPersonnel = tm.units.every(isPersonnel);
          const g = s.group;
          return (
            <div key={tm.id} className="team">
              <header className="team-head">
                <strong>{tm.name}</strong>
                <button className="mono hint-sm link" onClick={() => select(tm.travel ? tm.travel.to : tm.location)}>
                  {tm.travel
                    ? t('game.agency.teams.travelTo', { country: countryName(tm.travel.to), time: formatDuration(tm.travel.arrive - s.time) })
                    : t('game.agency.teams.at', { country: countryName(tm.location) })}
                </button>
              </header>
              <div className="unit-list compact">
                {tm.units.map((u) => (
                  <UnitCard key={u.uid} unit={u} onOpen={openUnit} />
                ))}
                {tm.freighter && <UnitCard unit={tm.freighter} onOpen={openUnit} />}
              </div>
              {tm.spoils.map((l) => (
                <div key={l.lid} className="row-line spoils">
                  <span>
                    {t('game.agency.teams.captured', { qty: l.qty, item: itemName(l.itemId) })}
                  </span>
                  <span className="row-actions">
                    {l.fresh && !tm.travel && (
                      <button className="btn sm" onClick={() => act((gs, ag) => A.fenceSpoils(gs, ag, tm.id, l.lid), 'sell')}>
                        {t('game.agency.teams.fence', { value: fmt.money(A.fenceValue(l)) })}
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!tm.travel && (
                <div className="team-actions">
                  {tm.spoils.length > 0 && stationIn(a, tm.location) && (
                    <button className="btn sm" onClick={() => act((gs, ag) => A.stashSpoils(gs, ag, tm.id))}>
                      {t('game.agency.teams.stash')}
                    </button>
                  )}
                  {tm.spoils.length > 0 && directorAt(a, tm.location) && (
                    <button className="btn sm" onClick={() => act((gs, ag) => A.handSpoils(gs, ag, tm.id))}>
                      {t('game.agency.teams.handOver')}
                    </button>
                  )}
                  {dest && (
                    <>
                      <button
                        className="btn sm"
                        disabled={!allPersonnel}
                        title={allPersonnel ? undefined : t('game.agency.teams.commercialOnly')}
                        onClick={() => act((gs, ag) => A.sendTeam(gs, ag, tm.id, dest, 'commercial'), 'depart')}
                      >
                        {t('game.agency.teams.commercial', { country: countryName(dest), fare: fmt.money(A.commercialFare(tm, dest)) })}
                      </button>
                      <button className="btn sm" onClick={() => act((gs, ag) => A.sendTeam(gs, ag, tm.id, dest, 'freighter'), 'depart')}>
                        {t(tm.freighter ? 'game.agency.teams.freighter' : 'game.agency.teams.freighterDetach', { country: countryName(dest) })}
                      </button>
                    </>
                  )}
                  {(['bank', 'tech', 'neutralize'] as OperationKind[]).map((op) => (
                    <button key={op} className="btn sm" disabled={!tm.units.length} onClick={() => act((gs, ag) => A.teamOperation(gs, ag, tm.id, op), 'open')}>
                      {operationLabel(op)}
                    </button>
                  ))}
                  {s.agencies
                    .filter((r) => !r.isPlayer && r.stations.some((x) => x.countryId === tm.location && !x.interdicted))
                    .map((r) => (
                      <span key={r.id} className="row-actions">
                        <button className="btn sm danger" disabled={!tm.units.length} onClick={() => act((gs, ag) => A.sabotageStation(gs, ag, tm.id, r.id), 'open')}>
                          {t('game.agency.teams.sabotage', { name: r.name })}
                        </button>
                        <button className="btn sm danger" disabled={!tm.units.length} onClick={() => act((gs, ag) => A.raidVault(gs, ag, tm.id, r.id), 'open')}>
                          {t('game.agency.teams.raidVault')}
                        </button>
                      </span>
                    ))}
                  {g && !g.defeated && g.countryId === tm.location && (
                    <button className="btn sm danger" onClick={() => act((gs, ag) => A.teamAttackGroup(gs, ag, tm.id), 'open')}>
                      {t('game.agency.teams.attack', { name: g.name })}
                    </button>
                  )}
                  {(a.director.status === 'kidnapped' || a.director.status === 'detained') && a.director.heldIn === tm.location && (
                    <button className="btn sm danger" onClick={() => act((gs, ag) => A.teamRescue(gs, ag, tm.id), 'open')}>
                      {t('game.agency.teams.rescue')}
                    </button>
                  )}
                  {directorAt(a, tm.location) && (
                    <button className="btn sm ghost" onClick={() => act((gs, ag) => A.mergeTeam(gs, ag, tm.id, 'escort'))}>
                      {t('game.agency.teams.backToEscort')}
                    </button>
                  )}
                  {stationIn(a, tm.location) && (
                    <button className="btn sm ghost" onClick={() => act((gs, ag) => A.mergeTeam(gs, ag, tm.id, 'station'))}>
                      {t('game.agency.teams.stayStation')}
                    </button>
                  )}
                </div>
              )}
              {!tm.travel && !dest && <p className="hint-sm">{t('game.agency.teams.pickCountry')}</p>}
            </div>
          );
        })}
      </Section>
      )}
      <Details>
        <p className="hint-sm">{t('game.agency.teams.hint')}</p>
      </Details>
      {stationsWithUnits.length > 0 && (
        <Section title={t('game.agency.teams.detachFrom')}>
          <select className="input g-input" value={formFrom ?? ''} onChange={(e) => (setFormFrom(e.target.value || null), setPicks([]))}>
            <option value="">{t('game.agency.teams.chooseStation')}</option>
            {stationsWithUnits.map((x) => (
              <option key={x.countryId} value={x.countryId}>
                {countryName(x.countryId)}
              </option>
            ))}
          </select>
          {formFrom && (
            <>
              <div className="unit-list">
                {(stationIn(a, formFrom)?.units ?? []).map((u) => (
                  <UnitRow
                    key={u.uid}
                    unit={u}
                    selected={picks.includes(u.uid)}
                    onClick={() => setPicks(picks.includes(u.uid) ? picks.filter((x) => x !== u.uid) : [...picks, u.uid])}
                  />
                ))}
              </div>
              <button
                className="btn sm primary"
                disabled={!picks.length}
                onClick={() => {
                  const r = act((gs, ag) => A.formTeam(gs, ag, { stationCountry: formFrom }, picks), 'open');
                  if (r.ok) {
                    setPicks([]);
                    setFormFrom(null);
                  }
                }}
              >
                {t('game.agency.escort.formTeam', { n: picks.length })}
              </button>
            </>
          )}
        </Section>
      )}
    </>
  );
}

function ContractsTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const select = useGameStore((st) => st.select);
  const { t, fmt } = useT();
  const offers = s.contracts.filter((k) => k.status === 'offered');
  const mine = s.contracts.filter((k) => k.agencyId === a.id && k.status === 'accepted');
  const row = (k: (typeof s.contracts)[number], action: React.ReactNode) => {
    return (
      <div key={k.id} className="contract">
        <button className="link cg-main" onClick={() => select(k.countryId)}>
          <span>
            {t('game.qtyItem', { qty: k.qty, item: itemName(k.itemId) })}
          </span>
          <small className="mono">
            {t('game.agency.contracts.meta', { buyer: k.buyer, country: countryName(k.countryId), reward: fmt.money(k.reward), rep: k.reputation })}
          </small>
          <small className="mono">
            {k.status === 'offered'
              ? t('game.agency.contracts.offerTiming', { expires: formatDuration(k.offerExpires - s.time), deadline: formatDuration(k.deadline - s.time) })
              : t('game.agency.contracts.deliveryIn', { time: formatDuration(k.deadline - s.time) })}
          </small>
        </button>
        {action}
      </div>
    );
  };
  const ready = mine.find((k) => cargoQty(a, k.itemId) >= k.qty);
  const stage = useStage();
  return (
    <div className="ag-screen">
      {ready ? (
        <Verdict
          tone="good"
          action={
            <button className="btn primary" onClick={() => (stage ? stage.open({ kind: 'country', id: ready.countryId, tab: 'overview' }) : select(ready.countryId))}>
              {countryName(ready.countryId)}
            </button>
          }
        >
          {t('game.country.deliveries.line', { qty: ready.qty, item: itemName(ready.itemId), buyer: ready.buyer })} · <b className="num">{fmt.money(ready.reward)}</b>
        </Verdict>
      ) : (
        <Verdict tone="neutral" icon={<FileSignature size={26} />}>
          {offers.length ? t('game.agency.tab.badge.contracts', { n: offers.length }) : mine.length ? t('game.agency.contracts.active') : t('game.agency.contracts.emptyActive')}
        </Verdict>
      )}
      {mine.length > 0 && (
        <Section title={t('game.agency.contracts.active')}>
          <ShortList max={3} items={mine} render={(k) => row(k, null)} />
        </Section>
      )}
      <Section title={t('game.agency.contracts.offers')}>
        {!offers.length && <Empty>{t('game.agency.contracts.emptyOffers')}</Empty>}
        <ShortList max={3} items={offers} render={(k) =>
          row(
            k,
            <button className="btn sm primary" disabled={postureIn(a, k.countryId) === 'enemy'} onClick={() => act((g, ag) => A.acceptContract(g, ag, k.id), 'click')}>
              {t('game.agency.contracts.accept')}
            </button>,
          )} />
      </Section>
    </div>
  );
}

const REACTIONS: { id: ThreatReaction; label: Key; blurb: Key }[] = [
  { id: 'lawyers', label: 'game.agency.reaction.lawyers', blurb: 'game.agency.reaction.lawyers.blurb' },
  { id: 'bribe', label: 'game.agency.reaction.bribe', blurb: 'game.agency.reaction.bribe.blurb' },
  { id: 'reinforce', label: 'game.agency.reaction.reinforce', blurb: 'game.agency.reaction.reinforce.blurb' },
  { id: 'evacuate', label: 'game.agency.reaction.evacuate', blurb: 'game.agency.reaction.evacuate.blurb' },
];

function ThreatsTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const select = useGameStore((st) => st.select);
  const { t, fmt } = useT();
  const stage = useStage();
  // "O que ataca primeiro e o que eu faço?" (docs/UX-RULES.md): a mais urgente e a reação mais forte disponível.
  const live = a.threats.filter((x) => !x.cancelled).sort((x, y) => x.strikesAt - y.strikesAt);
  const next = live[0];
  const PREF: ThreatReaction[] = ['evacuate', 'reinforce', 'bribe', 'lawyers'];
  const pick = next && PREF.find((id) => A.reactionAvailable(a, next.id, id) && !next.reactions.includes(id) && A.reactionCost(s, a, next.id, id) <= a.cash);
  const pickR = pick && REACTIONS.find((r) => r.id === pick)!;
  return (
    <div className="ag-screen">
    {next ? (
      <Verdict
        tone="bad"
        action={
          pickR ? (
            <button className="btn primary" title={t(pickR.blurb)} onClick={() => act((g, ag) => A.react(g, ag, next.id, pickR.id), 'click')}>
              {t(pickR.label)}
              {A.reactionCost(s, a, next.id, pickR.id) ? ` ${fmt.money(A.reactionCost(s, a, next.id, pickR.id))}` : ''}
            </button>
          ) : undefined
        }
        secondary={
          <button className="btn ghost" onClick={() => (stage ? stage.open({ kind: 'country', id: next.countryId, tab: 'overview' }) : select(next.countryId))}>
              {countryName(next.countryId)}
            </button>
        }
      >
        <b>{threatLabel(next.kind)}</b> · {countryName(next.countryId)} · <b className="num">{formatDuration(next.strikesAt - s.time)}</b>
      </Verdict>
    ) : (
      <Verdict tone="good">{t('game.agency.threats.empty')}</Verdict>
    )}
    {a.threats.length > 0 && (
    <Section title={t('game.agency.threats.title')}>
      <ShortList max={3} items={a.threats} render={(th) => {
        return (
          <div key={th.id} className={`threat${th.cancelled ? ' cancelled' : ''}`}>
            <header className="threat-head">
              <button className="link" onClick={() => select(th.countryId)}>
                <strong>{threatLabel(th.kind)}</strong> · {countryName(th.countryId)}
              </button>
              <span className="num neg">{formatDuration(th.strikesAt - s.time)}</span>
            </header>
            <small className="mono">
              {t('game.agency.threats.target', { target: t(th.target === 'station' ? 'game.agency.threats.targetStation' : 'game.agency.threats.targetDirector'), n: th.strength })}
              {th.hired ? ` · ${t('game.agency.threats.reinforced', { n: th.hired })}` : ''}
              {th.cancelled ? ` · ${t('game.agency.threats.cancelled')}` : ''}
            </small>
            {!th.cancelled && (
              <div className="reactions">
                {REACTIONS.filter((r) => A.reactionAvailable(a, th.id, r.id) || th.reactions.includes(r.id)).map((r) => {
                  const used = th.reactions.includes(r.id);
                  const cost = A.reactionCost(s, a, th.id, r.id);
                  return (
                    <button
                      key={r.id}
                      className="btn sm ghost"
                      disabled={used || cost > a.cash}
                      title={t(r.blurb)}
                      onClick={() => act((g, ag) => A.react(g, ag, th.id, r.id), 'click')}
                    >
                      {t(r.label)}
                      {cost ? ` ${fmt.money(cost)}` : ''}
                      {r.id === 'bribe' && !used ? ` · ${fmt.pct(A.bribeChance(a, th.id))}` : ''}
                      {used ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }} />
    </Section>
    )}
    </div>
  );
}
