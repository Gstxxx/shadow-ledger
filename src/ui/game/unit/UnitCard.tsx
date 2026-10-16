import type { ReactNode } from 'react';
import { GameIcon } from '../../../art';
import { STATIONS } from '../../../game/data/rules';
import { cargoWeight, maxCargo, unitsWeight, usedCargo } from '../../../game/market';
import { upkeepTotal } from '../../../game/sim';
import type { Agency, Unit } from '../../../game/types';
import { def, rankOf, upkeepOf } from '../../../game/units';
import { useT } from '../../../i18n';
import { classLabel, itemName, traitName } from '../../../i18n/lookup';
import { Help } from '../help/Glossary';
import { Portrait } from '../Portrait';
import { STRENGTH_META, statusOf } from './UnitDossier';
import './unit.css';

/** Mini-barras de força com o ícone do tipo de Combate; o rótulo por extenso vai no aria e na ficha. */
export function StrengthBars({ unit, max = 3 }: { unit: Unit; max?: number }) {
  const { t } = useT();
  const d = def(unit.itemId);
  const list = STRENGTH_META.filter((m) => d.str[m.key] > 0)
    .sort((x, y) => d.str[y.key] - d.str[x.key])
    .slice(0, max);
  return (
    <span className="uc-str">
      {list.map((m) => {
        const cur = unit.hp[m.key];
        const full = d.str[m.key];
        return (
          <span key={m.key} className="uc-s" aria-label={t('game.unit.strengthAria', { label: t(m.labelKey), cur, max: full })} role="img">
            <GameIcon id={m.icon} size={14} accent={cur < full ? 'signal' : 'none'} />
            <span className="uc-s-bar" aria-hidden>
              {Array.from({ length: Math.min(12, full) }, (_, i) => (
                <i key={i} className={i < cur ? 'on' : ''} />
              ))}
            </span>
            <span className="uc-s-v mono" aria-hidden>
              {cur}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Cartão de Unidade para as listas da Agência: retrato, função, forças principais, Manutenção e estado.
 * O toque abre a ficha completa; ações destrutivas ficam só lá.
 */
export function UnitCard({
  unit,
  detained,
  onOpen,
  action,
}: {
  unit: Unit;
  detained?: boolean;
  onOpen: (uid: string) => void;
  action?: ReactNode;
}) {
  const { t, fmt, lang } = useT();
  const d = def(unit.itemId);
  const name = itemName(unit.itemId, lang);
  const rank = rankOf(unit);
  const status = statusOf(unit, t, detained);
  return (
    <div className={`uc${status ? ' out' : ''}`}>
      <button className="uc-main" onClick={() => onOpen(unit.uid)} aria-label={t('game.unit.openDossier', { name: unit.name, role: name })}>
        <Portrait unit={unit} size={40} />
        <span className="uc-text">
          <span className="uc-name">
            {unit.name}
            {rank > 0 && (
              <span className="uc-rank" aria-label={t('game.unit.rankAria', { n: rank })}>
                {'▮'.repeat(rank)}
              </span>
            )}
            {status && <span className="uc-status">{status.label}</span>}
          </span>
          <span className="uc-role">
            {name}
            {d.cls === 'cargo'
              ? ` · ${t('game.unit.cargoSpecs', { weight: d.weight, speed: d.speed ?? 0 })}`
              : ` · ${classLabel(d.cls, lang)}`}
          </span>
          {d.cls !== 'cargo' && <StrengthBars unit={unit} />}
          {unit.traits.length > 0 && (
            <span className="uc-traits">
              {unit.traits.map((tr) => (
                <span key={tr} className={`uc-trait${tr === 'nervous' || tr === 'demanding' ? ' neg' : ''}`}>
                  {traitName(tr, lang)}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="uc-side">
          <span className="num">{fmt.money(upkeepOf(unit))}</span>
          <span className="uc-side-k">{t('game.unit.card.perMonth')}</span>
        </span>
      </button>
      {action && <span className="uc-action">{action}</span>}
    </div>
  );
}

/** "Espaço no avião" com o detalhamento Carga × Escolta, em vez da barra de toneladas solta. */
export function FleetSpace({ a }: { a: Agency }) {
  const { t, fmt } = useT();
  const max = maxCargo(a);
  const used = usedCargo(a);
  const escort = unitsWeight(a.escort);
  const goods = cargoWeight(a);
  const pct = (v: number) => `${max ? Math.min(100, (v / max) * 100) : 0}%`;
  return (
    <div className="fs" data-tour="fleet">
      <div className="fs-top">
        <span className="fs-k">
          <Help term="cargo">{t('game.unit.fleetSpace.title')}</Help>
        </span>
        <span className="fs-v num">{t('game.unit.fleetSpace.used', { used: fmt.tons(used), max: fmt.tons(max) })}</span>
      </div>
      <span className="fs-bar" aria-hidden>
        <span className="goods" style={{ width: pct(goods) }} />
        <span className="escort" style={{ left: pct(goods), width: pct(escort) }} />
      </span>
      <div className="fs-legend">
        <span>
          <i className="goods" /> {t('game.unit.fleetSpace.goods', { w: fmt.tons(goods) })}
        </span>
        <span>
          <i className="escort" /> {t('game.unit.fleetSpace.escort', { w: fmt.tons(escort) })}
        </span>
        <span className="fs-free">{t('game.unit.fleetSpace.free', { w: fmt.tons(Math.max(0, max - used)) })}</span>
      </div>
      <p className="fs-note">{t('game.unit.fleetSpace.note')}</p>
    </div>
  );
}

/** Manutenção mensal total vs. renda mensal estimada das Estações. */
export function UpkeepBalance({ a }: { a: Agency }) {
  const { t, fmt } = useT();
  const cost = upkeepTotal(a);
  const income = a.stations.reduce((x, st) => x + (st.interdicted ? 0 : STATIONS[st.level].income * 30), 0);
  const net = income - cost;
  return (
    <div className="ub">
      <div>
        <span className="ub-k">{t('game.unit.balance.income')}</span>
        <span className="ub-v num pos">+{fmt.money(income)}</span>
      </div>
      <div>
        <span className="ub-k">
          <Help term="upkeep">{t('game.unit.balance.upkeep')}</Help>
        </span>
        <span className="ub-v num neg">−{fmt.money(cost).replace('−', '')}</span>
      </div>
      <div className="ub-net">
        <span className="ub-k">{t('game.unit.balance.net')}</span>
        <span className={`ub-v num ${net >= 0 ? 'pos' : 'neg'}`}>
          {net >= 0 ? '+' : ''}
          {fmt.money(net)}
        </span>
      </div>
    </div>
  );
}
