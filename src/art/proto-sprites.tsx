import { useEffect, useState } from 'react';
import { PixelIcon, Sprite, SpriteStill, SPRITE_SETS, STATION_SPRITE_IDS, loadSpriteAtlas, useSpriteIcons, type SpriteAtlas } from './sprites';

// Revisão dos sprites isométricos: ?solo=sprites[&set=urban|icons][&scale=3][&mirror=1]
export function SpritesDemo({ only, scale = 2 }: { only?: string; scale?: number }) {
  if (only === 'icons') return <IconsRow />;
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
