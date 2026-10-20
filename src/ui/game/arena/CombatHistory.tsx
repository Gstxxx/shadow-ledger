import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { CombatState } from '../../../game/types';
import { useT } from '../../../i18n';
import { msgText } from '../msgText';

/**
 * Registro da luta inteiro (só no desktop, na coluna da direita): o mais novo em cima, separado por Rodada, com a
 * cor do lado de quem agiu e em negrito quem caiu ou trocou de lado. Nos celulares fica o log curto de 3 linhas.
 */
export function CombatHistory({ c, count = c.log.length }: { c: CombatState; /** linhas já mostradas (as do turno saem batida a batida) */ count?: number }) {
  const { t, lang } = useT();
  // Lado pelo nome de quem age: guarda o primeiro lado visto (quem trocou de lado segue com a cor de origem).
  const sides = useRef(new Map<string, 'p' | 'e'>());
  for (const u of c.units) if (!sides.current.has(u.unit.name)) sides.current.set(u.unit.name, u.side);
  for (const u of c.reserve) if (!sides.current.has(u.name)) sides.current.set(u.name, 'p');

  const groups: { turn: number; lines: ReactNode[] }[] = [];
  for (let i = Math.min(count, c.log.length) - 1; i >= 0; i--) {
    const turn = c.logTurn?.[i] ?? c.turn;
    let grp = groups[groups.length - 1];
    if (!grp || grp.turn !== turn) groups.push((grp = { turn, lines: [] }));
    const m = c.logMsg?.[i];
    const text = msgText(m, c.log[i], lang);
    const actor = m?.params?.unit;
    const side = typeof actor === 'string' ? sides.current.get(actor) : undefined;
    const kill = m?.key === 'msg.fight.downed' || m?.key === 'msg.fight.convinced';
    const target = kill && typeof m?.params?.target === 'string' ? m.params.target : '';
    const at = target ? text.indexOf(target) : -1;
    grp.lines.push(
      <li key={i} className={`cb-hline${side ? ` side-${side}` : ''}${kill ? ' kill' : ''}`}>
        {at < 0 ? (
          text
        ) : (
          <>
            {text.slice(0, at)}
            <b>{target}</b>
            {text.slice(at + target.length)}
          </>
        )}
      </li>,
    );
  }

  return (
    <section className="cb-history mono" aria-label={t('game.combat.history')}>
      {groups.map((g) => (
        <div key={g.turn} className="cb-round">
          <h3>{g.turn > 0 ? t('game.combat.round', { n: g.turn }) : t('game.combat.roundPre')}</h3>
          <ol>{g.lines}</ol>
        </div>
      ))}
    </section>
  );
}
