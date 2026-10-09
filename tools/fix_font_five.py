"""Poprawiona cyfra „5” do Pixelify Sans: w oryginale wygląda jak „S” (zaokrąglona góra, ukośny środek).
Rysuje nowy glif na siatce pikseli czcionki (płaska górna kreska, pionowa lewa, brzuszek z zaokrąglonymi rogami)
i zapisuje czcionki z samym znakiem U+0035: src/styles/fonts/pixelify-five-<waga>.woff2 — CSS (fonts.css)
nakłada je na „Pixelify Sans” przez `unicode-range`. Uruchom: /c/gvenv/Scripts/python tools/fix_font_five.py"""
from pathlib import Path

from fontTools import subset
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = str(ROOT / 'node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-{w}-normal.woff2')
OUT = ROOT / 'src/styles/fonts'

# Obrys „5” (jeden kontur) na siatce danej grubości — współrzędne z glifów „S”, „3” i „6” tej samej czcionki.
FIVE = {
    400: [(151, -12), (433, -12), (433, 78), (525, 78), (525, 270), (433, 270), (433, 359), (161, 359), (161, 540),
          (525, 540), (525, 631), (60, 631), (60, 270), (423, 270), (423, 88), (161, 88), (161, 179), (60, 179),
          (60, 78), (151, 78)],
    700: [(149, -11), (453, -11), (453, 74), (542, 74), (542, 297), (453, 297), (453, 381), (188, 381), (188, 501),
          (542, 501), (542, 638), (61, 638), (61, 246), (414, 246), (414, 125), (188, 125), (188, 211), (61, 211),
          (61, 74), (149, 74)],
}


def area(pts):
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1])) / 2


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for w, pts in FIVE.items():
        font = TTFont(SRC.format(w=w))
        glyphs = font.getGlyphSet()
        rec = RecordingPen()
        glyphs['five'].draw(rec)
        orig = [p[0] for op, p in rec.value if op in ('moveTo', 'lineTo')]
        # ten sam kierunek obrysu co w oryginale (TrueType: zewnętrzne kontury zgodnie z ruchem wskazówek)
        if (area(orig) > 0) != (area(pts) > 0):
            pts = pts[::-1]
        pen = TTGlyphPen(glyphs)
        pen.moveTo(pts[0])
        for p in pts[1:]:
            pen.lineTo(p)
        pen.closePath()
        g = pen.glyph()
        g.recalcBounds(font['glyf'])
        font['glyf']['five'] = g
        adv, _ = font['hmtx']['five']
        font['hmtx']['five'] = (adv, g.xMin)

        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = []
        opts.name_IDs = ['*']
        opts.notdef_outline = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[0x35])
        sub.subset(font)
        out = OUT / f'pixelify-five-{w}.woff2'
        font.flavor = 'woff2'
        font.save(out)
        print(out.relative_to(ROOT), out.stat().st_size, 'B')


if __name__ == '__main__':
    main()
