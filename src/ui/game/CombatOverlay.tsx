import { useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Pause, Play, SkipForward, Swords } from 'lucide-react';
import { canPlace, place, stepCombat, succeeded, TACTICS, unplace, autoDeploy } from '../../game/combat';
import { cancelPending, negotiateCost } from '../../game/actions';
import { chooseTactic, finishCombat, forceUnits } from '../../game/combatFlow';
import { agencyById, player } from '../../game/state';
import type { CombatState, CombatUnitRef, Tactic, Unit } from '../../game/types';
import { canFight, FORT_ID, maxStrOf, strOf } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { combatLabel, itemName, tacticBlurb, tacticName } from '../../i18n/lookup';
import { Portrait } from './Portrait';

export function CombatOverlay() {
  const s = useGame();
  if (s.pendingCombat) return <PendingView />;
  if (s.combat) return <LiveView key={s.combat.id} />;
  return null;
}

// ── Prévia e Tática ─────────────────────────────────────────

function PendingView() {
  const s = useGame();
  const pend = s.pendingCombat!;
  const a = agencyById(s, pend.agencyId) ?? player(s);
  const mutate = useGameStore((st) => st.mutate);
  const act = useGameStore((st) => st.act);
  const { t, fmt } = useT();
  const setup = pend.setup;
  const ours = setup.sources.flatMap((src) => forceUnits(a, src)).filter((u) => canFight(u, setup.type));
  const best = TACTICS.filter((t) => t !== 'negotiate').reduce((b, t) => (pend.preview[t] > pend.preview[b] ? t : b), 'assault' as Tactic);
  const [tactic, setTactic] = useState<Tactic>(best);
  const nego = negotiateCost(s, setup);
  const abortable = setup.reason.kind !== 'threat' && setup.reason.kind !== 'group';
  const ourStr = ours.reduce((x, u) => x + strOf(u, setup.type), 0);
  const theirStr = setup.enemy.reduce((x, u) => x + strOf(u, setup.type), 0);

  const bestP = Math.max(...TACTICS.filter((x) => x !== 'negotiate').map((x) => pend.preview[x]));
  const hopeless = bestP < 0.15 && !setup.playerDefends;
  const [armed, setArmed] = useState(false);

  const go = (manual: boolean) => {
    if (hopeless && !armed) {
      setArmed(true);
      return;
    }
    audio.sfx('open');
    mutate((g) => {
      chooseTactic(g, tactic, manual);
    });
  };

  return (
    <div className="combat-screen">
      <div className="combat-card">
        <header className="cb-head">
          <span className="chip type">{combatLabel(setup.type)}</span>
          <h2>{setup.title}</h2>
          <span className="mono hint-sm">{setup.playerDefends ? t('game.combat.defendHint') : t('game.combat.attackHint')}</span>
        </header>
        <div className="forces">
          <div className="force ours">
            <span className="mono hint-sm">{t('game.combat.ours', { n: ourStr })}</span>
            <div className="force-row">
              {ours.map((u) => (
                <Portrait key={u.uid} unit={u} size={34} />
              ))}
              {!ours.length && <span className="hint-sm">{t(setup.fort ? 'game.combat.noFightersFort' : 'game.combat.noFighters')}</span>}
            </div>
          </div>
          <Swords size={22} className="vs" />
          <div className="force theirs">
            <span className="mono hint-sm">{t('game.combat.theirs', { n: theirStr })}</span>
            <div className="force-row">
              {setup.enemy.map((u) => (
                <Portrait key={u.uid} unit={u} size={34} hostile />
              ))}
            </div>
          </div>
        </div>
        <div className="tactics" role="radiogroup" aria-label={t('game.combat.tactic')}>
          {TACTICS.map((tc) => {
            const p = pend.preview[tc];
            const cant = tc === 'negotiate' && a.cash < nego;
            return (
              <button key={tc} role="radio" aria-checked={tactic === tc} className="tactic" disabled={cant} onClick={() => (audio.sfx('click'), setTactic(tc))}>
                <span className="tac-top">
                  <span className="tac-name">{tacticName(tc)}</span>
                  <span className={`num tac-p ${p >= 0.6 ? 'pos' : p < 0.35 ? 'neg' : ''}`}>{fmt.pct(p)}</span>
                </span>
                <span className="tac-bar">
                  <span style={{ width: `${p * 100}%` }} />
                </span>
                <span className="tac-blurb">
                  {tacticBlurb(tc)}
                  {tc === 'negotiate' && ` ${t('game.combat.negotiateCost', { cost: fmt.money(nego) })}`}
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint-sm">{t('game.combat.forecastNote')}</p>
        {hopeless && (
          <div className="alert bad cb-risk" role="alert">
            <span>
              <b>Chance quase nula ({fmt.pct(bestP)}).</b> Sua força {ourStr} contra {theirStr}. Perder custa Unidades
              {setup.sources.some((src) => src.kind === 'escort') ? ' e pode deixar o Diretor Detido ou Sequestrado' : ''}.
              {abortable ? ' Abortar agora não tem custo.' : ''}
            </span>
          </div>
        )}
        <footer className="cb-actions">
          {abortable && (
            <button className="btn ghost" onClick={() => act((g) => cancelPending(g))}>
              {t('game.combat.abort')}
            </button>
          )}
          <span className="tb-spacer" />
          <button className={`btn${hopeless && armed ? ' danger' : ''}`} onClick={() => go(true)} disabled={!ours.length}>
            {hopeless && armed ? 'Comandar mesmo assim' : 'Comandar na grade'}
          </button>
          <button className={`btn ${hopeless ? (armed ? 'danger' : '') : 'primary'}`} onClick={() => go(false)}>
            {hopeless && armed ? 'Lutar mesmo assim' : t('game.combat.auto')}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ── Grade ───────────────────────────────────────────────────

interface Ghost {
  ref: CombatUnitRef;
  kind: 'down' | 'convert';
}

function LiveView() {
  const s = useGame();
  const c = s.combat!;
  const mutate = useGameStore((st) => st.mutate);
  const { t } = useT();
  const [running, setRunning] = useState(c.reserve.length === 0 && c.units.some((u) => u.side === 'p'));
  const [fast, setFast] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const prevUnits = useRef<CombatUnitRef[]>(c.units.map((u) => ({ ...u })));
  const manual = c.turn === 0 && c.reserve.length > 0;

  const step = () => {
    let fx: CombatState['fx'] = [];
    mutate((g) => {
      if (!g.combat || g.combat.result) return;
      stepCombat(g, g.combat);
      fx = g.combat.fx;
    });
    const now = useGameStore.getState().game?.combat;
    if (!now) return;
    const gone = prevUnits.current.filter((p) => !now.units.some((u) => u.key === p.key));
    setGhosts(gone.map((ref) => ({ ref, kind: fx.some((f) => f.kind === 'convert' && f.key === ref.key) ? 'convert' : 'down' })));
    prevUnits.current = now.units.map((u) => ({ ...u }));
    if (fx.some((f) => f.kind === 'down')) audio.sfx('kill');
    else if (fx.some((f) => f.kind === 'hit')) audio.sfx('hit');
    if (now.result) {
      setRunning(false);
      audio.sfx(succeeded(now) ? 'win' : 'lose');
    }
  };

  useEffect(() => {
    if (!running || c.result) return;
    const id = setInterval(step, fast ? 260 : 680);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, fast, c.result]);

  const cellClick = (row: number, col: number) => {
    if (c.result) return;
    const occupant = c.units.find((u) => u.row === row && u.col === col);
    if (occupant && occupant.side === 'p' && c.turn === 0 && occupant.unit.itemId !== FORT_ID) {
      mutate((g) => {
        unplace(g.combat!, occupant.key);
      });
      prevUnits.current = useGameStore.getState().game!.combat!.units.map((u) => ({ ...u }));
      return;
    }
    if (!sel) return;
    mutate((g) => {
      place(g.combat!, sel, row, col);
    });
    prevUnits.current = useGameStore.getState().game!.combat!.units.map((u) => ({ ...u }));
    audio.sfx('click');
    setSel(null);
  };

  const begin = () => {
    audio.sfx('open');
    setRunning(true);
  };

  const finish = () => {
    audio.sfx('click');
    mutate((g) => finishCombat(g));
  };

  const skip = () => {
    mutate((g) => {
      const cc = g.combat!;
      if (cc.turn === 0 && cc.reserve.length && !cc.units.some((u) => u.side === 'p')) autoDeploy(cc);
      let guard = 0;
      while (!cc.result && guard++ < 50) stepCombat(g, cc);
    });
    setGhosts([]);
    const now = useGameStore.getState().game?.combat;
    if (now?.result) audio.sfx(succeeded(now) ? 'win' : 'lose');
    setRunning(false);
  };

  const cells = useMemo(() => {
    const out: { row: number; col: number }[] = [];
    for (let row = 0; row < c.rows; row++) for (let col = 0; col < c.cols; col++) out.push({ row, col });
    return out;
  }, [c.rows, c.cols]);

  const ok = c.result ? succeeded(c) : null;

  return (
    <div className="combat-screen live">
      <div className="combat-card wide">
        <header className="cb-head">
          <span className="chip type">{combatLabel(c.type)}</span>
          <h2>{c.title}</h2>
          <span className="mono hint-sm">
            {tacticName(c.tactic)} · {t('game.combat.turn', { turn: c.turn, max: c.maxTurns })}
          </span>
        </header>

        <div className="grid-wrap">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${c.cols}, 1fr)`, gridTemplateRows: `repeat(${c.rows}, 1fr)` }}>
            {cells.map(({ row, col }) => {
              const deployable = c.turn === 0 && !c.result && col < c.deployCols;
              const target = !!sel && canPlace(c, row, col);
              return (
                <button
                  key={`${row}-${col}`}
                  className={`cell${deployable ? ' deploy' : ''}${target ? ' target' : ''}${col >= c.cols - c.deployCols ? ' hostile-zone' : ''}`}
                  style={{ gridRow: row + 1, gridColumn: col + 1 }}
                  onClick={() => cellClick(row, col)}
                  aria-label={t('game.combat.cell', { row: row + 1, col: col + 1 })}
                />
              );
            })}
            {ghosts.map((g) => (
              <Token key={`ghost-${g.ref.key}-${c.turn}`} r={g.ref} c={c} ghost={g.kind} />
            ))}
            {c.units.map((u) => (
              <Token key={u.key} r={u} c={c} hit={c.fx.some((f) => f.kind === 'hit' && f.key === u.key)} />
            ))}
          </div>
        </div>

        {manual && (
          <div className="reserve">
            <span className="mono hint-sm">{t('game.combat.reserve')}</span>
            <div className="reserve-row">
              {c.reserve.map((u) => (
                <button key={u.uid} className={`res-unit${sel === u.uid ? ' sel' : ''}`} onClick={() => (audio.sfx('click'), setSel(sel === u.uid ? null : u.uid))}>
                  <Portrait unit={u} size={36} />
                  <span className="num">{strOf(u, c.type)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cb-log mono">
          {c.log.slice(-3).map((l, i) => (
            <div key={`${c.turn}-${i}`}>{l}</div>
          ))}
        </div>

        <footer className="cb-actions">
          {c.result ? (
            <>
              <span className={`result ${ok ? 'pos' : 'neg'}`}>
                {ok ? (c.result === 'draw' ? t('game.combat.result.hold') : t('game.combat.result.win')) : c.result === 'draw' ? t('game.combat.result.notTaken') : t('game.combat.result.lose')}
              </span>
              <span className="tb-spacer" />
              <button className="btn primary" onClick={finish}>
                {t('game.combat.finish')}
              </button>
            </>
          ) : (
            <>
              {c.turn === 0 && !running ? (
                <>
                  <button className="btn ghost" onClick={() => mutate((g) => autoDeploy(g.combat!))} disabled={!c.reserve.length}>
                    {t('game.combat.deployRest')}
                  </button>
                  <span className="tb-spacer" />
                  <button className="btn primary" onClick={begin} disabled={!c.units.some((u) => u.side === 'p')}>
                    <Play size={16} /> {t('game.combat.start')}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn icon" aria-label={running ? t('game.combat.pause') : t('game.combat.resume')} onClick={() => setRunning(!running)}>
                    {running ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button className="btn icon" aria-label={t('game.combat.oneTurn')} onClick={step} disabled={running}>
                    <SkipForward size={16} />
                  </button>
                  <button className="btn icon" aria-label={t('game.combat.fast')} aria-pressed={fast} onClick={() => setFast(!fast)}>
                    <FastForward size={16} />
                  </button>
                  <span className="tb-spacer" />
                  <button className="btn" onClick={skip}>
                    {t('game.combat.skip')}
                  </button>
                </>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function Token({ r, c, hit, ghost }: { r: CombatUnitRef; c: CombatState; hit?: boolean; ghost?: 'down' | 'convert' }) {
  const { t } = useT();
  const u: Unit = r.unit;
  const fort = u.itemId === FORT_ID;
  const max = Math.max(1, maxStrOf(u, c.type) || strOf(u, c.type));
  const cur = strOf(u, c.type);
  return (
    <div
      className={`token side-${r.side}${hit ? ' hit' : ''}${ghost ? ` ghost ${ghost}` : ''}`}
      style={{
        left: `${(r.col / c.cols) * 100}%`,
        top: `${(r.row / c.rows) * 100}%`,
        width: `${100 / c.cols}%`,
        height: `${100 / c.rows}%`,
      }}
      title={`${u.name} · ${itemName(u.itemId)}`}
    >
      {fort ? <span className="fort">▦</span> : <Portrait unit={u} size={40} hostile={r.side === 'e'} />}
      <span className="tk-bar">
        <span style={{ width: `${Math.min(100, (cur / max) * 100)}%` }} />
      </span>
      <span className="tk-name">{fort ? t('game.combat.fort') : u.name.split(' ')[0]}</span>
    </div>
  );
}
