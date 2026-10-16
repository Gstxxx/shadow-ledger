import { useRef, useState } from 'react';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { audio } from '../../audio/engine';
import { exportSave, importSave, useGameStore } from '../../store/game';
import { useSettings } from '../../store/settings';
import type { Speed } from '../../store/settings';
import { sweepOut } from './sweep';

/** Configurações: volumes, velocidade padrão, movimento e o save (exportar/importar, ADR 0003). */
export function SettingsPanel({ embedded, onClose }: { embedded?: boolean; onClose?: () => void }) {
  const st = useSettings();
  const toast = useGameStore((s) => s.toast);
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const download = () => {
    const raw = exportSave();
    if (!raw) return setMsg('Nenhuma partida salva.');
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shadow-ledger-save.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Save exportado.');
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    const ok = importSave(await f.text());
    setMsg(ok ? 'Save importado. Use Continuar no menu.' : 'Arquivo inválido.');
    if (ok) toast('Save importado.', 'good');
  };

  return (
    <div className="settings">
      <div className="field">
        <label htmlFor="vol-music">Música · {Math.round(st.music * 100)}%</label>
        <input id="vol-music" className="range" type="range" min={0} max={1} step={0.05} value={st.music} onChange={(e) => st.setMusic(+e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="vol-sfx">Efeitos · {Math.round(st.sfx * 100)}%</label>
        <input
          id="vol-sfx"
          className="range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={st.sfx}
          onChange={(e) => st.setSfx(+e.target.value)}
          onPointerUp={() => audio.sfx('click')}
        />
      </div>
      <div className="field">
        <span className="field-label">Velocidade padrão do relógio</span>
        <div className="seg">
          {([1, 2, 4] as Speed[]).map((v) => (
            <button key={v} className="btn sm" aria-pressed={st.defaultSpeed === v} onClick={() => st.setDefaultSpeed(v)}>
              {v}×
            </button>
          ))}
        </div>
        <span className="hint">1× = uma hora de jogo por segundo. O relógio pausa sozinho em cada Evento.</span>
      </div>
      <div className="field">
        <span className="field-label">Movimento</span>
        <label className="toggle-row">
          <input type="checkbox" checked={st.reducedMotion} onChange={(e) => st.setReducedMotion(e.target.checked)} style={{ accentColor: 'var(--amber)' }} />
          <span className="hint">Reduzir animações (pula a abertura e congela o globo).</span>
        </label>
      </div>
      {!embedded && (
        <div className="field">
          <span className="field-label">Save</span>
          <div className="seg">
            <button className="btn sm" onClick={download}>
              <Download size={14} /> Exportar
            </button>
            <button className="btn sm" onClick={() => file.current?.click()}>
              <Upload size={14} /> Importar
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </div>
          <span className="hint">O save fica neste navegador (autosave diário). Exporte para levar a outro aparelho.</span>
          {msg && <span className="hint" style={{ color: 'var(--amber)' }}>{msg}</span>}
        </div>
      )}
      {onClose && (
        <button className="btn" onClick={onClose}>
          Fechar
        </button>
      )}
    </div>
  );
}

export function SettingsScreen() {
  const root = useRef<HTMLDivElement>(null);
  const go = useGameStore((s) => s.go);
  const back = () => {
    audio.sfx('close');
    sweepOut(root.current, () => go('title'));
  };
  return (
    <div className="sheet-screen" ref={root}>
      <section className="sheet panel-enter" style={{ width: 'min(560px, 100%)' }} aria-label="Configurações">
        <header className="sheet-head">
          <button className="btn icon ghost" onClick={back} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h2>Configurações</h2>
        </header>
        <div className="sheet-body">
          <SettingsPanel />
        </div>
      </section>
    </div>
  );
}

export function CreditsScreen() {
  const root = useRef<HTMLDivElement>(null);
  const go = useGameStore((s) => s.go);
  const back = () => {
    audio.sfx('close');
    sweepOut(root.current, () => go('title'));
  };
  return (
    <div className="sheet-screen" ref={root}>
      <section className="sheet panel-enter credits" style={{ width: 'min(620px, 100%)' }} aria-label="Créditos">
        <header className="sheet-head">
          <button className="btn icon ghost" onClick={back} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h2>Créditos</h2>
        </header>
        <div className="sheet-body">
          <p>
            <strong>Shadow Ledger</strong> é um jogo de estratégia em tempo contínuo sobre dirigir uma agência privada de inteligência.
            Inspirado nas mecânicas de um clássico independente de 2006; nomes, textos, arte e som são todos novos.
          </p>
          <h3>Direção e design</h3>
          <p>Gstx</p>
          <h3>Código, arte e trilha procedurais</h3>
          <p>Gerados em código: mapa e globo com d3-geo, trilha e efeitos sintetizados em tempo real com Web Audio, fundos em canvas e SVG.</p>
          <h3>Bibliotecas e dados abertos</h3>
          <p>
            React, Zustand, GSAP, d3-geo, TopoJSON, world-atlas (Natural Earth, domínio público), DiceBear com o estilo Notionists
            (Zoish, CC0), Lucide, fontes Archivo e IBM Plex Mono (SIL Open Font License).
          </p>
          <p className="hint">O mapa e os países são reais; governos, guerras, alvos e pessoas são fictícios.</p>
        </div>
      </section>
    </div>
  );
}
