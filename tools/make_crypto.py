"""Układa plansze Szyfrokrzyżówki — gęsta siatka 9×9 jak w gazecie — i zapisuje src/games/cryptoPuzzles.json.

Użycie: /c/gvenv/Scripts/python tools/make_crypto.py [--count 40] [--seed 1]
        /c/gvenv/Scripts/python tools/make_crypto.py --selftest
Słowniki w tools/crypto/: slowa.txt (popularne słowa, formy podstawowe), osobiste.txt (słowa o Gabi),
dwuliterowe.txt (jedyne dozwolone słowa dwuliterowe), hasla.txt (hasła, spacje = przerwy). Linie od # — komentarze.
Każdy ciąg ≥ 2 liter w poziomie i w pionie jest słowem ze słowników, każde białe pole leży w takim ciągu.
Podgląd: tools/out/crypto_preview.png.
"""
import json
import random
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORDS_DIR = ROOT / 'tools' / 'crypto'
OUT = ROOT / 'src' / 'games' / 'cryptoPuzzles.json'
PREVIEW = ROOT / 'tools' / 'out' / 'crypto_preview.png'
ALPHABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ'
N = 9
BLOCK_MIN, BLOCK_MAX = 0.18, 0.26
MAX_RUN = 8   # najdłuższe słowo w planszy
MAX_TWO = 6   # najwięcej słów dwuliterowych w planszy


def read_list(name):
    """Niepuste linie pliku bez komentarzy, wielkimi literami, pojedyncze spacje, bez powtórzeń."""
    out = []
    for line in (WORDS_DIR / name).read_text(encoding='utf-8').splitlines():
        w = ' '.join(line.split()).upper()
        if w and not w.startswith('#'):
            out.append(w)
    return list(dict.fromkeys(out))


def is_word(w, lo=2, hi=N):
    return lo <= len(w) <= hi and all(ch in ALPHABET for ch in w)


def load_words():
    """(słowa do wypełniania, słowa osobiste, hasła)."""
    two = [w for w in read_list('dwuliterowe.txt') if is_word(w, 2, 2)]
    common = [w for w in read_list('slowa.txt') if is_word(w, 3, N)]
    personal = [w for w in read_list('osobiste.txt') if is_word(w, 3, N)]
    phrases = [p for p in read_list('hasla.txt')
               if all(ch in ALPHABET for ch in p.replace(' ', '')) and 8 <= len(p.replace(' ', '')) <= 14]
    return list(dict.fromkeys(two + common + personal)), personal, phrases


def runs(grid):
    """Ciągi ≥ 2 białych pól w wierszach, potem w kolumnach — listy indeksów (siatka: 81 znaków, '#' = czarne)."""
    out = []
    lines = [[r * N + c for c in range(N)] for r in range(N)] + [[r * N + c for r in range(N)] for c in range(N)]
    for line in lines:
        cur = []
        for p in line + [None]:
            if p is not None and grid[p] != '#':
                cur.append(p)
            else:
                if len(cur) >= 2:
                    out.append(cur)
                cur = []
    return out


def pattern_ok(grid):
    """Układ czarnych pól: 18–26%, bez czarnych kwadratów 2×2, każde białe pole w ciągu ≥ 2, białe pola spójne,
    ciągi najwyżej MAX_RUN, najwyżej MAX_TWO ciągów dwuliterowych."""
    blocks = grid.count('#')
    if not BLOCK_MIN * N * N <= blocks <= BLOCK_MAX * N * N:
        return False
    for r in range(N - 1):
        for c in range(N - 1):
            if all(grid[(r + dr) * N + c + dc] == '#' for dr in (0, 1) for dc in (0, 1)):
                return False
    rs = runs(grid)
    if any(len(run) > MAX_RUN for run in rs) or sum(len(run) == 2 for run in rs) > MAX_TWO:
        return False
    white = [p for p in range(N * N) if grid[p] != '#']
    if {p for run in rs for p in run} != set(white):
        return False
    seen, stack = {white[0]}, [white[0]]
    while stack:
        p = stack.pop()
        r, c = divmod(p, N)
        for q in (p - N if r > 0 else None, p + N if r < N - 1 else None,
                  p - 1 if c > 0 else None, p + 1 if c < N - 1 else None):
            if q is not None and grid[q] != '#' and q not in seen:
                seen.add(q)
                stack.append(q)
    return len(seen) == len(white)


def random_pattern(rng):
    """Losuje układ czarnych pól spełniający `pattern_ok` (próby do skutku)."""
    while True:
        grid = ['.'] * (N * N)
        for p in rng.sample(range(N * N), rng.randint(int(BLOCK_MIN * N * N) + 1, int(BLOCK_MAX * N * N))):
            grid[p] = '#'
        if pattern_ok(grid):
            return grid


class Lexicon:
    """Słowa pogrupowane po długości z indeksem (długość, pozycja, litera) → zbiór słów."""

    def __init__(self, words):
        self.words = set(words)
        self.by_len = {}
        self.index = {}
        for w in words:
            self.by_len.setdefault(len(w), set()).add(w)
            for i, ch in enumerate(w):
                self.index.setdefault((len(w), i, ch), set()).add(w)

    def matches(self, pattern):
        """Słowa pasujące do wzoru (lista liter albo None) — zbiór tylko do odczytu."""
        sets = [self.index.get((len(pattern), i, ch), set()) for i, ch in enumerate(pattern) if ch]
        if not sets:
            return self.by_len.get(len(pattern), set())
        sets.sort(key=len)
        out = set(sets[0])
        for s in sets[1:]:
            out &= s
            if not out:
                break
        return out


def selftest():
    row = list('AB#CDE#FG') + ['#'] * 72
    assert runs(row) == [[0, 1], [3, 4, 5], [7, 8]], runs(row)
    col = ['#'] * 81
    for p in (0, 9, 18):
        col[p] = 'A'
    assert runs(col) == [[0, 9, 18]], runs(col)

    lex = Lexicon(['KOT', 'KOC', 'LIS', 'KOTEK'])
    assert lex.matches(['K', 'O', None]) == {'KOT', 'KOC'}
    assert lex.matches([None, None, None]) == {'KOT', 'KOC', 'LIS'}
    assert lex.matches(['L', None, 'T']) == set()

    assert not pattern_ok(['.'] * 81)
    rng = random.Random(5)
    for _ in range(5):
        g = random_pattern(rng)
        assert pattern_ok(g)
        assert BLOCK_MIN * 81 <= g.count('#') <= BLOCK_MAX * 81
        assert all('#' in g[r * N:(r + 1) * N] for r in range(N))

    words, personal, phrases = load_words()
    by_len = Counter(len(w) for w in words)
    need = {3: 260, 4: 700, 5: 900, 6: 800, 7: 600, 8: 350, 9: 150}
    for length, n in need.items():
        assert by_len[length] >= n, f'za mało słów długości {length}: {by_len[length]} < {n}'
    assert len(personal) >= 30, len(personal)
    assert len(phrases) >= 45, len(phrases)
    print('selftest OK')


def main():
    if '--selftest' in sys.argv:
        selftest()
        return
    raise SystemExit('Generowanie plansz — Task 3.')


if __name__ == '__main__':
    main()
