import { useState } from 'react';
import { AlertTriangle, Boxes, Building2, FileSignature, Plane, Users } from 'lucide-react';
import * as A from '../../game/actions';
import { ITEMS } from '../../game/data/items';
import { OPERATION_LABEL, POSTURE_LABEL, STATIONS, THREAT_LABEL } from '../../game/data/rules';
import { fleetSpeed, maxCargo, sellPrice, usedCargo } from '../../game/market';
import { upkeepTotal } from '../../game/sim';
import { directorAt, formatDuration, player, postureIn, stationIn } from '../../game/state';
import type { OperationKind, ThreatReaction } from '../../game/types';
import { isPersonnel, REPAIR_MIN_LEVEL, repairCost } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { money, pct, tons } from '../fmt';
import { Empty, Section } from './bits';
import { UnitRow } from './UnitRow';

type Tab = 'force' | 'cargo' | 'stations' | 'teams' | 'contracts' | 'threats';

export function AgencyPanel() {
  const s = useGame();
  const a = player(s);
  const [tab, setTab] = useState<Tab>('force');
  const offers = s.contracts.filter((k) => k.status === 'offered').length;
  const tabs: { id: Tab; label: string; Icon: typeof Plane; badge?: number; hot?: boolean }[] = [
    { id: 'force', label: 'Frota', Icon: Plane },
    { id: 'cargo', label: 'Carga', Icon: Boxes, badge: a.cargo.length || undefined },
    { id: 'stations', label: 'Estações', Icon: Building2, badge: a.stations.length || undefined },
    { id: 'teams', label: 'Equipes', Icon: Users, badge: a.teams.length || undefined },
    { id: 'contracts', label: 'Contratos', Icon: FileSignature, badge: offers || undefined },
    { id: 'threats', label: 'Ameaças', Icon: AlertTriangle, badge: a.threats.length || undefined, hot: a.threats.length > 0 },
  ];
  return (
    <div className="agency">
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${t.hot ? ' hot' : ''}`}
            onClick={() => {
              audio.sfx('click');
              setTab(t.id);
            }}
          >
            <t.Icon size={16} />
            <span className="tab-label">{t.label}</span>
            {t.badge !== undefined && <span className="badge">{t.badge}</span>}
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
  const st = stationIn(a, a.location);
  const canRepair = !!st && !st.interdicted && st.level >= REPAIR_MIN_LEVEL && directorAt(a, a.location);
  const used = usedCargo(a);
  const max = maxCargo(a);
  const d = a.director;
  return (
    <>
      <Section title="Diretor">
        <div className="row-line">
          <span>
            <strong>{d.name}</strong>
            <small className="mono">
              {' '}
              · {d.status === 'free' ? (a.flight ? 'em voo' : `em ${s.countries[a.location].name}`) : d.status === 'detained' ? 'Detido' : d.status === 'kidnapped' ? 'Sequestrado' : 'morto'}
            </small>
          </span>
        </div>
      </Section>
      <Section title="Frota" right={<span className="mono hint-sm">{fleetSpeed(a)} km/h</span>}>
        <div className="cap">
          <span className="cap-bar">
            <span style={{ width: `${max ? Math.min(100, (used / max) * 100) : 100}%`, background: used > max ? 'var(--red)' : 'var(--amber)' }} />
          </span>
          <span className="mono hint-sm">
            {tons(used)} de {tons(max)} · Carga + Escolta (aeronaves de combate voam ao lado)
          </span>
        </div>
        <div className="unit-list">
          {a.fleet.map((u) => (
            <UnitRow
              key={u.uid}
              unit={u}
              action={
                <span className="row-actions">
                  {canRepair && u.injury?.kind === 'damaged' && (
                    <button className="btn sm" onClick={() => act((g, ag) => A.repair(g, ag, u.uid), 'buy')}>
                      Consertar {money(repairCost(u))}
                    </button>
                  )}
                  {a.fleet.length > 1 && (
                    <button className="btn sm ghost" onClick={() => act((g, ag) => A.dismiss(g, ag, u.uid), 'sell')}>
                      Vender
                    </button>
                  )}
                </span>
              }
            />
          ))}
        </div>
      </Section>
      <Section
        title="Escolta"
        right={
          a.escort.length > 0 && directorAt(a, a.location) ? (
            picking ? (
              <span className="row-actions">
                <button className="btn sm ghost" onClick={() => setPicking(null)}>
                  Cancelar
                </button>
                <button
                  className="btn sm primary"
                  disabled={!picking.length}
                  onClick={() => {
                    const r = act((g, ag) => A.formTeam(g, ag, 'escort', picking), 'open');
                    if (r.ok) setPicking(null);
                  }}
                >
                  Formar Equipe ({picking.length})
                </button>
              </span>
            ) : (
              <button className="btn sm" onClick={() => setPicking([])}>
                Destacar Equipe
              </button>
            )
          ) : undefined
        }
      >
        <div className="unit-list">
          {a.escort.map((u) => (
            <UnitRow
              key={u.uid}
              unit={u}
              selected={picking?.includes(u.uid)}
              onClick={picking ? () => setPicking(picking.includes(u.uid) ? picking.filter((x) => x !== u.uid) : [...picking, u.uid]) : undefined}
              action={
                picking ? undefined : (
                  <span className="row-actions">
                    {canRepair && u.injury?.kind === 'damaged' && (
                      <button className="btn sm" onClick={() => act((g, ag) => A.repair(g, ag, u.uid), 'buy')}>
                        Consertar {money(repairCost(u))}
                      </button>
                    )}
                    <button className="btn sm ghost" onClick={() => act((g, ag) => A.dismiss(g, ag, u.uid), 'sell')}>
                      Dispensar
                    </button>
                  </span>
                )
              }
            />
          ))}
          {!a.escort.length && <Empty>Escolta vazia. Contrate Pessoal ou aliste Unidades compradas.</Empty>}
        </div>
      </Section>
      <Section title="Manutenção">
        <div className="row-line">
          <span className="hint-sm">Mensal, de todas as Unidades (Escolta, Frota, Estações e Equipes).</span>
          <span className="num">{money(upkeepTotal(a))}/mês</span>
        </div>
        {a.arrears > 0 && (
          <div className="alert bad">
            <span>Máquinas paradas por Manutenção atrasada.</span>
            <button className="btn sm" onClick={() => act((g, ag) => A.payArrears(g, ag), 'buy')}>
              Quitar {money(a.arrears)}
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
  const here = directorAt(a, a.location);
  const c = s.countries[a.location];
  const st = stationIn(a, a.location);
  return (
    <Section title="Carga" right={<span className="mono hint-sm">{tons(usedCargo(a))} / {tons(maxCargo(a))}</span>}>
      {!a.cargo.length && <Empty>Porões vazios. Compre onde é barato e venda onde é caro.</Empty>}
      {a.cargo.map((l) => {
        const it = ITEMS[l.itemId];
        const sp = here ? sellPrice(c, l.itemId) : 0;
        const margin = sp ? sp / l.paidEach - 1 : 0;
        return (
          <div key={l.lid} className="cargo-row">
            <span className="cg-main">
              <span>
                {l.qty}× {it.name}
              </span>
              <small className="mono">
                pago {money(l.paidEach)} · {tons(it.weight * l.qty)}
                {sp ? (
                  <span className={margin >= 0 ? 'pos' : 'neg'}>
                    {' '}
                    · aqui {money(sp)} ({margin >= 0 ? '+' : ''}
                    {pct(margin)})
                  </span>
                ) : null}
              </small>
            </span>
            <span className="row-actions">
              {here && it.fieldable && (
                <button className="btn sm" onClick={() => act((g, ag) => A.enlist(g, ag, l.itemId), 'open')}>
                  Alistar 1
                </button>
              )}
              {here && st && !st.interdicted && (
                <button className="btn sm ghost" onClick={() => act((g, ag) => A.deposit(g, ag, l.itemId, l.qty))}>
                  Cofre
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
  const rivals = s.agencies.filter((r) => !r.isPlayer);
  return (
    <>
    <Section title="Estações">
      {!a.stations.length && <Empty>Nenhuma Estação. Abra uma Célula onde o Diretor estiver.</Empty>}
      {a.stations.map((st) => {
        const spec = STATIONS[st.level];
        return (
          <button key={st.countryId} className="station-row" onClick={() => select(st.countryId)}>
            <span className="st-level" data-level={st.level}>
              {st.level}
            </span>
            <span className="cg-main">
              <span>
                {s.countries[st.countryId].name} · {spec.name}
              </span>
              <small className="mono">
                {st.interdicted ? <span className="neg">Interditada · multa {money(st.interdicted.fine)}</span> : `${money(spec.income)}/dia base`} ·{' '}
                {st.units.length}/{spec.capacity} Unidades · {POSTURE_LABEL[postureIn(a, st.countryId)]}
              </small>
            </span>
          </button>
        );
      })}
    </Section>
    {rivals.length > 0 && (
      <Section title="Agências Rivais">
        {rivals.map((r) => (
          <div key={r.id} className="station-row">
            <span className="st-level rival-mark">◇</span>
            <span className="cg-main">
              <span>{r.name}</span>
              <small className="mono">
                {r.stations.length} Estação(ões):{' '}
                {r.stations.map((st) => (
                  <button key={st.countryId} className="link" onClick={() => select(st.countryId)}>
                    {s.countries[st.countryId].name}{' '}
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
  const act = useGameStore((st) => st.act);
  const selected = useGameStore((st) => st.selected);
  const select = useGameStore((st) => st.select);
  const [formFrom, setFormFrom] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const stationsWithUnits = a.stations.filter((x) => !x.interdicted && x.units.length);
  return (
    <>
      <Section title="Equipes">
        <p className="hint-sm">
          Equipes agem sem o Diretor: viajam por Voo Comercial (só Pessoal) ou num Cargueiro Destacado, fazem Operações Especiais em Combate Automático e nunca comerciam.
        </p>
        {!a.teams.length && <Empty>Nenhuma Equipe em campo. Destaque Unidades da Escolta (aba Frota) ou de uma Estação.</Empty>}
        {a.teams.map((t) => {
          const dest = selected && selected !== t.location ? selected : null;
          const allPersonnel = t.units.every(isPersonnel);
          const g = s.group;
          return (
            <div key={t.id} className="team">
              <header className="team-head">
                <strong>{t.name}</strong>
                <button className="mono hint-sm link" onClick={() => select(t.travel ? t.travel.to : t.location)}>
                  {t.travel
                    ? `→ ${s.countries[t.travel.to].name} · ${formatDuration(t.travel.arrive - s.time)}`
                    : `em ${s.countries[t.location].name}`}
                </button>
              </header>
              <div className="unit-list compact">
                {t.units.map((u) => (
                  <UnitRow key={u.uid} unit={u} />
                ))}
                {t.freighter && <UnitRow unit={t.freighter} />}
              </div>
              {t.spoils.map((l) => (
                <div key={l.lid} className="row-line spoils">
                  <span>
                    Capturado: {l.qty}× {ITEMS[l.itemId].name}
                  </span>
                  <span className="row-actions">
                    <button className="btn sm" onClick={() => act((gs, ag) => A.fenceSpoils(gs, ag, t.id, l.lid), 'sell')}>
                      Receptador {money(A.fenceValue(l))}
                    </button>
                  </span>
                </div>
              ))}
              {!t.travel && (
                <div className="team-actions">
                  {t.spoils.length > 0 && stationIn(a, t.location) && (
                    <button className="btn sm" onClick={() => act((gs, ag) => A.stashSpoils(gs, ag, t.id))}>
                      Guardar no Cofre
                    </button>
                  )}
                  {dest && (
                    <>
                      <button
                        className="btn sm"
                        disabled={!allPersonnel}
                        title={allPersonnel ? undefined : 'Só Pessoal voa em Voo Comercial'}
                        onClick={() => act((gs, ag) => A.sendTeam(gs, ag, t.id, dest, 'commercial'), 'depart')}
                      >
                        Voo Comercial → {s.countries[dest].name} ({money(A.commercialFare(t, dest))})
                      </button>
                      <button className="btn sm" onClick={() => act((gs, ag) => A.sendTeam(gs, ag, t.id, dest, 'freighter'), 'depart')}>
                        {t.freighter ? 'Cargueiro' : 'Cargueiro Destacado'} → {s.countries[dest].name}
                      </button>
                    </>
                  )}
                  {(['bank', 'tech', 'neutralize'] as OperationKind[]).map((op) => (
                    <button key={op} className="btn sm" disabled={!t.units.length} onClick={() => act((gs, ag) => A.teamOperation(gs, ag, t.id, op), 'open')}>
                      {OPERATION_LABEL[op]}
                    </button>
                  ))}
                  {g && !g.defeated && g.countryId === t.location && (
                    <button className="btn sm danger" onClick={() => act((gs, ag) => A.teamAttackGroup(gs, ag, t.id), 'open')}>
                      Atacar {g.name}
                    </button>
                  )}
                  {(a.director.status === 'kidnapped' || a.director.status === 'detained') && a.director.heldIn === t.location && (
                    <button className="btn sm danger" onClick={() => act((gs, ag) => A.teamRescue(gs, ag, t.id), 'open')}>
                      Resgatar o Diretor
                    </button>
                  )}
                  {directorAt(a, t.location) && (
                    <button className="btn sm ghost" onClick={() => act((gs, ag) => A.mergeTeam(gs, ag, t.id, 'escort'))}>
                      Voltar à Escolta
                    </button>
                  )}
                  {stationIn(a, t.location) && (
                    <button className="btn sm ghost" onClick={() => act((gs, ag) => A.mergeTeam(gs, ag, t.id, 'station'))}>
                      Ficar na Estação
                    </button>
                  )}
                </div>
              )}
              {!t.travel && !dest && <p className="hint-sm">Selecione um país no mapa para enviar a Equipe.</p>}
            </div>
          );
        })}
      </Section>
      {stationsWithUnits.length > 0 && (
        <Section title="Destacar de uma Estação">
          <select className="input" value={formFrom ?? ''} onChange={(e) => (setFormFrom(e.target.value || null), setPicks([]))}>
            <option value="">Escolha a Estação</option>
            {stationsWithUnits.map((x) => (
              <option key={x.countryId} value={x.countryId}>
                {s.countries[x.countryId].name}
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
                Formar Equipe ({picks.length})
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
  const offers = s.contracts.filter((k) => k.status === 'offered');
  const mine = s.contracts.filter((k) => k.agencyId === a.id && k.status === 'accepted');
  const row = (k: (typeof s.contracts)[number], action: React.ReactNode) => {
    const it = ITEMS[k.itemId];
    return (
      <div key={k.id} className="contract">
        <button className="link cg-main" onClick={() => select(k.countryId)}>
          <span>
            {k.qty}× {it.name}
          </span>
          <small className="mono">
            {k.buyer} · {s.countries[k.countryId].name} · {money(k.reward)} · +{k.reputation} Reputação
          </small>
          <small className="mono">
            {k.status === 'offered'
              ? `oferta expira em ${formatDuration(k.offerExpires - s.time)} · prazo ${formatDuration(k.deadline - s.time)}`
              : `entrega em ${formatDuration(k.deadline - s.time)}`}
          </small>
        </button>
        {action}
      </div>
    );
  };
  return (
    <>
      <Section title="Ativos">
        {!mine.length && <Empty>Nenhum Contrato aceito. São bônus: o lucro principal vem do Comércio.</Empty>}
        {mine.map((k) => row(k, null))}
      </Section>
      <Section title="Ofertas">
        {!offers.length && <Empty>Nenhuma oferta na mesa agora.</Empty>}
        {offers.map((k) =>
          row(
            k,
            <button className="btn sm primary" disabled={postureIn(a, k.countryId) === 'enemy'} onClick={() => act((g, ag) => A.acceptContract(g, ag, k.id), 'click')}>
              Aceitar
            </button>,
          ),
        )}
      </Section>
    </>
  );
}

const REACTIONS: { id: ThreatReaction; label: string; blurb: string }[] = [
  { id: 'lawyers', label: 'Advogados', blurb: 'Reduz a força de batidas e processos em 30%.' },
  { id: 'bribe', label: 'Suborno', blurb: 'Pode cancelar a ameaça; se falhar, a Exposição sobe.' },
  { id: 'reinforce', label: 'Reforço', blurb: 'Contrata segurança local para defender a Estação.' },
  { id: 'evacuate', label: 'Evacuar', blurb: 'Tira as Unidades da Estação como Equipe; ninguém fica Detido.' },
];

function ThreatsTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const select = useGameStore((st) => st.select);
  return (
    <Section title="Ameaças anunciadas">
      {!a.threats.length && <Empty>Nenhuma ameaça no radar. Exposição alta e governos hostis atraem atenção.</Empty>}
      {a.threats.map((t) => {
        const c = s.countries[t.countryId];
        return (
          <div key={t.id} className={`threat${t.cancelled ? ' cancelled' : ''}`}>
            <header className="threat-head">
              <button className="link" onClick={() => select(t.countryId)}>
                <strong>{THREAT_LABEL[t.kind]}</strong> · {c.name}
              </button>
              <span className="num neg">{formatDuration(t.strikesAt - s.time)}</span>
            </header>
            <small className="mono">
              Alvo: {t.target === 'station' ? 'a Estação' : 'o Diretor'} · força {t.strength}
              {t.hired ? ` · reforço ${t.hired}` : ''}
              {t.cancelled ? ' · cancelada por acordo' : ''}
            </small>
            {!t.cancelled && (
              <div className="reactions">
                {REACTIONS.filter((r) => A.reactionAvailable(a, t.id, r.id) || t.reactions.includes(r.id)).map((r) => {
                  const used = t.reactions.includes(r.id);
                  const cost = A.reactionCost(s, a, t.id, r.id);
                  return (
                    <button
                      key={r.id}
                      className="btn sm"
                      disabled={used || cost > a.cash}
                      title={r.blurb}
                      onClick={() => act((g, ag) => A.react(g, ag, t.id, r.id), 'click')}
                    >
                      {r.label}
                      {cost ? ` ${money(cost)}` : ''}
                      {r.id === 'bribe' && !used ? ` · ${pct(A.bribeChance(a, t.id))}` : ''}
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
