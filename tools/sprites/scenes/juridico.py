"""JURIDICO: courtroom interior. Marble checker floor aligned to the grid, wood wainscot + plaster walls,
judge's bench on the far wall with seal and flags, columns, tall windows on the left wall casting sun shafts,
pews + file boxes as low cover in no-man's land. Ambient loop: flag sway, dust motes in the light shafts."""
import math, random
from common import *
from PIL import ImageDraw

NAME, FPS, NFRAMES = 'juridico', 6, 6
BG = (22, 18, 16)
WH = 60

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
    'carpet': (110, 34, 38), 'carpet2': (96, 28, 32), 'mote': (255, 240, 200),
})
EMIS |= {'glassL', 'glassL2'}

WINDOWS = [(6, 14), (24, 32), (42, 50)]      # left-wall windows: y ranges (z 16..44)
WZ0, WZ1 = 16, 44
SUN = (1.0, 0.3, -1.0)                       # sun direction per unit of z dropped (dx, dy, dz)


def in_beam(x, y, z):
    """Is world point inside a window's sun beam (ignoring occlusion)?"""
    t = x / SUN[0]
    zw, yw = z + t, y - SUN[1] * t
    if not (WZ0 <= zw <= WZ1):
        return False
    return any(a <= yw <= b for a, b in WINDOWS)


def ground_top(x, y):
    if x < 3 or y < 3:
        return 'marB' if (x + y) % 2 else 'marB2'                          # dark border along the walls
    tile = ((x - X0) // 7 + (y - Y0) // 7) % 2
    v = hsh(x // 2, y, 7) % 23 == 0 or ((x * 2 + y) % 13 == 0 and hsh(x, y) % 3 == 0)
    if tile:
        return 'mar2v' if v else 'mar2'
    return 'mar1v' if v else 'mar1'


def back_wall():
    v = []
    for x in range(-1, LX):
        for z in range(0, WH):
            if z < 13:
                c = 'wd2' if z in (0, 12) or x % 9 == 0 else ('wd3' if z in (1, 11) or x % 9 in (1, 8) else 'wd1')
            elif z == 13:
                c = 'wdT'
            elif z >= WH - 3:
                c = 'corn' if z == WH - 2 else 'corn2'
            else:
                c = 'pl1' if hsh(x, z) % 6 else 'pl2'
            v.append((x, -1, z, c))
    return v


def left_wall():
    v = []
    for y in range(0, LY):
        for z in range(0, WH):
            win = any(a <= y <= b for a, b in WINDOWS) and WZ0 <= z <= WZ1
            if win:
                a, b_ = next(w for w in WINDOWS if w[0] <= y <= w[1])
                mid = (a + b_) // 2
                arch = z > WZ1 - 4 and abs(y - mid) > (4 - (WZ1 - z)) + 1
                if arch:
                    c = 'pl1'
                elif y in (a, b_) or z in (WZ0,) or y == mid or (z - WZ0) % 9 == 0:
                    c = 'frame'
                else:
                    c = 'glassL' if (y + z) % 5 else 'glassL2'
            elif z < 13:
                c = 'wd2' if z in (0, 12) or y % 9 == 0 else ('wd3' if z in (1, 11) or y % 9 in (1, 8) else 'wd1')
            elif z == 13:
                c = 'wdT'
            elif z >= WH - 3:
                c = 'corn' if z == WH - 2 else 'corn2'
            else:
                c = 'pl1' if hsh(y, z, 2) % 6 else 'pl2'
            v.append((-1, y, z, c))
    for a, b_ in WINDOWS:                                                    # sills
        v += box(0, 1, a - 1, b_ + 1, WZ0 - 1, WZ0 - 1, 'corn2')
    v += box(-2, LX - 1, -2, -1, WH, WH, 'corn2') + box(-2, -1, -2, LY - 1, WH, WH, 'corn2')
    return v


def column(x, y, h=WH - 3, r=2.2):
    v = []
    for z in range(0, h):
        rr = r + (1 if z < 3 or z > h - 4 else 0)
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                d = dx * dx + dy * dy
                if d <= rr * rr:
                    if z < 3 or z > h - 4:
                        c = 'col2' if z in (2, h - 3) else 'col'
                    else:
                        c = 'col' if (math.atan2(dy, dx) * 6 / math.pi) % 1 > 0.25 else 'colD'   # fluting
                    v.append((x + dx, y + dy, z, c))
    return v


def pilaster_left(y):
    v = []
    for z in range(0, WH - 3):
        for dy in range(-2, 3):
            c = 'col2' if abs(dy) == 2 or z < 3 or z > WH - 6 else 'col'
            v.append((0, y + dy, z, c))
            if abs(dy) < 2:
                v.append((1, y + dy, z, 'colD' if dy == 0 and 3 < z < WH - 6 else 'col'))
    return v


def judges_bench(x0, x1):
    v = box(x0 - 4, x1 + 4, 0, 11, 0, 2, 'wd2') + box(x0 - 4, x1 + 4, 0, 11, 3, 3, 'carpet')   # dais
    v += box(x0, x1, 7, 10, 4, 16, 'wd1')                                                        # bench body
    for x in range(x0, x1 + 1):
        for z in range(4, 17):
            if x in (x0, x1) or (x - x0) % 7 == 0 or z in (4, 16):
                v.append((x, 10, z, 'wd3'))
            elif (x - x0) % 7 in (1, 6) or z in (5, 15):
                v.append((x, 10, z, 'wd2'))
    v += box(x0 - 1, x1 + 1, 6, 11, 17, 17, 'wdT')                                              # desk top
    cx = (x0 + x1) // 2
    v += box(cx - 3, cx + 3, 1, 3, 4, 26, 'leather') + box(cx - 3, cx + 3, 3, 5, 4, 9, 'leather2')   # chair
    v += box(cx - 3, cx + 3, 1, 1, 27, 27, 'gold2')
    v += [(cx + 4, 8, 18, 'wd2'), (cx + 5, 8, 18, 'wd3'), (cx + 5, 8, 19, 'wd3')]              # gavel
    v += box(cx - 6, cx - 2, 8, 9, 18, 18, 'paper') + [(cx - 5, 8, 19, 'paper2'), (cx - 4, 9, 19, 'paper')]
    v += box(cx - 4, cx + 4, 11, 11, 9, 11, 'gold') + box(cx - 3, cx + 3, 11, 11, 10, 10, 'gold2')  # nameplate
    # seal on the wall
    for x in range(cx - 7, cx + 8):
        for z in range(32, 47):
            d = math.hypot(x - cx, z - 39)
            if d <= 7.2:
                c = 'gold2' if d > 6.2 else ('gold' if d > 4.5 or (abs(x - cx) < 2 and abs(z - 39) < 4) else 'wd2')
                v.append((x, 0, z, c))
    return v


def flag_stand(x, y, t, cols, ph=0.0):
    v = box(x - 1, x + 1, y - 1, y + 1, 0, 0, 'gold2') + [(x, y, z, 'wd2') for z in range(1, 34)] + [(x, y, 34, 'gold')]
    for i in range(10):                                                       # hanging flag, swaying in +y
        for k in range(14):
            sway = round(math.sin(t * 2 * math.pi / NFRAMES + ph + k * 0.35) * 0.9 * (k / 13) + 0.3 * (i / 9))
            c = cols[0] if i < 5 else cols[1]
            if 4 <= i <= 6 and 5 <= k <= 8:
                c = cols[2]
            v.append((x + 1 + (i // 5), y + 1 + i % 5 + sway, 32 - k - (i // 5) * 0, c))
    return v


def desk(x0, x1, y0, y1, h=8):
    v = box(x0, x1, y0, y1, h, h, 'wdT') + box(x0, x1, y1, y1, 0, h - 1, 'wd1') + box(x1, x1, y0, y1, 0, h - 1, 'wd2')
    v += [(x, y1, h - 2, 'wd3') for x in range(x0, x1 + 1)]
    return v


def paper_stack(x, y, z, h, seed=0):
    v = []
    for k in range(h):
        o = (hsh(x, y, k, seed) % 3) - 1 if k % 2 else 0
        c = 'paper' if k % 3 else 'paper2'
        v += box(x + (o > 0), x + 2 + (o > 0), y + (o < 0), y + 1 + (o < 0), z + k, z + k, c)
    return v


def file_boxes(x, y, n=2, lay=1):
    v = []
    for l in range(lay):
        for i in range(n):
            bx = x + i * 5 + (l % 2) * 2
            v += box(bx, bx + 3, y, y + 3, l * 4, l * 4 + 3, 'fbox') + [(bx + 3, y + k, l * 4 + 2, 'fbox2') for k in range(1, 3)]
            v += [(bx + k, y + 3, l * 4 + 3, 'fbox2') for k in range(4)]
    return v


def pew(x, y0, y1):
    """Pew along y (seat facing -x), back on the +x side; ends carved."""
    v = box(x, x + 3, y0, y1, 3, 3, 'wd3') + box(x + 3, x + 3, y0, y1, 4, 8, 'wd1') + [(x + 3, y, 9, 'wdT') for y in range(y0, y1 + 1)]
    for y in (y0, y1):
        v += box(x, x + 3, y, y, 0, 6, 'wd2') + [(x + 1, y, 7, 'wd2')]
    v += [(x + 1, y, z, 'wd2') for y in range(y0 + 3, y1, 5) for z in (0, 1, 2)]
    return v


def env():
    v = floor_slab(ground_top, slab='marB', slab2='marB2')
    v += back_wall() + left_wall()
    v += pilaster_left(18) + pilaster_left(37) + pilaster_left(54)
    v += column(18, 4) + column(36, 4) + column(92, 4) + column(110, 4)
    v += judges_bench(52, 76)
    v += desk(40, 47, 3, 8, 7) + paper_stack(41, 4, 8, 4) + paper_stack(44, 5, 8, 6, 1)        # clerk
    v += desk(81, 88, 3, 8, 7) + paper_stack(82, 4, 8, 3, 2) + box(86, 87, 4, 5, 8, 9, 'wd2')      # witness / stenographer
    v += file_boxes(96, 4, 3, 2) + paper_stack(118, 3, 0, 7, 3) + paper_stack(114, 6, 0, 4, 4) + file_boxes(2, 3, 1, 3)
    v += box(24, 31, 4, 9, 0, 0, 'carpet') + box(5, 10, 26, 30, 0, 8, 'wd1') + box(5, 10, 26, 30, 9, 9, 'wdT')  # podium by the wall
    # no-man's land cover (cols 3-4): pews + file boxes + paper stacks, all <= 9
    v += pew(54, 14, 25) + pew(69, 28, 39) + pew(55, 42, 53)
    v += file_boxes(64, 16, 1, 2) + paper_stack(66, 21, 0, 5, 5) + file_boxes(60, 33, 1, 1) + paper_stack(73, 46, 0, 6, 6)
    v += [(x, y, 0, 'paper') for x, y in ((62, 40), (63, 41), (52, 30), (75, 22), (70, 51))]       # strewn pages
    return v


def anim(t):
    return flag_stand(46, 10, t, ('flagG', 'flagY', 'flagB')) + flag_stand(82, 10, t, ('flagB', 'flagW', 'gold'), ph=1.7)


def extra_light(x, y, z, fi):
    if fi != 0:
        return None
    if in_beam(x + .5, y + .5, z + 1):
        return (0.55, 0.48, 0.32)
    return None


def look(t):
    amb = ((0.98, 0.92, 0.84), (0.84, 0.78, 0.72), (0.60, 0.56, 0.56))
    L = [Light((64, 14, 30), (1.0, 0.85, 0.6), 0.35, 60)]
    lk = Look(amb, L, shadow=(0.0, 0.0, 0), shadow_k=0.8, ao_k=0.8, glow=0.55)
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
            for z in (WZ0, WZ1 - 3):
                pts.append(scr(b, 0, y, z))
                tt = z / -SUN[2]
                pts.append(scr(b, tt * SUN[0], y + tt * SUN[1], 0))
        hull = convex_hull(pts)
        d.polygon(hull, fill=(255, 236, 190, int(42 * k)))
    hz = hz.filter(ImageFilter.GaussianBlur(1.5))
    a = np.asarray(im, np.float32); h = np.asarray(hz, np.float32)
    al = h[:, :, 3:4] / 255.0
    a[:, :, 0:3] = a[:, :, 0:3] + h[:, :, 0:3] * al
    rnd = random.Random(21)
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA').copy()
    px = out.load()
    for i in range(70):
        wy = rnd.choice(WINDOWS)
        y0 = rnd.uniform(wy[0], wy[1]); z0 = rnd.uniform(WZ0, WZ1)
        s0 = rnd.uniform(0, 1)
        s = (s0 + t / NFRAMES) % 1.0   # drift down the beam, 1 pass per loop
        tt = s * WZ1
        X, Y, Z = tt * SUN[0], y0 + tt * SUN[1], z0 - tt + math.sin(t * 2 * math.pi / NFRAMES + i) * 0.7
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


def front():
    """Brass stanchions with red velvet rope along the front-left edge (player side, outside the grid)."""
    v = []
    y = LY - 2
    posts = [6, 20, 34, 48]
    for x in posts:
        v += box(x - 1, x + 1, y - 1, y + 1, 0, 0, 'brassP') + [(x, y, z, 'brassP') for z in range(1, 6)] + [(x, y, 6, 'gold')]
    for a, b_ in zip(posts, posts[1:]):
        for x in range(a + 1, b_):
            f = (x - a) / (b_ - a)
            z = round(5 - 2 * math.sin(f * math.pi))
            v.append((x, y, z, 'rope' if x % 2 else 'rope2'))
    return v
