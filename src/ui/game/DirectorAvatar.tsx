import { User } from 'lucide-react';
import type { OriginId } from '../../game/types';
import { DirectorSprite } from '../map-sprites';

/**
 * Diretor no HUD: o sprite isométrico da Origem (pixel art), recortado no círculo em cabeça e ombros.
 * Saves antigos (Origem 'none') ficam com o ícone genérico.
 */
export function DirectorAvatar({ origin, size = 40, title }: { origin: OriginId | undefined; size?: number; title?: string }) {
  if (!origin || origin === 'none')
    return (
      <span className="dir-avatar generic" style={{ width: size, height: size }} aria-hidden>
        <User size={Math.round(size * 0.55)} />
      </span>
    );
  // O quadro do atlas tem 84×61 com os pés em (46, 48); o centro do círculo fica na altura do peito.
  const scale = size >= 48 ? 2 : 1;
  return (
    <span className="dir-avatar dir-avatar--sprite" style={{ width: size, height: size }} role={title ? 'img' : undefined} aria-label={title}>
      <span className="dir-avatar__sprite" style={{ left: size / 2 - 46 * scale, top: size / 2 - 24 * scale }}>
        <DirectorSprite origin={origin} scale={scale} />
      </span>
    </span>
  );
}
