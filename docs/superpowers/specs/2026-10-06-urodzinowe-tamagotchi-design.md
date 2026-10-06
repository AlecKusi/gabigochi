# Urodzinowe Tamagotchi — projekt

Data: 2026-10-06
Status: zatwierdzony w rozmowie, do przeglądu w formie pisemnej

## 1. Cel

Prezent urodzinowy: aplikacja na iPhone'a w stylu tamagotchi / Pou, w której wirtualnym zwierzakiem jest solenizantka narysowana w pixel arcie. Ma cieszyć, nie stresować — postać nigdy nie umiera.

**Termin:** kilka dni. Dlatego praca jest podzielona na dwa etapy (rozdz. 9); etap 1 musi być gotowy i przetestowany na iPhonie przed urodzinami.

## 2. Platforma i dostarczenie

- **PWA** (Progressive Web App) hostowana na **GitHub Pages**. Solenizantka otwiera link w Safari → „Udostępnij → Dodaj do ekranu początkowego” → ikona jak zwykła aplikacja, pełny ekran.
- Bez Maca, bez konta Apple Developer.
- **Offline:** service worker cache'uje wszystkie zasoby. Nowa wersja (etap 2) pobiera się sama przy następnym otwarciu z internetem; po pobraniu aplikacja pokazuje dymek „Nowe minigry!” i przeładowuje się przy następnym uruchomieniu.
- **Safari ≠ ikona:** na iOS zapis gry w Safari i w aplikacji z ekranu początkowego są rozdzielone. Gdy aplikacja wykryje, że działa w zwykłej karcie Safari (`navigator.standalone !== true`), pokazuje ekran z instrukcją instalacji zamiast gry.
- Brak powiadomień push (wymagałyby serwera).

## 3. Stos technologiczny

- **Vite + TypeScript**, bez silnika gier.
- UI (pokój, sklep, szafa, listy, łamigłówki) w **HTML/CSS**; zręcznościówki na **`<canvas>`**.
- **Vitest** do testów logiki.
- **Python 3 + Pillow** do jednorazowego przetwarzania sprite'ów (`tools/`).
- Wdrożenie: `npm run build` → katalog `dist/` → GitHub Pages (gałąź `gh-pages` lub GitHub Actions). Konto GitHub zakłada użytkownik.
- Środowisko: Node 25, npm 11, git, Python 3.13 — dostępne.

## 4. Architektura

```
src/
  core/       stan gry, potrzeby, monety, ekwipunek, zapis (localStorage), zegar, konfiguracja liczb
  pet/        maszyna stanów postaci + renderer sprite'ów (canvas)
  sprites/    ładowanie PNG + manifest animacji (animations.json)
  ui/         ekrany HTML, komponenty pikselowe, animacje i przejścia
  games/      każda minigra w osobnym folderze, wspólny interfejs
tools/        skrypty Python: wycinanie sprite'ów, generowanie sukienek
assets/source oryginalny arkusz sprite'ów (sprite-sheet.jpg)
```

### 4.1 Granice modułów

- **`core/`** nie zna DOM ani canvasa. Czyste funkcje typu `applyElapsed(state, ms) → state`, `buy(state, itemId) → state | error`. W pełni testowalne.
- **`core/config.ts`** — jedyne miejsce z liczbami (tempo spadku potrzeb, ceny, nagrody). Zmiana balansu = edycja jednego pliku.
- **`pet/`** dostaje stan potrzeb + zdarzenia (karmienie, stuknięcie, sen) i decyduje, którą animację odtworzyć.
- **`games/`** — każda gra implementuje:
  ```ts
  interface MiniGame {
    id: string; name: string; icon: string; category: 'arcade' | 'puzzle';
    start(container: HTMLElement): Promise<GameResult>;
  }
  interface GameResult { coins: number; moodBoost: number; score: number; }
  ```
  Gra nie modyfikuje stanu bezpośrednio — zwraca wynik, a `core` go nalicza. Nową grę dodaje się rejestrując ją w `games/index.ts`.

### 4.2 Zapis

- Stan w `localStorage` jako JSON z polem `version` (migracje przy zmianach w etapie 2).
- Zapis po każdej akcji i przy `visibilitychange`.
- Przy starcie: `navigator.storage.persist()` (prośba o trwałe przechowywanie).
- Uszkodzony / nieczytelny zapis → kopia do `save_backup`, start od nowego stanu. Nigdy biały ekran.

## 5. Sprite'y i animacje

### 5.1 Materiał źródłowy

`assets/source/sprite-sheet.jpg` (768×1024, JPG, szare tło, siatka nieregularna — prawdopodobnie generowana AI):

| Sekcja | Zawartość | Użycie |
|---|---|---|
| IDLE | przód, bok, tył | stan spoczynku (przód = domyślny) |
| WALK | 2 rzędy × 5 klatek | chodzenie po pokoju, Łapanie jedzenia |
| SPECIAL 1 | machanie | powitanie, reakcja na stuknięcie, wygrana |
| SPECIAL 2 | jedzenie (coś przy ustach) | karmienie |
| SPECIAL 3 | gest dłonią | „mówienie” w dymkach |
| PORTRAIT ×2 | portret w ramce | ekran urodzinowy, profil, ikona aplikacji |

### 5.2 Przetwarzanie (`tools/extract_sprites.py`)

1. Ręcznie zdefiniowane prostokąty wycięcia dla każdej klatki (plik `tools/frames.json`) — siatka jest nieregularna, więc nie zgadujemy automatycznie.
2. Usunięcie szarego tła (kluczowanie koloru + tolerancja na artefakty JPG + usunięcie półprzezroczystej obwódki).
3. Redukcja do jednej wspólnej palety (kwantyzacja, ~24–32 kolory) — czyste piksele bez szumu JPG.
4. Wyrównanie klatek do wspólnego punktu zaczepienia (stopy na dole, środek w poziomie) i wspólnego rozmiaru płótna.
5. Wynik: PNG z przezroczystością w `public/sprites/`.

Na ekranie skalowanie całkowitoliczbowe z `image-rendering: pixelated`.

### 5.3 Manifest animacji (`src/sprites/animations.json`)

```json
{
  "idle":       { "frames": ["idle_front"], "fps": 1 },
  "walk_left":  { "frames": ["walk_l1", "walk_l2", "walk_l3"], "fps": 6 },
  "walk_right": { "frames": ["walk_l1", "walk_l2", "walk_l3"], "fps": 6, "flipX": true },
  "wave":       { "frames": ["fun_wave"], "fps": 1 },
  "eat":        { "frames": ["fun_eat"], "fps": 1 },
  "talk":       { "frames": ["fun_talk"], "fps": 1 },
  "sleep":      { "fallback": "idle_front", "overlay": "zzz", "dim": true },
  "sad":        { "fallback": "idle_front", "overlay": "tear" },
  "hungry":     { "fallback": "idle_front", "overlay": "stomach" }
}
```

- Animacja z `frames` używa klatek; animacja z `fallback` używa istniejącej klatki + nakładki pikselowej (`overlay`) i opcjonalnego przyciemnienia (`dim`).
- **Rozszerzalność:** użytkownik będzie w trakcie budowy dostarczał dodatkowe animacje (bezczynność, spanie, jedzenie). Dodanie = wrzucenie klatek do arkusza/folderu, dopisanie prostokątów w `tools/frames.json` i zamiana wpisu w manifeście z `fallback` na `frames`. Bez zmian w kodzie.
- Dokładne nazwy klatek ustala się przy wycinaniu; powyższy manifest to wzorzec.

### 5.4 Ożywienie postaci (niezależne od klatek)

- „Oddychanie”: podskok o 1 piksel co ~1,5 s w idle.
- Mruganie: krótka podmiana obszaru oczu co 3–6 s (jeśli wycięcie oczu okaże się brzydkie — rezygnujemy).
- Squash & stretch przy stuknięciu.
- Serduszka unoszące się przy KitKacie / głaskaniu.

## 6. Potrzeby, czas, ekonomia

Wszystkie liczby w `core/config.ts`.

### 6.1 Potrzeby (0–100)

| Potrzeba | Spadek | Pełna → 0 | Podnoszenie |
|---|---|---|---|
| Głód (sytość) | −6/h | ~16 h | jedzenie |
| Humor | −4/h | ~25 h | minigry (+10–15), głaskanie (+2, limit co 30 s) |
| Energia | −5/h na jawie, +15/h we śnie | ~20 h | sen |

- Czas liczony z różnicy znaczników czasu — działa przy zamkniętej aplikacji (`applyElapsed`).
- Wartości przycinane do [0, 100]. **Postać nie umiera.**
- **Nastrój** = najniższa potrzeba: > 60 wesoła (chodzi, mówi), 30–60 neutralna, < 30 smutna (nakładka, rzadziej się rusza).
- Konkretne dymki: głód < 25 → „Zjadłabym coś…”, energia < 20 → ziewanie, humor < 25 → „Pobawisz się ze mną?”.
- **Sen:** przycisk Światło gasi światło → stan `sleep`. Budzi się sama przy energii 100 lub po stuknięciu. Podczas snu potrzeby głodu i humoru spadają o połowę wolniej.
- Każda minigra: −5 energii. Przy energii < 10 gry są dostępne, ale postać mówi „Jestem zbyt śpiąca…” i trzeba potwierdzić.

### 6.2 Monety

- Start: **150** („urodzinowy prezent”).
- Codzienny bonus: **+20** za pierwsze otwarcie danego dnia kalendarzowego.
- Nagrody z gier — rozdz. 8.

### 6.3 Sklep — jedzenie (etap 1)

| Produkt | Cena | Głód | Humor | Uwagi |
|---|---|---|---|---|
| Jabłko | 5 | +10 | 0 | |
| Kanapka | 10 | +20 | 0 | |
| **KitKat** | 15 | +15 | **+25** | ulubiony baton; specjalna reakcja (skok radości + serduszka); raz dziennie gratis jako „prezent dnia” |
| Pizza | 20 | +35 | +5 | |
| Tort urodzinowy | 40 | +30 | +20 | |

Kupione jedzenie trafia do **lodówki** (ekwipunek z licznikami). Karmienie: przeciągnięcie jedzenia na postać → animacja `eat`.

### 6.4 Sklep — dodatki (etap 2)

Kupowane raz, zakładane w **Szafie**. Trzy miejsca:

| Miejsce | Przykłady | Cena |
|---|---|---|
| Głowa | czapka urodzinowa, korona, kocie uszy | 100–200 |
| Strój | sukienka w kropki, kwiecista, wieczorowa; oryginalny strój (darmowy, domyślny) | 200–400 |
| Tło | pokój (domyślny), kosmos, plaża | 150–300 |

- **Czapki:** jedna pikselowa grafika na kierunek (przód/bok/tył) + punkt zaczepienia głowy zdefiniowany per klatka w `frames.json`.
- **Sukienki:** generowane skryptem (`tools/make_outfits.py`) dla **każdej** klatki — wykrycie obszaru koszulki i spodni (kolory z palety), przemalowanie koszulki na kolor/wzór sukienki, dorysowanie spódnicy do kolan. Działa automatycznie także dla przyszłych animacji. Jeśli dla danej sukienki efekt jest brzydki, można podstawić ręcznie narysowane klatki (manifest strojów wskazuje plik klatki per strój).
- Jeśli etap 1 skończy się przed czasem, sukienki przechodzą do etapu 1.

## 7. Ekrany i wygląd

### 7.1 Styl

- **Fiolet jako kolor przewodni** — odcienie lawendy z jej włosów: tło pokoju, ramki pikselowe, przyciski, nagłówki. Uzupełnienie: czerń (koszulka), granat (dżinsy), ciepłe akcenty (czerwień KitKata).
- Paski potrzeb w odrębnych kolorach (głód — pomarańcz, humor — róż, energia — niebieski) na fioletowym tle.
- Pikselowa czcionka z polskimi znakami (np. Pixelify Sans), dołączona lokalnie.
- Ramki w stylu ramki portretu z arkusza.

### 7.2 Animacje interfejsu

- Przyciski wciskają się jak fizyczne klawisze (przesunięcie o 2 px + zmiana cienia pikselowego).
- Panele wysuwają się od dołu z lekkim odbiciem.
- Liczniki monet przeliczają się animacją; paski potrzeb zmieniają się płynnie.
- Przejścia między ekranami: krótki efekt „rozpadu na kratki” (~250 ms).
- Konfetti z pikselowych kwadracików: ekran urodzinowy, wygrana, zakup.
- Cel: płynne 60 kl./s na iPhonie. `prefers-reduced-motion` → przejścia zastąpione przenikaniem, bez konfetti i odbić.

### 7.3 Ekrany

1. **Instrukcja instalacji** — tylko w zwykłym Safari (rozdz. 2).
2. **Ekran urodzinowy** — przy pierwszym uruchomieniu: portret w ramce, życzenia od użytkownika, konfetti, machająca postać. Dostępny później z Profilu.
3. **Pokój** (główny) — góra: dzień życia, monety, trzy paski potrzeb; środek: postać chodzi po pokoju, mówi w dymkach, reaguje na stuknięcia; dół: Karm · Graj · Światło · Sklep · Szafa.
4. **Lodówka** (panel wysuwany) — kupione jedzenie, przeciąganie na postać.
5. **Minigry** — siatka kart w sekcjach Zręcznościowe / Łamigłówki; gry z etapu 2 jako zablokowane „wkrótce”.
6. **Sklep** — zakładki Jedzenie / Dodatki.
7. **Szafa** — podgląd postaci, przymierzanie, zakładanie (etap 2; w etapie 1 ekran z „wkrótce”).
8. **Profil** — portret, imię, wiek w dniach, rekordy minigier, przycisk „Pokaż życzenia”.

### 7.4 iPhone

- `display: standalone`, `viewport-fit=cover`, marginesy `env(safe-area-inset-*)` (notch, Dynamic Island, pasek gestów).
- Zablokowany zoom i zaznaczanie tekstu w grach; brak „gumowego” przewijania na ekranie pokoju.
- Orientacja pionowa.
- Ikona aplikacji i `apple-touch-icon` z portretu (180×180 i większe), ekran startowy w kolorze fioletowym.

## 8. Minigry

Wszystkie zwracają `GameResult` (rozdz. 4.1). Rekordy zapisywane w stanie.

### Etap 1

**Łapanie jedzenia** (~60 s, canvas)
- Postać na dole, sterowanie przesuwaniem palca; animacja `walk_left` / `walk_right`.
- Spadają smakołyki (punkty) i brokuły (−1 z 3 serduszek). KitKat — rzadki, ×5 punktów.
- Tempo rośnie z czasem. Koniec: czas minął lub 0 serduszek.
- Nagroda: 1 moneta / 10 pkt, maks. 50; humor +10.

**Zdmuchnij świeczki** (~30 s)
- Pikselowy tort, świeczki zapalają się losowo i gasną same po chwili; stuknięcie = zdmuchnięcie (+pkt), combo za szybkie serie.
- Finał: postać macha, napis „Wszystkiego najlepszego!”.
- Nagroda: 5–40 monet zależnie od wyniku; humor +15.

**Memory**
- Siatka 4×4 (8 par), pikselowe ikony: KitKat, tort, prezent, serce, okulary, torba, balon, gwiazdka.
- Odwracanie z animacją obrotu karty.
- Nagroda: 15–40 monet (mniej ruchów = więcej); humor +10.

### Etap 2

**Bricks n Balls** (canvas)
- Wystrzeliwanie serii kulek pod kątem wyznaczonym przeciągnięciem palca; klocki z liczbami trafień schodzą rząd w dół co turę; bonusy +1 kulka.
- Kolizje koło–prostokąt, stały krok fizyki.
- Nagroda: zależnie od liczby rund, maks. 50; humor +10.

**Sudoku**
- Generator z gwarancją jednego rozwiązania (backtracking + usuwanie cyfr ze sprawdzaniem unikalności).
- 3 poziomy: łatwe (30 monet), średnie (50), trudne (80); humor +15.
- Notatki ołówkiem, podświetlanie konfliktów, zapis rozgrywki w toku.

**Szyfrokrzyżówki**
- Plansza krzyżówki, każda litera zakodowana liczbą; kilka liter odkrytych na start; wpisanie litery uzupełnia wszystkie pola z tą liczbą.
- **Słowa:** mieszanka — 15–30 słów osobistych od użytkownika (imiona, miejsca, wspólne żarty) + lista popularnych polskich słów. Każda plansza zawiera ≥ 2 słowa osobiste.
- Generator układa plansze z listy słów (umieszczanie słów z krzyżowaniem, odrzucanie nieudanych układów); obsługa polskich znaków (ą, ć, ę, ł, ń, ó, ś, ź, ż jako osobne litery).
- Nagroda: 60 monet; humor +15.

## 9. Etapy

**Etap 1 — na urodziny**
- Szkielet PWA, wdrożenie na GitHub Pages, instrukcja instalacji
- Wycinanie sprite'ów, manifest animacji z zastępstwami
- Stan, potrzeby, czas offline, zapis, codzienny bonus
- Pokój z postacią, dymkami, reakcjami; sen
- Sklep z jedzeniem (z KitKatem), lodówka, karmienie
- Ekran urodzinowy, profil
- Minigry: Łapanie jedzenia, Zdmuchnij świeczki, Memory
- Styl fioletowy, animacje interfejsu

**Etap 2 — aktualizacja po kilku dniach**
- Bricks n Balls, Sudoku, Szyfrokrzyżówki
- Dodatki: czapki, sukienki, tła; Szafa
- Nowe animacje dostarczone przez użytkownika

## 10. Testowanie

**Automatyczne (Vitest)** — moduł `core/` i logika gier:
- `applyElapsed`: 0 ms, 1 h, 3 dni offline, sen, przycinanie do [0, 100]
- monety: nagrody, codzienny bonus (zmiana dnia, strefa czasowa), zakup bez środków → błąd
- KitKat „prezent dnia” — raz na dzień
- zapis/odczyt, migracja wersji, uszkodzony JSON → kopia + nowy stan
- punktacja minigier (funkcje wynik → nagroda)
- etap 2: sudoku — poprawność i unikalność rozwiązania; krzyżówka — spójność krzyżowań, obecność słów osobistych

**Ręczne w przeglądarce** — emulacja iPhone'a, zrzuty każdego ekranu, sprawdzenie animacji i dotyku.

**Na prawdziwym iPhonie** (lista kontrolna dla użytkownika, przed wręczeniem):
1. Instalacja z Safari na ekran początkowy, ikona i nazwa poprawne
2. Pełny ekran, nic nie zasłania notch / paska gestów
3. Tryb samolotowy → aplikacja działa
4. Zamknięcie, odczekanie, ponowne otwarcie → potrzeby spadły, stan zachowany
5. Każda minigra od początku do końca, monety naliczone
6. Zakup i karmienie KitKatem

## 11. Dane od użytkownika

Potrzebne do ukończenia etapu 1:
- **Imię** solenizantki (wyświetlane w profilu i tekstach)
- **Treść życzeń** na ekran urodzinowy
- **Nazwa aplikacji** na ekranie początkowym (domyślnie imię solenizantki)

Potrzebne do etapu 2:
- **15–30 słów osobistych** do szyfrokrzyżówek
- Dodatkowe sprite'y animacji (opcjonalnie, w dowolnym momencie)

Do czasu dostarczenia danych w kodzie są widoczne teksty zastępcze oznaczone w jednym pliku `src/content.ts`, aby łatwo je podmienić.

## 12. Poza zakresem

- Natywna aplikacja iOS, App Store
- Powiadomienia push
- Konto, synchronizacja między urządzeniami, serwer
- Dźwięk — **nie** w etapie 1; ewentualnie krótkie pikselowe efekty w etapie 2, jeśli zostanie czas (domyślnie wyciszone, iOS wymaga interakcji przed odtworzeniem)
- Choroba / śmierć postaci
