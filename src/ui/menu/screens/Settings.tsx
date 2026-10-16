import { Segmented, Slider, Toggle } from '../controls';
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

export function Settings({ s, value, onChange }: Props) {
  const { lang, setLang } = useT();
  return (
    <div className="slm-settings">
      <div data-enter>
        <Segmented<Lang>
          label={s.language}
          value={lang}
          onChange={setLang}
          options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
        />
      </div>
      <div data-enter>
        <InstallSettings s={s} />
      </div>
      <div className="slm-settings-pair" data-enter>
        <Slider label={s.music} value={value.musicVolume} onChange={(musicVolume) => onChange({ musicVolume })} />
        <Slider label={s.sfx} value={value.sfxVolume} onChange={(sfxVolume) => onChange({ sfxVolume })} onCommit={() => sfx('click')} />
      </div>
      <div data-enter>
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
      </div>
      <div data-enter>
        <Toggle label={s.analystMuted} checked={value.analystMuted} onChange={(analystMuted) => onChange({ analystMuted })} help={s.analystMutedHelp} />
      </div>
      <div data-enter>
        <Toggle label={s.reducedMotion} checked={value.reducedMotion} onChange={(reducedMotion) => onChange({ reducedMotion })} help={s.reducedMotionHelp} />
      </div>
    </div>
  );
}
