# Pory roku — etap 2: ozdoby sezonowe — plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 39 ozdób sezonowych (14 z arkusza ozdób + 25 jesiennych) w sklepie tylko w swojej porze roku, kupione zostają na zawsze; świecące dynie, choinki, świeca, lampion, kominek i palenisko, kręcący się wiatrak; wydanie razem z etapem 1 jako wersja 3.

**Architecture:** Sprite'y wycina istniejące narzędzie `tools/extract_sprites.py` z trzech nowych arkuszy (konfiguracja w `tools/frames.json`, nowe pole katalogu `season`). Katalog (`src/home/catalog.ts`) dostaje `ItemDef.season` i interakcję `switch`; sklep filtruje po porze roku (`shopItems(category, season)`); czysty moduł `src/home/lamps.ts` wybiera klatkę włączonego przedmiotu (zapalona dynia/choinka, śmigło wiatraka) i siłę poświaty (migotanie płomieni, mruganie choinek), a renderer pokoju go używa.

**Tech Stack:** Vite + TypeScript + Vitest (`environment: 'node'`), Python 3 (`/c/gvenv/Scripts/python`, Pillow + numpy) dla wycinania.

**Spec:** `docs/superpowers/specs/2026-10-18-pory-roku-design.md` (etap 2). Etap 1 (pory roku i pogoda) jest już zrobiony na `etap-1` i niewydany — wydanie obu etapów razem jako wersja 3.

**Repozytorium:** `C:\Users\Al8c\Documents\gabigochi`, gałąź `etap-1`. Commity na `etap-1`, **bez wypychania** (wypchnięcie tylko w Task 4, za zgodą użytkownika). Testy: `npx vitest run`, typy: `npx tsc --noEmit -p .`, build: `npm run build`. Pliki LF (ostrzeżenia git o CRLF są nieszkodliwe).

---

## Struktura plików

| Plik | Odpowiedzialność |
| --- | --- |
| `tools/frames.json` | 6 aliasów arkuszy (3 obrazki × siatka 6,4 px i 3,2 px), 43 wpisy przedmiotów (39 rzeczy + 4 klatki stanów) |
| `tools/extract_sprites.py` | opcjonalne pole katalogu `season` |
| `tools/palette.json` | +24 kolory dla nowych arkuszy (`--extend-palette`) |
| `public/items/*.png`, `src/home/items.generated.json` | wynik wycinania |
| `src/home/catalog.ts` | `ItemDef.season`, interakcja `switch` |
| `src/home/shop.ts`, `src/ui/screens/shop.ts`, `src/styles/screens.css` | sklep wg pory roku, znaczek „Tylko jesienią” |
| `src/home/interactionPlan.ts`, `src/ui/screens/room.ts` | włączanie/wyłączanie wiatraka (`switch`), ławka z kocem jako siedzisko |
| `src/home/activitySpots.ts` | `blanket_bench` w `SOFAS` |
| `src/home/lamps.ts` (nowy) | klatka włączonego przedmiotu, siła poświaty |
| `src/ui/home/roomRenderer.ts` | rysowanie klatek „włączony” i drgającej poświaty |
| `src/core/changelog.ts`, `docs/NASTEPNA-SESJA.md` | wersja 3 z `items`, notatki |

---

### Task 1: Wycięcie sprite'ów ozdób (narzędzie, ocena wizualna)

**Files:**
- Modify: `tools/frames.json` (sekcje `sheets` i `items`)
- Modify: `tools/extract_sprites.py` (pole `season`)
- Modify (wynik): `tools/palette.json`, `public/items/*.png` (43 nowe), `src/home/items.generated.json`

Arkusze (już w repozytorium, 1024×765, tło ~ (211–213) szare, rysunki w „pixel art” z siatką ~3,2 px):
`assets/source/sheet-seasonal.jpg`, `assets/source/sheet-autumn1.jpg`, `assets/source/sheet-autumn2.jpg`.
Każdy obrazek ma dwa aliasy: siatka 6,4 px (drobne rzeczy, potem `scale` ~0,7–1,1) i 3,2 px (`…Fine`, duże rzeczy, `scale` ~0,6–1,1) — tak, żeby piksel na ekranie miał podobną wielkość jak w innych meblach. Prostokąty (`rect`, px arkusza) zmierzył planista automatycznie (składowe spójne nad podpisami) i sprawdził na nakładkach; podpisy i nagłówki sekcji leżą poza prostokątami albo odpadają przy `keep: "largest"`.

- [ ] **Step 1: Pole `season` w narzędziu** — w `tools/extract_sprites.py`:
  - `ITEM_FIELDS = ('name', 'category', 'layer', 'interaction', 'price')` zostaw, a pod nim dodaj `ITEM_OPTIONAL_FIELDS = ('season',)`;
  - w miejscu `catalog = {k: spec[k] for k in ITEM_FIELDS}` daj
    `catalog = {k: spec[k] for k in ITEM_FIELDS}` i zaraz pod tym `catalog.update({k: spec[k] for k in ITEM_OPTIONAL_FIELDS if k in spec})`;
  - w docstringu modułu, w zdaniu o danych katalogu (`name`, `category`, `layer`, `interaction`, `price`), dopisz „oraz opcjonalnie `season` (pora roku, w której rzecz jest w sklepie)”.

- [ ] **Step 2: Arkusze** — w `tools/frames.json`, w sekcji `"sheets"`, dopisz (po wpisie `"teethcomb"` albo na końcu sekcji; uważaj na przecinki):

```json
    "seasonal":     {"path": "assets/source/sheet-seasonal.jpg", "background": [211, 211, 211], "gridPeriod": 6.4, "holeTol": 15, "holeTolAll": 15, "paletteColours": 184, "itemPreview": "seasonal_preview"},
    "seasonalFine": {"path": "assets/source/sheet-seasonal.jpg", "background": [211, 211, 211], "gridPeriod": 3.2, "holeTol": 15, "holeTolAll": 15, "paletteColours": 184, "itemPreview": "seasonal_fine_preview"},
    "autumn1":      {"path": "assets/source/sheet-autumn1.jpg",  "background": [213, 213, 213], "gridPeriod": 6.4, "holeTol": 15, "holeTolAll": 15, "paletteColours": 184, "itemPreview": "autumn1_preview"},
    "autumn1Fine":  {"path": "assets/source/sheet-autumn1.jpg",  "background": [213, 213, 213], "gridPeriod": 3.2, "holeTol": 15, "holeTolAll": 15, "paletteColours": 184, "itemPreview": "autumn1_fine_preview"},
    "autumn2":      {"path": "assets/source/sheet-autumn2.jpg",  "background": [211, 211, 211], "gridPeriod": 6.4, "holeTol": 15, "holeTolAll": 15, "paletteColours": 184, "itemPreview": "autumn2_preview"},
    "autumn2Fine":  {"path": "assets/source/sheet-autumn2.jpg",  "background": [211, 211, 211], "gridPeriod": 3.2, "holeTol": 15, "holeTolAll": 15, "paletteColours": 184, "itemPreview": "autumn2_fine_preview"}
```

- [ ] **Step 3: Przedmioty** — w sekcji `"items"` (na końcu sekcji, przed jej `}`; pilnuj przecinka po poprzednim wpisie i braku przecinka po ostatnim) dopisz:

```json
    "pumpkin": {"sheet": "seasonal", "rect": [47, 148, 184, 284], "scale": 0.75, "name": "Dynia z buźką", "category": "decor", "layer": "floor", "interaction": "lamp", "price": 60, "season": "autumn"},
    "pumpkin_lit": {"sheet": "seasonal", "frameOf": "pumpkin", "rect": [215, 148, 354, 286], "scale": 0.75},
    "apple_basket": {"sheet": "seasonal", "rect": [392, 156, 502, 284], "scale": 0.8, "name": "Kosz jabłek", "category": "decor", "layer": "floor", "interaction": "none", "price": 50, "season": "autumn"},
    "leaf_garland": {"sheet": "seasonalFine", "rect": [520, 168, 683, 263], "keep": "all", "scale": 0.78, "name": "Girlanda z liści", "category": "decor", "layer": "wall", "interaction": "none", "price": 70, "season": "autumn"},
    "xmas_tree": {"sheet": "seasonalFine", "rect": [695, 131, 802, 286], "scale": 1.0, "name": "Choinka z lampkami", "category": "decor", "layer": "floor", "interaction": "lamp", "price": 250, "season": "winter"},
    "xmas_tree_lit": {"sheet": "seasonalFine", "frameOf": "xmas_tree", "rect": [859, 131, 965, 286], "scale": 1.0},
    "xmas_tree_blue": {"sheet": "seasonalFine", "rect": [72, 378, 166, 509], "scale": 1.0, "name": "Choinka z niebieskimi lampkami", "category": "decor", "layer": "floor", "interaction": "lamp", "price": 230, "season": "winter"},
    "snowman": {"sheet": "seasonalFine", "rect": [242, 379, 354, 509], "scale": 0.74, "name": "Bałwanek", "category": "balcony", "layer": "floor", "interaction": "cute", "price": 90, "season": "winter"},
    "poinsettia": {"sheet": "seasonal", "rect": [405, 380, 521, 509], "scale": 1.1, "name": "Gwiazda betlejemska", "category": "plant", "layer": "floor", "interaction": "water", "price": 80, "season": "winter"},
    "catkins": {"sheet": "seasonalFine", "rect": [575, 379, 657, 509], "keep": "all", "scale": 0.64, "name": "Bazie w wazonie", "category": "decor", "layer": "floor", "interaction": "none", "price": 50, "season": "spring"},
    "egg_basket": {"sheet": "seasonal", "rect": [708, 385, 815, 509], "scale": 0.72, "name": "Koszyczek z pisankami", "category": "decor", "layer": "floor", "interaction": "none", "price": 60, "season": "spring"},
    "birdhouse": {"sheet": "seasonalFine", "rect": [868, 345, 972, 509], "scale": 0.63, "name": "Budka dla ptaków", "category": "balcony", "layer": "floor", "interaction": "none", "price": 90, "season": "spring"},
    "fan": {"sheet": "seasonalFine", "rect": [36, 595, 127, 710], "scale": 0.95, "name": "Wiatrak", "category": "furniture", "layer": "floor", "interaction": "switch", "price": 120, "season": "summer"},
    "fan_spin_2": {"sheet": "seasonalFine", "frameOf": "fan", "rect": [180, 595, 273, 710], "scale": 0.95},
    "fan_spin_3": {"sheet": "seasonalFine", "frameOf": "fan", "rect": [328, 586, 436, 710], "scale": 0.95},
    "paddling_pool": {"sheet": "seasonalFine", "rect": [482, 601, 631, 710], "scale": 0.94, "name": "Dmuchany basenik", "category": "balcony", "layer": "floor", "interaction": "none", "price": 150, "season": "summer"},
    "flamingo": {"sheet": "seasonalFine", "rect": [676, 585, 817, 710], "scale": 0.67, "name": "Dmuchany flaming", "category": "balcony", "layer": "floor", "interaction": "cute", "price": 80, "season": "summer"},
    "watermelon": {"sheet": "seasonal", "rect": [862, 590, 985, 710], "keep": "all", "scale": 0.75, "name": "Arbuz na talerzu", "category": "decor", "layer": "floor", "interaction": "none", "price": 40, "season": "summer"},
    "pumpkin_classic": {"sheet": "autumn1", "rect": [63, 153, 187, 278], "scale": 0.72, "name": "Dynia", "category": "decor", "layer": "floor", "interaction": "none", "price": 30, "season": "autumn"},
    "gourd": {"sheet": "autumn1", "rect": [280, 153, 363, 279], "scale": 0.71, "name": "Dynia ozdobna", "category": "decor", "layer": "floor", "interaction": "none", "price": 20, "season": "autumn"},
    "pumpkin_giant": {"sheet": "autumn1", "rect": [440, 135, 590, 283], "scale": 1.04, "name": "Dynia olbrzymia", "category": "decor", "layer": "floor", "interaction": "none", "price": 70, "season": "autumn"},
    "pumpkin_cluster": {"sheet": "autumn1", "rect": [828, 147, 997, 283], "keep": "all", "scale": 0.94, "name": "Zestaw dyń", "category": "decor", "layer": "floor", "interaction": "none", "price": 60, "season": "autumn"},
    "harvest_basket": {"sheet": "autumn1", "rect": [453, 380, 584, 506], "keep": "all", "scale": 0.91, "name": "Kosz zbiorów", "category": "decor", "layer": "floor", "interaction": "none", "price": 60, "season": "autumn"},
    "jar_candle": {"sheet": "autumn1", "rect": [664, 384, 762, 506], "scale": 0.63, "name": "Świeca w słoiku", "category": "decor", "layer": "floor", "interaction": "lamp", "price": 40, "season": "autumn"},
    "fireplace": {"sheet": "autumn1Fine", "rect": [824, 367, 994, 505], "keep": "all", "scale": 0.9, "name": "Kominek z dyniami", "category": "furniture", "layer": "floor", "interaction": "lamp", "price": 300, "season": "autumn"},
    "corn_stalks": {"sheet": "autumn1Fine", "rect": [68, 586, 191, 711], "keep": "all", "scale": 0.82, "name": "Snopek kukurydzy", "category": "balcony", "layer": "floor", "interaction": "none", "price": 40, "season": "autumn"},
    "scarecrow": {"sheet": "autumn1Fine", "rect": [271, 585, 382, 711], "scale": 1.07, "name": "Strach na wróble", "category": "balcony", "layer": "floor", "interaction": "none", "price": 80, "season": "autumn"},
    "heather": {"sheet": "autumn1", "rect": [436, 585, 516, 711], "scale": 0.94, "name": "Wrzosy w doniczce", "category": "plant", "layer": "floor", "interaction": "water", "price": 45, "season": "autumn"},
    "pinecone_basket": {"sheet": "autumn1", "rect": [661, 592, 767, 711], "scale": 0.81, "name": "Kosz z szyszkami", "category": "decor", "layer": "floor", "interaction": "none", "price": 40, "season": "autumn"},
    "autumn_lantern": {"sheet": "autumn1", "rect": [868, 580, 952, 711], "scale": 1.0, "name": "Lampion jesienny", "category": "decor", "layer": "floor", "interaction": "lamp", "price": 60, "season": "autumn"},
    "butternut": {"sheet": "autumn2", "rect": [79, 138, 161, 289], "scale": 0.68, "name": "Dynia piżmowa", "category": "decor", "layer": "floor", "interaction": "none", "price": 25, "season": "autumn"},
    "pattypan": {"sheet": "autumn2", "rect": [265, 173, 382, 276], "scale": 0.75, "name": "Patison", "category": "decor", "layer": "floor", "interaction": "none", "price": 25, "season": "autumn"},
    "corn_basket": {"sheet": "autumn2", "rect": [433, 141, 607, 274], "keep": "all", "scale": 0.87, "name": "Kosz z kolbami kukurydzy", "category": "decor", "layer": "floor", "interaction": "none", "price": 50, "season": "autumn"},
    "harvest_veggies": {"sheet": "autumn2", "rect": [620, 144, 811, 289], "keep": "all", "scale": 0.8, "name": "Zbiory warzyw", "category": "decor", "layer": "floor", "interaction": "none", "price": 50, "season": "autumn"},
    "straw_bale": {"sheet": "autumn2", "rect": [829, 140, 997, 287], "scale": 1.03, "name": "Słomiany chochoł", "category": "balcony", "layer": "floor", "interaction": "none", "price": 60, "season": "autumn"},
    "door_wreath": {"sheet": "autumn2", "rect": [56, 377, 192, 509], "scale": 1.16, "name": "Wianek jesienny", "category": "decor", "layer": "wall", "interaction": "none", "price": 60, "season": "autumn"},
    "porch_display": {"sheet": "autumn2Fine", "rect": [421, 380, 613, 509], "keep": "all", "scale": 0.85, "name": "Jesienny kącik", "category": "balcony", "layer": "floor", "interaction": "none", "price": 120, "season": "autumn"},
    "autumn_sign": {"sheet": "autumn2Fine", "rect": [858, 372, 973, 509], "keep": "all", "scale": 0.79, "name": "Jesienny drogowskaz", "category": "balcony", "layer": "floor", "interaction": "none", "price": 50, "season": "autumn"},
    "blanket_bench": {"sheet": "autumn2Fine", "rect": [44, 586, 217, 711], "scale": 0.77, "name": "Ławka z kocem", "category": "balcony", "layer": "floor", "interaction": "none", "price": 180, "season": "autumn"},
    "straw_pumpkins": {"sheet": "autumn2Fine", "rect": [236, 589, 412, 710], "keep": "all", "scale": 0.63, "name": "Kostki słomy z dyniami", "category": "balcony", "layer": "floor", "interaction": "none", "price": 80, "season": "autumn"},
    "mum_pot": {"sheet": "autumn2", "rect": [433, 590, 587, 711], "scale": 1.05, "name": "Chryzantemy w garnku", "category": "plant", "layer": "floor", "interaction": "water", "price": 50, "season": "autumn"},
    "leaf_basket": {"sheet": "autumn2", "rect": [655, 593, 776, 711], "keep": "all", "scale": 0.86, "name": "Kosz z liśćmi", "category": "decor", "layer": "floor", "interaction": "none", "price": 40, "season": "autumn"},
    "fire_pit": {"sheet": "autumn2Fine", "rect": [820, 585, 1006, 711], "keep": "all", "scale": 0.69, "name": "Jesienne palenisko", "category": "balcony", "layer": "floor", "interaction": "lamp", "price": 150, "season": "autumn"},
```

(`pumpkin_lit`, `xmas_tree_lit`, `fan_spin_2`, `fan_spin_3` to klatki stanów: `state` = `lit`, `spin_2`, `spin_3`; ich `scale` = skala przedmiotu bazowego.)

- [ ] **Step 4: Paleta dla nowych arkuszy**

Run: `/c/gvenv/Scripts/python tools/extract_sprites.py --extend-palette 24 seasonal seasonalFine autumn1 autumn1Fine autumn2 autumn2Fine`
Expected: na końcu linia „Paleta 184 + 24 = 208 kolorów; … Ustaw "paletteColours": 208 w tych arkuszach.” i normalny przebieg wycinania. Potem w 6 nowych arkuszach w `frames.json` zmień `"paletteColours": 184` na `208` i uruchom jeszcze raz bez parametrów:

Run: `/c/gvenv/Scripts/python tools/extract_sprites.py`
Expected: lista wszystkich przedmiotów z rozmiarami (nowe m.in. `pumpkin … -> ~16x16 px log.`, `xmas_tree … -> ~...x48`), bez błędów; `git status` pokazuje zmiany tylko w nowych plikach `public/items/`, `src/home/items.generated.json`, `tools/palette.json`, `tools/frames.json`, `tools/extract_sprites.py` (stare PNG nie mogą się zmienić — `git diff --stat public/items` dla starych plików ma być pusty).

- [ ] **Step 5: Ocena wizualna (obowiązkowa)** — obejrzyj (Read) `tools/out/seasonal_preview.png`, `seasonal_fine_preview.png`, `autumn1_preview.png`, `autumn1_fine_preview.png`, `autumn2_preview.png`, `autumn2_fine_preview.png` (podgląd ×3·skala obok postaci Gabi). Sprawdź i popraw w `frames.json` (prostokąty, `keep`, `scale`, `erase`, `shadow`), aż:
  - każda rzecz jest cała (nic nie ucięte), bez kawałków podpisów, nagłówków ani sąsiednich rzeczy;
  - szare cienie pod przedmiotami: jeśli zostają jako szara plama, dodaj `"shadow": [[x0, y0, x1, y1]]` (dolny pas prostokąta) i w arkuszu `"shadowHsv": [0, 360, 0.0, 0.12, 0.6, 0.86]` (szarości tła cienia) — tak jak w arkuszach `balcony1`/`balcony2`; sprawdź, że nie znikają jasnoszare części przedmiotów (wiatrak, słoik świecy, lampion);
  - wielkość obok Gabi jest sensowna: dynie i koszyki do kolan, choinki prawie wzrostu Gabi, bałwanek i strach na wróble ~połowa–¾ jej wzrostu, wiatrak do pasa, kominek szeroki; w razie potrzeby popraw `scale` wpisu (klatki stanów — ta sama skala co przedmiot bazowy);
  - klatki stanów: na podglądzie „przenikanie” zapalona dynia i choinka pokrywają się ze zgaszonymi, a śmigło wiatraka nie skacze (podstawa wiatraka w tym samym miejscu we wszystkich 3 klatkach); jeśli nie — `alignRect` (prostokąt części wspólnej, np. podstawa/doniczka) albo `anchorAt` (patrz docstring narzędzia).
  Po każdej poprawce uruchom narzędzie ponownie. Zapisz w raporcie, co poprawiłeś i dlaczego.

- [ ] **Step 6: Testy i typy**

Run: `npx tsc --noEmit -p .` oraz `npx vitest run`
Expected: bez błędów (testy katalogu sprawdzają m.in. znane kategorie, warstwy, interakcje — `switch` jeszcze nie istnieje w kodzie; jeśli test katalogu nie przechodzi tylko z powodu interakcji `switch` wiatraka, odnotuj to — Task 2 ją dodaje; nie zmieniaj interakcji wiatraka).

- [ ] **Step 7: Commit**

```bash
git add tools/frames.json tools/extract_sprites.py tools/palette.json public/items src/home/items.generated.json
git commit -m "Ozdoby sezonowe: wycięte sprite'y 39 rzeczy (arkusze ozdób i jesienne), pole season w katalogu"
```

---

### Task 2: Katalog i sklep wg pory roku, wiatrak jako przełącznik, ławka z kocem

**Files:**
- Modify: `src/home/catalog.ts`, `src/home/shop.ts`, `src/ui/screens/shop.ts`, `src/styles/screens.css`
- Modify: `src/home/interactionPlan.ts`, `src/ui/screens/room.ts`, `src/home/activitySpots.ts`
- Modify: `tests/home/catalog.test.ts`, `tests/home/shop.test.ts`, `tests/home/interactionPlan.test.ts`

- [ ] **Step 1: Testy** — dopisz do `tests/home/catalog.test.ts`:

```ts
import { SEASONS } from '../../src/home/season';

describe('ozdoby sezonowe', () => {
  const seasonal = CATALOG.filter((d) => d.season !== undefined);

  it('39 rzeczy sezonowych: 28 jesiennych, 4 zimowe, 3 wiosenne, 4 letnie; pora roku znana', () => {
    expect(seasonal).toHaveLength(39);
    for (const d of seasonal) expect(SEASONS, d.id).toContain(d.season);
    const count = (s: string) => seasonal.filter((d) => d.season === s).length;
    expect([count('autumn'), count('winter'), count('spring'), count('summer')]).toEqual([28, 4, 3, 4]);
  });

  it('świecące są lampkami, wiatrak przełącznikiem z 3 klatkami śmigła, dynia i choinka mają klatkę zapaloną', () => {
    for (const id of ['pumpkin', 'xmas_tree', 'xmas_tree_blue', 'jar_candle', 'autumn_lantern', 'fireplace', 'fire_pit']) {
      expect(itemById(id).interaction, id).toBe('lamp');
    }
    expect(itemById('fan').interaction).toBe('switch');
    expect(Object.keys(itemFrames('fan')).sort()).toEqual(['spin_2', 'spin_3']);
    expect(itemFrames('pumpkin').lit).toBeDefined();
    expect(itemFrames('xmas_tree').lit).toBeDefined();
  });

  it('rośliny sezonowe się podlewa', () => {
    for (const id of ['poinsettia', 'heather', 'mum_pot']) expect(itemById(id).interaction, id).toBe('water');
  });
});
```

Do `tests/home/shop.test.ts` — zastąp test „każda kategoria przedmiotów ma wpisy, a wszystkie przedmioty trafiają do jakiejś kategorii” wersją z porami roku i dopisz test filtra (import `SEASONS` z `../../src/home/season`):

```ts
  it('każda kategoria przedmiotów ma wpisy, a każdy przedmiot jest w sklepie w jakiejś porze roku', () => {
    const itemCats = SHOP_CATEGORIES.filter((c) => c.id !== 'wallpaper' && c.id !== 'floor');
    for (const c of itemCats) expect(shopItems(c.id, 'spring').length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const s of SEASONS) for (const c of itemCats) for (const d of shopItems(c.id, s)) seen.add(d.id);
    expect(seen.size).toBe(CATALOG.filter((d) => !d.special).length);
  });

  it('sezonowe tylko w swojej porze roku, całoroczne zawsze', () => {
    expect(shopItems('decor', 'autumn').map((d) => d.id)).toContain('pumpkin');
    expect(shopItems('decor', 'winter').map((d) => d.id)).not.toContain('pumpkin');
    expect(shopItems('decor', 'winter').map((d) => d.id)).toContain('xmas_tree');
    expect(shopItems('furniture', 'summer').map((d) => d.id)).toContain('fan');
    for (const s of SEASONS) expect(shopItems('furniture', s).map((d) => d.id)).toContain('pc_desk');
    expect(SEASON_ONLY.autumn).toBe('Tylko jesienią');
  });
```

(dopisz `SEASON_ONLY` do importu z `../../src/home/shop`). W `tests/home/interactionPlan.test.ts` dopisz do `ITEM_OF` wpis `switch: 'fan'`.

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/catalog.test.ts tests/home/shop.test.ts`
Expected: FAIL (brak `season` w `ItemDef`, `SEASON_ONLY`, interakcji `switch`).

- [ ] **Step 3: Katalog** — w `src/home/catalog.ts`:
  - dodaj import `import type { Season } from './season';`;
  - w `INTERACTIONS` po `'lamp',` dodaj `'switch',`;
  - w `ItemDef` po `price: number;` dodaj:
    ```ts
      /** Pora roku, w której rzecz jest w sklepie (kupiona zostaje na zawsze); brak — cały rok. */
      season?: Season;
    ```
  - w `RawMeta` dodaj `season?: Season;`;
  - w budowaniu `CATALOG` po `scale: m.scale ?? 1,` dodaj `...(m.season ? { season: m.season } : {}),`.

- [ ] **Step 4: Sklep** — w `src/home/shop.ts` dodaj import `import type { Season } from './season';` i zastąp `shopItems`:

```ts
/** Przedmioty kategorii sklepu w kolejności katalogu (bez specjalnych); sezonowe — tylko w swojej porze roku. */
export function shopItems(category: ShopCategory, season?: Season): ItemDef[] {
  return CATALOG.filter((d) => !d.special && d.category === category && (!d.season || d.season === season));
}

/** Znaczek na kafelku rzeczy sezonowej. */
export const SEASON_ONLY: Readonly<Record<Season, string>> = {
  spring: 'Tylko wiosną',
  summer: 'Tylko latem',
  autumn: 'Tylko jesienią',
  winter: 'Tylko zimą',
};
```

W `src/ui/screens/shop.ts`:
  - importy: `SEASON_ONLY` z `../../home/shop`, `seasonNow` z `../../home/season`, `gameClock` z `../../home/clock` (jeśli jeszcze nie ma);
  - na początku ekranu (przy `let category …`) dodaj `const season = seasonNow(gameClock());`;
  - w `categoryIds` i w `furnitureView` wywołuj `shopItems(c, season)` / `shopItems(category, season)`;
  - w `itemCard`, po `h('strong', {}, def.name),` dodaj `def.season ? h('small', { class: 'season-tag' }, SEASON_ONLY[def.season]) : null,`.

W `src/styles/screens.css` (przy `.shop-card`) dodaj:
```css
.shop-card .season-tag { color: var(--accent-2); font-weight: 700; }
```

- [ ] **Step 5: Wiatrak (`switch`) i ławka**
  - `src/home/interactionPlan.ts`: w `switch` kroków przy `case 'lamp':` dodaj `case 'switch':` (te same kroki); w `toggleLamp` zamień warunek na `const kind = findItem(it.itemId)?.interaction; if (kind !== 'lamp' && kind !== 'switch') return { ok: false, reason: 'unknown-item' };` i popraw opis na „Zapala/gasi lampkę albo włącza/wyłącza urządzenie (wiatrak)”.
  - `src/ui/screens/room.ts`: dwa warunki `if (kind === 'lamp') …` (dźwięk `click` i `toggleLamp`) zamień na `if (kind === 'lamp' || kind === 'switch') …`; w tablicy `CAT_BED_LIFT` dopisz `blanket_bench: 10,` (sekcja „balkon”).
  - `src/home/activitySpots.ts`: w `SOFAS` dopisz `'blanket_bench'` obok `'rattan_bench', 'sun_lounger'` (komentarz: „jesienna ławka z kocem”).

- [ ] **Step 6: Testy, typy, build**

Run: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`
Expected: bez błędów (jeśli inne testy liczą przedmioty w sklepie bez pory roku — dopasuj je, przekazując porę roku).

- [ ] **Step 7: Commit**

```bash
git add src/home/catalog.ts src/home/shop.ts src/ui/screens/shop.ts src/styles/screens.css src/home/interactionPlan.ts src/ui/screens/room.ts src/home/activitySpots.ts tests/home/catalog.test.ts tests/home/shop.test.ts tests/home/interactionPlan.test.ts
git commit -m "Ozdoby sezonowe: sklep wg pory roku (Tylko jesienią…), wiatrak jako przełącznik, ławka z kocem"
```

---

### Task 3: Świecenie i ruch (zapalona dynia i choinki, płomienie, wiatrak)

**Files:**
- Create: `src/home/lamps.ts`, `tests/home/lamps.test.ts`
- Modify: `src/ui/home/roomRenderer.ts` (`drawItem`, `drawGlow`, `drawItems`)

- [ ] **Step 1: Test** — utwórz `tests/home/lamps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { itemFrames } from '../../src/home/catalog';
import { FLAME_ITEMS, TWINKLE_ITEMS, glowStrength, onFrame } from '../../src/home/lamps';

describe('włączone przedmioty', () => {
  it('wyłączone — zwykły sprite', () => {
    for (const id of ['pumpkin', 'xmas_tree', 'fan']) expect(onFrame(id, false, 1234)).toBeNull();
  });

  it('zapalona dynia — klatka zapalona', () => {
    expect(onFrame('pumpkin', true, 0)).toBe(itemFrames('pumpkin').lit);
    expect(onFrame('pumpkin', true, 5000)).toBe(itemFrames('pumpkin').lit);
  });

  it('choinka miga: najczęściej zapalona, na chwilę gaśnie', () => {
    const states = Array.from({ length: 40 }, (_, i) => onFrame('xmas_tree', true, i * 100));
    expect(states.filter((s) => s === itemFrames('xmas_tree').lit).length).toBeGreaterThan(20);
    expect(states).toContain(null);
  });

  it('wiatrak kręci się przez 3 klatki', () => {
    const f = itemFrames('fan');
    const seen = new Set([0, 90, 180, 270].map((t) => onFrame('fan', true, t)));
    expect(seen).toEqual(new Set([null, f.spin_2, f.spin_3]));
  });

  it('poświata: płomienie drgają w 0,6–1, choinki pulsują, reszta stała', () => {
    expect(FLAME_ITEMS.has('fire_pit')).toBe(true);
    expect(TWINKLE_ITEMS.has('xmas_tree_blue')).toBe(true);
    const flame = Array.from({ length: 200 }, (_, i) => glowStrength('jar_candle', i * 17));
    expect(Math.min(...flame)).toBeGreaterThanOrEqual(0.6);
    expect(Math.max(...flame)).toBeLessThanOrEqual(1);
    expect(new Set(flame.map((v) => v.toFixed(2))).size).toBeGreaterThan(10);
    expect(new Set([0, 600].map((t) => glowStrength('xmas_tree', t))).size).toBe(2);
    expect(glowStrength('nightstand_lamp', 999)).toBe(1);
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/lamps.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: Moduł** — utwórz `src/home/lamps.ts`:

```ts
import { itemFrames } from './catalog';

/**
 * Włączone przedmioty (czyste funkcje): zapalona dynia i choinka mają klatkę `lit` (choinka co chwilę gaśnie —
 * lampki migają), włączony wiatrak kręci się przez klatki `spin_2`/`spin_3`, a poświata płomieni drga.
 */

/** Przedmioty z płomieniem: poświata drga. */
export const FLAME_ITEMS: ReadonlySet<string> = new Set(['pumpkin', 'jar_candle', 'autumn_lantern', 'fireplace', 'fire_pit']);
/** Choinki: lampki migają, poświata pulsuje. */
export const TWINKLE_ITEMS: ReadonlySet<string> = new Set(['xmas_tree', 'xmas_tree_blue']);

/** Klatka włączonego przedmiotu w chwili `t` (ms) albo null — zwykły sprite. */
export function onFrame(itemId: string, on: boolean, t: number): string | null {
  if (!on) return null;
  const frames = itemFrames(itemId);
  if (frames.spin_2 && frames.spin_3) {
    const k = Math.floor(t / 90) % 3;
    return k === 0 ? null : k === 1 ? frames.spin_2 : frames.spin_3;
  }
  if (!frames.lit) return null;
  // choinka: lampki gasną na chwilę co czwarty takt (400 ms)
  if (TWINKLE_ITEMS.has(itemId) && Math.floor(t / 400) % 4 === 3) return null;
  return frames.lit;
}

/** Siła poświaty zapalonej lampki (0,6–1): płomienie drgają, choinki pulsują, inne świecą równo. */
export function glowStrength(itemId: string, t: number): number {
  if (FLAME_ITEMS.has(itemId)) return 0.8 + 0.2 * Math.sin(t / 90) * Math.sin(t / 37 + 1.3);
  if (TWINKLE_ITEMS.has(itemId)) return Math.floor(t / 600) % 2 === 0 ? 0.75 : 1;
  return 1;
}
```

- [ ] **Step 4: Test przechodzi**

Run: `npx vitest run tests/home/lamps.test.ts`
Expected: PASS.

- [ ] **Step 5: Renderer** — w `src/ui/home/roomRenderer.ts`:
  - import: `import { glowStrength, onFrame } from '../../home/lamps';`;
  - w `drawItem`, zaraz przed `const state = f.states.get(it.uid) ?? nightFrame;`, dodaj:
    ```ts
    // włączony przedmiot: zapalona dynia/choinka (choinka miga), kręcący się wiatrak
    const onState = def.interaction === 'lamp' || def.interaction === 'switch' ? onFrame(it.itemId, it.lampOn === true, f.t) : null;
    ```
    i zmień tę linię na `const state = f.states.get(it.uid) ?? onState ?? nightFrame;`;
  - `drawGlow` dostaje parametr `strength: number` (po `night`) i mnoży przez niego obie wartości alfa pierwszego koloru gradientu: `` `rgba(255, 226, 140, ${(night ? 0.55 : 0.3) * strength})` ``;
  - w `drawItems` wywołanie zmień na `drawGlow(ctx, k, it, f.night, glowStrength(it.itemId, f.t))`.

- [ ] **Step 6: Typy, testy, build**

Run: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`
Expected: bez błędów.

- [ ] **Step 7: Commit**

```bash
git add src/home/lamps.ts tests/home/lamps.test.ts src/ui/home/roomRenderer.ts
git commit -m "Ozdoby sezonowe: zapalona dynia i choinki (mruganie), drgające płomienie, kręcący się wiatrak"
```

---

### Task 4: Wersja 3 z ozdobami, notatki, sprawdzenie, wydanie (kontroler)

**Files:**
- Modify: `src/core/changelog.ts` (wpis wersji 3), `docs/NASTEPNA-SESJA.md`

- [ ] **Step 1: „Co nowego?”** — w `src/core/changelog.ts` we wpisie `version: 3`: zmień `changes` na trzy zdania i dodaj `items` (znaczek „NOWE”) z id wszystkich 39 rzeczy sezonowych, a `soon` — na zapowiedź następnych zmian:

```ts
    changes: [
      'Pory roku i pogoda: balkon zmienia się z porą roku, pada deszcz i śnieg, latem są burze, motyle i świetliki.',
      'Gabi mówi o pogodzie, a w oknach widać deszcz, śnieg i liście.',
      'Ozdoby sezonowe w sklepie — teraz jesienne: dynie, wrzosy, kominek, palenisko i dużo więcej!',
    ],
    items: [
      'pumpkin', 'apple_basket', 'leaf_garland', 'xmas_tree', 'xmas_tree_blue', 'snowman', 'poinsettia', 'catkins',
      'egg_basket', 'birdhouse', 'fan', 'paddling_pool', 'flamingo', 'watermelon', 'pumpkin_classic', 'gourd',
      'pumpkin_giant', 'pumpkin_cluster', 'harvest_basket', 'jar_candle', 'fireplace', 'corn_stalks', 'scarecrow',
      'heather', 'pinecone_basket', 'autumn_lantern', 'butternut', 'pattypan', 'corn_basket', 'harvest_veggies',
      'straw_bale', 'door_wreath', 'porch_display', 'autumn_sign', 'blanket_bench', 'straw_pumpkins', 'mum_pot',
      'leaf_basket', 'fire_pit',
    ],
    soon: ['Staramy się naprawić ubrania Gabi i dodać kilka nowych rzeczy dla Gabi i Somerki!'],
```

Run: `npx vitest run` — test `newItems` sprawdza, że każde id z `items` istnieje w katalogu.

- [ ] **Step 2: Notatki** — w `docs/NASTEPNA-SESJA.md` w sekcji „Pory roku i pogoda — etap 1” zamień ostatni punkt (o etapie 2) na:

```markdown
- Etap 2 — ozdoby sezonowe (2026-10-19): 39 rzeczy z `assets/source/sheet-seasonal.jpg`, `sheet-autumn1.jpg`,
  `sheet-autumn2.jpg` (wpisy w `tools/frames.json` z polem `season`; aliasy arkuszy z siatką 6,4 i 3,2 px), w sklepie
  tylko w swojej porze roku (`shopItems(category, season)`, znaczek „Tylko jesienią”), kupione zostają na zawsze.
  Świecące (`interaction: 'lamp'`): dynie, choinki, świeca, lampion, kominek, palenisko — `src/home/lamps.ts`
  (klatka `lit`, mruganie choinek, drgająca poświata); wiatrak `interaction: 'switch'` (klatki `spin_2`/`spin_3`).
```

- [ ] **Step 3: Przeglądarka (telefon 375×812)** — kopia zapisu przed testem i przywrócenie po (jak w etapie 1). Serwer `gabigochi`:
  - Sklep → Meble/Ozdoby/Rośliny/Balkon: jesienią (`?pora=jesien`) są jesienne rzeczy ze znaczkiem „Tylko jesienią”, zimą (`?pora=zima`) zimowe, a jesiennych nie ma; znaczki „NOWE”;
  - kup kilka (testowo `?monety=9000`), postaw w pokoju i na balkonie: rozmiary obok Gabi, ściana (girlanda, wianek), podłoga;
  - dynia/choinka/świeca/kominek/palenisko: stuknięcie zapala/gasi; nocą przy zgaszonym świetle świecą, poświata drga; choinka miga; wiatrak kręci się po włączeniu;
  - wrzosy/chryzantemy/gwiazda betlejemska — podlewanie; ławka z kocem — Gabi siada; brak błędów w konsoli.

- [ ] **Step 4: Pokaz użytkownikowi** — linki do podglądu na serwerze testowym (komputer i telefon w tej samej sieci), poczekać na uwagi.

- [ ] **Step 5: Commit**

```bash
git add src/core/changelog.ts docs/NASTEPNA-SESJA.md
git commit -m "Ozdoby sezonowe: wpis Co nowego (wersja 3 z NOWE), notatki"
```

- [ ] **Step 6: Wydanie (tylko za zgodą użytkownika)** — data wpisu wersji 3 = dzień wydania; potem `git branch -f main etap-1`, `git push origin main etap-1`, poczekać na workflow „Deploy” (sukces) i sprawdzić stronę `https://aleckusi.github.io/gabigochi/?play`.
