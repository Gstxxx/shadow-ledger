"""JURIDICO: courtroom interior. Marble checker floor aligned to the grid, wood wainscot + plaster walls,
judge's bench on the far wall with seal and flags, columns, tall arched windows on the left wall casting sun shafts,
pews + file boxes + an overturned counsel table as low cover in no-man's land.
Ambient loop: flag sway, dust motes drifting down the light shafts.

Scale 10 voxels = 1 m (common.M): walls 7.6 m (76), wainscot 1.2 m, arched windows 1.4 x 3.6 m, columns 0.7 m across,
judge's dais 0.4 m with a 1.3 m bench front, desks 0.75 m, pews 0.45 m seat / 1.0 m back, flag stands 2.3 m,
doors 1.2 x 2.2 m. A person (18 tall) stands in a 28-voxel cell."""
import math, random
from common import *
from PIL import ImageDraw

NAME, FPS, NFRAMES = 'juridico', 6, 6
BG = (22, 18, 16)
WH = 76                                      # wall height (7.6 m)
WAIN = 12                                    # wainscot height (1.2 m)

PAL.update({
    'mar1': (214, 206, 190), 'mar1v': (186, 178, 164), 'mar2': (92, 104, 98), 'mar2v': (120, 132, 124),
    'marB': (70, 46, 36), 'marB2': (90, 60, 44),
    'wd1': (92, 56, 34), 'wd2': (74, 44, 26), 'wd3': (114, 72, 44), 'wdT': (130, 86, 52),
    'pl1': (222, 212, 190), 'pl2': (206, 196, 174), 'corn': (236, 228, 210), 'corn2': (190, 180, 160),
    'col': (232, 226, 212), 'col2': (206, 198, 182), 'colD': (180, 172, 156),
    'glassL': (226, 238, 250), 'glassL2': (190, 214, 240), 'frame': (80, 60, 44),
    'leather': (120, 30, 34), 'leather2': (92, 22, 26), 'gold': (226, 186, 80), 'gold2': (180, 140, 50),
    'paper': (236, 232, 220), 'paper2': (214, 208, 194), 'fbox': (176, 150, 110), 'fbox2': (150, 126, 90),
    'flagG': (40, 130, 70), 'flagY': (240, 200, 50), 'flagB': (40, 70, 150), 'flagW': (230, 232, 236), 'flagG2': (30, 100, 54),
    'flagB2': (30, 52, 120), 'brassP': (210, 170, 80), 'rope': (170, 30, 40), 'rope2': (130, 20, 30),
    'carpet': (110, 34, 38), 'carpet2': (96, 28, 32), 'mote': (255, 240, 200), 'lampG': (70, 190, 110),
})
EMIS |= {'glassL', 'glassL2', 'lampG'}

WINDOWS = [(8, 21), (37, 50), (66, 79), (95, 108)]     # left-wall windows: y ranges (1.4 m wide)
PIL_Y = [29, 58, 87]                                   # left-wall pilasters between the windows
WZ0, WZ1 = 24, 60                                      # sill at 2.4 m, arch crown at 6.0 m
SUN = (1.0, 0.3, -1.0)                                 # sun direction per unit of z dropped (dx, dy, dz)

BENCH = (104, 152)                                     # judge's bench x range (4.8 m), centred on the room
COLS_X = [30, 80, 176, 236]                            # free-standing columns in front of the back wall
DOOR_X = 212                                           # chambers door on the back wall
SCONCES = [(56, 44), (200, 44)]                        # (x, z) brass wall lamps on the back wall


def shell(x0, x1, y0, y1, z0, z1, c, side=None):
    """Only the faces this camera can see (top, +y, +x): big furniture stays cheap to render."""
    s = side or c
    v = [(x, y, z1, c) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    v += [(x, y1, z, s) for x in range(x0, x1 + 1) for z in range(z0, z1)]
    v += [(x1, y, z, s) for y in range(y0, y1) for z in range(z0, z1)]
    return v


def in_beam(x, y, z):
    """Is world point inside a window's sun beam (ignoring occlusion)?"""
    t = x / SUN[0]
    zw, yw = z + t, y - SUN[1] * t
    if not (WZ0 <= zw <= WZ1):
        return False
    return any(a <= yw <= b for a, b in WINDOWS)


def ground_top(x, y):
    if x < 4 or y < 4:
        return 'marB' if (x + y) % 2 else 'marB2'                          # dark border along the walls
    tile = ((x - X0) // 14 + (y - Y0) // 14) % 2                          # 1.4 m slabs, 2 per combat cell
    v = hsh(x // 2, y, 7) % 23 == 0 or ((x * 2 + y) % 17 == 0 and hsh(x, y) % 3 == 0)
    if tile:
        return 'mar2v' if v else 'mar2'
    return 'mar1v' if v else 'mar1'


def wain(i, z, seed=0):
    """Wainscot: raised panels 1.4 m wide, rails at the bottom/top, cap rail at 1.2 m."""
    p = i % 14
    if z in (0, WAIN - 1) or p == 0:
        return 'wd2'
    if z in (1, 2, WAIN - 2) or p in (1, 13):
        return 'wd3'
    return 'wd1'


def wall_col(i, z, seed):
    if z < WAIN:
        return wain(i, z)
    if z == WAIN:
        return 'wdT'
    if z == WAIN + 1:
        return 'wd2'
    if z >= WH - 4:
        return 'corn' if z in (WH - 2, WH - 4) else 'corn2'
    if z == WH - 9:
        return 'corn2'                                                     # picture rail
    return 'pl1' if hsh(i, z, seed) % 6 else 'pl2'


def back_wall():
    v = []
    for x in range(-1, LX):
        for z in range(0, WH):
            c = wall_col(x, z, 0)
            if BENCH[0] - 12 <= x <= BENCH[1] + 12 and z < 38:             # tall panelling behind the bench
                p = (x - BENCH[0] + 12) % 12
                if z >= 36:
                    c = 'wdT' if z == 37 else 'gold2'
                elif z in (0, 35) or p == 0:
                    c = 'wd2'
                elif z in (1, 34) or p in (1, 11) or z % 17 in (0, 1):
                    c = 'wd3'
                else:
                    c = 'wd1'
            v.append((x, -1, z, c))
    v += box(-2, LX - 1, -2, -1, WH, WH, 'corn2')
    v += [(x, 0, WH - 3, 'corn') for x in range(0, LX)] + [(x, 0, WAIN, 'wdT') for x in range(0, LX)]   # moulding lips
    v += [(x, 0, 38, 'wdT') for x in range(BENCH[0] - 12, BENCH[1] + 13)]
    return v


def left_wall():
    v = []
    for y in range(0, LY):
        for z in range(0, WH):
            w = next((w for w in WINDOWS if w[0] <= y <= w[1]), None)
            if w and WZ0 <= z <= WZ1:
                a, b_ = w
                mid = (a + b_) / 2
                rad = (b_ - a) / 2 + 0.5
                zc = WZ1 - rad
                if z > zc and (y - mid) ** 2 + (z - zc) ** 2 > rad * rad:
                    c = wall_col(y, z, 2)                                  # plaster above the round arch
                elif y in (a, b_) or z == WZ0 or abs(y - mid) < 0.6 or (z - WZ0) % 9 == 0 or \
                        (z > zc and (y - mid) ** 2 + (z - zc) ** 2 > (rad - 1.2) ** 2):
                    c = 'frame'
                else:
                    c = 'glassL' if (y + z) % 5 else 'glassL2'
            else:
                c = wall_col(y, z, 2)
            v.append((-1, y, z, c))
    for a, b_ in WINDOWS:                                                    # sills + keystones
        v += box(0, 1, a - 1, b_ + 1, WZ0 - 1, WZ0 - 1, 'corn2') + box(0, 0, a - 1, b_ + 1, WZ0 - 2, WZ0 - 2, 'corn')
        m = (a + b_) // 2
        v += box(0, 0, m - 1, m + 1, WZ1 + 1, WZ1 + 3, 'corn')
    v += box(-2, -1, -2, LY - 1, WH, WH, 'corn2')
    v += [(0, y, WH - 3, 'corn') for y in range(0, LY)] + [(0, y, WAIN, 'wdT') for y in range(0, LY)]
    return v


def column(x, y, h=WH - 4, r=3.5):
    """Fluted column 0.7 m across, square plinth and capital (hollow shaft)."""
    v = shell(x - 5, x + 5, y - 5, y + 5, 0, 2, 'col2', 'colD') + shell(x - 4, x + 4, y - 4, y + 4, 3, 4, 'col', 'col2')
    v += shell(x - 5, x + 5, y - 5, y + 5, h - 2, h - 1, 'col', 'col2') + shell(x - 4, x + 4, y - 4, y + 4, h - 5, h - 3, 'col2', 'colD')
    for z in range(5, h - 5):
        for dx in range(-4, 5):
            for dy in range(-4, 5):
                d = dx * dx + dy * dy
                if (r - 1.6) ** 2 <= d <= r * r:
                    c = 'col' if (math.atan2(dy, dx) * 8 / math.pi) % 1 > 0.3 else 'colD'   # fluting
                    v.append((x + dx, y + dy, z, c))
    return v


def pilaster_left(y, h=WH - 4):
    """Flat pilaster on the left wall, 0.8 m wide, 0.2 m proud."""
    v = []
    for z in range(0, h):
        cap = z < 3 or z > h - 4
        for dy in range(-4, 5):
            if abs(dy) == 4 and not cap:
                continue
            c = 'col2' if abs(dy) >= 3 or cap else ('colD' if dy in (-1, 1) and z % 1 == 0 else 'col')
            v.append((1, y + dy, z, c))
            if abs(dy) <= 3:
                v.append((0, y + dy, z, 'col'))
    return v


def seal(cx, cz, r=11):
    v = []
    for x in range(cx - r, cx + r + 1):
        for z in range(cz - r, cz + r + 1):
            d = math.hypot(x - cx, z - cz)
            if d <= r + 0.2:
                if d > r - 1.2:
                    c = 'gold2'
                elif d > r - 3.5 or (abs(x - cx) < 2 and abs(z - cz) < 6) or (abs(z - cz) < 2 and abs(x - cx) < 6):
                    c = 'gold'
                else:
                    c = 'wd2'
                v.append((x, 0, z, c))
    v += [(x, 1, z, 'gold') for x in range(cx - 1, cx + 2) for z in range(cz - 1, cz + 2)]
    return v


def judges_bench(x0, x1):
    """Dais 0.4 m (6 m wide x 2.2 m deep), bench front 1.3 m above it, high-backed leather chair, gavel, seal."""
    v = shell(x0 - 6, x1 + 6, 0, 22, 0, 3, 'carpet', 'wd2')                                      # dais
    v += [(x, 22, 3, 'wd3') for x in range(x0 - 6, x1 + 7)] + [(x1 + 6, y, 3, 'wd3') for y in range(0, 23)]
    v += [(x, y, 3, 'carpet2') for x in range(x0 - 6, x1 + 7) for y in range(0, 22) if (x + y) % 7 == 0]
    for k in range(3):                                                                           # steps at both ends
        v += shell(x0 - 9 - k * 0, x0 - 7, 16 + k * 2, 22, 0, 2 - k, 'wd3', 'wd2')
    FZ0, FZ1 = 4, 17
    v += shell(x0, x1, 14, 20, FZ0, FZ1, 'wd1', 'wd1')                                           # bench body
    for x in range(x0, x1 + 1):                                                                  # raised panels
        for z in range(FZ0, FZ1):
            p = (x - x0) % 8
            if p == 0 or z in (FZ0, FZ0 + 1, FZ1 - 1):
                v.append((x, 21, z, 'wd3'))
            elif p in (1, 7) or z in (FZ0 + 2, FZ1 - 2):
                v.append((x, 21, z, 'wd2'))
    v += [(x1 + 1, y, z, 'wd3' if (y + z) % 6 else 'wd2') for y in range(14, 21) for z in range(FZ0, FZ1)]
    v += shell(x0 - 1, x1 + 2, 13, 22, FZ1 + 1, FZ1 + 1, 'wdT', 'wd3')                           # desk top 1.4 m
    cx = (x0 + x1) // 2
    v += shell(cx - 4, cx + 4, 4, 7, FZ0, FZ0 + 20, 'leather', 'leather')                         # chair back (to ~2.4 m)
    v += box(cx - 4, cx + 4, 4, 4, FZ0 + 21, FZ0 + 21, 'gold2') + [(cx, 4, FZ0 + 22, 'gold')]
    v += shell(cx - 4, cx + 4, 8, 12, FZ0, FZ0 + 5, 'leather2', 'leather')                        # seat
    v += shell(cx + 5, cx + 5, 7, 12, FZ0, FZ0 + 8, 'leather2') + shell(cx - 5, cx - 5, 7, 12, FZ0, FZ0 + 8, 'leather2')
    gz = FZ1 + 2                                                                                 # gavel + block
    v += [(cx + 7, 16, gz, 'wd2'), (cx + 8, 16, gz, 'wd2'), (cx + 9, 15, gz, 'wd3'), (cx + 9, 16, gz, 'wd3'), (cx + 9, 17, gz, 'wd3')]
    v += [(cx + 10, y, gz, 'wd3') for y in (15, 16, 17)] + [(cx + 6, 16, gz, 'wd3')]
    v += paper_stack(cx - 9, 15, gz, 3) + paper_stack(cx - 14, 16, gz, 5, 1) + [(cx - 3, 17, gz, 'paper'), (cx - 2, 17, gz, 'paper2')]
    v += box(cx - 6, cx + 6, 22, 22, 10, 12, 'gold') + box(cx - 5, cx + 5, 22, 22, 11, 11, 'gold2')   # nameplate
    v += seal(cx, 52)
    return v


def flag_stand(x, y, t, cols, ph=0.0):
    """Indoor flag stand 2.3 m: weighted brass base, wooden pole, gold finial; flag 1.0 x 1.3 m drooping in +y."""
    v = box(x - 2, x + 2, y - 2, y + 2, 0, 0, 'gold2') + box(x - 1, x + 1, y - 1, y + 1, 1, 1, 'gold')
    v += [(x, y, z, 'wd2') for z in range(2, 23)] + [(x, y, 23, 'gold'), (x, y, 24, 'gold'), (x, y, 25, 'gold2')]
    w = 2 * math.pi / NFRAMES
    for j in range(13):                                                       # along the fly (+y)
        f = j / 12
        sway_x = round(math.sin(t * w + ph + j * 0.6) * 1.2 * f)
        droop = int(f * f * 4)
        for i in range(10):                                                   # down the hoist
            dz = 21 - i - droop
            dy = j - 6; di = i - 4.5
            if abs(dy) / 6.5 + abs(di) / 5 <= 0.78:
                c = cols[1]
                if dy * dy + di * di <= 5.5:
                    c = cols[2]
            else:
                c = cols[0]
            v.append((x + sway_x, y + 1 + j, dz, c))
            if j > 2 and (j + i) % 4 == 0:
                v.append((x + sway_x + 1, y + 1 + j, dz, c))                  # folds
    return v


def desk(x0, x1, y0, y1, h=7, top='wdT'):
    """Desk 0.75 m: top slab, modesty panel on +y, panelled side on +x."""
    v = box(x0, x1, y0, y1, h, h, top) + box(x0, x1, y1, y1, 0, h - 1, 'wd1') + box(x1, x1, y0, y1, 0, h - 1, 'wd2')
    v += [(x, y1, h - 2, 'wd3') for x in range(x0, x1 + 1)] + [(x, y1, 1, 'wd2') for x in range(x0, x1 + 1)]
    v += [(x, y1, z, 'wd2') for x in range(x0 + 6, x1, 6) for z in range(2, h - 2)]
    return v


def banker_lamp(x, y, z):
    v = box(x, x + 2, y, y + 1, z, z, 'brassP') + [(x + 1, y, z + 1, 'brassP'), (x + 1, y, z + 2, 'brassP')]
    v += box(x - 1, x + 3, y, y + 1, z + 3, z + 3, 'lampG')
    return v


def paper_stack(x, y, z, h, seed=0):
    """A4-ish stack (0.2 x 0.3 m), one voxel per ~200 sheets, sheets skewed."""
    v = []
    for k in range(h):
        o = (hsh(x, y, k, seed) % 3) - 1 if k % 2 else 0
        c = 'paper' if k % 3 else 'paper2'
        v += box(x + (o > 0), x + 2 + (o > 0), y + (o < 0), y + 1 + (o < 0), z + k, z + k, c)
    return v


def file_boxes(x, y, n=2, lay=1):
    """Archive boxes 0.4 x 0.4 x 0.3 m, side by side (n) and stacked (lay)."""
    v = []
    for l in range(lay):
        for i in range(n):
            bx = x + i * 5 + (l % 2) * 2
            z0 = l * 3
            v += box(bx, bx + 3, y, y + 3, z0, z0 + 2, 'fbox')
            v += [(bx + 3, y + 1, z0 + 1, 'fbox2'), (bx + 3, y + 2, z0 + 1, 'fbox2')]                # handle hole
            v += [(bx + k, y + 3, z0 + 2, 'fbox2') for k in range(4)] + [(bx + 3, y + k, z0 + 2, 'fbox2') for k in range(4)]
            v += [(bx + 1, y + 3, z0 + 1, 'paper')]                                                  # label
    return v


def pew(x, y0, y1):
    """Gallery pew along y (seat facing -x): seat 0.45 m, 0.5 m deep, back to 1.0 m on the +x side, carved ends."""
    v = shell(x, x + 4, y0 + 1, y1 - 1, 4, 4, 'wd3', 'wd2')
    v += box(x + 5, x + 5, y0, y1, 3, 9, 'wd1') + [(x + 5, y, 10, 'wdT') for y in range(y0, y1 + 1)]
    v += [(x + 6, y, z, 'wd2') for y in range(y0 + 1, y1, 7) for z in range(4, 10)]           # back stiles
    v += [(x + 4, y, 3, 'wd2') for y in range(y0 + 1, y1)]                                       # seat apron
    for y in (y0, y1):
        v += box(x, x + 5, y, y, 0, 5, 'wd2') + [(x + 1, y, 6, 'wd2'), (x + 2, y, 6, 'wd2'), (x + 2, y, 7, 'wd2')]
        v += [(x + 3, y, 7, 'wd2'), (x + 4, y, 8, 'wd2'), (x + 4, y, 7, 'wd2'), (x + 5, y, 9, 'wd2'), (x + 5, y, 10, 'wdT')]
    return v


def counsel_table_over(x, y0, y1):
    """Counsel table knocked on its side: 0.8 m top standing vertically (faces +x), legs pointing at the enemy."""
    v = box(x, x, y0, y1, 0, 7, 'wd1') + [(x, y, 8, 'wdT') for y in range(y0, y1 + 1)]
    v += [(x, y, z, 'wd3') for y in (y0, y1) for z in range(0, 8)]
    v += box(x - 1, x - 1, y0, y1, 1, 1, 'wd2')                                                  # apron
    for ly in (y0 + 1, y1 - 1):
        for lz in (1, 6):
            v += [(x + k, ly, lz, 'wd2') for k in range(1, 8)]                                   # legs (0.75 m)
    return v


def lectern(x, y):
    """Speaker's lectern 1.1 m with a slanted top."""
    v = shell(x, x + 5, y, y + 4, 0, 9, 'wdT', 'wd1')
    v += [(x + 5, yy, z, 'wd3') for yy in range(y, y + 4) for z in (2, 8)]
    v += [(x + k, y + 1, 10 + (5 - k) // 3, 'wdT') for k in range(6)] + [(x + k, y + 3, 10 + (5 - k) // 3, 'wdT') for k in range(6)]
    v += [(x + k, y + 2, 10 + (5 - k) // 3, 'wd3') for k in range(6)] + [(x + 3, y + 2, 11, 'paper')]
    return v


def witness_stand(x0, x1, y0, y1):
    """Witness box: 0.3 m platform, panelled enclosure to 1.1 m, rail, chair and microphone."""
    v = shell(x0, x1, y0, y1, 0, 2, 'wd1', 'wd2')
    for x in range(x0, x1 + 1):
        for z in range(3, 11):
            v.append((x, y1, z, 'wd3' if (x - x0) % 6 == 0 or z in (3, 10) else 'wd1'))
    for y in range(y0, y1):
        for z in range(3, 11):
            v.append((x1, y, z, 'wd3' if (y - y0) % 6 == 0 or z in (3, 10) else 'wd2'))
    v += [(x, y1, 11, 'wdT') for x in range(x0, x1 + 1)] + [(x1, y, 11, 'wdT') for y in range(y0, y1)]
    cx = (x0 + x1) // 2
    v += shell(cx - 3, cx + 3, y0 + 2, y0 + 3, 3, 15, 'leather', 'leather') + shell(cx - 3, cx + 3, y0 + 4, y0 + 7, 3, 7, 'leather2')
    v += [(cx + 2, y1 - 1, z, 'metal2') for z in range(11, 15)] + [(cx + 2, y1, 15, 'metal')]   # mic
    return v


def door_back(x):
    """Panelled double door 1.2 x 2.2 m to the judge's chambers, moulded casing and pediment."""
    v = box(x - 3, x + 14, 0, 0, 0, 25, 'wd2') + box(x - 4, x + 15, 0, 1, 26, 27, 'wdT') + box(x - 2, x + 13, 1, 1, 28, 28, 'wd3')
    for xx in range(x, x + 12):
        for z in range(0, 22):
            p = (xx - x) % 6
            c = 'wd2' if p in (0, 5) or z in (0, 21, 11) else ('wd3' if p in (1, 4) or z in (1, 20, 10, 12) else 'wd1')
            v.append((xx, 1, z, c))
    v += [(x + 5, 2, 10, 'brassP'), (x + 6, 2, 10, 'brassP')]
    return v


def sconce(x, z):
    v = box(x - 1, x + 1, 0, 0, z - 3, z + 1, 'brassP') + [(x, 1, z - 2, 'brassP'), (x, 2, z - 1, 'brassP')]
    v += box(x - 1, x + 1, 2, 3, z, z + 1, 'bulb') + box(x - 1, x + 1, 2, 3, z + 2, z + 2, 'gold2')
    return v


def env():
    v = floor_slab(ground_top, slab='marB', slab2='marB2')
    v += back_wall() + left_wall()
    for y in PIL_Y:
        v += pilaster_left(y)
    for x in COLS_X:
        v += column(x, 6)
    for x, z in SCONCES:
        v += sconce(x, z)
    v += judges_bench(*BENCH)
    v += door_back(DOOR_X)
    # back strip (y < 26): clerk's desk, witness stand, archive boxes
    v += desk(42, 66, 6, 15, 7) + paper_stack(44, 8, 8, 5) + paper_stack(48, 9, 8, 3, 1) + banker_lamp(60, 8, 8)
    v += shell(52, 56, 2, 4, 0, 10, 'leather', 'leather2')                                       # clerk's chair back
    v += witness_stand(186, 204, 3, 18)
    v += file_boxes(226, 14, 2, 3) + file_boxes(214, 18, 1, 1) + paper_stack(240, 6, 0, 6, 3)
    v += file_boxes(88, 18, 1, 2) + paper_stack(160, 18, 0, 4, 4)
    # left strip (x < 16): lectern, wall bench, archive boxes
    v += lectern(6, 22)
    v += box(3, 7, 66, 84, 4, 4, 'wd3') + box(2, 2, 66, 84, 4, 9, 'wd1') + [(2, y, 10, 'wdT') for y in range(66, 85)]
    v += box(3, 7, 66, 66, 0, 3, 'wd2') + box(3, 7, 84, 84, 0, 3, 'wd2')
    v += file_boxes(4, 100, 1, 3) + file_boxes(4, 106, 1, 2)
    # combat grid (all 8 columns): no props, only flat floor detail -- units stand and walk anywhere on it
    rnd = random.Random(5)
    v += [(rnd.randint(102, 154), rnd.randint(28, 108), 0, rnd.choice(('paper', 'paper2'))) for _ in range(26)]   # strewn pages
    return v


def anim(t):
    return flag_stand(94, 12, t, ('flagG', 'flagY', 'flagB')) + flag_stand(164, 12, t, ('flagB', 'flagW', 'gold'), ph=1.7)


def extra_light(x, y, z, fi):
    if fi != 0:
        return None
    if in_beam(x + .5, y + .5, z + 1):
        return (0.55, 0.48, 0.32)
    return None


def look(t):
    amb = ((0.98, 0.92, 0.84), (0.84, 0.78, 0.72), (0.60, 0.56, 0.56))
    L = [Light((128, 26, 50), (1.0, 0.85, 0.6), 0.35, 108)]
    L += [Light((x, 4, z), (1.0, 0.82, 0.55), 0.5, 46) for x, z in SCONCES]
    L += [Light((62, 9, 11), (0.5, 1.0, 0.6), 0.3, 18)]                   # banker's lamp
    lk = Look(amb, L, shadow=(0.3, 0.1, 16), shadow_k=0.8, ao_k=0.8, glow=0.55)
    lk.extra = extra_light
    return lk


def post(im, t, b):
    """Volumetric sun shafts (2D additive haze) + drifting dust motes inside the beams."""
    W, H = im.size
    hz = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(hz)
    k = 1.0 + 0.12 * math.sin(t * 2 * math.pi / NFRAMES)
    for a, b_ in WINDOWS:
        pts = []
        for y in (a + 1, b_):
            for z in (WZ0, WZ1 - 5):
                pts.append(scr(b, 0, y, z))
                tt = z / -SUN[2]
                pts.append(scr(b, tt * SUN[0], y + tt * SUN[1], 0))
        hull = convex_hull(pts)
        d.polygon(hull, fill=(255, 236, 190, int(40 * k)))
    hz = hz.filter(ImageFilter.GaussianBlur(2.5))
    a = np.asarray(im, np.float32); h = np.asarray(hz, np.float32)
    al = h[:, :, 3:4] / 255.0
    a[:, :, 0:3] = a[:, :, 0:3] + h[:, :, 0:3] * al
    rnd = random.Random(21)
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA').copy()
    px = out.load()
    for i in range(160):
        wy = rnd.choice(WINDOWS)
        y0 = rnd.uniform(wy[0], wy[1]); z0 = rnd.uniform(WZ0, WZ1)
        s0 = rnd.uniform(0, 1)
        s = (s0 + t / NFRAMES) % 1.0   # drift down the beam, 1 pass per loop
        tt = s * WZ1
        X, Y, Z = tt * SUN[0], y0 + tt * SUN[1], z0 - tt + math.sin(t * 2 * math.pi / NFRAMES + i) * 1.2
        if Z < 0.5:
            continue
        sx, sy = scr(b, X, Y, Z)
        sx, sy = int(sx), int(sy)
        if 0 <= sx < W and 0 <= sy < H and px[sx, sy][3]:
            r, g, bb, al_ = px[sx, sy]
            px[sx, sy] = (min(255, r + 60), min(255, g + 54), min(255, bb + 40), al_)
    return out


def convex_hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    def cross(o, a, b_):
        return (a[0] - o[0]) * (b_[1] - o[1]) - (a[1] - o[1]) * (b_[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def stanchions(posts, fixed, along_x=True):
    """Brass stanchions 1.0 m with a sagging red velvet rope (0.9 m at the posts)."""
    v = []
    for p in posts:
        x, y = (p, fixed) if along_x else (fixed, p)
        v += box(x - 2, x + 2, y - 2, y + 2, 0, 0, 'brassP') + box(x - 1, x + 1, y - 1, y + 1, 1, 1, 'gold2')
        v += [(x, y, z, 'brassP') for z in range(2, 10)] + box(x - 1, x + 1, y - 1, y + 1, 10, 10, 'gold') + [(x, y, 11, 'gold')]
    for a, b_ in zip(posts, posts[1:]):
        for s in range(a + 1, b_):
            f = (s - a) / (b_ - a)
            z = round(9 - 3 * math.sin(f * math.pi))
            c = 'rope' if s % 2 else 'rope2'
            v.append((s, fixed, z, c) if along_x else (fixed, s, z, c))
    return v


def front():
    """Velvet-rope stanchions along the front-left edge (player side) and the front-right edge, outside the grid."""
    return stanchions([8, 30, 52, 74, 96], LY - 4) + stanchions([66, 88, 110], LX - 4, along_x=False)
