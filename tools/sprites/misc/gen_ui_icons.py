"""ui-icons: isometric voxel icons (same renderer/light as the sprites: top bright, +y face mid, +x face dark,
dark outline) at 64x64; the 32x32 set is the same model rendered from a 2x-binned voxel model."""
import sys, os
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import math, random
import pmisc as P
import rig
import vehlib as V
import cargueiros_a as CA
from PIL import Image, ImageDraw, ImageFilter

OUT = P.PUB
box = rig.box
rig.C.update({
    'iGrass': (92, 150, 70), 'iGrass2': (72, 124, 56), 'iWater': (60, 120, 190), 'iWater2': (48, 100, 168),
    'iDirt': (120, 92, 60), 'iDirt2': (96, 72, 46), 'iRed': (214, 48, 44), 'iRed2': (170, 34, 34), 'iWhite': (236, 238, 242),
    'iPole': (180, 184, 192), 'iWood': (150, 108, 64), 'iWood2': (118, 84, 48), 'iAwnR': (206, 56, 50), 'iAwnW': (236, 230, 220),
    'iGlass': (52, 70, 96), 'iGlass2': (40, 54, 76), 'iWin': (130, 200, 255), 'iConc': (150, 154, 162), 'iConc2': (120, 124, 134),
    'iSteel': (160, 166, 176), 'iSteel2': (120, 126, 138), 'iSteel3': (84, 90, 102), 'iGun': (48, 50, 56), 'iGun2': (78, 82, 90),
    'iStock': (130, 90, 54), 'iYel': (244, 196, 52), 'iBlack': (26, 26, 30), 'iPaper': (236, 230, 214), 'iPaper2': (208, 200, 180),
    'iFolder': (206, 164, 92), 'iFolder2': (176, 134, 70), 'iInk': (70, 74, 90), 'iGold': (236, 192, 70), 'iGold2': (196, 150, 50),
    'iBlue': (56, 104, 190), 'iBlue2': (40, 80, 150), 'iOl': (100, 110, 68), 'iOl2': (80, 88, 54), 'iSten': (220, 212, 170),
    'iCash': (112, 170, 92), 'iCash2': (84, 140, 70), 'iBand': (230, 224, 196), 'iSkin': (214, 160, 120), 'iHair': (40, 32, 28),
    'iSuit': (58, 64, 78), 'iSuit2': (44, 48, 60), 'iTac': (86, 96, 70), 'iTac2': (66, 74, 54), 'iMap': (226, 210, 164), 'iMap2': (200, 182, 134),
    'iTarmac': (70, 74, 82), 'iTarmac2': (58, 62, 70), 'iLine': (230, 210, 120),
    'gRed': (255, 70, 60), 'gAmber': (255, 186, 60), 'gCyan': (120, 220, 255), 'gGreen': (90, 240, 130), 'gFlash': (255, 236, 150),
})
GLOWK = {'gRed', 'gAmber', 'gCyan', 'gGreen', 'gFlash'}
rig.EMISSIVE |= GLOWK
GLOW_RGB = {'gRed': (255, 60, 50), 'gAmber': (255, 180, 60), 'gCyan': (110, 210, 255), 'gGreen': (80, 255, 120), 'gFlash': (255, 220, 120)}


def disc(r, z, c, cx=0, cy=0, hole=0):
    ri = int(r) + 1
    return [(cx + x, cy + y, z, c(x, y) if callable(c) else c) for x in range(-ri, ri + 1) for y in range(-ri, ri + 1)
            if hole * hole <= x * x + y * y <= r * r]


def disc_xz(cx, y, cz, r, c, hole=0):
    ri = int(r) + 1
    return [(cx + x, y, cz + z, c(x, z) if callable(c) else c) for x in range(-ri, ri + 1) for z in range(-ri, ri + 1)
            if hole * hole <= x * x + z * z <= r * r]


def line(p0, p1, c, w=1):
    n = int(max(abs(p1[k] - p0[k]) for k in range(3))) * 2 + 1
    v = []
    for i in range(n + 1):
        t = i / n
        p = [p0[k] + (p1[k] - p0[k]) * t for k in range(3)]
        v.append((round(p[0]), round(p[1]), round(p[2]), c))
    return v


def nz(a, b, s=0):
    def f(x, y, z=0):
        return b if ((x * 92821) ^ (y * 68917) ^ (z * 31337) ^ s) % 7 == 0 else a
    return f


# ======================================================================== models
def pais():
    v = []
    for x in range(-6, 7):
        for y in range(-6, 7):
            water = (x + 0.6 * y) > 4.5 or (x - y) < -9
            top = 'iWater' if water else ('iGrass2' if (x * 7 + y * 3) % 5 == 0 else 'iGrass')
            v += [(x, y, z, 'iDirt' if z < 2 else top) for z in range(0, 3 if not water else 2)]
    v += [(-2, -1, z, 'iPole') for z in range(3, 14)] + [(-2, -1, 14, 'iGold')]
    for x in range(-1, 5):
        for z in range(9, 14):
            wave = 1 if x in (1, 2) else 0
            v.append((x, -1, z + (wave if z == 13 else 0) - (1 if x >= 3 else 0), 'iRed' if (z - 9) // 2 % 2 == 0 else 'iWhite'))
    return v


def mercado():
    v = box(-4, 4, -3, 2, 0, 3, 'iWood') + box(-4, 4, 3, 3, 0, 3, 'iWood2')
    v += [(x, 3, 2, 'iWood') for x in range(-4, 5, 2)]
    for x, y in ((-4, -3), (4, -3), (-4, 3), (4, 3)):
        v += [(x, y, z, 'iWood2') for z in range(4, 10)]
    for x in range(-5, 6):                                                      # striped awning sloping toward +y
        for y in range(-4, 6):
            z = 10 + (1 if y < 0 else 0) - (1 if y > 3 else 0)
            v.append((x, y, z, 'iAwnR' if (x + 6) // 2 % 2 == 0 else 'iAwnW'))
    v += [(x, 5, 9, 'iAwnR' if (x + 6) // 2 % 2 == 0 else 'iAwnW') for x in range(-5, 6)]
    v += box(-3, -1, -1, 1, 4, 5, 'iFolder') + box(0, 2, -2, 0, 4, 6, 'iOl')                # goods
    v += disc(1.2, 4, 'iGold', 2, 2) + [(2, 2, 5, 'iGold2')]
    v += [(-2, 2, 4, 'iRed'), (-1, 2, 4, 'iRed2'), (-2, 2, 5, 'iRed')]
    return v


def agencia():
    v = []
    for x in range(-3, 4):
        for y in range(-3, 4):
            for z in range(0, 16):
                edge = abs(x) == 3 or abs(y) == 3
                if not edge and z < 15:
                    continue
                c = 'iConc'
                if edge and z % 3 != 0 and z < 15 and ((abs(x) == 3 and abs(y) < 3) or (abs(y) == 3 and abs(x) < 3)):
                    c = 'gCyan' if ((x + y + z) % 5 == 0) else 'iGlass'
                v.append((x, y, z, c))
    v += box(-4, 4, -4, 4, 0, 0, 'iConc2') + box(-1, 1, 3, 3, 0, 2, 'iGlass2')
    v += box(-4, 4, -4, 4, 16, 16, 'iConc2')
    v += [(1, 1, z, 'iPole') for z in range(17, 24)] + [(1, 1, 24, 'gRed')]
    v += disc(2.2, 18, 'iSteel', -1, -1) + [(-1, -1, 17, 'iSteel2'), (-1, -1, 19, 'iSteel3')]
    v += [(-1, 3, z, 'iGold') for z in (11, 12)] + [(0, 3, 12, 'iGold'), (1, 3, 11, 'iGold'), (1, 3, 12, 'iGold'), (0, 3, 13, 'iGold')]
    return v


def rifle(p0, p1, y):
    """rifle in the x-z plane at column y from butt p0=(x,z) to muzzle p1."""
    v = []
    dx, dz = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    nx, nz_ = -uz, ux
    for i in range(int(L * 2) + 1):
        t = i / 2
        x, z = p0[0] + ux * t, p0[1] + uz * t
        c = 'iStock' if t < 4 else ('iGun2' if t < 9 else 'iGun')
        v.append((round(x), y, round(z), c))
        if t < 3.5:
            v.append((round(x - nx), y, round(z - nz_), 'iStock'))
        if 5 <= t <= 6.5:
            v.append((round(x - nx * 2), y, round(z - nz_ * 2), 'iGun'))           # magazine
        if 4 <= t <= 9:
            v.append((round(x - nx), y, round(z - nz_), 'iGun2'))
    return v


def combate():
    v = []
    LIGHT = {'iStock': 'iWood', 'iGun2': 'iSteel2', 'iGun': 'iSteel3'}
    for ang, z0 in ((-90, 1), (180, 3)):
        r = rifle((-7, 0), (7, 0), 0)
        a = math.radians(ang)
        for x, _, y, c in r:
            for dz in (0, 1):
                X, Y = x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
                v.append((round(X), round(Y), z0 + dz, LIGHT.get(c, c) if dz else ('iWood2' if c == 'iStock' else 'iGun')))
        mx, my = 7.6 * math.cos(a), 7.6 * math.sin(a)
        v += V.ball(mx + 1.2 * math.cos(a), my + 1.2 * math.sin(a), z0 + 1, 1.3, ['gFlash', 'gAmber'])
    return P.scale_up(v, 1.06)


def ameacas():
    v = []
    for z in range(0, 17):
        hw = (16 - z) * 0.58
        for x in range(-8, 9):
            if abs(x) <= hw:
                rim = abs(x) > hw - 1.6 or z < 2
                c = 'gRed' if rim else 'iWhite'
                v += [(x, 0, z, c), (x, -1, z, 'iRed2')]
    v += [(x, 1, z, 'iBlack') for x in (-1, 0, 1) for z in range(6, 12) if not (z == 6 and x != 0)]
    v += [(x, 1, z, 'iBlack') for x in (-1, 0, 1) for z in (3, 4) if x != -1 or z == 3]
    return v


def relatorio():
    v = box(-5, 4, -4, 4, 0, 0, 'iFolder2') + box(-5, 4, -4, 4, 1, 1, 'iFolder')
    for k, z in enumerate((2, 3, 4)):
        v += box(-4 + k % 2, 3, -3, 3 - k % 2, z, z, 'iPaper' if z < 4 else 'iPaper')
    v += [(x, y, 4, 'iInk') for x in range(-3, 3) for y in (-2, 0) if (x + y) % 3]
    v += [(x, 2, 4, 'iInk') for x in range(-3, 0)]
    v += box(-1, 2, -3, 3, 5, 5, 'iPaper')
    v += [(x, y, 5, 'iInk') for x in (0, 1) for y in range(-2, 3) if y != 0]
    v += box(-4, 4, -5, -5, 1, 4, 'iFolder2')                                  # folder tab back
    v += box(2, 3, 1, 3, 6, 6, 'gRed') + [(2, 1, 6, 'iRed2')]                   # stamp mark
    v += [(x, x // 2 + 3, 6 + (x + 4) // 3, 'iGold') for x in range(-4, 1)]      # pen
    return v


def cofre():
    v = box(-4, 4, -4, 4, 1, 11, 'iSteel2') + box(-4, 4, -4, 4, 12, 12, 'iSteel')
    v += box(-3, 3, 5, 5, 2, 10, 'iSteel') + [(x, 5, z, 'iSteel3') for x in (-3, 3) for z in range(2, 11)]
    v += [(x, 5, z, 'iSteel3') for x in range(-3, 4) for z in (2, 10)]
    v += disc_xz(0, 6, 6, 2.3, lambda x, z: 'iGold' if x * x + z * z > 2 else ('iGold2' if (x, z) != (0, 0) else 'iBlack'))
    v += [(0, 6, 8, 'iBlack')]
    v += [(3, 6, z, 'iSteel3') for z in (5, 6, 7)] + [(3, 7, 6, 'iSteel')]
    v += [(x, y, 0, 'iSteel3') for x in (-4, 4) for y in (-4, 4)]
    return v


def estacao():
    v = box(-5, 5, -4, 4, 0, 6, 'iConc') + box(-6, 6, -5, 5, 7, 7, 'iConc2')
    v += box(-1, 1, 4, 4, 0, 4, 'iSteel3') + [(2, 4, 3, 'gAmber')]
    v += box(-4, -3, 4, 4, 2, 4, 'iGlass') + [(-4, 4, 3, 'gCyan')]
    v += [(5, y, z, 'iGlass') for y in (-2, 1) for z in (3, 4)]
    v += box(-3, -1, -2, 0, 8, 8, 'iSteel3') + [(-2, -1, z, 'iSteel3') for z in (9, 10)]
    for x in range(-5, 2):                                                       # dish tilted up toward +x/+y
        for y in range(-4, 3):
            d = math.hypot(x + 2, y + 1)
            if d <= 3.3:
                v.append((x, y, 11 + round(d * 0.7), 'iWhite' if d > 1 else 'iSteel'))
    v += [(-2, -1, z, 'iPole') for z in (12, 13)] + [(-2, -1, 14, 'gRed')]
    v += [(4, -3, z, 'iPole') for z in range(8, 15)] + [(4, -3, 15, 'gGreen')]
    return v


def frota():
    hi = CA.jato(0, gear=1)
    hi = [(x, y, z, 'iSteel' if c == 'cw' and abs(y) > 2 else c) for x, y, z, c in hi if c not in ('blur1', 'rotor')]
    lo = P.scale_down(hi, 2.7, thresh=0.3, prio=('stripe2', 'glassV'))
    mn = min(p[2] for p in lo)
    lo = [(x, y, z - mn + 1, c) for x, y, z, c in lo]
    lo += box(-7, 7, -6, 6, 0, 0, 'iTarmac')
    lo += [(x, 0, 0, 'iLine') for x in range(-7, 8) if x % 3 != 0]
    return lo


def escolta():
    v = []
    for z in range(0, 15):
        hw = 6 if z >= 6 else 6 - (6 - z) * 0.95
        for x in range(-6, 7):
            if abs(x) <= hw:
                rim = abs(x) > hw - 1.2 or z >= 14 or z == 0
                v += [(x, 0, z, 'iSteel' if rim else 'iBlue'), (x, -1, z, 'iSteel2')]
    # jet chevron on the face
    for x, z in ((0, 11), (0, 10), (0, 9), (0, 8), (0, 7), (0, 6), (-1, 8), (1, 8), (-2, 7), (2, 7), (-3, 7), (3, 7), (-1, 5), (1, 5), (0, 5)):
        v.append((x, 1, z, 'iWhite'))
    return v


def mini(x, y, cloth, cloth2, hair='iHair', gun=False):
    v = box(x, x, y, y + 1, 0, 2, 'iSuit2') + box(x, x, y, y + 1, 3, 5, cloth) + [(x - 1, y, 4, cloth2), (x - 1, y + 1, 4, cloth2)]
    v += [(x, y, 6, 'iSkin'), (x, y + 1, 6, 'iSkin'), (x, y, 7, hair), (x, y + 1, 7, hair), (x - 1, y, 6, hair), (x - 1, y + 1, 6, hair)]
    v += [(x, y - 1, 4, cloth), (x, y + 2, 4, cloth), (x, y - 1, 3, 'iSkin'), (x, y + 2, 3, 'iSkin')]
    if gun:
        v += [(x + 1, y + 2, 4, 'iGun'), (x + 2, y + 2, 4, 'iGun'), (x + 3, y + 2, 4, 'iGun')]
    return v


def equipes():
    v = box(-4, 4, -5, 4, -1, -1, 'iTarmac')
    v += mini(-3, -4, 'iTac', 'iTac2', gun=True) + mini(2, 0, 'iSuit', 'iSuit2') + mini(-3, 2, 'iTac', 'iTac2', gun=True)
    v = [(x * 1, y, z, c) for x, y, z, c in v]
    return P.scale_up(v, 1.34)


def contratos():
    v = box(-4, 4, -5, 4, 0, 0, 'iPaper2') + box(-4, 4, -5, 4, 1, 1, 'iPaper')
    v += [(x, -5, 2, 'iPaper2') for x in range(-4, 5)] + [(x, -6, 2, 'iPaper') for x in range(-4, 5)]        # rolled top
    v += [(x, y, 1, 'iInk') for y in (-3, -1, 1) for x in range(-3, 4) if (x * 5 + y) % 7]
    v += [(x, 3, 1, 'iInk') for x in range(-3, 0)]
    v += disc(1.6, 2, lambda x, y: 'gRed' if x * x + y * y < 1.5 else 'iRed2', 2, 2) + [(3, 4, 1, 'iRed'), (2, 4, 1, 'iRed')]
    v += line((-5, 6, 2), (2, 1, 9), 'iGold') + [(2, 1, 10, 'iWhite'), (3, 0, 11, 'iWhite'), (1, 1, 10, 'iWhite')]
    v += [(-5, 6, 2, 'iBlack')]
    return v


def arsenal():
    v = box(-5, 5, -3, 3, 0, 5, 'iOl') + box(-5, 5, -3, 3, 6, 6, 'iOl2')
    v += [(x, 3, z, 'iOl2') for x in (-5, 0, 5) for z in range(0, 6)]
    v += [(x, 4, z, 'iSten') for x, z in ((-3, 3), (-2, 3), (-3, 2), (2, 3), (3, 3), (2, 2), (3, 2), (-2, 2))]
    v += [(x, 4, 3, 'iYel') for x in (-4, 4)]
    r = rifle((-7, 0), (8, 0), 0)
    v += [(x, z, 7, c) for x, _, z, c in r]                                     # rifle lying on the lid
    v += [(x, -2, 7 + k, 'iGold') for k, x in enumerate((-3, -3)) ] + [(-2, -2, 7, 'iGold'), (-2, -2, 8, 'iGold2')]
    return v


def cacadas():
    v = []
    for x in range(-10, 11):
        for y in range(-10, 11):
            d = math.hypot(x, y)
            if 6.2 <= d <= 7.6 or (d <= 10 and (abs(x) == 0 or abs(y) == 0) and d > 3.5 and not 7.6 < d < 8.2):
                v.append((x, y, 0, 'gRed'))
    v += [(x, y, -1, 'iTarmac') for x in range(-8, 9) for y in range(-8, 9) if x * x + y * y <= 64]
    v += P.scale_up(mini(0, -1, 'iSuit', 'iSuit2'), 1.4)
    return v


def _cacadas_old():
    v = disc_xz(0, 0, 8, 7.2, lambda x, z: 'gRed', hole=5.6)
    v += [(x, 0, 8, 'gRed') for x in list(range(-9, -4)) + list(range(5, 10))]
    v += [(0, 0, z, 'gRed') for z in list(range(-1, 4)) + list(range(13, 18))]
    v += [(0, 0, 8, 'gAmber')]
    v += box(-1, 1, -1, -1, 2, 14, 'iRed2') if False else []
    v += disc_xz(0, -2, 8, 7.2, lambda x, z: 'iRed2', hole=5.6)
    # a small silhouette target behind
    v += box(-1, 1, -6, -5, 0, 8, 'iSuit2') + box(-1, 1, -6, -5, 9, 11, 'iSuit') + box(-2, 2, -6, -5, 5, 8, 'iSuit2')
    return [p for p in v if p[2] >= -1]


def campanha():
    v = []
    for x in range(-7, 7):
        for y in range(-6, 6):
            fold = (x // 4) % 2
            v.append((x, y, 0, 'iMap2' if fold else 'iMap'))
    v += [(x, y, 0, 'iWater') for x in range(-7, -3) for y in range(-6, -2)]
    path = [(-5, 4), (-4, 3), (-3, 3), (-2, 2), (-1, 1), (0, 1), (1, 0), (2, -1), (3, -1), (4, -2)]
    v += [(x, y, 1, 'gRed') for i, (x, y) in enumerate(path) if i % 2 == 0]
    v += [(-5, 4, 1, 'iBlue'), (-5, 4, 2, 'iBlue')]
    v += [(4, -2, z, 'iPole') for z in range(1, 10)]
    v += [(x, -2, z, 'iRed' if x % 2 else 'iRed2') for x in range(5, 9) for z in range(6, 10) if not (x == 8 and z in (6, 9))]
    v += [(-2, 4, 1, 'iGold'), (2, 3, 1, 'iGold'), (-6, -1, 1, 'iInk'), (-5, -1, 1, 'iInk')]
    return v


def configuracoes():
    v = []
    for x in range(-8, 9):
        for y in range(-8, 9):
            d = math.hypot(x, y)
            a = math.degrees(math.atan2(y, x)) % 45
            tooth = d <= 8 and d > 5.6 and (a < 13 or a > 32)
            body = 2.4 <= d <= 5.9
            if tooth or body:
                for z in (0, 1, 2):
                    v.append((x, y, z, 'iSteel' if z == 2 else 'iSteel2'))
    v += [(x, y, 2, 'iSteel3') for x in range(-5, 6) for y in range(-5, 6) if 3.6 < math.hypot(x, y) < 4.4]
    return v


def dinheiro():
    v = []
    for k, (bx, by, h) in enumerate(((-3, -2, 3), (2, -3, 2), (-2, 3, 2))):
        for j in range(h):
            z0 = j * 2
            v += box(bx - 2, bx + 2, by - 1, by + 1, z0, z0 + 1, 'iCash' if j % 2 == 0 else 'iCash2')
            v += [(bx, yy, z, 'iBand') for yy in range(by - 1, by + 2) for z in (z0, z0 + 1)]
    for j in range(6):
        v += disc(1.7, j, 'iGold' if j % 2 == 0 else 'iGold2', 4, 3)
    v += disc(1.7, 6, 'iGold', 4, 3) + [(4, 3, 7, 'gAmber')]
    return v


ICONS = [
    # id (atlas key), label pt-BR, GameIcon id or None, builder
    ('pais', 'País', None, pais), ('mercado', 'Mercado', 'crate', mercado), ('agencia', 'Agência', 'rival', agencia),
    ('combate', 'Combate', 'tactic-assault', combate), ('ameacas', 'Ameaças', 'threat', ameacas),
    ('relatorio', 'Relatório', 'intel', relatorio), ('cofre', 'Cofre', 'vault', cofre), ('estacao', 'Estação', 'station-office', estacao),
    ('frota', 'Frota', 'fleet', frota), ('escolta', 'Escolta', None, escolta), ('equipes', 'Equipes', 'team', equipes),
    ('contratos', 'Contratos', 'contract', contratos), ('arsenal', 'Arsenal', 'rifles', arsenal),
    ('cacadas', 'Caçadas', 'neutralization', cacadas), ('campanha', 'Campanha', 'special-op', campanha),
    ('configuracoes', 'Configurações', None, configuracoes), ('dinheiro', 'Dinheiro', 'money', dinheiro),
]


# ======================================================================== render + fit
def render_icon(vox, size):
    rig.CW, rig.CH, rig.CX, rig.CY = 200, 200, 100, 130
    im = rig.render(vox)
    gl = [p for p in vox if p[3] in GLOWK]
    if gl:                                                    # soft coloured glow from emissive voxels
        g = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(g)
        for x, y, z, c in gl:
            sx, sy = V.scr(x, y, z)
            d.rectangle([sx, sy, sx + 3, sy + 3], fill=GLOW_RGB[c] + (120,))
        g = g.filter(ImageFilter.GaussianBlur(2.2 if size > 40 else 1.4))
        g.alpha_composite(im); im = g
    b = im.getbbox()
    c = im.crop(b)
    if c.width > size or c.height > size:
        print(f'  WARNING icon {c.size} > {size}')
        c.thumbnail((size, size), Image.NEAREST)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(c, ((size - c.width) // 2, (size - c.height) // 2))
    return out


def fit_vox(vox, f):
    return P.scale_down(vox, f, thresh=0.45, prio=tuple(GLOWK) + ('iBlack', 'iInk'))


if __name__ == '__main__':
    rows64, rows32, mapping = [], [], []
    for iid, label, gid, fn in ICONS:
        vox = fn()
        a = render_icon(vox, 64)
        b = a.resize((32, 32), Image.BOX)
        b.putalpha(b.getchannel('A').point(lambda k: 255 if k >= 110 else 0))
        rows64.append(a); rows32.append(b)
        mapping.append(dict(id=iid, label=label, gameIcon=gid))
    for size, ims in ((64, rows64), (32, rows32)):
        cols = 6
        rows = math.ceil(len(ims) / cols)
        sheet = Image.new('RGBA', (cols * size, rows * size), (0, 0, 0, 0))
        items = []
        for i, (im, m) in enumerate(zip(ims, mapping)):
            x, y = (i % cols) * size, (i // cols) * size
            sheet.paste(im, (x, y))
            items.append(dict(m, x=x, y=y, w=size, h=size))
        P.save_png(sheet, os.path.join(OUT, f'ui-icons-{size}.png'))
        P.write_json(dict(kind='icons', id=f'ui-icons-{size}', image=f'ui-icons-{size}.png', width=sheet.width, height=sheet.height,
                          frameWidth=size, frameHeight=size, anchor=dict(x=size // 2, y=size // 2), columns=cols,
                          icons=items, animations=[dict(name=m['id'], row=i // cols, col=i % cols, frames=1, fps=1, loop=False)
                                                   for i, m in enumerate(mapping)]),
                     os.path.join(OUT, f'ui-icons-{size}.json'))
        print(f'ui-icons-{size}: {len(ims)} icons, {os.path.getsize(os.path.join(OUT, f"ui-icons-{size}.png")) // 1024} KB')
    # preview: dark + light-ish strip, 64 at 2x, 32 at 2x and 1x
    pv = Image.new('RGB', (len(ICONS) * 140 // 2 + 20, 380), (14, 16, 22))
    pv = Image.new('RGB', (9 * 140 + 10, 2 * 205 + 10), (14, 16, 22))
    d = ImageDraw.Draw(pv)
    for i, (a, b, m) in enumerate(zip(rows64, rows32, mapping)):
        x, y = 10 + (i % 9) * 140, 10 + (i // 9) * 205
        tile = Image.new('RGBA', (128, 128), (34, 38, 48, 255)); tile.alpha_composite(a.resize((128, 128), Image.NEAREST))
        pv.paste(tile.convert('RGB'), (x, y))
        t2 = Image.new('RGBA', (64, 64), (34, 38, 48, 255)); t2.alpha_composite(b.resize((64, 64), Image.NEAREST))
        pv.paste(t2.convert('RGB'), (x, y + 132))
        t3 = Image.new('RGBA', (32, 32), (34, 38, 48, 255)); t3.alpha_composite(b)
        pv.paste(t3.convert('RGB'), (x + 70, y + 132))
        t4 = Image.new('RGBA', (32, 32), (34, 38, 48, 255)); t4.alpha_composite(a.resize((32, 32), Image.BOX))
        pv.paste(t4.convert('RGB'), (x + 70, y + 164 - 0))
        d.text((x + 2, y + 2), m['label'], fill=(240, 180, 60))
    if os.environ.get('SPRITES_PREVIEW'):
        os.makedirs(P.PREV, exist_ok=True)
        pv.save(os.path.join(P.PREV, 'ui-icons.png'))
