import type { ReactNode } from 'react';
import { GameIcon } from '../../../art';
import { CLASS_LABEL } from '../../../game/data/items';
import { STATIONS } from '../../../game/data/rules';
import { TRAITS } from '../../../game/data/traits';
import { cargoWeight, maxCargo, unitsWeight, usedCargo } from '../../../game/market';
import { upkeepTotal } from '../../../game/sim';
import type { Agency, Unit } from '../../../game/types';
import { def, rankOf, upkeepOf } from '../../../game/units';
import { money, tons } from '../../fmt';
import { Help } from '../help/Glossary';
import { Portrait } from '../Portrait';
import { STRENGTH_META, statusOf } from './UnitDossier';
import './unit.css';

/** Mini-barras de força com o ícone do tipo de Combate; o rótulo por extenso vai no aria e na ficha. */
export function StrengthBars({ unit, max = 3 }: { unit: Unit; max?: number }) {
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
          <span key={m.key} className="uc-s" aria-label={`${m.label} ${cur} de ${full}`} role="img">
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
  const d = def(unit.itemId);
  const rank = rankOf(unit);
  const status = statusOf(unit, detained);
  return (
    <div className={`uc${status ? ' out' : ''}`}>
      <button className="uc-main" onClick={() => onOpen(unit.uid)} aria-label={`${unit.name}, ${d.name}. Abrir ficha`}>
        <Portrait unit={unit} size={40} />
        <span className="uc-text">
          <span className="uc-name">
            {unit.name}
            {rank > 0 && (
              <span className="uc-rank" aria-label={`patente ${rank}`}>
                {'▮'.repeat(rank)}
              </span>
            )}
            {status && <span className="uc-status">{status.label}</span>}
          </span>
          <span className="uc-role">
            {d.name}
            {d.cls === 'cargo' ? ` · ${d.weight} t · ${d.speed} km/h` : ` · ${CLASS_LABEL[d.cls]}`}
          </span>
          {d.cls !== 'cargo' && <StrengthBars unit={unit} />}
          {unit.traits.length > 0 && (
            <span className="uc-traits">
              {unit.traits.map((t) => (
                <span key={t} className={`uc-trait${t === 'nervous' || t === 'demanding' ? ' neg' : ''}`}>
                  {TRAITS[t].name}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="uc-side">
          <span className="num">{money(upkeepOf(unit))}</span>
          <span className="uc-side-k">por mês</span>
        </span>
      </button>
      {action && <span className="uc-action">{action}</span>}
    </div>
  );
}

/** "Espaço no avião" com o detalhamento Carga × Escolta, em vez da barra de toneladas solta. */
export function FleetSpace({ a }: { a: Agency }) {
  const max = maxCargo(a);
  const used = usedCargo(a);
  const escort = unitsWeight(a.escort);
  const goods = cargoWeight(a);
  const pct = (v: number) => `${max ? Math.min(100, (v / max) * 100) : 0}%`;
  return (
    <div className="fs">
      <div className="fs-top">
        <span className="fs-k">
          <Help term="cargo">Espaço no avião</Help>
        </span>
        <span className="fs-v num">
          {tons(used)} de {tons(max)} usados
        </span>
      </div>
      <span className="fs-bar" aria-hidden>
        <span className="goods" style={{ width: pct(goods) }} />
        <span className="escort" style={{ left: pct(goods), width: pct(escort) }} />
      </span>
      <div className="fs-legend">
        <span>
          <i className="goods" /> Carga {tons(goods)}
        </span>
        <span>
          <i className="escort" /> Escolta {tons(escort)}
        </span>
        <span className="fs-free">Livre {tons(Math.max(0, max - used))}</span>
      </div>
      <p className="fs-note">Caças voam ao lado do avião e não ocupam espaço.</p>
    </div>
  );
}

/** Manutenção mensal total vs. renda mensal estimada das Estações. */
export function UpkeepBalance({ a }: { a: Agency }) {
  const cost = upkeepTotal(a);
  const income = a.stations.reduce((x, st) => x + (st.interdicted ? 0 : STATIONS[st.level].income * 30), 0);
  const net = income - cost;
  return (
    <div className="ub">
      <div>
        <span className="ub-k">Renda das Estações</span>
        <span className="ub-v num pos">+{money(income)}</span>
      </div>
      <div>
        <span className="ub-k">
          <Help term="upkeep">Manutenção</Help>
        </span>
        <span className="ub-v num neg">−{money(cost).replace('−', '')}</span>
      </div>
      <div className="ub-net">
        <span className="ub-k">Saldo por mês</span>
        <span className={`ub-v num ${net >= 0 ? 'pos' : 'neg'}`}>
          {net >= 0 ? '+' : ''}
          {money(net)}
        </span>
      </div>
    </div>
  );
}
