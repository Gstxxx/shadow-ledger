import type { ReactNode } from 'react';
import { TRAITS } from '../../game/data/traits';
import { CLASS_LABEL } from '../../game/data/items';
import type { CombatType, Unit } from '../../game/types';
import { def, rankOf, upkeepOf } from '../../game/units';
import { money } from '../fmt';
import { Portrait } from './Portrait';

const STR_KEYS: [CombatType | 'convert', string][] = [
  ['legal', 'J'],
  ['urban', 'U'],
  ['army', 'M'],
  ['air', 'A'],
  ['convert', 'I'],
];

export function StrengthPips({ unit }: { unit: Unit }) {
  const d = def(unit.itemId);
  return (
    <span className="pips mono">
      {STR_KEYS.filter(([k]) => d.str[k] > 0).map(([k, l]) => (
        <span key={k} className="pip" title={`${l}: ${unit.hp[k]}/${d.str[k]}`}>
          {l}
          <b className={unit.hp[k] < d.str[k] ? 'low' : ''}>{unit.hp[k]}</b>
        </span>
      ))}
    </span>
  );
}

export function UnitRow({ unit, action, selected, onClick }: { unit: Unit; action?: ReactNode; selected?: boolean; onClick?: () => void }) {
  const d = def(unit.itemId);
  const rank = rankOf(unit);
  const status = unit.injury
    ? unit.injury.kind === 'wounded'
      ? `Ferida · ${Math.ceil(unit.injury.days ?? 0)} d`
      : 'Danificada'
    : unit.idle
      ? 'Parada'
      : null;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`unit-row${selected ? ' sel' : ''}${status ? ' out' : ''}`} onClick={onClick}>
      <Portrait unit={unit} size={34} />
      <span className="ur-main">
        <span className="ur-name">
          {unit.name}
          {rank > 0 && <span className="rank">{'▮'.repeat(rank)}</span>}
        </span>
        <span className="ur-sub">
          {d.name}
          {d.cls === 'cargo' ? ` · ${d.weight} t · ${d.speed} km/h` : ` · ${CLASS_LABEL[d.cls]}`}
        </span>
        <span className="ur-tags">
          {d.cls !== 'cargo' && <StrengthPips unit={unit} />}
          {unit.traits.map((t) => (
            <span key={t} className={`trait${t === 'nervous' || t === 'demanding' ? ' neg' : ''}`} title={TRAITS[t].blurb}>
              {TRAITS[t].name}
            </span>
          ))}
          {status && <span className="status">{status}</span>}
        </span>
      </span>
      <span className="ur-side">
        <span className="mono hint-sm">{money(upkeepOf(unit))}/mês</span>
        {action}
      </span>
    </Tag>
  );
}
