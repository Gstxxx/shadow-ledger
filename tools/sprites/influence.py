"""Agente de Influencia (elegant wine dress-coat, no gun): isometric voxel animation set, facing SE."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig, kit
from rig import box, arm, F
from kit import line

rig.C.update({
    'coat': (96, 34, 50), 'coat2': (70, 24, 36), 'lapel': (40, 16, 24), 'blk': (26, 24, 30), 'silk': (236, 226, 210),
    'goldA': (232, 190, 80), 'hairS': (24, 20, 22), 'hairS2': (54, 46, 48),
    'case': (30, 30, 34), 'case2': (52, 52, 58), 'clasp': (230, 190, 90), 'cash': (60, 140, 70), 'cash2': (120, 200, 110),
    'phone': (24, 24, 28), 'phoneS': (120, 200, 240), 'gold': (255, 210, 90), 'gold2': (255, 240, 170),
    'npc': (78, 82, 92), 'npc2': (58, 62, 70), 'npcE': (230, 70, 60), 'flag': (246, 246, 240), 'pole': (120, 96, 70),
    'whisp': (220, 200, 255),
})
rig.EMISSIVE |= {'gold', 'gold2', 'phoneS', 'npcE', 'whisp', 'cash2'}
rig.C['pants'] = rig.C['blk']; rig.C['pants2'] = (20, 18, 24)
rig.C['shoe'] = (16, 14, 16); rig.C['shoe2'] = (90, 80, 70)


def briefcase(hand, open_=0):
    x, y, z = [round(k) for k in hand]
    if not open_:
        return box(x - 1, x + 1, y, y, z - 3, z - 1, 'case') + [(x, y, z - 1, 'clasp'), (x, y, z, 'case2')]
    # opened, held flat in front: base + lid up + cash bricks
    v = box(x, x + 3, y - 1, y + 1, z, z, 'case') + box(x + 4, x + 4, y - 1, y + 1, z + 1, z + 3, 'case2')
    v += box(x + 1, x + 3, y - 1, y + 1, z + 1, z + 1, 'cash') + [(x + 2, y, z + 1, 'cash2')]
    return v


def upper(p):
    v = box(-1, 0, -2, 1, 7, 7, 'coat2')
    v += box(-1, 0, -2, 1, 8, 13, 'coat') + box(-2, -2, -2, 1, 8, 13, 'coat2')
    v += box(-2, -1, -2, 1, 4, 6, 'coat2') + box(0, 0, -2, -2, 4, 6, 'coat') + box(0, 0, 1, 1, 4, 6, 'coat')  # long tails
    v += box(1, 1, -2, -2, 7, 12, 'lapel') + box(1, 1, 1, 1, 7, 12, 'lapel')
    v += box(1, 1, -1, 0, 8, 13, 'blk') + [(1, -1, 12, 'silk'), (1, 0, 12, 'silk'), (1, 0, 11, 'goldA'), (1, -2, 11, 'silk')]
    v += [(1, -2, 7, 'goldA'), (1, 1, 7, 'goldA')]                                         # gold buttons
    v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2')
    v += box(-2, 1, -2, 1, 17, 17, 'hairS') + box(-2, -2, -2, 1, 14, 16, 'hairS') + box(-1, 0, -2, 1, 16, 16, 'hairS2')
    v += [(2, -1, 15, 'blk'), (2, 0, 15, 'blk'), (1, 1, 14, 'goldA')]                    # eyes + earring
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), 'coat') + arm((0, -3, 13), lh, (-3,), 'coat')
    it = p.get('item')
    if it == 'case':
        v += briefcase(lh)
    elif it == 'open':
        v += briefcase(lh, 1)
    elif it == 'phone':
        x, y, z = [round(k) for k in rh]
        v += [(x, y, z + 1, 'phone'), (x + 1, y, z + 1, 'phoneS')] + briefcase(lh)
    v += p.get('uextra', [])
    return v


rig.upper = upper

HOLD = dict(rh=(0, 2, 8), lh=(0, -3, 9), item='case')
IDLE = [F(**HOLD), F(**HOLD), F(rh=(1, 2, 9), lh=(0, -3, 9), item='case'), F(rh=(1, 2, 9), lh=(0, -3, 9), item='case')]
WALK = kit.walk(lambda sw, i: dict(rh=(1 + sw, 2, 8), lh=(-sw, -3, 9), item='case'))
RUN = kit.run(lambda sw, i: dict(rh=(1 + sw, 2, 10), lh=(1 - sw, -3, 10), item='case'), lean=10)

spark = lambda k: [(5 + k, 3 - k, 15 + k, 'gold'), (6, -3 + k, 17 - k, 'gold2'), (7 - k, 1, 13 + k, 'gold'), (8, -1 - k, 16 + k, 'gold2')]
PERSUADE = [F(rh=(2, 2, 11), lh=(2, -3, 11)),
            F(rh=(4, 4, 12), lh=(3, -4, 11), extra=spark(0)),
            F(rh=(4, 2, 13), lh=(4, -5, 12), lean=4, extra=spark(1)),
            F(rh=(3, 4, 11), lh=(3, -3, 12), extra=spark(2))]

bill = lambda x, y, z: [(x, y, z, 'cash'), (x + 1, y, z, 'cash2')]
BRIBE = [F(**HOLD),
         F(rh=(2, 1, 10), lh=(2, -2, 10), item='case'),
         F(rh=(3, 1, 10), lh=(2, -1, 9), item='open'),
         F(rh=(5, 2, 13), lh=(2, -1, 9), item='open', extra=bill(8, 2, 14) + bill(7, 0, 17)),
         F(rh=(6, 2, 14), lh=(2, -1, 9), item='open', extra=bill(10, 1, 16) + bill(9, -2, 19) + bill(11, 3, 13) + spark(1)[:2])]

whisper = lambda k: [(3 + k, 2 + k, 16, 'whisp'), (4 + k, 3 + k, 17, 'whisp')]
WHISPER = [F(rh=(1, 1, 15), lh=(0, -3, 9), item='phone'),
           F(rh=(1, 1, 15), lh=(0, -3, 9), item='phone', extra=[(2, 3, 17, 'phoneS')]),
           F(rh=(2, 3, 15), lh=(0, -3, 9), item='case', lean=8, extra=whisper(0)),
           F(rh=(2, 3, 15), lh=(0, -3, 9), item='case', lean=8, extra=whisper(1))]


def npc(flag=0):
    """Stand-in enemy to the agent's right (screen right), slumping once convinced."""
    x0, y0 = 1, -7
    v = box(x0, x0 + 1, y0, y0, 0, 6, 'npc2') + box(x0, x0 + 1, y0 - 1, y0 - 1, 0, 6, 'npc2')
    v += box(x0, x0 + 1, y0 - 1, y0 + 1, 7, 12, 'npc') + box(x0, x0 + 1, y0 - 1, y0, 13, 15, 'npc2')
    v += [(x0 + 2, y0, 14, 'npcE')] if not flag else []
    if flag:
        v += box(x0 + 2, x0 + 2, y0 - 1, y0 - 1, 9, 18 + flag, 'pole') + box(x0 + 2, x0 + 2, y0 - 4, y0 - 2, 15 + flag, 18 + flag, 'flag')
    return v


CONV = [F(rh=(0, 2, 8), lh=(0, -4, 11), extra=npc()),
        F(rh=(0, 2, 8), lh=(1, -5, 14), extra=npc()),
        F(rh=(2, 2, 11), lh=(1, -5, 14), extra=npc(1) + [(5, -4, 19, 'gold'), (3, -8, 21, 'gold2')]),
        F(rh=(3, 3, 12), lh=(1, -5, 14), extra=npc(2) + [(4, -5, 20, 'gold2'), (2, -9, 22, 'gold'), (6, -6, 18, 'gold')])]

PALMS = dict(rh=(4, 2, 13), lh=(4, -3, 13))
BACK = [F(L=(th, -16 if th < 0 else -4), R=(-th, -16 if th > 0 else -4), dx=d, lean=-6, **PALMS)
        for th, d in ((-16, 0), (10, -1), (-16, -2), (10, -3))]

KN = dict(L=(80, -80), R=(-15, -105))
DEFEAT = [F(**HOLD),
          F(rh=(1, 2, 7), lh=(1, -3, 7), lean=8, extra=briefcase((4, 1, 3))),
          F(**KN, rh=(2, 2, 9), lh=(2, -3, 9), lean=10, extra=briefcase((4, 1, 3)) + bill(5, -3, 0)),
          F(**KN, rh=(1, 1, 16), lh=(1, -2, 16), lean=8, extra=briefcase((4, 1, 3)) + bill(5, -3, 0) + bill(3, 3, 0)),
          F(**KN, rh=(1, 1, 16), lh=(1, -2, 16), lean=14, extra=briefcase((4, 1, 3)) + bill(5, -3, 0) + bill(3, 3, 0))]

ROWS = [('IDLE', IDLE), ('ANDAR', WALK), ('CORRER', RUN), ('PERSUADIR', PERSUADE), ('SUBORNAR', BRIBE),
        ('SUSSURRAR / TELEFONE', WHISPER), ('INIMIGO CONVENCIDO', CONV), ('RECUAR', BACK), ('DERROTA', DEFEAT)]
if __name__ == '__main__':
    rig.export(ROWS, {'SUBORNAR', 'INIMIGO CONVENCIDO', 'DERROTA'}, 'influence')
