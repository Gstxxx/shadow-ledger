"""Gang hitman (hoodie, backwards cap, red bandana mask, gold chain, compact SMG): voxel set, facing SE."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig, kit
from rig import box, arm, F

rig.C.update({
    'hood': (58, 60, 58), 'hood2': (42, 44, 42), 'hoodS': (150, 40, 40), 'jeans': (52, 70, 104), 'jeans2': (40, 54, 84),
    'band': (176, 34, 38), 'band2': (230, 220, 210), 'capC': (24, 24, 26), 'chain': (184, 150, 68), 'hairC': (20, 18, 18),
    'smg': (30, 30, 34), 'smg2': (70, 72, 80), 'cover': (120, 116, 108), 'cover2': (96, 92, 86),
})

rig.C['skin'] = (150, 104, 72); rig.C['skin2'] = (124, 84, 58)
rig.C['pants'] = rig.C['jeans']; rig.C['pants2'] = rig.C['jeans2']
rig.C['shoe'] = (226, 226, 230); rig.C['shoe2'] = (200, 40, 40)


def smg(hand, recoil=0, up=False):
    x, y, z = [round(k) for k in hand]
    x += recoil
    if up:
        return box(x, x, y, y, z + 1, z + 5, 'smg') + [(x - 1, y, z + 3, 'smg2'), (x, y, z - 1, 'smg')]
    v = box(x - 1, x + 4, y, y, z + 1, z + 1, 'smg') + [(x + 5, y, z + 1, 'smg2')]           # receiver + barrel
    v += [(x, y, z, 'smg')] + box(x + 2, x + 2, y, y, z - 2, z, 'smg2')                    # grip + long mag
    v += [(x - 2, y, z + 1, 'smg2'), (x + 1, y, z + 2, 'smg2')]                             # stub stock + sight
    return v


def upper(p):
    v = box(-1, 0, -2, 1, 7, 7, 'hood2')
    v += box(-1, 0, -2, 1, 8, 13, 'hood') + box(-2, -2, -2, 1, 8, 13, 'hood2')
    v += box(1, 1, -2, 1, 8, 9, 'hood2') + [(1, -1, 10, 'hoodS'), (1, 0, 10, 'hoodS')]     # kangaroo pocket + logo
    v += [(1, -1, 13, 'chain'), (1, 0, 13, 'chain'), (1, -2, 12, 'chain'), (1, 1, 12, 'chain'), (1, 0, 11, 'chain')]
    v += box(-3, -3, -2, 1, 12, 14, 'hood2')                                                # hood bunched on the back
    v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2') + box(-2, -2, -2, 1, 14, 16, 'hairC')
    v += box(2, 2, -1, 0, 14, 14, 'band') + box(1, 1, -2, 1, 14, 14, 'band') + [(2, 0, 14, 'band2')]   # bandana
    v += [(2, -1, 15, 'hairC'), (2, 0, 15, 'hairC')]                                         # eyes
    v += box(-2, 1, -2, 1, 17, 17, 'capC') + box(-3, -3, -1, 0, 16, 16, 'capC')             # backwards cap
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), 'hood') + arm((0, -3, 13), lh, (-3,), 'hood')
    if p.get('gun', True):
        v += smg(rh, p.get('recoil', 0), p.get('gun_up', False))
    v += p.get('uextra', [])
    return v


rig.upper = upper


def flash(hand, big, g=1):
    x, y, z = round(hand[0]) + 6, round(hand[1]), round(hand[2]) + 1 + g
    v = [(x, y, z, 'f2'), (x + 1, y, z, 'f1')]
    if big:
        v += [(x + 2, y, z, 'f1'), (x + 1, y, z + 1, 'f2'), (x + 1, y, z - 1, 'f2'), (x + 3, y, z, 'f3'), (x + 2, y - 1, z, 'f3')]
    return v


HIP = dict(rh=(2, 1, 9), lh=(4, -1, 9))
AIM = dict(rh=(4, 0, 12), lh=(5, -1, 11))

IDLE = [F(**HIP), F(**HIP), F(rh=(2, 1, 10), lh=(4, -1, 10)), F(rh=(2, 1, 10), lh=(4, -1, 10))]
WALK = kit.walk(lambda sw, i: dict(rh=(2, 1, 9), lh=(4 + sw // 2, -1, 9)))
RUN = kit.run(lambda sw, i: dict(rh=(1 + sw, 2, 10), lh=(1 - sw, -3, 10), gun_up=True), lean=14)
AIMR = [F(**HIP), F(rh=(3, 0, 11), lh=(4, -1, 10)), F(**AIM)]
cas = lambda x, y, z: [(x, y, z, 'brass')]
SPRAY = []
for i, (zz, yy, big) in enumerate(((12, 0, 0), (12, 0, 2), (13, 1, 1), (14, 1, 2), (13, -1, 1), (14, -1, 2))):
    h = (4, yy, zz)
    SPRAY.append(F(rh=h, lh=(5, yy - 1, zz - 1), recoil=-1 if big == 2 else 0, lean=-3 if big else 0,
                   extra=(flash(h, big == 2) if big else []) + cas(3, 4 + i % 2, 15 - i * 2) + cas(2, 5, max(0, 9 - i * 3))))
mag = lambda x, y, z: [(x, y, z, 'smg2'), (x, y, z + 1, 'smg2'), (x, y, z + 2, 'smg2')]
RELOAD = [F(rh=(3, 1, 11), lh=(3, -1, 9)),
          F(rh=(3, 1, 11), lh=(1, -3, 8), extra=mag(5, 1, 5)),
          F(rh=(3, 1, 11), lh=(0, -3, 7), extra=mag(5, 1, 0)),
          F(rh=(3, 1, 11), lh=(4, -1, 10), extra=mag(5, 1, 0)),
          F(**AIM, extra=mag(5, 1, 0))]
COVER_BOX = box(6, 7, -3, 2, 0, 5, 'cover') + box(6, 7, -3, 2, 6, 6, 'cover2')
CROUCH = dict(L=(70, -120), R=(-10, -100))
COVER = [F(**CROUCH, rh=(2, 1, 8), lh=(3, -1, 8), extra=COVER_BOX),
         F(**CROUCH, rh=(4, 0, 9), lh=(5, -1, 9), extra=COVER_BOX),
         F(**CROUCH, rh=(4, 0, 10), lh=(5, -1, 9), recoil=-1, extra=COVER_BOX + flash((4, 0, 10), True, 0)),
         F(**CROUCH, rh=(4, 0, 10), lh=(5, -1, 9), extra=COVER_BOX + flash((4, 0, 10), False, 0) + cas(3, 4, 9))]
HURT = kit.hurt(dict(HIP))
dropped = box(6, 11, 1, 1, 0, 0, 'smg') + [(8, 1, 1, 'smg2')]
DEATH = kit.death({}, dropped, gun=False)

ROWS = [('IDLE', IDLE), ('ANDAR', WALK), ('CORRER', RUN), ('MIRAR', AIMR), ('RAJADA', SPRAY),
        ('RECARREGAR', RELOAD), ('ABRIGO', COVER), ('FERIDO', HURT), ('MORTE', DEATH)]
if __name__ == '__main__':
    rig.export(ROWS, {'MIRAR', 'MORTE'}, 'criminal')
