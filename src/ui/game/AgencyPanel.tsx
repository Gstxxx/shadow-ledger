import { useState } from 'react';
import { AlertTriangle, Boxes, Building2, FileSignature, Plane, Users } from 'lucide-react';
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

type Tab = 'force' | 'cargo' | 'stations' | 'teams' | 'contracts' | 'threats';

export function AgencyPanel() {
  const s = useGame();
  const a = player(s);
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('force');
  const offers = s.contracts.filter((k) => k.status === 'offered').length;
  const cargoUnits = a.cargo.reduce((x, l) => x + l.qty, 0);
  const tabs: { id: Tab; label: string; Icon: typeof Plane; badge?: number; badgeLabel?: string; hot?: boolean }[] = [
    { id: 'force', label: t('game.agency.tab.force'), Icon: Plane, badge: a.escort.length || undefined, badgeLabel: t('game.agency.tab.badge.force', { n: a.escort.length }) },
    { id: 'cargo', label: t('game.agency.tab.cargo'), Icon: Boxes, badge: cargoUnits || undefined, badgeLabel: t('game.agency.tab.badge.cargo', { n: cargoUnits }) },
    { id: 'stations', label: t('game.agency.tab.stations'), Icon: Building2, badge: a.stations.length || undefined, badgeLabel: t('game.agency.tab.badge.stations', { n: a.stations.length }) },
    { id: 'teams', label: t('game.agency.tab.teams'), Icon: Users, badge: a.teams.length || undefined, badgeLabel: t('game.agency.tab.badge.teams', { n: a.teams.length }) },
    { id: 'contracts', label: t('game.agency.tab.contracts'), Icon: FileSignature, badge: offers || undefined, badgeLabel: t('game.agency.tab.badge.contracts', { n: offers }) },
    {
      id: 'threats',
      label: t('game.agency.tab.threats'),
      Icon: AlertTriangle,
      badge: a.threats.length || undefined,
      badgeLabel: t('game.agency.tab.badge.threats', { n: a.threats.length }),
      hot: a.threats.length > 0,
    },
  ];
  const pick = (id: Tab) => {
    if (id === tab) return;
    audio.sfx('click');
    setTab(id);
  };
  return (
    <div className="agency">
      <nav className="tabs ag-tabs" role="tablist" aria-label={t('game.topbar.agency')}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            role="tab"
            data-tour={tb.id === 'contracts' ? 'tab-contracts' : tb.id === 'threats' ? 'tab-threats' : undefined}
            aria-selected={tab === tb.id}
            className={`tab${tb.hot ? ' hot' : ''}`}
            title={tb.badge ? `${tb.label}: ${tb.badgeLabel}` : tb.label}
            // Troca já no toque/pressão; o clique cobre teclado e leitores de tela.
            onPointerDown={(e) => {
              if (e.button === 0) pick(tb.id);
            }}
            onClick={() => pick(tb.id)}
          >
            <tb.Icon size={16} />
            <span className="tab-label">{tb.label}</span>
            {tb.badge !== undefined && (
              <span className="badge" aria-label={tb.badgeLabel}>
                {tb.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="panel-scroll">
        {tab === 'force' && <ForceTab />}
        {tab === 'cargo' && <CargoTab />}
        {tab === 'stations' && <StationsTab />}
        {tab === 'teams' && <TeamsTab />}
        {tab === 'contracts' && <ContractsTab />}
        {tab === 'threats' && <ThreatsTab />}
      </div>
    </div>
  );
}

function ForceTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const [picking, setPicking] = useState<string[] | null>(null);
  const openUnit = useOpenUnit();
  const { t, fmt } = useT();
  const d = a.director;
  return (
    <>
      <Section title={t('game.agency.director.title')}>
        <div className="row-line dir-line">
          <DirectorAvatar origin={a.origin} size={40} title={d.name} />
          <span>
            <strong>{d.name}</strong>
            <small className="mono">
              {' '}
              · {d.status === 'free' ? (a.flight ? t('game.agency.director.inFlight') : t('game.agency.director.inCountry', { country: countryName(a.location) })) : d.status === 'detained' ? t('game.agency.director.detained') : d.status === 'kidnapped' ? t('game.agency.director.kidnapped') : t('game.agency.director.dead')}
            </small>
          </span>
        </div>
      </Section>
      <Section title={t('game.agency.fleet.title')} right={<span className="mono hint-sm">{t('game.agency.fleet.speed', { speed: fleetSpeed(a) })}</span>}>
        <FleetSpace a={a} />
        <div className="unit-list">
          {a.fleet.map((u) => (
            <UnitCard key={u.uid} unit={u} onOpen={openUnit} />
          ))}
        </div>
      </Section>
      <Section
        title={t('game.agency.escort.title')}
        right={
          a.escort.length > 0 && directorAt(a, a.location) ? (
            picking ? (
              <span className="row-actions">
                <button className="btn sm ghost" onClick={() => setPicking(null)}>
                  {t('game.agency.escort.cancel')}
                </button>
                <button
                  className="btn sm primary"
                  disabled={!picking.length}
                  onClick={() => {
                    const r = act((g, ag) => A.formTeam(g, ag, 'escort', picking), 'open');
                    if (r.ok) setPicking(null);
                  }}
                >
                  {t('game.agency.escort.formTeam', { n: picking.length })}
                </button>
              </span>
            ) : (
              <button className="btn sm" onClick={() => setPicking([])}>
                {t('game.agency.escort.detachTeam')}
              </button>
            )
          ) : undefined
        }
      >
        <p className="hint-sm sec-hint">
          {picking
            ? t('game.agency.escort.pickHint')
            : t('game.agency.escort.hint')}
        </p>
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
          {!a.escort.length && <Empty>{t('game.agency.escort.empty')}</Empty>}
        </div>
      </Section>
      <Section title={t('game.agency.month.title')}>
        <UpkeepBalance a={a} />
        {a.arrears > 0 && (
          <div className="alert bad">
            <span>{t('game.agency.upkeep.arrears')}</span>
            <button className="btn sm" onClick={() => act((g, ag) => A.payArrears(g, ag), 'buy')}>
              {t('game.agency.upkeep.settle', { amount: fmt.money(a.arrears) })}
            </button>
          </div>
        )}
      </Section>
    </>
  );
}

function CargoTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const { t, fmt } = useT();
  const here = directorAt(a, a.location);
  const c = s.countries[a.location];
  const st = stationIn(a, a.location);
  return (
    <Section title={t('game.agency.cargo.title')} right={<span className="mono hint-sm">{fmt.tons(usedCargo(a))} / {fmt.tons(maxCargo(a))}</span>}>
      {!a.cargo.length && <Empty>{t('game.agency.cargo.empty')}</Empty>}
      {a.cargo.map((l) => {
        const it = ITEMS[l.itemId];
        const sp = here ? sellPrice(c, l.itemId) : 0;
        const margin = sp ? sp / l.paidEach - 1 : 0;
        return (
          <div key={l.lid} className="cargo-row">
            <span className="cg-main">
              <span>
                {t('game.qtyItem', { qty: l.qty, item: itemName(l.itemId) })}
              </span>
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
              {here && it.fieldable && (
                <button className="btn sm" onClick={() => act((g, ag) => A.enlist(g, ag, l.itemId), 'open')}>
                  {t('game.agency.cargo.enlist')}
                </button>
              )}
              {here && st && !st.interdicted && (
                <button className="btn sm ghost" onClick={() => act((g, ag) => A.deposit(g, ag, l.itemId, l.qty))}>
                  {t('game.agency.cargo.vault')}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </Section>
  );
}

function StationsTab() {
  const s = useGame();
  const a = player(s);
  const select = useGameStore((st) => st.select);
  const { t, fmt } = useT();
  const rivals = s.agencies.filter((r) => !r.isPlayer);
  return (
    <>
    <Section title={t('game.agency.stations.title')}>
      {!a.stations.length && <Empty>{t('game.agency.stations.empty')}</Empty>}
      {a.stations.map((st) => {
        const spec = STATIONS[st.level];
        return (
          <button key={st.countryId} className="station-row" onClick={() => select(st.countryId)}>
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
      })}
    </Section>
    {rivals.length > 0 && (
      <Section title={t('game.agency.stations.rivals')}>
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
      </Section>
    )}
    </>
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
  const stationsWithUnits = a.stations.filter((x) => !x.interdicted && x.units.length);
  return (
    <>
      <Section title={t('game.agency.teams.title')}>
        <p className="hint-sm">
          {t('game.agency.teams.hint')}
        </p>
        {!a.teams.length && <Empty>{t('game.agency.teams.empty')}</Empty>}
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
      {stationsWithUnits.length > 0 && (
        <Section title={t('game.agency.teams.detachFrom')}>
          <select className="input" value={formFrom ?? ''} onChange={(e) => (setFormFrom(e.target.value || null), setPicks([]))}>
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
  return (
    <>
      <Section title={t('game.agency.contracts.active')}>
        {!mine.length && <Empty>{t('game.agency.contracts.emptyActive')}</Empty>}
        {mine.map((k) => row(k, null))}
      </Section>
      <Section title={t('game.agency.contracts.offers')}>
        {!offers.length && <Empty>{t('game.agency.contracts.emptyOffers')}</Empty>}
        {offers.map((k) =>
          row(
            k,
            <button className="btn sm primary" disabled={postureIn(a, k.countryId) === 'enemy'} onClick={() => act((g, ag) => A.acceptContract(g, ag, k.id), 'click')}>
              {t('game.agency.contracts.accept')}
            </button>,
          ),
        )}
      </Section>
    </>
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
  return (
    <Section title={t('game.agency.threats.title')}>
      {!a.threats.length && <Empty>{t('game.agency.threats.empty')}</Empty>}
      {a.threats.map((th) => {
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
                      className="btn sm"
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
      })}
    </Section>
  );
}
