# Minigry etapu 2: Sudoku, Bricks n Balls, Szyfrokrzyżówki — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Trzy brakujące minigry z pierwotnej specyfikacji (§8 „Etap 2” w `docs/superpowers/specs/2026-10-06-urodzinowe-tamagotchi-design.md`), wpięte w istniejący szkielet minigier.

**Architecture:** Każda gra = czysty moduł logiki z testami (`src/games/<gra>Logic.ts`) + moduł UI (`src/games/<gra>Game.ts`) implementujący `MiniGame` (`src/games/types.ts`: `play(env) → Promise<score>`, `reward(score)`). Rejestracja w `src/games/index.ts` (`GAMES`), usunięcie z `COMING_SOON`. Nagrody w `src/games/rewards.ts` (z testami). Wspólne: `src/games/canvas.ts` (PixelStage, `makeCanvas`, `runLoop`), `src/games/shell.ts` (nagłówek, HUD, panel końca), style w `src/styles/games.css`.

**Konwencje:** repo `C:\Users\Al8c\Documents\gabigochi`, gałąź `etap-1`; pliki Write/Edit (heredoki psują polskie znaki); TDD dla logiki; commit z drugim `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`; w podglądzie tylko jedna karta z grą.

## Wspólne ustalenia
- Gry otwierają się z listy minigier jak dotychczas (sekcje Zręcznościowe / Łamigłówki), koszt energii i bonusy jak w innych grach (`applyGameResult`).
- Łamigłówki z poziomem trudności: wybór poziomu na ekranie startowym gry (przyciski „Łatwe / Średnie / Trudne”) wewnątrz `env.body`; `score` koduje wynik tak, by `reward(score)` dało właściwą nagrodę (np. Sudoku: score = 30/50/80 przy ukończeniu, 0 przy poddaniu się).
- Zapis rozgrywki w toku (Sudoku, krzyżówka): `localStorage` pod osobnym kluczem gry (`gabigochi.game.sudoku`, `gabigochi.game.crypto`) — **nie** w `GameState`; przy otwarciu gry: „Kontynuuj” / „Nowa plansza”. Wartość walidowana przy odczycie (uszkodzona → ignoruj).
- Mobile 375×812: plansze mieszczą się bez przewijania poziomego; własna klawiatura ekranowa (cyfry / litery), duże pola dotyku (≥ 32 px).
- Pikselowy styl jak reszta (fiolet, `px-box`, `px-btn`, czcionka Pixelify Sans).

### Task 1: Sudoku
- `src/games/sudokuLogic.ts`: `generateSolved(rng)`, `makePuzzle(solved, difficulty, rng)` (usuwanie cyfr z kontrolą jednoznaczności — `countSolutions(grid, limit=2)`), `isValidPlacement`, `conflicts(grid) → Set<index>`, `isSolved`. Poziomy: łatwe ~40 odkrytych, średnie ~32, trudne ~26. Testy: rozwiązanie poprawne, łamigłówka ma dokładnie 1 rozwiązanie (na kilku ziarnach), liczba odkrytych w przedziale, konflikty wykrywane, deterministyczność przy tym samym `rng`.
- `src/games/sudokuGame.ts`: siatka 9×9 (DOM), zaznaczanie pola, klawiatura 1–9 + gumka + tryb „ołówek” (notatki 3×3 w polu), podświetlanie wiersza/kolumny/bloku i tych samych cyfr, konflikty na czerwono, cofnij. Ukończenie → konfetti, wynik. HUD: poziom + czas.
- Nagroda: `sudokuReward(score)` → `{ coins: score, moodBoost: 15 }` (score ∈ {0,30,50,80}).

### Task 2: Bricks n Balls
- `src/games/bricksLogic.ts` (czysta fizyka, stały krok 1/120 s): pole 128×192 px log., klocki w siatce 7 kolumn, liczba trafień = numer rundy (czasem ×2), bonus „+1 kulka” (kółko) do zebrania; tura: celowanie (kąt z przeciągnięcia, ograniczony 10°–170°), wystrzał serii kulek co 80 ms z jednego punktu, odbicia od ścian i klocków (koło–prostokąt), kulki wracają na dół; pierwsza kulka, która spadnie, wyznacza nowy punkt startu; po turze rząd w dół + nowy rząd na górze; koniec gry, gdy klocek dojdzie do dołu. Testy: odbicie od ściany i klocka, ubywanie trafień i znikanie klocka, zbieranie bonusu, przesunięcie rzędów, koniec gry, punkt startu z pierwszej spadłej kulki.
- `src/games/bricksGame.ts`: canvas przez `makeCanvas`; linia celowania (kropki) przy przeciąganiu; klocki w kolorach zależnych od liczby (palety fioletu/różu/żółci), liczby na klockach rysowane ostro (tekst w px urządzenia, jak w Świeczkach); przycisk „przyspiesz” (×2) w trakcie długiej tury. HUD: runda + liczba kulek.
- Score = osiągnięta runda; `bricksReward(round)` → `{ coins: min(50, round * 2), moodBoost: 10 }`.

### Task 3: Szyfrokrzyżówka
- Słowa: `src/games/cryptoWords.ts` — `PERSONAL_WORDS` (domyślnie z tego, co wiemy o Gabi: GABI, KITKAT, KOTEK, MANGA, SZYDEŁKO, WŁÓCZKA, PIELĘGNIARKA, OKULARY, LAWENDA, MUZYKA, TELEFON, ROŚLINY, MONSTERA, URODZINY, PREZENT, TORT, SŁUCHAWKI, KSIĄŻKA, NAUKA, STETOSKOP, PIŻAMA, KĄPIEL, SWETEREK, PIZZA — użytkownik podmieni) + `COMMON_WORDS` (~300 popularnych polskich rzeczowników 3–9 liter, bez wulgaryzmów, wielkie litery z polskimi znakami).
- `src/games/cryptoLogic.ts`: `buildCrossword(words, personal, rng, size=11)` — układ krzyżówki (słowa poziomo/pionowo, każde kolejne krzyżuje się z już położonym, bez stykania się bokami, ≥ 8 słów, ≥ 2 osobiste; ponawianie przy porażce); `cipher(grid, rng)` — przypisanie liczb 1..N literom (każda litera jedna liczba; ą/ć/ę/ł/ń/ó/ś/ź/ż osobne litery), `revealStart(…)` — 2–3 litery odkryte na start; `applyGuess(state, number, letter)` (wpisanie uzupełnia wszystkie pola z tą liczbą; litera użyta gdzie indziej — przenosi), `isSolved`. Testy: każde słowo z listy w planszy odczytywalne z siatki, krzyżowania spójne, brak stykających się równoległych słów, ≥ 2 osobiste, szyfr bijekcja, polskie litery, `applyGuess`.
- `src/games/cryptoGame.ts`: siatka (pola z numerkiem w rogu i literą), zaznaczenie pola → podświetlenie wszystkich pól z tą liczbą; klawiatura liter polskiego alfabetu (32 litery w 4 rzędach) + gumka; tabela „liczba → litera” u dołu (rozwiązane liczby); podpowiedź (odkrywa jedną liczbę, max 3). Ukończenie → konfetti.
- Score: 60 minus 10 za każdą podpowiedź (min 30); `cryptoReward(score)` → `{ coins: score, moodBoost: 15 }`.

### Task 4: Rejestracja i weryfikacja
- `GAMES` += sudoku (puzzle), crypto (puzzle), bricks (arcade); `COMING_SOON` puste (lista minigier bez sekcji „wkrótce”, jeśli pusta).
- Ikony: istniejące `grid`, `letters`, `bricks`.
- Weryfikacja w przeglądarce (mobile): każda gra od startu do końca, panel nagrody, rekordy w profilu, zapis w toku (Sudoku/krzyżówka) po wyjściu i powrocie.
