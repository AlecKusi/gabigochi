# Szyfrokrzyżówka jak z gazety — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zastąpić minigrę `crypto` gazetową szyfrokrzyżówką: jedna gęsta plansza 9×9 z zaczernionymi polami, tabela liter, hasło do odczytania, „Sprawdź” i podpowiedzi, z gotowego zestawu 40 plansz.

**Architecture:** Plansze układa przed wydaniem generator w Pythonie (`tools/make_crypto.py`) ze słowników w `tools/crypto/` i zapisuje je w `src/games/cryptoPuzzles.json`. Czysta logika w `src/games/cryptoLogic.ts` zamienia planszę w stan gry (liczby losowane z ziarnem `id`), pilnuje wpisywania, sprawdzania, podpowiedzi, kolejności plansz i zapisu. Ekran `src/games/cryptoGame.ts` + `src/styles/crypto.css` rysuje tabelę liter, siatkę, hasło, klawiaturę, animacje i dźwięki.

**Tech Stack:** TypeScript (Vite, Vitest), vanilla DOM, Python 3 (`/c/gvenv/Scripts/python`, Pillow do podglądu).

**Spec:** `docs/superpowers/specs/2026-10-14-szyfrokrzyzowka-gazetowa-design.md`

**Gałąź:** `etap-1` (commity lokalne; wypchnięcie na `main` = wydanie — tylko za zgodą użytkownika, Task 8).

## Struktura plików

| Plik | Rola |
| --- | --- |
| `tools/crypto/dwuliterowe.txt` (nowy) | jedyne dozwolone słowa dwuliterowe |
| `tools/crypto/osobiste.txt` (nowy) | słowa o Gabi (każda plansza ma co najmniej jedno) |
| `tools/crypto/hasla.txt` (nowy) | hasła (8–14 liter, spacje = przerwy) — do przejrzenia przez użytkownika |
| `tools/crypto/slowa.txt` (nowy) | słownik popularnych słów (formy podstawowe, 3–9 liter) |
| `tools/make_crypto.py` (nowy) | generator plansz + `--selftest` + podgląd PNG |
| `src/games/cryptoPuzzles.json` (generowany) | 40 plansz |
| `src/games/cryptoPuzzles.ts` (nowy) | `PUZZLES` — wczytany zestaw |
| `src/games/cryptoLogic.ts` (przebudowa) | stan planszy, wpisywanie, „Sprawdź”, podpowiedzi, hasło, kolejność, zapis |
| `src/games/cryptoGame.ts` (przebudowa) | ekran gry |
| `src/styles/crypto.css` (przebudowa) | wygląd i animacje |
| `src/games/cryptoWords.ts` (usunięty) | stary słownik luźnej krzyżówki |
| `tests/games/cryptoPuzzleLogic.test.ts` (nowy) | testy logiki |
| `tests/games/cryptoPuzzles.test.ts` (nowy) | testy zestawu plansz |
| `tests/games/cryptoLogic.test.ts` (usunięty) | testy starego układania |
| `src/games/rules.ts`, `src/core/changelog.ts`, `docs/*.md` | zasady, „Co nowego?”, notatki |

---

### Task 1: Słowniki i hasła

**Files:**
- Create: `tools/crypto/dwuliterowe.txt`, `tools/crypto/osobiste.txt`, `tools/crypto/hasla.txt`, `tools/crypto/slowa.txt`

- [ ] **Step 1: Słowa dwuliterowe** — `tools/crypto/dwuliterowe.txt`:

```text
# Jedyne słowa dwuliterowe dozwolone w planszach (pospolite, rozpoznawalne).
JA
TY
ON
MY
WY
TO
TA
TE
NA
DO
OD
ZA
PO
BO
ŻE
CO
NO
AS
UL
OŚ
IŁ
```

- [ ] **Step 2: Słowa osobiste** — `tools/crypto/osobiste.txt`:

```text
# Słowa o Gabi — każda plansza zaczyna się od jednego z nich (najwyżej 8 liter trafia jako pierwsze słowo).
GABI
GABRYSIA
HACHI
SOMERKA
KITKAT
LORDOFON
FIOLET
KAPIBARA
FLOPPA
KOTEK
KOT
MANGA
SZYDEŁKO
WŁÓCZKA
OKULARY
LAWENDA
MUZYKA
TELEFON
ROŚLINY
MONSTERA
URODZINY
PREZENT
TORT
SŁUCHAWKI
KSIĄŻKA
NAUKA
STETOSKOP
PIŻAMA
KĄPIEL
SWETEREK
PIZZA
UKULELE
KARAOKE
SUSHI
RAMEN
PIEROGI
KOCYK
HERBATA
KAWA
BALKON
MIAU
SIOSTRA
DYŻUR
SZPITAL
KACZUSZKA
KONEWKA
```

- [ ] **Step 3: Hasła** — `tools/crypto/hasla.txt` (52 hasła, każde 8–14 liter bez spacji):

```text
# Hasła odczytywane na dole planszy. 8–14 liter (bez spacji), spacja = przerwa między słowami.
STO LAT GABI
KOT HACHI
KOTKA SOMERKA
KITKAT DLA GABI
DAN DAN DANANA
KAPIBARA RZĄDZI
FLOPPA TO KOT
LAWENDOWE WŁOSY
MANGA I HERBATA
SZYDEŁKOWANIE
SIOSTRA GABI
I WISZ I WAS A BERD
PIES SPAWACZ
ŻYJĘ W SYMULACJI
WIĘC ADIOS
MIAU MIAU
SOMERKA I HACHI
GABI KOCHA KOTY
KAWA Z MLEKIEM
LORDOFON GRA
GŁOŚNA MUZYKA
OKULARY NA NOSIE
KĄPIEL Z PIANKĄ
KACZUSZKA KWA
TORT URODZINOWY
STO LAT STO LAT
MONSTERA ROŚNIE
PODLEJ KWIATKI
PIŻAMA I KOCYK
DOBRANOC GABI
DZIEŃ DOBRY
KOCHAM KITKATY
PIZZA I SUSHI
PIEROGI BABCI
KOT W PUDEŁKU
SKACZĄCY KOTEK
KOTY RZĄDZĄ
GABI I UKULELE
ŚPIEWAJ GŁOŚNO
TANIEC W SALONIE
NOCNE NIEBO
ZIELONA HERBATA
NOWA SUKIENKA
RÓŻOWE OKULARY
SESJA ZDANA
DYŻUR W SZPITALU
WOLNY WEEKEND
PRZYTUL KOTKA
KOTEK MRUCZY
SŁODKIE SNY
UŚMIECHNIJ SIĘ
NAJLEPSZA GABI
```

- [ ] **Step 4: Przegląd haseł przez użytkownika (punkt kontrolny)** — pokaż użytkownikowi listę z `hasla.txt` i poproś o poprawki (usunąć, zmienić, dopisać). Wprowadź zmiany. Nie generuj plansz przed akceptacją.

- [ ] **Step 5: Słownik** — `tools/crypto/slowa.txt`: jedna linia = jedno słowo, wielkie litery, polski alfabet bez Q/V/X, formy podstawowe (rzeczowniki w mianowniku l.p., czasowniki w bezokoliczniku, przymiotniki w r. męskim), bez nazw własnych, wulgaryzmów, skrótów i słów rzadkich/archaicznych (sprawdzian: „czy Gabi zna to słowo?”). Pisz partiami po kategoriach, z nagłówkami-komentarzami (`# jedzenie`, `# zwierzęta`, `# dom`, `# ubrania`, `# ciało`, `# przyroda`, `# miasto`, `# szkoła i praca`, `# zdrowie`, `# czas`, `# uczucia`, `# czasowniki`, `# przymiotniki`, `# przysłówki`, `# różne`). Minimalne liczby słów wg długości (sprawdza je `--selftest` w Task 2):

| długość | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| najmniej słów | 300 | 700 | 900 | 800 | 600 | 350 | 150 |

Przykład początku pliku:

```text
# jedzenie
SER
RYŻ
MAK
SOK
MIÓD
CHLEB
MASŁO
JABŁKO
GRUSZKA
# zwierzęta
KOŃ
LIS
JEŻ
OSA
ŻUBR
WIEWIÓRKA
```

- [ ] **Step 6: Commit**

```bash
git add tools/crypto
git commit -m "Szyfrokrzyżówka: słowniki, słowa osobiste i hasła do generatora plansz"
```

---

### Task 2: Generator — wczytywanie, ciągi liter, układ czarnych pól

**Files:**
- Create: `tools/make_crypto.py`

- [ ] **Step 1: Napisz generator z samotestem (testy najpierw — funkcje poniżej)** — `tools/make_crypto.py`:

```python
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
    need = {3: 300, 4: 700, 5: 900, 6: 800, 7: 600, 8: 350, 9: 150}
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
```

- [ ] **Step 2: Uruchom samotest**

Run: `/c/gvenv/Scripts/python tools/make_crypto.py --selftest`
Expected: `selftest OK`. Jeśli zgłasza „za mało słów długości …” — dopisz słowa tej długości do `slowa.txt` (Task 1, Step 5) i powtórz.

- [ ] **Step 3: Commit**

```bash
git add tools/make_crypto.py tools/crypto/slowa.txt
git commit -m "Generator szyfrokrzyżówki: słowniki, ciągi liter, układ czarnych pól z samotestem"
```

---

### Task 3: Generator — wypełnianie, hasło, zapis i podgląd

**Files:**
- Modify: `tools/make_crypto.py` (dopisanie funkcji przed `selftest`, rozszerzenie `selftest` i `main`)

- [ ] **Step 1: Dopisz test wypełniania na końcu `selftest()` (przed `print('selftest OK')`)**

```python
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
    assert pick_solution(list('KOTALA') + ['#'] * 75, ['STO LAT', 'KOT ALA'], set()) == 'KOT ALA'
    assert pick_solution(list('KOTALA') + ['#'] * 75, ['KOT ALA'], {'KOT ALA'}) == 'KOT ALA'
    assert pick_solution(list('KOTALA') + ['#'] * 75, ['STO LAT'], set()) is None
```

- [ ] **Step 2: Uruchom samotest — ma się nie udać**

Run: `/c/gvenv/Scripts/python tools/make_crypto.py --selftest`
Expected: FAIL — `NameError: name 'fill' is not defined`.

- [ ] **Step 3: Dopisz wypełnianie, wybór hasła, generowanie i podgląd (przed `def selftest`)**

```python
STEP_LIMIT = 30_000   # kroków wypełniania na jeden układ czarnych pól
BRANCH = 40           # najwyżej tylu kandydatów na słowo w jednym kroku


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
        opts = list(lex.by_len[len(slots[best])] - used) if best_opts is None else list(best_opts)
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
    """Lista `count` plansz {id, grid, solution, personal}; postęp wypisywany na bieżąco."""
    rng = random.Random(seed)
    words, personal, phrases = load_words()
    lex = Lexicon(words)
    pool = [w for w in personal if len(w) <= MAX_RUN]
    puzzles, used_phrases = [], set()
    tries = 0
    while len(puzzles) < count:
        tries += 1
        seed_word = pool[(len(puzzles) * 7 + tries) % len(pool)]
        grid = fill(random_pattern(rng), lex, seed_word, rng)
        if grid is None:
            continue
        solution = pick_solution(grid, phrases, used_phrases)
        if solution is None:
            continue
        found = sorted({''.join(grid[p] for p in run) for run in runs(grid)} & set(personal))
        puzzles.append({
            'id': f'p{len(puzzles) + 1:02d}',
            'grid': [''.join(grid[r * N:(r + 1) * N]) for r in range(N)],
            'solution': solution,
            'personal': found,
        })
        used_phrases.add(solution)
        print(f'{len(puzzles):2d}/{count} (próba {tries}): {solution} — {", ".join(found)}', flush=True)
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
```

- [ ] **Step 4: Zamień `main()` na generowanie**

```python
def main():
    if '--selftest' in sys.argv:
        selftest()
        return
    count = int(sys.argv[sys.argv.index('--count') + 1]) if '--count' in sys.argv else 40
    seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1
    puzzles = generate(count, seed)
    OUT.write_text(json.dumps({'version': 1, 'puzzles': puzzles}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    preview(puzzles)
    print(f'Zapisano {len(puzzles)} plansz: {OUT}; podgląd: {PREVIEW}')
```

- [ ] **Step 5: Uruchom samotest**

Run: `/c/gvenv/Scripts/python tools/make_crypto.py --selftest`
Expected: `selftest OK`.

- [ ] **Step 6: Próba na 3 planszach (szybkość)**

Run: `/c/gvenv/Scripts/python tools/make_crypto.py --count 3 --seed 1`
Expected: trzy linie postępu i „Zapisano 3 plansz…”, w czasie poniżej ~3 minut. Jeśli trwa dłużej albo stoi na jednej planszy — dopisz krótkie słowa (3–5 liter) do `slowa.txt` i powtórz; nie zmieniaj reguł siatki ze speca.

- [ ] **Step 7: Commit generatora**

```bash
git add tools/make_crypto.py tools/crypto/slowa.txt
git commit -m "Generator szyfrokrzyżówki: wypełnianie słowami z cofaniem, hasło, podgląd plansz"
```

---

### Task 4: Logika planszy gazetowej (TypeScript)

Stare układanie (`buildCrossword`, `newPuzzle`, `parseSave`…) zostaje do Task 6, żeby ekran działał do czasu przebudowy.

**Files:**
- Modify: `src/games/cryptoLogic.ts`
- Create: `tests/games/cryptoPuzzleLogic.test.ts`

- [ ] **Step 1: Testy** — `tests/games/cryptoPuzzleLogic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  COLS,
  MAX_HINTS,
  ROWS,
  START_REVEALED,
  applyGuess,
  cryptoReward,
  cryptoScore,
  hint,
  isSolved,
  markSolved,
  nextPuzzle,
  puzzleLetters,
  puzzleOrder,
  puzzleState,
  readProgress,
  readPuzzleSave,
  seedOf,
  solutionNumbers,
  unsolvedNumbers,
  wrongNumbers,
  writePuzzleSave,
  type Puzzle,
} from '../../src/games/cryptoLogic';

/** Plansza testowa (słowa nie muszą być prawdziwe — logika liczy tylko litery i czarne pola). */
const GRID = ['KOT#MAMA#', 'O#OLA#ALE', 'TATA#KURA', '#LAS#OKO#', 'PIES#RAK#', 'A#ULE#BAL', 'NOS#DOM#Y', 'IGŁA#ŻUK#', 'E#ŁÓDŹ#OS'];
const P1: Puzzle = { id: 't1', grid: GRID, solution: 'KOT ALA', personal: ['KOT'] };
const P2: Puzzle = { ...P1, id: 't2' };
const P3: Puzzle = { ...P1, id: 't3' };
const freeLetter = (key: readonly string[]) => ALPHABET.find((ch) => !key.includes(ch))!;

describe('plansza gazetowa: stan na start', () => {
  it('litery wierszami, zaczernione pola jako null', () => {
    const L = puzzleLetters(P1);
    expect(L).toHaveLength(ROWS * COLS);
    expect(L[0]).toBe('K');
    expect(L[3]).toBeNull();
    expect(L.filter((c) => c === null)).toHaveLength(GRID.join('').split('#').length - 1);
  });

  it('ta sama plansza ma zawsze te same liczby; liczba w polu to jego litera w kluczu', () => {
    const a = puzzleState(P1);
    expect(puzzleState(P1)).toEqual(a);
    expect(a).toMatchObject({ id: 't1', rows: ROWS, cols: COLS, hints: 0 });
    expect(new Set(a.key).size).toBe(a.key.length);
    expect(a.key.length).toBe(new Set(puzzleLetters(P1).filter(Boolean)).size);
    puzzleLetters(P1).forEach((ch, i) => {
      if (ch === null) expect(a.cells[i]).toBeNull();
      else expect(a.key[a.cells[i]! - 1]).toBe(ch);
    });
    expect(puzzleState(P2).key).not.toEqual(a.key);
  });

  it('na start 4 odkryte litery, w tym co najmniej 2 spośród czterech najczęstszych', () => {
    const s = puzzleState(P1);
    const shown = s.key.filter((_, i) => s.revealed[i]);
    expect(shown).toHaveLength(START_REVEALED);
    s.revealed.forEach((r, i) => expect(s.guesses[i]).toBe(r ? s.key[i] : null));
    const freq = new Map<string, number>();
    for (const ch of puzzleLetters(P1)) if (ch) freq.set(ch, (freq.get(ch) ?? 0) + 1);
    const top4 = [...freq.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 4).map(([ch]) => ch);
    expect(shown.filter((ch) => top4.includes(ch)).length).toBeGreaterThanOrEqual(2);
  });

  it('ziarno z id: stałe dla id, różne dla różnych id', () => {
    expect(seedOf('p01')).toBe(seedOf('p01'));
    expect(seedOf('p01')).not.toBe(seedOf('p02'));
  });
});

describe('plansza gazetowa: wpisywanie, Sprawdź, podpowiedzi, hasło', () => {
  it('litera trafia do liczby; ta sama litera przy innej liczbie przenosi się; odkrytych nie da się zmienić', () => {
    const s0 = puzzleState(P1);
    const [a, b] = unsolvedNumbers(s0);
    const free = freeLetter(s0.key);
    const s1 = applyGuess(s0, a, free);
    expect(s1.guesses[a - 1]).toBe(free);
    const s2 = applyGuess(s1, b, free);
    expect(s2.guesses[a - 1]).toBeNull();
    expect(s2.guesses[b - 1]).toBe(free);
    const given = s0.revealed.indexOf(true) + 1;
    expect(applyGuess(s0, given, free)).toBe(s0);
    expect(applyGuess(s0, a, s0.key[given - 1])).toBe(s0);
    expect(applyGuess(s1, a, null).guesses[a - 1]).toBeNull();
  });

  it('Sprawdź: tylko liczby z błędną literą (puste i dobre się nie liczą)', () => {
    let s = puzzleState(P1);
    const [a, b] = unsolvedNumbers(s);
    s = applyGuess(s, a, freeLetter(s.key));
    s = applyGuess(s, b, s.key[b - 1]);
    expect(wrongNumbers(s)).toEqual([a]);
  });

  it('wygrana, gdy każda liczba ma swoją literę', () => {
    let s = puzzleState(P1);
    expect(isSolved(s)).toBe(false);
    for (const n of unsolvedNumbers(s)) s = applyGuess(s, n, s.key[n - 1]);
    expect(isSolved(s)).toBe(true);
  });

  it('podpowiedź odkrywa wybraną albo losową liczbę, najwyżej 3', () => {
    let s = puzzleState(P1);
    const n = unsolvedNumbers(s)[2];
    s = hint(s, () => 0, n);
    expect(s.revealed[n - 1]).toBe(true);
    expect(s.guesses[n - 1]).toBe(s.key[n - 1]);
    s = hint(hint(s, () => 0), () => 0);
    expect(s.hints).toBe(MAX_HINTS);
    expect(hint(s, () => 0)).toBe(s);
  });

  it('hasło jako liczby z przerwą; litera hasła spoza planszy to błąd danych', () => {
    const s = puzzleState(P1);
    const n = (ch: string) => s.key.indexOf(ch) + 1;
    expect(solutionNumbers(P1, s)).toEqual([n('K'), n('O'), n('T'), null, n('A'), n('L'), n('A')]);
    expect(() => solutionNumbers({ ...P1, solution: 'XYZ' }, s)).toThrow();
  });

  it('nagroda: 60 monet, −10 za podpowiedź, najmniej 30; +15 humoru', () => {
    expect(cryptoScore(0)).toBe(60);
    expect(cryptoScore(2)).toBe(40);
    expect(cryptoScore(9)).toBe(30);
    expect(cryptoReward(50)).toEqual({ coins: 50, moodBoost: 15 });
  });
});

describe('plansza gazetowa: kolejność i postęp', () => {
  const ALL = [P1, P2, P3];

  it('następna — pierwsza nierozwiązana w kolejności obrotu; porzucona pomijana, chyba że jedyna', () => {
    const order = puzzleOrder(ALL, 0).map((p) => p.id);
    expect(puzzleOrder(ALL, 0).map((p) => p.id)).toEqual(order);
    expect(nextPuzzle(ALL, { round: 0, solved: [] }).puzzle.id).toBe(order[0]);
    expect(nextPuzzle(ALL, { round: 0, solved: [order[0]] }).puzzle.id).toBe(order[1]);
    expect(nextPuzzle(ALL, { round: 0, solved: [] }, order[0]).puzzle.id).toBe(order[1]);
    expect(nextPuzzle(ALL, { round: 0, solved: [order[0], order[1]] }, order[2]).puzzle.id).toBe(order[2]);
  });

  it('po rozwiązaniu wszystkich — nowy obrót od pustej listy', () => {
    const r = nextPuzzle(ALL, { round: 0, solved: ['t1', 't2', 't3'] });
    expect(r.progress).toEqual({ round: 1, solved: [] });
    expect(r.puzzle.id).toBe(puzzleOrder(ALL, 1)[0].id);
  });

  it('postęp: odczyt odporny na śmieci, oznaczanie bez powtórzeń', () => {
    expect(readProgress(null)).toEqual({ round: 0, solved: [] });
    expect(readProgress('{zepsute')).toEqual({ round: 0, solved: [] });
    expect(readProgress('{"round":2,"solved":["a","a",3,"b"]}')).toEqual({ round: 2, solved: ['a', 'b'] });
    const p = markSolved({ round: 0, solved: ['a'] }, 'b');
    expect(p.solved).toEqual(['a', 'b']);
    expect(markSolved(p, 'b')).toBe(p);
  });
});

describe('plansza gazetowa: zapis trwającej planszy', () => {
  const ALL = [P1, P2];
  const played = () => {
    let s = puzzleState(P1);
    s = applyGuess(s, unsolvedNumbers(s)[0], freeLetter(s.key));
    return hint(s, () => 0);
  };

  it('zapis i odczyt zachowują litery, odkrycia i podpowiedzi', () => {
    const s = played();
    expect(readPuzzleSave(writePuzzleSave(s), ALL)).toEqual(s);
  });

  it('stary format, uszkodzony, nieznana plansza → null', () => {
    expect(readPuzzleSave(JSON.stringify({ v: 1, state: {} }), ALL)).toBeNull();
    expect(readPuzzleSave('{zepsute', ALL)).toBeNull();
    expect(readPuzzleSave(null, ALL)).toBeNull();
    expect(readPuzzleSave(writePuzzleSave({ ...played(), id: 'nie-ma' }), ALL)).toBeNull();
  });

  it('nie da się ukryć liter odkrytych na start; rozwiązana plansza i za dużo podpowiedzi → null', () => {
    const s = played();
    const raw = JSON.parse(writePuzzleSave(s));
    expect(readPuzzleSave(JSON.stringify({ ...raw, revealed: raw.revealed.map(() => false) }), ALL)).toBeNull();
    expect(readPuzzleSave(JSON.stringify({ ...raw, guesses: s.key }), ALL)).toBeNull();
    expect(readPuzzleSave(JSON.stringify({ ...raw, hints: MAX_HINTS + 1 }), ALL)).toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/games/cryptoPuzzleLogic.test.ts`
Expected: FAIL — brak eksportów (`puzzleState`, `ROWS`…).

- [ ] **Step 3: `id` w stanie** — w `src/games/cryptoLogic.ts` w `interface CryptoState` dodaj pierwsze pole:

```ts
export interface CryptoState {
  /** Plansza z zestawu (`Puzzle.id`); '' — plansza ze starego, losowego układania. */
  id: string;
  rows: number;
```

W `createPuzzle` dopisz `id: '',` jako pierwsze pole zwracanego obiektu, a w `parseSave` w `const result: CryptoState = {` dopisz `id: '',` na początku. W starym `tests/games/cryptoLogic.test.ts` dopisz `id: '',` jako pierwsze pole obu ręcznie budowanych stanów (`function tiny(): CryptoState` i `const big: CryptoState`) — inaczej `tsc` zgłosi brak pola (plik znika w Task 6).

- [ ] **Step 4: Logika planszy gazetowej** — w `src/games/cryptoLogic.ts` dopisz przed sekcją `// Zapis w toku`:

```ts
// ---------------------------------------------------------------------------
// Plansze gazetowe (gotowy zestaw z tools/make_crypto.py)

export const ROWS = 9;
export const COLS = 9;
/** Ile liter jest odkrytych na start. */
export const START_REVEALED = 4;
/** Lista rozwiązanych plansz i numer obrotu zestawu (osobno od trwającej planszy). */
export const PROGRESS_KEY = 'gabigochi.game.cryptoSolved';

/** Plansza z `cryptoPuzzles.json`: 9 wierszy po 9 znaków (`#` — zaczernione pole), hasło, słowa osobiste. */
export interface Puzzle {
  id: string;
  grid: readonly string[];
  solution: string;
  personal: readonly string[];
}

/** Ziarno losowania liczb planszy z jej `id` (FNV-1a) — ta sama plansza ma zawsze te same liczby. */
export function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (const ch of id) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Litery planszy wierszami; zaczernione pole — null. */
export function puzzleLetters(p: Puzzle): (string | null)[] {
  return p.grid.flatMap((row) => [...row].map((ch) => (ch === '#' ? null : ch)));
}

/** Liczby odkryte na start: 2 spośród 4 najczęstszych liter planszy i 2 losowe ze środka listy częstości. */
export function startNumbers(letters: readonly (string | null)[], key: readonly string[], rng: Rng): number[] {
  const freq = new Map<string, number>();
  for (const ch of letters) if (ch) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const byFreq = [...key].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || (a < b ? -1 : a > b ? 1 : 0));
  const top = shuffle(byFreq.slice(0, 4), rng).slice(0, 2);
  const middle = shuffle(byFreq.slice(4, Math.max(6, Math.ceil(byFreq.length * 0.6))), rng).slice(0, START_REVEALED - 2);
  return [...top, ...middle].map((ch) => key.indexOf(ch) + 1);
}

/** Stan nowej planszy: liczby 1..N losowane z ziarnem `id`, `START_REVEALED` liter odkrytych. */
export function puzzleState(p: Puzzle): CryptoState {
  const rng = seededRng(seedOf(p.id));
  const letters = puzzleLetters(p);
  const key = shuffle([...new Set(letters.filter((c): c is string => c !== null))].sort(), rng);
  const shown = new Set(startNumbers(letters, key, rng));
  return {
    id: p.id,
    rows: ROWS,
    cols: COLS,
    cells: letters.map((ch) => (ch === null ? null : key.indexOf(ch) + 1)),
    key,
    guesses: key.map((ch, i) => (shown.has(i + 1) ? ch : null)),
    revealed: key.map((_, i) => shown.has(i + 1)),
    hints: 0,
  };
}

/** „Sprawdź”: liczby z wpisaną błędną literą (puste się nie liczą). */
export function wrongNumbers(s: CryptoState): number[] {
  return s.key.flatMap((ch, i) => (s.guesses[i] !== null && s.guesses[i] !== ch ? [i + 1] : []));
}

/** Hasło jako liczby (null — przerwa między słowami). Litera hasła spoza planszy to błąd danych. */
export function solutionNumbers(p: Puzzle, s: CryptoState): (number | null)[] {
  return [...p.solution].map((ch) => {
    if (ch === ' ') return null;
    const n = s.key.indexOf(ch) + 1;
    if (n === 0) throw new Error(`Litera hasła ${ch} spoza planszy ${p.id}`);
    return n;
  });
}

/** Postęp w zestawie: numer obrotu (kolejność plansz) i rozwiązane plansze. */
export interface Progress {
  round: number;
  solved: string[];
}

export function readProgress(raw: unknown): Progress {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { round: 0, solved: [] };
    }
  }
  if (!data || typeof data !== 'object') return { round: 0, solved: [] };
  const { round, solved } = data as { round?: unknown; solved?: unknown };
  return {
    round: Number.isInteger(round) && (round as number) >= 0 ? (round as number) : 0,
    solved: Array.isArray(solved) ? [...new Set(solved.filter((x): x is string => typeof x === 'string'))] : [],
  };
}

export function markSolved(pr: Progress, id: string): Progress {
  return pr.solved.includes(id) ? pr : { ...pr, solved: [...pr.solved, id] };
}

/** Kolejność plansz w danym obrocie (każdy obrót inaczej potasowany). */
export function puzzleOrder(puzzles: readonly Puzzle[], round: number): Puzzle[] {
  return shuffle(puzzles, seededRng(1000 + round));
}

/**
 * Następna plansza: pierwsza nierozwiązana w kolejności obrotu, z pominięciem `skip` (porzuconej), chyba że to
 * jedyna nierozwiązana. Gdy wszystkie są rozwiązane — nowy obrót (inna kolejność, pusta lista).
 */
export function nextPuzzle(puzzles: readonly Puzzle[], pr: Progress, skip?: string): { puzzle: Puzzle; progress: Progress } {
  const done = new Set(pr.solved);
  let progress = pr;
  let open = puzzleOrder(puzzles, pr.round).filter((p) => !done.has(p.id));
  if (open.length === 0) {
    progress = { round: pr.round + 1, solved: [] };
    open = puzzleOrder(puzzles, progress.round);
  }
  return { puzzle: open.find((p) => p.id !== skip) ?? open[0], progress };
}

/** Zapis trwającej planszy (format 2: plansza z zestawu + wpisane litery). */
export function writePuzzleSave(s: CryptoState): string {
  return JSON.stringify({ v: 2, id: s.id, guesses: s.guesses, revealed: s.revealed, hints: s.hints });
}

/** Odczyt zapisu formatu 2. Stary format, uszkodzony, nieznana plansza albo już rozwiązana → null. */
export function readPuzzleSave(raw: unknown, puzzles: readonly Puzzle[]): CryptoState | null {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const { v, id, guesses, revealed, hints } = data as Record<string, unknown>;
  if (v !== 2 || typeof id !== 'string') return null;
  const puzzle = puzzles.find((p) => p.id === id);
  if (!puzzle) return null;
  const base = puzzleState(puzzle);
  const n = base.key.length;
  if (!Array.isArray(guesses) || guesses.length !== n) return null;
  if (!guesses.every((g) => g === null || (typeof g === 'string' && ALPHABET_SET.has(g)))) return null;
  const typed = guesses.filter((g) => g !== null);
  if (new Set(typed).size !== typed.length) return null;
  if (!Array.isArray(revealed) || revealed.length !== n || !revealed.every((r) => typeof r === 'boolean')) return null;
  if (!revealed.every((r, i) => !r || guesses[i] === base.key[i])) return null;
  if (!base.revealed.every((r, i) => !r || revealed[i])) return null;
  if (!Number.isInteger(hints) || (hints as number) < 0 || (hints as number) > MAX_HINTS) return null;
  const s: CryptoState = { ...base, guesses: guesses as (string | null)[], revealed: revealed as boolean[], hints: hints as number };
  return isSolved(s) ? null : s;
}
```

- [ ] **Step 5: Testy przechodzą, stare też**

Run: `npx vitest run tests/games` i `npx tsc --noEmit -p .`
Expected: wszystkie testy PASS (w tym stary `cryptoLogic.test.ts`), tsc bez błędów.

- [ ] **Step 6: Commit**

```bash
git add src/games/cryptoLogic.ts tests/games/cryptoPuzzleLogic.test.ts
git commit -m "Szyfrokrzyżówka: logika planszy gazetowej (stałe liczby, Sprawdź, hasło, kolejność, zapis)"
```

---

### Task 5: Zestaw 40 plansz

**Files:**
- Create: `tests/games/cryptoPuzzles.test.ts`, `src/games/cryptoPuzzles.ts`
- Generate: `src/games/cryptoPuzzles.json`

- [ ] **Step 1: Test zestawu** — `tests/games/cryptoPuzzles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ALPHABET, COLS, ROWS, puzzleLetters, puzzleState, solutionNumbers } from '../../src/games/cryptoLogic';
import { PUZZLES } from '../../src/games/cryptoPuzzles';

/** Słowa planszy: ciągi ≥ 2 liter w wierszach i kolumnach. */
function words(grid: readonly string[]): string[] {
  const rows = grid.map((r) => [...r]);
  const lines = [...rows, ...Array.from({ length: COLS }, (_, c) => rows.map((r) => r[c]))];
  return lines.flatMap((line) => line.join('').split('#').filter((w) => [...w].length >= 2));
}

describe('zestaw plansz szyfrokrzyżówki', () => {
  it('40 plansz z unikalnymi id', () => {
    expect(PUZZLES).toHaveLength(40);
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(40);
  });

  it('siatka 9×9, tylko polskie litery i #, 18–26% zaczernionych pól', () => {
    for (const p of PUZZLES) {
      expect(p.grid, p.id).toHaveLength(ROWS);
      for (const row of p.grid) {
        expect([...row], p.id).toHaveLength(COLS);
        for (const ch of row) expect(ch === '#' || ALPHABET.includes(ch), `${p.id}: ${ch}`).toBe(true);
      }
      const blocks = puzzleLetters(p).filter((ch) => ch === null).length;
      expect(blocks / (ROWS * COLS), p.id).toBeGreaterThanOrEqual(0.18);
      expect(blocks / (ROWS * COLS), p.id).toBeLessThanOrEqual(0.26);
    }
  });

  it('każde białe pole leży w słowie w poziomie albo w pionie; słowa w planszy się nie powtarzają', () => {
    for (const p of PUZZLES) {
      const L = puzzleLetters(p);
      const white = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS && L[r * COLS + c] !== null;
      L.forEach((ch, i) => {
        if (ch === null) return;
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        expect(white(r, c - 1) || white(r, c + 1) || white(r - 1, c) || white(r + 1, c), `${p.id} pole ${i}`).toBe(true);
      });
      const ws = words(p.grid);
      expect(new Set(ws).size, p.id).toBe(ws.length);
    }
  });

  it('hasło 8–14 liter z liter planszy; słowa osobiste są w siatce', () => {
    for (const p of PUZZLES) {
      const letters = [...p.solution.replaceAll(' ', '')];
      expect(letters.length, p.id).toBeGreaterThanOrEqual(8);
      expect(letters.length, p.id).toBeLessThanOrEqual(14);
      expect(() => solutionNumbers(p, puzzleState(p)), p.id).not.toThrow();
      expect(p.personal.length, p.id).toBeGreaterThanOrEqual(1);
      for (const w of p.personal) expect(words(p.grid), `${p.id}: ${w}`).toContain(w);
    }
  });
});
```

- [ ] **Step 2: Moduł zestawu** — `src/games/cryptoPuzzles.ts`:

```ts
import data from './cryptoPuzzles.json';
import type { Puzzle } from './cryptoLogic';

/** Gotowy zestaw plansz Szyfrokrzyżówki (układa je tools/make_crypto.py). */
export const PUZZLES: readonly Puzzle[] = data.puzzles;
```

- [ ] **Step 3: Uruchom test — ma się nie udać**

Run: `npx vitest run tests/games/cryptoPuzzles.test.ts`
Expected: FAIL — brak `cryptoPuzzles.json` (albo 3 plansze z próby w Task 3).

- [ ] **Step 4: Wygeneruj zestaw**

Run: `/c/gvenv/Scripts/python tools/make_crypto.py --count 40 --seed 1` (w tle, z przekierowaniem do pliku dziennika w scratchpadzie)
Expected: 40 linii postępu i „Zapisano 40 plansz…”.

- [ ] **Step 5: Obejrzyj podgląd** — otwórz `tools/out/crypto_preview.png` (Read). Sprawdź: słowa wyglądają na prawdziwe i znane, nie ma słów niestosownych, hasła są różne. Słowa podejrzane usuń z `slowa.txt` i wygeneruj ponownie (ten sam `--seed`).

- [ ] **Step 6: Testy zestawu przechodzą**

Run: `npx vitest run tests/games/cryptoPuzzles.test.ts` i `npx tsc --noEmit -p .`
Expected: PASS, tsc bez błędów.

- [ ] **Step 7: Commit**

```bash
git add src/games/cryptoPuzzles.json src/games/cryptoPuzzles.ts tests/games/cryptoPuzzles.test.ts tools/crypto/slowa.txt
git commit -m "Szyfrokrzyżówka: zestaw 40 plansz z hasłami i test zestawu"
```

---

### Task 6: Ekran gry, animacje i dźwięki; usunięcie starego układania

**Files:**
- Modify (całe pliki): `src/games/cryptoGame.ts`, `src/styles/crypto.css`
- Modify: `src/games/cryptoLogic.ts` (usunięcie starego kodu)
- Delete: `src/games/cryptoWords.ts`, `tests/games/cryptoLogic.test.ts`

- [ ] **Step 1: Usuń stare układanie z `src/games/cryptoLogic.ts`** — usuń: `GRID_SIZE`, `MIN_WORDS`, `MIN_PERSONAL`, `MAX_WORDS`, `MAX_ATTEMPTS`, `Dir`, `PlacedWord`, `Crossword`, `normalizeWords`, całą sekcję „Układanie krzyżówki” (`Board`, `newBoard`, `step`, `canPlace`, `place`, `tryAdd`, `attempt`, `crop`, `buildCrossword`), `cipher`, `revealStart`, `createPuzzle`, `newPuzzle`, `serializeSave`, `parseSave`, `isInt`. Zostają: `Rng`, `ALPHABET`, `ALPHABET_SET`, `MAX_HINTS`, `CryptoState`, `seededRng`, `shuffle`, `applyGuess`, `isSolved`, `unsolvedNumbers`, `hint`, `cryptoScore`, `cryptoReward`, `SAVE_KEY` i cała sekcja „Plansze gazetowe”. Opis `id` w `CryptoState` zmień na `/** Plansza z zestawu (`Puzzle.id`). */`.

- [ ] **Step 2: Usuń stare pliki**

```bash
git rm src/games/cryptoWords.ts tests/games/cryptoLogic.test.ts
```

- [ ] **Step 3: Ekran** — zastąp całą zawartość `src/games/cryptoGame.ts`:

```ts
import '../styles/crypto.css';
import { confetti } from '../ui/confetti';
import { h } from '../ui/dom';
import { play } from '../ui/sound';
import {
  ALPHABET,
  MAX_HINTS,
  PROGRESS_KEY,
  SAVE_KEY,
  applyGuess,
  cryptoReward,
  cryptoScore,
  hint,
  isSolved,
  markSolved,
  nextPuzzle,
  puzzleState,
  readProgress,
  readPuzzleSave,
  solutionNumbers,
  wrongNumbers,
  writePuzzleSave,
  type CryptoState,
  type Progress,
  type Puzzle,
} from './cryptoLogic';
import { PUZZLES } from './cryptoPuzzles';
import type { GameEnv, MiniGame } from './types';

export { cryptoReward } from './cryptoLogic';

/** Klawiatura: 32 litery i gumka w trzech rzędach po 11. */
const KEY_ROWS: readonly (readonly string[])[] = [ALPHABET.slice(0, 11), ALPHABET.slice(11, 22), [...ALPHABET.slice(22), '⌫']];

/** „1 litera”, „2 litery”, „5 liter”, „22 litery”. */
const lettersWord = (n: number) => (n === 1 ? 'litera' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'litery' : 'liter');

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* brak miejsca / tryb prywatny — gra działa dalej bez zapisu */
  }
}

/** Ekran wyboru, gdy jest niedokończona plansza: true — kontynuuj, false — nowa plansza. */
function askContinue(env: GameEnv): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (keep: boolean) => {
      box.remove();
      resolve(keep);
    };
    const box = h(
      'div',
      { class: 'dialog px-box crypto-start' },
      h('h2', {}, 'Szyfrokrzyżówka'),
      h('p', {}, 'Masz niedokończoną planszę.'),
      h(
        'div',
        { class: 'dialog-actions' },
        h('button', { class: 'px-btn', onclick: () => done(true) }, 'Kontynuuj'),
        h('button', { class: 'px-btn secondary', onclick: () => done(false) }, 'Nowa plansza'),
      ),
    );
    env.body.append(box);
  });
}

function playBoard(env: GameEnv, puzzle: Puzzle, initial: CryptoState, progress: Progress, total: number): Promise<number> {
  return new Promise((resolve) => {
    let s = initial;
    let finished = false;
    let message = '';
    /** Liczby zaznaczone na czerwono po „Sprawdź” (do czasu zmiany ich litery). */
    const flagged = new Set<number>();
    const timers = new Set<number>();
    const N = s.key.length;
    const position = progress.solved.length + 1;
    const sol = solutionNumbers(puzzle, s);

    // --- tabela liter: liczby 1..N w dwóch rzędach
    const keyCells = Array.from({ length: N }, (_, k) => {
      const letter = h('span', { class: 'cx-k-l' });
      const btn = h('button', { class: 'cx-k', 'aria-label': `Liczba ${k + 1}` }, h('span', { class: 'cx-k-n' }, k + 1), letter);
      btn.addEventListener('click', () => {
        const i = s.cells.indexOf(k + 1);
        if (i >= 0) select(i);
      });
      return { btn, letter };
    });
    const keytab = h('div', { class: 'cx-keytab', style: `--kcols:${Math.ceil(N / 2)}` }, ...keyCells.map((c) => c.btn));

    // --- siatka (--d: przekątna — opóźnienie fali przy wygranej)
    const cellEls: (HTMLButtonElement | null)[] = [];
    const letterEls: (HTMLSpanElement | null)[] = [];
    const grid = h('div', { class: 'crypto-grid', style: `--cols:${s.cols};--rows:${s.rows}` });
    s.cells.forEach((n, i) => {
      const d = Math.floor(i / s.cols) + (i % s.cols);
      if (n === null) {
        cellEls.push(null);
        letterEls.push(null);
        grid.append(h('div', { class: 'cx-block', style: `--d:${d}` }));
        return;
      }
      const letter = h('span', { class: 'cx-letter' });
      const btn = h('button', { class: 'cx-cell', style: `--d:${d}`, 'aria-label': `Pole z liczbą ${n}` }, h('span', { class: 'cx-num' }, n), letter);
      btn.addEventListener('click', () => select(i));
      cellEls.push(btn);
      letterEls.push(letter);
      grid.append(btn);
    });

    // --- hasło
    const solItems = sol.map((n) => {
      if (n === null) return { n, box: h('span', { class: 'cx-sol-gap' }), letter: null };
      const letter = h('span', { class: 'cx-sol-l' });
      return { n, box: h('div', { class: 'cx-sol-box' }, h('span', { class: 'cx-sol-n' }, n), letter), letter };
    });
    const solution = h('div', { class: 'cx-solution', 'aria-label': 'Hasło' }, ...solItems.map((x) => x.box));
    const big = h('p', { class: 'cx-big', 'aria-live': 'polite' });

    // --- klawiatura i przyciski
    const keyEls = new Map<string, HTMLButtonElement>();
    const kb = h(
      'div',
      { class: 'crypto-kb' },
      ...KEY_ROWS.map((row) =>
        h(
          'div',
          { class: 'cx-kb-row' },
          ...row.map((ch) => {
            const erase = ch === '⌫';
            const key = h('button', { class: erase ? 'cx-key cx-erase' : 'cx-key', 'aria-label': erase ? 'Gumka' : ch }, ch);
            key.addEventListener('click', () => guess(erase ? null : ch));
            if (!erase) keyEls.set(ch, key);
            return key;
          }),
        ),
      ),
    );
    const checkBtn = h('button', { class: 'px-btn secondary cx-check' }, 'Sprawdź');
    checkBtn.addEventListener('click', check);
    const hintBtn = h('button', { class: 'px-btn cx-hint' });
    hintBtn.addEventListener('click', useHint);
    const status = h('p', { class: 'crypto-status', 'aria-live': 'polite' });
    const actions = h('div', { class: 'crypto-actions' }, checkBtn, hintBtn);

    const root = h('div', { class: 'crypto' }, keytab, grid, solution, big, status, kb, actions);
    env.body.append(root);

    let selected = s.cells.findIndex((n) => n !== null && s.guesses[n - 1] === null);
    if (selected < 0) selected = s.cells.findIndex((n) => n !== null);
    const selNum = () => s.cells[selected] ?? 0;

    function render(): void {
      const sn = selNum();
      s.cells.forEach((n, i) => {
        const el = cellEls[i];
        if (!el || n === null) return;
        letterEls[i]!.textContent = s.guesses[n - 1] ?? '';
        el.classList.toggle('given', s.revealed[n - 1]);
        el.classList.toggle('same', n === sn);
        el.classList.toggle('sel', i === selected);
        el.classList.toggle('bad', flagged.has(n));
      });
      keyCells.forEach(({ btn, letter }, k) => {
        letter.textContent = s.guesses[k] ?? '';
        btn.classList.toggle('given', s.revealed[k]);
        btn.classList.toggle('same', k + 1 === sn);
        btn.classList.toggle('bad', flagged.has(k + 1));
      });
      for (const { n, letter } of solItems) if (letter && n !== null) letter.textContent = s.guesses[n - 1] ?? '';
      const used = new Map<string, number>();
      s.guesses.forEach((g, k) => g && used.set(g, k));
      for (const [ch, key] of keyEls) {
        const k = used.get(ch);
        key.classList.toggle('used', k !== undefined);
        key.classList.toggle('given', k !== undefined && s.revealed[k]);
        key.classList.toggle('current', k !== undefined && k + 1 === sn);
      }
      const left = MAX_HINTS - s.hints;
      hintBtn.textContent = `Podpowiedź (−10) · ${left}`;
      hintBtn.disabled = finished || left <= 0;
      checkBtn.disabled = finished;
      status.textContent = message || 'Stuknij pole i wybierz literę.';
      env.setHud(`Plansza ${position}/${total} · podp. ${s.hints}/${MAX_HINTS}`);
    }

    /** Klasa animacji na chwilę (zdjęta po `ms`, żeby mogła zagrać ponownie). */
    function flash(el: Element, cls: string, ms: number): void {
      el.classList.remove(cls);
      void (el as HTMLElement).offsetWidth;
      el.classList.add(cls);
      later(() => el.classList.remove(cls), ms);
    }

    /** Pola z liczbą `n` animują się (`cls`), kratki hasła się obracają; dzwoneczek, gdy hasło zyskało literę. */
    function animateNumber(n: number, cls: string): void {
      s.cells.forEach((m, i) => {
        if (m === n && cellEls[i]) flash(cellEls[i]!, cls, 700);
      });
      let inSolution = false;
      for (const item of solItems) {
        if (item.n !== n) continue;
        flash(item.box, 'flip', 400);
        inSolution = true;
      }
      if (inSolution && s.guesses[n - 1] !== null) later(() => play('line'), 120);
    }

    function select(i: number): void {
      if (finished) return;
      if (i !== selected) play('tick');
      selected = i;
      message = s.revealed[selNum() - 1] ? 'Ta litera jest już odkryta.' : '';
      render();
    }

    /** Następne pole (w kolejności czytania) z liczbą bez wpisanej litery. */
    function advance(): void {
      const count = s.cells.length;
      for (let d = 1; d <= count; d++) {
        const i = (selected + d) % count;
        const n = s.cells[i];
        if (n !== null && s.guesses[n - 1] === null) {
          selected = i;
          return;
        }
      }
    }

    /** Strzałki: następne białe pole w danym kierunku (zaczernione pomijane, na brzegu zostaje). */
    function move(dr: number, dc: number): void {
      if (finished || selected < 0) return;
      let r = Math.floor(selected / s.cols);
      let c = selected % s.cols;
      for (;;) {
        r += dr;
        c += dc;
        if (r < 0 || r >= s.rows || c < 0 || c >= s.cols) return;
        const i = r * s.cols + c;
        if (s.cells[i] !== null) {
          select(i);
          return;
        }
      }
    }

    function commit(next: CryptoState): void {
      // zmieniona litera zdejmuje czerwone zaznaczenie (także z liczby, z której litera się przeniosła)
      next.guesses.forEach((g, k) => {
        if (g !== s.guesses[k]) flagged.delete(k + 1);
      });
      s = next;
      if (isSolved(s)) {
        win();
        return;
      }
      store(SAVE_KEY, writePuzzleSave(s));
      render();
    }

    function guess(letter: string | null): void {
      if (finished || env.signal.aborted) return;
      const n = selNum();
      if (!n) return;
      if (s.revealed[n - 1]) {
        message = 'Ta litera jest już odkryta.';
        render();
        return;
      }
      const next = applyGuess(s, n, letter);
      if (next === s) {
        if (letter && s.guesses[n - 1] !== letter) {
          play('nope');
          message = `Litera ${letter} jest już odkryta gdzie indziej.`;
          const key = keyEls.get(letter);
          if (key) flash(key, 'shake', 320);
          render();
        }
        return;
      }
      message = '';
      play(letter ? 'type' : 'erase');
      if (letter) advance();
      commit(next);
      if (letter && !finished) animateNumber(n, 'pop');
    }

    function check(): void {
      if (finished || env.signal.aborted) return;
      const wrong = wrongNumbers(s);
      flagged.clear();
      for (const n of wrong) flagged.add(n);
      if (wrong.length > 0) {
        play('nope');
        message = `Do poprawy: ${wrong.length} ${lettersWord(wrong.length)} (na czerwono).`;
        render();
        s.cells.forEach((n, i) => {
          if (n !== null && flagged.has(n) && cellEls[i]) flash(cellEls[i]!, 'shake', 320);
        });
        return;
      }
      play('match');
      message = s.guesses.every((g) => g !== null) ? 'Wszystko się zgadza!' : 'Na razie bez błędów!';
      render();
      flash(grid, 'ok-flash', 650);
    }

    function useHint(): void {
      if (finished || env.signal.aborted || s.hints >= MAX_HINTS) return;
      const next = hint(s, Math.random, selNum() || undefined);
      if (next === s) return;
      const n = next.revealed.findIndex((r, k) => r && !s.revealed[k]) + 1;
      message = `Podpowiedź: −10 monet z nagrody (zostało ${MAX_HINTS - next.hints}).`;
      play('sparkle');
      commit(next);
      if (!finished && n > 0) animateNumber(n, 'gold');
    }

    function win(): void {
      finished = true;
      flagged.clear();
      store(SAVE_KEY, null);
      store(PROGRESS_KEY, JSON.stringify(markSolved(progress, puzzle.id)));
      message = 'Brawo! Hasło odszyfrowane!';
      selected = -1;
      big.textContent = puzzle.solution;
      render();
      root.classList.add('solved');
      confetti(env.body);
      play('match');
      later(() => resolve(cryptoScore(s.hints)), 2200);
    }

    function later(fn: () => void, ms: number): void {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!env.signal.aborted) fn();
      }, ms);
      timers.add(id);
    }

    const ARROWS: Readonly<Record<string, readonly [number, number]>> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const onKey = (e: KeyboardEvent) => {
      // AltGr (polskie litery na Windows) zgłasza Ctrl+Alt — tego nie blokujemy.
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        guess(null);
        return;
      }
      const arrow = ARROWS[e.key];
      if (arrow) {
        e.preventDefault();
        move(arrow[0], arrow[1]);
        return;
      }
      const ch = e.key.toLocaleUpperCase('pl');
      if (ALPHABET.includes(ch)) {
        e.preventDefault();
        guess(ch);
      }
    };
    window.addEventListener('keydown', onKey);
    env.signal.addEventListener('abort', () => {
      window.removeEventListener('keydown', onKey);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    });

    store(SAVE_KEY, writePuzzleSave(s));
    render();
  });
}

export const cryptoGame: MiniGame = {
  id: 'crypto',
  name: 'Szyfrokrzyżówka',
  description: 'Rozszyfruj krzyżówkę i odczytaj hasło',
  icon: 'letters',
  category: 'puzzle',
  reward: cryptoReward,
  async play(env) {
    let progress = readProgress(load(PROGRESS_KEY));
    const saved = readPuzzleSave(load(SAVE_KEY), PUZZLES);
    const keep = saved ? await askContinue(env) : false;
    if (env.signal.aborted) return new Promise<number>(() => {});
    if (saved && keep) return playBoard(env, PUZZLES.find((p) => p.id === saved.id)!, saved, progress, PUZZLES.length);
    const next = nextPuzzle(PUZZLES, progress, saved?.id);
    progress = next.progress;
    store(PROGRESS_KEY, JSON.stringify(progress));
    return playBoard(env, next.puzzle, puzzleState(next.puzzle), progress, PUZZLES.length);
  },
};
```

- [ ] **Step 4: Wygląd i animacje** — zastąp całą zawartość `src/styles/crypto.css`:

```css
/* Szyfrokrzyżówka jak z gazety: tabela liter, siatka 9×9 z zaczernionymi polami, hasło, klawiatura */
.crypto {
  align-self: stretch;
  width: 100%;
  max-width: 440px;
  min-height: 0;
  container-type: size;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: 6px;
}

/* tabela liter: liczby 1..N w dwóch rzędach, pod każdą litera */
.cx-keytab { display: grid; grid-template-columns: repeat(var(--kcols), minmax(0, 1fr)); gap: 1px; width: 100%; flex: none; background: var(--ink); border: 1px solid var(--ink); }
.cx-k { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 2px 0 1px; border: 0; font: inherit; color: var(--text); background: var(--panel); cursor: pointer; }
.cx-k-n { font-size: 10px; line-height: 1; color: var(--text-soft); }
.cx-k-l { font-size: 15px; line-height: 17px; min-height: 17px; font-weight: 700; color: var(--accent-2); }
.cx-k.given .cx-k-l { color: var(--text); }
.cx-k.same { background: var(--coin); }
.cx-k.bad .cx-k-l { color: var(--danger); }

.crypto-grid {
  /* bok pola: plansza mieści się w szerokości i zostawia ~340 px na tabelę, hasło, klawiaturę i przyciski */
  --gap: 1px;
  --cell: max(22px, min(
    40px,
    calc((100cqw - (var(--cols) - 1) * var(--gap) - 6px) / var(--cols)),
    calc((100cqh - 340px - (var(--rows) - 1) * var(--gap)) / var(--rows))
  ));
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-auto-rows: var(--cell);
  gap: var(--gap);
  flex: none;
  padding: 2px;
  background: var(--ink);
}
.cx-block { background: var(--energy); }
.cx-cell { position: relative; display: grid; place-items: center; padding: 0; border: 0; font: inherit; color: var(--accent-2); background: var(--panel); cursor: pointer; transition: background-color 120ms; }
.cx-num { position: absolute; left: 2px; top: 1px; font-size: max(8px, calc(var(--cell) * .26)); line-height: 1; color: var(--text-soft); }
.cx-letter { font-size: calc(var(--cell) * .54); line-height: 1; margin-top: calc(var(--cell) * .14); font-weight: 700; }
.cx-cell.given { color: var(--text); }
.cx-cell.same { background: #fff1b8; }
.cx-cell.sel { background: var(--coin); }
.cx-cell.bad { color: var(--danger); }

/* animacje: litera wskakuje, błąd się trzęsie, podpowiedź błyska złotem, „Sprawdź” bez błędów — zielony błysk, wygrana — fala */
.cx-cell.pop .cx-letter { animation: cx-pop-in 260ms cubic-bezier(.2, 1.6, .4, 1); }
@keyframes cx-pop-in { from { transform: scale(.3); } }
.cx-cell.shake { animation: shake 320ms steps(8); }
.cx-cell.gold { animation: cx-gold 700ms ease-out; }
@keyframes cx-gold { 30% { background: var(--coin); } }
.crypto-grid.ok-flash { animation: cx-ok 650ms ease-out; }
@keyframes cx-ok { 40% { box-shadow: 0 0 0 6px #6fdc8c; } }
.crypto.solved .cx-cell { background: #e3ffd9; animation: cx-wave 500ms steps(5) calc(var(--d) * 45ms) backwards; }
@keyframes cx-wave { 50% { transform: scale(1.15); background: var(--coin); } }

/* hasło */
.cx-solution { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; flex: none; }
.cx-sol-box { width: 26px; display: flex; flex-direction: column; align-items: center; background: #ffe58a; color: var(--text); box-shadow: 0 0 0 1px var(--ink); }
.cx-sol-n { font-size: 9px; line-height: 1; padding-top: 1px; color: var(--text-soft); }
.cx-sol-l { font-size: 15px; line-height: 18px; min-height: 18px; font-weight: 700; }
.cx-sol-gap { width: 10px; }
.cx-sol-box.flip { animation: cx-flip 380ms ease-out; }
@keyframes cx-flip { from { transform: rotateY(90deg); } }
.cx-big { margin: 0; font-size: 26px; font-weight: 700; color: var(--coin); text-shadow: 2px 2px 0 var(--ink); text-align: center; }
.cx-big:empty { display: none; }
.crypto.solved .cx-big { animation: pop-in 420ms cubic-bezier(.2, 1.5, .4, 1); }

.crypto-status { margin: 0; min-height: 18px; font-size: 14px; color: var(--text-light); text-align: center; }

/* klawiatura: 3 rzędy po 11 (32 litery + gumka) */
.crypto-kb { display: grid; gap: 4px; width: 100%; flex: none; padding: 0 2px; }
.cx-kb-row { display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 3px; }
.cx-key { height: 36px; padding: 0; border: 0; font: inherit; font-size: 16px; color: var(--text); background: var(--panel); box-shadow: 0 0 0 2px var(--ink), inset 0 -3px 0 0 var(--panel-2); cursor: pointer; }
.cx-key:active { transform: translateY(2px); }
.cx-key.used { background: var(--panel-2); color: var(--text-soft); }
.cx-key.given { opacity: .4; }
.cx-key.current { background: var(--coin); color: var(--text); }
.cx-key.cx-erase { background: var(--bg-2); color: var(--text-light); }
.cx-key.shake { animation: shake 320ms steps(8); }

.crypto-actions { display: flex; justify-content: center; gap: 10px; flex: none; width: 100%; }
.crypto-actions .px-btn { flex: 1; padding: 9px 10px; font-size: 15px; }

.crypto-start { align-self: center; }
.crypto-start h2 { font-size: 22px; margin: 0 0 8px; }
```

- [ ] **Step 5: Typy, testy, build**

Run: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`
Expected: bez błędów; wszystkie testy PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src/games src/styles/crypto.css tests/games
git commit -m "Szyfrokrzyżówka jak z gazety: ekran z tabelą liter, hasłem i Sprawdź, animacje i dźwięki"
```

---

### Task 7: Zasady, „Co nowego?”, notatki i sprawdzenie w przeglądarce

**Files:**
- Modify: `src/games/rules.ts` (wpis `crypto`), `src/core/changelog.ts` (`RELEASES`), `docs/NASTEPNA-SESJA.md`, `docs/AKTUALIZACJE.md`

- [ ] **Step 1: Zasady** — w `src/games/rules.ts` zastąp wpis `crypto`:

```ts
  crypto: {
    goal: 'Rozszyfruj krzyżówkę i odczytaj hasło z żółtych kratek na dole.',
    how: [
      'Każda liczba to zawsze ta sama litera — u góry jest tabela liter. Cztery litery są odkryte na start.',
      'Stuknij pole, potem literę: wpisze się we wszystkich polach z tą liczbą, w tabeli i w haśle.',
      'Niebieskie pola są zaczernione — rozdzielają słowa w wierszach i kolumnach.',
      '„Sprawdź” zaznacza na czerwono błędne litery — ile razy chcesz.',
      'Podpowiedź odkrywa jedną liczbę (najwyżej 3 podpowiedzi).',
      'W planszach są słowa o Gabi, a hasła to wspólne żarty i ulubione rzeczy.',
      'Grę możesz przerwać — plansza zapisze się i dokończysz ją później.',
    ],
    scoring: ['Ukończenie: 60 monet, każda podpowiedź −10 (najmniej 30).', 'Do tego +15 humoru.'],
  },
```

- [ ] **Step 2: „Co nowego?”** — w `src/core/changelog.ts` dopisz na górze `RELEASES` (data = dzień wydania; poniżej data planu):

```ts
  {
    version: 2,
    date: '2026-10-15',
    changes: [
      'Nowa szyfrokrzyżówka jak z gazety: 40 plansz z ukrytymi hasłami o Gabi.',
      'Przycisk „Sprawdź” zaznacza błędne litery na czerwono.',
    ],
  },
```

- [ ] **Step 3: Notatki** — dopisz na końcu `docs/NASTEPNA-SESJA.md`:

```markdown
## Szyfrokrzyżówka jak z gazety (2026-10-15)
- Jedna plansza 9×9 z zaczernionymi polami, tabela liter, hasło, „Sprawdź”, 3 podpowiedzi; 40 gotowych plansz
  w `src/games/cryptoPuzzles.json` (`PUZZLES`), kolejność i rozwiązane w `gabigochi.game.cryptoSolved`,
  trwająca plansza w `gabigochi.game.crypto` (format 2).
- Generator: `tools/make_crypto.py` (`--selftest`, `--count 40 --seed 1`), słowniki w `tools/crypto/`, podgląd
  `tools/out/crypto_preview.png`. Nowa paczka plansz = dopisanie haseł/słów, nowe `--seed`, test zestawu.
```

oraz w `docs/AKTUALIZACJE.md` pod „Zasady, żeby stare zapisy przetrwały” punkt:

```markdown
- Plansze szyfrokrzyżówki: istniejących `id` (`p01`…) nie zmieniaj — trwająca plansza i lista rozwiązanych
  odwołują się do nich. Nowe plansze dopisuj z nowymi `id`.
```

- [ ] **Step 4: Testy i build**

Run: `npx vitest run`, `npx tsc --noEmit -p .`, `npm run build`
Expected: wszystko przechodzi (test zasad sprawdza „najwyżej 3 podpowiedzi”, test wersji — rosnące numery).

- [ ] **Step 5: Sprawdzenie w przeglądarce (rozmiar telefonu 375×812)** — przed testem kopia zapisu gry
  (`localStorage['gabigochi.save']` → `gabigochi.save.backup-crypto`), po teście przywrócenie i usunięcie kopii (zablokowane `setItem` przy przywracaniu, jak w poprzednich testach). Uruchom serwer `gabigochi` (preview_start), Graj → Szyfrokrzyżówka:
  - układ mieści się bez przewijania, cyfry w polach czytelne;
  - stuknięcie pola podświetla liczbę w siatce i tabeli; wpisana litera wskakuje we wszystkie pola i kratki hasła;
  - zła litera + „Sprawdź” → czerwone, trzęsie się; poprawienie zdejmuje czerwień; bez błędów — zielony błysk;
  - podpowiedź odkrywa liczbę ze złotym błyskiem, licznik w HUD rośnie;
  - rozwiązanie (litery z `cryptoPuzzles.json`) → fala, konfetti, hasło dużymi literami, okno nagrody;
  - wyjście w trakcie i ponowne wejście → „Kontynuuj / Nowa plansza”; brak błędów w konsoli.

- [ ] **Step 6: Commit**

```bash
git add src/games/rules.ts src/core/changelog.ts docs/NASTEPNA-SESJA.md docs/AKTUALIZACJE.md
git commit -m "Szyfrokrzyżówka: zasady, wpis Co nowego (wersja 2), notatki"
```

---

### Task 8: Wydanie (tylko za zgodą użytkownika)

- [ ] **Step 1: Zapytaj użytkownika o zgodę** na wypchnięcie — to wydanie trafi do telefonu Gabi (pamięć: „confirm each later push/deploy”).

- [ ] **Step 2: Po zgodzie — wypchnięcie**

```bash
git branch -f main etap-1
git push origin main etap-1
```

- [ ] **Step 3: Poczekaj na workflow „Deploy”** (API `https://api.github.com/repos/AlecKusi/gabigochi/actions/runs?per_page=1`, pętla w tle do `"status": "completed"`), sprawdź `conclusion: success`, otwórz `https://aleckusi.github.io/gabigochi/?play` i Graj → Szyfrokrzyżówka (rozmiar telefonu), brak błędów w konsoli.
