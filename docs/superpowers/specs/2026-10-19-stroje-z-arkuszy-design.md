# Stroje z arkuszy — projekt (pilotaż: gotycka lolita)

## Problem
Ubrania na Gabi to przemalowanie czarnej koszulki i dżinsów (maski R/G/B + `dresser.ts`). Skutki:
- strój na postaci wygląda inaczej niż obrazek z wieszaka w Szafie (wieszak ma falbany, bufki, sznurowanie — na Gabi
  jest tylko koszulka w innym kolorze i dorysowana spódnica);
- spódnica liczona z rozstawu nóg w każdej klatce, więc przy chodzeniu „skacze”.

Odrzucone (pokazane użytkownikowi na szkicach): lepsze przemalowanie (opcja A) i nakładanie rysunku z wieszaka na
sylwetkę. Nowy model Gabi bez ubrań okazał się niepotrzebny — to ta sama Gabi co w grze.

## Pomysł
Strój = **oryginalne arkusze animacji wygenerowane jeszcze raz z Gabi w tym stroju**, w tym samym układzie (oryginał
jest szablonem dla generatora). Pierwszy arkusz (`sprite-sheet.jpg` w gotyckiej lolicie) pokrywa się z oryginałem
z przesunięciem 0 px (IoU sylwetek 0,76 — różnica to kształt stroju), więc prostokąty klatek z `tools/frames.json`
pasują z zapasem.

Gra pokazuje klatkę z arkusza stroju, gdy jest; w przeciwnym razie — przemalowanie jak dziś. Każdy dostarczony arkusz
od razu poprawia wygląd, a niekompletny strój nic nie psuje.

## Zakres pilotażu
- Strój `goth_lolita` (istniejący w katalogu — kto go kupił, dostaje nowy wygląd).
- Arkusze: wszystkie arkusze z klatkami Gabi w ubraniu (ok. 20: główny, obrót, siedzenie, stół, leżenie, łóżko, plecy,
  miny, status, hobby, opieka, kotek, picie, przeciąganie, ukulele, karaoke, zęby/czesanie, pranie, urodziny,
  podlewanie, łazienka). Bez piany i prysznica za szybą (tam Gabi nie ma ubrania).
- Pierwszy krok: główny arkusz (już jest) + całe wpięcie do gry. Kolejne arkusze dochodzą po jednym.
- Po pilotażu decyzja o następnych strojach. W Szafie nowe pozycje to całe stroje; kupione wcześniej koszulki, doły
  i ozdoby działają jak dziś. Format zapisu bez zmian (`SAVE_VERSION` 2).

## Pliki źródłowe
`assets/source/stroje/<id stroju>/<klucz arkusza>.jpg` — klucz jak w `frames.json` (`main` dla `sprite-sheet.jpg`,
`sitting`, `table`, …). Lista w `frames.json`:

```json
"outfits": {
  "goth_lolita": { "sheets": { "main": {} }, "skip": ["fun_eat"] }
}
```

Obiekt arkusza może nadpisać ustawienia arkusza bazowego (`background`, `gridPeriod`, `pad` itd.). `skip` — klatki,
których ten strój nie bierze z arkusza (np. generator zgubił kanapkę w `fun_eat`), więc zostaje przemalowanie.

## Wycinanie (`tools/extract_sprites.py`, `--outfits`)
Dla każdego stroju, arkusza i klatki ciała / portretu z tym arkuszem (w tym pochodne: `derived`, `like`):
- prostokąt z oryginału poszerzony o `pad` (domyślnie 10 px arkusza; sukienka bywa szersza niż dżinsy), z niego
  największy kawałek postaci stykający się z rdzeniem oryginalnego prostokąta (sąsiednie postacie nie wchodzą);
- obróbka arkusza jak dla oryginału (kratka, `sampleMode`, `outline`, `hairTone`, paleta, czyszczenie dziur) — **bez**
  poprawek przypiętych do pikseli oryginału (`bag`, `cut`, `fix`, `wipe`, `copy`);
- skala jak w klatce bazowej (`scale` z oryginału), więc wysokość i stopy zgadzają się z animacjami; kotwica, stopy,
  głowa (`head`) i kolana liczone tak samo;
- wynik: `public/sprites/stroje/<id>/<klatka>.png`, metadane w `src/sprites/frames.generated.json` pod
  `outfits.<id>.<klatka>` (bez maski — strój się nie przemalowuje);
- kontrola: każda klatka znaleziona, wysokość ±15% bazowej, stopy w tym samym wierszu ±2 px — inaczej ostrzeżenie
  i klatka pominięta (zostaje przemalowanie); podgląd `tools/out/stroj_<id>_<arkusz>.png` (oryginał | strój).

## Gra
- `src/sprites/loader.ts`: `OUTFIT_FRAMES` (z wygenerowanego JSON) i ładowanie obrazków stroju (`stroje/<id>/…`) przy
  starcie, razem z resztą (pilotaż: kilkadziesiąt małych PNG; PWA i tak je cache'uje).
- `src/wardrobe/figures.ts`: jeśli sukienka stroju ma klatkę z arkusza — obrazek i metadane z niej; ozdoba głowy
  doklejana jak dziś (`dressPixels` z samą ozdobą, bez maski). W przeciwnym razie dotychczasowa ścieżka.
- Portrety (`portrait_a`, `portrait_b`) też z arkusza stroju, gdy są — avatar w rogu i profil.
- Szafa: miniatura stroju z arkuszem = Gabi w tym stroju (`idle_front`), a nie obrazek z wieszaka — wygląda jak w grze.
- Bez zmian w animacjach, zapisie i zachowaniu Gabi.

## Prompty
`docs/prompty-stroje.md`: jak generować arkusz stroju (oryginalny arkusz jako szablon układu, ta sama Gabi, ten sam
strój na wszystkich klatkach, rekwizyty zostają — kanapka, kubek, telefon, kot), nazwy plików i lista arkuszy.

## Testy
- Vitest: wybór klatki w `figures` (klatka stroju vs przemalowanie, `skip`, ozdoba głowy na klatce stroju), metadane
  `OUTFIT_FRAMES` spójne (każda klatka stroju ma klatkę bazową, wysokość zbliżona).
- Ekstraktor: uruchomienie na głównym arkuszu bez ostrzeżeń, podgląd obejrzany.
- Przeglądarka: Szafa (miniatura, przymiarka, spacer), pokój (chodzenie, pozy, siedzenie z przemalowaniem), avatar.
