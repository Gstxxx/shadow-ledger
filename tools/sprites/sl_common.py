"""Shared helpers for the marker / item / extra-VFX sprite sets (built on rig)."""
import math, os, random, sys
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig

box = rig.box
rig.C.update({
    # fire / smoke (same values as vfx.py)
    'e1': (255, 252, 220), 'e2': (255, 220, 110), 'e3': (255, 150, 50), 'e4': (220, 80, 30),
    's1': (120, 118, 116), 's2': (90, 88, 88), 's3': (64, 62, 64), 'char': (40, 34, 30),
    # markers
    'red': (226, 44, 40), 'red2': (170, 30, 30), 'red3': (110, 22, 24), 'amber': (255, 176, 40), 'amber2': (200, 120, 30),
    'gold': (240, 196, 70), 'gold2': (200, 150, 50), 'gold3': (150, 108, 40), 'goldL': (255, 236, 150),
    'riv': (120, 70, 180), 'riv2': (92, 52, 140), 'rivL': (196, 140, 255), 'rivD': (60, 36, 96),
    'grn': (70, 220, 110), 'grn2': (40, 160, 80), 'grnD': (30, 100, 56),
    'steel': (150, 156, 166), 'steel2': (112, 118, 128), 'steel3': (80, 86, 96), 'dark': (30, 32, 38),
    'hcloth': (70, 60, 52), 'hcloth2': (54, 46, 40), 'mask': (26, 26, 28), 'gun': (30, 30, 34),
    'leather': (98, 62, 38), 'leather2': (74, 46, 28), 'plane': (214, 218, 226), 'plane2': (170, 176, 188),
    'trail': (230, 234, 245), 'black': (24, 24, 28), 'white': (232, 234, 238), 'yel': (240, 200, 40),
    'blue': (70, 140, 255), 'wood': (140, 104, 62), 'wood2': (112, 80, 46),
    'olive': (96, 104, 66), 'olive2': (78, 86, 54), 'stencil': (210, 204, 170), 'paper': (232, 226, 210),
    'paper2': (206, 198, 176), 'folder': (200, 160, 90), 'folder2': (170, 130, 70), 'cash': (110, 170, 90), 'cash2': (80, 140, 70),
    'server': (40, 42, 48), 'server2': (58, 60, 68), 'led': (90, 240, 130), 'ledB': (80, 170, 255), 'ledR': (255, 70, 60),
    'net': (60, 52, 40), 'pallet': (150, 120, 80), 'pallet2': (120, 92, 58), 'cont': (40, 110, 150), 'cont2': (30, 84, 118),
    'tarp': (80, 96, 70), 'haz': (200, 200, 190), 'rain': (150, 190, 240), 'rain2': (110, 150, 210),
    'fog': (200, 206, 214), 'fog2': (170, 178, 190), 'fog3': (140, 148, 160), 'smr': (200, 60, 60), 'smr2': (160, 44, 48), 'smr3': (120, 40, 44),
    'bars': (96, 100, 110), 'cuff': (190, 196, 206), 'cuff2': (140, 146, 156),
    'cashR': (210, 70, 60), 'cashR2': (160, 48, 44), 'coinR': (230, 90, 70), '_k': (0, 0, 0),
})
FLAT = {'red', 'amber', 'gold', 'goldL', 'rivL', 'grn', 'led', 'ledB', 'ledR', 'trail', 'e1', 'e2', 'e3', 'blue',
        'coinR', 'smr'}
rig.EMISSIVE |= FLAT
DEFAULT_GLOW = {'red', 'amber', 'goldL', 'rivL', 'grn', 'led', 'ledB', 'ledR', 'e1', 'e2', 'e3', 'blue', 'coinR', 'smr'}


def render(vox, glow=DEFAULT_GLOW, strength=170):
    """rig.render + coloured glow around the given emissive colour keys (occlusion-correct)."""
    im = rig.render(vox)
    gk = [(x, y, z, c if c in glow else '_k') for x, y, z, c in vox]
    if not any(c != '_k' for *_, c in gk):
        return im
    m = rig.render(gk)
    src = m.load(); W, H = m.size
    g = Image.new('RGBA', m.size, (0, 0, 0, 0)); gp = g.load()
    for yy in range(H):
        for xx in range(W):
            r, gg, b, a = src[xx, yy]
            if a and max(r, gg, b) > 70:
                gp[xx, yy] = (r, gg, b, strength)
    im.alpha_composite(g.filter(ImageFilter.GaussianBlur(2.5)))
    return im


def ring(r, z, cols, thick=0.8, cx=0, cy=0, gap=None):
    """Horizontal ring at height z; cols is a colour or a function(angle_deg)->colour or None."""
    v = []; ri = int(r) + 2
    for x in range(-ri, ri + 1):
        for y in range(-ri, ri + 1):
            d = math.hypot(x, y)
            if r - thick <= d <= r + 0.35:
                a = math.degrees(math.atan2(y, x)) % 360
                c = cols(a) if callable(cols) else cols
                if c:
                    v.append((cx + x, cy + y, z, c))
    return v


def disc(r, z, c, cx=0, cy=0):
    ri = int(r) + 1
    return [(cx + x, cy + y, z, c) for x in range(-ri, ri + 1) for y in range(-ri, ri + 1) if x * x + y * y <= r * r]


def ball(cx, cy, cz, r, cols, rnd=None, squash=1.0, drop=0.18):
    v = []; ri = int(r) + 1
    for x in range(-ri, ri + 1):
        for y in range(-ri, ri + 1):
            for z in range(-ri, ri + 1):
                d = math.sqrt(x * x + y * y + (z / squash) ** 2)
                if d <= r:
                    if rnd and rnd.random() < drop:
                        continue
                    k = min(len(cols) - 1, int(d / max(r, .01) * len(cols)))
                    v.append((round(cx + x), round(cy + y), round(cz + z), cols[k]))
    return v


def mini(x, y, z=0, cloth='hcloth', cloth2='hcloth2', head='skin', hair='mask', gun=True, pose=0):
    """Small 2-wide figure (~8 voxels tall) facing +x. pose shifts arms slightly for idle."""
    v = box(x, x, y, y, z, z + 2, 'pants') + box(x, x, y + 1, y + 1, z, z + 2, 'pants2')
    v += box(x, x, y, y + 1, z + 3, z + 5, cloth) + [(x - 1, y, z + 4, cloth2), (x - 1, y + 1, z + 4, cloth2)]
    v += [(x, y, z + 6, head), (x, y + 1, z + 6, head), (x, y, z + 7, hair), (x, y + 1, z + 7, hair), (x - 1, y, z + 6, hair), (x - 1, y + 1, z + 6, hair)]
    if gun:
        gz = z + 4 + pose
        v += [(x + 1, y + 1, gz, 'gun'), (x + 2, y + 1, gz, 'gun'), (x + 3, y + 1, gz, 'gun'), (x + 1, y + 1, gz - 1, 'gun')]
        v += [(x + 1, y + 1, z + 4, 'skin')]
    return v


def shift(v, dx=0, dy=0, dz=0):
    return [(x + dx, y + dy, z + dz, c) for x, y, z, c in v]


def text_vox(lines, x0, y, z0, c, axis='x'):
    """Pixel-text stencil: lines is a list of strings ('#' = on), drawn on a plane facing +x (varying y) or +y (varying x)."""
    v = []
    for r, line in enumerate(lines):
        for k, ch in enumerate(line):
            if ch == '#':
                z = z0 + (len(lines) - 1 - r)
                v.append((x0, y - k, z, c) if axis == 'x' else (y + k, x0, z, c))   # +x face reads along -y
    return v
