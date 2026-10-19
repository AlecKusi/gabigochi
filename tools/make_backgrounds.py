"""Tła balkonu w porach roku: obrazki od użytkownika → 128×160 px gry (public/backgrounds/).

Wejście: assets/source/bg-{wiosna,lato,jesien,zima}-{dzien,noc}.jpg (namalowane „pixel art” w dużej rozdzielczości,
proporcje ~0,747). Każdy piksel gry = mediana środka swojej komórki (krawędzie komórek w JPG są rozmyte);
lekkie spłaszczenie w pionie do proporcji 0,8 — zostaje daszek u góry i podłoga u dołu.
Szary pas na dole (artefakt generatora, np. „jesień dzień”) zastępujemy powieleniem ostatniego dobrego rzędu.

Uruchom: python tools/make_backgrounds.py            (zapis + podgląd tools/out/backgrounds_preview.png)
         python tools/make_backgrounds.py --selftest (sprawdzenie bez zapisu)
"""
import argparse
import colorsys
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'source')
OUT = os.path.join(ROOT, 'public', 'backgrounds')
PREVIEW = os.path.join(ROOT, 'tools', 'out', 'backgrounds_preview.png')
W, H = 128, 160
SEASONS = {'wiosna': 'spring', 'lato': 'summer', 'jesien': 'autumn', 'zima': 'winter'}
TIMES = {'dzien': 'day', 'noc': 'night'}
# ile dolnych rzędów sprawdzamy pod kątem szarego pasa
BAND_ROWS = 12


def cell_median(im: Image.Image) -> np.ndarray:
    """Obrazek → W×H: każdy piksel to mediana środkowej połowy komórki (bez rozmytych brzegów)."""
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    h, w, _ = a.shape
    out = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0, y1 = int(y * h / H), int((y + 1) * h / H)
        cy0, cy1 = y0 + (y1 - y0) // 4, max(y0 + (y1 - y0) // 4 + 1, y1 - (y1 - y0) // 4)
        for x in range(W):
            x0, x1 = int(x * w / W), int((x + 1) * w / W)
            cx0, cx1 = x0 + (x1 - x0) // 4, max(x0 + (x1 - x0) // 4 + 1, x1 - (x1 - x0) // 4)
            blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3)
            out[y, x] = np.median(blk, axis=0)
    return out


def grey_row(row: np.ndarray) -> bool:
    """Rząd jednolity i szarawy (artefakt): prawie zerowa zmienność i niskie nasycenie (prawdziwa podłoga ma deski)."""
    sats = [colorsys.rgb_to_hsv(*(c / 255.0))[1] for c in row]
    return float(np.mean(sats)) < 0.25 and float(row.std(axis=0).mean()) < 3


def fix_bottom_band(px: np.ndarray) -> int:
    """Szare rzędy na dole → kopia ostatniego dobrego rzędu. Zwraca liczbę poprawionych rzędów."""
    fixed = 0
    for y in range(H - 1, H - 1 - BAND_ROWS, -1):
        if not grey_row(px[y]):
            break
        fixed += 1
    if fixed:
        good = px[H - 1 - fixed].copy()
        for y in range(H - fixed, H):
            px[y] = good
    return fixed


def build() -> dict:
    result = {}
    for pl, season in SEASONS.items():
        for plt, time in TIMES.items():
            path = os.path.join(SRC, f'bg-{pl}-{plt}.jpg')
            if not os.path.exists(path):
                raise FileNotFoundError(path)
            px = cell_median(Image.open(path))
            fixed = fix_bottom_band(px)
            result[f'{season}-{time}'] = (px, fixed)
    return result


def selftest(result: dict) -> None:
    assert len(result) == 8, result.keys()
    for name, (px, _) in result.items():
        assert px.shape == (H, W, 3), (name, px.shape)
        assert not grey_row(px[H - 1]), f'{name}: szary dół'
    # słońce w dzień ma zostać ciepłe i jasne (nie szare): w górnej 1/3 jest jasny piksel z przewagą czerwieni nad niebieskim
    for season in SEASONS.values():
        px = result[f'{season}-day'][0][: H // 3].astype(int)
        r, g, b = px[..., 0], px[..., 1], px[..., 2]
        assert (((r + g) / 2 > 185) & (r > b + 40)).any(), f'{season}-day: brak słońca'
    print('selftest OK')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()
    result = build()
    selftest(result)
    if args.selftest:
        return
    os.makedirs(OUT, exist_ok=True)
    order = [f'{s}-{t}' for t in TIMES.values() for s in SEASONS.values()]
    sheet = Image.new('RGB', (4 * (W * 2 + 8), 2 * (H * 2 + 8)), (40, 30, 60))
    for i, name in enumerate(order):
        px, fixed = result[name]
        img = Image.fromarray(px)
        img.save(os.path.join(OUT, f'{name}.png'), optimize=True)
        sheet.paste(img.resize((W * 2, H * 2), Image.NEAREST), ((i % 4) * (W * 2 + 8), (i // 4) * (H * 2 + 8)))
        print(f'{name}: zapisano' + (f' (poprawiony szary pas: {fixed} rz.)' if fixed else ''))
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    sheet.save(PREVIEW)
    print('podgląd:', PREVIEW)


if __name__ == '__main__':
    sys.exit(main())
