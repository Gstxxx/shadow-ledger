import { useState } from 'react';
import { DirectorPortrait } from './directors';
import { GameIcon } from './icons/GameIcon';
import { OperativePortrait } from './portraits';
import { WorldGlow } from './backdrops';
import {
  GBadge,
  GButton,
  GChip,
  GCounter,
  GHelp,
  GIconButton,
  GMenuItem,
  GMeter,
  GPanel,
  GSegmented,
  GTabs,
} from './game-ui';

// Vitrine dos componentes de jogo (.g-*) e uma recriação da tela de jogo com eles,
// usada no "depois" de docs/ART.md. Só demonstração: não lê estado do jogo.

const MARKET = [
  { id: 'docs', name: 'Documentação Técnica', buy: '988 mil', sell: '1,2 mi', gain: '+23%/un', fit: '4 cabem', ok: true },
  { id: 'bodyguard', name: 'Guarda-costas', buy: '34 mil', sell: '37 mil', gain: '+11%/un', fit: '92 cabem', ok: true },
  { id: 'mg', name: 'Metralhadoras', buy: '135 mil', sell: '144 mil', gain: '+7%/un', fit: '7 cabem', ok: true },
  { id: 'jet2', name: 'Caça Multimissão', buy: '27,9 mi', sell: '40,4 mi', gain: '+45%/un', fit: 'não cabe no avião', ok: false },
];

export function GameKitShowcase() {
  const [speed, setSpeed] = useState<'p' | '1' | '2' | '4'>('1');
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div className="slg-row" style={{ alignItems: 'center', gap: 14 }}>
        <GButton variant="primary" icon="crate">
          Comprar
        </GButton>
        <GButton>Ver México</GButton>
        <GButton variant="danger" icon="threat">
          Abortar
        </GButton>
        <GButton variant="ghost">Cancelar</GButton>
        <GButton variant="primary" disabled>
          Comprar
        </GButton>
        <GButton className="is-pressed">Pressionado</GButton>
        <GButton variant="primary" busy={busy} onClick={() => setBusy(true)} onBlur={() => setBusy(false)}>
          {busy ? 'Enviando' : 'Ocupado (clique)'}
        </GButton>
        <GIconButton label="Menu" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>} />
        <GIconButton label="Pausar" icon="clock" variant="primary" />
      </div>
      <div className="slg-row" style={{ alignItems: 'center', gap: 14 }}>
        <GButton size="lg" variant="primary" iconEnd={<span aria-hidden>→</span>}>
          Começar operação
        </GButton>
        <GButton size="sm">Detalhes</GButton>
        <GButton size="sm" variant="primary" sub="US$ 250 mil">
          Abrir Estação
        </GButton>
        <GSegmented
          label="Velocidade"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: 'p', label: 'II', aria: 'Pausar' },
            { value: '1', label: '1×' },
            { value: '2', label: '2×' },
            { value: '4', label: '4×' },
          ]}
        />
      </div>
      <div className="slg-row" style={{ alignItems: 'center', gap: 10 }}>
        <GChip>Modesto</GChip>
        <GChip tone="ok">Persuasivo</GChip>
        <GChip tone="warn" icon="contract">
          Prazo 9d
        </GChip>
        <GChip tone="danger" icon="threat">
          Ameaça
        </GChip>
        <GChip tone="live">Ao vivo</GChip>
        <GBadge>3</GBadge>
        <GBadge tone="alert">2</GBadge>
        <GBadge tone="action">6</GBadge>
        <span style={{ fontSize: 13 }}>
          Exposição <GHelp label="O que é Exposição?" />
        </span>
      </div>
      <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
        <GMeter label="Reputação" value={25} max={100} tone="neutral" mark={50} valueText="25" />
        <GMeter label="Exposição" value={62} max={100} tone="danger" valueText="62" />
        <GMeter label="Tensão" value={0.38} segmented valueText="38%" />
        <GMeter label="Ao vivo" value={0.7} tone="live" thin valueText="70%" />
      </div>
    </div>
  );
}

/** Recriação da tela de jogo com os componentes novos (mesmo conteúdo da captura "antes"). */
export function GameScreenMock({ width = 1180 }: { width?: number }) {
  const [layer, setLayer] = useState<'postura' | 'exposicao' | 'politica'>('postura');
  const [speed, setSpeed] = useState<'p' | '1' | '2' | '4' | '8'>('p');
  const [cat, setCat] = useState('opp');
  const [side, setSide] = useState('frota');
  const [cash, setCash] = useState(5_000_000);
  return (
    <div style={{ width, maxWidth: '100%', background: 'var(--g-bg)', color: 'var(--g-text)', fontFamily: "'Archivo Variable', var(--sl-font-body)", border: '1px solid var(--g-line)' }}>
      {/* barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 14px', background: 'linear-gradient(180deg, #151a20, #0d1014)', boxShadow: 'inset 0 -1px 0 var(--g-line-2), 0 4px 12px rgba(0,0,0,.4)' }}>
        <DirectorPortrait origin="smuggler" size={40} />
        <div style={{ display: 'grid', gap: 2 }}>
          <span className="g-title" style={{ fontSize: 20 }}>Atalaia Consultoria</span>
          <span className="g-label">Lucro no prazo · 90 dias</span>
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          <span className="g-label">Caixa</span>
          <GCounter value={cash} unit="US$" format={(n) => (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} suffix="mi" size="lg" />
        </div>
        <div style={{ display: 'grid', gap: 4, width: 200 }}>
          <span className="g-label" style={{ whiteSpace: 'nowrap' }}>Lucro · meta 5,6 mi</span>
          <GMeter value={0.12} tone="ok" />
        </div>
        <div style={{ display: 'grid', gap: 4, width: 170 }}>
          <span className="g-label" style={{ whiteSpace: 'nowrap' }}>Tensão · Baixa</span>
          <GMeter value={0.18} segmented tone="danger" mark={0.8} />
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className="g-label">1 mar 2031</div>
          <GCounter value={0} format={() => '11:02'} size="lg" flash={false} />
        </div>
        <GSegmented
          label="Velocidade"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: 'p', label: 'II', aria: 'Pausado' },
            { value: '1', label: '1×' },
            { value: '2', label: '2×' },
            { value: '4', label: '4×' },
            { value: '8', label: '8×' },
          ]}
        />
        <GIconButton label="Menu" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 330px', gap: 10, padding: 10, minHeight: 600 }}>
        {/* país + mercado */}
        <div style={{ display: 'grid', gap: 10, alignContent: 'start', minWidth: 0 }}>
          <GPanel label="País" code="Nível 5 · Paz">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="g-title">Estados Unidos</h3>
              <GChip>Neutro</GChip>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <GMeter label={<>Reputação <GHelp label="O que é Reputação?" /></>} value={25} max={100} tone="neutral" mark={50} valueText="25" />
              <GMeter label={<>Exposição <GHelp label="O que é Exposição?" /></>} value={0} max={100} tone="danger" valueText="0" />
            </div>
          </GPanel>
          <GPanel label="Mercado" code={<GChip tone="live">preços ao vivo</GChip>} pad="12px 0 4px">
            <div style={{ padding: '0 14px 10px', display: 'grid', gap: 6 }}>
              <GMeter label="Espaço no avião" value={0.4} max={9.6} tone="live" thin valueText="0,4 / 9,6 t" />
            </div>
            <GTabs
              label="Categorias do Mercado"
              value={cat}
              onChange={setCat}
              items={[
                { id: 'opp', label: 'Oportunidades', icon: 'forecast', count: 6 },
                { id: 'arms', label: 'Armamento', icon: 'rifles', count: 4 },
                { id: 'veh', label: 'Veículos', icon: 'apc', count: 7 },
              ]}
            />
            <div className="g-tabbody" style={{ padding: 0 }}>
              {MARKET.map((m) => (
                <div key={m.id} className={`g-row${m.ok ? '' : ' g-row--off'}`} style={{ gridTemplateColumns: '28px 1fr auto' }}>
                  <GameIcon id={m.id} size={26} />
                  <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--g-text-2)' }}>
                      Aqui <GCounter value={0} format={() => m.buy} unit="US$" flash={false} /> → México <GCounter value={0} format={() => m.sell} unit="US$" flash={false} />
                    </span>
                    <span style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--g-ok-hi)', fontFamily: 'var(--g-font-mono)' }}>{m.gain}</span>
                      <span style={{ color: m.ok ? 'var(--g-text-3)' : 'var(--g-danger-hi)' }}> · {m.fit}</span>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 6, justifyItems: 'stretch' }}>
                    <GButton size="sm" variant="primary" disabled={!m.ok} onClick={() => setCash((c) => c - 100_000)}>
                      Comprar
                    </GButton>
                    <GButton size="sm" variant="ghost">
                      Ver México
                    </GButton>
                  </div>
                </div>
              ))}
            </div>
          </GPanel>
        </div>

        {/* mapa */}
        <div style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--g-line)' }}>
          <WorldGlow tension={0.18} spots={[{ x: 0.45, y: 0.4, tone: 'warm', r: 0.03 }, { x: 0.3, y: 0.55, tone: 'cold', r: 0.02 }]} />
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <GSegmented
              label="Camada do mapa"
              value={layer}
              onChange={setLayer}
              options={[
                { value: 'postura', label: 'Postura' },
                { value: 'exposicao', label: 'Exposição' },
                { value: 'politica', label: 'Política' },
              ]}
            />
          </div>
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'grid', gap: 6 }}>
            <GIconButton label="Aproximar" size="sm" icon={<span style={{ fontSize: 18, lineHeight: 1 }}>+</span>} />
            <GIconButton label="Afastar" size="sm" icon={<span style={{ fontSize: 18, lineHeight: 1 }}>−</span>} />
          </div>
          <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
            <GPanel tone="sunken" pad="8px 12px">
              <span className="g-label" style={{ marginRight: 10 }}>Relatório</span>
              <span style={{ fontSize: 13 }}>Agência Rival: Sindicato Oriel (Mercador) opera a partir de Suíça.</span>
            </GPanel>
          </div>
        </div>

        {/* agência */}
        <div style={{ display: 'grid', alignContent: 'start', minWidth: 0 }}>
          <GTabs
            label="Agência"
            value={side}
            onChange={setSide}
            compact
            items={[
              { id: 'frota', label: 'Frota', icon: 'fleet', count: 3 },
              { id: 'carga', label: 'Carga', icon: 'crate' },
              { id: 'est', label: 'Estações', icon: 'station-office', count: 1 },
              { id: 'eq', label: 'Equipes', icon: 'team' },
              { id: 'ct', label: 'Contratos', icon: 'contract' },
              { id: 'am', label: 'Ameaças', icon: 'threat', count: 1, alert: true },
            ]}
          />
          <div className="g-tabbody" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="g-label">Escolta</span>
              <GButton size="sm" icon="team">
                Destacar Equipe
              </GButton>
            </div>
            {[
              { seed: 'freya-weber', name: 'Freya Weber', role: 'Guarda-costas · Pessoal', cost: '1,2 mil', chips: [['ok', 'Persuasivo']] },
              { seed: 'ana-dubois', name: 'Ana Dubois', role: 'Guarda-costas · Pessoal', cost: '840', chips: [['neutral', 'Modesto'], ['neutral', 'Discreto']] },
              { seed: 'marco-petrov', name: 'Marco Petrov', role: 'Advogado Associado · Jurídico', cost: '1,7 mil', chips: [['warn', 'Ferido']] },
            ].map((u) => (
              <div key={u.seed} className="g-row" style={{ gridTemplateColumns: '44px 1fr auto', padding: '8px 6px 8px 10px' }}>
                <OperativePortrait seed={u.seed} size={44} frame={false} tone="paper" />
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{u.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--g-text-2)' }}>{u.role}</span>
                  <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.chips.map(([t, l]) => (
                      <GChip key={l} tone={t as 'ok' | 'neutral' | 'warn'}>
                        {l}
                      </GChip>
                    ))}
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <GCounter value={0} format={() => u.cost} unit="US$" flash={false} />
                  <div className="g-label" style={{ fontSize: 10 }}>por mês</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Menu principal com GMenuItem (para a menu-motion). */
export function MenuMock() {
  const [cur, setCur] = useState(0);
  const items: [string, string?][] = [['Nova partida', '8 presets'], ['Continuar', 'nenhum arquivo'], ['Como jogar'], ['Configurações'], ['Créditos']];
  return (
    <div style={{ width: 420, maxWidth: '100%', display: 'grid' }}>
      {items.map(([l, m], i) => (
        <GMenuItem key={l} label={l} meta={m} current={i === cur} onPointerEnter={() => setCur(i)} onFocus={() => setCur(i)} disabled={l === 'Continuar'} />
      ))}
    </div>
  );
}
