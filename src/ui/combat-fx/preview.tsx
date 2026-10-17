// Prévia isolada da camada de Combate: /src/ui/combat-fx/preview.html no servidor Vite (fora do build do jogo).
// Roda um Combate de verdade (createCombat + stepCombat) e desenha tokens iguais aos da tela de Combate.
// ?type=urban|army|legal|air  ?seed=N  ?rm=1 (reduzir movimento)  ?auto=0 (não rodar sozinho)
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import '../../index.css';
import '../../art/tokens.css';
import '../game/game.css';
import { autoDeploy, createCombat, stepCombat } from '../../game/combat';
import { makeUnit, maxStrOf, strOf } from '../../game/units';
import type { CombatState, CombatType, CombatUnitRef } from '../../game/types';
import { useT } from '../../i18n';
import { countryName } from '../../i18n/lookup';
import { Portrait } from '../game/Portrait';
import { RedactedTitle, RollingNumber, useCombatFx } from './index';

const q = new URLSearchParams(location.search);
const TYPE = (q.get('type') as CombatType) || 'urban';
const SEED = Number(q.get('seed') ?? 7);
// ?portrait=1: grade em pé (jogador embaixo, inimigo em cima), como a tela de Combate faz em retrato (ADR 0005).
const PORTRAIT = q.get('portrait') === '1';
const REDUCED = q.get('rm') === '1' ? true : q.get('rm') === '0' ? false : undefined;

// Cenas para revisar efeitos raros: ?scene=convert (Agentes de Influência) e ?scene=breach (linha vazia).
const SCENE = q.get('scene');
const SCENES: Record<string, { p: string[]; e: string[] }> = {
  convert: { p: ['liaison2', 'liaison2', 'liaison2', 'commando'], e: ['thug', 'thug', 'thug', 'police'] },
  breach: { p: ['swat', 'swat', 'swat'], e: ['commando'] },
};

const ROSTER: Record<CombatType, { p: string[]; e: string[] }> = {
  urban: { p: ['commando', 'swat', 'swat', 'liaison2', 'soldier'], e: ['thug', 'thug', 'police', 'soldier', 'thug', 'swat'] },
  army: { p: ['commando', 'soldier', 'soldier', 'technical', 'apc'], e: ['soldier', 'soldier', 'technical', 'soldier', 'commando'] },
  legal: { p: ['lawyer2', 'lawyer1', 'lawyer3'], e: ['lawyer1', 'lawyer2', 'lawyer1', 'lawyer1'] },
  air: { p: ['jet1', 'jet2', 'heli1'], e: ['jet1', 'heli1', 'jet1'] },
};

function newCombat(seed: number): CombatState & { rng: number; uidCounter: number } {
  const ctx = { rng: seed, uidCounter: 0 };
  const r = (SCENE && SCENES[SCENE]) || ROSTER[TYPE];
  const c = createCombat(ctx, {
    agencyId: 'player',
    type: TYPE,
    reason: { kind: 'group', countryId: '818', by: 'director' },
    title: countryName('818'),
    player: r.p.map((id) => makeUnit(ctx, id)),
    enemy: r.e.map((id) => makeUnit(ctx, id)),
    tactic: 'assault',
    playerDefends: false,
    sources: [{ kind: 'escort' }],
    directorPresent: true,
  });
  autoDeploy(c);
  return Object.assign(c, ctx);
}

function Token({ r, c }: { r: CombatUnitRef; c: CombatState }) {
  const u = r.unit;
  const max = Math.max(1, maxStrOf(u, c.type) || strOf(u, c.type));
  return (
    <div
      data-fx-key={r.key}
      data-fx-side={r.side}
      className={`token side-${r.side}`}
      style={
        PORTRAIT
          ? { left: `${(r.row / c.rows) * 100}%`, top: `${((c.cols - 1 - r.col) / c.cols) * 100}%`, width: `${100 / c.rows}%`, height: `${100 / c.cols}%` }
          : { left: `${(r.col / c.cols) * 100}%`, top: `${(r.row / c.rows) * 100}%`, width: `${100 / c.cols}%`, height: `${100 / c.rows}%` }
      }
    >
      <Portrait unit={u} size={40} hostile={r.side === 'e'} />
      <span className="tk-bar">
        <span style={{ width: `${Math.min(100, (strOf(u, c.type) / max) * 100)}%` }} />
      </span>
      <span className="tk-name">{u.name.split(' ')[0]}</span>
    </div>
  );
}

function Preview() {
  const { t } = useT();
  const [seed, setSeed] = useState(SEED);
  const holder = useRef<ReturnType<typeof newCombat>>(null!);
  if (!holder.current) holder.current = newCombat(seed);
  const [, force] = useState(0);
  const [running, setRunning] = useState(q.get('auto') !== '0');
  const [speed, setSpeed] = useState(1);
  const grid = useRef<HTMLDivElement>(null);
  const c = holder.current;

  const noGrid = useRef<HTMLDivElement>(null);
  const fx = useCombatFx({ grid: q.get('nofx') === '1' ? noGrid : grid, combat: c, speed, reduced: REDUCED, intro: q.get('nointro') !== '1' });

  const step = () => {
    if (c.result) return;
    stepCombat(c, c);
    force((n) => n + 1);
  };

  useEffect(() => {
    if (!running || c.result) return;
    const id = setInterval(step, 700 / speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed, c.result, seed]);

  const restart = () => {
    const n = seed + 1;
    holder.current = newCombat(n);
    setSeed(n);
    setRunning(true);
  };

  const cells = useMemo(() => Array.from({ length: c.rows * c.cols }, (_, i) => i), [c.rows, c.cols]);

  return (
    <div className="combat-screen live" key={seed}>
      <div className="combat-card wide">
        <header className="cb-head">
          <span className="chip type">{t(`combat.${c.type}` as never)}</span>
          <strong>
            <RedactedTitle reduced={REDUCED}>{c.title}</RedactedTitle>
          </strong>
          <span className="mono hint-sm">
            <RollingNumber value={c.turn} reduced={REDUCED} />/{c.maxTurns}
          </span>
        </header>
        <div className="grid-wrap">
          <div
            ref={grid}
            className="grid"
            style={
              PORTRAIT
                ? { gridTemplateColumns: `repeat(${c.rows}, 1fr)`, gridTemplateRows: `repeat(${c.cols}, 1fr)`, aspectRatio: `${c.rows} / ${c.cols}`, maxHeight: '70vh', width: 'auto', height: '70vh' }
                : { gridTemplateColumns: `repeat(${c.cols}, 1fr)`, gridTemplateRows: `repeat(${c.rows}, 1fr)` }
            }
          >
            {cells.map((i) => {
              const row = Math.floor(i / c.cols);
              const col = i % c.cols;
              const place = PORTRAIT ? { gridRow: c.cols - col, gridColumn: row + 1 } : { gridRow: row + 1, gridColumn: col + 1 };
              return <div key={i} className={`cell${col < c.deployCols ? ' deploy' : ''}`} style={place} />;
            })}
            {c.units.map((u) => (
              <Token key={u.key} r={u} c={c} />
            ))}
          </div>
        </div>
        <footer className="cb-actions">
          <button className="btn" onClick={() => setRunning(!running)}>
            {running ? t('game.combat.pause') : t('game.combat.resume')}
          </button>
          <button className="btn" onClick={step} disabled={running || !!c.result}>
            {t('game.combat.oneTurn')}
          </button>
          {[1, 2, 4].map((v) => (
            <button key={v} className={`btn${speed === v ? ' primary' : ''}`} onClick={() => setSpeed(v)}>
              {v}×
            </button>
          ))}
          <button className="btn" onClick={() => fx.skip()}>
            {t('game.combat.skip')}
          </button>
          <span className="tb-spacer" />
          <button className="btn primary" onClick={restart}>
            {t('game.combat.start')}
          </button>
        </footer>
      </div>
    </div>
  );
}

// Inspeção com o painel oculto (rAF parado): window.__gsap.ticker.tick()
(window as unknown as { __gsap: typeof gsap }).__gsap = gsap;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
