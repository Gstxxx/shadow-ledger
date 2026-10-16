import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { GameIcon, OperativePortrait, Stamp } from '../../../art';
import * as A from '../../../game/actions';
import { STATIONS } from '../../../game/data/rules';
import { directorAt, player, stationIn } from '../../../game/state';
import type { Agency, GameState, Strength, Unit } from '../../../game/types';
import { REPAIR_MIN_LEVEL, def, isPersonnel, rankOf, repairCost, unitValue, upkeepOf } from '../../../game/units';
import { useGame, useGameStore } from '../../../store/game';
import { useT } from '../../../i18n';
import type { I18n, Key, Lang } from '../../../i18n';
import { classLabel, countryName, itemBlurb, itemName, stationName, traitBlurb, traitName } from '../../../i18n/lookup';
import { Help } from '../help/Glossary';
import './unit.css';

/** Tipos de força, na ordem em que aparecem na ficha, com o ícone do kit. */
export const STRENGTH_META: {
  key: keyof Strength;
  labelKey: Key;
  icon: string;
  blurbKey: Key;
}[] = [
  { key: 'urban', labelKey: 'game.unit.strength.urban', icon: 'combat-urban', blurbKey: 'game.unit.strength.urban.blurb' },
  { key: 'army', labelKey: 'game.unit.strength.army', icon: 'combat-army', blurbKey: 'game.unit.strength.army.blurb' },
  { key: 'legal', labelKey: 'game.unit.strength.legal', icon: 'combat-legal', blurbKey: 'game.unit.strength.legal.blurb' },
  { key: 'air', labelKey: 'game.unit.strength.air', icon: 'combat-air', blurbKey: 'game.unit.strength.air.blurb' },
  { key: 'convert', labelKey: 'game.unit.strength.convert', icon: 'tactic-negotiate', blurbKey: 'game.unit.strength.convert.blurb' },
];

export type UnitPlace =
  { kind: 'escort' } | { kind: 'fleet' } | { kind: 'station'; countryId: string; detained?: boolean } | { kind: 'team'; teamId: string };

export function findUnit(a: Agency, uid: string): { unit: Unit; place: UnitPlace } | null {
  const e = a.escort.find((u) => u.uid === uid);
  if (e) return { unit: e, place: { kind: 'escort' } };
  const f = a.fleet.find((u) => u.uid === uid);
  if (f) return { unit: f, place: { kind: 'fleet' } };
  for (const st of a.stations) {
    const u = st.units.find((x) => x.uid === uid);
    if (u) return { unit: u, place: { kind: 'station', countryId: st.countryId } };
    const d = st.detained.find((x) => x.uid === uid);
    if (d)
      return {
        unit: d,
        place: { kind: 'station', countryId: st.countryId, detained: true },
      };
  }
  for (const t of a.teams) {
    const u = t.units.find((x) => x.uid === uid) ?? (t.freighter?.uid === uid ? t.freighter : undefined);
    if (u) return { unit: u, place: { kind: 'team', teamId: t.id } };
  }
  return null;
}

/** Onde a Unidade está, já traduzido (`t` e `lang` vêm do `useT()` de quem renderiza). */
export function placeLabel(s: GameState, a: Agency, p: UnitPlace, t: I18n['t'], lang: Lang): string {
  switch (p.kind) {
    case 'escort':
      return t('game.unit.place.escort');
    case 'fleet':
      return t('game.unit.place.fleet');
    case 'station': {
      const st = stationIn(a, p.countryId);
      const params = {
        station: st ? stationName(st.level, lang) : t('game.unit.place.stationFallback'),
        country: s.countries[p.countryId] ? countryName(p.countryId, lang) : '?',
      };
      return t(p.detained ? 'game.unit.place.stationDetained' : 'game.unit.place.station', params);
    }
    case 'team': {
      const tm = a.teams.find((x) => x.id === p.teamId);
      return tm
        ? t('game.unit.place.team', { team: tm.name, country: s.countries[tm.location] ? countryName(tm.location, lang) : '?' })
        : t('game.unit.place.teamFallback');
    }
  }
}

/** Estado fora de ação da Unidade, já traduzido (`t` vem do `useT()` de quem renderiza). */
export function statusOf(u: Unit, t: I18n['t'], detained?: boolean): { label: string; detail: string; stamp: string } | null {
  if (detained)
    return {
      label: t('game.unit.status.detained.label'),
      detail: t('game.unit.status.detained.detail'),
      stamp: t('game.unit.status.detained.stamp'),
    };
  if (u.injury?.kind === 'wounded')
    return {
      label: t('game.unit.status.wounded.label'),
      detail: t('game.unit.status.wounded.detail', { n: Math.ceil(u.injury.days ?? 0) }),
      stamp: t('game.unit.status.wounded.stamp'),
    };
  if (u.injury?.kind === 'damaged')
    return {
      label: t('game.unit.status.damaged.label'),
      detail: t('game.unit.status.damaged.detail'),
      stamp: t('game.unit.status.damaged.stamp'),
    };
  if (u.idle)
    return {
      label: t('game.unit.status.idle.label'),
      detail: t('game.unit.status.idle.detail'),
      stamp: t('game.unit.status.idle.stamp'),
    };
  return null;
}

/** Ficha completa de uma Unidade em modal central (folha em tela cheia no celular deitado). */
export function UnitDossier({ uid, onClose }: { uid: string; onClose: () => void }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const { t, fmt, lang } = useT();
  const found = findUnit(a, uid);
  const dialog = useRef<HTMLDivElement>(null);
  const [confirm, setConfirm] = useState(false);

  // Foco preso no modal; Esc fecha; o foco volta para quem abriu.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && dialog.current) {
        const f = [
          ...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, [tabindex]:not([tabindex="-1"])'),
        ];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);

  // Gesto: arrastar a folha para baixo fecha (celular).
  const drag = useRef<{ y: number; t: number } | null>(null);

  if (!found) return null;
  const { unit: u, place } = found;
  const d = def(u.itemId);
  const human = isPersonnel(u);
  const rank = rankOf(u);
  const xpInRank = rank >= 5 ? 1 : (u.xp - rank * 20) / 20;
  const status = statusOf(u, t, place.kind === 'station' && place.detained);
  const here = place.kind === 'escort' || place.kind === 'fleet' ? true : place.kind === 'station' ? directorAt(a, place.countryId) : false;
  const stHere = stationIn(a, a.location);
  const atStationHere = place.kind === 'station' && !place.detained && directorAt(a, place.countryId);
  const canStation = place.kind === 'escort' && !!stHere && !stHere.interdicted && directorAt(a, a.location);
  const stationRoom = stHere ? STATIONS[stHere.level] : null;
  const stationAllows = !!stationRoom && stationRoom.allows.includes(d.cls) && (stHere?.units.length ?? 0) < stationRoom.capacity;
  const canRepair = u.injury?.kind === 'damaged' && !!stHere && !stHere.interdicted && stHere.level >= REPAIR_MIN_LEVEL && here;
  const strengths = STRENGTH_META.filter((m) => d.str[m.key] > 0);
  const titleId = `ud-${u.uid}`;

  return (
    <div className="ud-scrim" onClick={onClose}>
      <div
        ref={dialog}
        className="ud"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('.ud-grip')) drag.current = { y: e.clientY, t: performance.now() };
        }}
        onPointerUp={(e) => {
          if (drag.current && e.clientY - drag.current.y > 60) onClose();
          drag.current = null;
        }}
      >
        <div className="ud-grip only-sheet" aria-hidden />
        <header className="ud-head">
          <span className="ud-kicker mono">
            {t('game.unit.kicker', { kind: d.cls === 'cargo' ? t('game.unit.kickerFleet') : classLabel(d.cls, lang) })}
          </span>
          <button className="btn icon ghost ud-x" aria-label={t('game.unit.closeDossier')} onClick={onClose} data-autofocus>
            <X size={18} />
          </button>
        </header>

        <div className="ud-body">
          <div className="ud-photo">
            {human ? (
              <OperativePortrait
                seed={String(u.seed)}
                size={132}
                tone={status ? 'signal' : 'paper'}
                name={u.name}
                status={status?.stamp}
                code={u.uid.toUpperCase()}
              />
            ) : (
              <div className="ud-machine">
                <GameIcon id={u.itemId} size={96} accent={status ? 'signal' : 'warm'} />
                <span className="mono">{u.name}</span>
                {status && <Stamp text={status.stamp} size={18} rotate={-10} />}
              </div>
            )}
          </div>

          <div className="ud-main">
            <h2 id={titleId} className="ud-name">
              {u.name}
            </h2>
            <p className="ud-role">
              {itemName(u.itemId, lang)} ·{' '}
              {d.cls === 'cargo' ? t('game.unit.cargoSpecs', { weight: d.weight, speed: d.speed ?? 0 }) : classLabel(d.cls, lang)}
            </p>
            <p className="ud-where">
              <GameIcon
                id={
                  place.kind === 'station'
                    ? 'station-safehouse'
                    : place.kind === 'team'
                      ? 'team'
                      : place.kind === 'fleet'
                        ? 'fleet'
                        : 'director'
                }
                size={16}
                accent="cold"
              />
              {placeLabel(s, a, place, t, lang)}
            </p>
            {status && (
              <p className="ud-status" role="status">
                <b>{status.label}.</b> {status.detail}
              </p>
            )}

            {human && (
              <div className="ud-rank" aria-label={t('game.unit.rankOf', { n: rank })}>
                <span className="ud-k">{t('game.unit.rank', { n: rank })}</span>
                <span className="ud-bar" aria-hidden>
                  <span style={{ width: `${Math.round(xpInRank * 100)}%` }} />
                </span>
                <span className="ud-v mono">
                  {rank >= 5 ? t('game.unit.rankMax') : t('game.unit.rankProgress', { pct: Math.round(xpInRank * 100), next: rank + 1 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {strengths.length > 0 && (
          <section className="ud-sec">
            <h3>
              <Help term="strength">{t('game.unit.strengthTitle')}</Help>
            </h3>
            <ul className="ud-str">
              {strengths.map((m) => {
                const max = d.str[m.key];
                const cur = u.hp[m.key];
                return (
                  <li key={m.key}>
                    <GameIcon id={m.icon} size={20} accent={cur < max ? 'signal' : 'warm'} />
                    <span className="ud-str-l">
                      {t(m.labelKey)}
                      <small>{t(m.blurbKey)}</small>
                    </span>
                    <span className="ud-bar" aria-hidden>
                      <span style={{ width: `${(cur / Math.max(1, max)) * 100}%` }} className={cur < max ? 'low' : ''} />
                    </span>
                    <span className="ud-v mono" aria-label={t('game.unit.strengthValueAria', { cur, max })}>
                      {cur}/{max}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {human && (
          <section className="ud-sec">
            <h3>
              <Help term="trait">{t('game.unit.traits')}</Help>
            </h3>
            {u.traits.length ? (
              <ul className="ud-traits">
                {u.traits.map((tr) => (
                  <li key={tr} className={tr === 'nervous' || tr === 'demanding' ? 'neg' : ''}>
                    <b>{traitName(tr, lang)}</b>
                    <span>{traitBlurb(tr, lang)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ud-empty">{t('game.unit.noTraits')}</p>
            )}
          </section>
        )}

        <section className="ud-sec ud-money">
          <div>
            <span className="ud-k">
              <Help term="upkeep">{t('game.unit.upkeep')}</Help>
            </span>
            <span className="ud-v num">{t('game.unit.perMonth', { price: fmt.money(upkeepOf(u)) })}</span>
          </div>
          <div>
            <span className="ud-k">{t('game.unit.paid')}</span>
            <span className="ud-v num">{fmt.money(u.paid)}</span>
          </div>
          <div>
            <span className="ud-k">{t('game.unit.worth')}</span>
            <span className="ud-v num">{fmt.money(unitValue(u))}</span>
          </div>
          {d.weight > 0 && d.cls !== 'jet' && d.cls !== 'cargo' && (
            <div>
              <span className="ud-k">{t('game.unit.weight')}</span>
              <span className="ud-v num">{fmt.tons(d.weight)}</span>
            </div>
          )}
        </section>
        <p className="ud-blurb">{itemBlurb(u.itemId, lang)}</p>

        <footer className="ud-actions">
          {canStation && (
            <button
              className="btn"
              disabled={!stationAllows}
              title={!stationAllows ? t('game.unit.stationDisallows') : undefined}
              onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'station'))}
            >
              <GameIcon id="station-safehouse" size={16} accent="cold" /> {t('game.unit.leaveAtStation')}
            </button>
          )}
          {atStationHere && (
            <button className="btn" onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'escort'))}>
              <GameIcon id="director" size={16} accent="cold" /> {t('game.unit.takeInEscort')}
            </button>
          )}
          {place.kind === 'escort' && (
            <button
              className="btn"
              disabled={!directorAt(a, a.location)}
              onClick={() => act((g, ag) => A.formTeam(g, ag, 'escort', [u.uid]), 'open')}
            >
              <GameIcon id="team" size={16} accent="cold" /> {t('game.unit.detachTeam')}
            </button>
          )}
          {canRepair && (
            <button className="btn" disabled={a.cash < repairCost(u)} onClick={() => act((g, ag) => A.repair(g, ag, u.uid), 'buy')}>
              {t('game.unit.repair')} <span className="num">{fmt.money(repairCost(u))}</span>
            </button>
          )}
          <span className="ud-spacer" />
          {(place.kind === 'escort' || place.kind === 'fleet') &&
            (confirm ? (
              <span className="ud-confirm" role="alert">
                <span>
                  {t('game.unit.dismissAsk', { name: u.name })} <b className="num">{fmt.money(Math.round(unitValue(u) * 0.6))}</b>
                  {t('game.unit.dismissWarn')}
                </span>
                <button className="btn ghost" autoFocus onClick={() => setConfirm(false)}>
                  {t('game.unit.keep')}
                </button>
                <button
                  className="btn danger"
                  onClick={() => {
                    const r = act((g, ag) => A.dismiss(g, ag, u.uid), 'close');
                    if (r.ok) onClose();
                    else setConfirm(false);
                  }}
                >
                  {t('game.unit.dismiss')}
                </button>
              </span>
            ) : (
              <button className="btn danger" onClick={() => setConfirm(true)}>
                {t('game.unit.dismissEllipsis')}
              </button>
            ))}
        </footer>
      </div>
    </div>
  );
}
