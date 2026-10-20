"""MENU hero scene: the alley at night in the rain. Neon BAR, door light, bodyguard (rig urban body) smoking
under the door light, parked sedan with headlights, steam, wet reflections. 12-frame seamless loop.
Outputs portrait 216x384 (x5 = 1080x1920) and landscape 384x216 (x5 = 1920x1080) frames + atlases.
Scale 10 voxels = 1 m like the rig: the guard (18) stands at a 10x22 door, the sedan is 4.8 m long, storeys are 24."""
import json, math, os, random, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import urbano as U

N, FPS = 12, 8
GX, GY = 200, 128                 # ground extent
WH = 96                           # building height (4 storeys of 24)
SIDEWALK = 28                     # sidewalk depth (y, ~2.8 m), curb at y = SIDEWALK
DOOR = 60
LANE = SIDEWALK + 37              # centre line, one 3.7 m lane from the curb
B = make_bounds(-2, GX, -2, GY, -2, WH + 36, pad=4)

PAL.update({
    'side1': (92, 92, 96), 'side2': (84, 84, 88), 'side3': (100, 100, 104), 'curb': (130, 128, 124), 'curb2': (110, 108, 104),
    'road1': (40, 42, 48), 'road2': (36, 38, 44), 'road3': (46, 48, 54), 'lane': (200, 190, 140),
    'car': (22, 26, 34), 'car2': (34, 40, 52), 'carT': (44, 52, 66), 'chrome': (170, 176, 186), 'tint': (30, 40, 56),
    'tint2': (70, 96, 130), 'head': (255, 250, 220), 'tailL': (255, 40, 40), 'cig': (236, 232, 222),
    'smoke1': (176, 178, 186), 'smoke2': (140, 142, 152), 'exh': (120, 122, 132),
    'bldD': (46, 30, 28), 'bldD2': (38, 26, 24), 'winDim': (130, 110, 70),
})
EMIS |= {'head', 'tailL', 'winDim'}
FX |= {'smoke1', 'smoke2', 'exh'}
MIRROR = {'road1': 0.32, 'road2': 0.32, 'road3': 0.32, 'lane': 0.14, 'side1': 0.14, 'side2': 0.14, 'side3': 0.14,
          'puddleD': 0.85, 'curb': 0.06, 'metal2': 0.1}
PUD = [(96, 56, 7), (40, 78, 6), (150, 46, 5), (170, 92, 8), (78, 106, 7), (22, 36, 4), (126, 20, 4)]
CAR_X, CAR_Y = 74, SIDEWALK + 3
CAR_L, CAR_W = 47, 18             # sedan 4.7 x 1.8 m
MAN = (136, 82)                    # manhole with steam


def in_pud(x, y):
    return any(((x - cx) / 1.7) ** 2 + (y - cy) ** 2 <= r * r for cx, cy, r in PUD)


def ground_top(x, y):
    if in_pud(x, y) and y != SIDEWALK:
        return 'puddleD'
    if y < SIDEWALK:
        if x % 8 == 0 or y % 8 == 0:
            return 'side2'
        return ('side1', 'side3', 'side1')[hsh(x, y) % 3]
    if y == SIDEWALK:
        return 'curb'
    if (x - MAN[0]) ** 2 + (y - MAN[1]) ** 2 <= 10:
        return 'metal2' if (x + y) % 2 else 'grate'
    if y in (LANE, LANE + 1) and x % 20 < 12:
        return 'lane'
    return ('road1', 'road2', 'road3')[(x * 7 + y * 13 + (x * y) % 5) % 3]


def ground():
    v = [(x, y, -1, ground_top(x, y)) for x in range(0, GX) for y in range(0, GY)]
    v += [(x, y, -1, 'crack') for x, y in U.crack_pts() if y > SIDEWALK]
    return v


def back_wall():
    v = [(x, -1, z, U.brick(x, z, 0)) for x in range(-1, GX) for z in range(0, WH)]
    v += [(x, 0, z, 'conc') for x in range(-1, GX) for z in (24, 48, 72)]                   # storey bands
    return v


def left_wall():
    """Dark side wall of the neighbouring building (kept dim: the menu text sits over it)."""
    v = []
    for y in range(0, GY):
        for z in range(0, WH):
            row = z // 2
            c = 'mortar' if z % 2 or (y + (row % 2) * 2) % 4 == 0 else ('bldD', 'bldD2')[(y // 4 + row) % 2]
            v.append((-1, y, z, c))
    for (y, z) in ((36, 56), (96, 32)):
        v += box(0, 0, y, y + 11, z, z + 13, 'winD') + [(0, y + 5, zz, 'metal2') for zz in range(z, z + 14)]
    v += box(0, 0, 64, 75, 80, 93, 'winDim') + [(0, 70, zz, 'metal2') for zz in range(80, 94)]
    return v


def skyline_top():
    """Roof parapets + water tank on the back building (voxel), seen against the sky."""
    v = box(-2, GX - 1, -2, -1, WH, WH + 1, 'conc') + box(-2, -1, -2, GY - 1, WH, WH + 1, 'conc')
    tx = 150                                                     # water tank: 2.4 m across, 2.6 m tall, on legs
    for z in range(WH + 2, WH + 8):
        v += [(tx - 6, -9, z, 'metal2'), (tx + 6, -9, z, 'metal2'), (tx, -3, z, 'metal2')]
    for z in range(WH + 8, WH + 30):
        for dx in range(-8, 9):
            for dy in range(-8, 9):
                if 42 <= dx * dx + dy * dy <= 64:
                    v.append((tx + dx, -9 + dy, z, 'wood2' if (dx + z) % 3 else 'wood'))
        if z % 7 == 0:
            v += [(tx + dx, -9 + dy, z, 'metal2') for dx in range(-8, 9) for dy in range(-8, 9) if 56 <= dx * dx + dy * dy <= 66]
    v += [(tx + dx, -9 + dy, WH + 30 + k, 'metal2') for k in range(4) for dx in range(-8 + 2 * k, 9 - 2 * k)
          for dy in range(-8 + 2 * k, 9 - 2 * k) if dx * dx + dy * dy <= (8 - 2 * k) ** 2]
    return v


def sedan(x0, y0, lights=True):
    """Dark sedan along x, nose at +x: 4.7 m long, 1.8 m wide, 1.45 m tall (47 x 18 x 14 voxels)."""
    v = []
    L, Wd = CAR_L, CAR_W - 1

    def top_at(x):
        if x < 9:
            return 9                                  # boot
        if x < 15:
            return 9 + (x - 8) * 5 // 6               # rear window slope
        if x < 29:
            return 14                                 # roof
        if x < 35:
            return 14 - (x - 28)                      # windshield slope
        return 9 if x < L - 2 else 8                  # bonnet

    for x in range(L):
        zt = top_at(x)
        for y in range(Wd + 1):
            edge = y in (0, Wd)
            for z in range(2, zt + 1):
                if edge and z == zt and zt > 8:
                    continue
                cabin = z >= 10 and 9 <= x <= 34
                if cabin:
                    glass = (z <= zt - 1 or 15 <= x <= 28) and not (x in (21, 22) and edge)
                    c = ('tint2' if (x + z) % 7 == 0 else 'tint') if glass else 'car2'
                    if z == zt and 15 <= x <= 28:
                        c = 'carT'
                else:
                    c = 'car'
                    if z == 7 and edge:
                        c = 'chrome'
                    if z == zt and not cabin:
                        c = 'carT'
                v.append((x0 + x, y0 + y, z, c))
    for wx in (8, 38):                                # wheels (0.66 m) on both sides, visible +y side
        for y in (y0 - 0, y0 + 1, y0 + Wd - 1, y0 + Wd):
            for dx in range(-4, 5):
                for z in range(0, 8):
                    d = dx * dx + (z - 3.3) ** 2
                    if d <= 11:
                        v.append((x0 + wx + dx, y, z, 'chrome' if d < 3 else 'tire'))
    v += [(x0 + x, y0 + Wd, 5, 'chrome') for x in range(13, 33)]                    # side trim
    v += [(x0 + 22, y0 + Wd, 9, 'chrome'), (x0 + 31, y0 + Wd, 9, 'chrome')]         # door handles
    if lights:
        for y in (y0 + 1, y0 + 2, y0 + 3, y0 + Wd - 3, y0 + Wd - 2, y0 + Wd - 1):
            v += [(x0 + L, y, 7, 'head'), (x0 + L, y, 6, 'head')]
        v += [(x0, y0 + Wd, 8, 'tailL'), (x0 + 1, y0 + Wd, 8, 'tailL'), (x0, y0 + Wd, 7, 'tailL'), (x0, y0 + Wd - 1, 8, 'tailL')]
        v += [(x0 + L - 1, y0 + Wd, 7, 'head'), (x0 + L - 1, y0 + Wd, 6, 'head')]
    v += box(x0 + L, x0 + L, y0 + 5, y0 + Wd - 5, 3, 5, 'chrome')     # grille
    v += box(x0 + L, x0 + L, y0 + 1, y0 + Wd - 1, 2, 2, 'car2')        # bumper
    return v


def door_and_signs(t):
    v = U.door(DOOR)
    on = NEON[t]
    v += U.wall_neon(DOOR - 8, 30, on, CYAN[t])
    v += U.window_back(16, 32, False) + U.window_back(16, 56, True) + U.window_back(170, 32, True) + U.window_back(170, 56, False)
    v += U.window_back(62, 56, False) + U.window_back(16, 80, True) + U.window_back(62, 80, True) + U.window_back(170, 80, False)
    v += U.fire_escape(112, levels=(24, 48, 72), lit=(False, True, True))
    v += [(x, 1, 52, 'metal') for x in range(0, 108)] + box(38, 46, 1, 6, 40, 46, 'ac') + box(38, 46, 1, 6, 47, 47, 'ac2')
    return v


def props():
    v = U.dumpster(150, 3) + U.bags(174, 5) + U.bags(26, 4) + U.barrel(30, 18, 9)
    lx, ly = 160, SIDEWALK - 4                                               # street lamp 4.8 m, arm over the road
    v += box(lx, lx + 1, ly, ly + 1, 0, 48, 'lampP') + box(lx - 1, lx + 2, ly - 1, ly + 2, 0, 2, 'lampP')
    v += [(lx, y, 48, 'lampP') for y in range(ly, ly + 14)] + box(lx - 1, lx + 1, ly + 11, ly + 14, 47, 47, 'lampP')
    v += [(lx, ly + 12, 46, 'lamp'), (lx, ly + 13, 46, 'lamp'), (lx - 1, ly + 12, 46, 'lamp'), (lx - 1, ly + 13, 46, 'lamp')]
    hx, hy = 44, SIDEWALK - 4                                                # hydrant 0.7 m
    v += box(hx, hx + 2, hy, hy + 2, 0, 6, 'hyd') + box(hx - 1, hx + 3, hy, hy + 2, 3, 3, 'hyd2') + box(hx, hx + 2, hy, hy + 2, 7, 7, 'hyd2')
    v += [(hx + 1, hy + 1, 8, 'hyd2')]
    return v


NEON = [1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1]
CYAN = [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1]

# smoking cycle: right hand height + ember state per frame
ARM = [(1, 2, 8)] * 4 + [(2, 2, 11), (2, 1, 14), (2, 1, 14), (2, 2, 11)] + [(1, 2, 8)] * 4
GUARD = (DOOR - 5, 9)                # beside the doorway, under the canopy edge


def guard(t):
    rh = ARM[t]
    at_mouth = rh[2] >= 14
    cig = [(rh[0] + 1, rh[1], rh[2], 'cig'), (rh[0] + 2, rh[1], rh[2], 'f1' if at_mouth else 'f2')]
    pose = dict(rh=rh, lh=(1, -3, 8), gun='holster', extra=cig)
    v = rig.figure(pose)
    return mv(v, GUARD[0], GUARD[1], 0)


def smoke(t):
    v = []
    gx, gy = GUARD
    # exhale puff after the drag (frames 7..11) + thin wisps from the ember all the time
    if 7 <= t <= 11:
        k = t - 7
        cx, cy, cz = gx + 4 + k * 1.5, gy + 1 - k * 0.3, 15 + k * 1.6
        r = 1.2 + k * 0.7
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                for dz in range(-3, 4):
                    if dx * dx + dy * dy + dz * dz <= r * r and hsh(dx, dy, dz, k) % 4:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'smoke1' if k < 3 else 'smoke2'))
    rh = ARM[t]
    for k in range(4):
        ph = ((k + t / N) % 4) / 4.0
        v.append((round(gx + rh[0] + 2 + ph * 3), gy + rh[1], round(rh[2] + 1 + ph * 9), 'smoke2'))
    # manhole steam + car exhaust
    for k in range(6):
        ph = ((k + t / N) % 6) / 6.0
        r = 2.5 + ph * 5.5
        cx, cy, cz = MAN[0] + ph * 12, MAN[1] - ph * 5, 1 + ph * 36
        for dx in range(-int(r) - 1, int(r) + 2):
            for dy in range(-int(r) - 1, int(r) + 2):
                for dz in range(-int(r * .6) - 1, int(r * .6) + 2):
                    if dx * dx + dy * dy + (dz / .6) ** 2 <= r * r and hsh(dx, dy, dz, k) % 9 > 3 + ph * 4:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'steam' if ph < .4 else 'steam2'))
    for k in range(3):
        ph = ((k + t / N) % 3) / 3.0
        r = 0.8 + ph * 1.8
        cx, cy, cz = CAR_X - 2 - ph * 7, CAR_Y + CAR_W - 4, 2 + ph * 4
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                for dz in range(-2, 3):
                    if dx * dx + dy * dy + dz * dz <= r * r:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'exh'))
    return v


def look(t):
    amb = ((0.56, 0.60, 0.80), (0.47, 0.50, 0.68), (0.34, 0.36, 0.52))
    hx = CAR_X + CAR_L
    D = (0.96, 0.18, -0.2); n = math.sqrt(sum(d * d for d in D)); D = tuple(d / n for d in D)
    L = [Light((DOOR + 5, 4, 23), (1.0, 0.82, 0.5), 1.7, 48),
         Light((160, SIDEWALK + 9, 46), (0.8, 0.86, 1.0), 1.0, 84),
         Light((hx, CAR_Y + 2, 7), (1.0, 0.97, 0.85), 2.6, 120, cone=(D, 0.88, 0.97)),
         Light((hx, CAR_Y + CAR_W - 2, 7), (1.0, 0.97, 0.85), 2.6, 120, cone=(D, 0.88, 0.97)),
         Light((CAR_X - 2, CAR_Y + CAR_W - 2, 8), (1.0, 0.15, 0.1), 0.8, 22),
         Light((124, 3, 34), (1.0, 0.75, 0.45), 0.5, 40), Light((124, 3, 58), (1.0, 0.75, 0.45), 0.5, 40)]
    if NEON[t]:
        L.append(Light((DOOR + 9, 8, 38), (1.0, 0.3, 0.8), 1.5, 90))
    if CYAN[t]:
        L.append(Light((DOOR + 9, 8, 30), (0.3, 0.85, 1.0), 0.6, 46))
    return Look(amb, L, shadow=(0.15, 0.1, 12), shadow_k=0.72, glow=0.85)


# ------------------------------------------------------------------ 2D layers
def sky(W, H, b):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    for y in range(H):
        f = y / H
        c = tuple(int(a + (bb - a) * min(1, f * 1.6)) for a, bb in zip((8, 9, 18), (40, 28, 56)))
        d.line([(0, y), (W, y)], fill=c + (255,))
    rnd = random.Random(7)
    x = 0
    base = scr(b, 0, 0, WH)[1] + 40
    while x < W:
        w = rnd.randint(18, 46); h = rnd.randint(40, 150)
        col = (16 + rnd.randint(0, 6), 16 + rnd.randint(0, 6), 28 + rnd.randint(0, 8), 255)
        d.rectangle([x, base - h, x + w, H], fill=col)
        for wy in range(base - h + 4, base, 6):
            for wx in range(x + 3, x + w - 2, 5):
                if rnd.random() < 0.12:
                    d.rectangle([wx, wy, wx + 1, wy + 1], fill=(200, 170, 100, 255) if rnd.random() < .7 else (120, 180, 220, 255))
        if rnd.random() < 0.3:
            d.line([(x + w // 2, base - h), (x + w // 2, base - h - 14)], fill=col)
            d.point((x + w // 2, base - h - 15), fill=(255, 60, 50, 255))
        x += w + rnd.randint(-6, 4)
    return im


def rain_tile(seed, n, length, color, alpha, Th):
    """One cell of the rain lattice: 240 wide, Th tall; streaks never cross the top/bottom edge."""
    T = 240
    tile = Image.new('RGBA', (T, Th), (0, 0, 0, 0))
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.randint(0, T - 1), rnd.randint(0, Th - length - 1)
        a = int(alpha * rnd.uniform(0.6, 1.0))
        for k in range(length):
            tile.putpixel(((x - k // 5) % T, y + k), color + (a,))
    return tile


def rain_layer(seed, n, length, color, alpha, dx, dy, W, H):
    """Rain pattern on a sheared lattice (240,0),(N*dx, N*dy): shifting by (dx,dy) per frame loops in N frames."""
    Th, sh = N * dy, N * dx
    tile = rain_tile(seed, n, length, color, alpha, Th)
    big = Image.new('RGBA', (W + 960, H + 2 * Th), (0, 0, 0, 0))
    for j in range(0, (H + 2 * Th) // Th + 1):
        for i in range(-3, (W + 960) // 240 + 4):
            X, Y = i * 240 + j * sh, j * Th
            if -240 < X < W + 960 and Y < H + 2 * Th:
                big.paste(tile, (X, Y))   # lattice cells tile the plane exactly: no mask needed
    return (big, dx, dy, Th)


def rain_at(layer, W, H, t):
    big, dx, dy, Th = layer
    x0, y0 = 480 - dx * t, Th - dy * t
    return big.crop((x0, y0, x0 + W, y0 + H))


def beam_mask(W, H, b):
    """Headlight cones as a soft additive mask (screen space)."""
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    hx = CAR_X + CAR_L
    for yc in (CAR_Y + 2, CAR_Y + CAR_W - 2):
        for k, a in ((1.0, 40), (0.7, 50), (0.45, 70)):
            p0 = scr(b, hx, yc, 7); p1 = scr(b, hx + 90 * k + 12, yc - 12 * k + 14 * k, 0)
            p2 = scr(b, hx + 90 * k + 12, yc + 20 * k + 14 * k, 0); p3 = scr(b, hx + 90 * k + 12, yc + 5 * k, 15 * k)
            d.polygon([p0, p1, p2, p3][:3], fill=a)
            d.polygon([p0, p3, p2], fill=a // 2)
    return m.filter(ImageFilter.GaussianBlur(4))


def splashes(W, H, b, t):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load()
    rnd = random.Random(5)
    for k in range(260):
        x, y = rnd.uniform(0, GX), rnd.uniform(1, GY)
        if CAR_X - 1 <= x <= CAR_X + CAR_L + 1 and CAR_Y - 1 <= y <= CAR_Y + CAR_W:
            continue
        ph = (k * 7 + t) % 6
        if ph > 1:
            continue
        sx, sy = scr(b, x, y, 0)
        sx, sy = int(sx), int(sy)
        if ph == 0:
            pts = [(sx, sy - 1, 200), (sx - 1, sy, 130), (sx + 1, sy, 130)]
        else:
            pts = [(sx - 2, sy, 110), (sx + 2, sy, 110), (sx - 1, sy - 1, 80), (sx + 1, sy - 1, 80)]
        for X, Y, a in pts:
            if 0 <= X < W and 0 <= Y < H:
                px[X, Y] = (200, 210, 240, a)
    return im


def frame(t):
    t0 = time.time()
    lk = look(t)
    solid = ENV + door_and_signs(t) + guard(t)
    img = render_fx(solid, smoke(t), B, lk, alpha=0.55, mirror=MIRROR, ripple=2 * math.pi * t / N)
    W, H = img.size
    base = SKY.copy(); base.alpha_composite(img)
    # headlight volume + rain lit by it
    bm = BEAM
    a = np.asarray(base, np.float32)
    k = np.asarray(bm, np.float32)[:, :, None] / 255.0
    a[:, :, 0:3] += k * np.array([255, 246, 220], np.float32) * 0.9
    base = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    rain = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for layer in RAIN_T:
        rain.alpha_composite(rain_at(layer, W, H, t))
    ra = np.asarray(rain, np.float32)
    ra[:, :, 3] = np.clip(ra[:, :, 3] * (1 + k[:, :, 0] * 3.5), 0, 255)
    ra[:, :, 0:3] = np.clip(ra[:, :, 0:3] + k * 80, 0, 255)
    base.alpha_composite(Image.fromarray(ra.astype(np.uint8), 'RGBA'))
    base.alpha_composite(splashes(W, H, B, t))
    print(f'  frame {t} {time.time() - t0:.1f}s', flush=True)
    return base


def crop_and_grade(im, rect):
    c = im.crop(rect).convert('RGB')
    w, h = c.size
    a = np.asarray(c, np.float32)
    xs = np.linspace(0, 1, w)[None, :, None]
    ys = np.linspace(0, 1, h)[:, None, None]
    left = np.clip(1 - xs / 0.42, 0, 1) ** 1.3 * 0.72              # left third darker for menu text
    vig = np.clip(((xs - 0.6) ** 2 * 1.2 + (ys - 0.55) ** 2 * 1.4), 0, 1) * 0.5
    a = a * (1 - np.maximum(left, vig)) + np.array([6, 6, 12], np.float32) * np.maximum(left, vig)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


if __name__ == '__main__':
    t0 = time.time()
    ENV = ground() + back_wall() + left_wall() + skyline_top() + sedan(CAR_X, CAR_Y) + props()
    W, H = B['W'], B['H']
    SKY = sky(W, H, B)
    BEAM = beam_mask(W, H, B)
    RAIN_T = [rain_layer(1, 110, 9, (190, 200, 230), 120, -4, 20, W, H),
              rain_layer(2, 100, 5, (150, 160, 200), 70, -2, 10, W, H)]
    hx, hy = scr(B, GUARD[0], GUARD[1])
    LW, LH = 384, 216
    land = (int(hx - 0.56 * LW), int(hy - 128), int(hx - 0.56 * LW) + LW, int(hy - 128) + LH)
    port = (int(hx - 0.42 * LH), int(hy - 210), int(hx - 0.42 * LH) + LH, int(hy - 210) + LW)
    print('canvas', W, H, 'guard', hx, hy, 'land', land, 'port', port)
    frames = [frame(t) for t in range(N)]
    d = os.path.join(OUT, 'menu'); os.makedirs(d, exist_ok=True)
    if PREVIEW:
        os.makedirs(PREV, exist_ok=True)
        frames[0].save(os.path.join(PREV, 'menu-full.png'))
    res = {}
    for name, rect, cols in (('landscape', land, 4), ('portrait', port, 6)):
        fr = [crop_and_grade(f, rect) for f in frames]
        fr[0].save(os.path.join(d, f'menu-{name}.png'), optimize=True)
        at, c, r = atlas([f.convert('RGBA') for f in fr], cols)
        sz = save_palette_png(at.convert('RGB'), os.path.join(d, f'menu-{name}-anim.png'))
        man = {'kind': 'scene', 'id': f'menu-{name}', 'name': f'menu-{name}', 'image': f'menu-{name}-anim.png', 'static': f'menu-{name}.png',
               'frameWidth': fr[0].width, 'frameHeight': fr[0].height, 'frames': N, 'fps': FPS, 'columns': c, 'rows': r,
               'recommendedScale': 5, 'note': 'Opaque. Integer-upscale with nearest-neighbour (x5 -> %dx%d). Left ~40%% darkened for menu text.'
               % (fr[0].width * 5, fr[0].height * 5)}
        with open(os.path.join(d, f'menu-{name}.json'), 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(man, fh, indent=2)
        res[name] = fr
        print(name, fr[0].size, f'atlas {sz // 1024}KB')
    if not PREVIEW:
        print('done', f'{time.time() - t0:.0f}s')
        sys.exit(0)
    # preview gif: landscape x2 + portrait x1.125-ish (nearest) side by side
    L = [f.resize((768, 432), Image.NEAREST) for f in res['landscape']]
    P = [f.resize((432, 768), Image.NEAREST) for f in res['portrait']]
    gif = []
    for l, p in zip(L, P):
        c = Image.new('RGB', (768 + 432 + 12, 768), (0, 0, 0)); c.paste(l, (0, 0)); c.paste(p, (780, 0))
        gif.append(c.quantize(colors=255, method=Image.Quantize.MEDIANCUT))
    gif[0].save(os.path.join(PREV, 'preview-menu.gif'), save_all=True, append_images=gif[1:], duration=1000 // FPS, loop=0)
    print('done', f'{time.time() - t0:.0f}s')
