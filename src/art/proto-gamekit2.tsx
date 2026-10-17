import { useState } from 'react';
import { DirectorPortrait } from './directors';
import { OperativePortrait } from './portraits';
import { GButton, GChip, GCounter, GMeter } from './game-ui';
import {
  GBoard,
  GCard,
  GDial,
  GMapMarker,
  GModal,
  GRange,
  GSeal,
  GStepper,
  GTelex,
  GTip,
  GToast,
  GToggle,
  GToken,
  GUnitCard,
} from './game-ui-2';

// Vitrine da fase 2 do kit de jogo (página de revisão; não vai para o jogo).

export function GameKitPhase2() {
  const [open, setOpen] = useState<null | 'command' | 'dossier'>(null);
  const [qty, setQty] = useState(4);
  const [vol, setVol] = useState(70);
  const [on, setOn] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div className="g-hud" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', flexWrap: 'wrap' }}>
        <DirectorPortrait origin="banker" size={40} />
        <GDial label="Caixa" size="lg">
          US$ 12,4 mi
        </GDial>
        <GDial label="Lucro · meta 5,6 mi" tone="ok">
          +US$ 1,2 mi
        </GDial>
        <GDial label="Tensão Global" tone="danger">
          62%
        </GDial>
        <div style={{ flex: 1 }} />
        <GDial label="1 mar 2031" size="lg">
          11:02
        </GDial>
      </div>

      <div className="slg-grid" style={{ ['--min' as string]: '320px', gap: 12 }}>
        <GCard icon="docs" title="Documentação Técnica" meta="US$ 988 mil → México US$ 1,2 mi · 4 cabem" seal="+23%" sealSub="por un" tone="hot" actions={<GButton size="sm" variant="primary">Comprar</GButton>} />
        <GCard icon="mg" title="Metralhadoras" meta="US$ 135 mil → México US$ 144 mil · 7 cabem" seal="+7%" sealTone="ok" actions={<GButton size="sm" variant="primary">Comprar</GButton>} />
        <GCard icon="jet2" title="Caça Multimissão" meta="não cabe no avião (15 t)" seal="+45%" tone="off" actions={<GButton size="sm" variant="primary" disabled>Comprar</GButton>} />
        <GCard icon="contract" title="Contrato · 40× Fuzis" meta="Ministério da Defesa · prazo 9 dias" seal="9d" sealSub="prazo" sealTone="danger" tone="danger" />
      </div>

      <div className="slg-grid" style={{ ['--min' as string]: '300px', gap: 8 }}>
        <GUnitCard
          portrait={<OperativePortrait seed="freya-weber" size={42} frame={false} tone="paper" />}
          name="Freya Weber"
          role="Guarda-costas · Pessoal"
          rank={1}
          stats={
            <>
              <span>URB 2</span>
              <span>MIL 1</span>
            </>
          }
          side={<GCounter value={0} format={() => '1,2 mil'} unit="US$" flash={false} />}
          selected
          onClick={() => {}}
        >
          <span style={{ display: 'flex', gap: 4 }}>
            <GChip tone="ok">Persuasivo</GChip>
          </span>
        </GUnitCard>
        <GUnitCard portrait={<OperativePortrait seed="marco-petrov" size={42} frame={false} tone="paper" />} name="Marco Petrov" role="Advogado Associado · Jurídico" rank={2} stats={<span>JUR 3</span>} out="FERIDO" onClick={() => {}} />
      </div>

      <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
        <GMeter label="Reputação" value={-35 + 100} max={200} bipolar tone="danger" valueText="−35" />
        <GMeter label="Reputação" value={60 + 100} max={200} bipolar tone="ok" valueText="+60" />
        <GMeter label="Espaço" value={6.2} max={9.6} segmented tone="live" valueText="6,2 t" />
      </div>

      <div className="slg-row" style={{ gap: 16, alignItems: 'center' }}>
        <GButton variant="primary" onClick={() => setOpen('command')}>
          Abrir Evento
        </GButton>
        <GButton onClick={() => setOpen('dossier')}>Abrir dossiê</GButton>
        <GStepper value={qty} min={0} max={12} onChange={setQty} format={(n) => `${n} un`} decLabel="Menos" incLabel="Mais" />
        <div style={{ width: 200 }}>
          <GRange value={vol} onChange={setVol} aria-label="Volume" />
        </div>
        <GToggle checked={on} onChange={setOn} label="Pausa automática" />
        <input className="g-input" defaultValue="Atalaia Consultoria" aria-label="Nome da agência" />
      </div>

      <div style={{ display: 'grid', gap: 8, maxWidth: 460 }}>
        <GToast tone="good" kicker="Comércio">
          Comprou 4× Documentação Técnica por US$ 3,9 mi.
        </GToast>
        <GToast tone="bad" kicker="Ameaça">
          Batida policial anunciada em Lagos para daqui a 3 dias.
        </GToast>
        <GToast tone="intel" kicker="Inteligência">
          Rota de contrabando aberta no Sahel.
        </GToast>
        <GTip kicker="Exposição">Quanta atenção as ações recentes da agência chamaram neste país. Sobe rápido e cai sozinha.</GTip>
      </div>

      <GTelex kicker="Relatório">Agência Rival: Sindicato Oriel (Mercador) opera a partir de Suíça · Tensão Global sobe para 38%</GTelex>
      <GTelex kicker="Relatório" dark>
        Lince-74 pousou em Lagos · carga intacta
      </GTelex>

      <div className="slg-row" style={{ gap: 16, alignItems: 'flex-start' }}>
        <svg viewBox="0 0 360 160" width={360} height={160} style={{ maxWidth: '100%', background: 'radial-gradient(circle at 50% 50%, #16232a, #07090b)', boxShadow: 'inset 0 0 0 1px var(--g-line)' }}>
          <path className="g-route" d="M40 120 Q 160 10 300 70" strokeWidth={1.4} strokeDasharray="4 3" />
          <GMapMarker kind="country" x={40} y={120} label="México" />
          <GMapMarker kind="selected" x={120} y={60} label="Estados Unidos" />
          <GMapMarker kind="station" x={300} y={70} tier={2} label="Lagos" />
          <GMapMarker kind="rival" x={220} y={120} label="Suíça" />
          <GMapMarker kind="threat" x={260} y={30} />
          <GMapMarker kind="director" x={180} y={42} />
        </svg>
        <div style={{ width: 'min(520px, 100%)' }}>
          <GBoard cells={{ '0,1': 'deploy', '1,1': 'deploy', '5,1': 'target', '6,0': 'enemy', '6,2': 'enemy' }}>
            <GToken col={1} row={2} hp={4} portrait={<OperativePortrait seed="a1" size={38} frame={false} tone="cold" />} />
            <GToken col={2} row={1} hp={5} portrait={<OperativePortrait seed="b2" size={38} frame={false} tone="cold" />} />
            <GToken col={7} row={1} hp={2} enemy portrait={<OperativePortrait seed="x9" size={38} frame={false} tone="signal" />} />
            <GToken col={7} row={3} hp={3} enemy portrait={<OperativePortrait seed="y8" size={38} frame={false} tone="signal" />} />
          </GBoard>
        </div>
      </div>

      <GModal
        open={open !== null}
        onClose={() => setOpen(null)}
        variant={open === 'dossier' ? 'dossier' : 'command'}
        tone={open === 'dossier' ? 'action' : 'bad'}
        kicker={open === 'dossier' ? 'Ficha · OP-0091' : 'Evento · Ameaça'}
        title={open === 'dossier' ? 'Freya Weber' : 'Batida policial em Lagos'}
        actions={
          <>
            <GButton variant="ghost" onClick={() => setOpen(null)}>
              Depois
            </GButton>
            <GButton variant="primary" onClick={() => setOpen(null)}>
              Preparar defesa
            </GButton>
          </>
        }
      >
        A polícia federal anunciou uma batida na Estação de Lagos. Prévia: <GSeal small tone="ok">62%</GSeal> de vitória com Tática Defensiva.
      </GModal>
    </div>
  );
}
