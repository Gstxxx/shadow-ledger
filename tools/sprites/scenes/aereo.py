"""AEREO: airfield apron at dusk. Hangar with open lit doors on the far edge, control tower + ops building +
rotating radar on the left edge, fuel trucks, windsock, ground equipment as low cover, edge lights.
Ambient loop: runway chase lights, beacon + obstruction blink, radar rotation, windsock flutter."""
import math, random
from common import *

NAME, FPS, NFRAMES = 'aereo', 6, 6
BG = (46, 34, 52)

PAL.update({
    'tar1': (74, 74, 80), 'tar2': (68, 68, 74), 'tar3': (80, 80, 86), 'joint': (54, 54, 60), 'oil': (58, 56, 62),
    'mkY': (226, 188, 60), 'mkW': (222, 222, 226), 'mkR': (180, 50, 46),
    'hg1': (150, 156, 164), 'hg2': (126, 132, 140), 'hg3': (170, 176, 184), 'hgD': (92, 96, 104), 'hgIn': (70, 64, 58),
    'hgFl': (120, 112, 96), 'hgWall': (96, 90, 82),
    'twr': (196, 192, 184), 'twr2': (170, 166, 158), 'twrG': (120, 200, 220), 'twrR': (70, 72, 78),
    'ops': (176, 168, 150), 'ops2': (150, 142, 126), 'opsW': (255, 220, 150),
    'rad': (210, 214, 220), 'rad2': (160, 166, 174), 'radB': (90, 94, 100),
    'ftW': (226, 228, 230), 'ftW2': (196, 198, 202), 'ftR': (190, 44, 40), 'ftG': (60, 62, 68), 'tireA': (30, 30, 32),
    'glassC': (90, 130, 160), 'jg': (150, 158, 168), 'jg2': (120, 128, 138), 'gse': (230, 180, 40), 'gse2': (190, 146, 30), 'cart': (90, 96, 104), 'cart2': (70, 74, 80),
    'bag1': (60, 80, 140), 'bag2': (150, 60, 50), 'bag3': (60, 110, 70), 'bag4': (40, 40, 44),
    'uld': (176, 182, 190), 'uld2': (146, 152, 160), 'chock': (220, 200, 40),
    'sock': (240, 110, 40), 'sockW': (236, 236, 236), 'poleG': (110, 114, 120),
    'lightB': (90, 150, 255), 'lightW': (255, 246, 214), 'lightY': (255, 210, 90), 'lightG': (90, 255, 150),
    'lightR': (255, 60, 50), 'lightOff': (60, 60, 66), 'flood': (255, 240, 200), 'hgLamp': (255, 226, 160),
})
EMIS |= {'lightB', 'lightW', 'lightY', 'lightG', 'lightR', 'flood', 'hgLamp', 'opsW', 'twrG'}
HX0, HX1, HD = 22, 98, 9           # hangar x span and interior depth


def ground_top(x, y):
    k = hsh(x, y) % 13
    c = 'tar1' if k < 7 else ('tar2' if k < 11 else 'tar3')
    if (x - X0) % 14 == 0 or (y - Y0) % 14 == 0:
        c = 'joint'                                                         # slab joints on the cell lines
    if y == 6 and x % 1 == 0:
        c = 'mkY'                                                           # taxi lane centreline
    if y in (4, 8) and 10 <= x <= 16:
        c = 'mkY'                                                           # hold-short bars
    if (y == 5 or y == 7) and 10 <= x <= 16 and x % 2 == 0:
        c = 'mkY'
    if y == LY - 3 and x % 6 < 4:
        c = 'mkW'                                                           # apron edge dashes
    if x == LX - 3 and y % 6 < 4:
        c = 'mkW'
    # parking T marks centred on player / enemy blocks
    for cx in (X0 + 21, X0 + 91):
        if y == Y0 + 21 and abs(x - cx) <= 4:
            c = 'mkY'
        if x == cx and Y0 + 18 <= y <= Y0 + 24:
            c = 'mkY'
    if 60 <= x <= 68 and Y0 + 2 <= y <= Y0 + 40 and ((x + y) % 6 == 0 or x in (60, 68)):
        c = 'mkR'                                # hatched no-park zone (no-man's land)
    if hsh(x // 3, y // 2, 3) % 61 == 0:
        c = 'oil'
    return c


def hangar(t):
    v = []
    cx = (HX0 + HX1) / 2
    half = (HX1 - HX0) / 2
    top = lambda x: int(30 + 18 * math.sqrt(max(0.0, 1 - ((x - cx) / half) ** 2)))
    door0, door1 = 36, 84
    for x in range(HX0, HX1 + 1):
        zt = top(x)
        for z in range(0, zt + 1):
            opening = door0 <= x <= door1 and z <= 30
            if opening:
                continue
            if z == zt or x in (HX0, HX1):
                c = 'hgD'
            elif z > 31 and (x % 3 == 0):
                c = 'hg2'
            elif x < door0 or x > door1:
                c = 'hg1' if x % 2 else 'hg2'                                  # stacked sliding door panels
            else:
                c = 'hg3' if z == 31 else 'hg1'
            v.append((x, 0, z, c))
        for y in range(-HD, 0):                                             # roof shell going back
            v.append((x, y, zt, 'hg2' if (x + y) % 4 else 'hgD'))
    for z in range(0, 31):                                                  # door jambs
        v += [(door0 - 1, 1, z, 'hgD'), (door1 + 1, 1, z, 'hgD')]
    for x in range(door0, door1 + 1):                                       # interior: floor, back wall, lamps
        for y in range(-HD, 0):
            v.append((x, y, -1, 'hgFl' if (x + y) % 5 else 'mkY' if y == -4 else 'hgFl'))
        for z in range(0, 31):
            v.append((x, -HD - 1, z, 'hgWall' if x % 3 else 'hgIn'))
        v.append((x, 0, 31, 'hg3'))
    for x in range(door0 + 4, door1, 8):
        v += [(x, -4, 28, 'hgLamp'), (x + 1, -4, 28, 'hgLamp')]
    # parked jet silhouette inside the hangar
    v += jet(60, -HD + 1)
    # floodlights over the door + beacon on the roof
    v += [(x, 1, 33, 'flood') for x in (40, 41, 59, 60, 79, 80)] + [(x, 1, 34, 'hgD') for x in (40, 41, 59, 60, 79, 80)]
    b = 'lightG' if t % 2 == 0 else 'lightW'
    v += [(int(cx), -2, top(int(cx)) + 1, 'hgD'), (int(cx), -2, top(int(cx)) + 2, b)]
    # side lean-to office (left of the hangar)
    v += box(2, HX0 - 1, -4, 0, 0, 14, 'ops') + box(2, HX0 - 1, -4, 0, 15, 15, 'ops2')
    for x in range(4, HX0 - 2, 4):
        v += [(x, 0, 8, 'opsW'), (x + 1, 0, 8, 'opsW'), (x, 0, 9, 'opsW'), (x + 1, 0, 9, 'opsW')]
    v += box(8, 11, 0, 0, 0, 5, 'hgD')
    return v


def jet(cx, y0):
    """Fighter parked nose-out (+y): fuselage along y, nose cone, canopy, wings, tail fin."""
    v = []
    for y in range(y0, y0 + 16):
        r = 3.2 if y < y0 + 11 else 3.2 - (y - y0 - 10) * 0.55
        for x in range(cx - 4, cx + 5):
            for z in range(1, 11):
                if ((x - cx) / 1.0) ** 2 + ((z - 5) / 1.0) ** 2 <= r * r:
                    v.append((x, y, z, 'jg' if z > 4 else 'jg2'))
    v += [(cx, y0 + 16, 5, 'hgD')]
    for y in range(y0 + 5, y0 + 10):                                         # canopy
        v += [(cx, y, 8, 'glassC'), (cx - 1, y, 8, 'glassC'), (cx + 1, y, 8, 'glassC'), (cx, y, 9, 'glassC')]
    for k in range(0, 9):                                                    # swept wings
        for y in range(y0 + 1 + k // 2, y0 + 7 - k // 3):
            v += [(cx - 4 - k, y, 5, 'jg2'), (cx + 4 + k, y, 5, 'jg')]
    v += [(cx, y0 + k, z, 'jg2') for k in range(0, 4) for z in range(9, 15 - k)]   # tail fin
    v += [(cx, y0 + 13, 0, 'tireA'), (cx - 3, y0 + 5, 0, 'tireA'), (cx + 3, y0 + 5, 0, 'tireA')]
    return v


def tower(x0, y0, t):
    """Control tower on the left edge: shaft, glass cab (lit), roof, antenna with blinking red light."""
    v = []
    for z in range(0, 40):
        for x in range(x0, x0 + 6):
            for y in range(y0, y0 + 6):
                if x in (x0, x0 + 5) or y in (y0, y0 + 5):
                    v.append((x, y, z, 'twr' if (z // 4) % 2 or x != x0 + 5 else 'twr2'))
        if z % 6 == 3:
            v += [(x0 + 5, y0 + 2, z, 'twrG'), (x0 + 2, y0 + 5, z, 'twrG')]
    v += box(x0 - 2, x0 + 7, y0 - 2, y0 + 7, 40, 40, 'twr2')
    for z in range(41, 47):
        for x in range(x0 - 2, x0 + 8):
            for y in range(y0 - 2, y0 + 8):
                if x in (x0 - 2, x0 + 7) or y in (y0 - 2, y0 + 7):
                    c = 'twrR' if (x in (x0 - 2, x0 + 7) and y in (y0 - 2, y0 + 7)) else 'twrG'
                    v.append((x, y, z, c))
    v += box(x0 - 3, x0 + 8, y0 - 3, y0 + 8, 47, 47, 'twrR') + box(x0 + 1, x0 + 4, y0 + 1, y0 + 4, 48, 48, 'twr2')
    v += [(x0 + 3, y0 + 3, z, 'poleG') for z in range(49, 58)] + [(x0 + 3, y0 + 3, 58, 'lightR' if t % 3 != 2 else 'lightOff')]
    return v


def radar(x0, y0, t):
    v = box(x0 - 2, x0 + 2, y0 - 2, y0 + 2, 14, 16, 'radB') + box(x0 - 1, x0 + 1, y0 - 1, y0 + 1, 17, 21, 'rad2')
    th = math.radians(t * 360 / NFRAMES + 20)
    c, s = math.cos(th), math.sin(th)
    for u in range(-7, 8):
        for w in range(-3, 4):
            d = (u * u + w * w * 2) / 18.0
            X = x0 + c * (-d + 1) - s * u
            Y = y0 + s * (-d + 1) + c * u
            v.append((round(X), round(Y), 26 + w, 'rad' if abs(u) < 6 else 'rad2'))
    v += [(round(x0 + c * k), round(y0 + s * k), 26, 'radB') for k in range(1, 4)]     # feed horn arm
    v += box(x0, x0, y0, y0, 22, 25, 'radB')
    return v


def fuel_truck(x0, y0, rev=False):
    """Fuel truck along x, cab at +x end. 26 long, 8 wide."""
    v = box(x0, x0 + 25, y0 + 1, y0 + 6, 2, 2, 'ftG')
    for x in range(x0 + 1, x0 + 18):                                       # tank
        for y in range(y0, y0 + 8):
            for z in range(3, 12):
                if ((y - (y0 + 3.5)) / 4.0) ** 2 + ((z - 7.2) / 4.6) ** 2 <= 1.0:
                    c = 'ftR' if z in (6, 7) else ('ftW' if x % 8 else 'ftW2')
                    v.append((x, y, z, c))
    v += box(x0 + 3, x0 + 14, y0 + 3, y0 + 4, 12, 12, 'ftW2') + [(x0 + 8, y0 + 3, 13, 'ftG'), (x0 + 8, y0 + 4, 13, 'ftG')]
    v += box(x0 + 19, x0 + 25, y0, y0 + 7, 3, 7, 'ftW') + box(x0 + 19, x0 + 23, y0, y0 + 7, 8, 11, 'ftW')   # cab
    v += box(x0 + 23, x0 + 23, y0 + 1, y0 + 6, 9, 10, 'glassC') + [(x0 + 21, y0 + 7, z, 'glassC') for z in (9, 10)]
    v += [(x0 + 26, y0 + 1, 5, 'lightW'), (x0 + 26, y0 + 6, 5, 'lightW'), (x0 + 22, y0 + 3, 12, 'lightY')]
    v += box(x0 + 18, x0 + 18, y0 + 1, y0 + 6, 3, 9, 'ftG')
    for wx in (x0 + 4, x0 + 12, x0 + 22):
        for y in (y0 - 0, y0 + 7):
            v += [(wx + dx, y, z, 'tireA') for dx in (-1, 0, 1) for z in (0, 1, 2) if not (dx != 0 and z != 1)]
            v += [(wx, y, 1, 'hgD')]
    if rev:
        v = [(2 * x0 + 25 - x, y, z, c) for x, y, z, c in v]
    return v


def tug(x0, y0):
    v = box(x0, x0 + 8, y0, y0 + 5, 1, 3, 'gse') + box(x0 + 1, x0 + 4, y0 + 1, y0 + 4, 4, 6, 'gse2')
    v += box(x0 + 1, x0 + 1, y0 + 1, y0 + 4, 7, 7, 'gse2') + [(x0 + 5, y0 + 2, 6, 'cart2')]
    v += [(x0 + 9, y0 + k, 2, 'cart2') for k in range(1, 5)] + [(x0 + 8, y0 + 2, 4, 'lightY')]
    for wx in (x0 + 1, x0 + 7):
        v += [(wx, y0 - 1, 0, 'tireA'), (wx, y0 - 1, 1, 'tireA'), (wx, y0 + 6, 0, 'tireA'), (wx, y0 + 6, 1, 'tireA')]
    return v


def bag_cart(x0, y0, seed):
    v = box(x0, x0 + 8, y0, y0 + 5, 2, 2, 'cart') + [(x0 + k, y0 - 0, 3, 'cart2') for k in range(0, 9, 2)]
    v += [(x0, y0 + k, z, 'cart2') for k in (0, 5) for z in (3, 4, 5, 6)] + [(x0 + 8, y0 + k, z, 'cart2') for k in (0, 5) for z in (3, 4, 5, 6)]
    v += [(x0 + k, y0 + j, 7, 'cart2') for k in range(0, 9) for j in (0, 5)]
    rnd = random.Random(seed)
    for i in range(5):
        bx, by = x0 + 1 + rnd.randint(0, 5), y0 + 1 + rnd.randint(0, 2)
        c = rnd.choice(('bag1', 'bag2', 'bag3', 'bag4'))
        v += box(bx, bx + 2, by, by + 1, 3 + (i > 2) * 2, 4 + (i > 2) * 2, c)
    v += [(x0 + 1, y0 - 1, 0, 'tireA'), (x0 + 7, y0 - 1, 0, 'tireA'), (x0 + 1, y0 + 6, 0, 'tireA'), (x0 + 7, y0 + 6, 0, 'tireA')]
    v += [(x0 - 1, y0 + 2, 1, 'cart2'), (x0 - 2, y0 + 2, 1, 'cart2'), (x0 - 3, y0 + 3, 1, 'cart2')]
    return v


def uld(x0, y0):
    """Cargo container (LD3-like) with a slanted side."""
    v = []
    for x in range(x0, x0 + 7):
        for y in range(y0, y0 + 6):
            for z in range(1, 8):
                if x - x0 >= 6 - (z - 1) // 3 + 1 and z > 3:
                    continue
                c = 'uld2' if (y - y0) % 3 == 0 else 'uld'
                v.append((x, y, z, c))
    v += box(x0, x0 + 6, y0, y0 + 5, 0, 0, 'cart2')
    return v


def windsock(x0, y0, t):
    v = [(x0, y0, z, 'poleG') for z in range(0, 26)]
    for i in range(10):
        dz = -round((i / 9) * (1.2 + 0.8 * math.sin(t * 2 * math.pi / NFRAMES)))
        dy = round(math.sin(i * 0.9 + t * 2 * math.pi / NFRAMES) * 0.6 * i / 9)
        r = 1.6 - i * 0.1
        c = 'sock' if (i // 2) % 2 == 0 else 'sockW'
        for a in range(-1, 2):
            for b_ in range(-1, 2):
                if a * a + b_ * b_ <= r * r:
                    v.append((x0 + 1 + i, y0 + a + dy, 25 + b_ + dz, c))
    return v


CHASE = list(range(Y0 - 4, LY - 1, 5))


def edge_lights(t):
    v = []
    # chase (sequenced flashers) along the front-right edge, running toward the camera
    for i, y in enumerate(CHASE):
        on = (i - t) % NFRAMES == 0
        v.append((LX - 2, y, 0, 'lightW' if on else 'lightOff'))
    # steady blue taxi-edge lights along the front-left edge + yellow along the taxi lane
    v += [(x, LY - 2, 0, 'lightB') for x in range(4, LX - 3, 8)]
    v += [(x, 9, 0, 'lightG') for x in range(14, LX - 4, 10)]
    return v


def env():
    v = floor_slab(ground_top, slab='joint', slab2='oil')
    v += fuel_truck(97, 1) + ops_left()
    # back strip: second fuel truck parked in front of the left door panels
    v += fuel_truck(9, 2)
    # no-man's land (cols 3-4) low cover
    v += tug(53, 16) + bag_cart(66, 18, 1) + bag_cart(58, 30, 2) + bag_cart(70, 33, 3)
    v += uld(55, 44) + uld(63, 45) + [(x, 51, 0, 'chock') for x in (60, 61, 68, 69)]
    v += [(52, 40, z, 'gse') for z in range(0, 3)] + [(52, 40, 3, 'lightOff')]                    # cone-ish marker
    return v


def ops_left():
    """Low operations building on the left edge."""
    v = box(-1, 4, 16, 52, 0, 12, 'ops') + box(-1, 5, 15, 53, 13, 13, 'ops2')
    for y in range(18, 52, 5):
        v += [(5, y, z, 'opsW' if (y // 5) % 3 else 'glassC') for z in (6, 7, 8)] + [(5, y + 1, z, 'opsW' if (y // 5) % 3 else 'glassC') for z in (6, 7, 8)]
    v += box(5, 5, 30, 33, 0, 9, 'glassC') + box(5, 7, 29, 34, 10, 10, 'ops2')
    v += box(1, 3, 20, 24, 14, 16, 'radB') + [(2, 48, z, 'poleG') for z in range(14, 30)]
    return v


def anim(t):
    v = hangar(t) + tower(-1, -1, t) + radar(2, 36, t) + windsock(LX - 3, 11, t) + edge_lights(t)
    return v


def look(t):
    amb = ((0.98, 0.76, 0.66), (0.70, 0.58, 0.66), (0.48, 0.44, 0.60))
    L = [Light((60, 6, 34), (1.0, 0.92, 0.75), 1.1, 50),
         Light((60, -3, 20), (1.0, 0.8, 0.5), 1.0, 36),
         Light((2, 34, 9), (1.0, 0.85, 0.55), 0.5, 22),
         Light((LX - 2, 30, 4), (0.9, 0.9, 1.0), 0.25, 20)]
    return Look(amb, L, shadow=(1.1, 0.35, 8), shadow_k=0.68, ao_k=0.8, glow=0.9)


def front():
    """Traffic cones at the front corner + a raised edge light (outside the grid)."""
    v = []
    for (x, y) in ((LX - 3, LY - 3), (LX - 9, LY - 2), (6, LY - 2)):
        v += box(x - 1, x + 1, y - 1, y + 1, 0, 0, 'mkR') + [(x, y, 1, 'sock'), (x, y, 2, 'sockW'), (x, y, 3, 'sock'), (x, y, 4, 'sockW')]
    return v
