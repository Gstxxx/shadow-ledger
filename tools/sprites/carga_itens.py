"""Cargo / item props with a subtle idle (glint, blink, bob)."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from sl_common import box, render, ring, disc, ball, shift

rig.C.update({'au': (236, 186, 64), 'au2': (196, 146, 44), 'au3': (150, 104, 30), 'lining': (60, 40, 30), 'shine': (255, 255, 236), 'card': (170, 136, 92), 'card2': (146, 112, 72), 'tape': (200, 180, 130),
              'hazG': (110, 255, 120), 'hazG2': (60, 200, 90)})
rig.EMISSIVE |= {'shine', 'hazG'}
GL = {'shine', 'hazG', 'led', 'ledB', 'ledR', 'grn', 'goldL'}
N = 4


def R(v):
    return render(v, glow=GL, strength=150)


def glint(path, t):
    """path: list of (x,y,z) per frame index 1..; frame 0 has none."""
    if 0 < t <= len(path):
        x, y, z = path[t - 1]
        return [(x, y, z, 'shine')]
    return []


def frame_edges(x0, x1, y0, y1, z0, z1, c):
    """Recolour the visible edges of a box (for crate framing)."""
    v = []
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            for z in range(z0, z1 + 1):
                e = (x in (x0, x1)) + (y in (y0, y1)) + (z in (z0, z1))
                if e >= 2:
                    v.append((x, y, z, c))
    return v


def caixa_armas():
    fr = []
    for t in range(N):
        v = box(-5, 4, -3, 2, 0, 4, 'olive') + frame_edges(-5, 4, -3, 2, 0, 4, 'olive2')
        v += [(x, 2, 3, 'olive2') for x in range(-5, 5)]                     # lid seam (+y face)
        # rifle silhouette stencil on the +y face
        v += [(x, 2, 2, 'stencil') for x in range(-4, 4)] + [(-4, 2, 1, 'stencil'), (-3, 2, 1, 'stencil'), (0, 2, 1, 'stencil')]
        # "///" stencil marks on the +x end
        v += [(4, y, z, 'stencil') for y, z in ((1, 1), (0, 2), (-1, 3))] + [(4, -2, 1, 'stencil')]
        v += [(-5, y, 2, 'steel3') for y in (-1, 0)]           # handle
        v += glint([(-4, 2, 4), (-1, 2, 4), (2, 2, 4)], t)
        fr.append(R(v))
    return fr


def ammo_can(x, y, z):
    v = box(x, x + 3, y, y + 1, z, z + 2, 'olive') + [(xx, y + 1, z + 1, 'yel') for xx in range(x, x + 4)]
    v += [(x + 1, y, z + 3, 'olive2'), (x + 2, y, z + 3, 'olive2'), (x + 1, y + 1, z + 3, 'olive2'), (x + 2, y + 1, z + 3, 'olive2')]
    v += [(x + 3, y, z + 2, 'steel2')]
    return v


def caixa_municao():
    fr = []
    for t in range(N):
        v = ammo_can(-4, -3, 0) + ammo_can(1, -3, 0) + ammo_can(-2, 0, 0) + ammo_can(-1, -2, 3)
        v += [(3, 2, 0, 'au'), (4, 2, 0, 'au2'), (4, 3, 0, 'au')]               # loose rounds
        v += glint([(-1, -2, 6), (1, -2, 6), (0, 1, 3)], t)
        fr.append(R(v))
    return fr


def documentos():
    fr = []
    for t in range(N):
        v = []
        for k, (dx, dy) in enumerate(((0, 0), (1, 0), (0, 1), (-1, 0))):
            z = k
            v += box(-3 + dx, 2 + dx, -2 + dy, 2 + dy, z, z, 'folder' if k % 2 == 0 else 'folder2')
            v += [(2 + dx, y, z, 'paper') for y in range(-1 + dy, 2 + dy)]           # paper edges sticking out
        top = 3
        # red CONFIDENCIAL stamp: rectangle + a bar of 'text' on the top folder
        sx0, sx1, sy0, sy1 = -3, 1, -2, 1
        for x in range(sx0, sx1 + 1):
            for y in range(sy0, sy1 + 1):
                if x in (sx0, sx1) or y in (sy0, sy1) or (y in (-1, 0) and x % 2 == 0):
                    v.append((x - 1, y, top, 'red2'))
        # loose sheet lifting gently
        lift = [0, 0, 1, 0][t]
        v += box(-2, 1, 2, 3, 4 + lift, 4 + lift, 'paper') if lift else box(-2, 1, 2, 3, 4, 4, 'paper2')
        v += glint([(1, -2, 4), (0, -1, 4), (-1, 0, 4)], t)
        fr.append(R(v))
    return fr


def material_especial():
    fr = []
    for t in range(N):
        v = []
        for z in range(0, 9):
            for x in range(-3, 4):
                for y in range(-3, 4):
                    if x * x + y * y > 9.5:
                        continue
                    if z in (3, 4):                                           # yellow/black hazard band
                        a = math.degrees(math.atan2(y, x)) % 360
                        c = 'black' if (int(a / 30) + z) % 3 == 0 else 'yel'
                    elif z in (0, 8):
                        c = 'steel3'
                    else:
                        c = 'steel2'
                    v.append((x, y, z, c))
        v += [(x, y, 6, 'hazG' if t % 2 == 0 else 'hazG2') for x in range(-3, 4) for y in range(-3, 4) if 7 <= x * x + y * y <= 9.5]  # glow seam
        v += disc(1.6, 9, 'hazG' if t % 2 == 0 else 'hazG2') + ring(2.6, 9, 'steel3', thick=0.9)
        rnd = random.Random(t + 3)
        for k in range(3):
            v.append((rnd.randint(-2, 2), rnd.randint(-2, 2), 11 + rnd.randint(0, 3) + t % 2, 'hazG'))
        v += ring(4.6, 0, 'grnD', thick=0.6)
        fr.append(R(v))
    return fr


def tecnologia():
    fr = []
    for t in range(N):
        v = box(-2, 2, -2, 1, 0, 10, 'server') + box(2, 2, -2, 1, 0, 10, 'server2')
        for z in range(1, 10, 2):                                            # drive bays on +x face
            v += [(2, y, z, 'dark') for y in (-2, -1, 0, 1)]
            rnd = random.Random(z * 13 + t)
            v.append((3, -2, z, ['led', 'ledB', 'led', 'ledR'][rnd.randint(0, 3)] if rnd.random() < .75 else 'dark'))
            v.append((3, 1, z, 'led' if (z + t) % 3 else 'ledB'))
        v += [(x, 2, z, 'server2') for x in (-1, 1) for z in range(2, 9, 2)]    # side vents (+y face)
        v += box(-2, 2, -2, 1, 11, 11, 'steel3')
        v += glint([(2, 1, 11), (1, 1, 11), (0, 1, 11)], t)
        fr.append(R(v))
    return fr


def maleta_dinheiro():
    fr = []
    for t in range(N):
        v = box(-4, 3, -3, 2, 0, 1, 'leather2') + frame_edges(-4, 3, -3, 2, 0, 1, 'steel2')
        v += box(-3, 2, -2, 1, 2, 2, 'cash') + [(x, y, 2, 'cash2') for x in (-2, 1) for y in (-2, -1, 0, 1)]
        v += [(x, 2, 2, 'leather') for x in range(-4, 4)] + [(x, -3, 2, 'leather') for x in range(-4, 4)]
        v += [(3, y, 2, 'leather') for y in range(-3, 3)] + [(-4, y, 2, 'leather') for y in range(-3, 3)]
        v += box(-6, -6, -3, 2, 2, 7, 'leather2') + box(-5, -5, -2, 1, 3, 6, 'lining')   # open lid + lining
        v += box(-6, -6, -3, 2, 8, 8, 'steel2')
        v += [(1, 3, 1, 'au'), (-2, 3, 1, 'au')]                             # clasps
        v += glint([(-2, -1, 3), (0, 0, 3), (2, -1, 3)], t)
        v += [(5, 3, 0, 'cash'), (6, 3, 0, 'cash2')]                          # bill on the floor
        fr.append(R(v))
    return fr


def bar(x, y, z, a='au', b='au2'):
    return box(x, x + 1, y, y + 4, z, z, b) + box(x, x + 1, y + 1, y + 3, z + 1, z + 1, a)


def barras_ouro():
    fr = []
    for t in range(N):
        v = bar(-5, -2, 0) + bar(-2, -2, 0, 'au', 'au3') + bar(1, -2, 0)
        v += bar(-4, -2, 2, 'au', 'au3') + bar(-1, -2, 2)
        v += bar(-2, -2, 4)
        v += glint([(-4, 0, 3), (-1, 1, 3), (-2, 0, 5)], t)
        fr.append(R(v))
    return fr


def pallet():
    fr = []
    for t in range(N):
        v = []
        for y in range(-4, 4):
            v += box(-4, 4, y, y, 0, 0, 'pallet2' if y % 3 else 'pallet')
        v += box(-4, 4, -4, 3, 1, 1, 'pallet')
        v += [(x, y, 1, 'pallet2') for x in range(-4, 5) for y in range(-4, 4) if x % 3 == 0]
        cargo = box(-3, 3, -3, 2, 2, 7, 'card') + [(x, 2, z, 'card2') for x in range(-3, 4) for z in (4,)] + [(3, y, 4, 'card2') for y in range(-3, 3)]
        cargo += [(0, y, 7, 'tape') for y in range(-3, 3)]
        cl = {(x, y, z): c for x, y, z, c in cargo}
        for (x, y, z), c in list(cl.items()):                                # cargo net on visible faces
            outer = x == 3 or y == 2 or z == 7
            if outer and ((x + z) % 3 == 0 or (x - z) % 3 == 0 if y == 2 else (y + z) % 3 == 0 or (y - z) % 3 == 0 if x == 3 else (x + y) % 3 == 0 or (x - y) % 3 == 0):
                cl[(x, y, z)] = 'net'
        v += [(x, y, z, c) for (x, y, z), c in cl.items()]
        v += [(4, y, 2, 'net') for y in (-3, -1, 1)] + [(x, 3, 2, 'net') for x in (-2, 0, 2)]     # hooks
        v += glint([(3, -3, 7), (2, -2, 7)], t if t < 3 else 0)
        fr.append(R(v))
    return fr


def conteiner():
    fr = []
    for t in range(N):
        v = []
        for x in range(-7, 7):
            c = 'cont' if x % 2 else 'cont2'
            v += box(x, x, -3, 2, 0, 5, c)
        v += box(-7, 6, -3, 2, 6, 6, 'cont2')
        v += box(7, 7, -3, 2, 0, 6, 'cont')                                   # doors on +x end
        v += [(8, y, z, 'steel2') for y in (-2, -1, 1, 2) for z in range(1, 6)]   # locking bars
        v += [(7, 0, z, 'cont2') for z in range(0, 7)]
        for x in (-7, 7):                                                    # corner castings
            for y in (-3, 2):
                v += [(x, y, 0, 'steel3'), (x, y, 6, 'steel3')]
        v += [(x, 2, 4, 'white') for x in (-5, -4, -2)] + [(x, 2, 3, 'white') for x in (-5, -3, -2)]   # ID stencil on the side
        v += glint([(5, 2, 6), (2, 2, 6), (-1, 2, 6)], t)
        fr.append(R(v))
    return fr


ROWS = [('CAIXA DE ARMAS', caixa_armas()), ('CAIXA DE MUNIÇÃO', caixa_municao()), ('DOCUMENTOS', documentos()),
        ('MATERIAL ESPECIAL', material_especial()), ('TECNOLOGIA', tecnologia()), ('MALETA DE DINHEIRO', maleta_dinheiro()),
        ('BARRAS DE OURO', barras_ouro()), ('PALLET DE CARGA', pallet()), ('CONTÊINER', conteiner())]
if __name__ == '__main__':
    rig.export(ROWS, set(), 'cargo', default_fps=6, stills=True)
