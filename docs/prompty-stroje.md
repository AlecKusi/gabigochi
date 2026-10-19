# Stroje z arkuszy — jak generować arkusze

Strój Gabi to **oryginalne arkusze animacji z gry narysowane jeszcze raz z Gabi w tym stroju**. Układ, pozy,
rekwizyty, podpisy i tło muszą zostać takie same jak w oryginale, bo gra wycina klatki z tych samych miejsc.

## Co załączyć do generatora
1. **Oryginalny arkusz z gry** (z `assets/source/…`, tabela niżej) — szablon układu.
2. **Główny arkusz stroju** (`assets/source/stroje/<strój>/main.jpg`) — wzór, jak Gabi wygląda w tym stroju.

## Opis (do skopiowania)
> Przerysuj pierwszy obrazek (arkusz postaci w pixel arcie) bez żadnych zmian w układzie: te same pozycje postaci,
> te same pozy, ta sama wielkość, te same rekwizyty (np. kubek, telefon, kanapka, kot, ukulele, mikrofon), te same
> podpisy i to samo jednolite szare tło. Zmień tylko ubranie Gabi na strój z drugiego obrazka (<krótki opis
> stroju, np. „czarno-czerwona gotycka lolita z falbanami, bufkami i sznurowanym gorsetem, czarne rajstopy,
> czarne buty”). Bez torby na ramieniu. Włosy, okulary, twarz i proporcje jak na pierwszym obrazku. Ten sam
> strój na każdej klatce.

## Arkusze do wygenerowania
Plik zapisz jako `assets/source/stroje/<strój>/<klucz>.jpg`.

| Klucz | Oryginał (szablon) | Co tam jest |
|---|---|---|
| `main` | `sprite-sheet.jpg` | stanie, chodzenie, machanie, jedzenie (kanapka!), rozmowa, portrety |
| `turnaround` | `sheet-turnaround.jpg` | obrót (przód, boki, tył) i pozy |
| `back` | `sheet-back.jpg` | od tyłu: okno, TV, konsola |
| `status` | `sheet-status.jpg` | zmęczenie, głód, radość, złość, płacz, strach |
| `expressions` | `sheet-expressions.jpg` | ziewanie, przeciąganie, myślenie, śmiech, taniec |
| `sitting` | `sheet-sitting.jpg` | siedzenie: spoczynek, telefon, herbata |
| `table` | `sheet-table.jpg` | przy stole: kawa, ciasto, KitKat |
| `lying` | `sheet-lying.jpg` | leżenie: drzemka, czytanie, telefon |
| `hobby` | `sheet-hobby.jpg` | telefon, szydełko, słuchawki |
| `nursing` | `sheet-nursing.jpg` | tylko nauka przy biurku się liczy (opieka nad chorą jest w innym stroju) |
| `cat` | `sheet-cat.jpg` | głaskanie i przytulanie kotka |
| `drink` | `sheet-drink.jpg` | picie |
| `drag` | `sheet-drag.jpg` | podnoszenie Gabi (dyndanie) |
| `plants2` | `sheet-plants2.jpg` | podlewanie i pielęgnacja kwiatów |
| `karaoke` | `sheet-karaoke.jpg` | karaoke |
| `ukulele` | `sheet-ukulele.jpg` | ukulele |
| `teethcomb` | `sheet-teeth-comb.jpg` | mycie zębów, czesanie |
| `laundry` | `sheet-laundry.jpg` | pranie |
| `birthday` | `sheet-birthday.jpg` | urodziny (tort, prezent, balony) |

Nie trzeba: `bed` (piżama), `bathroom` (ręcznik), `bath-foam`, `shower-glass` (piana, prysznic).

## Po dodaniu arkusza
1. Dopisz klucz w `tools/frames.json` → `outfits.<strój>.sheets`, np. `"sitting": {}`.
2. `/c/gvenv/Scripts/python tools/extract_outfits.py`
3. Obejrzyj `tools/out/stroj_<strój>_<klucz>.png` (u góry oryginał, pod spodem strój). Klatka, której wysokość
   różni się od oryginału o więcej niż 15%, jest pomijana (w grze zostaje przemalowanie) — wtedy zwykle pomaga
   ponowne wygenerowanie arkusza. Klatkę, która wyszła źle (np. zgubiony rekwizyt), dopisz do `skip`.

Nadpisania arkusza w `sheets.<klucz>`: `background` (kolor tła; domyślnie wykrywany z rogu), `gridPeriod`,
`pad` (zapas wokół klatki ciała, domyślnie 10 px), `portraitPad` (zapas wokół portretu, domyślnie 2 px).
