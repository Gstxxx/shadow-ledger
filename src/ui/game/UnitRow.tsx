import type { ReactNode } from 'react';
import type { CombatType, Unit } from '../../game/types';
import { def, rankOf, upkeepOf } from '../../game/units';
import { useT } from '../../i18n';
import type { Key } from '../../i18n';
import { classLabel, itemName, traitBlurb, traitName } from '../../i18n/lookup';
import { Portrait } from './Portrait';
import { GUnitCard } from '../../art';

const STR_KEYS: [CombatType | 'convert', Key][] = [
  ['legal', 'game.unitRow.pip.legal'],
  ['urban', 'game.unitRow.pip.urban'],
  ['army', 'game.unitRow.pip.army'],
  ['air', 'game.unitRow.pip.air'],
  ['convert', 'game.unitRow.pip.convert'],
];

export function StrengthPips({ unit }: { unit: Unit }) {
  const { t } = useT();
  const d = def(unit.itemId);
  return (
    <span className="pips mono">
      {STR_KEYS.filter(([k]) => d.str[k] > 0).map(([k, lk]) => (
        <span key={k} className="pip" title={`${t(lk)}: ${unit.hp[k]}/${d.str[k]}`}>
          {t(lk)}
          <b className={unit.hp[k] < d.str[k] ? 'low' : ''}>{unit.hp[k]}</b>
        </span>
      ))}
    </span>
  );
}

export function UnitRow({ unit, action, selected, onClick }: { unit: Unit; action?: ReactNode; selected?: boolean; onClick?: () => void }) {
  const { t, fmt, lang } = useT();
  const d = def(unit.itemId);
  const rank = rankOf(unit);
  const status = unit.injury
    ? unit.injury.kind === 'wounded'
      ? t('game.unitRow.wounded', { n: Math.ceil(unit.injury.days ?? 0) })
      : t('game.unit.status.damaged.label')
    : unit.idle
      ? t('game.unit.status.idle.label')
      : null;
  return (
    <GUnitCard
      className="ur-card"
      portrait={<Portrait unit={unit} size={40} />}
      name={unit.name}
      role={
        <>
          {itemName(unit.itemId, lang)}
          {d.cls === 'cargo' ? ` · ${t('game.unit.cargoSpecs', { weight: d.weight, speed: d.speed ?? 0 })}` : ` · ${classLabel(d.cls, lang)}`}
        </>
      }
      rank={Math.min(3, rank)}
      out={status ?? undefined}
      selected={selected}
      stats={
        <span className="ur-tags">
          {d.cls !== 'cargo' && <StrengthPips unit={unit} />}
          {unit.traits.map((tr) => (
            <span key={tr} className={`g-chip ${tr === 'nervous' || tr === 'demanding' ? 'g-chip--danger' : 'g-chip--ok'}`} title={traitBlurb(tr, lang)}>
              {traitName(tr, lang)}
            </span>
          ))}
        </span>
      }
      side={
        <span className="ur-side">
          <span className="mono hint-sm">{t('game.unitRow.perMonth', { price: fmt.money(upkeepOf(unit)) })}</span>
          {!onClick && action}
        </span>
      }
      onClick={onClick}
    />
  );
}
