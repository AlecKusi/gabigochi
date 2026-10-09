"""Rysuje arkusz mebli kuchni i balkonu (pixel art w pikselach logicznych, ×4 na szarym tle jak arkusze z generatora):
assets/source/sheet-kitchen.png. Ekstraktor (tools/frames.json, arkusz "kitchen", okres 4) wycina z niego przedmioty.
Każdy przedmiot: funkcja rysująca na płótnie o podanym rozmiarze; kontur dookoła dorysowany automatycznie."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BG = (206, 206, 211)
CELL = 4

C = {
    'k': (42, 31, 61), 'w': (255, 255, 255), 'W': (236, 232, 244), 'g': (196, 190, 212), 'G': (140, 132, 160),
    'D': (82, 76, 100), 'l': (232, 220, 252), 'L': (198, 176, 236), 'p': (154, 116, 214), 'P': (104, 70, 160),
    'y': (255, 211, 77), 'Y': (201, 154, 46), 'o': (240, 138, 60), 'r': (224, 56, 79), 'R': (156, 31, 54),
    'b': (201, 146, 96), 'B': (140, 90, 50), 'n': (226, 191, 146), 'N': (176, 128, 84), 'm': (168, 224, 200),
    'M': (95, 168, 138), 's': (176, 196, 216), 'S': (110, 130, 158), 'c': (247, 239, 223), 't': (217, 119, 74),
    'T': (163, 78, 42), 'f': (95, 184, 74), 'F': (47, 122, 52), 'i': (255, 158, 196), 'I': (217, 96, 143),
    'u': (90, 168, 240), 'U': (47, 95, 174), 'e': (27, 19, 38), 'h': (255, 244, 200),
    # dekoracje salonu (dawniej rysowane w tle): różowy i fiolet girlandy, rama i tło obrazka, cyfry „26”
    'z': (255, 127, 176), 'Z': (155, 110, 224), 'x': (92, 58, 38), 'X': (243, 236, 255), 'Q': (122, 79, 179),
}


class Art:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.put(i, j, c)

    def box(self, x, y, w, h, base, light=None, dark=None, line='k'):
        """Prostokąt z konturem, światłem z lewej-góry i cieniem z prawej-dołu."""
        self.rect(x, y, w, h, line)
        self.rect(x + 1, y + 1, w - 2, h - 2, base)
        if light:
            self.rect(x + 1, y + 1, w - 2, 1, light)
            self.rect(x + 1, y + 1, 1, h - 2, light)
        if dark:
            self.rect(x + 1, y + h - 2, w - 2, 1, dark)
            self.rect(x + w - 2, y + 1, 1, h - 2, dark)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)


def fridge():
    a = Art(22, 44)
    a.box(0, 0, 22, 44, 'W', 'w', 'g')
    a.hline(1, 14, 20, 'k')  # zamrażarka / chłodziarka
    a.rect(1, 15, 20, 1, 'g')
    a.vline(17, 4, 7, 'G'); a.vline(18, 4, 7, 'D')  # uchwyty
    a.vline(17, 19, 12, 'G'); a.vline(18, 19, 12, 'D')
    # magnesy i rysunek
    a.rect(4, 4, 3, 3, 'i'); a.put(5, 5, 'I')
    a.rect(8, 6, 3, 2, 'y')
    a.box(3, 20, 9, 11, 'c', 'w', 'n')
    a.put(6, 24, 'p'); a.put(8, 24, 'p'); a.hline(5, 27, 5, 'r')  # buźka
    a.rect(4, 34, 3, 3, 'u'); a.rect(10, 36, 2, 2, 'f')
    a.hline(2, 43, 3, 'D'); a.hline(17, 43, 3, 'D')  # nóżki
    return a


def stove():
    a = Art(26, 32)
    a.box(0, 6, 26, 26, 'g', 'W', 'G')
    a.rect(1, 7, 24, 3, 'D')  # płyta
    for x in (4, 15):
        a.rect(x, 7, 7, 2, 'e'); a.hline(x + 1, 8, 5, 'R')
    # garnek z parującą zupą
    a.box(3, 1, 10, 7, 'r', 'i', 'R')
    a.hline(4, 2, 8, 'y'); a.hline(1, 3, 2, 'k'); a.hline(13, 3, 2, 'k')
    # patelnia
    a.box(15, 4, 8, 4, 'D', 'G', 'e'); a.hline(23, 5, 3, 'B')
    # pokrętła
    for x in (4, 9, 14, 19):
        a.rect(x, 11, 3, 2, 'D'); a.put(x + 1, 11, 'W')
    # piekarnik
    a.box(3, 14, 20, 14, 'D', 'G', 'e')
    a.rect(5, 16, 16, 9, 'o'); a.rect(5, 16, 16, 2, 'y'); a.rect(5, 23, 16, 2, 'T')
    a.hline(6, 15, 14, 'W')
    a.hline(1, 31, 24, 'k')
    return a


def counter():
    a = Art(32, 30)
    a.box(0, 6, 32, 24, 'L', 'l', 'p')
    a.box(0, 4, 32, 4, 'n', 'c', 'N')  # blat
    a.vline(16, 9, 20, 'P')
    for x in (12, 19):
        a.rect(x, 15, 2, 4, 'P')
    a.hline(1, 28, 30, 'P')
    # zlew z kranem
    a.rect(4, 5, 11, 2, 'S'); a.hline(5, 5, 9, 's')
    a.vline(9, 0, 4, 'S'); a.hline(9, 0, 4, 'S'); a.put(12, 1, 'S'); a.put(9, 0, 'k')
    # deska i owoce
    a.rect(20, 2, 9, 2, 'b'); a.put(22, 1, 'r'); a.put(23, 1, 'r'); a.put(26, 1, 'y'); a.put(27, 1, 'y')
    return a


def wall_cabinet():
    a = Art(32, 16)
    a.box(0, 0, 32, 16, 'L', 'l', 'p')
    a.vline(16, 1, 14, 'P')
    for x in (12, 19):
        a.rect(x, 9, 2, 3, 'P')
    a.hline(2, 3, 12, 'l'); a.hline(18, 3, 12, 'l')
    return a


def spice_shelf():
    a = Art(28, 13)
    a.box(0, 10, 28, 3, 'b', 'n', 'B')
    jars = [(1, 'r'), (6, 'y'), (11, 'f'), (16, 'o'), (21, 'u')]
    for x, c in jars:
        a.box(x, 3, 5, 8, 'W', 'w', 'g')
        a.rect(x + 1, 6, 3, 4, c)
        a.rect(x + 1, 2, 3, 1, 'D')
    return a


def cat_bowl():
    a = Art(14, 7)
    a.rect(1, 2, 12, 5, 'k')
    a.rect(2, 3, 10, 3, 'i'); a.hline(2, 3, 10, 'I')
    a.rect(3, 1, 8, 2, 'b'); a.put(4, 1, 'N'); a.put(8, 1, 'N'); a.put(6, 0, 'n')  # karma
    a.put(6, 4, 'w'); a.put(7, 4, 'w')  # rybka
    return a


def flower_box():
    a = Art(30, 18)
    a.box(0, 9, 30, 9, 't', 'o', 'T')
    a.hline(1, 11, 28, 'T')
    stems = [(3, 'r'), (8, 'y'), (13, 'i'), (18, 'p'), (24, 'y')]
    for x, c in stems:
        a.vline(x + 1, 4, 6, 'F')
        a.put(x, 5, 'f'); a.put(x + 2, 6, 'f')
        a.rect(x, 1, 3, 3, c); a.put(x + 1, 2, 'y' if c != 'y' else 'o')
    return a


def balcony_chair():
    a = Art(16, 26)
    a.rect(2, 0, 12, 12, 'k'); a.rect(3, 1, 10, 10, 'u')  # oparcie
    for x in (5, 8, 11):
        a.vline(x, 1, 10, 'U')
    a.rect(1, 12, 14, 3, 'k'); a.rect(2, 13, 12, 1, 'u')  # siedzisko
    for x in (2, 12):
        a.vline(x, 15, 11, 'k'); a.vline(x + 1, 15, 11, 'D')
    a.hline(2, 21, 12, 'D')
    return a


def bistro_table():
    a = Art(18, 22)
    a.rect(0, 0, 18, 3, 'k'); a.rect(1, 1, 16, 1, 'W')
    a.rect(8, 3, 2, 17, 'k')
    a.rect(4, 19, 10, 3, 'k'); a.hline(5, 20, 8, 'D')
    # kubek i doniczka
    a.box(3, -4 + 4, 4, 1, 'w')
    return a


def bistro_table_full():
    a = Art(18, 26)
    a.rect(0, 5, 18, 3, 'k'); a.hline(1, 6, 16, 'W')
    a.rect(8, 8, 2, 15, 'k')
    a.rect(4, 22, 10, 4, 'k'); a.hline(5, 23, 8, 'D')
    a.box(2, 1, 5, 5, 'w', None, 'g'); a.put(7, 2, 'k'); a.put(7, 3, 'k')  # kubek
    a.box(11, 1, 5, 5, 't', 'o', 'T'); a.put(13, 0, 'f'); a.put(12, 0, 'F'); a.put(14, 0, 'f')  # kaktusik
    return a


def string_lights():
    a = Art(64, 12)
    for x in range(64):
        y = 2 + round(3 * (1 - ((x - 32) / 32) ** 2))  # zwis
        a.put(x, y, 'D')
        if x % 8 == 4:
            c = ['y', 'i', 'u', 'm'][(x // 8) % 4]
            a.rect(x - 1, y + 1, 3, 4, 'k'); a.put(x, y + 2, c); a.put(x, y + 3, c); a.put(x, y + 2, 'h')
    return a


def telescope():
    a = Art(22, 34)
    # tubus
    for i in range(14):
        a.rect(4 + i, 12 - i // 2, 3, 4, 'k')
    for i in range(13):
        a.rect(5 + i, 13 - i // 2, 2, 2, 'p')
    a.rect(16, 3, 5, 6, 'k'); a.rect(17, 4, 3, 4, 'L'); a.put(18, 5, 'w')
    a.rect(3, 13, 4, 4, 'k'); a.rect(4, 14, 2, 2, 'P')
    # statyw
    for i in range(16):
        a.put(10 - i // 3, 18 + i, 'k'); a.put(10, 18 + i, 'k'); a.put(10 + i // 3, 18 + i, 'k')
    a.rect(9, 16, 3, 3, 'k')
    return a


def wall_clock(phase):
    """Zegar ścienny: okrągła fioletowa tarcza i okienko nieba nad nią (jak fazy księżyca w starych zegarach) —
    po jednej klatce na porę dnia. Wskazówki rysuje gra (prawdziwa godzina); środek tarczy: x 9, y 19 (bez konturu)."""
    import math
    a = Art(19, 29)
    CY, AY = 19, 10
    sky = set()
    for y in range(a.h):
        for x in range(a.w):
            da = math.hypot(x - 9, y - AY)
            if y <= AY and da <= 7.6:
                if da > 6.6:
                    a.put(x, y, 'k')
                elif da > 5.4:
                    a.put(x, y, 'L' if x < 9 else 'p')
                else:
                    sky.add((x, y))
            d = math.hypot(x - 9, y - CY)
            if d <= 9.4:
                sky.discard((x, y))
                if d > 8.4:
                    c = 'k'
                elif d > 6.6:
                    s_ = (x - 9) + (y - CY)
                    c = 'L' if s_ < -4 else 'P' if s_ > 4 else 'p'
                else:
                    c = 'w' if d > 5.6 and (x - 9) + (y - CY) < -5 else 'c'
                a.put(x, y, c)
    for x, y in [(9, 13), (9, 14), (15, 19), (9, 24), (3, 19)]:
        a.put(x, y, 'P')
    for x, y in [(13, 15), (13, 23), (5, 23), (5, 15)]:
        a.put(x, y, 'g')
    top = min(y for _, y in sky)
    bottom = max(y for _, y in sky)
    grad = {'morning': ['L', 'l', 'i', 'i'], 'day': ['u', 'u', 's', 's'],
            'evening': ['P', 'p', 'o', 'y'], 'night': ['e', 'e', 'P', 'P']}[phase]
    for x, y in sky:
        a.put(x, y, grad[min(3, (y - top) * 4 // (bottom - top + 1))])
    blob = lambda x, y, c, hi=None: ([a.put(x + i, y + j, c) for i in (0, 1) for j in (0, 1)], hi and a.put(x, y, hi))
    if phase == 'morning':
        blob(5, 7, 'y', 'h')
    elif phase == 'day':
        blob(7, 5, 'y', 'h')
        for x in (10, 11, 12, 13):
            a.put(x, 7, 'w')
        a.put(11, 6, 'w'); a.put(12, 6, 'w')
    elif phase == 'evening':
        blob(11, 7, 'o', 'y')
    else:
        for x, y in [(11, 4), (12, 5), (12, 6), (11, 7), (11, 5), (11, 6)]:  # sierp księżyca
            a.put(x, y, 'h')
        a.put(5, 6, 'w'); a.put(7, 4, 'w'); a.put(8, 8, 'w'); a.put(13, 8, 'w')
    return a

def bunting():
    """Urodzinowa girlanda przez całą ścianę: sznurek i chorągiewki (różowa, żółta, niebieska, fioletowa)."""
    a = Art(128, 5)
    a.hline(0, 0, 128, 'e')
    colours = ['z', 'y', 'u', 'Z']
    for i, x in enumerate(range(2, 128, 10)):
        for r in range(4):
            a.hline(x + r, 1 + r, 7 - 2 * r, colours[i % len(colours)])
    return a


DIGITS = {'2': ['QQQ', '..Q', 'QQQ', 'Q..', 'QQQ'], '6': ['QQQ', 'Q..', 'QQQ', 'Q.Q', 'QQQ']}


def picture_26():
    """Obrazek w drewnianej ramce z napisem „26”."""
    a = Art(20, 16)
    a.rect(0, 0, 20, 16, 'x')
    a.rect(2, 2, 16, 12, 'X')
    for dx, d in ((6, '2'), (11, '6')):
        for j, row in enumerate(DIGITS[d]):
            for i, ch in enumerate(row):
                if ch != '.':
                    a.put(dx + i, 3 + j, ch)
    return a


# bez automatycznego konturu — wyglądają tak jak dawniej w tle salonu
NO_OUTLINE = {'bunting', 'picture_26'}


def outline(a):
    """Kontur dookoła rysunku (gdzie pusto obok niepustego) — jak w arkuszach."""
    w, h = a.w + 2, a.h + 2
    out = Art(w, h)
    for y in range(a.h):
        for x in range(a.w):
            if a.px[y][x]:
                out.px[y + 1][x + 1] = a.px[y][x]
    for y in range(h):
        for x in range(w):
            if out.px[y][x]:
                continue
            if any(0 <= y + dy < h and 0 <= x + dx < w and out.px[y + dy][x + dx] and out.px[y + dy][x + dx] != 'k'
                   for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))):
                out.px[y][x] = 'k'
    return out


ITEMS = [('fridge', fridge), ('stove', stove), ('kitchen_counter', counter), ('wall_cabinet', wall_cabinet),
         ('spice_shelf', spice_shelf), ('cat_bowl', cat_bowl), ('flower_box', flower_box),
         ('balcony_chair', balcony_chair), ('bistro_table', bistro_table_full), ('string_lights', string_lights),
         ('telescope', telescope), ('wall_clock', lambda: wall_clock('day')),
         ('wall_clock_morning', lambda: wall_clock('morning')), ('wall_clock_evening', lambda: wall_clock('evening')),
         ('wall_clock_night', lambda: wall_clock('night')), ('bunting', bunting), ('picture_26', picture_26)]


def main():
    arts = [(n, f() if n in NO_OUTLINE else outline(f())) for n, f in ITEMS]
    gap = 6
    W = sum(a.w + gap for _, a in arts) + gap
    H = max(a.h for _, a in arts) + 2 * gap
    img = Image.new('RGB', (W * CELL, H * CELL), BG)
    x = gap
    rects = {}
    for name, a in arts:
        y = H - gap - a.h
        for j in range(a.h):
            for i in range(a.w):
                c = a.px[j][i]
                if c:
                    for dy in range(CELL):
                        for dx in range(CELL):
                            img.putpixel(((x + i) * CELL + dx, (y + j) * CELL + dy), C[c])
        rects[name] = [x * CELL - 6, y * CELL - 6, (x + a.w) * CELL + 6, (y + a.h) * CELL + 6]
        x += a.w + gap
    out = ROOT / 'assets/source/sheet-kitchen.png'
    img.save(out)
    for n, r in rects.items():
        print(n, r)


if __name__ == '__main__':
    main()
