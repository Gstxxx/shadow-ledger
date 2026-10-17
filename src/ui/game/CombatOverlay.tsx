import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { FastForward, Pause, Play, SkipForward, Swords } from 'lucide-react';
import { canPlace, place, stepCombat, succeeded, TACTICS, unplace, autoDeploy } from '../../game/combat';
import { cancelPending, negotiateCost } from '../../game/actions';
import { abortLive, canAbortLive, chooseTactic, finishCombat, forceUnits } from '../../game/combatFlow';
import { agencyById, player } from '../../game/state';
import type { CombatState, CombatUnitRef, Tactic, Unit } from '../../game/types';
import { canFight, FORT_ID, maxStrOf, strOf } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { combatLabel, countryName, itemName, tacticBlurb, tacticName } from '../../i18n/lookup';
import { Portrait } from './Portrait';
import { msgText } from './msgText';
import { CoupCinematic } from '../cinematics';
import { BigNumber, Details, Verdict } from './stage/Verdict';
import { usePortrait } from './portrait/usePortrait';
import { CombatResult, RedactedTitle, RollingNumber, combatSucceeded, useCombatFx } from '../combat-fx';
import { GModal } from '../../art';

export function CombatOverlay() {
  const s = useGame();
  const { lang } = useT();
  // Golpe de Estado: a cena curta (menu-motion) toca uma vez por Combate, antes do tabuleiro.
  // O tabuleiro (e a intro do combat-fx) só monta no corte, para a entrada das fichas tocar depois da cena.
  const coupSeen = useRef(new Set<string>());
  const [, rerender] = useState(0);
  const c = s.combat;
  if (s.pendingCombat) return <PendingView />;
  if (!c) return null;
  if (c.reason.kind === 'coup' && !coupSeen.current.has(c.id)) {
    const id = c.id;
    return (
      <CoupCinematic
        country={countryName(c.reason.countryId, lang)}
        onDone={() => {
          coupSeen.current.add(id);
          rerender((n) => n + 1);
        }}
      />
    );
  }
  return <LiveView key={c.id} />;
}

// ── Prévia e Tática ─────────────────────────────────────────

function PendingView() {
  const s = useGame();
  const pend = s.pendingCombat!;
  const a = agencyById(s, pend.agencyId) ?? player(s);
  const mutate = useGameStore((st) => st.mutate);
  const act = useGameStore((st) => st.act);
  const { t, fmt, lang } = useT();
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

  const onAbort = useCallback(() => {
    act((g) => cancelPending(g));
  }, [act]);

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
    <GModal
      open
      width={760}
      tone="bad"
      onClose={abortable ? onAbort : undefined}
      closeLabel={t('game.combat.abort')}
      kicker={`${combatLabel(setup.type)} · ${setup.playerDefends ? t('game.combat.defendHint') : t('game.combat.attackHint')}`}
      title={msgText(setup.titleMsg, setup.title, lang)}
      actions={
        <div className="cb-actions">
          {abortable && (
            <button className="btn ghost" onClick={onAbort}>
              {t('game.combat.abort')}
            </button>
          )}
          <span className="tb-spacer" />
          <button className={`btn ${hopeless && armed ? 'danger' : 'ghost'}`} onClick={() => go(true)} disabled={!ours.length}>
            {hopeless && armed ? t('game.combat.commandAnyway') : t('game.combat.command')}
          </button>
          <button className={`btn ${hopeless ? (armed ? 'danger' : '') : 'primary'}`} onClick={() => go(false)}>
            {hopeless && armed ? t('game.combat.fightAnyway') : t('game.combat.auto')}
          </button>
        </div>
      }
    >
      <div className="cb-preview">
        {/* Veredito (docs/UX-RULES.md): a chance da tática escolhida e, se for perdida, o aviso. */}
        {hopeless ? (
          <Verdict tone="bad">
            {t(setup.sources.some((src) => src.kind === 'escort') ? 'game.combat.hopelessDirector' : 'game.combat.hopeless', {
              pct: fmt.pct(bestP),
              a: ourStr,
              b: theirStr,
              abort: abortable ? t('game.combat.abortFree') : '',
            })}
          </Verdict>
        ) : (
          <Verdict tone={pend.preview[tactic] >= 0.6 ? 'good' : pend.preview[tactic] < 0.35 ? 'bad' : 'warn'}>
            <b>{tacticName(tactic)}</b> · {t('game.combat.ours', { n: ourStr })} · {t('game.combat.theirs', { n: theirStr })}
          </Verdict>
        )}
        <BigNumber label={tacticName(tactic)} value={fmt.pct(pend.preview[tactic])} note={tacticBlurb(tactic)} />
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
                {tc === 'negotiate' && <span className="tac-blurb">{t('game.combat.negotiateCost', { cost: fmt.money(nego) })}</span>}
              </button>
            );
          })}
        </div>
        <Details>
          <p className="hint-sm">{t('game.combat.forecastNote')}</p>
          {TACTICS.map((tc) => (
            <p key={tc} className="hint-sm">
              <b>{tacticName(tc)}</b> · {tacticBlurb(tc)}
            </p>
          ))}
        </Details>
      </div>
    </GModal>
  );
}

// ── Grade ───────────────────────────────────────────────────

function LiveView() {
  const s = useGame();
  const c = s.combat!;
  const mutate = useGameStore((st) => st.mutate);
  const { t, lang } = useT();
  const [running, setRunning] = useState(c.reserve.length === 0 && c.units.some((u) => u.side === 'p'));
  const [fast, setFast] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  // Em pé (ADR 0005) a grade gira: o jogador embaixo, avançando para cima.
  const vertical = usePortrait();
  // O carimbo pequeno sai: o resultado vira a tela cheia de Vitória/Derrota (<CombatResult>).
  const fx = useCombatFx({ grid, combat: c, speed: fast ? 2 : 1, axis: vertical ? 'y' : 'x', verdict: false });
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
    if (fx.some((f) => f.kind === 'down')) audio.sfx('kill');
    else if (fx.some((f) => f.kind === 'hit')) audio.sfx('hit');
    if (now.result) {
      setRunning(false);
      audio.sfx(succeeded(now) ? 'win' : 'lose');
    }
  };

  useEffect(() => {
    if (!running || c.result) return;
    const id = setInterval(step, fast ? 450 : 900);
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
      return;
    }
    if (!sel) return;
    mutate((g) => {
      place(g.combat!, sel, row, col);
    });
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
    fx.skip();
    mutate((g) => {
      const cc = g.combat!;
      if (cc.turn === 0 && cc.reserve.length && !cc.units.some((u) => u.side === 'p')) autoDeploy(cc);
      let guard = 0;
      while (!cc.result && guard++ < 50) stepCombat(g, cc);
    });
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
          <h2>
            <RedactedTitle>{msgText(c.titleMsg, c.title, lang)}</RedactedTitle>
          </h2>
          <span className="mono hint-sm">
            {tacticName(c.tactic)} · <TurnLabel turn={c.turn} max={c.maxTurns} />
          </span>
        </header>

        <div className="grid-wrap">
          <div
            ref={grid}
            className={`grid g-board${vertical ? ' vertical' : ''}`}
            style={
              (vertical
                ? {
                    '--cols': c.rows,
                    '--rows': c.cols,
                    '--ratio': c.cols / c.rows,
                    aspectRatio: `${c.rows} / ${c.cols}`,
                    height: `var(--board-h, min(62vh, calc((100vw - 24px) * ${c.cols / c.rows})))`,
                  }
                : { '--cols': c.cols, '--rows': c.rows, aspectRatio: `${c.cols} / ${c.rows}` }) as unknown as CSSProperties
            }
          >
            {cells.map(({ row, col }) => {
              const deployable = c.turn === 0 && !c.result && col < c.deployCols;
              const target = !!sel && canPlace(c, row, col);
              return (
                <button
                  key={`${row}-${col}`}
                  className={`cell g-board__cell${deployable ? ' deploy g-board__cell--deploy' : ''}${target ? ' target g-board__cell--target' : ''}${
                    col >= c.cols - c.deployCols ? ' hostile-zone g-board__cell--enemy' : ''
                  }`}
                  style={vertical ? { gridRow: c.cols - col, gridColumn: row + 1 } : { gridRow: row + 1, gridColumn: col + 1 }}
                  onClick={() => cellClick(row, col)}
                  aria-label={t('game.combat.cell', { row: row + 1, col: col + 1 })}
                />
              );
            })}
            {c.units.map((u) => (
              <Token key={u.key} r={u} c={c} vertical={vertical} />
            ))}
          </div>
        </div>

        {c.turn === 0 && !running && canAbortLive(s) && <p className="hint-sm">{t('game.combat.abortHint')}</p>}
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

        <div className={`cb-log mono${c.turn === 0 && !running ? ' cb-log--deploy' : ''}`}>
          {c.log.slice(-3).map((l, i) => (
            <div key={`${c.turn}-${i}`}>{msgText(c.logMsg?.[c.log.length - Math.min(3, c.log.length) + i], l, lang)}</div>
          ))}
        </div>

        {c.result && (
          <CombatResult
            kind={combatSucceeded(c) ? 'win' : 'lose'}
            title={combatSucceeded(c) ? t('game.combat.result.win').toUpperCase() : t('combatfx.stamp.lose')}
            items={resultItems(c, combatSucceeded(c), t)}
            doneLabel={t('game.combat.finish')}
            onDone={finish}
            board={grid.current}
          />
        )}
        <footer className={`cb-actions${!c.result && c.turn === 0 && !running ? ' cb-deploy' : ''}`} style={c.result ? { display: 'none' } : undefined}>
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
                  {canAbortLive(s) && (
                    <button
                      className="btn ghost"
                      onClick={() => {
                        audio.sfx('close');
                        mutate((g) => {
                          abortLive(g);
                        });
                      }}
                    >
                      {t('game.combat.abort')}
                    </button>
                  )}
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

/**
 * Cards da tela de resultado, só com o que o CombatState já sabe. XP, recompensa e o destino do Diretor
 * são sorteados em resolveCombat (no Concluir) e ficam para o Relatório.
 */
function resultItems(c: CombatState, win: boolean, t: ReturnType<typeof useT>['t']) {
  const kos = Object.values(c.credits ?? {}).reduce((n, x) => n + x.kos, 0);
  const items: { label: string; value: number; tone?: 'good' | 'bad' | 'neutral' }[] = [];
  if (win) {
    items.push({ label: t('combatfx.result.kos'), value: kos, tone: 'good' });
    items.push({ label: t('combatfx.result.converts'), value: c.converted.length, tone: 'good' });
    if (c.downed.length) items.push({ label: t('combatfx.result.downed'), value: c.downed.length, tone: 'bad' });
    if (c.turned.length) items.push({ label: t('combatfx.result.turned'), value: c.turned.length, tone: 'bad' });
  } else {
    items.push({ label: t('combatfx.result.downed'), value: c.downed.length, tone: 'bad' });
    items.push({ label: t('combatfx.result.turned'), value: c.turned.length, tone: 'bad' });
    if (kos) items.push({ label: t('combatfx.result.kos'), value: kos, tone: 'neutral' });
  }
  return items;
}

/** "turno {turn}/{max}" traduzido, com o número de turno rolando (combat-fx). */
function TurnLabel({ turn, max }: { turn: number; max: number }) {
  const { t } = useT();
  const [pre, post] = t('game.combat.turn', { turn: '', max }).split('');
  return (
    <>
      {pre}
      <RollingNumber value={turn} />
      {post}
    </>
  );
}

function Token({ r, c, vertical }: { r: CombatUnitRef; c: CombatState; vertical: boolean }) {
  const { t } = useT();
  const u: Unit = r.unit;
  const fort = u.itemId === FORT_ID;
  const max = Math.max(1, maxStrOf(u, c.type) || strOf(u, c.type));
  const cur = strOf(u, c.type);
  return (
    <div
      className={`token g-token side-${r.side}${r.side === 'e' ? ' g-token--enemy' : ''}`}
      data-fx-key={r.key}
      data-fx-side={r.side}
      data-fx-col={r.col}
      data-fx-row={r.row}
      style={{
        ...(vertical
          ? {
              left: `${(r.row / c.rows) * 100}%`,
              top: `${((c.cols - 1 - r.col) / c.cols) * 100}%`,
              width: `${100 / c.rows}%`,
              height: `${100 / c.cols}%`,
            }
          : {
              left: `${(r.col / c.cols) * 100}%`,
              top: `${(r.row / c.rows) * 100}%`,
              width: `${100 / c.cols}%`,
              height: `${100 / c.rows}%`,
            }),
      }}
      title={`${u.name} · ${itemName(u.itemId)}`}
    >
      <span className="g-token__card">{fort ? <span className="fort">▦</span> : <Portrait unit={u} size={40} hostile={r.side === 'e'} />}</span>
      <span className="tk-bar">
        <span style={{ width: `${Math.min(100, (cur / max) * 100)}%` }} />
      </span>
      <span className="tk-name">{fort ? t('game.combat.fort') : u.name.split(' ')[0]}</span>
    </div>
  );
}
