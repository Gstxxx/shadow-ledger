import { useState } from 'react';
import { WorldGlow } from './backdrops';
import { GButton, GChip, GMeter } from './game-ui';
import { GActionBar, GCard, GDial, GModal, GUnitCard, useModalStack } from './game-ui-2';
import { OperativePortrait } from './portraits';

// Demo do ADR 0006 (página de revisão): mapa como palco, dock de ações e modal central com abas e histórico.

type M = { kind: 'country' | 'agency' | 'item'; key: string };

const COUNTRY_TABS = [
  { id: 'geral', label: 'Visão geral', icon: 'reputation' },
  { id: 'mercado', label: 'Mercado', icon: 'money', count: 6 },
  { id: 'ops', label: 'Operações', icon: 'special-op' },
  { id: 'estacao', label: 'Estação', icon: 'station-office', count: 1 },
];
const AGENCY_TABS = [
  { id: 'diretor', label: 'Diretor', icon: 'director' },
  { id: 'frota', label: 'Frota', icon: 'fleet', count: 3 },
  { id: 'escolta', label: 'Escolta', icon: 'team' },
  { id: 'estacoes', label: 'Estações', icon: 'station-office', count: 1 },
  { id: 'equipes', label: 'Equipes', icon: 'tactic-infiltrate' },
  { id: 'contratos', label: 'Contratos', icon: 'contract', count: 2, alert: true },
];

export function StageDemo({ initial = 'country' as M['kind'] | 'none' }: { initial?: M['kind'] | 'none' }) {
  const stack = useModalStack<M>();
  const [tab, setTab] = useState<Record<string, string>>({});
  const [booted, setBooted] = useState(false);
  if (!booted) {
    setBooted(true);
    if (initial !== 'none') stack.open({ kind: initial, key: initial });
  }
  const cur = stack.current;
  const tabsFor = cur?.kind === 'agency' ? AGENCY_TABS : cur?.kind === 'country' ? COUNTRY_TABS : undefined;
  const active = cur ? (tab[cur.key] ?? tabsFor?.[0].id) : undefined;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--g-bg)', overflow: 'hidden' }}>
      <WorldGlow tension={0.25} spots={[{ x: 0.3, y: 0.4, tone: 'warm', r: 0.03 }, { x: 0.62, y: 0.55, tone: 'signal', r: 0.03 }]} />
      <div className="g-hud" style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', gap: 8, alignItems: 'center', padding: '6px 10px' }}>
        <GDial label="Caixa">US$ 5 mi</GDial>
        <GDial label="Lucro" tone="ok">
          +0,4 mi
        </GDial>
        <div style={{ flex: 1 }} />
        <GDial label="1 mar">11:02</GDial>
      </div>
      <GActionBar
        label="Ações"
        active={cur?.kind === 'country' ? 'pais' : cur?.kind === 'agency' ? 'agencia' : undefined}
        onSelect={(id) => stack.open(id === 'agencia' ? { kind: 'agency', key: 'agency' } : { kind: 'country', key: 'country' })}
        items={[
          { id: 'pais', label: 'País', icon: 'reputation' },
          { id: 'mercado', label: 'Mercado', icon: 'money', count: 6 },
          { id: 'agencia', label: 'Agência', icon: 'team', count: 3 },
          { id: 'ameacas', label: 'Ameaças', icon: 'threat', count: 1, alert: true },
        ]}
        style={{ position: 'absolute', left: '50%', bottom: 'max(10px, var(--safe-b, 0px))', transform: 'translateX(-50%)' }}
      />
      <GModal
        open={!!cur}
        onClose={stack.close}
        onBack={stack.canBack ? stack.back : undefined}
        size={cur?.kind === 'item' ? 'md' : 'xl'}
        kicker={cur?.kind === 'agency' ? 'Agência · Vigia Risk' : cur?.kind === 'item' ? 'Mercado · Estados Unidos' : 'País · Nível 5 · Paz'}
        title={cur?.kind === 'agency' ? 'Agência' : cur?.kind === 'item' ? 'Documentação Técnica' : 'Estados Unidos'}
        tabs={tabsFor}
        tab={active}
        onTab={(id) => cur && setTab((t) => ({ ...t, [cur.key]: id }))}
        contentKey={cur?.key}
        actions={
          cur?.kind === 'item' ? (
            <>
              <GButton variant="ghost" onClick={stack.back}>
                Cancelar
              </GButton>
              <GButton variant="primary">Comprar 4 · US$ 3,9 mi</GButton>
            </>
          ) : undefined
        }
      >
        {cur?.kind === 'item' ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <GMeter label="Espaço" value={0.4} max={9.6} tone="live" thin valueText="0,4 / 9,6 t" />
            <span>Compre aqui US$ 988 mil, México paga US$ 1,2 mi. Cabem 4 no avião.</span>
          </div>
        ) : active === 'mercado' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {['docs', 'mg', 'bodyguard', 'rifles'].map((id, i) => (
              <GCard
                key={id}
                icon={id}
                title={['Documentação Técnica', 'Metralhadoras', 'Guarda-costas', 'Fuzis de Assalto'][i]}
                meta="Compre aqui → venda no México"
                seal={['+23%', '+7%', '+11%', '+35%'][i]}
                sealTone="ok"
                actions={
                  <GButton size="sm" variant="primary" onClick={() => stack.push({ kind: 'item', key: 'item-' + id })}>
                    Comprar
                  </GButton>
                }
              />
            ))}
          </div>
        ) : active === 'escolta' || active === 'frota' ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {['freya', 'ana', 'marco'].map((s, i) => (
              <GUnitCard key={s} portrait={<OperativePortrait seed={s} size={42} frame={false} tone="paper" />} name={['Freya Weber', 'Ana Dubois', 'Marco Petrov'][i]} role="Guarda-costas · Pessoal" rank={i + 1} onClick={() => {}}>
                <span style={{ display: 'flex', gap: 4 }}>
                  <GChip tone="ok">Leal</GChip>
                </span>
              </GUnitCard>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
            <GMeter label="Reputação" value={125} max={200} bipolar tone="ok" valueText="+25" />
            <GMeter label="Exposição" value={12} max={100} tone="danger" valueText="12" />
            <span>Aba "{active}". Toque em Mercado e depois em Comprar para empilhar um modal e ver o voltar no cabeçalho.</span>
          </div>
        )}
      </GModal>
    </div>
  );
}
