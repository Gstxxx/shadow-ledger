import { useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { audio } from '../../../audio/engine';
import { useT } from '../../../i18n';

export type VerdictTone = 'good' | 'bad' | 'warn' | 'neutral';

const ICON = { good: CheckCircle2, bad: AlertTriangle, warn: AlertTriangle, neutral: Info };

/** Veredito do topo da tela (docs/UX-RULES.md, regra 1): ícone + uma frase + a ação principal. */
export function Verdict({ tone, children, action, icon }: { tone: VerdictTone; children: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  const Icon = ICON[tone];
  return (
    <div className={`verdict tone-${tone}`} role="status">
      <span className="verdict-icon" aria-hidden>
        {icon ?? <Icon size={22} />}
      </span>
      <p className="verdict-text">{children}</p>
      {action && <div className="verdict-action">{action}</div>}
    </div>
  );
}

/** "Ver detalhes" recolhível, fechado por padrão (regra 2). */
export function Details({ children, label }: { children: ReactNode; label?: ReactNode }) {
  const { t } = useT();
  return (
    <details className="details-g" onToggle={() => audio.sfx('click')}>
      <summary>
        <span>{label ?? t('menu.new.details')}</span> <ChevronDown size={16} aria-hidden />
      </summary>
      <div className="details-g-body">{children}</div>
    </details>
  );
}

/** Um número grande por tela (regra 2). */
export function BigNumber({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="big-number">
      <span className="k">{label}</span>
      <span className="v num">{value}</span>
      {note && <span className="note mono">{note}</span>}
    </div>
  );
}

/** Lista curta: os primeiros `max` itens e "Ver todos" para o resto (regra 5). */
export function ShortList<T>({
  items,
  max = 4,
  render,
  moreLabel,
  inList,
}: {
  items: T[];
  max?: number;
  render: (it: T, i: number) => ReactNode;
  moreLabel?: (n: number) => ReactNode;
  /** dentro de <ul>: o botão vai num <li> */
  inList?: boolean;
}) {
  const { t } = useT();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, max);
  return (
    <>
      {shown.map(render)}
      {items.length > max && (
        <MaybeLi on={!!inList}>
        <button
          className="btn ghost sm short-more"
          onClick={() => {
            audio.sfx('click');
            setAll(!all);
          }}
        >
          {all ? t('common.back') : moreLabel ? moreLabel(items.length) : `${t('game.bits.more')} (${items.length - max})`}
        </button>
        </MaybeLi>
      )}
    </>
  );
}

const MaybeLi = ({ on, children }: { on: boolean; children: ReactNode }) => (on ? <li className="short-more-li">{children}</li> : <>{children}</>);
