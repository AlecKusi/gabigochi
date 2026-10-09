# Gdzie skończyliśmy (2026-10-08)

## Stan
Gałąź `etap-1` — **działająca wersja** (475 testów, typy i build przechodzą; nic nie jest opublikowane).
- 4 pokoje, urządzanie, sklep (jedzenie, meble, okna, ozdoby, rośliny, gaming, hobby, łazienka, tapety, podłogi);
- Szafa: 50 ubrań i ozdób, stroje przemalowywane na wszystkich animacjach (sukienki w kształcie A), przymiarka;
- interakcje z meblami: siedzenie/relaks/drzemka na kanapach i fotelach, stół (kawa/ciasto/KitKat), okno i TV od tyłu,
  podlewanie konewką, kocie legowiska; łazienka; kot chodzący po pokoju (20 klatek, reakcje na Gabi);
- zajęcia: nauka, praktyka, telefon, szydełko, muzyka, karaoke, taniec; codzienne miny; animowany ekran urodzinowy;
- 6 minigier z przyciskiem „i” (zasady, pauza); hasła osobiste w krzyżówce; losowe teksty Gabi;
- sen i drzemka: pełna energia w 10 minut.

## Do decyzji użytkownika
- treść życzeń w `src/content.ts` (wciąż szkic);
- zgoda na publiczny link (GitHub Pages; workflow gotowy w `.github/workflows/deploy.yml`, gałąź `main`).

## Pomysły na dalej (lista dla użytkownika, 2026-10-08)
Szybkie:
- „Dziennik Gabi”: licznik dni, odblokowane rzeczy, rekordy i zdjęcia z ważnych chwil (pierwszy strój, 7 dni z rzędu…);
- powiadomienia z ekranu początkowego (iOS PWA): „Gabi jest głodna”, „kwiatki chcą pić” — do decyzji, bo iOS wymaga zgody;
- pora dnia za oknem (rano/dzień/wieczór/noc) zamiast tylko dnia i nocy; deszcz/śnieg losowo;
- dźwięki 8-bit (miauknięcie, „pyk” świeczki, monety) z wyłącznikiem w profilu;
- więcej losowych tekstów Gabi i reakcji na pory dnia, dni tygodnia, urodziny (np. 6.10 specjalny dzień).
Średnie:
- zadania dnia (np. „podlej 2 rośliny”, „zagraj w sudoku”) z bonusem monet — powód, by wracać codziennie;
- osiągnięcia z odznakami (pierwsza sukienka, 10 KitKatów, komplet mebli w pokoju);
- kot jako postać: karmienie kota, imię kota, kot śpiący na kanapie/w legowisku z pokoju;
- zdjęcie pokoju: przycisk „aparat” zapisuje ładny obrazek pokoju z Gabi do galerii telefonu;
- nowe minigry: „Ułóż tort” (zręcznościowa), „Kółko i krzyżyk z kotem”, „Zgadnij mangę” (quiz).
Wymagające nowych arkuszy (prompty jak w docs/prompty-animacji.md):
- gotowanie w kuchni (nowy pokój: kuchnia z lodówką i kuchenką);
- wyjście na spacer / balkon (tło zewnętrzne, pory roku);
- prawdziwe sukienki z rysunku (bufiaste rękawy, kokardy) zamiast przemalowania — np. 2–3 ulubione stroje jako osobne klatki;
- arkusz kota śpiącego na meblach, karmienia kota.
Do poprawy (znane drobiazgi):
- ślady nóżek stołka pod udami w klatkach siedzenia z telefonem; mała łata czarnej koszulki w jednej klatce;
- obrót w Szafie i karaoke mają drobniejsze piksele niż reszta (arkusze z większą postacią);
- skok lustra przy myciu rąk; stuknięcie pufy, gdy Gabi na niej stoi, trafia w Gabi.

## Sprawdzone w przeglądarce (2026-10-07)
Nauka przy biurku, toaleta, prysznic (z turbanem), wanna (turban + suszarka), umywalka z wycieraniem rąk przy wieszaku, podlewanie, szydełko na pufie z panelu, panel „Zajęcia” z podpisami miejsc.

## Drobiazgi (znane, do ewentualnej poprawki)
- Klatka mycia rąk ma w arkuszu inaczej narysowane lustro → mały przeskok przy umywalce.
- Gdy Gabi stoi na małym siedzisku (pufa), stuknięcie w siedzisko trafia w Gabi (głaskanie) — szydełko wtedy z panelu albo po odejściu Gabi.

## Minigry etapu 2 — zrobione (2026-10-07)
Bricks n Balls, Sudoku (3 poziomy, notatki, zapis w toku), Szyfrokrzyżówka (polskie litery, podpowiedzi, zapis w toku) — na liście minigier, sprawdzone w przeglądarce.
- Słowa osobiste do krzyżówek: `src/games/cryptoWords.ts` (`PERSONAL_WORDS`) — do podmiany przez użytkownika; słowa > 11 liter (np. PIELĘGNIARKA) się nie mieszczą.

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
- (2026-10-08, później) Rozmazanie: powrót do drobniejszego piksela na gładkich arkuszach (kratka 2, bez `reduce`), ale z pogrubionym zewnętrznym konturem (`outline: ["#030205"]`, `outer_outline` — tylko od zewnątrz sylwetki) — czytelne i spójne z domyślnymi. Porównanie wariantów: docs/warianty-jakosci.png.
- Kot zlewał się z ubraniem: klatki głaskania/przytulania mają `pet` (wielokąty kota w px arkusza) — kot wyłączony z masek (w masce biały = zwierzak, ubieralnia go nie maluje, spódnica go omija), brzeg kota przy czarnych ubraniach dostaje jaśniejszy obrys; chodzący kot (`cat2`) ma jasną obwódkę (`outline: ["#9a8fb8"]`). W klatkach z kotem buty i koszulka ograniczone (but nie dostaje koloru ubrania).
- Dziury i kropki w gładkich arkuszach: `clean_smooth` (dziury w głowie — górne 28% — zawsze zamalowane medianą sąsiadów, niżej tylko < 12 px; pojedyncze kropki we włosach/na ubraniu → kolor sąsiadów) i po obrysie dziurki < 6 px domknięte kolorem konturu.

## Dźwięki, pora dnia, kot, kuchnia, balkon (2026-10-09)
- Dźwięki 8-bit: `src/ui/sound.ts` (Web Audio, bez plików; `play('coin' | 'meow' | …)`), wyłącznik w Profilu (localStorage `gabigochi.sound`), odblokowanie przy pierwszym dotknięciu (iOS).
- Pora dnia: `src/home/daytime.ts` (`dayPhase`: rano 6–10, dzień 10–18, wieczór 18–21, noc 21–6) — barwa okien, poświata pokoju (`RoomFrame.phase`), nocna klatka okna słonecznego także nocą bez snu, niebo nad balkonem.
- Kot: `GameState.cat` {name, hunger, love} (spadek 8/h i 4/h, też offline; `readCat` w zapisie), imię i paski w Profilu, karmienie z miski (`catfood` → kot biegnie i je), głaskanie +sympatia, głodny prosi Gabi i Gabi przypomina „{kot} jest głodny…”, śpi na legowiskach/kanapach/fotelach (`catBeds`, `lift`), im większa sympatia, tym częściej się łasi. Znacznik `{kot}` w kwestiach.
- Kuchnia i balkon: pokoje 5 i 6 (cicha migracja starych zapisów), meble narysowane w kodzie (`tools/draw_kitchen_balcony.py` → `assets/source/sheet-kitchen.png`, arkusz `kitchen`, paleta 184): lodówka (otwiera jedzenie), kuchenka (gotowanie z parą — danie do lodówki raz na godzinę), blat, szafki, przyprawy, miska kota; balkon: skrzynka z kwiatami (podlewanie), krzesełko (siedzisko), stolik (kawa), lampki, luneta (jak okno). Balkon: niebo + miasto + balustrada + daszek zamiast tapety (bez zakładki „Tapeta”).


## Zegar z porą dnia (2026-10-09)
- Pasek pokoju: zegarek (godzina z telefonu + ikonka `sunrise`/`sun`/`sunset`/`moon`), stuknięcie — dymek „Wieczór · 19:42”.
- Zegar ścienny `wall_clock` (Ozdoby, 60 monet; w salonie nowej gry na środku ściany): okienko nieba nad tarczą — klatki `wall_clock_morning/_evening/_night` (dzień = zwykły sprite), zawsze wg godziny, także przy zgaszonym świetle. Wskazówki (godzinowa, minutowa, sekundnik w dzień) rysuje `roomRenderer` w pół-pikselach (`CLOCK_FACE` w `src/home/clock.ts`). Interakcja `clock`: Gabi zerka na tarczę i mówi godzinę (`content.lines.clockMorning/Day/Evening/Night`, znacznik `{czas}`).
- Zegar narysowany w `tools/draw_kitchen_balcony.py` (`wall_clock(phase)`); obecny zapis go nie ma — do kupienia w sklepie.
- Cyfra „5”: Pixelify Sans rysuje ją jak „S” — poprawiony glif (tylko U+0035, wagi 400 i 700) w `src/styles/fonts/pixelify-five-*.woff2`, nałożony w `src/styles/fonts.css` (`unicode-range`, import zaraz po @fontsource). Generator: `tools/fix_font_five.py` (fonttools + brotli w /c/gvenv).

## Ukulele, cola, lodówki z otwieraniem, kot przy misce (2026-10-09)
- Nowe arkusze: `sheet-ukulele.jpg` (okres 8,3), `sheet-drink.jpg` (4,7), `sheet-fridges.jpg` (gładki, 2,48, skala 1), `sheet-cateat.jpg` (gładki, 3,9, skala 0,228 — kot jak `cat2`).
- Ukulele: zajęcie `ukulele` (gdziekolwiek, nutki), klatki `uke_1…6` z maskami szafy (instrument się nie przebarwia).
- Cola: jedzenie `cola` (8 monet, głód +5, humor +15), ikonka `cola`, akcja `drink` (animacja `drink_1…7`), kwestie `drink`.
- Lodówki `fridge_retro` / `fridge_modern` / `fridge_kawaii` (Kuchnia): stany `ajar`, `open`, `gabi`. Interakcja `fridge` z `PlanCtx.itemStates`: drzwi się uchylają i otwierają; klatka z Gabi (`gabi`) tylko w oryginalnym stroju (`defaultOutfit`), inaczej Gabi w swoim stroju zagląda od tyłu. Włosy w tych klatkach — `hairTone` we wpisie (teraz też na poziomie wpisu). W nowej grze kuchnia ma lodówkę retro.
- Kot przy misce: miska `cat_bowl` wycięta z arkusza jedzenia (czerwona); stany `cat_bowl_eat_1…7` (kot + miska, kotwica ze środka miski: `anchorAt` w ekstraktorze). `callToBowl(…, framed, bowlLift)`: kot biegnie na lewą stronę miski (`BOWL_SIDE` = 10), w biegu stopniowo wchodzi w głąb do linii miski (`lift`), je w klatkach miski (`bowlEatState`, warstwa kota ukryta), w zwykłym spacerze wraca na swoją linię. Miska przy lewej ścianie — dawne jedzenie obok.
- `hitItem`: obszar stuknięcia co najmniej 12×10 (mała miska).
- Ekstraktor: obrys (`outline`) poszerza też współrzędne komórek (klatki stanów z obrysem).
- Poprawka lodówek: blade partie (miętowa lodówka, stalowe uchwyty) były brane za tło — w trybie `smooth` próg tła jest teraz polem arkusza `bgTol` (domyślnie 45; lodówki 20), a lodówka dwudrzwiowa ma `holeTol: 0` (jasnoszare szczeliny drzwi zostają). Dziury sprawdzane automatycznie (przezroczyste piksele niepołączone z brzegiem) — zostały tylko prawdziwe prześwity (między stopą Gabi a drzwiami).
- Podgląd pory dnia (tylko `npm run dev`): `http://localhost:5173/?godzina=23` (albo `?godzina=7:30`) — `setClockOverride`/`gameClock` w `src/home/clock.ts`: przesuwa tylko godzinę gry (okna, balkon, zegary, kwestie), potrzeby i zapis liczą się od prawdziwego czasu. Bez parametru — zegar telefonu.
