"""Isometric voxel buildings for the 5 Station levels: Célula, Casa Segura, Escritório, Complexo, Base.
Módulo de geometria; as imagens saem por niveis_estados.py (prédios) e interiors.py (interiores)."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter


C = {
    'grass': (70, 96, 58), 'grass2': (62, 86, 52), 'asph': (54, 58, 64), 'asph2': (46, 50, 56), 'line': (214, 196, 120),
    'conc': (176, 170, 160), 'conc2': (150, 144, 136), 'brick': (150, 86, 64), 'plaster': (206, 192, 166),
    'roof': (78, 74, 72), 'roofR': (128, 60, 46), 'metal': (120, 126, 134), 'metal2': (92, 98, 106),
    'glass': (96, 150, 188), 'glassD': (58, 96, 132), 'win': (255, 214, 130), 'door': (70, 52, 40),
    'wall': (130, 128, 120), 'olive': (86, 96, 66), 'olive2': (70, 78, 54), 'tarmac': (62, 64, 66),
    'car': (40, 42, 48), 'carW': (120, 170, 200), 'red': (200, 60, 50), 'white': (226, 228, 230),
    'heli': (210, 200, 70), 'tree': (54, 92, 50), 'tree2': (40, 74, 40), 'trunk': (90, 64, 44), 'sand': (186, 168, 128),
}
EMIS = {'win', 'red'}


def box(x0, x1, y0, y1, z0, z1, c):
    return [(x, y, z, c) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) for z in range(z0, z1 + 1)]


def shell(x0, x1, y0, y1, z0, z1, c):
    """Only the visible faces (+x, +y, top) plus edges: keeps voxel count low."""
    v = box(x0, x1, y0, y1, z1, z1, c)
    v += box(x1, x1, y0, y1, z0, z1, c) + box(x0, x1, y1, y1, z0, z1, c)
    return v


def windows_x(x, y0, y1, z0, z1, step=2, c='glass', lit=()):
    """Windows on the +x face (x fixed)."""
    v = []
    for i, y in enumerate(range(y0, y1 + 1, step)):
        for j, z in enumerate(range(z0, z1 + 1, 2)):
            v.append((x, y, z, 'win' if (i * 7 + j * 3) % 5 in lit else c))
    return v


def windows_y(y, x0, x1, z0, z1, step=2, c='glass', lit=()):
    v = []
    for i, x in enumerate(range(x0, x1 + 1, step)):
        for j, z in enumerate(range(z0, z1 + 1, 2)):
            v.append((x, y, z, 'win' if (i * 5 + j * 3) % 5 in lit else c))
    return v


def ground(x0, x1, y0, y1, a='grass', b='grass2'):
    return [(x, y, -1, a if (x * 3 + y * 5) % 7 else b) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def car(x, y, along='x', c='car'):
    if along == 'x':
        return box(x, x + 3, y, y + 1, 0, 0, c) + box(x + 1, x + 2, y, y + 1, 1, 1, 'carW')
    return box(x, x + 1, y, y + 3, 0, 0, c) + box(x, x + 1, y + 1, y + 2, 1, 1, 'carW')


def tree(x, y, h=3):
    return box(x, x, y, y, 0, h - 1, 'trunk') + box(x - 1, x + 1, y - 1, y + 1, h, h + 1, 'tree') + [(x, y, h + 2, 'tree2')]


def celula():
    v = ground(-6, 10, -6, 10)
    v += shell(0, 7, 0, 7, 0, 5, 'plaster') + box(0, 7, 0, 7, 6, 6, 'roof')
    v += box(7, 7, 3, 4, 0, 2, 'door') + windows_x(7, 1, 1, 3, 3) + windows_x(7, 6, 6, 3, 3, lit=(0,))
    v += windows_y(7, 2, 5, 3, 3, step=3, lit=(0, 1))
    v += box(2, 3, 2, 3, 7, 7, 'metal') + [(5, 5, 7, 'metal2'), (5, 5, 8, 'white'), (6, 5, 8, 'white')]  # AC + dish
    v += car(9, 1, 'y') + tree(-3, 8)
    return v


def casa():
    v = ground(-8, 16, -8, 16)
    v += box(-6, 14, 14, 14, 0, 1, 'wall') + box(14, 14, -6, 14, 0, 1, 'wall')        # fence
    v += box(14, 14, 3, 6, 0, 1, 'asph') + box(10, 13, 3, 6, -1, -1, 'asph')           # gate + driveway
    v += shell(0, 9, 0, 11, 0, 9, 'plaster')
    for z in range(10, 14):                                                             # stepped roof
        k = z - 10
        v += box(0, 9, k, 11 - k, z, z, 'roofR')
    v += box(9, 9, 5, 6, 0, 2, 'door') + windows_x(9, 1, 11, 3, 7, step=3, lit=(1, 3))
    v += windows_y(11, 1, 8, 3, 7, step=3, lit=(2,))
    v += shell(10, 13, 7, 11, 0, 3, 'conc') + car(10, 3, 'x')                           # garage + car
    v += tree(-5, 12) + tree(12, -5) + tree(-5, -4)
    return v


def escritorio():
    v = ground(-8, 20, -8, 20, 'asph', 'asph2')
    v += shell(0, 11, 0, 11, 0, 21, 'conc')
    for z in range(2, 21, 2):
        v += windows_x(11, 1, 10, z, z, step=1, c='glass', lit=(1,) if z % 4 else ())
        v += windows_y(11, 1, 10, z, z, step=1, c='glassD', lit=(3,) if z % 6 else ())
    v += box(12, 14, 3, 8, 3, 3, 'metal2') + box(11, 11, 4, 7, 0, 2, 'glassD')          # canopy + lobby
    v += box(3, 7, 3, 7, 22, 23, 'metal') + box(9, 9, 2, 2, 22, 28, 'metal2') + [(9, 2, 29, 'red')]
    for i in range(4):
        v += car(15, -6 + i * 3, 'x')
    v += [(x, 17, -1, 'line') for x in range(-6, 18, 3)]
    return v


def complexo():
    v = ground(-14, 26, -14, 26, 'sand', 'sand')
    v += box(-12, 24, 24, 24, 0, 3, 'wall') + box(24, 24, -12, 24, 0, 3, 'wall')        # perimeter
    v += box(24, 24, 8, 12, 0, 3, 'metal2')                                             # gate
    v += shell(21, 23, 19, 21, 0, 9, 'conc') + box(20, 24, 18, 22, 10, 10, 'roof') + [(22, 20, 11, 'red')]  # tower
    v += shell(0, 13, 0, 9, 0, 11, 'conc')                                              # main building
    for z in range(2, 11, 3):
        v += windows_x(13, 1, 8, z, z, step=2, lit=(0, 2)) + windows_y(9, 1, 12, z, z, step=2, lit=(1,))
    v += box(0, 13, 0, 9, 12, 12, 'roof') + box(2, 5, 2, 5, 13, 14, 'metal')
    v += shell(-10, -1, 13, 21, 0, 6, 'metal') + box(-10, -1, 13, 21, 7, 7, 'metal2')  # warehouse 1
    v += box(-1, -1, 15, 19, 0, 4, 'metal2')
    v += shell(4, 13, 14, 21, 0, 6, 'metal') + box(4, 13, 14, 21, 7, 7, 'metal2')      # warehouse 2
    v += box(-10, -2, -10, -2, -1, -1, 'asph') + [(x, y, 0, 'heli') for x in range(-8, -3) for y in (-6,)] + \
         [(-6, y, 0, 'heli') for y in range(-8, -3)]                                    # helipad
    v += car(16, 2, 'y') + car(19, 2, 'y') + car(16, 14, 'x')
    return v


def base():
    v = ground(-22, 36, -22, 36)
    v += box(-20, 34, 26, 30, -1, -1, 'tarmac') + [(x, 28, -1, 'white') for x in range(-18, 33, 3)]   # runway
    v += box(-22, 36, 36, 36, 0, 2, 'wall') + box(36, 36, -22, 36, 0, 2, 'wall')
    for i, x in enumerate(range(-18, 4, 1)):                                            # curved hangar
        pass
    for y in range(4, 22):
        for x in range(-18, -3):
            dx = x + 10.5
            h = int(8 - (dx * dx) / 7)
            if h >= 0:
                v.append((x, y, h, 'olive'))
                if x == -4 or y == 21:
                    v += [(x, y, z, 'olive2') for z in range(0, h)]
    v += box(-11, -10, 21, 21, 0, 4, 'door')
    v += shell(10, 13, 10, 13, 0, 13, 'conc') + box(8, 15, 8, 15, 14, 16, 'glassD') + box(9, 14, 9, 14, 17, 17, 'roof')  # tower
    v += [(12, 12, 18, 'red')]
    for z in range(5, 12):                                                              # radar dome
        r = int((36 - (z - 5) ** 2) ** 0.5) if (z - 5) ** 2 <= 36 else 0
        v += [(x, y, z, 'white') for x in range(26 - r, 27 + r) for y in range(4 - r, 5 + r)
              if (x - 26) ** 2 + (y - 4) ** 2 <= r * r and ((x - 26) ** 2 + (y - 4) ** 2 >= (r - 1) ** 2 or z == 5 + int(r * 0))]
    v += shell(20, 31, 4, 5, 0, 4, 'conc')
    for k in range(3):                                                                  # barracks
        y0 = -18 + k * 7
        v += shell(18, 31, y0, y0 + 4, 0, 4, 'olive') + box(18, 31, y0, y0 + 4, 5, 5, 'olive2')
        v += windows_x(31, y0 + 1, y0 + 3, 2, 2, step=2, lit=(0,))
    for i in range(5):
        v += box(-18 + i * 4, -16 + i * 4, -16, -14, 0, 1, 'olive2') + [(-17 + i * 4, -15, 2, 'olive')]   # vehicles
    v += box(-2, 2, 24, 25, 0, 0, 'metal2') + box(-5, 5, 25, 25, 1, 1, 'metal2') + box(-1, 1, 23, 23, 1, 2, 'metal')  # jet
    return v


def render(vox):
    xs = [p[0] - p[1] for p in vox]; ys = [p[0] + p[1] - 2 * p[2] for p in vox]
    minx, maxx = min(xs) * 2 - 4, max(xs) * 2 + 8
    miny, maxy = min(ys) - 4, max(ys) + 8
    W, H = maxx - minx, maxy - miny
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); pix = im.load()
    cells = {}
    for x, y, z, c in vox:
        cells[(x, y, z)] = c
    for (x, y, z), c in sorted(cells.items(), key=lambda kv: (kv[0][0] + kv[0][1] + kv[0][2], kv[0][2])):
        sx = (x - y) * 2 - minx - 2; sy = (x + y) - 2 * z - miny - 2
        e = c in EMIS
        j = (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >> 3) % 9 - 4
        def sh(k):
            return tuple(max(0, min(255, int(v * k + j))) for v in C[c]) + (255,)
        top, left, right = (sh(1), sh(1), sh(1)) if e else (sh(1.15), sh(0.9), sh(0.68))
        for (fx, fy), col in (((1, 0), top), ((2, 0), top), ((0, 1), top), ((1, 1), top), ((2, 1), top), ((3, 1), top),
                              ((0, 2), left), ((1, 2), left), ((0, 3), left), ((1, 3), left),
                              ((2, 2), right), ((3, 2), right), ((2, 3), right), ((3, 3), right)):
            X, Y = sx + fx, sy + fy
            if 0 <= X < W and 0 <= Y < H:
                pix[X, Y] = col
    a = im.split()[3].filter(ImageFilter.MaxFilter(3))
    base_ = Image.new('RGBA', im.size, (0, 0, 0, 0)); base_.paste(Image.new('RGBA', im.size, (14, 16, 20, 255)), mask=a)
    base_.alpha_composite(im)
    return base_


LEVELS = [('1 · Célula', celula), ('2 · Casa Segura', casa), ('3 · Escritório', escritorio),
          ('4 · Complexo', complexo), ('5 · Base', base)]


def origin(vox):
    """Ponto do chão na origem do mundo (0, 0, 0) dentro da imagem de render(vox)."""
    xs = [p[0] - p[1] for p in vox]; ys = [p[0] + p[1] - 2 * p[2] for p in vox]
    return -(min(xs) * 2 - 4), -(min(ys) - 4) + 1
