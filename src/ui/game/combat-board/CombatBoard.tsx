// Quadro de Combate (backlog item 3): Contratos de combate e Caçadas, com recompensa e risco antes de aceitar.
// Segue docs/UX-RULES.md: veredito no topo, uma ação âmbar por cartão, listas curtas.
import { useMemo } from 'react';
import { Crosshair, Swords } from 'lucide-react';
import { GButton, GCard, GChip } from '../../../art';
import * as J from '../../../game/combatJobs';
import { formatDuration, player } from '../../../game/state';
import type { Agency, CombatContract, GameState, HostileBand } from '../../../game/types';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import type { Key } from '../../../i18n';
import { countryName } from '../../../i18n/lookup';
import { ShortList, Verdict } from '../stage/Verdict';
import { useStage } from '../stage/context';
import './combat-board.css';

export type CombatBoardTab = 'contracts' | 'hunts';

const KIND_ICON: Record<string, string> = { convoy: 'patrolcar', extraction: 'agent', defense: 'apc' };

/** Nome da força que lutaria: o Diretor (com a Escolta) ou a Equipe. */
function forceName(a: Agency, by: J.JobForce, t: (k: Key, p?: Record<string, string | number>) => string) {
  if (by === 'director') return t('combat.board.byDirector');
  return a.teams.find((x) => x.id === by)?.name ?? t('combat.board.byTeam');
}

const riskTone = (c: number): 'ok' | 'action' | 'danger' => (c >= 0.65 ? 'ok' : c >= 0.4 ? 'action' : 'danger');

/** Prévia por cartão é cara (simulações): recalcula só quando o dia, as forças ou a lista mudam. */
type Risk = ReturnType<typeof J.jobRisk>;

function useRisks<T extends { id: string }>(s: GameState, a: Agency, items: T[], fn: (x: T) => Risk) {
  const key = `${s.lastDay}|${a.location}|${a.flight ? 1 : 0}|${a.escort.length}|${a.teams.map((x) => `${x.id}@${x.location}${x.travel ? '*' : ''}`).join(',')}|${items.map((x) => x.id).join(',')}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Map(items.map((x) => [x.id, fn(x)])), [key]);
}

export function CombatBoard({ tab }: { tab: CombatBoardTab }) {
  return tab === 'contracts' ? <ContractsBoard /> : <HuntsBoard />;
}

function ContractsBoard() {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const select = useGameStore((st) => st.select);
  const stage = useStage();
  const jobs = J.jobsOf(s).filter((k) => k.status === 'offered' || (k.status === 'accepted' && k.agencyId === a.id));
  const risks = useRisks(s, a, jobs, (k) => J.jobRisk(s, a, k));
  // Melhor primeiro: os que dá para lutar agora, depois maior recompensa × chance.
  const sorted = [...jobs].sort((x, y) => {
    const rx = risks.get(x.id)!;
    const ry = risks.get(y.id)!;
    if (rx.present !== ry.present) return rx.present ? -1 : 1;
    return y.reward * ry.chance - x.reward * rx.chance;
  });
  const ready = sorted.filter((k) => risks.get(k.id)?.present);

  const goTo = (countryId: string) => {
    select(countryId);
    stage?.open({ kind: 'country', id: countryId, tab: 'overview' });
  };

  const card = (k: CombatContract) => {
    const r = risks.get(k.id)!;
    const accepted = k.status === 'accepted';
    const left = (accepted ? k.deadline : k.offerExpires) - s.time;
    return (
      <GCard
        key={k.id}
        icon={KIND_ICON[k.kind]}
        tone={accepted ? 'hot' : 'default'}
        title={`${t(`combat.board.kind.${k.kind}` as Key)} · ${countryName(k.countryId)}`}
        meta={
          <span className="cb-meta">
            <GChip tone="ok">{t('combat.board.pays', { money: fmt.money(k.reward) })}</GChip>
            <span>{k.client}</span>
            <span>{t('combat.board.withWho', { who: forceName(a, r.by, t) })}</span>
            <span className="mono">{t(accepted ? 'combat.board.deadline' : 'combat.board.expires', { left: formatDuration(left) })}</span>
          </span>
        }
        seal={`${Math.round(r.chance * 100)}%`}
        sealSub={t('combat.board.odds')}
        sealTone={riskTone(r.chance)}
        actions={
          r.present ? (
            <GButton variant="primary" size="sm" icon={<Swords size={16} />} onClick={() => act((g, ag) => J.fightCombatJob(g, ag, k.id, r.by), 'open')}>
              {t(accepted ? 'combat.board.fight' : 'combat.board.acceptFight')}
            </GButton>
          ) : accepted ? (
            <GButton variant="ghost" size="sm" onClick={() => goTo(k.countryId)}>
              {t('combat.board.goThere')}
            </GButton>
          ) : (
            <GButton variant="secondary" size="sm" onClick={() => act((g, ag) => J.acceptCombatJob(g, ag, k.id), 'click')}>
              {t('combat.board.accept')}
            </GButton>
          )
        }
      />
    );
  };

  const tone = ready.length ? 'good' : jobs.length ? 'neutral' : 'neutral';
  return (
    <div className="combat-board">
      <Verdict tone={tone} icon={<Swords size={26} />}>
        {ready.length
          ? t('combat.board.verdict.ready', { n: ready.length, country: countryName(ready[0].countryId) })
          : jobs.length
            ? t('combat.board.verdict.offers', { n: jobs.length })
            : t('combat.board.verdict.none')}
      </Verdict>
      <div className="cb-list">
        <ShortList items={sorted} max={4} render={card} />
      </div>
      <p className="cb-hint">{t('combat.board.hint.contracts')}</p>
    </div>
  );
}

function HuntsBoard() {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const select = useGameStore((st) => st.select);
  const stage = useStage();
  // A agência só caça o que viu: o grupo pode ter saído do último país conhecido.
  const bands = J.bandsOf(s).filter((b) => b.seenAt);
  const risks = useRisks(s, a, bands, (b) => J.huntRisk(s, a, b));
  const sorted = [...bands].sort((x, y) => {
    const rx = risks.get(x.id)!;
    const ry = risks.get(y.id)!;
    if (rx.present !== ry.present) return rx.present ? -1 : 1;
    return y.bounty * ry.chance - x.bounty * rx.chance;
  });
  const ready = sorted.filter((b) => risks.get(b.id)?.present);

  const card = (b: HostileBand) => {
    const r = risks.get(b.id)!;
    const where = b.seenAt!.countryId;
    const stale = where !== b.countryId;
    return (
      <GCard
        key={b.id}
        icon="rival"
        tone={r.present ? 'hot' : 'default'}
        title={b.name}
        meta={
          <span className="cb-meta">
            <GChip tone="ok">{t('combat.board.bountyChip', { money: fmt.money(b.bounty) })}</GChip>
            <span>{t('combat.board.seenIn', { country: countryName(where), ago: formatDuration(s.time - b.seenAt!.at) })}</span>
            <span>{t('combat.board.withWho', { who: forceName(a, r.by, t) })}</span>
            {stale && <GChip>{t('combat.board.stale')}</GChip>}
          </span>
        }
        seal={`${Math.round(r.chance * 100)}%`}
        sealSub={t('combat.board.odds')}
        sealTone={riskTone(r.chance)}
        actions={
          r.present ? (
            <GButton variant="primary" size="sm" icon={<Crosshair size={16} />} onClick={() => act((g, ag) => J.huntBand(g, ag, b.id, r.by), 'open')}>
              {t('combat.board.hunt')}
            </GButton>
          ) : (
            <GButton
              variant="ghost"
              size="sm"
              onClick={() => {
                select(where);
                stage?.open({ kind: 'country', id: where, tab: 'overview' });
              }}
            >
              {t('combat.board.goThere')}
            </GButton>
          )
        }
      />
    );
  };

  return (
    <div className="combat-board">
      <Verdict tone={ready.length ? 'good' : 'neutral'} icon={<Crosshair size={26} />}>
        {ready.length
          ? t('combat.board.verdict.huntReady', { band: ready[0].name, bounty: fmt.money(ready[0].bounty) })
          : bands.length
            ? t('combat.board.verdict.hunts', { n: bands.length })
            : t('combat.board.verdict.noHunts')}
      </Verdict>
      <div className="cb-list">
        <ShortList items={sorted} max={4} render={card} />
      </div>
      <p className="cb-hint">{t('combat.board.hint.hunts')}</p>
    </div>
  );
}

/** Contagem para o botão da barra: o que dá para fazer agora (lutar/caçar onde já há força). */
export function useCombatBoardBadge(): number {
  const s = useGame();
  const a = player(s);
  const jobs = J.jobsOf(s).filter((k) => (k.status === 'offered' || (k.status === 'accepted' && k.agencyId === a.id)) && J.forcesIn(a, k.countryId).length);
  const bands = J.bandsOf(s).filter((b) => J.forcesIn(a, b.countryId).length && b.seenAt?.countryId === b.countryId);
  return jobs.length + bands.length;
}
