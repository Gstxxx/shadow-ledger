import { memo, useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import { Car, Crosshair, Plane, Radar, Shield, Truck } from 'lucide-react';
import { def, isPersonnel } from '../../game/units';
import type { Unit } from '../../game/types';

const cache = new Map<number, string>();

function avatarUri(seed: number): string {
  let uri = cache.get(seed);
  if (!uri) {
    uri = createAvatar(notionists, { seed: String(seed), backgroundColor: ['transparent'] }).toDataUri();
    cache.set(seed, uri);
  }
  return uri;
}

const MACHINE_ICON = {
  vehicle: Car,
  antiair: Radar,
  heli: Crosshair,
  jet: Plane,
  cargo: Truck,
} as const;

/** Retrato do Pessoal (DiceBear) ou ícone de máquina. */
export const Portrait = memo(function Portrait({ unit, size = 36, hostile }: { unit: Unit; size?: number; hostile?: boolean }) {
  const d = def(unit.itemId);
  const human = isPersonnel(unit);
  const uri = useMemo(() => (human ? avatarUri(unit.seed) : ''), [human, unit.seed]);
  const Icon = MACHINE_ICON[d.cls as keyof typeof MACHINE_ICON] ?? Shield;
  return (
    <span className={`portrait${hostile ? ' hostile' : ''}${unit.injury ? ' hurt' : ''}`} style={{ width: size, height: size }}>
      {human ? <img src={uri} alt="" draggable={false} /> : <Icon size={Math.round(size * 0.55)} strokeWidth={1.6} />}
    </span>
  );
});
