"""portraits-story: voxel bust portraits (front 3/4, face toward +x like every sprite), rendered with the rig
renderer (4px voxels, per-face light, dark outline, emissive glow). The rig head is scaled up (~13 voxels wide)
so eyes/brows/mouth get their own voxels. 4-frame idle: breath up, hold, blink. 128 px frames; 64 px = box downscale."""
import sys, os
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import math
import pmisc as P
import rig
from PIL import Image, ImageDraw, ImageFilter

OUT = P.PUB
# light from the front-right for portraits: the face (+x) gets the full light, the +y side is the shadow side
P.graded_shade(gamma=1.0, sat=1.0, faces=(1.14, 0.84, 1.0))

rig.C.update({
    'eyeW': (232, 228, 222), 'lash': (34, 26, 24), 'mouth': (120, 60, 56), 'lipsF': (168, 82, 86),
    # analyst
    'aSkin': (204, 150, 114), 'aSkin2': (176, 122, 90), 'aHair': (44, 30, 26), 'aHair2': (30, 20, 18), 'aIris': (70, 46, 30),
    'blazer': (40, 42, 52), 'blazer2': (30, 32, 40), 'blouse': (226, 230, 236), 'frame': (24, 24, 28), 'hset': (36, 38, 44),
    'hset2': (70, 74, 84), 'tab': (30, 32, 38), 'tabS': (110, 225, 240), 'tabS2': (70, 190, 225), 'micT': (255, 90, 70),
    # arrieta
    'tSkin': (196, 152, 124), 'tSkin2': (166, 122, 98), 'tBag': (150, 108, 100), 'tHair': (176, 174, 170), 'tHair2': (140, 138, 136),
    'beard': (186, 184, 180), 'beard2': (150, 148, 146), 'tIris': (58, 66, 60), 'tLid': (110, 76, 62), 'trench': (150, 124, 82), 'trench2': (120, 96, 60),
    'tShirt': (196, 200, 196), 'tScarf': (70, 60, 56),
    # moravia boss
    'bSkin': (222, 184, 156), 'bSkin2': (190, 150, 124), 'bHair': (22, 22, 26), 'bHairHi': (74, 78, 92), 'bIris': (150, 190, 214),
    'suit': (34, 36, 42), 'suit2': (26, 27, 32), 'pin': (66, 70, 80), 'shirt': (236, 236, 240), 'tie': (110, 22, 34), 'tie2': (80, 16, 26),
    'ringG': (255, 206, 80), 'ringG2': (210, 160, 50), 'cuff': (236, 236, 240),
    # enforcer
    'eSkin': (198, 146, 112), 'eSkin2': (166, 116, 86), 'stub': (60, 50, 44), 'eIris': (60, 64, 60), 'scar': (244, 196, 186), 'stub2': (84, 70, 60),
    'lea': (32, 30, 30), 'lea2': (52, 48, 46), 'turtle': (22, 22, 24), 'wire': (210, 214, 220), 'tat': (40, 70, 80),
})
rig.EMISSIVE |= {'tabS', 'tabS2', 'ringG', 'micT'}
GLOW = {'tabS': (90, 220, 255), 'tabS2': (90, 220, 255), 'ringG': (255, 200, 90), 'micT': (255, 70, 50)}

HC = 27                      # head centre height
A, B, CZ = 8.0, 7.4, 10.5    # head radii: u (depth), v (width), z (height)
YAW = 22                     # face turned from +x toward +y (front 3/4 to the viewer)
EYE = HC                     # eye row; lash HC+1, brow HC+3, nose HC-1..HC-4, mouth HC-6


def head_b(z, jaw=1.0):
    if z < HC - 2:
        return B * (1 - 0.22 * jaw * (HC - 2 - z) / (CZ - 2))
    return B


def head_in(u, v, z, jaw=1.0, sq=2.0):
    return abs(u / A) ** sq + abs(v / head_b(z, jaw)) ** sq + ((z - HC) / CZ) ** 2 <= 1.0


def shell(u, v, z, d=1.0, jaw=1.0):
    return (u / (A + d)) ** 2 + (v / (head_b(z, jaw) + d)) ** 2 + ((z - HC) / (CZ + d)) ** 2 <= 1.0


def face_front(u, v, z, ch):
    return head_in(u, v, z, ch.get('jaw', 1), ch.get('sq', 2)) and not head_in(u + 1.0, v, z, ch.get('jaw', 1), ch.get('sq', 2)) and u > 1.5


def eye_tex(v, z, ch, blink):
    av = abs(v)
    if z == EYE and 1.3 <= av <= 3.9:
        if blink:
            return ch['lid']
        return ch['iris'] if abs(av - 2.4) <= 0.75 else 'eyeW'
    if z == EYE + 1 and 1.1 <= av <= 4.1:
        return ch['lid2'] if blink else ch.get('upper', 'lash')
    if z == EYE + 3 and 1.0 <= av <= 4.4 + ch.get('brow_out', 0):
        return ch['browc']
    if ch.get('bags') and z == EYE - 1 and 1.5 <= av <= 3.9:
        return ch['bags']
    if z == HC - 6 and av <= 1.8:
        return ch.get('mouth', 'mouth')
    if ch.get('lower_lip') and z == HC - 7 and av <= 1.2:
        return ch['lower_lip']
    return None


def build(ch, blink=False, breath=0):
    out = []
    s, s2 = ch['skin'], ch['skin2']
    ca, sa = math.cos(math.radians(YAW)), math.sin(math.radians(YAW))
    W0, D0 = ch.get('shoulder', 13), 6
    for x in range(-20, 21):
        for y in range(-20, 21):
            u = x * ca + y * sa
            v = -x * sa + y * ca
            for z in range(0, HC + 14):
                c = None
                # hair / head
                if shell(u, v, z, 1.2, ch.get('jaw', 1)):
                    c = ch['hair'](u, v, z, head_in(u, v, z, ch.get('jaw', 1), ch.get('sq', 2)))
                    if c is None and head_in(u, v, z, ch.get('jaw', 1), ch.get('sq', 2)):
                        c = s
                        if face_front(u, v, z, ch):
                            c = eye_tex(v, z, ch, blink) or s
                            for t in ch.get('tex', []):
                                c = t(u, v, z, blink) or c
                    # ears on both sides
                    if c is None and not ch.get('no_ear') and HC - 3 <= z <= HC + 1 and -1.8 <= u <= 0.6 and B - 0.6 <= abs(v) <= B + 1.0:
                        c = s2 if z in (HC - 3, HC + 1) or abs(v) > B + 0.5 else s
                # nose
                if c is None and abs(v) <= 0.9 and HC - 4 <= z <= HC - 1:
                    uf = A * math.sqrt(max(0, 1 - ((z - HC) / CZ) ** 2)) - 0.6
                    if uf <= u <= uf + 1.2 + (HC - 1 - z) * 0.35 + ch.get('nose', 0):
                        c = s2 if z == HC - 4 else s
                # neck
                if c is None and 10 <= z < HC - 5 and (u + 0.5) ** 2 + v * v <= ch.get('neck', 3.4) ** 2:
                    c = ch.get('neckc', lambda u, v, z: None)(u, v, z) or (s2 if u < 0.5 else s)
                # torso
                if c is None and z <= 13:
                    w = W0 if z <= 8 else W0 - (z - 8) * 1.9
                    if abs(v) <= w:
                        uf = 5 - 2.4 * (abs(v) / W0) ** 3 - max(0, z - 10) * 0.5
                        if -D0 <= u <= uf:
                            c = ch['torso'](u, v, z, u > uf - 1.0, w)
                if c:
                    out.append((x, y, z, c))
    for (u, v, z, c) in ch.get('props', lambda: [])():
        out.append((round(u * ca - v * sa), round(u * sa + v * ca), round(z), c))
    if breath:
        out = [(x, y, z + breath if z >= 6 else z, c) for x, y, z, c in out] + [(x, y, 6, c) for x, y, z, c in out if z == 6]
    return out


# ======================================================================== characters
def suit_torso(c1, c2, shirt, tie=None, lapel=None, pin=None, vdepth=6):
    def f(u, v, z, front, w):
        if front and z >= 13 - vdepth:
            vw = (z - (13 - vdepth)) * 0.75 + 0.5
            if abs(v) <= vw:
                if tie and abs(v) <= 0.7 and z <= 12:
                    return tie
                return shirt
            if lapel and abs(v) <= vw + 1.8:
                return lapel
        if front and abs(v) <= 0.5 and z < 13 - vdepth:
            return c2
        if pin and round(v) % 3 == 0 and front:
            return pin
        return c1 if u > -2 else c2
    return f


def arc(r_v, r_z, u0, z0, c, c2=None, n=26, us=(0, 1)):
    v = []
    for k in range(n + 1):
        a = math.pi * k / n
        for du in us:
            v.append((u0 + du, r_v * math.cos(a), z0 + r_z * math.sin(a), c2 if (c2 and k % 4 == 0) else c))
    return v


def analyst():
    def hair(u, v, z, inside):
        top = z >= HC + 5
        back = u <= 0.5 and z >= HC - 8
        side = abs(v) >= B - 1.3 and z >= HC - 8 and u <= 3.5
        fringe = z >= HC + 5 and u > 0
        if not (top or back or side or fringe):
            return None
        if inside and not (top or back or side or fringe):
            return None
        if not inside and not shell(u, v, z, 1.0):
            return None
        return 'aHair2' if (fringe and round(v) % 3 == 0) or (round(u) + round(v) * 2 + z) % 9 == 0 else 'aHair'

    def glasses(u, v, z, blink):
        av = abs(v)
        if z in (EYE - 1, EYE + 1) and 0.9 <= av <= 4.6:
            return 'frame'
        if z == EYE and (0.9 <= av <= 1.5 or 4.1 <= av <= 4.6):
            return 'frame'
        if z == EYE + 1 and av < 0.9:
            return 'frame'
        return None

    def props():
        p = arc(B + 1.6, CZ + 1.6, -1.5, HC, 'hset', 'hset2')
        for dz in range(-3, 4):
            for du in range(-3, 3):
                if du * du + dz * dz <= 8:
                    for side in (1, -1):
                        p += [(du - 0.5, side * (B + 1.4), HC + dz, 'hset'), (du - 0.5, side * (B + 2.2), HC + dz, 'hset2' if abs(dz) < 2 else 'hset')]
        for i in range(12):                                  # mic boom from the left cup to the mouth
            t = i / 11
            p.append((-0.5 + t * 8.5, B + 1.4 - t * 6.4, HC - 2 - t * 4.5, 'hset'))
        p += [(8.6, 2.0, HC - 6.5, 'hset2'), (8.0, 2.4, HC - 6.5, 'micT')]
        for u in range(6, 13):                               # tablet held low, screen up
            for v in range(-8, 3):
                z = 3 + (u - 6) // 3
                p.append((u, v, z, 'tab'))
                if 6 < u < 12 and -8 < v < 2:
                    p.append((u, v, z + 1, 'tabS' if (u + v) % 5 else 'tabS2'))
        p += [(u, v, z, 'aSkin') for u in (7, 8) for v in (3, -9) for z in (3, 4, 5)]
        return p

    return dict(skin='aSkin', skin2='aSkin2', iris='aIris', lid='aSkin2', lid2='aSkin2', browc='aHair2', hair=hair,
                mouth='lipsF', lower_lip='aSkin2', tex=[glasses], props=props, no_ear=True, shoulder=12, neck=3.0,
                torso=suit_torso('blazer', 'blazer2', 'blouse', lapel='blazer2', vdepth=7))


def arrieta():
    def hair(u, v, z, inside):
        ok = shell(u, v, z, 0.9)
        if not ok:
            return None
        if (u <= -1.5 and z >= HC - 5) or (abs(v) >= B - 1.6 and HC - 3 <= z and u <= 2.5) or (z >= HC + 8 and u <= -0.5):
            if inside and not (u <= -2.5 or abs(v) >= B - 1 or z >= HC + 9):
                return None
            return 'tHair2' if (round(u) * 3 + round(v) + z) % 4 == 0 else 'tHair'
        # beard: jaw, chin, cheeks below the cheekbone
        if z <= HC - 3 and u >= -1.5:
            if z == HC - 6 and abs(v) <= 1.8 and u > 3:
                return 'mouth'
            if not inside and z > HC - 4:
                return None
            return 'beard2' if (round(v) + z) % 3 == 0 else 'beard'
        if abs(v) >= B - 2.2 and HC - 3 < z < HC and -1.5 <= u <= 3:
            return 'beard'
        return None

    def wrinkles(u, v, z, blink):
        if z == HC + 6 and abs(v) <= 3 and round(v) % 2 == 0:
            return 'tSkin2'
        if z == EYE and 4.0 <= abs(v) <= 4.8:
            return 'tSkin2'
        return None

    def props():
        p = []
        for z in range(11, 20):                               # raised trench collar
            for v in range(-9, 10):
                if 3.8 <= abs(v) <= 6.5 - (z - 11) * 0.2:
                    for u in range(-4, 3):
                        p.append((u, v, z, 'trench2' if u < -1 else 'trench'))
        return p
    return dict(skin='tSkin', skin2='tSkin2', iris='tIris', lid='tSkin2', lid2='tSkin2', upper='tLid', bags='tBag',
                browc='tHair2', brow_out=0.6, hair=hair, tex=[wrinkles], props=props, shoulder=13,
                torso=suit_torso('trench', 'trench2', 'tShirt', lapel='trench2', vdepth=7))


def boss():
    def hair(u, v, z, inside):
        if not shell(u, v, z, 0.8):
            return None
        if (z >= HC + 5 and u <= A - 1.5) or (u <= -2 and z >= HC - 4) or (abs(v) >= B - 1 and z >= HC + 1 and u <= 1.5):
            if inside and not (z >= HC + 5 or u <= -2 or abs(v) >= B - 1):
                return None
            if z >= HC + 7 and round(v) % 3 == 0:
                return 'bHairHi'                                # slicked-back comb lines
            return 'bHair'
        return None

    def cold(u, v, z, blink):
        if z == HC - 6 and 1.8 < abs(v) <= 2.6:
            return 'bSkin2'
        if z == EYE + 2 and 1.2 <= abs(v) <= 4.0:
            return 'bSkin2'                                     # low, heavy brow shadow
        return None

    def props():
        p = [(u, v, z, 'bSkin') for u in (7, 8) for v in range(-7, -3) for z in (5, 6, 7)]
        p += [(u, v, z, 'bSkin2') for u in (6,) for v in range(-7, -3) for z in (5, 6, 7)]
        p += [(u, v, 8, 'bSkin2') for u in (7, 8) for v in (-6, -5)]
        p += [(u, v, z, 'cuff') for u in (5, 6) for v in range(-7, -3) for z in (3, 4)]
        p += [(u, v, z, 'suit') for u in (3, 4, 5) for v in range(-8, -2) for z in (1, 2)]
        p += [(9, -5, 6, 'ringG'), (9, -4, 6, 'ringG2'), (9, -5, 7, 'ringG2')]
        p += [(6, 3.5, z, 'shirt') for z in (9, 10)] + [(6, 4, 10, 'shirt')]           # pocket square
        return p
    return dict(skin='bSkin', skin2='bSkin2', iris='bIris', lid='bSkin2', lid2='bSkin2', upper='bHair', browc='bHair',
                brow_out=0.4, hair=hair, tex=[cold], props=props, sq=2.25, jaw=0.7, shoulder=13,
                torso=suit_torso('suit', 'suit2', 'shirt', tie='tie', lapel='suit2', pin='pin', vdepth=7))


def enforcer():
    def hair(u, v, z, inside):
        if inside and ((z >= HC + 5 and u <= A - 1.2) or (u <= -2 and z >= HC - 2) or (abs(v) >= B - 1.2 and z >= HC + 2 and u <= 1)):
            return 'stub' if (round(u) * 3 + round(v) + z) % 7 else 'stub2'
        return None

    def marks(u, v, z, blink):
        if HC - 5 <= z <= HC + 5 and abs(v - (2.2 + (HC + 5 - z) * 0.22)) < 0.65 and z not in (EYE, EYE + 1):
            return 'scar'
        if z == HC - 8 and abs(v) <= 3:
            return 'eSkin2'
        return None

    def props():
        p = []
        for z in range(HC - 1, 11, -1):                         # earpiece coil
            p.append((-0.5 if z > HC - 5 else -1.5, B + 1.4, z, 'wire'))
        p += [(0, B + 1.2, HC, 'wire'), (0.5, B + 1.2, HC - 1, 'wire')]
        p += [(u, 4.6, z, 'tat') for u, z in ((1, 15), (2, 16), (1, 17), (2, 14), (0, 16))]
        return p

    def neckc(u, v, z):
        return 'turtle' if z <= 15 else None

    def torso(u, v, z, front, w):
        if front and abs(v) <= 3.5:
            return 'turtle'
        if front and abs(v) <= 5.5:
            return 'lea2'
        return 'lea' if (round(v) * 7 + z * 3) % 11 else 'lea2'
    return dict(skin='eSkin', skin2='eSkin2', iris='eIris', lid='eSkin2', lid2='eSkin2', upper='stub', browc='stub',
                brow_out=0.8, hair=hair, tex=[marks], props=props, sq=2.4, jaw=0.6, shoulder=15, neck=4.4, nose=0.6,
                neckc=neckc, torso=torso)


CHARS = [('analyst', 'Analista', analyst), ('arrieta', 'Tomás Arrieta', arrieta),
         ('moravia_boss', 'Casa Moravia — chefe', boss), ('moravia_enforcer', 'Casa Moravia — executor', enforcer)]


def render(vox):
    rig.CW, rig.CH, rig.CX, rig.CY = 240, 220, 120, 170
    im = rig.render(vox)
    gl = [p for p in vox if p[3] in GLOW]
    if gl:
        g = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(g)
        for x, y, z, c in gl:
            sx, sy = rig.CX + (x - y) * 2 - 2, rig.CY + (x + y) - z * 2 - 2
            d.rectangle([sx, sy, sx + 3, sy + 3], fill=GLOW[c] + (110,))
        g = g.filter(ImageFilter.GaussianBlur(3))
        im.alpha_composite(g)
    return im


if __name__ == '__main__':
    FR = 128
    seq = [dict(breath=0), dict(breath=1), dict(breath=1), dict(breath=0, blink=True)]
    big = []
    for cid, label, fn in CHARS:
        ch = fn()
        big.append((cid, label, [render(build(ch, **k)) for k in seq]))
    bb = None
    for _, _, fr in big:
        for f in fr:
            b = f.getbbox()
            bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    print('union bust bbox', w, h)
    assert h <= FR and w <= 120, (w, h)
    fw = w + (w % 2) + 2
    for size in (128, 64):
        rows = []
        for cid, label, fr in big:
            frames = []
            for f in fr:
                c = f.crop(bb)
                tile = Image.new('RGBA', (fw, FR), (0, 0, 0, 0))
                tile.alpha_composite(c, ((fw - w) // 2, FR - h))          # bust cut sits on the frame bottom
                if size == 64:
                    tile = tile.resize((fw // 2, 64), Image.BOX)
                    tile.putalpha(tile.getchannel('A').point(lambda k: 255 if k >= 100 else 0))
                frames.append(tile)
            rows.append(dict(name=f'{cid}_idle', frames=frames, fps=4, loop=True,
                             meta=dict(label=label, durations=[900, 600, 700, 140])))
        fw_s = rows[0]['frames'][0].width
        P.write_atlas(OUT, f'portraits-story-{size}', rows, (fw_s // 2, size), crop=False,
                      extra=dict(note='bust portraits, face 3/4 to the right; idle = breathe in, hold, out + blink. '
                                      '`durations` (ms per frame) is optional, fps=4 also works.'))
        P.preview_sheet(OUT, f'portraits-story-{size}', S=3 if size == 64 else 2, path=f'portraits-story-{size}.png')
