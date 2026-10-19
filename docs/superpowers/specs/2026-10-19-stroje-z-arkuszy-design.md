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
  "goth_lolita": { "sheets": { "main": {} }, "skip": ["fun_eat", "nurse_*"] }
}
```

Obiekt arkusza może nadpisać: `background` (domyślnie `"auto"` — mediana lewego górnego rogu arkusza), `gridPeriod`,
`pad` (klatki ciała, domyślnie 10 px arkusza) i `portraitPad` (portrety, domyślnie 2 px — nad ramką leży napis
PORTRAIT, który przy większym zapasie się dokleja). `skip` — klatki, których ten strój nie bierze z arkusza (np.
generator zgubił kanapkę w `fun_eat`), więc zostaje przemalowanie.

## Wycinanie (osobny skrypt `tools/extract_outfits.py`)
Osobny skrypt (nie flaga `--outfits` w `extract_sprites.py`) — używa funkcji `extract_sprites.py`, ale nie zmienia jego
działania ani wyników. Dla każdego stroju, arkusza i klatki ciała / portretu z tym arkuszem:
- najpierw kontrola wejścia: brak któregokolwiek skonfigurowanego arkusza albo `tools/palette.json` → błąd i wyjście
  z kodem 1, bez kasowania czegokolwiek; klatki powstają w `tools/out/stroje.tmp` i trafiają do
  `public/sprites/stroje/` dopiero na końcu (plik po pliku — katalog obserwowany przez vite nie daje się przenieść);
- pomijane: wpisy `like` oraz — z ostrzeżeniem — klatki z geometrią, której ta ścieżka nie odtwarza (`anchor`
  `"center"` wpisu lub arkusza, `align` arkusza, `alignBottom`, `noSeat`, `pet`, `keep: "all"`, `onlyLargest`,
  `bgHsv`, `flipX`, `mirror`);
- prostokąt z oryginału poszerzony o `pad` / `portraitPad`, z niego największy kształt;
- obróbka arkusza jak dla oryginału (kratka, `sampleMode`, `outline`, `hairTone`, cała zamrożona paleta, czyszczenie
  dziur) — **bez** poprawek przypiętych do pikseli oryginału (`bag`, `cut`, `fix`, `wipe`, `copy`, `erase`, `paint`);
  w portretach resztki napisu nad górną krawędzią ramki są czyszczone (rogi ramki zostają);
- skala jak w klatce bazowej (`scale` z oryginału); kotwica i stopy liczone tak samo; czubek głowy (`head`) tylko,
  gdy ma go klatka bazowa, `noHat` przepisany z klatki bazowej (kolan nie ma — strój się nie przemalowuje);
- klatki pochodne (`derived`): tylko zwykłe kopie klatki źródłowej; pochodne z `noStool` (współrzędne w pikselach
  klatki oryginalnej) pomijane z ostrzeżeniem;
- wynik: `public/sprites/stroje/<id>/<klatka>.png`, metadane w osobnym `src/sprites/outfits.generated.json`
  (`{<id>: {frames: {klatka: {w, h, anchorX, foot, scale, head?, noHat?}}, portraits: {portret: [w, h]}}}`, bez maski);
- kontrola: wysokość klatki ciała ±15% bazowej, szerokość ±35% (sukienka bywa szersza), portret — oba wymiary ±15%;
  inaczej ostrzeżenie i klatka pominięta (zostaje przemalowanie); podgląd `tools/out/stroj_<id>_<arkusz>.png`
  (u góry oryginał, pod spodem strój).

## Gra
- `src/sprites/outfitFrames.ts`: metadane z `outfits.generated.json` (`outfitFrame`, `outfitPortrait`, `sheetSource`,
  `hasOutfitFrames`); `src/main.ts` ładuje obrazki stroju (`stroje/<id>/…`) przy starcie, razem z resztą (pilotaż:
  kilkadziesiąt małych PNG; PWA i tak je cache'uje).
- `src/wardrobe/figures.ts`: jeśli sukienka stroju ma klatkę z arkusza — obrazek i metadane z niej; ozdoba głowy
  doklejana jak dziś (`dressPixels` z samą ozdobą, bez maski). W przeciwnym razie dotychczasowa ścieżka.
  `FigureOpts.sheet: false` wymusza przemalowanie — pozy łazienkowe (turban, suszarka, szczotka, grzebień) biorą tak
  nogi z `idle_front`, bo cięcie popiersia w `bustPose.ts` jest dopasowane do bazowej klatki.
- Dopóki strój nie ma wszystkich arkuszy, wygląd sukienki zmienia się między klatkami z arkusza a przemalowanymi —
  to oczekiwane.
- Portrety (`portrait_a`, `portrait_b`) też z arkusza stroju, gdy są — avatar w rogu i profil.
- Szafa: miniatura stroju z arkuszem = Gabi w tym stroju (`idle_front`), a nie obrazek z wieszaka — wygląda jak w grze.
- Bez zmian w animacjach, zapisie i zachowaniu Gabi.

## Prompty
`docs/prompty-stroje.md`: jak generować arkusz stroju (oryginalny arkusz jako szablon układu, ta sama Gabi, ten sam
strój na wszystkich klatkach, rekwizyty zostają — kanapka, kubek, telefon, kot), nazwy plików i lista arkuszy.

## Testy
- Vitest (`tests/sprites/outfitFrames.test.ts`): wybór źródła (`sheetSource`: klatka / portret stroju, `skip`,
  `sheet: false`), metadane spójne (każda klatka stroju ma klatkę bazową, tę samą skalę, wysokość zbliżoną, czubek
  głowy, kotwicę przy głowie — bez skoków w poziomie), każdy obrazek istnieje w `public/` i ma wymiary z metadanych.
- Ekstraktor: uruchomienie na głównym arkuszu bez ostrzeżeń, podgląd obejrzany.
- Przeglądarka: Szafa (miniatura, przymiarka, spacer), pokój (chodzenie, pozy, siedzenie z przemalowaniem), avatar.
