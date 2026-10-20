"""Guarda-costas urbano (terno + pistola), conjunto completo virado para SE. Usa o corpo padrão do rig."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from rig import box, F


# ---- hand poses (x, y, z) ----
CROSS = dict(rh=(2, 0, 9), lh=(2, -1, 9))                     # hands crossed in front
SIDES = lambda s=0: dict(rh=(0 + s, 2, 8), lh=(0 - s, -3, 8))  # arms down, swing s
AIM = dict(rh=(5, 0, 12), lh=(4, -1, 11))                     # two-hand pistol forward
LOW = dict(rh=(3, 0, 9), lh=(3, -1, 9))                       # low ready


def flash(big):
    x, z = 10, 13
    v = [(x, 0, z, 'f2'), (x + 1, 0, z, 'f1')]
    if big:
        v += [(x + 2, 0, z, 'f1'), (x + 1, 0, z + 1, 'f2'), (x + 1, 0, z - 1, 'f2'), (x + 3, 0, z, 'f3'), (x + 2, 1, z, 'f3')]
    return v


IDLE = [F(**CROSS, gun='holster'), F(**CROSS, gun='holster'),
        F(rh=(2, 0, 10), lh=(2, -1, 10), gun='holster'), F(rh=(2, 0, 10), lh=(2, -1, 10), gun='holster')]

WALK = []
for th, sw in [(22, 1), (10, 0), (-6, -1), (-22, -1), (-10, 0), (6, 1)]:
    WALK.append(F(L=(th, -4 if th > 0 else -14), R=(-th, -4 if th < 0 else -14), **SIDES(sw), gun='holster'))

RUN = []
for th, sw in [(38, 2), (18, 1), (-10, -1), (-38, -2), (-18, -1), (10, 1)]:
    RUN.append(F(L=(th, -30 if th < 0 else -8), R=(-th, -30 if th > 0 else -8),
                 rh=(1 + sw, 2, 10), lh=(1 - sw, -3, 10), lean=12, gun='holster', dz=1 if abs(th) < 20 else 0))

DRAW = [F(rh=(0, 2, 9), lh=(2, -1, 10), gun='holster'),
        F(rh=(1, 1, 9), lh=(3, -1, 10), gun='hand', gun_up=True),
        F(**LOW, gun='hand'),
        F(**AIM, gun='hand')]

SHOOT = [F(**AIM, gun='hand'),
         F(rh=(5, 0, 13), lh=(4, -1, 12), gun='hand', recoil=-1, extra=flash(True) + [(5, 3, 15, 'brass')]),
         F(rh=(5, 0, 12), lh=(4, -1, 11), gun='hand', extra=flash(False) + [(4, 4, 13, 'brass')]),
         F(**AIM, gun='hand', extra=[(3, 5, 4, 'brass')])]

mag_fall = lambda z: [(3, 0, z, 'mag'), (3, 0, z + 1, 'mag')]
RELOAD = [F(rh=(3, 0, 11), lh=(3, -1, 10), gun='hand', gun_up=True),
          F(rh=(3, 0, 11), lh=(0, -3, 7), gun='hand', gun_up=True, extra=mag_fall(6)),
          F(rh=(3, 0, 11), lh=(-1, -2, 7), gun='hand', gun_up=True, extra=mag_fall(1)),
          F(rh=(3, 0, 11), lh=(2, -1, 9), gun='hand', gun_up=True, extra=mag_fall(0)),
          F(rh=(3, 0, 11), lh=(3, 0, 11), gun='hand', gun_up=True, extra=mag_fall(0)),
          F(**AIM, gun='hand', extra=mag_fall(0))]

COVER_BOX = box(5, 6, -3, 2, 0, 5, 'cover') + box(5, 6, -3, 2, 6, 6, 'cover2')
CROUCH = dict(L=(70, -120), R=(-10, -100))
COVER = [F(**CROUCH, rh=(3, 0, 8), lh=(3, -1, 8), gun='hand', extra=COVER_BOX),
         F(**CROUCH, rh=(5, 0, 9), lh=(4, -1, 8), gun='hand', extra=COVER_BOX),
         F(**CROUCH, rh=(5, 0, 10), lh=(4, -1, 9), gun='hand', recoil=-1, extra=COVER_BOX + [(10, 0, 11, 'f1'), (11, 0, 11, 'f2'), (10, 0, 12, 'f2')])]

sp = lambda z: [(2, 0, z, 'hit2'), (3, -1, z + 1, 'hit'), (3, 1, z - 1, 'hit'), (4, 0, z + 1, 'hit2')]
HURT = [F(**LOW, gun='hand', lean=-10, extra=sp(11)),
        F(rh=(2, 1, 10), lh=(1, -2, 11), gun='hand', lean=-16, L=(-8, -6), R=(6, -10), extra=sp(10)),
        F(**LOW, gun='hand', lean=-6)]

dropped = box(6, 9, 1, 1, 0, 0, 'slide') + [(6, 1, 1, 'pistol')]
DEATH = [F(rh=(2, 1, 12), lh=(1, -2, 12), lean=-14, gun='hand', extra=sp(12)),
         F(rh=(1, 2, 13), lh=(0, -3, 13), lean=-24, L=(-14, -10), R=(10, -20), extra=dropped),
         F(rh=(0, 3, 12), lh=(-1, -4, 12), lean=-10, L=(30, -90), R=(20, -80), fall=-15, extra=dropped),
         F(rh=(0, 3, 11), lh=(-1, -4, 11), fall=-45, extra=dropped),
         F(rh=(0, 3, 10), lh=(-1, -4, 10), fall=-75, extra=dropped),
         F(rh=(1, 4, 9), lh=(0, -5, 9), fall=-90, dz=0, extra=dropped)]

ROWS = [('IDLE', IDLE), ('ANDAR', WALK), ('CORRER', RUN), ('SACAR / MIRAR', DRAW), ('TIRO', SHOOT),
        ('RECARREGAR', RELOAD), ('ABRIGO', COVER), ('FERIDO', HURT), ('MORTE', DEATH)]
ONESHOT = {'SACAR / MIRAR', 'MORTE'}

if __name__ == '__main__':
    rig.export(ROWS, ONESHOT, 'urban')
