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
    for line in (WORDS_DIR / name).read_text(encoding='utf-8-sig').splitlines():
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
    for _ in range(200_000):
        grid = ['.'] * (N * N)
        for p in rng.sample(range(N * N), rng.randint(int(BLOCK_MIN * N * N) + 1, int(BLOCK_MAX * N * N))):
            grid[p] = '#'
        if pattern_ok(grid):
            return grid
    raise RuntimeError('brak układu spełniającego pattern_ok')


EMPTY = frozenset()


class Lexicon:
    """Słowa pogrupowane po długości z indeksem (długość, pozycja, litera) → zbiór słów. Zbiory są niezmienne
    (frozenset), a ich kolejność przypadkowa — przed losowaniem kandydatów trzeba je posortować."""

    def __init__(self, words):
        words = list(words)
        by_len, index = {}, {}
        for w in words:
            by_len.setdefault(len(w), set()).add(w)
            for i, ch in enumerate(w):
                index.setdefault((len(w), i, ch), set()).add(w)
        self.words = frozenset(words)
        self.by_len = {k: frozenset(v) for k, v in by_len.items()}
        self.index = {k: frozenset(v) for k, v in index.items()}

    def matches(self, pattern):
        """Słowa pasujące do wzoru (lista liter albo None)."""
        sets = [self.index.get((len(pattern), i, ch), EMPTY) for i, ch in enumerate(pattern) if ch]
        if not sets:
            return self.by_len.get(len(pattern), EMPTY)
        sets.sort(key=len)
        return sets[0].intersection(*sets[1:])


STEP_LIMIT = 30_000   # kroków wypełniania na jeden układ czarnych pól
BRANCH = 40           # najwyżej tylu kandydatów na słowo w jednym kroku
SEED_TRIES = 3000     # prób na jedno słowo osobiste, zanim zostanie pominięte (rzadkie, np. HACHI, ~770)
MAX_TRIES = 200_000   # prób łącznie, zanim generator się podda


def fill(grid, lex, seed_word, rng):
    """Wypełnia białe pola tak, żeby każdy ciąg ≥ 2 był słowem z `lex` (bez powtórzeń); `seed_word` (słowo
    osobiste) trafia najpierw w losowe miejsce o pasującej długości. Zwraca 81 znaków ('#' = czarne) albo None."""
    slots = runs(grid)
    letters = [None] * (N * N)
    assigned, used = set(), set()
    steps = 0
    fits = [i for i, s in enumerate(slots) if len(s) == len(seed_word)]
    if not fits:
        return None
    first = rng.choice(fits)
    for p, ch in zip(slots[first], seed_word):
        letters[p] = ch
    assigned.add(first)
    used.add(seed_word)

    def candidates(i):
        """Słowa pasujące do slotu i jeszcze nieużyte; None = slot bez liter (dowolne słowo tej długości)."""
        pat = [letters[p] for p in slots[i]]
        if all(pat):
            w = ''.join(pat)
            return [w] if w in lex.words and w not in used else []
        if not any(pat):
            return None
        return [w for w in lex.matches(pat) if w not in used]

    def solve():
        nonlocal steps
        steps += 1
        if steps > STEP_LIMIT:
            return False
        best, best_opts, best_n = None, None, None
        for i in range(len(slots)):
            if i in assigned:
                continue
            opts = candidates(i)
            n = len(lex.by_len.get(len(slots[i]), ())) if opts is None else len(opts)
            if n == 0:
                return False
            if best is None or n < best_n:
                best, best_opts, best_n = i, opts, n
                if n == 1:
                    break
        if best is None:
            return True
        # posortowane przed losowaniem — ta sama kolejność niezależnie od PYTHONHASHSEED (powtarzalne --seed)
        opts = sorted(lex.by_len[len(slots[best])] - used) if best_opts is None else sorted(best_opts)
        rng.shuffle(opts)
        for w in opts[:BRANCH]:
            changed = [p for p in slots[best] if letters[p] is None]
            for p, ch in zip(slots[best], w):
                letters[p] = ch
            assigned.add(best)
            used.add(w)
            if solve():
                return True
            used.discard(w)
            assigned.discard(best)
            for p in changed:
                letters[p] = None
        return False

    if not solve():
        return None
    return ['#' if grid[p] == '#' else letters[p] for p in range(N * N)]


def pick_solution(letters, phrases, used_phrases):
    """Pierwsze nieużyte hasło, którego wszystkie litery są w planszy; gdy takiego brak — użyte, które pasuje."""
    have = {ch for ch in letters if ch != '#'}
    fitting = [p for p in phrases if set(p.replace(' ', '')) <= have]
    fresh = [p for p in fitting if p not in used_phrases]
    return (fresh or fitting or [None])[0]


def generate(count, seed):
    """Lista `count` plansz {id, grid, solution, personal}; postęp wypisywany na bieżąco. Każda plansza dostaje
    kolejne słowo osobiste z pliku (podpisowe są pierwsze) i trzyma je przez kolejne próby, aż się uda albo
    skończy się limit SEED_TRIES — wtedy słowo jest pomijane."""
    rng = random.Random(seed)
    words, personal, phrases = load_words()
    lex = Lexicon(words)
    pool = [w for w in personal if len(w) <= MAX_RUN]
    if not pool:
        raise RuntimeError('brak słów osobistych do 8 liter')
    puzzles, used_phrases = [], set()
    tries = seed_tries = k = 0
    while len(puzzles) < count:
        if tries >= MAX_TRIES:
            raise RuntimeError(f'za mało plansz: {len(puzzles)}/{count} po {tries} próbach')
        seed_word = pool[k % len(pool)]
        if seed_tries >= SEED_TRIES:
            print(f'pomijam słowo {seed_word} po {SEED_TRIES} próbach', flush=True)
            k += 1
            seed_tries = 0
            continue
        tries += 1
        seed_tries += 1
        grid = fill(random_pattern(rng), lex, seed_word, rng)
        if grid is None:
            continue
        solution = pick_solution(grid, phrases, used_phrases)
        if solution is None:
            continue
        # może być więcej niż jedno słowo osobiste (przypadkowe trafienia ze słownika) — to dopuszczalne
        found = sorted({''.join(grid[p] for p in run) for run in runs(grid)} & set(personal))
        puzzles.append({
            'id': f'p{len(puzzles) + 1:02d}',
            'grid': [''.join(grid[r * N:(r + 1) * N]) for r in range(N)],
            'solution': solution,
            'personal': found,
        })
        used_phrases.add(solution)
        k += 1
        seed_tries = 0
        print(f'{len(puzzles):2d}/{count} (próba {tries}, słowo {seed_word}): {solution} — {", ".join(found)}', flush=True)
    return puzzles


def preview(puzzles):
    """Podgląd wszystkich plansz (litery, czarne pola, hasło) w tools/out/crypto_preview.png."""
    from PIL import Image, ImageDraw, ImageFont
    cell, pad, per_row = 22, 16, 5
    w_one, h_one = N * cell + pad, N * cell + 40
    img = Image.new('RGB', (per_row * w_one + pad, ((len(puzzles) + per_row - 1) // per_row) * h_one + pad), (42, 31, 61))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
        small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 11)
    except OSError:
        font = small = ImageFont.load_default()
    for k, p in enumerate(puzzles):
        ox, oy = pad + (k % per_row) * w_one, pad + (k // per_row) * h_one
        d.text((ox, oy), f"{p['id']}: {p['solution']}", fill=(255, 211, 77), font=small)
        for r, row in enumerate(p['grid']):
            for c, ch in enumerate(row):
                x, y = ox + c * cell, oy + 16 + r * cell
                if ch == '#':
                    d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(90, 168, 240))
                else:
                    d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(243, 236, 255), outline=(27, 19, 38))
                    d.text((x + 5, y + 3), ch, fill=(43, 29, 64), font=font)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    img.save(PREVIEW)


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
    corner = ['#'] * 81
    for r in range(3):
        for c in range(3):
            corner[r * N + c] = '.'
    small = Lexicon(['DOM', 'ALE', 'RAK', 'DAR', 'OLA', 'MEK'])
    done = [g for g in (fill(corner, small, 'DOM', random.Random(k)) for k in range(20)) if g]
    assert done, 'wypełnianie 3×3 nie udało się ani razu'
    for g in done:
        ws = [''.join(g[p] for p in run) for run in runs(g)]
        assert all(w in small.words for w in ws) and len(set(ws)) == len(ws), ws
        assert 'DOM' in ws, ws
    block = ['#'] * 81
    for p in (0, 1, N, N + 1):
        block[p] = '.'
    # w bloku 2×2 każde wypełnienie powtórzyłoby słowo AA, więc wypełnianie musi się nie udać
    assert all(fill(block, Lexicon(['AA']), 'AA', random.Random(k)) is None for k in range(5))
    assert pick_solution(list('KOTALA') + ['#'] * 75, ['STO LAT', 'KOT ALA'], set()) == 'KOT ALA'
    assert pick_solution(list('KOTALA') + ['#'] * 75, ['KOT ALA'], {'KOT ALA'}) == 'KOT ALA'
    assert pick_solution(list('KOTALA') + ['#'] * 75, ['STO LAT'], set()) is None
    print('selftest OK')


def main():
    if '--selftest' in sys.argv:
        selftest()
        return
    count = int(sys.argv[sys.argv.index('--count') + 1]) if '--count' in sys.argv else 40
    seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1
    puzzles = generate(count, seed)
    OUT.write_text(json.dumps({'version': 1, 'puzzles': puzzles}, ensure_ascii=False, indent=1) + '\n',
                   encoding='utf-8', newline='\n')
    preview(puzzles)
    print(f'Zapisano {len(puzzles)} plansz: {OUT}; podgląd: {PREVIEW}')


if __name__ == '__main__':
    main()
