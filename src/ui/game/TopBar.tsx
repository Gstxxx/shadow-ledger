import { Menu, PanelLeft, PanelRight, Pause, Play } from 'lucide-react';
import { daysLeft } from '../../game/objective';
import { formatClock, formatDate, player, profit } from '../../game/state';
import { OBJECTIVE_LABEL } from '../../game/data/rules';
import { WMD_TENSION } from '../../game/market';
import { useGame, useGameStore } from '../../store/game';
import type { Speed } from '../../store/settings';
import { audio } from '../../audio/engine';
import { money } from '../fmt';

export function TopBar({ onMenu, onLeft, onRight }: { onMenu: () => void; onLeft: () => void; onRight: () => void }) {
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
      ? `${Math.max(0, Math.min(100, Math.round((p / (pr.target ?? 1)) * 100)))}% da meta`
      : Number.isFinite(left)
        ? `${Math.max(0, Math.ceil(left))} dias restantes`
        : 'sem prazo';
  const halted = paused || s.events.length > 0 || !!s.combat || !!s.pendingCombat;

  return (
    <header className="topbar">
      <button className="btn icon ghost only-narrow" aria-label="País" onClick={onLeft}>
        <PanelLeft size={18} />
      </button>
      <div className="tb-agency">
        <span className="tb-name">{a.name}</span>
        <span className="tb-sub mono">
          {OBJECTIVE_LABEL[pr.objective]} · {goal}
        </span>
      </div>
      <div className="tb-stat">
        <span className="tb-k mono">Caixa</span>
        <span className="tb-v num">{money(a.cash)}</span>
      </div>
      <div className="tb-stat hide-xs">
        <span className="tb-k mono">Lucro</span>
        <span className={`tb-v num ${p >= 0 ? 'pos' : 'neg'}`}>{money(p)}</span>
      </div>
      <div className="tb-stat hide-sm" title="Tensão Global">
        <span className="tb-k mono">Tensão Global</span>
        <span className="tension">
          <span className="tension-fill" style={{ width: `${s.tension}%`, background: s.tension >= WMD_TENSION ? 'var(--red)' : 'var(--paper-2)' }} />
          <span className="tension-mark" style={{ left: `${WMD_TENSION}%` }} />
        </span>
      </div>
      <div className="tb-spacer" />
      <div className="tb-clock">
        <span className="tb-date num">{formatDate(s.time)}</span>
        <span className="tb-time num">{formatClock(s.time)}</span>
      </div>
      <div className="tb-speed" role="group" aria-label="Velocidade">
        <button
          className={`btn icon sm ${halted ? 'paused' : ''}`}
          aria-label={paused ? 'Continuar' : 'Pausar'}
          onClick={() => {
            audio.sfx('click');
            togglePause();
          }}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        {([1, 2, 4] as Speed[]).map((v) => (
          <button
            key={v}
            className="btn sm"
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
      <button className="btn icon ghost only-narrow" aria-label="Agência" onClick={onRight}>
        <PanelRight size={18} />
      </button>
      <button className="btn icon ghost" aria-label="Menu" onClick={onMenu}>
        <Menu size={18} />
      </button>
    </header>
  );
}
