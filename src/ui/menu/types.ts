import type { Difficulty, PresetDef } from '../../game/types';

export type Lang = 'pt-BR' | 'en';

/** O que o menu entrega ao App ao iniciar uma partida. */
export interface StartConfig {
  kind: 'preset' | 'sandbox' | 'tutorial';
  /** No Sandbox o menu monta um PresetDef próprio (id 'sandbox'). */
  preset: PresetDef;
  difficulty: Difficulty;
  hardcore: boolean;
  /** Número de Agências Rivais (0–4). */
  rivals: number;
}

/** Resumo de um save local, para a lista de Continuar. */
export interface SaveSlot {
  id: string;
  label: string;
  presetTitle: string;
  /** Momento do save (ms desde a época). */
  savedAt: number;
  /** Dia da partida. */
  gameDay: number;
  profit?: number;
  hardcore?: boolean;
}

export interface MenuSettings {
  lang: Lang;
  /** 0..1 */
  musicVolume: number;
  /** 0..1 */
  sfxVolume: number;
  defaultSpeed: 1 | 2 | 4;
  analystMuted: boolean;
  reducedMotion: boolean;
}

export interface MainMenuProps {
  /** Padrão: PRESETS de src/game/data/rules. */
  presets?: PresetDef[];
  /** Preset roteirizado do Tutorial; sem ele o menu usa o primeiro Preset com kind 'tutorial'. */
  tutorialPresetId?: string;
  onStart?(cfg: StartConfig): void;
  saves?: SaveSlot[];
  onContinue?(saveId: string): void;
  onDeleteSave?(saveId: string): void;
  onExportSave?(saveId: string): void;
  /** Rejeite com Error(mensagem) se o arquivo for inválido. */
  onImportSave?(file: File): Promise<void>;
  /** Sem `settings` o menu guarda as configurações em localStorage ('sl.settings'). */
  settings?: MenuSettings;
  onSettingsChange?(next: MenuSettings): void;
  /** Pula a abertura (ex.: ao voltar de uma partida). */
  skipIntro?: boolean;
}

export type Screen = 'new' | 'continue' | 'settings' | 'credits';
