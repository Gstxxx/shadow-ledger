"""Player cargo planes, part B: widebody (767F-like) and estratégico (C-5-like). Same 1.4 m/voxel scale as part A."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
import vehlib as V
from vehlib import box
from planes import fuselage, wing, fin
from cargolib import livery, tailc, wingc, nacelle, wheels, decolar, voar, pousar

V.canvas(300, 230, 146, 150)
ALT = 12


def cheat(v, hw, z):
    return [(x, y, zz, 'stripe' if abs(y) == hw and zz == z else c) for x, y, zz, c in v]


def widebody(t=0, gear=1):
    c = livery(4, 5)
    v = fuselage([(-20, 0, 6, 7), (-17, 1, 4, 7), (-13, 2, 2, 7), (13, 2, 2, 7), (16, 2, 3, 7), (18, 1, 4, 6), (20, 0, 5, 5)], c)
    v = cheat(v, 2, 5)
    v += box(18, 18, -1, 1, 6, 6, 'glassV') + [(17, s * 2, 6, 'glassV') for s in (-1, 1)] + [(20, 0, 5, 'cg2')]
    v += [(x, 2, z, 'cg2') for x in (8, 12) for z in (3, 4, 5, 6)] + [(x, 2, 6, 'cg2') for x in range(9, 12)]   # cargo door
    v += wing(3, 17, (4, -3), (-8, -11), 3, wingc, dz_tip=2) + box(-3, 4, -2, 2, 2, 3, 'cg')
    for s in (-1, 1):
        v += nacelle(-1, 5, s * 7, 2, 1, 'cw') + [(1, s * 7, 3, 'cg2'), (2, s * 7, 3, 'cg2')]
    v += fin(0, (-13, -19), (-17, -21), 8, 17, tailc(8))
    v += wing(1, 10, (-15, -20), (-19, -21), 7, wingc)
    v += [(-8, 17, 5, 'tail'), (-21, 0, 7, 'lightW')]
    v += wheels([(-2, 3, 2), (0, 3, 2), (-2, -3, 2), (0, -3, 2), (15, 0, 3)], gear)
    return v


def estrategico(t=0, gear=1):
    c = livery(6, 9)
    v = fuselage([(-28, 0, 10, 11), (-24, 1, 8, 11), (-19, 3, 4, 11), (-12, 4, 2, 11), (16, 4, 2, 11), (21, 3, 3, 11),
                  (25, 2, 5, 10), (28, 0, 7, 8)], c)
    v = cheat(v, 4, 8)
    v += box(6, 21, -2, 2, 12, 12, 'cw') + box(22, 23, -1, 1, 11, 11, 'cw')                       # upper-deck hump
    v += box(24, 24, -1, 1, 10, 10, 'glassV') + [(23, s * 2, 10, 'glassV') for s in (-1, 1)] + [(28, 0, 7, 'cg2'), (29, 0, 7, 'cg2')]
    v += [(x, 4, z, 'cg2') for x in (-6, 0) for z in range(3, 8)]                                   # side door
    v += wing(4, 25, (6, -2), (-9, -13), 12, wingc, dz_tip=-2) + box(-2, 5, -4, 4, 12, 12, 'cw')
    for s in (-1, 1):
        v += nacelle(-4, 3, s * 10, 9, 1, 'cw') + [(-1, s * 10, 11, 'cg2'), (0, s * 10, 11, 'cg2')]
        v += nacelle(-9, -2, s * 17, 8, 1, 'cw') + [(-5, s * 17, 10, 'cg2'), (-6, s * 17, 10, 'cg2')]
        v += box(-6, 4, s * 5, s * 5, 2, 4, 'cg2') if s > 0 else box(-6, 4, -5, -5, 2, 4, 'cg2')    # gear pods
    v += fin(0, (-17, -27), (-24, -29), 11, 24, tailc(11))
    v += wing(1, 11, (-23, -28), (-26, -29), 24, wingc)
    v += [(-13, 25, 10, 'tail'), (-29, 0, 24, 'lightW')]
    v += wheels([(x, s * 4, 2) for x in (-5, -2, 1, 4) for s in (-1, 1)] + [(22, 0, 3), (22, 1, 3)], gear)
    return v


if __name__ == '__main__':
    ROWS = [('WIDEBODY · taxiar / decolar', decolar(widebody, gear_pts_dust=[(-1, 3), (-1, -3), (-3, 7), (-3, -7)], alt_top=ALT)),
            ('WIDEBODY · voar', voar(widebody, ALT, contrails=[(-3, 7, 2), (-3, -7, 2)], wingtips=[(-8, 17, 5), (-8, -17, 5)])),
            ('WIDEBODY · pousar', pousar(widebody, ALT, gear_pts_dust=[(-1, 3), (-1, -3)])),
            ('ESTRATÉGICO · taxiar / decolar', decolar(estrategico, gear_pts_dust=[(-1, 4), (-1, -4), (-6, 10), (-11, 17)], alt_top=ALT)),
            ('ESTRATÉGICO · voar', voar(estrategico, ALT, contrails=[(-6, 10, 9), (-6, -10, 9), (-11, 17, 8), (-11, -17, 8)],
                                        wingtips=[(-10, 25, 10), (-10, -25, 10)])),
            ('ESTRATÉGICO · pousar', pousar(estrategico, ALT, gear_pts_dust=[(-1, 4), (-1, -4)]))]
    V.export(ROWS, {n for n, _ in ROWS if 'decolar' in n or 'pousar' in n}, 'cargo-planes-b')
