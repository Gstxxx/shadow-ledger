"""Rig e renderizador comuns dos personagens (2:1 iso, voxels de 4px, luz por face), virados para SE (+x).

Convenção: lean > 0 inclina o tronco para a frente; fall < 0 derruba o corpo para trás, fall > 0 para a frente.
O corpo padrão (upper) é o guarda-costas urbano; os outros conjuntos trocam rig.upper e rig.C ao importar.

Rig: two-segment legs (thigh/shin angles), arms as shoulder->hand lines with explicit hand targets,
upper body pitch (lean), whole-body fall rotation. Renderer: 2:1 iso, 4px voxels, per-face light.
"""
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CW, CH, CX, CY = 128, 100, 64, 70

C = {
    'shoe': (22, 22, 26), 'shoe2': (60, 60, 66),
    'pants': (46, 50, 60), 'pants2': (36, 40, 48),
    'suit': (52, 57, 68), 'suit2': (40, 44, 54), 'shirt': (226, 228, 232), 'tie': (150, 34, 44),
    'skin': (214, 160, 120), 'skin2': (182, 128, 92), 'hair': (34, 28, 24),
    'shades': (16, 18, 22), 'glint': (160, 210, 240), 'ear': (200, 204, 214),
    'pistol': (34, 34, 38), 'slide': (84, 86, 96), 'mag': (46, 46, 52),
    'f1': (255, 250, 210), 'f2': (255, 200, 80), 'f3': (240, 120, 40),
    'hit': (235, 60, 50), 'hit2': (255, 160, 140), 'brass': (230, 186, 80),
    'floorA': (66, 70, 78), 'floorB': (58, 62, 70), 'cover': (120, 116, 108), 'cover2': (96, 92, 86),
}
EMISSIVE = {'f1', 'f2', 'f3', 'hit', 'hit2', 'brass', 'glint'}


def box(x0, x1, y0, y1, z0, z1, c):
    return [(x, y, z, c) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) for z in range(z0, z1 + 1)]


def seg(a, b, c, ys, thick=True):
    """Limb segment between float points a=(x,z) and b=(x,z), occupying y columns ys."""
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
    out = []
    for i in range(n + 1):
        t = i / n
        x = a[0] + (b[0] - a[0]) * t; z = a[1] + (b[1] - a[1]) * t
        xs = (math.floor(x), math.floor(x) + 1) if thick else (round(x),)
        for y in ys:
            for xx in xs:
                out.append((xx, y, round(z), c))
    return out


def arm(sh, hand, ys, c='suit'):
    """Arm from shoulder (x,y,z) to hand (x,y,z) in 3D, 1 voxel thick, sleeve then hand."""
    n = max(abs(hand[k] - sh[k]) for k in range(3)) or 1
    out = []
    for i in range(int(n) + 1):
        t = i / n
        p = [round(sh[k] + (hand[k] - sh[k]) * t) for k in range(3)]
        out.append((p[0], p[1], p[2], c))
        out.append((p[0], p[1], p[2] - 1, c)) if t < 0.5 else None
    out = [o for o in out if o]
    out.append((round(hand[0]), round(hand[1]), round(hand[2]), 'skin'))
    return out


def leg(side, thigh, shin, hip=(-0.5, 7.0)):
    ys = (-2, -1) if side == 'L' else (0, 1)
    a1 = math.radians(thigh); a2 = math.radians(thigh + shin)
    knee = (hip[0] + 3.2 * math.sin(a1), hip[1] - 3.2 * math.cos(a1))
    foot = (knee[0] + 3.6 * math.sin(a2), knee[1] - 3.6 * math.cos(a2))
    v = seg(hip, knee, 'pants', ys) + seg(knee, foot, 'pants2', ys)
    fx, fz = math.floor(foot[0]), round(foot[1])
    v += box(fx, fx + 2, ys[0], ys[1], fz - 1, fz - 1, 'shoe') + [(fx + 2, ys[0], fz - 1, 'shoe2')]
    return v, foot


def pistol(hand, recoil=0, tilt_up=False):
    x, y, z = [round(k) for k in hand]
    x += recoil
    v = box(x, x + 3, y, y, z + 1, z + 1, 'slide') + box(x, x, y, y, z - 1, z, 'pistol') + [(x + 1, y, z, 'pistol')]
    if tilt_up:
        v = box(x, x, y, y, z + 1, z + 4, 'slide') + box(x, x, y, y, z - 1, z, 'pistol')
    return v


def upper(pose):
    """Torso, head and arms, in body coordinates (hips at z=7)."""
    v = box(-1, 0, -2, 1, 7, 7, 'pants2')
    v += box(-1, 0, -2, 1, 8, 13, 'suit') + box(-2, -2, -2, 1, 9, 13, 'suit2')
    v += box(1, 1, -2, -2, 8, 12, 'suit') + box(1, 1, 1, 1, 8, 12, 'suit')       # lapels
    v += box(1, 1, -1, 0, 9, 13, 'shirt') + box(1, 1, 0, 0, 9, 12, 'tie') + [(2, 0, 12, 'tie')]
    # head
    v += box(-1, 1, -1, 0, 14, 16, 'skin') + box(-1, -1, -1, 0, 14, 14, 'skin2')
    v += box(-2, 0, -2, 1, 17, 17, 'hair') + box(-2, -2, -2, 1, 14, 16, 'hair') + box(-1, 1, -2, 1, 16, 16, 'hair')
    v += box(2, 2, -1, 0, 15, 15, 'shades') + [(2, 0, 15, 'glint'), (0, 1, 15, 'ear'), (0, 1, 14, 'ear'), (-1, 1, 13, 'ear')]
    # arms
    rh, lh = pose['rh'], pose['lh']
    v += arm((0, 2, 13), rh, None or 2) if False else arm((0, 2, 13), rh, (2,))
    v += arm((0, -3, 13), lh, (-3,))
    g = pose.get('gun')
    if g == 'hand':
        v += pistol(rh, pose.get('recoil', 0), pose.get('gun_up', False))
    elif g == 'holster':
        v += box(-1, -1, 2, 2, 8, 9, 'pistol')
    v += pose.get('uextra', [])
    return v


def rot_y(vox, ang, px, pz):
    if not ang:
        return vox
    a = math.radians(ang); ca, sa = math.cos(a), math.sin(a)
    src = {(x, y, z): c for x, y, z, c in vox}
    xs = [p[0] for p in src]; zs = [p[2] for p in src]; ys = {p[1] for p in src}
    r = int(max(abs(x - px) for x in xs) + max(abs(z - pz) for z in zs)) + 2
    out = []
    for X in range(int(px) - r, int(px) + r + 1):
        for Z in range(int(pz) - r, int(pz) + r + 1):
            dx, dz = X - px, Z - pz
            sx = px + dx * ca + dz * sa; sz = pz - dx * sa + dz * ca
            for y in ys:
                c = src.get((round(sx), y, round(sz)))
                if c:
                    out.append((X, y, Z, c))
    return out


def figure(p):
    lv, lf = leg('L', *p.get('L', (0, 0)))
    rv, rf = leg('R', *p.get('R', (0, 0)))
    drop = p.get('drop', 0)                          # crouch: body lowered
    lowest = min(lf[1], rf[1])
    ground = -lowest + 1 if p.get('plant', True) else 0
    legs = [(x, y, z + round(ground) - drop * 0, c) for x, y, z, c in lv + rv]
    # rot_y gira para trás com ângulo positivo; aqui lean > 0 inclina PARA A FRENTE (+x)
    up = rot_y(upper(p), -p.get('lean', 0), -0.5, 7)
    up = [(x, y, z + round(ground), c) for x, y, z, c in up]
    v = legs + up
    # fall < 0 cai PARA TRÁS (pivô no calcanhar); fall > 0 cai para a frente
    v = rot_y(v, -p.get('fall', 0), -1.5, 0)
    v = [(x + p.get('dx', 0), y, z + p.get('dz', 0), c) for x, y, z, c in v]
    return v + p.get('extra', [])


def shade(c, k, x, y, z):
    j = (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >> 3) % 11 - 5
    return tuple(max(0, min(255, int(v * k + j))) for v in C[c]) + (255,)


def render(vox):
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); pix = im.load()
    cells = {}
    for x, y, z, c in vox:
        cells[(x, y, z)] = c
    for (x, y, z), c in sorted(cells.items(), key=lambda kv: (kv[0][0] + kv[0][1] + kv[0][2], kv[0][2])):
        sx = CX + (x - y) * 2 - 2; sy = CY + (x + y) - z * 2 - 2
        e = c in EMISSIVE
        top, left, right = (shade(c, 1, x, y, z),) * 3 if e else (shade(c, 1.18, x, y, z), shade(c, .9, x, y, z), shade(c, .66, x, y, z))
        for (fx, fy), col in (((1, 0), top), ((2, 0), top), ((0, 1), top), ((1, 1), top), ((2, 1), top), ((3, 1), top),
                              ((0, 2), left), ((1, 2), left), ((0, 3), left), ((1, 3), left),
                              ((2, 2), right), ((3, 2), right), ((2, 3), right), ((3, 3), right)):
            X, Y = sx + fx, sy + fy
            if 0 <= X < CW and 0 <= Y < CH:
                pix[X, Y] = col
    a = im.split()[3].filter(ImageFilter.MaxFilter(3))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste(Image.new('RGBA', im.size, (14, 16, 20, 255)), mask=a)
    out.alpha_composite(im)
    # glow on emissive pixels
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); gp = g.load(); sp = im.load()
    for yy in range(CH):
        for xx in range(CW):
            r, gg, b, al = sp[xx, yy]
            if al and r > 220 and gg > 110 and b < 120:
                gp[xx, yy] = (255, 190, 90, 150)
    out.alpha_composite(g.filter(ImageFilter.GaussianBlur(3)))
    return out



F = lambda **p: render(figure(p))

def export(ROWS, ONESHOT, set_id, stills=False, shadow=True, default_fps=8):
    """Grava public/sprites/<set_id>.png + .json (ver atlas.py). ROWS = [(rótulo, quadros)]."""
    import atlas
    atlas.write_set(set_id, ROWS, ONESHOT, anchor=(CX, CY + 1),
                    shadow=atlas.ellipse_shadow(CX, CY + 1) if shadow else None, default_fps=default_fps, stills=stills)
