"""Wycina klatki postaci z arkuszy i zapisuje czyste PNG w natywnej rozdzielczości (przycięte do obrysu).

Użycie: /c/gvenv/Scripts/python tools/extract_sprites.py
Konfiguracja: tools/frames.json

Arkusze: domyślny `main` (pola `sheet`, `background`, `gridPeriod` na górze pliku) oraz sekcja `sheets`.
Wpis klatki: [x0,y0,x1,y1] (arkusz main) albo {"sheet": nazwa, "rect": [...], "erase": [...]}.
`erase` — prostokąty [x0,y0,x1,y1] albo wielokąty [[x,y],...] w px arkusza, wymazywane do przezroczystości.
"""
import json
import re
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / 'tools' / 'frames.json').read_text(encoding='utf-8'))
OUT_DIR = ROOT / 'public' / 'sprites'
META_PATH = ROOT / 'src' / 'sprites' / 'frames.generated.json'
PREVIEW = ROOT / 'tools' / 'out' / 'preview.png'
PREVIEW_NEW = ROOT / 'tools' / 'out' / 'preview_new.png'
DRAG_X4 = ROOT / 'tools' / 'out' / 'drag_x4.png'
NEIGH4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
NEIGH8 = tuple((dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
_sheets = {}


def sheet(path):
    if path not in _sheets:
        _sheets[path] = np.asarray(Image.open(ROOT / path).convert('RGB')).astype(float)
    return _sheets[path]


def entry(spec, group):
    """Wpis klatki jako słownik: path, rect, background, period, keep, erase, sheet, anchor."""
    if isinstance(spec, list):
        spec = {'rect': spec}
    name = spec.get('sheet', 'main')
    sh = CFG.get('sheets', {}).get(name, {})
    default_period = CFG['gridPeriod'] if group == 'body' else CFG['portraitPeriod']
    return {
        'path': sh.get('path', CFG['sheet']),
        'rect': spec['rect'],
        'background': spec.get('background', sh.get('background', CFG['background'])),
        'period': sh.get('gridPeriod', default_period),
        'keep': sh.get('keep', 'largest'),
        'erase': spec.get('erase', []),
        'sheet': name,
        'anchor': sh.get('anchor', 'head'),
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


def to_rgba(cells, mask, palette):
    idx = ((cells[:, :, None, :] - palette[None, None]) ** 2).sum(axis=3).argmin(axis=2)
    rgb = palette[idx].round().astype(np.uint8)
    alpha = np.where(mask, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    return img.crop(img.getbbox())


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
            mask = background_mask(cells, bg, min_blob, hole_tol) |outside_box(xs, ys, box, margin) | erased
            raw[name] = (group, e, cells, mask)
            print(f'{name:12s} arkusz={e["sheet"]:6s} okres={period:.2f} komórki={cells.shape[1]}x{cells.shape[0]}')

    pixels = np.concatenate([c[~m] for _, _, c, m in raw.values()])
    palette = kmeans(pixels, CFG['paletteSize'])
    images = {name: (group, e, to_rgba(c, m, palette)) for name, (group, e, c, m) in raw.items()}

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
    print(f'Podgląd: {PREVIEW}, {PREVIEW_NEW}, {DRAG_X4}')


if __name__ == '__main__':
    main()
