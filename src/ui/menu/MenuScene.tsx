// Fundo do Título: a cena de pixel art da art-kit (rua na chuva, neon, agente e carro), em escala inteira cobrindo
// a tela, na orientação certa. Anima os 12 quadros (8 fps) trocando a posição do fundo de um único elemento;
// com reduzir movimento fica o quadro parado. Aparece quando a abertura termina (o livro-caixa fica por baixo).
import { useEffect, useRef, useState } from 'react';
import { sceneFrameRect, sceneUrl, useMenuScene } from '../../art/sprites';

const usePortrait = () => {
  const get = () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
  const [p, setP] = useState(get);
  useEffect(() => {
    const on = () => setP(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return p;
};

export function MenuScene({ active, reduced }: { active: boolean; reduced: boolean }) {
  const portrait = usePortrait();
  const m = useMenuScene(portrait ? 'portrait' : 'landscape');
  const el = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Menor escala inteira que cobre a tela (o excesso é cortado: à direita deitado, nas bordas em pé).
  const scale = m && size.w ? Math.max(1, Math.ceil(Math.max(size.w / m.frameWidth, size.h / m.frameHeight))) : 1;

  // Quadros: um timer a `fps` move o fundo (sem React por quadro); parado com reduzir movimento ou fora do Título.
  useEffect(() => {
    const node = el.current;
    if (!m || !node || reduced || !active) return;
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % m.frames;
      const r = sceneFrameRect(m, i);
      node.style.backgroundPosition = `${-r.x * scale}px ${-r.y * scale}px`;
    }, 1000 / m.fps);
    return () => clearInterval(timer);
  }, [m, reduced, active, scale]);

  if (!m) return null;
  const animated = !reduced;
  const w = m.frameWidth * scale;
  const h = m.frameHeight * scale;
  return (
    <div className={`slm-scene${active ? ' is-on' : ''}`} aria-hidden="true">
      <div
        ref={el}
        className="slm-scene__img"
        style={{
          width: w,
          height: h,
          // Deitado, a cena encosta à esquerda: os ~40% escurecidos ficam sob o menu; em pé, centrada.
          left: portrait ? '50%' : 0,
          marginLeft: portrait ? -w / 2 : 0,
          marginTop: -h / 2,
          backgroundImage: `url(${sceneUrl(m, animated ? m.image : m.static)})`,
          backgroundSize: animated ? `${m.columns * w}px ${m.rows * h}px` : `${w}px ${h}px`,
          backgroundPosition: '0 0',
        }}
      />
    </div>
  );
}
