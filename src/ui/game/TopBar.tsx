import { useEffect, useState } from 'react';
import { FastForward, Menu, Pause, Play } from 'lucide-react';
import { daysLeft, profitGoal } from '../../game/objective';
import { formatClock, formatDate, formatDuration, player, profit } from '../../game/state';
import { crisisHoursLeft, tensionBand } from '../../game/tension';
import { WMD_TENSION } from '../../game/market';
import { useGame, useGameStore } from '../../store/game';
import type { Speed } from '../../store/settings';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { objectiveLabel, tensionBandLabel } from '../../i18n/lookup';
import { useMedia, usePortrait } from './portrait/usePortrait';
import { GMeter, GSegmented } from '../../art';
import { DirectorAvatar } from './DirectorAvatar';

export function TopBar({ onMenu }: { onMenu: () => void }) {
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
  const portrait = usePortrait();
  const narrow = useMedia('(max-width: 700px)');
  // Deitado e baixo (celular): também usa o seletor compacto, para sobrar lugar para os mostradores.
  const shortLandscape = useMedia('(max-height: 520px) and (max-width: 1100px)');
  const compactSpeed = portrait || narrow || shortLandscape;
  const [speedOpen, setSpeedOpen] = useState(false);
  // Fecha o seletor de velocidade ao tocar fora dele ou com Esc.
  useEffect(() => {
    if (!speedOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as HTMLElement).closest?.('.speed-pick')) setSpeedOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [speedOpen]);
  const halted = paused || s.events.length > 0 || !!s.combat || !!s.pendingCombat;

  // Meta de lucro do Objetivo "Lucro no prazo" (1 = basta terminar no azul).
  const target = pr.objective === 'profit' ? profitGoal(s) : 0;
  const goalPct = target > 1 ? Math.max(0, Math.min(100, Math.round((p / target) * 100))) : 0;
  const signedMoney = p > 0 ? `+${fmt.money(p)}` : fmt.money(p);
  // Caixa e Lucro: dois mostradores do mesmo tamanho (rótulo, valor, legenda de uma linha).
  const cashStat = (
    <div className="tb-stat tb-money g-dial g-dial--lg" aria-label={`${t('game.topbar.cash')} ${fmt.money(a.cash)} · ${objectiveLabel(pr.objective)} · ${goal}`}>
      <span className="tb-k mono g-dial__k">{t('game.topbar.cash')}</span>
      <span className="tb-v num g-dial__v">{fmt.money(a.cash)}</span>
      <span className="tb-cap mono">{target > 1 ? goal : `${objectiveLabel(pr.objective)} · ${goal}`}</span>
    </div>
  );
  const profitStat = (
    <div
      className={`tb-stat tb-money g-dial g-dial--lg ${p >= 0 ? 'g-dial--ok' : 'g-dial--danger'}`}
      aria-label={target > 1 ? t('game.topbar.profitGoalAria', { profit: fmt.money(p), goal: fmt.money(target), pct: goalPct }) : undefined}
    >
      <span className="tb-k mono g-dial__k">{t('game.topbar.profit')}</span>
      <span className="tb-v num g-dial__v">{signedMoney}</span>
      {target > 1 ? (
        <span className="tb-cap tb-goal mono">
          <GMeter className="goal-bar" value={goalPct} max={100} tone={goalPct >= 100 ? 'ok' : 'action'} thin />
          <span>
            {t('game.overlay.over.profitGoal')} {fmt.money(target)}
          </span>
        </span>
      ) : (
        <span className="tb-cap mono">{target === 1 ? t('game.topbar.stayInBlack') : objectiveLabel(pr.objective)}</span>
      )}
    </div>
  );
  const tensionStat = (
      <div className="tb-stat hide-xs tb-tension g-dial">
        <span className="tb-k mono g-dial__k">
          {t('game.topbar.tension')} · {tensionBandLabel(tensionBand(s.tension))}
          {(s.crisis?.hours ?? 0) > 0 && <span className="crisis"> · {t('game.topbar.crisisIn', { time: formatDuration(crisisHoursLeft(s)) })}</span>}
        </span>
        <GMeter className="tension" value={s.tension} max={100} mark={WMD_TENSION} tone={s.tension >= WMD_TENSION ? 'danger' : 'neutral'} segmented />
      </div>
  );

  const skipToNextEvent = useGameStore((st) => st.skipToNextEvent);
  /** Avança o relógio até o próximo Evento (ou 30 dias), sem esperar em tempo real. */
  const skipButton = (cls: string) => (
    <button
      className={`btn icon sm ${cls}`}
      aria-label={t('game.topbar.skipToEvent')}
      disabled={!!s.combat || !!s.pendingCombat || s.events.length > 0 || !!s.over}
      onClick={() => {
        audio.sfx('click');
        skipToNextEvent();
      }}
    >
      <FastForward size={16} />
    </button>
  );

  return (
    <header className="topbar g-hud">
      <span className="tb-avatar">
        <DirectorAvatar origin={a.origin} size={32} title={a.director.name} />
      </span>
      <div className="tb-agency">
        <span className="tb-name">{a.name}</span>
        <span className="tb-sub mono">
          {objectiveLabel(pr.objective)} · {goal}
        </span>
      </div>
      {cashStat}
      {profitStat}
      {tensionStat}

      <div className="tb-spacer" />
      <div className="tb-clock g-dial">
        <span className="tb-date num g-dial__k">{formatDate(s.time)}</span>
        <span className="tb-time num g-dial__v">{formatClock(s.time)}</span>
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
        {compactSpeed ? (
          // Em pé/estreito: um botão com a velocidade atual abre 1×–8×; pausa, avançar e menu ficam sempre na barra.
          <span className="speed-pick">
            <button
              type="button"
              className="btn sm speed-cur"
              aria-haspopup="true"
              aria-expanded={speedOpen}
              aria-label={t('game.topbar.speedN', { n: speed })}
              onClick={() => setSpeedOpen(!speedOpen)}
            >
              {speed}×
            </button>
            {speedOpen && (
              <span className="speed-pop">
                <GSegmented
                  label={t('game.topbar.speed')}
                  options={[1, 2, 4, 8].map((v) => ({ value: String(v), label: `${v}×`, aria: t('game.topbar.speedN', { n: v }) }))}
                  value={paused ? '' : String(speed)}
                  onChange={(v) => {
                    setSpeed(Number(v) as Speed);
                    setSpeedOpen(false);
                  }}
                />
              </span>
            )}
          </span>
        ) : (
          <GSegmented
            label={t('game.topbar.speed')}
            options={[1, 2, 4, 8].map((v) => ({ value: String(v), label: `${v}×`, aria: t('game.topbar.speedN', { n: v }) }))}
            value={paused ? '' : String(speed)}
            onChange={(v) => setSpeed(Number(v) as Speed)}
          />
        )}
        {skipButton('')}
      </div>
      <button className="btn icon ghost tb-menu" aria-label={t('game.topbar.menu')} onClick={onMenu}>
        <Menu size={18} />
      </button>
      <span className="tb-break" aria-hidden />
    </header>
  );
}
