"""Stroje z arkuszy: klatki Gabi w stroju wycięte z arkuszy wygenerowanych na wzór oryginalnych (ten sam układ).

Użycie: /c/gvenv/Scripts/python tools/extract_outfits.py
Konfiguracja: sekcja `outfits` w tools/frames.json:
  "outfits": {"<id stroju>": {"sheets": {"<klucz arkusza>": {nadpisania}}, "skip": [wzorce nazw klatek]}}
Plik arkusza: assets/source/stroje/<id>/<klucz>.jpg — klucz jak w `sheets` frames.json (`main` = sprite-sheet.jpg).
Dla każdej klatki ciała i portretu z tego arkusza (bez `skip`, bez wpisów `like`): prostokąt z oryginału poszerzony
o `pad` (domyślnie 10 px arkusza — sukienka bywa szersza niż dżinsy), obróbka jak w extract_sprites (próbkowanie,
`hairTone`, tło, kwantyzacja do całej palety tools/palette.json, `clean_smooth`, `outline`) BEZ poprawek
przypiętych do pikseli oryginału (bag, cut, fix, wipe, copy, erase, paint); zostaje największy kształt.
Skala z klatki bazowej (src/sprites/frames.generated.json), kotwica i stopy jak w oryginale, czubek głowy —
`head_point`. Kontrola: wysokość klatki (portretu: wymiary) w ±15% oryginału, inaczej klatka pominięta z
ostrzeżeniem (w grze zostaje przemalowanie). Klatki pochodne (`derived`) — gdy jest klatka źródłowa.
Portrety: pad `portraitPad` (domyślnie 2 — nad ramką jest napis PORTRAIT, który przy większym pad-zie się dokleja).
Nadpisania arkusza: `background` (domyślnie "auto" — mediana lewego górnego rogu 20×20), `gridPeriod`, `pad`, `portraitPad`.
Wyjście: public/sprites/stroje/<id>/<klatka>.png, src/sprites/outfits.generated.json
{<id>: {"frames": {klatka: {w, h, anchorX, foot, scale, head}}, "portraits": {portret: [w, h]}}},
podgląd tools/out/stroj_<id>_<arkusz>.png (u góry oryginał, pod spodem strój, ×3).
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract_sprites as X  # noqa: E402

ROOT = X.ROOT
CFG = X.CFG
SRC_DIR = ROOT / 'assets' / 'source' / 'stroje'
OUT_DIR = ROOT / 'public' / 'sprites' / 'stroje'
META_PATH = ROOT / 'src' / 'sprites' / 'outfits.generated.json'
PREVIEW_DIR = ROOT / 'tools' / 'out'
BASE_META = json.loads((ROOT / 'src' / 'sprites' / 'frames.generated.json').read_text(encoding='utf-8'))
DEFAULT_PAD = 10
PORTRAIT_PAD = 2  # portrety: napis PORTRAIT nad ramką leży ok. 4 px nad prostokątem — szerszy pad dokleja jego resztki
SIZE_TOL = 0.15


def auto_background(img):
    """Kolor tła arkusza: mediana lewego górnego rogu 20×20 (generator daje trochę inne tło niż oryginał)."""
    return [float(v) for v in np.median(img[:20, :20].reshape(-1, 3), axis=0)]


def frames_on(sheet_key, skip):
    """(grupa, nazwa, wpis) klatek ciała i portretów z arkusza `sheet_key` — bez `skip` i bez wpisów `like`."""
    out = []
    for group in ('body', 'portraits'):
        for name, spec in CFG.get(group, {}).items():
            if isinstance(spec, dict) and 'like' in spec:
                continue
            if X.matches(name, skip):
                continue
            e = X.entry(spec, group)
            if e['sheet'] == sheet_key:
                out.append((group, name, e))
    return out


def cut(img, e, bg, period, pad, palette):
    """Klatka z arkusza stroju: prostokąt oryginału + `pad`, obróbka jak w extract_sprites, największy kształt."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = e['rect']
    rect = [max(0, x0 - pad), max(0, y0 - pad), min(w - 1, x1 + pad), min(h - 1, y1 + pad)]
    box = X.tight_box(img, rect, bg)
    cells, xs, ys = X.sample(img, box, period, e['sampleMode'], bg, e['bgTol'])
    if e['reduce'] == 2:
        cells, xs, ys = X.reduce2(cells, xs, ys, bg)
        period *= 2
    if e['hairTone']:
        cells = X.hair_tone(cells, *e['hairTone'])
    mask = X.background_mask(cells, bg, 12, e['holeTol'], e['halo']) | X.outside_box(xs, ys, box, period / 2)
    im = X.to_rgba(X.quantise(cells, palette), mask, palette)
    (sx0, sy0, sx1, sy1), shape = X.largest_shape(im)
    arr = np.array(im)
    arr[~shape] = 0
    im = Image.fromarray(arr, 'RGBA').crop((int(sx0), int(sy0), int(sx1) + 1, int(sy1) + 1))
    if e['sampleMode'] == 'smooth':
        im = X.clean_smooth(im)
    if e['outline']:
        im = X.outer_outline(im, e['outline'])
    return im


def body_meta(im, base):
    """Metadane klatki stroju: kotwica i stopy jak w extract_sprites, skala z klatki bazowej, czubek głowy."""
    (_, sy0, _, sy1), shape = X.largest_shape(im)
    arr = np.asarray(im).astype(int)
    head = X.head_point(X.wardrobe_classes(arr), arr[:, :, 3] > 0)
    return {'w': im.width, 'h': im.height, 'anchorX': round(X.anchor_x(shape, sy0), 2), 'foot': int(sy1) + 1,
            'scale': base['scale'], 'head': head}


def save_pair_preview(oid, skey, pairs, f=3):
    """Podgląd ×f: rząd oryginałów nad rzędem klatek stroju (ta sama kolejność)."""
    if not pairs:
        return
    def row(ims):
        return X.compose([(im.resize((im.width * f, im.height * f), Image.NEAREST), im.height * f) for im in ims])
    top, bottom = row([p[0] for p in pairs]), row([p[1] for p in pairs])
    out = Image.new('RGBA', (max(top.width, bottom.width), top.height + bottom.height), (255, 255, 255, 255))
    out.alpha_composite(top, (0, 0))
    out.alpha_composite(bottom, (0, top.height))
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out.save(PREVIEW_DIR / f'stroj_{oid}_{skey}.png')


def main():
    palette = X.load_palette(None)  # zamrożona paleta (tools/palette.json) — cała, bez limitu `paletteColours`
    meta = {}
    for oid, ocfg in CFG.get('outfits', {}).items():
        skip = ocfg.get('skip', [])
        odir = OUT_DIR / oid
        if odir.exists():
            shutil.rmtree(odir)
        odir.mkdir(parents=True)
        frames, portraits, cut_ims = {}, {}, {}
        for skey, over in ocfg['sheets'].items():
            path = SRC_DIR / oid / f'{skey}.jpg'
            if not path.exists():
                print(f'BRAK ARKUSZA {path}')
                continue
            img = X.sheet(str(path))
            bg_cfg = over.get('background', 'auto')
            bg = np.array(auto_background(img) if bg_cfg == 'auto' else bg_cfg, float)
            pad = over.get('pad', DEFAULT_PAD)
            pairs = []
            for group, name, e in frames_on(skey, skip):
                period = over.get('gridPeriod', e['period'])
                im = cut(img, e, bg, period, pad if group == 'body' else over.get('portraitPad', PORTRAIT_PAD), palette)
                if group == 'body':
                    base = BASE_META['frames'][name]
                    if abs(im.height / base['h'] - 1) > SIZE_TOL:
                        print(f'POMINIĘTA {oid}/{name}: wysokość {im.height} (oryginał {base["h"]})')
                        continue
                    frames[name] = body_meta(im, base)
                else:
                    bw, bh = BASE_META['portraits'][name]
                    if abs(im.width / bw - 1) > SIZE_TOL or abs(im.height / bh - 1) > SIZE_TOL:
                        print(f'POMINIĘTY {oid}/{name}: {im.width}x{im.height} (oryginał {bw}x{bh})')
                        continue
                    portraits[name] = [im.width, im.height]
                im.save(odir / f'{name}.png')
                cut_ims[name] = im
                pairs.append((Image.open(X.OUT_DIR / f'{name}.png').convert('RGBA'), im))
                print(f'{oid}/{name:14s} {im.width:3d}x{im.height:3d}')
            save_pair_preview(oid, skey, pairs)
        for name, spec in CFG.get('derived', {}).items():
            if spec['from'] in frames and not X.matches(name, skip):
                src = cut_ims[spec['from']]
                im = X.without_stool(src, spec['noStool']) if 'noStool' in spec else src.copy()
                im.save(odir / f'{name}.png')
                frames[name] = {**frames[spec['from']], 'w': im.width, 'h': im.height}
                print(f'{oid}/{name:14s} <- {spec["from"]}')
        meta[oid] = {'frames': frames, 'portraits': portraits}
        print(f'{oid}: klatek {len(frames)}, portretów {len(portraits)}')
    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Metadane: {META_PATH}')


if __name__ == '__main__':
    main()
