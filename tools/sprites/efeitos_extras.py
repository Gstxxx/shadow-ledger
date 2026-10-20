"""Extra VFX: arrest, money +/-, red smoke flare, rain, fog, level up, alarm, police tape."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from sl_common import box, render, ring, disc, ball, shift, text_vox

rig.C.update({'cashG': (90, 230, 120), 'coinG': (250, 214, 90), 'cashF': (60, 120, 70), 'cashRF': (120, 50, 50),
              'redF': (255, 120, 110), 'post': (70, 72, 78), 'tapeY': (240, 200, 40), 'tapeK': (34, 34, 36),
              'puddle': (50, 70, 100), 'rainL': (190, 220, 255)})
rig.EMISSIVE |= {'cashG', 'coinG', 'redF', 'tapeY', 'tapeK', 'rainL'}
GL = {'cashG', 'coinG', 'coinR', 'red', 'redF', 'goldL', 'gold', 'e1', 'e2', 'smr', 'amber'}


def R(v, s=160, ghost=(), alpha=0.6):
    """Opaque voxels v plus an optional translucent layer `ghost` (fog, light beams)."""
    im = render(v, glow=GL, strength=s)
    if ghost:
        g = render(list(ghost), glow=GL, strength=s)
        a = g.split()[3].point(lambda q: int(q * alpha)); g.putalpha(a)
        im.alpha_composite(g)
    return im


GLYPH = {'+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
         '$': ['.##', '#..', '.#.', '..#', '##.'], 'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'S': ['.##', '#..', '.#.', '..#', '##.']}


def word(s):
    return ['.'.join(GLYPH[ch][r] for ch in s) for r in range(5)]


def algema():
    fr = []
    for t in range(6):
        v = []
        gap = [120, 70, 20, 0, 0, 0][t]
        for cx in (-3, 3):                                                   # two cuffs (vertical rings facing +y)
            for a in range(0, 360, 12):
                if a < gap / 2 or a > 360 - gap / 2:
                    continue
                r = math.radians(a + 90)
                v.append((cx + round(math.cos(r) * 2.2), 0, 5 + round(math.sin(r) * 2.2), 'cuff'))
            v += [(cx, 0, 2, 'cuff2'), (cx + (1 if cx < 0 else -1), 0, 3, 'cuff2')]
        v += [(x, 0, 6 + (1 if abs(x) < 1 else 0), 'cuff2') for x in (-1, 0, 1)]   # chain
        # cell bars descend behind (back walls)
        drop = [20, 20, 20, 12, 4, 0][t]
        if t >= 3:
            for k in range(-6, 7, 2):
                v += [(k, -6, z + drop, 'bars') for z in range(0, 14) if z + drop <= 22]
                v += [(-6, k, z + drop, 'bars') for z in range(0, 14) if z + drop <= 22]
            v += [(k, -6, 13 + drop, 'bars') for k in range(-6, 7)] + [(-6, k, 13 + drop, 'bars') for k in range(-6, 7)]
            v += [(k, -6, 6 + drop, 'bars') for k in range(-6, 7)] + [(-6, k, 6 + drop, 'bars') for k in range(-6, 7)]
        if t == 3:
            v += [(-3, 1, 7, 'goldL'), (3, 1, 7, 'goldL')]                        # click glint
        v = [p for p in v if p[2] >= 0]
        fr.append(R(v))
    return fr


def money(sign):
    fr = []
    pos = sign == '+'
    bill, bill2, coin, fade = ('cash', 'cash2', 'coinG', 'cashF') if pos else ('cashR', 'cashR2', 'coinR', 'cashRF')
    txt = 'cashG' if pos else 'redF'
    items = [(-3, 1, 0, 'b'), (2, -2, 1, 'c'), (0, 3, 2, 'b'), (3, 2, 3, 'c'), (-2, -3, 4, 'c'), (1, 0, 5, 'b')]
    for t in range(6):
        v = []
        for x, y, ph, kind in items:
            age = (t + ph) % 6
            z = 1 + age * 2
            col_b = bill if age < 3 else (bill2 if age < 5 else fade)
            if kind == 'b':
                v += [(x, y, z, col_b), (x + 1, y, z, col_b), (x, y + 1, z, bill2), (x + 1, y + 1, z, col_b)]
            else:
                v += [(x, y, z, coin if age < 4 else fade)]
        # rising glyph "+$" / "-$"
        gz = 3 + t * 2
        col = txt if t < 4 else (bill2 if t < 5 else fade)
        for r, line in enumerate(word(sign + '$')):
            for k, ch in enumerate(line):
                if ch == '#':
                    for a in (0, 1):
                        for b in (0, 1):
                            v.append((-6 + k * 2 + a, 3, gz + (4 - r) * 2 + b, col))
        fr.append(R(v))
    return fr


def sinalizador():
    fr = []
    for t in range(8):
        rnd = random.Random(200 + t)
        v = [(0, 0, 0, 'red2'), (1, 0, 0, 'red2'), (1, 0, 1, 'red3')]          # flare stick lying on the ground
        v += [(2, 0, 1, 'e1'), (2, 0, 2, 'redF' if t % 2 else 'e2')]           # burning tip
        for k in range(2):
            v.append((2 + rnd.randint(0, 1), rnd.randint(-1, 1), 3 + rnd.randint(0, 2), 'redF'))
        for k in range(4):                                                   # looping red smoke puffs
            age = (t + k * 2) % 8
            r = 1.2 + age * 0.45
            v += ball(2 - age * 0.5, age * 0.4, 3 + age * 2.2, r, ['smr', 'smr2', 'smr3'] if age < 5 else ['smr2', 'smr3'], rnd)
        v += [(x, y, -1, 'smr3') for x in range(1, 4) for y in range(-1, 2) if (x + y) % 2 == 0]   # red cast on the ground
        fr.append(R(v))
    return fr


def chuva():
    fr = []
    rnd0 = random.Random(7)
    drops = [(rnd0.randint(-8, 8), rnd0.randint(-7, 7), rnd0.randint(0, 5)) for _ in range(22)]
    for t in range(6):
        v = [(x, y, -1, 'puddle') for x in range(-3, 3) for y in range(-2, 3) if (x * x + y * y * 1.5) <= 7]
        for x, y, ph in drops:
            h = ((ph - t) % 6) * 4 + 1
            if h <= 1:                                                       # splash
                v += [(x + 1, y, 0, 'rain'), (x - 1, y, 0, 'rain'), (x, y + 1, 0, 'rain'), (x, y - 1, 0, 'rain'), (x, y, 1, 'rainL')]
            else:
                v += [(x, y, h, 'rainL'), (x, y, h + 1, 'rain'), (x, y, h + 2, 'rain2')]
        fr.append(R(v))
    return fr


def neblina():
    fr = []
    banks = [(-10, -2, 0, 3.5), (-2, 3, 1, 4.0), (5, -4, 0, 3.2), (-6, 5, 1, 3.0), (2, -8, 0, 3.0)]
    for t in range(8):
        rnd = random.Random(300 + t)
        v = []
        for bx, by, bz, r in banks:
            x = ((bx + t * 1.5 + 12) % 24) - 12                                # drift along +x, wrap
            v += ball(x, by, bz, r, ['fog', 'fog', 'fog2'], rnd, squash=0.3, drop=0.45)
        v = [p for p in v if p[2] >= 0 and abs(p[0]) <= 13 and abs(p[1]) <= 10]
        fr.append(R([], ghost=v, alpha=0.55))
    return fr


def nivel_subiu():
    fr = []
    for t in range(6):
        h = [4, 10, 16, 20, 20, 20][t]
        v = ring(2.5 + t * 0.9, 0, 'gold' if t < 4 else 'gold2', thick=0.8)
        pil = []
        for z in range(0, h):
            w = 1.6 if z < h - 2 else 0.9
            pil += [(x, y, z, 'goldL' if x * x + y * y <= 0.6 else 'gold') for x in (-1, 0, 1) for y in (-1, 0, 1) if x * x + y * y <= w * w]
        if t >= 3:                                                           # pillar lifts off from the bottom
            pil = [p for p in pil if p[2] >= (t - 3) * 7]
        rnd = random.Random(400 + t)
        for k in range(8):                                                   # sparkles rising
            a = rnd.random() * 6.28; rr = 3 + rnd.random() * 2
            v.append((round(math.cos(a) * rr), round(math.sin(a) * rr), rnd.randint(2, 6 + t * 3), 'goldL' if k % 2 else 'gold'))
        cz = 6 + t * 3                                                       # up chevron
        if t >= 1:
            v += [(x, 3, cz + (1 - abs(x)), 'goldL') for x in (-2, -1, 0, 1, 2)]
        fr.append(R(v, ghost=pil, alpha=0.7))
    return fr


def alarme():
    fr = []
    for t in range(6):
        v = disc(2.4, 0, 'dark') + disc(1.8, 1, 'steel3') + disc(1.5, 2, 'steel3')
        v += ball(0, 0, 3.5, 1.6, ['red', 'red2'])
        beam = []
        a0 = t * 60
        for off in (0, 180):                                                 # rotating twin beams
            a = math.radians(a0 + off)
            for d in range(2, 8):
                for s in (-1, 0, 1):
                    if abs(s) > d / 4:
                        continue
                    px = round(math.cos(a) * d - math.sin(a) * s); py = round(math.sin(a) * d + math.cos(a) * s)
                    beam.append((px, py, 4, 'red' if d < 5 else 'red2'))
        fr.append(R(v, ghost=beam, alpha=0.55))
    return fr


def interditado():
    fr = []
    for t in range(6):
        v = box(0, 0, -7, -7, 0, 5, 'post') + box(0, 0, 7, 7, 0, 5, 'post') + [(0, -7, -1, 'dark'), (0, 7, -1, 'dark')]
        n = [2, 5, 8, 11, 14, 14][t]
        for i in range(n):                                                   # tape unrolls from the left post
            y = -6 + i
            if y > 6:
                break
            sag = 1 if 3 <= i <= 9 else 0
            v.append((0, y, 5 - sag, 'tapeK' if (i // 2) % 2 else 'tapeY'))
        if n < 13:                                                           # roll at the end of the tape
            y = -6 + n
            v += [(0, y, 5 - (1 if 3 <= n <= 9 else 0), 'tapeY'), (1, y, 5 - (1 if 3 <= n <= 9 else 0), 'tapeK')]
        if t >= 4:                                                           # second strip
            m = [0, 0, 0, 0, 7, 13][t]
            for i in range(m):
                v.append((0, -6 + i, 2, 'tapeY' if (i // 2) % 2 else 'tapeK'))
        fr.append(R(v))
    return fr


ROWS = [('ALGEMA / PRISÃO', algema()), ('+US$ DINHEIRO', money('+')), ('-US$ DINHEIRO', money('-')),
        ('SINALIZADOR (FUMAÇA)', sinalizador()), ('CHUVA', chuva()), ('NEBLINA', neblina()),
        ('NÍVEL SUBIU', nivel_subiu()), ('ALARME', alarme()), ('INTERDITADO', interditado())]
if __name__ == '__main__':
    rig.export(ROWS, {'ALGEMA / PRISÃO', 'INTERDITADO', 'NÍVEL SUBIU'}, 'vfx-extra', shadow=False, default_fps=10)
