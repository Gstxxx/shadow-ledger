"""Legal combat character (lawyer): full isometric voxel animation set, facing SE."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from rig import box, arm, F

rig.C.update({
    'navy': (40, 52, 84), 'navy2': (30, 40, 66), 'vest': (60, 66, 80), 'shirtB': (210, 222, 236), 'tieG': (176, 140, 50),
    'hairG': (150, 146, 140), 'hairG2': (116, 112, 108), 'glassF': (40, 34, 30), 'lens': (170, 210, 230),
    'case': (96, 60, 36), 'case2': (70, 44, 26), 'clasp': (210, 180, 90), 'paper': (236, 232, 220), 'paper2': (200, 196, 186),
    'phone': (24, 24, 28), 'phoneS': (120, 200, 240), 'gold': (255, 210, 90), 'gold2': (255, 240, 170),
    'red2': (220, 70, 60), 'stamp': (190, 40, 40),
})
rig.EMISSIVE |= {'phoneS', 'gold', 'gold2', 'red2'}
rig.C['pants'] = rig.C['navy']; rig.C['pants2'] = rig.C['navy2']
rig.C['shoe'] = (60, 36, 22); rig.C['shoe2'] = (110, 72, 44)


def case(hand, open_=False):
    x, y, z = [round(k) for k in hand]
    if open_:
        return box(x, x + 3, y - 1, y, z, z, 'case') + box(x, x + 3, y - 1, y - 1, z + 1, z + 2, 'case2') + \
               box(x + 1, x + 2, y, y, z + 1, z + 1, 'paper')
    return box(x - 1, x + 1, y, y, z - 3, z - 1, 'case') + [(x, y, z - 1, 'clasp'), (x, y, z, 'case2')]


def doc(hand, n=1):
    x, y, z = [round(k) for k in hand]
    v = box(x, x, y, y, z + 1, z + 3, 'paper') + [(x, y, z + 2, 'paper2')]
    if n > 1:
        v += box(x + 1, x + 1, y, y, z, z + 2, 'paper')
    return v


def upper(p):
    v = box(-1, 0, -2, 1, 7, 7, 'navy2')
    v += box(-1, 0, -2, 1, 8, 13, 'navy') + box(-2, -2, -2, 1, 9, 13, 'navy2')
    v += box(1, 1, -2, -2, 8, 12, 'navy') + box(1, 1, 1, 1, 8, 12, 'navy')
    v += box(1, 1, -1, 0, 10, 13, 'shirtB') + box(1, 1, -1, 0, 8, 9, 'vest') + box(1, 1, 0, 0, 10, 12, 'tieG')
    v += [(1, -2, 12, 'red2')]                                                       # pocket square
    v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2')
    v += box(-2, 0, -2, 1, 17, 17, 'hairG') + box(-2, -2, -2, 1, 14, 16, 'hairG2') + box(-1, 1, -2, 1, 16, 16, 'hairG')
    v += [(2, -1, 15, 'lens'), (2, 0, 15, 'lens'), (2, -1, 16, 'glassF'), (2, 0, 16, 'glassF'), (1, 1, 15, 'glassF')]
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), 'navy') + arm((0, -3, 13), lh, (-3,), 'navy')
    it = p.get('item')
    if it == 'case':
        v += case(lh)
    elif it == 'case_r':
        v += case(rh)
    elif it == 'doc':
        v += doc(rh) + case(lh)
    elif it == 'phone':
        v += [(round(rh[0]), round(rh[1]), round(rh[2]) + 1, 'phone'), (round(rh[0]) + 1, round(rh[1]), round(rh[2]) + 1, 'phoneS')] + case(lh)
    v += p.get('uextra', [])
    return v


rig.upper = upper

HOLD = dict(rh=(0, 2, 8), item='case', lh=(0, -3, 9))
IDLE = [F(**HOLD), F(**HOLD), F(rh=(0, 2, 9), lh=(0, -3, 9), item='case'), F(rh=(0, 2, 9), lh=(0, -3, 9), item='case')]
WALK = [F(L=(th, -4 if th > 0 else -16), R=(-th, -4 if th < 0 else -16), rh=(1 + sw, 2, 8), lh=(-sw, -3, 9), item='case')
        for th, sw in ((22, 1), (10, 0), (-6, -1), (-22, -1), (-10, 0), (6, 1))]
fly = lambda x, y, z: [(x, y, z, 'paper'), (x + 1, y, z, 'paper2')]
RUN = [F(L=(th, -32 if th < 0 else -8), R=(-th, -32 if th > 0 else -8), rh=(1 + sw, 2, 10), lh=(1 - sw, -3, 10),
         item='case', lean=12, dz=1 if abs(th) < 20 else 0, extra=fly(-4 - i, 2, 12 - i))
       for i, (th, sw) in enumerate(((38, 2), (18, 1), (-10, -1), (-38, -2), (-18, -1), (10, 1)))]
EVID = [F(rh=(2, 1, 9), lh=(2, -2, 9), item=None, uextra=case((2, -2, 9), True)),
        F(rh=(3, 0, 10), lh=(2, -2, 9), item=None, uextra=case((2, -2, 9), True) + doc((3, 0, 10))),
        F(rh=(4, 0, 13), lh=(1, -3, 9), item=None, uextra=doc((4, 0, 13), 2)),
        F(rh=(4, 0, 14), lh=(1, -3, 9), item=None, uextra=doc((4, 0, 14), 2), extra=[(7, 0, 18, 'gold'), (6, 1, 19, 'gold2'), (8, -1, 17, 'gold2')])]
bang = lambda: [(8, 0, 17, 'red2'), (8, 0, 16, 'red2'), (8, 0, 15, 'red2'), (8, 0, 13, 'red2'), (9, 1, 18, 'gold'), (7, -1, 18, 'gold')]
OBJ = [F(**HOLD),
       F(rh=(3, 1, 12), lh=(0, -3, 9), item='case', lean=6),
       F(rh=(6, 0, 14), lh=(0, -3, 9), item='case', lean=10, L=(14, -6), R=(-12, -8), extra=bang()),
       F(rh=(6, 0, 14), lh=(0, -3, 9), item='case', lean=10, L=(14, -6), R=(-12, -8), extra=bang()[:4])]
ARGUE = [F(rh=(3, 2, 11), lh=(3, -3, 11), item=None), F(rh=(4, 3, 12), lh=(2, -4, 10), item=None),
         F(rh=(2, 1, 12), lh=(4, -2, 12), item=None), F(rh=(3, 3, 10), lh=(3, -4, 12), item=None)]
PHONE = [F(rh=(1, 1, 15), lh=(0, -3, 9), item='phone'), F(rh=(1, 1, 15), lh=(0, -3, 9), item='phone', extra=[(2, 3, 17, 'phoneS')]),
         F(rh=(1, 1, 15), lh=(0, -3, 9), item='phone', extra=[(2, 3, 18, 'phoneS'), (3, 4, 19, 'phoneS')])]
spark = lambda k: [(4 + k, 2 - k, 14 + k, 'gold'), (5, -2 + k, 16 - k, 'gold2'), (6 - k, 1, 13 + k, 'gold')]
PERSUADE = [F(rh=(2, 1, 12), lh=(2, -2, 12), item=None), F(rh=(4, 2, 11), lh=(4, -3, 11), item=None, extra=spark(0)),
            F(rh=(4, 3, 11), lh=(4, -4, 11), item=None, extra=spark(1)), F(rh=(3, 2, 11), lh=(3, -3, 11), item=None, extra=spark(2))]
scatter = [(4, 2, 0, 'paper'), (6, -1, 0, 'paper'), (3, 4, 0, 'paper2'), (7, 3, 0, 'paper'), (5, 0, 1, 'paper')]
DEFEAT = [F(**HOLD), F(rh=(1, 2, 7), lh=(1, -3, 7), item=None, lean=8, extra=case((4, 1, 3)) + [(4, 2, 4, 'paper'), (6, -1, 6, 'paper')]),
          F(rh=(1, 2, 6), lh=(1, -3, 6), item=None, lean=20, L=(30, -60), R=(20, -50), extra=case((4, 1, 3)) + scatter),
          F(rh=(2, 2, 5), lh=(2, -3, 5), item=None, lean=30, L=(70, -120), R=(60, -110), extra=case((4, 1, 3)) + scatter)]
WIN = [F(**HOLD), F(rh=(1, 2, 12), lh=(0, -3, 9), item='case'),
       F(rh=(1, 2, 18), lh=(0, -3, 9), item='case', dz=1, extra=[(2, 3, 20, 'gold'), (0, 1, 21, 'gold2'), (3, 0, 19, 'gold')]),
       F(rh=(1, 2, 17), lh=(0, -3, 9), item='case', extra=[(2, 3, 21, 'gold2'), (0, 1, 22, 'gold')])]

ROWS = [('IDLE', IDLE), ('ANDAR', WALK), ('CORRER', RUN), ('APRESENTAR PROVA', EVID), ('OBJEÇÃO!', OBJ),
        ('ARGUMENTAR', ARGUE), ('LIGAÇÃO', PHONE), ('PERSUADIR', PERSUADE), ('DERROTA / VITÓRIA', DEFEAT + WIN)]
if __name__ == "__main__":
    rig.export(ROWS, {"APRESENTAR PROVA", "OBJEÇÃO!", "DERROTA / VITÓRIA"}, 'legal')
