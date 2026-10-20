"""MILITAR: desert outpost by day. HESCO line on the back edge, concrete T-walls + burnt truck on the left edge,
watchtower with flag, camo-net supply point, sandbags / jersey barrier / hedgehog as low cover in no-man's land.
Ambient loop: flag wave, truck smoke, drifting dust."""
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


def ground_top(x, y):
    k = hsh(x, y) % 17
    c = 'sd1' if k < 9 else ('sd2' if k < 14 else 'sd3')
    if (x + 2 * y) % 11 == 0 and k % 3 == 0:
        c = 'sdD'                                                         # wind ripples
    if (y in (32, 33, 38, 39)) and 4 < x < LX - 2 and hsh(x, y, 1) % 5:
        c = 'track'                                                       # tire tracks
    return c


def slab_ground():
    v = floor_slab(ground_top, slab='dirt1', slab2='dirt2')
    v = [(x, y, z, ('dirt3' if z == -2 else ('dirt1' if z == -3 else 'dirt2'))) if z < -1 else (x, y, z, c) for x, y, z, c in v]
    return v


def hesco(x0, y0, along='x', n=1, h=10, w=6):
    """Row of n HESCO cells (w x w x h): fabric with wire-mesh grid, sand-filled top."""
    v = []
    for i in range(n):
        if along == 'x':
            ax0, ax1, ay0, ay1 = x0 + i * w, x0 + i * w + w - 1, y0, y0 + w - 1
        else:
            ax0, ax1, ay0, ay1 = x0, x0 + w - 1, y0 + i * w, y0 + i * w + w - 1
        for x in range(ax0, ax1 + 1):
            for y in range(ay0, ay1 + 1):
                for z in range(0, h):
                    edge = x in (ax0, ax1) or y in (ay0, ay1)
                    if not edge:
                        continue
                    u = (x - ax0) if y in (ay0, ay1) else (y - ay0)
                    mesh = u % 3 == 0 or z % 3 == 0 or x in (ax0, ax1) and y in (ay0, ay1)
                    c = 'hesM' if mesh else ('hes' if hsh(x, y, z) % 5 else 'hes2')
                    v.append((x, y, z, c))
                v.append((x, y, h - 1 if (x in (ax0, ax1) or y in (ay0, ay1)) else h - 2, 'hesT' if hsh(x, y) % 4 else 'sd2'))
    return v


def twall(y0, n=4, x0=0, h=16, seg=6):
    """Concrete T-walls along y (left edge): tall panel on a wide foot, seams between panels."""
    v = []
    for i in range(n):
        ya, yb = y0 + i * seg, y0 + i * seg + seg - 1
        v += box(x0, x0 + 4, ya, yb, 0, 1, 'tw2') + box(x0 + 1, x0 + 2, ya, yb, 2, h, 'tw')
        v += [(x0 + 2, yb, z, 'tw2') for z in range(2, h + 1)] + [(x0 + 1, y, h + 1, 'tw3') for y in range(ya, yb)]
        v += [(x0 + 3, ya + 2, 1, 'tw3'), (x0 + 3, ya + 3, 1, 'tw3')]
    return v


def sandbags(pts, h=3):
    """Stacked sandbag wall along a polyline of (x,y) points; staggered bags of 3 voxels."""
    v = []
    for layer in range(h):
        for i, (x, y) in enumerate(pts):
            k = (i + layer) % 3
            c = 'sb2' if k == 0 else ('sb1' if k == 1 else 'sb3')
            for dz in (0, 1):
                v.append((x, y, layer * 2 + dz, c if dz == 0 else ('sb3' if k else 'sb1')))
    return v


def thick(pts, d=(1, 0)):
    return pts + [(x + d[0], y + d[1]) for x, y in pts]


def watchtower(x0, y0):
    v = []
    for lx, ly in ((x0, y0), (x0 + 10, y0), (x0, y0 + 9), (x0 + 10, y0 + 9)):
        v += box(lx, lx, ly, ly, 0, 25, 'twood')
    for k in range(0, 25):                                                 # cross bracing
        f = k / 24
        v += [(x0 + round(f * 10), y0 + 9, k, 'twood2'), (x0 + 10 - round(f * 10), y0 + 9, k, 'twood2')]
        v += [(x0 + 10, y0 + round(f * 9), k, 'twood2'), (x0 + 10, y0 + 9 - round(f * 9), k, 'twood2')]
    v += box(x0 - 1, x0 + 11, y0 - 1, y0 + 10, 26, 26, 'twood2')
    for x in range(x0 - 1, x0 + 12):
        for y in range(y0 - 1, y0 + 11):
            if x in (x0 - 1, x0 + 11) or y in (y0 - 1, y0 + 10):
                for z in range(27, 31):
                    v.append((x, y, z, ('sb1', 'sb2', 'sb3')[(x + y + z // 2) % 3]))
    for lx, ly in ((x0 - 1, y0 - 1), (x0 + 11, y0 - 1), (x0 - 1, y0 + 10), (x0 + 11, y0 + 10)):
        v += box(lx, lx, ly, ly, 31, 37, 'twood')
    for x in range(x0 - 2, x0 + 13):                                       # corrugated roof
        for y in range(y0 - 2, y0 + 12):
            v.append((x, y, 38, 'roofM' if x % 2 else 'roofM2'))
    for z in range(0, 26):                                                 # ladder on the +y side
        if z % 2 == 0:
            v += [(x0 + 4, y0 + 10, z, 'twood2'), (x0 + 5, y0 + 10, z, 'twood2'), (x0 + 6, y0 + 10, z, 'twood2')]
        v += [(x0 + 3, y0 + 10, z, 'twood'), (x0 + 7, y0 + 10, z, 'twood')]
    v += box(x0 + 3, x0 + 4, y0 + 1, y0 + 2, 31, 32, 'radio')
    v += box(x0 + 11, x0 + 11, y0 + 10, y0 + 10, 39, 52, 'pole')          # flag pole
    return v


def flag(x0, y0, t):
    v = []
    for i in range(10):
        dz = round(math.sin(i * 0.7 - t * 2 * math.pi / NFRAMES) * 1.2 * (i / 9))
        dy = round(math.cos(i * 0.7 - t * 2 * math.pi / NFRAMES) * 0.8 * (i / 9))
        for k in range(6):
            c = 'flagY' if k in (2, 3) else ('flagG' if dz >= 0 else 'flagG2')
            v.append((x0 + 1 + i, y0 + dy, 51 - k + dz, c))
    return v


def camo_net(x0, x1, y0, y1, zt):
    v = []
    for x, y in ((x0, y1), (x1, y1), ((x0 + x1) // 2, y1)):
        v += box(x, x, y, y, 0, zt - 2, 'pole')
    for x in range(x0 - 1, x1 + 2):
        for y in range(y0, y1 + 2):
            z = zt - abs(y - y1) // 3 + (1 if (x - x0) % 12 < 2 else 0) - (y < y0 + 2)
            k = hsh(x, y, 5) % 11
            if k == 0:
                continue                                                  # holes
            v.append((x, y, z, ('net1', 'net2', 'net3')[k % 3]))
            if k in (3, 7):
                v.append((x, y, z - 1, 'net3'))                           # dangling scrim
    return v


def ammo_box(x, y, z=0, along='x'):
    if along == 'x':
        v = box(x, x + 4, y, y + 2, z, z + 2, 'ammo') + [(x + k, y + 2, z + 2, 'ammo2') for k in (1, 3)]
    else:
        v = box(x, x + 2, y, y + 4, z, z + 2, 'ammo') + [(x + 2, y + k, z + 2, 'ammo2') for k in (1, 3)]
    return v


def jerry(x, y):
    return box(x, x + 1, y, y + 2, 0, 3, 'jerry') + [(x, y + 1, 4, 'jerry')]


def burnt_truck(x0, y0):
    """Wrecked cargo truck, nose toward +y. x0..x0+7, y0..y0+22."""
    v = []
    rnd = random.Random(4)
    for y in range(y0, y0 + 23):
        for x in range(x0, x0 + 8):
            v.append((x, y, 2, 'brn'))                                     # chassis
    for y in range(y0, y0 + 14):                                           # cargo bed (walls, partly gone)
        for x in range(x0, x0 + 8):
            for z in range(3, 9):
                side = x in (x0, x0 + 7) or y in (y0, y0 + 13)
                if side and hsh(x, y, z) % 7:
                    v.append((x, y, z, 'brn2' if hsh(x, y, z) % 3 else 'brn3'))
            if hsh(x, y) % 3 == 0:
                v.append((x, y, 3, 'brn'))
    for y in range(y0 + 15, y0 + 23):                                      # cab
        for x in range(x0, x0 + 8):
            for z in range(3, 12):
                if z >= 8 and y > y0 + 20:
                    continue
                shell_ = x in (x0, x0 + 7) or y in (y0 + 15, y0 + 22) or z in (3, 11)
                if shell_:
                    win = 7 <= z <= 10 and (x in (x0, x0 + 7) and y0 + 17 <= y <= y0 + 19)
                    if not win:
                        v.append((x, y, z, 'brn' if (x + z) % 4 else 'brn3'))
    v += box(x0 + 1, x0 + 6, y0 + 23, y0 + 23, 3, 6, 'brn2')              # grille
    for ry in (y0 + 1, y0 + 6, y0 + 12):                                   # burnt canvas ribs
        v += [(x0, ry, z, 'brn2') for z in range(9, 13)] + [(x0 + 7, ry, z, 'brn2') for z in range(9, 13)]
        v += [(x, ry, 13, 'brn3' if x % 3 else 'brn2') for x in range(x0, x0 + 8)]
    v += [(x0 + 7, y, z, 'brn3') for y in range(y0 + 2, y0 + 12) for z in (5, 6) if hsh(y, z) % 3 == 0]
    for wy in (y0 + 3, y0 + 8, y0 + 19):                                   # bare rims
        for x in (x0 - 1, x0 + 8):
            for dy in (-1, 0, 1):
                for z in (0, 1, 2):
                    v.append((x, wy + dy, z, 'rim' if (dy == 0 or z == 1) else 'brn'))
    return v


def drum(x, y, c='drum'):
    v = []
    for z in range(0, 7):
        for dx in range(-1, 2):
            for dy in range(-1, 2):
                v.append((x + dx, y + dy, z, c + '2' if z in (1, 5) else c))
    return v


def hedgehog(x, y):
    """Czech hedgehog: three crossed steel beams."""
    v = line3((x - 3, y - 3, 0), (x + 3, y + 3, 6), 'hh') + line3((x + 3, y - 3, 0), (x - 3, y + 3, 6), 'hh2')
    v += line3((x - 3, y + 3, 0), (x + 3, y - 3, 6), 'hh') + line3((x, y - 4, 3), (x, y + 4, 3), 'hh2')
    return v


def scrub(x, y, s=0):
    v = []
    for k in range(9 + s * 3):
        dx, dy = hsh(x, y, k) % 5 - 2, hsh(y, x, k) % 5 - 2
        dz = (hsh(k, x, y) % 3) if abs(dx) + abs(dy) < 3 else 0
        v.append((x + dx, y + dy, dz, ('scrub', 'scrub2', 'scrubD')[k % 3]))
    return v


def rocks(x, y):
    return [(x, y, 0, 'rock'), (x + 1, y, 0, 'rock2'), (x, y + 1, 0, 'rock2')]


def env():
    v = slab_ground()
    # back edge: HESCO line
    v += hesco(-1, -1, 'x', 15, h=11, w=7)[:]
    v = [p for p in v if not ((p[0] >= 98 or p[0] < 13) and p[1] <= 6 and p[2] >= 0 and p[3].startswith('hes'))]
    v += hesco(-1, 6, 'y', 0)
    # left edge: T-walls then the burnt truck
    v += twall(26, 5, x0=-1, h=16, seg=6)
    v += burnt_truck(0, 0)
    v += drum(5, 26) + drum(5, 30) + drum(3, 28, 'drumR')
    # watchtower (back right) + flag pole
    v += watchtower(100, 0)
    # supply point under camo net (back strip behind no-man's land)
    v += camo_net(44, 82, 0, 9, 20)
    v += ammo_box(48, 2) + ammo_box(48, 2, 3) + ammo_box(54, 3) + jerry(60, 2) + jerry(62, 2) + jerry(61, 6)
    v += box(68, 75, 2, 7, 0, 3, 'twood2') + box(69, 74, 3, 6, 4, 4, 'twood') + box(70, 72, 4, 5, 5, 6, 'radio')
    v += box(79, 79, 1, 1, 0, 44, 'pole') + [(79, 1, 45, 'hesM'), (80, 1, 43, 'hesM'), (78, 1, 43, 'hesM')]   # antenna mast
    # no-man's land (cols 3-4, x 50..77) low cover
    arc = [(57 + round(1.6 * math.cos(a / 10)), 14 + a) for a in range(0, 11)]
    v += sandbags(thick(arc), 3)
    v += box(63, 66, 28, 38, 0, 1, 'tw2') + box(64, 65, 28, 38, 2, 6, 'tw') + [(64, y, 7, 'tw3') for y in range(28, 39)]
    v += [(66, y, 2, 'tw3') for y in range(28, 39, 5)]
    v += sandbags(thick([(60, y) for y in range(43, 53)], (-1, 0)), 2) + sandbags([(61, 52), (62, 52), (63, 52)], 2)
    v += hedgehog(72, 20) + hedgehog(54, 34)
    # scrub + rocks scattered (flat enough to stand on)
    for (x, y, s) in ((14, 4, 1), (36, 50, 0), (90, 30, 1), (114, 44, 0), (26, 24, 0), (84, 55, 1), (3, 26, 1), (122, 10, 0)):
        v += scrub(x, y, s)
    for (x, y) in ((40, 20), (98, 48), (20, 40), (76, 44), (110, 20), (30, 8)):
        v += rocks(x, y)
    return v


def anim(t):
    return flag(111, 10, t)


def anim_fx(t):
    v = []
    # truck smoke: dark puffs rising from the cargo bed, drifting toward +x
    for k in range(6):
        ph = ((k + t / NFRAMES) % 6) / 6.0
        r = 1.4 + ph * 3.4
        cx, cy, cz = 4 + ph * 12, 6 + ph * 3, 9 + ph * 34
        for dx in range(-int(r) - 1, int(r) + 2):
            for dy in range(-int(r) - 1, int(r) + 2):
                for dz in range(-int(r) - 1, int(r) + 2):
                    if dx * dx + dy * dy + dz * dz <= r * r and hsh(dx, dy, dz, k) % 6 > ph * 3:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'smk1' if ph < .3 else ('smk2' if ph < .65 else 'smk3')))
    # dust motes drifting with the wind (+x), looping across the arena
    rnd = random.Random(9)
    for k in range(40):
        x0, y0, z0 = rnd.uniform(0, LX), rnd.uniform(4, LY - 2), rnd.uniform(1, 10)
        ph = (rnd.random() + t / NFRAMES) % 1.0                      # each mote drifts 18 vox per loop, then respawns
        x = (x0 + ph * 18) % LX
        z = z0 + math.sin(t * 2 * math.pi / NFRAMES + k) * 1.5
        v.append((round(x), round(y0), round(z), 'dust'))
        if k % 4 == 0:
            v.append((round(x) + 1, round(y0), round(z), 'dust'))
    return v


def front():
    """Concertina wire along the front-right edge (outside the grid) + a scrub at the front-left corner."""
    v = []
    y = LY - 3
    for x in range(64, LX - 1):
        a = (x - 64) * 0.9
        if x % 3:
            v.append((x, y + round(1.6 * math.cos(a)), 2 + round(1.8 * math.sin(a)), 'wireC' if x % 2 else 'wireC2'))
    for x in range(64, LX - 1, 14):
        v += [(x, y, z, 'hh2') for z in range(0, 4)]
    v += scrub(4, LY - 3, 2)
    return v


def look(t):
    amb = ((1.18, 1.10, 0.96), (0.95, 0.88, 0.80), (0.66, 0.64, 0.68))
    return Look(amb, [], shadow=(0.55, 0.32, 14), shadow_k=0.66, ao_k=0.8, glow=0.6)
