import { useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { COUNTRY_SEEDS } from '../../../game/data/countries';
import type { Continent, Difficulty, ObjectiveKind, PresetDef } from '../../../game/types';
import { ActionButton, Segmented, Stepper, Toggle } from '../controls';
import { presetText, type Strings } from '../strings';
import type { Lang, StartConfig } from '../types';
import { sfx } from '../settings';

interface Props {
  s: Strings;
  lang: Lang;
  presets: PresetDef[];
  tutorial: PresetDef | undefined;
  onStart(cfg: StartConfig): void;
}

const CONTINENTS: Continent[] = ['NA', 'SA', 'EU', 'AF', 'ME', 'AS', 'OC'];
const CAPITALS = [2_000_000, 5_000_000, 10_000_000, 20_000_000];
const DEADLINES = [60, 90, 120, 180, 0];
const TARGETS = [10_000_000, 25_000_000, 50_000_000];
const DEFAULT_RIVALS: Record<Difficulty, number> = { 1: 1, 2: 2, 3: 3 };

function capitalOf(c: Continent): string {
  const pool = COUNTRY_SEEDS.filter((x) => x.continent === c).sort((a, b) => b.level - a.level);
  return pool[0]?.id ?? COUNTRY_SEEDS[0].id;
}

function Pips({ n, label }: { n: number; label: string }) {
  return (
    <span className="slm-pips" role="img" aria-label={`${label} ${n}/3`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? 'on' : undefined} />
      ))}
    </span>
  );
}

export function NewGame({ s, lang, presets, tutorial, onStart }: Props) {
  const [tab, setTab] = useState<'presets' | 'sandbox'>('presets');
  const [selected, setSelected] = useState(presets[0]?.id);
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [hardcore, setHardcore] = useState(false);

  const [region, setRegion] = useState<Continent>('NA');
  const [cash, setCash] = useState(CAPITALS[1]);
  const [rivals, setRivals] = useState(2);
  const [rivalsTouched, setRivalsTouched] = useState(false);
  const [objective, setObjective] = useState<ObjectiveKind>('profit');
  const [days, setDays] = useState(90);
  const [target, setTarget] = useState(TARGETS[1]);

  const preset = presets.find((p) => p.id === selected) ?? presets[0];
  const text = preset ? presetText(lang, preset) : null;

  const sandbox = useMemo<PresetDef>(() => {
    const start = capitalOf(region);
    return {
      id: 'sandbox',
      objective,
      title: s.tabSandbox,
      brief: '',
      days: objective === 'quick' ? 0 : days,
      target: objective === 'quick' ? target : undefined,
      cash,
      startCountry: start,
      startStations: [{ countryId: start, level: 1 }],
      startUnits: ['cargo0', 'bodyguard', 'bodyguard', 'lawyer1'],
      challenge: difficulty,
      region: objective === 'destroy' || objective === 'rescue' ? [region] : undefined,
    };
  }, [region, objective, days, target, cash, difficulty, s.tabSandbox]);

  const changeDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    if (!rivalsTouched) setRivals(DEFAULT_RIVALS[d]);
  };

  const start = () => {
    sfx('click');
    if (tab === 'presets' && preset) {
      onStart({ kind: 'preset', preset, difficulty, hardcore, rivals: DEFAULT_RIVALS[difficulty] });
    } else {
      onStart({ kind: 'sandbox', preset: sandbox, difficulty, hardcore, rivals });
    }
  };

  const startTutorial = () => {
    const p = tutorial ?? presets[0];
    if (!p) return;
    sfx('click');
    onStart({ kind: 'tutorial', preset: p, difficulty: 1, hardcore: false, rivals: 0 });
  };

  const common = (
    <div className="slm-common" data-enter>
      <Segmented<Difficulty>
        label={s.difficulty}
        value={difficulty}
        onChange={changeDifficulty}
        options={([1, 2, 3] as Difficulty[]).map((d) => ({ value: d, label: s.difficultyNames[d] }))}
        help={s.difficultyHelp[difficulty]}
      />
      <Toggle label={s.hardcore} checked={hardcore} onChange={setHardcore} help={s.hardcoreHelp} tone="danger" />
    </div>
  );

  return (
    <div className="slm-newgame">
      <div className="slm-tabs" role="tablist" data-enter>
        {(['presets', 'sandbox'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="slm-tab"
            onClick={() => {
              if (t !== tab) sfx('click');
              setTab(t);
            }}
          >
            {t === 'presets' ? s.tabPresets : s.tabSandbox}
          </button>
        ))}
      </div>

      {tab === 'presets' ? (
        <div className="slm-presets" role="tabpanel">
          <div className="slm-tutorial" data-enter>
            <GraduationCap className="slm-tutorial-icon" size={22} strokeWidth={1.75} aria-hidden="true" />
            <div className="slm-tutorial-text">
              <span className="slm-tutorial-kicker">{s.tutorialKicker}</span>
              <strong>{s.tutorialTitle}</strong>
              <p>{s.tutorialBody}</p>
            </div>
            <ActionButton onClick={startTutorial}>{s.tutorialCta}</ActionButton>
          </div>
          <div className="slm-preset-col">
            <ul className="slm-preset-list" role="listbox" aria-label={s.tabPresets}>
              {presets.map((p) => {
                const t = presetText(lang, p);
                const on = p.id === preset?.id;
                return (
                  <li key={p.id} data-enter>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      className="slm-preset"
                      onClick={() => {
                        if (!on) sfx('type');
                        setSelected(p.id);
                      }}
                    >
                      <span className="slm-preset-title">{t.title}</span>
                      <span className="slm-preset-meta">
                        <span>{s.objectiveNames[p.objective]}</span>
                        <span>·</span>
                        <span>{p.days ? s.days(p.days) : s.noDeadline}</span>
                        <Pips n={p.challenge} label={s.challenge} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {preset && text && (
            <article className="slm-brief" aria-live="polite">
              <span className="slm-brief-kicker" data-enter>
                {s.briefing}
              </span>
              <h3 className="slm-brief-title" key={preset.id + lang} data-enter>
                {text.title}
              </h3>
              <p className="slm-brief-body" data-enter>
                {text.brief}
              </p>
              <dl className="slm-brief-facts" data-enter>
                <div>
                  <dt>{s.objective}</dt>
                  <dd>{s.objectiveNames[preset.objective]}</dd>
                </div>
                <div>
                  <dt>{preset.objective === 'quick' ? s.target : s.deadline}</dt>
                  <dd>{preset.objective === 'quick' && preset.target ? s.money(preset.target) : preset.days ? s.days(preset.days) : s.noDeadline}</dd>
                </div>
                <div>
                  <dt>{s.capital}</dt>
                  <dd>{s.money(preset.cash)}</dd>
                </div>
              </dl>
              {common}
            </article>
          )}
        </div>
      ) : (
        <div className="slm-sandbox" role="tabpanel">
          <div className="slm-sandbox-grid">
            <Segmented<Continent>
              label={s.startRegion}
              value={region}
              onChange={setRegion}
              options={CONTINENTS.map((c) => ({ value: c, label: s.continents[c] }))}
            />
            <Segmented<number> label={s.capital} value={cash} onChange={setCash} options={CAPITALS.map((v) => ({ value: v, label: s.money(v) }))} />
            <Segmented<ObjectiveKind>
              label={s.objective}
              value={objective}
              onChange={setObjective}
              options={(['profit', 'quick', 'destroy', 'rescue'] as ObjectiveKind[]).map((o) => ({ value: o, label: s.objectiveNames[o] }))}
            />
            {objective === 'quick' ? (
              <Segmented<number> label={s.target} value={target} onChange={setTarget} options={TARGETS.map((v) => ({ value: v, label: s.money(v) }))} />
            ) : (
              <Segmented<number>
                label={s.deadline}
                value={days}
                onChange={setDays}
                options={DEADLINES.map((d) => ({ value: d, label: d ? s.days(d) : s.noDeadline }))}
              />
            )}
            <Stepper
              label={s.rivals}
              value={rivals}
              min={0}
              max={4}
              onChange={(v) => {
                setRivals(v);
                setRivalsTouched(true);
              }}
              format={(v) => (v === 0 ? s.rivalsNone : String(v))}
            />
          </div>
          {common}
        </div>
      )}

      <div className="slm-newgame-foot">
        <span className="slm-summary">
          {s.difficultyNames[difficulty]}
          {hardcore ? ` · ${s.hardcore}` : ''}
        </span>
        <ActionButton onClick={start}>{s.start}</ActionButton>
      </div>
    </div>
  );
}
