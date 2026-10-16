// Direitos (ADR 0004): o que o jogador possui. Sem loja ainda; em dev e na web tudo está liberado.
// Nunca vende vantagem de jogo: só Presets extras, a futura Campanha e cosméticos.

export type EntitlementKind = 'preset' | 'cosmetic' | 'campaign' | 'no-ads';

export interface Entitlement {
  kind: EntitlementKind;
  id: string;
}

export interface EntitlementStore {
  owns(e: Entitlement): boolean;
  list(): Entitlement[];
}

const KEY = 'shadow-ledger.entitlements';

/** Web/dev: everything unlocked; purchases recorded locally only so the shape is exercised. */
class LocalEntitlements implements EntitlementStore {
  owns(): boolean {
    return true;
  }

  list(): Entitlement[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Entitlement[];
    } catch {
      return [];
    }
  }
}

let store: EntitlementStore = new LocalEntitlements();

export const entitlements = (): EntitlementStore => store;

/** The mobile build swaps in a store backed by the platform's purchases. */
export function setEntitlementStore(next: EntitlementStore) {
  store = next;
}
