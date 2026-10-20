"""MENU hero scene: the alley at night in the rain. Neon BAR, door light, bodyguard (rig urban body) smoking
under the door light, parked sedan with headlights, steam, wet reflections. 12-frame seamless loop.
Outputs portrait 216x384 (x5 = 1080x1920) and landscape 384x216 (x5 = 1920x1080) frames + atlases."""
import json, math, os, random, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import urbano as U

N, FPS = 12, 8
GX, GY = 172, 128                 # ground extent
WH = 92                           # building height
SIDEWALK = 22                     # sidewalk depth (y), curb at y = SIDEWALK
DOOR = 56
B = make_bounds(-2, GX, -2, GY, -2, WH + 30, pad=4)

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
PUD = [(84, 48, 7), (40, 70, 6), (128, 40, 5), (150, 84, 8), (70, 100, 7), (20, 30, 4), (110, 18, 4)]
CAR_X, CAR_Y = 72, SIDEWALK + 3
MAN = (118, 64)                    # manhole with steam


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
    if abs(x - MAN[0]) <= 2 and abs(y - MAN[1]) <= 2:
        return 'metal2' if (x + y) % 2 else 'grate'
    if y in (68, 69) and x % 10 < 6:
        return 'lane'
    return ('road1', 'road2', 'road3')[(x * 7 + y * 13 + (x * y) % 5) % 3]


def ground():
    v = [(x, y, -1, ground_top(x, y)) for x in range(0, GX) for y in range(0, GY)]
    v += [(x, y, -1, 'crack') for x, y in U.crack_pts() if y > SIDEWALK]
    return v


def back_wall():
    v = [(x, -1, z, U.brick(x, z, 0)) for x in range(-1, GX) for z in range(0, WH)]
    v += [(x, 0, z, 'conc') for x in range(-1, GX) for z in (30, 31)]                       # floor band
    return v


def left_wall():
    """Dark side wall of the neighbouring building (kept dim: the menu text sits over it)."""
    v = []
    for y in range(0, GY):
        for z in range(0, WH):
            row = z // 2
            c = 'mortar' if z % 2 or (y + (row % 2) * 2) % 4 == 0 else ('bldD', 'bldD2')[(y // 4 + row) % 2]
            v.append((-1, y, z, c))
    for (y, z) in ((40, 50), (96, 36)):
        v += box(0, 0, y, y + 5, z, z + 6, 'winD') + [(0, y + 2, zz, 'metal2') for zz in range(z, z + 7)]
    v += box(0, 0, 70, 75, 62, 68, 'winDim') + [(0, 72, zz, 'metal2') for zz in range(62, 69)]
    return v


def skyline_top():
    """Roof parapets + water tank on the back building (voxel), seen against the sky."""
    v = box(-2, GX - 1, -2, -1, WH, WH + 1, 'conc') + box(-2, -1, -2, GY - 1, WH, WH + 1, 'conc')
    tx = 130
    for z in range(WH + 2, WH + 14):
        for dx in range(-4, 5):
            for dy in range(-4, 5):
                if dx * dx + dy * dy <= 16:
                    v.append((tx + dx, -6 + dy, z, 'wood2' if (dx + z) % 3 else 'wood'))
    v += [(tx + dx, -6 + dy, WH + 14 + k, 'metal2') for k in range(3) for dx in range(-4 + k, 5 - k) for dy in range(-4 + k, 5 - k)
          if dx * dx + dy * dy <= (4 - k) ** 2]
    return v


def sedan(x0, y0, lights=True):
    """Dark sedan along x, nose at +x. ~34 x 14 x 12 voxels (stylised a bit larger than the unit sprites' cars)."""
    v = []
    L, Wd = 34, 13

    def top_at(x):
        if x < 7:
            return 8
        if x < 11:
            return 8 + (x - 6)                        # rear window slope
        if x < 21:
            return 12
        if x < 25:
            return 12 - (x - 20)                      # windshield slope
        return 7 if x < L - 1 else 6

    for x in range(L):
        zt = top_at(x)
        for y in range(Wd + 1):
            edge = y in (0, Wd)
            for z in range(2, zt + 1):
                if edge and z == zt and zt > 8:
                    continue
                cabin = z >= 9 and 7 <= x <= 24
                if cabin:
                    glass = (z <= zt - 1 or 11 <= x <= 20) and not (x in (15, 16) and edge)
                    c = ('tint2' if (x + z) % 7 == 0 else 'tint') if glass else 'car2'
                    if z == zt and 11 <= x <= 20:
                        c = 'carT'
                else:
                    c = 'car'
                    if z == 6 and edge:
                        c = 'chrome'
                    if z == zt and not cabin:
                        c = 'carT'
                v.append((x0 + x, y0 + y, z, c))
    for wx in (6, 27):                                # wheels on both sides (visible +y side)
        for y in (y0 - 0, y0 + Wd):
            for dx in range(-3, 4):
                for z in range(0, 6):
                    d = dx * dx + (z - 2.5) ** 2
                    if d <= 9:
                        v.append((x0 + wx + dx, y, z, 'chrome' if d < 2.5 else 'tire'))
    if lights:
        for y in (y0 + 1, y0 + 2, y0 + Wd - 2, y0 + Wd - 1):
            v += [(x0 + L, y, 5, 'head'), (x0 + L, y, 4, 'head')]
        v += [(x0, y0 + Wd, 6, 'tailL'), (x0 + 1, y0 + Wd, 6, 'tailL'), (x0, y0 + Wd, 5, 'tailL')]
        v += [(x0 + L - 1, y0 + Wd, 5, 'head'), (x0 + L - 1, y0 + Wd, 4, 'lightY' if 'lightY' in PAL else 'head')]
    v += box(x0 + L, x0 + L, y0 + 4, y0 + Wd - 4, 3, 4, 'chrome')     # grille
    return v


def door_and_signs(t):
    v = U.door(DOOR)
    on = NEON[t]
    v += U.wall_neon(DOOR + 16, 24, on, CYAN[t])
    v += U.window_back(14, 44, False) + U.window_back(36, 56, True) + U.window_back(150, 48, True) + U.window_back(170, 66, False)
    v += U.window_back(64, 70, False) + U.window_back(120, 76, True)
    v += fire_escape4()
    v += [(x, 1, 36, 'metal') for x in range(0, 98)] + box(40, 44, 1, 4, 38, 41, 'ac') + box(40, 44, 1, 4, 42, 42, 'ac2')
    return v


def fire_escape4():
    v = []
    x0 = 100
    levels = (16, 32, 48, 64)
    lit = (False, True, False, True)
    for i, z in enumerate(levels):
        v += U.window_back(x0 + 5, z + 1, lit[i])
        v += box(x0, x0 + 15, 1, 5, z, z, 'metal2')
        v += [(xx, 5, z + 3, 'metal') for xx in range(x0, x0 + 16)]
        v += [(xx, 5, z + k, 'metal') for xx in range(x0, x0 + 16, 3) for k in (1, 2)]
        v += [(x0, y, z + 3, 'metal') for y in range(1, 6)] + [(x0 + 15, y, z + 3, 'metal') for y in range(1, 6)]
        if i + 1 < len(levels):
            dz = levels[i + 1] - z
            for k in range(dz):
                xx = x0 + 14 - int(k * 12 / dz)
                v += [(xx, 3, z + 1 + k, 'metal'), (xx, 4, z + 1 + k, 'metal2'), (xx, 5, z + 3 + k, 'metal')]
    v += [(x0 + 2, 4, z, 'metal') for z in range(6, levels[0])] + [(x0 + 4, 4, z, 'metal') for z in range(6, levels[0])]
    v += [(x0 + 3, 4, z, 'metal2') for z in range(6, levels[0], 2)]
    return v


def props():
    v = U.dumpster(140, 3) + U.bags(154, 5) + U.bags(30, 4) + U.barrel(26, 12, 7)
    v += box(142, 143, SIDEWALK - 3, SIDEWALK - 2, 0, 44, 'lampP') + [(x, SIDEWALK - 2, 44, 'lampP') for x in range(136, 144)]
    v += [(136, SIDEWALK - 2, 43, 'lamp'), (137, SIDEWALK - 2, 43, 'lamp'), (136, SIDEWALK - 3, 43, 'lamp')]
    hx, hy = 48, SIDEWALK - 3
    v += box(hx, hx + 1, hy, hy + 1, 0, 4, 'hyd') + box(hx - 1, hx + 2, hy, hy + 1, 2, 2, 'hyd2') + [(hx, hy, 5, 'hyd2')]
    return v


NEON = [1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1]
CYAN = [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1]

# smoking cycle: right hand height + ember state per frame
ARM = [(1, 2, 8)] * 4 + [(2, 2, 11), (2, 1, 14), (2, 1, 14), (2, 2, 11)] + [(1, 2, 8)] * 4
GUARD = (DOOR - 1, 7)


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
        cx, cy, cz = MAN[0] + ph * 10, MAN[1] - ph * 4, 1 + ph * 26
        for dx in range(-int(r) - 1, int(r) + 2):
            for dy in range(-int(r) - 1, int(r) + 2):
                for dz in range(-int(r * .6) - 1, int(r * .6) + 2):
                    if dx * dx + dy * dy + (dz / .6) ** 2 <= r * r and hsh(dx, dy, dz, k) % 9 > 3 + ph * 4:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'steam' if ph < .4 else 'steam2'))
    for k in range(3):
        ph = ((k + t / N) % 3) / 3.0
        r = 0.8 + ph * 1.8
        cx, cy, cz = CAR_X - 2 - ph * 6, CAR_Y + 3, 2 + ph * 4
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                for dz in range(-2, 3):
                    if dx * dx + dy * dy + dz * dz <= r * r:
                        v.append((round(cx + dx), round(cy + dy), round(cz + dz), 'exh'))
    return v


def look(t):
    amb = ((0.56, 0.60, 0.80), (0.47, 0.50, 0.68), (0.34, 0.36, 0.52))
    hx = CAR_X + 34
    D = (0.96, 0.18, -0.2); n = math.sqrt(sum(d * d for d in D)); D = tuple(d / n for d in D)
    L = [Light((DOOR + 3, 3, 17), (1.0, 0.82, 0.5), 1.7, 34),
         Light((137, SIDEWALK - 2, 42), (0.8, 0.86, 1.0), 1.0, 60),
         Light((hx, CAR_Y + 2, 5), (1.0, 0.97, 0.85), 2.6, 95, cone=(D, 0.88, 0.97)),
         Light((hx, CAR_Y + 11, 5), (1.0, 0.97, 0.85), 2.6, 95, cone=(D, 0.88, 0.97)),
         Light((CAR_X - 2, CAR_Y + 7, 6), (1.0, 0.15, 0.1), 0.8, 16),
         Light((108, 3, 34), (1.0, 0.75, 0.45), 0.5, 26), Light((108, 3, 66), (1.0, 0.75, 0.45), 0.5, 26)]
    if NEON[t]:
        L.append(Light((DOOR + 27, 6, 30), (1.0, 0.3, 0.8), 1.5, 64))
    if CYAN[t]:
        L.append(Light((DOOR + 27, 6, 23), (0.3, 0.85, 1.0), 0.6, 30))
    return Look(amb, L, shadow=(0.15, 0.1, 6), shadow_k=0.72, glow=0.85)


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
    hx = CAR_X + 34
    for yc in (CAR_Y + 2, CAR_Y + 11):
        for k, a in ((1.0, 40), (0.7, 50), (0.45, 70)):
            p0 = scr(b, hx, yc, 5); p1 = scr(b, hx + 70 * k + 10, yc - 10 * k + 12 * k, 0)
            p2 = scr(b, hx + 70 * k + 10, yc + 16 * k + 12 * k, 0); p3 = scr(b, hx + 70 * k + 10, yc + 4 * k, 12 * k)
            d.polygon([p0, p1, p2, p3][:3], fill=a)
            d.polygon([p0, p3, p2], fill=a // 2)
    return m.filter(ImageFilter.GaussianBlur(4))


def splashes(W, H, b, t):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load()
    rnd = random.Random(5)
    for k in range(260):
        x, y = rnd.uniform(0, GX), rnd.uniform(1, GY)
        if CAR_X - 1 <= x <= CAR_X + 35 and CAR_Y - 1 <= y <= CAR_Y + 14:
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
