"""Fixed-wing voxel builders + flight animations shared by aereos_* and cargueiros_* scripts."""
import math, random
import vehlib as V
from vehlib import box, mv


def lerp(a, b, t):
    return a + (b - a) * t


def fuselage(sections, colf):
    """sections: list of (x, hw, zb, zt) keyframes (x ascending); interpolated; round cross-section corners."""
    v = []
    for i in range(len(sections) - 1):
        x0, w0, b0, t0 = sections[i]; x1, w1, b1, t1 = sections[i + 1]
        for x in range(x0, x1 + (1 if i == len(sections) - 2 else 0)):
            f = (x - x0) / max(1, x1 - x0)
            hw, zb, zt = round(lerp(w0, w1, f)), round(lerp(b0, b1, f)), round(lerp(t0, t1, f))
            for y in range(-hw, hw + 1):
                for z in range(zb, zt + 1):
                    if hw >= 2 and abs(y) == hw and z in (zb, zt) and zt - zb >= 2:
                        continue
                    v.append((x, y, z, colf(x, y, z)))
    return v


def wing(y0, y1, root, tip, z, colf, both=True, dz_tip=0):
    """Planform from span y0..y1: root=(x_le, x_te) at y0, tip=(x_le, x_te) at y1."""
    v = []
    for y in range(y0, y1 + 1):
        f = (y - y0) / max(1, y1 - y0)
        le, te = round(lerp(root[0], tip[0], f)), round(lerp(root[1], tip[1], f))
        zz = z + round(dz_tip * f)
        for x in range(te, le + 1):
            c = colf(x, y, zz)
            v.append((x, y, zz, c))
            if both:
                v.append((x, -y, zz, c))
    return v


def fin(y, root, tip, z0, z1, colf):
    """Vertical fin in x-z plane at column y. root/tip = (x_le, x_te)."""
    v = []
    for z in range(z0, z1 + 1):
        f = (z - z0) / max(1, z1 - z0)
        le, te = round(lerp(root[0], tip[0], f)), round(lerp(root[1], tip[1], f))
        v += [(x, y, z, colf(x, y, z)) for x in range(te, le + 1)]
    return v


def hcol(base, alt=None, alt2=None, s=0):
    def f(x, y, z):
        k = ((x * 92821) ^ (y * 68917) ^ (z * 31337) ^ s) % 13
        if k < 2 and alt:
            return alt
        if k == 2 and alt2:
            return alt2
        return base
    return f


def burner(x, y, z, t, L=4, w=0):
    """Afterburner plume pointing -x from nozzle exit (x,y,z). Flickers with t."""
    v = []
    Ls = L + (1 if t % 2 else -1) + (t % 3 == 0)
    for i in range(Ls):
        c = 'af1' if i < Ls * 0.35 else ('af2' if i < Ls * 0.7 else 'af3')
        v.append((x - i, y, z, c))
        if w and i < Ls * 0.6:
            v += [(x - i, y + d, z, 'af2') for d in range(-w, w + 1) if d]
    return v


def speed_lines(t, n=7, span=(-14, 14), xr=(-30, 24), zc=12, zr=10, seed=0, L=4, step=9):
    v = []
    W = xr[1] - xr[0]
    for k in range(n):
        x0 = xr[1] - ((t * step + k * 17 + seed) % W)
        y0 = span[0] + (k * 11 + seed) % (span[1] - span[0])
        z0 = zc - zr // 2 + (k * 7) % zr
        v += [(x0 - i, y0, z0, 'blur2') for i in range(L)]
    return v


def vortex(t, pts, L=10, gap=3):
    """Dashed wingtip/contrail lines streaming -x from each pt, scrolling with t."""
    v = []
    for (x, y, z) in pts:
        for i in range(L):
            if (i + t) % gap != 0:
                v.append((x - 1 - i, y, z, 'contrail'))
    return v


def ground_top(v, fx, fy):
    zs = [p[2] for p in v if abs(p[0] - fx) <= 1 and abs(p[1] - fy) <= 1 and p[3] not in V.FX]
    return (max(zs) + 1) if zs else 0


def shot_down(model, alt, seed, hit, n=10, spin=28, span=12):
    """Generic aircraft shoot-down: hit, fire + smoke trail, roll/dive, impact, burning wreck on the ground."""
    fr = []
    hx, hy, hz = hit
    path = []
    for t in range(n):
        rnd = random.Random(seed + t)
        if t <= 5:
            roll = 0 if t == 0 else spin * t
            pitch = 0 if t <= 1 else -7 * (t - 1)
            z = alt - (0 if t <= 1 else [0, 0, 1, 3, 6, 10][t])
            dx = 2 * t
            body = model(t)
            if t >= 2:
                body = V.wreckify(body, seed) if t >= 4 else body
            b = V.rotate(body, roll=roll, pitch=pitch, pivot=(0, 0, 1))
            v = mv(b, dx, 0, z)
            # rotated hit point
            a, p = math.radians(roll), math.radians(pitch)
            y1, z1 = hy * math.cos(a) - hz * math.sin(a), hy * math.sin(a) + hz * math.cos(a)
            x2, z2 = hx * math.cos(p) - z1 * math.sin(p), hx * math.sin(p) + z1 * math.cos(p)
            px, py, pz = x2 + dx, y1, z2 + z
            if t == 0:
                v += V.ball(px, py, pz + 1, 2.6, ['k1', 'e1', 'e2', 'e3'], rnd, jit=0.4)
                v += [(round(px) + 3 + i, round(py) + 2, round(pz) + 1, 'contrail') for i in range(6)]
            else:
                v += V.ball(px, py, pz + 1, 1.4, ['e1', 'e2', 'e3'], rnd, jit=0.5)
                path.append((px, py, pz))
                for k, q in enumerate(path):
                    age = len(path) - k
                    v += V.ball(q[0] - age * 3, q[1], q[2] + age * 0.6, 1.0 + age * 0.55,
                                ['e3', 'e4', 's2'] if age <= 1 else ['s0', 's1', 's2'], rnd, keep=0.85)
        else:
            body = V.wreckify(model(0), seed)
            body = V.rotate(body, roll=150, pitch=-6, yaw=25, pivot=(0, 0, 1))
            mn = min(q[2] for q in body)
            body = [q for q in mv(body, 10, 0, -mn - 1) if q[2] >= 0]
            # break apart: scatter outer pieces
            v = []
            for q in body:
                if abs(q[1]) > span * 0.55:
                    v.append((q[0] - 3, q[1] + (3 if q[1] > 0 else -3), q[2], q[3]))
                else:
                    v.append(q)
            v += V.scorch(10, 0, 9)
            if t - 6 <= 2:
                v += V.explosion([1, 2, 3][t - 6], 10, 0, 2, 1.3, seed)
            fl = [(10, 0, 2.0), (4, 3, 1.4), (15, -2, 1.2), (8, -span * 0.7, 1.0)]
            v += V.flames(t, [(fx, fy, ground_top(v, fx, fy), s) for fx, fy, s in fl], seed)
            if t >= 8:
                v += V.plume(t - 8, 10, 0, 8, n=4, cycle=2, rise=2.6, grow=0.7, r0=1.8, seed=seed)
        fr.append(V.R(v))
    return fr
