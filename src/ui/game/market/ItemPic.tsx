import { GameIcon } from '../../../art';
import { ItemArt } from '../../../art/ItemArt';
import { ITEM_PHOTOS } from '../../../art/itemPhotos';
import { ILLUSTRATED_IDS, ItemIllustration } from '../../item-illustrations';

/**
 * Imagem do item numa moldura única (3:2, cantos chanfrados), para a lista não parecer misturada:
 * foto tratada da art-kit (ItemArt) quando existe; senão a ilustração SVG da menu-motion; senão o ícone do kit.
 * `sm` = miniatura 72×48 das linhas; `lg` = topo do modal de item (ocupa a largura).
 */
export function ItemPic({ id, size = 'sm', accent = 'warm' }: { id: string; size?: 'sm' | 'lg'; accent?: 'warm' | 'signal' | 'cold' }) {
  const lg = size === 'lg';
  return (
    <span className={`ipic ipic--${size}`}>
      {ITEM_PHOTOS.has(id) ? (
        <ItemArt id={id} size={lg ? 480 : 96} tag={false} style={{ width: '100%', height: '100%', clipPath: 'none', boxShadow: 'none' }} />
      ) : ILLUSTRATED_IDS.includes(id) ? (
        <ItemIllustration id={id} size={size} alt="" />
      ) : (
        <GameIcon id={id} size={lg ? 112 : 28} accent={accent} />
      )}
    </span>
  );
}
