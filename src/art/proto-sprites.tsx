import { useEffect, useState } from 'react';
import { PixelIcon, Sprite, SpriteStill, SPRITE_SETS, STATION_SPRITE_IDS, arenaCellCenter, loadSpriteAtlas, sceneFrameRect, sceneUrl, useArena, useMenuScene, useSpriteIcons, type ArenaId, type SpriteAtlas } from './sprites';

// Revisão dos sprites isométricos: ?solo=sprites[&set=urban|icons|arena:<id>|menu:<portrait|landscape>][&scale=3][&mirror=1]
export function SpritesDemo({ only, scale = 2 }: { only?: string; scale?: number }) {
  if (only === 'icons') return <IconsRow />;
  if (only?.startsWith('arena:')) return <ArenaDemo id={only.slice(6) as ArenaId} scale={scale} />;
  if (only?.startsWith('menu:')) return <MenuDemo o={only.slice(5) as 'portrait' | 'landscape'} scale={scale} />;
  const sets = only ? [only] : [...SPRITE_SETS];
  const [mirror, setMirror] = useState(() => new URLSearchParams(location.search).has('mirror'));
  return (
    <div style={{ background: '#0b0e12', color: '#d6dee8', minHeight: '100vh', padding: 16, font: '12px/1.4 var(--g-font-mono, monospace)' }}>
      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> espelhar
      </label>
      {sets.map((id) => (
        <SetRow key={id} id={id} scale={scale} mirror={mirror} />
      ))}
      {!only && (
        <section>
          <h3 style={{ color: '#f2a93b' }}>stations (avulsos) · interiors</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            {STATION_SPRITE_IDS.map((s) =>
              ['normal', 'damaged', 'interdicted'].map((st) => <SpriteStill key={s + st} group="stations" id={s} state={st} scale={1} alt={`${s} ${st}`} />),
            )}
            {STATION_SPRITE_IDS.map((s) => (
              <SpriteStill key={s} group="interiors" id={s} scale={1} alt={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SetRow({ id, scale, mirror }: { id: string; scale: number; mirror: boolean }) {
  const [atlas, setAtlas] = useState<SpriteAtlas>();
  useEffect(() => {
    loadSpriteAtlas(id).then(setAtlas, () => undefined);
  }, [id]);
  if (!atlas) return null;
  return (
    <section style={{ marginBottom: 18 }}>
      <h3 style={{ color: '#f2a93b', margin: '0 0 6px' }}>
        {id} · {atlas.frameWidth}×{atlas.frameHeight}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {atlas.animations.map((a) => (
          <figure key={a.name} style={{ margin: 0, background: '#1a1f27', padding: 4, position: 'relative' }}>
            <div style={{ position: 'relative', width: atlas.frameWidth * scale, height: atlas.frameHeight * scale }}>
              <span style={{ position: 'absolute', left: atlas.anchor.x * scale, top: atlas.anchor.y * scale }}>
                <Sprite set={id} anim={a.name} playing mirror={mirror} scale={scale} anchored />
              </span>
            </div>
            <figcaption style={{ textAlign: 'center' }}>
              {a.name} · {a.frames}f {a.fps}fps{a.loop ? '' : ' ▸|'}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function IconsRow() {
  const sheet = useSpriteIcons(64);
  return (
    <div style={{ background: '#0b0e12', color: '#d6dee8', minHeight: '100vh', padding: 16, font: '12px/1.4 var(--g-font-mono, monospace)' }}>
      {[64, 32].map((size) => (
        <div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {sheet?.icons.map((i) => (
            <figure key={i.id} style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: 2, background: '#1a1f27', padding: 4 }}>
              <PixelIcon id={i.id} size={size} alt={i.label} />
              <figcaption>{i.id}</figcaption>
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Fundo de combate com a grade e Unidades nas células (jogador de frente, inimigo de costas espelhado). */
function ArenaDemo({ id, scale }: { id: ArenaId; scale: number }) {
  const m = useArena(id);
  if (!m) return null;
  const cells: [number, number, boolean][] = [[0, 0, true], [1, 1, true], [2, 2, true], [5, 0, false], [6, 1, false], [7, 2, false]];
  const r = sceneFrameRect(m, 0);
  return (
    <div style={{ background: '#0b0e12', minHeight: '100vh', padding: 8 }}>
      <div style={{ position: 'relative', width: m.frameWidth * scale, height: m.frameHeight * scale, imageRendering: 'pixelated',
        backgroundImage: `url(${sceneUrl(m, m.image)})`, backgroundSize: `${m.columns * m.frameWidth * scale}px auto`,
        backgroundPosition: `${-r.x * scale}px ${-r.y * scale}px` }}>
        {cells
          .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
          .map(([c, row, mine]) => {
            const p = arenaCellCenter(m, c, row);
            return (
              <span key={`${c}-${row}`} style={{ position: 'absolute', left: p.x * scale, top: (p.y + 1) * scale }}>
                <Sprite set={mine ? 'urban' : 'criminal-back'} anim="idle" mirror={!mine} scale={scale} anchored />
              </span>
            );
          })}
        <img src={sceneUrl(m, m.front)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', imageRendering: 'pixelated' }} />
      </div>
    </div>
  );
}

function MenuDemo({ o, scale }: { o: 'portrait' | 'landscape'; scale: number }) {
  const m = useMenuScene(o);
  if (!m) return null;
  return <img src={sceneUrl(m, m.static)} alt="" width={m.frameWidth * scale} height={m.frameHeight * scale} style={{ imageRendering: 'pixelated', display: 'block' }} />;
}
