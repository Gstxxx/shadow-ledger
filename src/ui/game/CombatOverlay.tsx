import { useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Pause, Play, SkipForward, Swords } from 'lucide-react';
import { canPlace, place, stepCombat, succeeded, TACTIC_BLURB, TACTIC_LABEL, TACTICS, unplace, autoDeploy } from '../../game/combat';
import { cancelPending, negotiateCost } from '../../game/actions';
import { chooseTactic, finishCombat, forceUnits } from '../../game/combatFlow';
import { COMBAT_LABEL } from '../../game/data/rules';
import { agencyById, player } from '../../game/state';
import type { CombatState, CombatUnitRef, Tactic, Unit } from '../../game/types';
import { canFight, def, FORT_ID, maxStrOf, strOf } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { money, pct } from '../fmt';
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
          <span className="chip type">{COMBAT_LABEL[setup.type]}</span>
          <h2>{setup.title}</h2>
          <span className="mono hint-sm">{setup.playerDefends ? 'Defesa: segurar a linha basta' : 'Ataque: é preciso romper ou neutralizar'}</span>
        </header>
        <div className="forces">
          <div className="force ours">
            <span className="mono hint-sm">Agência · força {ourStr}</span>
            <div className="force-row">
              {ours.map((u) => (
                <Portrait key={u.uid} unit={u} size={34} />
              ))}
              {!ours.length && <span className="hint-sm">Ninguém em condições de lutar{setup.fort ? ': só as defesas fixas.' : '.'}</span>}
            </div>
          </div>
          <Swords size={22} className="vs" />
          <div className="force theirs">
            <span className="mono hint-sm">Hostis · força {theirStr}</span>
            <div className="force-row">
              {setup.enemy.map((u) => (
                <Portrait key={u.uid} unit={u} size={34} hostile />
              ))}
            </div>
          </div>
        </div>
        <div className="tactics" role="radiogroup" aria-label="Tática">
          {TACTICS.map((t) => {
            const p = pend.preview[t];
            const cant = t === 'negotiate' && a.cash < nego;
            return (
              <button key={t} role="radio" aria-checked={tactic === t} className="tactic" disabled={cant} onClick={() => (audio.sfx('click'), setTactic(t))}>
                <span className="tac-top">
                  <span className="tac-name">{TACTIC_LABEL[t]}</span>
                  <span className={`num tac-p ${p >= 0.6 ? 'pos' : p < 0.35 ? 'neg' : ''}`}>{pct(p)}</span>
                </span>
                <span className="tac-bar">
                  <span style={{ width: `${p * 100}%` }} />
                </span>
                <span className="tac-blurb">
                  {TACTIC_BLURB[t]}
                  {t === 'negotiate' && ` Custo: ${money(nego)}.`}
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint-sm">Prévia: chance estimada de sucesso em simulações deste confronto.</p>
        {hopeless && (
          <div className="alert bad cb-risk" role="alert">
            <span>
              <b>Chance quase nula ({pct(bestP)}).</b> Sua força {ourStr} contra {theirStr}. Perder custa Unidades
              {setup.sources.some((src) => src.kind === 'escort') ? ' e pode deixar o Diretor Detido ou Sequestrado' : ''}.
              {abortable ? ' Abortar agora não tem custo.' : ''}
            </span>
          </div>
        )}
        <footer className="cb-actions">
          {abortable && (
            <button className="btn ghost" onClick={() => act((g) => cancelPending(g))}>
              Abortar
            </button>
          )}
          <span className="tb-spacer" />
          <button className={`btn${hopeless && armed ? ' danger' : ''}`} onClick={() => go(true)} disabled={!ours.length}>
            {hopeless && armed ? 'Comandar mesmo assim' : 'Comandar na grade'}
          </button>
          <button className={`btn ${hopeless ? (armed ? 'danger' : '') : 'primary'}`} onClick={() => go(false)}>
            {hopeless && armed ? 'Lutar mesmo assim' : 'Combate Automático'}
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
          <span className="chip type">{COMBAT_LABEL[c.type]}</span>
          <h2>{c.title}</h2>
          <span className="mono hint-sm">
            {TACTIC_LABEL[c.tactic]} · turno {c.turn}/{c.maxTurns}
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
                  aria-label={`Linha ${row + 1}, coluna ${col + 1}`}
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
            <span className="mono hint-sm">Reserva · toque numa Unidade e depois numa casa das três primeiras colunas</span>
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
                {ok ? (c.result === 'draw' ? 'Linha mantida' : 'Vitória') : c.result === 'draw' ? 'Alvo não tomado' : 'Derrota'}
              </span>
              <span className="tb-spacer" />
              <button className="btn primary" onClick={finish}>
                Concluir
              </button>
            </>
          ) : (
            <>
              {c.turn === 0 && !running ? (
                <>
                  <button className="btn ghost" onClick={() => mutate((g) => autoDeploy(g.combat!))} disabled={!c.reserve.length}>
                    Posicionar o resto
                  </button>
                  <span className="tb-spacer" />
                  <button className="btn primary" onClick={begin} disabled={!c.units.some((u) => u.side === 'p')}>
                    <Play size={16} /> Iniciar
                  </button>
                </>
              ) : (
                <>
                  <button className="btn icon" aria-label={running ? 'Pausar' : 'Continuar'} onClick={() => setRunning(!running)}>
                    {running ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button className="btn icon" aria-label="Um turno" onClick={step} disabled={running}>
                    <SkipForward size={16} />
                  </button>
                  <button className="btn icon" aria-label="Acelerar" aria-pressed={fast} onClick={() => setFast(!fast)}>
                    <FastForward size={16} />
                  </button>
                  <span className="tb-spacer" />
                  <button className="btn" onClick={skip}>
                    Pular para o fim
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
      title={`${u.name} · ${def(u.itemId).name}`}
    >
      {fort ? <span className="fort">▦</span> : <Portrait unit={u} size={40} hostile={r.side === 'e'} />}
      <span className="tk-bar">
        <span style={{ width: `${Math.min(100, (cur / max) * 100)}%` }} />
      </span>
      <span className="tk-name">{fort ? 'Defesa' : u.name.split(' ')[0]}</span>
    </div>
  );
}
