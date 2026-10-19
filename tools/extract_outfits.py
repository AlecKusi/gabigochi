"""Stroje z arkuszy: klatki Gabi w stroju wycięte z arkuszy wygenerowanych na wzór oryginalnych (ten sam układ).

Użycie: /c/gvenv/Scripts/python tools/extract_outfits.py
Konfiguracja: sekcja `outfits` w tools/frames.json:
  "outfits": {"<id stroju>": {"sheets": {"<klucz arkusza>": {nadpisania}}, "skip": [wzorce nazw klatek]}}
Plik arkusza: assets/source/stroje/<id>/<klucz>.jpg — klucz jak w `sheets` frames.json (`main` = sprite-sheet.jpg).
Brak któregokolwiek skonfigurowanego arkusza albo palety: błąd i wyjście (kod 1), nic nie jest kasowane ani nadpisywane.
Dla każdej klatki ciała i portretu z tego arkusza (bez `skip`, bez wpisów `like`): prostokąt z oryginału poszerzony
o `pad` (domyślnie 10 px arkusza — sukienka bywa szersza niż dżinsy), obróbka jak w extract_sprites (próbkowanie,
`hairTone`, tło, kwantyzacja do całej palety tools/palette.json, `clean_smooth`, `outline`) BEZ poprawek
przypiętych do pikseli oryginału (bag, cut, fix, wipe, copy, erase, paint); zostaje największy kształt.
Klatki z geometrią, której ta ścieżka nie odtwarza (`anchor` "center" wpisu lub arkusza, `align` arkusza,
`alignBottom`, `noSeat`, `pet`, `keep` "all", `onlyLargest`, `bgHsv`, `flipX`, `mirror`), są pomijane z ostrzeżeniem.
Skala z klatki bazowej (src/sprites/frames.generated.json), kotwica i stopy jak w oryginale, czubek głowy —
`head_point` (tylko gdy ma go klatka bazowa), `noHat` przepisany z klatki bazowej. Kontrola: wysokość klatki ciała
w ±15% oryginału, szerokość w ±35% (sukienka bywa szersza), portretu — oba wymiary w ±15%; inaczej klatka pominięta
z ostrzeżeniem (w grze zostaje przemalowanie). Klatki pochodne (`derived`) — tylko zwykłe kopie klatki źródłowej;
pochodne z `noStool` (współrzędne w pikselach klatki oryginalnej) są pomijane z ostrzeżeniem.
Portrety: pad `portraitPad` (domyślnie 2 — nad ramką jest napis PORTRAIT, który przy większym pad-zie się dokleja);
resztki napisu nad górną krawędzią ramki są czyszczone (`clear_caption`).
Nadpisania arkusza: `background` (domyślnie "auto" — mediana lewego górnego rogu 20×20), `gridPeriod`, `pad`, `portraitPad`.
Wyjście: public/sprites/stroje/<id>/<klatka>.png, src/sprites/outfits.generated.json
{<id>: {"frames": {klatka: {w, h, anchorX, foot, scale, head?, noHat?}}, "portraits": {portret: [w, h]}}},
podgląd tools/out/stroj_<id>_<arkusz>.png (u góry oryginał, pod spodem strój, ×3).
Klatki powstają w tools/out/stroje.tmp i trafiają do public/sprites/stroje dopiero na końcu przebiegu (`swap_in`)
— przerwany przebieg nie zostawia w połowie skasowanego katalogu.
"""
import json
import os
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
TMP_DIR = PREVIEW_DIR / 'stroje.tmp'  # budowa przed podmianą OUT_DIR (tools/out jest poza repo i poza public/)
BASE_META = json.loads((ROOT / 'src' / 'sprites' / 'frames.generated.json').read_text(encoding='utf-8'))
DEFAULT_PAD = 10
PORTRAIT_PAD = 2  # portrety: napis PORTRAIT nad ramką leży ok. 4 px nad prostokątem — szerszy pad dokleja jego resztki
SIZE_TOL = 0.15
WIDTH_TOL = 0.35  # szerokość klatki ciała: sukienka bywa wyraźnie szersza niż dżinsy oryginału
# Opcje geometrii wpisu (po `X.entry`, więc i z arkusza), których ta ścieżka nie odtwarza — klatka stroju
# wypadłaby w innym miejscu niż oryginał. Do tego `align` arkusza (sprawdzane osobno).
UNSUPPORTED = {
    'anchor': lambda v: v == 'center',
    'alignBottom': bool,
    'noSeat': bool,
    'pet': bool,
    'keep': lambda v: v == 'all',
    'onlyLargest': bool,
    'bgHsv': bool,
    'flipX': bool,
    'mirror': bool,
}


def auto_background(img):
    """Kolor tła arkusza: mediana lewego górnego rogu 20×20 (generator daje trochę inne tło niż oryginał)."""
    return [float(v) for v in np.median(img[:20, :20].reshape(-1, 3), axis=0)]


def frames_on(sheet_key, skip):
    """(grupa, nazwa, wpis) klatek ciała i portretów z arkusza `sheet_key` — bez `skip`, bez wpisów `like`
    i bez klatek z nieobsługiwaną geometrią (`UNSUPPORTED`, `align` arkusza; te z ostrzeżeniem)."""
    out = []
    for group in ('body', 'portraits'):
        for name, spec in CFG.get(group, {}).items():
            if isinstance(spec, dict) and 'like' in spec:
                continue
            if X.matches(name, skip):
                continue
            e = X.entry(spec, group)
            if e['sheet'] != sheet_key:
                continue
            bad = [k for k, test in UNSUPPORTED.items() if test(e[k])]
            if 'align' in CFG.get('sheets', {}).get(e['sheet'], {}):
                bad.append('align (arkusz)')
            if bad:
                print(f'POMINIĘTA {name}: nieobsługiwane opcje {", ".join(bad)}')
                continue
            out.append((group, name, e))
    return out


def cut(img, e, bg, period, pad, palette, portrait=False):
    """Klatka z arkusza stroju: prostokąt oryginału + `pad`, obróbka jak w extract_sprites, największy kształt.
    Portret (`portrait`) — dodatkowo bez resztek napisu nad ramką (`clear_caption`)."""
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
    return clear_caption(im) if portrait else im


def clear_caption(im, run=0.6, corner=0.1, rows=8):
    """Portret: górna krawędź ramki to pierwszy (z `rows` górnych) wiersz, w którym ciągły nieprzezroczysty odcinek
    ma >= `run` szerokości. Piksele nad nią to resztki napisu PORTRAIT — znikają; zostają tylko rogi (skrajne
    `corner` szerokości z każdej strony), bo zaokrąglone rogi ramki wystają nad krawędź także w oryginale.
    Wymiary bez zmian (jak portret oryginalny)."""
    arr = np.array(im)
    op = arr[:, :, 3] > 0
    for y in range(min(rows, im.height)):
        longest = cur = 0
        for v in op[y]:
            cur = cur + 1 if v else 0
            longest = max(longest, cur)
        if longest >= run * im.width:
            m = int(round(corner * im.width))
            arr[:y, m:im.width - m] = 0
            return Image.fromarray(arr, 'RGBA')
    return im


def body_meta(im, base):
    """Metadane klatki stroju: kotwica i stopy jak w extract_sprites, skala z klatki bazowej; czubek głowy
    (`head_point`) tylko, gdy ma go klatka bazowa, a `noHat` przepisany z niej."""
    (_, sy0, _, sy1), shape = X.largest_shape(im)
    meta = {'w': im.width, 'h': im.height, 'anchorX': round(X.anchor_x(shape, sy0), 2), 'foot': int(sy1) + 1,
            'scale': base['scale']}
    if 'head' in base:
        arr = np.asarray(im).astype(int)
        meta['head'] = X.head_point(X.wardrobe_classes(arr), arr[:, :, 3] > 0)
    if 'noHat' in base:
        meta['noHat'] = base['noHat']
    return meta


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


def sheet_path(oid, skey):
    return SRC_DIR / oid / f'{skey}.jpg'


def check_inputs():
    """Paleta i wszystkie skonfigurowane arkusze muszą istnieć — sprawdzane, zanim cokolwiek zostanie ruszone.
    Zwraca zamrożoną paletę tools/palette.json (całą, bez limitu `paletteColours`; nigdy nie liczoną tu od nowa)."""
    missing = [sheet_path(oid, skey) for oid, ocfg in CFG.get('outfits', {}).items() for skey in ocfg['sheets']
               if not sheet_path(oid, skey).exists()]
    if not X.PALETTE_PATH.exists():
        missing.insert(0, X.PALETTE_PATH)
    for path in missing:
        print(f'BŁĄD: brak pliku {path}')
    if missing:
        print('Nic nie zostało zmienione.')
        sys.exit(1)
    return np.array(json.loads(X.PALETTE_PATH.read_text(encoding='utf-8')), float)


def swap_in(built):
    """Gotowy katalog `built` zastępuje zawartość OUT_DIR: najpierw każdy nowy plik podmieniany w miejscu
    (`os.replace`), dopiero potem kasowane pliki i katalogi, których nowy przebieg nie dał. Plik po pliku, a nie
    zmiana nazwy katalogu — na Windows katalog obserwowany przez serwer deweloperski (vite) nie da się przenieść."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    new = {p.relative_to(built) for p in built.rglob('*')}  # pliki i katalogi nowego przebiegu
    for rel in sorted(new):
        dst = OUT_DIR / rel
        if (built / rel).is_dir():
            dst.mkdir(parents=True, exist_ok=True)
        else:
            os.replace(built / rel, dst)
    for old in sorted(OUT_DIR.rglob('*'), key=lambda p: len(p.parts), reverse=True):
        if old.relative_to(OUT_DIR) in new:
            continue
        if old.is_dir():
            old.rmdir()
        else:
            old.unlink()
    shutil.rmtree(built)


def main():
    palette = check_inputs()
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)  # resztka przerwanego przebiegu
    TMP_DIR.mkdir(parents=True)
    meta = {}
    for oid, ocfg in CFG.get('outfits', {}).items():
        skip = ocfg.get('skip', [])
        odir = TMP_DIR / oid
        odir.mkdir()
        frames, portraits, cut_ims = {}, {}, {}
        for skey, over in ocfg['sheets'].items():
            img = X.sheet(str(sheet_path(oid, skey)))
            bg_cfg = over.get('background', 'auto')
            bg = np.array(auto_background(img) if bg_cfg == 'auto' else bg_cfg, float)
            pad = over.get('pad', DEFAULT_PAD)
            pairs = []
            for group, name, e in frames_on(skey, skip):
                period = over.get('gridPeriod', e['period'])
                if group == 'body':
                    im = cut(img, e, bg, period, pad, palette)
                    base = BASE_META['frames'][name]
                    if abs(im.height / base['h'] - 1) > SIZE_TOL or abs(im.width / base['w'] - 1) > WIDTH_TOL:
                        print(f'POMINIĘTA {oid}/{name}: {im.width}x{im.height} (oryginał {base["w"]}x{base["h"]})')
                        continue
                    frames[name] = body_meta(im, base)
                else:
                    im = cut(img, e, bg, period, over.get('portraitPad', PORTRAIT_PAD), palette, portrait=True)
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
            if spec['from'] not in frames or X.matches(name, skip):
                continue
            if 'noStool' in spec:
                print(f'POMINIĘTA {oid}/{name}: pochodna z noStool (współrzędne w pikselach klatki oryginalnej)')
                continue
            im = cut_ims[spec['from']].copy()
            im.save(odir / f'{name}.png')
            frames[name] = {**frames[spec['from']], 'w': im.width, 'h': im.height}
            print(f'{oid}/{name:14s} <- {spec["from"]}')
        meta[oid] = {'frames': frames, 'portraits': portraits}
        print(f'{oid}: klatek {len(frames)}, portretów {len(portraits)}')
    swap_in(TMP_DIR)
    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Klatki: {OUT_DIR}')
    print(f'Metadane: {META_PATH}')


if __name__ == '__main__':
    main()
