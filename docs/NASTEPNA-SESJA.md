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

## Do sprawdzenia przy następnej okazji (w przeglądarce)
- prysznic i wanna (kupić w sklepie → postawić w łazience → stuknąć), wieszak z ręcznikiem przy umywalce;
- złożone pozy turban/suszarka (popiersie + nogi z `idle_front`) — czy wyglądają naturalnie;
- szydełko na pufie w salonie, auto-start zajęć w różnych pokojach.

## Do decyzji użytkownika
- treść życzeń w `src/content.ts`;
- zgoda na publiczny link (GitHub Pages; workflow gotowy w `.github/workflows/deploy.yml`, gałąź `main`).

## Uwagi techniczne
- Python do narzędzi: `/c/gvenv/Scripts/python` (venv w repo nie działa przez długie ścieżki).
- Paleta zamrożona w `tools/palette.json`; nowe arkusze: `--extend-palette K <arkusz>` (stare PNG bez zmian).
- W podglądzie trzymaj tylko jedną kartę z grą — dwie nadpisują sobie zapis.
- W trybie deweloperskim `window.__room` pokazuje stan pokoju (mózg, droga, zajęcie, interakcja) — pomocne przy testach.
