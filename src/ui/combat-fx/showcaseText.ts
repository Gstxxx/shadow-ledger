// Rótulos do protótipo de Combate que ainda não têm chave no i18n (o resto vem de src/i18n).
import { getLang } from '../../i18n';

const T = {
  'pt-BR': { forecast: 'Prévia', play: 'Reproduzir', replay: 'De novo', downed: 'Baixas hostis', turned: 'Convertidos', xp: 'XP', reward: 'Recompensa', wounded: 'Unidades feridas', detained: 'Unidades detidas', dirDetained: 'Diretor', dirState: 'Detido' },
  en: { forecast: 'Forecast', play: 'Play', replay: 'Replay', downed: 'Hostiles down', turned: 'Converted', xp: 'XP', reward: 'Reward', wounded: 'Units wounded', detained: 'Units detained', dirDetained: 'Director', dirState: 'Detained' },
};

export const showcaseText = () => T[getLang()] ?? T['pt-BR'];
