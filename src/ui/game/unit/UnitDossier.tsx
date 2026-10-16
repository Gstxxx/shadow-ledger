import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { GameIcon, OperativePortrait, Stamp } from '../../../art';
import * as A from '../../../game/actions';
import { CLASS_LABEL } from '../../../game/data/items';
import { STATIONS } from '../../../game/data/rules';
import { TRAITS } from '../../../game/data/traits';
import { directorAt, player, stationIn } from '../../../game/state';
import type { Agency, GameState, Strength, Unit } from '../../../game/types';
import { REPAIR_MIN_LEVEL, def, isPersonnel, rankOf, repairCost, unitValue, upkeepOf } from '../../../game/units';
import { useGame, useGameStore } from '../../../store/game';
import { money, tons } from '../../fmt';
import { Help } from '../help/Glossary';
import './unit.css';

/** Tipos de força, na ordem em que aparecem na ficha, com o ícone do kit. */
export const STRENGTH_META: {
  key: keyof Strength;
  label: string;
  icon: string;
  blurb: string;
}[] = [
  {
    key: 'urban',
    label: 'Urbano',
    icon: 'combat-urban',
    blurb: 'Ruas, prédios, batidas e ataques criminosos.',
  },
  {
    key: 'army',
    label: 'Militar',
    icon: 'combat-army',
    blurb: 'Campo aberto contra tropas e blindados.',
  },
  {
    key: 'legal',
    label: 'Jurídico',
    icon: 'combat-legal',
    blurb: 'Processos, multas e recursos.',
  },
  {
    key: 'air',
    label: 'Aéreo',
    icon: 'combat-air',
    blurb: 'Defesa e ataque no céu.',
  },
  {
    key: 'convert',
    label: 'Influência',
    icon: 'tactic-negotiate',
    blurb: 'Converte Unidades inimigas para o seu lado (menos no Aéreo).',
  },
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
    const u = t.units.find((x) => x.uid === uid);
    if (u) return { unit: u, place: { kind: 'team', teamId: t.id } };
  }
  return null;
}

export function placeLabel(s: GameState, a: Agency, p: UnitPlace): string {
  switch (p.kind) {
    case 'escort':
      return 'Escolta do Diretor';
    case 'fleet':
      return 'Frota (cargueiro)';
    case 'station': {
      const st = stationIn(a, p.countryId);
      return `${p.detained ? 'Detida na ' : ''}${st ? STATIONS[st.level].name : 'Estação'} em ${s.countries[p.countryId]?.name ?? '?'}`;
    }
    case 'team': {
      const t = a.teams.find((x) => x.id === p.teamId);
      return t ? `${t.name} em ${s.countries[t.location]?.name ?? '?'}` : 'Equipe';
    }
  }
}

export function statusOf(u: Unit, detained?: boolean): { label: string; detail: string; stamp: string } | null {
  if (detained)
    return {
      label: 'Detida',
      detail: 'Presa pelo Estado até a Estação ser liberada (multa ou recurso).',
      stamp: 'DETIDO',
    };
  if (u.injury?.kind === 'wounded')
    return {
      label: 'Ferida',
      detail: `Fora de ação por ~${Math.ceil(u.injury.days ?? 0)} d (duas vezes mais rápido numa Estação).`,
      stamp: 'FERIDA',
    };
  if (u.injury?.kind === 'damaged')
    return {
      label: 'Danificada',
      detail: `Precisa de conserto numa Estação Escritório ou maior.`,
      stamp: 'AVARIADA',
    };
  if (u.idle)
    return {
      label: 'Parada',
      detail: 'Manutenção atrasada: não entra em Combate até você pagar.',
      stamp: 'PARADA',
    };
  return null;
}

/** Ficha completa de uma Unidade em modal central (folha em tela cheia no celular deitado). */
export function UnitDossier({ uid, onClose }: { uid: string; onClose: () => void }) {
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
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
  const status = statusOf(u, place.kind === 'station' && place.detained);
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
          <span className="ud-kicker mono">Ficha de Unidade · {d.cls === 'cargo' ? 'Frota' : CLASS_LABEL[d.cls]}</span>
          <button className="btn icon ghost ud-x" aria-label="Fechar ficha" onClick={onClose} data-autofocus>
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
              {d.name} · {d.cls === 'cargo' ? `${d.weight} t · ${d.speed} km/h` : CLASS_LABEL[d.cls]}
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
              {placeLabel(s, a, place)}
            </p>
            {status && (
              <p className="ud-status" role="status">
                <b>{status.label}.</b> {status.detail}
              </p>
            )}

            {human && (
              <div className="ud-rank" aria-label={`Patente ${rank} de 5`}>
                <span className="ud-k">Patente {rank}/5</span>
                <span className="ud-bar" aria-hidden>
                  <span style={{ width: `${Math.round(xpInRank * 100)}%` }} />
                </span>
                <span className="ud-v mono">{rank >= 5 ? 'máxima' : `${Math.round(xpInRank * 100)}% até a ${rank + 1}ª`}</span>
              </div>
            )}
          </div>
        </div>

        {strengths.length > 0 && (
          <section className="ud-sec">
            <h3>
              <Help term="strength">Força por tipo de Combate</Help>
            </h3>
            <ul className="ud-str">
              {strengths.map((m) => {
                const max = d.str[m.key];
                const cur = u.hp[m.key];
                return (
                  <li key={m.key}>
                    <GameIcon id={m.icon} size={20} accent={cur < max ? 'signal' : 'warm'} />
                    <span className="ud-str-l">
                      {m.label}
                      <small>{m.blurb}</small>
                    </span>
                    <span className="ud-bar" aria-hidden>
                      <span style={{ width: `${(cur / Math.max(1, max)) * 100}%` }} className={cur < max ? 'low' : ''} />
                    </span>
                    <span className="ud-v mono" aria-label={`${cur} de ${max}`}>
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
              <Help term="trait">Traços</Help>
            </h3>
            {u.traits.length ? (
              <ul className="ud-traits">
                {u.traits.map((t) => (
                  <li key={t} className={t === 'nervous' || t === 'demanding' ? 'neg' : ''}>
                    <b>{TRAITS[t].name}</b>
                    <span>{TRAITS[t].blurb}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ud-empty">Nenhum Traço ainda. Ganha um a cada patente nova.</p>
            )}
          </section>
        )}

        <section className="ud-sec ud-money">
          <div>
            <span className="ud-k">
              <Help term="upkeep">Manutenção</Help>
            </span>
            <span className="ud-v num">{money(upkeepOf(u))}/mês</span>
          </div>
          <div>
            <span className="ud-k">Valor pago</span>
            <span className="ud-v num">{money(u.paid)}</span>
          </div>
          <div>
            <span className="ud-k">Vale hoje</span>
            <span className="ud-v num">{money(unitValue(u))}</span>
          </div>
          {d.weight > 0 && d.cls !== 'jet' && d.cls !== 'cargo' && (
            <div>
              <span className="ud-k">Peso no avião</span>
              <span className="ud-v num">{tons(d.weight)}</span>
            </div>
          )}
        </section>
        <p className="ud-blurb">{d.blurb}</p>

        <footer className="ud-actions">
          {canStation && (
            <button
              className="btn"
              disabled={!stationAllows}
              title={!stationAllows ? 'Esta Estação não abriga a Unidade ou está cheia.' : undefined}
              onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'station'))}
            >
              <GameIcon id="station-safehouse" size={16} accent="cold" /> Deixar na Estação
            </button>
          )}
          {atStationHere && (
            <button className="btn" onClick={() => act((g, ag) => A.transferUnit(g, ag, u.uid, 'escort'))}>
              <GameIcon id="director" size={16} accent="cold" /> Levar na Escolta
            </button>
          )}
          {place.kind === 'escort' && (
            <button
              className="btn"
              disabled={!directorAt(a, a.location)}
              onClick={() => act((g, ag) => A.formTeam(g, ag, 'escort', [u.uid]), 'open')}
            >
              <GameIcon id="team" size={16} accent="cold" /> Destacar em Equipe
            </button>
          )}
          {canRepair && (
            <button className="btn" disabled={a.cash < repairCost(u)} onClick={() => act((g, ag) => A.repair(g, ag, u.uid), 'buy')}>
              Consertar · <span className="num">{money(repairCost(u))}</span>
            </button>
          )}
          <span className="ud-spacer" />
          {(place.kind === 'escort' || place.kind === 'fleet') &&
            (confirm ? (
              <span className="ud-confirm" role="alert">
                <span>
                  Dispensar {u.name}? Você recupera <b className="num">{money(Math.round(unitValue(u) * 0.6))}</b>. Não dá para desfazer.
                </span>
                <button className="btn ghost" autoFocus onClick={() => setConfirm(false)}>
                  Manter
                </button>
                <button
                  className="btn danger"
                  onClick={() => {
                    const r = act((g, ag) => A.dismiss(g, ag, u.uid), 'close');
                    if (r.ok) onClose();
                    else setConfirm(false);
                  }}
                >
                  Dispensar
                </button>
              </span>
            ) : (
              <button className="btn danger" onClick={() => setConfirm(true)}>
                Dispensar…
              </button>
            ))}
        </footer>
      </div>
    </div>
  );
}
