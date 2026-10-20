"""Build the 4 combat backgrounds: static PNG, ambient atlas + manifest, front-props layer (+ previews).
usage: python -I tools/sprites/scenes/arenas.py [urbano militar juridico aereo]   (tools/sprites/build.py runs it)
Writes public/sprites/arenas/<name>/{<name>.png, <name>-anim.png, <name>-front.png, <name>.json}."""
import importlib, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

ALL = ['urbano', 'militar', 'juridico', 'aereo']
b = ARENA_BOUNDS
AIM = dict(rh=(5, 0, 12), lh=(4, -1, 11), gun='hand')
CROSS = dict(rh=(2, 0, 9), lh=(2, -1, 9), gun='holster')


def build(name):
    t0 = time.time()
    M = importlib.import_module(name)
    d = os.path.join(OUT, 'arenas', name); os.makedirs(d, exist_ok=True)
    env = M.env()
    fr_vox = M.front()
    fxf = getattr(M, 'anim_fx', lambda t: [])
    mir = getattr(M, 'MIRROR', None)
    frames = [render_fx(env + M.anim(t), fxf(t), b, M.look(t), alpha=getattr(M, 'FX_ALPHA', 0.6),
                        extra_casters=fr_vox, mirror=mir, ripple=2 * math.pi * t / M.NFRAMES) for t in range(M.NFRAMES)]
    if hasattr(M, 'post'):
        frames = [M.post(f, t, b) for t, f in enumerate(frames)]
    frames[0].save(os.path.join(d, f'{name}.png'), optimize=True)
    front = render(fr_vox, b, M.look(0))
    front.save(os.path.join(d, f'{name}-front.png'), optimize=True)
    at, cols, rows = atlas(frames)
    size = save_palette_png(at, os.path.join(d, f'{name}-anim.png'))
    gx, gy = scr(b, X0, Y0)
    man = {
        'kind': 'arena', 'id': name,
        'name': name, 'image': f'{name}-anim.png', 'static': f'{name}.png', 'front': f'{name}-front.png',
        'frameWidth': b['W'], 'frameHeight': b['H'], 'frames': M.NFRAMES, 'fps': M.FPS, 'columns': cols, 'rows': rows,
        'gridOrigin': {'x': gx, 'y': gy}, 'cellW': 2 * CELL, 'cellH': CELL,
        'colStep': {'x': 2 * CELL, 'y': CELL}, 'rowStep': {'x': -2 * CELL, 'y': CELL},
        'grid': {'cols': COLS, 'rows': ROWS, 'cellVoxels': CELL, 'playerCols': [0, 1, 2], 'enemyCols': [5, 6, 7]},
        'note': 'Pixel-edge coords at 1x. Corner of cell (c,r) = gridOrigin + c*colStep + r*rowStep; '
                'cell centre = corner + 0.5*(colStep+rowStep). Character sprites (rig.py, 128x100) put world origin at '
                'pixel edge (64,70): draw them at centre - (64,70).',
    }
    with open(os.path.join(d, f'{name}.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(man, fh, indent=2)
    print(f'{name}: {b["W"]}x{b["H"]} frames={M.NFRAMES} atlas={size // 1024}KB grid0=({gx},{gy}) {time.time() - t0:.1f}s')
    return M, frames, front


def preview(M, frames, front, t=0):
    W, H = b['W'], b['H']
    c = Image.new('RGBA', (W, H), M.BG + (255,))
    c.alpha_composite(frames[t])
    c.alpha_composite(grid_overlay((W, H), b))
    pl = [(0, 0, CROSS), (1, 1, AIM), (2, 2, AIM), (2, 0, AIM), (0, 2, CROSS)]
    en = [(5, 0, AIM), (6, 1, AIM), (5, 2, AIM), (7, 2, CROSS), (7, 0, AIM)]
    sp = sorted([(c_, r, p, 1) for c_, r, p in pl] + [(c_, r, p, -1) for c_, r, p in en], key=lambda k: k[0] + k[1])
    for col, row, pose, face in sp:
        place_figure(c, figure_sprite(pose, face, THUG if face < 0 else None), b, col, row)
    c.alpha_composite(front)
    return c


if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if a in ALL] or ALL
    tiles = []
    for n in names:
        M, frames, front = build(n)
        if not PREVIEW:
            continue
        os.makedirs(PREV, exist_ok=True)
        p = preview(M, frames, front)
        p.resize((p.width * 2, p.height * 2), Image.NEAREST).save(os.path.join(PREV, f'{n}-preview.png'))
        tiles.append((n, p))
    if len(tiles) == 4:
        W, H = tiles[0][1].size
        S = 2; lab = 26
        sheet = Image.new('RGB', (W * S * 2, (H * S + lab) * 2), (8, 9, 12))
        f = ImageFont.truetype(FONT, 18); d = ImageDraw.Draw(sheet)
        for i, (n, p) in enumerate(tiles):
            x, y = (i % 2) * W * S, (i // 2) * (H * S + lab)
            sheet.paste(p.resize((W * S, H * S), Image.NEAREST).convert('RGB'), (x, y + lab))
            d.text((x + 10, y + 4), f'{n.upper()} · 3x8 · azul=jogador 0-2 · vermelho=inimigo 5-7', font=f, fill=(240, 180, 60))
        sheet.save(os.path.join(PREV, 'preview-arenas.png'))
        print('preview-arenas.png', sheet.size)
