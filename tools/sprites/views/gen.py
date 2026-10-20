"""Generate back-view (+ variant) atlases for one character set.

Usage:  python -I tools/sprites/views/gen.py <set> [<set> ...]   (build.py runs one process per set: modules mutate rig.C / rig.upper)
Writes  public/sprites/<set>-back.{png,json}
        public/sprites/<set>-v<N>.{png,json}, public/sprites/<set>-v<N>-back.{png,json}   (variant sets only)
        tools/sprites/preview.local/views/ref/<set>.{png,json}   front re-render, checked against public/sprites/<set>.json
        tools/sprites/preview.local/views/variants-<set>.json    traits of each variant (not shipped)
"""
import importlib, json, os, sys, zlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import views  # noqa: E402  (puts tools/sprites on sys.path)
from views import atlas, render_tok, write_atlas, preview, variant, HEAD_CFG  # noqa: E402

# rows left out of the back atlas (face-to-camera / scripted-scene rows that do not read from behind)
BACK_SKIP = {
    'legal': {'phone'},
    'pilot': {'board', 'eject'},
    'influence': {'whisper', 'convinced'},
    'director': {'ex_agent', 'banker', 'colonel'},     # duplicates of exagent_*/banker_*/colonel_* rows
}
BACK_MIRROR = {'legal', 'influence'}   # props carried in the left hand -> mirror so they stay visible
VARIANT_SETS = {'urban': 11, 'military': 23, 'criminal': 37, 'police': 41, 'women': 53}   # set -> seed salt
N_VARIANTS = 6


def run(set_id):
    views.capture()
    mod = importlib.import_module(set_id)
    front_man = json.load(open(os.path.join(views.PUBLIC, set_id + '.json'), encoding='utf-8'))
    meta = {a['name']: (a['fps'], a['loop']) for a in front_man['animations']}
    rows = [(atlas.key_of(lbl), fr) for lbl, fr in mod.ROWS]

    # front re-render: gives the exact crop of the shipped front atlas
    front = [(k, [render_tok(t, label=f'{set_id}/{k}/front') for t in fr]) for k, fr in rows]
    shadowed = [atlas._with_shadow(f, views.SHADOW) for _, fr in front for f in fr]
    W_, H_ = shadowed[0].size
    crop = views.crop_rect(shadowed, W_, H_)
    man, _ = write_atlas(set_id, front, meta, crop, outdir=views.REF)
    assert (man['frameWidth'], man['frameHeight'], man['anchor']) == (front_man['frameWidth'], front_man['frameHeight'], front_man['anchor']), 'front re-render differs from public atlas'

    skip = BACK_SKIP.get(set_id, set())
    brows = [(k, fr) for k, fr in rows if k not in skip]
    back = [(k, [render_tok(t, back=True, label=f'{set_id}/{k}/back', mirror=set_id in BACK_MIRROR) for t in fr]) for k, fr in brows]
    write_atlas(set_id + '-back', back, meta, crop)
    preview(set_id + '-back')

    if set_id in VARIANT_SETS:
        cfg = HEAD_CFG[set_id]
        traits = []
        for n, var in enumerate(views.pick_variants(VARIANT_SETS[set_id], N_VARIANTS, cfg['women'])):
            vid = f'{set_id}-v{n}'
            fr_rows = [(k, [render_tok(t, var=var, cfg=cfg, label=f'{vid}/{k}') for t in fr]) for k, fr in rows]
            bk_rows = [(k, [render_tok(t, back=True, var=var, cfg=cfg, label=f'{vid}-back/{k}') for t in fr]) for k, fr in brows]
            write_atlas(vid, fr_rows, meta, crop)
            write_atlas(vid + '-back', bk_rows, meta, crop)
            preview(vid); preview(vid + '-back')
            traits.append(dict(id=vid, back=vid + '-back', **var))
        atlas._json(dict(set=set_id, variants=traits), os.path.join(views.LOCAL, f'variants-{set_id}.json'))
    for lbl, n in views.CLIPS:
        print(f'  CLIP {lbl}: {n} voxels outside the 128x100 canvas')


if __name__ == '__main__':
    for s in sys.argv[1:]:
        run(s)
