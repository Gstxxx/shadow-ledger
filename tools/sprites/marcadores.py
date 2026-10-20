"""Map markers (animated): hostile group, threat, rival agency, player station, director, contract, hunt, vault, flight."""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from sl_common import box, render, ring, disc, ball, mini, shift

N = 6
PULSE = [0, 1, 2, 3, 2, 1]


def grupo_hostil():
    fr = []
    for t in range(N):
        r = 5.5 + t * 0.8
        col = ['red', 'red', 'red2', 'red2', 'red3', 'red3'][t]
        v = ring(r, 0, col, thick=1.0)
        v += ring(4.2, 0, 'red3', thick=0.6)
        for i, (x, y) in enumerate(((-2, -4), (2, -1), (-2, 2))):
            f = mini(x, y, pose=((t + i) // 2) % 2)
            f = [(a, b, c, 'red' if (c == 5 and a == x and b == y) else col_) for a, b, c, col_ in f]   # red armband
            v += f
        if t % 3 == 0:                                                          # muzzle blink
            v += [(6, 0, 4 + ((t // 2) % 2), 'e1')]
        fr.append(render(v))
    return fr


def ameaca():
    fr = []
    for t in range(N):
        on = t % 2 == 0
        v = box(-3, 3, -3, 3, 0, 0, 'steel3') + box(-1, 1, -1, 1, 1, 1, 'steel2')
        v += box(-1, 0, -1, 0, 2, 12, 'steel2')
        # warning triangle with "!" in front of the pole (+x face)
        for k in range(7):
            w = 3 - k // 2
            v += [(1, y, 3 + k, 'black' if (y == 0 and 3 + k in (4, 6, 7)) else 'yel') for y in range(-w, w + 1)]
        # beacon head: dark base + dome that alternates red / amber
        lamp, lamp2 = ('red', 'red2') if on else ('amber', 'amber2')
        v += box(-2, 1, -2, 1, 13, 13, 'dark') + box(-1, 0, -1, 0, 14, 15, lamp) + [(-1, 0, 16, lamp)]
        v += [(1, -2, 14, lamp2), (-2, 1, 14, lamp2), (1, 1, 14, lamp2), (-2, -2, 14, lamp2)]
        if on:
            v += ring(3.0, 14, 'red2', thick=0.5, cx=0, cy=0)
        # countdown pips around the base (6 -> 1)
        lit = N - t
        for i in range(6):
            a = math.radians(-120 + i * 60)
            x, y = round(math.cos(a) * 5.5), round(math.sin(a) * 5.5)
            v += [(x, y, 0, 'amber' if i < lit else 'red3'), (x, y, 1, 'amber' if i < lit else 'red3')]
        fr.append(render(v))
    return fr


def agencia_rival():
    fr = []
    for t in range(N):
        v = box(-2, 2, -2, 2, 0, 0, 'rivD')
        v += box(-1, 1, -1, 1, 1, 9, 'riv') + box(-1, 1, -1, 1, 10, 10, 'riv2')
        for z in (3, 6, 8):
            v += [(2, 0, z, 'rivL'), (0, 2, z, 'rivL') if z != 6 else (0, 2, z, 'riv2')]
        v += [(2, -1, z, 'riv2') for z in (2, 5)] + [(-1, 2, z, 'riv2') for z in (2, 5)]
        v += box(0, 0, 0, 0, 11, 17, 'steel')                                   # flag pole
        for i in range(5):                                                      # waving flag along -y
            dz = round(math.sin((i - t) * 1.2) * 0.8)
            for z in (14, 15, 16):
                v.append((0 + (1 if i in (2, 3) and t % 2 else 0), -1 - i, z + dz, 'rivL' if (i + z) % 4 else 'riv'))
        v += [(0, 0, 18, 'gold')]
        v += [(2, y, 0, 'rivL') for y in (-1, 0, 1)]   # entrance light
        r = 4 + PULSE[t] * 0.8
        v += ring(r, 0, 'rivL' if t < 3 else 'riv', thick=0.9)
        fr.append(render(v))
    return fr


def estacao():
    fr = []
    for t in range(N):
        v = disc(3.4, 0, 'dark') + disc(2.2, 1, 'steel3') + box(0, 0, 0, 0, 2, 6, 'steel2')
        v += box(-1, 1, -1, 1, 7, 7, 'gold2') + [(0, 0, 8, 'goldL')]
        # beam pulse
        h = 3 + PULSE[t] * 2
        v += [(0, 0, 9 + k, 'goldL' if k < h - 1 else 'gold') for k in range(h)]
        # rotating dashed gold ring
        off = t * 20
        v += ring(5.2, 1, lambda a: 'gold' if ((a + off) % 60) < 38 else None, thick=1.0)
        v += ring(6.4, 0, lambda a: 'gold3' if ((a - off) % 45) < 20 else None, thick=0.6)
        fr.append(render(v))
    return fr


def diretor():
    fr = []
    for t in range(N):
        dz = [0, 1, 2, 2, 1, 0][t]
        v = []
        for z in range(1, 6):                                                   # pin point
            v += disc((z - 1) * 0.6, z, 'gold2')
        v += ball(0, 0, 8, 3.2, ['goldL', 'gold', 'gold', 'gold2'])
        v += [(1, 1, 9, 'goldL'), (2, 0, 9, 'goldL')]
        figure = mini(0, -1, 12, cloth='suit', cloth2='suit2', head='skin', hair='hair', gun=False)
        figure += [(1, -1, 16, 'shirt'), (1, 0, 16, 'tie'), (1, 0, 15, 'tie')]
        v += figure
        v = shift(v, dz=dz)
        v += ring(2.0 + t * 0.6, 0, 'gold2', thick=0.6) if t < 5 else []
        fr.append(render(v))
    return fr


def contrato():
    fr = []
    for t in range(N):
        dz = [0, 1, 1, 0, 0, 0][t] + 3
        v = box(-4, 4, -1, 1, dz, dz + 5, 'leather') + box(-4, 4, 2, 2, dz, dz + 5, 'leather2')
        v += box(-4, 4, -1, 2, dz + 3, dz + 3, 'leather2')
        v += box(-1, 1, 0, 0, dz + 7, dz + 7, 'black') + [(-1, 0, dz + 6, 'black'), (1, 0, dz + 6, 'black')]
        v += [(-2, 3, dz + 3, 'gold'), (2, 3, dz + 3, 'gold'), (5, 0, dz + 3, 'gold')]
        v += ring(3.6 + PULSE[t] * 0.5, 0, 'grn' if t % 3 != 2 else 'grn2', thick=0.8) + disc(2.2, 0, 'grnD')
        rnd = random.Random(t)
        for k in range(3):
            v.append((rnd.randint(-4, 4), rnd.randint(-3, 3), rnd.randint(1, 10), 'grn'))
        fr.append(render(v))
    return fr


def cacada():
    fr = []
    for t in range(N):
        v = mini(0, -1, 0, cloth='red2', cloth2='red3', gun=False)
        r = [8, 7, 6, 5, 4.4, 4.4][t]
        col = 'red' if t >= 4 else 'red2'
        v += ring(r, 0, col, thick=0.7)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):                         # cross ticks
            for k in range(4):
                d = round(r) - 1 + k
                v.append((dx * d, dy * d, 0, col))
        # floating chevron over the head (blinks once locked)
        if t < 4 or t == 5:
            z = 11 + (t % 2)
            v += [(0, 0, z, 'red'), (0, -1, z, 'red')] + [(0, y, z + 1, 'red') for y in range(-2, 2)] +                  [(0, y, z + 2, 'red') for y in range(-3, 3)]                    # down arrow
        fr.append(render(v))
    return fr


def cofre():
    fr = []
    for t in range(N):
        v = box(-3, 3, -3, 3, 0, 0, 'steel3') + box(-2, 2, -3, 3, 1, 7, 'steel2') + box(-2, 2, -3, 3, 8, 8, 'steel')
        v += box(3, 3, -2, 2, 2, 6, 'steel')                                    # door plate (+x face)
        for y in range(-2, 3):
            for z in range(2, 7):
                if (y * y + (z - 4) ** 2) >= 4.5:
                    v.append((3, y, z, 'steel3'))
        a = t * math.pi / 6                                                     # rotating wheel
        v.append((4, 0, 4, 'gold'))
        for k in range(3):
            ang = a + k * 2 * math.pi / 3
            v.append((4, round(math.cos(ang) * 1.6), 4 + round(math.sin(ang) * 1.6), 'gold2'))
        v += [(3, 2, 5, 'dark'), (3, 2, 3, 'dark')]                             # hinges
        if t == 2:
            v += [(-2, 3, 8, 'goldL'), (-1, 3, 7, 'goldL')]
        v += ring(4.8 + PULSE[t] * 0.3, 0, 'gold3', thick=0.6)
        fr.append(render(v))
    return fr


def voo():
    fr = []
    for t in range(N):
        dz = [0, 0, 1, 1, 0, 0][t]
        z = 10 + dz
        v = box(-3, 4, 0, 0, z, z, 'plane') + [(5, 0, z, 'plane2'), (4, 0, z + 1, 'plane2')]
        v += [(2, 0, z + 1, 'blue'), (3, 0, z + 1, 'blue')]
        v += box(0, 1, -5, 5, z, z, 'plane2')                                   # wings
        v += box(-3, -3, -2, 2, z, z, 'plane2') + box(-3, -3, 0, 0, z + 1, z + 3, 'plane')  # tail
        v += [(1, -5, z, 'red'), (1, 5, z, 'grn')]                              # nav lights
        for k in range(6):                                                      # dotted trail (scrolls)
            x = -5 - k * 2 - (t % 2)
            if x >= -16:
                v.append((x, 0, z, 'trail' if k < 3 else 'fog2'))
        v += [(x, 0, -1, 'dark') for x in range(-2, 4)] + [(0, y, -1, 'dark') for y in range(-4, 5)]   # ground shadow
        fr.append(render(v))
    return fr


ROWS = [('GRUPO HOSTIL', grupo_hostil()), ('AMEAÇA', ameaca()), ('AGÊNCIA RIVAL', agencia_rival()),
        ('ESTAÇÃO DO JOGADOR', estacao()), ('DIRETOR', diretor()), ('CONTRATO', contrato()),
        ('CAÇADA', cacada()), ('COFRE', cofre()), ('VOO', voo())]
if __name__ == '__main__':
    rig.export(ROWS, set(), 'markers', shadow=False, default_fps=6, stills=True)
