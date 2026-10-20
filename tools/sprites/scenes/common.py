"""Shared voxel renderer + arena geometry for Shadow Ledger environment backgrounds.

Same projection as tools/sprites/rig.py and levels.py: 2:1 iso, 4px voxels (top face 2 rows, side 2 rows),
per-face light, dark silhouette outline, emissive glow. Adds: per-scene ambient per face, point lights
(with optional cone), projected ground shadows, reflective ground.

World: x grows toward screen down-right, y toward screen down-left, z up. Floor top surface is z=0
(floor voxels live at z=-1). A world corner (X, Y, Z) maps to the screen pixel edge
    sx = 2*(X - Y) - minx,   sy = (X + Y) - 2*Z - miny
"""
import json, math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(HERE)                                          # tools/sprites
sys.path.insert(0, R)
import rig  # noqa: E402  (urban bodyguard body is rig's default upper)

OUT = os.path.normpath(os.path.join(R, '..', '..', 'public', 'sprites'))   # arenas/<name>/ and menu/
PREV = os.path.join(R, 'preview.local', 'scenes')                  # previews (git-ignored), only with SPRITES_PREVIEW=1
PREVIEW = bool(os.environ.get('SPRITES_PREVIEW'))
os.makedirs(OUT, exist_ok=True)
FONT = 'C:/Windows/Fonts/consolab.ttf'

# ------------------------------------------------------------------ arena geometry (shared by all 4 arenas)
# Scale: 10 voxels = 1 m, same as the character rig (a person is ~18 voxels tall). A combat cell is 28 voxels
# (~2.8 m) so a person stands in it with room; doors ~22 tall, storeys ~24, cars ~45 long, waist ~9-10.
M = 10                              # voxels per metre
CELL, COLS, ROWS = 28, 8, 3
X0, Y0 = 16, 26                     # grid corner (0,0) in voxels; strip behind the grid holds wall props
FM = 10                             # floor margin in front of the grid (then the dollhouse cut)
LX, LY = X0 + CELL * COLS + FM, Y0 + CELL * ROWS + FM     # floor extent: x in [0,LX), y in [0,LY)
ZMAX, ZMIN = 84, -6
SLAB = 4                            # visible floor-slab thickness at the open front edges


def make_bounds(x0, x1, y0, y1, z0, z1, pad=4):
    pts = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    sxs = [2 * (x - y) for x, y, z in pts]; sys_ = [x + y - 2 * z for x, y, z in pts]
    minx, maxx = min(sxs) - pad, max(sxs) + pad
    miny, maxy = min(sys_) - pad, max(sys_) + pad
    return dict(minx=minx, miny=miny, W=maxx - minx, H=maxy - miny)


ARENA_BOUNDS = make_bounds(-3, LX + 1, -3, LY + 1, ZMIN, ZMAX, pad=6)


def scr(b, X, Y, Z=0):
    return 2 * (X - Y) - b['minx'], (X + Y) - 2 * Z - b['miny']


def cell_center(col, row):
    return X0 + col * CELL + CELL / 2, Y0 + row * CELL + CELL / 2


def in_grid(x, y):
    return X0 <= x < X0 + CELL * COLS and Y0 <= y < Y0 + CELL * ROWS


# ------------------------------------------------------------------ palette
PAL = dict(rig.C)
PAL.update({
    'asf': (50, 52, 58), 'asf2': (44, 46, 52), 'asf3': (58, 60, 66), 'crack': (30, 31, 35), 'puddle': (40, 54, 78),
    'stripe': (190, 170, 90), 'brk1': (128, 62, 48), 'brk2': (110, 54, 42), 'brk3': (142, 72, 54), 'mortar': (84, 70, 64),
    'conc': (120, 118, 112), 'conc2': (100, 98, 94), 'metal': (96, 102, 110), 'metal2': (70, 76, 84), 'rust': (130, 76, 44),
    'dump': (52, 90, 64), 'dump2': (40, 70, 50), 'bag': (26, 28, 30), 'bag2': (44, 46, 50),
    'wood': (140, 100, 60), 'wood2': (110, 78, 46), 'barrel': (60, 80, 110), 'barrel2': (46, 62, 88),
    'neonP': (255, 80, 200), 'neonB': (80, 220, 255), 'neonOff': (70, 40, 66), 'bulb': (255, 230, 150),
    'winD': (34, 42, 56), 'winL': (255, 214, 130), 'winL2': (230, 170, 100),
    'g1': (60, 190, 120), 'g2': (240, 200, 60), 'g3': (220, 70, 90), 'g4': (90, 120, 230),
    'wire': (24, 24, 26), 'steam': (196, 198, 206), 'steam2': (160, 162, 172), 'steam3': (128, 130, 142),
    'slab': (40, 40, 44), 'slab2': (30, 30, 34), 'tire': (28, 28, 30), 'hyd': (190, 50, 40), 'hyd2': (150, 36, 30),
    'lampP': (60, 64, 70), 'lamp': (255, 236, 180),
})
EMIS = {'neonP', 'neonB', 'bulb', 'winL', 'winL2', 'lamp', 'f1', 'f2', 'f3', 'brass', 'glint', 'hit', 'hit2'}
FX = {'steam', 'steam2', 'steam3'}       # translucent-ish: do not cast shadows
REFLECT = set()                          # ground keys that reflect point lights strongly


def box(x0, x1, y0, y1, z0, z1, c):
    return [(x, y, z, c) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) for z in range(z0, z1 + 1)]


def mv(vox, dx=0, dy=0, dz=0):
    return [(x + dx, y + dy, z + dz, c) for x, y, z, c in vox]


def recolor(vox, m):
    return [(x, y, z, m.get(c, c)) for x, y, z, c in vox]


def hsh(x, y, z=0, s=0):
    return ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791) ^ (s * 2654435761)) & 0xffffff


def line3(p0, p1, c):
    n = int(max(abs(p1[k] - p0[k]) for k in range(3))) + 1
    return [tuple(round(p0[k] + (p1[k] - p0[k]) * i / n) for k in range(3)) + (c,) for i in range(n + 1)]


def floor_slab(top_fn, x0=0, x1=None, y0=0, y1=None, slab='slab', slab2='slab2'):
    """Floor at z=-1 plus the visible slab cut on the two open front edges."""
    x1 = LX if x1 is None else x1; y1 = LY if y1 is None else y1
    v = [(x, y, -1, top_fn(x, y)) for x in range(x0, x1) for y in range(y0, y1)]
    for z in range(-1 - SLAB, -1):
        v += [(x1 - 1, y, z, slab if (y + z) % 5 else slab2) for y in range(y0, y1)]
        v += [(x, y1 - 1, z, slab if (x + z) % 5 else slab2) for x in range(x0, x1)]
    return v


# ------------------------------------------------------------------ lighting
class Light:
    def __init__(s, pos, col, inten=1.0, rad=30.0, cone=None):
        s.p, s.c, s.i, s.r, s.cone = pos, col, inten, rad, cone   # cone = (dir(x,y,z) normalized, cos_outer, cos_inner)


class Look:
    """Per-scene lighting. amb = ambient multiplier per face (top, left(+y), right(+x)), each (r,g,b)."""
    def __init__(s, amb, lights=(), shadow=(0.3, 0.2, 10), shadow_k=0.62, ao_k=0.78, glow=1.0, refl=1.6):
        s.amb, s.lights, s.shadow, s.shadow_k, s.ao_k, s.glow, s.refl = amb, list(lights), shadow, shadow_k, ao_k, glow, refl


def shadow_sets(vox, look, ground_z=-1):
    sdx, sdy, zcap = look.shadow
    sh, ao = set(), set()
    for x, y, z, c in vox:
        if z <= ground_z or c in FX or c in EMIS:
            continue
        zz = min(z + 1, zcap)
        if sdx or sdy:
            for k in range(0, zz + 1):
                sh.add((round(x + k * sdx), round(y + k * sdy)))
        if z == ground_z + 1:
            ao.update(((x + 1, y), (x, y + 1), (x - 1, y), (x, y - 1), (x, y)))
    return sh, ao


FACE_N = ((0, 0, 1), (0, 1, 0), (1, 0, 0))


def render(vox, b, look, extra_casters=(), outline=(14, 16, 20), mirror=None, ripple=0):
    """mirror: {key: strength 0..1} -> floor pixels of those keys get a planar reflection (see reflect())."""
    W, H, minx, miny = b['W'], b['H'], b['minx'], b['miny']
    cells = {}
    for x, y, z, c in vox:
        if c:
            cells[(x, y, z)] = c
    sh, ao = shadow_sets(list(cells_iter(cells)) + list(extra_casters), look)
    img = np.zeros((H, W, 4), np.float32)
    emi = np.zeros((H, W, 3), np.float32)
    mask = np.zeros((H, W), np.float32)
    mirror = mirror or {}
    lights = look.lights
    extra = getattr(look, 'extra', None)
    for (x, y, z), c in sorted(cells.items(), key=lambda kv: (kv[0][0] + kv[0][1] + kv[0][2], kv[0][2])):
        sx = (x - y) * 2 - minx - 2; sy = (x + y) - 2 * z - miny - 2
        if sx < -4 or sy < -4 or sx >= W or sy >= H:
            continue
        base = PAL[c] if isinstance(c, str) else c
        j = (hsh(x, y, z) >> 3) % 9 - 4
        e = c in EMIS
        if e:
            col = tuple(min(255, max(0, v + j)) for v in base)
            faces = (col, col, col)
        else:
            faces = []
            g = z == -1
            k = 1.0
            if g and (x, y) in sh:
                k *= look.shadow_k
            if g and (x, y) in ao:
                k *= look.ao_k
            for fi in range(3):
                am = look.amb[fi]
                lr = lg = lb = 0.0
                n = FACE_N[fi]
                for L in lights:
                    dx, dy, dz = L.p[0] - (x + .5), L.p[1] - (y + .5), L.p[2] - (z + .5)
                    d = math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-3
                    if d > L.r:
                        continue
                    f = L.i * (1 - d / L.r) ** 2
                    lam = (n[0] * dx + n[1] * dy + n[2] * dz) / d
                    f *= 0.25 + 0.75 * max(0.0, lam)
                    if L.cone:
                        D, co, ci = L.cone
                        cs = -(D[0] * dx + D[1] * dy + D[2] * dz) / d
                        if cs <= co:
                            continue
                        f *= min(1.0, (cs - co) / (ci - co))
                    if c in REFLECT:
                        f *= look.refl
                    lr += f * L.c[0]; lg += f * L.c[1]; lb += f * L.c[2]
                if extra:
                    ex = extra(x, y, z, fi)
                    if ex:
                        lr += ex[0]; lg += ex[1]; lb += ex[2]
                faces.append(tuple(int(max(0, min(255, base[i] * (am[i] * k + (lr, lg, lb)[i]) + j))) for i in range(3)))
        top, left, right = faces
        mk = mirror.get(c, 0.0) if z == -1 else 0.0
        for (fx, fy), col in (((1, 0), top), ((2, 0), top), ((0, 1), top), ((1, 1), top), ((2, 1), top), ((3, 1), top),
                              ((0, 2), left), ((1, 2), left), ((0, 3), left), ((1, 3), left),
                              ((2, 2), right), ((3, 2), right), ((2, 3), right), ((3, 3), right)):
            X, Y = sx + fx, sy + fy
            if 0 <= X < W and 0 <= Y < H:
                img[Y, X, 0:3] = col; img[Y, X, 3] = 255
                mask[Y, X] = mk if fy < 2 else 0.0
                if e:
                    emi[Y, X] = col
                else:
                    emi[Y, X] = 0
    out = finish(img, emi, look.glow, outline)
    if mirror:
        out = reflect(out, mask, b, ripple)
    return out


def reflect(im, mask, b, ripple=0.0, tint=(0.75, 0.82, 1.0)):
    """ripple = phase in radians (use 2*pi*t/N so loops are seamless)."""
    """Planar floor reflection: mirror each screen column about the base line of the back walls.
    Exact for the walls (x=0 / y=0 planes) in this orthographic projection; approximate for props."""
    a = np.asarray(im, np.float32).copy()
    H, W = mask.shape
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return im
    k = mask[ys, xs]
    xs2 = xs + (np.round(np.sin(ys * 0.9 + ripple) * 0.6)).astype(int)
    xs2 = np.clip(xs2, 0, W - 1)
    yb = np.abs(xs2 + b['minx']) / 2.0 - b['miny']
    ry = np.round(2 * yb - ys).astype(int)
    ok = (ry >= 0) & (ry < H)
    src = np.zeros((len(ys), 3), np.float32)
    src[ok] = a[ry[ok], xs2[ok], 0:3]
    src *= np.array(tint, np.float32)
    a[ys, xs, 0:3] = a[ys, xs, 0:3] * (1 - k[:, None]) + src * k[:, None]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')


def cells_iter(cells):
    for (x, y, z), c in cells.items():
        yield (x, y, z, c)


def finish(img, emi, glow, outline):
    a = Image.fromarray(img[:, :, 3].astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    a = np.asarray(a, np.float32)
    out = np.zeros_like(img)
    m = (a > 0) & (img[:, :, 3] == 0)
    out[m, 0:3] = outline; out[m, 3] = 255
    s = img[:, :, 3] > 0
    out[s] = img[s]
    if glow:
        e8 = Image.fromarray(emi.clip(0, 255).astype(np.uint8))
        g = (np.asarray(e8.filter(ImageFilter.GaussianBlur(2)), np.float32) * 0.55 +
             np.asarray(e8.filter(ImageFilter.GaussianBlur(6)), np.float32) * 0.45) * glow
        out = add_glow(out, g)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')


def add_glow(out, g):
    """Additive glow onto premultiplied-ish RGBA; transparent pixels receive glow as color + alpha."""
    a = out[:, :, 3:4] / 255.0
    rgb = out[:, :, 0:3] * a + g
    na = np.maximum(a[:, :, 0], np.clip(g.max(axis=2) / 255.0 * 1.4, 0, 1))
    res = np.zeros_like(out)
    nz = na > 0
    res[nz, 0:3] = rgb[nz] / na[nz, None]
    res[:, :, 3] = na * 255
    return res


# ------------------------------------------------------------------ outputs
def save_palette_png(im, path, colors=256):
    q = im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save(path, optimize=True)
    return os.path.getsize(path)


def atlas(frames, cols=None):
    n = len(frames); cols = cols or n
    w, h = frames[0].size
    rows = math.ceil(n / cols)
    at = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        at.paste(f, ((i % cols) * w, (i // cols) * h))
    return at, cols, rows


def grid_overlay(size, b, color=(255, 255, 255, 70), deploy=True):
    ov = Image.new('RGBA', size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for col in range(COLS):
        for row in range(ROWS):
            X, Y = X0 + col * CELL, Y0 + row * CELL
            pts = [scr(b, X, Y), scr(b, X + CELL, Y), scr(b, X + CELL, Y + CELL), scr(b, X, Y + CELL)]
            if deploy and col <= 2:
                d.polygon(pts, fill=(80, 170, 255, 34))
            elif deploy and col >= 5:
                d.polygon(pts, fill=(255, 80, 80, 34))
            d.line(pts + [pts[0]], fill=color, width=1)
    return ov


def figure_sprite(pose, face=1, recol=None):
    v = rig.figure(pose)
    if face < 0:
        v = [(-x, y, z, c) for x, y, z, c in v]
    if recol:
        v = recolor(v, recol)
    old = dict(rig.C)
    rig.C.update(PAL)
    im = rig.render(v)
    rig.C.clear(); rig.C.update(old)
    return im


THUG = {'suit': 'hood', 'suit2': 'hood', 'shirt': 'hood2', 'tie': 'gold', 'pants': 'jeans', 'pants2': 'jeans',
        'hair': 'cap', 'ear': 'gold'}
PAL.update({'hood': (60, 62, 70), 'hood2': (90, 40, 40), 'jeans': (52, 70, 104), 'gold': (240, 200, 70), 'cap': (30, 30, 34)})


def place_figure(canvas, sprite, b, col, row):
    X, Y = cell_center(col, row)
    sx, sy = scr(b, X, Y)
    canvas.alpha_composite(sprite, (int(round(sx - rig.CX)), int(round(sy - rig.CY))))


# ------------------------------------------------------------------ scale check with the shipped character atlases
def atlas_frame(set_id, anim='idle', frame=0, mirror=False):
    """(RGBA frame, anchor) from public/sprites/<set_id>.{png,json}."""
    m = json.load(open(os.path.join(OUT, set_id + '.json'), encoding='utf-8'))
    a = next(x for x in m['animations'] if x['name'] == anim)
    sheet = Image.open(os.path.join(OUT, m['image'])).convert('RGBA')
    fw, fh = m['frameWidth'], m['frameHeight']
    im = sheet.crop((frame * fw, a['row'] * fh, (frame + 1) * fw, (a['row'] + 1) * fh))
    ax, ay = m['anchor']['x'], m['anchor']['y']
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT); ax = fw - 1 - ax
    return im, (ax, ay)


def scale_preview(bg_frame, front, b, BG, sets=('urban', 'military')):
    """Every cell filled with real character sprites: player cols 0-2 front view, enemy cols 5-7 back view mirrored,
    cols 3-4 alternate. Anchor (feet) at the cell centre + (0,1), exactly like the game does."""
    W, H = b['W'], b['H']
    c = Image.new('RGBA', (W, H), BG + (255,))
    c.alpha_composite(bg_frame)
    c.alpha_composite(grid_overlay((W, H), b))
    cells = sorted(((col, row) for col in range(COLS) for row in range(ROWS)), key=lambda k: k[0] + k[1])
    for col, row in cells:
        s = sets[(col + row) % len(sets)]
        enemy = col >= 5 or (col in (3, 4) and row % 2)
        im, (ax, ay) = atlas_frame(s + '-back' if enemy else s, 'idle', 0, mirror=enemy)
        X, Y = cell_center(col, row)
        sx, sy = scr(b, X, Y)
        c.alpha_composite(im, (int(round(sx - ax)), int(round(sy + 1 - ay))))
    c.alpha_composite(front)
    return c


def render_fx(solid, fx, b, look, alpha=0.6, **kw):
    """Translucent FX (steam, smoke, dust): blend a render with the FX over one without, occlusion-correct."""
    A = render(solid, b, look, **kw)
    if not fx:
        return A
    B = render(solid + fx, b, look, **kw)
    a, bb = np.asarray(A, np.float32), np.asarray(B, np.float32)
    diff = np.abs(a - bb).sum(axis=2) > 0
    out = a.copy()
    out[diff] = a[diff] * (1 - alpha) + bb[diff] * alpha
    tr = diff & (a[:, :, 3] == 0)
    out[tr] = bb[tr]; out[tr, 3] = bb[tr, 3] * alpha
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')
