"""Wycina klatki postaci z arkuszy i zapisuje czyste PNG w natywnej rozdzielczości (przycięte do obrysu).

Użycie: /c/gvenv/Scripts/python tools/extract_sprites.py
Konfiguracja: tools/frames.json

Arkusze: domyślny `main` (pola `sheet`, `background`, `gridPeriod` na górze pliku) oraz sekcja `sheets`.
Wpis klatki: [x0,y0,x1,y1] (arkusz main) albo {"sheet": nazwa, "rect": [...], "erase": [...]}.
`erase` — prostokąty [x0,y0,x1,y1] albo wielokąty [[x,y],...] w px arkusza, wymazywane do przezroczystości.
`paint` — [[x0,y0,x1,y1,[r,g,b]], ...]: komórki ze środkiem w prostokącie (px arkusza) dostają ten kolor
          (po dopasowaniu do palety) i są nieprzezroczyste — drobne poprawki po wymazaniu (np. odsłonięta noga łóżka).
`like` — nazwa innej klatki: przejmuje jej wpis, a własne listy (`erase`, `paint` i klucze retuszu)
          dopisuje na końcu.

Retusz (po kwantyzacji do palety, w komórkach natywnych; kształty jak w `erase`, w px arkusza) — usuwa torbę:
`bag`  — obszar torby i paska na ciele: komórki w kolorach torby (`bagColor`: ciepły, mało nasycony, jasny beż)
         są zamalowywane od brzegów kolorami sąsiadów (koszula, dżinsy, skóra) — patrz `inpaint`.
`wipe` — jak `bag`, ale zamalowuje wszystkie komórki obszaru (np. ciemny kontur torby na koszuli).
`cut`  — obszar torby poza ciałem: komórki stają się przezroczyste, a te z nich, które dotykają pozostałej
         postaci, dostają kolor obrysu (najciemniejszy z palety), żeby sylwetka miała ciągły kontur.
`copy` — [{"from": klatka, "rect": [x0,y0,x1,y1], "to": [x,y]}, ...]: komórki z prostokąta (px arkusza) innej
         klatki z tego samego arkusza, przeniesione tak, że lewy górny róg prostokąta trafia w `to` — np. nadruk
         koszulki, przez który szedł pasek, odtworzony z klatki bez paska.
`fix`  — [[x0,y0,x1,y1,[r,g,b] | null], ...]: ręczne poprawki po retuszu (kolor z palety albo przezroczystość).
`shadow` — obszary cienia na podłodze narysowanego w arkuszu: znika szara plama wokół butów (`remove_shadow`).
`shadowHsv` — [odcień od, odcień do, nasycenie max, jasność od, jasność do] (wpis albo arkusz): w obszarach `shadow`
         znikają też wszystkie komórki w kolorach cienia, nawet otoczone konturem (cień między nogami mebla).
`shadowBarrier` — jasność (wpis): zalewanie cienia zatrzymuje się na pikselach ciemniejszych niż to (domyślnie
         SHADOW_BARRIER_VAL) — dla mebli z szarymi nogami w kolorze bliskim cieniowi (suszarka).
`dropSpecks` — liczba (wpis albo arkusz): po retuszu znikają kształty mniejsze niż tyle komórek (okruchy cienia).
`bgHsv` — [odcień od, odcień do, nasycenie od, do, jasność od, do] (wpis): klatka narysowana na własnym tle
         (gradient, deszcz za szybą prysznica) — komórki w tym zakresie barw spójne z brzegiem prostokąta też są
         tłem, a zamknięte nimi dziury od `bgHsvHole` komórek (domyślnie 30) też.
Podgląd przed/po: tools/out/bag_before_after.png.

Paleta (k-means wszystkich klatek) jest zamrożona w tools/palette.json — usunięcie albo dodanie klatki nie
przebarwia pozostałych. `--palette` liczy ją od nowa z bieżących klatek. Klatka kwantyzuje się do pierwszych
`paletteColours` kolorów (pole arkusza; domyślnie `paletteSize`). `--extend-palette K ARKUSZ...` dopisuje K kolorów
dla nowych arkuszy (patrz `extend_palette`) — starsze klatki ich nie widzą, więc ich PNG się nie zmieniają.

Przedmioty (sekcja `items`, osobna od `body`/`portraits`): wpis jak klatka ({"sheet", "rect", "erase", ...}) plus
`keep` ("largest" — największy kształt w prostokącie, albo "all"), `scale` (skala wpisu; domyślnie `scale` arkusza,
skala z `scaleRef` arkusza postaci albo 1), `mirror` ([["x"|"y", środek w px arkusza], ...] — połowa za środkiem
zastąpiona odbiciem połowy przed nim, np. dywan zasłonięty z jednej strony) i dane katalogu (`name`, `category`,
`layer`, `interaction`, `price`). Przy `keep` "largest" zostaje tylko jeden spójny kształt (bez odprysków
sąsiadów). Arkusz może mieć `halo` i `holeTol` (= `hole_tol`) — patrz `background_mask` (rozmyty arkusz z jasną
obwódką konturu i jasnymi płaszczyznami blisko tła: poduszki, dywany). Wyjście: public/items/<id>.png (przycięte
do obrysu), src/home/items.generated.json {id: {w, h, scale, name, category, layer, interaction, price}} (dane
katalogu tylko dla wpisów z `name`), tools/out/items_manifest.json (te same dane katalogu jako lista),
podgląd ×3 z podpisami i postacią `idle_front` dla skali: tools/out/items_preview.png.

Kotwica x: `anchor` arkusza albo wpisu — "head" (środek czubka głowy) albo "center" (środek obrazka, sceny).
Arkusz z `"align": wzorzec` — po wycięciu każda klatka arkusza jest przesuwana (całkowite px natywne) tak,
żeby jej łóżko pokryło się z łóżkiem wzorca; przesunięcie trafia do `anchorX`/`foot` (patrz `align_sheet`).
Wpis z `"alignBottom": [wzorzec, wiersze]` — klatka pętli wyrównana w poziomie do wzorca po butach / nogach
stołka (patrz `align_bottom`). Arkusz z `"preview": nazwa` — podgląd ×4 swoich klatek w tools/out/<nazwa>.png.

Klatki stanów przedmiotu (sekcja `items`, bez danych katalogu): `"frameOf": przedmiot` — klatka (np. toaleta
z otwartą klapą) wyrównana do przedmiotu bazowego: całkowite przesunięcie (±ITEM_ALIGN_SEARCH komórek)
z największą liczbą pikseli tego samego koloru (tylko piksele klatki, których środek leży w `alignRect` w px
arkusza; domyślnie wszystkie) — `anchorX`/`foot` klatki = punkt, który pokrywa się ze środkiem dolnej krawędzi
przedmiotu (jego kotwicą), więc klatka narysowana w miejscu przedmiotu pokrywa go dokładnie. W metadanych:
`frameOf`, `state` (id bez przedrostka `<przedmiot>_`) i `overlay`. `"overlay": false` — klatka narysowana inaczej
niż przedmiot (nie da się jej nałożyć): kotwica jak w klatce postaci (środek czubka głowy, linia stóp = dół
największego kształtu). `"flipX": true` — klatka odbita w poziomie po wycięciu (arkusz narysował ją w lustrze).
`scaleRef` arkusza może wskazywać przedmiot (np. klatkę stanu z Gabi) zamiast klatki postaci: wysokość Gabi to
liczba wierszy z nieprzezroczystymi komórkami w kolumnach `scaleRefCols` ([x0, x1] w px arkusza); `scaleCheck`
({klatka: [x0, x1]}) tylko wypisuje, jak wysoka wyjdzie Gabi w innych klatkach. `holeTol` może być też we wpisie;
`anchorAt` ([x, y] w px arkusza) — zamiast dopasowania kolorów: ten punkt klatki pokrywa się z kotwicą przedmiotu
(rozmyte arkusze, w których kolory przedmiotu w klatkach nie są identyczne, np. miska z kotem). `hairTone` (patrz
`hair_tone`) może być też we wpisie. `holeTolAll` (arkusz albo wpis, domyślnie 15) — to samo dla wpisów `keep: "all"` (jasne płaszczyzny blisko tła, np.
brodzik prysznica, nie stają się dziurami).
Arkusz z `"itemPreview": nazwa` — podgląd ×3·skala jego przedmiotów, klatek stanów i pozy postaci (z `idle_front`)
oraz przenikanie każdej serii (przedmiot + stany w kotwicy przedmiotu) w tools/out/<nazwa>.png.

Szafa (sekcja `wardrobe`): dla każdej klatki ciała (i portretów z `wardrobe.portraits`) maska ubrania
public/masks/<klatka>.png (R = koszulka bez nadruku, G = nadruk, B = dżinsy; rozmiar klatki) wyznaczona
automatycznie z klas kolorów HSV (`wardrobe.classes`) — patrz `wardrobe_masks`; w metadanych klatki `mask`,
`head` {x, y, w} (czubek głowy, px natywne; x jak `anchorX`), `knee` (wiersz kolan) i `noHat`; lista portretów
z maską w `portraitMasks`. Podgląd: tools/out/wardrobe_masks.png (`save_wardrobe`).
"""
import colorsys
import fnmatch
import json
import re
import sys
from collections import Counter, deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / 'tools' / 'frames.json').read_text(encoding='utf-8'))
OUT_DIR = ROOT / 'public' / 'sprites'
META_PATH = ROOT / 'src' / 'sprites' / 'frames.generated.json'
PREVIEW = ROOT / 'tools' / 'out' / 'preview.png'
PREVIEW_NEW = ROOT / 'tools' / 'out' / 'preview_new.png'
DRAG_X4 = ROOT / 'tools' / 'out' / 'drag_x4.png'
BED_ALIGNED = ROOT / 'tools' / 'out' / 'bed_aligned.png'
BAG_PREVIEW = ROOT / 'tools' / 'out' / 'bag_before_after.png'
PALETTE_PATH = ROOT / 'tools' / 'palette.json'
ITEMS_DIR = ROOT / 'public' / 'items'
ITEMS_META = ROOT / 'src' / 'home' / 'items.generated.json'
ITEMS_MANIFEST = ROOT / 'tools' / 'out' / 'items_manifest.json'
ITEMS_PREVIEW = ROOT / 'tools' / 'out' / 'items_preview.png'
MASKS_DIR = ROOT / 'public' / 'masks'
WARDROBE_PREVIEW = ROOT / 'tools' / 'out' / 'wardrobe_masks.png'
ITEM_FIELDS = ('name', 'category', 'layer', 'interaction', 'price')
RETOUCH_KEYS = ('bag', 'wipe', 'cut', 'copy', 'fix', 'shadow')
LIST_KEYS = ('erase', 'paint') + RETOUCH_KEYS
ALIGN_SEARCH = 20
ITEM_ALIGN_SEARCH = 40
SHADOW_BARRIER_VAL = 0.22
NEIGH4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
NEIGH8 = tuple((dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
_sheets = {}


def sheet(path):
    if path not in _sheets:
        _sheets[path] = np.asarray(Image.open(ROOT / path).convert('RGB')).astype(float)
    return _sheets[path]


def entry(spec, group):
    """Wpis klatki jako słownik: path, rect, background, period, keep, sheet, anchor + listy LIST_KEYS."""
    if isinstance(spec, list):
        spec = {'rect': spec}
    if 'like' in spec:
        base = CFG[group][spec['like']]
        spec = {**base, **spec, **{k: base.get(k, []) + spec.get(k, []) for k in LIST_KEYS}}
    name = spec.get('sheet', 'main')
    sh = CFG.get('sheets', {}).get(name, {})
    default_period = CFG['gridPeriod'] if group == 'body' else CFG['portraitPeriod']
    return {
        'path': sh.get('path', CFG['sheet']),
        'rect': spec['rect'],
        'background': spec.get('background', sh.get('background', CFG['background'])),
        'period': sh.get('gridPeriod', default_period),
        'keep': spec.get('keep', sh.get('keep', 'largest')),
        'sheet': name,
        'anchor': spec.get('anchor', sh.get('anchor', 'head')),
        'colours': sh.get('paletteColours', CFG['paletteSize']),
        'alignBottom': spec.get('alignBottom'),
        'halo': sh.get('halo'),
        'holeTol': spec.get('holeTol', sh.get('holeTol')),
        'holeTolAll': spec.get('holeTolAll', sh.get('holeTolAll', 15)),
        'mirror': spec.get('mirror', []),
        'flipX': spec.get('flipX', False),
        'noSeat': spec.get('noSeat', []),
        'sampleMode': sh.get('sampleMode', 'pixel'),
        'bgTol': sh.get('bgTol', 45),
        'reduce': sh.get('reduce', 1),
        'hairTone': spec.get('hairTone', sh.get('hairTone')),
        'outline': sh.get('outline', []),
        'pet': spec.get('pet', []),
        'seatMode': spec.get('seatMode', sh.get('seatMode', 'colour')),
        'onlyLargest': spec.get('onlyLargest', sh.get('onlyLargest', False)),
        'shadowHsv': spec.get('shadowHsv', sh.get('shadowHsv')),
        'dropSpecks': spec.get('dropSpecks', sh.get('dropSpecks', 0)),
        'shadowBarrier': spec.get('shadowBarrier'),
        'bgHsv': spec.get('bgHsv'),
        'bgHsvHole': spec.get('bgHsvHole', 30),
        **{k: spec.get(k, []) for k in LIST_KEYS},
    }


def components(mask, neigh):
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue = deque([(y, x)])
                comp = []
                while queue:
                    cy, cx = queue.popleft()
                    comp.append((cy, cx))
                    for dy, dx in neigh:
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((ny, nx))
                yield comp


def tight_box(img, rect, bg):
    """Ramka największego spójnego obiektu w prostokącie (odrzuca podpisy typu '1.')."""
    x0, y0, x1, y1 = rect
    mask = np.abs(img[y0:y1 + 1, x0:x1 + 1] - bg).sum(axis=2) > 40
    best = max(components(mask, NEIGH8), key=len)
    ys = [p[0] for p in best]
    xs = [p[1] for p in best]
    return x0 + min(xs), y0 + min(ys), x0 + max(xs), y0 + max(ys)


def best_offset(grad, period):
    def score(offset):
        idx = np.round(offset + np.arange(int((len(grad) - offset) / period)) * period).astype(int)
        return grad[idx[idx < len(grad)]].sum()
    return max(np.arange(0, period, 0.25), key=score)


def sample(img, box, period, mode='pixel', bg=None, bg_tol=45):
    """Próbkuje siatkę pikseli o danym okresie: mediana środka każdej komórki.

    `mode` "smooth" — arkusz narysowany gładko (bez prawdziwej siatki): cała komórka, a kontur ma pierwszeństwo —
    gdy >= 30% pikseli komórki jest ciemnych (kontur, czarna koszulka), komórka dostaje medianę ciemnych pikseli,
    inaczej medianę jasnych; cienkie linie nie rwą się, wypełnienia nie mieszają się z konturem.

    `bg_tol` (pole arkusza `bgTol`, domyślnie 45) — piksel bliżej tła niż ta suma różnic RGB liczy się jako tło;
    arkusz z jednolitym tłem i bladymi przedmiotami (miętowa lodówka) potrzebuje mniejszego progu.

    Zwraca też środki komórek w pikselach arkusza: (xs, ys).
    """
    x0, y0, x1, y1 = box
    pad = int(period * 2)
    rx0, ry0 = max(0, x0 - pad), max(0, y0 - pad)
    reg = img[ry0:y1 + pad + 1, rx0:x1 + pad + 1]
    gx = np.abs(np.diff(reg, axis=1)).sum(axis=(0, 2))
    gy = np.abs(np.diff(reg, axis=0)).sum(axis=(1, 2))
    ox = best_offset(gx, period) + 1
    oy = best_offset(gy, period) + 1
    w = int((reg.shape[1] - ox) / period)
    h = int((reg.shape[0] - oy) / period)
    out = np.zeros((h, w, 3))
    inset = 0 if mode == 'smooth' else period * 0.25
    for j in range(h):
        ya = int(round(oy + j * period + inset))
        yb = max(ya + 1, int(round(oy + (j + 1) * period - inset)))
        for i in range(w):
            xa = int(round(ox + i * period + inset))
            xb = max(xa + 1, int(round(ox + (i + 1) * period - inset)))
            px = reg[ya:yb, xa:xb].reshape(-1, 3)
            if mode == 'smooth':
                if bg is not None:
                    # wygładzone brzegi: kratka w większości z tła = tło; inaczej tło nie bierze udziału
                    near_bg = np.abs(px - bg).sum(axis=1) < bg_tol
                    if near_bg.mean() >= 0.5:
                        out[j, i] = bg
                        continue
                    px = px[~near_bg]
                lum = px @ np.array([0.299, 0.587, 0.114])
                dark = lum < 70
                px = px[dark] if dark.mean() >= 0.4 else (px[~dark] if (~dark).any() else px)
            out[j, i] = np.median(px, axis=0)
    xs = rx0 + ox + (np.arange(w) + 0.5) * period
    ys = ry0 + oy + (np.arange(h) + 0.5) * period
    return out, xs, ys


def reduce2(cells, xs, ys, bg):
    """`reduce: 2` — zmniejszenie komórek 2×2 → 1 z zachowaniem cech (gładkie arkusze, żeby piksel miał wielkość jak
    w domyślnych klatkach): >= 3 komórki tła → tło; >= 2 ciemne (kontur) → mediana ciemnych; jedna ciemna na jasnym
    (oko, okulary, usta na skórze) → ta ciemna; na brzegu (2 komórki tła) — kontur, jeśli jest, inaczej mediana
    reszty; w środku — mediana."""
    h, w = cells.shape[0] // 2, cells.shape[1] // 2
    out = np.zeros((h, w, 3))
    wl = np.array([0.299, 0.587, 0.114])
    for j in range(h):
        for i in range(w):
            blk = cells[2 * j:2 * j + 2, 2 * i:2 * i + 2].reshape(-1, 3)
            is_bg = np.abs(blk - bg).sum(axis=1) < 45
            if is_bg.sum() >= 3:
                out[j, i] = bg
                continue
            obj = blk[~is_bg]
            lum = obj @ wl
            dark = lum < 60
            if dark.sum() >= 2 or (dark.sum() == 1 and is_bg.sum() == 2):
                out[j, i] = np.median(obj[dark], axis=0)
            elif dark.sum() == 1 and (lum[~dark].mean() if (~dark).any() else 0) > 110:
                out[j, i] = obj[dark][0]
            else:
                out[j, i] = np.median(obj[~dark] if (~dark).any() else obj, axis=0)
    xs2 = (xs[0:2 * w:2] + xs[1:2 * w:2]) / 2
    ys2 = (ys[0:2 * h:2] + ys[1:2 * h:2]) / 2
    return out, xs2, ys2


def hair_tone(cells, sat_mul, val_mul):
    """`hairTone`: [mnożnik nasycenia, mnożnik jasności] dla włosów (lawendowe odcienie 255–315°, nasycenie 0,08–0,45,
    jasność > 0,45) — włosy z nowych arkuszy wychodzą w srebrno-lawendowych kolorach domyślnej Gabi. Mocne fiolety
    (prezent, kokardy) i ciemne końcówki zostają."""
    out = cells.copy()
    h, w, _ = cells.shape
    for j in range(h):
        for i in range(w):
            r, g, b = cells[j, i] / 255
            hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
            if 255 <= hh * 360 <= 315 and 0.08 <= ss <= 0.45 and vv > 0.45:
                out[j, i] = np.array(colorsys.hsv_to_rgb(hh, ss * sat_mul, min(1.0, vv * val_mul))) * 255
    return out


def clean_smooth(im, small=12, head=0.28):
    """Sprzątanie klatki z gładkiego arkusza: (1) dziury wewnątrz sylwetki — w głowie (górne `head` wysokości) zawsze,
    niżej tylko małe (< `small` px; prawdziwe prześwity między rękami/nogami zostają) — zamalowane medianą
    sąsiadów, warstwa po warstwie od brzegu dziury; (2) pojedyncze kropki: piksel, który jest dużo jaśniejszy albo
    ciemniejszy od wszystkich 4 sąsiadów, a sąsiedzi są włosami (lawendowe) albo jednolitym ubraniem (ciemne) —
    dostaje kolor sąsiadów (oczy i okulary leżą na skórze/w linii, więc zostają)."""
    arr = np.array(im)
    op = arr[:, :, 3] > 0
    h, w = op.shape
    rows = np.nonzero(op.any(axis=1))[0]
    top = int(rows.min()) if len(rows) else 0
    head_end = top + int((rows.max() - top + 1) * head) if len(rows) else 0
    fill = np.zeros_like(op)
    for comp in components(~op, NEIGH4):
        if any(y in (0, h - 1) or x in (0, w - 1) for y, x in comp):
            continue
        in_head = np.mean([y for y, _ in comp]) < head_end
        if in_head or len(comp) < small:
            for p in comp:
                fill[p] = True
    while fill.any():
        grown = []
        for y, x in zip(*np.nonzero(fill)):
            nb = [arr[y + dy, x + dx, :3] for dy, dx in NEIGH8
                  if 0 <= y + dy < h and 0 <= x + dx < w and op[y + dy, x + dx]]
            if nb:
                grown.append((y, x, np.median(np.array(nb), axis=0)))
        if not grown:
            break
        for y, x, c in grown:
            arr[y, x, :3] = c
            arr[y, x, 3] = 255
            op[y, x] = True
            fill[y, x] = False
    rgb = arr[:, :, :3].astype(float)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if not op[y, x]:
                continue
            nb = [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
            if not all(op[a, b] for a, b in nb):
                continue
            d = [lum[y, x] - lum[a, b] for a, b in nb]
            if not (all(v > 60 for v in d) or all(v < -60 for v in d)):
                continue
            cols = np.array([rgb[a, b] for a, b in nb])
            hsv = [colorsys.rgb_to_hsv(*(c / 255)) for c in cols]
            hairy = all(255 <= hh * 360 <= 320 and ss < 0.5 and vv > 0.45 for hh, ss, vv in hsv)
            clothy = all(vv < 0.3 for _, _, vv in hsv)
            if hairy or clothy:
                arr[y, x, :3] = np.median(cols, axis=0)
    return Image.fromarray(arr, 'RGBA')


def outer_outline(im, colours):
    """`outline`: kolejne pierścienie wokół sylwetki (tylko od zewnątrz — nie w dziurach, np. we włosach), każdy w swoim
    kolorze: ciemny pogrubia kontur (gładkie arkusze wyglądają jak domyślne klatki), jasny oddziela czarnego kota od
    czarnych ubrań. Obrazek rośnie o 1 px z każdej strony na pierścień."""
    for colour in colours:
        rgb = [int(colour[i:i + 2], 16) for i in (1, 3, 5)]
        arr = np.pad(np.array(im), ((1, 1), (1, 1), (0, 0)))
        op = arr[:, :, 3] > 0
        h, w = op.shape
        outside = np.zeros_like(op)
        q = deque((y, x) for y in range(h) for x in (0, w - 1) if not op[y, x])
        q.extend((y, x) for x in range(w) for y in (0, h - 1) if not op[y, x])
        for y, x in q:
            outside[y, x] = True
        while q:
            y, x = q.popleft()
            for dy, dx in NEIGH4:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not op[ny, nx] and not outside[ny, nx]:
                    outside[ny, nx] = True
                    q.append((ny, nx))
        ring = np.zeros_like(op)
        for dy, dx in NEIGH4:
            ring |= shift(op, dy, dx)
        arr[ring & ~op & outside] = rgb + [255]
        im = Image.fromarray(arr, 'RGBA')
    # szczeliny domknięte obrysem (między nogami, przy łokciu) — maleńkie dziurki → kolor pierwszego obrysu
    arr = np.array(im)
    op = arr[:, :, 3] > 0
    h, w = op.shape
    first = [int(colours[0][i:i + 2], 16) for i in (1, 3, 5)]
    for comp in components(~op, NEIGH4):
        if len(comp) < 6 and not any(y in (0, h - 1) or x in (0, w - 1) for y, x in comp):
            for p in comp:
                arr[p] = first + [255]
    return Image.fromarray(arr, 'RGBA')


def outside_box(xs, ys, box, margin):
    """Maska komórek, których środek leży poza ramką obiektu powiększoną o margines."""
    x0, y0, x1, y1 = box
    out_x = (xs < x0 - margin) | (xs > x1 + margin)
    out_y = (ys < y0 - margin) | (ys > y1 + margin)
    return out_y[:, None] | out_x[None, :]


def in_erase(x, y, shapes):
    for s in shapes:
        if len(s) == 4 and all(isinstance(v, (int, float)) for v in s):
            if s[0] <= x <= s[2] and s[1] <= y <= s[3]:
                return True
        else:
            inside = False
            for (x1, y1), (x2, y2) in zip(s, s[1:] + s[:1]):
                if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                    inside = not inside
            if inside:
                return True
    return False


def erase_mask(xs, ys, shapes):
    """Maska komórek, których środek leży w którymś kształcie z `erase`."""
    mask = np.zeros((len(ys), len(xs)), bool)
    if shapes:
        for j, y in enumerate(ys):
            for i, x in enumerate(xs):
                mask[j, i] = in_erase(x, y, shapes)
    return mask


def in_hsv(cells, box):
    """Komórki (RGB 0–255) w zakresie [odcień od, do, nasycenie od, do, jasność od, do] (odcień w stopniach)."""
    c = cells / 255.0
    mx, mn = c.max(axis=2), c.min(axis=2)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    h0, h1, s0, s1, v0, v1 = box
    return (hue >= h0) & (hue <= h1) & (sat >= s0) & (sat <= s1) & (mx >= v0) & (mx <= v1)


def background_mask(cells, bg, min_blob=12, hole_tol=None, halo=None, hsv=None, hsv_hole=30):
    """Tło: komórki bliskie tłu spójne z brzegiem albo dziury >= 6 komórek.

    `hole_tol`: dziura (nie przy brzegu) jest tłem tylko, gdy jej średnia różnica od tła < hole_tol —
    jasne refleksy włosów i koszuli nocnej są blisko tła, ale wyraźnie mniej jednolite niż prawdziwe tło.
    `halo`: rozmyty arkusz ma wokół konturu jasną obwódkę (mieszanka tła i konturu) — dwa pierścienie komórek
    stykających się z tłem, o różnicy od tła < halo, też stają się tłem (wnętrze za ciemnym konturem zostaje).
    `hsv`: własne tło klatki (patrz `bgHsv`) — komórki w tym zakresie barw też są tłem, gdy łączą się z brzegiem
    albo tworzą dziurę od `hsv_hole` komórek.
    """
    diff = np.abs(cells - bg).sum(axis=2)
    near = diff < 30
    painted = in_hsv(cells, hsv) & ~near if hsv else np.zeros_like(near)
    near = near | painted
    h, w = near.shape
    mask = np.zeros((h, w), bool)
    for comp in components(near, NEIGH4):
        touches_edge = any(y in (0, h - 1) or x in (0, w - 1) for y, x in comp)
        if hsv and any(painted[p] for p in comp):
            is_hole = len(comp) >= hsv_hole
        else:
            is_hole = len(comp) >= 6 and (hole_tol is None or np.mean([diff[p] for p in comp]) < hole_tol)
        if touches_edge or is_hole:
            for p in comp:
                mask[p] = True
    for _ in range(2 if halo else 0):
        grown = mask.copy()
        grown[1:] |= mask[:-1]
        grown[:-1] |= mask[1:]
        grown[:, 1:] |= mask[:, :-1]
        grown[:, :-1] |= mask[:, 1:]
        mask |= grown & (diff < halo)
    for comp in components(~mask, NEIGH8):
        if len(comp) < min_blob:
            for p in comp:
                mask[p] = True
    return mask


def kmeans(px, k, iters=15):
    # Start: najdalsze punkty (k-means++ bez losowania) — rzadkie, wyraźne kolory efektów
    # (niebieskie łzy, czerwony znak złości, zielone kreski) dostają własne środki.
    uniq = np.unique(px.round(), axis=0)
    centers = [px.mean(axis=0)]
    dist = ((uniq - centers[0]) ** 2).sum(axis=1)
    for _ in range(k - 1):
        c = uniq[dist.argmax()]
        centers.append(c)
        dist = np.minimum(dist, ((uniq - c) ** 2).sum(axis=1))
    centers = np.array(centers, float)
    for _ in range(iters):
        labels = ((px[:, None] - centers[None]) ** 2).sum(axis=2).argmin(axis=1)
        for i in range(k):
            sel = px[labels == i]
            if len(sel):
                centers[i] = sel.mean(axis=0)
    return centers


def save_palette(palette):
    rows = ',\n'.join('  ' + json.dumps([float(v) for v in c]) for c in palette)
    PALETTE_PATH.write_text(f'[\n{rows}\n]\n', encoding='utf-8')


def load_palette(pixels):
    """Wspólna paleta: zamrożona w PALETTE_PATH; liczona (k-means) i zapisywana, gdy jej brak albo `--palette`."""
    if PALETTE_PATH.exists() and '--palette' not in sys.argv:
        return np.array(json.loads(PALETTE_PATH.read_text(encoding='utf-8')), float)
    palette = kmeans(pixels, CFG['paletteSize'])
    save_palette(palette)
    print(f'Nowa paleta: {PALETTE_PATH}')
    return palette


def sq_dist(a, b):
    """Macierz kwadratów odległości (len(a), len(b)) bez tablicy 3-wymiarowej."""
    return (a ** 2).sum(axis=1)[:, None] - 2 * a @ b.T + (b ** 2).sum(axis=1)[None]


def extend_palette(raw, palette, k, sheets, far=20, iters=20):
    """`--extend-palette K ARKUSZ...`: dopisuje K kolorów na koniec palety (tools/palette.json) dla klatek z podanych
    arkuszy: k-means komórek tych klatek, w którym dotychczasowe kolory są nieruchome, a ruszają się tylko nowe
    (start: zachłannie kolory komórek o największym spadku sumy kwadratów błędu). Klatki arkusza używają pierwszych `paletteColours` kolorów palety
    (domyślnie `paletteSize`), więc po dopisaniu trzeba podnieść `paletteColours` w arkuszach, które mają z nowych
    kolorów korzystać — pozostałe klatki kwantyzują się dokładnie jak wcześniej."""
    cells = np.concatenate([c[~m] for _, e, c, m, _, _ in raw.values() if e['sheet'] in sheets])
    new = cells[sq_dist(cells, palette).min(axis=1) > far ** 2]
    cols = np.unique(new.round(), axis=0)
    err = sq_dist(new, palette).min(axis=1)
    centers = []
    for _ in range(k):
        gain = np.concatenate([np.maximum(0, err[None] - sq_dist(cols[i:i + 256], new)).sum(axis=1)
                               for i in range(0, len(cols), 256)])
        c = cols[gain.argmax()].astype(float)
        centers.append(c)
        err = np.minimum(err, ((new - c) ** 2).sum(axis=1))
    centers = np.array(centers)
    for _ in range(iters):
        labels = sq_dist(new, np.concatenate([palette, centers])).argmin(axis=1) - len(palette)
        for i in range(k):
            if (labels == i).any():
                centers[i] = new[labels == i].mean(axis=0)
    full = np.concatenate([palette, centers])
    before = np.sqrt(np.maximum(0, sq_dist(cells, palette).min(axis=1))).mean()
    after = np.sqrt(np.maximum(0, sq_dist(cells, full).min(axis=1))).mean()
    labels = sq_dist(cells, full).argmin(axis=1)
    print(f'Paleta {len(palette)} + {k} = {len(full)} kolorów; komórek {", ".join(sheets)}: {len(cells)}, dalekich '
          f'(> {far}): {len(new)}; średni błąd {before:.2f} -> {after:.2f}. '
          f'Ustaw "paletteColours": {len(full)} w tych arkuszach.')
    for i, c in enumerate(centers):
        print(f'  {[round(v) for v in c]} komórek {(labels == len(palette) + i).sum()}')
    save_palette(full)
    return full


def quantise(cells, palette):
    """Indeks najbliższego koloru palety dla każdej komórki."""
    return ((cells[:, :, None, :] - palette[None, None]) ** 2).sum(axis=3).argmin(axis=2)


def to_rgba(idx, mask, palette):
    rgb = palette[idx].round().astype(np.uint8)
    alpha = np.where(mask, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    return img.crop(img.getbbox())


def palette_hsv(palette):
    """(odcień w stopniach, nasycenie, jasność) każdego koloru palety."""
    hsv = [colorsys.rgb_to_hsv(*(np.clip(c, 0, 255) / 255.0)) for c in palette]
    return [(h * 360, s, v) for h, s, v in hsv]


def bag_colours(palette):
    """Indeksy palety w kolorach torby (`bagColor`): odcień w zakresie `hue` (może przechodzić przez 0°),
    nasycenie < satMax, jasność >= valMin — krem, beż i jego cienie. Skóra jest bardziej nasycona,
    włosy fioletowe, koszula i dżinsy ciemne, więc w obszarze `bag` łapie się tylko torba."""
    rule = CFG['bagColor']
    lo, hi = rule['hue']
    return [i for i, (h, s, v) in enumerate(palette_hsv(palette))
            if (lo <= h <= hi if lo <= hi else h >= lo or h <= hi) and s < rule['satMax'] and v >= rule['valMin']]


def outline_colours(palette):
    """Indeksy palety ciemne jak obrys (jasność < outlineValMax) i najciemniejszy z nich."""
    hsv = palette_hsv(palette)
    dark = [i for i, (_, _, v) in enumerate(hsv) if v < CFG['outlineValMax']]
    return dark, min(range(len(palette)), key=lambda i: hsv[i][2])


def inpaint(idx, hole, known, outline):
    """Zamalowuje `hole` warstwami od brzegu: w każdym przebiegu komórka dostaje najczęstszy kolor znanych
    bezpośrednich sąsiadów (4-sąsiedztwo — ukośnie kolor przeciekałby przez kontur, np. skóra ręki na koszulę;
    ukośni rozstrzygają tylko remis).
    Kolory obrysu głosują tylko wtedy, gdy nie ma innych, a takie komórki czekają, aż w przebiegu nie da się
    zamalować żadnej innej — pasek przez koszulę staje się koszulą, a nie czarną kreską."""
    h, w = idx.shape
    hole, known = hole.copy(), known.copy()
    while hole.any():
        fill, fill_dark = {}, {}
        for y, x in zip(*np.nonzero(hole)):
            votes, dark_votes, around = Counter(), Counter(), Counter()
            for dy, dx in NEIGH8:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and known[ny, nx]:
                    around[idx[ny, nx]] += 1
                    if not (dy and dx):
                        (dark_votes if idx[ny, nx] in outline else votes)[idx[ny, nx]] += 1
            # Remis: więcej takich komórek w 8-sąsiedztwie, potem niższy indeks palety — wynik nie zależy
            # od kolejności przeglądania.
            if votes:
                fill[y, x] = min(votes, key=lambda c: (-votes[c], -around[c], c))
            elif dark_votes:
                fill_dark[y, x] = min(dark_votes, key=lambda c: (-dark_votes[c], -around[c], c))
        fill = fill or fill_dark
        if not fill:
            break  # dziura bez żadnego znanego sąsiada — zostaje (nie powinno się zdarzyć)
        for (y, x), c in fill.items():
            idx[y, x] = c
            hole[y, x] = False
            known[y, x] = True


def copy_cells(idx, mask, xs, ys, spec, sources):
    """`copy`: każda komórka celu, której środek po cofnięciu przesunięcia leży w `rect`, dostaje najbliższą
    komórkę źródła (przed retuszem); przezroczyste komórki źródła nie są kopiowane."""
    src_idx, src_mask, src_xs, src_ys = sources[spec['from']]
    x0, y0, x1, y1 = spec['rect']
    dx, dy = spec['to'][0] - x0, spec['to'][1] - y0
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            sx, sy = x - dx, y - dy
            if x0 <= sx <= x1 and y0 <= sy <= y1:
                si, sj = np.abs(src_xs - sx).argmin(), np.abs(src_ys - sy).argmin()
                if not src_mask[sj, si]:
                    idx[j, i] = src_idx[sj, si]
                    mask[j, i] = False


def retouch(idx, mask, xs, ys, e, palette, sources):
    """Usuwa torbę wg `bag`/`wipe`/`cut`/`copy`/`fix` wpisu (patrz opis modułu). Zwraca nowe (idx, mask).

    Kolejność: wycięcie `cut` → zamalowanie `bag`/`wipe` → `copy` → ręczne `fix` → kontur na brzegu wycięcia.
    `sources`: nazwa klatki → (idx, mask, xs, ys) przed retuszem (dla `copy`)."""
    idx, mask = idx.copy(), mask.copy()
    outline, darkest = outline_colours(palette)
    cut = erase_mask(xs, ys, e['cut']) & ~mask
    hole = erase_mask(xs, ys, e['bag']) & np.isin(idx, bag_colours(palette))
    hole = (hole | erase_mask(xs, ys, e['wipe'])) & ~mask & ~cut
    mask |= cut
    inpaint(idx, hole, ~mask & ~hole, set(outline))
    for spec in e['copy']:
        copy_cells(idx, mask, xs, ys, spec, sources)
    for *rect, color in e['fix']:
        cells = erase_mask(xs, ys, [rect])
        if color is None:
            mask[cells] = True
        else:
            idx[cells] = quantise(np.array([[color]], float), palette)[0, 0]
            mask[cells] = False
    # Kontur w miejscu wyciętej torby: wycięte (i nie zamalowane ręcznie) komórki stykające się z postacią,
    # o ile sąsiad nie jest już konturem — sylwetka dostaje ciągły obrys o grubości 1 komórki.
    h, w = mask.shape
    for y, x in zip(*np.nonzero(cut & mask)):
        if any(0 <= y + dy < h and 0 <= x + dx < w and not mask[y + dy, x + dx]
               and idx[y + dy, x + dx] not in outline for dy, dx in NEIGH4):
            idx[y, x] = darkest
            mask[y, x] = False
    barrier = {i for i, (_, _, v) in enumerate(palette_hsv(palette)) if v < (e['shadowBarrier'] or SHADOW_BARRIER_VAL)}
    region = erase_mask(xs, ys, e['shadow'])
    remove_shadow(idx, mask, region, barrier)
    if e['shadowHsv']:
        # cień w kolorze odróżnialnym od mebla (np. szaroniebieski): znika w całym obszarze `shadow`, także między
        # nogami mebla, dokąd zalewanie od tła nie dochodzi
        h0, h1, smax, v0, v1 = e['shadowHsv']
        grey = [i for i, (hh, ss, vv) in enumerate(palette_hsv(palette)) if h0 <= hh <= h1 and ss <= smax and v0 <= vv <= v1]
        mask |= region & np.isin(idx, grey)
    return idx, mask


def remove_shadow(idx, mask, region, barrier):
    """`shadow`: cień na podłodze z arkusza (pokój rysuje własny). W obszarze komórki osiągalne (4-sąsiedztwo)
    z przezroczystych bez przechodzenia przez ciemne kolory (jasność < SHADOW_BARRIER_VAL: kontur i jego
    odcienie po JPEG-u) stają się przezroczyste — buty i nogi otoczone konturem zostają, szara plama znika."""
    h, w = mask.shape
    queue = deque(zip(*np.nonzero(region & mask)))
    while queue:
        y, x = queue.popleft()
        for dy, dx in NEIGH4:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and region[ny, nx] and not mask[ny, nx] and idx[ny, nx] not in barrier:
                mask[ny, nx] = True
                queue.append((ny, nx))


def largest_shape(img):
    """Największy 8-spójny nieprzezroczysty kształt: (x0, y0, x1, y1) włącznie, maska."""
    alpha = np.asarray(img)[:, :, 3] > 0
    best = max(components(alpha, NEIGH8), key=len)
    shape = np.zeros_like(alpha)
    for p in best:
        shape[p] = True
    ys, xs = np.nonzero(shape)
    return (xs.min(), ys.min(), xs.max(), ys.max()), shape


def anchor_x(shape, top):
    """Środek czubka głowy (pierwsze wiersze największego kształtu) — stabilny punkt między klatkami."""
    xs = np.nonzero(shape[top:top + CFG['anchorRows']])[1]
    return float(xs.mean()) if len(xs) else shape.shape[1] / 2


def compose(items, foot_line=False, checker=False):
    """Klatki obok siebie na wspólnej linii (dół obrazka albo `foot`)."""
    gap = 10
    width = sum(im.width + gap for im, _ in items) + gap
    above = max(foot for _, foot in items)
    below = max(im.height - foot for im, foot in items)
    out = Image.new('RGBA', (width, above + below + 2 * gap), (255, 255, 255, 255))
    if checker:
        cell = 8
        arr = np.asarray(out).copy()
        yy, xx = np.mgrid[0:out.height, 0:out.width]
        dark = ((yy // cell + xx // cell) % 2).astype(bool)
        arr[dark, :3] = 200
        arr[~dark, :3] = 235
        out = Image.fromarray(arr, 'RGBA')
    x = gap
    for im, foot in items:
        out.alpha_composite(im, (x, gap + above - foot))
        if foot_line:
            for xx in range(x, x + im.width):
                if not im.getpixel((xx - x, min(foot, im.height - 1)))[3]:
                    out.putpixel((xx, gap + above), (255, 0, 0, 255))
        x += im.width + gap
    return out


def save_preview(items):
    """Podgląd: każda klatka powiększona NN o round(3 × skala), wyrównana do wspólnej linii stóp."""
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    scaled = []
    for im, scale in items:
        f = max(1, int(round(3 * scale)))
        big = im.resize((im.width * f, im.height * f), Image.NEAREST)
        scaled.append((big, big.height))
    compose(scaled).save(PREVIEW)


def save_preview_new(items):
    """Nowe klatki ×3·skala (min. 1) na wspólnej linii stóp (`foot`, czerwona kreska)."""
    scaled = []
    for im, scale, foot in items:
        f = max(1, int(round(3 * scale)))
        scaled.append((im.resize((im.width * f, im.height * f), Image.NEAREST), foot * f))
    # Dwa rzędy, żeby obraz nie był bardzo szeroki.
    half = (len(scaled) + 1) // 2
    rows = [compose(scaled[:half], foot_line=True), compose(scaled[half:], foot_line=True)]
    out = Image.new('RGBA', (max(r.width for r in rows), sum(r.height for r in rows)), (255, 255, 255, 255))
    out.alpha_composite(rows[0], (0, 0))
    out.alpha_composite(rows[1], (0, rows[0].height))
    out.save(PREVIEW_NEW)


def save_drag_x4(images):
    items = [(im.resize((im.width * 4, im.height * 4), Image.NEAREST), im.height * 4) for im in images]
    compose(items, checker=True).save(DRAG_X4)


def onion_foot(frames):
    return max(b['foot'] for b in frames)


def onion(frames, f):
    """Przenikanie klatek serii ustawionych tak, jak rysuje je pokój (kotwica x i linia stóp) — skaczące
    elementy widać jako duchy. Kreska pionowa: kotwica."""
    left = max(int(round(b['anchorX'])) for b in frames)
    right = max(b['im'].width - int(round(b['anchorX'])) for b in frames)
    top = onion_foot(frames)
    below = max(b['im'].height - b['foot'] for b in frames)
    layers = []
    for b in frames:
        c = Image.new('RGBA', (left + right, top + below), (235, 235, 240, 255))
        c.alpha_composite(b['im'], (left - int(round(b['anchorX'])), top - b['foot']))
        layers.append(np.asarray(c).astype(float))
    out = Image.fromarray(np.mean(layers, axis=0).astype(np.uint8))
    out = out.resize((out.width * f, out.height * f), Image.NEAREST)
    ImageDraw.Draw(out).line([(left * f, 0), (left * f, out.height)], fill=(0, 200, 255, 255))
    return out


def save_sheet_previews(body, f=4):
    """Arkusze z `"preview": nazwa` → tools/out/<nazwa>.png: klatki ×f na szachownicy, rząd na serię
    (group_of), w rzędzie wspólna linia stóp (czerwone kreski pod przezroczystymi pikselami); na końcu rzędu
    serii bez kotwicy `center` — przenikanie wszystkich jej klatek (`onion`)."""
    files = {}
    for name in CFG['body']:
        sh = CFG.get('sheets', {}).get(body[name]['e']['sheet'], {})
        if 'preview' in sh:
            files.setdefault(sh['preview'], {}).setdefault(group_of(name), []).append(body[name])
    for fname, series in files.items():
        rows = []
        for frames in series.values():
            items = [(b['im'].resize((b['im'].width * f, b['im'].height * f), Image.NEAREST), b['foot'] * f)
                     for b in frames]
            # Przenikanie: klatki wyrównywane `alignBottom` i ich wzorce (albo cała seria, gdy brak wyrównania).
            refs = {b['e']['alignBottom'][0] for b in frames if b['e']['alignBottom']}
            skin = [b for b in frames if b['e']['alignBottom'] or b['name'] in refs] or frames
            if all(b['e']['anchor'] != 'center' for b in skin) and len(skin) > 1:
                items.append((onion(skin, f), onion_foot(skin) * f))
            rows.append(compose(items, foot_line=True, checker=True))
        out = Image.new('RGBA', (max(r.width for r in rows), sum(r.height for r in rows)), (255, 255, 255, 255))
        y = 0
        for r in rows:
            out.alpha_composite(r, (0, y))
            y += r.height
        out.save(PREVIEW.parent / f'{fname}.png')


def save_bag_preview(pairs, f=6, max_width=1600):
    """Retusz ×f: para przed | po dla każdej klatki na szachownicy, pary zawijane w rzędy (wspólny dół w rzędzie)."""
    tiles = []
    for _, before, after in pairs:
        items = [(im.resize((im.width * f, im.height * f), Image.NEAREST), im.height * f) for im in (before, after)]
        tiles.append(compose(items, checker=True))
    rows, row = [], []
    for t in tiles:
        if row and sum(r.width for r in row) + t.width > max_width:
            rows.append(row)
            row = []
        row.append(t)
    if row:
        rows.append(row)
    gap = 12
    width = max((sum(t.width + gap for t in r) for r in rows), default=1)
    height = sum(max(t.height for t in r) + gap for r in rows) or 1
    out = Image.new('RGBA', (width, height), (60, 60, 70, 255))
    y = 0
    for r in rows:
        x = 0
        for t in r:
            out.alpha_composite(t, (x, y + max(u.height for u in r) - t.height))
            x += t.width + gap
        y += max(t.height for t in r) + gap
    BAG_PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    out.save(BAG_PREVIEW)


def bed_classes(im):
    """Mapa klas pikseli łóżka: 1 = drewno (brązy ramy, wezgłowia, szafki), 2 = beż materaca/kołdry, 0 = reszta.

    Progi z palety: ciepły odcień (≤40° albo ≥330°); beż — mało nasycony i jasny; drewno — nasycone i ciemne
    (skóra ma ten sam odcień, ale jest dużo jaśniejsza; włosy, koszula i kot są fioletowe/szare/czarne).
    """
    arr = np.asarray(im)
    out = np.zeros(arr.shape[:2], int)
    opaque = arr[:, :, 3] > 0
    for color in np.unique(arr[opaque][:, :3], axis=0):
        hue, sat, val = colorsys.rgb_to_hsv(*(color / 255.0))
        warm = hue * 360 <= 40 or hue * 360 >= 330
        cls = 2 if warm and sat < 0.22 and val >= 0.6 else 1 if warm and sat >= 0.35 and 0.25 <= val <= 0.65 else 0
        if cls:
            out[opaque & (arr[:, :, :3] == color).all(axis=2)] = cls
    return out


def best_shift(cls, ref_cls):
    """Całkowite (dx, dy) w ±ALIGN_SEARCH: piksel klatki (u,v) → wzorzec (u+dx, v+dy) z największą liczbą
    pikseli łóżka tej samej klasy; przy remisie mniejsze przesunięcie."""
    ys, xs = np.nonzero(cls)
    vals = cls[ys, xs]
    h, w = ref_cls.shape
    best = None
    for dy in range(-ALIGN_SEARCH, ALIGN_SEARCH + 1):
        for dx in range(-ALIGN_SEARCH, ALIGN_SEARCH + 1):
            ry, rx = ys + dy, xs + dx
            ok = (ry >= 0) & (ry < h) & (rx >= 0) & (rx < w)
            score = int((ref_cls[ry[ok], rx[ok]] == vals[ok]).sum())
            key = (score, -(abs(dx) + abs(dy)))
            if best is None or key > best[0]:
                best = (key, dx, dy)
    return best[1], best[2], best[0][0]


def align_sheet(body, sname, ref_name):
    """Wyrównuje łóżka klatek arkusza do wzorca: anchorX = wzorzec.anchorX − dx, foot = wzorzec.foot − dy."""
    ref = body[ref_name]
    ref_cls = bed_classes(ref['im'])
    names = [n for n in CFG['body'] if body[n]['e']['sheet'] == sname]
    for name in names:
        b = body[name]
        dx, dy, score = best_shift(bed_classes(b['im']), ref_cls)
        b['shift'] = (dx, dy)
        b['anchorX'] = ref['anchorX'] - dx
        b['foot'] = ref['foot'] - dy
        print(f'wyrównanie {name:8s} -> {ref_name}: dx={dx:+d} dy={dy:+d} zgodnych px łóżka={score}')
    save_bed_aligned([(n, body[n]) for n in names], ref)


def align_bottom(body, name, ref_name, rows):
    """`"alignBottom": [wzorzec, wiersze]` — poziome wyrównanie klatki pętli do wzorca po dolnym pasie sylwetki
    (`wiersze` wierszy nad linią stóp: buty, nogi stołka). Przesunięcie dx (całkowite px natywne, ±ALIGN_SEARCH)
    maksymalizuje liczbę nieprzezroczystych pikseli pasa pokrywających się z pasem wzorca, gdy obie klatki stoją
    na tej samej linii stóp; przy remisie mniejsze |dx|. anchorX = wzorzec.anchorX − dx (stopy bez zmian)."""
    def band(b):
        a = np.asarray(b['im'])[:, :, 3] > 0
        return a[max(0, b['foot'] - rows):b['foot']]
    b, ref = body[name], body[ref_name]
    cur, rb = band(b), band(ref)
    h = min(len(cur), len(rb))
    cur, rb = cur[len(cur) - h:], rb[len(rb) - h:]
    ys, xs = np.nonzero(cur)
    best = None
    for dx in range(-ALIGN_SEARCH, ALIGN_SEARCH + 1):
        rx = xs + dx
        ok = (rx >= 0) & (rx < rb.shape[1])
        key = (int(rb[ys[ok], rx[ok]].sum()), -abs(dx))
        if best is None or key > best[0]:
            best = (key, dx)
    (score, _), dx = best
    old = b['anchorX']
    b['anchorX'] = ref['anchorX'] - dx
    print(f'wyrównanie {name:10s} -> {ref_name} po {rows} dolnych wierszach: dx={dx:+d} '
          f'(kotwica {old:.2f} -> {b["anchorX"]:.2f}), zgodnych px={score}/{len(xs)}')


def save_bed_aligned(items, ref, f=4, pad=4):
    """Podgląd wyrównania ×f: rząd 1 — każda klatka z obrysem wzorca (czerwony), rząd 2 — same klatki
    ze stałymi liniami pomocniczymi (stopy, kotwica, lewy i górny brzeg wzorca), rząd 3 — przenikanie wszystkich."""
    ra = np.asarray(ref['im'])
    outline = (ra[:, :, 3] > 0) & (ra[:, :, :3].astype(int).sum(axis=2) < 60)
    x0 = min(0, *(b['shift'][0] for _, b in items))
    y0 = min(0, *(b['shift'][1] for _, b in items))
    x1 = max(ref['im'].width, *(b['shift'][0] + b['im'].width for _, b in items))
    y1 = max(ref['im'].height, *(b['shift'][1] + b['im'].height for _, b in items))
    cw, ch = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    ox, oy = pad - x0, pad - y0  # położenie (0,0) wzorca na płótnie

    def placed(b):
        c = Image.new('RGBA', (cw, ch), (70, 110, 80, 255))
        c.alpha_composite(b['im'], (ox + b['shift'][0], oy + b['shift'][1]))
        return c

    def big(c):
        return c.resize((c.width * f, c.height * f), Image.NEAREST)

    ref_cols = np.nonzero(ra[:, :, 3].any(axis=0))[0]
    ref_rows = np.nonzero(ra[:, :, 3].any(axis=1))[0]
    row1, row2 = [], []
    for _, b in items:
        a = np.asarray(placed(b)).copy()
        ys, xs = np.nonzero(outline)
        a[ys + oy, xs + ox] = (255, 40, 40, 255)
        row1.append(big(Image.fromarray(a)))
        g = big(placed(b))
        d = ImageDraw.Draw(g)
        for x in (ox + ref_cols[0], ox + int(round(ref['anchorX'])), ox + ref_cols[-1] + 1):
            d.line([(x * f, 0), (x * f, g.height)], fill=(0, 230, 255, 255))
        for y in (oy + ref_rows[0], oy + ref['foot']):
            d.line([(0, y * f), (g.width, y * f)], fill=(0, 230, 255, 255))
        row2.append(g)
    blend = np.mean([np.asarray(placed(b)).astype(float) for _, b in items], axis=0).astype(np.uint8)
    row3 = [big(Image.fromarray(blend))]
    gap = 8
    rows = [row1, row2, row3]
    width = max(sum(t.width + gap for t in r) for r in rows) + gap
    height = sum(r[0].height + gap for r in rows) + gap
    out = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    y = gap
    for r in rows:
        x = gap
        for t in r:
            out.alpha_composite(t, (x, y))
            x += t.width + gap
        y += r[0].height + gap
    BED_ALIGNED.parent.mkdir(parents=True, exist_ok=True)
    out.save(BED_ALIGNED)


def mirror_half(cells, mask, centres, c, along_x):
    """`mirror`: komórki, których środek leży za `c` (px arkusza), dostają komórkę odbitą względem `c`."""
    for i, v in enumerate(centres):
        if v > c:
            j = int(np.abs(centres - (2 * c - v)).argmin())
            if along_x:
                cells[:, i], mask[:, i] = cells[:, j], mask[:, j]
            else:
                cells[i], mask[i] = cells[j], mask[j]


def gabi_height(raw_entry, cols):
    """`scaleRef` w przedmiocie: liczba wierszy od pierwszego do ostatniego z nieprzezroczystą komórką, której
    środek leży w kolumnach [x0, x1] (px arkusza) — wysokość stojącej Gabi obok przedmiotu."""
    _, _, _, mask, xs, _ = raw_entry
    sel = (xs >= cols[0]) & (xs <= cols[1])
    rows = np.nonzero((~mask[:, sel]).any(axis=1))[0]
    return int(rows[-1] - rows[0] + 1)


def colour_codes(im):
    """Kolor każdego piksela jako liczba (0 = przezroczysty)."""
    a = np.asarray(im).astype(np.int64)
    return np.where(a[:, :, 3] > 0, (a[:, :, 0] << 16 | a[:, :, 1] << 8 | a[:, :, 2]) + 1, 0)


def item_shift(im, xy, rect, base):
    """Całkowite (dx, dy): piksel klatki (u, v) → przedmiot bazowy (u+dx, v+dy) z największą liczbą pikseli tego
    samego koloru; liczą się tylko piksele klatki ze środkiem w `rect` (px arkusza; None — wszystkie).
    Przy remisie mniejsze przesunięcie. Zwraca też liczbę zgodnych pikseli i liczbę pikseli porównywanych."""
    cur, ref = colour_codes(im), colour_codes(base)
    sel = cur > 0
    if rect:
        xs, ys = xy
        sel &= ((ys >= rect[1]) & (ys <= rect[3]))[:, None] & ((xs >= rect[0]) & (xs <= rect[2]))[None, :]
    vs, us = np.nonzero(sel)
    vals = cur[vs, us]
    h, w = ref.shape
    best = None
    for dy in range(-ITEM_ALIGN_SEARCH, ITEM_ALIGN_SEARCH + 1):
        for dx in range(-ITEM_ALIGN_SEARCH, ITEM_ALIGN_SEARCH + 1):
            ry, rx = vs + dy, us + dx
            ok = (ry >= 0) & (ry < h) & (rx >= 0) & (rx < w)
            score = int((ref[ry[ok], rx[ok]] == vals[ok]).sum())
            key = (score, -(abs(dx) + abs(dy)))
            if best is None or key > best[0]:
                best = (key, dx, dy)
    return best[1], best[2], best[0][0], len(vals)


def save_items(images, coords, sheet_scale, gabi_scale, body, frames):
    """Przedmioty: PNG, metadane dla gry, manifest katalogu i podgląd ×3 z podpisami (patrz opis modułu).

    Wpis z `"alignTo": klatka` (puste łóżko Gabi) dostaje `anchorX`/`foot` w układzie tej klatki — łóżko
    przedmiotu pokrywa się z łóżkiem klatki narysowanej w tym samym punkcie (dopasowanie jak `align_sheet`).
    Wpis z `"frameOf": przedmiot` — klatka stanu wyrównana do przedmiotu (`item_shift`, patrz opis modułu)."""
    ITEMS_DIR.mkdir(parents=True, exist_ok=True)
    meta, manifest, tiles = {}, [], []
    for name, spec in CFG.get('items', {}).items():
        _, e, im = images[name]
        sh = CFG.get('sheets', {}).get(e['sheet'], {})
        scale = spec.get('scale', sh.get('scale', sheet_scale.get(e['sheet'], 1.0)))
        im.save(ITEMS_DIR / f'{name}.png')
        meta[name] = {'w': im.width, 'h': im.height, **({'scale': round(scale, 4)} if scale != 1 else {})}
        if 'alignTo' in spec:
            ref = body[spec['alignTo']]
            dx, dy, score = best_shift(bed_classes(im), bed_classes(ref['im']))
            meta[name].update(anchorX=round(ref['anchorX'] - dx, 2), foot=ref['foot'] - dy)
            print(f'wyrównanie {name} -> {spec["alignTo"]}: dx={dx:+d} dy={dy:+d} zgodnych px łóżka={score}')
        if 'frameOf' in spec:
            base_name = spec['frameOf']
            base = images[base_name][2]
            state = spec.get('state', name.removeprefix(base_name + '_'))
            if 'anchorAt' in spec:
                # punkt (px arkusza), który ma się pokryć z kotwicą przedmiotu — gdy kolory nie pasują 1:1 (rozmyty arkusz)
                xs, ys = (np.asarray(v, dtype=float) for v in coords[name])
                ax, ay = spec['anchorAt']
                meta[name].update(anchorX=round((ax - xs[0]) / (xs[1] - xs[0]) + 0.5, 2),
                                  foot=int(round((ay - ys[0]) / (ys[1] - ys[0]) + 0.5)))
                print(f'kotwica {name} -> {base_name}: {meta[name]["anchorX"]}, {meta[name]["foot"]}')
            elif spec.get('overlay', True):
                dx, dy, score, n = item_shift(im, coords[name], spec.get('alignRect'), base)
                meta[name].update(anchorX=base.width / 2 - dx, foot=base.height - dy)
                print(f'wyrównanie {name} -> {base_name}: dx={dx:+d} dy={dy:+d} zgodnych px={score}/{n}')
            else:
                (_, sy0, _, sy1), shape = largest_shape(im)
                meta[name].update(anchorX=round(anchor_x(shape, sy0), 2), foot=int(sy1) + 1)
            meta[name].update(frameOf=base_name, state=state, overlay=spec.get('overlay', True))
        if 'name' in spec:
            catalog = {k: spec[k] for k in ITEM_FIELDS}
            meta[name].update(catalog)
            manifest.append({'id': name, **catalog})
        tiles.append((name, im, scale))
        print(f'{name:22s} {im.width:3d}x{im.height:3d} skala={scale:.3f} -> {im.width * scale:.0f}x{im.height * scale:.0f} px log.')
    for old in ITEMS_DIR.glob('*.png'):
        if old.stem not in meta:
            old.unlink()
    ITEMS_META.parent.mkdir(parents=True, exist_ok=True)
    ITEMS_META.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    ITEMS_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    ITEMS_MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    save_items_preview(tiles, images['idle_front'][2], gabi_scale)
    save_item_sheet_previews(images, meta, frames, body)


def save_item_sheet_previews(images, meta, frames, body, f=3):
    """Arkusze z `"itemPreview": nazwa` → tools/out/<nazwa>.png (patrz opis modułu). Rząd 1: `idle_front`, pozy
    postaci z arkusza i przedmioty ×f·skala na wspólnej linii stóp. Kolejne rzędy — po jednym na przedmiot ze
    stanami: każda klatka złożona w natywnych px w kotwicy przedmiotu (czerwony obrys przedmiotu na stanie,
    niebieskie kreski: kotwica x i linia dolna), na końcu przenikanie wszystkich klatek serii; całe płótno
    powiększane razem, więc wyrównanie widać bez błędów zaokrąglenia. Klatki `overlay: false` — osobno, ze stopami."""
    for sname, sh in CFG.get('sheets', {}).items():
        if 'itemPreview' not in sh:
            continue
        names = [n for n, (_, e, _) in images.items() if e['sheet'] == sname and n in meta]
        poses = [n for n in CFG['body'] if body[n]['e']['sheet'] == sname]

        def big(im, s):
            return im.resize((max(1, round(im.width * f * s)), max(1, round(im.height * f * s))), Image.NEAREST)

        def scale_of(n):
            return meta[n].get('scale', 1)

        # Rząd 1: wzorzec wielkości, pozy i przedmioty (bez stanów).
        row1 = [(big(images['idle_front'][2], frames['idle_front']['scale']), 'idle_front')]
        row1 += [(big(images[n][2], frames[n]['scale']), n) for n in poses]
        row1 += [(big(images[n][2], scale_of(n)), n) for n in names if 'frameOf' not in meta[n]]
        rows = [row1]
        # Serie: przedmiot + jego stany wyrównane.
        for base in names:
            states = [n for n in names if meta[n].get('frameOf') == base and meta[n]['overlay']]
            if not states:
                continue
            bm = meta[base]
            seq = [(base, images[base][2], bm['w'] / 2, bm['h'])]
            seq += [(n, images[n][2], meta[n]['anchorX'], meta[n]['foot']) for n in states]
            left = max(int(np.floor(ax)) for _, _, ax, _ in seq) + 2
            right = max(im.width - int(np.floor(ax)) for _, im, ax, _ in seq) + 2
            top = max(ft for _, _, _, ft in seq) + 2
            below = max(im.height - ft for _, im, _, ft in seq) + 2
            outline = np.asarray(images[base][2])[:, :, 3] > 0
            edge = outline & ~(np.pad(outline, 1)[2:, 1:-1] & np.pad(outline, 1)[:-2, 1:-1]
                               & np.pad(outline, 1)[1:-1, 2:] & np.pad(outline, 1)[1:-1, :-2])
            bx, by = left - int(np.floor(bm['w'] / 2)), top - bm['h']
            s = f * bm.get('scale', 1)
            row, layers = [], []
            for i, (n, im, ax, ft) in enumerate(seq):
                c = Image.new('RGBA', (left + right, top + below), (232, 232, 238, 255))
                c.alpha_composite(im, (left - int(np.floor(ax)), top - ft))
                layers.append(np.asarray(c).astype(float))
                a = np.asarray(c).copy()
                if i:
                    ys, xs = np.nonzero(edge)
                    a[ys + by, xs + bx] = (255, 40, 40, 255)
                t = big(Image.fromarray(a), bm.get('scale', 1))
                d = ImageDraw.Draw(t)
                d.line([(left * s, 0), (left * s, t.height)], fill=(0, 160, 255, 255))
                d.line([(0, top * s), (t.width, top * s)], fill=(0, 160, 255, 255))
                row.append((t, n))
            blend = Image.fromarray(np.mean(layers, axis=0).astype(np.uint8))
            row.append((big(blend, bm.get('scale', 1)), f'{base}: przenikanie'))
            rows.append(row)
        # Klatki bez nakładania (inny rysunek niż przedmiot) — same, w skali gry.
        loose = [(big(images[n][2], scale_of(n)), f'{n} (bez nakladania)')
                 for n in names if 'frameOf' in meta[n] and not meta[n]['overlay']]
        if loose:
            rows.append(loose)
        gap, label_h = 12, 14
        tiles = []
        for r in rows:
            h = max(t.height for t, _ in r)
            w = sum(max(t.width, len(n) * 6) + gap for t, n in r) + gap
            out = Image.new('RGBA', (w, h + label_h + 2 * gap), (255, 255, 255, 255))
            d = ImageDraw.Draw(out)
            x = gap
            for t, n in r:
                out.alpha_composite(t, (x, gap + h - t.height))
                d.text((x, gap + h + 2), n, fill=(0, 0, 0, 255))
                x += max(t.width, len(n) * 6) + gap
            tiles.append(out)
        sheet_img = Image.new('RGBA', (max(t.width for t in tiles), sum(t.height for t in tiles)), (255, 255, 255, 255))
        y = 0
        for t in tiles:
            sheet_img.alpha_composite(t, (0, y))
            y += t.height
        sheet_img.save(PREVIEW.parent / f'{sh["itemPreview"]}.png')


def save_items_preview(tiles, gabi, gabi_scale, f=3, max_width=1800):
    """Przedmioty ×f·skala (NN, gdy f·skala całkowite; inaczej najbliższy rozmiar) na szachownicy, wspólna linia
    dolna w rzędzie, podpis pod spodem; na początku każdego rzędu `idle_front` w skali gry jako wzorzec wielkości."""
    def big(im, s):
        return im.resize((max(1, round(im.width * f * s)), max(1, round(im.height * f * s))), Image.NEAREST)
    ref = big(gabi, gabi_scale)
    cells = [(n, big(im, s)) for n, im, s in tiles]
    gap, label_h = 12, 14
    rows, row, width = [], [], ref.width + gap
    for n, t in cells:
        w = max(t.width, len(n) * 6) + gap
        if row and width + w > max_width:
            rows.append(row)
            row, width = [], ref.width + gap
        row.append((n, t, w))
        width += w
    rows.append(row)
    heights = [max([ref.height] + [t.height for _, t, _ in r]) + label_h + gap for r in rows]
    out = Image.new('RGBA', (max_width + gap, sum(heights) + gap), (255, 255, 255, 255))
    arr = np.asarray(out).copy()
    yy, xx = np.mgrid[0:out.height, 0:out.width]
    dark = ((yy // 6 + xx // 6) % 2).astype(bool)
    arr[dark, :3] = 222
    arr[~dark, :3] = 240
    out = Image.fromarray(arr, 'RGBA')
    d = ImageDraw.Draw(out)
    y = gap
    for r, h in zip(rows, heights):
        base = y + h - label_h - gap
        out.alpha_composite(ref, (gap, base - ref.height))
        x = gap + ref.width + gap
        for n, t, w in r:
            out.alpha_composite(t, (x, base - t.height))
            d.text((x, base + 2), n, fill=(0, 0, 0, 255))
            x += w
        d.line([(0, base), (out.width, base)], fill=(255, 120, 120, 255))
        y += h
    out.save(ITEMS_PREVIEW)


def shift(m, dy, dx):
    """Maska przesunięta tak, że out[y, x] = m[y + dy, x + dx] (spoza obrazka: False)."""
    h, w = m.shape
    out = np.zeros_like(m)
    out[max(0, -dy):min(h, h - dy), max(0, -dx):min(w, w - dx)] = \
        m[max(0, dy):min(h, h + dy), max(0, dx):min(w, w + dx)]
    return out


def box_sum(m, r):
    """Liczba prawdziwych pikseli maski w kwadracie (2r+1)×(2r+1) wokół każdego piksela."""
    m = m.astype(int)
    return sum(shift(m, dy, dx) for dy in range(-r, r + 1) for dx in range(-r, r + 1))


def dilate(m, r):
    return box_sum(m, r) > 0


def ring4(m):
    """Piksele spoza maski, które są jej 4-sąsiadami."""
    return (sum(shift(m, dy, dx) for dy, dx in NEIGH4) > 0) & ~m


def parts_of(m, neigh=NEIGH8, min_size=1):
    """Spójne składowe maski jako osobne maski (co najmniej `min_size` pikseli)."""
    out = []
    for comp in components(m, neigh):
        if len(comp) >= min_size:
            p = np.zeros_like(m)
            ys, xs = zip(*comp)
            p[list(ys), list(xs)] = True
            out.append(p)
    return out


def grow(seed, parts, r):
    """Dołącza do `seed` kolejne części leżące w odległości <= r (Czebyszewa) od już dołączonych."""
    seed, parts = seed.copy(), list(parts)
    changed = True
    while changed and parts:
        near, changed, rest = dilate(seed, r), False, []
        for p in parts:
            if (p & near).any():
                seed |= p
                changed = True
            else:
                rest.append(p)
        parts = rest
    return seed


def enclosed(cand, region, op, skip=None, frac=0.6):
    """Składowe `cand` (4-spójne) otoczone przez `region`: żaden 4-sąsiad nie jest przezroczysty, a >= frac
    4-sąsiadów (bez pikseli `skip`, np. konturu) należy do `region` — nadruk w koszulce, mankiety w dżinsach."""
    out = np.zeros_like(op)
    if region.any():
        for p in parts_of(cand, NEIGH4):
            ring = ring4(p)
            counted = ring & ~skip if skip is not None else ring
            if counted.any() and (counted & region).sum() >= frac * counted.sum() and not (ring & ~op).any():
                out |= p
    return out


# Klasy kolorów nadpisane dla arkusza bieżącej klatki (`wardrobe.sheetClasses`) — ustawiane w save_wardrobe.
_SHEET_CLASSES = {}


def wardrobe_classes(arr):
    """Klasy kolorów pikseli wg reguł HSV z `wardrobe.classes` (odcień w stopniach, może przechodzić przez 0°)."""
    rules = {**CFG['wardrobe']['classes'], **_SHEET_CLASSES}
    op = arr[:, :, 3] > 0
    out = {k: np.zeros(op.shape, bool) for k in rules}

    def inside(v, rng):
        lo, hi = rng
        return lo <= v <= hi if lo <= hi else v >= lo or v <= hi

    for c in np.unique(arr[op][:, :3], axis=0):
        h, s, v = colorsys.rgb_to_hsv(*(c / 255.0))
        sel = op & (arr[:, :, :3] == c).all(axis=2)
        for k, r in rules.items():
            if inside(h * 360, r['hue']) and inside(s, r['sat']) and inside(v, r['val']):
                out[k] |= sel
    return out


def head_point(cls, op):
    """Czubek głowy: włosy = największa (z dużych — najwyżej położona) 8-spójna składowa lawendowych pikseli
    głównego kształtu (efekty obok postaci i smuga w drag_4 odpadają). `y` — najwyższy wiersz włosów, podniesiony
    o kontur nad nimi (<= 2 px); `x` — środek włosów w 3 górnych wierszach; `w` — szerokość włosów w górnej połowie
    ich wysokości + kontur. Bez włosów (turban): czubek sylwetki, szerokość w wierszu 20% wysokości niżej."""
    body = max(parts_of(op), key=lambda p: p.sum())
    comps = parts_of(cls['hair'] & body)
    if comps:
        big = max(p.sum() for p in comps)
        hair = min((p for p in comps if p.sum() >= 0.3 * big), key=lambda p: np.nonzero(p)[0].min())
        ys, xs = np.nonzero(hair)
        y0, y1 = ys.min(), ys.max()
        top = y0
        for x in np.unique(xs):
            t = ys[xs == x].min()
            for _ in range(2):
                if t > 0 and op[t - 1, x]:
                    t -= 1
            top = min(top, t)
        cx = float(np.nonzero(hair[y0:y0 + 3])[1].mean())
        cols = np.nonzero(hair[y0:y0 + max(3, (y1 - y0 + 1) // 2)].any(axis=0))[0]
        return {'x': round(cx, 1), 'y': int(top), 'w': int(cols.max() - cols.min() + 3)}
    ys, xs = np.nonzero(body)
    top = ys.min()
    cx = float(np.nonzero(body[top:top + 3])[1].mean())
    row = np.nonzero(body[min(ys.max(), top + int(0.2 * (ys.max() - top + 1)))])[0]
    return {'x': round(cx, 1), 'y': int(top), 'w': int(row.max() - row.min() + 1)}


def head_top(cls, op, shirt, ignore=(), silhouette=False):
    """Czubek głowy, gdy znana jest koszulka: włosy = wszystkie lawendowe (i białe refleksy) piksele głównego
    kształtu nad górną krawędzią koszulki, w składowych >= 4 px — włosy rozcięte dziurami po tle liczą się
    w całości, a smuga w drag_4 i ręce leżą niżej. `y` — najwyższy wiersz włosów podniesiony o kontur (<= 2 px),
    `x` — środek rozpiętości włosów w 3 górnych wierszach (jak `anchorX`: indeks kolumny), `w` — największa
    rozpiętość w górnej połowie włosów + 2 px konturu. `ignore` — prostokąty [x0, y0, x1, y1] (px natywne,
    włącznie) pomijane: efekt dotykający głowy (znak złości). Bez włosów (turban) albo z `silhouette` (włosy
    przebarwione, np. złość) — sylwetka nad koszulką: najwyższy wiersz, środek 3 górnych wierszy, największa
    szerokość w górnej połowie."""
    body = max(parts_of(op), key=lambda p: p.sum())
    body[np.nonzero(shirt)[0].min():] = False
    for x0, y0, x1, y1 in ignore:
        body[y0:y1 + 1, x0:x1 + 1] = False
    hair = (cls['hair'] | cls['light2']) & body
    parts = parts_of(hair, min_size=4)
    if sum(p.sum() for p in parts) >= 30 and not silhouette:
        hair = np.any(parts, axis=0)
        pad = 2
    else:
        hair, pad = body, 0
    ys, xs = np.nonzero(hair)
    y0, y1 = ys.min(), ys.max()
    top = y0
    for x in np.unique(xs):
        t = ys[xs == x].min()
        for _ in range(2):
            if t > 0 and op[t - 1, x]:
                t -= 1
        top = min(top, t)
    cap = np.nonzero(hair[y0:y0 + 3].any(axis=0))[0]
    spans = [np.nonzero(r)[0] for r in hair[y0:y0 + max(3, (y1 - y0 + 1) // 2)] if r.any()]
    return {'x': round((cap.min() + cap.max()) / 2, 1), 'y': int(top),
            'w': int(max(s.max() - s.min() + 1 for s in spans)) + pad}


def wardrobe_masks(im, top_only=False, head_ignore=(), head_silhouette=False):
    """Maski ubrania klatki: (koszulka, nadruk, dżinsy, buty) — patrz opis modułu (sekcja `wardrobe`).

    1. Klasy kolorów (HSV). Ubranie = piksele klas shirt/shade/mid/jeans, które nie leżą na brzegu sylwetki
       (brzeg = sąsiad przezroczysty: tam jest kontur). Kontur (najciemniejsze) nie należy do żadnej maski.
    2. Głosowanie w oknie 5×5: czerń koszulki (shirt) kontra niebieskie odcienie dżinsów (jeans, mid) —
       dżinsy mają domieszki czerni koszulki, koszulka cienie; remisy (same cienie) dostają etykietę sąsiadów.
    3. Buty: podeszwa = jasny piksel z konturem/przezroczystością na zewnątrz (w dół; w bok tylko w dolnej
       ćwiartce postaci), jasnym sąsiadem wzdłuż podeszwy i nie-konturem do środka; piksele „dżinsowe” do k px
       w głąb buta (k ≈ 5,5% wysokości postaci) są butem.
    4. Koszulka: największa część z etykietą koszulki (>= 12 px) + części >= 3 px w zasięgu głowy (|x − głowa| <=
       1,2 szer. głowy), nie niżej niż górna krawędź dżinsów i otoczone w >= 50% konturem/ubraniem (odpada usta,
       okulary, końcówki włosów — otoczone skórą/włosami). Ramiona i dłonie przed koszulką rozdzielają części.
    5. Dżinsy: części z etykietą dżinsów (bez butów) poniżej góry koszulki: ziarno = największa + duże (>= 10 px)
       przy dole koszulki, potem łańcuchowo części w odległości <= 2 px (przez kontur kolan, szwy).
    6. Nadruk: składowe czerwieni/szarości/ciemnych czerwieni otoczone koszulką (>= 60% sąsiadów, bez
       przezroczystości); mankiety: szarości otoczone dżinsami (bez konturu) dołączają do dżinsów."""
    arr = np.asarray(im).astype(int)
    op = arr[:, :, 3] > 0
    h = op.shape[0]
    cls = wardrobe_classes(arr)
    head = head_point(cls, op)
    inner = op & shift(op, 1, 0) & shift(op, -1, 0) & shift(op, 0, 1) & shift(op, 0, -1)  # bez brzegu sylwetki
    cloth = inner & (cls['shirt'] | cls['shade'] | cls['mid'] | cls['jeans'])
    sv = box_sum(cloth & cls['shirt'], 2)
    jv = box_sum(cloth & (cls['jeans'] | cls['mid']), 2)
    shirt_l, jeans_l = cloth & (sv > jv), cloth & (jv > sv)
    rest = cloth & ~shirt_l & ~jeans_l
    for _ in range(4):
        ns = sum(shift(shirt_l, dy, dx).astype(int) for dy, dx in NEIGH4)
        nj = sum(shift(jeans_l, dy, dx).astype(int) for dy, dx in NEIGH4)
        add_s, add_j = rest & (ns > nj), rest & (nj > ns)
        shirt_l, jeans_l, rest = shirt_l | add_s, jeans_l | add_j, rest & ~add_s & ~add_j

    ys = np.nonzero(max(parts_of(op), key=lambda p: p.sum()))[0]  # główny kształt, bez efektów obok
    body_h = ys.max() - ys.min() + 1
    k = max(2, int(round(0.055 * body_h)))
    light = cls['light'] | cls['light2']
    dark = cls['outline'] & op
    lower = np.zeros_like(op)
    lower[ys.min() + int(0.65 * body_h):] = True
    zone = np.zeros_like(op)
    # (na zewnątrz buta, wzdłuż podeszwy, tylko dolne 35% postaci); bokiem but jest dłuższy: strefa 2k.
    for (sy, sx), (ay, ax), side in (((1, 0), (0, 1), False), ((0, -1), (1, 0), True), ((0, 1), (1, 0), True)):
        out1, out1_dark, out2 = shift(op, sy, sx), shift(dark, sy, sx), shift(op, 2 * sy, 2 * sx)
        sole = (light & (~out1 | (out1_dark & ~out2)) & (shift(light, ay, ax) | shift(light, -ay, -ax))
                & shift(op & ~dark, -sy, -sx))
        if side:
            sole &= lower
        for d in range((2 * k if side else k) + 1):
            for t in (-1, 0, 1):
                zone |= shift(sole, d * sy + t * ay, d * sx + t * ax)
    # But od spodu (tired_5): jasny pasek podeszwy w środku buta — składowa >= 3 jasnych px w dolnych 35% postaci,
    # otoczona samymi nieprzezroczystymi pikselami, przy pikselach „dżinsowych”; strefa k px wokół.
    for p in parts_of(light & lower, NEIGH4, min_size=3):
        ring = ring4(p)
        if not (ring & ~op).any() and (ring & jeans_l).any():
            zone |= dilate(p, k)
    shoes = jeans_l & zone

    sparts = sorted(parts_of(shirt_l, min_size=3), key=lambda p: -p.sum())
    jparts = parts_of(jeans_l & ~shoes, min_size=3)
    shirt = np.zeros_like(op)
    if sparts and sparts[0].sum() >= 12:
        shirt = sparts[0].copy()
        mx = np.nonzero(shirt)[1]
        legs = max(jparts, key=lambda p: p.sum(), default=None)
        jtop = np.nonzero(legs)[0].min() if legs is not None and legs.sum() >= 10 and not top_only else h
        for p in sparts[1:]:
            py, px = np.nonzero(p)
            near_x = (abs(px.mean() - head['x']) <= 1.2 * head['w'] if head
                      else mx.min() - 3 <= px.mean() <= mx.max() + 3)
            ring = ring4(p)
            framed = (ring & (cls['outline'] | cloth)).sum() >= 0.5 * ring.sum()
            if py.mean() <= jtop and near_x and framed:
                shirt |= p
    jeans = np.zeros_like(op)
    if shirt.any() and not top_only:
        srows = np.nonzero(shirt)[0]
        cand = [p for p in jparts if np.nonzero(p)[0].mean() > srows.min()]
        if cand:
            near, big, low_row = dilate(shirt, 2), max(p.sum() for p in cand), np.percentile(srows, 75)
            is_seed = [p.sum() == big or (p.sum() >= 10 and (p & near).any() and np.nonzero(p)[0].mean() >= low_row)
                       for p in cand]
            seed = np.zeros_like(op)
            for p, s in zip(cand, is_seed):
                if s:
                    seed |= p
            jeans = grow(seed, [p for p, s in zip(cand, is_seed) if not s], 2)
    printed = enclosed(inner & ~cloth & (cls['red'] | cls['print'] | cls['printDark']), shirt, op)
    jeans |= enclosed(inner & ~cloth & (cls['grey'] | cls['grey2'] | cls['cuff']) & ~shoes & ~printed,
                      jeans, op, skip=cls['outline'])
    if shirt.any():
        head = head_top(cls, op, shirt, head_ignore, head_silhouette)
    return shirt, printed, jeans, shoes, head


def matches(name, patterns):
    return any(fnmatch.fnmatchcase(name, p) for p in patterns)


def without_seat(im, region):
    """`noSeat` (prostokąty w px arkusza): brązowy stołek / ławka spod Gabi znika — piksele brązowe (odcień
    czerwono-pomarańczowy, nasycone, ciemne) w obszarze i ich kontur (ciemne piksele przy usuniętych, niestykające
    się z jasną częścią postaci); na koniec zostaje tylko największy kształt (odpada cień pod stołkiem, resztki nóżek).
    Gabi „siedzi/leży w powietrzu” — gra kładzie ją na meblu z pokoju."""
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(float) / 255
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    v = mx
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    opaque = arr[:, :, 3] > 0
    # brąz/bordo/śliwka stołka (paleta zamienia ciemny brąz także na śliwkowe odcienie ~310–340°)
    # (śliwkowe tylko nad strefą butów — dolne 12% klatki — bo buty po kwantyzacji też bywają śliwkowe)
    shoe_zone = np.zeros(opaque.shape, bool)
    shoe_zone[int(opaque.shape[0] * 0.88):] = True
    stool_hue = (hue <= 45) | (hue >= 340) | ((hue >= 310) & ~shoe_zone)
    brown = opaque & region & stool_hue & (sat > 0.25) & (v < 0.62) & (v > 0.06)
    dark = opaque & (v < 0.16)
    drop = brown.copy()
    # Szare prześwity między nóżkami i cień pod stołkiem: szarości osiągalne od tła/usuniętego stołka
    # bez przechodzenia przez kontur (buty i nogi otoczone konturem zostają).
    greyish = opaque & region & (sat < 0.15) & (v > 0.4)
    h, w = drop.shape
    queue = deque(zip(*np.nonzero(region & (drop | ~opaque))))
    seen = region & (drop | ~opaque)
    while queue:
        y, x = queue.popleft()
        for dy, dx in NEIGH4:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and greyish[ny, nx]:
                seen[ny, nx] = True
                drop[ny, nx] = True
                queue.append((ny, nx))
    for _ in range(3):
        near_drop = np.zeros_like(drop)
        near_light = np.zeros_like(drop)
        for dy, dx in NEIGH4:
            near_drop |= shift(drop, dy, dx)
            near_light |= shift(opaque & ~drop & ~dark, dy, dx)
        drop |= region & dark & near_drop & ~near_light
    # Grube kontury nóżek stołka: ciemne piksele dalej niż 3 px od jasnej części postaci (dżinsy, skóra, podeszwy).
    # (nie w strefie butów — dolne 12% klatki: czarne buty są daleko od jasnych pikseli).
    core = opaque & ~drop & ~dark
    drop |= region & dark & ~shoe_zone & ~dilate(core, 3)
    arr[drop] = 0
    (x0, y0, x1, y1), shape = largest_shape(Image.fromarray(arr, 'RGBA'))
    arr[~shape] = 0
    return Image.fromarray(arr, 'RGBA').crop((int(x0), int(y0), int(x1) + 1, int(y1) + 1))


def without_stool(im, rect):
    """Klatka bez stołka (sekcja `derived`, pole `noStool`: [x0, y0, x1, y1] w px klatki): w prostokącie zostają tylko
    ubranie i buty (maski szafy) oraz kontur, który się z nimi styka — reszta (stołek, jego nóżki) znika.
    Gabi „siedzi w powietrzu”, więc da się ją posadzić na dowolnym meblu."""
    h, w = im.height, im.width
    x0, y0, x1, y1 = rect
    region = np.zeros((h, w), bool)
    region[max(0, y0):min(h, y1), max(0, x0):min(w, x1)] = True
    return strip_region(im, region)


def strip_region(im, region):
    """W obszarze zostaje tylko ubranie i buty (maski szafy) oraz stykający się z nimi kontur."""
    shirt, printed, jeans, shoes, _ = wardrobe_masks(im)
    keep = shirt | printed | jeans | shoes
    arr = np.array(im)
    h, w = arr.shape[:2]
    lum = arr[:, :, :3].astype(int) @ np.array([299, 587, 114]) / 1000
    outline = (arr[:, :, 3] > 0) & (lum < 24)
    near_keep = np.zeros((h, w), bool)
    for dy, dx in NEIGH4:
        near_keep |= shift(keep, dy, dx)
    drop = region & (arr[:, :, 3] > 0) & ~keep & ~(outline & near_keep)
    arr[drop] = 0
    return Image.fromarray(arr, 'RGBA')


def save_wardrobe(body, frames, portraits_im, pets=None):
    """Maski ubrań (public/masks/<klatka>.png: R = koszulka bez nadruku, G = nadruk, B = dżinsy; 255/0, rozmiar
    klatki) i metadane dla ubieralni dopisane do `frames`: `mask` (czy jest maska), `head` {x, y, w} (px natywne,
    patrz head_point), `knee` (wiersz kolan: pas + 45% wysokości nogawek; tylko gdy są dżinsy), `noHat`.
    Sekcja `wardrobe` w frames.json: `exclude` (wzorce nazw bez maski i bez głowy — inny strój z rysunku),
    `topOnly` (bez dżinsów: popiersia, nogi pod biurkiem), `noHat`, `headIgnore` i `headSilhouette` (patrz head_top), `portraits` (portrety z maską dolnego pasa
    koszulki). Klatka bez wykrytej koszulki dostaje `mask: false`. Zwraca listę portretów z maską.
    Podgląd: tools/out/wardrobe_masks.png."""
    cfg = CFG['wardrobe']
    MASKS_DIR.mkdir(parents=True, exist_ok=True)
    written, tiles = set(), []

    def write(name, shirt, printed, jeans, pet=None):
        rgb = np.dstack([shirt, printed, jeans]).astype(np.uint8) * 255
        if pet is not None:
            rgb[pet] = 255  # biały = zwierzak: ubieralnia go nie maluje (np. spódnica nie zakrywa kota)
        Image.fromarray(rgb, 'RGB').save(MASKS_DIR / f'{name}.png')
        written.add(name)

    for name in sorted(body):
        im, meta = body[name]['im'], frames[name]
        _SHEET_CLASSES.clear()
        _SHEET_CLASSES.update(cfg.get('sheetClasses', {}).get(body[name]['e']['sheet'], {}))
        if matches(name, cfg['exclude']):
            meta['mask'] = False
            tiles.append((name, im, None, None, 'wykluczona'))
            continue
        # Klatki z drobniejszymi pikselami (gładkie arkusze, skala < 0,7): maski liczone na obrazie pomniejszonym
        # dwukrotnie — progi rozpoznawania są dobrane do zwykłej wielkości piksela — i rozciągane z powrotem.
        f = 2 if meta['scale'] < 0.7 else 1
        src = im.resize(((im.width + 1) // 2, (im.height + 1) // 2), Image.NEAREST) if f == 2 else im
        shirt, printed, jeans, shoes, head = wardrobe_masks(src, matches(name, cfg['topOnly']), cfg['headIgnore'].get(name, []),
                                                           matches(name, cfg['headSilhouette']))
        if f == 2:
            opaque = np.asarray(im)[:, :, 3] > 0
            up = lambda m: np.kron(m, np.ones((2, 2), bool))[:im.height, :im.width] & opaque
            shirt, printed, jeans, shoes = up(shirt), up(printed), up(jeans), up(shoes)
            if head:
                head = {'x': head['x'] * 2 + 0.5, 'y': head['y'] * 2, 'w': head['w'] * 2}
        if not jeans.any() and not matches(name, cfg['topOnly']):
            # Zapas: dżinsów nie rozpoznano (tułów zasłonięty, np. prezentem) — ciemne ubranie poniżej koszulki
            # (nie wyżej niż 45% wysokości) i nad butami (dolne 8,5%) to spodnie.
            arr = np.asarray(im).astype(int)
            cls = wardrobe_classes(arr)
            op = arr[:, :, 3] > 0
            # „koszulka” w dolnej połowie postaci to w rzeczywistości spodnie
            lower = np.zeros_like(op)
            lower[int(im.height * 0.5):] = True
            shirt = shirt & ~lower
            cloth = op & (cls['shirt'] | cls['shade'] | cls['mid'] | cls['jeans']) & ~shirt & ~printed & ~shoes
            rows = np.nonzero(shirt.any(axis=1))[0]
            top = max(int(rows.max()) + 1 if len(rows) else 0, int(im.height * 0.45))
            band = np.zeros_like(op)
            band[top:int(im.height * 0.915)] = True
            jeans = cloth & band
            if not shirt.any():
                # koszulka: ciemne ubranie pod głową (od 30% wysokości) i nad spodniami
                upper = np.zeros_like(op)
                upper[int(im.height * 0.3):top] = True
                shirt = cloth & upper
        if f == 2:
            # drobne klatki: buty (dolne 8,5%) nigdy nie są spodniami
            arr0 = np.asarray(im)
            rows_op = np.nonzero((arr0[:, :, 3] > 0).any(axis=1))[0]
            shoe_row = int(rows_op.max() + 1 - max(2, round(im.height * 0.085)))
            jeans[shoe_row:] = False
        if pets and name in pets:
            keep = ~pets[name]
            shirt, printed, jeans, shoes = shirt & keep, printed & keep, jeans & keep, shoes & keep
            # spodnie zasłonięte kotem/rozpoznane tylko częściowo: ciemne ubranie poniżej pasa (bez kota i butów)
            arr0 = np.asarray(im).astype(int)
            cls0 = wardrobe_classes(arr0)
            dark_cloth = (arr0[:, :, 3] > 0) & (cls0['shirt'] | cls0['shade'] | cls0['mid'] | cls0['jeans']) & keep
            # góra spodni z największego kawałka spodni — pojedyncze „spodniowe” piksele przy kocie trzymanym na
            # piersi (przytulanie) nie przesuwają pasa na wysokość klatki piersiowej
            main_legs = max(parts_of(jeans), key=lambda p: p.sum(), default=None)
            if main_legs is not None and main_legs.any():
                jtop = int(np.nonzero(main_legs.any(axis=1))[0].min())
                jeans &= ~np.pad(np.ones((jtop, jeans.shape[1]), bool), ((0, jeans.shape[0] - jtop), (0, 0))) | main_legs
                band = np.zeros_like(jeans)
                band[jtop:shoe_row if f == 2 else im.height] = True
                jeans |= dark_cloth & band & ~shirt & ~printed
                # czarne buty nisko (kucanie) bywają wzięte za koszulkę — koszulka tylko nad strefą butów
                shirt[jtop + 3:] = False
        meta['mask'] = bool(shirt.any() or jeans.any())
        if meta['mask']:
            write(name, shirt, printed, jeans, pets.get(name) if pets else None)
        if jeans.any():
            rows = np.nonzero(jeans.sum(axis=1) >= 2)[0]
            meta['knee'] = int(round(rows.min() + 0.45 * (rows.max() - rows.min())))
        if head:
            meta['head'] = head
        if matches(name, cfg['noHat']):
            meta['noHat'] = True
        tiles.append((name, im, (shirt, printed, jeans, shoes), meta, '' if meta['mask'] else 'brak koszulki'))
    _SHEET_CLASSES.clear()
    masked_portraits = []
    for name in cfg['portraits']:
        im = portraits_im[name]
        shirt, printed, jeans, shoes, _ = wardrobe_masks(im, True)
        if shirt.any():
            write(name, shirt, printed, jeans)
            masked_portraits.append(name)
        tiles.append((name, im, (shirt, printed, jeans, shoes), None, 'portret'))
    for old in MASKS_DIR.glob('*.png'):
        if old.stem not in written:
            old.unlink()
    save_wardrobe_preview(tiles)
    print(f'Maski ubrań: {len(written)} ({", ".join(sorted(written))})')
    return masked_portraits


def save_wardrobe_preview(tiles, f=4, max_width=1900):
    """Podgląd masek ×f: dla każdej klatki trójka klatka | maska kolorowa na szarej klatce (czerwony — koszulka,
    zielony — nadruk, niebieski — dżinsy, żółty — wykryte buty, cyjan — wiersz kolan) | czubek głowy (kreska
    szerokości głowy, kropka w środku). Klatki wykluczone — sama klatka z podpisem."""
    cells = []
    for name, im, masks, meta, note in tiles:
        bg = Image.new('RGBA', im.size, (120, 190, 120, 255))
        bg.alpha_composite(im)
        frame = np.asarray(bg)
        parts = [Image.fromarray(frame).resize((im.width * f, im.height * f), Image.NEAREST)]
        if masks is not None:
            shirt, printed, jeans, shoes = masks
            ov = frame.copy()
            grey = (ov[:, :, :3].mean(axis=2) * 0.5 + 60).astype(np.uint8)
            ov[:, :, 0] = ov[:, :, 1] = ov[:, :, 2] = grey
            for m, col in ((shoes, (255, 200, 0)), (shirt, (255, 60, 60)), (printed, (60, 230, 60)),
                           (jeans, (60, 120, 255))):
                ov[m] = (*col, 255)
            big = Image.fromarray(ov).resize((im.width * f, im.height * f), Image.NEAREST)
            if meta and 'knee' in meta:
                ImageDraw.Draw(big).line([(0, meta['knee'] * f + f // 2), (big.width, meta['knee'] * f + f // 2)],
                                         fill=(0, 230, 255, 255))
            parts.append(big)
            hd = parts[0].copy()
            if meta and 'head' in meta:
                hp, d = meta['head'], ImageDraw.Draw(hd)
                x0 = (hp['x'] + 0.5 - hp['w'] / 2) * f
                d.line([(x0, hp['y'] * f), (x0 + hp['w'] * f, hp['y'] * f)], fill=(255, 0, 255, 255), width=2)
                cx, cy = (hp['x'] + 0.5) * f, hp['y'] * f
                d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 0, 0, 255))
            parts.append(hd)
        label = name + (f' ({note})' if note else '') + (' noHat' if meta and meta.get('noHat') else '')
        gap = 4
        w = max(sum(p.width for p in parts) + gap * (len(parts) - 1), len(label) * 6)
        cell = Image.new('RGBA', (w, max(p.height for p in parts) + 14), (255, 255, 255, 255))
        ImageDraw.Draw(cell).text((0, 0), label, fill=(0, 0, 0, 255))
        x = 0
        for p in parts:
            cell.alpha_composite(p, (x, 14))
            x += p.width + gap
        cells.append(cell)
    rows, row, width, gap = [], [], 0, 16
    for c in cells:
        if row and width + c.width > max_width:
            rows.append(row)
            row, width = [], 0
        row.append(c)
        width += c.width + gap
    rows.append(row)
    out = Image.new('RGBA', (max_width, sum(max(c.height for c in r) + gap for r in rows)), (255, 255, 255, 255))
    y = 0
    for r in rows:
        x = 0
        for c in r:
            out.alpha_composite(c, (x, y))
            x += c.width + gap
        y += max(c.height for c in r) + gap
    WARDROBE_PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    out.save(WARDROBE_PREVIEW)


def group_of(name):
    """Grupa klatek: nazwa bez końcowych cyfr (walk_a1 → walk_a)."""
    return re.sub(r'\d+$', '', name)


def collect():
    """Komórki wszystkich klatek przed kwantyzacją: nazwa → (grupa, wpis, komórki, maska tła, xs, ys)."""
    raw = {}
    for group in ('body', 'portraits', 'items'):
        for name, spec in CFG.get(group, {}).items():
            e = entry(spec, group)
            img = sheet(e['path'])
            bg = np.array(e['background'], float)
            period = e['period']
            if e['keep'] == 'all':
                # Wszystkie kształty w prostokącie (postać + efekty); ramka = cały prostokąt.
                box, margin, min_blob, hole_tol = e['rect'], 0, 1, e['holeTolAll']
            else:
                box, margin, min_blob, hole_tol = tight_box(img, e['rect'], bg), period / 2, 12, e['holeTol']
            # Arkusz ma jedną siatkę pikseli dla całej postaci — próbkujemy ją wprost, bez przeskalowania.
            cells, xs, ys = sample(img, box, period, e['sampleMode'], bg, e['bgTol'])
            if e['reduce'] == 2:
                cells, xs, ys = reduce2(cells, xs, ys, bg)
                period *= 2
            if e['hairTone']:
                cells = hair_tone(cells, *e['hairTone'])
            erased = erase_mask(xs, ys, e['erase'])
            cells[erased] = bg
            mask = (background_mask(cells, bg, min_blob, hole_tol, e['halo'], e['bgHsv'], e['bgHsvHole'])
                    | outside_box(xs, ys, box, margin) | erased)
            if group == 'items' and e['keep'] != 'all':
                # Przedmiot to jeden kształt — odpryski sąsiadów i podpisów w jego ramce znikają.
                parts = sorted(components(~mask, NEIGH8), key=len)
                for comp in parts[:-1]:
                    for p in comp:
                        mask[p] = True
            for *rect, color in e['paint']:
                painted = erase_mask(xs, ys, [rect])
                cells[painted] = color
                mask[painted] = False
            for axis, centre in e['mirror']:
                mirror_half(cells, mask, xs if axis == 'x' else ys, centre, axis == 'x')
            if e['flipX']:
                # Komórki zachowują swoje środki w px arkusza (xs maleje) — `alignRect` i `scaleRefCols` bez zmian.
                cells, mask, xs = cells[:, ::-1], mask[:, ::-1], xs[::-1]
            raw[name] = (group, e, cells, mask, xs, ys)
            print(f'{name:12s} arkusz={e["sheet"]:6s} okres={period:.2f} komórki={cells.shape[1]}x{cells.shape[0]}')
    return raw


def main():
    raw = collect()
    palette = load_palette(np.concatenate([c[~m] for _, _, c, m, _, _ in raw.values()]))
    if '--extend-palette' in sys.argv:
        args = sys.argv[sys.argv.index('--extend-palette') + 1:]
        palette = extend_palette(raw, palette, int(args[0]), [a for a in args[1:] if not a.startswith('--')])
    # Każda klatka kwantyzuje się do pierwszych `colours` kolorów palety (patrz extend_palette).
    quantised = {name: (quantise(cells, palette[:e['colours']]), mask, xs, ys)
                 for name, (_, e, cells, mask, xs, ys) in raw.items()}
    images = {}
    coords = {}
    retouched = []
    for name, (group, e, *_) in raw.items():
        idx, mask, xs, ys = quantised[name]
        if any(e[k] for k in RETOUCH_KEYS):
            before = to_rgba(idx, mask, palette)
            idx, mask = retouch(idx, mask, xs, ys, e, palette[:e['colours']], quantised)
            retouched.append((name, before, to_rgba(idx, mask, palette)))
        images[name] = (group, e, to_rgba(idx, mask, palette))
        # Środki komórek obrazka (po przycięciu) w px arkusza — dla `alignRect` klatek stanów.
        rows, cols = np.nonzero((~mask).any(axis=1))[0], np.nonzero((~mask).any(axis=0))[0]
        coords[name] = (xs[cols[0]:cols[-1] + 1], ys[rows[0]:rows[-1] + 1])
        assert images[name][2].size == (len(coords[name][0]), len(coords[name][1])), name
    save_bag_preview(retouched)
    for name, (group, e, im) in list(images.items()):
        if e['onlyLargest']:
            # tylko postać: bez numerów klatek, nutek, kawałków sąsiednich rysunków
            (x0, y0, x1, y1), shape = largest_shape(im)
            arr = np.array(im)
            arr[~shape] = 0
            im = Image.fromarray(arr, 'RGBA').crop((int(x0), int(y0), int(x1) + 1, int(y1) + 1))
            images[name] = (group, e, im)
        if e['dropSpecks']:
            # okruchy po zdjętym cieniu (resztki konturu cienia): kształty mniejsze niż `dropSpecks` komórek znikają
            arr = np.array(im)
            for comp in components(arr[:, :, 3] > 0, NEIGH8):
                if len(comp) < e['dropSpecks']:
                    for p in comp:
                        arr[p] = 0
            im = Image.fromarray(arr, 'RGBA')
            images[name] = (group, e, im)
        if e['noSeat']:
            xs, ys = coords[name]
            region = erase_mask(xs, ys, e['noSeat'])
            if e['seatMode'] == 'mask':
                # stołek z jasnymi prześwitami i cieniem: zostaje samo ubranie i buty, potem największy kształt
                im = strip_region(im, region)
                (x0, y0, x1, y1), shape = largest_shape(im)
                arr = np.array(im)
                arr[~shape] = 0
                im = Image.fromarray(arr, 'RGBA').crop((int(x0), int(y0), int(x1) + 1, int(y1) + 1))
                images[name] = (group, e, im)
            else:
                images[name] = (group, e, without_seat(im, region))
    for name, (group, e, im) in list(images.items()):
        if e['sampleMode'] == 'smooth' and group == 'body':
            images[name] = (group, e, clean_smooth(im))
    # Zwierzak w klatce (`pet`: wielokąty w px arkusza): jego ciemne piksele nie są ubraniem (maska szafy go
    # pomija), a brzeg stykający się z czarnymi ubraniami dostaje jaśniejszy obrys — kot nie zlewa się z Gabi.
    pets = {}
    for name, (group, e, im) in list(images.items()):
        if not e['pet']:
            continue
        xs, ys = coords[name]
        arr = np.array(im)
        h, w = arr.shape[:2]
        area = erase_mask(xs[:w], ys[:h], e['pet'])
        lum = arr[:, :, :3].astype(int) @ np.array([299, 587, 114]) / 1000
        op = arr[:, :, 3] > 0
        cat = area & op & ((lum < 95) | (np.abs(arr[:, :, 0].astype(int) - arr[:, :, 2]) > 40))
        dark_other = op & ~cat & (lum < 95)
        touch = np.zeros_like(cat)
        for dy, dx in NEIGH4:
            touch |= shift(dark_other, dy, dx)
        arr[cat & touch] = [122, 110, 150, 255]
        images[name] = (group, e, Image.fromarray(arr, 'RGBA'))
        pets[name] = cat
    for name, (group, e, im) in list(images.items()):
        if e['outline']:
            images[name] = (group, e, outer_outline(im, e['outline']))
            pad = len(e['outline'])
            if name in pets:
                pets[name] = np.pad(pets[name], pad)
            if name in coords:
                # pierścienie obrysu poszerzają obrazek — środki komórek (px arkusza) dopisane w tym samym okresie
                def grow(v):
                    step = float(v[1] - v[0]) if len(v) > 1 else 1.0
                    k = np.arange(1, pad + 1)
                    return np.concatenate([v[0] - step * k[::-1], v, v[-1] + step * k])
                coords[name] = tuple(grow(np.asarray(v, dtype=float)) for v in coords[name])

    # Największy kształt każdej klatki ciała: wysokość ciała, stopy, kotwica.
    body = {}
    for name, (group, e, im) in images.items():
        if group != 'body':
            continue
        (sx0, sy0, sx1, sy1), shape = largest_shape(im)
        ax = im.width / 2 if e['anchor'] == 'center' else anchor_x(shape, sy0)
        body[name] = {'name': name, 'im': im, 'e': e, 'bodyH': sy1 - sy0 + 1, 'foot': int(sy1) + 1, 'anchorX': ax}

    display_h = CFG['displayHeight']
    heights = {}
    for name, b in body.items():
        if b['e']['sheet'] == 'main':
            heights.setdefault(group_of(name), []).append(b['bodyH'])
    group_scale = {g: display_h / float(np.median(hs)) for g, hs in heights.items()}
    for g in sorted(heights):
        print(f'grupa {g:11s} mediana wysokości={float(np.median(heights[g])):.1f} skala={group_scale[g]:.3f}')
    sheet_scale = {}
    for sname, sh in CFG.get('sheets', {}).items():
        if 'bodyScale' in sh:
            sheet_scale[sname] = sh['bodyScale']  # arkusz bez stojącej Gabi (siedzenie, leżenie) — skala ręczna
            continue
        if 'scaleRef' not in sh:
            continue  # arkusz samych przedmiotów — skala z `scale` arkusza albo wpisu
        ref = sh['scaleRef']
        height = body[ref]['bodyH'] if ref in body else gabi_height(raw[ref], sh['scaleRefCols'])
        sheet_scale[sname] = display_h / float(height)
        print(f'arkusz {sname:7s} wzorzec={ref} wysokość ciała={height} skala={sheet_scale[sname]:.3f}')
        for other, cols in sh.get('scaleCheck', {}).items():
            h = gabi_height(raw[other], cols)
            print(f'  kontrola {other}: wysokość Gabi={h} komórek -> {h * sheet_scale[sname]:.1f} px log.')
    for sname, sh in CFG.get('sheets', {}).items():
        if 'align' in sh:
            align_sheet(body, sname, sh['align'])
    for name in CFG['body']:
        if body[name]['e']['alignBottom']:
            align_bottom(body, name, *body[name]['e']['alignBottom'])

    # Klatki pochodne (np. szydełkowanie bez stołka — Gabi siedzi na meblu z pokoju): metadane jak w klatce źródłowej.
    for name, spec in CFG.get('derived', {}).items():
        src = body[spec['from']]
        im = without_stool(src['im'], spec['noStool']) if 'noStool' in spec else src['im'].copy()
        body[name] = {**src, 'name': name, 'im': im}
        print(f'{name:12s} <- {spec["from"]}')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    frames = {}
    preview = []
    preview_new = []
    for name in sorted(body):
        b = body[name]
        im, sname = b['im'], b['e']['sheet']
        scale = group_scale[group_of(name)] if sname == 'main' else sheet_scale[sname]
        im.save(OUT_DIR / f'{name}.png')
        frames[name] = {'w': im.width, 'h': im.height, 'anchorX': round(b['anchorX'], 2),
                        'foot': b['foot'], 'scale': round(scale, 4)}
        if sname == 'main':
            preview.append((im, scale))
        print(f'{name:12s} {im.width:3d}x{im.height:3d} ciało={b["bodyH"]:3d} stopy={b["foot"]:3d} skala={scale:.3f}')

    for name in CFG['body']:
        b = body[name]
        if b['e']['sheet'] != 'main':
            preview_new.append((b['im'], frames[name]['scale'], b['foot']))

    portraits = {}
    for name, (group, e, im) in images.items():
        if group == 'portraits':
            im.save(OUT_DIR / f'{name}.png')
            portraits[name] = [im.width, im.height]
            if e['sheet'] == 'main':
                preview.append((im, 1.0))
            else:
                preview_new.append((im, 1.0, im.height))

    masked_portraits = save_wardrobe(body, frames, {n: im for n, (g, _, im) in images.items() if g == 'portraits'}, pets)

    META_PATH.parent.mkdir(parents=True, exist_ok=True)
    meta = {'displayHeight': display_h, 'frames': frames, 'body': sorted(body), 'portraits': portraits,
            'portraitMasks': masked_portraits}
    META_PATH.write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')
    save_preview(preview)
    save_preview_new(preview_new)
    save_drag_x4([body[n]['im'] for n in ('drag_2', 'drag_3', 'drag_4', 'drag_5')])
    save_sheet_previews(body)
    save_items(images, coords, sheet_scale, frames['idle_front']['scale'], body, frames)
    print(f'Podgląd: {PREVIEW}, {PREVIEW_NEW}, {DRAG_X4}, {BED_ALIGNED}, {BAG_PREVIEW}, {ITEMS_PREVIEW}')


if __name__ == '__main__':
    main()
