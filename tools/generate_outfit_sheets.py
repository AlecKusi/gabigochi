"""Generuje arkusze stroju przez Gemini API (Nano Banana): oryginalny arkusz z gry przerysowany z Gabi w stroju.

Użycie:
  /c/gvenv/Scripts/python tools/generate_outfit_sheets.py goth_lolita --sheets sitting,turnaround [--tries 2]
      [--model gemini-3-pro-image] [--size 2K] [--dry-run]

Klucz API: zmienna środowiskowa GEMINI_API_KEY albo plik ~/.gabigochi/gemini-key.txt (jedna linia). Skrypt nigdy
go nie wypisuje. Klucz zakłada i wpisuje użytkownik (Google AI Studio, z włączonymi płatnościami).

Dla każdego arkusza (klucz jak w `sheets` tools/frames.json, `main` = sprite-sheet.jpg):
1. do modelu idą: opis, oryginalny arkusz (szablon układu) i główny arkusz stroju
   (assets/source/stroje/<id>/main.jpg — wzór wyglądu); opis stroju z `outfits.<id>.desc` w frames.json;
2. `--tries` prób; każda przeskalowana do rozmiaru oryginału i dosunięta (±12 px) do oryginału tak, żeby sylwetki
   pokrywały się najlepiej; ocena = IoU sylwetek z oryginałem (te same miejsca postaci). Poniżej MIN_IOU — odrzut;
3. najlepsza próba → assets/source/stroje/<id>/<klucz>.jpg; wszystkie próby w tools/out/kandydaci/<id>/.
Potem: /c/gvenv/Scripts/python tools/extract_outfits.py i podgląd tools/out/stroj_<id>_<klucz>.png.
`--dry-run` — bez wysyłania: zapisuje treść zapytania (bez obrazków) do tools/out/kandydaci/<id>/<klucz>_request.json.
"""
import argparse
import base64
import io
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / 'tools' / 'frames.json').read_text(encoding='utf-8'))
SRC_DIR = ROOT / 'assets' / 'source' / 'stroje'
CAND_DIR = ROOT / 'tools' / 'out' / 'kandydaci'
KEY_FILE = Path.home() / '.gabigochi' / 'gemini-key.txt'
API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
DEFAULT_MODEL = 'gemini-3-pro-image'
# Cena za obrazek wyjściowy (USD, cennik Gemini API 2026-10) — tylko do podsumowania kosztu.
PRICE = {'gemini-3-pro-image': 0.134, 'gemini-nano-banana-2.1': 0.0504, 'gemini-3.1-flash-image': 0.101}
RATIOS = {'3:4': 3 / 4, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1.0, '2:3': 2 / 3, '3:2': 3 / 2}
MIN_IOU = 0.55
SHIFT = 12

PROMPT = """You are given two images.
Image 1 is a pixel-art sprite sheet of a character (the TEMPLATE).
Image 2 shows the same character wearing a new outfit (the OUTFIT REFERENCE).

Redraw image 1 exactly, with the same canvas and composition: every figure in the same position, at the same size,
in the same pose and facing the same direction; all props (cups, phones, food, cat, instruments, furniture, effects)
unchanged; all text labels and numbers unchanged; the same flat light-grey background. Do not add, remove or move
anything.

Change ONLY the character's clothing: wherever she wears the black T-shirt and dark jeans (and the shoulder bag),
dress her instead in the outfit from image 2: {desc}. Remove the shoulder bag. Keep any other costume (pajamas,
towel, nurse uniform, bath foam) as it is. Keep her lavender bob hair, round glasses, face, skin tone and body
proportions exactly as in image 1. The same outfit on every figure. Crisp pixel art with clean dark outlines,
no blur, no anti-aliased soft edges."""


def api_key():
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key and KEY_FILE.exists():
        key = KEY_FILE.read_text(encoding='utf-8').strip()
    if not key:
        sys.exit(f'Brak klucza: ustaw GEMINI_API_KEY albo zapisz klucz w {KEY_FILE}')
    return key


def template_path(key):
    if key == 'main':
        return ROOT / CFG['sheet']
    sh = CFG.get('sheets', {}).get(key)
    if not sh:
        sys.exit(f'Nieznany arkusz: {key}')
    return ROOT / sh['path']


def b64_jpeg(im, max_side=2048):
    im = im.convert('RGB')
    if max(im.size) > max_side:
        f = max_side / max(im.size)
        im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=95)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def closest_ratio(w, h):
    r = w / h
    return min(RATIOS, key=lambda k: abs(RATIOS[k] - r))


def find_image(obj):
    """Ostatni obrazek (base64) w odpowiedzi — Interactions API: blok {type: image, data}; zapas: inline_data."""
    found = []

    def walk(o):
        if isinstance(o, dict):
            data = o.get('data')
            mime = o.get('mime_type') or o.get('mimeType') or ''
            if isinstance(data, str) and len(data) > 1000 and (o.get('type') == 'image' or mime.startswith('image/')):
                found.append(data)
            for k in ('inline_data', 'inlineData'):
                if isinstance(o.get(k), dict) and isinstance(o[k].get('data'), str):
                    found.append(o[k]['data'])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(obj)
    return found[-1] if found else None


def strip_data(obj):
    """Odpowiedź bez danych obrazków (do zapisu przy błędzie)."""
    if isinstance(obj, dict):
        return {k: ('<…>' if k == 'data' and isinstance(v, str) and len(v) > 200 else strip_data(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [strip_data(v) for v in obj]
    return obj


def request(key, body):
    req = urllib.request.Request(API_URL, data=json.dumps(body).encode('utf-8'), method='POST',
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:2000]
        raise RuntimeError(f'HTTP {e.code}: {detail}') from None


def fg_mask(arr):
    bg = np.median(arr[:20, :20].reshape(-1, 3), axis=0)
    return np.abs(arr - bg).sum(axis=2) > 60


def align(cand, orig):
    """Próba przeskalowana do rozmiaru oryginału i przesunięta (±SHIFT px, krok 2) na najlepsze IoU sylwetek."""
    cand = cand.convert('RGB').resize(orig.size, Image.LANCZOS)
    a = np.asarray(orig.convert('RGB')).astype(int)
    b = np.asarray(cand).astype(int)
    A, B = fg_mask(a), fg_mask(b)
    best = (-1.0, 0, 0)
    for dy in range(-SHIFT, SHIFT + 1, 2):
        for dx in range(-SHIFT, SHIFT + 1, 2):
            Bs = np.roll(np.roll(B, dy, 0), dx, 1)
            iou = (A & Bs).sum() / max(1, (A | Bs).sum())
            if iou > best[0]:
                best = (float(iou), dx, dy)
    iou, dx, dy = best
    if dx or dy:
        bg = tuple(int(v) for v in np.median(b[:20, :20].reshape(-1, 3), axis=0))
        moved = Image.new('RGB', cand.size, bg)
        moved.paste(cand, (dx, dy))
        cand = moved
    return cand, iou, dx, dy


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('outfit')
    ap.add_argument('--sheets', required=True, help='klucze arkuszy po przecinku')
    ap.add_argument('--tries', type=int, default=2)
    ap.add_argument('--model', default=DEFAULT_MODEL)
    ap.add_argument('--size', default='2K')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    ocfg = CFG.get('outfits', {}).get(args.outfit)
    if not ocfg or not ocfg.get('desc'):
        sys.exit(f'Brak opisu stroju: dodaj "desc" w outfits.{args.outfit} (tools/frames.json)')
    ref_path = SRC_DIR / args.outfit / 'main.jpg'
    if not ref_path.exists():
        sys.exit(f'Brak głównego arkusza stroju: {ref_path}')
    ref = Image.open(ref_path)
    key = None if args.dry_run else api_key()
    out_dir = CAND_DIR / args.outfit
    out_dir.mkdir(parents=True, exist_ok=True)
    made = 0
    for skey in [s.strip() for s in args.sheets.split(',') if s.strip()]:
        tpl_path = template_path(skey)
        orig = Image.open(tpl_path)
        ratio = closest_ratio(*orig.size)
        body = {
            'model': args.model,
            'input': [
                {'type': 'text', 'text': PROMPT.format(desc=ocfg['desc'])},
                {'type': 'image', 'mime_type': 'image/jpeg', 'data': b64_jpeg(orig)},
                {'type': 'image', 'mime_type': 'image/jpeg', 'data': b64_jpeg(ref)},
            ],
            'response_format': {'type': 'image', 'aspect_ratio': ratio, 'image_size': args.size},
        }
        if args.dry_run:
            (out_dir / f'{skey}_request.json').write_text(json.dumps(strip_data(body), indent=2), encoding='utf-8')
            print(f'{skey}: szablon {tpl_path.name} {orig.size}, proporcje {ratio} — zapisano zapytanie (dry run)')
            continue
        best = None
        for t in range(1, args.tries + 1):
            print(f'{skey}: próba {t}/{args.tries} ({args.model}, {ratio}, {args.size})…', flush=True)
            try:
                resp = request(key, body)
            except Exception as e:  # noqa: BLE001 — błąd sieci/API: następna próba
                print(f'  błąd: {e}')
                if 'Free Tier' in str(e):
                    sys.exit('Klucz jest na darmowym poziomie bez dostępu do modeli obrazków — włącz płatności '
                             'w Google AI Studio (https://ai.dev/rate-limit) i spróbuj ponownie.')
                continue
            data = find_image(resp)
            if not data:
                (out_dir / f'{skey}_{t}_response.json').write_text(json.dumps(strip_data(resp), indent=2), encoding='utf-8')
                print(f'  brak obrazka w odpowiedzi — zapisano {skey}_{t}_response.json')
                continue
            made += 1
            raw = Image.open(io.BytesIO(base64.b64decode(data)))
            raw.save(out_dir / f'{skey}_{t}_raw.png')
            cand, iou, dx, dy = align(raw, orig)
            cand.save(out_dir / f'{skey}_{t}.png')
            print(f'  IoU sylwetek {iou:.3f}, przesunięcie ({dx}, {dy})')
            if iou >= MIN_IOU and (best is None or iou > best[0]):
                best = (iou, t, cand)
        if best:
            dest = SRC_DIR / args.outfit / f'{skey}.jpg'
            best[2].save(dest, 'JPEG', quality=95)
            print(f'{skey}: wybrana próba {best[1]} (IoU {best[0]:.3f}) -> {dest.relative_to(ROOT)}')
        else:
            print(f'{skey}: żadna próba nie przeszła (IoU < {MIN_IOU}) — zobacz {out_dir.relative_to(ROOT)}')
    if made:
        print(f'Wygenerowano obrazków: {made}, szacunkowy koszt ~{made * PRICE.get(args.model, 0.134):.2f} USD')


if __name__ == '__main__':
    main()
