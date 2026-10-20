"""Police officer (navy uniform, cap, badge, reflective vest stripe, pistol, cuffs, riot shield): voxel set, facing SE."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig, kit
from rig import box, arm, F, pistol
from kit import flash

rig.C.update({
    'pol': (40, 52, 92), 'pol2': (28, 36, 66), 'pvest': (30, 34, 44), 'pvest2': (22, 24, 32), 'stripe': (226, 230, 214),
    'badge': (232, 196, 90), 'cap': (30, 38, 70), 'brim': (16, 18, 24), 'belt': (18, 18, 22), 'cuff': (196, 200, 210),
    'radio': (30, 32, 34), 'hairP': (60, 42, 30), 'shield': (60, 84, 116), 'shield2': (110, 140, 170), 'sframe': (30, 32, 38),
    'spark': (255, 250, 220), 'blue': (70, 130, 255),
})
rig.EMISSIVE |= {'spark', 'blue'}
rig.C['pants'] = rig.C['pol2']; rig.C['pants2'] = (24, 30, 54)
rig.C['shoe'] = (14, 14, 16); rig.C['shoe2'] = (60, 60, 66)


def cuffs(x, y, z, open_=True):
    v = [(x, y, z, 'cuff'), (x + 1, y, z, 'cuff'), (x, y, z + 1, 'cuff')]
    if open_:
        v += [(x + 2, y, z - 1, 'cuff'), (x + 3, y, z - 1, 'cuff'), (x + 3, y, z, 'cuff')]
    else:
        v += [(x + 1, y, z + 1, 'cuff'), (x + 2, y, z, 'cuff')]
    return v


def shield(hand, push=0):
    x = round(hand[0]) + 1 + push
    v = box(x, x, -4, 2, 3, 15, 'shield') + box(x, x, -4, 2, 16, 16, 'sframe') + box(x, x, -4, 2, 2, 2, 'sframe')
    v += box(x, x, -4, -4, 3, 15, 'sframe') + box(x, x, 2, 2, 3, 15, 'sframe')
    v += box(x, x, -3, 1, 12, 12, 'stripe') + box(x, x, -2, 0, 14, 14, 'shield2')
    return v


def upper(p):
    v = box(-1, 0, -2, 1, 7, 7, 'belt') + [(1, -2, 7, 'cuff'), (1, 1, 7, 'radio'), (-1, 2, 7, 'belt')]
    v += box(-1, 0, -2, 1, 8, 13, 'pol') + box(-2, -2, -2, 1, 8, 13, 'pol2')
    v += box(1, 1, -2, 1, 8, 12, 'pvest') + box(-2, -2, -2, 1, 9, 12, 'pvest2')           # vest
    v += box(1, 1, -2, 1, 10, 10, 'stripe') + box(-2, -2, -2, 1, 10, 10, 'stripe')         # POLICE band
    v += [(1, -2, 12, 'badge'), (1, 1, 12, 'radio'), (1, 1, 13, 'radio'), (1, -1, 13, 'pol'), (1, 0, 13, 'pol')]
    v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2') + box(-2, -2, -2, 1, 14, 15, 'hairP')
    v += [(2, -1, 15, 'brim'), (2, 0, 15, 'brim')] if p.get('shades') else []
    # cap with brim and badge
    v += box(-2, 1, -2, 1, 17, 17, 'cap') + box(-1, 1, -2, 1, 18, 18, 'cap') + box(2, 3, -1, 0, 17, 17, 'brim') + [(2, 0, 18, 'badge')]
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), 'pol') + arm((0, -3, 13), lh, (-3,), 'pol')
    g = p.get('gun', 'holster')
    if g == 'hand':
        v += pistol(rh, p.get('recoil', 0), p.get('gun_up', False))
    elif g == 'holster':
        v += box(-1, -1, 2, 2, 6, 7, 'radio')
    if p.get('cuffs'):
        x, y, z = [round(k) for k in rh]
        v += cuffs(x, y, z + 1, p['cuffs'] == 1)
    if p.get('shield') is not None:
        v += shield(lh, p['shield'])
    v += p.get('uextra', [])
    return v


rig.upper = upper

BELT = dict(rh=(1, 2, 8), lh=(1, -3, 8))
AIM = dict(rh=(5, 0, 12), lh=(4, -1, 11))
LOW = dict(rh=(3, 0, 9), lh=(3, -1, 9))

IDLE = [F(**BELT), F(**BELT), F(rh=(1, 2, 9), lh=(1, -3, 9)), F(rh=(1, 2, 9), lh=(1, -3, 9))]
WALK = kit.walk(lambda sw, i: dict(rh=(sw, 2, 8), lh=(-sw, -3, 8)))
RUN = kit.run(lambda sw, i: dict(rh=(1 + sw, 2, 10), lh=(1 - sw, -3, 10)))
DRAW = [F(rh=(0, 2, 8), lh=(2, -1, 10)), F(rh=(1, 1, 9), lh=(3, -1, 10), gun='hand', gun_up=True),
        F(**LOW, gun='hand'), F(**AIM, gun='hand')]
SHOOT = [F(**AIM, gun='hand'),
         F(rh=(5, 0, 13), lh=(4, -1, 12), gun='hand', recoil=-1, extra=flash((5, 0, 12)) + [(5, 3, 15, 'brass')]),
         F(rh=(5, 0, 12), lh=(4, -1, 11), gun='hand', extra=flash((5, 0, 12), False) + [(4, 4, 13, 'brass')]),
         F(**AIM, gun='hand', extra=[(3, 5, 4, 'brass')])]
click = [(8, 0, 11, 'spark'), (9, 1, 12, 'spark'), (9, -1, 10, 'spark'), (10, 0, 12, 'blue')]
CUFF = [F(rh=(1, 2, 8), lh=(1, -3, 8), cuffs=1),
        F(rh=(3, 1, 10), lh=(4, -2, 9), cuffs=1, lean=6),
        F(rh=(5, 1, 10), lh=(5, -1, 9), cuffs=1, lean=12, L=(14, -6), R=(-12, -8)),
        F(rh=(5, 0, 9), lh=(5, -1, 9), cuffs=2, lean=12, L=(14, -6), R=(-12, -8), extra=click)]
hits = lambda: [(7, -2, 13, 'spark'), (8, -1, 14, 'f2'), (7, 1, 9, 'spark'), (8, 0, 10, 'f2')]
SHIELD = [F(rh=(2, 1, 10), lh=(2, -2, 8), shield=0, gun='hand'),
          F(rh=(3, 1, 12), lh=(3, -2, 10), shield=0, gun='hand'),
          F(rh=(3, 1, 12), lh=(3, -2, 10), shield=0, gun='hand', lean=-4, extra=hits()),
          F(rh=(4, 1, 12), lh=(4, -2, 10), shield=0, gun='hand', lean=8, dx=1, L=(16, -6), R=(-14, -8))]
HURT = kit.hurt(dict(LOW), gun='hand')
dropped = box(6, 9, 1, 1, 0, 0, 'slide') + [(6, 1, 1, 'pistol')]
DEATH = kit.death(dict(gun='hand'), dropped, gun=None)

ROWS = [('IDLE', IDLE), ('ANDAR', WALK), ('CORRER', RUN), ('MIRAR', DRAW), ('ATIRAR', SHOOT),
        ('ALGEMAR', CUFF), ('ESCUDO', SHIELD), ('FERIDO', HURT), ('MORTE', DEATH)]
if __name__ == '__main__':
    rig.export(ROWS, {'MIRAR', 'ALGEMAR', 'MORTE'}, 'police')
