"""Station level states: NORMAL / DANIFICADA / INTERDITADA for the 5 levels (sheet + animated GIF)."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import levels as L

HERE = os.path.dirname(os.path.abspath(__file__))

L.C.update({
    'hole': (26, 22, 22), 'char': (56, 46, 40), 'rub1': (140, 134, 124), 'rub2': (104, 98, 90), 'rub3': (82, 70, 60),
    'broken': (34, 40, 52), 'off': (52, 64, 80),
    'e1': (255, 252, 220), 'e2': (255, 220, 110), 'e3': (255, 150, 50), 'e4': (220, 80, 30),
    's1': (120, 118, 116), 's2': (90, 88, 88), 's3': (64, 62, 64),
    'tapeY': (240, 200, 40), 'tapeK': (34, 34, 36), 'post': (70, 72, 78),
    'polB': (34, 44, 90), 'polW': (222, 224, 228), 'sirR': (255, 50, 50), 'sirB': (70, 140, 255),
    'sirO': (90, 40, 44), 'sirO2': (40, 50, 90), 'seal': (150, 110, 64), 'seal2': (120, 86, 50), 'xred': (220, 34, 34),
})
L.EMIS |= {'tapeY', 'tapeK', 'e1', 'e2', 'e3', 'e4', 'sirR', 'sirB', 'xred'}
GLOW = {'e1': (255, 190, 90), 'e2': (255, 170, 70), 'e3': (255, 140, 50), 'sirR': (255, 40, 40), 'sirB': (60, 130, 255),
        'win': (255, 200, 110)}
B = L.box

BUILD = {'plaster', 'conc', 'conc2', 'brick', 'metal', 'metal2', 'olive', 'olive2', 'wall', 'glass', 'glassD', 'win', 'white'}
ROOFS = {'roof', 'roofR', 'conc', 'metal', 'metal2', 'olive', 'olive2', 'plaster'}

# per level: roof-X bbox, door regions to seal, number of holes / fires
SPEC = {
    'celula': dict(xbox=(0, 7, 0, 7), doors=[(7, 7, 3, 4, 0, 2)], holes=2, fires=1),
    'casa': dict(xbox=(0, 9, 0, 11), doors=[(9, 9, 5, 6, 0, 2)], holes=3, fires=2),
    'escritorio': dict(xbox=(0, 11, 0, 11), doors=[(11, 11, 4, 7, 0, 2)], holes=5, fires=3),
    'complexo': dict(xbox=(0, 13, 0, 9), doors=[(24, 24, 8, 12, 0, 3)], holes=5, fires=3),
    'base': dict(xbox=(-18, -4, 4, 21), doors=[(-11, -10, 21, 21, 0, 4)], holes=6, fires=4),
}
T = 8


def cells_of(v):
    d = {}
    for x, y, z, c in v:
        d[(x, y, z)] = c
    return d


def ball(cx, cy, cz, r, cols, rnd=None, squash=1.0):
    v = []; ri = int(r) + 1
    for x in range(-ri, ri + 1):
        for y in range(-ri, ri + 1):
            for z in range(-ri, ri + 1):
                d = math.sqrt(x * x + y * y + (z / squash) ** 2)
                if d <= r:
                    if rnd and rnd.random() < 0.18:
                        continue
                    k = min(len(cols) - 1, int(d / max(r, .01) * len(cols)))
                    v.append((round(cx + x), round(cy + y), round(cz + z), cols[k]))
    return v


def flame(x, y, z, t, seed, size=1):
    rnd = random.Random(seed * 31 + t)
    v = []
    for dx in range(-size, size + 1):
        for dy in range(-size, size + 1):
            if abs(dx) + abs(dy) > size + (1 if size > 1 else 0):
                continue
            h = 2 + size + rnd.randint(0, 2) - (abs(dx) + abs(dy))
            for k in range(max(1, h)):
                c = 'e4' if k == 0 else ('e3' if k < h * .45 else ('e2' if k < h * .8 else 'e1'))
                v.append((x + dx, y + dy, z + k, c))
    if rnd.random() < .7:
        v.append((x + rnd.randint(-1, 1), y + rnd.randint(-1, 1), z + 4 + size + rnd.randint(0, 2), 'e2'))
    return v


def smoke_col(x, y, z, t, seed, scale=1.0):
    v = []
    rnd = random.Random(seed * 17 + t)
    for k in range(3):
        age = (t + k * (T // 3)) % T                     # looping puffs
        h = z + 3 + age * 1.6 * scale
        r = (1.0 + age * .32) * scale
        drift = age * .45
        cols = ['s1', 's2', 's3'] if age < 5 else ['s2', 's3']
        v += ball(x - drift, y + drift, h, r, cols, rnd)
    return v


def damaged(v, spec, t, seed):
    cl = cells_of(v)
    rnd = random.Random(seed)
    # broken windows
    for p, c in list(cl.items()):
        if c in ('win', 'glass', 'glassD') and (rnd.random() < .55 or c == 'win'):
            cl[p] = 'broken' if rnd.random() < .7 else 'hole'
    # facade holes
    fac = []
    for (x, y, z), c in cl.items():
        if c in BUILD and z >= 2 and (x, y, z + 1) in cl and (x, y, z - 1) in cl:
            if (x + 1, y, z) not in cl:
                fac.append((x, y, z, 'x'))
            elif (x, y + 1, z) not in cl:
                fac.append((x, y, z, 'y'))
    fac.sort()
    rnd2 = random.Random(seed + 5)
    seeds = []
    for _ in range(spec['holes'] * 8):
        if len(seeds) >= spec['holes'] or not fac:
            break
        s = rnd2.choice(fac)
        if all(abs(s[0] - q[0]) + abs(s[1] - q[1]) + abs(s[2] - q[2]) > 5 for q in seeds):
            seeds.append(s)
    rub = []
    for (x, y, z, f) in seeds:
        for a in range(-2, 3):
            for b in range(-2, 3):
                d = a * a + b * b
                p = (x, y + a, z + b) if f == 'x' else (x + a, y, z + b)
                if p in cl and cl[p] != 'roof' and cl[p] != 'roofR':
                    if d <= 2:
                        cl[p] = 'hole'
                    elif d <= 5 and rnd2.random() < .8:
                        cl[p] = 'char'
        # rubble pile below on the ground
        for k in range(7):
            a = rnd2.randint(-2, 2); o = rnd2.randint(1, 3)
            p = (x + o, y + a, 0) if f == 'x' else (x + a, y + o, 0)
            if p not in cl and (p[0], p[1], 1) not in cl:
                rub.append((p[0], p[1], 0, rnd2.choice(['rub1', 'rub2', 'rub3'])))
                if rnd2.random() < .3:
                    rub.append((p[0], p[1], 1, 'rub2'))
    # roof bites: knock out top voxels near the corner
    tops = [(x, y, z) for (x, y, z), c in cl.items() if c in ROOFS and z >= 3 and (x, y, z + 1) not in cl]
    tops.sort()
    fires = []
    rnd3 = random.Random(seed + 9)
    while len(fires) < spec['fires'] and tops:
        s = rnd3.choice(tops)
        if all(abs(s[0] - q[0]) + abs(s[1] - q[1]) > 4 for q in fires):
            fires.append(s)
        tops.remove(s)
    for i, (x, y, z) in enumerate(fires):
        cl[(x, y, z)] = 'char'
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                if (x + a, y + b, z) in cl and rnd3.random() < .6:
                    cl[(x + a, y + b, z)] = 'char'
    out = [(x, y, z, c) for (x, y, z), c in cl.items()] + rub
    for i, (x, y, z) in enumerate(fires):
        out += flame(x, y, z + 1, t, seed + i, 1 if i else 2 if spec['fires'] > 2 else 1)
        out += smoke_col(x, y, z + 2, t, seed + i, 1.0 + (0.4 if spec['fires'] > 3 else 0))
    # a ground fire at a rubble pile
    if rub:
        x, y, _, _ = rub[len(rub) // 2]
        out += flame(x, y, 1, t, seed + 50, 1)
    return out


def police_car(x, y, t):
    on = t % 2
    v = B(x, x + 1, y, y + 4, 0, 0, 'polW') + [(x + 1, y + k, 0, 'polB') for k in (1, 2, 3)]
    v += B(x, x + 1, y + 1, y + 3, 1, 1, 'polW') + [(x + 1, y + 1, 1, 'carW'), (x + 1, y + 3, 1, 'carW'), (x, y + 1, 1, 'carW')]
    v += [(x, y + 2, 2, 'sirR' if on else 'sirO'), (x + 1, y + 2, 2, 'sirB' if not on else 'sirO2')]
    return v


def interdicted(v, spec, t):
    cl = cells_of(v)
    for p, c in list(cl.items()):
        if c == 'win':
            cl[p] = 'off'
    # seal doors with planks + red seal
    for x0, x1, y0, y1, z0, z1 in spec['doors']:
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                for z in range(z0, z1 + 1):
                    cl[(x, y, z)] = 'seal' if z % 2 == 0 else 'seal2'
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        cl[(x1, cy, (z0 + z1) // 2 + 1 if z1 - z0 > 2 else z0 + 1)] = 'xred'
    # big red X on the main roof
    x0, x1, y0, y1 = spec['xbox']
    w, h = x1 - x0, y1 - y0
    top = {}
    for (x, y, z), c in cl.items():
        if x0 <= x <= x1 and y0 <= y <= y1 and z >= 0:
            top[(x, y)] = max(top.get((x, y), -9), z)
    for (x, y), z in top.items():
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        th = 1.0 if min(w, h) >= 10 else 0.5      # axis-aligned cross reads as an X on screen
        if (abs(x - cx) <= th and abs(y - cy) <= h * .42) or (abs(y - cy) <= th and abs(x - cx) <= w * .42):
            cl[(x, y, z)] = 'xred'
    out = [(x, y, z, c) for (x, y, z), c in cl.items()]
    # police tape on posts around the plot
    g = [(x, y) for x, y, z, c in v if z == -1]
    gx0, gx1 = min(p[0] for p in g) + 1, max(p[0] for p in g) - 1
    gy0, gy1 = min(p[1] for p in g) + 1, max(p[1] for p in g) - 1
    per = [(x, gy0) for x in range(gx0, gx1 + 1)] + [(gx1, y) for y in range(gy0 + 1, gy1 + 1)] + \
          [(x, gy1) for x in range(gx1 - 1, gx0 - 1, -1)] + [(gx0, y) for y in range(gy1 - 1, gy0, -1)]
    for i, (x, y) in enumerate(per):
        if i % 6 == 0:
            out += [(x, y, z, 'post') for z in range(0, 3)]
        else:
            out.append((x, y, 2, 'tapeK' if i % 3 == 0 else 'tapeY'))
    # police car: find a free 2x5 spot close to the front corner
    # police car parked on its own asphalt patch just outside the plot's front (+x) edge
    my = (gy0 + gy1) // 2 + 1
    out += [(x, y, -1, 'asph' if (x + y) % 3 else 'asph2') for x in range(gx1 + 2, gx1 + 6) for y in range(my - 2, my + 6)]
    out += police_car(gx1 + 3, my - 1, t)
    return out


def bounds(sets):
    xs, ys = [], []
    for v in sets:
        for x, y, z, c in v:
            xs.append(x - y); ys.append(x + y - 2 * z)
    return min(xs) * 2 - 6, max(xs) * 2 + 10, min(ys) - 6, max(ys) + 10


def render(vox, bb):
    minx, maxx, miny, maxy = bb
    W, H = maxx - minx, maxy - miny
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); pix = im.load()
    gl = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gp = gl.load()
    cl = cells_of(vox)
    for (x, y, z), c in sorted(cl.items(), key=lambda kv: (kv[0][0] + kv[0][1] + kv[0][2], kv[0][2])):
        sx = (x - y) * 2 - minx - 2; sy = (x + y) - 2 * z - miny - 2
        e = c in L.EMIS
        j = (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >> 3) % 9 - 4
        def sh(k):
            return tuple(max(0, min(255, int(q * k + j))) for q in L.C[c]) + (255,)
        top, left, right = (sh(1),) * 3 if e else (sh(1.15), sh(0.9), sh(0.68))
        gcol = GLOW.get(c)
        for (fx, fy), col in (((1, 0), top), ((2, 0), top), ((0, 1), top), ((1, 1), top), ((2, 1), top), ((3, 1), top),
                              ((0, 2), left), ((1, 2), left), ((0, 3), left), ((1, 3), left),
                              ((2, 2), right), ((3, 2), right), ((2, 3), right), ((3, 3), right)):
            X, Y = sx + fx, sy + fy
            if 0 <= X < W and 0 <= Y < H:
                pix[X, Y] = col
                gp[X, Y] = gcol + (230 if c in ('sirR', 'sirB') else 150,) if gcol else (0, 0, 0, 0)
    a = im.split()[3].filter(ImageFilter.MaxFilter(3))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste(Image.new('RGBA', im.size, (14, 16, 20, 255)), mask=a)
    out.alpha_composite(im)
    out.alpha_composite(gl.filter(ImageFilter.GaussianBlur(3)))
    return out


NAMES = [('1 · Célula', 'celula'), ('2 · Casa Segura', 'casa'), ('3 · Escritório', 'escritorio'),
         ('4 · Complexo', 'complexo'), ('5 · Base', 'base')]
STATES = ['NORMAL', 'DANIFICADA', 'INTERDITADA']
SCOL = [(150, 200, 140), (255, 120, 60), (240, 200, 40)]

IDS = ['cell', 'safehouse', 'office', 'compound', 'base']

if __name__ == '__main__':
    import atlas
    statics = []
    for li, (name, key) in enumerate(NAMES):
        base = getattr(L, key)(); spec = SPEC[key]
        sets = [[base, damaged(base, spec, t, 100 + li * 7), interdicted(base, spec, t)] for t in range(T)]
        bb = bounds([s for fr in sets for s in fr])
        frames = [[render(s, bb) for s in fr] for fr in sets]
        anchor = (-bb[0], -bb[2] + 1)
        for k, st in enumerate(('normal', 'damaged', 'interdicted')):
            statics.append((IDS[li], frames[0][k], anchor, st))
        # animação: normal é parado; danificada (fogo/fumaça) e interditada (sirenes) em T quadros
        rows = [('NORMAL', [frames[0][0]]), ('DANIFICADA', [f[1] for f in frames]), ('INTERDITADA', [f[2] for f in frames])]
        atlas.write_set('station-' + IDS[li], rows, anchor=anchor, default_fps=8)
    atlas.write_static('stations', statics)
