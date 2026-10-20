"""Regenera todos os sprites em public/sprites/ (atlas + manifestos) e o índice public/sprites/index.json.

Uso (na raiz do repositório):  python -I tools/sprites/build.py [conjunto ...]
  SPRITES_PREVIEW=1  também grava folhas de conferência em tools/sprites/preview.local/
Precisa só de Python 3.10+ e Pillow. Cada gerador roda em processo próprio porque vários trocam
rig.upper / rig.C ao importar.
"""
import glob, json, os, shutil, subprocess, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import atlas  # noqa: E402

GENERATORS = [
    # personagens
    'urban', 'military', 'legal', 'pilot', 'influence', 'police', 'criminal', 'director', 'women',
    # veículos
    'veiculos_leves', 'blindados', 'helicopteros', 'aereos_cacas', 'aereos_bomb_aa', 'cargueiros_a', 'cargueiros_b',
    # efeitos
    'vfx', 'efeitos_extras',
    # mapa, carga, prédios
    'marcadores', 'carga_itens', 'niveis_estados', 'interiors',
]
OPTIONAL: list[str] = []
# 2ª fase (views/): vistas de costas (NE) e variantes de cabeça, lidas dos manifestos de frente já gravados
VIEW_SETS = ['urban', 'military', 'legal', 'pilot', 'influence', 'police', 'criminal', 'director', 'women']
VEH_BACK = ['veiculos_leves', 'blindados', 'helicopteros', 'aereos_cacas', 'aereos_bomb_aa']


def main(only):
    gens = [g for g in GENERATORS + OPTIONAL if os.path.exists(os.path.join(HERE, g + '.py'))]
    if only:
        gens = [g for g in gens if g in only]
    else:
        shutil.rmtree(atlas.PUB, ignore_errors=True)
    os.makedirs(atlas.PUB, exist_ok=True)
    t0 = time.time()
    failed = run([(g, [os.path.join(HERE, g + '.py')]) for g in gens])
    # 2ª fase: costas + variantes dos personagens e costas dos veículos (dependem dos manifestos de frente)
    vd = os.path.join(HERE, 'views')
    jobs = [(f'views:{s}', [os.path.join(vd, 'gen.py'), s]) for s in VIEW_SETS if not only or s in only]
    jobs += [(f'views:{v}', [os.path.join(vd, 'vehback.py'), v]) for v in VEH_BACK if not only or v in only]
    failed += run(jobs)
    index()
    print(f'{len(gens)} geradores em {time.time() - t0:.0f}s')
    if failed:
        sys.exit('falharam: ' + ', '.join(failed))


def run(jobs):
    """Roda os geradores em paralelo, um processo por item; devolve os nomes que falharam."""
    procs = [(name, subprocess.Popen([sys.executable, '-I', *args], cwd=HERE, stdout=subprocess.PIPE,
                                     stderr=subprocess.STDOUT, env=os.environ.copy())) for name, args in jobs]
    failed = []
    for name, p in procs:
        out = p.communicate()[0].decode('utf-8', 'replace').strip()
        print(f'[{name}] {out}')
        if p.returncode:
            failed.append(name)
    return failed


def index():
    sets, groups, total = [], [], 0
    for path in sorted(glob.glob(os.path.join(atlas.PUB, '*.json'))):
        name = os.path.basename(path)
        if name == 'index.json':
            continue
        m = json.load(open(path, encoding='utf-8'))
        (sets if m['kind'] == 'atlas' else groups).append(m['id'])
    for f in glob.glob(os.path.join(atlas.PUB, '**', '*'), recursive=True):
        if os.path.isfile(f) and not f.endswith('index.json'):
            total += os.path.getsize(f)
    atlas._json(dict(atlas=sets, static=groups, bytes=total), os.path.join(atlas.PUB, 'index.json'))
    print(f'índice: {len(sets)} atlas, {len(groups)} grupos avulsos, {total / 1024:.0f} KB')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
