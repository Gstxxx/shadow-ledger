// Liga o harness de demonstração (?demo=…) depois que a store existe. Sem o parâmetro, não faz nada.
import { startDemoFromUrl } from './demo';

if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) setTimeout(startDemoFromUrl, 0);
