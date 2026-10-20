"""Shared helpers for the misc sets (map planes, UI icons, vehicles-xl, story portraits).
Imports the tools/sprites builders read-only (no bytecode written) and writes straight to public/sprites.
Run through tools/sprites/build.py, or one generator at a time: python -I tools/sprites/misc/gen_<x>.py"""
import sys
sys.dont_write_bytecode = True
import json, math, os, random
from collections import Counter

W = os.path.dirname(os.path.abspath(__file__))
R_DIR = os.path.dirname(W)                                         # tools/sprites
PUB = os.path.normpath(os.path.join(R_DIR, '..', '..', 'public', 'sprites'))
PREV = os.path.join(R_DIR, 'preview.local', 'misc')                # conference sheets (git-ignored, SPRITES_PREVIEW=1)
sys.path.insert(0, R_DIR)
sys.path.insert(0, W)
from PIL import Image, ImageDraw, ImageFilter
import rig

_orig_shade = rig.shade


# ------------------------------------------------------------------ voxel resampling
def scale_up(vox, s):
    """Exact partition upscale: source voxel x covers target [ceil(s*x), ceil(s*(x+1)))."""
    out = {}
    for x, y, z, c in vox:
        if not c:
            continue
        x, y, z = round(x), round(y), round(z)
        for X in range(math.ceil(s * x), math.ceil(s * (x + 1))):
            for Y in range(math.ceil(s * y), math.ceil(s * (y + 1))):
                for Z in range(math.ceil(s * z), math.ceil(s * (z + 1))):
                    out[(X, Y, Z)] = c
    return [(x, y, z, c) for (x, y, z), c in out.items()]


def scale_down(vox, f, thresh=0.3, prio=()):
    """Binning downsample by factor f (>1). Keeps a cell when it holds >= thresh*f*f source voxels.
    Colour = most common, except keys in `prio` win when present."""
    bins = {}
    for x, y, z, c in vox:
        k = (math.floor(x / f), math.floor(y / f), math.floor(z / f))
        bins.setdefault(k, Counter())[c] += 1
    out = []
    need = max(1, thresh * f * f)
    for k, cnt in bins.items():
        if sum(cnt.values()) < need:
            continue
        pc = [c for c in prio if c in cnt]
        c = pc[0] if pc else cnt.most_common(1)[0][0]
        out.append((k[0], k[1], k[2], c))
    return out


# ------------------------------------------------------------------ contrast grade
def graded_shade(gamma=0.8, sat=1.2, faces=(1.22, 0.92, 0.62), skip=()):
    """Patch rig.shade: brighter, more saturated base colours and stronger face separation."""
    cache = {}
    fmap = {1.18: faces[0], .9: faces[1], .66: faces[2]}

    def col(c):
        if c not in cache:
            r, g, b = rig.C[c]
            if c in rig.EMISSIVE or c in skip or c.endswith('_w'):
                cache[c] = (r, g, b)
            else:
                v = [255 * (k / 255) ** gamma for k in (r, g, b)]
                l = 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]
                cache[c] = tuple(max(0, min(255, l + (k - l) * sat)) for k in v)
        return cache[c]

    def shade(c, k, x, y, z):
        j = (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >> 3) % 11 - 5
        kk = fmap.get(k, k)
        return tuple(max(0, min(255, int(v * kk + j))) for v in col(c)) + (255,)
    rig.shade = shade


# ------------------------------------------------------------------ atlas writer (same format as tools/sprites/atlas.py)
def save_png(im, path, colors=256):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.quantize(colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def write_json(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')


def with_shadow(f, mask, alpha):
    if mask is None or alpha <= 0:
        return f
    base = Image.new('RGBA', f.size, (0, 0, 0, 0))
    base.paste(Image.new('RGBA', f.size, (0, 0, 0, 255)), mask=mask.point(lambda v: v * alpha // 255))
    base.alpha_composite(f)
    return base


def write_atlas(out_dir, set_id, rows, anchor, pad=1, colors=256, extra=None, crop=True):
    """rows = [dict(name, frames=[RGBA], loop, fps)] all frames same size. Crops to the union bbox."""
    W_, H_ = rows[0]['frames'][0].size
    if crop:
        bb = None
        for r in rows:
            for f in r['frames']:
                b = f.getbbox()
                if b:
                    bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
        x0, y0, x1, y1 = bb
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W_, x1 + pad), min(H_, y1 + pad)
        edge = bb[0] == 0 or bb[1] == 0 or bb[2] == W_ or bb[3] == H_
        if edge:
            print(f'WARNING {set_id}: content touches canvas edge {bb} of {W_}x{H_}')
    else:
        x0, y0, x1, y1 = 0, 0, W_, H_
    fw, fh = x1 - x0, y1 - y0
    maxf = max(len(r['frames']) for r in rows)
    sheet = Image.new('RGBA', (maxf * fw, len(rows) * fh), (0, 0, 0, 0))
    anims = []
    for i, r in enumerate(rows):
        for j, f in enumerate(r['frames']):
            sheet.paste(f.crop((x0, y0, x1, y1)), (j * fw, i * fh))
        b = r['frames'][0].crop((x0, y0, x1, y1)).getbbox() or (0, 0, fw, fh)
        a = dict(name=r['name'], row=i, frames=len(r['frames']), fps=r.get('fps', 8), loop=r.get('loop', True),
                 box=[b[0], b[1], b[2] - b[0], b[3] - b[1]])
        a.update(r.get('meta', {}))
        anims.append(a)
    png = os.path.join(out_dir, set_id + '.png')
    save_png(sheet, png, colors)
    man = dict(kind='atlas', id=set_id, image=set_id + '.png', width=sheet.width, height=sheet.height,
               frameWidth=fw, frameHeight=fh, anchor=dict(x=anchor[0] - x0, y=anchor[1] - y0), animations=anims)
    if extra:
        man.update(extra)
    write_json(man, os.path.join(out_dir, set_id + '.json'))
    print(f'{set_id}: {len(rows)} rows, frame {fw}x{fh}, sheet {sheet.width}x{sheet.height}, {os.path.getsize(png) // 1024} KB', flush=True)
    return man


def preview_sheet(out_dir, set_id, S=2, bg=(40, 44, 54), label_w=0, max_rows=None, path=None):
    """Conference sheet: each row over a dark tile, scaled S, with the row name."""
    if not os.environ.get('SPRITES_PREVIEW'):
        return None
    man = json.load(open(os.path.join(out_dir, set_id + '.json'), encoding='utf-8'))
    sheet = Image.open(os.path.join(out_dir, man['image'])).convert('RGBA')
    fw, fh = man['frameWidth'], man['frameHeight']
    anims = man['animations'][:max_rows] if max_rows else man['animations']
    maxf = max(a['frames'] for a in anims)
    pad = 4
    im = Image.new('RGB', (pad + maxf * (fw * S + pad), pad + len(anims) * (fh * S + 12 + pad)), (10, 12, 16))
    d = ImageDraw.Draw(im)
    for r, a in enumerate(anims):
        y = pad + r * (fh * S + 12 + pad)
        d.text((pad, y), f"{a['name']}  ({a['frames']}f {'loop' if a['loop'] else 'once'})", fill=(240, 180, 60))
        for i in range(a['frames']):
            t = Image.new('RGBA', (fw, fh), bg + (255,))
            t.alpha_composite(sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)))
            im.paste(t.convert('RGB').resize((fw * S, fh * S), Image.NEAREST), (pad + i * (fw * S + pad), y + 12))
    p = os.path.join(PREV, os.path.basename(path)) if path else os.path.join(PREV, set_id + '.png')
    os.makedirs(PREV, exist_ok=True)
    im.save(p)
    return p
