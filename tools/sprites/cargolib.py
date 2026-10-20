"""Player cargo planes (livery: white top, grey belly, gold/red tail stripe) + taxi/takeoff, cruise, landing rows."""
import math, random
import vehlib as V
from vehlib import box, mv, R
from planes import fuselage, wing, fin, vortex


def livery(belly_z, s=0):
    def f(x, y, z):
        k = ((x * 92821) ^ (y * 68917) ^ (z * 31337) ^ s) % 17
        base = 'cw' if z > belly_z else 'cg'
        if k == 0:
            return 'cg' if base == 'cw' else 'cg2'
        return base
    return f


def tailc(z0):
    def f(x, y, z):
        if z in (z0 + 3, z0 + 4):
            return 'stripe'
        if z == z0 + 5:
            return 'stripe2'
        return 'cw'
    return f


def wingc(x, y, z):
    k = ((x * 92821) ^ (y * 68917)) % 11
    return 'cg' if k else 'cg2'


def prop(x, yc, zc, r, ang):
    v = []
    for k in range(4):
        a = math.radians(ang + k * 90)
        for q in (1, 2, 3):
            if q <= r:
                v.append((x, round(yc + math.cos(a) * q), round(zc + math.sin(a) * q), 'rotor'))
        b = math.radians(ang + k * 90 - 35)
        v.append((x, round(yc + math.cos(b) * r), round(zc + math.sin(b) * r), 'blur1'))
    v.append((x + 1, yc, zc, 'gun2'))
    return v


def nacelle(x0, x1, y, zc, hw=1, col='cg'):
    v = [(x, y + dy, zc + dz, col) for x in range(x0, x1 + 1) for dy in range(-hw, hw + 1) for dz in range(-hw, hw + 1)
         if not (hw >= 2 and abs(dy) == hw and abs(dz) == hw)]
    v += [(x1 + 1, y + dy, zc + dz, 'gun') for dy in range(-hw + 1, hw) for dz in range(-hw + 1, hw)] if hw >= 2 else [(x1 + 1, y, zc, 'gun')]
    v += [(x0 - 1, y, zc, 'steel2')]
    return v


def wheels(pts, gear):
    """pts: list of (x, y, strut_top_z). gear: 1 down, 0.5 half, 0 up."""
    v = []
    if gear <= 0:
        return v
    for x, y, zt in pts:
        zb = 0 if gear >= 1 else round(zt * 0.5)
        v += [(x, y, z, 'steel2') for z in range(zb + 1, zt)]
        v += [(x, y, zb, 'tire'), (x + 1, y, zb, 'tire')]
    return v


# ------------------------------------------------------------------ rows
def _fx_ground(t, pts, n, cols=('d1', 'd2', 'd3'), vel=(-2.0, 0.0, 0.4), keep=0.65):
    v = []
    for i, p in enumerate(pts):
        v += V.puffs(t, p, n, 3, vel, 0.8, 0.5, cols, seed=i + 7, keep=keep)
    return v


def decolar(model, n=10, gear_pts_dust=(), engine_pts=(), alt_top=12):
    pitch = [0, 0, 0, 0, 4, 8, 10, 10, 9, 8]
    alt = [0, 0, 0, 0, 0, 1, 3, 6, 9, alt_top]
    gear = [1, 1, 1, 1, 1, 1, 1, 0.5, 0, 0]
    fr = []
    for t in range(n):
        v = model(t, gear=gear[t])
        v = V.rotate(v, pitch=pitch[t], pivot=(0, 0, 0))
        mn = min(p[2] for p in v)
        v = mv(v, 0, 0, alt[t] - (mn if alt[t] == 0 else 0))
        if t <= 5:                                                     # runway roll dust / prop wash
            v += _fx_ground(t, [(gx, gy, 0) for gx, gy in gear_pts_dust], 3, keep=0.55 + 0.04 * t)
        fr.append(R(v))
    return fr


def voar(model, alt, n=6, contrails=(), wingtips=()):
    fr = []
    for t in range(n):
        b = [0, 0, 1, 1, 0, 0][t]
        v = mv(model(t, gear=0), 0, 0, alt + b)
        v += vortex(t, [(x, y, z + alt + b) for x, y, z in contrails], L=16, gap=4)
        v += vortex(t + 2, [(x, y, z + alt + b) for x, y, z in wingtips], L=8, gap=3)
        fr.append(R(v))
    return fr


def pousar(model, alt, n=10, gear_pts_dust=()):
    altz = [alt, alt - 3, alt - 6, alt - 8, alt - 10, None, None, None, None, None]
    pitch = [3, 3, 4, 5, 6, 6, 3, 0, 0, 0]
    fr = []
    for t in range(n):
        rnd = random.Random(t)
        v = V.rotate(model(t, gear=1), pitch=pitch[t], pivot=(0, 0, 0))
        mn = min(p[2] for p in v)
        a = altz[t]
        if a is None or a < 0:
            v = mv(v, 0, 0, -mn)
        else:
            v = mv(v, 0, 0, a)
        if t == 5:                                                     # touchdown: tyre smoke
            for gx, gy in gear_pts_dust:
                v += V.ball(gx - 1, gy, 1, 1.4, ['w2', 'w3', 's0'], rnd, keep=0.8)
        if t >= 6:
            v += _fx_ground(t, [(gx - 2, gy, 0) for gx, gy in gear_pts_dust], 4,
                            cols=('w3', 's0', 'd2') if t == 6 else ('d1', 'd2', 'd3'), keep=0.7 - 0.05 * (t - 6))
        fr.append(R(v))
    return fr
