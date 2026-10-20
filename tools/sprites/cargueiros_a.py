"""Player cargo planes, part A: turboélice (C-130-like) and jato médio (KC-390-like)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
import vehlib as V
from vehlib import box, mv
from planes import fuselage, wing, fin
from cargolib import livery, tailc, wingc, prop, nacelle, wheels, decolar, voar, pousar

V.canvas(220, 170, 108, 112)
ALT = 12


def cheat(v, hw, z):
    return [(x, y, zz, 'stripe' if abs(y) == hw and zz == z else c) for x, y, zz, c in v]


def turbo(t=0, gear=1):
    c = livery(4)
    v = fuselage([(-14, 0, 6, 7), (-11, 1, 4, 7), (-7, 2, 2, 7), (7, 2, 2, 7), (10, 2, 3, 7), (12, 1, 4, 6), (13, 0, 5, 5)], c)
    v = cheat(v, 2, 5)
    v += box(12, 12, -1, 1, 6, 6, 'glassV') + [(11, s * 2, 6, 'glassV') for s in (-1, 1)] + [(13, 0, 5, 'cg2')]
    v += wing(3, 15, (2, -2), (1, -1), 8, wingc) + box(-2, 2, -2, 2, 8, 8, 'cw')
    for s in (-1, 1):
        for y in (5, 10):
            v += nacelle(-3, 3, s * y, 7, 1, 'cw')
            v += prop(5, s * y, 7, 2.6, t * 33 + y * 7)
    v += fin(0, (-9, -14), (-12, -15), 8, 14, tailc(8))
    v += wing(1, 7, (-11, -14), (-13, -14), 7, wingc)
    v += box(-3, 2, 3, 3, 2, 3, 'cg2') + box(-3, 2, -3, -3, 2, 3, 'cg2')
    v += [(-1, 15, 8, 'tail'), (-1, -15, 8, 'sirB' if False else 'cg2'), (-15, 0, 14, 'lightW')]
    v += wheels([(-1, 3, 2), (1, 3, 2), (-1, -3, 2), (1, -3, 2), (10, 0, 3)], gear)
    return v


def jato(t=0, gear=1):
    c = livery(4, 3)
    v = fuselage([(-15, 0, 6, 7), (-12, 1, 4, 7), (-8, 2, 2, 7), (8, 2, 2, 7), (11, 2, 3, 7), (13, 1, 4, 6), (15, 0, 5, 5)], c)
    v = cheat(v, 2, 5)
    v += box(13, 13, -1, 1, 6, 6, 'glassV') + [(12, s * 2, 6, 'glassV') for s in (-1, 1)] + [(15, 0, 5, 'cg2')]
    v += wing(3, 14, (3, -1), (-2, -4), 8, wingc) + box(-1, 3, -2, 2, 8, 8, 'cw')
    for s in (-1, 1):
        v += nacelle(-2, 4, s * 6, 6, 1, 'cw') + [(1, s * 6, 7, 'cg2')]
    v += fin(0, (-10, -15), (-13, -16), 8, 15, tailc(8))
    v += wing(1, 6, (-13, -16), (-15, -16), 15, wingc)
    v += box(-3, 2, 3, 3, 2, 3, 'cg2') + box(-3, 2, -3, -3, 2, 3, 'cg2')
    v += [(-3, 14, 8, 'tail'), (-16, 0, 15, 'lightW')]
    v += wheels([(-1, 3, 2), (1, 3, 2), (-1, -3, 2), (1, -3, 2), (11, 0, 3)], gear)
    return v


if __name__ == '__main__':
    gd = [(-1, 3), (-1, -3)]
    ROWS = [('TURBOÉLICE · taxiar / decolar', decolar(turbo, gear_pts_dust=gd + [(3, 10), (3, -10)], alt_top=ALT)),
            ('TURBOÉLICE · voar', voar(turbo, ALT, wingtips=[(-1, 15, 8), (-1, -15, 8)])),
            ('TURBOÉLICE · pousar', pousar(turbo, ALT, gear_pts_dust=gd)),
            ('JATO MÉDIO · taxiar / decolar', decolar(jato, gear_pts_dust=gd + [(-4, 6), (-4, -6)], alt_top=ALT)),
            ('JATO MÉDIO · voar', voar(jato, ALT, contrails=[(-4, 6, 6), (-4, -6, 6)], wingtips=[(-4, 14, 8), (-4, -14, 8)])),
            ('JATO MÉDIO · pousar', pousar(jato, ALT, gear_pts_dust=gd))]
    V.export(ROWS, {n for n, _ in ROWS if 'decolar' in n or 'pousar' in n}, 'cargo-planes-a')
