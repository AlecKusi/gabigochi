"""Plansze 2×2 do generowania strojów: cztery szablony w jednym obrazku (mniej wrzucania do Gemini).

Użycie: /c/gvenv/Scripts/python tools/outfit_boards.py <folder wyjściowy>
Zapisuje plansza_A.jpg … plansza_D.jpg (arkusze z BOARDS) i szablon_main.jpg (arkusz główny generuje się osobno,
najpierw — on ustala wygląd stroju). Gotowe plansze z Gemini rozpoznaje i rozcina tools/import_outfit_sheets.py
(`split_board`): wynik skalowany do rozmiaru planszy, komórki wycinane i skalowane do rozmiaru oryginalnych arkuszy.
"""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_outfit_sheets as G  # noqa: E402

# Plansze: cztery arkusze o tych samych proporcjach (A–C pionowe 3:4, D poziome 4:3; ukulele 16:9 z marginesem).
BOARDS = {
    'A': ['turnaround', 'sitting', 'back', 'status'],
    'B': ['expressions', 'table', 'lying', 'plants2'],
    'C': ['hobby', 'cat', 'karaoke', 'drag'],
    'D': ['drink', 'teethcomb', 'laundry', 'ukulele'],
}
PORTRAIT_CELL = (765, 1024)
LANDSCAPE_CELL = (1024, 765)
GAP = 24
BG = (205, 206, 211)


def cell_size(board):
    return LANDSCAPE_CELL if board == 'D' else PORTRAIT_CELL


def cells(board):
    """[(klucz arkusza, (x0, y0, x1, y1) komórki w planszy)] i rozmiar planszy."""
    cw, ch = cell_size(board)
    out = []
    for i, key in enumerate(BOARDS[board]):
        x, y = (i % 2) * (cw + GAP), (i // 2) * (ch + GAP)
        out.append((key, (x, y, x + cw, y + ch)))
    return out, (2 * cw + GAP, 2 * ch + GAP)


def fit(im, size):
    """Arkusz wpasowany w komórkę (proporcje zachowane, reszta tłem) i prostokąt, który zajmuje."""
    cw, ch = size
    f = min(cw / im.width, ch / im.height)
    w, h = round(im.width * f), round(im.height * f)
    box = ((cw - w) // 2, (ch - h) // 2)
    cell = Image.new('RGB', size, BG)
    cell.paste(im.convert('RGB').resize((w, h), Image.LANCZOS), box)
    return cell, (box[0], box[1], box[0] + w, box[1] + h)


def build(board):
    parts, size = cells(board)
    out = Image.new('RGB', size, BG)
    for key, (x0, y0, x1, y1) in parts:
        cell, _ = fit(Image.open(G.template_path(key)), (x1 - x0, y1 - y0))
        out.paste(cell, (x0, y0))
    return out


def split(im, board):
    """Plansza z Gemini → {klucz: arkusz w rozmiarze oryginału} (bez dosuwania — robi to `G.align`)."""
    parts, size = cells(board)
    im = im.convert('RGB').resize(size, Image.LANCZOS)
    out = {}
    for key, (x0, y0, x1, y1) in parts:
        orig = Image.open(G.template_path(key))
        _, (ix0, iy0, ix1, iy1) = fit(orig, (x1 - x0, y1 - y0))
        out[key] = im.crop((x0 + ix0, y0 + iy0, x0 + ix1, y0 + iy1)).resize(orig.size, Image.LANCZOS)
    return out


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    dest = Path(sys.argv[1])
    dest.mkdir(parents=True, exist_ok=True)
    for b in BOARDS:
        build(b).save(dest / f'plansza_{b}.jpg', 'JPEG', quality=95)
        print(f'plansza_{b}.jpg: {", ".join(BOARDS[b])}')
    Image.open(G.template_path('main')).convert('RGB').save(dest / 'szablon_main.jpg', 'JPEG', quality=95)


if __name__ == '__main__':
    main()
