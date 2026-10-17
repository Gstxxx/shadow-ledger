import { useState } from 'react';
import { ChevronDown, Menu, PanelLeft, PanelRight, Pause, Play } from 'lucide-react';
import { daysLeft } from '../../game/objective';
import { formatClock, formatDate, formatDuration, player, profit } from '../../game/state';
import { crisisHoursLeft, tensionBand } from '../../game/tension';
import { WMD_TENSION } from '../../game/market';
import { useGame, useGameStore } from '../../store/game';
import type { Speed } from '../../store/settings';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { objectiveLabel, tensionBandLabel } from '../../i18n/lookup';
import { usePortrait } from './portrait/usePortrait';
import { DirectorAvatar } from './DirectorAvatar';

export function TopBar({ onMenu, onLeft, onRight }: { onMenu: () => void; onLeft: () => void; onRight: () => void }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const speed = useGameStore((st) => st.speed);
  const paused = useGameStore((st) => st.paused);
  const setSpeed = useGameStore((st) => st.setSpeed);
  const togglePause = useGameStore((st) => st.togglePause);
  const p = profit(a);
  const pr = s.options.preset;
  const left = daysLeft(s);
  const goal =
    pr.objective === 'quick'
      ? t('game.topbar.goalPct', { n: Math.max(0, Math.min(100, Math.round((p / (pr.target ?? 1)) * 100))) })
      : Number.isFinite(left)
        ? t('game.topbar.daysLeft', { n: Math.max(0, Math.ceil(left)) })
        : t('game.topbar.noDeadline');
  const [details, setDetails] = useState(false);
  // Em pé, as âncoras do guia ficam nas abas da folha; os botões de gaveta somem.
  const portrait = usePortrait();
  const halted = paused || s.events.length > 0 || !!s.combat || !!s.pendingCombat;

  const profitStat = (
      <div className="tb-stat hide-xs">
        <span className="tb-k mono">{t('game.topbar.profit')}</span>
        <span className={`tb-v num ${p >= 0 ? 'pos' : 'neg'}`}>{fmt.money(p)}</span>
      </div>
  );
  const tensionStat = (
      <div className="tb-stat hide-xs">
        <span className="tb-k mono">
          {t('game.topbar.tension')} · {tensionBandLabel(tensionBand(s.tension))}
          {(s.crisis?.hours ?? 0) > 0 && <span className="crisis"> · {t('game.topbar.crisisIn', { time: formatDuration(crisisHoursLeft(s)) })}</span>}
        </span>
        <span className="tension">
          <span className="tension-fill" style={{ width: `${s.tension}%`, background: s.tension >= WMD_TENSION ? 'var(--red)' : 'var(--paper-2)' }} />
          <span className="tension-mark" style={{ left: `${WMD_TENSION}%` }} />
        </span>
      </div>
  );

  return (
    <header className="topbar">
      <button className="btn icon ghost only-narrow" data-tour={portrait ? undefined : 'drawer-left'} aria-label={t('game.topbar.country')} onClick={onLeft}>
        <PanelLeft size={18} />
      </button>
      <span className="tb-avatar">
        <DirectorAvatar origin={a.origin} size={32} title={a.director.name} />
      </span>
      <div className="tb-agency">
        <span className="tb-name">{a.name}</span>
        <span className="tb-sub mono">
          {objectiveLabel(pr.objective)} · {goal}
        </span>
      </div>
      {portrait ? (
        <button
          type="button"
          className="tb-stat tb-more"
          aria-expanded={details}
          aria-label={`${t('game.topbar.cash')} ${fmt.money(a.cash)} · ${objectiveLabel(pr.objective)} · ${goal}`}
          onClick={() => setDetails(!details)}
        >
          <span className="tb-k mono">
            {t('game.topbar.cash')} <ChevronDown size={12} style={{ transform: details ? 'rotate(180deg)' : undefined }} />
          </span>
          <span className="tb-v num">{fmt.money(a.cash)}</span>
        </button>
      ) : (
        <div className="tb-stat">
          <span className="tb-k mono">{t('game.topbar.cash')}</span>
          <span className="tb-v num">{fmt.money(a.cash)}</span>
        </div>
      )}
      {profitStat}
      {tensionStat}

      <div className="tb-spacer" />
      <div className="tb-clock">
        <span className="tb-date num">{formatDate(s.time)}</span>
        <span className="tb-time num">{formatClock(s.time)}</span>
      </div>
      <div className="tb-speed" data-tour="speed" role="group" aria-label={t('game.topbar.speed')}>
        <button
          className={`btn icon sm ${halted ? 'paused' : ''}`}
          aria-label={paused ? t('game.topbar.resume') : t('game.topbar.pause')}
          onClick={() => {
            audio.sfx('click');
            togglePause();
          }}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        {([1, 2, 4, 8] as Speed[]).map((v) => (
          <button
            key={v}
            className={`btn sm${v === 8 ? ' hide-xs' : ''}`}
            aria-pressed={!paused && speed === v}
            onClick={() => {
              audio.sfx('click');
              setSpeed(v);
            }}
          >
            {v}×
          </button>
        ))}
      </div>
      <button className="btn icon ghost only-mid" data-tour={portrait ? undefined : 'drawer-right'} aria-label={t('game.topbar.agency')} onClick={onRight}>
        <PanelRight size={18} />
      </button>
      <button className="btn icon ghost" aria-label={t('game.topbar.menu')} onClick={onMenu}>
        <Menu size={18} />
      </button>
      {details && (
        <div className="tb-details" role="region" aria-label={objectiveLabel(pr.objective)}>
          <div className="tb-stat">
            <span className="tb-k mono">{objectiveLabel(pr.objective)}</span>
            <span className="tb-v">{goal}</span>
          </div>
          {profitStat}
          {tensionStat}
        </div>
      )}
    </header>
  );
}
