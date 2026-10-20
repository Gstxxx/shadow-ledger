// Tela "Campanha" no dossiê do menu: os 10 Capítulos, o Dossiê de pistas, a configuração inicial
// (Diretor, Origem, Dificuldade, Hardcore) e o Briefing antes de cada capítulo.
import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft, ArrowRight, Check, Lock, Skull } from 'lucide-react';
import { GModeSwitch } from '../../../art/game-ui-3';
import { GModal } from '../../../art/game-ui-2';
import { GameIcon } from '../../../art/icons/GameIcon';
import { FIRST_NAMES, LAST_NAMES } from '../../../game/data/names';
import { useT, type Key } from '../../../i18n';
import { itemName } from '../../../i18n/lookup';
import { ItemIllustration } from '../../item-illustrations';
import { Disclosure, Toggle } from '../controls';
import { ease, f } from '../ease';
import { sfx } from '../settings';
import { DirectorStep } from '../screens/DirectorStep';
import { NameField } from '../screens/NewGame';
import { useNewGameStrings } from '../screens/newGameStrings';
import { useOriginStrings } from '../screens/originStrings';
import type { CampaignMenuProps, CampaignView, ChapterInfo, Difficulty } from './types';
import './campaign.css';

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const CHAPTERS = Array.from({ length: 10 }, (_, i) => i + 1);

type View = 'home' | 'setup' | 'briefing';

export function CampaignScreen({ view, chapters, onNew, onPlay, onAbandon, reduced }: CampaignMenuProps & { reduced: boolean }) {
  const { t } = useT();
  const [mode, setMode] = useState<View>('home');
  const [confirm, setConfirm] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const prev = useRef(mode);
  const ch = (n: number, k: string) => t(`campaign.ch.${n}.${k}` as Key);

  // Troca de vista: pousa da direita (ou da esquerda ao voltar), como os passos da Nova partida.
  useLayoutEffect(() => {
    if (prev.current === mode) return;
    const back = mode === 'home';
    prev.current = mode;
    body.current?.closest('.slm-dossier-body')?.scrollTo({ top: 0 });
    if (reduced || !body.current) return;
    gsap.fromTo(body.current, { x: back ? -28 : 28, autoAlpha: 0.2 }, { x: 0, autoAlpha: 1, duration: f(10), ease: ease.softLand });
  }, [mode, reduced]);

  const go = (m: View) => {
    sfx('click');
    setMode(m);
  };

  return (
    <div className="slm-cmp" ref={body}>
      {mode === 'setup' ? (
        <Setup
          reduced={reduced}
          onBack={() => go('home')}
          onConfirm={(cfg) => {
            onNew(cfg);
            go('briefing');
          }}
        />
      ) : mode === 'briefing' && view ? (
        <Briefing view={view} chapter={chapters.find((c) => c.n === view.chapter)} reduced={reduced} onBack={() => go('home')} onStart={onPlay} />
      ) : (
        <>
          <p className="slm-cmp-intro" data-enter>
            {t('campaign.intro')}
          </p>
          {view?.hardcore && (
            <p className="slm-cmp-hardcore">
              <Skull size={16} aria-hidden="true" />
              {t('campaign.hardcoreOn')}
            </p>
          )}
          <div className="slm-cmp-cta" data-enter>
            {view && !view.over ? (
              <button type="button" className="g-btn g-btn--primary g-btn--lg" onClick={() => go('briefing')}>
                {t('campaign.continue', { n: view.chapter })}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : !view ? (
              <button type="button" className="g-btn g-btn--primary g-btn--lg" onClick={() => go('setup')}>
                {t('campaign.begin')}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <p className="slm-cmp-finished">
                <Check size={18} aria-hidden="true" />
                {t('campaign.finished')}
              </p>
            )}
          </div>

          <section className="slm-cmp-sec" aria-labelledby="slm-cmp-ch" data-enter>
            <h3 id="slm-cmp-ch" className="slm-cmp-h">
              {t('campaign.chapters')}
            </h3>
            <ol className="slm-cmp-chapters">
              {CHAPTERS.map((n) => {
                const done = !!view?.completed.includes(n);
                const cur = !!view && !view.over && view.chapter === n;
                const open = done || cur || (!view && n === 1);
                return (
                  <li key={n} className={`slm-cmp-ch${done ? ' is-done' : ''}${cur ? ' is-current' : ''}${open ? '' : ' is-locked'}`} aria-current={cur ? 'step' : undefined}>
                    <span className="slm-cmp-ch-n" aria-hidden="true">
                      {done && <Check size={16} strokeWidth={3} />}
                      {!done && open && n}
                      {!open && <Lock size={14} />}
                    </span>
                    <span className="slm-cmp-ch-main">
                      <span className="slm-cmp-ch-title">{open ? ch(n, 'title') : t('campaign.chapter', { n })}</span>
                      <span className="slm-cmp-ch-meta">{open ? ch(n, 'region') : t('campaign.locked')}</span>
                    </span>
                    <span className="slm-cmp-ch-tag">{done ? t('campaign.done') : cur ? t('campaign.current') : ''}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="slm-cmp-sec" aria-labelledby="slm-cmp-dossier" data-enter>
            <h3 id="slm-cmp-dossier" className="slm-cmp-h">
              {t('campaign.dossier')}
              <span className="slm-cmp-count">{t('campaign.dossierCount', { n: view?.clues.length ?? 0 })}</span>
            </h3>
            {!view?.clues.length ? (
              <p className="slm-help">{t('campaign.dossierEmpty')}</p>
            ) : (
              <div className="slm-cmp-clues">
                {CHAPTERS.map((n) =>
                  view.clues.includes(n) ? (
                    <Disclosure key={n} label={`${n}. ${ch(n, 'clue.title')}`} className="slm-cmp-clue">
                      <p className="slm-cmp-clue-body">{ch(n, 'clue.body')}</p>
                    </Disclosure>
                  ) : (
                    <div key={n} className="slm-cmp-clue is-locked" aria-label={t('campaign.clueLocked')}>
                      <span className="slm-cmp-clue-n">{n}.</span>
                      <span className="slm-cmp-redact" aria-hidden="true" />
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {view && (
            <button
              type="button"
              className="g-btn g-btn--ghost slm-cmp-abandon"
              onClick={() => {
                sfx('alert');
                setConfirm(true);
              }}
            >
              {t('campaign.abandon')}
            </button>
          )}
          <GModal
            open={confirm}
            variant="dossier"
            tone="bad"
            title={t('campaign.abandon')}
            onClose={() => setConfirm(false)}
            actions={
              <>
                <button type="button" className="g-btn g-btn--ghost" onClick={() => setConfirm(false)}>
                  {t('campaign.lose.menu')}
                </button>
                <button
                  type="button"
                  className="g-btn g-btn--danger"
                  onClick={() => {
                    setConfirm(false);
                    onAbandon();
                  }}
                >
                  {t('campaign.abandonYes')}
                </button>
              </>
            }
          >
            <p>{t('campaign.abandonConfirm')}</p>
          </GModal>
        </>
      )}
    </div>
  );
}

// ── Configuração inicial ────────────────────────────────────────────────
function Setup({ reduced, onBack, onConfirm }: { reduced: boolean; onBack(): void; onConfirm: CampaignMenuProps['onNew'] }) {
  const { t } = useT();
  const ng = useNewGameStrings();
  const o = useOriginStrings();
  const [director, setDirector] = useState(() => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`);
  const [origin, setOrigin] = useState<CampaignView['origin']>('exagent');
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [hardcore, setHardcore] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <div className="slm-cmp-setup">
      <h3 className="slm-cmp-h">{t('campaign.newSetup')}</h3>
      <NameField
        label={ng.directorName}
        value={director}
        onChange={setDirector}
        onRoll={() => setDirector(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`)}
        rollAria={ng.rollAria(ng.directorName)}
        error={err && !director.trim()}
      />
      <DirectorStep o={o} value={origin} reduced={reduced} onChange={setOrigin} onConfirm={() => undefined} />
      <div className="slm-field">
        <span className="slm-field-label">{ng.difficulty}</span>
        <GModeSwitch<'1' | '2' | '3'>
          label={ng.difficulty}
          value={String(difficulty) as '1' | '2' | '3'}
          onChange={(v) => setDifficulty(Number(v) as Difficulty)}
          options={([1, 2, 3] as Difficulty[]).map((d) => ({ value: String(d) as '1' | '2' | '3', label: ng.difficultyCards[d - 1].name, tone: d === 1 ? 'ok' : d === 2 ? 'action' : 'danger' }))}
        />
      </div>
      <Toggle label={ng.hardcore} checked={hardcore} onChange={setHardcore} help={t('campaign.lose.hardcore')} tone="danger" />
      <div className="slm-cmp-foot">
        <button type="button" className="g-btn g-btn--ghost" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          {t('common.back' as Key)}
        </button>
        <button
          type="button"
          className={`g-btn g-btn--lg ${hardcore ? 'g-btn--danger' : 'g-btn--primary'}`}
          onClick={() => {
            if (!director.trim()) {
              setErr(true);
              sfx('alert');
              return;
            }
            sfx('click');
            onConfirm({ director: director.trim(), agency: t('campaign.agency' as Key), origin, difficulty, hardcore });
          }}
        >
          {t('campaign.begin')}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Briefing ───────────────────────────────────────────────────────────
function Briefing({ view, chapter, reduced, onBack, onStart }: { view: CampaignView; chapter?: ChapterInfo; reduced: boolean; onBack(): void; onStart(): void }) {
  const { t, fmt } = useT();
  const ng = useNewGameStrings();
  const n = view.chapter;
  const ch = (k: string) => t(`campaign.ch.${n}.${k}` as Key);
  const root = useRef<HTMLElement>(null);
  const p = chapter?.preset;
  useLayoutEffect(() => {
    if (reduced || !root.current) return;
    const tl = gsap.timeline();
    tl.fromTo(root.current.querySelector('.slm-brief-stamp'), { scale: 1.6, autoAlpha: 0, rotation: -14 }, { scale: 1, autoAlpha: 1, rotation: -6, duration: f(8), ease: ease.snapSettle }, f(4)).fromTo(
      root.current.querySelectorAll('[data-line]'),
      { y: 10, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: f(10), ease: ease.softLand, stagger: f(3) },
      f(6),
    );
    return () => {
      tl.progress(1).kill();
    };
  }, [reduced]);
  return (
    <article ref={root} className="slm-brief" aria-labelledby="slm-brief-title">
      <header className="slm-brief-head">
        <span className="slm-brief-kicker">
          {t('campaign.brief.kicker')} · {t('campaign.chapterOf', { n })}
        </span>
        <h3 id="slm-brief-title" className="slm-brief-title">
          {ch('title')}
        </h3>
        <span className="slm-brief-stamp" aria-hidden="true">
          {t('campaign.brief.kicker')}
        </span>
      </header>
      <p className="slm-brief-hook" data-line>
        {ch('hook')}
      </p>
      <section className="slm-brief-analyst" aria-label={t('campaign.brief.analyst')} data-line>
        <span className="slm-brief-analyst-who">
          <GameIcon id="intel" size={18} accent="var(--sl-stamp-blue)" />
          {t('campaign.brief.analyst')}
        </span>
        {[1, 2, 3].map((i) => (
          <p key={i} className="slm-brief-line">
            {ch(`analyst.${i}`)}
          </p>
        ))}
      </section>
      <dl className="slm-brief-facts" data-line>
        <div>
          <dt>{t('campaign.brief.objective')}</dt>
          <dd>{p ? ng.outcome(p.objective, p.days, p.target) : '—'}</dd>
        </div>
        <div>
          <dt>{t('campaign.brief.deadline')}</dt>
          <dd>{p?.days ? t('campaign.brief.days', { n: p.days }) : ng.noDeadline}</dd>
        </div>
        <div>
          <dt>{t('campaign.brief.region')}</dt>
          <dd>{ch('region')}</dd>
        </div>
      </dl>
      <section className="slm-brief-carry" data-line>
        <h4>{t('campaign.brief.carried')}</h4>
        <dl>
          <div>
            <dt>{t('campaign.brief.director')}</dt>
            <dd>{view.director}</dd>
          </div>
          <div>
            <dt>{t('campaign.brief.cash')}</dt>
            <dd>
              {p ? fmt.money(p.cash + view.cashBonus) : '—'}
              {view.cashBonus > 0 && <span className="slm-brief-bonus">{t('campaign.brief.cashBonus', { bonus: fmt.money(view.cashBonus) })}</span>}
            </dd>
          </div>
          <div>
            <dt>{t('campaign.brief.reputation')}</dt>
            <dd>{n > 1 ? t('campaign.brief.reputationNote') : '—'}</dd>
          </div>
        </dl>
        <h4>{t('campaign.brief.veterans')}</h4>
        {view.veterans.length ? (
          <ul className="slm-brief-vets">
            {view.veterans.map((u) => (
              <li key={u.uid}>
                <ItemIllustration id={u.itemId} size="sm" alt="" />
                <span>
                  <strong>{u.name}</strong>
                  <small>{itemName(u.itemId)}</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="slm-help">{t('campaign.brief.noVeterans')}</p>
        )}
      </section>
      <div className="slm-cmp-foot">
        <button type="button" className="g-btn g-btn--ghost" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          {t('campaign.chapters')}
        </button>
        <button
          type="button"
          className={`g-btn g-btn--lg ${view.hardcore ? 'g-btn--danger' : 'g-btn--primary'}`}
          onClick={() => {
            sfx('click');
            onStart();
          }}
        >
          {view.hardcore && <Skull size={18} aria-hidden="true" />}
          {t('campaign.brief.start')}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
