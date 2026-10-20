import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { GActionBar, GModal } from '../../../art';
import { directorAt, player, stationIn } from '../../../game/state';
import { isLocked } from '../../../game/tutorial/locks';
import { AlarmIcon } from '../fx/ScreenFx';
import { PixelIcon } from '../../../art';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import { classLabel, countryName, itemName } from '../../../i18n/lookup';
import { def } from '../../../game/units';
import { AgencyTabBody, useAgencyTabs } from '../AgencyPanel';
import type { AgencyTab } from '../AgencyPanel';
import { CountryOps, CountryOverview, CountryStation, CountrySub } from '../CountryPanel';
import { MarketPanel } from '../market/MarketPanel';
import { ItemTrade } from '../market/ItemTrade';
import type { CountryTab, StageApi, StageModal } from './context';
import { UnitDossier, findUnit } from '../unit/UnitDossier';
import { CombatBoard, useCombatBoardBadge } from '../combat-board/CombatBoard';
import type { CombatBoardTab } from '../combat-board/CombatBoard';
import './stage.css';

/** Modal central do palco (ADR 0006): País, Agência ou Item, um por vez, com voltar. */
export function StageModals({ stage }: { stage: StageApi }) {
  const { t } = useT();
  const s = useGame();
  const a = player(s);
  const agencyTabs = useAgencyTabs();
  const m = stage.current;
  const selected = useGameStore((st) => st.selected);
  const select = useGameStore((st) => st.select);

  // Links para outro país (Rivais, faixa de preços, Oportunidades) trocam o país do modal; do item, abrem o país.
  const last = useRef(selected);
  useEffect(() => {
    if (selected === last.current) return;
    last.current = selected;
    if (!selected || !m) return;
    if (m.kind === 'country' && m.id !== selected) stage.replace({ ...m, id: selected });
    else if (m.kind === 'item' && m.countryId !== selected) stage.push({ kind: 'country', id: selected, tab: 'market' });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prévia e Combate ocupam o centro: o modal do palco fecha quando um deles começa.
  const fight = !!(s.pendingCombat || s.combat);
  useEffect(() => {
    if (fight && m) stage.close();
  }, [fight, m]); // eslint-disable-line react-hooks/exhaustive-deps
  // Decolar devolve o palco ao mapa para o jogador ver a rota (o mapa enquadra o voo).
  const flightKey = a.flight ? `${a.flight.from}>${a.flight.to}@${a.flight.depart}` : null;
  useEffect(() => {
    if (flightKey) stage.close();
  }, [flightKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => stage.close(), [stage]);
  const back = stage.canBack ? stage.back : undefined;
  if (!m) return null;

  if (m.kind === 'country') {
    const id = m.id;
    const here = directorAt(a, id);
    const tabs: { id: CountryTab; label: string; icon: JSX.Element; count?: number }[] = [
      { id: 'overview', label: t('game.topbar.country'), icon: <PixelIcon id="pais" size={20} /> },
      { id: 'market', label: t('game.country.market'), icon: <PixelIcon id="mercado" size={20} /> },
      // Preset Tutorial: Operações travadas no motor, então a aba nem aparece.
      ...(isLocked(s, 'operations') ? [] : [{ id: 'ops' as CountryTab, label: t('game.country.ops.title'), icon: <AlertTriangle size={16} /> }]),
      { id: 'station', label: t('game.country.station.title'), icon: <PixelIcon id="estacao" size={20} />, count: stationIn(a, id)?.units.length || undefined },
    ];
    return (
      <GModal
        open
        size="lg"
        variant="command"
        tone={here ? 'action' : 'intel'}
        onClose={close}
        onBack={back}
        backLabel={t('common.back')}
        closeLabel={t('common.close')}
        kicker={<CountrySub countryId={id} />}
        title={countryName(id)}
        tabs={tabs}
        tab={m.tab}
        onTab={(tab) => {
          if (selected !== id) select(id);
          stage.replace({ ...m, tab: tab as CountryTab });
        }}
        tabsLabel={countryName(id)}
        tabsPlacement="auto"
        contentKey={`country-${id}`}
      >
        <div className="stage-body">
          {m.tab === 'overview' && <CountryOverview countryId={id} />}
          {m.tab === 'market' && <MarketPanel countryId={id} />}
          {m.tab === 'ops' && !isLocked(s, 'operations') && <CountryOps countryId={id} />}
          {m.tab === 'station' && <CountryStation countryId={id} />}
        </div>
      </GModal>
    );
  }

  if (m.kind === 'agency') {
    return (
      <GModal
        open
        size="lg"
        variant="command"
        onClose={close}
        onBack={back}
        backLabel={t('common.back')}
        closeLabel={t('common.close')}
        kicker={a.director.name}
        title={a.name}
        tabs={agencyTabs}
        tab={m.tab}
        onTab={(tab) => stage.replace({ kind: 'agency', tab: tab as AgencyTab })}
        tabsLabel={t('game.topbar.agency')}
        tabsPlacement="auto"
        contentKey="agency"
      >
        <div className="stage-body">
          <AgencyTabBody tab={m.tab} />
        </div>
      </GModal>
    );
  }

  if (m.kind === 'combat') {
    return (
      <GModal
        open
        size="lg"
        variant="command"
        tone="action"
        onClose={close}
        onBack={back}
        backLabel={t('common.back')}
        closeLabel={t('common.close')}
        kicker={a.name}
        title={t('combat.board.title')}
        tabs={[
          { id: 'contracts', label: t('combat.board.tab.contracts'), icon: <PixelIcon id="contratos" size={20} /> },
          { id: 'hunts', label: t('combat.board.tab.hunts'), icon: <PixelIcon id="cacadas" size={20} /> },
        ]}
        tab={m.tab}
        onTab={(tab) => stage.replace({ kind: 'combat', tab: tab as CombatBoardTab })}
        tabsLabel={t('combat.board.title')}
        tabsPlacement="auto"
        contentKey="combat-board"
      >
        <div className="stage-body">
          <CombatBoard tab={m.tab} />
        </div>
      </GModal>
    );
  }

  if (m.kind === 'unit') {
    const found = findUnit(a, m.uid);
    if (!found) return null;
    return (
      <GModal
        open
        size="lg"
        variant="command"
        onClose={close}
        onBack={back}
        backLabel={t('common.back')}
        closeLabel={t('common.close')}
        kicker={classLabel(def(found.unit.itemId).cls)}
        title={found.unit.name}
        contentKey={`unit-${m.uid}`}
      >
        <UnitDossier uid={m.uid} embedded onClose={back ?? close} />
      </GModal>
    );
  }

  const it = def(m.itemId);
  return (
    <GModal
      open
      size="lg"
      variant="command"
      tone="action"
      onClose={close}
      onBack={back}
      backLabel={t('common.back')}
      closeLabel={t('common.close')}
      kicker={`${classLabel(it.cls)} · ${countryName(m.countryId)}`}
      title={itemName(m.itemId)}
      contentKey={`item-${m.countryId}-${m.itemId}`}
    >
      <div className="stage-body">
        <ItemTrade countryId={m.countryId} itemId={m.itemId} initialSide={m.side} />
      </div>
    </GModal>
  );
}

type DockId = 'country' | 'market' | 'agency' | 'combat' | 'threats';

/** Barra de ações sobre o mapa: País · Mercado · Agência · Ameaças. */
export function StageDock({ stage, compact }: { stage: StageApi; compact?: boolean }) {
  const { t } = useT();
  const s = useGame();
  const a = player(s);
  const selected = useGameStore((st) => st.selected) ?? a.location;
  const combatBadge = useCombatBoardBadge();
  const m = stage.current;
  const active: DockId | undefined =
    m?.kind === 'country' ? (m.tab === 'market' ? 'market' : 'country') : m?.kind === 'agency' ? (m.tab === 'threats' ? 'threats' : 'agency') : m?.kind === 'item' ? 'market' : m?.kind === 'combat' ? 'combat' : undefined;
  const items = [
    { id: 'country', label: countryName(selected), icon: <PixelIcon id="pais" size={32} /> },
    { id: 'market', label: t('game.country.market'), icon: <PixelIcon id="mercado" size={32} /> },
    { id: 'agency', label: t('game.topbar.agency'), icon: <PixelIcon id="agencia" size={32} />, alert: a.director.status !== 'free' || a.arrears > 0 },
    { id: 'combat', label: t('combat.board.dock'), icon: <PixelIcon id="combate" size={32} />, count: combatBadge || undefined },
    { id: 'threats', label: t('game.agency.tab.threats'), icon: a.threats.length ? <AlarmIcon ring={a.threats.length} small /> : <PixelIcon id="ameacas" size={32} />, count: a.threats.length || undefined, alert: a.threats.length > 0 },
  ];
  const onSelect = (id: string) => {
    const want: StageModal =
      id === 'country'
        ? { kind: 'country', id: selected, tab: 'overview' }
        : id === 'market'
          ? { kind: 'country', id: selected, tab: 'market' }
          : id === 'agency'
            ? { kind: 'agency', tab: 'director' }
            : id === 'combat'
              ? { kind: 'combat', tab: 'contracts' }
              : { kind: 'agency', tab: 'threats' };
    if (active === id) stage.close();
    else stage.open(want);
  };
  // Âncoras do guia (a Analista aponta para País e Agência).
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const btns = ref.current?.querySelectorAll<HTMLElement>('.g-dock__btn');
    if (!btns) return;
    const tours = ['drawer-left', 'market-dock', 'drawer-right', 'combat-dock', 'threats-dock'];
    btns.forEach((b, i) => (b.dataset.tour = tours[i]));
  });
  return (
    <div className="stage-dock" ref={ref}>
      <GActionBar items={items} active={active} onSelect={onSelect} label={t('game.topbar.menu')} compact={compact} />
    </div>
  );
}
