"""Fighters: caça leve (Gripen-like), caça multimissão (Hornet-like), caça furtivo (Raptor-like)."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
import vehlib as V
from vehlib import box, mv, R
from planes import fuselage, wing, fin, hcol, burner, speed_lines, vortex, shot_down

V.canvas(240, 170, 110, 104)
ALT = 13


# ======================================================================== CAÇA LEVE (delta-canard)
def leve(t=0, msl=True, ab=True):
    c = hcol('jg', 'jg2', 'jg3', 1)
    v = fuselage([(-13, 1, 0, 2), (-6, 1, 0, 2), (4, 1, 0, 2), (8, 1, 0, 2), (11, 1, 1, 2), (14, 0, 1, 1)], c)
    v += box(-5, 4, 0, 0, 3, 3, 'jg2')                                          # spine
    v += box(5, 8, 0, 0, 3, 3, 'canopy2') + [(9, 0, 2, 'canopy2')]
    v += [(x, s * 2, z, c(x, 2, z)) for x in range(-1, 6) for s in (-1, 1) for z in (0, 1)]
    v += [(5, s * 2, 1, 'jgD') for s in (-1, 1)]
    v += [(14, 0, 1, 'jgD'), (15, 0, 1, 'jgD')]
    v += wing(2, 8, (2, -11), (-8, -11), 1, c)
    v += wing(2, 5, (6, 3), (4, 3), 2, c)
    v += fin(0, (-6, -12), (-11, -13), 3, 8, c)
    v += box(-14, -14, -1, 1, 0, 2, 'steel2') + [(-14, 0, 1, 'gun')]
    v += [(x, s * 9, 1, 'msl') for x in range(-10, -5) for s in (-1, 1)] + [(-5, s * 9, 1, 'mslD') for s in (-1, 1)]
    if msl:
        v += [(x, 5, 0, 'msl') for x in range(-6, -1)] + [(-1, 5, 0, 'mslD'), (-6, 6, 0, 'mslD')]
    v += [(x, -5, 0, 'msl') for x in range(-6, -1)] + [(-1, -5, 0, 'mslD')]
    v += [(-9, 8, 1, 'tail'), (-9, -8, 1, 'sirB') if False else (-9, -8, 1, 'jgD')]
    if ab:
        v += burner(-15, 0, 1, t, 5, 1)
    return v


# ======================================================================== CAÇA MULTIMISSÃO (twin-tail)
def multi(t=0, msl=True, ab=True):
    c = hcol('jg2', 'jgD', 'jg', 2)
    v = fuselage([(-14, 3, 0, 2), (-4, 3, 0, 2), (5, 2, 0, 2), (10, 1, 0, 3), (14, 1, 1, 2), (17, 0, 1, 1)], c)
    v += box(6, 10, 0, 0, 4, 4, 'canopy2') + box(7, 10, -1, 1, 3, 3, 'canopy2')
    v += wing(2, 4, (10, 2), (4, 2), 1, c)                                      # LERX
    v += wing(3, 12, (2, -7), (-4, -7), 1, c)
    v += wing(2, 7, (-10, -15), (-13, -15), 1, c)
    for s in (-1, 1):
        v += fin(3 * s, (-6, -12), (-10, -12), 3, 9, c)
        v += box(-15, -15, s * 1, s * 2, 0, 2, 'steel2') if s > 0 else box(-15, -15, -2, -1, 0, 2, 'steel2')
        v += [(x, s * 12, 1, 'msl') for x in range(-7, -3)] + [(-3, s * 12, 1, 'mslD')]
        v += [(4, s * 3, 1, 'gun'), (4, s * 3, 0, 'gun')]
    v += [(x, 0, -1, 'jgD') for x in range(-4, 4)] + [(4, 0, -1, 'jg2')]          # centre tank
    v += [(x, -8, 0, 'msl') for x in range(-4, 1)] + [(1, -8, 0, 'mslD')]
    if msl:
        v += [(x, 8, 0, 'msl') for x in range(-4, 1)] + [(1, 8, 0, 'mslD'), (-4, 9, 0, 'mslD')]
    v += [(17, 0, 1, 'jgD')]
    if ab:
        v += burner(-16, 1, 1, t, 5) + burner(-16, -1, 1, t + 1, 5)
    return v


# ======================================================================== CAÇA FURTIVO (Raptor-like)
def furtivo(t=0, msl=True, ab=True, bay=0):
    c = hcol('st', 'st2', 'st3', 3)
    v = fuselage([(-14, 3, 0, 2), (2, 4, 0, 2), (8, 3, 0, 2), (12, 2, 0, 2), (16, 1, 1, 2), (19, 0, 1, 1)], c)
    v += box(9, 13, -1, 1, 3, 3, 'canopy') + box(10, 12, 0, 0, 4, 4, 'canopy')
    v += [(x, s * 4, 0, 'st2') for x in (4, 5, 6) for s in (-1, 1)] + [(7, s * 4, 1, 'gun') for s in (-1, 1)]
    v += wing(4, 13, (3, -9), (-7, -8), 1, c)
    v += wing(3, 8, (-9, -16), (-14, -15), 1, c)
    for s in (-1, 1):
        v += fin(4 * s, (-7, -12), (-11, -14), 3, 8, c)
        v += [(x, s * 13, 1, 'st3') for x in (-8, -7)]
    v += box(-15, -15, -2, 2, 1, 1, 'st2') + box(-15, -15, -2, 2, 2, 2, 'gun')         # 2D nozzles
    # weapon bay doors (hang down when open) + missile
    if bay:
        for s in (-1, 1):
            v += [(x, s * 3, z, 'st2') for x in range(-4, 3) for z in range(-bay, 0)]
    if msl and bay:
        v += [(x, 1, -bay + 1 if bay > 1 else 0, 'msl') for x in range(-4, 1)] + [(1, 1, -bay + 1 if bay > 1 else 0, 'mslD')]
    if ab:
        for y in (-1, 1):
            v += burner(-16, y, 1, t + (y > 0), 5)
        v += [(-16, 0, 1, 'af2'), (-17, 0, 1, 'af2')]
    return v


# ======================================================================== animations
BOB = [0, 0, 1, 1, 0, 0]


def voar(model, tips, n=6):
    fr = []
    for t in range(n):
        v = mv(model(t), 0, 0, ALT + BOB[t])
        v += vortex(t, [(x, y, z + ALT + BOB[t]) for x, y, z in tips], L=12, gap=3)
        pass
        fr.append(R(v))
    return fr


MX = [0, 0, 1, 4, 9, 16, 25, 36]


def missil(model, pylon, n=8, bay=False):
    fr = []
    px, py, pz = pylon
    for t in range(n):
        rnd = random.Random(t)
        kw = {}
        if bay:
            kw['bay'] = [1, 2, 2, 2, 2, 1, 1, 0][t] if t < 7 else 0
        has = t == 0 or (bay and t == 0)
        if bay:
            v = model(t, msl=(t == 0 or t == 1), **kw) if t < 2 else model(t, msl=False, **kw)
        else:
            v = model(t, msl=(t == 0))
        v = mv(v, 0, 0, ALT)
        if t >= 1 and not (bay and t == 1):
            mz = ALT + pz - (1 if t >= 1 else 0) - (1 if t >= 2 else 0) - (2 if bay else 0)
            mx = px + MX[t]
            v += V.missile(mx, py, mz, (1, 0, 0), L=5, t=t, flame=t >= 2)
            pts, ages = [], []
            for te in range(2, t + 1):
                for sub in range(0, max(1, MX[te] - MX[te - 1]), 2):
                    ex = px + MX[te] - sub - (t - te) * 3
                    pts.append((ex - 1, py, mz)); ages.append(t - te)
            v += V.trail(pts, ages, seed=t)
            if t == 2:
                v += V.ball(mx - 2, py, mz, 1.5, ['k1', 'e2', 's0'], rnd)
        fr.append(R(v))
    return fr


if __name__ == '__main__':
    ROWS = [('CAÇA LEVE · voar', voar(leve, [(-9, 9, 1), (-9, -9, 1)])),
            ('CAÇA LEVE · míssil', missil(leve, (-6, 5, 0))),
            ('CAÇA LEVE · abatido', shot_down(lambda t: leve(t, ab=t == 0), ALT, 61, (-4, 5, 1), span=8)),
            ('CAÇA MULTIMISSÃO · voar', voar(multi, [(-6, 12, 1), (-6, -12, 1)])),
            ('CAÇA MULTIMISSÃO · míssil', missil(multi, (-4, 8, 0))),
            ('CAÇA MULTIMISSÃO · abatido', shot_down(lambda t: multi(t, ab=t == 0), ALT, 62, (-3, 7, 1), span=12)),
            ('CAÇA FURTIVO · voar', voar(furtivo, [(-7, 13, 1), (-7, -13, 1)])),
            ('CAÇA FURTIVO · míssil (baia interna)', missil(furtivo, (-4, 1, 0), bay=True)),
            ('CAÇA FURTIVO · abatido', shot_down(lambda t: furtivo(t, ab=t == 0), ALT, 63, (-6, 8, 1), span=13))]
    V.export(ROWS, {n for n, _ in ROWS if 'abatido' in n}, 'aircraft-fighters')
