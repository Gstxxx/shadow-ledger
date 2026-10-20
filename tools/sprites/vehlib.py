"""Shared helpers for isometric voxel VEHICLE sprites (built on rig.render).

Vehicles face +x (SE on screen), z up, ground z=0. Visible faces: top, +x (front), +y (left flank).
"""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig

box = rig.box

rig.C.update({
    # fx (same as vfx.py)
    'e1': (255, 252, 220), 'e2': (255, 220, 110), 'e3': (255, 150, 50), 'e4': (220, 80, 30), 'e5': (140, 40, 24),
    's1': (120, 118, 116), 's2': (90, 88, 88), 's3': (64, 62, 64), 's0': (160, 158, 154), 'char': (40, 34, 30), 'deb': (90, 76, 60),
    'k1': (255, 255, 230), 'k2': (255, 220, 120), 'k3': (255, 170, 60),
    'd1': (176, 160, 130), 'd2': (150, 136, 110), 'd3': (122, 110, 90),
    't1': (255, 250, 200), 't2': (255, 210, 120), 'brass': (230, 186, 80),
    'w1': (236, 240, 246), 'w2': (210, 216, 226), 'w3': (186, 192, 204),
    # running gear
    'tire': (30, 30, 33), 'tire2': (62, 62, 66), 'hub': (120, 122, 126), 'hub2': (80, 82, 86),
    'trk': (42, 42, 44), 'trk2': (78, 76, 72), 'rw': (70, 74, 60),
    'steel': (104, 108, 114), 'steel2': (70, 72, 78), 'gun': (38, 40, 44), 'gun2': (58, 60, 66),
    'glassV': (70, 110, 140), 'glassV2': (120, 170, 200), 'lightW': (255, 240, 170), 'tail': (210, 30, 30),
    'sirR': (255, 60, 60), 'sirB': (70, 120, 255), 'sirRo': (110, 40, 44), 'sirBo': (40, 52, 100),
    # military
    'ol': (92, 100, 64), 'ol2': (74, 82, 52), 'ol3': (112, 120, 80), 'olD': (52, 58, 38),
    'tan': (178, 156, 112), 'tan2': (150, 128, 90), 'tan3': (198, 178, 134), 'tanD': (110, 94, 66),
    'tk': (80, 94, 58), 'tk2': (64, 76, 46), 'tk3': (98, 112, 72), 'era': (70, 84, 52),
    'ab': (180, 164, 122), 'ab2': (154, 138, 100), 'ab3': (200, 186, 146), 'abD': (120, 106, 76),
    # police
    'pw': (226, 230, 236), 'pw2': (196, 200, 208), 'pb': (36, 58, 124), 'pk': (28, 30, 34), 'pk2': (48, 50, 56),
    # wreck
    'burnt': (40, 36, 34), 'burnt2': (60, 54, 50), 'rust': (100, 62, 42),
    # aircraft
    'jg': (150, 158, 168), 'jg2': (122, 130, 140), 'jg3': (178, 186, 196), 'jgD': (90, 96, 106),
    'st': (66, 70, 78), 'st2': (50, 54, 60), 'st3': (84, 88, 96),
    'canopy': (150, 128, 70), 'canopy2': (96, 120, 140),
    'af1': (255, 236, 160), 'af2': (255, 160, 70), 'af3': (130, 170, 255),
    'msl': (222, 224, 226), 'mslD': (60, 62, 66), 'bomb': (70, 76, 60),
    'hg': (64, 72, 58), 'hg2': (50, 56, 46), 'hg3': (80, 88, 72), 'ap': (72, 76, 66), 'ap2': (56, 60, 52), 'ap3': (88, 92, 80),
    'rotor': (36, 38, 40), 'blur1': (104, 108, 112), 'blur2': (140, 144, 148),
    'cw': (224, 228, 232), 'cg': (168, 174, 182), 'cg2': (136, 142, 150), 'cgD': (98, 104, 112),
    'stripe': (180, 120, 36), 'stripe2': (150, 40, 40), 'contrail': (236, 240, 246),
})
rig.EMISSIVE |= {'e1', 'e2', 'e3', 'e4', 'k1', 'k2', 'k3', 't1', 't2', 'brass', 'lightW', 'tail',
                 'sirR', 'sirB', 'af1', 'af2', 'af3'}
GLOW = {'sirR': (255, 40, 40), 'sirB': (60, 110, 255), 'tail': (255, 40, 30), 'af3': (110, 160, 255),
        'lightW': (255, 240, 190)}
FX = {'e1', 'e2', 'e3', 'e4', 'e5', 's0', 's1', 's2', 's3', 'k1', 'k2', 'k3', 'd1', 'd2', 'd3', 't1', 't2',
      'brass', 'w1', 'w2', 'w3', 'blur1', 'blur2', 'contrail', 'af1', 'af2', 'af3', 'char_g'}
GLASS = {'glassV', 'glassV2', 'canopy', 'canopy2'}


def canvas(w, h, cx, cy):
    rig.CW, rig.CH, rig.CX, rig.CY = w, h, cx, cy


# ------------------------------------------------------------------ rendering
SHADOWS = {}


def scr(x, y, z):
    return rig.CX + (x - y) * 2 - 2, rig.CY + (x + y) - z * 2 - 2


def R(vox, shadow=True):
    vox = [(round(v[0]), round(v[1]), round(v[2]), v[3]) for v in vox if v[3]]
    im = rig.render(vox)
    gl = [v for v in vox if v[3] in GLOW]
    if gl:
        g = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(g)
        for x, y, z, c in gl:
            sx, sy = scr(x, y, z)
            d.rectangle([sx - 1, sy - 1, sx + 4, sy + 4], fill=GLOW[c] + (190,))
        im.alpha_composite(g.filter(ImageFilter.GaussianBlur(3)))
    if shadow:
        cols = {(x, y) for x, y, z, c in vox if c not in FX and z >= -0.5}
        s = Image.new('L', im.size, 0); d = ImageDraw.Draw(s)
        for x, y in cols:
            sx, sy = scr(x, y, -1)
            d.rectangle([sx, sy, sx + 3, sy + 1], fill=255)
        SHADOWS[id(im)] = s.filter(ImageFilter.GaussianBlur(0.8))
    return im


# ------------------------------------------------------------------ geometry
def mv(vox, dx=0, dy=0, dz=0):
    return [(x + dx, y + dy, z + dz, c) for x, y, z, c in vox]


def recolor(vox, m):
    return [(x, y, z, m.get(c, c)) for x, y, z, c in vox]


def rotate(vox, roll=0, pitch=0, yaw=0, pivot=(0, 0, 0)):
    """Rotate voxels (degrees). roll about x (+ = left wing (+y) up), pitch about y (+ = nose (+x) up),
    yaw about z (+ = nose turns toward +y). Inverse-mapped, hole free."""
    if not (roll or pitch or yaw):
        return vox
    a, b, g = math.radians(roll), math.radians(pitch), math.radians(yaw)

    def Rx(p, s):
        x, y, z = p; c, n = math.cos(s), math.sin(s); return (x, y * c - z * n, y * n + z * c)

    def Ry(p, s):
        x, y, z = p; c, n = math.cos(s), math.sin(s); return (x * c - z * n, y, x * n + z * c)

    def Rz(p, s):
        x, y, z = p; c, n = math.cos(s), math.sin(s); return (x * c - y * n, x * n + y * c, z)

    px, py, pz = pivot
    fwd = lambda p: Rz(Ry(Rx(p, a), b), g)
    inv = lambda p: Rx(Ry(Rz(p, -g), -b), -a)
    src = {}
    for x, y, z, c in vox:
        src[(x, y, z)] = c
    pts = [fwd((x - px, y - py, z - pz)) for x, y, z in src]
    lo = [math.floor(min(p[k] for p in pts)) - 1 for k in range(3)]
    hi = [math.ceil(max(p[k] for p in pts)) + 1 for k in range(3)]
    out = []
    for X in range(lo[0], hi[0] + 1):
        for Y in range(lo[1], hi[1] + 1):
            for Z in range(lo[2], hi[2] + 1):
                sx, sy, sz = inv((X, Y, Z))
                c = src.get((round(sx + px), round(sy + py), round(sz + pz)))
                if c:
                    out.append((X + px, Y + py, Z + pz, c))
    return [(round(x), round(y), round(z), c) for x, y, z, c in out]


def line(p0, p1, c, w=0):
    n = int(max(abs(p1[k] - p0[k]) for k in range(3))) + 1
    out = []
    for i in range(n + 1):
        t = i / n
        p = [round(p0[k] + (p1[k] - p0[k]) * t) for k in range(3)]
        out.append((p[0], p[1], p[2], c))
        if w:
            out.append((p[0], p[1] + 1, p[2], c)); out.append((p[0], p[1], p[2] - 1, c))
    return out


def ball(cx, cy, cz, r, cols, rnd=None, hollow=False, squash=1.0, keep=0.82, jit=0.0):
    v = []
    ri = int(r) + 1
    for x in range(-ri, ri + 1):
        for y in range(-ri, ri + 1):
            for z in range(-ri, ri + 1):
                d = math.sqrt(x * x + y * y + (z / squash) ** 2)
                if d <= r and (not hollow or d >= r - 1.4):
                    if rnd and rnd.random() > keep:
                        continue
                    f = d / max(r, 0.01)
                    if jit and rnd:
                        f += rnd.uniform(-jit, jit * 0.4)
                    k = max(0, min(len(cols) - 1, int(f * len(cols))))
                    v.append((round(cx + x), round(cy + y), round(cz + z), cols[k]))
    return v


def disc_xz(cx, y, cz, r, cols):
    """Filled disc in the x-z plane at column y; cols(dx,dz,d,angle)->color or None."""
    v = []
    ri = int(r) + 1
    for dx in range(-ri, ri + 1):
        for dz in range(-ri, ri + 1):
            d = math.hypot(dx, dz)
            if d <= r:
                c = cols(dx, dz, d, math.degrees(math.atan2(dz, dx)))
                if c:
                    v.append((cx + dx, y, cz + dz, c))
    return v


def wheel(cx, y, cz, r, phase, width=2, tire='tire', hub='hub', mark='tire2', dy=-1):
    """Wheel in x-z plane; outer face at column y, extends `width` columns toward dy. phase in degrees."""
    def col(dx, dz, d, ang):
        if d > r - 1.1:
            return mark if ((ang + phase) % 90) < 24 else tire
        if dx == 0 and dz == 0:
            return 'hub2'
        return hub
    v = []
    for k in range(width):
        v += disc_xz(cx, y + dy * k, cz, r, col if k == 0 else (lambda dx, dz, d, a: tire))
    return v


def track(x0, x1, y0, y1, zb, zt, phase, wheels, rw_r=1.6, link='trk', link2='trk2', rw='rw'):
    """Tank track loop on columns y0..y1 (y1 = outer visible side), bottom zb, top zt.
    Links move: top run toward +x, bottom toward -x (vehicle frame). wheels: list of road wheel x centres."""
    v = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            for z in range(zb, zt + 1):
                # rounded ends
                if (x == x0 or x == x1) and (z == zb or z == zt):
                    continue
                if (x == x0 - 0 and z == zb + 1 and False):
                    continue
                edge = z in (zb, zt) or x in (x0, x1) or (x in (x0 + 1, x1 - 1) and z in (zb + 1, zt - 1))
                if not edge and y != y1:
                    v.append((x, y, z, link)); continue
                if edge:
                    if z == zt:
                        k = (x - phase) % 4
                    elif z == zb:
                        k = (x + phase) % 4
                    else:
                        k = (z + phase + (0 if x < 0 else 2)) % 4
                    v.append((x, y, z, link2 if k < 2 else link))
                else:
                    v.append((x, y, z, link))
    # road wheels on the outer face
    zc = (zb + zt) / 2
    for wx in wheels:
        def col(dx, dz, d, ang, ph=phase):
            if d < 0.5:
                return 'hub2'
            return 'hub2' if ((ang + ph * 22.5) % 90) < 20 else rw
        for p in disc_xz(wx, y1 + 0, round(zc), rw_r, col):
            v.append(p)
    return v


# ------------------------------------------------------------------ effects
def flash(x, y, z, s=1.0, dirx=1, rnd=None):
    """Muzzle flash pointing +x (dirx=1) from the muzzle at (x,y,z)."""
    v = [(x, y, z, 'k1')]
    L = max(1, round(3 * s))
    for i in range(1, L + 1):
        v.append((x + dirx * i, y, z, 'k1' if i < L * 0.5 else ('e2' if i < L else 'e3')))
    w = max(1, round(1.5 * s))
    for i in range(1, w + 1):
        c = 'e2' if i < w else 'e3'
        v += [(x + dirx, y + i, z, c), (x + dirx, y - i, z, c), (x + dirx, y, z + i, c), (x + dirx, y, z - i, c)]
    if s >= 1.5:
        v += ball(x + dirx * 2, y, z, 1.2 * s, ['k1', 'e2', 'e3'], rnd)
    return v


def explosion(t, cx, cy, cz, s=1.0, seed=0, debris=True):
    """Explosion stage t (0..7) centred at (cx,cy,cz) scaled by s."""
    rnd = random.Random(seed * 131 + t)
    v = []
    if t == 0:
        v += ball(cx, cy, cz, 2.4 * s, ['e1', 'e1', 'e2'])
    elif t <= 3:
        v += ball(cx, cy, cz + t * s * 0.8, (2.4 + t * 1.6) * s, ['e1', 'e2', 'e2', 'e3', 'e4'] if t < 3 else ['e2', 'e3', 'e4', 's2'], rnd, jit=0.55)
        if t >= 2:
            v += ball(cx - s, cy, cz + (t * 0.8 + 3.5 + t) * s, (1.5 + t * 0.9) * s, ['s1', 's2', 's3'], rnd)
    elif t <= 7:
        r = (6.4 + (t - 3) * 0.6) * s
        v += ball(cx, cy, cz + (2 + t) * s, r * 0.85, ['e2', 'e3', 'e4', 's2', 's1', 's3'][min(2, t - 4):], rnd, squash=0.8, jit=0.5)
        v += ball(cx, cy, cz + (5 + t * 1.3) * s, r * 0.55, ['s1', 's2', 's3'], rnd)
    if debris and 0 < t < 7:
        dr = random.Random(seed)
        for i in range(int(12 * s)):
            dx, dy, dz = dr.uniform(-1, 1), dr.uniform(-1, 1), dr.uniform(0.6, 1.4)
            z = cz + dz * (6 * t - 0.9 * t * t) * s
            if z >= 0:
                v.append((round(cx + dx * t * 2.4 * s), round(cy + dy * t * 2.4 * s), round(z), 'deb'))
    return v


def scorch(cx, cy, r):
    return [(x, y, -1, 'char') for x in range(int(cx - r), int(cx + r) + 1) for y in range(int(cy - r), int(cy + r) + 1)
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r]


def flames(t, pts, seed=0):
    """Fire tongues: pts = [(x,y,z,size)]."""
    v = []
    for i, (px, py, pz, s) in enumerate(pts):
        rnd = random.Random(seed * 77 + t * 13 + i)
        r = int(s)
        for x in range(-r, r + 1):
            for y in range(-r, r + 1):
                if x * x + y * y > s * s:
                    continue
                h = int(s * 1.6) + rnd.randint(0, int(s * 1.4) + 1) - (abs(x) + abs(y))
                for z in range(0, max(1, h)):
                    c = 'e4' if z == 0 else ('e3' if z < h * 0.4 else ('e2' if z < h * 0.8 else 'e1'))
                    v.append((px + x, py + y, pz + z, c))
        if rnd.random() < 0.7:
            v.append((px + rnd.randint(-1, 1), py + rnd.randint(-1, 1), pz + int(s * 3) + rnd.randint(0, 2), 'k2'))
    return v


def plume(t, x, y, z, n=6, cycle=6, rise=2.2, grow=0.55, r0=1.4, drift=(-0.5, 0.2), seed=0, dark=False, maxr=None):
    """Looping smoke column: n puffs, phase t of `cycle` frames."""
    v = []
    rnd = random.Random(seed * 31 + t)
    for k in range(n):
        a = k + (t % cycle) / cycle          # puff age in puff units: seamless loop over `cycle` frames
        r = r0 + a * grow
        if maxr:
            r = min(r, maxr)
        cols = (['s3', 's3', 's2', 's3'] if dark else ['s1', 's1', 's2', 's3']) if a < 2.5 else (['s2', 's3'] if not dark else ['s3', 'char'])
        v += ball(x + drift[0] * a * rise, y + drift[1] * a * rise, z + a * rise, r, cols, rnd)
    return v


def puffs(t, origin, cycle, n=3, vel=(-1.2, 0.3, 0.8), r0=0.8, grow=0.45, cols=('d1', 'd2', 'd3'), seed=0, keep=0.82):
    """Small looping puffs (dust/exhaust) emitted from origin, moving with vel per frame."""
    v = []
    rnd = random.Random(seed * 17 + t)
    for k in range(n):
        age = (t + k * cycle / n) % cycle
        r = r0 + age * grow
        cc = list(cols[min(len(cols) - 1, int(age / cycle * len(cols))):]) or [cols[-1]]
        v += ball(origin[0] + vel[0] * age, origin[1] + vel[1] * age, origin[2] + vel[2] * age, r, cc, rnd, keep=keep)
    return v


def missile(x, y, z, d, L=5, body='msl', tip='mslD', flame=True, t=0):
    """Missile with tail at (x,y,z) pointing along unit vector d=(dx,dy,dz)."""
    v = []
    for i in range(L):
        v.append((round(x + d[0] * i), round(y + d[1] * i), round(z + d[2] * i), tip if i == L - 1 else body))
    # fins
    v.append((round(x), round(y + 1), round(z), tip)); v.append((round(x), round(y - 1), round(z), tip))
    if flame:
        for i in range(1, 3 + t % 2):
            v.append((round(x - d[0] * i), round(y - d[1] * i), round(z - d[2] * i), 'k1' if i == 1 else 'e2'))
    return v


def trail(points, ages, seed=0, fade=8):
    """Smoke trail: points=[(x,y,z)], ages=[int] (older = bigger/greyer)."""
    v = []
    rnd = random.Random(seed)
    for (x, y, z), a in zip(points, ages):
        if a >= fade:
            continue
        r = 0.6 + a * 0.35
        cols = ['w1', 'w2'] if a < 2 else (['w2', 'w3', 's0'] if a < 5 else ['w3', 's0', 's1'])
        v += ball(x, y, z, r, cols, rnd, keep=0.9 - a * 0.06)
    return v


def wreckify(vox, seed=0):
    """Burnt version of a vehicle: soot pattern mixed with darkened original colours, glass -> holes."""
    out = []
    for x, y, z, c in vox:
        if c in GLASS:
            out.append((x, y, z, 'char')); continue
        if c in FX or c in GLOW or c in rig.EMISSIVE:
            out.append((x, y, z, 'burnt')); continue
        h = ((x * 92821) ^ (y * 68917) ^ (z * 31337) ^ seed) % 9
        if h < 4:
            out.append((x, y, z, ('burnt', 'burnt2', 'char', 'rust')[h]))
        else:
            k = c + '_w'
            if k not in rig.C:
                r, g, b = rig.C[c]
                rig.C[k] = (int(r * 0.42 + 18), int(g * 0.38 + 14), int(b * 0.34 + 12))
            out.append((x, y, z, k))
    return out


def casings(t, x, y, z, n=3, seed=0):
    v = []
    for k in range(n):
        a = (t + k) % 4
        v.append((x - a // 2, y + 1 + a, z + 1 + a - (a * a) // 2, 'brass'))
    return [p for p in v if p[2] >= 0]


# ------------------------------------------------------------------ export
def export(ROWS, ONESHOT, set_id, default_fps=10):
    """Grava public/sprites/<set_id>.png + .json (ver atlas.py), com a sombra projetada assada no quadro."""
    import atlas

    def shadow(im):
        s = SHADOWS.get(id(im))
        return s.point(lambda v: v * 105 // 255) if s is not None else None
    atlas.write_set(set_id, ROWS, ONESHOT, anchor=(rig.CX, rig.CY + 1), shadow=shadow, default_fps=default_fps)


def strip(frames, path, S=3):
    """Quick debug strip of one row."""
    CW, CH = rig.CW, rig.CH
    im = Image.new('RGB', (len(frames) * CW * S, CH * S), (16, 19, 26))
    for i, f in enumerate(frames):
        bg = Image.new('RGBA', (CW, CH), (40, 44, 52, 255))
        s = SHADOWS.get(id(f))
        if s is not None:
            sh = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); sh.paste(Image.new('RGBA', (CW, CH), (0, 0, 0, 105)), mask=s)
            bg.alpha_composite(sh)
        bg.alpha_composite(f)
        im.paste(bg.convert('RGB').resize((CW * S, CH * S), Image.NEAREST), (i * CW * S, 0))
    im.save(path)
