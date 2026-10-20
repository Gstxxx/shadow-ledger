"""AEREO: airfield apron at dusk. Hangar mouth with open lit doors and a parked fighter along the back edge, control
tower in the back-left corner, ops building with a rotating radar on the left edge, fuel trucks in front of the
hangar, windsock, ground equipment (tug, baggage carts, ULDs) as low cover in no-man's land, edge lights.
Ambient loop: edge-light chase, beacon + obstruction blink, radar rotation, windsock flutter.

Scale 10 voxels = 1 m (common.M): hangar 19.6 m wide with a 16.4 x 7 m door opening (70) under an arched roof
(eaves 7.4 m, crown 9.6 m), fighter 14 m long (nose and front half visible), tower cab floor at 6 m with a 3.2 m cab,
ops building 3.2 m, fuel trucks 7.5 x 2.4 x 3 m, tug 3 x 1.6 x 1.4 m, baggage carts 2 x 1 m, ULDs 1.6 x 1.5 x 1.4 m,
radar dish 2.6 m, windsock pole 4.5 m. Big things are hollow (only the faces the camera sees)."""
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
    'ac': (150, 154, 156), 'lightR': (255, 60, 50), 'lightOff': (60, 60, 66), 'flood': (255, 240, 200), 'hgLamp': (255, 226, 160),
})
EMIS |= {'lightB', 'lightW', 'lightY', 'lightG', 'lightR', 'flood', 'hgLamp', 'opsW', 'twrG'}

HX0, HX1, HD = 30, 226, 64          # hangar x span (19.6 m, centred on the grid) and modelled interior depth
HCX = (HX0 + HX1) // 2              # 128 = centre of no-man's land
DOOR0, DOOR1, DOORH = 46, 210, 70   # door opening 16.4 m wide x 7 m tall
EAVE, RISE = 74, 22                 # arched roof: 7.4 m at the walls, 9.6 m at the crown
NOSE = 20                           # jet nose tip y (pokes 2 m out of the hangar mouth)
TWR = (-3, 3, 14, 20)               # tower shaft x0, y0, x1, y1
RAD = (-3, 46)                      # radar mast on the ops roof
OPS_H = 31                          # ops building roof (3.2 m with the parapet)
SOCK = (244, 8)                     # windsock pole

FONT5 = {'H': ['101', '101', '111', '101', '101'], '2': ['111', '001', '111', '100', '111'],
         'O': ['111', '101', '101', '101', '111'], 'P': ['110', '101', '110', '100', '100'],
         'S': ['111', '100', '111', '001', '111']}


def skin(vox):
    """Keep only voxels with a face the camera can see (+x, +y or +z neighbour empty): hollows big solids."""
    s = {(x, y, z) for x, y, z, c in vox}
    return [(x, y, z, c) for x, y, z, c in vox if (x + 1, y, z) not in s or (x, y + 1, z) not in s or (x, y, z + 1) not in s]


def text_y(s, x0, y, ztop, k=1, c='mkW', gap=1):
    """3x5 font on a constant-y plane, k voxels per font pixel."""
    v = []
    for ch in s:
        for r, row in enumerate(FONT5[ch]):
            for j, bit in enumerate(row):
                if bit == '1':
                    v += [(x0 + j * k + a, y, ztop - r * k - b_, c) for a in range(k) for b_ in range(k)]
        x0 += 3 * k + gap
    return v


def ground_top(x, y):
    k = hsh(x, y) % 13
    c = 'tar1' if k < 7 else ('tar2' if k < 11 else 'tar3')
    if (x - X0) % CELL == 0 or (y - Y0) % CELL == 0:
        c = 'joint'                                                         # slab joints on the cell lines
    if y in (12, 13):
        c = 'mkY'                                                           # taxi lane centreline (0.2 m)
    if 18 <= x <= 29 and 2 <= y <= 23 and (x in (18, 19, 21, 22) or (x in (25, 26, 28, 29) and y % 4 < 2)):
        c = 'mkY'                                                           # hold-short: 2 solid + 2 dashed
    if x in (HCX - 1, HCX) and y < LY - 6:
        c = 'mkY'                                                           # hangar lead-in line
    if y in (LY - 5, LY - 4) and x % 12 < 8:
        c = 'mkW'                                                           # apron edge dashes
    if x in (LX - 5, LX - 4) and y % 12 < 8:
        c = 'mkW'
    for cx in (X0 + 42, X0 + 182):                                          # parking T on player / enemy blocks
        if y in (Y0 + 54, Y0 + 55) and abs(x - cx) <= 9:
            c = 'mkY'
        if x in (cx, cx + 1) and Y0 + 34 <= y <= Y0 + 54:
            c = 'mkY'
    if 118 <= x <= 138 and Y0 + 2 <= y <= Y0 + 18 and x not in (HCX - 1, HCX) and \
            ((x + y) % 8 < 2 or x in (118, 138) or y in (Y0 + 2, Y0 + 18)):
        c = 'mkR'                                                           # hatched no-park box (no-man's land)
    if hsh(x // 4, y // 3, 3) % 61 == 0 and hsh(x, y, 5) % 3:
        c = 'oil'
    return c


# ------------------------------------------------------------------ hangar
def htop(x):
    half = (HX1 - HX0) / 2 + 1
    return int(round(EAVE + RISE * math.sqrt(max(0.0, 1 - ((x - HCX) / half) ** 2))))


def hangar():
    """Front of a 19.6 m arched hangar on the back edge: clad gable with the 16.4 x 7 m opening, stacked door leaves
    each side on a top track, 'H2' on the lintel, floodlights; roof shell running back HD; the lit interior seen
    through the mouth (floor, left wall, tool cabinets, maintenance stand, hanging lamps) and the parked jet."""
    v = []
    for x in range(HX0, HX1 + 1):                                           # gable wall (y = 0)
        zt = htop(x)
        for z in range(0, zt + 1):
            if DOOR0 <= x <= DOOR1 and z <= DOORH:
                continue
            if z >= zt - 1 or x in (HX0, HX1):
                c = 'hgD'
            elif z in (DOORH + 1, DOORH + 2) and DOOR0 <= x <= DOOR1:
                c = 'hg3'                                                   # door header beam
            else:
                c = 'hg2' if x % 4 == 0 else 'hg1'                          # ribbed cladding
            v.append((x, 0, z, c))
    for x in range(HX0, HX1 + 1):                                           # roof shell (seams along the arch)
        zt = htop(x)
        zn = min(htop(x - 1) if x > HX0 else 0, htop(x + 1) if x < HX1 else 0, zt)
        for y in range(-HD, 0):
            for z in range(min(zt, zn + 1), zt + 1):
                v.append((x, y, z, 'hgD' if y % 16 == 0 else ('hg2' if y % 4 == 0 else 'hg1')))
    for y in range(max(-HD, HX1 - 258), 0):                                 # right side wall (+x face), the visible bit
        for z in range(0, htop(HX1)):
            v.append((HX1, y, z, 'hgD' if z % 24 == 23 else ('hg2' if y % 4 == 0 else 'hg1')))
    # stacked sliding door leaves each side of the opening, on a top track
    for xa, xb in ((HX0 + 1, DOOR0 - 1), (DOOR1 + 1, HX1 - 1)):
        for x in range(xa, xb + 1):
            for z in range(0, DOORH + 1):
                c = 'hgD' if z % 24 == 23 or x in (xa, xb) else ('hg2' if x % 4 == 1 else 'hg1')
                v.append((x, 1, z, c))
        for x in range(xa, xa + 8):                                         # outer leaf, one panel proud
            for z in range(0, DOORH + 1):
                v.append((x, 2, z, 'hgD' if z % 24 == 23 or x in (xa, xa + 7) else 'hg3'))
    v += box(HX0, HX1, 1, 2, DOORH + 1, DOORH + 2, 'hgD')                   # door track
    v += [(DOOR0 - 1, 1, z, 'hgD') for z in range(0, DOORH + 1)] + [(DOOR1 + 1, 2, z, 'hgD') for z in range(0, DOORH + 1)]
    v += text_y('H2', HCX - 14, 1, 92, k=4, c='mkW', gap=4)                 # hangar number on the lintel
    for fx in (70, 100, 156, 186):                                          # floodlights over the opening
        v += box(fx, fx + 3, 1, 2, 77, 77, 'hgD') + box(fx, fx + 3, 2, 3, 75, 76, 'flood')
    # interior: only what can be seen through the mouth (point at depth d shows if DOOR0 <= x + d <= DOOR1, z + d <= DOORH)
    for x in range(HX0 + 1, HX1):
        for y in range(-HD, 0):
            d = -y
            if DOOR0 - 2 <= x + d <= DOOR1 + 2:
                c = 'hgFl' if (x - HCX) % 28 and y % 28 else 'hgIn'
                if x in (HCX - 1, HCX):
                    c = 'mkY'
                v.append((x, y, -1, c))
    v += box(DOOR0 - HD, DOOR1 - HD, -HD - 1, -HD - 1, 0, 8, 'hgWall')      # back wall foot (all that shows)
    for y in range(-HD, -13):                                               # left wall inside (+x face)
        for z in range(0, min(EAVE, DOORH + 2 + y)):
            v.append((HX0, y, z, 'hgIn' if y % 6 == 0 else 'hgWall'))
    v += skin(box(HX0 + 1, HX0 + 6, -44, -24, 0, 11, 'mkR'))                # red tool cabinets along the left wall
    v += [(HX0 + 6, y, z, 'hgD') for y in range(-44, -23) for z in (3, 7)] + [(HX0 + 6, y, 11, 'hgD') for y in range(-44, -23, 5)]
    v += skin(box(HX0 + 1, HX0 + 8, -60, -50, 0, 9, 'cart2'))               # workbench
    v += stand(150, -34)
    for lx in range(58, 200, 24):                                           # hanging lamps (visible under the lintel)
        v += box(lx, lx + 3, -8, -6, 63, 63, 'hgD') + box(lx, lx + 3, -8, -6, 62, 62, 'hgLamp')
    v += jet(HCX)
    return v


def stand(x0, y0):
    """Yellow maintenance stand beside the jet: 1.2 x 1 m deck at 2 m, legs, rail at 3 m, steps down toward +y."""
    v = box(x0, x0 + 11, y0, y0 + 9, 20, 20, 'gse')
    for lx, ly in ((x0, y0), (x0 + 11, y0), (x0, y0 + 9), (x0 + 11, y0 + 9)):
        v += [(lx, ly, z, 'gse2') for z in range(0, 20)]
    v += [(x, y0 + 9, 30, 'gse') for x in range(x0, x0 + 12)] + [(x0 + 11, y, 30, 'gse') for y in range(y0, y0 + 10)]
    v += [(x, y0 + 9, z, 'gse2') for x in (x0, x0 + 11) for z in range(21, 30)]
    for k in range(10):                                                     # steps
        v += [(x, y0 + 10 + k * 2, 18 - k * 2, 'gse2') for x in range(x0 + 2, x0 + 10)]
    return v


def jet(cx):
    """Single-seat delta-wing fighter parked nose-out (+y), 14 m long: only the nose and front half are built (the
    rest is hidden by the lintel). Fuselage 1.6 m across (centre 1.8 m up), bubble canopy, side intakes with canards,
    delta wing root, nose and main gear, pitot probe."""
    v = []
    zc = 18
    for y in range(-HD, NOSE + 1):
        s = NOSE - y
        r = 1.2 + 6.8 * (s / 30.0) ** 0.6 if s < 30 else 8.0
        R = int(r) + 1
        for dx in range(-R, R + 1):
            for dz in range(-R, R + 1):
                d = math.sqrt(dx * dx + dz * dz)
                if r - 1.6 < d <= r:
                    c = 'hgD' if s < 7 else ('jg' if dz > -2 else 'jg2')
                    if dz in (-1, 0) and dx > 0 and 30 < s:
                        c = 'jg2'                                           # panel line along the side
                    v.append((cx + dx, y, zc + dz, c))
    for y in range(NOSE + 1, NOSE + 5):                                     # pitot probe
        v.append((cx, y, zc, 'jg2'))
    for s in range(20, 46):                                                 # bubble canopy
        y = NOSE - s
        h = 5.0 * math.sqrt(max(0.0, 1 - ((s - 33) / 13.0) ** 2))
        for dx in range(-4, 5):
            hh = h * math.sqrt(max(0.0, 1 - (dx / 4.5) ** 2))
            for dz in range(0, int(hh) + 1):
                rim = dz == 0 or s in (20, 45)
                v.append((cx + dx, y, zc + 7 + dz, 'jg2' if rim else 'glassC'))
    for s in range(38, HD + NOSE + 1):                                      # side intakes
        y = NOSE - s
        for sx in (-1, 1):
            for dx in range(8, 12):
                for z in range(11, 21):
                    c = 'tireA' if s == 38 and 9 <= dx <= 10 and 12 <= z <= 19 else ('jg2' if z < 14 else 'jg')
                    v.append((cx + sx * dx, y, z, c))
    for s in range(40, 50):                                                 # canards
        for dx in range(12, 12 + (s - 40) * 2):
            v += [(cx + dx, NOSE - s, 20, 'jg'), (cx - dx, NOSE - s, 20, 'jg2')]
    for s in range(46, HD + NOSE + 1):                                      # delta wing (leading edge sweeps back)
        span = 12 + (s - 46) * 0.9
        for dx in range(12, int(span) + 1):
            v += [(cx + dx, NOSE - s, 16, 'jg'), (cx - dx, NOSE - s, 16, 'jg'), (cx + dx, NOSE - s, 15, 'jg2'),
                  (cx - dx, NOSE - s, 15, 'jg2')]
    ng = NOSE - 26                                                          # nose gear
    v += [(cx, ng, z, 'poleG') for z in range(4, 11)] + box(cx - 1, cx + 1, ng - 2, ng + 2, 0, 3, 'tireA')
    v += [(cx + 1, ng, 1, 'hgD')]
    for sx in (-1, 1):                                                      # main gear
        gx = cx + sx * 14
        v += [(gx, NOSE - 72, z, 'poleG') for z in range(4, 15)] + box(gx - 1, gx + 1, NOSE - 75, NOSE - 69, 0, 5, 'tireA')
    return v


# ------------------------------------------------------------------ tower, ops building, radar
def tower(t):
    """Control tower in the back-left corner: 1.8 m concrete shaft with stair slots and a base door, cab floor at
    6 m, 3.2 m glass cab (lit, mullions) with tilted-out glazing, overhanging roof, mast with obstruction light."""
    x0, y0, x1, y1 = TWR
    v = []
    for z in range(0, 60):
        for x in range(x0, x1 + 1):
            for y in (y0, y1):
                v.append((x, y, z, 'twr2' if z % 12 == 11 else 'twr'))
        for y in range(y0, y1 + 1):
            for x in (x0, x1):
                v.append((x, y, z, 'twr2' if z % 12 == 11 else 'twr'))
    for z in range(26, 58, 12):                                             # stair slot windows
        v += [(x1, y, zz, 'twrG') for y in range(y0 + 7, y0 + 11) for zz in (z, z + 1, z + 2, z + 3)]
        v += [(x, y1, zz, 'twrG') for x in range(x0 + 7, x0 + 11) for zz in (z + 6, z + 7, z + 8, z + 9)]
    v += box(x1, x1, y0 + 4, y0 + 13, 0, 22, 'twrR') + box(x1, x1, y0 + 5, y0 + 12, 0, 21, 'radB')   # door 0.8 x 2.2 m
    v += [(x1 + 1, y, 23, 'twr2') for y in range(y0 + 3, y0 + 15)] + [(x1 + 1, y0 + 11, 11, 'poleG')]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    v += skin(box(int(cx - 15), int(cx + 16), int(cy - 15), int(cy + 16), 58, 61, 'twr2'))   # cab floor slab
    for z in range(62, 78):                                                 # glass cab, glazing tilts out
        o = (z - 62) // 6
        a0, a1 = int(cx - 15) - o, int(cx + 16) + o
        b0, b1 = int(cy - 15) - o, int(cy + 16) + o
        for x in range(a0, a1 + 1):
            v.append((x, b1, z, 'twrR' if (x - a0) % 8 == 0 or z in (62, 77) else 'twrG'))
        for y in range(b0, b1 + 1):
            v.append((a1, y, z, 'twrR' if (y - b0) % 8 == 0 or z in (62, 77) else 'twrG'))
        v += [(a1, b1, z, 'twrR')]
    v += box(int(cx - 18), int(cx + 19), int(cy - 18), int(cy + 19), 78, 78, 'twrR')     # roof with overhang
    v += box(int(cx - 5), int(cx + 5), int(cy - 5), int(cy + 5), 79, 80, 'twr2')
    v += [(int(cx), int(cy), z, 'poleG') for z in range(81, 92)] + [(int(cx) + k, int(cy), 86, 'poleG') for k in range(1, 5)]
    v += [(int(cx), int(cy), 92, 'lightR' if t % 3 != 2 else 'lightOff')]
    return v


def ops_left():
    """Single-storey ops building on the left edge (front face x=12): 3.2 m with parapet, lit windows 1.4 x 1 m,
    glass door 1 x 2.2 m under a lit canopy, 'OPS' sign on the end, rooftop AC unit and antenna."""
    xa, xb, ya, yb = -14, 12, 34, 104
    v = skin(box(xa, xb, ya, yb, 0, OPS_H - 1, 'ops'))
    v += [(x, y, OPS_H - 1, 'conc2') for x in range(xa, xb) for y in range(ya, yb)]           # roof membrane
    v += [(xb, y, OPS_H, 'ops2') for y in range(ya, yb + 1)] + [(x, yb, OPS_H, 'ops2') for x in range(xa, xb + 1)]
    v += [(xb, y, z, 'ops2') for y in range(ya, yb + 1) for z in (0, 1)]                      # plinth
    v += [(x, yb, z, 'ops2') for x in range(xa, xb + 1) for z in (0, 1)]
    for i, wy in enumerate((38, 54, 80, 89)):                                                 # windows on the front
        c = 'opsW' if i != 2 else 'glassC'
        v += box(xb, xb, wy, wy + 13, 10, 19, c) + [(xb, wy + 7, z, 'ops2') for z in range(10, 20)]
        v += [(xb + 1, y, 9, 'ops2') for y in range(wy - 1, wy + 15)] + [(xb, y, 20, 'ops2') for y in range(wy - 1, wy + 15)]
    dy = 66                                                                                   # door + canopy + lamp
    v += box(xb, xb, dy - 1, dy + 10, 0, 22, 'ops2') + box(xb, xb, dy, dy + 9, 0, 21, 'glassC')
    v += [(xb, dy + 4, z, 'ops2') for z in range(0, 22)] + [(xb + 1, dy + 3, 10, 'poleG'), (xb + 1, dy + 6, 10, 'poleG')]
    v += box(xb + 1, xb + 5, dy - 2, dy + 11, 24, 24, 'ops2') + box(xb + 1, xb + 2, dy + 4, dy + 5, 23, 23, 'opsW')
    v += box(xb + 1, xb + 4, dy - 1, dy + 10, 0, 0, 'conc')                                   # step
    v += box(-11, 11, yb + 1, yb + 1, 17, 28, 'radB') + text_y('OPS', -10, yb + 2, 27, k=2, c='opsW', gap=2)
    v += skin(box(-8, 2, 84, 94, OPS_H, OPS_H + 6, 'ac')) + [(3, y, z, 'radB') for y in range(85, 94, 2) for z in range(OPS_H + 1, OPS_H + 6)]
    v += [(0, 100, z, 'poleG') for z in range(OPS_H, OPS_H + 26)] + [(k, 100, OPS_H + 22, 'poleG') for k in (-2, -1, 1, 2)]
    return v


def radar(t):
    """Surveillance radar on the ops roof: pedestal, 2 m mast, 2.6 m x 1.1 m curved dish on a turning head."""
    x0, y0 = RAD
    zb = OPS_H
    v = skin(box(x0 - 3, x0 + 3, y0 - 3, y0 + 3, zb, zb + 4, 'radB')) + skin(box(x0 - 1, x0 + 1, y0 - 1, y0 + 1, zb + 5, zb + 18, 'rad2'))
    v += skin(box(x0 - 2, x0 + 2, y0 - 2, y0 + 2, zb + 19, zb + 21, 'radB'))
    th = math.radians(t * 360 / NFRAMES + 20)
    c, s = math.cos(th), math.sin(th)
    zc = zb + 27
    for u in range(-13, 14):
        for w in range(-5, 6):
            d = (u * u + w * w * 2) / 50.0
            X = x0 + c * (-d + 2) - s * u
            Y = y0 + s * (-d + 2) + c * u
            v.append((round(X), round(Y), zc + w, 'rad' if abs(u) < 11 and abs(w) < 5 else 'rad2'))
    v += [(round(x0 + c * k), round(y0 + s * k), zc, 'radB') for k in range(2, 8)]          # feed horn arm
    v += [(round(x0 + c * 8), round(y0 + s * 8), zc + dz, 'radB') for dz in (-1, 0, 1)]
    v += [(x0, y0, z, 'radB') for z in range(zb + 22, zc - 5)]
    return v


# ------------------------------------------------------------------ vehicles + ground equipment
def wheel_y(x, y, r, yb, c='tireA'):
    """Wheel disc in the x-z plane at y..y+yb-1, radius r, standing on the ground."""
    v = []
    for dx in range(-r, r + 1):
        for dz in range(-r, r + 1):
            if dx * dx + dz * dz <= r * r + r * 0.6:
                for k in range(yb):
                    v.append((x + dx, y + k, r + dz, 'hgD' if dx * dx + dz * dz <= (r * 0.45) ** 2 and k == yb - 1 else c))
    return v


def fuel_truck(x0, y0, rev=False):
    """Refueller 75 long x 24 wide x 30 tall (7.5 x 2.4 x 3 m) along x, cab at the +x end: elliptic 52-long tank with
    red band, top catwalk and manholes, hose locker, tandem rear axle, cab with windscreen, lights, roof beacon."""
    W = 24
    yc = y0 + (W - 1) / 2
    v = box(x0 + 2, x0 + 73, y0 + 3, y0 + W - 4, 6, 8, 'ftG')
    for x in range(x0 + 2, x0 + 54):
        for y in range(y0, y0 + W):
            for z in range(8, 30):
                if ((y - yc) / 12.0) ** 2 + ((z - 18.5) / 10.5) ** 2 <= 1.0:
                    v.append((x, y, z, 'ftR' if 16 <= z <= 18 else ('ftW2' if (x - x0) % 13 == 2 else 'ftW')))
    v += box(x0 + 8, x0 + 48, int(yc) - 3, int(yc) + 3, 30, 30, 'ftW2')
    v += [(x, y, 30, 'ftG') for x in (x0 + 14, x0 + 15, x0 + 28, x0 + 29, x0 + 42, x0 + 43) for y in (int(yc), int(yc) + 1)]
    v += box(x0 + 28, x0 + 46, y0 + 17, y0 + W - 1, 6, 12, 'ftW2')                     # hose locker
    v += [(x0 + 37, y0 + W - 1, z, 'hgD') for z in range(6, 13)] + [(x0 + 35, y0 + W - 1, 9, 'hgD'), (x0 + 39, y0 + W - 1, 9, 'hgD')]
    v += box(x0 + 56, x0 + 73, y0 + 1, y0 + W - 2, 6, 27, 'ftW') + box(x0 + 56, x0 + 73, y0 + 1, y0 + W - 2, 28, 28, 'ftW2')
    v += [(x0 + 73, y, z, 'glassC') for y in range(y0 + 3, y0 + W - 3) for z in range(18, 26)]          # windscreen
    v += [(x, y0 + W - 2, z, 'glassC') for x in range(x0 + 62, x0 + 71) for z in range(18, 26)]         # side window
    v += [(x0 + 73, y, z, 'ftR') for y in range(y0 + 1, y0 + W - 1) for z in (13, 14)]
    v += [(x, y0 + W - 2, z, 'ftR') for x in range(x0 + 56, x0 + 74) for z in (13, 14)]
    v += [(x0 + 61, y0 + W - 2, z, 'hgD') for z in range(7, 27)]                                    # door seam
    v += [(x0 + 73, y, z, 'ftG') for y in range(int(yc) - 4, int(yc) + 6) for z in range(8, 12)]       # grille
    v += box(x0 + 74, x0 + 74, y0 + 1, y0 + W - 2, 4, 6, 'hgD')                                     # bumper
    v += [(x0 + 74, y, z, 'lightW') for y in (y0 + 3, y0 + 4, y0 + W - 5, y0 + W - 4) for z in (9, 10)]
    v += box(x0 + 64, x0 + 65, int(yc), int(yc) + 1, 29, 30, 'lightY')
    for wx in (x0 + 12, x0 + 24, x0 + 66):
        v += wheel_y(wx, y0 + W - 3, 5, 3)
    if rev:
        v = [(2 * x0 + 74 - x, y, z, c) for x, y, z, c in v]
    return skin(v)


def tug(x0, y0):
    """Towbarless aircraft tug 30 long x 16 wide x 14 tall (3 x 1.6 x 1.4 m): low yellow hull with hazard stripes,
    offset driver cab, push pad, headlights, amber beacon."""
    v = box(x0 + 2, x0 + 29, y0 + 1, y0 + 16, 3, 9, 'gse')
    v += [(x, y0 + 16, z, 'hgD') for x in range(x0 + 2, x0 + 30) for z in (4, 5) if (x + z) % 6 < 3]
    v += box(x0, x0 + 1, y0 + 3, y0 + 14, 4, 8, 'cart2')
    v += box(x0 + 18, x0 + 27, y0 + 2, y0 + 9, 10, 12, 'gse2') + box(x0 + 17, x0 + 28, y0 + 1, y0 + 10, 13, 13, 'gse2')
    v += [(x0 + 27, y, z, 'glassC') for y in range(y0 + 3, y0 + 9) for z in (10, 11, 12)]
    v += [(x, y0 + 9, z, 'glassC') for x in range(x0 + 19, x0 + 26) for z in (10, 11, 12)]
    v += [(x0 + 22, y0 + 5, 14, 'lightY'), (x0 + 23, y0 + 5, 14, 'lightY')]
    v += [(x0 + 30, y, z, 'lightW') for y in (y0 + 3, y0 + 14) for z in (6, 7)]
    for wx in (x0 + 7, x0 + 24):
        v += wheel_y(wx, y0 + 15, 3, 3)
    return skin(v)


def bag_cart(x0, y0, seed):
    """Baggage cart 20 long x 10 wide (2 x 1 m): deck at 0.4 m, corner posts and top rail at 1.1 m, bags, castors,
    tow bar toward -x."""
    v = box(x0, x0 + 19, y0, y0 + 9, 3, 3, 'cart')
    for px in (x0, x0 + 19):
        for py in (y0, y0 + 9):
            v += [(px, py, z, 'cart2') for z in range(4, 11)]
    v += [(x, y, 11, 'cart2') for x in range(x0, x0 + 20) for y in (y0, y0 + 9)] + [(x, y, 11, 'cart2') for x in (x0, x0 + 19) for y in range(y0, y0 + 10)]
    rnd = random.Random(seed)
    for i in range(7):
        bx, by = x0 + 1 + rnd.randint(0, 12), y0 + 1 + rnd.randint(0, 3)
        L, Wd, H = rnd.randint(5, 7), rnd.randint(3, 5), rnd.randint(2, 3)
        z0 = 4 if i < 4 else 7
        v += box(bx, min(x0 + 18, bx + L - 1), by, min(y0 + 8, by + Wd - 1), z0, min(10, z0 + H - 1), rnd.choice(('bag1', 'bag2', 'bag3', 'bag4')))
    for wx in (x0 + 2, x0 + 17):
        v += box(wx - 1, wx + 1, y0 + 9, y0 + 9, 0, 2, 'tireA') + box(wx - 1, wx + 1, y0, y0, 0, 2, 'tireA')
    v += line3((x0 - 1, y0 + 5, 2), (x0 - 5, y0 + 5, 1), 'cart2')
    return v


def uld(x0, y0, curtain='bag1'):
    """LD3-style container 16 x 15 x 14 (1.6 x 1.5 x 1.4 m) with the contoured upper side, ribs, curtain door."""
    v = []
    for x in range(x0, x0 + 16):
        for y in range(y0, y0 + 15):
            for z in range(1, 15):
                if z > 8 and x - x0 > 15 - (z - 8):
                    continue
                v.append((x, y, z, 'uld2' if (y - y0) % 4 == 0 or z == 14 else 'uld'))
    v = skin(v + box(x0, x0 + 15, y0, y0 + 14, 0, 0, 'cart2'))
    v += [(x, y0 + 14, z, curtain if z % 3 else 'cart2') for x in range(x0 + 2, x0 + 12) for z in range(2, 13)]
    return v


def chocks(x, y):
    return box(x, x + 3, y, y + 1, 0, 1, 'chock') + box(x, x + 3, y + 4, y + 5, 0, 1, 'chock') + [(x + k, y + 2, 0, 'poleG') for k in range(4)] + [(x + k, y + 3, 0, 'poleG') for k in range(4)]


def cone(x, y):
    """Traffic cone 0.7 m with a white band."""
    v = box(x - 3, x + 3, y - 3, y + 3, 0, 0, 'mkR')
    for z in range(1, 8):
        r = 2.6 - z * 0.3
        c = 'sockW' if z in (4, 5) else 'sock'
        v += [(x + dx, y + dy, z, c) for dx in range(-2, 3) for dy in range(-2, 3) if dx * dx + dy * dy <= r * r]
    return skin(v)


def extinguisher(x, y):
    """Wheeled 50 kg fire extinguisher trolley (~1 m)."""
    v = []
    for z in range(2, 10):
        v += [(x + dx, y + dy, z, 'hyd' if z < 9 else 'hyd2') for dx in range(-2, 3) for dy in range(-2, 3) if dx * dx + dy * dy <= 5]
    v += [(x - 3, y + k, z, 'poleG') for k in (-2, 2) for z in range(2, 12)] + [(x - 3, y + k, 12, 'poleG') for k in range(-2, 3)]
    v += box(x - 1, x + 1, y + 3, y + 3, 0, 2, 'tireA') + box(x - 1, x + 1, y - 3, y - 3, 0, 2, 'tireA')
    return skin(v)


def windsock(t):
    """4.5 m pole with a 2.4 m orange/white sock (0.9 -> 0.4 m) blowing toward +y, fluttering."""
    x0, y0 = SOCK
    v = box(x0 - 1, x0 + 1, y0 - 1, y0 + 1, 0, 1, 'conc') + [(x0, y0, z, 'poleG') for z in range(2, 46)]
    v += [(x0 + dx, y0 + 1, 44 + dz, 'poleG') for dx in range(-5, 6) for dz in range(-5, 6) if 20 <= dx * dx + dz * dz <= 28]
    ph = t * 2 * math.pi / NFRAMES
    for i in range(24):
        f = i / 23
        dz = -round(f * (2.5 + 2.0 * math.sin(ph)))
        dx = round(math.sin(i * 0.5 + ph) * 1.5 * f)
        r = 4.5 - 2.5 * f
        c = 'sock' if (i // 5) % 2 == 0 else 'sockW'
        for a in range(-5, 6):
            for b_ in range(-5, 6):
                if a * a + b_ * b_ <= r * r:
                    v.append((x0 + a + dx, y0 + 2 + i, 44 + b_ + dz, c))
    return v


CHASE = list(range(Y0 - 10, LY - 4, 10))       # sequenced flashers along the front-right edge, toward the camera


def edge_lights(t):
    v = []
    for i, y in enumerate(CHASE):
        c = 'lightW' if (i - t) % NFRAMES == 0 else 'lightOff'
        v += [(LX - 3, y, 0, 'poleG'), (LX - 3, y, 1, c), (LX - 2, y, 1, c), (LX - 3, y + 1, 1, c), (LX - 2, y + 1, 1, c)]
    for x in range(8, LX - 8, 16):                                          # blue taxi-edge lights, front-left edge
        v += [(x, LY - 2, 0, 'poleG'), (x, LY - 2, 1, 'lightB'), (x + 1, LY - 2, 1, 'lightB')]
    for y in range(Y0 + 6, LY - 8, 14):                                     # green inset centreline lights
        v += [(HCX - 1, y, -1, 'lightG'), (HCX, y, -1, 'lightG')]
    for x in list(range(8, 30, 10)) + [114, 140, 236]:                      # green taxi-lane lights (gaps between trucks)
        v += [(x, 12, -1, 'lightG'), (x, 13, -1, 'lightG')]
    return v


def env():
    v = floor_slab(ground_top, slab='joint', slab2='oil')
    v += hangar() + ops_left()
    # back strip: two refuellers parked at the hangar mouth either side of the jet nose
    v += fuel_truck(150, 2) + fuel_truck(34, 2, rev=True)
    # no-man's land (cols 3-4, x 100..156): waist-high cover only, clear of the cell centres
    v += uld(99, 47) + uld(116, 47, 'bag2') + chocks(104, 64) + chocks(121, 64)
    v += bag_cart(138, 49, 2)
    v += tug(124, 73) + bag_cart(101, 77, 1)
    v += extinguisher(128, 103) + cone(106, 104) + cone(150, 30)
    return v


def anim(t):
    v = tower(t) + radar(t) + windsock(t) + edge_lights(t)
    b = 'lightG' if t % 2 == 0 else 'lightW'                                # hangar roof beacon
    zt = htop(HCX)
    v += [(HCX, -4, zt + 1, 'hgD'), (HCX + 1, -4, zt + 1, 'hgD'), (HCX, -4, zt + 2, b), (HCX + 1, -4, zt + 2, b)]
    return v


def look(t):
    amb = ((0.98, 0.76, 0.66), (0.70, 0.58, 0.66), (0.48, 0.44, 0.60))
    L = [Light((86, 10, 72), (1.0, 0.92, 0.75), 1.0, 88),
         Light((172, 10, 72), (1.0, 0.92, 0.75), 1.0, 88),
         Light((HCX, -22, 56), (1.0, 0.8, 0.5), 1.1, 80),
         Light((16, 71, 22), (1.0, 0.85, 0.55), 0.7, 40),
         Light((6, 12, 70), (0.5, 0.9, 1.0), 0.4, 40)]
    for i, y in enumerate(CHASE):
        if (i - t) % NFRAMES == 0:
            L.append(Light((LX - 2, y, 4), (0.9, 0.9, 1.0), 0.5, 30))
    return Look(amb, L, shadow=(1.1, 0.35, 16), shadow_k=0.68, ao_k=0.8, glow=0.9)


def front():
    """Traffic cones at the front corners + a raised edge light, outside the grid."""
    v = cone(LX - 5, LY - 6) + cone(LX - 16, LY - 4) + cone(6, LY - 6)
    x, y = LX - 6, Y0 + 2
    v += [(x, y, z, 'poleG') for z in range(0, 4)] + box(x, x + 1, y, y + 1, 4, 5, 'lightY')
    return v
