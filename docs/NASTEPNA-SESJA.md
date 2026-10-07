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

