# Gdzie skończyliśmy (2026-10-09)

## Stan
Gałąź `etap-1` — **działająca wersja** (520 testów, typy i build przechodzą; nic nie jest opublikowane).
- 6 pokoi (salon, sypialnia, pracownia, łazienka, kuchnia, balkon), urządzanie, sklep (14 potraw, meble, okna, ozdoby,
  rośliny, gaming, hobby, łazienka, kuchnia, balkon, tapety, podłogi);
- Szafa: 50 ubrań i ozdób, stroje przemalowywane na wszystkich animacjach (sukienki w kształcie A), przymiarka;
- interakcje z meblami: siedzenie/relaks/drzemka, stół, okno i TV od tyłu, podlewanie, lodówki z otwieraniem (3 modele),
  gotowanie, zegar ścienny; łazienka; kot jako postać (imię, głód, sympatia, je z miski w klatkach, śpi na meblach);
- zajęcia: nauka, praktyka, telefon, szydełko, muzyka, karaoke, taniec, ukulele; cola z animacją picia;
- pora dnia (okna, poświata, zegarek na pasku), żywe niebo nad balkonem (chmurki i ptaki w dzień, gasnące okna,
  spadające i migoczące gwiazdy nocą); podgląd innej godziny: `?godzina=23` (tylko `npm run dev`);
- życzenia od użytkownika (2026-10-10, `content.wishes`); dźwięki 8-bit z wyłącznikiem; 11 minigier z przyciskiem „i”; losowe teksty Gabi (12); sen/drzemka: pełna energia w 10 min.

## Do decyzji użytkownika
- zgoda na publiczny link (GitHub Pages; workflow gotowy w `.github/workflows/deploy.yml`, gałąź `main`).

## Pomysły na nowe minigry (lista dla użytkownika, 2026-10-09)
Obecne: łapanie jedzenia, świeczki, cegiełki, szyfrokrzyżówka, memory, sudoku, a od 2026-10-09 także
2048 z jedzeniem, kot w pudełkach, ukulele Simon, trzy kubki i skaczący kotek (punkty 1, 3, 4, 7, 8 poniżej — zrobione).
Propozycje (najprostsze pierwsze):
1. ~~**2048 z jedzeniem**~~ (zrobione) — łączenie jednakowych kafelków: jabłko → truskawki → pączek → … → tort (ikonki już są).
2. **Ułóż tort** — warstwa jeździ w poprzek, stuknięcie ją upuszcza, wystające kawałki odpadają; jak najwyższy tort.
3. ~~**Kot w pudełkach**~~ (zrobione) — Somerka wyskakuje z pudełek, stuknij ją, zanim się schowa (30 s, klatki kota już są).
4. ~~**Ukulele Simon**~~ (zrobione) — Gabi gra coraz dłuższą melodię na 4 strunach, powtórz ją (dźwięki 8-bit z `sound.ts`).
5. **Zastrzyk w punkt** (pielęgniarka) — wskaźnik biega po pasku, zatrzymaj go w zielonym polu; pole się zwęża.
6. **Wisielec** — hasła z listy krzyżówki (`cryptoWords.ts`), za każdy błąd kot zjada kawałek KitKata.
7. ~~**Trzy kubki**~~ (zrobione) — kot chowa się pod kubkiem, kubki się tasują, zgadnij gdzie jest (coraz szybciej).
8. ~~**Skaczący kotek**~~ (zrobione) — bieg bez końca: stuknięcie = skok nad doniczkami i ogórkami (jak dinozaur z Chrome).
9. **Wąż z KitKatami** — klasyczny wąż na kratce, sterowanie przesunięciem palca.
10. **Kółko i krzyżyk z kotem** — przeciwko prostemu komputerowi (kot = kółko, Gabi = krzyżyk).
11. **Spadające gwiazdy** — nocny balkon: łap spadające gwiazdy, omijaj chmury (wykorzystuje rysowanie nieba).
12. **Quiz o Gabi** — pytania i odpowiedzi od użytkownika (urodzinowa niespodzianka; potrzebne treści pytań).

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
- Żywe niebo nad balkonem: `src/home/balconySky.ts` (czyste funkcje: `litShare`, `windowLit`, `meteorAt`, `starDimmed`) + rysowanie w `pet/room.ts` (`drawBalconyBack` / `drawBalconyLive` / `drawBalconyFront`). Renderer pokoju na balkonie składa warstwy co klatkę: niebo z miastem (bufor) → okna, migotanie, spadające gwiazdy → podłoga z balustradą (bufor) → nocna nakładka przy zgaszonym świetle. Okna wieczorem i nocą gasną/zapalają się (cykl 40–120 s, im później, tym mniej świeci: 22:00 ~80%, 5:00 ~25%); spadająca gwiazda średnio co ~13 s (lot 1 s), co piąta gwiazda migocze.
- Niebo w dzień: chmurki (`CLOUDS`, `cloudX`) dryfują w prawo (0,8–2,2 px/s) i wracają zza lewej krawędzi — rano, w dzień i wieczorem (różowe); klucze ptaków (`birdsAt`: 1–4 ptaki co ~18 s, przelot 7 s, machają skrzydłami „v”/„^”). Chmurki są teraz w warstwie żywej (`drawBalconyLive`), nie w buforze nieba.
- Nowe jedzenie (14 potraw): truskawki, pączek, lody, zapiekanka, naleśniki, pierogi, ramen, sushi — ikonki 12×12 w `src/art/icons.ts`, kwestie przy konkretnej potrawie `content.foodLines` (reszta — `lines.eat`), kuchenka gotuje też pierogi, naleśniki, zapiekankę i ramen.

## Pięć nowych minigier (2026-10-09)
- Logika (czyste funkcje, testy w `tests/games/newGames.test.ts`, zasady w `rules.ts` sprawdzane w `rules.test.ts`):
  `food2048Logic.ts`, `catBoxesLogic.ts`, `simonLogic.ts`, `cupsLogic.ts`, `catRunLogic.ts`; rysowanie w `*Game.ts`.
- 2048 z jedzeniem (Łamigłówki): plansza DOM 4×4, przesunięcie palcem / strzałki, łańcuch 13 potraw (jabłko → … → KitKat
  → tort), przycisk „Zakończ i odbierz”; nagroda 1 moneta / 80 pkt (3–50).
- Ukulele Simon (Łamigłówki): Gabi gra (klatki `uke_*`) na strunach G C E A (`pluck` w `sound.ts`), gracz powtarza;
  pomyłka — `sad_cry`; 3 monety za melodię (3–45).
- Kot w pudełkach (Zręcznościowe): 9 pudełek, 30 s, kot +1, złoty +5, ogórek −3; kot rysowany za przednią ścianką
  (warstwa fx) i przycinany do pudełka.
- Trzy kubki (Zręcznościowe): pokaz → tasowanie (3 zamiany + 1 na rundę, coraz szybciej) → wybór; 3 serduszka.
  Kotek niewidoczny w czasie tasowania (kubki jadą łukiem).
- Skaczący kotek (Zręcznościowe): bieg z przyspieszeniem, doniczki / ogórki / wysokie doniczki (od prędkości 75),
  rybki nad przeszkodami (+5); test sprawdza, że każdą przeszkodę da się przeskoczyć.
- Wspólne: `catDraw.ts` (klatki kota w grach), ikonki `catface`, `cup`, `note`, `fish`.
- Sprawdzone w przeglądarce na tymczasowej stronie testowej (bez zapisu gry): wszystkie pięć, w tym pełne rundy Simona.

## Dekoracje salonu jako przedmioty (2026-10-09)
- Girlanda (`bunting`, 128×5, na samej górze, y 8) i obrazek „26” (`picture_26`, 20×16, x 104 y 40) nie są już tłem
  salonu (`pet/room.ts`), tylko przedmiotami ściennymi (Ozdoby, 30 i 40 monet) — da się je przesuwać, odbijać i chować.
  Rysowane w `tools/draw_kitchen_balcony.py` bez automatycznego konturu (`NO_OUTLINE`).
- `SALON_DECOR` w `starter.ts`; `readHome` dokłada je po cichu do salonu, jeśli nie ma ich ani w pokojach, ani
  w magazynie (schowane nie wracają same).

## Meble balkonowe z dwóch arkuszy (2026-10-09)
- `sheet-balcony1.jpg`, `sheet-balcony2.jpg` (okres 6,25, skala 0,75), 25 przedmiotów w kategorii „balcony”:
  krzesła (składane, złożone, metalowe), fotel rattanowy, leżak, stoły (drewniany, okrągły, z parasolem), ławka,
  zestaw stolik + krzesła, skrzynka na balustradę, doniczka wisząca (ścienna), donica z drzewkiem, kokon, stolik na
  barierkę, pufa ogrodowa, poduszki podłogowe, markiza (ścienna), mata na barierkę, pergola z pnączem, regał na rośliny,
  girlanda z żarówkami (ścienna, lampka), lampiony (lampka), dywanik (warstwa dywanów), mini grill (gotowanie).
- Siedziska (`SEATS`): krzesła, fotel, kokon (`SEAT_LIFT` 3), pufa; kanapy (`SOFAS`): ławka i leżak (leżenie, drzemka).
  Kot śpi też na nich i na poduszkach podłogowych (`CAT_BED_LIFT`). Stoliki — kawa (poza stolikiem z parasolem:
  parasol zasłaniałby siedzącą Gabi, więc to dekoracja). Rośliny — podlewanie.
- Ekstraktor: `shadowHsv` (arkusz albo wpis) — w obszarach `shadow` znika też cień w zadanym kolorze, nawet między nogami.

## Ubrania — przegląd i naprawa masek (opcja A, 2026-10-09)
- Strona przeglądu (tylko `npm run dev`): `http://localhost:5173/tools/wardrobe-review.html` (`?names=a,b` — wybrane
  klatki, `?zoom=3`). Każda klatka z maską w 5 strojach kontrolnych; liczniki z `src/wardrobe/review.ts`:
  przecieki (przemalowany jasny piksel spoza nadruku), braki (nieprzemalowane kolory koszulki/dżinsów; bez kota
  i strefy butów), alarm „brak koszulki w masce”. Najgorsze klatki na górze; `window.__review` — wyniki.
- Poprawki w `dresser.ts`: wyspy koszulki/nogawek odcięte dłońmi (`colourParts`, zasięg 10 px, min. 6 px, tylko ciemne
  kolory), skóra/włosy/jasne rekwizyty nigdy nie są ubraniem (`isSkinOrHair`), kot z maski nigdy nie jest dopełniany
  (dopełnianie włączone też w klatkach z kotem), spódnica nie zamalowuje ciemnych rekwizytów w ciepłych kolorach
  (`clothDark`), śliniaczek z jednym środkiem tułowia. Ekstraktor: góra spodni w klatkach ze zwierzakiem z największego
  kawałka spodni (przytulanie kota gubiło całą koszulkę).
- Wynik na tych samych licznikach: przecieki 1812 → 586, braki 9464 → 6232 (reszta to głównie fałszywe alarmy:
  okładki książek, obrys dymka, cienie włosów), klatki z błędami ≥ 200: 14 → 3 (`study_1`, `study_3` — książka;
  `dance_3` — linie ruchu w masce spodni).
- Do zrobienia dalej: linie ruchu w tańcu, sukienki w pozach siedzących/leżących (kształt spódnicy).

## Łazienka z dwóch arkuszy (2026-10-09)
- `sheet-bath1.jpg`, `sheet-bath2.jpg` (okres 6,25), 26 przedmiotów w kategorii „bathroom” (skale osobno na wpis):
  wanny (na nóżkach, zabudowana, narożna), prysznice (narożny, kabina), toaleta kompakt, bidet, umywalki (z szafką,
  wisząca), lustra (okrągłe, szafka z lustrem), pralka, waga, słupek, szafka wisząca, regał bambusowy, kosz na pranie,
  grzejnik drabinkowy, półka pod prysznic, wieszak na ręczniki, bojler, suszarka na pranie, kosz na śmieci, dywanik,
  zestaw WC, kubek z mydelniczką.
- Nowe przedmioty nie mają klatek stanów („gabi”), więc `interactionSteps` ma dla nich wersje ogólne
  (`withoutGabiFrame` — tylko gdy `itemStates` podane i bez „gabi”): toaleta — siad z telefonem (`SEAT_LIFT` 4) i
  spłukanie; prysznic — Gabi znika, efekt `rain` + para, potem turban; wanna — Gabi znika, efekt `bubbles` + para,
  turban, suszarka; umywalka — mycie rąk od tyłu z wodą. Nowe interakcje: `mirror` (pozowanie od tyłu), `laundry`
  (Gabi obok pralki, efekt `spin`), `scale` (stoi na wadze, `SEAT_LIFT` 5, myśli). Kwestie w `lines.mirror/laundry/scale`.
- Ekstraktor: `shadowBarrier` (zalewanie cienia staje na ciemnym konturze — nóżki suszarki), `dropSpecks` (okruchy).
- Arkusze animacji jeszcze do zrobienia (opcjonalne): wieszanie prania na suszarce, wchodzenie na wagę.

## Animacje łazienkowe z czterech arkuszy (2026-10-10)
- `sheet-teeth-comb.jpg` (okres 7,8, `bodyScale` 0,465): popiersia `brush_1..3` (mycie zębów) i `comb_1..3`
  (czesanie, `noHat`) — na nogach z `idle_front` (`BUSTS`, `ownScale`: popiersie w swojej skali). Pozy `bust` mają
  teraz listę klatek (`busts`, `fps`) i `at: 'under'`. Umywalki z arkuszy: mycie zębów przodem; lustra: czesanie.
- `sheet-laundry.jpg` (okres 7,8, skala 0,48): `laundry_1..3` — kuca obok pralki (zwrócona do niej), wkłada pranie.
- `sheet-bath-foam.jpg` (okres 10, skala 0,61): `gabi_foam_1..3` — Gabi w pianie (relaks, chlapanie, kaczuszka),
  klatki ucięte poziomo w pianie; poza `at: 'inside'` stawia dół klatki na przednim brzegu wanny (`INSIDE_SPOTS`:
  `dx` niecki odbijane z wanną, `headDx` głowy od środka piany, `lift`).
- `sheet-shower-glass.jpg` (okres 10, skala 0,41): `gabi_shower_1..3` — za szybą (rozmyta, śpiew, machanie); tło
  panelu (gradient i deszcz) zdjęte nową opcją ekstraktora `bgHsv` (zakres barw tła zalewany od brzegu,
  `bgHsvHole` — zamknięte dziury); w kabinie z kryciem `glass` 0,8 i deszczem na wierzchu.
- Kwestie: `teeth`, `duck`, `showerSing`. Piana i prysznic są wykluczone z masek szafy (bez ubrania i ozdoby głowy).

## Meble kuchenne z dwóch arkuszy (2026-10-10)
- `sheet-kitchen2.jpg`, `sheet-kitchen3.jpg` (oryginały 2400×1792, okres 7,5; skale na wpis wg prawdziwych
  rozmiarów: blaty ~32 px, lodówka 54, wysoka szafka 60), 30 przedmiotów w kategorii „kitchen”.
- Podłoga: kuchenka gazowa, płyta indukcyjna z piekarnikiem (gotowanie), lodówka z zamrażarką, zmywarka, szafka
  narożna, szafka ze zlewem, szafka z szufladami, wysoka szafka, stół z krzesłami (kawa przy stole), hoker
  (siedzisko, `SEAT_LIFT` 9), stolik na kółkach, kredens, wyspa, regał na wino, kosz.
- Ściana (drobne AGD stawiane na blatach — warstwa ścienna rysuje się pod meblami, więc stoją przy ścianie):
  mikrofalówka, toster, blender, mikser (gotowanie), ekspres i czajnik (nowa interakcja `brew`: od tyłu, para,
  potem serduszka; +2 energii), okap, szafka z witryną, półki, stojak na przyprawy, chlebak, noże, ociekacz,
  ręcznik papierowy, zioła (podlewanie).
- Nowa interakcja `dishes` (zlew, zmywarka): zmywanie od tyłu z wodą. Cienie pod stołem, hokerem i stolikiem —
  `shadowHsv` (cień ma odcień 210–240°, metal krzeseł ~180°).
- Dojście do przedmiotu liczy plan z klatkami stanów przedmiotu (`itemStates`) — do umywalki z arkusza Gabi idzie
  na środek (popiersie pod umywalką), nie obok.

## Aktualizacje i kopia zapisu (2026-10-10)
- Instrukcja wydawania wersji i zasady zgodności zapisów: `docs/AKTUALIZACJE.md`.
- `src/core/changelog.ts` (`RELEASES`, `APP_VERSION`) + okno „Co nowego?” po aktualizacji (`src/ui/whatsNew.ts`,
  klucz `gabigochi.seenVersion`; pierwsze uruchomienie — bez okna).
- Profil → Kopia zapisu (`src/ui/saveBackup.ts`, `src/core/saveTransfer.ts`): plik `.json` przez menu
  udostępniania (telefon) albo pobranie (komputer); wczytanie przez te same migracje co zapis, obecny zapis do
  `gabigochi.save_backup`, kopia z nowszej wersji odrzucona.
- `tests/core/saveCompat.test.ts` + zamrożony `tests/fixtures/save-v2-2026-10-10.json` (wszystkie przedmioty,
  ubrania, wyglądy, jedzenie, rekordy) — każda przyszła wersja musi go wczytać bez strat.

## Więcej dźwięków (2026-10-10)
- `src/ui/sound.ts`: ~25 nowych efektów (syntezowanych, bez plików) + `MIN_GAP` (najmniejszy odstęp powtórzeń —
  dziesiątki kulek w cegiełkach nie trzeszczą) + `step(surface)`.
- Kroki Gabi przy postawieniu stopy (klatki `walk_a1`, `walk_a3`), brzmienie wg podłogi pokoju (deski, płytki,
  dywan) albo dywanu pod stopami; lądowanie po upuszczeniu; lampka (klik), spłukiwanie, ekspres (bulgotanie).
- Klatki póz z dźwiękiem (`POSE_SFX` w `room.ts`): szczoteczka, szczotka do włosów, pranie, chlapanie w wannie,
  kaczuszka, śpiew pod prysznicem.
- Minigry: cegiełki (strzał, odbicie, rozbity klocek, bonus, runda), memory (karta, para, „nie”), sudoku
  (wybór pola, cyfra, notatka, gumka, powtórka, zamknięta linia/blok), szyfrokrzyżówka (klawisz, gumka,
  podpowiedź, powtórzona litera, wygrana), świeczki (zapalenie, finał), łapanie (KitKat), kot w pudełkach
  (wychylenie, pudło); nowy rekord — fanfara, „Odbierz” — monety.

## Nowości w sklepie, nawyki Gabi, urodziny (2026-10-10)
- Znaczek „NOWE”: pole `items` we wpisach `RELEASES` → po aktualizacji lista w `gabigochi.newItems`
  (`src/core/newItems.ts`), znaczki na kartach sklepu (meble, tapety, jedzenie) i szafy, kropki na zakładkach
  i kategoriach (`src/ui/newMarks.ts`); obejrzane znikają po wyjściu z ekranu. Pierwsza wersja nie ma `items`.
- Nawyki (`src/home/routines.ts`, `ROUTINES`): przy samodzielnym zajęciu (co 1–2 min) z szansą 40% Gabi sama
  używa sprzętu z pokoju o jego porze — kawa 6–11, zęby 6–10 i 20–24, lustro, prysznic, kąpiel wieczorem, pranie
  10–18, zmywanie; przy jednym meblu nie częściej niż przerwa nagrody (godzina).
- Urodziny 12 października (`content.birthday`, rok 2000 → wiek z daty): raz w roku 1000 monet
  (`CONFIG.coins.birthdayGift`, pole zapisu `lastBirthdayGift` — rok), okno z życzeniami, fanfara i konfetti
  (`src/ui/birthdayGift.ts`, sprawdzane przy starcie i co 10 s, gdy nie ma ekranu powitalnego, minigry ani okna);
  przez cały dzień połowa luźnych tekstów to `lines.birthdayToday`.
