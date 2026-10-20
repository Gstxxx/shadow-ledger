"""MILITAR: desert outpost by day. HESCO line on the back edge, concrete T-walls on the left edge, burnt cargo truck in
the back-left corner, watchtower + flag pole back right, camo-net supply point behind no-man's land, sandbags / jersey
barrier / Czech hedgehogs as low cover in no-man's land. Ambient loop: flag wave, truck smoke, drifting dust.

Scale 10 voxels = 1 m (common.M): HESCO cells 1.1 x 1.1 x 2.0 m, T-walls 3.5 m, sandbag walls ~1 m, watchtower 6.7 m,
truck 6.6 x 2.4 x 2.5 m, drums 0.9 m, jerry cans 0.5 m, ammo boxes 0.5 m, hedgehogs 1.2 m, camo net ~2.2-2.8 m,
flag pole 5.6 m. A person (18 tall) stands in a 28-voxel cell; cover in no-man's land stays <= 1.2 m."""
import math, random
from common import *

NAME, FPS, NFRAMES = 'militar', 6, 6
BG = (196, 170, 128)
FX_ALPHA = 0.55

PAL.update({
    'sd1': (198, 172, 122), 'sd2': (186, 160, 112), 'sd3': (208, 184, 136), 'sdD': (164, 138, 94), 'track': (160, 132, 90),
    'rock': (140, 128, 110), 'rock2': (112, 102, 88),
    'dirt1': (126, 100, 68), 'dirt2': (108, 84, 56), 'dirt3': (140, 114, 80),
    'hes': (176, 156, 112), 'hes2': (156, 136, 96), 'hesM': (96, 94, 86), 'hesT': (190, 166, 118),
    'tw': (176, 172, 160), 'tw2': (150, 146, 136), 'tw3': (196, 192, 180),
    'sb1': (146, 128, 86), 'sb2': (120, 104, 68), 'sb3': (164, 146, 102),
    'twood': (124, 96, 64), 'twood2': (98, 74, 48), 'roofM': (128, 132, 128), 'roofM2': (104, 108, 106),
    'net1': (92, 100, 62), 'net2': (120, 110, 72), 'net3': (74, 80, 50), 'pole': (90, 80, 64),
    'flagG': (60, 110, 64), 'flagY': (230, 196, 70), 'flagG2': (48, 90, 52),
    'brn': (44, 38, 34), 'brn2': (64, 56, 50), 'brn3': (96, 60, 40), 'rim': (80, 76, 72),
    'ammo': (86, 94, 60), 'ammo2': (68, 76, 48), 'jerry': (96, 104, 64), 'radio': (60, 64, 56),
    'scrub': (120, 118, 70), 'scrub2': (96, 92, 56), 'scrubD': (140, 120, 80),
    'smk1': (96, 92, 90), 'smk2': (120, 116, 112), 'smk3': (150, 146, 140), 'dust': (214, 192, 150),
    'wireC': (176, 180, 186), 'wireC2': (140, 144, 150), 'drum': (70, 92, 70), 'drum2': (52, 70, 52), 'drumR': (150, 70, 40), 'drumR2': (110, 50, 30), 'hh': (70, 72, 74), 'hh2': (100, 96, 90),
})
FX |= {'smk1', 'smk2', 'smk3', 'dust'}

TRUCK = (1, 1)                      # back-left corner, nose toward +x (x 1..66, y 1..24)
TOWER = (168, 4)                    # watchtower legs x 168..189, y 4..23
FLAG = (230, 18)                    # flag pole
NX = X0 + 3 * CELL                  # no-man's land x 100..156


def ground_top(x, y):
    k = hsh(x, y) % 17
    c = 'sd1' if k < 9 else ('sd2' if k < 14 else 'sd3')
    if (x + 2 * y) % 15 == 0 and k % 3 == 0:
        c = 'sdD'                                                         # wind ripples
    # a pair of truck ruts (tyre 0.3 m, gauge 1.9 m) running the length of the arena, wobbling slightly
    w = round(1.5 * math.sin(x / 23.0))
    if (y - w) in (60, 61, 62, 79, 80, 81) and 4 < x < LX - 2 and hsh(x, y, 1) % 5:
        c = 'track'
    return c


def slab_ground():
    v = floor_slab(ground_top, slab='dirt1', slab2='dirt2')
    v = [(x, y, z, ('dirt3' if z == -2 else ('dirt1' if z == -3 else 'dirt2'))) if z < -1 else (x, y, z, c) for x, y, z, c in v]
    return v


def hesco(x0, y0, along='x', n=1, h=20, w=11):
    """Row of n HESCO cells, each w x w x h (1.1 x 1.1 x 2.0 m): fabric shell with wire-mesh grid, sand-filled top."""
    v = []
    for i in range(n):
        if along == 'x':
            ax0, ax1, ay0, ay1 = x0 + i * w, x0 + i * w + w - 1, y0, y0 + w - 1
        else:
            ax0, ax1, ay0, ay1 = x0, x0 + w - 1, y0 + i * w, y0 + i * w + w - 1
        for x in range(ax0, ax1 + 1):
            for y in range(ay0, ay1 + 1):
                edge = x in (ax0, ax1) or y in (ay0, ay1)
                if edge:
                    for z in range(0, h):
                        u = (x - ax0) if y in (ay0, ay1) else (y - ay0)
                        mesh = u % 3 == 0 or z % 3 == 0 or x in (ax0, ax1) and y in (ay0, ay1)
                        c = 'hesM' if mesh else ('hes' if hsh(x, y, z) % 5 else 'hes2')
                        v.append((x, y, z, c))
                v.append((x, y, h - 1 if edge else h - 2, 'hesT' if hsh(x, y) % 4 else 'sd2'))
    return v


def twall(y0, n=6, x0=-1, h=35, seg=12):
    """Concrete T-walls along y (left edge): 1.2 m panels, 0.3 m thick, 3.5 m tall, on a 1.2 m inverted-T foot."""
    v = []
    for i in range(n):
        ya, yb = y0 + i * seg, y0 + i * seg + seg - 1
        v += box(x0, x0 + 11, ya, yb, 0, 2, 'tw2') + [(x0 + 11, y, 3, 'tw2') for y in range(ya, yb + 1)]
        v += box(x0 + 3, x0 + 5, ya, yb, 3, h, 'tw')
        v += [(x0 + 5, yb, z, 'tw2') for z in range(3, h + 1)] + [(x0 + 6, yb, z, 'tw2') for z in range(0, 4)]   # seams
        v += [(x0 + 4, y, h + 1, 'tw3') for y in range(ya, yb)]                                             # rounded cap
        v += [(x0 + 6, ya + 5, h - 3, 'tw2'), (x0 + 6, ya + 6, h - 3, 'tw2')]                                # lifting eye
        v += [(x0 + 6, y, z, 'tw3') for y in range(ya + 1, yb - 1) for z in (14, 15) if hsh(y, i) % 3]       # stencil band
        v += [(x0 + 9, ya + 3, 2, 'tw3'), (x0 + 9, ya + 4, 2, 'tw3'), (x0 + 9, ya + 8, 2, 'tw3')]
    return v


def sandbags(pts, layers=5, blen=6):
    """Stacked sandbag wall along a polyline of (x,y) points: bags ~0.6 m long x 0.2 m high, staggered per layer."""
    v = []
    for layer in range(layers):
        off = (layer % 2) * (blen // 2)
        for i, (x, y) in enumerate(pts):
            b = (i + off) // blen
            seam = (i + off) % blen == 0
            k = hsh(b, layer, x // 7, 3) % 3
            c = ('sb1', 'sb2', 'sb3')[k]
            v.append((x, y, layer * 2, 'sb2' if seam else c))
            v.append((x, y, layer * 2 + 1, 'sb2' if seam else ('sb3' if k != 2 else 'sb1')))
    return v


def thick(pts, d=(1, 0), n=2):
    return [(x + d[0] * k, y + d[1] * k) for k in range(n) for x, y in pts]


def watchtower(x0, y0, deck=42):
    """Wooden guard tower: 2.2 x 2.0 m footprint, deck at 4.2 m, 1 m sandbag parapet, corrugated roof at 6.6 m."""
    v = []
    xa, xb, ya, yb = x0, x0 + 20, y0, y0 + 18
    for lx, ly in ((xa, ya), (xb, ya), (xa, yb), (xb, yb)):
        v += box(lx, lx + 1, ly, ly + 1, 0, deck - 1, 'twood')
    tiers = ((0, 20), (21, deck - 1))
    for z0, z1 in tiers:                                                   # X-bracing on all four faces
        for k in range(z0, z1 + 1):
            f = (k - z0) / (z1 - z0)
            for yy in (ya, yb + 1):
                v += [(xa + round(f * 20), yy, k, 'twood2'), (xb - round(f * 20), yy, k, 'twood2')]
            for xx in (xa, xb + 1):
                v += [(xx, ya + round(f * 18), k, 'twood2'), (xx, yb - round(f * 18), k, 'twood2')]
        for xx in range(xa, xb + 2):                                       # girts
            v += [(xx, ya, z1, 'twood'), (xx, yb + 1, z1, 'twood')]
        for yy in range(ya, yb + 2):
            v += [(xa, yy, z1, 'twood'), (xb + 1, yy, z1, 'twood')]
    for x in range(xa - 2, xb + 4):                                        # deck planks
        for y in range(ya - 2, yb + 4):
            v.append((x, y, deck, 'twood2' if x % 3 else 'twood'))
    px0, px1, py0, py1 = xa - 2, xb + 3, ya - 2, yb + 3
    for x in range(px0, px1 + 1):                                          # sandbag parapet, 2 bags thick
        for y in range(py0, py1 + 1):
            ring = min(x - px0, px1 - x, y - py0, py1 - y)
            if ring > 1:
                continue
            for z in range(deck + 1, deck + 11):
                slit = z in (deck + 7, deck + 8) and ((x == px1 and 7 <= y - ya <= 12) or (y == py1 and 6 <= x - xa <= 14))
                if slit:
                    continue
                u = (x + y) + ((z - deck) // 2) * 3
                c = 'sb2' if u % 6 == 0 else ('sb1', 'sb3')[(z - deck) % 2]
                v.append((x, y, z, c))
    for lx, ly in ((px0, py0), (px1, py0), (px0, py1), (px1, py1)):       # roof posts
        v += box(lx, lx, ly, ly, deck + 11, deck + 23, 'twood')
    for x in range(px0 - 2, px1 + 3):                                      # corrugated roof with a front drip edge
        for y in range(py0 - 2, py1 + 3):
            v.append((x, y, deck + 24, 'roofM' if x % 2 else 'roofM2'))
    v += [(x, py1 + 2, deck + 23, 'roofM2') for x in range(px0 - 2, px1 + 3)] + [(px1 + 2, y, deck + 23, 'roofM2') for y in range(py0 - 2, py1 + 3)]
    for z in range(0, deck + 1):                                           # ladder up the +y face
        v += [(xa + 7, yb + 3, z, 'twood'), (xa + 12, yb + 3, z, 'twood')]
        if z % 3 == 0:
            v += [(xa + k, yb + 3, z, 'twood2') for k in range(8, 12)]
    v += box(xa + 3, xa + 6, ya + 2, ya + 4, deck + 1, deck + 4, 'radio') + [(xa + 4, ya + 3, z, 'hesM') for z in range(deck + 5, deck + 14)]
    v += [(x, ya + 10, deck + 8, 'hh') for x in range(px1 - 1, px1 + 7)] + [(px1 - 1, ya + 10, deck + 9, 'hh')]   # MG barrel through the slit
    return v


def flag_pole(x, y, h=56):
    """5.6 m steel pole on a sandbag-ring footing, ball finial."""
    v = [(x, y, z, 'pole') for z in range(0, h + 1)] + [(x, y, h + 1, 'hh2')]
    ring = [(x + round(4 * math.cos(a / 8 * math.pi)), y + round(4 * math.sin(a / 8 * math.pi))) for a in range(16)]
    v += sandbags(list(dict.fromkeys(ring)), 2, 3)
    return v


def flag(x0, y0, t, top=55):
    """1.6 x 1.0 m flag, green with a yellow band, waving toward +x."""
    v = []
    for i in range(16):
        f = i / 15
        dz = round(math.sin(i * 0.45 - t * 2 * math.pi / NFRAMES) * 2.2 * f)
        dy = round(math.cos(i * 0.45 - t * 2 * math.pi / NFRAMES) * 1.6 * f)
        for k in range(10):
            c = 'flagY' if k in (4, 5) else ('flagG' if dz >= 0 else 'flagG2')
            v.append((x0 + 1 + i, y0 + dy, top - k + dz, c))
    return v


def camo_net(x0, x1, y0, y1, zt):
    """Camo net on 3 poles along the front edge, draping back onto the HESCO top (~2.8 m front, ~2.2 m back)."""
    v = []
    for x in (x0, x1, (x0 + x1) // 2):
        v += box(x, x, y1, y1, 0, zt - 1, 'pole')
    for x in range(x0 - 2, x1 + 3):
        for y in range(y0, y1 + 2):
            sag = 1 if (x - x0) % 21 < 3 or (x1 - x) % 21 < 3 else 0
            z = zt - (y1 - y) // 3 + sag - (1 if y > y1 else 0)
            k = hsh(x, y, 5) % 13
            if k == 0:
                continue                                                  # holes
            v.append((x, y, z, ('net1', 'net2', 'net3')[k % 3]))
            if k in (3, 7, 11) and y >= y1 - 1:
                v += [(x, y, z - d, 'net3') for d in range(1, 2 + hsh(x, y) % 4)]   # dangling scrim at the front
            elif k in (3, 7):
                v.append((x, y, z - 1, 'net3'))
    return v


def ammo_box(x, y, z=0, along='x'):
    """Ammo crate 0.8 x 0.5 x 0.5 m with handles and a lid seam."""
    if along == 'x':
        v = box(x, x + 7, y, y + 4, z, z + 4, 'ammo') + [(x + k, y + 4, z + 4, 'ammo2') for k in range(8)]
        v += [(x + 2, y + 5, z + 3, 'ammo2'), (x + 5, y + 5, z + 3, 'ammo2'), (x + 8, y + 2, z + 3, 'ammo2')]
    else:
        v = box(x, x + 4, y, y + 7, z, z + 4, 'ammo') + [(x + 4, y + k, z + 4, 'ammo2') for k in range(8)]
        v += [(x + 5, y + 2, z + 3, 'ammo2'), (x + 5, y + 5, z + 3, 'ammo2'), (x + 2, y + 8, z + 3, 'ammo2')]
    return v


def jerry(x, y):
    """Jerry can 0.35 x 0.2 x 0.45 m + handle."""
    return box(x, x + 3, y, y + 1, 0, 4, 'jerry') + [(x + 1, y, 5, 'radio'), (x + 2, y, 5, 'radio'), (x + 3, y, 5, 'jerry')] + \
        [(x + k, y + 2, 2, 'ammo2') for k in range(4)]


def crate(x, y, z=0, s=8):
    v = box(x, x + s - 1, y, y + s - 1, z, z + s - 1, 'twood')
    v += [(x + s - 1, y + k, z + k, 'twood2') for k in range(s)] + [(x + k, y + s - 1, z + s - 1 - k, 'twood2') for k in range(s)]
    v += [(x + k, y + s - 1, zz, 'twood2') for k in range(s) for zz in (z, z + s - 1)]
    v += [(x + s - 1, y + k, zz, 'twood2') for k in range(s) for zz in (z, z + s - 1)]
    return v


def burnt_truck(x0, y0):
    """Wrecked 6x6 cargo truck, nose toward +x: 66 long x 24 wide x 25 tall (6.6 x 2.4 x 2.5 m). Hollow shells:
    holed cargo bed with charred canvas bows, cab with blown-out windows, bonnet + grille, bare rims (1.1 m wheels)."""
    v = []
    x1, y1 = x0 + 65, y0 + 23
    ba, bb = y0 + 2, y1 - 2                                                # body width (wheels stick out to y0 / y1)
    v += box(x0 + 2, x1 - 2, ba + 3, ba + 4, 8, 9, 'brn') + box(x0 + 2, x1 - 2, bb - 4, bb - 3, 8, 9, 'brn')   # frame rails
    for cx in range(x0 + 4, x1 - 2, 9):
        v += [(cx, y, 9, 'brn') for y in range(ba + 5, bb - 4)]
    bx1 = x0 + 39                                                          # cargo bed x0..bx1
    for x in range(x0, bx1 + 1):
        for y in range(ba, bb + 1):
            if hsh(x, y) % 4:
                v.append((x, y, 11, 'brn' if hsh(x, y, 2) % 3 else 'brn3'))   # bed floor, burnt through in places
            side = x in (x0, bx1) or y in (ba, bb)
            if side:
                for z in range(12, 19):
                    h = hsh(x, y, z)
                    if h % 7 and not (z > 15 and h % 3 == 0):
                        v.append((x, y, z, 'brn2' if h % 3 else 'brn3'))
    v += [(x, bb, 18, 'brn3') for x in range(x0, bx1 + 1, 2)]
    for rx in (x0 + 2, x0 + 14, x0 + 26, x0 + 37):                         # charred canvas bows
        for y in range(ba, bb + 1):
            arch = 25 - round(((y - (ba + bb) / 2) / ((bb - ba) / 2)) ** 2 * 3)
            v.append((rx, y, arch, 'brn3' if y % 3 else 'brn2'))
        v += [(rx, ba, z, 'brn2') for z in range(19, 23)] + [(rx, bb, z, 'brn2') for z in range(19, 23)]
    v += [(x, y, 24, 'brn2') for x in range(x0 + 14, x0 + 27) for y in range(ba + 3, ba + 7) if hsh(x, y, 9) % 3 == 0]   # canvas scrap
    cx0, cx1 = x0 + 42, x0 + 53                                            # cab
    for x in range(cx0, cx1 + 1):
        for y in range(ba, bb + 1):
            for z in range(10, 25):
                shell_ = x in (cx0, cx1) or y in (ba, bb) or z in (10, 24)
                if not shell_:
                    continue
                win_side = 16 <= z <= 21 and y in (ba, bb) and cx0 + 3 <= x <= cx1 - 2
                win_front = 16 <= z <= 21 and x == cx1 and ba + 2 <= y <= bb - 2 and y != (ba + bb) // 2
                if win_side or win_front:
                    continue
                if z == 24 and hsh(x, y) % 5 == 0:
                    continue                                              # roof burnt through
                v.append((x, y, z, 'brn' if (x + z) % 5 else 'brn3'))
    v += [(cx0 + 2, y, z, 'brn2') for y in (ba, bb) for z in range(11, 22)]  # door seams
    hx0 = cx1 + 1                                                          # bonnet
    for x in range(hx0, x1 + 1):
        for y in range(ba + 2, bb - 1):
            for z in range(10, 19):
                if y in (ba + 2, bb - 2) or z == 18 or x == x1:
                    grille = x == x1 and 11 <= z <= 17 and y % 2 == 0 and ba + 3 < y < bb - 3
                    v.append((x, y, z, 'rim' if grille else ('brn' if hsh(x, y, z) % 4 else 'brn3')))
    v += box(x1 + 1, x1 + 2, ba, bb, 7, 9, 'brn2')                         # bumper
    v += [(x1, y, z, 'brn3') for y in (ba + 3, bb - 3) for z in (14, 15)]  # dead headlights
    for x in range(hx0 - 4, x1 + 1):                                       # front fenders
        v += [(x, ba, 12, 'brn2'), (x, bb, 12, 'brn2'), (x, ba + 1, 12, 'brn2'), (x, bb - 1, 12, 'brn2')]
    for wx in (x0 + 9, x0 + 22, x0 + 57):                                  # bare rims, tyres burnt away
        for yy in (y0, y0 + 1, y1 - 1, y1):
            outer = yy in (y0, y1)
            for dx in range(-6, 7):
                for dz in range(-6, 7):
                    d = math.sqrt(dx * dx + dz * dz)
                    z = 5 + dz
                    if z < 0 or d > 5.6:
                        continue
                    if d > 4.4:
                        if hsh(wx + dx, z, yy) % 3 == 0:
                            v.append((wx + dx, yy, z, 'brn'))              # tyre remnants
                    elif d > 3.2 or (outer and d < 1.5):
                        v.append((wx + dx, yy, z, 'rim'))
                    elif outer and abs(dx) == abs(dz) and d > 1.5:
                        v.append((wx + dx, yy, z, 'brn2'))                 # spokes
    return v


def drum(x, y, c='drum', h=9):
    """55-gallon drum: 0.6 m across, 0.9 m tall, rolling hoops."""
    v = []
    for z in range(0, h):
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                if dx * dx + dy * dy <= 10:
                    v.append((x + dx, y + dy, z, c + '2' if z in (2, 6, h - 1) else c))
    return v


def hedgehog(x, y):
    """Czech hedgehog: three steel angle beams crossing at mid-height, 1.2 m tall, ~1.4 m across."""
    v = []
    for (dx, dy), c in (((6, 0), 'hh'), ((-3, 5), 'hh2'), ((-3, -5), 'hh')):
        for d in (0, 1):
            v += line3((x - dx, y - dy, d), (x + dx, y + dy, 12 + d), c)
    v += [(x, y, 6, 'hh2'), (x, y, 7, 'hh2')]
    return v


def jersey(x, y0, y1):
    """Concrete jersey barrier along y: 0.8 m tall, 0.6 m base tapering to 0.2 m."""
    v = box(x - 2, x + 3, y0, y1, 0, 2, 'tw2') + box(x - 1, x + 2, y0, y1, 3, 5, 'tw') + box(x, x + 1, y0, y1, 6, 8, 'tw')
    v += [(x + 3, y, 2, 'tw3') for y in range(y0, y1 + 1)] + [(x + 2, y, 5, 'tw3') for y in range(y0, y1 + 1)]
    v += [(x + 1, y, 9, 'tw3') for y in range(y0, y1 + 1, 6)]
    v += [(x + 1, y, z, 'tw2') for y in range(y0 + 12, y1, 12) for z in range(6, 9)] + \
        [(x + 3, y, z, 'tw2') for y in range(y0 + 12, y1, 12) for z in range(0, 3)]          # segment joints
    return v


def scrub(x, y, s=0):
    """Desert scrub, 0.5-0.8 m across, up to 0.4 m tall."""
    v = []
    r = 3 + s
    for k in range(26 + s * 14):
        dx, dy = hsh(x, y, k) % (2 * r + 1) - r, hsh(y, x, k) % (2 * r + 1) - r
        if dx * dx + dy * dy > r * r:
            continue
        dz = (hsh(k, x, y) % (3 + s)) if abs(dx) + abs(dy) < r else 0
        v += [(x + dx, y + dy, z, ('scrub', 'scrub2', 'scrubD')[(k + z) % 3]) for z in range(0, dz + 1)]
    return v


def rocks(x, y, s=0):
    v = [(x, y, 0, 'rock'), (x + 1, y, 0, 'rock'), (x, y + 1, 0, 'rock2'), (x + 1, y + 1, 0, 'rock2'), (x + 2, y, 0, 'rock2')]
    if s:
        v += [(x, y, 1, 'rock'), (x + 1, y, 1, 'rock2'), (x - 1, y + 1, 0, 'rock'), (x + 3, y + 2, 0, 'rock2'), (x + 4, y + 2, 0, 'rock')]
    return v


def env():
    v = slab_ground()
    # back edge: HESCO line (gaps behind the truck and the watchtower)
    v += hesco(68, -1, 'x', 9) + hesco(195, -1, 'x', 5)
    # left edge: T-walls, then drums at the front of the left strip
    v += twall(26, 6, x0=-1)
    v += drum(5, 101) + drum(11, 105, 'drumR') + drum(5, 108)
    # back-left corner: burnt truck (smoke in anim_fx)
    v += burnt_truck(*TRUCK)
    v += [(x, y, 0, 'brn') for x in range(4, 66) for y in (0, 25) if hsh(x, y) % 3 == 0]          # scorch around it
    # back right: watchtower, flag pole in front of the HESCO
    v += watchtower(*TOWER)
    v += flag_pole(*FLAG)
    # supply point under the camo net (back strip behind no-man's land)
    v += camo_net(74, 158, 4, 24, 28)
    v += ammo_box(80, 12) + ammo_box(80, 12, 5) + ammo_box(89, 13) + ammo_box(81, 18, 0) + ammo_box(90, 18, 0, 'y')
    v += jerry(99, 14) + jerry(104, 14) + jerry(101, 19)
    v += box(116, 131, 13, 21, 7, 7, 'twood') + [(lx, ly, z, 'twood2') for lx in (117, 130) for ly in (14, 20) for z in range(0, 7)]
    v += box(119, 123, 15, 18, 8, 11, 'radio') + [(120, 16, z, 'hesM') for z in range(12, 18)] + [(125, 16, 8, 'flagY'), (126, 16, 8, 'flagY'), (126, 17, 8, 'wireC')]
    v += crate(136, 12) + crate(137, 13, 8, 6) + drum(150, 18)
    v += [(162, 16, z, 'pole') for z in range(0, 63)] + box(160, 164, 16, 16, 58, 58, 'hesM') + [(162, 16, 63, 'hesM')]   # antenna mast
    v += line3((162, 16, 58), (152, 25, 0), 'wire') + line3((162, 16, 58), (166, 25, 0), 'wire')
    # no-man's land (cols 3-4, x 100..156): cover <= 1.2 m, kept off the cell centres
    arc = [(NX + 22 + round(3 * math.sin(math.pi * a / 22)), Y0 + 4 + a) for a in range(0, 23)]
    v += sandbags(thick(arc, (-1, 0), 4), 5)                               # sandbag arc, 1.0 m
    v += jersey(NX + 32, Y0 + 30, Y0 + 54)                                 # jersey barrier, 0.8 m
    lw = [(NX + 3, y) for y in range(Y0 + 58, Y0 + 79)] + [(x, Y0 + 78) for x in range(NX + 4, NX + 13)]
    v += sandbags(thick(lw, (1, 0), 3), 4)                                 # low L-wall, 0.8 m
    v += hedgehog(NX + 50, Y0 + 5) + hedgehog(NX + 7, Y0 + 30) + hedgehog(NX + 50, Y0 + 56)
    v += ammo_box(NX + 30, Y0 + 75) + ammo_box(NX + 31, Y0 + 75, 5)
    # scrub + rocks scattered (flat enough to stand on)
    for (x, y, s) in ((60, 100, 0), (176, 60, 1), (226, 92, 0), (48, 46, 0), (166, 108, 1), (244, 40, 1),
                      (198, 74, 0), (84, 74, 1), (30, 30, 0), (210, 30, 1)):
        v += scrub(x, y, s)
    for (x, y, s) in ((80, 40, 1), (196, 96, 0), (40, 82, 1), (214, 42, 0), (92, 104, 0), (232, 64, 1), (20, 60, 0)):
        v += rocks(x, y, s)
    return v


def anim(t):
    return flag(FLAG[0], FLAG[1], t)


def anim_fx(t):
    v = []
    # truck smoke: dark puffs rising from the cargo bed, drifting toward +x
    for k in range(6):
        ph = ((k + t / NFRAMES) % 6) / 6.0
        r = 2.5 + ph * 6.5
        cx, cy, cz = TRUCK[0] + 20 + ph * 26, TRUCK[1] + 12 + ph * 6, 16 + ph * 52
        for dx in range(-int(r) - 1, int(r) + 2):
            for dy in range(-int(r) - 1, int(r) + 2):
                for dz in range(-int(r) - 1, int(r) + 2):
                    if dx * dx + dy * dy + dz * dz <= r * r and hsh(dx, dy, dz, k) % 6 > ph * 3:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'smk1' if ph < .3 else ('smk2' if ph < .65 else 'smk3')))
    # dust motes drifting with the wind (+x), looping across the arena
    rnd = random.Random(9)
    for k in range(140):
        x0, y0, z0 = rnd.uniform(0, LX), rnd.uniform(4, LY - 2), rnd.uniform(1, 20)
        ph = (rnd.random() + t / NFRAMES) % 1.0                      # each mote drifts 36 vox per loop, then respawns
        x = (x0 + ph * 36) % LX
        z = z0 + math.sin(t * 2 * math.pi / NFRAMES + k) * 2.5
        v.append((round(x), round(y0), round(z), 'dust'))
        if k % 4 == 0:
            v.append((round(x) + 1, round(y0), round(z), 'dust'))
    return v


def front():
    """Concertina wire (0.9 m coil) along the front-right edge, outside the grid, + scrub and a jerry can front-left."""
    v = []
    y, zc, r, x0, pitch = LY - 5, 5, 4, 118, 6.0
    n = int((LX - 2 - x0) / pitch * 2 * math.pi / 0.12)
    for i in range(n):                                                     # continuous helix, 0.6 m per turn
        a = i * 0.12
        x = x0 + a * pitch / (2 * math.pi)
        v.append((round(x), y + round(r * math.cos(a)), zc + round(r * math.sin(a)), 'wireC' if math.sin(a) > 0 else 'wireC2'))
    for x in range(120, LX - 1, 28):                                       # pickets
        v += [(x, y, z, 'hh2') for z in range(0, 10)]
    v += scrub(5, LY - 5, 2) + jerry(8, LY - 12)
    return v


def look(t):
    amb = ((1.18, 1.10, 0.96), (0.95, 0.88, 0.80), (0.66, 0.64, 0.68))
    return Look(amb, [], shadow=(0.55, 0.32, 16), shadow_k=0.66, ao_k=0.8, glow=0.6)
