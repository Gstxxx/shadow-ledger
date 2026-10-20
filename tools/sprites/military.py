"""Military operator (camo, plate carrier, helmet+NVG, rifle): full isometric voxel animation set, facing SE."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from rig import box, arm, F

rig.C.update({
    'c1': (122, 112, 82), 'c2': (92, 98, 66), 'c3': (140, 128, 96), 'c4': (70, 66, 50),
    'pc': (84, 90, 64), 'pc2': (66, 70, 50), 'pouch': (100, 104, 74), 'helm': (96, 102, 74), 'helm2': (74, 78, 56),
    'nvg': (36, 38, 42), 'goggle': (40, 44, 50), 'beard': (70, 50, 36), 'glove': (40, 38, 34),
    'boot': (88, 70, 50), 'pack': (94, 96, 70), 'ant': (30, 30, 32),
    'rifle': (34, 34, 38), 'rifle2': (70, 72, 80), 'grenade': (70, 84, 56), 'pin': (200, 200, 210),
    'smoke': (180, 180, 176),
})
rig.C['pants'] = rig.C['c1']; rig.C['pants2'] = rig.C['c2']; rig.C['shoe'] = rig.C['boot']; rig.C['shoe2'] = (120, 98, 72)
rig.C['skin'] = (196, 146, 104); rig.C['skin2'] = (166, 118, 82)


def camo(x, y, z):
    h = ((x * 92821) ^ (y * 68917) ^ (z * 31337)) % 7
    return ('c1', 'c2', 'c3', 'c1', 'c4', 'c2', 'c1')[h]


def camo_box(x0, x1, y0, y1, z0, z1):
    return [(x, y, z, camo(x, y, z)) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) for z in range(z0, z1 + 1)]


def rifle(rh, lh, recoil=0):
    """Rifle along the line grip(rh) -> handguard(lh), with stock behind and muzzle ahead."""
    d = [lh[k] - rh[k] for k in range(3)]
    n = math.sqrt(sum(c * c for c in d)) or 1
    d = [c / n for c in d]
    st = [rh[k] - 2.6 * d[k] + (recoil * d[k]) for k in range(3)]
    mz = [lh[k] + 4.2 * d[k] + (recoil * d[k]) for k in range(3)]
    L = int(math.dist(st, mz) * 1.5) + 1
    v = []
    for i in range(L + 1):
        t = i / L
        p = [round(st[k] + (mz[k] - st[k]) * t) for k in range(3)]
        v.append((p[0], p[1], p[2], 'rifle'))
    m = [round(rh[k] + 1.2 * d[k]) for k in range(3)]
    v += [(m[0], m[1], m[2] - 1, 'rifle2'), (m[0], m[1], m[2] - 2, 'rifle2')]          # magazine
    o = [round(rh[k] + 0.8 * d[k]) for k in range(3)]
    v += [(o[0], o[1], o[2] + 1, 'rifle2')]                                             # optic
    return v, [round(c) for c in mz]


def upper(p):
    v = box(-1, 0, -2, 1, 7, 7, 'pc2')
    v += camo_box(-1, 0, -2, 1, 8, 13)
    v += box(1, 1, -2, 1, 8, 12, 'pc') + box(-2, -2, -2, 1, 8, 12, 'pc')                  # plate carrier
    v += box(2, 2, -2, -2, 8, 9, 'pouch') + box(2, 2, 0, 1, 8, 9, 'pouch') + box(2, 2, -1, -1, 8, 8, 'pouch')
    v += box(-3, -3, -2, 1, 8, 12, 'pack') + box(-3, -3, -2, -2, 13, 17, 'ant')           # backpack + radio antenna
    v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(1, 1, -1, 0, 14, 14, 'beard') + box(0, 0, -1, 0, 14, 14, 'beard')
    v += box(-2, 1, -2, 1, 17, 17, 'helm') + box(-2, 2, -2, 1, 16, 16, 'helm2') + box(-1, 0, -1, 0, 18, 18, 'helm')
    v += box(2, 2, -1, 0, 15, 15, 'goggle') + [(2, 0, 15, 'glint')]
    if p.get('nvg', True):
        v += [(2, -1, 17, 'nvg'), (2, 0, 17, 'nvg'), (3, -1, 17, 'nvg')]
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), 'c2') + arm((0, -3, 13), lh, (-3,), 'c2')
    v += [(round(rh[0]), round(rh[1]), round(rh[2]), 'glove'), (round(lh[0]), round(lh[1]), round(lh[2]), 'glove')]
    if p.get('gun', True):
        r, mz = rifle(rh, p.get('fore', lh), p.get('recoil', 0))
        v += r
        if p.get('flash'):
            x, y, z = mz
            v += [(x + 1, y, z, 'f1'), (x + 2, y, z, 'f2')]
            if p['flash'] > 1:
                v += [(x + 3, y, z, 'f1'), (x + 2, y, z + 1, 'f2'), (x + 2, y, z - 1, 'f2'), (x + 4, y, z, 'f3'), (x + 3, y + 1, z, 'f3')]
    else:
        v += box(-2, -2, 2, 2, 6, 11, 'rifle')                                          # slung on the back
    v += p.get('uextra', [])
    return v


rig.upper = upper

LOWR = dict(rh=(2, 1, 9), lh=(4, -1, 10))          # low ready
SHLD = dict(rh=(2, 1, 12), lh=(5, 0, 12))          # shouldered, aiming
CHEST = dict(rh=(1, 1, 11), lh=(3, -2, 12))        # port arms (run)

IDLE = [F(**LOWR), F(**LOWR), F(rh=(2, 1, 10), lh=(4, -1, 11)), F(rh=(2, 1, 10), lh=(4, -1, 11))]
WALK = [F(L=(th, -4 if th > 0 else -16), R=(-th, -4 if th < 0 else -16), **LOWR, dz=0)
        for th in (22, 10, -6, -22, -10, 6)]
RUN = [F(L=(th, -32 if th < 0 else -8), R=(-th, -32 if th > 0 else -8), **CHEST, lean=14, dz=1 if abs(th) < 20 else 0)
       for th in (38, 18, -10, -38, -18, 10)]
AIM = [F(**LOWR), F(rh=(2, 1, 11), lh=(4, 0, 11)), F(**SHLD)]
cas = lambda x, y, z: [(x, y, z, 'brass')]
BURST = [F(**SHLD),
         F(**SHLD, recoil=-1, flash=2, extra=cas(3, 4, 14)),
         F(rh=(2, 1, 13), lh=(5, 0, 13), flash=2, extra=cas(3, 5, 12) + cas(2, 4, 15)),
         F(**SHLD, recoil=-1, flash=1, extra=cas(3, 6, 9) + cas(3, 5, 13)),
         F(**SHLD, extra=cas(3, 6, 2) + cas(4, 7, 5))]
mag = lambda x, y, z: [(x, y, z, 'rifle2'), (x, y, z + 1, 'rifle2')]
RELOAD = [F(rh=(2, 1, 11), lh=(3, -1, 10), fore=(5, 0, 12)),
          F(rh=(2, 1, 11), lh=(1, -3, 8), fore=(5, 0, 12), extra=mag(3, 1, 5)),
          F(rh=(2, 1, 11), lh=(0, -3, 7), fore=(5, 0, 12), extra=mag(3, 1, 0)),
          F(rh=(2, 1, 11), lh=(2, -1, 9), fore=(5, 0, 12), extra=mag(3, 1, 0)),
          F(rh=(2, 1, 11), lh=(1, 0, 13), fore=(5, 0, 12), extra=mag(3, 1, 0)),
          F(**SHLD, extra=mag(3, 1, 0))]
gren = lambda x, y, z: [(x, y, z, 'grenade'), (x, y, z + 1, 'grenade')]
THROW = [F(rh=(2, 1, 9), lh=(2, -1, 11), gun=False, uextra=gren(2, -1, 11)),
         F(rh=(2, 1, 9), lh=(-2, -4, 15), gun=False, lean=-6, uextra=gren(-2, -4, 15), L=(12, -6), R=(-14, -6)),
         F(rh=(2, 1, 9), lh=(4, -2, 15), gun=False, lean=10, L=(18, -4), R=(-18, -10), extra=gren(6, -2, 17)),
         F(rh=(2, 1, 9), lh=(5, -2, 11), gun=False, lean=12, L=(18, -4), R=(-18, -10), extra=gren(11, -2, 15)),
         F(**LOWR, extra=gren(15, -2, 6) + [(15, -2, 8, 'smoke'), (16, -1, 9, 'smoke')])]
KNEEL = dict(L=(80, -80), R=(-15, -105))
KNEELS = [F(**KNEEL, rh=(2, 1, 9), lh=(5, 0, 9)),
          F(**KNEEL, rh=(2, 1, 9), lh=(5, 0, 9), recoil=-1, flash=2, extra=cas(3, 4, 11)),
          F(**KNEEL, rh=(2, 1, 9), lh=(5, 0, 9), flash=1, extra=cas(3, 6, 4))]
sp = lambda z: [(2, 0, z, 'hit2'), (3, -1, z + 1, 'hit'), (3, 1, z - 1, 'hit'), (4, 0, z + 1, 'hit2')]
drop = box(6, 11, 1, 1, 0, 0, 'rifle') + [(8, 1, 1, 'rifle2')]
DEATH = [F(rh=(2, 2, 12), lh=(2, -2, 13), lean=-14, extra=sp(12)),
         F(rh=(1, 2, 14), lh=(0, -3, 14), lean=-24, gun=False, nvg=True, L=(-14, -10), R=(10, -20), extra=drop + sp(13)),
         F(rh=(0, 3, 12), lh=(-1, -4, 12), lean=-10, gun=False, L=(30, -90), R=(20, -80), fall=-15, extra=drop),
         F(rh=(0, 3, 11), lh=(-1, -4, 11), gun=False, fall=-45, extra=drop),
         F(rh=(0, 3, 10), lh=(-1, -4, 10), gun=False, fall=-75, extra=drop),
         F(rh=(1, 4, 9), lh=(0, -5, 9), gun=False, fall=-90, extra=drop)]

ROWS = [('IDLE', IDLE), ('PATRULHA', WALK), ('CORRER', RUN), ('MIRAR', AIM), ('RAJADA', BURST),
        ('RECARREGAR', RELOAD), ('GRANADA', THROW), ('AJOELHADO', KNEELS), ('MORTE', DEATH)]
if __name__ == "__main__":
    rig.export(ROWS, {"MIRAR", "MORTE", "GRANADA"}, 'military')
