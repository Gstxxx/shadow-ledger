// Galeria de revisão: todos os itens em lg (480) e a mesma lista em sm (96). ?size=sm|lg para só um tamanho.
import { createRoot } from 'react-dom/client';
import { ITEMS } from '../../game/data/items';
import { itemName } from '../../i18n/lookup';
import { ItemIllustration } from './ItemIllustration';

const q = new URLSearchParams(location.search);
const only = q.get('size');
// ?from=0&n=9 mostra só um lote (para screenshots).
const from = Number(q.get('from') ?? 0);
const ids = Object.keys(ITEMS).slice(from, from + Number(q.get('n') ?? 999));

function Gallery() {
  return (
    <main style={{ padding: 16 }}>
      {only !== 'sm' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 480px)', gap: 12 }}>
          {ids.map((id) => (
            <figure key={id} style={{ margin: 0 }}>
              <ItemIllustration id={id} size="lg" alt="" />
              <figcaption style={{ fontSize: 12, opacity: 0.7 }}>{itemName(id)}</figcaption>
            </figure>
          ))}
        </section>
      )}
      {only !== 'lg' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 96px)', gap: 8, marginTop: 16 }}>
          {ids.map((id) => (
            <ItemIllustration key={id} id={id} size="sm" />
          ))}
        </section>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Gallery />);
