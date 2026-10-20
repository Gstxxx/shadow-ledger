// Resultado de um capítulo da Campanha, por cima do jogo: Debriefing (vitória), derrota com "Tentar de novo"
// e, no capítulo 10, a cena final antes de fechar a Campanha. Montado pelo CinematicHost (tela de jogo).
import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Check, RotateCcw, Skull } from 'lucide-react';
import { useT, type Key } from '../../../i18n';
import { itemName, traitName } from '../../../i18n/lookup';
import { audio } from '../../../audio/engine';
import { ItemIllustration } from '../../item-illustrations';
import { SceneCinematic } from '../../cinematics/SceneCinematic';
import { ease, f } from '../ease';
import { sfx } from '../settings';
import type { CampaignResultApi } from './connect';
import { CLUE_SPEAKER, StoryPortrait } from './StoryPortrait';
import './campaign.css';
import './result.css';


export function CampaignResult({ api, reduced }: { api: CampaignResultApi; reduced?: boolean }) {
  const { result } = api;
  const [finale, setFinale] = useState(false);
  const rm = reduced ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (finale) return <SceneCinematic req={{ kind: 'finale' }} reduced={rm} onDone={() => api.advance([])} />;
  if (!result.won) return <Lose api={api} reduced={rm} />;
  return <Debrief api={api} reduced={rm} onFinale={() => setFinale(true)} />;
}

function useEntrance(root: React.RefObject<HTMLElement>, reduced: boolean, won: boolean, money: (v: number) => string = String) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    const tl = gsap.timeline();
    tl.fromTo(el.querySelector('.cr2-band'), { autoAlpha: 0 }, { autoAlpha: 1, duration: f(6), ease: ease.cruise })
      .fromTo(el.querySelector('.cr2-stamp'), { scale: 1.7, autoAlpha: 0, rotation: -14 }, { scale: 1, autoAlpha: 1, rotation: -5, duration: f(8), ease: ease.snapSettle }, f(6))
      .call(() => audio.sfx(won ? 'win' : 'lose'), undefined, f(8))
      .to(el.querySelector('.cr2-band'), { keyframes: [{ x: -6, y: 2 }, { x: 4 }, { x: 0, y: 0 }], duration: f(5), ease: 'steps(3)' }, f(9))
      .fromTo(el.querySelectorAll('[data-in]'), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: f(12), ease: ease.softLand, stagger: f(3) }, f(14));
    // contadores sobem (setter por função)
    el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
      const to = Number(n.dataset.count);
      const face = { v: 0 };
      tl.fromTo(face, { v: 0 }, { v: to, duration: f(22), ease: ease.softInOut, onUpdate: () => void (n.textContent = money(Math.round(face.v))) }, f(12));
    });
    return () => {
      tl.progress(1).kill();
    };
  }, [root, reduced, won]);
}

function Debrief({ api, reduced, onFinale }: { api: CampaignResultApi; reduced: boolean; onFinale(): void }) {
  const { t, fmt, lang } = useT();
  const { result } = api;
  const n = result.chapter;
  const last = n >= 10;
  const MAX_VETERANS = result.maxVeterans ?? 3;
  const root = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string[]>(() =>
    (api.view?.veterans ?? [])
      .map((u) => u.uid)
      .filter((uid) => result.candidates.some((c) => c.uid === uid))
      .slice(0, result.maxVeterans ?? 3),
  );
  useEntrance(root, reduced, true, (v) => fmt.money(v));
  const toggle = (uid: string) => {
    const on = picked.includes(uid);
    if (!on && picked.length >= MAX_VETERANS) {
      sfx('alert');
      return;
    }
    sfx(on ? 'close' : 'open');
    setPicked(on ? picked.filter((x) => x !== uid) : [...picked, uid]);
  };
  const money = (v: number) => fmt.money(v);
  return (
    <div ref={root} className="cr2-root" role="dialog" aria-modal="true" aria-labelledby="cr2-title">
      <div className="cr2-band">
        <span className="cr2-kicker">
          {t('campaign.debrief.kicker')} · {t('campaign.chapterOf', { n })}
        </span>
        <h2 id="cr2-title" className="cr2-stamp cr2-stamp--good">
          {t('campaign.debrief.won')}
        </h2>
        <dl className="cr2-nums">
          <div>
            <dt>{t('campaign.debrief.profit')}</dt>
            <dd data-count={result.profit}>
              {money(result.profit)}
            </dd>
          </div>
          {!last && (
            <div>
              <dt>{t('campaign.debrief.bonus')}</dt>
              <dd data-count={result.cashBonusNext}>
                {money(result.cashBonusNext)}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <div className="cr2-body">
        <article className="cr2-clue cr2-clue--speaker" data-in>
          <StoryPortrait who={CLUE_SPEAKER[n] ?? 'analyst'} size={128} className="cr2-clue-portrait" />
          <span className="cr2-clue-tag">{t('campaign.debrief.newClue')}</span>
          <h3>{t(`campaign.ch.${n}.clue.title` as Key)}</h3>
          <p>{t(`campaign.ch.${n}.clue.body` as Key)}</p>
        </article>
        {!last && (
          <section className="cr2-pick" data-in aria-labelledby="cr2-pick-h">
            <h3 id="cr2-pick-h">
              {t('campaign.debrief.pick')}
              <span className="cr2-pick-count" aria-live="polite">
                {t('campaign.debrief.picked', { n: picked.length })}
              </span>
            </h3>
            <p className="cr2-help">{t('campaign.debrief.pickHelp')}</p>
            {result.candidates.length ? (
              <ul className="cr2-cands">
                {result.candidates.map((u) => {
                  const on = picked.includes(u.uid);
                  return (
                    <li key={u.uid}>
                      <button type="button" className="cr2-cand" aria-pressed={on} onClick={() => toggle(u.uid)} disabled={!on && picked.length >= MAX_VETERANS}>
                        <ItemIllustration id={u.itemId} size="sm" alt="" />
                        <span className="cr2-cand-main">
                          <strong>{u.name}</strong>
                          <small>{itemName(u.itemId, lang)}</small>
                          {u.traits.length > 0 && <small className="cr2-traits">{u.traits.map((x) => traitName(x, lang)).join(' · ')}</small>}
                        </span>
                        <span className="cr2-check" aria-hidden="true">
                          {on && <Check size={16} strokeWidth={3} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="cr2-help">{t('campaign.debrief.noCandidates')}</p>
            )}
          </section>
        )}
      </div>
      <div className="cr2-foot">
        <button
          type="button"
          className="g-btn g-btn--primary g-btn--lg"
          onClick={() => {
            sfx('click');
            if (last) onFinale();
            else api.advance(picked);
          }}
        >
          {last ? t('campaign.debrief.toFinal') : t('campaign.debrief.next', { n: n + 1 })}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Lose({ api, reduced }: { api: CampaignResultApi; reduced: boolean }) {
  const { t } = useT();
  const { result } = api;
  const root = useRef<HTMLDivElement>(null);
  useEntrance(root, reduced, false);
  const ended = !!result.hardcoreEnded;
  return (
    <div ref={root} className="cr2-root cr2-root--lose" role="dialog" aria-modal="true" aria-labelledby="cr2-title">
      <div className="cr2-band">
        <span className="cr2-kicker">{t('campaign.chapterOf', { n: result.chapter })}</span>
        <h2 id="cr2-title" className="cr2-stamp cr2-stamp--bad">
          {t('campaign.lose.kicker')}
        </h2>
      </div>
      <div className="cr2-body">
        <article className="cr2-clue cr2-clue--bad" data-in>
          <h3>{t('campaign.lose.title', { n: result.chapter })}</h3>
          <p>{ended ? t('campaign.lose.hardcore') : t('campaign.lose.body')}</p>
        </article>
      </div>
      <div className="cr2-foot">
        <button type="button" className="g-btn g-btn--ghost" onClick={api.toMenu}>
          {t('campaign.lose.menu')}
        </button>
        {!ended && (
          <button
            type="button"
            className={`g-btn g-btn--lg ${api.view?.hardcore ? 'g-btn--danger' : 'g-btn--primary'}`}
            onClick={() => {
              sfx('click');
              api.retry();
            }}
          >
            {api.view?.hardcore ? <Skull size={18} aria-hidden="true" /> : <RotateCcw size={18} aria-hidden="true" />}
            {t('campaign.lose.retry')}
          </button>
        )}
      </div>
    </div>
  );
}
