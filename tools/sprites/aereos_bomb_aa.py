"""Bombardeiro tático + antiaéreo: bateria antiaérea móvel (Pantsir-like) and sistema SAM (S-300-like TEL)."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
import vehlib as V
from vehlib import box, mv, R, wheel
from planes import fuselage, wing, fin, hcol, burner, vortex, shot_down
from veiculos_leves import destroyed

V.canvas(240, 170, 110, 104)
ALT = 14

BOMBS = [(-6, 0), (-6, 1), (-9, 2), (-9, 3), (-2, 4), (-2, 5)]   # (y, release order) -> pairs


# ======================================================================== BOMBARDEIRO TÁTICO
def bomber(t=0, dropped=0, ab=True):
    c = hcol('jg2', 'jgD', 'jg', 5)
    v = fuselage([(-20, 2, 0, 3), (-8, 3, 0, 3), (6, 3, 0, 3), (11, 2, 0, 4), (17, 1, 1, 3), (21, 0, 2, 2)], c)
    v += box(11, 15, -1, 1, 5, 5, 'canopy2') + box(13, 15, -1, 1, 4, 4, 'canopy2')
    v += [(x, s * 4, z, c(x, 4, z)) for x in range(1, 9) for s in (-1, 1) for z in (0, 1, 2)]
    v += [(9, s * 4, z, 'gun') for s in (-1, 1) for z in (1, 2)]
    v += wing(4, 17, (5, -4), (-6, -9), 2, c)
    v += wing(2, 8, (-14, -20), (-18, -20), 2, c)
    v += fin(0, (-11, -19), (-17, -20), 4, 11, c)
    v += [(-17, 0, 11, 'tail'), (-5, 17, 2, 'tail'), (21, 0, 2, 'jgD'), (22, 0, 2, 'jgD')]
    v += box(-21, -21, -2, -1, 1, 2, 'steel2') + box(-21, -21, 1, 2, 1, 2, 'steel2')
    for i, (yy, order) in enumerate(BOMBS):
        if order // 2 + 1 <= dropped:
            continue
        s = 1 if order % 2 == 0 else -1
        y = yy * s if yy else 0
        y = abs(yy) * s
        v += [(x, y, 0 if abs(y) < 4 else 1, 'bomb') for x in range(-3, 2)] + [(-4, y, 0 if abs(y) < 4 else 1, 'mslD'), (2, y, 0 if abs(y) < 4 else 1, 'bomb')]
        v += [(-1, y, 1 if abs(y) < 4 else 2, 'jgD')]
    if ab:
        v += burner(-22, -2, 1, t, 4) + burner(-22, 2, 1, t + 1, 4)
    return v


def bomber_voar(n=6):
    fr = []
    for t in range(n):
        b = [0, 0, 1, 1, 0, 0][t]
        v = mv(bomber(t), 0, 0, ALT + b)
        v += vortex(t, [(-7, 17, ALT + 2 + b), (-7, -17, ALT + 2 + b)], L=12, gap=3)
        fr.append(R(v))
    return fr


def bomber_bombas(n=10):
    fr = []
    rel = {1: 1, 2: 2, 3: 3}               # frame -> number of pairs dropped so far
    for t in range(n):
        rnd = random.Random(t)
        dropped = max([k for f, k in rel.items() if f <= t] + [0])
        v = mv(bomber(t, dropped), 0, 0, ALT)
        for pair in range(3):
            te = pair + 1
            a = t - te
            if a < 0:
                continue
            for s in (-1, 1):
                yy = [6, 9, 2][pair] * s
                x = -1 - 0.2 * a * a
                z = ALT + (0 if abs(yy) < 4 else 1) - 0.7 * a * a - a
                if z > 0:
                    v += [(round(x) + k, yy, round(z), 'bomb') for k in range(-2, 3)] + [(round(x) - 3, yy, round(z), 'mslD')]
                else:
                    # ground hit: explosion drifting back (aircraft keeps flying)
                    a_hit = next(k for k in range(1, 20) if ALT - 0.7 * k * k - k <= 0)
                    st = a - a_hit
                    gx = -1 - 0.2 * a_hit * a_hit - 1.5 * st
                    if st <= 4:
                        v += V.explosion(st, gx, yy, 1, 0.75, seed=pair * 3 + s, debris=st < 3) + V.scorch(gx, yy, 2 + min(st, 2))
        fr.append(R(v))
    return fr


# ======================================================================== BATERIA ANTIAÉREA MÓVEL
AW = (-8, -4, 3, 7)


def olc(x, y, z):
    k = ((x * 92821) ^ (y * 68917) ^ (z * 31337)) % 13
    return 'ol2' if k < 2 else ('ol3' if k == 2 else 'ol')


def aa_truck(ph=0, radar=0, tubes=12, elev=25):
    v = []
    for wx in AW:
        v += wheel(wx, 4, 2, 2.2, ph, width=2, dy=-1) + wheel(wx, -4, 2, 2.2, ph, width=2, dy=1)
    v += box(-11, 10, -3, 3, 2, 3, 'olD')
    v += [(x, y, z, olc(x, y, z)) for x in range(7, 12) for y in range(-4, 5) for z in range(4, 8) if not (x == 11 and z == 7)]
    v += box(11, 11, -3, 3, 6, 6, 'glassV') + box(10, 10, -3, 3, 7, 7, 'glassV2') + box(7, 9, -4, 4, 8, 8, 'ol2')
    v += box(12, 12, -3, 3, 3, 4, 'olD') + [(12, s * 3, 4, 'lightW') for s in (-1, 1)]
    v += [(x, s * 4, 6, 'glassV') for x in (8, 9) for s in (-1, 1)]
    v += [(x, y, z, olc(x, y, z)) for x in range(-11, 6) for y in range(-4, 5) for z in (4, 5)]
    # turret
    v += [(x, y, z, olc(x, y, z)) for x in range(-7, 2) for y in range(-3, 4) for z in range(6, 10)]
    v += box(2, 3, -1, 1, 7, 9, 'gun2') + [(3, 0, 8, 'ol3')]                        # tracking radar
    a = math.radians(radar)
    for r in range(-3, 4):
        for z in (10, 11, 12):
            v.append((round(-3 + math.cos(a) * r), round(math.sin(a) * r), z, 'ol3' if z < 12 else 'ol2'))
    v += [(-3, 0, 10, 'gun')]
    # launcher banks (elevated)
    for s in (-1, 1):
        bank = []
        for k in range(6):
            yy, zz = s * (4 + k % 2), 7 + k // 2
            have = (k + (0 if s > 0 else 6)) < tubes
            bank += [(x, yy, zz, 'ol2') for x in range(-7, 1)] + [(1, yy, zz, 'msl' if have else 'gun')]
        v += V.rotate(bank, pitch=elev, pivot=(-6, 0, 8))
    return v


def aa_andar(n=6):
    fr = []
    for t in range(n):
        v = aa_truck(ph=t * 15, radar=t * 30, elev=0) if False else aa_truck(ph=t * 15, radar=t * 30, elev=10)
        v = mv(v, 0, 0, 0)
        v = [(x, y, z + (1 if t in (2, 5) and z >= 2 else 0), c) for x, y, z, c in v]
        v += V.puffs(t, (-11, 4, 0), n, 3, (-1.4, 0.4, 0.45), 0.9, 0.45, seed=5, keep=0.7)
        v += V.puffs(t, (-11, -3, 0), n, 3, (-1.4, -0.3, 0.45), 0.9, 0.45, seed=6, keep=0.7)
        fr.append(R(v))
    return fr


def aa_lancar(n=8):
    fr = []
    el = math.radians(25)
    d = (math.cos(el), 0, math.sin(el))
    sx, sy, sz = -6 + 8 * math.cos(el), 4, 8 + 8 * math.sin(el)   # tube mouth
    dist = [0, 2, 6, 12, 20, 30, 42, 56]
    for t in range(n):
        rnd = random.Random(t)
        v = aa_truck(radar=t * 30, tubes=11 if t >= 1 else 12)
        if t == 0:
            v += V.ball(sx, sy, sz, 1.6, ['k1', 'e1', 'e2'])
            v += V.ball(-8, 4, 6, 1.8, ['e2', 's0', 's1'], rnd)                       # back-blast
        pts, ages = [], []
        for te in range(0, t + 1):
            for q in range(dist[te - 1] if te else 0, dist[te] + 1, 2):
                pts.append((sx + d[0] * q, sy, sz + d[2] * q)); ages.append(t - te + 1)
        v += V.trail(pts, ages, seed=t, fade=9)
        if t >= 1:
            m = dist[t]
            v += V.missile(sx + d[0] * m, sy, sz + d[2] * m, d, L=5, t=t)
        if 0 <= t <= 4:
            v += V.ball(-10 - t, 4 + t * 0.5, 4 + t * 0.5, 1.5 + t * 0.5, ['s0', 's1', 's2'], rnd, keep=0.75 - t * 0.08)
        fr.append(R(v))
    return fr


# ======================================================================== SISTEMA SAM (TEL)
SW = (-11, -7, 2, 6)


def sam(ang=0, ph=0, tubes=4, jacks=0, caps=True):
    v = []
    for wx in SW:
        v += wheel(wx, 4, 2, 2.3, ph, width=2, dy=-1) + wheel(wx, -4, 2, 2.3, ph, width=2, dy=1)
    v += box(-14, 10, -3, 3, 2, 3, 'olD')
    v += [(x, y, z, olc(x, y, z)) for x in range(8, 13) for y in range(-4, 5) for z in range(4, 9) if not (x == 12 and z == 8)]
    v += box(12, 12, -3, 3, 6, 7, 'glassV') + box(13, 13, -3, 3, 3, 5, 'olD') + [(13, s * 3, 4, 'lightW') for s in (-1, 1)]
    v += [(x, y, 4, olc(x, y, 4)) for x in range(-15, 8) for y in range(-4, 5)]
    v += box(4, 7, -4, 4, 5, 7, 'ol2')                                                   # generator box
    for s in (-1, 1):                                                                    # stabiliser jacks
        v += [(-14, 5 * s, z, 'steel2') for z in range(4 - jacks, 5)] + [(-14, 5 * s, 4 - jacks, 'gun')]
    # canister pack hinged at rear (-14, 0, 5)
    pack = []
    for k in range(4):
        yy = -2 + (k % 2) * 3
        zz = 6 + (k // 2) * 3
        for x in range(-15, 6):
            for dy in (0, 1):
                for dz in (0, 1):
                    c = olc(x, yy + dy, zz + dz)
                    if x in (-12, -4, 3):
                        c = 'olD'
                    pack.append((x, yy + dy, zz + dz, c))
        if caps:
            pack += [(6, yy + dy, zz + dz, 'ol3' if k < tubes else 'gun') for dy in (0, 1) for dz in (0, 1)]
    pack += box(-15, 5, -2, 2, 5, 5, 'ol2')
    v += V.rotate(pack, pitch=ang, pivot=(-14, 0, 5))
    return v


def sam_erguer(n=8):
    angs = [0, 4, 12, 24, 38, 54, 68, 80]
    fr = []
    for t in range(n):
        v = sam(ang=angs[t], jacks=min(3, t))
        if t <= 2:
            v += V.puffs(t, (-14, 5, 0), 3, 2, (0, 0.5, 0.3), 0.6, 0.4, seed=t, keep=0.6)
        fr.append(R(v))
    return fr


def sam_lancar(n=10):
    fr = []
    a = math.radians(80)
    top = (-14 + 21 * math.cos(a), 1, 5 + 21 * math.sin(a))    # mouth of upper +y canister
    hgt = [0, 3, 7, 10, 15, 22, 31, 42, 55, 70]
    for t in range(n):
        rnd = random.Random(t)
        v = sam(ang=80, jacks=3, tubes=4 if t == 0 else 3)
        mx, my, mz = top[0] + 1, top[1], top[2]
        if t == 0:
            v += V.ball(mx, my, mz + 1, 1.8, ['w1', 'w2', 's0'], rnd)                    # cap blown off
        # missile: cold launch then ignition, tilting toward +x
        if t >= 1:
            z = mz + hgt[t]
            x = mx + (0 if t < 4 else (t - 3) ** 2 * 0.8)
            dirv = (0.25 if t >= 4 else 0, 0, 1)
            nrm = math.sqrt(dirv[0] ** 2 + 1)
            dirv = (dirv[0] / nrm, 0, 1 / nrm)
            v += V.missile(x, my, z, dirv, L=6, t=t, flame=t >= 3)
            if t == 3:
                v += V.ball(x, my, z - 1, 2.4, ['k1', 'e1', 'e2', 'e3'], rnd, jit=0.4)
        if t >= 3:
            pts, ages = [], []
            for te in range(3, t + 1):
                zz = mz + hgt[te]
                xx = mx + (0 if te < 4 else (te - 3) ** 2 * 0.8)
                zp = mz + hgt[te - 1]
                xp = mx + (0 if te - 1 < 4 else (te - 4) ** 2 * 0.8)
                for q in range(0, 6):
                    f = q / 6
                    pts.append((xp + (xx - xp) * f, my, zp + (zz - zp) * f)); ages.append(t - te + 1)
            v += V.trail(pts, ages, seed=t, fade=10)
        if t >= 1:                                                                        # ground gas cloud
            r = min(2 + t * 0.9, 7)
            v += V.ball(-4, 2, 2, r, ['w2', 'w3', 's0'], rnd, squash=0.45, keep=0.7 - t * 0.04)
        fr.append(R(v))
    return fr


if __name__ == '__main__':
    aa = aa_truck()
    aa_tur = [p for p in aa if p[2] >= 6 and p[0] <= 4]
    aa_d = destroyed([p for p in aa if p not in aa_tur], (-2, 0, 6), 1.1, 71, [(-3, 0, 6, 1.8), (9, 0, 9, 1.2), (-9, 2, 6, 1.0)],
                     chunk=(aa_tur, (-0.8, 1.2, 4.6), (18, 6)))
    sm = sam(ang=80, jacks=3)
    sam_d = destroyed(sam(ang=0, jacks=3), (-4, 0, 7), 1.3, 72, [(-4, 0, 9, 2.0), (10, 0, 9, 1.2), (-12, -2, 9, 1.2)])
    ROWS = [('BOMBARDEIRO TÁTICO · voar', bomber_voar()), ('BOMBARDEIRO TÁTICO · lançar bombas', bomber_bombas()),
            ('BOMBARDEIRO TÁTICO · abatido', shot_down(lambda t: bomber(t, ab=t == 0), ALT, 64, (-3, 8, 2), span=17)),
            ('BATERIA ANTIAÉREA MÓVEL · andar', aa_andar()), ('BATERIA ANTIAÉREA MÓVEL · lançar míssil', aa_lancar()),
            ('BATERIA ANTIAÉREA MÓVEL · destruída', aa_d),
            ('SISTEMA SAM · erguer lançador', sam_erguer()), ('SISTEMA SAM · lançar', sam_lancar()),
            ('SISTEMA SAM · destruído', sam_d)]
    ONE = {n for n, _ in ROWS if any(k in n for k in ('abatido', 'destru', 'erguer', 'bombas', 'SAM · lançar'))}
    V.export(ROWS, ONE, 'aircraft-bomber-aa')
