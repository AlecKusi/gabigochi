"""Dodaje ręcznie wygenerowane arkusze stroju: rozpoznaje szablon, skaluje do rozmiaru oryginału i dosuwa do niego.

Użycie: /c/gvenv/Scripts/python tools/import_outfit_sheets.py <id stroju> <folder z arkuszami> [--dry-run]

Każdy obrazek z folderu (jpg/png; nazwa pliku nie ma znaczenia) jest porównywany ze wszystkimi szablonami
(arkusze z klatkami Gabi z tools/frames.json): sylwetki po przeskalowaniu do rozmiaru szablonu, IoU na zmniejszonych
maskach. Wygrywa szablon o największym IoU; potem dosunięcie ±12 px (`generate_outfit_sheets.align`) i zapis do
assets/source/stroje/<id>/<klucz>.jpg. Dwa pliki pasujące do tego samego szablonu — zostaje lepszy (ostrzeżenie).
Plansze 2×2 (tools/outfit_boards.py) są rozpoznawane tak samo i rozcinane na cztery arkusze.
Klucze dopisz w `outfits.<id>.sheets` (tools/frames.json) i uruchom tools/extract_outfits.py.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_outfit_sheets as G  # noqa: E402
import outfit_boards as B  # noqa: E402

# Arkusze z klatkami Gabi w codziennym ubraniu (bez łóżka, łazienki, piany, prysznica).
TEMPLATES = ['main', 'turnaround', 'back', 'status', 'expressions', 'sitting', 'table', 'lying', 'hobby', 'nursing',
             'cat', 'drink', 'drag', 'plants2', 'karaoke', 'ukulele', 'teethcomb', 'laundry', 'birthday']
SMALL = 4


def small_mask(im, size):
    """Maska sylwetek obrazka przeskalowanego do `size`, zmniejszona SMALL razy (szybkie porównanie)."""
    w, h = size
    arr = np.asarray(im.convert('RGB').resize((w // SMALL, h // SMALL), Image.BILINEAR)).astype(int)
    return G.fg_mask(arr)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        sys.exit(__doc__)
    outfit, folder = args[0], Path(args[1])
    dry = '--dry-run' in sys.argv
    templates = {k: Image.open(G.template_path(k)) for k in TEMPLATES}
    # wzorce do rozpoznania: pojedyncze arkusze i plansze 2×2 (tools/outfit_boards.py)
    refs = {k: t for k, t in templates.items()}
    refs.update({f'plansza_{b}': B.build(b) for b in B.BOARDS})
    rmasks = {k: small_mask(t, t.size) for k, t in refs.items()}
    chosen = {}

    def take(key, score, path, im):
        if key in chosen and chosen[key][0] >= score:
            print(f'  UWAGA: {key} już ma lepszy plik ({chosen[key][1].name}) — pomijam')
            return
        if key in chosen:
            print(f'  UWAGA: {key} — zastępuję {chosen[key][1].name}')
        chosen[key] = (score, path, im)

    for path in sorted(folder.iterdir()):
        if path.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
            continue
        im = Image.open(path)
        scores = []
        for k, t in refs.items():
            if abs(im.width / im.height - t.width / t.height) > 0.08:
                continue
            m = small_mask(im, t.size)
            scores.append(((rmasks[k] & m).sum() / max(1, (rmasks[k] | m).sum()), k))
        scores.sort(reverse=True)
        if not scores:
            print(f'{path.name}: brak szablonu o tych proporcjach')
            continue
        (best, key), runner = scores[0], scores[1] if len(scores) > 1 else (0, '-')
        print(f'{path.name:24s} -> {key:12s} IoU {best:.3f} (następny: {runner[1]} {runner[0]:.3f})')
        if key.startswith('plansza_'):
            for part_key, part in B.split(im, key.removeprefix('plansza_')).items():
                m = small_mask(part, part.size)
                t = rmasks[part_key]
                score = (t & m).sum() / max(1, (t | m).sum())
                print(f'  {part_key:12s} z planszy: IoU {score:.3f}')
                take(part_key, score, path, part)
        else:
            take(key, best, path, im)
    dest_dir = G.SRC_DIR / outfit
    for key, (_, path, im) in sorted(chosen.items()):
        aligned, iou, dx, dy = G.align(im, templates[key])
        print(f'{key:12s} <- {path.name}: IoU {iou:.3f}, przesunięcie ({dx}, {dy})')
        if not dry:
            dest_dir.mkdir(parents=True, exist_ok=True)
            aligned.save(dest_dir / f'{key}.jpg', 'JPEG', quality=95)
    missing = [k for k in TEMPLATES if k not in chosen]
    print(f'Brak arkuszy: {", ".join(missing)}')


if __name__ == '__main__':
    main()
