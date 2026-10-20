"""Tanks: carro de combate clássico (T-72-like) and tanque de 4ª geração (Abrams-like)."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
import vehlib as V
from vehlib import box, mv, R
from veiculos_leves import destroyed

V.canvas(200, 150, 92, 96)


def h(x, y, z, s=0):
    return ((x * 92821) ^ (y * 68917) ^ (z * 31337) ^ s) % 13


# ======================================================================== T-72
def tkc(x, y, z):
    k = h(x, y, z, 3)
    return 'tk2' if k < 2 else ('tk3' if k == 2 else 'tk')


T72_RW = (-9, -6, -3, 0, 3, 6, 9)


def t72_hull(ph=0):
    v = V.track(-12, 12, 4, 6, 0, 4, ph, T72_RW, rw_r=1.7) + V.track(-12, 12, -6, -4, 0, 4, ph, T72_RW, rw_r=1.7)
    v += [(x, y, z, tkc(x, y, z)) for x in range(-12, 11) for y in range(-3, 4) for z in range(1, 5)]
    v += [(x, y, 5, 'tk2' if h(x, y, 5) < 9 else 'tk') for x in range(-12, 11) for y in range(-6, 7)]                  # deck + fenders
    for x, zt in ((11, 4), (12, 3), (13, 2)):                                                      # glacis
        v += [(x, y, z, ('era' if (x + y) % 2 else 'tk3') if z == zt else 'tk') for y in range(-4, 5) for z in range(1, zt + 1)]
    v += [(11, s * y, 5, 'tk2') for s in (-1, 1) for y in (4, 5, 6)]                               # mudguards
    v += [(12, s * 2, 3, 'lightW') for s in (-1, 1)]
    for s in (-1, 1):                                                                              # fender boxes
        v += box(-9, -1, 5, 6, 6, 6, 'tk3') if s == 1 else box(-9, -1, -6, -5, 6, 6, 'tk3')
        v += [(x, 6 * s, 6, 'tk2') for x in (-6, -3)]
    v += box(-15, -13, -5, -2, 5, 6, 'tk2') + box(-15, -13, 2, 5, 5, 6, 'tk2')                    # rear drums
    v += [(-13, y, z, 'olD') for y in (-5, -2, 2, 5) for z in (5, 6)]
    v += box(-14, -13, -1, 1, 6, 6, 'trk2')                                                        # unditching log
    v += box(-8, -6, 6, 6, 5, 5, 'gun')                                                            # exhaust grille
    return v


def t72_turret(recoil=0):
    v = []
    for z, rr in ((6, 5.3), (7, 5.2), (8, 4.8), (9, 4.1), (10, 3.0), (11, 1.4)):
        for x in range(-8, 6):
            for y in range(-6, 7):
                if ((x + 1) / 1.1) ** 2 + y * y <= rr * rr:
                    c = tkc(x, y, z)
                    if x >= 2 and z in (7, 8) and abs(y) >= 2:
                        c = 'era' if (x + z + y) % 2 else 'tk3'
                    v.append((x, y, z, c))
    v += box(-3, -1, 1, 3, 11, 12, 'tk2') + [(-2, 2, 13, 'tk3')]                                    # cupola
    v += box(-1, 3, 2, 2, 13, 13, 'gun') + [(4, 2, 13, 'gun2'), (-2, 3, 13, 'gun2')]               # NSV
    v += box(1, 1, -3, -2, 11, 12, 'gun2') + [(2, -3, 11, 'glassV2')]                             # sight
    v += box(-6, -2, 4, 4, 8, 8, 'tk2')                                                           # snorkel
    v += [(1, s * 5, 9, 'steel2') for s in (-1, 1)] + [(0, s * 5, 9, 'steel2') for s in (-1, 1)]
    r = -recoil
    v += box(4, 5, -1, 1, 7, 8, 'tk2')
    v += box(6 + r, 23 + r, 0, 0, 8, 8, 'tk3')
    v += box(11 + r, 12 + r, 0, 0, 7, 9, 'tk2') + [(11 + r, -1, 8, 'tk2'), (11 + r, 1, 8, 'tk2'), (12 + r, 1, 8, 'tk2')]
    v += [(x + r, 0, 8, 'tk2') for x in (8, 16, 19)] + [(24 + r, 0, 8, 'gun2')]
    return v


def t72(ph=0, bob=0, recoil=0):
    return t72_hull(ph) + mv(t72_turret(recoil), 0, 0, bob)


# ======================================================================== ABRAMS
def abc(x, y, z):
    k = h(x, y, z, 7)
    return 'ab2' if k < 2 else ('ab3' if k == 2 else 'ab')


AB_RW = (-10, -7, -4, -1, 2, 5, 8)


def abrams_hull(ph=0):
    v = V.track(-13, 12, 4, 6, 0, 4, ph, AB_RW, rw_r=1.6, rw='abD') + V.track(-13, 12, -6, -4, 0, 4, ph, AB_RW, rw_r=1.6, rw='abD')
    v += [(x, y, z, abc(x, y, z)) for x in range(-13, 11) for y in range(-3, 4) for z in range(1, 5)]
    v += [(x, y, 5, abc(x, y, 5)) for x in range(-13, 11) for y in range(-7, 8)]
    for x, zt in ((11, 5), (12, 4), (13, 3), (14, 2)):
        v += [(x, y, z, 'ab3' if z == zt else 'ab') for y in range(-5, 6) for z in range(1, zt + 1)]
    for s in (-1, 1):                                                                            # side skirts
        for x in range(-12, 12):
            for z in range(2, 5):
                c = 'abD' if x % 4 == 0 else ('ab2' if z == 2 else 'ab')
                if x >= 6:
                    c = 'ab3' if z == 4 else 'ab'
                v.append((x, 7 * s, z, c))
    v += [(12, s * y, 5, 'ab2') for s in (-1, 1) for y in (5, 6, 7)]
    v += [(13, s * 4, 3, 'lightW') for s in (-1, 1)]
    v += box(-13, -13, -2, 2, 2, 4, 'abD')                                                       # turbine grille
    v += box(9, 10, -1, 1, 6, 6, 'ab2') + [(10, 0, 6, 'glassV')]                                  # driver hatch
    return v


def abrams_turret(recoil=0):
    v = []
    w = {2: 6, 3: 6, 4: 5, 5: 4, 6: 3}
    for x in range(-9, 7):
        hw = w.get(x, 6)
        for y in range(-hw, hw + 1):
            ztop = 9 if x <= 4 else 8
            for z in range(6, ztop + 1):
                c = abc(x, y, z)
                if z == ztop and x <= 4:
                    c = 'ab3' if (x + y) % 5 else 'ab'
                v.append((x, y, z, c))
    v += [(x, y, 9, 'abD') for x in (-8, -5) for y in range(-4, 0)]                              # blowout panel seams
    # bustle rack
    v += [(x, y, z, 'abD') for x in (-11, -10) for y in range(-6, 7) for z in (7, 9) if x == -11 or abs(y) == 6]
    v += [(-11, y, 8, 'abD') for y in range(-6, 7, 3)]
    v += box(-11, -10, -5, -1, 8, 8, 'ol2') + box(-11, -10, 1, 4, 8, 8, 'ol')
    v += box(-4, -2, 2, 4, 10, 10, 'ab2') + box(-1, 3, 3, 3, 11, 11, 'gun') + [(4, 3, 11, 'gun2'), (-3, 3, 11, 'ab2')]  # cmdr + M2
    v += box(-3, -3, -4, -2, 10, 10, 'ab2') + box(-2, 0, -3, -3, 11, 11, 'gun')                   # loader + M240
    v += box(0, 1, -1, 0, 10, 11, 'gun2') + [(1, 0, 11, 'glassV')]                                # CITV
    v += box(3, 4, -5, -4, 10, 10, 'ab2') + [(4, -4, 10, 'glassV')]                              # GPS sight
    v += [(4, s * 5, z, 'steel2') for s in (-1, 1) for z in (8, 9)]                              # smoke dischargers
    r = -recoil
    v += box(6, 7, -1, 1, 7, 8, 'ab2')
    v += box(8 + r, 22 + r, 0, 0, 8, 8, 'ab2') + [(x + r, 0, 8, 'abD') for x in (11, 16)]
    v += [(21 + r, 0, 9, 'gun2'), (23 + r, 0, 8, 'abD')]
    return v


def abrams(ph=0, bob=0, recoil=0):
    return abrams_hull(ph) + mv(abrams_turret(recoil), 0, 0, bob)


# ======================================================================== animations
def andar(model, rear, exhaust, n=8):
    fr = []
    for t in range(n):
        ph = t
        v = model(ph=ph, bob=1 if t in (3, 4) else 0)
        v += V.puffs(t, (rear, 6, 0), n, 4, (-1.2, 0.5, 0.45), 1.0, 0.45, seed=1, keep=0.7)
        v += V.puffs(t, (rear, -5, 0), n, 4, (-1.2, -0.3, 0.45), 1.0, 0.45, seed=2, keep=0.7)
        v += V.puffs(t, exhaust[0], n, 3, exhaust[1], 0.5, 0.25, ('s0', 's1', 's2'), seed=3, keep=0.6)
        fr.append(R(v))
    return fr


def atirar(model, muzzle, n=8):
    rec = [2, 3, 2, 1, 1, 0, 0, 0]
    fr = []
    mx, my, mz = muzzle
    for t in range(n):
        rnd = random.Random(50 + t)
        v = model(recoil=rec[t])
        v = mv(v, -1 if t in (0, 1) else 0)
        if t == 0:
            v += V.flash(mx - 2, my, mz, 2.4, rnd=rnd)
            v += V.ball(mx + 3, my, mz, 2.2, ['k1', 'e1', 'e2', 'e3'], rnd, jit=0.4)
        if t == 1:
            v += V.ball(mx + 3, my, mz, 2.6, ['e2', 'e3', 's0', 's1'], rnd, jit=0.5)
        if t >= 1:
            a = t
            v += V.ball(mx + 2 + a * 1.2, my + a * 0.4, mz + a * 0.5, 1.6 + a * 0.55,
                        ['s0', 's0', 's1', 's2'] if a < 5 else ['s1', 's2'], rnd, keep=0.85 - a * 0.06)
            v += V.ball(mx - 2 + a * 0.8, my - a * 0.6, mz - 1 + a * 0.3, 1.0 + a * 0.45, ['s0', 's1'], rnd, keep=0.7 - a * 0.05)
        if 0 <= t <= 4:                                                    # blast dust on the ground under the muzzle
            for k in range(5):
                ang = k * 72 + t * 9
                d = 3 + t * 1.6
                v += V.ball(mx - 3 + math.cos(math.radians(ang)) * d, my + math.sin(math.radians(ang)) * d, 0,
                            0.8 + t * 0.35, ['d1', 'd2', 'd3'], rnd, keep=0.65)
        fr.append(R(v))
    return fr


def abrams_destroyed(seed=21, n=10):
    model = abrams()
    wreck = [p for p in V.wreckify(model, seed)]
    wreck = [(x, y, z - 1, c) for x, y, z, c in wreck if z - 1 >= 0]
    fr = []
    for t in range(n):
        rnd = random.Random(seed + t)
        if t == 0:
            v = model + V.ball(4, 6, 7, 2.2, ['e1', 'e1', 'e2'])                       # ATGM hit on the flank
        else:
            v = list(wreck) + V.scorch(-1, 0, 5 + min(t, 3))
            if t <= 6:
                v += V.explosion(t, 2, 4, 6, 0.85, seed, debris=t < 4)
            if 1 <= t <= 7:                                                            # blowout panel jets
                hgt = [0, 10, 16, 19, 18, 14, 10, 6][t]
                for (jx, jy) in ((-7, -3), (-5, -2)):
                    for z in range(9, 9 + hgt):
                        f = (z - 9) / max(1, hgt)
                        c = 'k1' if f < 0.3 else ('e1' if f < 0.55 else ('e2' if f < 0.8 else 'e3'))
                        w = 1 if f > 0.4 else 0
                        for dx in range(-w, w + 1):
                            if rnd.random() < 0.85:
                                v.append((jx + dx + (1 if f > 0.7 and rnd.random() < .5 else 0), jy, z, c))
                    if hgt:
                        v += V.ball(jx, jy, 9 + hgt, 1.5 + t * 0.3, ['e3', 's1', 's2'], rnd)
            if t >= 3:
                v += V.flames(t, [(-6, -2, 9, 1.6), (2, 3, 6, 1.2), (-10, 5, 6, 1.0)], seed)
            if t >= 6:
                v += V.plume(t - 6, -6, -2, 13, n=4, cycle=4, rise=2.8, grow=0.75, r0=1.8, seed=seed, dark=True)
        fr.append(R(v))
    return fr


if __name__ == '__main__':
    tur = t72_turret()
    T72_D = destroyed(t72_hull() + V.ball(-1, 0, 6, 2.5, ['char']), (-1, 0, 7), 1.35, 31,
                      [(-1, 0, 6, 2.2), (-12, 3, 6, 1.2), (6, -2, 6, 1.0)], chunk=(tur, (-1.4, 1.1, 5.4), (22, 0)))
    ROWS = [('CARRO DE COMBATE CLÁSSICO · andar', andar(t72, -13, ((-7, 7, 6), (-0.9, 0.9, 0.5)))),
            ('CARRO DE COMBATE CLÁSSICO · atirar 125mm', atirar(t72, (24, 0, 8))),
            ('CARRO DE COMBATE CLÁSSICO · destruído', T72_D),
            ('TANQUE 4ª GERAÇÃO · andar', andar(abrams, -14, ((-14, 0, 4), (-1.3, 0.0, 0.5)))),
            ('TANQUE 4ª GERAÇÃO · atirar 120mm', atirar(abrams, (23, 0, 8))),
            ('TANQUE 4ª GERAÇÃO · destruído', abrams_destroyed())]
    V.export(ROWS, {n for n, _ in ROWS if 'destru' in n}, 'vehicles-armor')
