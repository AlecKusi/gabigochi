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

## Następne większe kroki (z pierwotnego planu, etap 2)
- Minigry: Bricks n Balls, Sudoku, Szyfrokrzyżówki (słowa osobiste od użytkownika).
- Szafa: sukienki i czapki (stroje na postaci).

## Do decyzji użytkownika
- treść życzeń w `src/content.ts`;
- zgoda na publiczny link (GitHub Pages; workflow gotowy w `.github/workflows/deploy.yml`, gałąź `main`).

## Uwagi techniczne
- Python do narzędzi: `/c/gvenv/Scripts/python` (venv w repo nie działa przez długie ścieżki).
- Paleta zamrożona w `tools/palette.json`; nowe arkusze: `--extend-palette K <arkusz>` (stare PNG bez zmian).
- W podglądzie trzymaj tylko jedną kartę z grą — dwie nadpisują sobie zapis.
- W trybie deweloperskim `window.__room` pokazuje stan pokoju (mózg, droga, zajęcie, interakcja) — pomocne przy testach.
