# Mieszkanie Gabi — 3 pokoje, meble, urządzanie, interakcje, rośliny — projekt i plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zamiast jednego pokoju — salon, sypialnia i pracownia z meblami, tapetami i podłogami kupowanymi w sklepie, swobodnie rozmieszczanymi (siatka), z interakcjami Gabi i roślinami do podlewania.

**Architecture:** Katalog przedmiotów (dane) + sprite'y z trzech nowych arkuszy. Zapis v2 (pokoje, układy, magazyn, wygląd ścian/podłóg) z migracją z v1. Czysta logika (zakupy, stawianie, przesuwanie z siatką i warstwami, z-order, rośliny, cooldown interakcji) w `src/home/*` z testami. Rysowanie pokoju: tło proceduralne (tapeta + podłoga ze wzorów) → przedmioty ścienne → przedmioty podłogowe i Gabi sortowane po linii stóp → efekty. Tryb „Urządzaj” i panel magazynu w UI.

**Tech Stack:** jak dotąd. Python `/c/gvenv/Scripts/python`. Repo `C:\Users\Al8c\Documents\gabigochi`, gałąź `etap-1`. Pliki pisz Write/Edit. Commit z drugim `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

## Ustalenia (zatwierdzone)

- **Pokoje:** `salon` (start, girlanda urodzinowa), `bedroom` (sypialnia — łóżko Gabi z kotem; zgaszenie światła przenosi widok tutaj i Gabi śpi w łóżku), `studio` (pracownia). Przejście: strzałki po bokach sceny i przesunięcie palcem (poziomy swipe > 40 px po pustym tle, nie po postaci/przedmiocie). Nazwa pokoju nad sceną. Gabi zawsze w oglądanym pokoju (pojawia się przy krawędzi, z której „weszła”).
- **Tapety i podłogi — edytowalne i kupowane:** wzory proceduralne (tapety: gładka, paski, kropki, serduszka, kratka, gwiazdki; podłogi: deski jasne/ciemne, kafelki, wykładzina, parkiet jodełka) × warianty kolorów. Każdy wariant to przedmiot katalogu kategorii `wallpaper`/`floor` (kupowany raz, używany w dowolnej liczbie pokoi). Domyślne (darmowe): salon lawendowe paski + fioletowe deski (obecny wygląd), sypialnia pastelowy róż w kropki + jasne deski, pracownia mięta gładka + kafelki.
- **Okna** to przedmioty ścienne (kupowane/przesuwane/usuwane). Nocą szyby okien ciemnieją (nakładka granatowa na obszar szyb — wystarczy przyciemnienie całego przedmiotu okna ze stałą maską szyb wyznaczoną przy wycinaniu jako kolor „niebo”; prościej: okna nocą rysowane z nakładką `rgba(20,16,60,0.55)` z `globalCompositeOperation='source-atop'`).
- **Katalog:** ~60 przedmiotów z arkuszy `sheet-furniture.jpg`, `sheet-room-assets.jpg`, `sheet-plants.jpg` (bez łóżek dla ludzi; łóżko Gabi to specjalny przedmiot `gabi_bed` rysowany sceną snu/pustą klatką). Kategorie sklepu: Meble, Ozdoby, Rośliny, Gaming, Hobby, Tapety, Podłogi. Ceny 30–400.
- **Warstwy:** `wall` (plakaty, okna, półki, girlandy, zegary, kalendarze, tablice, lustro ścienne, rośliny wiszące) — dolna krawędź w obrębie ściany (`y_bottom ≤ FLOOR_Y`); `floor` (meble, rośliny podłogowe, dywany jako `rug` — rysowane pod wszystkim na podłodze) — stopy w pasie podłogi (`FLOOR_Y+2 … ROOM_H−1`). Siatka 4 px logicznych. Z-order: tło → `rug` → `wall` → (`floor` + Gabi) wg linii stóp rosnąco → efekty.
- **Tryb „Urządzaj”** (przycisk ołówka w rogu sceny): Gabi ukryta (półprzezroczysta), stuknięcie przedmiotu = zaznaczenie (ramka), przeciąganie = przesuwanie z siatką i ograniczeniem do warstwy, przyciski: **Odbij**, **Do magazynu**; dolny pasek **Magazyn** (posiadane, niepostawione; przeciągnij/stuknij → stawia na środku warstwy) + przyciski **Tapeta** / **Podłoga** (lista posiadanych wzorów → stosuje w tym pokoju). „Gotowe” zamyka tryb.
- **Interakcje (poza trybem urządzania):** stuknięcie przedmiotu z interakcją → Gabi idzie do niego (brain.target = środek przedmiotu, ograniczony), po dojściu akcja; zastępcze pozy z istniejących klatek + efekty + dymek; bonus humoru tylko raz na godzinę na przedmiot (cooldown per `uid`):
  - `water` (rośliny): poza `idle_front`, krople wody nad rośliną 1,5 s, „Pij, roślinko!”, podlewa (`wateredAt = now`), +2 humoru.
  - `read` (regały/stosy mang): poza `study_3` 6 s, „Ten tom jest super!”, +2 humoru.
  - `play` (TV/PC/konsola): pętla `phone_2`/`phone_3` 8 s, „Jeszcze jedna runda!”, +2 humoru, −2 energii.
  - `study` (biurka) → zajęcie Nauka; `crochet` (koszyk z włóczką) → zajęcie Szydełko; `music` (głośniki) → zajęcie Muzyka.
  - `cute` (pluszaki, figurki, koci przedmiot): „Słodziak!” + serduszka, +1 humoru.
  - `lamp` (lampki): przełącza poświatę (miękki krąg światła nad lampą, zapamiętany w układzie).
  - `calendar`: „Dziś Dzień N!”.
  - `window`: losowo „Ładna pogoda!” / nocą „Gwiazdy!”.
- **Rośliny:** każda postawiona ma `wateredAt`. Po 24 h spragniona: ikonka kropli nad nią + czasem dymek Gabi „Kwiatki chcą pić!”. Po 72 h zwiędnięta: rysowana przyciemniona z brązowym odcieniem (filtr), nie umiera. Podlanie przywraca.
- **Zapis v2:** `rooms: { salon|bedroom|studio: { wallpaper: string, floor: string, items: PlacedItem[] } }`, `inventory: Record<itemId, number>` (kupione, niepostawione), `ownedLooks: string[]` (tapety/podłogi), `currentRoom`, `itemCooldowns: Record<uid, number>`. `PlacedItem = { uid, itemId, x, y, flip, wateredAt?, lampOn? }` (x = środek, y = linia dolna, px logiczne). Migracja v1→v2: zachowuje wszystko, dodaje domyślne pokoje z darmowymi meblami startowymi. `isValid` dla v2; v>2 → `NewerSaveError` (bez zmian).

---

### Task 1: Wycięcie przedmiotów i katalog sprite'ów

**Files:** Modify `tools/frames.json`, `tools/extract_sprites.py` (sekcja `items`), Generated `public/items/*.png`, `src/home/items.generated.json`.

- Nowa sekcja `items` w frames.json (osobna od `body`/`portraits`): wpis = `{ "sheet": "<furniture|roomAssets|plants>", "rect": [...], "erase": [...] }`. Arkusze: siatka ≈ 4,0 (zmierz), tło ≈ (206,206,211). Paleta: rozszerz metodą `--extend-palette` (prefiks per arkusz, jak przy zajęciach) — istniejące PNG muszą zostać bajtowo identyczne.
- Wyjście: `public/items/<id>.png` (przycięte do obrysu, bez cieni-podpisów, bez napisów/cyfr) i `src/home/items.generated.json`: `{ "<id>": { "w", "h" } }` (px natywne = px logiczne przy skali 1; jeśli przedmioty są w innej skali niż postać, dodaj `scale` z referencji: wysokość regału ≈ 1,1× Gabi).
- Wybierz ~60 przedmiotów (różnorodnie z każdej sekcji arkuszy; pomiń ludzkie łóżka, duplikaty i przedmioty nieczytelne przy tej wielkości). Dla każdego zanotuj: `id` (snake_case ang.), polską nazwę, kategorię (`furniture|decor|plant|gaming|hobby`), warstwę (`wall|floor|rug`), interakcję (`water|read|play|study|crochet|music|cute|lamp|calendar|window|none`), proponowaną cenę. Zapisz to jako `tools/out/items_manifest.json` (wejście do Task 2).
- Dodatkowo wytnij `gabi_bed_empty` — łóżko z szafką bez Gabi i bez kota — jeśli da się złożyć z klatek łóżka (np. `bed_3b` bez postaci). Jeśli nie da się czysto, zgłoś to; wtedy łóżko w dzień rysujemy klatką `bed_3` (z kotem) — akceptowalne.
- Podgląd ×3 wszystkich przedmiotów z podpisami: `tools/out/items_preview.png` — obejrzyj (Read).

### Task 2: Katalog i logika domu (czysta, TDD)

**Files:** Create `src/home/catalog.ts`, `src/home/looks.ts`, `src/home/layout.ts`, `src/home/plants.ts`; Modify `src/core/types.ts`, `src/core/state.ts`, `src/core/save.ts`, `src/core/economy.ts`; Tests `tests/home/*.test.ts`, `tests/core/*.test.ts`.

- `catalog.ts`: `ItemDef { id, name, category, layer, interaction, price }`, `CATALOG: ItemDef[]` (z manifestu Task 1), `itemById`.
- `looks.ts`: `LookDef { id, kind: 'wallpaper'|'floor', name, price, pattern, colors }` (wzory jak w „Ustaleniach”, ~8 tapet, ~6 podłóg, w tym 6 domyślnych za 0), `drawWallpaper(ctx, look, w, h)`, `drawFloor(ctx, look, y0, w, h)` (rysowanie proceduralne pikselami; funkcje rysujące poza testami, ale dane testowane).
- `layout.ts`: `ROOMS = ['salon','bedroom','studio']`, `GRID = 4`, `snap`, `clampToLayer(item, pos)`, `placeItem(state, room, itemId, at?)` (z magazynu → pokój; brak w magazynie = błąd), `moveItem`, `flipItem`, `storeItem` (→ magazyn), `buyItem` (monety → magazyn), `buyLook`, `applyLook(room, kind, id)` (tylko posiadane), `drawOrder(items, gabiFeetY)` → lista z markerem Gabi, `hitItem(items, x, y)` (najwyżej w z-order).
- `plants.ts`: `plantState(item, now)` → `'ok'|'thirsty'|'wilted'` (24 h / 72 h), `water(state, room, uid, now)`.
- Cooldown interakcji: `canReward(state, uid, now)` (1 h), `markReward`.
- Zapis v2 + migracja v1→v2 (z testami: v1 zapis → v2 z zachowanymi monetami/lodówką/rekordami i domyślnymi pokojami; v3 → NewerSaveError; uszkodzone pokoje → recovered).

### Task 3: Trzy pokoje — rysowanie, nawigacja, sen w sypialni

**Files:** Modify `src/pet/room.ts` (tło z tapety/podłogi zamiast stałych kolorów; girlanda tylko w salonie; usuń stałe okno/obrazek/półkę/dywan — stają się przedmiotami startowymi; obrazek „26” zostaje jako przedmiot startowy `picture_26` rysowany proceduralnie lub wyrenderowany do PNG), `src/ui/screens/room.ts` (+ wydzielone moduły w `src/ui/home/*`), `src/styles/*`.

- Strzałki ‹ › przy krawędziach sceny + swipe; nazwa pokoju; przejście z krótkim przesunięciem (slide 200 ms) lub pikselowym przejściem.
- Zgaszenie światła → przejście do sypialni, sen w łóżku Gabi (`gabi_bed` w miejscu postawienia; scena snu rysowana zamiast pustego łóżka).
- Zajęcia ze scenami na środku (biurko nauki, pacjent) — rysowane na środku bieżącego pokoju jak dotąd.

### Task 4: Rysowanie przedmiotów i tryb „Urządzaj”

- Z-order i warstwy wg „Ustaleń”; przedmioty rysowane w rozdzielczości urządzenia (jak postać, `drawSprite`-podobnie, z `scale`).
- Tryb „Urządzaj”: zaznaczanie, przeciąganie z siatką/ograniczeniem warstwy, Odbij, Do magazynu, pasek Magazyn, wybór Tapety/Podłogi z posiadanych. Zapis układu po każdej zmianie.

### Task 5: Sklep — zakładka „Meble” (zastępuje „Dodatki”), filtry kategorii, zakup do magazynu, tapety/podłogi.

### Task 6: Interakcje i rośliny — wg „Ustaleń” (dojście, poza zastępcza, efekty, dymki, bonus z cooldownem, podlewanie, ikony spragnionych, zwiędnięte z filtrem, dymek „Kwiatki chcą pić!”).

### Task 7: Weryfikacja w przeglądarce (kontroler).

---

## Uzupełnienia (decyzje użytkownika po starcie wdrożenia)

### Łazienka (4. pokój) — zrobione w Task 3/4; wyposażenie z `assets/source/sheet-bathroom.jpg`
- Przedmioty sklepu (kategoria „Łazienka”): toilet, sink (z lustrem), shower, bathtub, towel_rail, towel_hanging, hairdryer_shelf.
- Klatki stanów przedmiotów (wyrównane z przedmiotem bazowym): toilet_open/flush/gabi, shower_drip/on/gabi, bathtub_fill/bubbles/gabi, sink_on/gabi, towel_rail_gabi; pozy Gabi: gabi_hairdryer, gabi_turban.
- Interakcje: toaleta (klapa → Gabi spłukuje → wir → klapa), prysznic (woda → Gabi pod prysznicem ~6 s → turban), wanna (napełnianie → piana → kąpiel ~8 s → turban → suszenie), umywalka (woda → mycie rąk → wycieranie przy wieszaku z ręcznikiem, jeśli jest; inaczej przy umywalce), półka z suszarką (suszenie włosów). Bonus humoru jak inne (raz na godzinę na przedmiot).
- Startowe w łazience: umywalka (zamiast lustra ściennego) i toaleta.

### Zajęcia w wyznaczonych miejscach
| Zajęcie | Miejsce | Rysowanie |
|---|---|---|
| Nauka | tylko przy `writing_desk` | Gabi idzie do biurka; sceny nauki rysowane w miejscu biurka (biurko ukryte na czas zajęcia) |
| Praktyka | gdziekolwiek w pracowni (`studio`) | jak dotąd (sceny z rekwizytami na środku / Gabi w miejscu) |
| Szydełko | na siedzisku w dowolnym pokoju: `pouf`, `bean_bag`, `office_chair`, `gaming_chair_purple`, `gaming_chair_pink` | klatki szydełkowania (ze stołeczkiem) rysowane w miejscu siedziska, siedzisko ukryte na czas zajęcia |
| Muzyka | gdziekolwiek w salonie | jak dotąd |
| Telefon | gdziekolwiek | jak dotąd |

- Panel „Zajęcia”: zajęcie bez wymaganego miejsca w żadnym pokoju → wyszarzone z podpisem („Potrzebne: biurko do nauki” / „Potrzebne: siedzisko”); wymagane miejsce w innym pokoju → widok przechodzi do tego pokoju, Gabi idzie do mebla, start po dojściu.
- Auto-start: losuje tylko spośród zajęć dostępnych w bieżącym pokoju (bez zmiany pokoju).
- Interakcje mebli `study`/`crochet` (stuknięcie biurka/koszyka) → odpowiednio start zajęcia w tym miejscu (koszyk z włóczką: szydełko na najbliższym siedzisku w pokoju; brak siedziska → dymek „Brakuje mi siedziska…”).
