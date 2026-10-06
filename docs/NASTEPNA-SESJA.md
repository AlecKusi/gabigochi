# Gdzie skończyliśmy (2026-10-06)

## Stan gałęzi
- `etap-1` — **działająca wersja** (269 testów, build OK): 4 pokoje (salon, sypialnia, pracownia, łazienka), tapety/podłogi, meble z magazynem i trybem „Urządzaj”, sklep z zakładką „Meble”, łazienka wycięta (przedmioty + klatki animacji), zajęcia, animacje stanów, przeciąganie, sen w łóżku.
- `wip/interakcje` — **niedokończone** Task 6 planu `docs/superpowers/plans/2026-10-06-mieszkanie.md` (+ sekcja „Uzupełnienia”): interakcje z meblami, łazienka w akcji, rośliny, zajęcia w wyznaczonych miejscach. Agent przerwany limitem; `npx tsc --noEmit` **nie przechodzi**.

## Co jest na `wip/interakcje` (częściowo)
- `src/home/activitySpots.ts` — reguły miejsc zajęć (nauka przy biurku, szydełko na siedzisku, praktyka w pracowni, muzyka w salonie).
- `src/home/interactionPlan.ts` — sekwencje interakcji (łazienka itd.).
- `src/ui/home/interactions.ts` — odtwarzacz interakcji.
- `src/ui/home/bustPose.ts` — składanie popiersi (turban, suszarka) z nogami z `idle_front`.
- zmiany w: `room.ts`, `roomRenderer.ts`, `scene.ts`, `activityPlayer.ts`, `activitiesSheet.ts`, `plants.ts`, `content.ts`, `components.css`.

## Następne kroki
1. `git checkout wip/interakcje`, przejrzeć diff względem `etap-1`, dokończyć Task 6 (aż `tsc`/testy/build przejdą), dopisać testy czystych modułów (`activitySpots`, `interactionPlan`).
2. Weryfikacja w przeglądarce (Task 7): każda interakcja, łazienka, podlewanie, zajęcia w miejscach, panel „Zajęcia” z wyszarzeniem.
3. Scalić do `etap-1`.
4. Do decyzji użytkownika: treść życzeń w `src/content.ts`, zgoda na publiczny link (GitHub Pages).

## Uwagi techniczne
- Python do narzędzi: `/c/gvenv/Scripts/python` (venv w repo nie działa przez długie ścieżki).
- Paleta jest zamrożona w `tools/palette.json`; nowe arkusze rozszerzają ją `--extend-palette K <arkusz>` (stare PNG bez zmian).
- W podglądzie trzymaj tylko jedną kartę z grą — dwie nadpisują sobie zapis.
