// Efeitos do mapa com o atlas vfx-extra (art-kit): pilar dourado quando uma Estação sobe de Nível, chuva e
// neblina sobre países em guerra ou desordem, e sinalizador de fumaça vermelha onde há Contrato de Combate aberto.
// Barato: poucos sprites, quadros por CSS steps() dentro de um <svg> recortado (sem JS por quadro, sem canvas),
// pointer-events: none (nunca bloqueia toque). Com reduzir movimento (sistema ou Configurações), nada aparece.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GameState } from '../../game/types';
import { player } from '../../game/state';
import { useSettings } from '../../store/settings';
import { spriteUrl, useSpriteAtlas, type SpriteAtlas } from '../../art/sprites';
import './sprites.css';

type VfxName = 'level_up' | 'rain' | 'fog' | 'flare';

/** Um quadro de animação do atlas no SVG, com a âncora em (x, y) e largura `w` em unidades do mapa. */
function AnimSprite({ atlas: ATLAS, name, x, y, w, once, slow = 1, opacity = 1 }: { atlas: SpriteAtlas; name: VfxName; x: number; y: number; w: number; once?: boolean; slow?: number; opacity?: number }) {
  const a = ATLAS.animations.find((an) => an.name === name);
  if (!a) return null;
  const { frameWidth: fw, frameHeight: fh } = ATLAS;
  const k = w / fw;
  const style = {
    '--msp-steps': a.frames,
    '--msp-shift': `${-a.frames * fw}px`,
    '--msp-dur': `${(a.frames / a.fps) * slow}s`,
    '--msp-iter': once ? 1 : 'infinite',
  } as CSSProperties;
  return (
    <svg x={x - ATLAS.anchor.x * k} y={y - ATLAS.anchor.y * k} width={fw * k} height={fh * k} viewBox={`0 0 ${fw} ${fh}`} overflow="hidden" opacity={opacity} className="msp-vfx" aria-hidden="true">
      <image href={spriteUrl(ATLAS.image)} x={0} y={-a.row * fh} width={ATLAS.width} height={ATLAS.height} className="msp-img msp-vfx-strip" style={style} preserveAspectRatio="none" />
    </svg>
  );
}

const reducedSystem = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Quanto dura o pilar de Nível (6 quadros a 10 fps, em câmera lenta para ser visto). */
const LEVEL_UP_MS = 1200;
/** Teto de nuvens de clima na tela, para não poluir nem pesar. */
const MAX_WEATHER = 6;

export function MapVfx({ s, inv, project }: { s: GameState; inv: number; project: (lon: number, lat: number) => [number, number] }) {
  const reducedSetting = useSettings((st) => st.reducedMotion);
  const reduced = reducedSetting || reducedSystem();
  const a = player(s);

  // Nível subiu: compara com o último Nível visto de cada Estação.
  const levels = useRef<Map<string, number> | null>(null);
  // ?vfx=levelup (ou flare) — pilar em todas as Estações a cada 3 s (para conferir o efeito sem jogar).
  const [pillars, setPillars] = useState<{ id: string; countryId: string }[]>([]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get('vfx') !== 'levelup') return;
    const tick = () => setPillars(player(s).stations.map((st) => ({ id: `dbg-${st.countryId}-${Date.now()}`, countryId: st.countryId })));
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const now = new Map(a.stations.map((st) => [st.countryId, st.level as number]));
    const prev = levels.current;
    levels.current = now;
    if (!prev || reduced) return;
    const up = a.stations.filter((st) => (prev.get(st.countryId) ?? st.level) < st.level);
    if (!up.length) return;
    const born = up.map((st) => ({ id: `${st.countryId}-${st.level}-${Date.now()}`, countryId: st.countryId }));
    setPillars((p) => [...p, ...born]);
    // O pilar toca uma vez e sai; o timer não é cancelado por novos renders (o mapa redesenha a cada 6 h de jogo).
    setTimeout(() => {
      if (alive.current) setPillars((p) => p.filter((x) => !born.includes(x)));
    }, LEVEL_UP_MS + 100);
  });
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const atlas = useSpriteAtlas('vfx-extra');
  if (reduced || !atlas) return null;

  const at = (countryId: string) => {
    const c = s.countries[countryId];
    return c ? project(c.lon, c.lat) : null;
  };

  // Clima: chuva em guerra e guerra civil, neblina em desordem (poucos países, ordem estável).
  const weather = Object.values(s.countries)
    .filter((c) => c.politics === 'war' || c.politics === 'civilwar' || c.politics === 'disorder')
    .sort((x, y) => (x.id < y.id ? -1 : 1))
    .slice(0, MAX_WEATHER);

  // Sinalizador: Contratos de Combate abertos (oferecidos ou aceitos pelo jogador), que não têm marcador próprio.
  const flares = (s.combatContracts ?? []).filter((c) => c.status === 'offered' || (c.status === 'accepted' && c.agencyId === a.id));
  // ?vfx=flare acende um sinalizador em cada Estação (para conferir o efeito sem esperar um Contrato).
  const dbgFlare = new URLSearchParams(location.search).get('vfx') === 'flare' ? a.stations.map((st) => st.countryId) : [];
  const flareAt = [...new Set([...flares.map((c) => c.countryId), ...dbgFlare])];

  return (
    <g className="msp-vfx-layer" pointerEvents="none">
      {weather.map((c) => {
        const p = project(c.lon, c.lat);
        return <AnimSprite atlas={atlas} key={`w-${c.id}`} name={c.politics === 'disorder' ? 'fog' : 'rain'} x={p[0]} y={p[1] + 10 * inv} w={46 * inv} opacity={0.42} slow={1.6} />;
      })}
      {flareAt.map((id) => {
        const p = at(id);
        return p ? <AnimSprite atlas={atlas} key={`f-${id}`} name="flare" x={p[0] - 12 * inv} y={p[1] - 2 * inv} w={34 * inv} opacity={0.9} /> : null;
      })}
      {pillars.map((pl) => {
        const p = at(pl.countryId);
        return p ? <AnimSprite atlas={atlas} key={pl.id} name="level_up" x={p[0]} y={p[1] - 6 * inv} w={70 * inv} once slow={2} /> : null;
      })}
    </g>
  );
}
