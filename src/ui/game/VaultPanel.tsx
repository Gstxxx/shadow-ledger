import { useState } from 'react';
import { Archive } from 'lucide-react';
import { GameIcon } from '../../art';
import * as A from '../../game/actions';
import { freeCargo } from '../../game/market';
import { directorAt, player, stationIn } from '../../game/state';
import { def } from '../../game/units';
import { useGame, useGameStore } from '../../store/game';
import { useT } from '../../i18n';
import { itemName } from '../../i18n/lookup';
import { Verdict } from './stage/Verdict';

/** Carga agrupada por item (quantidade total). */
export function cargoByItem(cargo: { itemId: string; qty: number }[]) {
  const m = new Map<string, number>();
  for (const l of cargo) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty);
  return [...m.entries()].map(([itemId, qty]) => ({ itemId, qty }));
}

/** Quantas unidades cabem num espaço livre (em t). Itens sem peso cabem todos. */
const fits = (itemId: string, qty: number, free: number) => {
  const w = def(itemId).weight;
  return w <= 0 ? qty : Math.min(qty, Math.floor((free + 1e-6) / w));
};

/** Dá para guardar Carga aqui agora? (Diretor no país, Estação própria e operante.) */
export function useCanStore(countryId: string) {
  const s = useGame();
  const a = player(s);
  const st = stationIn(a, countryId);
  return !!st && !st.interdicted && directorAt(a, countryId) && a.cargo.length > 0;
}

/**
 * Cofre da Estação (pedido do usuário: "tá difícil achar onde depositar"). Veredito com o espaço livre e
 * Guardar Carga como ação principal; o seletor lista a Carga com Guardar por item e Guardar tudo que cabe;
 * o que está no Cofre tem Retirar (se couber no avião).
 */
export function VaultPanel({ countryId, startOpen = false }: { countryId: string; startOpen?: boolean }) {
  const { t, fmt } = useT();
  const s = useGame();
  const a = player(s);
  const act = useGameStore((st) => st.act);
  const st = stationIn(a, countryId);
  const [open, setOpen] = useState(startOpen);
  if (!st) return null;
  const here = directorAt(a, countryId) && !st.interdicted;
  const used = A.vaultWeight(st);
  const free = A.vaultFree(st);
  const total = used + free;
  const cargo = cargoByItem(a.cargo);
  const storeAll = () => {
    // Guarda item por item o que couber, dos mais pesados (mais difíceis de encaixar) aos mais leves.
    const sorted = [...cargo].sort((x, y) => def(y.itemId).weight - def(x.itemId).weight);
    let room = free;
    const plan: { itemId: string; n: number }[] = [];
    for (const c of sorted) {
      const n = fits(c.itemId, c.qty, room);
      if (n > 0) {
        plan.push({ itemId: c.itemId, n });
        room -= def(c.itemId).weight * n;
      }
    }
    if (!plan.length) return;
    act((g, ag) => plan.map((p) => A.deposit(g, ag, p.itemId, p.n)).reduce((x, y) => (x.ok ? y : x)), 'buy');
  };
  return (
    <div className="vault-panel">
      <Verdict
        tone="neutral"
        icon={<Archive size={24} />}
        action={
          here && cargo.length ? (
            <button className="btn primary" onClick={() => setOpen(!open)} aria-expanded={open}>
              {t('game.vault.store')}
            </button>
          ) : undefined
        }
      >
        {t('game.vault.free', { free: fmt.tons(free), total: fmt.tons(total) })}
      </Verdict>
      {here && open && cargo.length > 0 && (
        <div className="vault-pick">
          {cargo.map((c) => {
            const n = fits(c.itemId, c.qty, free);
            const w = def(c.itemId).weight;
            return (
              <div key={c.itemId} className="vault-row">
                <GameIcon id={c.itemId} size={24} accent="warm" />
                <span className="vault-name">
                  <span>{t('game.qtyItem', { qty: c.qty, item: itemName(c.itemId) })}</span>
                  <small className="mono">
                    {n > 0 ? fmt.tons(w * c.qty) : t('game.vault.noRoom', { free: fmt.tons(free), w: fmt.tons(w) })}
                  </small>
                </span>
                <button className="btn sm" disabled={n <= 0} onClick={() => act((g, ag) => A.deposit(g, ag, c.itemId, n), 'buy')}>
                  {t('game.vault.storeHere')}
                  {n > 0 && n < c.qty ? ` (${n})` : ''}
                </button>
              </div>
            );
          })}
          <button className="btn ghost vault-all" disabled={!cargo.some((c) => fits(c.itemId, c.qty, free) > 0)} onClick={storeAll}>
            {t('game.vault.storeAll')}
          </button>
        </div>
      )}
      {st.vault.length > 0 && (
        <div className="vault-pick">
          {st.vault.map((l) => {
            const n = fits(l.itemId, l.qty, freeCargo(a));
            return (
              <div key={l.lid} className="vault-row">
                <GameIcon id={l.itemId} size={24} accent="cold" />
                <span className="vault-name">
                  <span>{t('game.qtyItem', { qty: l.qty, item: itemName(l.itemId) })}</span>
                  <small className="mono">{fmt.tons(def(l.itemId).weight * l.qty)}</small>
                </span>
                {here && (
                  <button className="btn sm ghost" disabled={n <= 0} onClick={() => act((g, ag) => A.withdraw(g, ag, l.itemId, n))}>
                    {t('game.country.station.withdraw')}
                    {n > 0 && n < l.qty ? ` (${n})` : ''}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
