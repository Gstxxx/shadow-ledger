"""URBANO: night alley (brick, fire escape with windows behind each landing, neon BAR blade sign, dumpster,
puddles reflecting neon, steam vent). Ambient loop: neon flicker + reflections, steam, window flicker."""
import math, random
from common import *

NAME, FPS, NFRAMES = 'urbano', 6, 6
BG = (12, 13, 20)
WH = 54

PAL.update({'puddleP': (190, 70, 170), 'puddleB': (70, 170, 210), 'puddleD': (36, 46, 66), 'grate': (36, 38, 42),
            'sign': (34, 30, 40), 'elec': (110, 116, 100), 'elec2': (84, 90, 76), 'ac': (150, 154, 156), 'ac2': (116, 120, 124),
            'cone': (240, 120, 30), 'pallet': (128, 98, 64)})
REFLECT |= {'asf', 'asf2', 'asf3', 'puddleD'}
MIRROR = {'puddleD': 0.8, 'asf': 0.10, 'asf2': 0.10, 'asf3': 0.10, 'crack': 0.05}
FX_ALPHA = 0.55

PUDDLES = [(51, 29, 4), (22, 51, 3), (108, 18, 3), (86, 46, 3), (18, 6, 2)]


def in_puddle(x, y):
    for cx, cy, r in PUDDLES:
        if ((x - cx) / 1.6) ** 2 + (y - cy) ** 2 <= r * r:
            return True
    return False


def ground_top(x, y):
    if in_puddle(x, y):
        return 'puddleD'
    c = ('asf', 'asf2', 'asf3')[(x * 7 + y * 13 + (x * y) % 5) % 3]
    if 41 <= x <= 46 and 4 <= y <= 9:
        c = 'grate' if (x + y) % 2 else 'metal2'
    return c


def brick(i, z, seed):
    row = z // 2
    if z % 2 == 1 or (i + (row % 2) * 2) % 4 == 0:
        return 'mortar'
    return ('brk1', 'brk2', 'brk3', 'brk1')[(i // 4 * 5 + row * 3 + seed + (hsh(i, z) % 7 == 0)) % 4]


def walls():
    v = [(x, -1, z, brick(x, z, 0)) for x in range(-1, LX) for z in range(0, WH)]
    v += [(-1, y, z, brick(y, z, 1)) for y in range(0, LY) for z in range(0, WH)]
    v += box(-2, LX - 1, -2, -1, WH, WH, 'conc') + box(-2, -1, -2, LY - 1, WH, WH, 'conc')
    v += [(x, 0, WH - 1, 'conc2') for x in range(0, LX)] + [(0, y, WH - 1, 'conc2') for y in range(0, LY)]
    return v


def window_back(x, z, lit):
    """Window on the back wall (face +y), sill at z-1, 6 wide x 7 tall."""
    c = 'winL' if lit else 'winD'
    v = box(x - 1, x + 6, 0, 0, z - 1, z - 1, 'conc') + box(x - 1, x + 6, 0, 0, z + 7, z + 7, 'conc2')
    v += box(x, x + 5, 0, 0, z, z + 6, c)
    v += [(x + 2, 0, zz, 'metal2') for zz in range(z, z + 7)] + [(xx, 0, z + 3, 'metal2') for xx in range(x, x + 6)]
    return v


def window_left(y, z, lit):
    c = 'winL2' if lit else 'winD'
    v = box(0, 0, y - 1, y + 6, z - 1, z - 1, 'conc') + box(0, 0, y - 1, y + 6, z + 7, z + 7, 'conc2')
    v += box(0, 0, y, y + 5, z, z + 6, c)
    v += [(0, y + 3, zz, 'metal2') for zz in range(z, z + 7)] + [(0, yy, z + 3, 'metal2') for yy in range(y, y + 6)]
    return v


def fire_escape(x0, levels=(14, 26, 38), lit=(True, False, True)):
    """Landings exactly at the sill of a window centred behind each landing; stairs link landings."""
    v = []
    for i, z in enumerate(levels):
        v += window_back(x0 + 5, z + 1, lit[i])
        v += box(x0, x0 + 15, 1, 5, z, z, 'metal2')
        v += [(xx, 5, z + 3, 'metal') for xx in range(x0, x0 + 16)]                      # top rail
        v += [(xx, 5, z + k, 'metal') for xx in range(x0, x0 + 16, 3) for k in (1, 2)]  # balusters
        v += [(x0, y, z + 3, 'metal') for y in range(1, 6)] + [(x0 + 15, y, z + 3, 'metal') for y in range(1, 6)]
        v += [(x0 + 1, 1, z - 1, 'metal'), (x0 + 14, 1, z - 1, 'metal'), (x0 + 1, 1, z - 2, 'metal')]   # brackets
        if i + 1 < len(levels):
            dz = levels[i + 1] - z
            for k in range(dz):                                                         # stair up to the next landing
                xx = x0 + 14 - int(k * 12 / dz)
                v += [(xx, 3, z + 1 + k, 'metal'), (xx, 4, z + 1 + k, 'metal2'), (xx, 5, z + 3 + k, 'metal')]
    v += [(x0 + 2, 4, z, 'metal') for z in range(4, levels[0])] + [(x0 + 4, 4, z, 'metal') for z in range(4, levels[0])]
    v += [(x0 + 3, 4, z, 'metal2') for z in range(4, levels[0], 2)]                    # drop ladder
    return v


def door(x):
    v = box(x - 1, x + 7, 0, 0, 0, 16, 'conc') + box(x, x + 6, 0, 0, 0, 14, 'rust')
    v += [(x + 5, 1, 7, 'metal'), (x + 5, 1, 8, 'metal')] + [(x + k, 0, 7, 'wood2') for k in range(0, 7, 2)]
    v += box(x, x + 6, 1, 4, 17, 17, 'metal2') + [(x + 3, 2, 16, 'bulb'), (x + 3, 3, 16, 'bulb')]   # canopy + bulb
    v += box(x + 1, x + 5, 1, 2, -0, 0, 'conc2')                                                     # step
    return v


FONT5 = {'B': ['110', '101', '110', '101', '110'], 'A': ['010', '101', '111', '101', '101'],
         'R': ['110', '101', '110', '101', '101']}


def wall_neon(x0, z0, on, cyan_on):
    """'BAR' neon on the back wall above the door (2x scaled 3x5 font), cyan tube frame."""
    v = box(x0 - 2, x0 + 24, 1, 1, z0 - 2, z0 + 11, 'sign')
    v += [(x0 - 2, 1, z, 'metal') for z in range(z0 - 2, z0 + 12, 4)] + [(x0 + 24, 1, z, 'metal') for z in range(z0 - 2, z0 + 12, 4)]
    for i, ch in enumerate('BAR'):
        for r, row in enumerate(FONT5[ch]):
            for c, bit in enumerate(row):
                if bit == '1':
                    for a in (0, 1):
                        for bb in (0, 1):
                            v.append((x0 + i * 8 + c * 2 + a, 2, z0 + 9 - r * 2 - bb, 'neonP' if on else 'neonOff'))
    cc = 'neonB' if cyan_on else 'neonOff'
    v += [(x, 2, z0 - 1, cc) for x in range(x0 - 1, x0 + 24)] + [(x, 2, z0 + 11, cc) for x in range(x0 - 1, x0 + 24)]
    return v


def blade_sign(x, z0, on, cyan_on):
    """Vertical blade sign projecting from the back wall; letters face +x (readable from the camera)."""
    v = box(x, x, 1, 7, z0 - 1, z0 + 19, 'sign') + [(x, 0, z0 + 6, 'metal'), (x, 0, z0 + 14, 'metal')]
    for i, ch in enumerate('BAR'):
        for r, row in enumerate(FONT5[ch]):
            for c, bit in enumerate(row):
                if bit == '1':
                    v.append((x + 1, 5 - c, z0 + 17 - i * 6 - r, 'neonP' if on else 'neonOff'))
    v += [(x + 1, y, z0 - 1, 'neonB' if cyan_on else 'neonOff') for y in range(1, 8)]
    v += [(x + 1, 7, z, 'neonB' if cyan_on else 'neonOff') for z in range(z0 - 1, z0 + 20)]
    return v


def graffiti_back(x0, z0, w=18, seed=1):
    rnd = random.Random(seed); v = []
    for k in range(110):
        x = x0 + rnd.randint(0, w); z = z0 + int(4 + 3 * math.sin((x - x0) / 2.5 + seed)) + rnd.randint(-1, 1)
        v.append((x, 0, z, ('g1', 'g2', 'g3', 'g4')[(k // 9 + seed) % 4]))
    return v


def graffiti_left(y0, z0, w=16, seed=2):
    rnd = random.Random(seed); v = []
    for k in range(90):
        y = y0 + rnd.randint(0, w); z = z0 + int(3 + 3 * math.cos((y - y0) / 2.2)) + rnd.randint(-1, 1)
        v.append((0, y, z, ('g3', 'g2', 'g4', 'g1')[(k // 8) % 4]))
    return v


def pipes():
    v = [(76, 1, z, 'metal') for z in range(0, WH)] + [(76, 2, z, 'metal2') for z in range(0, WH, 7)]
    v += [(x, 1, 32, 'metal') for x in range(50, 77)] + [(50, 1, z, 'metal') for z in range(24, 33)]
    v += box(62, 66, 1, 4, 22, 25, 'ac') + box(62, 66, 1, 4, 26, 26, 'ac2') + [(64, 5, 24, 'metal2'), (65, 5, 23, 'wire')]
    v += box(0, 1, 40, 44, 10, 17, 'elec') + box(1, 1, 41, 43, 11, 16, 'elec2') + [(1, 42, z, 'wire') for z in range(18, WH)]
    return v


def dumpster(x, y):
    v = box(x, x + 11, y, y + 6, 0, 7, 'dump') + box(x - 1, x + 12, y - 1, y + 7, 8, 8, 'dump2')
    v += [(x + 2, y + 7, 4, 'dump2'), (x + 9, y + 7, 4, 'dump2')]
    v += [(x + k, y + 7, 7, 'dump2') for k in range(0, 12, 2)] + [(x + 12, y + k, 7, 'dump2') for k in range(0, 7, 2)]
    v += [(x, y + 7, 0, 'wire'), (x + 11, y + 7, 0, 'wire'), (x + 12, y, 0, 'wire'), (x + 12, y + 6, 0, 'wire')]
    return v


def bags(x, y, s=0):
    v = box(x, x + 3, y, y + 2, 0, 1, 'bag') + box(x + 1, x + 2, y, y + 2, 2, 2, 'bag2') + [(x + 2, y + 1, 3, 'bag')]
    v += box(x + 4, x + 5, y + 1, y + 3, 0, 1, 'bag2') + [(x + 4, y + 2, 2, 'bag')]
    return v


def crate(x, y, z, s=4):
    v = box(x, x + s - 1, y, y + s - 1, z, z + s - 1, 'wood')
    v += [(x + s - 1, y + k, z + k, 'wood2') for k in range(s)] + [(x + k, y + s - 1, z + s - 1 - k, 'wood2') for k in range(s)]
    v += [(x + k, y + s - 1, z, 'wood2') for k in range(s)] + [(x + s - 1, y + k, z + s - 1, 'wood2') for k in range(s)]
    return v


def barrel(x, y, h=7):
    v = []
    for z in range(0, h):
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                if dx * dx + dy * dy <= 5:
                    v.append((x + dx, y + dy, z, 'barrel2' if z in (1, h - 2) else 'barrel'))
    return v


def tires(x, y):
    v = []
    for k in range(3):
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                d = dx * dx + dy * dy
                if 2 <= d <= 6:
                    v.append((x + dx, y + dy, k, 'tire'))
    return v


def jersey(x, y0, y1):
    v = box(x - 1, x + 2, y0, y1, 0, 1, 'conc') + box(x, x + 1, y0, y1, 2, 5, 'conc')
    v += [(x + 2, y, 2, 'conc2') for y in range(y0, y1 + 1)] + [(x, y, 6, 'conc2') for y in range(y0, y1 + 1, 2)]
    v += [(x + 2, y, 3, 'stripe') for y in range(y0, y1 + 1) if (y // 2) % 2 == 0]
    return v


def pallet(x, y):
    return box(x, x + 6, y, y + 5, 0, 0, 'wood2') + [(x + k, y + j, 1, 'pallet') for k in range(7) for j in range(6) if j % 2 == 0]


def env():
    v = floor_slab(ground_top)
    v += [(x, y, -1, 'crack') for x, y in crack_pts()]
    v += [(x, LY - 3, -1, 'stripe') for x in range(2, LX - 2) if x % 4 < 2]                  # faded curb line
    v += walls()
    v += window_back(8, 30, True) + window_back(54, 40, False) + window_back(104, 34, True)
    v += fire_escape(84)
    v += door(22) + graffiti_back(34, 4, 16, 3) + graffiti_back(108, 6, 12, 5) + pipes()
    v += window_left(18, 28, False) + window_left(46, 30, True) + graffiti_left(24, 4, 14, 7)
    v += [(0, 30, 22, 'bulb'), (1, 30, 22, 'bulb'), (1, 30, 23, 'metal2')]                  # left wall sconce
    # back strip (behind the grid) props
    v += dumpster(96, 2) + bags(110, 3) + bags(88, 7) + pallet(2, 2) + crate(3, 2, 2, 4)
    v += box(40, 40, 2, 2, 0, 3, 'metal') + box(47, 47, 2, 2, 0, 3, 'metal')               # vent posts
    # no-man's land cover (cols 3-4, x 50..77), all kept low (<= 8 voxels)
    v += crate(55, 15, 0, 5) + crate(60, 15, 0, 5) + crate(57, 20, 0, 5) + crate(57, 16, 5, 4)
    v += jersey(64, 28, 38)
    v += bags(52, 44) + tires(70, 48) + barrel(60, 49, 7)
    v += box(54, 56, 30, 31, 0, 0, 'conc2') + [(55, 33, 0, 'conc2')]                     # debris
    return v


def crack_pts():
    rnd = random.Random(11); pts = []
    for _ in range(14):
        x, y = rnd.randint(4, LX - 6), rnd.randint(2, LY - 4)
        for k in range(rnd.randint(5, 11)):
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
                    elif k == 4 and cy and cx < 70:
                        c = 'puddleB'
                    v.append((x, y, -1, c))
    return v


def anim_fx(t):
    return steam(t)


def steam(t):
    v = []
    for k in range(6):
        ph = ((k + t / NFRAMES) % 6) / 6.0          # 6 puffs, each advances one slot per loop
        cz = 1 + ph * 26
        r = 1.6 + ph * 3.2
        cx = 44 + math.sin(ph * 6 + k) * 1.5 + ph * 6
        cy = 6 + ph * 2
        for dx in range(-int(r) - 1, int(r) + 2):
            for dy in range(-int(r) - 1, int(r) + 2):
                for dz in range(-int(r * .6) - 1, int(r * .6) + 2):
                    if dx * dx + dy * dy + (dz / .6) ** 2 <= r * r and hsh(dx, dy, dz, k) % 7 > 1 + ph * 4:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'steam' if ph < .35 else ('steam2' if ph < .7 else 'steam3')))
    return v


WIN_FLICK = [1, 1, 1, 1, 0, 1]


def anim(t):
    v = wall_neon(18, 21, NEON[t], CYAN[t])
    if not WIN_FLICK[t]:
        v += box(105, 110, 0, 0, 34, 40, 'winD') + [(106, 0, z, 'metal2') for z in range(34, 41)] + \
             [(x, 0, 37, 'metal2') for x in range(105, 111)]
    return v


def front():
    """Lamp post at the front-left corner + hydrant at the front-right corner (outside the grid)."""
    x, y = 2, LY - 3
    v = box(x, x + 1, y, y + 1, 0, 42, 'lampP') + box(x - 1, x + 2, y - 1, y + 2, 0, 1, 'lampP')
    v += [(xx, y, 42, 'lampP') for xx in range(x, x + 9)] + box(x + 7, x + 9, y - 1, y + 1, 41, 41, 'lampP')
    v += [(x + 8, y, 40, 'lamp'), (x + 7, y, 40, 'lamp'), (x + 8, y - 1, 40, 'lamp')]
    hx, hy = LX - 4, LY - 4
    v += box(hx, hx + 1, hy, hy + 1, 0, 4, 'hyd') + box(hx - 1, hx + 2, hy, hy + 1, 2, 2, 'hyd2') + [(hx, hy, 5, 'hyd2')]
    return v


def look(t):
    on = NEON[t]
    L = [Light((26, 3, 15), (1.0, 0.82, 0.5), 1.25, 28),
         Light((2, 30, 22), (1.0, 0.8, 0.5), 0.9, 24),
         Light((11, LY - 3, 40), (0.8, 0.86, 1.0), 1.0, 52),
         Light((112, 3, 36), (1.0, 0.75, 0.45), 0.45, 26),
         Light((10, 3, 32), (1.0, 0.75, 0.45), 0.45, 24)]
    if on:
        L.append(Light((30, 6, 26), (1.0, 0.3, 0.8), 1.2, 48))
    if CYAN[t]:
        L.append(Light((30, 6, 20), (0.3, 0.85, 1.0), 0.5, 26))
    amb = ((0.80, 0.82, 0.98), (0.70, 0.71, 0.86), (0.52, 0.53, 0.68))
    return Look(amb, L, shadow=(0.18, 0.12, 8), shadow_k=0.72, glow=0.75)
