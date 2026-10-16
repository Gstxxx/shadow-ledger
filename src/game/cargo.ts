import type { GameState } from './types';

/** Add goods to the Carga, merging with a lot of the same item (weighted average price). */
export function addCargo(s: GameState, itemId: string, qty: number, paidEach: number) {
  const lot = s.cargo.find((l) => l.itemId === itemId);
  if (lot) {
    lot.paidEach = Math.round((lot.paidEach * lot.qty + paidEach * qty) / (lot.qty + qty));
    lot.qty += qty;
  } else {
    s.uidCounter += 1;
    s.cargo.push({ lid: `l${s.uidCounter}`, itemId, qty, paidEach });
  }
}

export const cargoQty = (s: GameState, itemId: string) => s.cargo.find((l) => l.itemId === itemId)?.qty ?? 0;

/** Remove goods from the Carga; returns false if there is not enough. */
export function removeCargo(s: GameState, itemId: string, qty: number): boolean {
  const lot = s.cargo.find((l) => l.itemId === itemId);
  if (!lot || lot.qty < qty) return false;
  lot.qty -= qty;
  if (lot.qty === 0) s.cargo = s.cargo.filter((l) => l !== lot);
  return true;
}
