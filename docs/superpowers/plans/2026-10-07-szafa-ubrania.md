# Szafa i ubrania (bez nowych sprite'ów) — projekt i plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Gabi przebiera się w sukienki, koszulki, spodnie/spódnice i ozdoby głowy; strój automatycznie widać we **wszystkich** animacjach (chód, emocje, przeciąganie, zajęcia, minigry) bez rysowania nowych klatek. Szafą jest wieszak na ubrania w pokoju (+ przycisk „Szafa”).

**Architecture:** (1) Ekstraktor raz, automatycznie, wyznacza dla każdej klatki ciała **maski** (koszulka, nadruk, spodnie) i **punkt głowy** (środek czubka, szerokość głowy) — działa też dla przyszłych klatek. (2) Ubrania to **dane** (kolory 3-tonowe, wzór, krój). (3) W czasie gry „ubieralnia” składa klatkę: przemalowuje maski wg stroju z zachowaniem cieniowania (mapowanie jasności na 3 tony), nakłada wzór, dla spódnicy/sukienki zamienia nogawki poniżej kolan na nogi (skóra) i dodaje lekkie poszerzenie dołu, dokleja ozdobę głowy (pixel art w kodzie) — wynik cache'owany per (klatka, strój). Wszystkie miejsca rysujące postać pobierają klatkę przez jedno API.

**Tech Stack:** jak dotąd. Repo `C:\Users\Al8c\Documents\gabigochi`, gałąź `etap-1`. Python `/c/gvenv/Scripts/python`. Pliki Write/Edit. Commit z drugim `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`. W podglądzie tylko jedna karta z grą.

## Ustalenia (zatwierdzone)
- **Sloty:** `head` (ozdoba głowy), `top` (koszulka), `bottom` (spodnie / spódnica / legginsy), `dress` (sukienka — zastępuje top+bottom). Domyślnie: oryginalna czarna koszulka z nadrukiem + dżinsy (brak zmian w klatce).
- **Startowy katalog** (ceny w monetach): sukienki 150–300 (kropki, kwiatki, paski, kratka, wieczorowa, różowa letnia), koszulki 60–120 (biała, różowa, lawendowa, w paski, z serduszkiem), doły 60–120 (dżinsy jasne, czarne spodnie, spódnica fioletowa, spódnica w kratę, legginsy różowe), głowa 80–200 (czapka urodzinowa, korona, kocie uszy, kwiatek, beret, kokarda). Kupione raz, zakładane dowolnie.
- **Szafa:** wieszak na ubrania (`clothes_rack`) — stuknięcie → Gabi podchodzi → ekran Szafy. Startowo w sypialni (nowe zapisy; istniejące: dodany po cichu do magazynu, jeśli go nie mają). Przycisk „Szafa” w menu otwiera ekran od razu.
- **Ekran Szafy:** podgląd Gabi w stroju (animowany: spoczynek ↔ machanie, podgląd chodu przy przełączniku), zakładki Sukienki / Góra / Dół / Głowa, siatka pozycji (kafelek z miniaturą = podgląd postaci w danym ubraniu, nazwa, cena lub „Załóż”/„Zdejmij”), zakup w miejscu (monety), „Zdejmij wszystko”. Wybór zapisuje się od razu.
- **Gdzie strój się NIE stosuje:** klatki z innym ubraniem z rysunku — praktyka pielęgniarki (`nurse_*`), łóżko (`bed_*`), klatki łazienki z Gabi (`*_gabi`), kąpiel/prysznic; ozdoba głowy nie na turbanie (`gabi_turban`). Lista wykluczeń w `tools/frames.json` (`wardrobe.exclude`), domyślnie maska tylko tam, gdzie wykryto koszulkę/dżinsy.
- **Avatar w nagłówku i portrety:** przemalowanie koszulki na portretach (`portrait_a`, `portrait_b` — dolny pas ubrania) wg `top`/`dress` — jeśli maska portretu wyjdzie czysto; inaczej portrety bez zmian.
- **Zapis:** pola `outfit: { head, top, bottom, dress }` i `ownedClothes: string[]` w `GameState` (wersja 2; brak pól → wartości domyślne po cichu; walidacja identyfikatorów).

---

### Task 1: Maski ubrań i punkt głowy w ekstraktorze
**Files:** `tools/extract_sprites.py`, `tools/frames.json` (sekcja `wardrobe`: klasy kolorów koszulki/nadruku/dżinsów/skóry per arkusz, `exclude`), wyjście `public/masks/<klatka>.png`, `src/sprites/frames.generated.json` (per klatka: `head: { x, y, w }` w px natywnych, `mask: true|false`, `knee: y` — wiersz kolan w px natywnych).
- Maska PNG: kanał R = koszulka (bez nadruku), G = nadruk, B = spodnie (dżinsy), wszystko w rozdzielczości klatki; klasy z palety (koszulka: bardzo ciemne granaty/czernie **wewnątrz** sylwetki, odróżnione od konturu — kontur = piksele brzegowe sylwetki i najciemniejszy kolor palety przy przezroczystości; dżinsy: niebieskie odcienie w dolnej części; nadruk: czerwienie/szarości otoczone koszulką). Koszulka spójna (flood fill od torsu), bez włosów/torby/rąk.
- `knee`: wiersz ~45% wysokości nogawek od pasa (pas = górna krawędź maski spodni).
- `head`: czubek włosów (najwyższy wiersz sylwetki w kolumnach głowy), środek i szerokość głowy (szerokość włosów w wierszu ~20% wysokości postaci od czubka).
- Podgląd `tools/out/wardrobe_masks.png` (klatka | maska kolorowa | czubek głowy) dla wszystkich klatek — obejrzeć; poprawić klasy/wykluczenia aż maski są czyste. Istniejące PNG klatek bajtowo bez zmian.

### Task 2: Katalog ubrań, stan, zakupy (czysta logika, TDD)
**Files:** `src/wardrobe/catalog.ts` (`ClothDef { id, slot, name, price, colors: [jasny, średni, ciemny], pattern?: 'dots'|'stripes'|'flowers'|'checks'|'hearts', patternColor?, cut?: 'pants'|'skirt'|'leggings' }`, ozdoby głowy: `headArt` = nazwa ikony pixel art), `src/wardrobe/outfit.ts` (`DEFAULT_OUTFIT`, `wear(state, id)`, `takeOff(state, slot)`, `buyCloth(state, id)`, `outfitKey(outfit)`, reguła: założenie sukienki zdejmuje top/bottom i odwrotnie), `src/core/types.ts`, `src/core/save.ts` (pola + walidacja + domyślne po cichu), testy. Ikony ozdób głowy (pixel art 12–16 px szer.) w `src/art/icons.ts` (`hat_party`, `crown`, `cat_ears`, `flower`, `beret`, `bow`).

### Task 3: Ubieralnia w czasie gry + wpięcie we wszystkie miejsca rysowania
**Files:** `src/wardrobe/dresser.ts` (`dressFrame(img, mask, meta, outfit) → { canvas, meta }` — przemalowanie z zachowaniem cieniowania, wzór, spódnica/sukienka: nogawki poniżej `knee` → skóra (z konturem), lekkie poszerzenie dołu spódnicy/sukienki o 1 px na stronę w 2–3 dolnych wierszach; ozdoba głowy doklejona nad `head` (powiększenie płótna u góry, `meta.h/foot/anchorX` skorygowane); cache per klatka+`outfitKey`), API `app.figure(name) → { img, meta } | null` (lub równoważne) używane przez: pokój (`room.ts`, `activityPlayer.ts`, `bustPose.ts`, `interactions` pozy), minigry (`catchGame`, `candlesGame`), podglądy (`wardrobe` ekran). Testy czystych części (mapowanie tonów, wzory, korekta metadanych, cache key).

### Task 4: Ekran Szafy, wieszak w pokoju, sklep
- Ekran Szafy wg „Ustaleń” (zastępuje „wkrótce”).
- `clothes_rack`: interakcja `wardrobe` (katalog przedmiotów) → dojście → `app.go('wardrobe')`; startowo w sypialni; migracja: brak w mieszkaniu i magazynie → po cichu do magazynu.
- Sklep: zakładka „Meble” bez zmian; ubrania kupuje się w Szafie (opcjonalnie skrót „Ubrania” w sklepie prowadzący do Szafy).

### Task 5: Weryfikacja w przeglądarce
Każdy slot na kilku animacjach (spoczynek, chód, emocje, przeciąganie, zajęcia, Łapanie jedzenia), wykluczenia (pielęgniarka, łóżko, łazienka), zapis po przeładowaniu, zakup i zakładanie w Szafie, stuknięcie wieszaka.
