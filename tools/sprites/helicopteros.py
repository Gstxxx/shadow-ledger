"""Helicopters: utilitário (Black Hawk-like) and ataque (Apache-like)."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
import vehlib as V
from vehlib import box, mv, R

V.canvas(220, 165, 112, 100)
ALT = 11


def h(x, y, z, s=0):
    return ((x * 92821) ^ (y * 68917) ^ (z * 31337) ^ s) % 13


def camo(base):
    def f(x, y, z):
        k = h(x, y, z, 2)
        return base + '2' if k < 2 else (base + '3' if k == 2 else base)
    return f


def rotor(cx, cy, cz, Rr, ang, blades=4, blur=True, droop=0.0):
    v = []
    for k in range(blades):
        a = math.radians(ang + k * 360 / blades)
        r = 1.0
        while r <= Rr:
            v.append((round(cx + math.cos(a) * r), round(cy + math.sin(a) * r), round(cz - droop * (r / Rr) ** 2), 'rotor'))
            r += 0.5
        if blur:                                   # continuous ghost blade trailing behind (motion smear)
            b = math.radians(ang + k * 360 / blades - 16)
            r = Rr * 0.35
            while r <= Rr:
                v.append((round(cx + math.cos(b) * r), round(cy + math.sin(b) * r), round(cz), 'blur1'))
                r += 0.5
    v += box(cx - 1, cx + 1, cy - 1, cy + 1, cz, cz, 'gun2')
    return v


def tail_rotor(cx, y, cz, r, ang):
    v = []
    for k in range(4):
        a = math.radians(ang + k * 90)
        for s in (1, 2, 3):
            if s <= r:
                v.append((round(cx + math.cos(a) * s), y, round(cz + math.sin(a) * s), 'rotor'))
        b = math.radians(ang + k * 90 - 30)
        v.append((round(cx + math.cos(b) * r), y, round(cz + math.sin(b) * r), 'blur1'))
    v.append((cx, y, cz, 'gun2'))
    return v


# ======================================================================== UTILITÁRIO (UH-60-like)
def uh(ang=0, door_gun=0):
    c = camo('hg')
    v = []
    for x in range(-6, 6):
        for y in range(-3, 4):
            for z in range(2, 9):
                if z == 2 and abs(y) == 3:
                    continue
                if z == 8 and abs(y) == 3:
                    continue
                v.append((x, y, z, c(x, y, z)))
    for x, zt, hw, zb in ((6, 7, 3, 2), (7, 6, 3, 2), (8, 5, 2, 3), (9, 4, 2, 3), (10, 4, 1, 4)):
        v += [(x, y, z, c(x, y, z)) for y in range(-hw, hw + 1) for z in range(zb, zt + 1)]
    v += box(6, 6, -2, 2, 7, 7, 'glassV') + box(7, 7, -2, 2, 6, 6, 'glassV2') + box(8, 8, -1, 1, 5, 5, 'glassV')
    for s in (-1, 1):
        v += [(x, 3 * s, z, 'glassV') for x in (4, 5) for z in (6, 7)] + [(6, 3 * s, 6, 'glassV')]
    v += box(-3, 1, 3, 3, 3, 7, 'olD')                                         # open cabin door
    v += [(-1, 3, 4, 'ol2'), (0, 3, 4, 'ol2')]                                 # seats/crew silhouette
    v += [(-2, 3, 5, 'skin'), (-2, 3, 6, 'helm' if 'helm' in rig.C else 'ol')]
    # door gun (M134) pointing +y
    gy = door_gun
    v += [(-1, 4, 5, 'gun'), (-1, 5 - 0 * gy, 5, 'gun2'), (-1, 6, 5, 'gun2'), (-1, 4, 4, 'gun')]
    # engines + mast
    v += box(-3, 3, -2, 2, 9, 9, 'hg2') + box(-2, 2, -1, 1, 10, 10, 'hg') + [(-4, s * 2, 9, 'steel2') for s in (-1, 1)]
    v += [(3, s * 2, 9, 'gun') for s in (-1, 1)]
    v += box(0, 0, 0, 0, 11, 12, 'gun')
    # tail boom
    for x in range(-20, -6):
        hw = 2 if x >= -10 else 1
        zb = 4 + (1 if x < -10 else 0) + (1 if x < -15 else 0)
        zt = 8 if x >= -10 else 7
        v += [(x, y, z, c(x, y, z)) for y in range(-hw, hw + 1) for z in range(zb, zt + 1)]
    for x, z0, z1 in ((-19, 7, 9), (-20, 7, 11), (-21, 8, 13), (-22, 9, 14), (-23, 11, 14)):
        v += [(x, 0, z, c(x, 0, z)) for z in range(z0, z1 + 1)]
    v += box(-20, -19, -5, 5, 7, 7, 'hg2')
    v += tail_rotor(-21, 1, 11, 3, -ang * 2)
    # gear
    v += [(3, s * 3, 1, 'steel2') for s in (-1, 1)] + [(3, s * 4, 0, 'tire') for s in (-1, 1)] + [(3, s * 4, 1, 'tire') for s in (-1, 1)]
    v += [(-17, 0, 4, 'steel2'), (-17, 0, 3, 'tire')]
    v += [(9, 0, 3, 'lightW'), (-6, 0, 2, 'tail')]
    v += rotor(0, 0, 13, 15, ang)
    return v


# ======================================================================== ATAQUE (AH-64-like)
def ah(ang=0, pods=(True, True), gun_rec=0):
    c = camo('ap')
    v = []
    for x in range(-6, 7):
        for y in range(-2, 3):
            for z in range(3, 8):
                if abs(y) == 2 and z in (3, 7):
                    continue
                v.append((x, y, z, c(x, y, z)))
    for x, zb, zt, hw in ((7, 3, 6, 2), (8, 3, 5, 1), (9, 3, 5, 1), (10, 3, 4, 1)):
        v += [(x, y, z, c(x, y, z)) for y in range(-hw, hw + 1) for z in range(zb, zt + 1)]
    v += box(11, 11, -1, 1, 3, 4, 'gun2') + [(12, 0, 3, 'glassV2'), (12, 0, 4, 'gun2')]          # TADS/PNVS
    v += box(5, 7, -1, 1, 7, 7, 'canopy2') + [(7, 0, 7, 'canopy2'), (8, 0, 6, 'canopy2')]          # gunner canopy
    v += box(1, 3, -1, 1, 8, 8, 'canopy2') + box(4, 4, -1, 1, 8, 8, 'ap2')                        # pilot canopy
    v += [(x, s * 2, 7, 'canopy2') for x in (1, 2, 5, 6) for s in (-1, 1)]
    # nacelles
    for s in (-1, 1):
        v += [(x, s * y, z, c(x, y, z)) for x in range(-4, 2) for y in (3, 4) for z in (6, 7, 8)]
        v += [(2, s * 3, 7, 'gun'), (2, s * 4, 7, 'gun'), (-5, s * 3, 7, 'steel2'), (-5, s * 4, 8, 'steel2')]
    # stub wings + stores
    v += box(-2, 1, -8, 8, 5, 5, 'ap2')
    for s in (-1, 1):
        if pods[0 if s == 1 else 1]:
            v += [(x, 5 * s, z, 'ap2') for x in range(-2, 2) for z in (3, 4)] + [(2, 5 * s, z, 'gun') for z in (3, 4)]
        for yy in (7, 8):
            v += [(x, s * yy, 3, 'msl') for x in range(-2, 2)] + [(2, s * yy, 3, 'mslD')]
    # chin gun
    v += box(6, 7, 0, 0, 2, 2, 'gun2') + box(8 - gun_rec, 10 - gun_rec, 0, 0, 1, 1, 'gun')
    # boom + tail
    for x in range(-20, -6):
        zb = 5 if x > -15 else 6
        v += [(x, y, z, c(x, y, z)) for y in (-1, 0, 1) for z in (zb, zb + 1, 7) if not (abs(y) == 1 and z == 7 and x < -12)]
    for x, z0, z1 in ((-19, 7, 9), (-20, 7, 11), (-21, 7, 13), (-22, 8, 14)):
        v += [(x, 0, z, c(x, 0, z)) for z in range(z0, z1 + 1)]
    v += box(-21, -20, -4, 4, 6, 6, 'ap2')
    v += tail_rotor(-21, 1, 12, 3, -ang * 2)
    # gear
    v += [(4, s * 3, z, 'steel2') for s in (-1, 1) for z in (1, 2)] + [(4, s * 3, 0, 'tire') for s in (-1, 1)] + [(5, s * 3, 0, 'tire') for s in (-1, 1)]
    v += [(-18, 0, 4, 'steel2'), (-18, 0, 3, 'tire')]
    v += box(0, 0, 0, 0, 9, 11, 'gun')
    v += rotor(0, 0, 12, 14, ang)
    v += V.ball(0, 0, 14, 1.5, ['ap3', 'ap2'])                                                  # Longbow radar
    return v


# ======================================================================== animations
BOB = [0, 1, 1, 0, -1, -1]


def downwash(t, n, r0=5):
    v = []
    rnd = random.Random(t)
    for k in range(8):
        ang = math.radians(k * 45 + 20 * (k % 2))
        for j in range(2):
            age = (t / n + j * 0.5) % 1.0
            d = r0 + age * 9
            v += V.ball(math.cos(ang) * d, math.sin(ang) * d, age * 1.0, 0.6 + age * 0.9, ['d1', 'd2', 'd3'], rnd, keep=0.7 - age * 0.4, squash=0.5)
    return v


def pairar(model, n=6):
    fr = []
    for t in range(n):
        v = mv(model(ang=t * 30), 0, 0, ALT + BOB[t % 6])
        v += downwash(t, n)
        fr.append(R(v))
    return fr


def voar(model, n=6):
    fr = []
    for t in range(n):
        v = V.rotate(model(ang=t * 30), pitch=-9, pivot=(0, 0, 6))
        v = mv(v, 0, 0, ALT + 2 + BOB[t % 6] // 1)
        for k in range(6):                                                      # speed streaks
            x0 = 18 - ((t * 7 + k * 13) % 44)
            y0 = -9 + (k * 7) % 19
            z0 = ALT + 2 + (k * 5) % 12
            v += [(x0 - i, y0, z0, 'blur2') for i in range(3)]
        fr.append(R(v))
    return fr


def uh_atirar(n=4):
    fr = []
    for t in range(n):
        rnd = random.Random(t)
        v = mv(uh(ang=t * 30), 0, 0, ALT)
        on = t % 2 == 0
        gx, gy, gz = -1, 7, 5 + ALT
        if on:
            v += [(gx, gy, gz, 'k1'), (gx, gy + 1, gz, 'k1'), (gx, gy + 2, gz, 'e2'), (gx + 1, gy + 1, gz, 'e2'), (gx - 1, gy + 1, gz, 'e2'),
                  (gx, gy + 1, gz + 1, 'e3'), (gx, gy + 1, gz - 1, 'e3')]
        for k in range(3):                                                       # tracers to +y, dropping
            d = ((t * 5 + k * 9) % 22) + 4
            v += [(gx + (k - 1), gy + d + i, gz - d // 3 - i // 3, 't1' if i < 2 else 't2') for i in range(3)]
        for k in range(4):                                                       # casings falling
            a = (t + k) % 4
            v.append((gx - 1 + (k % 2), 4 + (k % 3) // 2, gz - 2 - a * 3, 'brass'))
        fr.append(R(v))
    return fr


def ah_canhao(n=4):
    fr = []
    for t in range(n):
        on = t % 2 == 0
        v = mv(V.rotate(ah(ang=t * 30, gun_rec=1 if on else 0), pitch=-5, pivot=(0, 0, 6)), 0, 0, ALT)
        mx, my, mz = 11, 0, ALT + 2
        if on:
            v += V.flash(mx, my, mz, 1.2, rnd=random.Random(t))
        for k in range(3):
            d = ((t * 6 + k * 8) % 24) + 3
            v += [(mx + d + i, my + (k - 1) // 2, mz - d // 3 - i // 3, 't1' if i < 2 else 't2') for i in range(3)]
        v += [(5, 1 + (t % 2), ALT + 1 - 2 * (t % 2), 'brass'), (6, 2, ALT - 1 - (t % 3), 'brass')]
        fr.append(R(v))
    return fr


def ah_foguetes(n=8):
    fr = []
    shots = [(0, 1), (4, -1)]                         # (launch frame, side)
    for t in range(n):
        v = mv(ah(ang=t * 30), 0, 0, ALT)
        for t0, s in shots:
            age = (t - t0) % n
            px, py, pz = 2, 5 * s, ALT + 3
            if age == 0:
                v += V.flash(px + 1, py, pz, 1.2) + V.ball(px - 2, py, pz, 1.6, ['s0', 's1'], random.Random(t))
            pts, ages = [], []
            hx = px + 2 + age * 6
            for k in range(0, age * 6, 2):
                pts.append((px + 2 + k, py, pz - k // 10)); ages.append(age - k // 6)
            v += V.trail(pts, ages, seed=t + s)
            if age < 6:
                v += V.missile(hx, py, pz - (age * 6) // 10, (1, 0, 0), L=3, t=t)
        fr.append(R(v))
    return fr


def heli_destroyed(model, seed, n=10, hit=(-12, 0, 7)):
    fr = []
    alt = [ALT, ALT, ALT - 1, ALT - 2, ALT - 4, ALT - 6, ALT - 9, 0, 0, 0]
    yaw = [0, 0, 35, 80, 140, 210, 290, 310, 310, 310]
    trail_pts = []
    for t in range(n):
        rnd = random.Random(seed + t)
        if t < 7:
            body = model(ang=t * 30 * (1 if t < 4 else 0.5))
            if t >= 1:
                body = V.wreckify(body, seed) if t >= 5 else [(x, y, z, c) for x, y, z, c in body]
            body = V.rotate(body, roll=(0 if t < 3 else 8 * (t - 2)), yaw=yaw[t], pivot=(0, 0, 6))
            v = mv(body, 0, 0, alt[t])
            hx, hy, hz = hit
            a = math.radians(yaw[t])
            wx, wy = hx * math.cos(a) - hy * math.sin(a), hx * math.sin(a) + hy * math.cos(a)
            if t == 0:
                v += V.ball(wx, wy, hz + alt[t], 2.4, ['e1', 'e1', 'e2']) + V.ball(wx - 3, wy + 2, hz + alt[t] + 1, 1.0, ['s0', 's1'])
            else:
                trail_pts.append((wx * 0.4, wy * 0.4, 10 + alt[t]))
                v += V.flames(t, [(round(wx * 0.4), round(wy * 0.4), alt[t] + 9, 1.2)], seed)
                for k, p in enumerate(trail_pts[:-1]):
                    age = len(trail_pts) - 1 - k
                    v += V.ball(p[0], p[1], p[2] + age * 1.5, 1.2 + age * 0.6, ['s2', 's3', 's1'], rnd, keep=0.8)
        else:
            body = V.wreckify(model(ang=40), seed)
            body = [p for p in body if p[3] != 'blur1' and p[3] != 'blur2']
            body = V.rotate(body, roll=24, yaw=310, pivot=(0, 0, 6))
            mn = min(p[2] for p in body)
            v = mv(body, 0, 0, -mn - 1)
            v = [p for p in v if p[2] >= 0]
            v += V.scorch(0, 0, 9)
            v += V.explosion({7: 1, 8: 3}[t], 0, 0, 3, 1.2, seed) if t < 9 else []
            def top(fx, fy):
                zs = [p[2] for p in v if abs(p[0] - fx) <= 1 and abs(p[1] - fy) <= 1 and p[3] not in V.FX]
                return (max(zs) + 1) if zs else 0
            fl = [(0, 0, 2.0), (-7, 3, 1.4), (5, -2, 1.2)]
            v += V.flames(t, [(fx, fy, top(fx, fy), s) for fx, fy, s in fl], seed)
            if t >= 8:
                v += V.plume(t - 8, 0, 0, top(0, 0) + 6, n=4, cycle=4, rise=2.6, grow=0.7, r0=1.8, seed=seed)
        fr.append(R(v))
    return fr


if __name__ == '__main__':
    ROWS = [('UTILITÁRIO · pairar', pairar(uh)), ('UTILITÁRIO · voar', voar(uh)),
            ('UTILITÁRIO · atirar (metralhadora de porta)', uh_atirar()), ('UTILITÁRIO · destruído', heli_destroyed(uh, 41)),
            ('ATAQUE · pairar', pairar(ah)), ('ATAQUE · voar', voar(ah)),
            ('ATAQUE · canhão 30mm', ah_canhao()), ('ATAQUE · foguetes', ah_foguetes()),
            ('ATAQUE · destruído', heli_destroyed(ah, 42))]
    V.export(ROWS, {n for n, _ in ROWS if 'destru' in n}, 'vehicles-heli')
