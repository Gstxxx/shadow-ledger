"""Female variants: bodyguard (fitted suit, hair bun, shades, pistol) and lawyer (skirt suit, long hair). Facing SE."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig, kit
from rig import box, arm, F, pistol
from kit import flash

rig.C.update({
    'gsuit': (36, 38, 46), 'gsuit2': (26, 28, 34), 'gshirt': (214, 218, 226), 'hairK': (30, 24, 22), 'hairK2': (52, 40, 34),
    'shades': (16, 18, 22), 'ear': (200, 204, 214), 'lips': (170, 52, 62),
    'lsuit': (124, 44, 56), 'lsuit2': (96, 32, 42), 'lblouse': (240, 234, 222), 'hairL': (150, 84, 44), 'hairL2': (118, 62, 32),
    'glassF': (40, 34, 30), 'lens': (170, 210, 230), 'case': (112, 66, 40), 'case2': (84, 48, 28), 'clasp': (220, 186, 90),
    'paper': (236, 232, 220), 'paper2': (200, 196, 186), 'gold': (255, 210, 90), 'gold2': (255, 240, 170), 'red2': (220, 70, 60),
})
rig.EMISSIVE |= {'gold', 'gold2', 'red2'}
rig.C['skin'] = (222, 172, 136); rig.C['skin2'] = (194, 140, 106)
LEGS = {'guarda': ((40, 42, 50), (30, 32, 40), (18, 18, 22), (70, 70, 76)),
        'advogada': ((214, 168, 134), (190, 146, 114), (60, 20, 26), (120, 40, 50))}


def set_legs(var):
    rig.C['pants'], rig.C['pants2'], rig.C['shoe'], rig.C['shoe2'] = LEGS[var]


def case(hand):
    x, y, z = [round(k) for k in hand]
    return box(x - 1, x + 1, y, y, z - 3, z - 1, 'case') + [(x, y, z - 1, 'clasp'), (x, y, z, 'case2')]


def doc(hand, n=1):
    x, y, z = [round(k) for k in hand]
    v = box(x, x, y, y, z + 1, z + 3, 'paper') + [(x, y, z + 2, 'paper2')]
    if n > 1:
        v += box(x + 1, x + 1, y, y, z, z + 2, 'paper')
    return v


def upper(p):
    var = p.get('var', 'guarda')
    if var == 'guarda':
        v = box(-1, 0, -2, 1, 7, 7, 'gsuit2')
        v += box(-1, 0, -2, 1, 8, 13, 'gsuit') + box(-2, -2, -2, 1, 9, 13, 'gsuit2')
        v += box(1, 1, -2, -2, 8, 12, 'gsuit') + box(1, 1, 1, 1, 8, 12, 'gsuit') + box(1, 1, -1, 0, 10, 13, 'gshirt')
        v += box(1, 1, -1, 0, 8, 9, 'gsuit2')                                               # buttoned fitted jacket
        v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2')
        v += box(-2, 0, -2, 1, 17, 17, 'hairK') + box(-2, -2, -2, 1, 14, 16, 'hairK') + box(-1, 1, -2, 1, 16, 16, 'hairK')
        v += box(-3, -3, -1, 0, 16, 17, 'hairK2') + [(-3, -1, 18, 'hairK2'), (-3, 0, 18, 'hairK2')]   # bun
        v += box(2, 2, -1, 0, 15, 15, 'shades') + [(2, 0, 15, 'glint'), (2, -1, 14, 'lips'), (0, 1, 15, 'ear'), (0, 1, 14, 'ear'), (-1, 1, 13, 'ear')]
        sl = 'gsuit'
    else:
        v = box(-1, 0, -2, 1, 7, 7, 'lsuit2')
        v += box(-1, 0, -2, 1, 8, 13, 'lsuit') + box(-2, -2, -2, 1, 9, 13, 'lsuit2')
        v += box(-2, 1, -2, 1, 4, 6, 'lsuit2') + box(1, 1, -2, 1, 4, 6, 'lsuit')             # skirt
        v += box(1, 1, -2, -2, 8, 12, 'lsuit') + box(1, 1, 1, 1, 8, 12, 'lsuit') + box(1, 1, -1, 0, 9, 13, 'lblouse')
        v += [(1, -2, 12, 'gold')] if False else [(1, -2, 12, 'clasp')]                     # brooch
        v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2')
        v += box(-2, 1, -2, 1, 17, 17, 'hairL') + box(-2, -2, -2, 1, 11, 16, 'hairL2') + box(-1, 0, -2, -2, 13, 16, 'hairL')
        v += box(-1, 0, 1, 1, 13, 16, 'hairL') + [(2, -1, 14, 'lips')]
        v += [(2, -1, 15, 'lens'), (2, 0, 15, 'lens'), (2, -1, 16, 'glassF'), (2, 0, 16, 'glassF')]
        sl = 'lsuit'
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), sl) + arm((0, -3, 13), lh, (-3,), sl)
    g = p.get('gun')
    if g == 'hand':
        v += pistol(rh, p.get('recoil', 0), p.get('gun_up', False))
    elif g == 'holster':
        v += box(-1, -1, 2, 2, 8, 9, 'pistol')
    it = p.get('item')
    if it == 'case':
        v += case(rh)
    elif it == 'doc':
        v += doc(rh, p.get('n', 1))
    v += p.get('uextra', [])
    return v


rig.upper = upper

# ---- bodyguard ----
set_legs('guarda')
G = dict(var='guarda')
CROSS = dict(rh=(2, 0, 9), lh=(2, -1, 9))
AIM = dict(rh=(5, 0, 12), lh=(4, -1, 11))
LOW = dict(rh=(3, 0, 9), lh=(3, -1, 9))
G_IDLE = [F(**G, **CROSS, gun='holster'), F(**G, **CROSS, gun='holster'),
          F(**G, rh=(2, 0, 10), lh=(2, -1, 10), gun='holster'), F(**G, rh=(2, 0, 10), lh=(2, -1, 10), gun='holster')]
G_WALK = kit.walk(lambda sw, i: dict(rh=(sw, 2, 8), lh=(-sw, -3, 8)), gun='holster', **G)
G_AIM = [F(**G, rh=(0, 2, 9), lh=(2, -1, 10), gun='holster'), F(**G, rh=(1, 1, 9), lh=(3, -1, 10), gun='hand', gun_up=True),
         F(**G, **LOW, gun='hand'), F(**G, **AIM, gun='hand')]
G_SHOOT = [F(**G, **AIM, gun='hand'),
           F(**G, rh=(5, 0, 13), lh=(4, -1, 12), gun='hand', recoil=-1, extra=flash((5, 0, 12)) + [(5, 3, 15, 'brass')]),
           F(**G, rh=(5, 0, 12), lh=(4, -1, 11), gun='hand', extra=flash((5, 0, 12), False) + [(4, 4, 13, 'brass')]),
           F(**G, **AIM, gun='hand', extra=[(3, 5, 4, 'brass')])]
dropped = box(6, 9, 1, 1, 0, 0, 'slide') + [(6, 1, 1, 'pistol')]
G_DEATH = kit.death(dict(gun='hand', **G), dropped, **G)

# ---- lawyer ----
set_legs('advogada')
A = dict(var='advogada')
HOLD = dict(rh=(0, 2, 9), lh=(0, -3, 8), item='case')
A_IDLE = [F(**A, **HOLD), F(**A, **HOLD), F(**A, rh=(0, 2, 10), lh=(0, -3, 9), item='case'), F(**A, rh=(0, 2, 10), lh=(0, -3, 9), item='case')]
ground_case = box(3, 5, 4, 4, 0, 2, 'case') + [(4, 4, 2, 'clasp')]
EVID = [F(**A, rh=(2, 3, 5), lh=(1, -3, 8), item='case', lean=14),
        F(**A, rh=(2, 2, 10), lh=(1, -3, 8), item='doc', extra=ground_case),
        F(**A, rh=(4, 1, 13), lh=(1, -3, 9), item='doc', n=2, extra=ground_case),
        F(**A, rh=(4, 1, 14), lh=(1, -3, 9), item='doc', n=2, extra=ground_case + [(7, 1, 19, 'gold'), (6, 2, 20, 'gold2'), (8, 0, 18, 'gold2')])]
bang = [(9, -6, 18, 'red2'), (9, -6, 17, 'red2'), (9, -6, 16, 'red2'), (9, -6, 14, 'red2'), (10, -5, 19, 'gold'), (8, -7, 19, 'gold')]
OBJ = [F(**A, **HOLD),
       F(**A, rh=(0, 2, 9), lh=(3, -4, 13), item='case', lean=4),
       F(**A, rh=(0, 2, 9), lh=(6, -5, 15), item='case', lean=8, L=(14, -6), R=(-12, -8), extra=bang),
       F(**A, rh=(0, 2, 9), lh=(6, -5, 15), item='case', lean=8, L=(14, -6), R=(-12, -8), extra=bang[:4])]
WIN = [F(**A, **HOLD), F(**A, rh=(0, 2, 9), lh=(1, -4, 13), item='case'),
       F(**A, rh=(0, 2, 10), lh=(1, -5, 19), item='case', dz=1, extra=[(2, -6, 21, 'gold'), (0, -4, 22, 'gold2'), (3, -3, 20, 'gold')]),
       F(**A, rh=(0, 2, 9), lh=(1, -5, 18), item='case', extra=[(2, -6, 22, 'gold2'), (0, -4, 23, 'gold'), (4, -7, 19, 'gold')])]

ROWS = [('GUARDA IDLE', G_IDLE), ('GUARDA ANDAR', G_WALK), ('GUARDA MIRAR', G_AIM), ('GUARDA ATIRAR', G_SHOOT),
        ('GUARDA MORTE', G_DEATH), ('ADVOGADA IDLE', A_IDLE), ('APRESENTAR PROVA', EVID), ('OBJEÇÃO!', OBJ), ('VITÓRIA', WIN)]
if __name__ == '__main__':
    rig.export(ROWS, {'GUARDA MIRAR', 'GUARDA MORTE', 'APRESENTAR PROVA', 'OBJEÇÃO!', 'VITÓRIA'}, 'women')
