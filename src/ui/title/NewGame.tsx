import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Skull } from 'lucide-react';
import { audio } from '../../audio/engine';
import { COUNTRY_SEEDS, CONTINENT_LABEL } from '../../game/data/countries';
import { DIFFICULTY_LABEL, OBJECTIVE_LABEL, PRESETS } from '../../game/data/rules';
import type { Difficulty, ObjectiveKind, PresetDef } from '../../game/types';
import { useGameStore } from '../../store/game';
import { sweepOut } from './sweep';

const money = (n: number) => `US$ ${Math.round(n).toLocaleString('pt-BR')}`;
const CUSTOM = 'custom';

const DIFF_BLURB: Record<Difficulty, string> = {
  1: 'Mais capital, ameaças raras e lentas.',
  2: 'O equilíbrio pensado para o jogo.',
  3: 'Menos capital; ameaças frequentes e anunciadas em cima da hora.',
};

function presetMeta(p: PresetDef) {
  const label = p.objective === 'profit' ? 'Lucro' : OBJECTIVE_LABEL[p.objective];
  const goal = p.objective === 'quick' ? `meta ${money(p.target ?? 0)}` : p.days ? `${p.days} dias` : 'sem prazo';
  return `${label} · ${goal} · ${money(p.cash)}`;
}

/** Nova partida: Sandbox a partir de um Preset ou personalizada. */
export function NewGame() {
  const root = useRef<HTMLDivElement>(null);
  const go = useGameStore((s) => s.go);
  const start = useGameStore((s) => s.start);
  const [pick, setPick] = useState<string>(PRESETS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [hardcore, setHardcore] = useState(false);
  const [director, setDirector] = useState('');
  const [agency, setAgency] = useState('');
  // Custom Sandbox
  const [startCountry, setStartCountry] = useState('076');
  const [cash, setCash] = useState(8_000_000);
  const [objective, setObjective] = useState<ObjectiveKind>('profit');
  const [days, setDays] = useState(120);
  const [target, setTarget] = useState(25_000_000);

  const countries = useMemo(() => [...COUNTRY_SEEDS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), []);

  const preset = (): PresetDef => {
    if (pick !== CUSTOM) return PRESETS.find((p) => p.id === pick)!;
    const home = COUNTRY_SEEDS.find((c) => c.id === startCountry)!;
    return {
      id: CUSTOM,
      objective,
      title: 'Sandbox personalizada',
      brief: `Começo em ${home.name}.`,
      days: objective === 'quick' ? 0 : days,
      target: objective === 'quick' ? target : undefined,
      cash,
      startCountry,
      startStations: [{ countryId: startCountry, level: 1 }],
      startUnits: ['cargo1', 'bodyguard', 'bodyguard', 'soldier', 'lawyer1'],
      challenge: 2,
      region: [home.continent],
    };
  };

  const begin = () => {
    audio.sfx('click');
    const p = preset();
    sweepOut(root.current, () => start({ preset: p, difficulty, hardcore, directorName: director, agencyName: agency }));
  };

  const back = () => {
    audio.sfx('close');
    sweepOut(root.current, () => go('title'));
  };

  const choosePreset = (id: string) => {
    audio.sfx('click');
    setPick(id);
  };

  return (
    <div className="sheet-screen" ref={root}>
      <section className="sheet panel-enter" aria-label="Nova partida">
        <header className="sheet-head">
          <button className="btn icon ghost" onClick={back} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h2>Nova partida</h2>
          <span className="mono hint">Sandbox</span>
        </header>
        <div className="sheet-body">
          <div className="field-label" style={{ marginBottom: 8 }}>
            Preset
          </div>
          <div className="preset-grid">
            {PRESETS.map((p) => (
              <button key={p.id} className="preset" aria-pressed={pick === p.id} onClick={() => choosePreset(p.id)}>
                <span className="preset-title">{p.title}</span>
                <span className="preset-meta mono">{presetMeta(p)}</span>
                <span className="preset-brief">{p.brief}</span>
              </button>
            ))}
            <button className="preset" aria-pressed={pick === CUSTOM} onClick={() => choosePreset(CUSTOM)}>
              <span className="preset-title">Personalizada</span>
              <span className="preset-meta mono">País, capital, Objetivo e prazo</span>
              <span className="preset-brief">Monte sua própria Sandbox.</span>
            </button>
          </div>

          {pick === CUSTOM && (
            <div className="ng-cols">
              <div className="field">
                <label htmlFor="ng-country">País inicial</label>
                <select id="ng-country" className="input" value={startCountry} onChange={(e) => setStartCountry(e.target.value)}>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {CONTINENT_LABEL[c.continent]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="field-label">Capital</span>
                <div className="seg">
                  {[4, 8, 15, 30].map((m) => (
                    <button key={m} className="btn sm" aria-pressed={cash === m * 1e6} onClick={() => setCash(m * 1e6)}>
                      {m} mi
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="field-label">Objetivo</span>
                <div className="seg">
                  {(Object.keys(OBJECTIVE_LABEL) as ObjectiveKind[]).map((o) => (
                    <button key={o} className="btn sm" aria-pressed={objective === o} onClick={() => setObjective(o)}>
                      {OBJECTIVE_LABEL[o]}
                    </button>
                  ))}
                </div>
              </div>
              {objective === 'quick' ? (
                <div className="field">
                  <span className="field-label">Meta de lucro</span>
                  <div className="seg">
                    {[10, 25, 50, 100].map((m) => (
                      <button key={m} className="btn sm" aria-pressed={target === m * 1e6} onClick={() => setTarget(m * 1e6)}>
                        {m} mi
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="field">
                  <span className="field-label">Prazo</span>
                  <div className="seg">
                    {[60, 90, 120, 180, ...(objective === 'profit' ? [0] : [])].map((d) => (
                      <button key={d} className="btn sm" aria-pressed={days === d} onClick={() => setDays(d)}>
                        {d ? `${d} dias` : 'Sem prazo'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ng-cols">
            <div className="field">
              <label htmlFor="ng-dir">Nome do Diretor</label>
              <input id="ng-dir" className="input" placeholder="Diretor" maxLength={28} value={director} onChange={(e) => setDirector(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ng-ag">Nome da agência</label>
              <input id="ng-ag" className="input" placeholder="Agência" maxLength={28} value={agency} onChange={(e) => setAgency(e.target.value)} />
            </div>
            <div className="field">
              <span className="field-label">Dificuldade</span>
              <div className="seg">
                {([1, 2, 3] as Difficulty[]).map((d) => (
                  <button key={d} className="btn sm" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
              <span className="hint">{DIFF_BLURB[difficulty]}</span>
            </div>
            <div className="field">
              <span className="field-label">Modo Hardcore</span>
              <label className="toggle-row">
                <input type="checkbox" checked={hardcore} onChange={(e) => setHardcore(e.target.checked)} />
                <Skull size={16} color={hardcore ? 'var(--red)' : 'var(--paper-3)'} />
                <span className="hint">Perder um Combate com o Diretor presente é morte e fim de jogo.</span>
              </label>
            </div>
          </div>
        </div>
        <footer className="sheet-foot">
          <button className="btn ghost" onClick={back}>
            Voltar
          </button>
          <button className="btn primary" onClick={begin}>
            Começar operação
          </button>
        </footer>
      </section>
    </div>
  );
}
