import { User } from 'lucide-react';
import { DirectorPortrait } from '../../art/directors';
import type { OriginId } from '../../game/types';
import { artOrigin } from '../menu';

/** Retrato da Origem do Diretor; saves antigos (origem 'none') ficam com o ícone genérico. */
export function DirectorAvatar({ origin, size = 40, title }: { origin: OriginId | undefined; size?: number; title?: string }) {
  const art = artOrigin(origin);
  if (!art)
    return (
      <span className="dir-avatar generic" style={{ width: size, height: size }} aria-hidden>
        <User size={Math.round(size * 0.55)} />
      </span>
    );
  return (
    <span className="dir-avatar" style={{ width: size, height: size }}>
      <DirectorPortrait origin={art} size={size} crop="head" blink={false} title={title} />
    </span>
  );
}
