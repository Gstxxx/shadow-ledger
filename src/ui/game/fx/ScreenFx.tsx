import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sprite } from '../../../art';
import { player } from '../../../game/state';
import { useGame } from '../../../store/game';
import { useT } from '../../../i18n';
import { countryName } from '../../../i18n/lookup';
import './screen-fx.css';

/**
 * Efeitos curtos do conjunto vfx-extra (art-kit) fora do Combate. Cada um dura até 1,5 s; com
 * prefers-reduced-motion o <Sprite> mostra um quadro fixo e as animações de CSS ficam paradas.
 */

const SET = 'vfx-extra';
const LIFE = 1400;

/** +US$ / −US$ flutuando junto da Caixa a cada mudança de caixa (compra, venda, contrato, manutenção, bônus). */
export function CashPop() {
  const s = useGame();
  const cash = player(s).cash;
  const { fmt } = useT();
  const prev = useRef(cash);
  const host = useRef<HTMLSpanElement>(null);
  const [pops, setPops] = useState<{ id: number; delta: number; x: number; y: number }[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    const delta = Math.round(cash - prev.current);
    prev.current = cash;
    if (Math.abs(delta) < 1000) return;
    const id = ++seq.current;
    // Junto da Caixa; num portal por cima de tudo, porque em pé os modais cobrem o HUD.
    const r = host.current?.parentElement?.getBoundingClientRect();
    const x = r ? r.left + 8 : 16;
    const y = r ? r.bottom : 80;
    setPops((p) => [...p.slice(-2), { id, delta, x, y }]);
    const t = setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), LIFE);
    return () => clearTimeout(t);
  }, [cash]);
  return (
    <span ref={host} className="fx-cash-host" aria-hidden>
      {pops.length > 0 &&
        createPortal(
          <span className="fx-cash" style={{ left: pops[pops.length - 1].x, top: pops[pops.length - 1].y }} aria-hidden>
            {pops.map((p) => (
              <span key={p.id} className={`fx-cash-pop ${p.delta > 0 ? 'up' : 'down'}`}>
                <Sprite set={SET} anim={p.delta > 0 ? 'money_gain' : 'money_loss'} playing scale={1} />
                <b className="num">{`${p.delta > 0 ? '+' : '−'}${fmt.money(Math.abs(p.delta))}`}</b>
              </span>
            ))}
          </span>,
          document.body,
        )}
    </span>
  );
}

/** Fita de "interditado" desenrolando uma vez quando uma Estação da agência passa a Interditada. */
export function StationTapeFx() {
  const s = useGame();
  const a = player(s);
  const { lang } = useT();
  const key = a.stations
    .filter((st) => st.interdicted)
    .map((st) => st.countryId)
    .join(',');
  const prev = useRef<Set<string> | null>(null);
  const [show, setShow] = useState<{ id: number; countryId: string } | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const now = new Set(key ? key.split(',') : []);
    const before = prev.current;
    prev.current = now;
    if (!before) return; // primeira leitura: não anima o que já estava interditado ao carregar
    const fresh = [...now].find((c) => !before.has(c));
    if (!fresh) return;
    const id = ++seq.current;
    setShow({ id, countryId: fresh });
    const t = setTimeout(() => setShow((v) => (v?.id === id ? null : v)), 1500);
    return () => clearTimeout(t);
  }, [key]);
  if (!show) return null;
  return (
    <div className="fx-tape" role="status">
      <Sprite set={SET} anim="interdicted" playing scale={2} />
      <span className="mono">{countryName(show.countryId, lang)}</span>
    </div>
  );
}

/** Algemas: anima uma vez ao aparecer (Unidade ou Diretor Detido). */
export function ArrestIcon({ scale = 1 }: { scale?: number }) {
  return (
    <span className="fx-icon" aria-hidden>
      <Sprite set={SET} anim="arrest" playing scale={scale} />
    </span>
  );
}

/** Alarme: toca por até 1,5 s quando `ring` muda (nova Ameaça) e depois fica no 1º quadro. */
export function AlarmIcon({ ring, scale = 1, small }: { ring: number; scale?: number; small?: boolean }) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!ring) return;
    }
    if (!ring) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 1500);
    return () => clearTimeout(t);
  }, [ring]);
  return (
    <span className={`fx-icon${small ? ' fx-icon--sm' : ''}`} aria-hidden>
      <Sprite set={SET} anim="alarm" playing={on} frame={2} scale={scale} />
    </span>
  );
}
