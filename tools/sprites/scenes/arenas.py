"""Build the 4 combat backgrounds: static PNG, ambient atlas + manifest, front-props layer, separate prop sprites
(+ previews).
usage: python -I tools/sprites/scenes/arenas.py [urbano militar juridico aereo]   (tools/sprites/build.py runs it)
Writes public/sprites/arenas/<name>/{<name>.png, <name>-anim.png, <name>-front.png, <name>.json, props/<id>.png}.

Props: every free-standing object on the floor (a connected voxel group that does not touch the walls) that could
overlap a unit standing behind it is cut out of the background and exported as its own sprite, with a depth key in
the same units as the grid (a unit on cell (c, r) has depth c + r). The game draws props and units sorted by depth,
so a unit behind a crate is hidden by it. The whole grid (all 8 columns) must hold no props, only flat floor detail
(decals, stains, markings, puddles, low scrub): the build fails if one does. Props live outside the grid."""
import importlib, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

ALL = ['urbano', 'militar', 'juridico', 'aereo']
b = ARENA_BOUNDS
AIM = dict(rh=(5, 0, 12), lh=(4, -1, 11), gun='hand')
CROSS = dict(rh=(2, 0, 9), lh=(2, -1, 9), gun='holster')


FLAT = 1                     # a group no taller than z = FLAT counts as floor detail (decal, debris, pallet)
PEBBLE = (40, 3)             # ... and so does a small low group (scrub, stones): at most 40 voxels, z <= 3
UNIT_BOX = (-12, -46, 12, 3)  # screen box of a standing unit around its feet (1x), for the overlap test


def depth_of(x, y):
    """Grid depth of a world floor point: a unit on cell (c, r) stands at depth c + r."""
    return (x - X0) / CELL - 0.5 + (y - Y0) / CELL - 0.5


def groups(vox):
    """Free-standing groups: 6-connected voxels at z >= 0 that never touch a wall (x < 0 or y < 0)."""
    cells = {}
    for x, y, z, c in vox:
        if c:
            cells[(x, y, z)] = c
    solid = {k for k in cells if k[2] >= 0}
    seen, out = set(), []
    for start in solid:
        if start in seen:
            continue
        comp, stack, wall = [], [start], False
        seen.add(start)
        while stack:
            x, y, z = stack.pop()
            comp.append((x, y, z))
            if x < 0 or y < 0:
                wall = True
            for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
                n = (x + d[0], y + d[1], z + d[2])
                if n in solid and n not in seen:
                    seen.add(n); stack.append(n)
        if not wall:
            out.append([(x, y, z, cells[(x, y, z)]) for x, y, z in comp])
    return out


def split_props(name, env):
    """-> (base voxels, [prop dict]) and raises if a non-flat group stands in a deploy cell."""
    props, taken, bad = [], set(), []
    cells = [(c, r) for c in range(COLS) for r in range(ROWS)]
    for g in groups(env):
        zt = max(v[2] for v in g)
        if zt <= FLAT or (len(g) <= PEBBLE[0] and zt <= PEBBLE[1]):
            continue
        xs = [v[0] for v in g]; ys = [v[1] for v in g]
        foot = {((x - X0) // CELL, (y - Y0) // CELL) for x, y, z, c in g if z <= 1}
        deploy = sorted(f for f in foot if 0 <= f[0] < COLS and 0 <= f[1] < ROWS)
        if deploy:
            bad.append((min(xs), max(xs), min(ys), max(ys), deploy))
            continue
        cx, cy = (min(xs) + max(xs) + 1) / 2, (min(ys) + max(ys) + 1) / 2
        dp = depth_of(cx, cy)
        # screen box of the group (each voxel covers 4 px wide, 4 tall from its top-face corner)
        sxs = [2 * (x - y) - b['minx'] - 2 for x, y, z, c in g]; sys_ = [(x + y) - 2 * z - b['miny'] - 2 for x, y, z, c in g]
        box_ = (min(sxs) - 1, min(sys_) - 1, max(sxs) + 5, max(sys_) + 5)
        # anything standing on the grid footprint is always separate (units walk between cells);
        # outside it, only what a unit standing behind could overlap on screen
        hit = any(0 <= f[0] < COLS and 0 <= f[1] < ROWS for f in foot)
        for c, r in ([] if hit else cells):
            ux, uy = scr(b, *cell_center(c, r))
            if c + r < dp and ux + UNIT_BOX[0] < box_[2] and ux + UNIT_BOX[2] > box_[0] and uy + UNIT_BOX[1] < box_[3] and uy + UNIT_BOX[3] > box_[1]:
                hit = True
                break
        if hit:
            props.append(dict(vox=g, cx=cx, cy=cy, depth=dp))
            taken.update((x, y, z) for x, y, z, c in g)
    if bad:
        for x0_, x1_, y0_, y1_, cs in bad:
            print(f'  {name}: prop on grid cells {cs}: x {x0_}..{x1_}, y {y0_}..{y1_}')
        raise SystemExit(f'{name}: {len(bad)} prop group(s) on the combat grid: only flat floor detail is allowed there')
    base = [v for v in env if (v[0], v[1], v[2]) not in taken]
    props.sort(key=lambda p: p['depth'])
    return base, props


def build(name):
    t0 = time.time()
    M = importlib.import_module(name)
    d = os.path.join(OUT, 'arenas', name); os.makedirs(d, exist_ok=True)
    env, props = split_props(name, M.env())
    prop_vox = [v for p in props for v in p['vox']]
    fr_vox = M.front()
    fxf = getattr(M, 'anim_fx', lambda t: [])
    mir = getattr(M, 'MIRROR', None)
    frames = [render_fx(env + M.anim(t), fxf(t), b, M.look(t), alpha=getattr(M, 'FX_ALPHA', 0.6),
                        extra_casters=fr_vox + prop_vox, mirror=mir, ripple=2 * math.pi * t / M.NFRAMES)
              for t in range(M.NFRAMES)]
    if hasattr(M, 'post'):
        frames = [M.post(f, t, b) for t, f in enumerate(frames)]
    frames[0].save(os.path.join(d, f'{name}.png'), optimize=True)
    front = render(fr_vox, b, M.look(0))
    front.save(os.path.join(d, f'{name}-front.png'), optimize=True)
    # separate prop sprites, lit like frame 0 (their ground shadows stay baked in the background)
    pd = os.path.join(d, 'props')
    if os.path.isdir(pd):
        for f_ in os.listdir(pd):
            os.remove(os.path.join(pd, f_))
    os.makedirs(pd, exist_ok=True)
    plist, pimgs = [], []
    for i, p in enumerate(props):
        im = render(p['vox'], b, M.look(0))
        bb = im.getbbox()
        im = im.crop(bb)
        pid = f'p{i:02d}'
        im.save(os.path.join(pd, pid + '.png'), optimize=True)
        gx_, gy_ = scr(b, p['cx'], p['cy'])
        col = int((p['cx'] - X0) // CELL); row = int((p['cy'] - Y0) // CELL)
        plist.append({'id': pid, 'image': f'props/{pid}.png', 'x': bb[0], 'y': bb[1], 'width': im.width, 'height': im.height,
                      'anchor': {'x': round(gx_, 1), 'y': round(gy_, 1)}, 'col': col, 'row': row, 'depth': round(p['depth'], 3)})
        pimgs.append((im, bb[0], bb[1], p['depth']))
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
        'props': plist,
        'note': 'Pixel-edge coords at 1x. Corner of cell (c,r) = gridOrigin + c*colStep + r*rowStep; '
                'cell centre = corner + 0.5*(colStep+rowStep). Character sprites (rig.py, 128x100) put world origin at '
                'pixel edge (64,70): draw them at centre - (64,70). Props: draw image at (x, y) on the 1x background; '
                'sort props and units together by depth (unit on cell (c,r) = c + r; draw lower depth first), then front.',
    }
    with open(os.path.join(d, f'{name}.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(man, fh, indent=2)
    print(f'{name}: {b["W"]}x{b["H"]} frames={M.NFRAMES} atlas={size // 1024}KB grid0=({gx},{gy}) props={len(plist)} {time.time() - t0:.1f}s')
    return M, frames, front, pimgs


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
        M, frames, front, pimgs = build(n)
        if not PREVIEW:
            continue
        os.makedirs(PREV, exist_ok=True)
        p = scale_preview(frames[0], front, b, M.BG, props=pimgs)
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
