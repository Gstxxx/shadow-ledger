"""Air combat pilot (flight suit, helmet + visor, survival vest, pistol): isometric voxel animation set, facing SE."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig, kit
from rig import box, arm, F, pistol
from kit import flash, line

rig.C.update({
    'fs': (104, 112, 86), 'fs2': (80, 88, 66), 'vest': (54, 58, 50), 'vest2': (40, 44, 38), 'pouch': (70, 74, 62),
    'patch': (226, 112, 40), 'helm': (206, 208, 202), 'helm2': (150, 154, 152), 'visor': (52, 46, 30), 'vglint': (255, 214, 110),
    'mask': (86, 90, 96), 'hose': (60, 62, 66), 'glove': (52, 40, 30), 'radio': (30, 32, 34), 'led': (120, 255, 140),
    'can1': (230, 104, 40), 'can2': (236, 232, 222), 'cord': (200, 200, 190), 'seat': (60, 62, 70), 'seat2': (40, 42, 48),
    'lad': (130, 134, 140), 'wave': (140, 220, 255),
})
rig.EMISSIVE |= {'vglint', 'led', 'wave'}
rig.C['pants'] = rig.C['fs']; rig.C['pants2'] = rig.C['fs2']
rig.C['shoe'] = (36, 30, 26); rig.C['shoe2'] = (70, 60, 50)


def upper(p):
    v = box(-1, 0, -2, 1, 7, 7, 'fs2')
    v += box(-1, 0, -2, 1, 8, 13, 'fs') + box(-2, -2, -2, 1, 8, 13, 'fs2')
    v += box(1, 1, -2, 1, 8, 12, 'vest') + box(-2, -2, -2, 1, 9, 12, 'vest2')          # survival vest
    v += [(2, -2, 9, 'pouch'), (2, -2, 10, 'pouch'), (2, 1, 9, 'pouch'), (2, 1, 10, 'pouch'), (2, -1, 8, 'pouch')]
    v += [(1, -2, 12, 'patch'), (1, -1, 13, 'fs'), (1, 0, 13, 'fs')]
    v += box(-1, 1, -1, 0, 14, 15, 'skin') + [(-1, -1, 14, 'skin2')]
    # helmet
    v += box(-2, 1, -2, 1, 16, 17, 'helm') + box(-1, 0, -1, 0, 18, 18, 'helm') + box(-2, -2, -2, 1, 14, 15, 'helm2')
    v += box(-1, 0, -2, -2, 14, 15, 'helm2') + box(-1, 0, 1, 1, 14, 15, 'helm2')
    if p.get('visor', True):
        v += box(2, 2, -1, 0, 16, 16, 'visor') + [(2, 0, 16, 'vglint')]
    else:
        v += box(2, 2, -1, 0, 17, 17, 'visor')
    v += [(2, -1, 14, 'mask'), (2, 0, 14, 'mask'), (1, 1, 13, 'hose')]
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), 'fs') + arm((0, -3, 13), lh, (-3,), 'fs')
    v += [(round(rh[0]), round(rh[1]), round(rh[2]), 'glove'), (round(lh[0]), round(lh[1]), round(lh[2]), 'glove')]
    g = p.get('gun', 'holster')
    if g == 'hand':
        v += pistol(rh, p.get('recoil', 0), p.get('gun_up', False))
    elif g == 'holster':
        v += [(2, 0, 11, 'radio'), (2, 0, 12, 'radio')]                                  # chest holster
    if p.get('radio'):
        x, y, z = [round(k) for k in lh]
        v += [(x, y, z + 1, 'radio'), (x, y, z + 2, 'radio'), (x, y, z + 3, 'led' if p['radio'] > 1 else 'radio')]
    v += p.get('uextra', [])
    return v


rig.upper = upper

REST = dict(rh=(0, 2, 8), lh=(0, -3, 8))
AIM = dict(rh=(5, 0, 12), lh=(4, -1, 11))

IDLE = [F(**REST), F(**REST), F(rh=(0, 2, 9), lh=(0, -3, 9)), F(rh=(0, 2, 9), lh=(0, -3, 9))]
WALK = kit.walk(lambda sw, i: dict(rh=(sw, 2, 8), lh=(-sw, -3, 8)))
RUN = kit.run(lambda sw, i: dict(rh=(1 + sw, 2, 10), lh=(1 - sw, -3, 10)))

wave = lambda k: [(1 - k, -5 - k, 18 + k, 'wave'), (0 - k, -5 - k, 19 + k, 'wave'), (-1 - k, -5 - k, 18 + k, 'wave')]
RADIO = [F(rh=(0, 2, 8), lh=(1, -2, 13), radio=1),
         F(rh=(1, 5, 16), lh=(1, -2, 13), radio=2, extra=wave(0)),
         F(rh=(0, 6, 20), lh=(1, -2, 13), radio=1, extra=wave(1)),
         F(rh=(-1, 6, 21), lh=(1, -2, 13), radio=2, extra=wave(0) + wave(2))]

LADDER = box(4, 4, -3, -3, 0, 24, 'lad') + box(4, 4, 2, 2, 0, 24, 'lad') + \
    [v for z in range(2, 25, 4) for v in box(4, 4, -2, 1, z, z, 'lad')]
BOARD = [F(**REST, extra=LADDER),
         F(rh=(2, 2, 17), lh=(2, -3, 15), L=(30, -40), R=(0, 0), extra=LADDER),
         F(rh=(2, 2, 15), lh=(2, -3, 17), L=(0, 0), R=(40, -60), dz=3, extra=LADDER),
         F(rh=(2, 2, 17), lh=(2, -3, 15), L=(45, -70), R=(0, -10), dz=6, extra=LADDER),
         F(rh=(2, 2, 15), lh=(2, -3, 17), L=(0, -10), R=(45, -70), dz=9, lean=8, extra=LADDER)]


def canopy(top, open_=1.0):
    """Parachute canopy in world coords with crown at z=top; open_ < 1 = partly inflated bundle."""
    if open_ < 1:
        return box(-1, 0, -2, 1, top - 1, top, 'can2') + box(-1, 0, -1, 0, top + 1, top + 1, 'can1')
    v = []
    for y in range(-5, 5):
        z = top if -3 <= y <= 2 else top - 1 if y in (-4, 3) else top - 2
        for x in range(-3, 3):
            v.append((x, y, z, 'can1' if (y // 2) % 2 else 'can2'))
    return v


def chute(dz, open_=1.0, hands=((0, 2, 18), (0, -3, 18))):
    top = 25 + dz
    v = canopy(top, open_)
    if open_ >= 1:
        for (hx, hy, hz), ey in zip(hands, (4, -5)):
            v += line((hx, hy, hz + 1 + dz), (0, ey, top - 2), 'cord')
    return v


UP = dict(rh=(0, 2, 18), lh=(0, -3, 18))
SEAT = box(-3, 1, -2, 1, 4, 4, 'seat') + box(-3, -3, -2, 1, 5, 12, 'seat') + box(-4, -4, -2, 1, 4, 13, 'seat2')
fire = lambda z: [(-1, 0, z, 'f1'), (-1, -1, z, 'f2'), (-2, 0, z - 1, 'f2'), (-1, 0, z - 2, 'f3'), (-2, -1, z - 2, 'f3')]
EJECT = [F(rh=(2, 2, 9), lh=(2, -3, 9), L=(90, -90), R=(90, -90), plant=False, dz=6,
           extra=[(x, y, z + 6, c) for x, y, z, c in SEAT] + fire(9)),
         F(**UP, L=(10, -6), R=(-6, -4), dz=4, extra=chute(4, 0.5)),
         F(**UP, L=(8, -10), R=(-4, -4), dz=3, extra=chute(3)),
         F(**UP, L=(6, -8), R=(-2, -6), dz=2, extra=chute(2)),
         F(**UP, L=(4, -6), R=(0, -4), dz=0, extra=chute(0)),
         F(rh=(2, 2, 10), lh=(2, -3, 10), L=(60, -100), R=(30, -70), lean=10,
           extra=box(-8, -4, -4, 3, 0, 0, 'can1') + box(-7, -5, -3, 2, 1, 1, 'can2') + line((1, 2, 10), (-4, 3, 1), 'cord'))]

SHOOT = [F(**AIM, gun='hand'),
         F(rh=(5, 0, 13), lh=(4, -1, 12), gun='hand', recoil=-1, extra=flash((5, 0, 12)) + [(5, 3, 15, 'brass')]),
         F(rh=(5, 0, 12), lh=(4, -1, 11), gun='hand', extra=flash((5, 0, 12), False) + [(4, 4, 13, 'brass')]),
         F(**AIM, gun='hand', extra=[(3, 5, 4, 'brass')])]

HURT = kit.hurt(dict(rh=(3, 0, 9), lh=(2, -1, 11)), gun='hand')
dropped = box(6, 9, 1, 1, 0, 0, 'slide') + [(6, 1, 1, 'pistol')]
DEATH = kit.death(dict(gun='hand'), dropped, gun=None)

ROWS = [('IDLE', IDLE), ('ANDAR', WALK), ('CORRER', RUN), ('RÁDIO / SINALIZAR', RADIO), ('EMBARCAR', BOARD),
        ('EJETAR / PARAQUEDAS', EJECT), ('ATIRAR', SHOOT), ('FERIDO', HURT), ('MORTE', DEATH)]
if __name__ == '__main__':
    rig.export(ROWS, {'EMBARCAR', 'EJETAR / PARAQUEDAS', 'MORTE'}, 'pilot')
