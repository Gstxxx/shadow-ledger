"""The player's Director: long dark coat + scarf, plus the 6 Origens variants (ex-agente, banqueira, coronel,
diplomata, contrabandista, analista). Facing SE."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig, kit
from rig import box, arm, F, pistol
from kit import flash

rig.C.update({
    # base director
    'dcoat': (40, 42, 48), 'dcoat2': (28, 30, 36), 'scarf': (150, 30, 40), 'scarf2': (116, 22, 30), 'dsuit': (30, 30, 36),
    'dshirt': (214, 216, 222), 'hairD': (40, 36, 34), 'hairD2': (150, 150, 150), 'ring': (232, 196, 90),
    # ex-agente
    'trench': (150, 122, 80), 'trench2': (118, 94, 60), 'tbelt': (90, 70, 44), 'earp': (230, 240, 255), 'shadesA': (14, 16, 20),
    # banqueira
    'bsuit': (70, 84, 104), 'bsuit2': (52, 64, 82), 'blouse': (240, 236, 228), 'hairB': (98, 58, 34), 'hairB2': (74, 42, 24),
    'pearl': (246, 244, 236), 'lips': (176, 50, 60), 'case': (112, 66, 40), 'clasp': (220, 186, 90),
    # coronel
    'olive': (78, 86, 58), 'olive2': (60, 66, 44), 'beret': (150, 28, 34), 'beret2': (116, 20, 26), 'epaul': (220, 180, 80),
    'medR': (190, 40, 40), 'medB': (50, 90, 170), 'medG': (226, 190, 80), 'mous': (60, 44, 34),
    'order': (255, 220, 140),
    # diplomata
    'dip': (34, 38, 52), 'dip2': (26, 28, 40), 'sash': (120, 180, 230), 'sash2': (90, 146, 200), 'pin': (150, 210, 255),
    'dtie': (40, 60, 110), 'folder': (58, 40, 30), 'emb': (220, 186, 90),
    # contrabandista
    'lea': (104, 70, 44), 'lea2': (80, 52, 32), 'leaW': (136, 98, 66), 'tee': (52, 54, 52), 'cap': (82, 76, 64), 'cap2': (62, 58, 48),
    'stub': (120, 92, 76), 'duff': (66, 74, 58), 'duff2': (50, 56, 44), 'strap': (30, 28, 26),
    # analista
    'card': (70, 92, 96), 'card2': (54, 72, 76), 'collar': (226, 230, 236), 'hairN': (30, 24, 22), 'hairN2': (20, 16, 14),
    'specs': (214, 222, 236), 'tab': (36, 38, 44), 'scr': (110, 220, 235),
})
rig.EMISSIVE |= {'earp', 'order', 'pin', 'scr'}
LEGS = {
    'diretor': ((30, 30, 36), (24, 24, 30), (14, 14, 16), (70, 60, 50)),
    'agente': ((44, 44, 50), (34, 34, 40), (40, 26, 18), (90, 64, 44)),
    'banqueira': ((150, 112, 92), (130, 96, 78), (20, 18, 22), (150, 30, 40)),   # tights + heels
    'coronel': ((60, 66, 44), (48, 52, 36), (18, 18, 20), (70, 70, 74)),
    'diplomata': ((34, 38, 52), (26, 28, 40), (12, 12, 14), (60, 60, 66)),
    'contrabandista': ((58, 72, 96), (46, 58, 78), (54, 38, 26), (84, 62, 44)),     # jeans + botas
    'analista': ((62, 64, 72), (50, 52, 60), (30, 30, 34), (90, 90, 96)),
}


def set_legs(var):
    rig.C['pants'], rig.C['pants2'], rig.C['shoe'], rig.C['shoe2'] = LEGS[var]


def case(hand):
    x, y, z = [round(k) for k in hand]
    return box(x - 1, x + 1, y, y, z - 3, z - 1, 'case') + [(x, y, z - 1, 'clasp'), (x, y, z, 'case')]


def head(var):
    v = box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2')
    if var == 'diretor':
        v += box(-2, 0, -2, 1, 17, 17, 'hairD') + box(-2, -2, -2, 1, 14, 16, 'hairD') + box(-1, 1, -2, 1, 16, 16, 'hairD')
        v += [(-1, -2, 15, 'hairD2'), (-1, 1, 15, 'hairD2'), (2, -1, 15, 'dsuit'), (2, 0, 15, 'dsuit')]
        v += box(-2, -2, -3, 2, 13, 15, 'dcoat2')                                           # high collar
    elif var == 'agente':
        v += box(-2, 0, -2, 1, 17, 17, 'hairD') + box(-2, -2, -2, 1, 14, 16, 'hairD') + box(-1, 1, -2, 1, 16, 16, 'hairD')
        v += box(2, 2, -1, 0, 15, 15, 'shadesA') + [(0, 1, 15, 'earp'), (0, 1, 14, 'earp'), (-1, 1, 13, 'earp')]
        v += box(-2, -2, -3, 2, 13, 14, 'trench2')
    elif var == 'banqueira':
        v += box(-2, 1, -2, 1, 17, 17, 'hairB') + box(-2, -2, -2, 1, 11, 16, 'hairB2') + box(-1, 0, -2, -2, 14, 16, 'hairB')
        v += box(-1, 0, 1, 1, 14, 16, 'hairB') + [(2, -1, 15, 'hairB2'), (2, 0, 15, 'hairB2'), (2, -1, 14, 'lips'), (1, 1, 14, 'pearl')]
    elif var == 'diplomata':
        v += box(-2, 0, -2, 1, 17, 17, 'hairD') + box(-2, -2, -2, 1, 14, 16, 'hairD') + box(-1, 1, -2, 1, 16, 16, 'hairD')
        v += box(-1, 0, -2, -2, 14, 15, 'hairD2') + box(-1, 0, 1, 1, 14, 15, 'hairD2')          # têmporas grisalhas
        v += [(2, -1, 15, 'dsuit'), (2, 0, 15, 'dsuit')]
    elif var == 'contrabandista':
        v += box(-2, -2, -2, 1, 14, 15, 'hairD') + [(2, -1, 15, 'dsuit'), (2, 0, 15, 'dsuit')]
        v += [(2, -1, 14, 'stub'), (2, 0, 14, 'stub'), (1, -2, 14, 'stub'), (1, 1, 14, 'stub')]          # barba por fazer
        v += box(-2, 1, -2, 1, 17, 17, 'cap') + box(2, 2, -2, 1, 17, 17, 'cap2') + box(-1, 0, -2, 1, 18, 18, 'cap')  # boina + aba
    elif var == 'analista':
        v += box(-2, 1, -2, 1, 17, 17, 'hairN') + box(-2, -2, -2, 1, 13, 16, 'hairN2') + box(-1, 0, -2, -2, 13, 16, 'hairN')
        v += box(-1, 0, 1, 1, 13, 16, 'hairN') + [(2, -2, 16, 'hairN'), (2, 1, 16, 'hairN')]      # chanel com franja
        v += [(2, -1, 15, 'specs'), (2, 0, 15, 'specs'), (2, -1, 14, 'lips')]                   # óculos
    else:  # coronel
        v += box(-2, -2, -2, 1, 14, 15, 'hairD2') + [(2, -1, 14, 'mous'), (2, 0, 14, 'mous'), (2, -1, 15, 'dsuit'), (2, 0, 15, 'dsuit')]
        v += box(-2, 1, -2, 1, 17, 17, 'beret') + box(-1, 1, -3, -1, 18, 18, 'beret') + [(-1, -3, 17, 'beret2'), (0, 1, 17, 'beret2'), (1, 1, 18, 'medG')]
    return v


def upper(p):
    var = p.get('var', 'diretor')
    if var in ('diretor', 'agente'):
        c1, c2 = ('dcoat', 'dcoat2') if var == 'diretor' else ('trench', 'trench2')
        v = box(-1, 0, -2, 1, 7, 7, c2)
        v += box(-1, 0, -2, 1, 8, 13, c1) + box(-2, -2, -2, 1, 8, 13, c2)
        v += box(-2, -1, -2, 1, 2, 6, c2) + box(0, 0, -2, -2, 2, 6, c1) + box(0, 0, 1, 1, 2, 6, c1)   # long coat skirt
        v += box(1, 1, -2, -2, 7, 12, c1) + box(1, 1, 1, 1, 7, 12, c1)
        v += box(1, 1, -1, 0, 8, 13, 'dshirt' if var == 'agente' else 'dsuit')
        if var == 'diretor':
            v += box(1, 1, -2, 1, 13, 13, 'scarf') + box(0, 0, -2, 1, 13, 13, 'scarf') + box(2, 2, 0, 0, 8, 12, 'scarf2') + [(2, 0, 13, 'scarf')]
            v += [(1, -1, 12, 'dshirt')]
        else:
            v += box(1, 1, -2, 1, 8, 8, 'tbelt') + [(2, 1, 8, 'clasp'), (1, 0, 12, 'scarf2'), (1, 0, 11, 'scarf2')]
            v += box(1, 1, -2, -2, 12, 13, 'trench2') + box(1, 1, 1, 1, 12, 13, 'trench2')
        sl = c1
    elif var == 'banqueira':
        v = box(-1, 0, -2, 1, 7, 7, 'bsuit2')
        v += box(-1, 0, -2, 1, 8, 13, 'bsuit') + box(-2, -2, -2, 1, 8, 13, 'bsuit2')
        v += box(-2, 1, -2, 1, 4, 6, 'bsuit2') + box(1, 1, -2, 1, 4, 6, 'bsuit')               # pencil skirt
        v += box(1, 1, -2, -2, 8, 12, 'bsuit') + box(1, 1, 1, 1, 8, 12, 'bsuit')
        v += box(1, 1, -1, 0, 10, 13, 'blouse') + [(1, -1, 13, 'pearl'), (1, 0, 13, 'pearl'), (2, 0, 12, 'pearl')]
        v += [(1, -2, 8, 'clasp'), (1, 1, 8, 'clasp')]
        sl = 'bsuit'
    elif var == 'diplomata':
        v = box(-1, 0, -2, 1, 7, 7, 'dip2')
        v += box(-1, 0, -2, 1, 8, 13, 'dip') + box(-2, -2, -2, 1, 8, 13, 'dip2')
        v += box(1, 1, -2, -2, 8, 12, 'dip') + box(1, 1, 1, 1, 8, 12, 'dip')
        v += box(1, 1, -1, 0, 9, 13, 'dshirt') + box(1, 1, 0, 0, 9, 12, 'dtie')
        v += [(1, -2, 12, 'sash'), (1, -1, 11, 'sash'), (1, 0, 10, 'sash2'), (1, 1, 9, 'sash'), (1, 1, 8, 'sash2'),   # faixa do ombro ao quadril
              (0, -2, 13, 'sash2'), (1, 1, 12, 'pin')]
        sl = 'dip'
    elif var == 'contrabandista':
        v = box(-1, 0, -2, 1, 7, 7, 'strap')
        v += box(-1, 0, -2, 1, 8, 13, 'lea') + box(-2, -2, -2, 1, 8, 13, 'lea2')
        v += box(1, 1, -2, -2, 7, 13, 'lea') + box(1, 1, 1, 1, 7, 13, 'lea') + box(1, 1, -1, 0, 8, 13, 'tee')
        v += [(1, -2, 10, 'leaW'), (-2, 0, 11, 'leaW'), (1, 1, 12, 'leaW'), (0, -2, 9, 'leaW'), (1, -2, 13, 'lea2'), (1, 1, 13, 'lea2')]
        sl = 'lea'
    elif var == 'analista':
        v = box(-1, 0, -2, 1, 7, 7, 'card2')
        v += box(-1, 0, -2, 1, 8, 13, 'card') + box(-2, -2, -2, 1, 8, 13, 'card2')
        v += box(1, 1, -2, -2, 7, 12, 'card') + box(1, 1, 1, 1, 7, 12, 'card') + box(1, 1, -1, 0, 9, 12, 'dsuit')
        v += [(1, -1, 13, 'collar'), (1, 0, 13, 'collar'), (2, -1, 8, 'card2'), (2, 0, 10, 'card2')]       # gola + botões
        sl = 'card'
    else:
        v = box(-1, 0, -2, 1, 7, 7, 'tbelt')
        v += box(-1, 0, -2, 1, 8, 13, 'olive') + box(-2, -2, -2, 1, 8, 13, 'olive2')
        v += box(1, 1, -2, 1, 8, 12, 'olive') + [(1, -1, 13, 'dshirt'), (1, 0, 13, 'dshirt'), (1, 0, 12, 'dsuit')]
        v += [(1, -2, 11, 'medR'), (1, -1, 11, 'medB'), (1, -2, 10, 'medG'), (1, -1, 10, 'medR'), (2, -2, 9, 'order'), (1, 1, 11, 'medG')]
        v += box(-1, 0, -3, -3, 13, 13, 'epaul') + box(-1, 0, 2, 2, 13, 13, 'epaul')
        v += box(1, 1, -2, 1, 7, 7, 'tbelt') + [(2, 0, 7, 'epaul')]
        sl = 'olive'
    v += head(var)
    rh, lh = p['rh'], p['lh']
    v += arm((0, 2, 13), rh, (2,), sl) + arm((0, -3, 13), lh, (-3,), sl)
    if var == 'coronel':
        v += box(-1, 0, -3, -3, 14, 14, 'epaul') + box(-1, 0, 2, 2, 14, 14, 'epaul')
    g = p.get('gun')
    if g == 'hand':
        v += pistol(rh, p.get('recoil', 0), p.get('gun_up', False))
    if p.get('case'):
        v += case(rh)
    if p.get('folder'):                                   # pasta de couro com brasão, junto ao corpo
        x, y, z = [round(k) for k in rh]
        v += box(x - 1, x + 1, y + 1, y + 1, z - 3, z, 'folder') + [(x, y + 1, z - 1, 'emb')]
    if p.get('duffel'):                                   # bolsa de lona pendurada na mão
        x, y, z = [round(k) for k in rh]
        v += box(x - 2, x + 2, y + 1, y + 2, z - 4, z - 2, 'duff') + box(x - 2, x + 2, y + 2, y + 2, z - 2, z - 2, 'duff2')
        v += [(x, y, z - 1, 'strap'), (x, y + 1, z - 1, 'strap'), (x - 2, y + 1, z - 3, 'strap'), (x + 2, y + 1, z - 3, 'strap')]
    if p.get('tablet'):                                   # tablet debaixo do braço direito (lado visível), tela para fora
        x, y, z = [round(k) for k in rh]
        v += box(x - 2, x + 1, y + 1, y + 1, z - 1, z + 2, 'tab') + box(x - 1, x + 1, y + 2, y + 2, z, z + 1, 'scr')
    if var == 'diretor' and not g:
        v += [(round(rh[0]), round(rh[1]) - 1 if rh[1] > 0 else round(rh[1]), round(rh[2]), 'ring')] if False else []
    v += p.get('uextra', [])
    return v


rig.upper = upper

SIDES = lambda s=0: dict(rh=(s, 2, 8), lh=(-s, -3, 8))
BEHIND = dict(rh=(-2, 1, 9), lh=(-2, -2, 9))                       # hands clasped behind back


def idle_walk(var, idle_hands, walk_hands, n_idle=2, **kw):
    set_legs(var)
    fr = [F(var=var, **idle_hands, **kw), F(var=var, **{**idle_hands, 'rh': tuple(a + b for a, b in zip(idle_hands['rh'], (0, 0, 1)))}, **kw)][:n_idle]
    return fr + kit.walk(lambda sw, i: walk_hands(sw), var=var, **kw)


set_legs('diretor')
D_IDLE = [F(**BEHIND), F(**BEHIND), F(rh=(-2, 1, 10), lh=(-2, -2, 10)), F(rh=(-2, 1, 10), lh=(-2, -2, 10))]
D_WALK = kit.walk(lambda sw, i: SIDES(sw))
AGENT = idle_walk('agente', dict(rh=(2, 0, 9), lh=(2, -1, 9)), SIDES)
BANK = idle_walk('banqueira', dict(rh=(0, 2, 9), lh=(1, -3, 8)), lambda sw: dict(rh=(0, 2, 9), lh=(-sw, -3, 8)), case=True)
COL = idle_walk('coronel', dict(BEHIND), lambda sw: dict(rh=(sw, 2, 8), lh=(-sw, -3, 8)))
DIP = idle_walk('diplomata', dict(rh=(0, 2, 10), lh=(2, -1, 9)), lambda sw: dict(rh=(0, 2, 10), lh=(-sw, -3, 8)), folder=True)
SMUG = idle_walk('contrabandista', dict(rh=(0, 2, 9), lh=(1, -2, 9)), lambda sw: dict(rh=(0, 2, 9), lh=(-sw, -3, 8)), duffel=True)
ANA = idle_walk('analista', dict(rh=(0, 2, 10), lh=(2, -1, 9)), lambda sw: dict(rh=(0, 2, 10), lh=(-sw, -3, 8)), tablet=True)

set_legs('diretor')
COMMAND = [F(**BEHIND), F(rh=(-2, 1, 9), lh=(3, -4, 13)),
           F(rh=(-2, 1, 9), lh=(6, -5, 15), lean=6, L=(14, -6), R=(-12, -8)),
           F(rh=(-2, 1, 9), lh=(6, -5, 15), lean=6, L=(14, -6), R=(-12, -8), extra=[(9, -6, 17, 'order'), (10, -7, 18, 'order'), (11, -6, 17, 'order')])]
AIM = dict(rh=(5, 0, 12), lh=(1, -3, 8))                           # one-handed duelist stance
SHOOT = [F(**AIM, gun='hand'),
         F(rh=(5, 0, 13), lh=(1, -3, 8), gun='hand', recoil=-1, extra=flash((5, 0, 12)) + [(5, 3, 15, 'brass')]),
         F(rh=(5, 0, 12), lh=(1, -3, 8), gun='hand', extra=flash((5, 0, 12), False) + [(4, 4, 13, 'brass')]),
         F(**AIM, gun='hand', extra=[(3, 5, 4, 'brass')])]
HURT = kit.hurt(dict(rh=(3, 0, 9), lh=(1, -2, 11)), gun='hand')
dropped = box(6, 9, 1, 1, 0, 0, 'slide') + [(6, 1, 1, 'pistol')]
DEATH = kit.death(dict(gun='hand'), dropped)

ROWS = [('DIRETOR IDLE', D_IDLE), ('DIRETOR ANDAR', D_WALK), ('EX-AGENTE idle+andar', AGENT),
        ('BANQUEIRA idle+andar', BANK), ('CORONEL idle+andar', COL), ('COMANDAR', COMMAND),
        ('ATIRAR', SHOOT), ('FERIDO', HURT), ('MORTE', DEATH)]
# as 6 Origens em linhas separadas, chaves = ids de src/game/data/origins.ts (2 quadros parados + 6 de passada)
for oid, fr in (('exagent', AGENT), ('banker', BANK), ('colonel', COL), ('diplomat', DIP), ('smuggler', SMUG), ('analyst', ANA)):
    ROWS += [(f'{oid}_idle', fr[:2]), (f'{oid}_walk', fr[2:])]
if __name__ == '__main__':
    rig.export(ROWS, {'COMANDAR', 'MORTE'}, 'director')
