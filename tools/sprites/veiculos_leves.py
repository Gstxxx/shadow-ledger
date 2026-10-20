"""Light ground vehicles: picape armada (technical), viatura interceptadora (police), blindado 6x6."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
import vehlib as V
from vehlib import box, wheel, mv, R

V.canvas(168, 128, 84, 84)


def h(x, y, z, s=0):
    return ((x * 92821) ^ (y * 68917) ^ (z * 31337) ^ s) % 13


def arches(v, wxs, cz, r2, ymin):
    return [p for p in v if not (abs(p[1]) >= ymin and any((p[0] - wx) ** 2 + (p[2] - cz) ** 2 <= r2 for wx in wxs))]


# ======================================================================== PICAPE ARMADA (technical)
def tanc(x, y, z):
    k = h(x, y, z, 5)
    return 'tanD' if k == 0 else ('tan2' if k < 3 else 'tan')


def picape(ph=0, bob=0, recoil=0, flash_on=False, rnd=None):
    v = []
    for wx in (-6, 6):
        v += wheel(wx, 3, 2, 2.4, ph, width=2, dy=-1) + wheel(wx, -3, 2, 2.4, ph, width=2, dy=1)
    b = box(-8, 8, -2, 2, 2, 2, 'olD')
    low = [(x, y, z, tanc(x, y, z)) for x in range(-9, 10) for y in range(-3, 4) for z in (3, 4)]
    b += arches(low, (-6, 6), 2, 7.5, 2)
    b += [(x, y, 5, tanc(x, y, 5)) for x in range(4, 10) for y in range(-3, 4)]                    # hood
    b += box(9, 9, -1, 1, 3, 4, 'gun2') + [(9, s * k, 4, 'lightW') for s in (-1, 1) for k in (2, 3)]
    b += box(10, 10, -3, 3, 3, 3, 'steel2')                                                           # bumper
    b += [(x, y, z, tanc(x, y, z)) for x in range(-2, 3) for y in range(-3, 4) for z in range(5, 9)]  # cab
    b += box(-2, 2, -3, 3, 9, 9, 'tan3')
    b += box(3, 3, -3, 3, 5, 5, 'tan') + box(3, 3, -2, 2, 6, 8, 'glassV') + [(3, s * 3, z, 'tan2') for s in (-1, 1) for z in (6, 7, 8)]
    for s in (-1, 1):
        b += [(x, 3 * s, z, 'glassV2' if x == 2 else 'glassV') for x in (-1, 1, 2) for z in (7, 8)]
        b += [(0, 3 * s, z, 'tan2') for z in (4, 5, 6)]
    b += [(4, 4, 7, 'gun'), (4, -4, 7, 'gun')]                                                         # mirrors
    b += [(x, s * 3, z, tanc(x, s, z)) for x in range(-9, -2) for s in (-1, 1) for z in (5, 6)]       # bed walls
    b += [(-9, y, z, 'tan2') for y in range(-2, 3) for z in (5, 6)] + [(-9, 3, 5, 'tail'), (-9, -3, 5, 'tail')]
    b += box(-8, -7, -2, -1, 5, 5, 'tire')                                                            # spare tyre
    b += [(-9, -3, z, 'gun') for z in range(7, 15)]                                                   # whip antenna
    # mounted MG (DShK style) on a pedestal
    b += box(-6, -6, 0, 0, 5, 9, 'steel2') + box(-7, -5, -1, 1, 5, 5, 'steel2')
    r = -recoil
    b += box(-8 + r, -5 + r, 0, 0, 10, 11, 'gun') + [(-9 + r, 0, 10, 'gun2'), (-9 + r, -1, 11, 'gun2'), (-9 + r, 1, 11, 'gun2')]
    b += box(-4 + r, 2 + r, 0, 0, 11, 11, 'gun2') + [(3 + r, 0, 11, 'gun'), (-3 + r, 0, 10, 'steel2')]
    b += box(-7, -6, 1, 2, 10, 10, 'ol2')                                                             # ammo can
    b += box(-5, -5, -2, 2, 9, 12, 'steel2')                                                          # gun shield
    v += mv(b, 0, 0, bob)
    if flash_on:
        v += V.flash(4 + r, 0, 11 + bob, 1.2, rnd=rnd)
    return v


def picape_andar():
    fr = []
    for t in range(6):
        v = picape(ph=t * 15, bob=1 if t in (1, 2, 4) else 0)
        v += V.puffs(t, (-9, 3, 0), 6, 3, (-1.4, 0.4, 0.5), 0.8, 0.4, seed=1)
        v += V.puffs(t, (-9, -2, 0), 6, 3, (-1.4, -0.2, 0.5), 0.8, 0.4, seed=2)
        v += V.puffs(t, (-10, -2, 3), 6, 2, (-1.0, 0.0, 0.7), 0.5, 0.3, ('s1', 's2', 's3'), seed=3)
        fr.append(R(v))
    return fr


def picape_atirar():
    fr = []
    for t in range(4):
        rnd = random.Random(t)
        on = t in (0, 2)
        v = picape(recoil=1 if on else 0, flash_on=on, rnd=rnd, bob=0)
        v += [(-6 - a // 2, 1 + a, 11 + a - (a * a) // 3, 'brass') for a in ((t % 2) + 1, (t % 2) + 3) if 11 + a - (a * a) // 3 >= 0]
        if not on:
            v += V.ball(5, 0, 12, 1.0, ['s0', 's1'], rnd)
        fr.append(R(v))
    return fr


# ======================================================================== VIATURA (police interceptor)
def pol(x, y, z):
    if -4 <= x <= 3:
        return 'pw'
    return 'pk'


def viatura(ph=0, bob=0, lights='R'):
    v = []
    for wx in (-6, 6):
        v += wheel(wx, 3, 2, 2.2, ph, width=2, dy=-1, hub='steel') + wheel(wx, -3, 2, 2.2, ph, width=2, dy=1, hub='steel')
    b = box(-8, 8, -2, 2, 1, 1, 'pk2')
    low = [(x, y, z, pol(x, y, z)) for x in range(-9, 10) for y in range(-3, 4) for z in (2, 3, 4)]
    low = arches(low, (-6, 6), 2, 6.8, 2)
    b += low
    b += [(x, 3, 3, 'pb') for x in range(-8, 9) if not any((x - wx) ** 2 + 1 <= 6.8 for wx in (-6, 6))]   # stripe
    b += [(x, -3, 3, 'pb') for x in range(-8, 9) if not any((x - wx) ** 2 + 1 <= 6.8 for wx in (-6, 6))]
    b += box(9, 9, -1, 1, 2, 3, 'pk2') + [(9, s * 3, 3, 'lightW') for s in (-1, 1)] + [(9, s * 2, 3, 'lightW') for s in (-1, 1)]
    b += box(10, 10, -2, 2, 2, 3, 'pk') + box(10, 10, -1, 1, 4, 4, 'pk')                                 # push bar
    b += [(-9, s * 3, 4, 'tail') for s in (-1, 1)]
    # cabin
    b += box(-4, 2, -3, 3, 5, 6, 'pw') + box(-3, 1, -3, 3, 7, 7, 'pw')
    b += box(3, 3, -2, 2, 5, 5, 'glassV') + box(2, 2, -2, 2, 6, 6, 'glassV2')
    b += box(-5, -5, -2, 2, 5, 5, 'glassV') + box(-4, -4, -2, 2, 6, 6, 'glassV')
    for s in (-1, 1):
        b += [(x, 3 * s, z, 'glassV2' if x == 1 else 'glassV') for x in (-3, -2, 0, 1) for z in (5, 6)]
        b += [(-1, 3 * s, z, 'pk') for z in (5, 6)]
    b += [(3, 4, 5, 'pk'), (3, -4, 5, 'pk')]
    b += [(-8, -2, z, 'gun') for z in range(5, 11)]                                                       # antenna
    # light bar
    rl = 'sirR' if 'R' in lights else 'sirRo'
    bl = 'sirB' if 'B' in lights else 'sirBo'
    b += box(-1, 0, -3, 3, 8, 8, 'pk2')
    b += [(x, y, 8, rl) for x in (-1, 0) for y in (1, 2, 3)] + [(x, y, 8, bl) for x in (-1, 0) for y in (-3, -2, -1)]
    v += mv(b, 0, 0, bob)
    return v


def viatura_andar():
    fr = []
    for t in range(6):
        v = viatura(ph=t * 15, bob=1 if t in (2, 5) else 0, lights='R' if t % 2 == 0 else 'B')
        v += V.puffs(t, (-9, 3, 0), 6, 3, (-1.6, 0.4, 0.4), 0.7, 0.35, seed=4)
        fr.append(R(v))
    return fr


def viatura_parada():
    pat = ['R', 'R', '', 'B', 'B', 'RB']
    return [R(viatura(lights=p)) for p in pat]


# ======================================================================== BLINDADO 6x6
def olc(x, y, z):
    k = h(x, y, z, 9)
    return 'ol2' if k < 2 else ('ol3' if k == 2 else 'ol')


W6 = (-7, -1, 5)


def blindado(ph=0, bob=0, recoil=0, flash_on=False, rnd=None, turret=True):
    v = []
    for wx in W6:
        v += wheel(wx, 4, 2, 2.5, ph, width=2, dy=-1, hub='ol2') + wheel(wx, -4, 2, 2.5, ph, width=2, dy=1, hub='ol2')
    b = box(-10, 9, -2, 2, 2, 3, 'olD')
    top = {x: 8 for x in range(-11, 9)}
    top.update({9: 7, 10: 6, 11: 4})
    up = []
    for x in range(-11, 12):
        for y in range(-4, 5):
            for z in range(4, top[x] + 1):
                if x == 11 and z < 3:
                    continue
                if z == top[x] and abs(y) == 4 and x < 9:
                    continue  # bevelled roof edge
                up.append((x, y, z, olc(x, y, z)))
    up += box(11, 11, -3, 3, 3, 3, 'ol2')
    up = arches(up, W6, 2, 9.5, 3)
    b += up
    b += [(11, s * 3, 4, 'lightW') for s in (-1, 1)] + [(10, s * 3, 6, 'ol2') for s in (-1, 1)]
    b += box(-11, -11, -1, 1, 4, 7, 'ol2') + [(-11, 0, 6, 'gun2')]                       # rear door
    b += box(-9, -6, 5, 5, 6, 7, 'ol2') + box(-4, -2, 5, 5, 6, 7, 'ol2')                    # stowage
    b += box(6, 8, 4, 4, 7, 7, 'olD') + box(6, 8, -4, -4, 7, 7, 'olD')                      # grilles
    b += [(7, -1, 9, 'glassV'), (7, 1, 9, 'glassV'), (8, 0, 8, 'glassV')]                   # periscopes
    b += box(-9, -8, -1, 1, 9, 9, 'ol2')                                                    # hatch
    b += [(-10, -3, z, 'gun') for z in range(9, 18)] + [(-10, 3, z, 'gun') for z in range(9, 15)]
    if turret:
        r = -recoil
        b += box(-4, 1, -2, 2, 9, 9, 'ol2')
        b += [(x, y, z, olc(x, y, z)) for x in range(-4, 2) for y in range(-3, 4) for z in (10, 11)]
        b += box(2, 2, -2, 2, 10, 10, 'ol') + box(-3, -1, -2, -1, 12, 12, 'gun2') + [(-2, -2, 13, 'glassV')]
        b += box(2 + r, 2 + r, -1, 1, 11, 11, 'gun2')
        b += box(3 + r, 10 + r, 0, 0, 11, 11, 'gun') + box(11 + r, 12 + r, 0, 0, 11, 11, 'gun2') + [(12 + r, 0, 12, 'gun2')]
        b += [(2, s * 3, 11, 'steel2') for s in (-1, 1)] + [(1, s * 3, 12, 'steel2') for s in (-1, 1)]
        b += box(-1, 1, 3, 3, 12, 12, 'olD')                                              # ATGM box
        if flash_on:
            b += V.flash(13 + r, 0, 11, 1.4, rnd=rnd)
    v += mv(b, 0, 0, bob)
    return v


def blindado_andar():
    fr = []
    for t in range(6):
        v = blindado(ph=t * 15, bob=1 if t in (1, 4) else 0)
        v += V.puffs(t, (-11, 4, 0), 6, 3, (-1.4, 0.5, 0.5), 0.9, 0.45, seed=5)
        v += V.puffs(t, (-11, -3, 0), 6, 3, (-1.4, -0.3, 0.5), 0.9, 0.45, seed=6)
        v += V.puffs(t, (-6, 4, 9), 6, 2, (-0.9, 0.2, 0.8), 0.5, 0.3, ('s2', 's3'), seed=7)
        fr.append(R(v))
    return fr


def blindado_atirar():
    fr = []
    for t in range(6):
        rnd = random.Random(30 + t)
        on = t % 2 == 0
        v = blindado(recoil=1 if on else 0, flash_on=on, rnd=rnd)
        k = t % 2
        v += [(-1, 4 + k, 11 - k, 'brass'), (-2, 6 + k, 9 - 2 * k, 'brass')]
        v += V.ball(14 + t, 0, 12 + t // 2, 0.9 + t * 0.25, ['s0', 's1', 's2'], rnd, keep=0.7)
        fr.append(R(v))
    return fr


# ======================================================================== destruction (shared)
def destroyed(model, hit, s, seed, flames_at, chunk=None, n=10):
    """model: voxels of intact vehicle. hit: (x,y,z) explosion centre. chunk: (voxels, vel) thrown part."""
    wreck = [p for p in V.wreckify(model, seed)]
    wreck = [(x, y, z - (1 if z <= 4 else 1), c) for x, y, z, c in wreck]
    wreck = [p for p in wreck if p[2] >= 0]
    fr = []
    cx, cy, cz = hit
    for t in range(n):
        rnd = random.Random(seed * 7 + t)
        if t == 0:
            v = model + V.ball(cx, cy, cz, 2.0 * s, ['e1', 'e1', 'e2']) + (chunk[0] if chunk else [])
        else:
            v = list(wreck)
            v += V.scorch(cx, cy, 4 + min(t, 3))
            if t <= 7:
                v += V.explosion(t, cx, cy, cz, s, seed)
            if t >= 3:
                v += V.flames(t, flames_at, seed)
            if t >= 5:
                v += V.plume(t - 5, flames_at[0][0], flames_at[0][1], flames_at[0][2] + 4, n=4, cycle=5, rise=2.6,
                             grow=0.7, r0=1.6, seed=seed, dark=True)
        if chunk and t >= 1:  # thrown part
            cv, (vx, vy, vz), spin = chunk
            tt = min(t, 8)
            dz = vz * tt - 0.55 * tt * tt
            part = V.wreckify(cv, seed + 1)
            if spin:
                sr, sp = spin if isinstance(spin, tuple) else (spin, spin * 0.6)
                part = V.rotate(part, roll=sr * tt, pitch=sp * tt, pivot=(sum(p[0] for p in cv) // len(cv), sum(p[1] for p in cv) // len(cv), sum(p[2] for p in cv) // len(cv)))
            part = mv(part, round(vx * tt), round(vy * tt), round(dz))
            mn = min(p[2] for p in part)
            if mn < 0:
                part = mv(part, 0, 0, -mn)
            v += part
        fr.append(R(v))
    return fr


def last_chunk(chunk, t=8):
    return chunk


if __name__ == '__main__':
    pic = picape()
    gun = [p for p in pic if p[2] >= 10 and -9 <= p[0] <= 3 and abs(p[1]) <= 2 and p[3] in ('gun', 'gun2', 'steel2', 'ol2')]
    rest = [p for p in pic if p not in gun]
    pic_d = destroyed(rest, (0, 0, 5), 1.0, 11, [(-5, 0, 4, 1.6), (1, 1, 8, 1.2), (6, 0, 5, 1.0)], chunk=(gun, (-1.2, 0.8, 4.2), 25))
    via_d = destroyed(viatura(lights=''), (1, 0, 4), 1.0, 12, [(0, 0, 6, 1.6), (6, 0, 4, 1.0), (-6, 1, 4, 1.0)])
    bl = blindado()
    tur = [p for p in bl if p[2] >= 9 and -4 <= p[0] <= 13 and abs(p[1]) <= 3]
    bl_d = destroyed([p for p in bl if p not in tur] + box(-4, 1, -2, 2, 9, 9, 'ol2'), (0, 0, 7), 1.2, 13,
                     [(-1, 0, 9, 1.8), (-7, 1, 8, 1.2), (6, -1, 8, 1.0)], chunk=(tur, (-0.6, 1.0, 5.0), 30))
    ROWS = [('PICAPE ARMADA · andar', picape_andar()), ('PICAPE ARMADA · atirar', picape_atirar()),
            ('PICAPE ARMADA · destruída', pic_d),
            ('VIATURA · andar + sirene', viatura_andar()), ('VIATURA · parada (sirene)', viatura_parada()),
            ('VIATURA · destruída', via_d),
            ('BLINDADO 6x6 · andar', blindado_andar()), ('BLINDADO 6x6 · atirar 30mm', blindado_atirar()),
            ('BLINDADO 6x6 · destruído', bl_d)]
    V.export(ROWS, {n for n, _ in ROWS if 'destru' in n}, 'vehicles-light')
