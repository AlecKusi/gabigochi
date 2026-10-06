"""Wycina klatki postaci z arkusza i zapisuje czyste PNG w natywnej rozdzielczości (przycięte do obrysu).

Użycie: tools/.venv/Scripts/python tools/extract_sprites.py
Konfiguracja: tools/frames.json
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
NEIGH4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
NEIGH8 = tuple((dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
_sheets = {}


def sheet(path):
    if path not in _sheets:
        _sheets[path] = np.asarray(Image.open(ROOT / path).convert('RGB')).astype(float)
    return _sheets[path]


def entry(spec):
    """Wpis klatki: [x0,y0,x1,y1] albo {"sheet":..., "rect":[...], "background":[r,g,b]}."""
    if isinstance(spec, list):
        return CFG['sheet'], spec, CFG['background']
    return spec.get('sheet', CFG['sheet']), spec['rect'], spec.get('background', CFG['background'])


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


def outside_box(xs, ys, box, period):
    """Maska komórek, których środek leży poza ramką obiektu powiększoną o pół okresu."""
    x0, y0, x1, y1 = box
    margin = period / 2
    out_x = (xs < x0 - margin) | (xs > x1 + margin)
    out_y = (ys < y0 - margin) | (ys > y1 + margin)
    return out_y[:, None] | out_x[None, :]


def background_mask(cells, bg):
    near = np.abs(cells - bg).sum(axis=2) < 30
    h, w = near.shape
    mask = np.zeros((h, w), bool)
    for comp in components(near, NEIGH4):
        touches_edge = any(y in (0, h - 1) or x in (0, w - 1) for y, x in comp)
        if touches_edge or len(comp) >= 6:
            for p in comp:
                mask[p] = True
    for comp in components(~mask, NEIGH8):
        if len(comp) < 12:
            for p in comp:
                mask[p] = True
    return mask


def kmeans(px, k, iters=15):
    rng = np.random.default_rng(1)
    centers = px[rng.choice(len(px), k, replace=False)].copy()
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


def anchor_x(img):
    """Środek czubka głowy (pierwsze wiersze) — stabilny punkt między klatkami."""
    alpha = np.asarray(img)[:CFG['anchorRows'], :, 3]
    xs = np.nonzero(alpha)[1]
    return float(xs.mean()) if len(xs) else img.width / 2


def save_preview(items):
    """Podgląd: każda klatka powiększona NN o round(3 × skala), wyrównana do wspólnej linii stóp."""
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    scaled = []
    for im, scale in items:
        f = max(1, int(round(3 * scale)))
        scaled.append(im.resize((im.width * f, im.height * f), Image.NEAREST))
    width = sum(im.width + 10 for im in scaled) + 10
    top = max(im.height for im in scaled)
    sheet_img = Image.new('RGBA', (width, top + 20), (255, 255, 255, 255))
    x = 10
    for im in scaled:
        sheet_img.alpha_composite(im, (x, 10 + top - im.height))
        x += im.width + 10
    sheet_img.save(PREVIEW)


def group_of(name):
    """Grupa klatek: nazwa bez końcowych cyfr (walk_a1 → walk_a)."""
    return re.sub(r'\d+$', '', name)


def main():
    raw = {}
    for group in ('body', 'portraits'):
        for name, spec in CFG[group].items():
            path, rect, bg = entry(spec)
            img = sheet(path)
            bg = np.array(bg, float)
            box = tight_box(img, rect, bg)
            # Arkusz ma jedną siatkę pikseli dla całej postaci — próbkujemy ją wprost, bez przeskalowania.
            period = CFG['gridPeriod'] if group == 'body' else CFG['portraitPeriod']
            cells, xs, ys = sample(img, box, period)
            mask = background_mask(cells, bg) | outside_box(xs, ys, box, period)
            raw[name] = (group, cells, mask)
            print(f'{name:12s} okres={period:.2f} komórki={cells.shape[1]}x{cells.shape[0]}')

    pixels = np.concatenate([c[~m] for _, c, m in raw.values()])
    palette = kmeans(pixels, CFG['paletteSize'])
    images = {name: (group, to_rgba(c, m, palette)) for name, (group, c, m) in raw.items()}

    body = {n: im for n, (g, im) in images.items() if g == 'body'}
    display_h = CFG['displayHeight']
    heights = {}
    for name, im in body.items():
        heights.setdefault(group_of(name), []).append(im.height)
    group_scale = {g: display_h / float(np.median(hs)) for g, hs in heights.items()}
    for g in sorted(heights):
        print(f'grupa {g:11s} mediana wysokości={float(np.median(heights[g])):.1f} skala={group_scale[g]:.3f}')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    frames = {}
    preview = []
    for name in sorted(body):
        im = body[name]
        scale = group_scale[group_of(name)]
        im.save(OUT_DIR / f'{name}.png')
        frames[name] = {'w': im.width, 'h': im.height, 'anchorX': round(anchor_x(im), 2), 'scale': round(scale, 4)}
        preview.append((im, scale))

    portraits = {}
    for name, (group, im) in images.items():
        if group == 'portraits':
            im.save(OUT_DIR / f'{name}.png')
            portraits[name] = [im.width, im.height]
            preview.append((im, 1.0))

    META_PATH.parent.mkdir(parents=True, exist_ok=True)
    meta = {'displayHeight': display_h, 'frames': frames, 'body': sorted(body), 'portraits': portraits}
    META_PATH.write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')
    save_preview(preview)
    print(f'Podgląd: {PREVIEW}')


if __name__ == '__main__':
    main()
