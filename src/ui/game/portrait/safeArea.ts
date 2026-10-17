/**
 * Áreas seguras (notch, barra de status, home indicator) como variáveis CSS --safe-t/r/b/l.
 * Debug: `?safe=62,0,34,0` (top,right,bottom,left em px) injeta os valores e pinta as faixas,
 * para simular um iPhone no Chrome. Sem a query, valem os `env(safe-area-inset-*)` do aparelho.
 */
export function installSafeAreaDebug() {
  if (typeof window === 'undefined') return;
  const raw = new URLSearchParams(window.location.search).get('safe');
  if (!raw) return;
  const [t = 0, r = 0, b = 0, l = 0] = raw.split(',').map((v) => Math.max(0, Number(v) || 0));
  const root = document.documentElement;
  root.style.setProperty('--safe-t', `${t}px`);
  root.style.setProperty('--safe-r', `${r}px`);
  root.style.setProperty('--safe-b', `${b}px`);
  root.style.setProperty('--safe-l', `${l}px`);
  root.classList.add('safe-debug');
}
