import { useState } from 'react';
import { WorldGlow } from './backdrops';
import { GButton, GChip, GMeter } from './game-ui';
import { GCard, GModal, GStepper } from './game-ui-2';
import { GBigNumber, GDetails, GModeSwitch, GVerdict } from './game-ui-3';

// Demo das regras de tela simples (página de revisão): veredito, número grande, 1 ação, detalhes recolhíveis.

export function SimpleDemo({ screen = 'trade' }: { screen?: 'trade' | 'country' | 'kit' }) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState(4);
  const [open, setOpen] = useState(false);

  if (screen === 'kit') {
    return (
      <div style={{ display: 'grid', gap: 16, padding: 16, maxWidth: 900, background: 'var(--g-bg)', color: 'var(--g-text)', fontFamily: "'Archivo Variable', sans-serif" }}>
        <GVerdict tone="good" icon="money" kicker="Veredito" title="Vale comprar: +23% no México" detail="4 cabem no avião · 7 h de voo" primary={<GButton variant="primary">Comprar 4</GButton>} secondary={<GButton variant="ghost">Ver México</GButton>} />
        <GVerdict tone="neutral" icon="forecast" kicker="Veredito" title="Margem pequena: +3%" detail="Só compensa se o avião já vai para lá" primary={<GButton>Ver opções</GButton>} />
        <GVerdict tone="warn" icon="exposure" kicker="Atenção" title="Exposição alta em Lagos" detail="Uma Ameaça policial pode vir em 3 dias" primary={<GButton variant="primary">Baixar perfil</GButton>} />
        <GVerdict tone="danger" icon="threat" kicker="Perigo" title="Chance quase nula (0%)" detail="Força 4 contra 26 · pode deixar o Diretor Detido" primary={<GButton variant="danger">Abortar</GButton>} secondary={<GButton variant="ghost">Lutar mesmo assim</GButton>} role="alert" />
        <GVerdict tone="bad" icon="threat" action={<GButton variant="danger">Defender a Estação</GButton>} actionsPlacement="below">
          Batida policial em Lagos daqui a 3 dias
        </GVerdict>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <GBigNumber label="Lucro estimado" unit="US$" value="920 mil" delta={23} deltaText="23%" tone="ok" sub="4 × Documentação Técnica" />
          <GBigNumber label="Caixa" unit="US$" value="5,0 mi" delta={-120} deltaText="120 mil" />
          <GBigNumber label="Tensão Global" value="62%" tone="danger" size="sm" />
        </div>
        <GModeSwitch
          label="Modo"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'buy', label: 'Comprar', icon: 'crate', tone: 'action' },
            { value: 'sell', label: 'Vender', icon: 'money', tone: 'ok' },
          ]}
        />
        <GDetails label="Detalhes" summary="preços em 3 países" open={open} onToggle={setOpen}>
          Mais barato: Estados Unidos US$ 988 mil · Paga mais: México US$ 1,2 mi · Saturação sobe 8% depois.
        </GDetails>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--g-bg)', fontFamily: "'Archivo Variable', sans-serif" }}>
      <WorldGlow tension={0.2} />
      {screen === 'trade' ? (
        <GModal
          open
          size="md"
          onClose={() => {}}
          onBack={() => {}}
          kicker="Mercado · Estados Unidos"
          title="Documentação Técnica"
          actions={
            <GButton variant="primary" size="lg" block>
              {mode === 'buy' ? `Comprar ${qty} · US$ 3,9 mi` : `Vender ${qty} · US$ 4,8 mi`}
            </GButton>
          }
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <GModeSwitch
              label="Modo"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'buy', label: 'Comprar', icon: 'crate' },
                { value: 'sell', label: 'Vender', icon: 'money', tone: 'ok' },
              ]}
            />
            <GVerdict tone={mode === 'buy' ? 'good' : 'neutral'} icon={mode === 'buy' ? 'money' : 'forecast'} kicker="Veredito" title={mode === 'buy' ? 'Vale comprar: +23% no México' : 'Aqui pagam pouco: venda no México'} role="none" />
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <GBigNumber label="Lucro estimado" unit="US$" value="920 mil" delta={23} deltaText="23%" tone="ok" />
              <GStepper value={qty} min={1} max={4} onChange={setQty} format={(n) => `${n} un`} decLabel="Menos" incLabel="Mais" />
            </div>
            <GDetails label="Detalhes" summary="preços e espaço" open={open} onToggle={setOpen}>
              <div style={{ display: 'grid', gap: 8 }}>
                <GMeter label="Espaço" value={0.4} max={9.6} tone="live" thin valueText="0,4 / 9,6 t" />
                <span>Mais barato: Estados Unidos US$ 988 mil · Paga mais: México US$ 1,2 mi</span>
                <span>Preço local sobe 8% depois desta compra.</span>
              </div>
            </GDetails>
          </div>
        </GModal>
      ) : (
        <GModal open size="lg" onClose={() => {}} kicker="País · Nível 5 · Paz" title="Estados Unidos" tabs={[{ id: 'geral', label: 'Visão geral', icon: 'reputation' }, { id: 'mercado', label: 'Mercado', icon: 'money', count: 6 }, { id: 'ops', label: 'Operações', icon: 'special-op' }]} tab="geral">
          <div style={{ display: 'grid', gap: 14 }}>
            <GVerdict tone="good" icon="stance-ally" kicker="Veredito" title="Bom lugar para comprar armas" detail="Reputação boa e Exposição baixa" primary={<GButton variant="primary">Abrir Mercado</GButton>} role="none" />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <GBigNumber label="Melhor negócio" value="+23%" tone="ok" sub="Documentação Técnica → México" />
              <GChip tone="live">preços ao vivo</GChip>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <GCard icon="docs" title="Documentação Técnica" meta="→ México" seal="+23%" sealTone="ok" />
              <GCard icon="rifles" title="Fuzis de Assalto" meta="→ México" seal="+19%" sealTone="ok" />
              <GCard icon="mg" title="Metralhadoras" meta="→ México" seal="+7%" sealTone="ok" />
            </div>
            <GDetails label="Detalhes do país" summary="Reputação, Exposição, política">
              <div style={{ display: 'grid', gap: 8 }}>
                <GMeter label="Reputação" value={125} max={200} bipolar tone="ok" valueText="+25" />
                <GMeter label="Exposição" value={8} max={100} tone="danger" valueText="8" />
              </div>
            </GDetails>
          </div>
        </GModal>
      )}
    </div>
  );
}
