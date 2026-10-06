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
Podgląd przed/po: tools/out/bag_before_after.png.

Paleta (k-means wszystkich klatek) jest zamrożona w tools/palette.json — usunięcie albo dodanie klatki nie
przebarwia pozostałych. `--palette` liczy ją od nowa z bieżących klatek.

Arkusz z `"align": wzorzec` — po wycięciu każda klatka arkusza jest przesuwana (całkowite px natywne) tak,
żeby jej łóżko pokryło się z łóżkiem wzorca; przesunięcie trafia do `anchorX`/`foot` (patrz `align_sheet`).
"""
import colorsys
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
RETOUCH_KEYS = ('bag', 'wipe', 'cut', 'copy', 'fix')
LIST_KEYS = ('erase', 'paint') + RETOUCH_KEYS
ALIGN_SEARCH = 20
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
        'keep': sh.get('keep', 'largest'),
        'sheet': name,
        'anchor': sh.get('anchor', 'head'),
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


def sample(img, box, period):
    """Próbkuje siatkę pikseli o danym okresie: mediana środka każdej komórki.

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
    inset = period * 0.25
    for j in range(h):
        ya = int(round(oy + j * period + inset))
        yb = max(ya + 1, int(round(oy + (j + 1) * period - inset)))
        for i in range(w):
            xa = int(round(ox + i * period + inset))
            xb = max(xa + 1, int(round(ox + (i + 1) * period - inset)))
            out[j, i] = np.median(reg[ya:yb, xa:xb].reshape(-1, 3), axis=0)
    xs = rx0 + ox + (np.arange(w) + 0.5) * period
    ys = ry0 + oy + (np.arange(h) + 0.5) * period
    return out, xs, ys


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


def background_mask(cells, bg, min_blob=12, hole_tol=None):
    """Tło: komórki bliskie tłu spójne z brzegiem albo dziury >= 6 komórek.

    `hole_tol`: dziura (nie przy brzegu) jest tłem tylko, gdy jej średnia różnica od tła < hole_tol —
    jasne refleksy włosów i koszuli nocnej są blisko tła, ale wyraźnie mniej jednolite niż prawdziwe tło.
    """
    diff = np.abs(cells - bg).sum(axis=2)
    near = diff < 30
    h, w = near.shape
    mask = np.zeros((h, w), bool)
    for comp in components(near, NEIGH4):
        touches_edge = any(y in (0, h - 1) or x in (0, w - 1) for y, x in comp)
        is_hole = len(comp) >= 6 and (hole_tol is None or np.mean([diff[p] for p in comp]) < hole_tol)
        if touches_edge or is_hole:
            for p in comp:
                mask[p] = True
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


def load_palette(pixels):
    """Wspólna paleta: zamrożona w PALETTE_PATH; liczona (k-means) i zapisywana, gdy jej brak albo `--palette`."""
    if PALETTE_PATH.exists() and '--palette' not in sys.argv:
        return np.array(json.loads(PALETTE_PATH.read_text(encoding='utf-8')), float)
    palette = kmeans(pixels, CFG['paletteSize'])
    rows = ',\n'.join('  ' + json.dumps([float(v) for v in c]) for c in palette)
    PALETTE_PATH.write_text(f'[\n{rows}\n]\n', encoding='utf-8')
    print(f'Nowa paleta: {PALETTE_PATH}')
    return palette


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
    return idx, mask


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


def group_of(name):
    """Grupa klatek: nazwa bez końcowych cyfr (walk_a1 → walk_a)."""
    return re.sub(r'\d+$', '', name)


def main():
    raw = {}
    for group in ('body', 'portraits'):
        for name, spec in CFG[group].items():
            e = entry(spec, group)
            img = sheet(e['path'])
            bg = np.array(e['background'], float)
            period = e['period']
            if e['keep'] == 'all':
                # Wszystkie kształty w prostokącie (postać + efekty); ramka = cały prostokąt.
                box, margin, min_blob, hole_tol = e['rect'], 0, 1, 15
            else:
                box, margin, min_blob, hole_tol = tight_box(img, e['rect'], bg), period / 2, 12, None
            # Arkusz ma jedną siatkę pikseli dla całej postaci — próbkujemy ją wprost, bez przeskalowania.
            cells, xs, ys = sample(img, box, period)
            erased = erase_mask(xs, ys, e['erase'])
            cells[erased] = bg
            mask = background_mask(cells, bg, min_blob, hole_tol) | outside_box(xs, ys, box, margin) | erased
            for *rect, color in e['paint']:
                painted = erase_mask(xs, ys, [rect])
                cells[painted] = color
                mask[painted] = False
            raw[name] = (group, e, cells, mask, xs, ys)
            print(f'{name:12s} arkusz={e["sheet"]:6s} okres={period:.2f} komórki={cells.shape[1]}x{cells.shape[0]}')

    palette = load_palette(np.concatenate([c[~m] for _, _, c, m, _, _ in raw.values()]))
    quantised = {name: (quantise(cells, palette), mask, xs, ys) for name, (_, _, cells, mask, xs, ys) in raw.items()}
    images = {}
    retouched = []
    for name, (group, e, *_) in raw.items():
        idx, mask, xs, ys = quantised[name]
        if any(e[k] for k in RETOUCH_KEYS):
            before = to_rgba(idx, mask, palette)
            idx, mask = retouch(idx, mask, xs, ys, e, palette, quantised)
            retouched.append((name, before, to_rgba(idx, mask, palette)))
        images[name] = (group, e, to_rgba(idx, mask, palette))
    save_bag_preview(retouched)

    # Największy kształt każdej klatki ciała: wysokość ciała, stopy, kotwica.
    body = {}
    for name, (group, e, im) in images.items():
        if group != 'body':
            continue
        (sx0, sy0, sx1, sy1), shape = largest_shape(im)
        ax = im.width / 2 if e['anchor'] == 'center' else anchor_x(shape, sy0)
        body[name] = {'im': im, 'e': e, 'bodyH': sy1 - sy0 + 1, 'foot': int(sy1) + 1, 'anchorX': ax}

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
        ref = sh['scaleRef']
        sheet_scale[sname] = display_h / float(body[ref]['bodyH'])
        print(f'arkusz {sname:7s} wzorzec={ref} wysokość ciała={body[ref]["bodyH"]} skala={sheet_scale[sname]:.3f}')
    for sname, sh in CFG.get('sheets', {}).items():
        if 'align' in sh:
            align_sheet(body, sname, sh['align'])

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

    META_PATH.parent.mkdir(parents=True, exist_ok=True)
    meta = {'displayHeight': display_h, 'frames': frames, 'body': sorted(body), 'portraits': portraits}
    META_PATH.write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')
    save_preview(preview)
    save_preview_new(preview_new)
    save_drag_x4([body[n]['im'] for n in ('drag_2', 'drag_3', 'drag_4', 'drag_5')])
    print(f'Podgląd: {PREVIEW}, {PREVIEW_NEW}, {DRAG_X4}, {BED_ALIGNED}, {BAG_PREVIEW}')


if __name__ == '__main__':
    main()
