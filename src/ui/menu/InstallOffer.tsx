import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Check, Download, Share, SquarePlus, X } from 'lucide-react';
import { ActionButton } from './controls';
import { ease, f } from './ease';
import { promptInstall, useInstall } from './install';
import { sfx } from './settings';
import type { Strings } from './strings';

function IosSteps({ s, onClose, reduced }: { s: Strings; onClose?: () => void; reduced: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced || !box.current || !onClose) return;
    const tw = gsap.fromTo(box.current, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: f(10), ease: ease.softLand });
    return () => {
      tw.kill();
    };
  }, [reduced, onClose]);
  return (
    <div ref={box} className="g-tip slm-install-ios" role="note" aria-label={s.install.iosTitle}>
      <div className="slm-install-ios-head">
        <strong>{s.install.iosTitle}</strong>
        {onClose && (
          <button type="button" className="slm-install-close" aria-label={s.install.close} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <ol>
        <li>
          <Share size={18} aria-hidden="true" />
          <span>{s.install.iosStep1}</span>
        </li>
        <li>
          <SquarePlus size={18} aria-hidden="true" />
          <span>{s.install.iosStep2}</span>
        </li>
      </ol>
    </div>
  );
}

/** "Instalar o app" no Título: só aparece quando dá para instalar (ou no iOS, com as instruções). */
export function InstallTitleOffer({ s, reduced, innerRef }: { s: Strings; reduced: boolean; innerRef?: React.Ref<HTMLDivElement> }) {
  const mode = useInstall();
  const [ios, setIos] = useState(false);
  if (mode !== 'prompt' && mode !== 'ios') return null;
  return (
    <div ref={innerRef} className="slm-install-wrap">
      <button
        type="button"
        className="slm-install"
        aria-expanded={mode === 'ios' ? ios : undefined}
        onClick={() => {
          sfx('click');
          if (mode === 'prompt') void promptInstall();
          else setIos((v) => !v);
        }}
      >
        <Download size={18} strokeWidth={2} aria-hidden="true" />
        <span className="slm-install-label">{s.install.cta}</span>
        <span className="slm-install-meta">{s.install.meta}</span>
      </button>
      {mode === 'ios' && ios && <IosSteps s={s} reduced={reduced} onClose={() => setIos(false)} />}
    </div>
  );
}

/** Bloco "App" de Configurações: instalar, instruções do iOS ou o aviso de que já está instalado. */
export function InstallSettings({ s }: { s: Strings }) {
  const mode = useInstall();
  if (mode === 'none') return null;
  return (
    <div className="slm-field slm-install-settings">
      <span className="slm-field-label">{s.install.title}</span>
      {mode === 'installed' ? (
        <p className="slm-install-done">
          <Check size={16} aria-hidden="true" />
          {s.install.installed}
        </p>
      ) : (
        <>
          <p className="slm-help">{s.install.help}</p>
          {mode === 'prompt' ? (
            <div>
              <ActionButton onClick={() => (sfx('click'), void promptInstall())}>
                <Download size={18} aria-hidden="true" />
                {s.install.cta}
              </ActionButton>
            </div>
          ) : (
            <IosSteps s={s} reduced />
          )}
        </>
      )}
    </div>
  );
}
