import { Disclosure, Segmented, Slider, Toggle } from '../controls';
import type { Strings } from '../strings';
import { LANGS, LANG_LABEL, useT, type Lang } from '../../../i18n';
import type { MenuSettings } from '../types';
import { InstallSettings } from '../InstallOffer';
import { sfx } from '../settings';

interface Props {
  s: Strings;
  value: MenuSettings;
  onChange(patch: Partial<MenuSettings>): void;
}

/** Agrupadas: Jogo e Som à vista; o que quase ninguém mexe fica em "Avançado". */
export function Settings({ s, value, onChange }: Props) {
  const { lang, setLang } = useT();
  return (
    <div className="slm-settings">
      <section className="slm-settings-group" data-enter aria-label={s.groupGame}>
        <h3 className="slm-settings-h">{s.groupGame}</h3>
        <Segmented<Lang> label={s.language} value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))} />
        <Segmented<1 | 2 | 4>
          label={s.defaultSpeed}
          value={value.defaultSpeed}
          onChange={(defaultSpeed) => onChange({ defaultSpeed })}
          options={[
            { value: 1, label: '1×' },
            { value: 2, label: '2×' },
            { value: 4, label: '4×' },
          ]}
        />
      </section>
      <section className="slm-settings-group" data-enter aria-label={s.groupSound}>
        <h3 className="slm-settings-h">{s.groupSound}</h3>
        <div className="slm-settings-pair">
          <Slider label={s.music} value={value.musicVolume} onChange={(musicVolume) => onChange({ musicVolume })} />
          <Slider label={s.sfx} value={value.sfxVolume} onChange={(sfxVolume) => onChange({ sfxVolume })} onCommit={() => sfx('click')} />
        </div>
      </section>
      <div data-enter>
        <Disclosure label={s.advanced} reduced={value.reducedMotion}>
          <Toggle label={s.reducedMotion} checked={value.reducedMotion} onChange={(reducedMotion) => onChange({ reducedMotion })} help={s.reducedMotionHelp} />
          <Toggle label={s.analystMuted} checked={value.analystMuted} onChange={(analystMuted) => onChange({ analystMuted })} help={s.analystMutedHelp} />
          <InstallSettings s={s} />
        </Disclosure>
      </div>
    </div>
  );
}
