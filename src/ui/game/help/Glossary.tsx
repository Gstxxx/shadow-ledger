import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './help.css';

/** Definições curtas, na voz de CONTEXT.md, para o ícone "?" ao lado dos termos. */
export const GLOSSARY = {
  reputation: ['Reputação', 'Como o governo do país vê a agência. Muda devagar e define a Postura (Aliado, Neutro ou Inimigo do Estado).'],
  posture: ['Postura', 'Faixa da Reputação: Aliado, Neutro ou Inimigo do Estado. Inimigos atraem batidas e processos.'],
  exposure: ['Exposição', 'Quanta atenção suas ações recentes chamaram no país. Sobe rápido, cai sozinha e gera Ameaças.'],
  saturation: ['Saturação', 'Suas vendas derrubam o preço local; suas compras o sobem. O efeito some em alguns dias.'],
  cargo: ['Carga', 'O que viaja no avião com o Diretor. O espaço é limitado pelo peso (t) dos cargueiros da Frota.'],
  escort: ['Escolta', 'As Unidades que viajam com o Diretor e o defendem em Combate.'],
  station: ['Estação', 'Base fixa num país: rende por dia, mostra os preços ao vivo e defende o lugar.'],
  team: ['Equipe', 'Parte da Escolta mandada para agir em outro país sem o Diretor. Equipes nunca comerciam.'],
  upkeep: ['Manutenção', 'Custo mensal de cada Unidade: salário do Pessoal ou manutenção das máquinas. Sem pagar, o Pessoal deserta.'],
  trait: ['Traço', 'Característica permanente de uma pessoa: altera força, custo ou recuperação. Ganha mais ao subir de patente.'],
  contract: ['Contrato', 'Pedido de um comprador: entregue a quantidade até o prazo e receba um prêmio acima do mercado.'],
  threat: ['Ameaça', 'Ação hostil anunciada com antecedência (batida, processo, ataque). Dá tempo de reagir.'],
  strength: ['Força', 'Quanto a Unidade rende em cada tipo de Combate: Jurídico, Urbano, Militar, Aéreo e Influência (conversão).'],
  deal: ['Barato/caro aqui', 'Compara o preço deste país com a média dos preços que você conhece no mundo.'],
} as const satisfies Record<string, readonly [string, string]>;

export type TermId = keyof typeof GLOSSARY;

/**
 * Ícone "?" de 44 px de área de toque que abre uma definição. Funciona com toque, clique e teclado
 * (Enter/Espaço abre, Esc fecha); nada depende de hover.
 */
export function Help({ term, children }: { term: TermId; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [title, text] = GLOSSARY[term];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <span className="help" ref={ref}>
      {children}
      <button
        type="button"
        className="help-btn"
        aria-label={`O que é ${title}?`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <span aria-hidden>?</span>
      </button>
      {open && (
        <span id={id} role="tooltip" className="help-pop">
          <b>{title}</b>
          {text}
        </span>
      )}
    </span>
  );
}
