import { memo } from 'react';
import { UnitPortrait } from '../../art/UnitPortrait';
import type { Unit } from '../../game/types';

/**
 * Retrato da Unidade (art-kit): busto da figura da função para o Pessoal, estável por seed;
 * ilustração do item para as máquinas. Mantém a classe `portrait` para o CSS das telas de jogo.
 */
export const Portrait = memo(function Portrait({
  unit,
  size = 36,
  hostile,
  look,
}: {
  unit: Unit;
  size?: number;
  hostile?: boolean;
  /** 'sprite' = quadro parado do sprite de voxel (Reserva do Combate, igual ao tabuleiro) */
  look?: 'auto' | 'sprite' | 'illustration';
}) {
  return (
    <UnitPortrait
      itemId={unit.itemId}
      seed={unit.seed}
      name={unit.name}
      size={size}
      hostile={hostile}
      hurt={!!unit.injury}
      look={look}
      className={`portrait${hostile ? ' hostile' : ''}${unit.injury ? ' hurt' : ''}`}
    />
  );
});
