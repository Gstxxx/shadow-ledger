import { GameIcon } from '../../../art';
import { ILLUSTRATED_IDS, ItemIllustration } from '../../item-illustrations';

/**
 * Imagem do item numa moldura única (3:2, cantos chanfrados), para a lista não parecer misturada:
 * a ilustração da menu-motion quando existe; senão o ícone do kit, centralizado na mesma moldura.
 * `sm` = miniatura 72×48 das linhas; `lg` = topo do modal de item (ocupa a largura).
 */
export function ItemPic({ id, size = 'sm', accent = 'warm' }: { id: string; size?: 'sm' | 'lg'; accent?: 'warm' | 'signal' | 'cold' }) {
  const lg = size === 'lg';
  return (
    <span className={`ipic ipic--${size}`}>
      {ILLUSTRATED_IDS.includes(id) ? <ItemIllustration id={id} size={size} alt="" /> : <GameIcon id={id} size={lg ? 112 : 28} accent={accent} />}
    </span>
  );
}
