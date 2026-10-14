# Szyfrokrzyżówka jak z gazety — projekt

Data: 2026-10-14. Zastępuje obecną minigrę „Szyfrokrzyżówka” (`crypto`): luźny układ krzyżujących się słów zamienia się
w klasyczną gazetową szyfrokrzyżówkę — gęstą siatkę z zaczernionymi polami, tabelę liter i hasło do odczytania.
Wzór od użytkownika: strona „Pasjans szyfro” z czasopisma (wybrany format to jedna plansza, nie cztery).

## Decyzje

| Pytanie | Wybór |
| --- | --- |
| Format | jedna plansza 9×9 (tabela liter, siatka, hasło, klawiatura) — bez wariantu „pasjans” z czterema planszami |
| Źródło plansz | gotowy zestaw 40 plansz ułożonych przed wydaniem (nie generowane w grze) |
| Hasła | wymyślone przeze mnie z rzeczy o Gabi; lista do przejrzenia przez użytkownika |
| Trudność | jeden poziom: 4 litery na start, „Sprawdź”, do 3 podpowiedzi |
| Narzędzie | generator w Pythonie uruchamiany przed wydaniem (`tools/make_crypto.py`) |

## Dane: `src/games/cryptoPuzzles.json`

Lista 40 plansz. Plansza:

```json
{ "id": "p07", "grid": ["PARK#....", "..."], "solution": "KOT HACHI", "personal": ["HACHI"] }
```

- `grid` — 9 napisów po 9 znaków; `#` = zaczernione pole, inne znaki = litery (polski alfabet, bez Q/V/X).
- `solution` — hasło (8–14 liter bez spacji); spacje to przerwy między słowami hasła.
- `personal` — słowa osobiste użyte w siatce (podgląd i testy).

Liczby nie są w pliku: gra przypisuje je literom przy starcie planszy losowaniem z ziarnem zależnym od `id`
(`seededRng`), więc dana plansza ma zawsze te same liczby 1..N (N = liczba różnych liter w planszy, zwykle 20–26).
Odkryte na start: 4 litery — 2 spośród najczęstszych w planszy i 2 losowe ze średnio częstych (to samo ziarno).

## Generator: `tools/make_crypto.py` (tylko u twórcy)

- Wejście: `tools/crypto/slowa.txt` (ok. 3–4 tys. popularnych polskich słów w formie podstawowej, długości 2–9),
  `tools/crypto/osobiste.txt` (Gabi, Hachi, Somerka, KitKat…), `tools/crypto/hasla.txt` (ok. 50 haseł).
  Słowa dwuliterowe tylko z krótkiej listy pospolitych (np. ON, TO, MY); reszta od 3 liter.
- Siatka 9×9: 18–26% zaczernionych pól; każde białe pole należy do słowa (ciąg ≥ 2 liter) co najmniej w jednym
  kierunku; każdy ciąg ≥ 2 liter w poziomie i w pionie jest słowem ze słowników.
- Wypełnianie: najpierw 1–2 słowa osobiste, potem dopasowywanie słów ze słownika z cofaniem (backtracking);
  układ czarnych pól dobierany razem z wypełnianiem; nieudane próby odrzucane i ponawiane.
- Hasło: przypisane do planszy tylko wtedy, gdy wszystkie jego litery występują w siatce.
- Kontrola: bez powtórzonych słów w jednej planszy; podgląd PNG wszystkich plansz (litery i liczby) do obejrzenia
  przed wydaniem (`tools/out/crypto_preview.png`). Wynik: `src/games/cryptoPuzzles.json`.

## Logika: `src/games/cryptoLogic.ts` (przebudowa)

Czyste funkcje (bez DOM):

- `puzzleState(p)` — stan planszy: liczby w polach (`cells: (number | null)[]`, 81), klucz (`key[n-1]` = litera),
  wpisane litery (`guesses`), odkryte liczby (`revealed`), podpowiedzi, `id`.
- `applyGuess(s, n, letter | null)` — wpisanie litery we wszystkie pola liczby `n`; litera wpisana przy innej liczbie
  przenosi się; liczby i litery odkryte są zablokowane (bez zmian — ta sama referencja).
- `wrongNumbers(s)` — liczby z błędną literą („Sprawdź”); puste się nie liczą.
- `hint(s, rng, prefer?)` — odkrywa wybraną albo losową nierozwiązaną liczbę; najwyżej `MAX_HINTS` = 3.
- `isSolved(s)`, `solutionNumbers(p, s)` — hasło jako liczby i przerwy.
- `cryptoScore(hints)` i `cryptoReward` — bez zmian (60 monet, −10 za podpowiedź, najmniej 30; +15 humoru).
- Kolejność plansz: `nextPuzzle(solvedIds, rng)` — pierwsza nierozwiązana w potasowanej kolejności; po
  rozwiązaniu wszystkich lista się zeruje i zestaw zaczyna od nowa.
- Zapis: `serializeSave` / `parseSave` — format v2 `{ v: 2, id, guesses, revealed, hints }`; zapis starego formatu,
  uszkodzony albo z nieznanym `id` → `null` (po cichu pominięty).

Klucze w `localStorage` (poza zapisem gry, jak dziś): `gabigochi.game.crypto` — trwająca plansza (nowy format),
`gabigochi.game.cryptoSolved` — lista rozwiązanych `id`.

`cryptoWords.ts` i generator luźnego układu (`buildCrossword`, `cipher`, `revealStart` w obecnej postaci) znikają.

## Ekran: `src/games/cryptoGame.ts` (przebudowa)

Od góry (makieta: telefon 375 px, wszystko bez przewijania):

1. Pasek ramki gier: X, nazwa, w HUD „Plansza 7/40 · podp. 1/3”.
2. Tabela liter: liczby 1..N w dwóch rzędach, pod każdą litera — odkryte ciemne (zablokowane), wpisane fioletowe;
   stuknięcie wybiera liczbę.
3. Siatka 9×9: zaczernione pola niebieskie; w białych liczba w rogu i duża litera.
4. Hasło: żółte kratki z liczbami i przerwami; litery pojawiają się same.
5. Klawiatura: 32 polskie litery + ⌫ (gumka); litery już przypisane przygaszone, ale aktywne (przeniesienie).
6. Przyciski: „Sprawdź” i „Podpowiedź (−10)”.

Sterowanie: stuknięcie pola wybiera jego liczbę (pole żółte, pola z tą samą liczbą jaśniejsze, kratka w tabeli
podświetlona); litera trafia do wszystkich pól tej liczby, tabeli i hasła; wybór przeskakuje do następnej pustej
liczby. „Sprawdź” — bez limitu i kosztu — zaznacza na czerwono liczby z błędną literą, aż zostaną zmienione.
„Podpowiedź” odkrywa wybraną (albo losową nierozwiązaną) liczbę. Klawiatura fizyczna i strzałki na komputerze.
Start: przy zapisanej planszy „Kontynuuj / Nowa plansza” (jak dziś).

Wygrana: fala po przekątnej przez siatkę, konfetti, hasło dużymi literami, dźwięk; potem zwykłe okno nagrody.

### Animacje i dźwięki

- Animacje: litera „wskakuje” (krótkie powiększenie) we wszystkie swoje pola; płynne podświetlenie wyboru; kratka
  hasła obraca się przy pojawieniu litery; po „Sprawdź” czerwone pola się trzęsą, a bez błędów — zielony błysk przez
  siatkę; podpowiedź — złoty błysk; wygrana — fala po przekątnej.
- Dźwięki (istniejące efekty `src/ui/sound.ts`): wybór pola `tick`, litera `type`, gumka `erase`, podpowiedź
  `sparkle`, „Sprawdź” z błędami `nope` / bez błędów `match`, litera hasła `line`, wygrana (ramka gier).

## Zasady i aktualizacja

- `rules.ts` (`crypto`): opis nowej planszy (gęsta siatka, tabela liter, hasło, „Sprawdź”).
- `RELEASES` (wersja 2): „Nowa szyfrokrzyżówka jak z gazety: 40 plansz z ukrytymi hasłami”.
- Rekord i monety bez zmian (to ta sama gra `crypto`); stara niedokończona plansza pominięta.

## Testy

- `tests/games/cryptoLogic.test.ts` (przepisany): stałe liczby dla `id`, 4 litery na start, wpisywanie
  i przenoszenie liter, blokada odkrytych, `wrongNumbers`, podpowiedzi (limit), wygrana, hasło jako liczby,
  zapis v2 / stary / uszkodzony / nieznane `id`, kolejność plansz i nowy obrót po 40.
- `tests/games/cryptoPuzzles.test.ts`: 40 plansz, unikalne `id`, 9×9, 18–26% czarnych pól, każde białe pole
  w ciągu ≥ 2 liter, litery hasła obecne w siatce, tylko polski alfabet, długość hasła 8–14.
- Generator sam sprawdza słowa i robi podgląd; sprawdzenie w przeglądarce w rozmiarze telefonu przed wydaniem.

## Poza zakresem

Wariant „pasjans” z czterema planszami, kilka poziomów trudności, generowanie plansz w grze, symbole kart
zamiast liter.
