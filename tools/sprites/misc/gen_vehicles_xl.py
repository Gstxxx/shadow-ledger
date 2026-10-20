"""vehicles-xl: the ground vehicles + 2 helicopters re-exported at 1.6x voxel scale with a contrast grade,
plus a looping `wreck` row (flames flicker, looping smoke, embers) that plays after `destroyed`.
Each vehicle also gets a `-back` atlas (model turned 90 deg about z before rendering: facing NE; mirror for NW).
Reuses the builders in tools/sprites unchanged: their R() is swapped for a voxel capture, then voxels are upscaled."""
import sys, os
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import math, random
import pmisc as P
import rig
import vehlib as V
import veiculos_leves as VL
import blindados as BL
import helicopteros as HE
from vehlib import box

S = 1.6
EM = {'em1': 'k2', 'em2': 'k3', 'em3': 'e4'}
OUT = P.PUB
CAP = lambda vox, shadow=True: [(round(x), round(y), round(z), c) for x, y, z, c in vox if c]
for m in (VL, BL, HE):
    m.R = CAP
rig.C.update({'trk': (66, 66, 70), 'trk2': (110, 106, 98), 'tire': (40, 40, 44), 'tire2': (92, 92, 98),
              'hub': (160, 162, 168), 'gun': (52, 56, 62), 'gun2': (88, 92, 100)})
P.graded_shade(gamma=0.8, sat=1.22, faces=(1.24, 0.93, 0.62),
               skip={'s0', 's1', 's2', 's3', 'char', 'burnt', 'burnt2', 'rust', 'deb', 'd1', 'd2', 'd3', 'w1', 'w2', 'w3'})


def no_fx(vox):
    return [p for p in vox if p[3] not in V.FX]


def top_at(vox, fx, fy):
    zs = [p[2] for p in vox if abs(p[0] - fx) <= 1 and abs(p[1] - fy) <= 1 and p[3] not in V.FX]
    return (max(zs) + 1) if zs else 0


def smoke_loop(t, x, y, z, n=8, cycle=8, rise=3.0, r0=1.5, grow=0.55, drift=(-0.45, 0.25), seed=0):
    v = []
    rnd = random.Random(seed * 31 + t)
    for k in range(5):
        a = k + (t % cycle) / cycle
        r = r0 + a * grow
        cols = ['s3', 's3', 's2'] if a < 1.5 else (['s2', 's3', 's1'] if a < 3 else ['s1', 's2'])
        keep = max(0.25, 0.92 - a * 0.14)
        v += V.ball(x + drift[0] * a * rise, y + drift[1] * a * rise, z + a * rise, r, cols, rnd, keep=keep)
    return v


def embers(t, pts, cycle=8, per=3, seed=0):
    v = []
    for i, (px, py, pz, s) in enumerate(pts):
        for k in range(per):
            rnd = random.Random(seed * 101 + i * 13 + k)
            off, sx, sy, sp = rnd.random() * cycle, rnd.uniform(-0.9, 0.9), rnd.uniform(-0.9, 0.9), rnd.uniform(1.4, 2.2)
            a = ((t + off) % cycle) / cycle
            z = pz + 2 + a * cycle * sp
            x = px + sx * a * 6 + math.sin((t + k) * 1.7) * 0.6
            y = py + sy * a * 6
            v.append((x, y, z, 'em1' if a < 0.35 else ('em2' if a < 0.7 else 'em3')))
    return v


def wreck_loop(static, flame_pts, smoke_at, seed, n=8):
    fr = []
    for t in range(n):
        v = list(static)
        v += V.flames(t, [(x, y, z, s * 1.2) for x, y, z, s in flame_pts], seed + 5)
        v += embers(t, flame_pts, n, 3, seed)
        for j, (sx, sy, sz) in enumerate(smoke_at):
            v += smoke_loop(t, sx, sy, sz, cycle=n, seed=seed + j, r0=1.6 - 0.3 * j)
        fr.append(v)
    return fr


def wreck_from(destroyed_frames, flame_xy, seed, smoke_n=1, heli=False):
    static = no_fx(destroyed_frames[-1])
    pts = [(fx, fy, (top_at(static, fx, fy) if fz is None else fz), s) for fx, fy, fz, s in flame_xy]
    smoke = [(pts[i][0], pts[i][1], pts[i][2] + 4) for i in range(smoke_n)]
    return wreck_loop(static, pts, smoke, seed)


# ---------------------------------------------------------------- build voxel rows (mirrors the generators' __main__)
def ground_rows():
    out = {}
    pic = VL.picape()
    gun = [p for p in pic if p[2] >= 10 and -9 <= p[0] <= 3 and abs(p[1]) <= 2 and p[3] in ('gun', 'gun2', 'steel2', 'ol2')]
    rest = [p for p in pic if p not in gun]
    fl = [(-5, 0, 4, 1.6), (1, 1, 8, 1.2), (6, 0, 5, 1.0)]
    d = VL.destroyed(rest, (0, 0, 5), 1.0, 11, fl, chunk=(gun, (-1.2, 0.8, 4.2), 25))
    out['technical'] = [('technical_move', VL.picape_andar(), 10, True), ('technical_shoot', VL.picape_atirar(), 12, True),
                        ('technical_destroyed', d, 10, False), ('technical_wreck', wreck_from(d, fl, 11), 8, True)]
    fl = [(0, 0, 6, 1.6), (6, 0, 4, 1.0), (-6, 1, 4, 1.0)]
    d = VL.destroyed(VL.viatura(lights=''), (1, 0, 4), 1.0, 12, fl)
    out['patrolcar'] = [('patrolcar_move', VL.viatura_andar(), 10, True), ('patrolcar_idle', VL.viatura_parada(), 8, True),
                        ('patrolcar_destroyed', d, 10, False), ('patrolcar_wreck', wreck_from(d, fl, 12), 8, True)]
    bl = VL.blindado()
    tur = [p for p in bl if p[2] >= 9 and -4 <= p[0] <= 13 and abs(p[1]) <= 3]
    fl = [(-1, 0, 9, 1.8), (-7, 1, 8, 1.2), (6, -1, 8, 1.0)]
    d = VL.destroyed([p for p in bl if p not in tur] + box(-4, 1, -2, 2, 9, 9, 'ol2'), (0, 0, 7), 1.2, 13, fl,
                     chunk=(tur, (-0.6, 1.0, 5.0), 30))
    out['apc'] = [('apc_move', VL.blindado_andar(), 10, True), ('apc_shoot', VL.blindado_atirar(), 12, True),
                  ('apc_destroyed', d, 10, False), ('apc_wreck', wreck_from(d, fl, 13), 8, True)]
    tur = BL.t72_turret()
    fl = [(-1, 0, 6, 2.2), (-12, 3, 6, 1.2), (6, -2, 6, 1.0)]
    d = VL.destroyed(BL.t72_hull() + V.ball(-1, 0, 6, 2.5, ['char']), (-1, 0, 7), 1.35, 31, fl, chunk=(tur, (-1.4, 1.1, 5.4), (22, 0)))
    out['tank1'] = [('tank1_move', BL.andar(BL.t72, -13, ((-7, 7, 6), (-0.9, 0.9, 0.5))), 10, True),
                    ('tank1_shoot', BL.atirar(BL.t72, (24, 0, 8)), 12, True),
                    ('tank1_destroyed', d, 10, False), ('tank1_wreck', wreck_from(d, fl, 31), 8, True)]
    d = BL.abrams_destroyed()
    fl = [(-6, -2, 9, 1.6), (2, 3, 6, 1.2), (-10, 5, 6, 1.0)]
    out['tank3'] = [('tank3_move', BL.andar(BL.abrams, -14, ((-14, 0, 4), (-1.3, 0.0, 0.5))), 10, True),
                    ('tank3_shoot', BL.atirar(BL.abrams, (23, 0, 8)), 12, True),
                    ('tank3_destroyed', d, 10, False), ('tank3_wreck', wreck_from(d, fl, 21), 8, True)]
    return out


def heli_rows():
    out = {}
    fl = [(0, 0, None, 2.0), (-7, 3, None, 1.4), (5, -2, None, 1.2)]
    d = HE.heli_destroyed(HE.uh, 41)
    out['heli1'] = [('heli1_hover', HE.pairar(HE.uh), 10, True), ('heli1_fly', HE.voar(HE.uh), 10, True),
                    ('heli1_shoot', HE.uh_atirar(), 12, True), ('heli1_destroyed', d, 10, False),
                    ('heli1_wreck', wreck_from(d, fl, 41), 8, True)]
    d = HE.heli_destroyed(HE.ah, 42)
    out['heli3'] = [('heli3_hover', HE.pairar(HE.ah), 10, True), ('heli3_fly', HE.voar(HE.ah), 10, True),
                    ('heli3_cannon', HE.ah_canhao(), 12, True), ('heli3_rockets', HE.ah_foguetes(), 10, True),
                    ('heli3_destroyed', d, 10, False), ('heli3_wreck', wreck_from(d, fl, 42), 8, True)]
    return out


def turn_ne(vox):
    """Facing +x -> facing -y (screen NE), same turn as tools/sprites/views/vehback.py."""
    return [(y, -x - 1, z, c) for x, y, z, c in vox]


def render_rows(rows, canvas, back=False):
    V.canvas(*canvas)
    res = []
    for name, frames, fps, loop in rows:
        imgs = []
        for vox in frames:
            if back:
                vox = turn_ne(vox)
            em = [(round(x * S), round(y * S), round(z * S), EM[c]) for x, y, z, c in vox if c in EM]
            im = V.R(P.scale_up([p for p in vox if p[3] not in EM], S) + em)
            imgs.append(P.with_shadow(im, V.SHADOWS.pop(id(im), None), 105))
        res.append(dict(name=name, frames=imgs, fps=fps, loop=loop))
    return res


if __name__ == '__main__':
    only = set(sys.argv[1:])
    index = {}
    jobs = []
    if not only or only & {'technical', 'patrolcar', 'apc', 'tank1', 'tank3'}:
        jobs += [(k, v, (300, 240, 150, 160)) for k, v in ground_rows().items()]
    if not only or only & {'heli1', 'heli3'}:
        jobs += [(k, v, (400, 360, 200, 250)) for k, v in heli_rows().items()]
    for vid, rows, cv in jobs:
        if only and vid not in only:
            continue
        for back in (False, True):
            sid = f'vehicles-xl-{vid}' + ('-back' if back else '')
            rr = render_rows(rows, cv, back)
            m = P.write_atlas(OUT, sid, rr, (cv[2], cv[3] + 1), colors=200,
                              extra=dict(scale=S, note='after `*_destroyed` (once) switch to `*_wreck` (loop)'
                                         + ('; back view (NE): mirror for NW' if back else '')))
            P.preview_sheet(OUT, sid, S=1, path=f'{sid}.png')
        index[vid] = dict(atlas=f'vehicles-xl-{vid}.json', back=f'vehicles-xl-{vid}-back.json',
                          animations=[a['name'] for a in m['animations']])
    if not only:
        P.write_json(dict(kind='index', id='vehicles-xl', sets=index), os.path.join(OUT, 'vehicles-xl.json'))
