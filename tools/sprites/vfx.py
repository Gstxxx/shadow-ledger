"""Isometric voxel VFX sprites (not tied to a character)."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig

rig.C.update({
    'e1': (255, 252, 220), 'e2': (255, 220, 110), 'e3': (255, 150, 50), 'e4': (220, 80, 30), 'e5': (140, 40, 24),
    's1': (120, 118, 116), 's2': (90, 88, 88), 's3': (64, 62, 64), 'char': (40, 34, 30), 'deb': (90, 76, 60),
    'b1': (170, 20, 24), 'b2': (120, 10, 16), 'b3': (90, 8, 12),
    'k1': (255, 255, 230), 'k2': (255, 220, 120), 'k3': (255, 170, 60),
    'd1': (176, 160, 130), 'd2': (150, 136, 110), 'd3': (122, 110, 90),
    'w1': (255, 255, 255), 'w2': (230, 236, 255), 'w3': (190, 200, 230),
    'g1': (170, 200, 110), 'g2': (140, 172, 90), 'g3': (110, 140, 74),
    't1': (255, 250, 200), 't2': (255, 210, 120),
})
rig.EMISSIVE |= {'e1', 'e2', 'e3', 'e4', 'k1', 'k2', 'k3', 'w1', 'w2', 't1', 't2'}
R = rig.render


def ball(cx, cy, cz, r, cols, rnd=None, hollow=False, squash=1.0):
    v = []
    ri = int(r) + 1
    for x in range(-ri, ri + 1):
        for y in range(-ri, ri + 1):
            for z in range(-ri, ri + 1):
                d = math.sqrt(x * x + y * y + (z / squash) ** 2)
                if d <= r and (not hollow or d >= r - 1.4):
                    if rnd and rnd.random() < 0.18:
                        continue
                    k = min(len(cols) - 1, int(d / max(r, 0.01) * len(cols)))
                    v.append((round(cx + x), round(cy + y), round(cz + z), cols[k]))
    return v


def explosion():
    fr = []
    deb = [(random.Random(i).uniform(-1, 1), random.Random(i + 50).uniform(-1, 1), random.Random(i + 99).uniform(0.6, 1.4)) for i in range(14)]
    for t in range(8):
        rnd = random.Random(t)
        v = []
        if t == 0:
            v += ball(0, 0, 2, 2.2, ['e1', 'e1', 'e2'])
        elif t <= 3:
            r = 2.5 + t * 1.6
            v += ball(0, 0, 2 + t, r, ['e1', 'e2', 'e3', 'e4'], rnd)
        else:
            r = 6.5 + (t - 3) * 0.6
            v += ball(0, 0, 4 + t, r * 0.9, ['e3', 'e4', 's2', 's1', 's3'], rnd, squash=0.8)
            v += ball(0, 0, 8 + t * 1.2, r * 0.6, ['s1', 's2', 's3'], rnd)
        for dx, dy, dz in deb:                                                     # flying debris
            if 0 < t < 7:
                v.append((round(dx * t * 2.4), round(dy * t * 2.4), max(0, round(dz * (6 * t - 0.9 * t * t))), 'deb'))
        if t >= 2:                                                                 # scorch mark
            v += [(x, y, -1, 'char') for x in range(-4, 5) for y in range(-4, 5) if x * x + y * y <= 14 + t]
        fr.append(R(v))
    return fr


def blood():
    fr = []
    drops = [(random.Random(i).uniform(0.3, 1.2), random.Random(i + 7).uniform(-0.8, 0.8), random.Random(i + 13).uniform(0.4, 1.3)) for i in range(10)]
    for t in range(6):
        v = []
        if t <= 3:
            for k, (dx, dy, dz) in enumerate(drops):
                x = round(dx * (t + 1) * 2); y = round(dy * (t + 1) * 1.6); z = round(10 + dz * 3 * (t + 1) - 1.3 * (t + 1) ** 2)
                if z >= 0:
                    v.append((x, y, z, 'b1' if k % 3 else 'b2'))
        if t == 0:
            v += ball(0, 0, 10, 1.4, ['b1', 'b2'])
        if t >= 2:
            n = min(t - 1, 3)
            v += [(x, y, -1, 'b2' if (x + y) % 3 else 'b3') for x in range(1, 3 + n * 2) for y in range(-n, n + 1)
                  if (x - 2 - n) ** 2 + y * y * 1.6 <= (n + 1) ** 2]
        fr.append(R(v))
    return fr


def smoke():
    fr = []
    for t in range(6):
        rnd = random.Random(40 + t)
        v = []
        for k in range(3):
            age = t - k * 2
            if age < 0:
                continue
            r = 1.6 + age * 0.9
            v += ball(k - 1, -k, 2 + age * 2.2 + k, r, ['s1', 's1', 's2', 's3'] if age < 4 else ['s2', 's3'], rnd)
        fr.append(R(v))
    return fr


def sparks():
    fr = []
    dirs = [(1, 0.4, 1.2), (1.2, -0.6, 0.8), (0.8, 1, 0.5), (1.4, 0.1, 0.2), (0.6, -1, 1.4), (1.1, 0.7, 1.6)]
    for t in range(4):
        v = [(-1, 0, 6, 'k1')] if t == 0 else []
        for dx, dy, dz in dirs:
            for s in range(2):
                q = t * 2 + s
                v.append((round(dx * q * 1.4), round(dy * q * 1.4), round(6 + dz * q - 0.35 * q * q), 'k1' if q < 3 else ('k2' if q < 6 else 'k3')))
        fr.append(R([p for p in v if p[2] >= 0]))
    return fr


def fire():
    fr = []
    for t in range(6):
        rnd = random.Random(70 + t)
        v = [(x, y, -1, 'char') for x in range(-3, 4) for y in range(-3, 4) if x * x + y * y <= 9]
        for x in range(-2, 3):
            for y in range(-2, 3):
                if x * x + y * y > 6:
                    continue
                h = 3 + rnd.randint(0, 4) - (abs(x) + abs(y))
                for z in range(0, max(1, h)):
                    c = 'e4' if z == 0 else ('e3' if z < h * 0.4 else ('e2' if z < h * 0.8 else 'e1'))
                    v.append((x, y, z, c))
        v += [(rnd.randint(-1, 1), rnd.randint(-1, 1), 8 + rnd.randint(0, 3), 'k2'), (0, 0, 10 + t % 3, 's2'), (1, -1, 12 + t % 2, 's3')]
        fr.append(R(v))
    return fr


def dust():
    fr = []
    for t in range(4):
        rnd = random.Random(90 + t)
        v = []
        r = 1.2 + t * 1.3
        for a in range(0, 360, 30):
            x = round(math.cos(math.radians(a)) * r); y = round(math.sin(math.radians(a)) * r)
            if rnd.random() < 0.85:
                v += ball(x, y, 0 + t // 2, 0.9 + t * 0.25, ['d1', 'd2', 'd3'][t // 2:] or ['d3'])
        fr.append(R(v))
    return fr


def flashbang():
    fr = []
    for t in range(4):
        if t == 0:
            v = [(0, 0, 1, 'w3'), (0, 0, 2, 'w3')]
        elif t == 1:
            v = ball(0, 0, 3, 5.5, ['w1', 'w1', 'w2', 'w3'])
        elif t == 2:
            v = ball(0, 0, 3, 3.2, ['w1', 'w2']) + ball(0, 0, 3, 7, ['w3'], random.Random(3), hollow=True)
        else:
            v = ball(0, 0, 4, 2.4, ['s1', 's2'], random.Random(4)) + [(0, 0, 0, 's3')]
        fr.append(R(v))
    return fr


def gas():
    fr = []
    for t in range(6):
        rnd = random.Random(120 + t)
        v = [(0, 0, 0, 's3'), (0, 0, 1, 'g3')]
        r = 2 + t * 1.2
        v += ball(0, 0, 1 + t // 2, r, ['g1', 'g2', 'g2', 'g3'], rnd, squash=0.5)
        fr.append(R(v))
    return fr


def tracer():
    fr = []
    for t in range(4):
        v = []
        x0 = -10 + t * 6
        for k in range(5):
            x = x0 + k
            if -12 <= x <= 12:
                v.append((x, 0, 8, 't1' if k > 2 else 't2'))
        if t == 3:
            v += [(12, 0, 8, 'k1'), (12, 1, 9, 'k2'), (12, -1, 7, 'k2'), (11, 0, 9, 'k3')]
        if t == 0:
            v += [(-12, 0, 8, 'e1'), (-11, 0, 8, 'e2'), (-12, 0, 9, 'e2'), (-12, 0, 7, 'e3')]
        fr.append(R(v))
    return fr


ROWS = [('EXPLOSÃO', explosion()), ('SANGUE', blood()), ('FUMAÇA', smoke()), ('FAÍSCAS / RICOCHETE', sparks()),
        ('FOGO', fire()), ('POEIRA', dust()), ('FLASHBANG', flashbang()), ('GÁS', gas()), ('TRAÇANTE + IMPACTO', tracer())]
if __name__ == '__main__':
    rig.export(ROWS, set(), 'vfx', shadow=False, default_fps=10)
