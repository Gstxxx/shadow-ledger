import { GEAR, GEAR_IDS } from '../../../game/data/equipment';
import { arsenalOffer, arsenalTier, buyGear, gearStock } from '../../../game/equipment';
import { player } from '../../../game/state';
import type { CombatType } from '../../../game/types';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import type { Key } from '../../../i18n';
import { countryName } from '../../../i18n/lookup';
import { ShortList, Verdict } from '../stage/Verdict';
import { GearArt } from './GearArt';
import './gear.css';

const TYPES: CombatType[] = ['urban', 'army', 'legal', 'air'];

/**
 * Agência › Arsenal: a loja de Equipamento do país onde o Diretor está (separada do Mercado).
 * Veredito com a oferta do país, a lista do que ele vende e o que a agência tem guardado.
 */
export function ArsenalTab() {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const { t, fmt, lang } = useT();
  const c = s.countries[a.location];
  const offer = arsenalOffer(c);
  const country = countryName(c.id, lang);
  const canBuy = a.director.status === 'free' && !a.flight && !s.over;
  const war = c.politics === 'war' || c.politics === 'civilwar';
  const verdict = war
    ? t('game.arsenal.verdict.war', { country })
    : c.politics === 'sanctions'
      ? t('game.arsenal.verdict.sanctions', { country })
      : arsenalTier(c) >= 2
        ? t('game.arsenal.verdict.mid', { country, n: offer.length })
        : t('game.arsenal.verdict.small', { country });
  const stock = GEAR_IDS.filter((id) => gearStock(a, id) > 0);
  const bonusText = (id: string) =>
    TYPES.filter((ty) => GEAR[id].bonus[ty])
      .map((ty) => t('game.gear.bonus', { type: t(`game.unit.strength.${ty}` as Key), n: GEAR[id].bonus[ty]! }))
      .join(' · ');

  return (
    <div className="ag-screen arsenal">
      <Verdict tone={!canBuy ? 'warn' : war ? 'good' : 'neutral'}>{canBuy ? verdict : t('game.arsenal.blocked')}</Verdict>

      <ul className="arsenal-list">
        <ShortList
          items={offer}
          max={5}
          inList
          render={({ def: g, price }) => (
          <li key={g.id} className="arsenal-row">
            <GearArt id={g.id} />
            <div className="arsenal-main">
              <b>{t(`gear.${g.id}.name` as Key)}</b>
              <span className="gear-k">
                {t(`gear.slot.${g.slot}` as Key)} · {bonusText(g.id)}
              </span>
            </div>
            <button className="btn sm" disabled={!canBuy || price > a.cash} onClick={() => act((gs, ag) => buyGear(gs, ag, g.id), 'buy')}>
              {t('game.arsenal.buy', { price: fmt.money(price) })}
            </button>
          </li>
          )}
        />
      </ul>

      <h3 className="arsenal-h">{t('game.arsenal.stock')}</h3>
      {stock.length ? (
        <ul className="arsenal-stock">
          {stock.map((id) => (
            <li key={id}>
              <GearArt id={id} />
              <span>{t(`gear.${id}.name` as Key)}</span>
              <b className="num">×{gearStock(a, id)}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ud-empty">{t('game.arsenal.stockEmpty')}</p>
      )}
      <p className="gear-k">{t('game.arsenal.equipHint')}</p>
    </div>
  );
}
