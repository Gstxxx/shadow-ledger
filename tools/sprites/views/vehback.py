"""NE-facing ("-back") atlases for the ground/air vehicle sets, same rotate-before-render trick as the characters.

Usage: python -I tools/sprites/views/vehback.py veiculos_leves|blindados|helicopteros
vehlib.R is swapped (before the vehicle script imports it) for a version that turns every voxel list 90 deg about z
(facing +x -> facing -y, screen NE) and then calls the original R, so glow, projected shadow and wreck effects are
all computed on the turned model.  vehlib.export is swapped for a writer that keeps the front atlas crop
(frameWidth/Height/anchor) unless something would be cut, and writes public/sprites/<set_id>-back.{png,json}.
"""
import json, os, runpy, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import views  # noqa: E402  (tools/sprites on sys.path)
from views import atlas, rig  # noqa: E402
import vehlib as V  # noqa: E402
from PIL import Image  # noqa: E402

_R = V.R
CLIP = [0]


def R_back(vox, shadow=True):
    t = [(round(v[1]), -round(v[0]) - 1, round(v[2]), v[3]) for v in vox if v[3]]
    for x, y, z, _ in t:
        sx, sy = V.scr(x, y, z)
        if sx < 0 or sy < 0 or sx + 4 > rig.CW or sy + 4 > rig.CH:
            CLIP[0] += 1
    return _R(t, shadow)


def export_back(ROWS, ONESHOT, set_id, default_fps=10):
    front = json.load(open(os.path.join(views.PUBLIC, set_id + '.json'), encoding='utf-8'))
    meta = {a['name']: (a['fps'], a['loop']) for a in front['animations']}
    x0 = rig.CX - front['anchor']['x']; y0 = rig.CY + 1 - front['anchor']['y']
    crop = (x0, y0, x0 + front['frameWidth'], y0 + front['frameHeight'])

    def shadow(im):
        s = V.SHADOWS.get(id(im))
        return s.point(lambda v: v * 105 // 255) if s is not None else None
    rows = []
    for lbl, fr in ROWS:
        rows.append((atlas.key_of(lbl), [atlas._with_shadow(f, shadow) for f in fr]))
    views.SHADOW = None                                     # shadows already baked above
    write = views.write_atlas.__wrapped__ if hasattr(views.write_atlas, '__wrapped__') else views.write_atlas
    old = atlas._with_shadow
    atlas._with_shadow = lambda f, s: f                     # write_atlas must not add the character ellipse
    try:
        write(set_id + '-back', rows, meta, crop)
    finally:
        atlas._with_shadow = old
    views.preview(set_id + '-back', S=2)
    print(f'  voxels outside canvas: {CLIP[0]}')


V.R = R_back
V.export = export_back

if __name__ == '__main__':
    runpy.run_path(os.path.join(views.R, sys.argv[1] + '.py'), run_name='__main__')
