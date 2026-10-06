"""Generuje ikony aplikacji z portretu.

Użycie: tools/.venv/Scripts/python tools/make_icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'sprites' / 'portrait_a.png'
OUT = ROOT / 'public' / 'icons'
BG = (59, 42, 92, 255)  # #3b2a5c
INSET = 5  # grubość ramki portretu w pikselach natywnych
SIZES = ((180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png'), (32, 'favicon-32.png'))


def main():
    portrait = Image.open(SRC).convert('RGBA')
    face = portrait.crop((INSET, INSET, portrait.width - INSET, portrait.height - INSET))
    side = max(face.size)
    square = Image.new('RGBA', (side, side), BG)
    square.alpha_composite(face, ((side - face.width) // 2, side - face.height))
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in SIZES:
        if size < side:
            icon = square.resize((size, size), Image.LANCZOS)
        else:
            scale = size // side
            big = square.resize((side * scale, side * scale), Image.NEAREST)
            icon = Image.new('RGBA', (size, size), BG)
            icon.alpha_composite(big, ((size - big.width) // 2, size - big.height))
        icon.convert('RGB').save(OUT / name)
        print(f'{name}: {size}x{size}')


if __name__ == '__main__':
    main()
