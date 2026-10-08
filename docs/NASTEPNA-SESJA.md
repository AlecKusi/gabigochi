# Gdzie skończyliśmy (2026-10-07)

## Stan
Gałąź `etap-1` — **działająca wersja** (testy, typy i build przechodzą). Mieszkanie jest kompletne:
- 4 pokoje (salon, sypialnia, pracownia, łazienka), przechodzenie strzałkami i przesunięciem palca;
- tryb „Urządzaj” (przesuwanie z siatką, odbijanie, magazyn, tapety i podłogi), sklep z zakładką „Meble” (8 kategorii);
- interakcje z meblami: podlewanie roślin, czytanie mang, granie, słodziaki, lampki, kalendarz, okno; łazienka (toaleta, prysznic, wanna, umywalka z wycieraniem rąk przy wieszaku, suszarka) z animacjami; bonus humoru raz na godzinę na przedmiot;
- rośliny wysychają (24 h kropla, 72 h zwiędnięte), Gabi przypomina „Kwiatki chcą pić!”;
- zajęcia w wyznaczonych miejscach: nauka przy biurku do nauki, szydełko na siedzisku (stuknięcie siedziska też je zaczyna), praktyka w pracowni, muzyka w salonie, telefon wszędzie; panel „Zajęcia” z podpisami i przejściem do właściwego pokoju;
- wcześniejsze: zajęcia, stany i emocje, przeciąganie palcem, sen w łóżku z kotem, minigry, sklep z jedzeniem.

Gałąź `wip/interakcje` jest już scalona (można ją usunąć).

## Sprawdzone w przeglądarce (2026-10-07)
Nauka przy biurku, toaleta, prysznic (z turbanem), wanna (turban + suszarka), umywalka z wycieraniem rąk przy wieszaku, podlewanie, szydełko na pufie z panelu, panel „Zajęcia” z podpisami miejsc.

## Drobiazgi (znane, do ewentualnej poprawki)
- Klatka mycia rąk ma w arkuszu inaczej narysowane lustro → mały przeskok przy umywalce.
- Gdy Gabi stoi na małym siedzisku (pufa), stuknięcie w siedzisko trafia w Gabi (głaskanie) — szydełko wtedy z panelu albo po odejściu Gabi.

## Minigry etapu 2 — zrobione (2026-10-07)
Bricks n Balls, Sudoku (3 poziomy, notatki, zapis w toku), Szyfrokrzyżówka (polskie litery, podpowiedzi, zapis w toku) — na liście minigier, sprawdzone w przeglądarce.
- Słowa osobiste do krzyżówek: `src/games/cryptoWords.ts` (`PERSONAL_WORDS`) — do podmiany przez użytkownika; słowa > 11 liter (np. PIELĘGNIARKA) się nie mieszczą.

## Następne większe kroki (z pierwotnego planu)
- Szafa: sukienki i czapki (stroje na postaci).

## Do decyzji użytkownika
- treść życzeń w `src/content.ts`;
- zgoda na publiczny link (GitHub Pages; workflow gotowy w `.github/workflows/deploy.yml`, gałąź `main`).

## Uwagi techniczne
- Python do narzędzi: `/c/gvenv/Scripts/python` (venv w repo nie działa przez długie ścieżki).
- Paleta zamrożona w `tools/palette.json`; nowe arkusze: `--extend-palette K <arkusz>` (stare PNG bez zmian).
- W podglądzie trzymaj tylko jedną kartę z grą — dwie nadpisują sobie zapis.
- W trybie deweloperskim `window.__room` pokazuje stan pokoju (mózg, droga, zajęcie, interakcja) — pomocne przy testach.

## Szafa i ubrania (gotowe, 2026-10-07)
Plan: docs/superpowers/plans/2026-10-07-szafa-ubrania.md — wszystkie kroki zrobione i sprawdzone w przeglądarce.
- Maski ubrań (public/masks, R koszulka / G nadruk / B dżinsy) + czubek głowy i kolana w frames.generated.json — wyznacza je ekstraktor, więc nowe animacje dostaną strój bez rysowania.
- `src/wardrobe/dresser.ts` (czysta logika): przemalowanie z zachowaniem cieniowania (tony względem mediany jasności), wzory, spódnica/sukienka (pas między nogami, poszerzenie dołu, rąbek w wierszu kolan, poniżej gołe nogi; pozy siedzące `SEATED_FRAMES` — całe nogawki w materiale), okruchy spoza maski (`strays`), ozdoba głowy (`HEAD_FIT`, płótno rośnie w górę, metadane przesunięte).
- `src/wardrobe/figures.ts`: `app.figures.get(name, {hat?, outfit?})` / `app.figures.url(name)` — jedyne źródło klatek Gabi (pokój, sen, zajęcia, interakcje, popiersia, przeciąganie, minigry, portrety, karty zajęć, ekran urodzin, profil). Cache per klatka + ozdoba + strój.
- Ekran Szafy (`src/ui/screens/wardrobe.ts`): podgląd (spoczynek ↔ machanie, „Pokaż spacer”), zakładki Sukienki/Góra/Dół/Głowa, kupno = od razu założenie, Załóż/Zdejmij, „Zdejmij wszystko”.
- Wieszak `clothes_rack` (interakcja `wardrobe`): stuknięcie → Gabi podchodzi → Szafa. Nowa gra: w sypialni (x 104, y 132); stare zapisy: po cichu do magazynu.
- Drobne niedoskonałości: ozdoba na klatkach przechylonych (drag) nie obraca się; przy słuchawkach (music_1/2) ozdoba siedzi nad pałąkiem; przy biurku (study_*) nogi pod biurkiem zostają w dżinsach; miny w nagłówku (face_*) nie mają maski — koszulka na nich zostaje czarna.

## Poprawki (2026-10-07)
- Prześwitujące włosy w klatkach głównego arkusza (spoczynek, chód, machanie, jedzenie, rozmowa): jasne włosy były blisko koloru tła i ekstraktor brał je za dziury — wpisy mają teraz `holeTol: 15` (jak arkusze `keep: all`).
- Zbliżenia z uciętymi rekwizytami (nauka 2–5, pacjent w łóżku `nurse_3`) — tak są narysowane w arkuszu. Pokazujemy je w okienku-ramce nad Gabi (`ActivityDef.zoom`, `splitZoom`, `zoomRect` w `src/ui/activityPlayer.ts`); Gabi zostaje w ostatniej pełnej scenie (przy biurku `study_1`, przy pacjencie w pozie `nurse_2`).

## Nowe ubrania, ozdoby i okna z arkuszy (2026-10-07)
- Arkusze `assets/source/sheet-headwear.jpg`, `sheet-windows.jpg`, `sheet-goth.jpg`, `sheet-kawaii.jpg`; paleta rozszerzona do 160 kolorów (`--extend-palette 26 headwear windows goth kawaii`), stare PNG bez zmian.
- 12 ozdób głowy z arkusza (`hat_*` w public/items) — `ClothDef.headSprites` (overlap/dx dopasowane na oko; welon z wyciętym środkiem). Ładowane przy starcie (`headSpriteNames`), przekazywane do ubieralni (`DressOpts.art`).
- 13 strojów z wieszaków (gotyckie + kawaii) + 3 rzeczy do zestawów gotyckich: na Gabi to przemalowanie z dodatkami (`upper`, `collar`, `waist`, `bib`, `apron`, `hem`, `hemDrop`, `legs` — rajstopy/kabaretki/skarpetki, wzory `rips`, `skull`); kaptur z uszkami bluzy-sukienki = ikona `bunny_hood`. Miniatura w Szafie = obrazek z wieszaka (`thumb`). W Szafie stuknięcie miniatury = przymiarka na podglądzie.
- 20 okien w nowej kategorii sklepu „Okna” (stare okna też tam). Okno słoneczne ma nocny wariant (`window_day_night`, stan `night` — rysowany, gdy Gabi śpi). Drzwi balkonowe, okno panoramiczne i drzwi przesuwne stoją na podłodze (warstwa `floor`).
- Portrety z arkuszy gotyckiego i kawaii nie są użyte (można by je pokazać w nagłówku przy danym stylu).

## Meble z arkusza i interakcje z meblami (2026-10-07)
- Arkusz `assets/source/sheet-furniture2.jpg` (okres 4, paleta +8 → 168 kolorów tylko dla niego): 5 kanap, 5 foteli, 6 krzeseł/stołków, 5 stołów (kategoria Meble).
- Klatki pochodne w ekstraktorze (sekcja `derived` w frames.json, `without_stool`): `sit_crochet_1..5` = szydełkowanie bez stołka. Szydełko przy siedzisku używa ich (`ActivityDef.seated`), Gabi siedzi na widocznym meblu (`seatAnchor`, `SEAT_LIFT` — hoker wyżej); biurko przy nauce nadal ukryte.
- `SEATS` obejmuje kanapy, fotele, krzesła; `SOFAS`: stuknięcie przy energii < 60 → drzemka na kanapie (`nap`, klatka `tired_5` na siedzisku, +6 energii), inaczej szydełko.
- Stoły: interakcja `coffee` (jedzenie/picie, serduszka). Okna: w dzień Gabi macha (`fun_wave`), w nocy patrzy (PlanCtx.night).
- Pomysły na dalej: telewizor (siedzenie przed TV, migający ekran), siedzenie przy stole z krzesłami.

## Nowe animacje z 10 arkuszy (2026-10-07)
- Arkusze `assets/source/sheet-{birthday,expressions,cat,turnaround,plants2,table,lying,back,sitting,karaoke}.jpg` (okres 4, `holeTol` 15, skala z `scaleRef` albo ręczna `bodyScale` dla siedzenia/stołu/leżenia).
- Ekstraktor: `noSeat` (stołek/ławka usuwane po kolorze brązu + szare prześwity/cień osiągalne od tła + największy kształt), `onlyLargest` (bez numerów i nutek), `seatMode`, `wardrobe.sheetClasses` (osobne klasy koloru koszulki dla arkusza „sitting”).
- Gra:
  - miny jako akcje mózgu (`yawn/stretch/think/idea/shy/laugh/love/bored`, `pickEmote`): głaskanie → śmiech/rumieniec, KitKat → zakochana, wolne chwile → losowa mina;
  - interakcje z pozą względem przedmiotu (`GabiPose.at`: seat/lie/behind/front/under, `face`): relaks na siedzisku (telefon/herbata), leżenie na kanapie (manga, telefon), drzemka na leżąco, stół (kawa/ciasto/KitKat za stołem), okno od tyłu, TV (oglądanie + konsola, migający ekran `TV_SCREENS`), podlewanie konewką, kocie legowiska (głaskanie, przytulanie);
  - nowe zajęcia: Karaoke (salon) i Taniec (wszędzie), z nutkami rysowanymi przez grę;
  - kot chodzący po pokoju (`src/home/cat.ts`), stuknięty — Gabi go głaszcze; w nocy śpi w łóżku;
  - Szafa: obrót dookoła i pozy po założeniu; ekran urodzinowy: animowana scenka; finał Świeczek: konfetti + dziękuję.
- Znane ograniczenia: na klatkach z nowych arkuszy dolne nogawki mają kolor koszulki, więc pod spódnicą/sukienką wyglądają jak czarne rajstopy; w arkuszu „siedzenie” Gabi ma dłuższe, ciemniejsze włosy (styl generatora); pod udami siedzącej zostają cienkie kreski po stołku.
- Poprawki jakości: arkusze narysowane gładko (miny, urodziny, kot, rośliny, stół, leżenie, siedzenie) mają `sampleMode: "smooth"` — cała kratka, tło pomijane (bez szarej obwódki), kontur ma pierwszeństwo przy >= 40% ciemnych pikseli; stół i leżenie próbkowane rzadszą kratką (4,65 i 6), żeby piksel miał taką wielkość jak w reszcie (skala ~0,93). Arkusze z prawdziwą siatką (obrót, widok od tyłu, karaoke) bez zmian.
- Obraz w telewizorze rysowany razem z telewizorem (`RoomFrame.itemOverlays`), a nie na warstwie efektów — Gabi przed ekranem go zasłania.
- Twarze na gładkich arkuszach były rozmyte (cienkie linie okularów i oczu ginęły w kratce 4×4): gładkie arkusze próbkowane teraz kratką 2 (skala ~0,45 — piksele o połowę mniejsze niż w starych klatkach, ale twarze czytelne); ozdoby głowy na takich klatkach powiększane ×2 (`hatFactor`), maski stroju liczone na obrazie pomniejszonym ×2 i rozciągane. Kotek z arkusza: skala przedmiotów 0,275.

## Sukienki jak sukienki (zrobione, 2026-10-08)
Wcześniej sukienki wyglądały jak koszulka + spodnie: spódnica tylko od pasa do „kolana” (~45% nóg), w kształcie dwóch
nogawek (ciemny fałd w szparze), skarpetki/rajstopy na całej łydce, a na siedząco całe nogi w kolorze sukienki.
Teraz (`skirt` i `seatedSkirt` w src/wardrobe/dresser.ts):
- kształt litery A/dzwonu: od pasa do rąbka (sukienka `DRESS_LENGTH` 0,56 długości nóg ≈ kolano, spódnica
  `SKIRT_LENGTH` 0,5, płaszcz + `hemDrop`), rozkloszowanie ~45% szerokości bioder na stronę (biodra = najszerszy
  wiersz w górnej części nogawek), gładki materiał ze światłem z lewej, cieniem z prawej i 3 zakładkami w dół;
- boczny kontur i rąbek; malowane tylko piksele przezroczyste/ciemne/dżinsy — dłonie przed spódnicą zostają;
- pod rąbkiem nogi (skóra/rajstopy/skarpetki), także ciemne nogawki spoza maski na nowych arkuszach;
- na siedząco: uda w materiale (z falbaną), łydki gołe.

## Spójność animacji i prześwitujące ubrania (2026-10-08)
- Nowy arkusz siedzenia (`sheet-sitting.jpg`) — Gabi z właściwą fryzurą; stołek: brąz i śliwkowe odcienie (nie w strefie butów), grube kontury nóżek dalej niż 3 px od postaci.
- Kotek z arkusza `sheet-cat2.jpg` (20 klatek) — `src/home/cat.ts`: tryby sit/walk/run/sleep/stretch/yawn/wash/play/roll/hunt/beg/rub/scared, `catFrame` (sekwencje, skok w zabawie), reakcje `catReact` (prosi przy jedzeniu, jeży się przy złości), łasi się przy stojącej Gabi.
- Spójność z domyślnymi klatkami: gładkie arkusze próbkowane gęsto i zmniejszane 2×2→1 z zachowaniem cech (`reduce: 2`, `reduce2`) — piksel jak w domyślnych klatkach (skala ~0,9–0,94; leżenie/stół/siedzenie z dobraną kratką); kolor włosów wyrównany do domyślnej Gabi (`hairTone: [0.6, 1.1]`).
- Prześwitywanie: w ubieralni maska uzupełniana po kolorach (`colourFlood`: koszulka do 3 px od maski i nad pasem, dżinsy pod pasem bez strefy butów; nie w klatkach z kotem); w ekstraktorze zapas, gdy nie rozpoznano dżinsów (koszulka w dolnej połowie = spodnie, koszulka = ciemne ubranie 30–50% wysokości).
- Zostaje: w klatkach z kotem łydki bez przebarwienia (czarne jak kozaki), drobne łaty przy ramieniu w `expr_think`.

