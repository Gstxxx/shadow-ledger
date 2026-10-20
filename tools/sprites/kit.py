"""lean > 0 inclina para a frente; fall < 0 cai para trás (ver rig.figure).
Shared animation helpers for the character scripts (walk/run cycles, muzzle flash, hit spray, death fall)."""
import rig
from rig import F, box

WALK_T = ((22, 1), (10, 0), (-6, -1), (-22, -1), (-10, 0), (6, 1))
RUN_T = ((38, 2), (18, 1), (-10, -1), (-38, -2), (-18, -1), (10, 1))


def walk(hands, **kw):
    """hands(sw, i) -> dict of pose keys (rh, lh, extra...)."""
    return [F(L=(th, -4 if th > 0 else -16), R=(-th, -4 if th < 0 else -16), **{**kw, **hands(sw, i)})
            for i, (th, sw) in enumerate(WALK_T)]


def run(hands, lean=12, **kw):
    return [F(L=(th, -32 if th < 0 else -8), R=(-th, -32 if th > 0 else -8), lean=lean,
              dz=1 if abs(th) < 20 else 0, **{**kw, **hands(sw, i)})
            for i, (th, sw) in enumerate(RUN_T)]


def flash(hand, big=True, g=1):
    """Pistol muzzle flash in world space for a hand at body coords (standing, ground offset g)."""
    x, y, z = round(hand[0]) + 4, round(hand[1]), round(hand[2]) + g
    v = [(x, y, z, 'f2'), (x + 1, y, z, 'f1')]
    if big:
        v += [(x + 2, y, z, 'f1'), (x + 1, y, z + 1, 'f2'), (x + 1, y, z - 1, 'f2'), (x + 3, y, z, 'f3'), (x + 2, y + 1, z, 'f3')]
    return v


def sp(z, x=2):
    return [(x, 0, z, 'hit2'), (x + 1, -1, z + 1, 'hit'), (x + 1, 1, z - 1, 'hit'), (x + 2, 0, z + 1, 'hit2')]


def line(a, b, c):
    n = int(max(abs(b[k] - a[k]) for k in range(3))) or 1
    return [tuple(round(a[k] + (b[k] - a[k]) * i / n) for k in range(3)) + (c,) for i in range(n + 1)]


def death(first, dropped=(), **kw):
    """6-frame fall-backwards death. `first` = pose keys for the hit frame; kw = keys shared by the rest."""
    d = list(dropped)
    f0 = dict(rh=(2, 1, 12), lh=(1, -2, 12), lean=-14)
    f0.update(first)
    f0['extra'] = first.get('extra', []) + sp(12)
    return [F(**f0),
            F(**{**dict(rh=(1, 2, 13), lh=(0, -3, 13), lean=-24, L=(-14, -10), R=(10, -20)), **kw, 'extra': d + sp(13) + kw.get('extra', [])}),
            F(**{**dict(rh=(0, 3, 12), lh=(-1, -4, 12), lean=-10, L=(30, -90), R=(20, -80), fall=-15), **kw, 'extra': d + kw.get('extra', [])}),
            F(**{**dict(rh=(0, 3, 11), lh=(-1, -4, 11), fall=-45), **kw, 'extra': d + kw.get('extra', [])}),
            F(**{**dict(rh=(0, 3, 10), lh=(-1, -4, 10), fall=-75), **kw, 'extra': d + kw.get('extra', [])}),
            F(**{**dict(rh=(1, 4, 9), lh=(0, -5, 9), fall=-90), **kw, 'extra': d + kw.get('extra', [])})]


def hurt(base, **kw):
    """3-frame flinch: base = hands dict for the guard pose."""
    return [F(**base, lean=-10, extra=sp(11), **kw),
            F(rh=(2, 1, 10), lh=(1, -2, 11), lean=-16, L=(-8, -6), R=(6, -10), extra=sp(10), **kw),
            F(**base, lean=-6, **kw)]
