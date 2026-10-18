# Pory roku i pogoda — projekt

Data: 2026-10-18. Zapowiedziane w „Co nowego?” wersji 2 („…dodać pory roku…”). Gra zmienia się z porą roku
i pogodą: balkon dostaje namalowane tła na każdą porę roku (dzień i noc), na wierzchu pogoda i animacje, w oknach
pokoi widać opady, Gabi mówi o pogodzie, a w sklepie pojawiają się ozdoby sezonowe.

## Decyzje

| Pytanie | Wybór |
| --- | --- |
| Co zmieniają pory roku | widok na balkonie i za oknami, kwestie Gabi i o Somerce, ozdoby sezonowe w sklepie (święta — później) |
| Pora roku | z daty telefonu, miesiącami: wiosna III–V, lato VI–VIII, jesień IX–XI, zima XII–II |
| Pogoda | losowa na każdy dzień (z daty), pasująca do pory roku; cały dzień ta sama |
| Długość dnia | zależna od pory roku (tylko wygląd) |
| Tła balkonu | 8 obrazków od użytkownika (4 pory × dzień/noc), animacje w kodzie |
| Podłoga balkonu | z obrazka (śnieg, liście, płatki); wybór podłogi na balkonie znika |
| Okna w pokojach | opady na szybie + odcień pogody; namalowany widok bez zmian |
| Ozdoby sezonowe | do kupienia tylko w swojej porze roku, kupione zostają na zawsze |
| Etapy | 1: tła, pogoda, długość dnia, okna, kwestie (wersja 3); 2: ozdoby sezonowe z 3 arkuszy (wersja 4) |

## Etap 1

### Logika: `src/home/season.ts` (czyste funkcje)

- `seasonOf(d: Date): Season` — `'spring' | 'summer' | 'autumn' | 'winter'` wg miesiąca.
- Pora dnia zależna od pory roku (zastępuje stałe progi w `dayPhase`; `dayPhase(d)` liczy porę roku z tej samej
  daty, więc wywołania się nie zmieniają):

  | | rano | dzień | wieczór | noc |
  |---|---|---|---|---|
  | zima | 7:00–9:00 | 9:00–15:30 | 15:30–17:00 | 17:00–7:00 |
  | wiosna, jesień | 6–10 | 10–18 | 18–21 | 21–6 |
  | lato | 5–9 | 9–20 | 20–22 | 22–5 |

  Zmienia tylko wygląd (niebo, okna, poświata, zegar ścienny, kwestie zegara). Sen Gabi, potrzeby i `isNightHour`
  w `room.ts` bez zmian. Postęp wieczoru `eveningProgress(d)` (0–1) służy do przejścia tła dzień → noc.
- `weatherOf(d: Date): Weather` — `'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'frost'`; ziarno z daty
  (RRRR-MM-DD, ten sam dzień = ta sama pogoda na każdym urządzeniu), losowanie wg tabeli:

  | | słońce | pochmurno | deszcz | burza | śnieg | mróz i słońce |
  |---|---|---|---|---|---|---|
  | wiosna | 45% | 25% | 30% | — | — | — |
  | lato | 60% | 15% | 10% | 15% | — | — |
  | jesień | 35% | 25% | 40% | — | — | — |
  | zima | — | 25% | — | — | 40% | 35% |

- Nazwy do wyświetlania: `SEASON_NAMES` („Wiosna”…), `WEATHER_NAMES` („słonecznie”, „pochmurno”, „deszczowo”,
  „burza”, „śnieg”, „mróz”).
- Podgląd przy tworzeniu gry (tylko `npm run dev`, jak `?godzina=`): `?pora=wiosna|lato|jesien|zima`
  i `?pogoda=slonce|pochmurno|deszcz|burza|snieg|mroz` — nadpisują porę roku i pogodę.
- Bez zmian w zapisie gry: pora roku i pogoda zawsze liczą się z daty.

### Tła balkonu

Źródła: `assets/source/bg-{wiosna,lato,jesien,zima}-{dzien,noc}.jpg` (od użytkownika; 1792×2400, lato dzień
765×1024 — proporcje 0,747).

Narzędzie `tools/make_backgrounds.py` (u twórcy, wynik w repozytorium):
- skalowanie do 128×160 px gry: każda komórka siatki = mediana środka komórki (bez krawędzi, które w JPG są
  rozmyte); proporcje 0,747 → 0,8 przez lekkie spłaszczenie w pionie (~7%), żeby zostały daszek i podłoga;
- kolory bez ostrej kwantyzacji (słońce ma zostać żółte — w próbie 96 kolorów zszarzało);
- poprawka „jesień dzień”: szary pas na dole obrazka zastąpiony powieleniem ostatnich rzędów podłogi;
- wynik: `public/backgrounds/{spring,summer,autumn,winter}-{day,night}.png` i podgląd wszystkich
  `tools/out/backgrounds_preview.png`;
- mała różnica położenia balustrady w „jesień dzień” jest akceptowana (widać ją tylko przy zmianie dzień ↔ noc).

Rysowanie (`src/pet/room.ts` + renderer pokoju):
- rano — tło dzienne + różowy odcień poranka; dzień — tło dzienne; wieczór — tło dzienne przechodzi w nocne wg
  `eveningProgress` (przezroczystość nocnego) + pomarańczowy odcień; noc — tło nocne;
- obrazek zawiera niebo, słońce/księżyc, chmury, miasto, drzewa, balustradę, podłogę i doniczki w rogach —
  dotychczasowe rysowane niebo, miasto, chmury, słońce, księżyc, balustrada i podłoga balkonu znikają;
- warstwa pogody i animacji rysowana między tłem a przedmiotami, opady tylko nad linią podłogi (pod daszkiem nie
  pada); zostają klucze ptaków (pogodny dzień) i spadające gwiazdy (pogodna noc);
- pogoda:
  - pochmurno — tło lekko poszarzałe;
  - deszcz — ukośne krople, ciemniejsze tło, chlapanie kropel na balustradzie/podłodze przy krawędzi;
  - burza — ulewa, co kilka sekund błysk nieba i cichy grzmot (nowy efekt `thunder` w `src/ui/sound.ts`, tylko
    gdy widać balkon, najwyżej co kilka sekund);
  - śnieg — płatki 1–2 px, różna prędkość, kołysanie;
  - mróz — bez opadów, czasem pojedynczy płatek;
- pory roku: wiosna — różowe płatki (słońce); lato — motyle w dzień (słońce), świetliki w nocy; jesień — liście
  (słońce, pochmurno); nocą migoczą pojedyncze gwiazdy;
- wszystko deterministyczne od czasu animacji (jak dzisiejsze `balconySky.ts`); przy `prefers-reduced-motion`
  opady i drobinki stoją w miejscu (stały wzór), a błyski burzy są wyłączone;
- podłoga: balkon ignoruje wybraną podłogę; w panelu urządzania na balkonie znika zakładka „Podłoga” (jak dziś
  „Tapeta”); wybór zostaje w zapisie.

### Okna w pokojach

- Szyba okna wykrywana automatycznie: piksele sprite'a okna w kolorach nieba (niebieskie/jasne) → maska
  (liczona raz na sprite, w pamięci); działa dla wszystkich okien i drzwi balkonowych, także przyszłych.
- Na szybie (przycięte do maski): śnieg, deszcz, liście (jesień), płatki (wiosna).
- Odcień szyby wg pogody: pochmurno i deszcz — szarawy, burza — szarawy z krótkimi błyskami; łączy się
  z dzisiejszymi odcieniami poranka/wieczoru/nocy.
- Namalowany widok w oknach bez zmian.

### Górny pasek

Obok godziny ikonka pogody (nowe ikonki pixel art w `src/art/icons.ts`: słońce, chmura, deszcz, burza, śnieg,
mróz). Dotknięcie — dymek np. „Dzień · 13:04 · Jesień, deszczowo”; etykieta dostępności z porą roku i pogodą.

### Kwestie (`src/content.ts`)

Nowe grupy kwestii; `{kot}` — imię kota:
- pora roku:
  - wiosna: „Wiosna! Wszystko kwitnie!”, „Pachnie wiosną!”, „Czas na nowe kwiatki na balkonie.”
  - lato: „Ale upał!”, „Lody by się przydały…”, „Lato, wakacje, KitKat w lodówce!”
  - jesień: „Jestem jesieniarą!”, „Czas na herbatkę i kocyk.”, „Czas na pumpkin spice latte!”,
    „Pumpkin spice latte, poproszę!”, „Liście są takie kolorowe!”
  - zima: „Brr, zimno!”, „Kakao i kocyk — idealnie.”, „Ulepimy bałwanka?”
- pogoda: deszcz — „Pada i pada…”, „Kap, kap, kap…”, „Dobrze, że jestem w domu.”; burza — „Aaa! Grzmi!”;
  śnieg — „Śnieg! Wszystko białe!”; mróz — „Mróz szczypie w nos!”, „Szron na szybach!”; pochmurno — „Szaro
  dziś…”, „Chmurki zasłoniły słońce.”; słońce — dotychczasowe „Ładna pogoda!”, „Ale słoneczko!”
- o Somerce: śnieg — „{kot} chce łapać płatki za szybą!”; deszcz — „{kot} patrzy na krople na szybie.”; burza —
  „{kot} chowa się pod łóżkiem!”; lato — „{kot} wygrzewa się w słoneczku.”; jesień — „{kot} poluje na liście!”;
  wiosna — „{kot} kicha od kwiatków!”

Kiedy:
- przy oknie (interakcja `window`, w dzień) — kwestie pogody zamiast stałego „Ładna pogoda!” (nocą bez zmian:
  gwiazdy, księżyc; przy śniegu nocą — kwestie śniegu);
- losowe pogawędki — mniej więcej co trzecia kwestia z pory roku / pogody / o Somerce (o Somerce tylko gdy kot jest);
- powitanie po otwarciu gry — czasem kwestia pogody zamiast „Cześć!”.

### Wydanie etapu 1

- `RELEASES` wersja 3: „Pory roku i pogoda: balkon zmienia się z porą roku, pada deszcz i śnieg.” oraz
  „Gabi mówi o pogodzie, a w oknach widać deszcz, śnieg i liście.”; zapowiedź („W planach”) — ozdoby sezonowe
  w sklepie.
- Przed wydaniem animacje pokazane użytkownikowi (podgląd), wypchnięcie tylko za zgodą.

## Etap 2: ozdoby sezonowe

Arkusze od użytkownika (2026-10-18), wycinanie jak dotychczas (`tools/frames.json`, `tools/extract_sprites.py`):
- `assets/source/sheet-seasonal.jpg` — ozdoby z promptu B (1024×765);
- `assets/source/sheet-autumn1.jpg` („Przedmioty i ozdoby jesienne”) i `assets/source/sheet-autumn2.jpg`
  („Więcej przedmiotów i ozdób jesiennych”) — dodatkowe jesienne od użytkownika (po 1024×765).

Ozdoby z promptu B (w arkuszu choinka zgaszona i zapalona to ta sama choinka — klatki „wyłączona/włączona”;
„Choinka B” to inne drzewko, więc jest osobną rzeczą):

| id | nazwa | pora | warstwa / kategoria | interakcja | cena |
| --- | --- | --- | --- | --- | --- |
| pumpkin | Dynia z buźką | jesień | podłoga / decor | lampka (klatka świecąca) | 60 |
| apple_basket | Kosz jabłek | jesień | podłoga / decor | — | 50 |
| leaf_garland | Girlanda z liści | jesień | ściana / decor | — | 70 |
| xmas_tree | Choinka z lampkami | zima | podłoga / decor | lampka (klatka zapalona; lampki migają w kodzie) | 250 |
| xmas_tree_blue | Choinka z niebieskimi lampkami | zima | podłoga / decor | lampka (świeci; lampki migają w kodzie) | 230 |
| snowman | Bałwanek | zima | podłoga / balcony | „Słodziak!” (`cute`) | 90 |
| poinsettia | Gwiazda betlejemska | zima | podłoga / plant | podlewanie | 80 |
| catkins | Bazie w wazonie | wiosna | podłoga / decor | — | 50 |
| egg_basket | Koszyczek z pisankami | wiosna | podłoga / decor | — | 60 |
| birdhouse | Budka dla ptaków | wiosna | podłoga / balcony | — | 90 |
| fan | Wiatrak | lato | podłoga / furniture | włącz/wyłącz (śmigło: 3 klatki) | 120 |
| paddling_pool | Dmuchany basenik | lato | podłoga / balcony | — | 150 |
| flamingo | Dmuchany flaming | lato | podłoga / balcony | „Słodziak!” (`cute`) | 80 |
| watermelon | Arbuz na talerzu | lato | podłoga / decor | — | 40 |

Dodatkowe jesienne z arkuszy użytkownika — wszystkie bez powtórek (pominięte: dwie kolejne girlandy z liści,
dwa dyniowe lampiony — jest już „Dynia z buźką” — i „Stroik jesienny”, bo jest „Wianek jesienny”). Wszystkie
kupowane tylko jesienią; ceny 20–300 (małe dynie najtaniej, kominek najdrożej), dokładne w planie:

| arkusz | rzeczy | interakcja |
| --- | --- | --- |
| autumn1 | Dynia, Dynia ozdobna, Dynia olbrzymia, Zestaw dyń, Kosz zbiorów, Kosz z szyszkami, Kukurydza (snopek), Strach na wróble | — |
| autumn1 | Świeca w słoiku, Lampion jesienny, Kominek z dyniami | lampka; płomień migocze w kodzie |
| autumn1 | Wrzosy w doniczce (jeden z dwóch wariantów) | podlewanie |
| autumn2 | Dynia piżmowa, Patison, Kosz z kolbami kukurydzy, Zbiory warzyw, Słomiany chochoł, Kostki słomy i dynie, Jesienny kącik (słoma, chryzantemy, lampiony), Jesienny drogowskaz, Kosz z liśćmi | — |
| autumn2 | Wianek jesienny (z kokardą; ściana) | — |
| autumn2 | Ławka z kocem i poduszkami | jak ławka balkonowa (Gabi siada, jeśli ławka balkonowa to ma) |
| autumn2 | Jesienne palenisko (balkon) | lampka; płomień migocze w kodzie |
| autumn2 | Chryzantemy w garnku | podlewanie |

- Pole `season` w metadanych przedmiotu (`frames.json` → `items.generated.json` → `ItemDef.season`).
- Sklep: rzecz sezonowa widoczna tylko w swojej porze roku, ze znaczkiem „Tylko jesienią” (zimą, wiosną, latem);
  kupiona zostaje na zawsze (magazyn, stawianie bez ograniczeń).
- Świecenie i ruch: dynie, choinki, świeca, lampion, kominek i palenisko działają jak lampki (włączanie
  dotknięciem; włączone nie ciemnieją w nocy); zapalona dynia i choinka — klatka świecąca; lampki choinek migają,
  a płomienie migoczą w kodzie (jasne piksele lampek/płomienia pulsują); wiatrak — włączony kręci się
  (klatki 1–3). Nowy mechanizm: klatki stanu „włączony” i animacja „włączony” dla przedmiotów typu lampka.
- `RELEASES` wersja 4 z `items` (znaczek „NOWE”).

## Testy

- `season.ts`: pora roku z daty (granice miesięcy), progi pory dnia w każdej porze roku, `eveningProgress`,
  pogoda — ta sama przez cały dzień, tylko pogody z tabeli danej pory roku, rozkład na ~4000 dni zgodny
  z tabelą (±5 pkt proc.), podgląd z parametrów.
- Tła: narzędzie samo sprawdza wymiary 128×160; test gry sprawdza, że w `public/backgrounds/` jest wszystkie 8 plików
  (`import.meta.glob`), czyli każda pora roku ma dzień i noc.
- Kwestie: przy oknie w deszcz nie pada „Ładna pogoda!”; `{kot}` podstawiany; kwestie o Somerce tylko z kotem.
- Maska szyby: dla każdego okna z katalogu niepusta i mniejsza niż cały sprite.
- Zgodność zapisu: `tests/fixtures/save-v2-2026-10-10.json` wczytuje się bez zmian.
- Etap 2: dostępność w sklepie wg pory roku, kupione poza sezonem zostają w magazynie.
- W przeglądarce (telefon 375×812): każda pora roku × każda pogoda przez `?pora=&pogoda=`, rano/wieczór/noc
  przez `?godzina=`, okna w pokojach, brak błędów w konsoli; podgląd animacji dla użytkownika.

## Poza zakresem

Święta (Halloween, Boże Narodzenie, Sylwester, Walentynki), nowe animacje Somerki, sezonowe wersje obrazków okien,
sezonowe ubrania, dźwięk deszczu w tle (jest tylko grzmot przy burzy), zmiana snu i potrzeb Gabi wg pory roku.
