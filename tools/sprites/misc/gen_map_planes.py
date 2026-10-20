"""map-planes: the 4 player cargo planes as small map sprites, 8 screen headings, rows fly / takeoff / land,
plus a contrail puff. Builders from cargueiros_a/b are rotated at full resolution, then binned down so the
plane spans ~32-48 px, and drawn with the standard 4px-voxel renderer."""
import sys, os
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import math, random
import pmisc as P
import rig
import vehlib as V
import cargueiros_a as CA
import cargueiros_b as CB
from PIL import Image

OUT = P.PUB
rig.C.update({'navR': (255, 60, 50), 'navG': (70, 240, 110), 'strobe': (255, 255, 255), 'navRo': (150, 50, 46)})
rig.EMISSIVE |= {'navR', 'navG', 'strobe'}
V.GLOW.update({'navR': (255, 50, 40), 'navG': (60, 255, 110), 'strobe': (230, 240, 255)})
V.FX.update({'navR', 'navG', 'strobe', 'navRo'})
P.graded_shade(gamma=0.9, sat=1.1, faces=(1.2, 0.9, 0.6))

# screen heading -> yaw (deg) of the +x nose. +x draws toward screen SE, +y toward SW.
HEADINGS = [('N', -135), ('NE', -90), ('E', -45), ('SE', 0), ('S', 45), ('SW', 90), ('W', 135), ('NW', 180)]
# id, builder, downsample factor, wingtip (x, y, z), tail (x, z), engines [(x, y, z)] (props only for turbo)
PLANES = [
    ('cargo0', CA.turbo, 2.7, (-1, 15, 8), (-15, 14), [(5, 5, 7), (5, 10, 7)]),
    ('cargo1', CA.jato, 2.7, (-3, 14, 8), (-16, 15), []),
    ('cargo2', CB.widebody, 3.1, (-8, 17, 5), (-21, 17), []),
    ('cargo3', CB.estrategico, 4.0, (-10, 25, 10), (-29, 24), []),
]
ALT = 5
rig.C.update({'mwing': (118, 128, 144), 'mwing2': (96, 106, 122)})
WING = {'cg': 'mwing', 'cg2': 'mwing2'}


def rot_pt(p, yaw, pitch=0):
    x, y, z = p
    b = math.radians(pitch)
    x, z = x * math.cos(b) - z * math.sin(b), x * math.sin(b) + z * math.cos(b)
    g = math.radians(yaw)
    return x * math.cos(g) - y * math.sin(g), x * math.sin(g) + y * math.cos(g), z


def small(pid, build, f, tip, tail, engines, yaw, t=0, pitch=0, gear=0, scale=1.0, lights='fly', prop=None):
    hi = build(t, gear=gear)
    hw = 4 if pid == 'cargo3' else 2
    hi = [(x, y, z, 'mwing' if c == 'cw' and abs(y) > hw else c) for x, y, z, c in hi if c not in ('rotor', 'blur1', 'lightW', 'tail')]
    hi = V.rotate(hi, pitch=pitch, yaw=yaw, pivot=(0, 0, 0))
    ff = f / scale
    lo = P.scale_down(hi, ff, thresh=0.28, prio=('stripe2', 'glassV'))
    lo = [(x, y, z, WING.get(c, c)) for x, y, z, c in lo]
    mn = min(p[2] for p in lo)
    lo = [(x, y, z - mn, c) for x, y, z, c in lo]
    q = lambda p: tuple(round(k / ff) for k in rot_pt(p, yaw, pitch))
    add = []
    tx, ty, tz = tip
    for side, col in ((1, 'navR'), (-1, 'navG')):          # +y = port (left) = red
        x, y, z = q((tx, side * (ty + 1), tz))
        add.append((x, y, z - mn, col))
    if lights is not None:
        x, y, z = q((tail[0], 0, tail[1] + 1))
        if lights == 'strobe':
            add.append((x, y, z - mn, 'strobe'))
        elif lights == 'beacon':
            add.append((x, y, z - mn, 'navR'))
    if prop is not None:
        for ex, ey, ez in engines:
            for s in (1, -1):
                x, y, z = q((ex + 1, s * ey, ez))
                add.append((x, y, z - mn, 'blur2' if (prop + (s > 0)) % 2 else 'blur1'))
    return lo + add


def frame(vox, alt, shadow_a):
    vox = [(x, y, z + alt, c) for x, y, z, c in vox]
    im = V.R(vox)
    return P.with_shadow(im, V.SHADOWS.pop(id(im), None), shadow_a)


def rows_for(pl):
    pid, build, f, tip, tail, eng, = pl
    turbo = pid == 'cargo0'
    rows = []
    for hname, yaw in HEADINGS:
        kw = dict(yaw=yaw)
        a = (pid, build, f, tip, tail, eng)
        fly = []
        for t, li in enumerate(('beacon', None, 'strobe', None)):
            v = small(*a, t=t, lights=li, prop=t if turbo else None, **kw)
            fly.append(frame(v, ALT + (1 if t in (1, 2) else 0), 70))
        alt = [0, 0, 1, 2, 3, 4, 5]
        pit = [0, 0, 6, 8, 8, 5, 2]
        sc = [0.88, 0.89, 0.91, 0.93, 0.95, 0.98, 1.0]
        sh = [110, 105, 95, 88, 80, 74, 70]
        to = [frame(small(*a, t=i, pitch=pit[i], gear=1 if i < 4 else 0, scale=sc[i], lights='beacon' if i % 2 else None,
                          prop=i if turbo else None, **kw), alt[i], sh[i]) for i in range(7)]
        la = [frame(small(*a, t=i, pitch=[2, 3, 4, 5, 4, 0, 0][i], gear=1, scale=sc[6 - i], lights='beacon' if i % 2 else None,
                          prop=i if turbo else None, **kw), alt[6 - i], sh[6 - i]) for i in range(7)]
        meta = dict(heading=hname, plane=pid)
        rows += [dict(name=f'{pid}_fly_{hname}', frames=fly, fps=6, loop=True, meta=meta),
                 dict(name=f'{pid}_takeoff_{hname}', frames=to, fps=8, loop=False, meta=meta),
                 dict(name=f'{pid}_land_{hname}', frames=la, fps=8, loop=False, meta=meta)]
    return rows


def contrail():
    fr = []
    for t in range(6):
        rnd = random.Random(7 + t)
        r = 1.1 + t * 0.4
        v = V.ball(0, 0, ALT + 2 + t * 0.25, r, ['contrail', 'contrail', 'w1', 'w2'], rnd, keep=1.0 - t * 0.09)
        im = V.R(v, shadow=False)
        a = [1.0, 0.95, 0.8, 0.62, 0.42, 0.22][t]
        im.putalpha(im.getchannel('A').point(lambda k: int(k * a)))
        fr.append(im)
    return [dict(name='contrail_puff', frames=fr, fps=8, loop=False)]


if __name__ == '__main__':
    V.canvas(128, 112, 64, 64)
    rows = []
    for pl in PLANES:
        rows += rows_for(pl)
    rows += contrail()
    P.write_atlas(OUT, 'map-planes', rows, (64, 65), colors=128,
                  extra=dict(headings=[h for h, _ in HEADINGS],
                             note='rows <plane>_<fly|takeoff|land>_<heading>; heading = screen direction (N = up). '
                                  'anchor = ground point under the plane; contrail_puff is drawn at cruise height.'))
    P.preview_sheet(OUT, 'map-planes', S=2, path='map-planes.png')
