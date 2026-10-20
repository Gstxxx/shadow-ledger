import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Dices, Skull } from 'lucide-react';
import { GameIcon } from '../../../art/icons/GameIcon';
import { COUNTRY_SEEDS } from '../../../game/data/countries';
import { ITEMS } from '../../../game/data/items';
import { FIRST_NAMES, LAST_NAMES, PLAYER_AGENCY_NAMES } from '../../../game/data/names';
import { DIFFICULTY_AI } from '../../../game/ai/profiles';
import type { Continent, Difficulty, ObjectiveKind, OriginId, PresetDef } from '../../../game/types';
import { Disclosure, Segmented, Stepper } from '../controls';
import { isTutorialPreset } from '../../../game/tutorial';
import { GModeSwitch } from '../../../art/game-ui-3';
import { ease, f } from '../ease';
import { sfx } from '../settings';
import { presetText, type Strings } from '../strings';
import type { Lang, StartConfig } from '../types';
import { MiniMap } from './MiniMap';
import { DirectorStep } from './DirectorStep';
import { useOriginStrings } from './originStrings';
import { TUTORIAL_ORIGIN } from '../../../game/data/origins';
import { PROFIT_GOAL_MULT } from '../../../game/objective';
import './newgame.css';
import { countryName, itemName } from '../../../i18n/lookup';
import { useNewGameStrings, type NewGameStrings } from './newGameStrings';

interface Props {
  s: Strings;
  lang: Lang;
  presets: PresetDef[];
  tutorial: PresetDef | undefined;
  reduced: boolean;
  onStart(cfg: StartConfig): void;
}

type Kind = StartConfig['kind'];
type Step = 1 | 2 | 3;
type Origin = Exclude<OriginId, 'none'>;
interface Entry {
  key: string;
  kind: Kind;
  preset: PresetDef;
}

const CONTINENTS: Continent[] = ['NA', 'SA', 'EU', 'AF', 'ME', 'AS', 'OC'];
const CAPITALS = [2_000_000, 5_000_000, 10_000_000, 20_000_000];
const DEADLINES = [60, 90, 120, 180, 0];
const TARGETS = [10_000_000, 25_000_000, 50_000_000];
/** Espelha DIFF_CASH de src/game/state.ts (caixa inicial por Dificuldade). */
const CASH_MULT: Record<Difficulty, number> = { 1: 1.25, 2: 1, 3: 0.85 };
const OBJECTIVE_ICON: Record<ObjectiveKind, string> = { profit: 'money', quick: 'clock', destroy: 'threat', rescue: 'abducted' };
const SEED = new Map(COUNTRY_SEEDS.map((c) => [c.id, c]));

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const randomDirector = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const randomAgency = () => pick(PLAYER_AGENCY_NAMES);

function capitalOf(c: Continent): string {
  const pool = COUNTRY_SEEDS.filter((x) => x.continent === c).sort((a, b) => b.level - a.level);
  return pool[0]?.id ?? COUNTRY_SEEDS[0].id;
}

function regionOf(p: PresetDef): Continent[] {
  const set = new Set<Continent>(p.region ?? []);
  for (const id of [p.startCountry, ...p.startStations.map((x) => x.countryId)]) {
    const c = SEED.get(id)?.continent;
    if (c) set.add(c);
  }
  return CONTINENTS.filter((c) => set.has(c));
}

function rivalCount(d: Difficulty): string {
  const [a, b] = DIFFICULTY_AI[d].count;
  return a === b ? String(a) : `${a}–${b}`;
}

function useCompact() {
  const q = '(max-width: 819px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

function Dots({ n, label }: { n: number; label?: string }) {
  return (
    <span className="slm-dots" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? 'on' : undefined} />
      ))}
    </span>
  );
}

export function NewGame({ s, lang, presets, tutorial, reduced, onStart }: Props) {
  const t = useNewGameStrings();
  const o = useOriginStrings();
  const compact = useCompact();

  const [region, setRegion] = useState<Continent>('NA');
  const [cash, setCash] = useState(CAPITALS[1]);
  const [objective, setObjective] = useState<ObjectiveKind>('profit');
  const [days, setDays] = useState(90);
  const [target, setTarget] = useState(TARGETS[1]);
  const [rivals, setRivals] = useState<number | null>(null);

  const sandbox = useMemo<PresetDef>(() => {
    const start = capitalOf(region);
    return {
      id: 'sandbox',
      objective,
      title: t.sandboxTitle,
      brief: t.sandboxBrief,
      days: objective === 'quick' ? 0 : days,
      target: objective === 'quick' ? target : undefined,
      cash,
      startCountry: start,
      startStations: [{ countryId: start, level: 1 }],
      startUnits: ['cargo0', 'bodyguard', 'bodyguard', 'lawyer1'],
      challenge: 2,
      region: objective === 'destroy' || objective === 'rescue' ? [region] : undefined,
    };
  }, [region, objective, days, target, cash, t.sandboxTitle, t.sandboxBrief]);

  // Tutorial primeiro; os demais por dificuldade sugerida e duração; Sandbox por último.
  const entries = useMemo<Entry[]>(() => {
    // O Tutorial (src/game/tutorial) é o recomendado para quem nunca jogou; sem ele, o Primeiro Contrato.
    const tut = tutorial ?? presets.find(isTutorialPreset) ?? presets.find((p) => p.id === 'first-contract') ?? presets[0];
    const rest = presets.filter((p) => p !== tut).sort((a, b) => a.challenge - b.challenge || (a.days || 999) - (b.days || 999));
    return [
      ...(tut ? [{ key: tut.id, kind: 'tutorial' as Kind, preset: tut }] : []),
      ...rest.map((p) => ({ key: p.id, kind: 'preset' as Kind, preset: p })),
      { key: 'sandbox', kind: 'sandbox' as Kind, preset: sandbox },
    ];
  }, [presets, tutorial, sandbox]);

  const [selected, setSelected] = useState(() => entries[0]?.key);
  const entry = entries.find((e) => e.key === selected) ?? entries[0];

  const [step, setStep] = useState<Step>(1);
  const [origin, setOrigin] = useState<Origin>(() => (entries[0]?.kind === 'tutorial' ? (TUTORIAL_ORIGIN as Origin) : 'exagent'));
  const [touchedOrigin, setTouchedOrigin] = useState(false);
  const [phoneDetails, setPhoneDetails] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (entries[0]?.kind === 'tutorial' ? 1 : 2));
  const [touchedDiff, setTouchedDiff] = useState(false);
  const [hardcore, setHardcore] = useState(false);
  const [director, setDirector] = useState(randomDirector);
  const [agency, setAgency] = useState(randomAgency);
  const [nameError, setNameError] = useState(false);

  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const choose = (key: string) => {
    if (key !== selected) sfx('type');
    setSelected(key);
    const e = entries.find((x) => x.key === key);
    // No Tutorial a Origem padrão é a do motor (Contrabandista), até a pessoa escolher outra.
    if (e && !touchedOrigin) setOrigin(e.kind === 'tutorial' ? (TUTORIAL_ORIGIN as Origin) : 'exagent');
    if (e && !touchedDiff) setDifficulty(e.kind === 'tutorial' ? 1 : (Math.min(3, Math.max(1, e.preset.challenge)) as Difficulty));
  };

  const goStep = useCallback((n: Step) => {
    sfx('click');
    setStep(n);
    if (n === 1) setPhoneDetails(false);
  }, []);

  // Esc volta um nível (detalhes → lista, Configurar → Cenário) antes de fechar o dossiê.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (step > 1) {
        e.preventDefault();
        goStep((step - 1) as Step);
      } else if (phoneDetails) {
        e.preventDefault();
        setPhoneDetails(false);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [step, phoneDetails, goStep]);

  // Troca de passo: o conteúdo pousa da direita (ou da esquerda ao voltar) e o foco vai para o título do passo.
  const prevStep = useRef(step);
  const prevView = useRef(phoneDetails);
  useLayoutEffect(() => {
    const changed = prevStep.current !== step || prevView.current !== phoneDetails;
    const forward = step > prevStep.current || (step === prevStep.current && phoneDetails);
    prevStep.current = step;
    prevView.current = phoneDetails;
    if (!changed) return;
    body.current?.closest('.slm-dossier-body')?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
    if (reduced || !body.current) return;
    gsap.fromTo(body.current, { x: forward ? 28 : -28, autoAlpha: 0.2 }, { x: 0, autoAlpha: 1, duration: f(10), ease: ease.softLand });
  }, [step, phoneDetails, reduced]);

  const onCardsKey = (e: ReactKeyboardEvent) => {
    if (!(e.target as HTMLElement).matches('[role=radio]')) return;
    const list = visible;
    const i = list.findIndex((x) => x.key === selected);
    let j = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = Math.min(list.length - 1, i + 1);
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = Math.max(0, i - 1);
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = list.length - 1;
    if (j < 0) return;
    e.preventDefault();
    choose(list[j].key);
    cardRefs.current[list[j].key]?.focus();
  };

  const start = () => {
    if (!director.trim() || !agency.trim()) {
      setNameError(true);
      sfx('alert');
      return;
    }
    sfx('click');
    onStart({
      kind: entry.kind,
      origin,
      preset: entry.preset,
      difficulty,
      hardcore,
      // Só o Sandbox fixa o número de rivais; nos Presets a Dificuldade decide.
      rivals: entry.kind === 'sandbox' ? sandboxRivals : undefined,
      directorName: director.trim(),
      agencyName: agency.trim(),
    });
  };

  const sandboxRivals = rivals ?? DIFFICULTY_AI[difficulty].count[0];
  // Presets que travam as rivais (o Tutorial) só as ligam no fim do guia.
  const rivalsLocked = !!(entry.preset as { locked?: string[] }).locked?.includes('rivals');
  const rivalsShown = (d: Difficulty) => (entry.kind === 'sandbox' ? String(sandboxRivals) : rivalCount(d));

  const titleOf = (e: Entry) => (e.kind === 'sandbox' ? t.sandboxTitle : presetText(lang, e.preset).title);
  // "Lucro no prazo": a meta real é target × PROFIT_GOAL_MULT[Dificuldade] (src/game/objective.ts).
  const goalOf = (p: PresetDef) => (p.objective === 'profit' && p.target ? Math.round(p.target * PROFIT_GOAL_MULT[difficulty]) : p.target);
  const outcomeOf = (e: Entry) => (e.kind === 'sandbox' ? t.sandboxOutcome : t.outcome(e.preset.objective, e.preset.days, goalOf(e.preset)));
  const regionLabel = (p: PresetDef) => regionOf(p).map((c) => s.continents[c]).join(' · ');

  const showList = step === 1 && (!compact || !phoneDetails);
  // Menos escolhas à vista: o recomendado (e o escolhido, se for outro); o resto em "Ver todos".
  const visible = showAll ? entries : entries.filter((e, i) => i === 0 || e.key === entry.key);
  const hiddenCount = entries.length - visible.length;
  const showDetails = step === 1 && (!compact || phoneDetails);

  return (
    <div className="slm-ng" data-compact={compact || undefined}>
      <ol className="slm-steps" aria-label={t.stepOf(step, 3)}>
        {([1, 2, 3] as const).map((n) => (
          <li key={n}>
            <button type="button" className="slm-step" aria-current={step === n ? 'step' : undefined} onClick={() => step !== n && goStep(n)}>
              <span className="slm-step-num" aria-hidden="true">
                {n < step ? <Check size={14} strokeWidth={3} /> : n}
              </span>
              <span>{n === 1 ? t.stepScenario : n === 2 ? o.step : t.stepConfigure}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="slm-ng-body" ref={body}>
        <h3 className="slm-sr" ref={heading} tabIndex={-1}>
          {t.stepOf(step, 3)}: {step === 1 ? t.stepScenario : step === 2 ? o.step : t.stepConfigure}
        </h3>

        {step === 1 && (
          <div className={`slm-ng-scenario${showList && showDetails ? ' is-split' : ''}`}>
            {showList && (
              <div className="slm-cards" role="radiogroup" aria-label={t.stepScenario} onKeyDown={onCardsKey}>
                {visible.map((e, i) => {
                  const on = e.key === entry.key;
                  const p = e.preset;
                  const level = e.kind === 'tutorial' ? 1 : p.challenge;
                  return (
                    <button
                      key={e.key}
                      ref={(b) => {
                        cardRefs.current[e.key] = b;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={on ? 0 : -1}
                      className={`slm-card${e.kind === 'tutorial' ? ' slm-card--tutorial' : ''}${i === 0 && !showAll ? ' slm-card--hero' : ''}`}
                      onClick={() => {
                        if (compact) {
                          choose(e.key);
                          setPhoneDetails(true);
                        } else if (on) goStep(2);
                        else choose(e.key);
                      }}
                    >
                      <span className="slm-card-icon" aria-hidden="true">
                        <GameIcon
                          id={e.kind === 'sandbox' ? 'tension' : OBJECTIVE_ICON[p.objective]}
                          size={26}
                          accent={e.kind === 'tutorial' ? 'var(--sl-stamp-blue)' : 'var(--sl-stamp-red)'}
                        />
                      </span>
                      <span className="slm-card-main">
                        {i === 0 && e.key === entries[0].key && <span className="slm-card-badge">{e.kind === 'tutorial' ? t.startHere : t.recommended}</span>}
                        <span className="slm-card-title">{titleOf(e)}</span>
                        <span className="slm-card-outcome">{outcomeOf(e)}</span>
                        {e.kind !== 'sandbox' && (
                          <span className="slm-card-meta">
                            <span>{regionLabel(p)}</span>
                            <span>{p.days ? t.days(p.days) : t.noDeadline}</span>
                            <span>{t.money(p.cash)}</span>
                            <Dots n={level} label={`${t.suggested}: ${t.levelOf(level)}`} />
                          </span>
                        )}
                      </span>
                      <span className="slm-card-check" aria-hidden="true">
                        <Check size={16} strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
                {(hiddenCount > 0 || showAll) && (
                  <button
                    type="button"
                    className="slm-see-all"
                    aria-expanded={showAll}
                    onClick={() => {
                      sfx(showAll ? 'close' : 'open');
                      setShowAll(!showAll);
                    }}
                  >
                    {showAll ? t.seeLess : t.seeAll(entries.length)}
                    <ChevronDown size={18} aria-hidden="true" className={showAll ? 'is-up' : undefined} />
                  </button>
                )}
              </div>
            )}

            {showDetails && entry && (
              <Details
                t={t}
                s={s}
                lang={lang}
                entry={entry}
                difficulty={difficulty}
                rivals={rivalsShown(difficulty)}
                compact={compact}
                title={titleOf(entry)}
                outcome={outcomeOf(entry)}
                onBack={() => setPhoneDetails(false)}
              />
            )}
          </div>
        )}

        {step === 2 && (
          <DirectorStep
            o={o}
            value={origin}
            reduced={reduced}
            onChange={(id) => {
              setOrigin(id);
              setTouchedOrigin(true);
            }}
            onConfirm={() => goStep(3)}
          />
        )}

        {step === 3 && (
          <form
            className="slm-ng-config"
            onSubmit={(ev) => {
              ev.preventDefault();
              start();
            }}
          >
            <fieldset className="slm-group">
              <legend>{t.names}</legend>
              <div className="slm-names">
                <NameField
                  label={t.directorName}
                  value={director}
                  onChange={setDirector}
                  onRoll={() => setDirector(randomDirector())}
                  rollAria={t.rollAria(t.directorName)}
                  error={nameError && !director.trim()}
                />
                <NameField
                  label={t.agencyName}
                  value={agency}
                  onChange={setAgency}
                  onRoll={() => setAgency(randomAgency())}
                  rollAria={t.rollAria(t.agencyName)}
                  error={nameError && !agency.trim()}
                />
              </div>
              {nameError && (!director.trim() || !agency.trim()) && (
                <p className="slm-error" role="alert">
                  {t.nameRequired}
                </p>
              )}
            </fieldset>

            <fieldset className="slm-group">
              <legend>{t.difficulty}</legend>
              <GModeSwitch<'1' | '2' | '3'>
                label={t.difficulty}
                value={String(difficulty) as '1' | '2' | '3'}
                onChange={(v) => {
                  setDifficulty(Number(v) as Difficulty);
                  setTouchedDiff(true);
                }}
                options={([1, 2, 3] as Difficulty[]).map((d) => ({
                  value: String(d) as '1' | '2' | '3',
                  label: t.difficultyCards[d - 1].name,
                  tone: d === 1 ? 'ok' : d === 2 ? 'action' : 'danger',
                }))}
              />
              <p className="slm-diff-line">{rivalsLocked ? `${t.rivals}: ${t.afterTutorial}` : t.rivalsLine(rivalCount(difficulty))}</p>
            </fieldset>

            <Disclosure label={t.advanced} hint={t.advancedHint} defaultOpen={entry.kind === 'sandbox'} reduced={reduced}>
              {entry.kind === 'sandbox' && (
                <fieldset className="slm-group">
                  <legend>{t.world}</legend>
                  <Segmented<Continent>
                    label={s.startRegion}
                    value={region}
                    onChange={setRegion}
                    options={CONTINENTS.map((c) => ({ value: c, label: s.continents[c] }))}
                  />
                  <div className="slm-two">
                    <Segmented<number> label={s.capital} value={cash} onChange={setCash} options={CAPITALS.map((v) => ({ value: v, label: t.money(v) }))} />
                    <Segmented<ObjectiveKind>
                      label={s.objective}
                      value={objective}
                      onChange={setObjective}
                      options={(['profit', 'quick', 'destroy', 'rescue'] as ObjectiveKind[]).map((o) => ({ value: o, label: s.objectiveNames[o] }))}
                    />
                  </div>
                  {objective === 'quick' ? (
                    <Segmented<number> label={s.target} value={target} onChange={setTarget} options={TARGETS.map((v) => ({ value: v, label: t.money(v) }))} />
                  ) : (
                    <Segmented<number>
                      label={s.deadline}
                      value={days}
                      onChange={setDays}
                      options={DEADLINES.map((d) => ({ value: d, label: d ? t.days(d) : t.noDeadline }))}
                    />
                  )}
                  <Stepper label={t.rivals} value={sandboxRivals} min={0} max={4} onChange={setRivals} format={(v) => (v === 0 ? s.rivalsNone : String(v))} />
                </fieldset>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={hardcore}
                className="slm-hardcore"
                onClick={() => {
                  sfx(hardcore ? 'click' : 'alert');
                  setHardcore(!hardcore);
                }}
              >
                <Skull className="slm-hardcore-icon" size={30} strokeWidth={1.75} aria-hidden="true" />
                <span className="slm-hardcore-text">
                  <strong>{t.hardcore}</strong>
                  <span>{hardcore ? t.hardcoreOn : t.hardcoreOff}</span>
                </span>
                <span className="g-toggle slm-hardcore-switch" aria-checked={hardcore} aria-hidden="true" />
              </button>
            </Disclosure>

            {/* Enter num campo de nome envia o formulário. */}
            <button type="submit" hidden tabIndex={-1} />
          </form>
        )}
      </div>

      <div className="slm-ng-foot">
        {step === 1 ? (
          <>
            <span className="slm-ng-foot-info">{t.stepOf(1, 3)}</span>
            <button type="button" className="g-btn g-btn--primary g-btn--lg" onClick={() => goStep(2)}>
              {compact && phoneDetails ? t.chooseThis : o.next}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </>
        ) : step === 2 ? (
          <>
            <button type="button" className="g-btn g-btn--ghost" onClick={() => goStep(1)}>
              <ArrowLeft size={18} aria-hidden="true" />
              {t.backToScenarios}
            </button>
            <button type="button" className="g-btn g-btn--primary g-btn--lg" onClick={() => goStep(3)}>
              {t.next}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="g-btn g-btn--ghost" onClick={() => goStep(2)}>
              <ArrowLeft size={18} aria-hidden="true" />
              {o.back}
            </button>
            <button type="button" className={`g-btn g-btn--lg ${hardcore ? 'g-btn--danger' : 'g-btn--primary'}`} onClick={start}>
              {hardcore && <Skull size={18} aria-hidden="true" />}
              {t.start}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function NameField({
  label,
  value,
  onChange,
  onRoll,
  rollAria,
  error,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  onRoll(): void;
  rollAria: string;
  error: boolean;
}) {
  const id = useRef(`slm-name-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className="slm-name">
      <label htmlFor={id} className="slm-field-label">
        {label}
      </label>
      <div className="slm-name-row">
        <input
          id={id}
          className="g-input slm-input"
          value={value}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="g-btn g-btn--icon g-btn--ghost slm-roll"
          aria-label={rollAria}
          onClick={() => {
            sfx('type');
            onRoll();
          }}
        >
          <Dices size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Details({
  t,
  s,
  lang,
  entry,
  difficulty,
  rivals,
  compact,
  title,
  outcome,
  onBack,
}: {
  t: NewGameStrings;
  s: Strings;
  lang: Lang;
  entry: Entry;
  difficulty: Difficulty;
  rivals: string;
  compact: boolean;
  title: string;
  outcome: string;
  onBack(): void;
}) {
  const p = entry.preset;
  const brief = entry.kind === 'sandbox' ? t.sandboxBrief : presetText(lang, p).brief;
  const unitName = (id: string) => itemName(id, lang);
  const placeName = (id: string) => countryName(id, lang);

  const fleet = p.startUnits.filter((u) => ITEMS[u]?.cls === 'cargo');
  const escortCount = new Map<string, number>();
  for (const u of p.startUnits) if (ITEMS[u]?.cls !== 'cargo') escortCount.set(u, (escortCount.get(u) ?? 0) + 1);
  const escort = [...escortCount].map(([u, n]) => (n > 1 ? `${n}× ${unitName(u)}` : unitName(u)));
  const region = regionOf(p);

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: 'fleet', label: t.fleet, value: fleet.map(unitName).join(', ') || '—' },
    { icon: 'team', label: t.escort, value: escort.join(', ') || '—' },
    { icon: 'station-safehouse', label: t.stations, value: p.startStations.map((x) => `${t.tiers[x.level]} · ${placeName(x.countryId)}`).join(', ') || '—' },
    { icon: 'money', label: t.cash, value: t.money(Math.round(p.cash * CASH_MULT[difficulty])) },
    {
      icon: 'rival',
      label: t.rivals,
      value: entry.kind === 'sandbox' ? rivals : (p as { locked?: string[] }).locked?.includes('rivals') ? t.afterTutorial : t.rivalsBy(rivals, t.difficultyCards[difficulty - 1].name),
    },
    { icon: 'director', label: t.homeBase, value: placeName(p.startCountry) },
  ];

  return (
    <article className="slm-details" aria-labelledby="slm-details-title">
      {compact && (
        <button type="button" className="g-btn g-btn--ghost slm-back slm-details-back" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          {t.backToScenarios}
        </button>
      )}
      <span className="slm-details-kicker">{outcome}</span>
      <h3 className="slm-details-title" id="slm-details-title">
        {title}
      </h3>
      <div className="slm-details-grid">
        <div className="slm-details-text">
          <p className="slm-details-brief">{brief}</p>
          {entry.kind === 'tutorial' && <p className="slm-details-note">{t.tutorialNote}</p>}
        </div>
        <MiniMap
          region={region}
          home={p.startCountry}
          stations={p.startStations.map((x) => x.countryId)}
          label={t.regionAria(region.map((c) => s.continents[c]).join(', '))}
        />
      </div>
      <h4 className="slm-details-sub">{t.youStartWith}</h4>
      <dl className="slm-start-list">
        {rows.map((r) => (
          <div key={r.label}>
            <dt>
              <GameIcon id={r.icon} size={18} accent="var(--sl-stamp-red)" />
              {r.label}
            </dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
