# Gabigochi — nowe animacje stanów, przeciąganie, sen w łóżku — projekt

Data: 2026-10-06 · Status: zatwierdzony w rozmowie

## 1. Materiał

Trzy nowe arkusze od użytkownika (zapisane w `assets/source/`):

| Plik | Zawartość |
|---|---|
| `sheet-status.jpg` | Zmęczenie 1–5, Głód 1–5, Wesoła, Zła, Smutna, Przestraszona, Zwariowana + portrety (zmęczona, głodna z pizzą, 3× zwariowana) |
| `sheet-drag.jpg` | Przeciąganie palcem 1–5 (z narysowaną dłonią) + portret „zawrót głowy” |
| `sheet-bed.jpg` | Sen w łóżku z kotem: 1, 2, 3, 3 (bez kota), 4, 5 |

Pomiary: wszystkie trzy mają siatkę pikseli ≈ 7,8 px (tło RGB ≈ 207,206,211). Stojąca postać ≈ 60 natywnych px (obecne idle ≈ 55) — podobna skala. Efekty (zz, dymki, serca, gwiazdki, łzy, znak złości) są osobnymi kształtami obok postaci i mają zostać zachowane. Cyfry „1.”, „2.” i napisy (RUMBLE!, GURR!, podpisy) — usunięte. Arkusz statusów nie ma torby (drobna niespójność, akceptowana).

## 2. Wycinanie (rozszerzenie `tools/extract_sprites.py`)

- Arkusze w `tools/frames.json` → sekcja `sheets` (ścieżka, tło, `gridPeriod`, sposób skali, kotwica).
- Wpis klatki może mieć:
  - `rect` — prostokąt w px arkusza; **zachowywane są wszystkie kształty w prostokącie** (postać + efekty), nie tylko największy;
  - `erase` — lista prostokątów lub wielokątów (px arkusza) wymazywanych do przezroczystości: cyfry, napisy, **narysowana dłoń w przeciąganiu**, „duch kota” w łóżku 1, obrazek-portret nachodzący na łóżko 2.
- Metadane klatki: `w`, `h`, `anchorX`, **`foot`** (wiersz stóp mierzony na największym kształcie, nie na cieniu/efektach), `scale`.
- Skala: obecny arkusz bez zmian (mediana grupy). Nowe arkusze: jedna skala na arkusz = `displayHeight / wysokość ciała klatki referencyjnej` (stojąca postać); łóżko używa skali arkusza statusów (ta sama skala rysunku).
- Kotwica: głowa (jak dotąd) albo `center` (łóżko).
- Dłoń w przeciąganiu usuwana ręcznie wyznaczonymi maskami; ewentualne ślady na włosach — retusz maską.

## 3. Animacje (manifest)

Nowa możliwość: `intro` — klatki odtwarzane raz, potem pętla `frames`.

| Animacja | Klatki |
|---|---|
| `tired` | pętla zmęczenie 1→2→3 (wolno) |
| `exhausted` | intro zmęczenie 4, pętla 5 |
| `hungry` | pętla głód 1→2→3 (wolno) — zastępuje dymek z jabłkiem |
| `starving` | intro głód 4, pętla 5 |
| `sad` | smutna — zastępuje chmurkę |
| `happy` | wesoła (skok; zastępuje obecny „jump”→wave) |
| `angry`, `scared`, `crazy` | pojedyncze klatki |
| `drag_pick`, `drag_dangle`, `drag_panic` | przeciąganie 1 / 2↔3↔5 / 4 |
| `sleep` | intro łóżko 1→2→3, pętla 4↔5 (zzz w grafice — bez naszych cząstek „Z”) |
| `wake` | łóżko 1 |

## 4. Zachowanie

**Priorytet animacji:** sen > trzymanie palcem / spadanie > emocja czasowa (zła, przestraszona, wesoła, zwariowana, jedzenie, machanie, mówienie) > bardzo głodna (głód < 10) > bardzo zmęczona (energia < 8) > głodna (< 25) > zmęczona (< 20) > smutna (humor < 30) > chód > spoczynek.

**Emocje:**
- Wesoła — po KitKacie, głaskaniu, wygranej; czasem sama przy humorze 100.
- Zła — 5 stuknięć w postać w ciągu 3 s (wtedy bez bonusu humoru); ~2 s.
- Przestraszona — upuszczona z wysokości > 40 px logicznych; ~1,8 s.
- Zwariowana — 3 zjedzone KitKaty w ciągu 10 min; ~2,5 s.
Każda z dymkiem (nowe kwestie w `content.ts`).

**Przeciąganie:** stuknięcie bez ruchu = głaskanie (jak dziś). Ruch > 6 px od dotknięcia postaci = złapanie: 200 ms `drag_pick`, potem postać wisi głową pod palcem (`drag_dangle`; przy prędkości palca > 120 px log./s `drag_panic`). Puszczenie → spadanie z grawitacją na podłogę + jedno małe odbicie; lądowanie z wysokości > 40 → przestraszona, inaczej wesoła. Pozycja X ograniczona do granic pokoju. Bez wpływu na statystyki.

**Sen w łóżku:** zgaszenie światła → scena łóżka na środku pokoju (zamiast chodzącej postaci); pobudka → klatka `wake` ~1 s, potem Gabi stoi przy łóżku i macha. Łóżko widoczne tylko w nocy.

**Mina w nagłówku:** avatar = portret stanu: zmęczona (tired/exhausted), głodna z pizzą (hungry/starving), zwariowana (cyklicznie 3 miny), zawrót głowy (przestraszona); inaczej obecny portret.

## 5. Testy

Czyste funkcje z testami: `intro` w resolveAnimation/frameAt, wybór animacji stanu z potrzeb, priorytety animationName, licznik stuknięć (złość), licznik KitKatów (szał), fizyka spadania i decyzja przestraszona/wesoła, pozycjonowanie sprite'a ze `foot`. Wycinanie — kontrola wzrokowa podglądu (`tools/out/preview.png`). Całość — przejście scenariuszy w przeglądarce.
