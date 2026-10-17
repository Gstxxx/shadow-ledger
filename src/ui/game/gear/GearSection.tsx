import { useState } from 'react';
import { GEAR, GEAR_IDS, GEAR_SLOTS } from '../../../game/data/equipment';
import type { GearSlot } from '../../../game/data/equipment';
import { canEquip, equipBonus, equipGear, gearStock } from '../../../game/equipment';
import { player } from '../../../game/state';
import type { CombatType, Unit } from '../../../game/types';
import { def, strOf } from '../../../game/units';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import type { Key } from '../../../i18n';
import { useStage } from '../stage/context';
import { GearArt } from './GearArt';
import './gear.css';

const TYPES: CombatType[] = ['urban', 'army', 'legal', 'air'];

/** Força efetiva (com Equipamento) por tipo de Combate em que a Unidade luta. */
function forces(u: Unit, gear: Unit['gear']) {
  const d = def(u.itemId);
  const v = { ...u, gear };
  return TYPES.filter((ty) => (ty === 'legal' ? d.str.legal > 0 || d.str.convert > 0 : d.str[ty] > 0)).map((ty) => ({
    ty,
    base: strOf(u, ty),
    eff: strOf(u, ty) > 0 ? strOf(u, ty) + equipBonus(v, ty) : 0,
  }));
}

/**
 * Ficha da Unidade › Equipamento: três slots (arma principal, proteção, acessório). Tocar num slot abre
 * o que está guardado para ele, com a força antes → depois; Equipar troca na hora.
 */
export function GearSection({ u }: { u: Unit }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const stage = useStage();
  const { t, fmt } = useT();
  const [open, setOpen] = useState<GearSlot | null>(null);
  if (!canEquip(u)) return null;
  const now = forces(u, u.gear);
  const typeLabel = (ty: CombatType) => t(`game.unit.strength.${ty}` as Key);
  const gearName = (id: string) => t(`gear.${id}.name` as Key);

  return (
    <section className="ud-sec gear">
      <h3>{t('game.gear.title')}</h3>
      <ul className="gear-slots">
        {GEAR_SLOTS.map((slot) => {
          const id = u.gear?.[slot];
          return (
            <li key={slot}>
              <button
                className={`gear-slot${open === slot ? ' on' : ''}${id ? '' : ' empty'}`}
                aria-expanded={open === slot}
                onClick={() => setOpen(open === slot ? null : slot)}
              >
                <span className="gear-thumb">{id ? <GearArt id={id} /> : <span className="gear-plus">+</span>}</span>
                <span className="gear-txt">
                  <span className="gear-k">{t(`gear.slot.${slot}` as Key)}</span>
                  <b>{id ? gearName(id) : t('game.gear.empty')}</b>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="gear-pick">
          {(() => {
            const cur = u.gear?.[open];
            const owned = GEAR_IDS.filter((id) => GEAR[id].slot === open && id !== cur && gearStock(a, id) > 0);
            return (
              <>
                {owned.length === 0 && <p className="ud-empty">{t('game.gear.noneOwned')}</p>}
                <ul className="gear-opts">
                  {owned.map((id) => {
                    const after = forces(u, { ...u.gear, [open]: id });
                    const changed = after.filter((f, i) => f.eff !== now[i].eff);
                    return (
                      <li key={id} className="gear-opt">
                        <GearArt id={id} />
                        <div className="gear-opt-main">
                          <b>{gearName(id)}</b>
                          <span className="gear-k">{t('game.gear.owned', { n: gearStock(a, id) })}</span>
                          {changed.length ? (
                            <span className="gear-delta">
                              {changed.map((f) => {
                                const before = now.find((x) => x.ty === f.ty)!.eff;
                                return (
                                  <span key={f.ty} className={f.eff > before ? 'up' : 'down'}>
                                    {t('game.gear.change', { type: typeLabel(f.ty), from: fmt.num(before), to: fmt.num(f.eff) })}
                                  </span>
                                );
                              })}
                            </span>
                          ) : (
                            <span className="gear-k">{t('game.gear.none')}</span>
                          )}
                        </div>
                        <button className="btn primary sm" onClick={() => act((_g, ag) => equipGear(ag, u.uid, open, id), 'click').ok && setOpen(null)}>
                          {t('game.gear.equip')}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="gear-pick-foot">
                  {cur && (
                    <button className="btn ghost sm" onClick={() => act((_g, ag) => equipGear(ag, u.uid, open, null), 'click').ok && setOpen(null)}>
                      {t('game.gear.remove')}
                    </button>
                  )}
                  <button className="btn ghost sm" onClick={() => stage?.push({ kind: 'agency', tab: 'arsenal' })}>
                    {t('game.gear.openArsenal')}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Força efetiva agora (com o Equipamento) */}
      {u.gear && now.some((f) => f.eff !== f.base) && (
        <p className="gear-now">
          {now
            .filter((f) => f.eff !== f.base)
            .map((f) => t('game.gear.change', { type: typeLabel(f.ty), from: fmt.num(f.base), to: fmt.num(f.eff) }))
            .join(' · ')}
        </p>
      )}
    </section>
  );
}
