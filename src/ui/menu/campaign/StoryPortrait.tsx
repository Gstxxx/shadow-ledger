import { Sprite } from '../../../art/sprites';
import { useSettings } from '../../../store/settings';

/** Personagens da história com retrato (atlas portraits-story-64/128 da art-kit). */
export type StoryCharacter = 'analyst' | 'arrieta' | 'moravia_boss' | 'moravia_enforcer';

/** Quem entrega a pista do Dossiê de cada Capítulo (fala no Debriefing). */
export const CLUE_SPEAKER: Record<number, StoryCharacter> = {
  1: 'analyst',
  2: 'analyst',
  3: 'analyst',
  4: 'moravia_enforcer',
  5: 'analyst',
  6: 'moravia_enforcer',
  7: 'analyst',
  8: 'arrieta',
  9: 'arrieta',
  10: 'moravia_boss',
};

/** Busto em pixel art que respira e pisca; parado com reduzir movimento (sistema ou Configurações). */
export function StoryPortrait({ who, size = 64, className }: { who: StoryCharacter; size?: 64 | 128; className?: string }) {
  const still = useSettings((st) => st.reducedMotion);
  return (
    <span className={`cmp-portrait cmp-portrait--${size}${className ? ` ${className}` : ''}`} aria-hidden="true">
      <Sprite set={`portraits-story-${size}`} anim={`${who}_idle`} playing={!still} scale={1} />
    </span>
  );
}
