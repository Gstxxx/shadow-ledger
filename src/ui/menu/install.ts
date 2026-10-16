// Instalação do PWA: captura `beforeinstallprompt` assim que o módulo carrega (antes do menu montar),
// detecta iOS/Safari (que não tem o evento: só "Compartilhar → Adicionar à Tela de Início") e esconde tudo
// quando o jogo já roda instalado (display-mode standalone/fullscreen).

import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** prompt: o navegador oferece instalar · ios: instruções manuais · installed: já instalado · none: nada a fazer. */
export type InstallMode = 'prompt' | 'ios' | 'installed' | 'none';

let deferred: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
let forcedIos = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function standalone(): boolean {
  try {
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
  } catch {
    return false;
  }
}

/** iPhone/iPad no Safari (no iPadOS o Safari se diz Mac, mas tem toque). Chrome/Firefox no iOS também não instalam. */
function iosSafari(): boolean {
  if (forcedIos) return true;
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Sem o mini-banner do navegador: o menu oferece no lugar certo.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    deferred = null;
    emit();
  });
  try {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', emit);
  } catch {
    /* navegador antigo */
  }
}

function mode(): InstallMode {
  if (installedFlag || standalone()) return 'installed';
  if (deferred) return 'prompt';
  if (iosSafari()) return 'ios';
  return 'none';
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Abre o diálogo de instalação do navegador. Devolve true se a pessoa aceitou. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  // O evento só serve uma vez; se recusou, o navegador pode disparar outro mais tarde.
  deferred = null;
  if (outcome === 'accepted') installedFlag = true;
  emit();
  return outcome === 'accepted';
}

export function useInstall(): InstallMode {
  return useSyncExternalStore(subscribe, mode, () => 'none');
}

/** Só para a prévia: ?install=prompt|ios|installed força um modo (o diálogo forçado não instala nada). */
export function forceInstallMode(m: InstallMode) {
  if (m === 'prompt')
    deferred = { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' as const }) } as unknown as BeforeInstallPromptEvent;
  if (m === 'installed') installedFlag = true;
  if (m === 'ios') forcedIos = true;
  emit();
}
