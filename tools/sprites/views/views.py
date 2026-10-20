"""Back view (NE) + head variants for the Shadow Ledger character sprites, on top of tools/sprites (read-only).
Run through tools/sprites/build.py (after the front sets, since it reads their manifests).

How it works
------------
* `capture()` patches rig.figure/rig.render so that every `F(**pose)` executed while a character module is
  imported returns a lightweight `Tok` (pose dict + snapshot of rig.C / rig.EMISSIVE / rig.upper) instead of
  an image.  The module's ROWS therefore hold tokens that can be rendered later in any "mode".
* `render_tok(tok, back, var)` rebuilds the voxels with the original rig.figure (same pose, same palette as at
  capture time), optionally swaps the head voxels for a variant (`apply_head`, done inside rig.upper so the
  lean / fall rotations still apply), optionally turns the figure 90 deg about z so it faces -y (screen NE),
  and renders with the original rig.render.  The renderer lights faces in world space, so after the turn the
  character's back sits on the bright +y face and its right side on the dark +x face, exactly like the front.
* `variant(seed)` is the deterministic look picker (skin tone, hair style + colour, facial hair, glasses).
"""
import json, math, os, random, sys, zlib

W = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(W)                           # tools/sprites
PUBLIC = os.path.normpath(os.path.join(R, '..', '..', 'public', 'sprites'))
OUT = PUBLIC                                     # shippable atlases + manifests go straight to public/sprites
LOCAL = os.path.join(R, 'preview.local', 'views')   # not shipped (git-ignored: *.local)
REF = os.path.join(LOCAL, 'ref')                 # front re-render (for checks only)
PREV = os.path.join(LOCAL, 'preview')
sys.path.insert(0, R)

import rig, atlas  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

_figure, _render = rig.figure, rig.render
CLIPS = []
BACK_RECOLOR = {'glint': 'shades', 'vglint': 'visor'}                                       # (label, n_voxels_outside_canvas)


class Tok:
    __slots__ = ('p', 'C', 'E', 'upper')


def capture():
    def mk(p):
        t = Tok(); t.p = p; t.C = dict(rig.C); t.E = set(rig.EMISSIVE); t.upper = rig.upper
        return t
    rig.figure = lambda p: p
    rig.render = mk


# ---------------------------------------------------------------- back view
def turn_ne(vox):
    """Rotate 90 deg about z around the body axis (x=-0.5, y=-0.5): facing +x -> facing -y (screen NE)."""
    return [(y, -x - 1, z, c) for x, y, z, c in vox]


def _clip_count(vox):
    n = 0
    for x, y, z, _ in vox:
        sx = rig.CX + (x - y) * 2 - 2; sy = rig.CY + (x + y) - z * 2 - 2
        if sx < 0 or sy < 0 or sx + 4 > rig.CW or sy + 4 > rig.CH:
            n += 1
    return n


def render_tok(t, back=False, var=None, cfg=None, label='', mirror=False):
    C = dict(t.C)
    if var:
        C.update(var_colors(var))
    rig.C = C
    rig.EMISSIVE = t.E
    up = t.upper
    rig.upper = (lambda p: apply_head(up(p), var, cfg)) if var else up
    vox = _figure(t.p)
    if back and mirror:
        # swap left/right so the far-hand prop (briefcase) ends up in the visible, near hand from behind
        vox = [(x, -y - 1, z, c) for x, y, z, c in vox]
    if back:
        # lens glints sit on the face, which now points away from the camera: drop the glow
        vox = [(x, y, z, BACK_RECOLOR.get(c, c)) for x, y, z, c in turn_ne(vox)]
    n = _clip_count(vox)
    if n:
        CLIPS.append((label, n))
    return _render(vox)


# ---------------------------------------------------------------- variants
SKIN = [(240, 206, 178), (226, 180, 144), (202, 152, 112), (170, 120, 84), (128, 86, 58), (92, 62, 46)]
HAIR = {'black': (30, 26, 24), 'brown': (92, 60, 36), 'blond': (200, 164, 96), 'red': (156, 66, 34), 'grey': (156, 154, 150)}
STYLES_M = ['short', 'short', 'buzz', 'curly', 'bald']
STYLES_F = ['bun', 'long', 'long', 'short', 'curly']
FACIAL = ['none', 'none', 'stubble', 'beard', 'moustache']


def variant(seed, women=False):
    """Deterministic look for an integer seed. Skin tone cycles through the 6 tones (shifted every 6 seeds),
    the rest comes from random.Random(seed); hair colour odds depend on the skin tone so combos stay natural."""
    rng = random.Random(seed)
    tone = (seed + seed // 6) % 6
    style = rng.choice(STYLES_F if women else STYLES_M)
    if tone <= 2:
        pool = ['black'] * 2 + ['brown'] * 3 + ['blond'] * 2 + ['red'] + ['grey']
    else:
        pool = ['black'] * 5 + ['brown'] * 2 + ['grey']
    hair = rng.choice(pool)
    facial = 'none' if women else rng.choice(FACIAL)
    if style == 'bald' and facial == 'none':
        facial = rng.choice(['stubble', 'beard'])            # bald + bare face reads like a mannequin
    glasses = rng.random() < 0.22
    return dict(seed=seed, tone=tone, style=style, hair=hair, facial=facial, glasses=glasses)


def pick_variants(salt, n=6, women=False):
    """Deterministic spread-out cast: walk seeds salt*1000, salt*1000+1, ... and keep a variant only if its skin
    tone is new and its style / hair colour / facial hair are not over-used (all 6 tones appear once)."""
    out, k = [], 0
    while len(out) < n:
        v = variant(salt * 1000 + k, women); k += 1
        cnt = lambda key, val: sum(1 for o in out if o[key] == val)
        if any(o['tone'] == v['tone'] for o in out) or cnt('style', v['style']) >= 2 or cnt('hair', v['hair']) >= 2:
            continue
        if v['hair'] == 'grey' and cnt('hair', 'grey') >= 1 or (not women and cnt('facial', v['facial']) >= 2):
            continue
        if cnt('glasses', True) >= 2 and v['glasses']:
            continue
        out.append(v)
    return out


def _mul(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


def var_colors(v):
    s = SKIN[v['tone']]; h = HAIR[v['hair']]
    return {'skin': s, 'skin2': _mul(s, 0.86), 'vhair': h, 'vhair2': _mul(h, 0.78),
            'vstub': tuple((a * 3 + b * 2) // 5 for a, b in zip(_mul(s, 0.8), h)),
            'vframe': (34, 30, 28), 'vlens': (170, 206, 226)}


# per-set head config: old hair/beard colour names to strip, and whether a hat/helmet caps the head
HEAD_CFG = {
    'urban': dict(hair={'hair'}, beard=set(), headgear=False, women=False),
    'military': dict(hair=set(), beard={'beard'}, headgear=True, women=False),
    'police': dict(hair={'hairP'}, beard=set(), headgear=True, women=False),
    'criminal': dict(hair={'hairC'}, beard=set(), headgear=True, women=False),
    'women': dict(hair={'hairK', 'hairK2', 'hairL', 'hairL2'}, beard=set(), headgear=False, women=True),
}


def _b(x0, x1, y0, y1, z0, z1, c):
    return [(x, y, z, c) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) for z in range(z0, z1 + 1)]


def hair_vox(style):
    """Hair voxels in body coords (face toward +x, skull = x -1..1, y -1..0, z 14..16)."""
    H, H2 = 'vhair', 'vhair2'
    v = []
    if style in ('short', 'curly', 'long', 'bun'):
        v += _b(-2, 0, -2, 1, 17, 17, H) + _b(-2, -2, -2, 1, 14, 16, H if style == 'short' else H2) + _b(-1, 1, -2, 1, 16, 16, H)
    if style == 'curly':
        v += [(x, y, 18, H2) for x in range(-2, 1) for y in range(-2, 2) if (x + y) % 2 == 0]
        v += [(1, -2, 17, H2), (1, 1, 17, H2), (0, -2, 15, H2), (0, 1, 15, H2), (-1, -2, 15, H), (-1, 1, 15, H), (-2, -2, 13, H2), (-2, 1, 13, H2)]
    elif style == 'long':
        v += _b(-2, -2, -2, 1, 10, 13, H2) + _b(-1, 0, -2, -2, 14, 15, H) + _b(-1, 0, 1, 1, 14, 15, H)
    elif style == 'bun':
        v += _b(-3, -3, -1, 0, 16, 17, H2) + [(-3, -1, 18, H2), (-3, 0, 18, H2)]
    elif style == 'buzz':
        v += _b(-1, 0, -1, 0, 17, 17, H) + _b(-2, -2, -1, 0, 15, 16, H) + _b(-1, 0, -2, -2, 16, 16, H) + _b(-1, 0, 1, 1, 16, 16, H)
        v += [(-2, -1, 14, 'skin2'), (-2, 0, 14, 'skin2')]
    elif style == 'bald':
        v += _b(-1, 0, -1, 0, 17, 17, 'skin') + _b(-2, -2, -1, 0, 14, 16, 'skin2') + [(0, -2, 15, 'skin2'), (0, 1, 15, 'skin2')]
    return v


def facial_vox(f):
    if f == 'stubble':
        return [(1, -1, 14, 'vstub'), (1, 0, 14, 'vstub'), (0, -2, 14, 'vstub'), (0, 1, 14, 'vstub')]
    if f == 'beard':
        return [(1, -1, 14, 'vhair'), (1, 0, 14, 'vhair'), (2, -1, 14, 'vhair2'), (2, 0, 14, 'vhair2'),
                (0, -2, 14, 'vhair'), (0, 1, 14, 'vhair'), (0, -2, 15, 'vhair2'), (0, 1, 15, 'vhair2')]
    if f == 'moustache':
        return [(2, -1, 14, 'vhair'), (2, 0, 14, 'vhair')]
    return []


def apply_head(v, var, cfg):
    strip = cfg['hair'] | cfg['beard']
    keep = [o for o in v if not (o[3] in strip and o[0] <= 1)]
    occ = {}
    for x, y, z, c in keep:
        occ[(x, y, z)] = c
    add = []
    for x in range(-1, 2):                               # restore the skull where old hair/beard covered it
        for y in (-1, 0):
            for z in (14, 15, 16):
                if (x, y, z) not in occ:
                    c = 'skin2' if (x == -1 and z == 14) else 'skin'
                    add.append((x, y, z, c)); occ[(x, y, z)] = c
    soft = {'skin', 'skin2'}
    for x, y, z, c in hair_vox(var['style']) + facial_vox(var['facial']):
        if cfg['headgear'] and z >= 17:
            continue
        cur = occ.get((x, y, z))
        if cur is None or cur in soft or (var['style'] == 'long' and x == -2 and z <= 13):
            add.append((x, y, z, c)); occ[(x, y, z)] = c
    if var['glasses'] and (2, -1, 15) not in occ and (2, 0, 15) not in occ:
        add += [(2, -1, 15, 'vlens'), (2, 0, 15, 'vlens'), (2, -1, 16, 'vframe'), (2, 0, 16, 'vframe'), (1, 1, 15, 'vframe'), (1, -2, 15, 'vframe')]
    return keep + add


# ---------------------------------------------------------------- atlas output
def bbox_of(frames):
    bb = None
    for f in frames:
        b = f.getbbox()
        if b:
            bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    return bb


def crop_rect(frames, W_, H_):
    x0, y0, x1, y1 = bbox_of(frames)
    return max(0, x0 - 1), max(0, y0 - 1), min(W_, x1 + 1), min(H_, y1 + 1)


SHADOW = atlas.ellipse_shadow(rig.CX, rig.CY + 1)


def write_atlas(set_id, rows, meta, base_crop, outdir=OUT):
    """rows = [(key, [RGBA])]; meta = {key: (fps, loop)} copied from the front manifest.
    Uses the front atlas crop (same frameWidth/Height/anchor) unless something would be cut, then grows it."""
    rows = [(k, [atlas._with_shadow(f, SHADOW) for f in fr]) for k, fr in rows]
    W_, H_ = rows[0][1][0].size
    x0, y0, x1, y1 = base_crop
    own = crop_rect([f for _, fr in rows for f in fr], W_, H_)
    grown = own[0] < x0 or own[1] < y0 or own[2] > x1 or own[3] > y1
    if grown:
        x0, y0, x1, y1 = min(x0, own[0]), min(y0, own[1]), max(x1, own[2]), max(y1, own[3])
    fw, fh = x1 - x0, y1 - y0
    maxf = max(len(fr) for _, fr in rows)
    sheet = Image.new('RGBA', (maxf * fw, len(rows) * fh), (0, 0, 0, 0))
    anims = []
    for r, (key, fr) in enumerate(rows):
        for i, f in enumerate(fr):
            sheet.paste(f.crop((x0, y0, x1, y1)), (i * fw, r * fh))
        b = fr[0].crop((x0, y0, x1, y1)).getbbox() or (0, 0, fw, fh)
        fps, loop = meta[key]
        anims.append(dict(name=key, row=r, frames=len(fr), fps=fps, loop=loop, box=[b[0], b[1], b[2] - b[0], b[3] - b[1]]))
    os.makedirs(outdir, exist_ok=True)
    atlas._save(sheet, os.path.join(outdir, set_id + '.png'))
    ax, ay = rig.CX - x0, rig.CY + 1 - y0
    man = dict(kind='atlas', id=set_id, image=set_id + '.png', width=sheet.width, height=sheet.height,
               frameWidth=fw, frameHeight=fh, anchor=dict(x=ax, y=ay), animations=anims)
    atlas._json(man, os.path.join(outdir, set_id + '.json'))
    print(f'{set_id}: {len(rows)} anims, frame {fw}x{fh}, anchor {ax},{ay}{"  (GROWN)" if grown else ""}', flush=True)
    return man, grown


def preview(set_id, outdir=OUT, S=3):
    if not os.environ.get('SPRITES_PREVIEW'):
        return
    man = json.load(open(os.path.join(outdir, set_id + '.json'), encoding='utf-8'))
    sheet = Image.open(os.path.join(outdir, set_id + '.png')).convert('RGBA')
    fw, fh = man['frameWidth'], man['frameHeight']
    ax, ay = man['anchor']['x'], man['anchor']['y']
    maxf = max(a['frames'] for a in man['animations'])
    pad = 6
    im = Image.new('RGB', (pad + maxf * (fw * S + pad), pad + len(man['animations']) * (fh * S + 16 + pad)), (10, 12, 16))
    d = ImageDraw.Draw(im)
    for a in man['animations']:
        r = a['row']; y = pad + r * (fh * S + 16 + pad)
        d.text((pad, y), a['name'], fill=(240, 180, 60))
        for i in range(a['frames']):
            bg = Image.new('RGBA', (fw, fh), (40, 44, 54, 255))
            bg.alpha_composite(sheet.crop((i * fw, r * fh, (i + 1) * fw, (r + 1) * fh)))
            bg.putpixel((min(fw - 1, ax), min(fh - 1, ay)), (0, 255, 255, 255))
            im.paste(bg.convert('RGB').resize((fw * S, fh * S), Image.NEAREST), (pad + i * (fw * S + pad), y + 16))
    os.makedirs(PREV, exist_ok=True)
    im.save(os.path.join(PREV, set_id + '.png'))
