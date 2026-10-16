import { useRef, useState } from 'react';
import { Download, FileUp, Play, Skull, Trash2 } from 'lucide-react';
import type { Strings } from '../strings';
import type { SaveSlot } from '../types';
import { sfx } from '../settings';

interface Props {
  s: Strings;
  saves: SaveSlot[];
  onContinue?(id: string): void;
  onDelete?(id: string): void;
  onExport?(id: string): void;
  onImport?(file: File): Promise<void>;
}

export function Continue({ s, saves, onContinue, onDelete, onExport, onImport }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'busy' | 'ok' | 'bad'; text: string } | null>(null);

  const sorted = [...saves].sort((a, b) => b.savedAt - a.savedAt);

  const pick = async (f: File | undefined) => {
    if (!f || !onImport) return;
    setStatus({ tone: 'busy', text: s.importing });
    try {
      await onImport(f);
      sfx('arrive');
      setStatus({ tone: 'ok', text: s.importOk });
    } catch (e) {
      sfx('alert');
      setStatus({ tone: 'bad', text: e instanceof Error && e.message ? e.message : s.importFail });
    } finally {
      if (file.current) file.current.value = '';
    }
  };

  return (
    <div className="slm-continue">
      {sorted.length === 0 ? (
        <div className="slm-empty" data-enter>
          <p className="slm-empty-title">{s.noSaves}</p>
          <p className="slm-help">{s.noSavesHint}</p>
        </div>
      ) : (
        <ul className="slm-saves">
          {sorted.map((sv) => (
            <li key={sv.id} className="slm-save" data-enter>
              <button type="button" className="slm-save-main" onClick={() => onContinue?.(sv.id)} disabled={!onContinue}>
                <span className="slm-save-title">
                  {sv.hardcore && <Skull size={14} strokeWidth={2} aria-label={s.hardcore} />}
                  {sv.label}
                </span>
                <span className="slm-save-meta">
                  <span>{sv.presetTitle}</span>
                  <span>·</span>
                  <span>{s.day(sv.gameDay)}</span>
                  {sv.profit != null && (
                    <>
                      <span>·</span>
                      <span className={sv.profit >= 0 ? 'slm-pos' : 'slm-neg'}>
                        {s.profit} {s.money(sv.profit)}
                      </span>
                    </>
                  )}
                </span>
                <span className="slm-save-date">
                  {s.savedAt} {s.date(sv.savedAt)}
                </span>
                <Play className="slm-save-play" size={18} aria-hidden="true" />
                <span className="slm-sr">{s.load}</span>
              </button>
              <div className="slm-save-actions">
                {onExport && (
                  <button type="button" className="slm-icon-btn" onClick={() => onExport(sv.id)} aria-label={s.exportAria(sv.label)}>
                    <Download size={18} aria-hidden="true" />
                    <span className="slm-icon-btn-text">{s.export}</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className={`slm-icon-btn slm-icon-btn--danger${armed === sv.id ? ' is-armed' : ''}`}
                    onClick={() => {
                      if (armed === sv.id) {
                        sfx('redact');
                        onDelete(sv.id);
                        setArmed(null);
                      } else {
                        sfx('alert');
                        setArmed(sv.id);
                      }
                    }}
                    onBlur={() => setArmed((a) => (a === sv.id ? null : a))}
                    aria-label={armed === sv.id ? s.confirmDelete : s.deleteAria(sv.label)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                    <span className="slm-icon-btn-text">{armed === sv.id ? s.confirmDelete : s.delete}</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {onImport && (
        <div className="slm-import" data-enter>
          <input
            ref={file}
            type="file"
            accept=".json,.slsave,application/json"
            className="slm-sr"
            tabIndex={-1}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button type="button" className="slm-btn slm-btn--ghost" onClick={() => file.current?.click()}>
            <FileUp size={18} aria-hidden="true" />
            {s.importFile}
          </button>
          {status && (
            <p className={`slm-status slm-status--${status.tone}`} role="status">
              {status.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
