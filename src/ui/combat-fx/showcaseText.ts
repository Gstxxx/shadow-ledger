// Rótulos do protótipo de Combate que ainda não têm chave no i18n (o resto vem de src/i18n).
import { getLang } from '../../i18n';

const T = {
  'pt-BR': { forecast: 'Prévia', play: 'Reproduzir', replay: 'De novo' },
  en: { forecast: 'Forecast', play: 'Play', replay: 'Replay' },
};

export const showcaseText = () => T[getLang()] ?? T['pt-BR'];
