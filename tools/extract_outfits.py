"""Stroje z arkuszy: klatki Gabi w stroju wycięte z arkuszy wygenerowanych na wzór oryginalnych (ten sam układ).

Użycie: /c/gvenv/Scripts/python tools/extract_outfits.py
Konfiguracja: sekcja `outfits` w tools/frames.json:
  "outfits": {"<id stroju>": {"sheets": {"<klucz arkusza>": {nadpisania}}, "skip": [wzorce nazw klatek]}}
Plik arkusza: assets/source/stroje/<id>/<klucz>.jpg — klucz jak w `sheets` frames.json (`main` = sprite-sheet.jpg).
Brak któregokolwiek skonfigurowanego arkusza albo palety: błąd i wyjście (kod 1), nic nie jest kasowane ani nadpisywane.
Dla każdej klatki ciała i portretu z tego arkusza (bez `skip`, bez wpisów `like`): prostokąt z oryginału poszerzony
o `pad` (domyślnie 10 px arkusza — sukienka bywa szersza niż dżinsy), obróbka jak w extract_sprites (próbkowanie,
`hairTone`, tło, kwantyzacja do całej palety tools/palette.json, `clean_smooth`, `outline`) BEZ poprawek
przypiętych do pikseli oryginału (bag, cut, fix, wipe, copy, erase, paint, shadow). Jak w extract_sprites zostają
wszystkie kształty z ramki oryginału (ramka największego obiektu w oryginalnym arkuszu + pół okresu, przy `keep`
"all" — prostokąt oryginału), czyli i efekty obok postaci (krople, iskierki, żarówka, serduszka, „!”); poza tą ramką
(pas `pad`, szersza spódnica) zostaje tylko największy kształt — sąsiednie klatki i podpisy odpadają.
Opcje geometrii odtwarzane jak w extract_sprites:
  `noSeat` ("colour" — `without_seat` stroju, "mask" — `strip_region` + największy kształt) — prostokąty
    w px arkusza; obowiązują też w arkuszu stroju, bo generator wyrównuje go do oryginału (skala, przesunięcie);
    środki komórek klatki stroju w px arkusza idą za nią przez przycięcia (patrz `cut`). `without_seat` stroju:
    okno odcienia stołka `seatHue` arkusza (domyślnie sam brąz SEAT_HUE — oryginalne okno z bordo i śliwką zjadało
    ciemnoczerwoną spódnicę), tylko w miejscu stołka z oryginalnego arkusza (`seat_prior`), bez żywej czerwieni,
    bez dziur w sylwetce i bez cienkich resztek; `seatHue` "base" — dokładnie reguły `X.without_seat` (ławka pod
    leżącą Gabi, spódnica kończy się na linii ławki);
  `onlyLargest` — tylko największy kształt (efekty odpadają, jak w oryginale);
  `anchor` "center" (wpis albo arkusz) — anchorX = połowa szerokości obrazka;
  `keep` "all" (wpis albo arkusz) — ramką jest prostokąt, `holeTolAll`, bez usuwania drobnych kształtów (łzy, zZz
    zostają), za to z `erase` (podpisy klatek; px arkusza jak `noSeat`);
  `pet` — wielokąty kota w px arkusza: brzeg kota przy ciemnym ubraniu dostaje jaśniejszy obrys (`mark_pet`);
  `alignBottom` — wyrównanie (`X.align_bottom`) do klatki wzorca TEGO stroju; bez niej klatka pominięta
    z ostrzeżeniem.
Kotwica i stopy zawsze z największego kształtu. Klatki z geometrią, której ta ścieżka nie odtwarza (`bgHsv`,
`flipX`, `mirror`, `align` arkusza), są pomijane z ostrzeżeniem.
Skala z klatki bazowej (src/sprites/frames.generated.json), kotwica i stopy jak w oryginale, czubek głowy —
`head_point` (tylko gdy ma go klatka bazowa), `noHat` przepisany z klatki bazowej. Kontrola: wysokość klatki ciała
w ±15% oryginału, szerokość w ±35% (sukienka bywa szersza), portretu — oba wymiary w ±15%; inaczej klatka pominięta
z ostrzeżeniem (w grze zostaje przemalowanie). Klatki pochodne (`derived`) — kopie klatki źródłowej; `noStool`
(px klatki oryginalnej) przeliczony przez siatkę oryginału na px arkusza (`stool_rect`), a w nim stołek zdjęty
`without_seat` stroju bez przycinania (kłębek obok zostaje); podgląd tools/out/stroj_<id>_derived.png.
Portrety: pad `portraitPad` (domyślnie 2 — nad ramką jest napis PORTRAIT, który przy większym pad-zie się dokleja);
resztki napisu nad górną krawędzią ramki są czyszczone (`clear_caption`), a ramka (pas przy brzegach i narożniki)
pochodzi z portretu oryginalnego (`restore_frame`; nadpisanie arkusza `portraitFrame`: false — bez tego).
Klatki ciała (nie portrety — ich ramka jest jasna z założenia): jasne szarawe piksele tuż za ciemnym konturem
(dzwonienie JPEG jasnego tła przy czarnym konturze, białe kropki wokół sukienki) znikają (`drop_halo`, przed `outline`).
Nadpisania arkusza: `background` (domyślnie "auto" — mediana lewego górnego rogu 20×20), `gridPeriod`, `pad`,
`portraitPad`, `halo` (domyślnie true; false — bez `drop_halo`), `seatHue` ([od, do] w stopniach albo "base"),
`portraitFrame`.
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
from collections import deque
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
# `restore_frame`: pas ramki przy brzegach portretu (dwie linie: 1. i 3. piksel od brzegu) i narożniki z węzłami (px)
PORTRAIT_FRAME, PORTRAIT_CORNER = 4, 7
SIZE_TOL = 0.15
HEAD_MIN_W = 0.5  # `body_meta`: węższa głowa (ułamek szerokości z klatki bazowej) — czubek głowy z klatki bazowej
WIDTH_TOL = 0.35  # szerokość klatki ciała: sukienka bywa wyraźnie szersza niż dżinsy oryginału
# `drop_halo`: jasność (luminancja 0–255) piksela obwódki, jego maks. nasycenie HSV, jasność konturu, liczba przebiegów
HALO_LIGHT, HALO_SAT, HALO_DARK, HALO_PASSES = 140, 0.25, 60, 2
# `without_seat` stroju: okno odcienia stołka (stopnie; nadpisanie `seatHue` arkusza) i przebiegi zdejmowania konturu
SEAT_HUE = (12, 45)
SEAT_CONTOUR_PASSES, SEAT_SPUR_PASSES = 2, 3
SEAT_PRIOR_CELLS = 1  # `seat_prior`: maska stołka z oryginału poszerzona o tyle okresów siatki
# żywa czerwień spódnicy (nasycenie od progu, plama od tylu px) nie jest stołkiem
SEAT_VIVID_SAT, SEAT_VIVID_MIN = 0.6, 20
# Opcje geometrii wpisu (po `X.entry`, więc i z arkusza), których ta ścieżka nie odtwarza — klatka stroju
# wypadłaby w innym miejscu albo wyglądała inaczej niż oryginał. Do tego `align` arkusza (sprawdzane osobno).
UNSUPPORTED = {
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


def largest_only(im):
    """Tylko największy kształt, przycięty do niego: (obrazek, (x0, y0) przycięcia w px obrazka wejściowego)."""
    (x0, y0, x1, y1), shape = X.largest_shape(im)
    arr = np.array(im)
    arr[~shape] = 0
    return Image.fromarray(arr, 'RGBA').crop((int(x0), int(y0), int(x1) + 1, int(y1) + 1)), (int(x0), int(y0))


def crop_opaque(arr, xs, ys):
    """Obrazek z tablicy RGBA przycięty do nieprzezroczystych pikseli razem ze środkami komórek (px arkusza)."""
    im = Image.fromarray(arr, 'RGBA')
    x0, y0, x1, y1 = im.getbbox()
    return im.crop((x0, y0, x1, y1)), xs[x0:x1], ys[y0:y1]


def hue_saturation_value(arr):
    """Odcień (stopnie), nasycenie i jasność (0–1) pikseli tablicy RGBA."""
    rgb = arr[:, :, :3].astype(float) / 255
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return hue, sat, mx


def seat_prior(e, xs, ys):
    """Gdzie stał stołek w ORYGINALNYM arkuszu (wpis `e`), dla komórek o środkach `xs`, `ys` (px arkusza — arkusz
    stroju jest wyrównany do oryginału, a generator zostawia stołek na miejscu): piksel oryginału w kolorze stołka
    z `X.without_seat` (brąz, bordo, śliwka: odcień <= 45° albo >= 310°, nasycony, ciemny), maska poszerzona
    o okres siatki (krawędzie, drobne przesunięcia). Maska komórek; obszar `noSeat` przycina ją dopiero
    `without_seat`."""
    img = X.sheet(e['path'])
    H, W = img.shape[:2]
    reach = int(np.ceil(SEAT_PRIOR_CELLS * e['period']))
    px = np.clip(np.round(xs).astype(int), 0, W - 1)
    py = np.clip(np.round(ys).astype(int), 0, H - 1)
    x0, y0 = max(0, px.min() - reach), max(0, py.min() - reach)
    x1, y1 = min(W, px.max() + reach + 1), min(H, py.max() + reach + 1)
    rgba = np.dstack([img[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0), 255.0)]).astype(np.uint8)
    hue, sat, v = hue_saturation_value(rgba)
    stool = ((hue <= 45) | (hue >= 310)) & (sat > 0.25) & (v < 0.62) & (v > 0.06)
    stool = X.dilate(stool, reach)
    return stool[(py - y0)[:, None], (px - x0)[None, :]]


def seat_hue_of(over):
    """Okno odcienia stołka z nadpisań arkusza (`seatHue`: [od, do] albo "base"; domyślnie SEAT_HUE)."""
    hue = over.get('seatHue', SEAT_HUE)
    return hue if hue == 'base' else tuple(hue)


def without_seat(im, region, seat_hue=SEAT_HUE, prior=None, largest=True):
    """`noSeat` stroju (kopia `X.without_seat` z oknem odcienia stołka): stołek / ławka spod Gabi znika —
    piksele w odcieniu `seat_hue` ([od, do] w stopniach, może przechodzić przez 0°; domyślnie sam brąz, bez bordo
    i śliwki — ciemnoczerwona spódnica stroju ma odcień ok. 345–10° i w oryginalnym oknie znikała razem ze stołkiem),
    nasycone i ciemne, w obszarze `region` i — gdy podana — w masce `prior` (miejsce stołka w oryginale, patrz
    `seat_prior`: generator potrafi przemalować stołek na bordo spódnicy, a wtedy po kwantyzacji mają te same
    kolory i rozróżnia je tylko położenie); do tego szare prześwity między nóżkami i kontur stołka. Nie znika żywa
    czerwień (nasycenie >= SEAT_VIVID_SAT, jasność >= 0,3 — spódnica, nie stołek), chyba że to mała plama cała
    w miejscu stołka; na koniec w miejscu stołka znikają cienkie resztki (otwarcie 3×3). Kontur: ciemne piksele
    stykające się z usuniętymi, ale nie z jasną (nieciemną) częścią postaci — dwa przebiegi, a nie trzy, i bez
    reguły „grubych konturów dalej niż 3 px od jasnych pikseli” z oryginału: czarne falbany, rajstopy i buty stroju
    są daleko od jasnych pikseli i znikałyby razem z nóżkami. Usunięte piksele, które utworzyłyby dziurę zamkniętą
    w sylwetce (cień spódnicy nad stołkiem), wracają. Resztki nóżek odcięte od postaci odpadają na końcu:
    `largest` — zostaje tylko największy kształt, przycięty (jak w oryginale); bez `largest` znikają tylko kształty
    (poza największym) dotykające `region`, a obrazek zachowuje rozmiar (klatki pochodne — kłębek obok zostaje).
    `seat_hue` "base" — dokładnie reguły `X.without_seat` (brąz, bordo i śliwka poza strefą butów, trzy przebiegi
    konturu, grube kontury; bez `prior`, żywej czerwieni, wypustek i dziur): ławka pod leżącą Gabi, przez którą
    zwisa spódnica — znika razem ze zwisającą częścią, sylwetka kończy się na linii ławki jak w oryginale.
    Zwraca (obrazek, (x0, y0) przycięcia w px obrazka wejściowego)."""
    arr = np.array(im)
    hue, sat, v = hue_saturation_value(arr)
    opaque = arr[:, :, 3] > 0
    base = seat_hue == 'base'
    area = region  # cały obszar `noSeat` — z niego znikają na końcu odcięte resztki (także poza `prior`)
    shoe_zone = np.zeros(opaque.shape, bool)
    shoe_zone[int(opaque.shape[0] * 0.88):] = True  # dolne 12% klatki (tylko reguły "base")
    if base:
        stool_hue = (hue <= 45) | (hue >= 340) | ((hue >= 310) & ~shoe_zone)
        vivid = np.zeros_like(opaque)
    else:
        if prior is not None:
            region = region & prior
        lo, hi = seat_hue
        stool_hue = ((hue >= lo) & (hue <= hi)) if lo <= hi else ((hue >= lo) | (hue <= hi))
        vivid = (sat >= SEAT_VIVID_SAT) & (v >= 0.3)
        # …chyba że to mała plama (< SEAT_VIVID_MIN px, 4-spójna) cała w obszarze — przemalowany brzeg siedziska
        # albo nóżka, nie pas falbany
        for comp in X.components(opaque & vivid, X.NEIGH4):
            if len(comp) < SEAT_VIVID_MIN and all(region[p] for p in comp):
                for p in comp:
                    vivid[p] = False
    brown = opaque & region & stool_hue & (sat > 0.25) & (v < 0.62) & (v > 0.06) & ~vivid
    dark = opaque & (v < 0.16)
    drop = brown.copy()
    # Szare prześwity między nóżkami i cień pod stołkiem: szarości osiągalne od tła/usuniętego stołka
    # bez przechodzenia przez kontur (jak w oryginale).
    greyish = opaque & region & (sat < 0.15) & (v > 0.4)
    h, w = drop.shape
    queue = deque(zip(*np.nonzero(region & (drop | ~opaque))))
    seen = region & (drop | ~opaque)
    while queue:
        y, x = queue.popleft()
        for dy, dx in X.NEIGH4:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and greyish[ny, nx]:
                seen[ny, nx] = True
                drop[ny, nx] = True
                queue.append((ny, nx))
    # Kontur stołka; czarny kontur spódnicy styka się z jej czerwienią (jasną część postaci), więc zostaje.
    for _ in range(3 if base else SEAT_CONTOUR_PASSES):
        near_drop = np.zeros_like(drop)
        near_light = np.zeros_like(drop)
        for dy, dx in X.NEIGH4:
            near_drop |= X.shift(drop, dy, dx)
            near_light |= X.shift(opaque & ~drop & ~dark, dy, dx)
        drop |= region & dark & near_drop & ~near_light
    if base:
        # grube kontury nóżek: ciemne piksele dalej niż 3 px od jasnej części postaci (poza strefą butów)
        drop |= region & dark & ~shoe_zone & ~X.dilate(opaque & ~drop & ~dark, 3)
    # Wypustki po stołku (brzeg siedziska, kawałek konturu): w obszarze piksel z najwyżej jednym nieprzezroczystym
    # 4-sąsiadem znika, do SEAT_SPUR_PASSES przebiegów.
    for _ in range(0 if base else SEAT_SPUR_PASSES):
        left = opaque & ~drop
        count = sum(X.shift(left, dy, dx).astype(int) for dy, dx in X.NEIGH4)
        spur = region & left & (count <= 1)
        if not spur.any():
            break
        drop |= spur
    # dziury zamknięte w sylwetce (nie łączą się z brzegiem obrazka) — to nie stołek, tylko ubranie w jego kolorze
    for comp in X.components(~opaque | drop, X.NEIGH4) if not base else []:
        if not any(y in (0, h - 1) or x in (0, w - 1) for y, x in comp):
            for p in comp:
                drop[p] = False
    if not base and prior is not None:
        # Cienkie resztki stołka (nóżka, brzeg siedziska w żywej czerwieni): w miejscu stołka zostają tylko piksele
        # należące do jakiegoś pełnego kwadratu 3×3 (otwarcie morfologiczne) — spódnica i buty są grubsze.
        # Po przywróceniu dziur — inaczej cienie spódnicy zdjęte jako stołek dziurawiłyby ją i otwarcie zjadłoby resztę.
        left = opaque & ~drop
        thick = X.dilate(X.box_sum(left, 1) == 9, 1) & left
        drop |= region & left & ~thick
    arr[drop] = 0
    if largest:
        return largest_only(Image.fromarray(arr, 'RGBA'))
    _, shape = X.largest_shape(Image.fromarray(arr, 'RGBA'))
    for comp in X.components((arr[:, :, 3] > 0) & ~shape, X.NEIGH8):
        if any(area[p] for p in comp):
            for p in comp:
                arr[p] = 0
    return Image.fromarray(arr, 'RGBA'), (0, 0)


def mark_pet(im, xs, ys, pet):
    """`pet` (wielokąty w px arkusza — arkusz stroju jest wyrównany do oryginału): jak w extract_sprites ciemne albo
    wyraźnie barwne (|R−B| > 40) piksele zwierzaka w obszarze, stykające się z ciemnym ubraniem poza nim, dostają
    jaśniejszy obrys — czarny kot nie zlewa się z czarną sukienką."""
    arr = np.array(im)
    area = X.erase_mask(xs, ys, pet)
    lum = arr[:, :, :3].astype(int) @ np.array([299, 587, 114]) / 1000
    op = arr[:, :, 3] > 0
    cat = area & op & ((lum < 95) | (np.abs(arr[:, :, 0].astype(int) - arr[:, :, 2]) > 40))
    dark_other = op & ~cat & (lum < 95)
    touch = np.zeros_like(cat)
    for dy, dx in X.NEIGH4:
        touch |= X.shift(dark_other, dy, dx)
    arr[cat & touch] = [122, 110, 150, 255]
    return Image.fromarray(arr, 'RGBA')


def grow_coords(v, pad):
    """Środki komórek poszerzone o `pad` komórek z każdej strony (pierścienie `outline`), w tym samym okresie."""
    v = np.asarray(v, dtype=float)
    step = float(v[1] - v[0]) if len(v) > 1 else 1.0
    k = np.arange(1, pad + 1)
    return np.concatenate([v[0] - step * k[::-1], v, v[-1] + step * k])


def drop_halo(im):
    """Jasna obwódka za konturem: nieprzezroczysty piksel stykający się (4-sąsiedztwo, także brzeg obrazka)
    z przezroczystością, jasny (luminancja > HALO_LIGHT), mało nasycony (HSV s < HALO_SAT) i mający ciemnego
    4-sąsiada (luminancja < HALO_DARK — kontur) staje się przezroczysty; do HALO_PASSES przebiegów (obwódka bywa
    podwójna). Jasne włosy i szkła okularów są zamknięte konturem, więc przezroczystości nie dotykają.
    Zwraca (obrazek bez przycięcia — przycina `cut` razem ze środkami komórek, liczba usuniętych pikseli)."""
    arr = np.array(im)
    h, w = arr.shape[:2]
    removed = 0
    for _ in range(HALO_PASSES):
        rgb = arr[:, :, :3].astype(float)
        lum = rgb @ np.array([0.299, 0.587, 0.114])
        mx, mn = rgb.max(axis=2), rgb.min(axis=2)
        sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
        op = arr[:, :, 3] > 0
        clear = np.pad(~op, 1, constant_values=True)  # poza obrazkiem = przezroczystość
        dark = np.pad(op & (lum < HALO_DARK), 1, constant_values=False)
        touch, near_dark = np.zeros((h, w), bool), np.zeros((h, w), bool)
        for dy, dx in X.NEIGH4:
            touch |= clear[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
            near_dark |= dark[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        drop = op & touch & near_dark & (lum > HALO_LIGHT) & (sat < HALO_SAT)
        if not drop.any():
            break
        arr[drop] = 0
        removed += int(drop.sum())
    return arr, removed


def cut(img, e, bg, period, pad, palette, portrait=False, halo=True, seat_hue=SEAT_HUE):
    """Klatka z arkusza stroju: prostokąt oryginału + `pad`, obróbka jak w extract_sprites — wszystkie kształty
    z ramki oryginału (największy obiekt w oryginalnym arkuszu + pół okresu, przy `keep` "all" — prostokąt
    oryginału), czyli i efekty obok postaci (krople, iskierki, żarówka, serduszka), a poza nią tylko największy
    kształt (sąsiednie klatki, podpisy); potem `onlyLargest`, `noSeat` (`without_seat` stroju z oknem `seat_hue`),
    `clean_smooth`, `pet`, `drop_halo` (klatka ciała z `halo`), `outline`. Portret (`portrait`) — bez `drop_halo`,
    za to bez resztek napisu nad ramką (`clear_caption`). Zwraca (obrazek, liczba pikseli usuniętych przez `drop_halo`,
    (xs, ys) — środki komórek obrazka w px arkusza, z pierścieniami `outline`; dla `noStool` klatek pochodnych)."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = e['rect']
    rect = [max(0, x0 - pad), max(0, y0 - pad), min(w - 1, x1 + pad), min(h - 1, y1 + pad)]
    keep_all = e['keep'] == 'all'
    if keep_all:
        # Wszystkie kształty w prostokącie (postać + efekty); ramka = cały prostokąt.
        box, margin, min_blob, hole_tol = rect, 0, 1, e['holeTolAll']
    else:
        box, margin, min_blob, hole_tol = X.tight_box(img, rect, bg), period / 2, 12, e['holeTol']
    cells, xs, ys = X.sample(img, box, period, e['sampleMode'], bg, e['bgTol'])
    if e['reduce'] == 2:
        cells, xs, ys = X.reduce2(cells, xs, ys, bg)
        period *= 2
    if e['hairTone']:
        cells = X.hair_tone(cells, *e['hairTone'])
    mask = X.background_mask(cells, bg, min_blob, hole_tol, e['halo']) | X.outside_box(xs, ys, box, margin)
    if keep_all:
        # Bez redukcji do największego kształtu podpisy klatek („1.”) i okruchy zostałyby — `erase` (px arkusza,
        # arkusz stroju wyrównany do oryginału) zdejmuje je jak w extract_sprites.
        erased = X.erase_mask(xs, ys, e['erase'])
        cells[erased] = bg
        mask |= erased
    im = X.to_rgba(X.quantise(cells, palette), mask, palette)
    # Środki komórek obrazka w px arkusza (jak `coords` w extract_sprites), przycinane razem z nim — dla `noSeat`,
    # `pet` i `noStool`.
    rows, cols = np.nonzero((~mask).any(axis=1))[0], np.nonzero((~mask).any(axis=0))[0]
    xs, ys = xs[cols[0]:cols[-1] + 1], ys[rows[0]:rows[-1] + 1]
    # Poza ramką oryginału zostaje tylko postać (największy kształt — szersza sukienka), sąsiednie klatki i podpisy
    # odpadają; efekty w ramce zostają. Ramka jak w extract_sprites: przy `keep` "all" — prostokąt oryginału,
    # inaczej ramka największego obiektu w ORYGINALNYM arkuszu + pół okresu (szersza spódnica poszerza ramkę
    # w arkuszu stroju i wciągałaby do niej podpisy klatek, np. „3.” przy bucie).
    if not keep_all:
        bx0, by0, bx1, by1 = X.tight_box(X.sheet(e['path']), e['rect'], np.array(e['background'], float))
        m = e['period'] / 2
        x0, y0, x1, y1 = max(x0, bx0 - m), max(y0, by0 - m), min(x1, bx1 + m), min(y1, by1 + m)
    inside = (((ys >= y0) & (ys <= y1))[:, None] & ((xs >= x0) & (xs <= x1))[None, :])
    _, shape = X.largest_shape(im)
    arr = np.array(im)
    arr[~inside & ~shape] = 0
    im, xs, ys = crop_opaque(arr, xs, ys)
    if e['onlyLargest']:
        # tylko postać: bez numerów klatek, nutek, kawałków sąsiednich rysunków (efekty odpadają też w oryginale)
        im, (ox, oy) = largest_only(im)
        xs, ys = xs[ox:ox + im.width], ys[oy:oy + im.height]
    if e['noSeat']:
        region = X.erase_mask(xs, ys, e['noSeat'])
        if e['seatMode'] == 'mask':
            # stołek z jasnymi prześwitami i cieniem: zostaje samo ubranie i buty, potem największy kształt
            im, (ox, oy) = largest_only(X.strip_region(im, region))
        else:
            im, (ox, oy) = without_seat(im, region, seat_hue, seat_prior(e, xs, ys))
        xs, ys = xs[ox:ox + im.width], ys[oy:oy + im.height]
    if e['sampleMode'] == 'smooth':
        im = X.clean_smooth(im)
    if e['pet']:
        im = mark_pet(im, xs, ys, e['pet'])
    removed = 0
    if halo and not portrait:
        arr, removed = drop_halo(im)
        im, xs, ys = crop_opaque(arr, xs, ys)
    if e['outline']:
        im = X.outer_outline(im, e['outline'])
        xs, ys = grow_coords(xs, len(e['outline'])), grow_coords(ys, len(e['outline']))
    assert im.size == (len(xs), len(ys)), e['rect']
    return (clear_caption(im) if portrait else im), removed, (xs, ys)


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


def restore_frame(im, base, edge=PORTRAIT_FRAME, corner=PORTRAIT_CORNER, search=3):
    """Portret: ramka z portretu ORYGINALNEGO (`base`). W arkuszu stroju podwójne cienkie linie ramki wypadają
    między pikselami siatki i po próbkowaniu z jednej strony (z dwóch boków) zlewają się w grube szare paski.
    Portret stroju przesunięty (±`search` px) tak, żeby jego ciemne piksele najlepiej pokryły ciemne linie ramki
    oryginału (zgadzają się ostre boki), przycięty do rozmiaru oryginału; pas `edge` px przy brzegach i narożniki
    `corner`×`corner` (ozdobne węzły ramki) — piksele oryginału. Zwraca obrazek o wymiarach oryginału; portret
    oryginalny bez ramki (drugi wiersz/kolumna od każdego brzegu nie są w >= 80% nieprzezroczyste) — `im` bez zmian."""
    b = np.array(base)
    o = np.array(im)
    h, w = b.shape[:2]
    op = b[:, :, 3] > 0
    if min(op[1].mean(), op[h - 2].mean(), op[:, 1].mean(), op[:, w - 2].mean()) < 0.8:
        return im
    band = np.zeros((h, w), bool)
    band[:edge], band[-edge:], band[:, :edge], band[:, -edge:] = True, True, True, True
    for ys in (slice(0, corner), slice(h - corner, h)):
        for xs in (slice(0, corner), slice(w - corner, w)):
            band[ys, xs] = True
    lum = lambda a: a[:, :, :3].astype(int) @ np.array([299, 587, 114]) / 1000
    line = band & (b[:, :, 3] > 0) & (lum(b) < 60)
    best, shifted = -1, None
    for dy in range(-search, search + 1):
        for dx in range(-search, search + 1):
            win = np.zeros_like(b)
            sy0, sx0 = max(0, dy), max(0, dx)
            sy1, sx1 = min(o.shape[0], dy + h), min(o.shape[1], dx + w)
            if sy1 <= sy0 or sx1 <= sx0:
                continue
            win[sy0 - dy:sy1 - dy, sx0 - dx:sx1 - dx] = o[sy0:sy1, sx0:sx1]
            score = int((line & (win[:, :, 3] > 0) & (lum(win) < 60)).sum())
            if score > best:
                best, shifted = score, win
    shifted[band] = b[band]
    return Image.fromarray(shifted, 'RGBA')


def body_meta(im, base, e):
    """Metadane klatki stroju: kotwica (środek czubka głowy albo, przy `anchor` "center", środek obrazka) i stopy
    jak w extract_sprites — z największego kształtu, skala z klatki bazowej; czubek głowy (`head_point`) tylko,
    gdy ma go klatka bazowa, a `noHat` przepisany z niej. Gdy włosów prawie nie widać (szerokość głowy poniżej
    HEAD_MIN_W szerokości z klatki bazowej — np. włosy zaczerwienione złością), czubek głowy jak w klatce bazowej
    względem kotwicy i stóp."""
    (_, sy0, _, sy1), shape = X.largest_shape(im)
    ax = im.width / 2 if e['anchor'] == 'center' else X.anchor_x(shape, sy0)
    meta = {'w': im.width, 'h': im.height, 'anchorX': round(ax, 2), 'foot': int(sy1) + 1, 'scale': base['scale']}
    if 'head' in base:
        arr = np.asarray(im).astype(int)
        head = X.head_point(X.wardrobe_classes(arr), arr[:, :, 3] > 0)
        bh = base['head']
        if head['w'] < HEAD_MIN_W * bh['w']:
            head = {'x': round(ax - (base['anchorX'] - bh['x']), 1),
                    'y': max(0, meta['foot'] - (base['foot'] - bh['y'])), 'w': bh['w']}
        meta['head'] = head
    if 'noHat' in base:
        meta['noHat'] = base['noHat']
    return meta


def align_bottoms(oid, aligned, frames, cut_ims):
    """`alignBottom` (`aligned`: klatka → wpis): kotwica wyrównana (`X.align_bottom`) do klatki wzorca tego samego
    stroju. Klatka bez wyciętego wzorca znika z `frames` i `cut_ims` (z ostrzeżeniem); zwraca nazwy takich klatek."""
    dropped = []
    for name, e in aligned.items():
        ref, rows = e['alignBottom']
        if ref not in frames:
            print(f'POMINIĘTA {oid}/{name}: alignBottom — strój nie ma klatki wzorca {ref}')
            del frames[name], cut_ims[name]
            dropped.append(name)
            continue
        body = {n: {'im': cut_ims[n], 'foot': frames[n]['foot'], 'anchorX': frames[n]['anchorX']} for n in (name, ref)}
        X.align_bottom(body, name, ref, rows)
        frames[name]['anchorX'] = round(body[name]['anchorX'], 2)
    return dropped


def base_coords(e):
    """Środki komórek (px arkusza) pikseli klatki ORYGINALNEJ: ta sama geometria co `collect` w extract_sprites
    (ramka, próbkowanie, `erase`, maska tła, przycięcie) na oryginalnym arkuszu — bez retuszu, który w oryginale
    mógłby zmienić obrys (to sprawdza `stool_rect` po rozmiarze PNG)."""
    img = X.sheet(e['path'])
    bg = np.array(e['background'], float)
    period = e['period']
    if e['keep'] == 'all':
        box, margin, min_blob, hole_tol = e['rect'], 0, 1, e['holeTolAll']
    else:
        box, margin, min_blob, hole_tol = X.tight_box(img, e['rect'], bg), period / 2, 12, e['holeTol']
    cells, xs, ys = X.sample(img, box, period, e['sampleMode'], bg, e['bgTol'])
    if e['reduce'] == 2:
        cells, xs, ys = X.reduce2(cells, xs, ys, bg)
    if e['hairTone']:
        cells = X.hair_tone(cells, *e['hairTone'])
    erased = X.erase_mask(xs, ys, e['erase'])
    cells[erased] = bg
    mask = (X.background_mask(cells, bg, min_blob, hole_tol, e['halo'], e['bgHsv'], e['bgHsvHole'])
            | X.outside_box(xs, ys, box, margin) | erased)
    rows, cols = np.nonzero((~mask).any(axis=1))[0], np.nonzero((~mask).any(axis=0))[0]
    return xs[cols[0]:cols[-1] + 1], ys[rows[0]:rows[-1] + 1]


def stool_rect(src_name, e, rect):
    """`noStool` klatki pochodnej ([x0, y0, x1, y1] w px klatki oryginalnej, koniec wyłącznie — jak `X.without_stool`)
    przeliczony na prostokąt w px arkusza: środki komórek oryginału z `base_coords`, ± pół okresu. Krawędź prostokąta
    leżąca na brzegu klatki oryginału nie ogranicza obszaru (sukienka bywa szersza niż dżinsy). Gdy geometria
    oryginału jest inna niż ta, którą odtwarza `base_coords` (rozmiar PNG się nie zgadza, opcje przycinające),
    zamiast prostokąta — powód (klatka pochodna pominięta z ostrzeżeniem). Zwraca (prostokąt albo None, powód)."""
    w, h = BASE_META['frames'][src_name]['w'], BASE_META['frames'][src_name]['h']
    bad = [k for k in ('onlyLargest', 'noSeat', 'outline', 'paint', 'mirror', 'flipX', 'pet') + X.RETOUCH_KEYS if e[k]]
    xs, ys = base_coords(e) if not bad else ([], [])
    if bad or (len(xs), len(ys)) != (w, h):
        return None, f'opcje {", ".join(bad)}' if bad else f'siatka {len(xs)}x{len(ys)}, PNG {w}x{h}'
    x0, y0, x1, y1 = rect
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
    half = float(xs[1] - xs[0]) / 2 if len(xs) > 1 else 0.5
    big = 1e9
    return [float(xs[x0]) - half if x0 > 0 else -big, float(ys[y0]) - half if y0 > 0 else -big,
            float(xs[x1 - 1]) + half if x1 < w else big, float(ys[y1 - 1]) + half if y1 < h else big], ''


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
        frames, portraits, cut_ims, cut_coords, seat_hues = {}, {}, {}, {}, {}
        for skey, over in ocfg['sheets'].items():
            img = X.sheet(str(sheet_path(oid, skey)))
            bg_cfg = over.get('background', 'auto')
            bg = np.array(auto_background(img) if bg_cfg == 'auto' else bg_cfg, float)
            pad = over.get('pad', DEFAULT_PAD)
            pairs, aligned = {}, {}
            for group, name, e in frames_on(skey, skip):
                period = over.get('gridPeriod', e['period'])
                if group == 'body':
                    im, halo_px, xy = cut(img, e, bg, period, pad, palette, halo=over.get('halo', True),
                                          seat_hue=seat_hue_of(over))
                    base = BASE_META['frames'][name]
                    if abs(im.height / base['h'] - 1) > SIZE_TOL or abs(im.width / base['w'] - 1) > WIDTH_TOL:
                        print(f'POMINIĘTA {oid}/{name}: {im.width}x{im.height} (oryginał {base["w"]}x{base["h"]})')
                        continue
                    frames[name] = body_meta(im, base, e)
                    if e['alignBottom']:
                        aligned[name] = e
                else:
                    im, halo_px, xy = cut(img, e, bg, period, over.get('portraitPad', PORTRAIT_PAD), palette,
                                          portrait=True)
                    bw, bh = BASE_META['portraits'][name]
                    if abs(im.width / bw - 1) > SIZE_TOL or abs(im.height / bh - 1) > SIZE_TOL:
                        print(f'POMINIĘTY {oid}/{name}: {im.width}x{im.height} (oryginał {bw}x{bh})')
                        continue
                    if over.get('portraitFrame', True):
                        im = restore_frame(im, Image.open(X.OUT_DIR / f'{name}.png').convert('RGBA'))
                    portraits[name] = [im.width, im.height]
                im.save(odir / f'{name}.png')
                cut_ims[name] = im
                cut_coords[name] = xy
                seat_hues[name] = seat_hue_of(over)
                pairs[name] = (Image.open(X.OUT_DIR / f'{name}.png').convert('RGBA'), im)
                halo_note = f'  obwódka -{halo_px} px' if halo_px else ''
                print(f'{oid}/{name:14s} {im.width:3d}x{im.height:3d}{halo_note}')
            for name in align_bottoms(oid, aligned, frames, cut_ims):
                (odir / f'{name}.png').unlink()
                del pairs[name]
            save_pair_preview(oid, skey, list(pairs.values()))
        derived_pairs = []
        for name, spec in CFG.get('derived', {}).items():
            if spec['from'] not in frames or X.matches(name, skip):
                continue
            im = cut_ims[spec['from']].copy()
            if 'noStool' in spec:
                src = X.entry(CFG['body'][spec['from']], 'body')
                rect, why = stool_rect(spec['from'], src, spec['noStool'])
                if rect is None:
                    print(f'POMINIĘTA {oid}/{name}: noStool nie da się przenieść na arkusz stroju ({why})')
                    continue
                region = X.erase_mask(*cut_coords[spec['from']], [rect])
                im, _ = without_seat(im, region, seat_hues[spec['from']], seat_prior(src, *cut_coords[spec['from']]),
                                     largest=False)
            im.save(odir / f'{name}.png')
            frames[name] = {**frames[spec['from']], 'w': im.width, 'h': im.height}
            derived_pairs.append((Image.open(X.OUT_DIR / f'{name}.png').convert('RGBA'), im))
            print(f'{oid}/{name:14s} <- {spec["from"]}')
        save_pair_preview(oid, 'derived', derived_pairs)
        meta[oid] = {'frames': frames, 'portraits': portraits}
        print(f'{oid}: klatek {len(frames)}, portretów {len(portraits)}')
    swap_in(TMP_DIR)
    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Klatki: {OUT_DIR}')
    print(f'Metadane: {META_PATH}')


if __name__ == '__main__':
    main()
