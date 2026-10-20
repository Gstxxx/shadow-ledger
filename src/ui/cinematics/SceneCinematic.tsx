import { useLayoutEffect, useRef } from 'react';
import { audio } from '../../audio/engine';
import { useT } from '../../i18n';
import { buildScene, type RaidOutcome, type SceneKind } from './scenes';
import './coup.css';
import './scenes.css';

export type SceneRequest =
  | { kind: 'raid'; country: string; threat: string; outcome: RaidOutcome }
  | { kind: 'hunt'; country: string; band: string; bounty: number }
  | { kind: 'crisis' }
  | { kind: 'finale' };

export interface SceneCinematicProps {
  req: SceneRequest;
  onDone(): void;
  reduced?: boolean;
}

/** Uma cena curta (Ataque à Estação, Caçada, Crise Final). Toque, Esc ou Enter pulam; onDone no corte. */
export function SceneCinematic({ req, onDone, reduced }: SceneCinematicProps) {
  const { t, fmt } = useT();
  const host = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useLayoutEffect(() => {
    if (!host.current) return;
    const kind: SceneKind = req.kind;
    const text =
      req.kind === 'raid'
        ? {
            kicker: req.threat || t('cine.raid.kicker'),
            title: t('cine.raid.title', { country: req.country }),
            telex: [t('cine.raid.telex.1'), t('cine.raid.telex.2')],
            stamp: t(req.outcome === 'held' ? 'cine.raid.held' : req.outcome === 'interdicted' ? 'cine.raid.interdicted' : 'cine.raid.lost'),
            skip: t('cine.skip'),
          }
        : req.kind === 'hunt'
          ? {
              kicker: t('cine.hunt.kicker'),
              title: t('cine.hunt.title', { band: req.band }),
              telex: [t('cine.hunt.telex.1'), t('cine.hunt.telex.2', { country: req.country })],
              stamp: t('cine.hunt.stamp'),
              note: t('cine.hunt.bounty'),
              skip: t('cine.skip'),
            }
          : req.kind === 'finale'
            ? {
                kicker: t('campaign.final.kicker'),
                title: t('campaign.final.title'),
                telex: [t('campaign.final.telex.1'), t('campaign.final.telex.2'), t('campaign.final.telex.3')],
                stamp: t('campaign.final.stamp'),
                skip: t('cine.skip'),
              }
            : {
              kicker: t('cine.crisis.kicker'),
              title: t('cine.crisis.title'),
              telex: [t('cine.crisis.telex.1'), t('cine.crisis.telex.2'), t('cine.crisis.telex.3')],
              stamp: t('cine.crisis.stamp'),
              skip: t('cine.skip'),
            };
    const h = buildScene(host.current, {
      kind,
      text,
      outcome: req.kind === 'raid' ? req.outcome : undefined,
      bounty: req.kind === 'hunt' ? req.bounty : undefined,
      formatMoney: (n) => fmt.money(Math.round(n)),
      reduced: reduced ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      sound: (n) => audio.sfx(n),
      onDone: () => done.current(),
    });
    h.tl.play(0);
    return () => h.destroy();
    // Uma cena por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={host} />;
}
