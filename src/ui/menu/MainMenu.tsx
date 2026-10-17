import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Volume2 } from 'lucide-react';
import '../../art/tokens.css';
import '../../art/game-ui.css';
import './menu.css';
import { audio } from '../../audio/engine';
import { PRESETS } from '../../game/data/rules';
import { Dossier } from './Dossier';
import { InstallTitleOffer } from './InstallOffer';
import { ease, f } from './ease';
import { buildIntro, finalState, HANDOFF_AT, type IntroEls } from './intro';
import { COLS, LEDGER_CH, ledgerRows } from './ledger';
import { sfx, useMenuSettings } from './settings';
import { useLang } from '../../i18n';
import { installSafeAreaDebug } from '../game/portrait/safeArea';
import { useStrings } from './strings';
import { Continue } from './screens/Continue';
import { Credits } from './screens/Credits';
import { HowToPlay } from './screens/HowToPlay';
import { NewGame } from './screens/NewGame';
import { Settings } from './screens/Settings';
import type { MainMenuProps, Screen } from './types';
import { WorldRoutes } from './WorldRoutes';

const ROWS = 40;
const CENTER = 26;

export function MainMenu(props: MainMenuProps) {
  const [settings, update] = useMenuSettings(props.settings, props.onSettingsChange);
  const s = useStrings();
  const lang = useLang();
  const reduced = settings.reducedMotion;
  const presets = props.presets ?? PRESETS;
  const tutorial = presets.find((p) => p.id === props.tutorialPresetId);
  const saves = props.saves ?? [];

  const [phase, setPhase] = useState<'intro' | 'title'>(props.skipIntro || reduced ? 'title' : 'intro');
  const [screen, setScreen] = useState<Screen | null>(null);
  const [closing, setClosing] = useState(false);
  const [soundOn, setSoundOn] = useState(() => audio.unlocked);

  const rows = useMemo(() => ledgerRows(ROWS), []);

  const root = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const rowsEl = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const lamp = useRef<HTMLDivElement>(null);
  const black = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const titleCol = useRef<HTMLElement>(null);
  const wordmark = useRef<HTMLHeadingElement>(null);
  const wmText = useRef<HTMLSpanElement>(null);
  const wmBar = useRef<HTMLSpanElement>(null);
  const rule1 = useRef<HTMLElement>(null);
  const rule2 = useRef<HTMLElement>(null);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const extra = useRef<HTMLParagraphElement>(null);
  const installRef = useRef<HTMLDivElement>(null);
  const intro = useRef<gsap.core.Timeline | null>(null);

  const els = useCallback(
    (): IntroEls => ({
      root: root.current!,
      camera: camera.current!,
      rows: rowsEl.current!,
      dim: dim.current!,
      lamp: lamp.current!,
      black: black.current!,
      world: world.current!,
      wordmark: wordmark.current!,
      wmText: wmText.current!,
      wmBar: wmBar.current!,
      wmRules: [rule1.current!, rule2.current!],
      nav: navRefs.current.filter((b): b is HTMLButtonElement => !!b),
      extras: [installRef.current, extra.current].filter((n): n is HTMLDivElement | HTMLParagraphElement => !!n),
    }),
    [],
  );

  // Debug ?safe=top,right,bottom,left (px) da ui-polish: simula os recortes do iPhone também no menu.
  useEffect(() => {
    installSafeAreaDebug();
  }, []);

  // Música do menu: o motor só toca depois do primeiro gesto (política de autoplay).
  useEffect(() => {
    audio.setScene('menu');
    const unlock = () => {
      audio.unlock();
      audio.setScene('menu');
      setSoundOn(true);
    };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  // Abertura. Espera as fontes: as medidas do nome e das colunas dependem delas.
  useLayoutEffect(() => {
    if (phase !== 'intro') return;
    let tl: gsap.core.Timeline | null = null;
    let dead = false;
    const skip = () => {
      if (!tl) {
        dead = true;
        setPhase('title');
        return;
      }
      if (tl.time() < HANDOFF_AT) tl.seek(HANDOFF_AT);
      tl.timeScale(1.7);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Tab') return;
      skip();
    };
    const onResize = () => tl?.progress(1);
    const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);
    fontsReady.then(() => {
      if (dead) return;
      tl = buildIntro(els(), () => {
        intro.current = null;
        setPhase('title');
      });
      intro.current = tl;
      // Inspeção quadro a quadro em desenvolvimento: window.__slIntro.pause().seek(2.6)
      if (import.meta.env.DEV) {
        const w = window as unknown as { __slIntro?: gsap.core.Timeline; __timelines?: Record<string, gsap.core.Timeline> };
        w.__slIntro = tl;
        w.__timelines = { main: tl };
      }
    });
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      dead = true;
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      tl?.kill();
    };
    // a abertura roda uma vez por montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Título: estado final + fundo vivo (deriva da página, tarjas novas, luminária balançando).
  useLayoutEffect(() => {
    if (phase !== 'title') return;
    const e = els();
    finalState(e);
    navRefs.current[0]?.focus({ preventScroll: true });
    if (reduced) return;
    const rowEls = Array.from(e.rows.querySelectorAll<HTMLElement>('.slm-row')).slice(0, CENTER + 1);
    const rowH = parseFloat(getComputedStyle(e.rows).getPropertyValue('--row-h')) || 28;
    const ctx = gsap.context(() => {
      gsap.to(e.camera, { y: rowH * 3, duration: 40, ease: ease.cruise, repeat: -1, yoyo: true });
      gsap.fromTo(e.lamp, { '--lx': '58%', '--ly': '40%' }, { '--lx': '66%', '--ly': '46%', duration: 9, ease: ease.softInOut, repeat: -1, yoyo: true });
    }, root);
    let call: gsap.core.Tween | null = null;
    const tick = () => {
      const r = rowEls[Math.floor(Math.random() * rowEls.length)];
      const bars = r.querySelectorAll<HTMLElement>('.slm-bar');
      const on = Number(gsap.getProperty(bars[0], 'scaleX')) > 0.5;
      ctx.add(() => {
        if (on) gsap.to(bars, { scaleX: 0, transformOrigin: '100% 50%', duration: f(9), ease: ease.accelExit, stagger: f(2) });
        else gsap.to(bars, { scaleX: 1, transformOrigin: '0% 50%', duration: f(7), ease: ease.glide, stagger: f(2) });
      });
      call = gsap.delayedCall(1.6 + Math.random() * 2.2, tick);
    };
    call = gsap.delayedCall(1.2, tick);
    return () => {
      call?.kill();
      ctx.revert();
    };
  }, [phase, reduced, els]);

  // Título recua quando um dossiê está aberto.
  useEffect(() => {
    if (phase !== 'title' || !titleCol.current) return;
    const open = screen !== null && !closing;
    if (reduced) {
      gsap.set(titleCol.current, { opacity: open ? 0.3 : 1, x: 0 });
      return;
    }
    gsap.to(titleCol.current, {
      x: open ? -24 : 0,
      opacity: open ? 0.3 : 1,
      duration: open ? f(12) : f(14),
      ease: open ? ease.glide : ease.softLand,
    });
  }, [screen, closing, phase, reduced]);

  // Com um dossiê aberto, o Título sai da ordem de foco e da árvore de acessibilidade.
  useEffect(() => {
    const el = titleCol.current;
    if (!el) return;
    if (screen) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [screen]);

  const pressed = useRef<HTMLButtonElement | null>(null);

  const open = (to: Screen, btn: HTMLButtonElement) => {
    if (screen) return;
    sfx('click');
    pressed.current = btn;
    const bar = btn.querySelector('.slm-nav-bar');
    if (reduced || !bar) {
      setScreen(to);
      return;
    }
    // O item escolhido é "lançado": uma tarja passa por cima dele enquanto o dossiê já entra (≤ 0,45 s no total).
    gsap.fromTo(bar, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: f(6), ease: ease.glide });
    setScreen(to);
  };

  const requestClose = useCallback(() => setClosing(true), []);
  const onClosed = useCallback(() => {
    setScreen(null);
    setClosing(false);
    const btn = pressed.current;
    if (btn) {
      const bar = btn.querySelector('.slm-nav-bar');
      if (bar) gsap.to(bar, { scaleX: 0, transformOrigin: '100% 50%', duration: f(8), ease: ease.accelExit });
      btn.focus({ preventScroll: true });
    }
  }, []);

  const items: { id: Screen; label: string; meta?: string }[] = [
    { id: 'new', label: s.menuNew, meta: s.menuNewMeta(presets.length) },
    { id: 'continue', label: s.menuContinue, meta: s.menuContinueMeta(saves.length) },
    { id: 'howto', label: s.menuHowTo },
    { id: 'settings', label: s.menuSettings },
    { id: 'credits', label: s.menuCredits },
  ];

  const titles: Record<Screen, string> = {
    new: s.newTitle,
    continue: s.continueTitle,
    howto: s.menuHowTo,
    settings: s.settingsTitle,
    credits: s.creditsTitle,
  };

  return (
    <div ref={root} className="slm-root" data-phase={phase} data-reduced={reduced || undefined}>
      <div className="slm-stage" aria-hidden="true">
        <div ref={camera} className="slm-camera">
          <div className="slm-paper" />
          <div ref={rowsEl} className="slm-rows" style={{ ['--ledger-ch' as string]: String(LEDGER_CH) }}>
            {rows.map((r, i) => (
              <div key={i} className="slm-row" data-center={i === CENTER ? 'true' : undefined} style={{ top: `calc(var(--row-h) * ${i - CENTER})` }}>
                <span style={{ width: `${COLS.date}ch` }}>{r.date}</span>
                <span style={{ width: `${COLS.route}ch` }}>{r.route}</span>
                <span style={{ width: `${COLS.item}ch` }}>{r.item}</span>
                <span style={{ width: `${COLS.qty}ch` }}>{r.qty}</span>
                <span style={{ width: `${COLS.amount}ch`, textAlign: 'right' }}>{r.amount}</span>
                {i === CENTER ? (
                  <i className="slm-bar slm-bar--center" />
                ) : (
                  r.bars.map((b, j) => <i key={j} className="slm-bar" style={{ left: `${b.from}ch`, width: `${b.to - b.from}ch` }} />)
                )}
              </div>
            ))}
          </div>
        </div>
        <div ref={dim} className="slm-dim" />
        <div ref={world} className="slm-world-wrap">
          <WorldRoutes animate={!reduced} active={phase === 'title'} />
        </div>
        <div ref={lamp} className="slm-lamp" />
        <div ref={black} className="slm-black" />
      </div>

      <main ref={titleCol} className="slm-title">
        <h1 ref={wordmark} className="slm-wordmark">
          <span ref={wmText} className="slm-wm-text">
            Shadow Ledger
          </span>
          <span ref={wmBar} className="slm-wm-bar" aria-hidden="true" />
          <span className="slm-wm-rules" aria-hidden="true">
            <i ref={rule1} />
            <i ref={rule2} />
          </span>
        </h1>
        <nav className="slm-nav" aria-label={s.appName}>
          {items.map((it, i) => (
            <button
              key={it.id}
              ref={(b) => {
                navRefs.current[i] = b;
              }}
              type="button"
              className="g-menu-item slm-nav-item"
              onPointerEnter={() => {
                if (window.matchMedia?.('(hover: hover)').matches) sfx('hover');
              }}
              onClick={(ev) => open(it.id, ev.currentTarget)}
            >
              <span className="slm-nav-label">{it.label}</span>
              {it.meta && <span className="g-menu-item__meta">{it.meta}</span>}
              <span className="slm-nav-bar" aria-hidden="true" />
            </button>
          ))}
        </nav>
        <InstallTitleOffer s={s} reduced={reduced} innerRef={installRef} />
        <p ref={extra} className="slm-sound-hint" data-on={soundOn || undefined} aria-hidden={soundOn || undefined}>
          <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
          {s.soundHint}
        </p>
      </main>

      {phase === 'intro' && (
        <p className="slm-skip" aria-live="polite">
          {s.skipHint}
        </p>
      )}

      {screen && (
        <Dossier
          key={screen}
          title={titles[screen]}
          backLabel={s.back}
          closing={closing}
          reduced={reduced}
          onRequestClose={requestClose}
          onClosed={onClosed}
        >
          {screen === 'new' && <NewGame s={s} lang={lang} presets={presets} tutorial={tutorial} reduced={reduced} onStart={(cfg) => props.onStart?.(cfg)} />}
          {screen === 'continue' && (
            <Continue
              s={s}
              saves={saves}
              onContinue={props.onContinue}
              onDelete={props.onDeleteSave}
              onExport={props.onExportSave}
              onImport={props.onImportSave}
            />
          )}
          {screen === 'howto' && <HowToPlay reduced={reduced} />}
          {screen === 'settings' && <Settings s={s} value={settings} onChange={update} />}
          {screen === 'credits' && <Credits s={s} reduced={reduced} />}
        </Dossier>
      )}
    </div>
  );
}
