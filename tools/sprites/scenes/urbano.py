"""URBANO: night alley (brick, fire escape with windows behind each landing, neon BAR sign over the door, dumpster,
puddles reflecting neon, steam vent). Ambient loop: neon flicker + reflections, steam, window flicker.

Scale 10 voxels = 1 m (common.M): 3-storey walls (24 per storey), door 10x22, windows 12x14, dumpster 20 long,
rails at 10, lamp post 48. A person (18 tall) stands in a 28-voxel cell."""
import math, random
from common import *

NAME, FPS, NFRAMES = 'urbano', 6, 6
BG = (12, 13, 20)
WH = 72                                   # 3 storeys
STOREY = 24

PAL.update({'puddleP': (190, 70, 170), 'puddleB': (70, 170, 210), 'puddleD': (36, 46, 66), 'grate': (36, 38, 42),
            'sign': (34, 30, 40), 'elec': (110, 116, 100), 'elec2': (84, 90, 76), 'ac': (150, 154, 156), 'ac2': (116, 120, 124),
            'cone': (240, 120, 30), 'pallet': (128, 98, 64)})
REFLECT |= {'asf', 'asf2', 'asf3', 'puddleD'}
MIRROR = {'puddleD': 0.8, 'asf': 0.10, 'asf2': 0.10, 'asf3': 0.10, 'crack': 0.05}
FX_ALPHA = 0.55

PUDDLES = [(102, 58, 8), (44, 102, 6), (216, 40, 6), (176, 94, 6), (36, 12, 4)]
VENT = (84, 96, 8, 20)                    # grate x0, x1, y0, y1 (steam rises from its centre)
DOOR_X = 40
FE_X = 150                                # fire escape


def in_puddle(x, y):
    for cx, cy, r in PUDDLES:
        if ((x - cx) / 1.6) ** 2 + (y - cy) ** 2 <= r * r:
            return True
    return False


def ground_top(x, y):
    if in_puddle(x, y):
        return 'puddleD'
    c = ('asf', 'asf2', 'asf3')[(x * 7 + y * 13 + (x * y) % 5) % 3]
    if VENT[0] <= x <= VENT[1] and VENT[2] <= y <= VENT[3]:
        c = 'grate' if (x + y) % 2 else 'metal2'
    return c


def brick(i, z, seed):
    """Running bond, 4 voxels long x 2 high with 1-voxel mortar (a brick ~0.25 x 0.1 m at this scale)."""
    row = z // 2
    if z % 2 == 1 or (i + (row % 2) * 2) % 4 == 0:
        return 'mortar'
    return ('brk1', 'brk2', 'brk3', 'brk1')[(i // 4 * 5 + row * 3 + seed + (hsh(i, z) % 7 == 0)) % 4]


def walls():
    v = [(x, -1, z, brick(x, z, 0)) for x in range(-1, LX) for z in range(0, WH)]
    v += [(-1, y, z, brick(y, z, 1)) for y in range(0, LY) for z in range(0, WH)]
    v += box(-2, LX - 1, -2, -1, WH, WH + 1, 'conc') + box(-2, -1, -2, LY - 1, WH, WH + 1, 'conc')     # cornice
    v += [(x, 0, WH - 1, 'conc2') for x in range(0, LX)] + [(0, y, WH - 1, 'conc2') for y in range(0, LY)]
    for zf in (STOREY, 2 * STOREY):                                                                 # storey bands
        v += [(x, 0, zf, 'conc2') for x in range(0, LX)] + [(0, y, zf, 'conc2') for y in range(0, LY)]
    return v


def window_back(x, z, lit):
    """Window on the back wall (face +y): sill at z-1, opening 12 wide x 14 tall, 4 panes."""
    c = 'winL' if lit else 'winD'
    v = box(x - 1, x + 12, 0, 0, z - 1, z - 1, 'conc') + box(x - 1, x + 12, 1, 1, z - 1, z - 1, 'conc2')   # sill sticks out
    v += box(x - 1, x + 12, 0, 0, z + 14, z + 14, 'conc2')
    v += box(x, x + 11, 0, 0, z, z + 13, c)
    v += [(x + 5, 0, zz, 'metal2') for zz in range(z, z + 14)] + [(x + 6, 0, zz, 'metal2') for zz in range(z, z + 14)]
    v += [(xx, 0, z + 7, 'metal2') for xx in range(x, x + 12)]
    return v


def window_left(y, z, lit):
    c = 'winL2' if lit else 'winD'
    v = box(0, 0, y - 1, y + 12, z - 1, z - 1, 'conc') + box(1, 1, y - 1, y + 12, z - 1, z - 1, 'conc2')
    v += box(0, 0, y - 1, y + 12, z + 14, z + 14, 'conc2')
    v += box(0, 0, y, y + 11, z, z + 13, c)
    v += [(0, y + 5, zz, 'metal2') for zz in range(z, z + 14)] + [(0, y + 6, zz, 'metal2') for zz in range(z, z + 14)]
    v += [(0, yy, z + 7, 'metal2') for yy in range(y, y + 12)]
    return v


def fire_escape(x0, levels=(STOREY, 2 * STOREY), lit=(True, False)):
    """Landings at each upper storey floor, 26 long x 8 deep, rail at 1 m (10), window behind each landing,
    stair between landings, retracted drop ladder ending ~1.4 m above the ground."""
    v = []
    for i, z in enumerate(levels):
        v += window_back(x0 + 7, z + 8, lit[i])
        v += box(x0, x0 + 25, 1, 8, z, z, 'metal2')
        v += [(xx, 8, z + 10, 'metal') for xx in range(x0, x0 + 26)]                         # top rail
        v += [(xx, 8, z + 5, 'metal2') for xx in range(x0, x0 + 26)]                        # mid rail
        v += [(xx, 8, z + k, 'metal') for xx in range(x0, x0 + 26, 4) for k in range(1, 10)]  # balusters
        v += [(x0, y, z + 10, 'metal') for y in range(1, 9)] + [(x0 + 25, y, z + 10, 'metal') for y in range(1, 9)]
        v += [(x0 + 1, 1, z - k, 'metal') for k in range(1, 4)] + [(x0 + 24, 1, z - k, 'metal') for k in range(1, 4)]  # brackets
        v += [(x0 + 1 + k, 1, z - 4 + k, 'metal') for k in range(4)] + [(x0 + 24 - k, 1, z - 4 + k, 'metal') for k in range(4)]
        if i + 1 < len(levels):
            dz = levels[i + 1] - z
            for k in range(dz):                                                             # stair up to the next landing
                xx = x0 + 22 - int(k * 18 / dz)
                v += [(xx, 3, z + 1 + k, 'metal'), (xx, 4, z + 1 + k, 'metal2'), (xx, 5, z + 1 + k, 'metal2'),
                      (xx, 6, z + 1 + k, 'metal'), (xx, 6, z + 9 + k, 'metal')]
    for z in range(14, levels[0]):                                                          # drop ladder (retracted)
        v += [(x0 + 3, 6, z, 'metal'), (x0 + 7, 6, z, 'metal')]
        if z % 3 == 0:
            v += [(x0 + 4, 6, z, 'metal2'), (x0 + 5, 6, z, 'metal2'), (x0 + 6, 6, z, 'metal2')]
    return v


def door(x):
    """Steel door 10 wide x 22 tall in a concrete frame, canopy at 2.5 m with a bulb, one step."""
    v = box(x - 2, x + 11, 0, 0, 0, 23, 'conc') + box(x, x + 9, 0, 0, 0, 21, 'rust')
    v += box(x, x + 9, 1, 1, 0, 21, 'rust')
    v += [(x + 8, 2, 10, 'metal'), (x + 8, 2, 11, 'metal'), (x + 7, 2, 11, 'metal')]          # handle at ~1 m
    v += [(x + k, 1, 12, 'wood2') for k in range(0, 10, 2)] + [(x + k, 1, 4, 'wood2') for k in range(1, 10, 3)]
    v += box(x - 2, x + 11, 1, 6, 25, 25, 'metal2') + box(x - 2, x + 11, 6, 6, 24, 24, 'metal')         # canopy
    v += [(x + 4, 3, 24, 'bulb'), (x + 5, 3, 24, 'bulb'), (x + 4, 4, 24, 'bulb'), (x + 5, 4, 24, 'bulb')]
    v += [(x - 1, k, 25 + k // 2, 'metal') for k in range(1, 6)] + [(x + 10, k, 25 + k // 2, 'metal') for k in range(1, 6)]
    v += box(x - 1, x + 10, 1, 4, 0, 1, 'conc2')                                              # step (0.2 m)
    return v


FONT5 = {'B': ['110', '101', '110', '101', '110'], 'A': ['010', '101', '111', '101', '101'],
         'R': ['110', '101', '110', '101', '101']}


def wall_neon(x0, z0, on, cyan_on):
    """'BAR' neon on the back wall above the door (3x5 font at 3x: letters 9 x 15), cyan tube frame."""
    v = box(x0 - 3, x0 + 35, 1, 1, z0 - 3, z0 + 17, 'sign')
    v += [(x0 - 3, 1, z, 'metal') for z in range(z0 - 3, z0 + 18, 5)] + [(x0 + 35, 1, z, 'metal') for z in range(z0 - 3, z0 + 18, 5)]
    for i, ch in enumerate('BAR'):
        for r, row in enumerate(FONT5[ch]):
            for c, bit in enumerate(row):
                if bit == '1':
                    for a in range(3):
                        for bb in range(3):
                            v.append((x0 + 1 + i * 12 + c * 3 + a, 2, z0 + 14 - r * 3 - bb, 'neonP' if on else 'neonOff'))
    cc = 'neonB' if cyan_on else 'neonOff'
    v += [(x, 2, z0 - 2, cc) for x in range(x0 - 2, x0 + 35)] + [(x, 2, z0 + 16, cc) for x in range(x0 - 2, x0 + 35)]
    v += [(x0 - 2, 2, z, cc) for z in range(z0 - 2, z0 + 17)] + [(x0 + 34, 2, z, cc) for z in range(z0 - 2, z0 + 17)]
    return v


def graffiti_back(x0, z0, w=30, seed=1):
    rnd = random.Random(seed); v = []
    for k in range(300):
        x = x0 + rnd.randint(0, w); z = z0 + int(7 + 6 * math.sin((x - x0) / 4.5 + seed)) + rnd.randint(-2, 2)
        v.append((x, 0, z, ('g1', 'g2', 'g3', 'g4')[(k // 20 + seed) % 4]))
    return v


def graffiti_left(y0, z0, w=28, seed=2):
    rnd = random.Random(seed); v = []
    for k in range(240):
        y = y0 + rnd.randint(0, w); z = z0 + int(6 + 5 * math.cos((y - y0) / 4.0)) + rnd.randint(-2, 2)
        v.append((0, y, z, ('g3', 'g2', 'g4', 'g1')[(k // 18) % 4]))
    return v


def pipes():
    v = [(140, 1, z, 'metal') for z in range(0, WH)] + [(141, 1, z, 'metal') for z in range(0, WH)]
    v += [(140, 2, z, 'metal2') for z in range(0, WH, 10)] + [(141, 2, z, 'metal2') for z in range(0, WH, 10)]   # clamps
    v += [(x, 1, 62, 'metal') for x in range(96, 142)] + [(96, 1, z, 'metal') for z in range(50, 63)]
    v += box(108, 116, 1, 6, 40, 46, 'ac') + box(108, 116, 1, 6, 47, 47, 'ac2')                           # AC unit
    v += [(x, 7, z, 'metal2') for x in range(109, 116, 2) for z in range(41, 46)] + [(112, 7, 39, 'wire'), (112, 6, 38, 'wire')]
    v += box(0, 2, 80, 88, 14, 28, 'elec') + box(2, 2, 81, 87, 15, 27, 'elec2') + [(1, 84, z, 'wire') for z in range(29, WH)]
    v += [(2, 82, 21, 'metal'), (2, 86, 21, 'metal')]
    return v


def dumpster(x, y):
    """Commercial dumpster: 20 long x 10 deep x 12 high (2 x 1 x 1.2 m), split lid, side pockets, wheels."""
    v = box(x, x + 19, y, y + 9, 1, 11, 'dump') + box(x - 1, x + 20, y - 1, y + 10, 12, 12, 'dump2')
    v += [(x + 9, y + k, 13, 'dump2') for k in range(0, 10)]                                  # lid split
    v += [(x + 3, y + 10, z, 'dump2') for z in range(3, 10)] + [(x + 16, y + 10, z, 'dump2') for z in range(3, 10)]
    v += [(x + k, y + 10, 11, 'dump2') for k in range(0, 20, 2)] + [(x + 20, y + k, 11, 'dump2') for k in range(0, 10, 2)]
    v += [(x + 20, y + 3, z, 'dump2') for z in range(4, 8)] + [(x + 20, y + 6, z, 'dump2') for z in range(4, 8)]
    for wx, wy in ((x + 1, y + 1), (x + 18, y + 1), (x + 1, y + 8), (x + 18, y + 8)):
        v += [(wx, wy, 0, 'tire')]
    return v


def bags(x, y, s=0):
    """Two trash bags (~0.6 m) leaning together."""
    v = box(x, x + 5, y, y + 4, 0, 3, 'bag') + box(x + 1, x + 4, y + 1, y + 3, 4, 4, 'bag2') + [(x + 2, y + 2, 5, 'bag'), (x + 3, y + 2, 6, 'bag2')]
    v += box(x + 6, x + 9, y + 2, y + 6, 0, 2, 'bag2') + box(x + 7, x + 8, y + 3, y + 5, 3, 3, 'bag') + [(x + 7, y + 4, 4, 'bag2')]
    return v


def crate(x, y, z, s=8):
    v = box(x, x + s - 1, y, y + s - 1, z, z + s - 1, 'wood')
    v += [(x + s - 1, y + k, z + k, 'wood2') for k in range(s)] + [(x + k, y + s - 1, z + s - 1 - k, 'wood2') for k in range(s)]
    v += [(x + k, y + s - 1, z, 'wood2') for k in range(s)] + [(x + s - 1, y + k, z + s - 1, 'wood2') for k in range(s)]
    v += [(x + k, y + s - 1, z + s - 1, 'wood2') for k in range(s)] + [(x + s - 1, y + k, z, 'wood2') for k in range(s)]
    return v


def barrel(x, y, h=9):
    """55-gallon drum: ~0.6 m across, 0.9 m tall, two rolling hoops."""
    v = []
    for z in range(0, h):
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                if dx * dx + dy * dy <= 10:
                    v.append((x + dx, y + dy, z, 'barrel2' if z in (2, h - 3, h - 1) else 'barrel'))
    return v


def tires(x, y, n=3):
    """Stack of car tyres (0.65 m across, 0.2 m each)."""
    v = []
    for k in range(n * 2):
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                d = dx * dx + dy * dy
                if 3 <= d <= 11:
                    v.append((x + dx, y + dy, k, 'tire'))
    return v


def jersey(x, y0, y1):
    """Concrete jersey barrier: 0.8 m tall, 0.6 m base tapering to 0.2 m."""
    v = box(x - 2, x + 3, y0, y1, 0, 2, 'conc') + box(x - 1, x + 2, y0, y1, 3, 5, 'conc') + box(x, x + 1, y0, y1, 6, 8, 'conc')
    v += [(x + 3, y, 2, 'conc2') for y in range(y0, y1 + 1)] + [(x + 2, y, 5, 'conc2') for y in range(y0, y1 + 1)]
    v += [(x + 1, y, 9, 'conc2') for y in range(y0, y1 + 1, 3)]
    v += [(x + 2, y, 4, 'stripe') for y in range(y0, y1 + 1) if (y // 3) % 2 == 0]
    return v


def pallet(x, y):
    """Wooden pallet 1.2 x 1.0 m, 0.15 m tall."""
    v = box(x, x + 11, y, y + 9, 0, 0, 'wood2')
    v += [(x + k, y + j, 1, 'pallet') for k in range(12) for j in range(10) if j % 3 != 2]
    return v


def cone(x, y):
    v = box(x - 2, x + 2, y - 2, y + 2, 0, 0, 'cone') + box(x - 1, x + 1, y - 1, y + 1, 1, 3, 'cone')
    v += [(x, y, z, 'cone' if z != 5 else 'steam') for z in range(4, 8)]
    return v


def env():
    v = floor_slab(ground_top)
    v += [(x, y, -1, 'crack') for x, y in crack_pts()]
    v += [(x, LY - 5, -1, 'stripe') for x in range(4, LX - 4) if x % 8 < 4]                  # faded curb line
    v += walls()
    # back wall: door + BAR sign, windows on storeys 2-3, fire escape, pipes, graffiti
    v += door(DOOR_X) + graffiti_back(64, 4, 30, 3) + graffiti_back(206, 6, 26, 5) + pipes()
    v += window_back(14, 32, True) + window_back(70, 56, False) + window_back(196, 34, True) + window_back(222, 58, False)
    v += window_back(14, 56, False) + window_back(100, 32, False)
    v += fire_escape(FE_X)
    # left wall
    v += window_left(30, 34, False) + window_left(56, 58, True) + window_left(96, 34, True) + graffiti_left(44, 4, 28, 7)
    v += [(0, 66, 28, 'bulb'), (1, 66, 28, 'bulb'), (1, 67, 28, 'bulb'), (1, 66, 29, 'metal2'), (2, 66, 29, 'metal2')]  # sconce
    # back strip (behind the grid): dumpster, bags, pallet + crate, vent posts
    v += dumpster(196, 4) + bags(222, 6) + bags(172, 12) + pallet(4, 4) + crate(6, 5, 1, 8) + barrel(26, 14, 9)
    v += box(VENT[0] - 1, VENT[0] - 1, VENT[2] - 1, VENT[2] - 1, 0, 5, 'metal') + box(VENT[1] + 1, VENT[1] + 1, VENT[2] - 1, VENT[2] - 1, 0, 5, 'metal')
    # combat grid (all 8 columns): no props, only flat floor detail -- units stand and walk anywhere on it
    v += box(X0 + 3 * CELL + 6, X0 + 3 * CELL + 10, Y0 + 40, Y0 + 42, 0, 0, 'conc2')   # flat debris
    return v


def crack_pts():
    rnd = random.Random(11); pts = []
    for _ in range(30):
        x, y = rnd.randint(4, LX - 6), rnd.randint(2, LY - 4)
        for k in range(rnd.randint(8, 18)):
            x += rnd.choice((-1, 0, 1)); y += rnd.choice((0, 1, 1))
            pts.append((x, y))
    return [(x, y) for x, y in pts if 0 <= x < LX and 0 <= y < LY]


NEON = [1, 1, 0, 1, 1, 1]          # pink BAR state per frame (one drop-out)
CYAN = [1, 0, 1, 1, 0, 1]


def puddles(t):
    on, cy = NEON[t], CYAN[t]
    v = []
    for cx, cyy, r in PUDDLES:
        for x in range(int(cx - r * 1.6) - 1, int(cx + r * 1.6) + 2):
            for y in range(cyy - r, cyy + r + 1):
                if ((x - cx) / 1.6) ** 2 + (y - cyy) ** 2 <= r * r:
                    k = (x * 3 + y * 5 + t) % 9
                    c = 'puddleD'
                    if k == 0 and on:
                        c = 'puddleP'
                    elif k == 4 and cy and cx < 140:
                        c = 'puddleB'
                    v.append((x, y, -1, c))
    return v


def anim_fx(t):
    return steam(t)


def steam(t):
    v = []
    cx0, cy0 = (VENT[0] + VENT[1]) / 2, (VENT[2] + VENT[3]) / 2
    for k in range(6):
        ph = ((k + t / NFRAMES) % 6) / 6.0          # 6 puffs, each advances one slot per loop
        cz = 2 + ph * 50
        r = 3.0 + ph * 6.0
        cx = cx0 + math.sin(ph * 6 + k) * 3 + ph * 12
        cy = cy0 + ph * 4
        for dx in range(-int(r) - 1, int(r) + 2):
            for dy in range(-int(r) - 1, int(r) + 2):
                for dz in range(-int(r * .6) - 1, int(r * .6) + 2):
                    if dx * dx + dy * dy + (dz / .6) ** 2 <= r * r and hsh(dx, dy, dz, k) % 7 > 1 + ph * 4:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'steam' if ph < .35 else ('steam2' if ph < .7 else 'steam3')))
    return v


WIN_FLICK = [1, 1, 1, 1, 0, 1]


def anim(t):
    v = wall_neon(DOOR_X - 8, 30, NEON[t], CYAN[t])
    if not WIN_FLICK[t]:
        v += window_back(196, 34, False)
    return v


def front():
    """Street lamp (4.8 m) at the front-left corner + hydrant (0.7 m) at the front-right corner, outside the grid."""
    x, y = 4, LY - 6
    v = box(x, x + 1, y, y + 1, 0, 48, 'lampP') + box(x - 1, x + 2, y - 1, y + 2, 0, 2, 'lampP')
    v += [(xx, y, 48, 'lampP') for xx in range(x, x + 16)] + box(x + 13, x + 16, y - 1, y + 1, 47, 47, 'lampP')
    v += [(x + 14, y, 46, 'lamp'), (x + 15, y, 46, 'lamp'), (x + 14, y - 1, 46, 'lamp'), (x + 15, y - 1, 46, 'lamp')]
    hx, hy = LX - 8, LY - 8
    v += box(hx, hx + 2, hy, hy + 2, 0, 6, 'hyd') + box(hx - 1, hx + 3, hy, hy + 2, 3, 3, 'hyd2') + box(hx, hx + 2, hy, hy + 2, 7, 7, 'hyd2')
    v += [(hx + 1, hy + 1, 8, 'hyd2')]
    return v


def look(t):
    on = NEON[t]
    L = [Light((DOOR_X + 5, 4, 23), (1.0, 0.82, 0.5), 1.25, 48),
         Light((2, 66, 28), (1.0, 0.8, 0.5), 0.9, 40),
         Light((19, LY - 6, 46), (0.8, 0.86, 1.0), 1.0, 90),
         Light((202, 3, 40), (1.0, 0.75, 0.45), 0.45, 44),
         Light((20, 3, 38), (1.0, 0.75, 0.45), 0.45, 40)]
    if on:
        L.append(Light((DOOR_X + 9, 8, 38), (1.0, 0.3, 0.8), 1.2, 84))
    if CYAN[t]:
        L.append(Light((DOOR_X + 9, 8, 30), (0.3, 0.85, 1.0), 0.5, 46))
    amb = ((0.80, 0.82, 0.98), (0.70, 0.71, 0.86), (0.52, 0.53, 0.68))
    return Look(amb, L, shadow=(0.18, 0.12, 16), shadow_k=0.72, glow=0.75)
