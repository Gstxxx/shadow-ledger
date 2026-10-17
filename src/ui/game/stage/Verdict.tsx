import { useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { GBigNumber, GDetails, GVerdict } from '../../../art';
import { audio } from '../../../audio/engine';
import { useT } from '../../../i18n';

export type VerdictTone = 'good' | 'bad' | 'warn' | 'neutral';

const ICON = { good: CheckCircle2, bad: AlertTriangle, warn: AlertTriangle, neutral: Info };

/** Veredito do topo da tela (docs/UX-RULES.md, regra 1): ícone + uma frase + a ação principal. Miolo: GVerdict do kit. */
export function Verdict({ tone, children, action, icon }: { tone: VerdictTone; children: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  const Icon = ICON[tone];
  return (
    <GVerdict tone={tone} icon={icon ?? <Icon size={26} />} action={action} actionsPlacement="below" className="verdict">
      {children}
    </GVerdict>
  );
}

/** "Detalhes" recolhível, fechado por padrão (regra 2). Miolo: GDetails do kit. */
export function Details({ children, label }: { children: ReactNode; label?: ReactNode }) {
  const { t } = useT();
  return (
    <GDetails label={label ?? t('game.stage.details')} className="details-g">
      {children}
    </GDetails>
  );
}

/** Um número grande por tela (regra 2). Miolo: GBigNumber do kit. */
export function BigNumber({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode }) {
  return <GBigNumber label={label} value={value} note={note} className="big-number" />;
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
          {all ? t('common.back') : moreLabel ? moreLabel(items.length) : `${t('game.stage.seeAll')} (${items.length})`}
        </button>
        </MaybeLi>
      )}
    </>
  );
}

const MaybeLi = ({ on, children }: { on: boolean; children: ReactNode }) => (on ? <li className="short-more-li">{children}</li> : <>{children}</>);
