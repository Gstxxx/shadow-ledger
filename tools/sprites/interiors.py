"""Isometric cutaway interiors for the 5 Station levels (dollhouse view: front walls open)."""
import os
from PIL import Image, ImageDraw, ImageFont
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import levels as L

L.C.update({
    'floorW': (128, 96, 70), 'floorW2': (116, 86, 62), 'tile': (150, 152, 156), 'tile2': (134, 136, 140),
    'carpet': (70, 74, 92), 'carpet2': (62, 66, 84), 'epoxy': (88, 96, 92), 'epoxy2': (80, 88, 84),
    'wallI': (196, 184, 160), 'wallG': (150, 156, 160), 'wallD': (92, 98, 104),
    'wood': (120, 82, 52), 'wood2': (96, 64, 40), 'mattress': (190, 196, 200), 'blanket': (80, 96, 70),
    'screen': (70, 170, 200), 'screenG': (90, 200, 120), 'screenR': (220, 80, 70), 'paper': (232, 226, 210),
    'string': (210, 50, 50), 'safe': (70, 74, 80), 'crate': (110, 100, 60), 'sofa': (90, 60, 50),
    'chair': (40, 40, 44), 'server': (34, 36, 40), 'led': (90, 230, 120), 'map': (90, 130, 110),
    'vault': (150, 154, 160), 'rifle': (36, 36, 40), 'rack': (80, 70, 60), 'plant': (60, 120, 60),
})
L.EMIS |= {'screen', 'screenG', 'screenR', 'led', 'win'}
B = L.box


def room(n, h, floor=('floorW', 'floorW2'), wall='wallI'):
    v = [(x, y, -1, floor[(x + y) % 2]) for x in range(0, n) for y in range(0, n)]
    v += B(-1, -1, 0, n - 1, 0, h, wall) + B(0, n - 1, -1, -1, 0, h, wall) + B(-1, -1, -1, -1, 0, h, wall)
    return v


def desk(x, y, along='x', screens=1, c='wood'):
    if along == 'x':
        v = B(x, x + 3, y, y + 1, 1, 1, c) + B(x, x, y, y + 1, 0, 0, c + '2' if c + '2' in L.C else c) + B(x + 3, x + 3, y, y + 1, 0, 0, c)
        for i in range(screens):
            v += [(x + 1 + i, y, 2, 'screen'), (x + 1 + i, y, 3, 'screen')]
        v += B(x + 1, x + 2, y + 2, y + 2, 0, 1, 'chair')
    else:
        v = B(x, x + 1, y, y + 3, 1, 1, c) + B(x, x + 1, y, y, 0, 0, c) + B(x, x + 1, y + 3, y + 3, 0, 0, c)
        for i in range(screens):
            v += [(x, y + 1 + i, 2, 'screen'), (x, y + 1 + i, 3, 'screen')]
        v += B(x + 2, x + 2, y + 1, y + 2, 0, 1, 'chair')
    return v


def board_on_wall_x(y0, z0):
    """Investigation board on the back wall x=-1 face (drawn just in front: x=0)."""
    v = B(0, 0, y0, y0 + 5, z0, z0 + 3, 'wood2')
    for y, z in ((y0 + 1, z0 + 2), (y0 + 3, z0 + 3), (y0 + 4, z0 + 1), (y0 + 2, z0 + 1)):
        v.append((0, y, z, 'paper'))
    v += [(0, y0 + 2, z0 + 2, 'string'), (0, y0 + 3, z0 + 2, 'string')]
    return v


def screen_wall_y(x0, x1, z0, z1):
    v = []
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            v.append((x, 0, z, 'map' if (x + z) % 5 else ('screenR' if x % 3 == 0 else 'screen')))
    return v


def rifle_rack(x, y, n=4):
    v = B(x, x, y, y + n * 2, 0, 0, 'rack') + B(x, x, y, y + n * 2, 4, 4, 'rack')
    for i in range(n):
        v += B(x, x, y + 1 + i * 2, y + 1 + i * 2, 1, 3, 'rifle')
    return v


def server(x, y, h=5):
    v = B(x, x + 1, y, y + 1, 0, h, 'server')
    v += [(x + 1, y, z, 'led') for z in range(1, h, 2)]
    return v


def crates(x, y):
    return B(x, x + 1, y, y + 1, 0, 1, 'crate') + B(x + 2, x + 3, y, y + 1, 0, 0, 'crate') + B(x, x + 1, y, y + 1, 2, 2, 'crate')


def window_x(y0, y1, z0, z1):
    return B(-1, -1, y0, y1, z0, z1, 'glass')


def celula():
    v = room(12, 7)
    v += window_x(7, 9, 3, 5)
    v += B(8, 11, 8, 10, 0, 0, 'mattress') + B(8, 11, 9, 10, 1, 1, 'blanket')           # mattress
    v += desk(1, 8, 'y', screens=1)                                                    # desk + laptop
    v += board_on_wall_x(1, 2)                                                         # clue board
    v += B(9, 10, 0, 1, 0, 2, 'safe') + [(10, 1, 1, 'led')]                            # safe
    v += crates(5, 1)
    return v


def casa():
    v = room(16, 8, floor=('floorW', 'floorW2'))
    v += window_x(3, 5, 3, 5) + window_x(10, 12, 3, 5)
    v += B(1, 2, 7, 13, 0, 1, 'sofa') + B(1, 1, 7, 13, 2, 2, 'sofa')                   # sofa
    v += B(5, 8, 8, 11, 1, 1, 'wood') + [(6, 9, 2, 'paper'), (7, 10, 2, 'paper')]       # table w/ documents
    v += B(11, 14, 1, 2, 0, 0, 'wood2')
    v += rifle_rack(15, 3, 4)                                                          # armory corner
    v += screen_wall_y(4, 9, 3, 5)
    v += crates(11, 12) + [(14, 14, 0, 'plant'), (14, 14, 1, 'plant')]
    return v


def escritorio():
    v = room(20, 8, floor=('carpet', 'carpet2'), wall='wallG')
    v += B(-1, -1, 2, 17, 2, 6, 'glass')                                                # window wall
    for r in range(3):
        for c in range(2):
            v += desk(3 + c * 7, 4 + r * 5, 'x', screens=2)
    v += B(15, 15, 0, 19, 0, 0, 'glassD') + B(15, 15, 0, 6, 1, 5, 'glass')               # meeting room glass
    v += B(17, 19, 1, 4, 1, 1, 'wood')
    v += server(17, 12) + server(17, 15)
    v += screen_wall_y(2, 10, 3, 6)
    return v


def complexo():
    v = room(22, 9, floor=('epoxy', 'epoxy2'), wall='wallD')
    v += screen_wall_y(2, 15, 2, 7)                                                    # ops screen wall
    for r in range(2):
        v += B(3, 14, 4 + r * 4, 4 + r * 4, 0, 1, 'server')                              # console rows
        v += [(x, 4 + r * 4, 2, 'screenG' if x % 2 else 'screen') for x in range(3, 15)]
        v += [(x, 5 + r * 4, 0, 'chair') for x in range(4, 15, 3)]
    v += rifle_rack(21, 2, 5)
    v += B(18, 21, 16, 21, 0, 0, 'vault') + B(-1, -1, 15, 20, 0, 6, 'vault')            # vault door on wall
    v += [(-1, 17, 3, 'safe'), (-1, 18, 3, 'safe'), (-1, 17, 4, 'safe'), (-1, 18, 4, 'safe')]
    v += crates(17, 12) + crates(10, 16) + server(1, 13) + server(1, 16)
    return v


def base():
    v = room(28, 10, floor=('epoxy', 'epoxy2'), wall='wallD')
    v += B(8, 19, 8, 17, 0, 1, 'wood2') + [(x, y, 2, 'map') for x in range(8, 20) for y in range(8, 18)]   # map table
    v += [(11, 10, 3, 'screenR'), (15, 14, 3, 'screenR'), (17, 9, 3, 'screen'), (12, 15, 3, 'screenG')]
    v += screen_wall_y(3, 24, 3, 8)
    v += [(x, y, 0, 'chair') for x in (8, 19) for y in range(9, 17, 3)]
    for k in range(4):                                                                 # radar consoles
        y = 4 + k * 6
        v += B(25, 26, y, y + 3, 0, 1, 'server') + [(25, yy, 2, 'screenG') for yy in range(y, y + 4)]
    v += rifle_rack(0, 20, 3) + crates(2, 24) + crates(6, 24)
    v += B(20, 24, 21, 24, 0, 1, 'olive') + B(21, 23, 21, 24, 2, 2, 'olive2')            # vehicle
    return v


ROWS = [('1 · Célula', celula), ('2 · Casa Segura', casa), ('3 · Escritório', escritorio),
        ('4 · Complexo', complexo), ('5 · Base', base)]

IDS = ['cell', 'safehouse', 'office', 'compound', 'base']

if __name__ == '__main__':
    import atlas
    items = []
    for iid, (n, fn) in zip(IDS, ROWS):
        v = fn()
        items.append((iid, L.render(v), L.origin(v), None))
    atlas.write_static('interiors', items)
