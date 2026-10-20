"""Saída dos sprites para public/sprites/: atlas por conjunto (PNG 1x + manifesto JSON) e imagens avulsas.

Formato do manifesto de atlas (kind = 'atlas'):
  { kind, id, image, width, height, frameWidth, frameHeight, anchor: {x, y},
    animations: [{ name, row, frames, fps, loop }] }
Cada animação ocupa uma linha do atlas; o quadro i fica em (i * frameWidth, row * frameHeight).
`anchor` é o ponto dos pés / do chão (origem do mundo) dentro do quadro, em px.

Formato do manifesto de imagens avulsas (kind = 'static'):
  { kind, id, items: [{ id, state?, image, width, height, anchor: {x, y} }] }
"""
import json, os
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
PUB = os.path.join(ROOT, 'public', 'sprites')
PREVIEW = os.path.join(HERE, 'preview.local')          # pré-visualizações (ignoradas pelo git: *.local)

# rótulo do gerador (pt-BR) -> chave estável em inglês
KEYS = {
    # personagens
    'IDLE': 'idle', 'ANDAR': 'walk', 'PATRULHA': 'walk', 'CORRER': 'run', 'MIRAR': 'aim', 'SACAR / MIRAR': 'aim',
    'TIRO': 'shoot', 'ATIRAR': 'shoot', 'RAJADA': 'burst', 'RECARREGAR': 'reload', 'ABRIGO': 'cover',
    'FERIDO': 'hurt', 'MORTE': 'death', 'GRANADA': 'throw', 'AJOELHADO': 'kneel',
    'APRESENTAR PROVA': 'present_evidence', 'OBJEÇÃO!': 'objection', 'ARGUMENTAR': 'argue', 'LIGAÇÃO': 'phone',
    'PERSUADIR': 'persuade', 'DERROTA / VITÓRIA': 'defeat_victory', 'SUBORNAR': 'bribe',
    'SUSSURRAR / TELEFONE': 'whisper', 'INIMIGO CONVENCIDO': 'convinced', 'RECUAR': 'back_off', 'DERROTA': 'defeat',
    'RÁDIO / SINALIZAR': 'radio', 'EMBARCAR': 'board', 'EJETAR / PARAQUEDAS': 'eject',
    'ALGEMAR': 'cuff', 'ESCUDO': 'shield',
    'DIRETOR IDLE': 'director_idle', 'DIRETOR ANDAR': 'director_walk', 'EX-AGENTE idle+andar': 'ex_agent',
    'BANQUEIRA idle+andar': 'banker', 'CORONEL idle+andar': 'colonel', 'COMANDAR': 'command',
    'GUARDA IDLE': 'guard_idle', 'GUARDA ANDAR': 'guard_walk', 'GUARDA MIRAR': 'guard_aim', 'GUARDA ATIRAR': 'guard_shoot',
    'GUARDA MORTE': 'guard_death', 'ADVOGADA IDLE': 'lawyer_idle', 'VITÓRIA': 'victory',
    # estados das Estações
    'NORMAL': 'normal', 'DANIFICADA': 'damaged', 'INTERDITADA': 'interdicted',
    # efeitos
    'EXPLOSÃO': 'explosion', 'SANGUE': 'blood', 'FUMAÇA': 'smoke', 'FAÍSCAS / RICOCHETE': 'sparks', 'FOGO': 'fire',
    'POEIRA': 'dust', 'FLASHBANG': 'flashbang', 'GÁS': 'gas', 'TRAÇANTE + IMPACTO': 'tracer',
    'ALGEMA / PRISÃO': 'arrest', '+US$ DINHEIRO': 'money_gain', '-US$ DINHEIRO': 'money_loss',
    'SINALIZADOR (FUMAÇA)': 'flare', 'CHUVA': 'rain', 'NEBLINA': 'fog', 'NÍVEL SUBIU': 'level_up',
    'ALARME': 'alarm', 'INTERDITADO': 'interdicted',
    # marcadores do mapa
    'GRUPO HOSTIL': 'hostile_group', 'AMEAÇA': 'threat', 'AGÊNCIA RIVAL': 'rival_agency',
    'ESTAÇÃO DO JOGADOR': 'player_station', 'DIRETOR': 'director', 'CONTRATO': 'contract', 'CAÇADA': 'hunt',
    'COFRE': 'vault', 'VOO': 'flight',
    # carga / itens
    'CAIXA DE ARMAS': 'weapons_crate', 'CAIXA DE MUNIÇÃO': 'ammo_crate', 'DOCUMENTOS': 'documents',
    'MATERIAL ESPECIAL': 'special_material', 'TECNOLOGIA': 'technology', 'MALETA DE DINHEIRO': 'cash_case',
    'BARRAS DE OURO': 'gold_bars', 'PALLET DE CARGA': 'cargo_pallet', 'CONTÊINER': 'container',
    # veículos
    'PICAPE ARMADA · andar': 'technical_move', 'PICAPE ARMADA · atirar': 'technical_shoot',
    'PICAPE ARMADA · destruída': 'technical_destroyed',
    'VIATURA · andar + sirene': 'patrolcar_move', 'VIATURA · parada (sirene)': 'patrolcar_idle',
    'VIATURA · destruída': 'patrolcar_destroyed',
    'BLINDADO 6x6 · andar': 'apc_move', 'BLINDADO 6x6 · atirar 30mm': 'apc_shoot', 'BLINDADO 6x6 · destruído': 'apc_destroyed',
    'CARRO DE COMBATE CLÁSSICO · andar': 'tank1_move', 'CARRO DE COMBATE CLÁSSICO · atirar 125mm': 'tank1_shoot',
    'CARRO DE COMBATE CLÁSSICO · destruído': 'tank1_destroyed',
    'TANQUE 4ª GERAÇÃO · andar': 'tank3_move', 'TANQUE 4ª GERAÇÃO · atirar 120mm': 'tank3_shoot',
    'TANQUE 4ª GERAÇÃO · destruído': 'tank3_destroyed',
    'UTILITÁRIO · pairar': 'heli1_hover', 'UTILITÁRIO · voar': 'heli1_fly',
    'UTILITÁRIO · atirar (metralhadora de porta)': 'heli1_shoot', 'UTILITÁRIO · destruído': 'heli1_destroyed',
    'ATAQUE · pairar': 'heli3_hover', 'ATAQUE · voar': 'heli3_fly', 'ATAQUE · canhão 30mm': 'heli3_cannon',
    'ATAQUE · foguetes': 'heli3_rockets', 'ATAQUE · destruído': 'heli3_destroyed',
    # veículos XL (tools/sprites/misc/gen_vehicles_xl.py): destroços em laço depois de *_destroyed
    'PICAPE ARMADA · destroços': 'technical_wreck', 'VIATURA · destroços': 'patrolcar_wreck', 'BLINDADO 6x6 · destroços': 'apc_wreck',
    'CARRO DE COMBATE CLÁSSICO · destroços': 'tank1_wreck', 'TANQUE 4ª GERAÇÃO · destroços': 'tank3_wreck',
    'UTILITÁRIO · destroços': 'heli1_wreck', 'ATAQUE · destroços': 'heli3_wreck',
    # aeronaves
    'CAÇA LEVE · voar': 'jet1_fly', 'CAÇA LEVE · míssil': 'jet1_missile', 'CAÇA LEVE · abatido': 'jet1_shot_down',
    'CAÇA MULTIMISSÃO · voar': 'jet2_fly', 'CAÇA MULTIMISSÃO · míssil': 'jet2_missile', 'CAÇA MULTIMISSÃO · abatido': 'jet2_shot_down',
    'CAÇA FURTIVO · voar': 'jet3_fly', 'CAÇA FURTIVO · míssil (baia interna)': 'jet3_missile', 'CAÇA FURTIVO · abatido': 'jet3_shot_down',
    'BOMBARDEIRO TÁTICO · voar': 'bomber_fly', 'BOMBARDEIRO TÁTICO · lançar bombas': 'bomber_bomb',
    'BOMBARDEIRO TÁTICO · abatido': 'bomber_shot_down',
    'BATERIA ANTIAÉREA MÓVEL · andar': 'sam1_move', 'BATERIA ANTIAÉREA MÓVEL · lançar míssil': 'sam1_launch',
    'BATERIA ANTIAÉREA MÓVEL · destruída': 'sam1_destroyed',
    'SISTEMA SAM · erguer lançador': 'sam3_raise', 'SISTEMA SAM · lançar': 'sam3_launch', 'SISTEMA SAM · destruído': 'sam3_destroyed',
    'TURBOÉLICE · taxiar / decolar': 'cargo0_takeoff', 'TURBOÉLICE · voar': 'cargo0_fly', 'TURBOÉLICE · pousar': 'cargo0_land',
    'JATO MÉDIO · taxiar / decolar': 'cargo1_takeoff', 'JATO MÉDIO · voar': 'cargo1_fly', 'JATO MÉDIO · pousar': 'cargo1_land',
    'WIDEBODY · taxiar / decolar': 'cargo2_takeoff', 'WIDEBODY · voar': 'cargo2_fly', 'WIDEBODY · pousar': 'cargo2_land',
    'ESTRATÉGICO · taxiar / decolar': 'cargo3_takeoff', 'ESTRATÉGICO · voar': 'cargo3_fly', 'ESTRATÉGICO · pousar': 'cargo3_land',
}

# quadros por segundo por chave (o resto usa o padrão do conjunto)
FPS = {'wreck': 8, 'idle': 4, 'walk': 8, 'run': 12, 'shoot': 12, 'burst': 14, 'death': 8, 'hurt': 10,
       'explosion': 12, 'sparks': 14, 'tracer': 14, 'flashbang': 12}


def key_of(label):
    if label.isascii() and label.replace('_', '').isalnum() and label.islower():   # já é chave em inglês
        return label
    if label in KEYS:
        return KEYS[label]
    raise KeyError(f'rótulo sem chave em inglês: {label!r} (adicione em tools/sprites/atlas.py KEYS)')


def _fps(key, default):
    for k, v in FPS.items():
        if key == k or key.endswith('_' + k):
            return v
    return default


def _save(im, path):
    """PNG indexado (256 cores com alfa, sem pontilhado): ~4x menor e visualmente igual ao RGBA."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def _json(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')


def write_set(set_id, rows, oneshot=(), anchor=(0, 0), shadow=None, default_fps=8, stills=False):
    """rows = [(rótulo, [RGBA, ...])], todos os quadros do mesmo tamanho. `anchor` = pés no quadro cheio.
    shadow(img) -> máscara L (ou None) assada embaixo do quadro. stills=True também grava o 1º quadro de cada linha."""
    rows = [(key_of(n), n in oneshot, [_with_shadow(f, shadow) for f in fr]) for n, fr in rows]
    W, H = rows[0][2][0].size
    bb = None
    for _, _, fr in rows:
        for f in fr:
            b = f.getbbox()
            if b:
                bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    x0, y0, x1, y1 = bb
    x0, y0, x1, y1 = max(0, x0 - 1), max(0, y0 - 1), min(W, x1 + 1), min(H, y1 + 1)
    fw, fh = x1 - x0, y1 - y0
    maxf = max(len(fr) for _, _, fr in rows)
    sheet = Image.new('RGBA', (maxf * fw, len(rows) * fh), (0, 0, 0, 0))
    anims = []
    for r, (key, one, fr) in enumerate(rows):
        for i, f in enumerate(fr):
            sheet.paste(f.crop((x0, y0, x1, y1)), (i * fw, r * fh))
        # box = caixa opaca do 1º quadro dentro do quadro [x, y, w, h] (para recortes justos, ex. retratos)
        b = fr[0].crop((x0, y0, x1, y1)).getbbox() or (0, 0, fw, fh)
        anims.append(dict(name=key, row=r, frames=len(fr), fps=_fps(key, default_fps), loop=not one,
                          box=[b[0], b[1], b[2] - b[0], b[3] - b[1]]))
    _save(sheet, os.path.join(PUB, set_id + '.png'))
    ax, ay = anchor[0] - x0, anchor[1] - y0
    man = dict(kind='atlas', id=set_id, image=set_id + '.png', width=sheet.width, height=sheet.height,
               frameWidth=fw, frameHeight=fh, anchor=dict(x=ax, y=ay), animations=anims)
    _json(man, os.path.join(PUB, set_id + '.json'))
    if stills:
        items = []
        for key, _, fr in rows:
            f = fr[0].crop((x0, y0, x1, y1))
            b = f.getbbox()
            sx0, sy0 = max(0, b[0] - 1), max(0, b[1] - 1)
            f = f.crop((sx0, sy0, min(fw, b[2] + 1), min(fh, b[3] + 1)))
            rel = f'{set_id}/{key}.png'
            _save(f, os.path.join(PUB, rel))
            items.append(dict(id=key, image=rel, width=f.width, height=f.height, anchor=dict(x=ax - sx0, y=ay - sy0)))
        _json(dict(kind='static', id=set_id + '-stills', items=items), os.path.join(PUB, set_id + '-stills.json'))
    if os.environ.get('SPRITES_PREVIEW'):
        preview(set_id, rows, (fw, fh), (ax, ay))
    print(f'{set_id}: {len(rows)} animações, quadro {fw}x{fh}, atlas {sheet.width}x{sheet.height}', flush=True)
    return man


def write_static(group, items):
    """items = [(id, RGBA, (ax, ay), state|None)]; grava public/sprites/<group>/<id>[-<state>].png e <group>.json."""
    out = []
    for iid, im, (ax, ay), state in items:
        rel = f'{group}/{iid}' + (f'-{state}' if state else '') + '.png'
        _save(im, os.path.join(PUB, rel))
        e = dict(id=iid)
        if state:
            e['state'] = state
        e.update(image=rel, width=im.width, height=im.height, anchor=dict(x=ax, y=ay))
        out.append(e)
    _json(dict(kind='static', id=group, items=out), os.path.join(PUB, group + '.json'))
    print(f'{group}: {len(out)} imagens', flush=True)


def _with_shadow(f, shadow):
    m = shadow(f) if shadow else None
    if m is None:
        return f
    base = Image.new('RGBA', f.size, (0, 0, 0, 0))
    base.paste(Image.new('RGBA', f.size, (0, 0, 0, 255)), mask=m)
    base.alpha_composite(f)
    return base


def ellipse_shadow(cx, cy, rx=9, ry=4, alpha=90):
    """Sombra elíptica fixa nos pés (personagens)."""
    cache = {}

    def mk(f):
        if f.size not in cache:
            m = Image.new('L', f.size, 0)
            ImageDraw.Draw(m).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=alpha)
            cache[f.size] = m.filter(ImageFilter.GaussianBlur(1))
        return cache[f.size]
    return mk


def preview(set_id, rows, size, anchor, S=3):
    """Folha de conferência: cada linha da animação sobre fundo escuro, com a âncora marcada."""
    fw, fh = size
    maxf = max(len(fr) for _, _, fr in rows)
    pad = 6
    im = Image.new('RGB', (pad + maxf * (fw * S + pad), pad + len(rows) * (fh * S + 16 + pad)), (10, 12, 16))
    d = ImageDraw.Draw(im)
    sheet = Image.open(os.path.join(PUB, set_id + '.png')).convert('RGBA')
    for r, (key, _, fr) in enumerate(rows):
        y = pad + r * (fh * S + 16 + pad)
        d.text((pad, y), key, fill=(240, 180, 60))
        for i in range(len(fr)):
            bg = Image.new('RGBA', (fw, fh), (40, 44, 54, 255))
            bg.alpha_composite(sheet.crop((i * fw, r * fh, (i + 1) * fw, (r + 1) * fh)))
            bg.putpixel((min(fw - 1, anchor[0]), min(fh - 1, anchor[1])), (0, 255, 255, 255))
            im.paste(bg.convert('RGB').resize((fw * S, fh * S), Image.NEAREST), (pad + i * (fw * S + pad), y + 16))
    os.makedirs(PREVIEW, exist_ok=True)
    im.save(os.path.join(PREVIEW, set_id + '.png'))
