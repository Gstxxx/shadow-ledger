import type { Agency, CargoLot } from './types';

/** Add goods to a list of lots (Carga, Cofre, itens capturados), merging by item at weighted average price. */
export function addLot(lots: CargoLot[], uid: () => string, itemId: string, qty: number, paidEach: number) {
  const lot = lots.find((l) => l.itemId === itemId);
  if (lot) {
    lot.paidEach = Math.round((lot.paidEach * lot.qty + paidEach * qty) / (lot.qty + qty));
    lot.qty += qty;
  } else lots.push({ lid: uid(), itemId, qty, paidEach });
}

/** Remove goods from a list of lots; returns the removed lot price, or undefined if not enough. */
export function takeLot(lots: CargoLot[], itemId: string, qty: number): number | undefined {
  const i = lots.findIndex((l) => l.itemId === itemId);
  if (i < 0 || lots[i].qty < qty) return undefined;
  const paid = lots[i].paidEach;
  lots[i].qty -= qty;
  if (lots[i].qty === 0) lots.splice(i, 1);
  return paid;
}

export const lotQty = (lots: CargoLot[], itemId: string) => lots.find((l) => l.itemId === itemId)?.qty ?? 0;

let lotCounter = 0;
/** Lot ids only need to be unique within a list. */
export const lotId = () => `l${Date.now().toString(36)}${(lotCounter++).toString(36)}`;

export const addCargo = (a: Agency, itemId: string, qty: number, paidEach: number) => addLot(a.cargo, lotId, itemId, qty, paidEach);
export const cargoQty = (a: Agency, itemId: string) => lotQty(a.cargo, itemId);
export const removeCargo = (a: Agency, itemId: string, qty: number) => takeLot(a.cargo, itemId, qty) !== undefined;
