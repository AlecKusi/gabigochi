# Aktualizacje gry a zapis Gabi

## Jak gracz dostaje nową wersję
1. Nowa wersja trafia na ten sam adres (GitHub Pages, `npm run build` → wdrożenie z gałęzi `main`).
2. Aplikacja sprawdza aktualizacje przy każdym powrocie na pierwszy plan. Gdy znajdzie nową wersję, pokazuje
   „Jest nowa wersja! Uruchom aplikację ponownie.” i nie przerywa gry.
3. Przy zamknięciu albo schowaniu aplikacji gra najpierw zapisuje postęp, a dopiero potem instaluje nową wersję.
   Przy następnym uruchomieniu działa nowa wersja z tym samym zapisem.
4. Po aktualizacji wyskakuje okno „Co nowego?” z wpisami z `RELEASES`, których gracz jeszcze nie widział.

Zapis leży w pamięci przeglądarki przypisanej do adresu gry, więc aktualizacja go nie rusza. Ginie tylko przy:
usunięciu aplikacji z ekranu początkowego (iOS czyści wtedy jej dane), wyczyszczeniu danych przeglądarki, zmianie
telefonu albo zmianie adresu gry. Na te sytuacje jest **Profil → Kopia zapisu** (plik `.json`: „Zapisz kopię”
i „Wczytaj kopię”). Przed wczytaniem kopii obecny zapis trafia do `gabigochi.save_backup`.

## Wydanie aktualizacji — krok po kroku
1. Dopisz wpis **na górze** `RELEASES` w `src/core/changelog.ts`: numer o 1 wyższy, data, 2–5 krótkich zdań dla
   Gabi (np. „Nowa minigra: Skaczący kotek”).
2. `npx vitest run` — w tym `tests/core/saveCompat.test.ts` (zapis z 2026-10-10 musi się wczytać bez strat).
3. `npx tsc --noEmit -p .` i `npm run build`.
4. Wdrożenie (dopiero za zgodą właściciela).

## Zasady, żeby stare zapisy przetrwały
- **Nowe rzeczy dodawaj, nie przemianowuj.** Identyfikatory przedmiotów, ubrań, tapet, jedzenia i gier są
  w zapisie. Przedmiot o nieznanym id znika przy wczytaniu. Zmiana id albo usunięcie czegoś z katalogu wymaga
  migracji (zamiana starego id na nowe w `readItem`/`readHome` w `src/core/save.ts`) i wpisu w tym pliku.
  Test zgodności złapie taką zmianę.
- **Nowe pole w zapisie** musi mieć wartość domyślną przy odczycie (`readWardrobe`, `readCat`, `readHome`
  w `save.ts`). Stary zapis bez tego pola wczytuje się wtedy bez naprawy, tak jak przy pokojach z `LATER_ROOMS`
  i dekoracjach `SALON_DECOR`.
- **Zmiana kształtu zapisu** (np. inny typ pola): podnieś `SAVE_VERSION`, dopisz krok w `migrate()` (stara
  wersja → nowa) i test. Starsza gra nie nadpisze zapisu z nowszej (`NewerSaveError`).
- Nowa minigra: id w `GAMES` i rekord w `records` — rekordy z nieznanymi id po prostu zostają.
- **Nie zmieniaj** `tests/fixtures/save-v2-2026-10-10.json`. Przy dużej zmianie formatu dodaj nowy plik obok
  (np. `save-v3-…json`) i osobny test. Stary ma się dalej wczytywać.
- Nowe pokoje dopisuj do `LATER_ROOMS`, a nowe wyglądy domyślne do `LATER_DEFAULT_LOOKS`.
- **Adres gry** (np. `uzytkownik.github.io/gabigochi`) zostaw na zawsze. Zmiana adresu to nowa pamięć
  i przeniesienie postępu tylko przez kopię zapisu.
