# Stroje z arkuszy (pilotaż: gotycka lolita) — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gabi w gotyckiej lolicie wyświetla klatki wycięte z arkusza stroju (ten sam układ co oryginalny arkusz), a klatki bez arkusza — przemalowanie jak dziś.

**Architecture:** Osobny skrypt `tools/extract_outfits.py` (korzysta z funkcji `extract_sprites.py`) wycina klatki strojów do `public/sprites/stroje/<id>/` i zapisuje metadane w `src/sprites/outfits.generated.json`. Czysty moduł `src/sprites/outfitFrames.ts` mówi, czy strój ma daną klatkę/portret. `figures.ts` bierze klatkę stroju zamiast przemalowania; ozdoba głowy doklejana jak dziś. Szafa pokazuje Gabi w stroju zamiast obrazka z wieszaka.

**Tech Stack:** Python 3 (numpy, PIL) w `/c/gvenv/Scripts/python` (komenda `python3` to atrapa — nie używać), Vite + TypeScript + Vitest (środowisko node), Git Bash na Windows.

Spec: `docs/superpowers/specs/2026-10-19-stroje-z-arkuszy-design.md`. Metadane klatek strojów są w osobnym pliku (a nie w `frames.generated.json`, jak pisał spec), bo główny ekstraktor nadpisuje `frames.generated.json` przy każdym uruchomieniu.

---

## Struktura plików

- Create `tools/extract_outfits.py` — wycinanie klatek strojów (Task 1).
- Modify `tools/frames.json` — sekcja `outfits` (Task 1).
- Create (generowane) `public/sprites/stroje/goth_lolita/*.png`, `src/sprites/outfits.generated.json` (Task 1).
- Create `src/sprites/outfitFrames.ts`, `tests/sprites/outfitFrames.test.ts` (Task 2).
- Modify `src/wardrobe/figures.ts`, `src/main.ts` (Task 3).
- Modify `src/ui/screens/wardrobe.ts` (Task 4).
- Create `docs/prompty-stroje.md`, modify `docs/NASTEPNA-SESJA.md` (Task 5, kontroler).

---

### Task 1: Ekstraktor strojów

**Files:**
- Create: `tools/extract_outfits.py`
- Modify: `tools/frames.json` (nowa sekcja najwyższego poziomu `outfits`, np. tuż przed `"sheets"`)

Kontekst: `tools/extract_sprites.py` ma `main()` pod `if __name__ == '__main__'`, więc import jest bezpieczny (wczytuje tylko `CFG`). Arkusz stroju `assets/source/stroje/goth_lolita/main.jpg` (765×1024) ma ten sam układ co `assets/source/sprite-sheet.jpg` (768×1024; przesunięcie 0 px), tło ok. `[203, 207, 210]` (oryginał `[207, 210, 215]`). Na arkuszu `main` są klatki ciała `idle_front walk_a1 walk_a2 walk_a3 walk_a4 fun_wave fun_eat fun_talk` i portrety `portrait_a portrait_b`. Wpisy oryginału mają poprawki przypięte do pikseli oryginału (`bag`, `cut`, `fix`, `wipe`, `copy`) — dla stroju ich NIE stosujemy. `fun_eat` pomijamy (w arkuszu stroju brak kanapki).

- [ ] **Step 1: Sekcja `outfits` w `tools/frames.json`**

Dodaj na najwyższym poziomie (zachowaj formatowanie pliku — 2 spacje):

```json
  "outfits": {
    "goth_lolita": { "sheets": { "main": {} }, "skip": ["fun_eat", "nurse_*"] }
  },
```

- [ ] **Step 2: Napisz `tools/extract_outfits.py`**

```python
"""Stroje z arkuszy: klatki Gabi w stroju wycięte z arkuszy wygenerowanych na wzór oryginalnych (ten sam układ).

Użycie: /c/gvenv/Scripts/python tools/extract_outfits.py
Konfiguracja: sekcja `outfits` w tools/frames.json:
  "outfits": {"<id stroju>": {"sheets": {"<klucz arkusza>": {nadpisania}}, "skip": [wzorce nazw klatek]}}
Plik arkusza: assets/source/stroje/<id>/<klucz>.jpg — klucz jak w `sheets` frames.json (`main` = sprite-sheet.jpg).
Dla każdej klatki ciała i portretu z tego arkusza (bez `skip`, bez wpisów `like`): prostokąt z oryginału poszerzony
o `pad` (domyślnie 10 px arkusza — sukienka bywa szersza niż dżinsy), obróbka jak w extract_sprites (próbkowanie,
`hairTone`, tło, kwantyzacja do całej palety tools/palette.json, `clean_smooth`, `outline`) BEZ poprawek
przypiętych do pikseli oryginału (bag, cut, fix, wipe, copy, erase, paint); zostaje największy kształt.
Skala z klatki bazowej (src/sprites/frames.generated.json), kotwica i stopy jak w oryginale, czubek głowy —
`head_point`. Kontrola: wysokość klatki (portretu: wymiary) w ±15% oryginału, inaczej klatka pominięta z
ostrzeżeniem (w grze zostaje przemalowanie). Klatki pochodne (`derived`) — gdy jest klatka źródłowa.
Nadpisania arkusza: `background` (domyślnie "auto" — mediana lewego górnego rogu 20×20), `gridPeriod`, `pad`.
Wyjście: public/sprites/stroje/<id>/<klatka>.png, src/sprites/outfits.generated.json
{<id>: {"frames": {klatka: {w, h, anchorX, foot, scale, head}}, "portraits": {portret: [w, h]}}},
podgląd tools/out/stroj_<id>_<arkusz>.png (u góry oryginał, pod spodem strój, ×3).
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract_sprites as X  # noqa: E402

ROOT = X.ROOT
CFG = X.CFG
SRC_DIR = ROOT / 'assets' / 'source' / 'stroje'
OUT_DIR = ROOT / 'public' / 'sprites' / 'stroje'
META_PATH = ROOT / 'src' / 'sprites' / 'outfits.generated.json'
PREVIEW_DIR = ROOT / 'tools' / 'out'
BASE_META = json.loads((ROOT / 'src' / 'sprites' / 'frames.generated.json').read_text(encoding='utf-8'))
DEFAULT_PAD = 10
SIZE_TOL = 0.15


def auto_background(img):
    """Kolor tła arkusza: mediana lewego górnego rogu 20×20 (generator daje trochę inne tło niż oryginał)."""
    return [float(v) for v in np.median(img[:20, :20].reshape(-1, 3), axis=0)]


def frames_on(sheet_key, skip):
    """(grupa, nazwa, wpis) klatek ciała i portretów z arkusza `sheet_key` — bez `skip` i bez wpisów `like`."""
    out = []
    for group in ('body', 'portraits'):
        for name, spec in CFG.get(group, {}).items():
            if isinstance(spec, dict) and 'like' in spec:
                continue
            if X.matches(name, skip):
                continue
            e = X.entry(spec, group)
            if e['sheet'] == sheet_key:
                out.append((group, name, e))
    return out


def cut(img, e, bg, period, pad, palette):
    """Klatka z arkusza stroju: prostokąt oryginału + `pad`, obróbka jak w extract_sprites, największy kształt."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = e['rect']
    rect = [max(0, x0 - pad), max(0, y0 - pad), min(w - 1, x1 + pad), min(h - 1, y1 + pad)]
    box = X.tight_box(img, rect, bg)
    cells, xs, ys = X.sample(img, box, period, e['sampleMode'], bg, e['bgTol'])
    if e['reduce'] == 2:
        cells, xs, ys = X.reduce2(cells, xs, ys, bg)
        period *= 2
    if e['hairTone']:
        cells = X.hair_tone(cells, *e['hairTone'])
    mask = X.background_mask(cells, bg, 12, e['holeTol'], e['halo']) | X.outside_box(xs, ys, box, period / 2)
    im = X.to_rgba(X.quantise(cells, palette), mask, palette)
    (sx0, sy0, sx1, sy1), shape = X.largest_shape(im)
    arr = np.array(im)
    arr[~shape] = 0
    im = Image.fromarray(arr, 'RGBA').crop((int(sx0), int(sy0), int(sx1) + 1, int(sy1) + 1))
    if e['sampleMode'] == 'smooth':
        im = X.clean_smooth(im)
    if e['outline']:
        im = X.outer_outline(im, e['outline'])
    return im


def body_meta(im, base):
    """Metadane klatki stroju: kotwica i stopy jak w extract_sprites, skala z klatki bazowej, czubek głowy."""
    (_, sy0, _, sy1), shape = X.largest_shape(im)
    arr = np.asarray(im).astype(int)
    head = X.head_point(X.wardrobe_classes(arr), arr[:, :, 3] > 0)
    return {'w': im.width, 'h': im.height, 'anchorX': round(X.anchor_x(shape, sy0), 2), 'foot': int(sy1) + 1,
            'scale': base['scale'], 'head': head}


def save_pair_preview(oid, skey, pairs, f=3):
    """Podgląd ×f: rząd oryginałów nad rzędem klatek stroju (ta sama kolejność)."""
    if not pairs:
        return
    def row(ims):
        return X.compose([(im.resize((im.width * f, im.height * f), Image.NEAREST), im.height * f) for im in ims])
    top, bottom = row([p[0] for p in pairs]), row([p[1] for p in pairs])
    out = Image.new('RGBA', (max(top.width, bottom.width), top.height + bottom.height), (255, 255, 255, 255))
    out.alpha_composite(top, (0, 0))
    out.alpha_composite(bottom, (0, top.height))
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out.save(PREVIEW_DIR / f'stroj_{oid}_{skey}.png')


def main():
    palette = X.load_palette(None)  # zamrożona paleta (tools/palette.json) — cała, bez limitu `paletteColours`
    meta = {}
    for oid, ocfg in CFG.get('outfits', {}).items():
        skip = ocfg.get('skip', [])
        odir = OUT_DIR / oid
        if odir.exists():
            shutil.rmtree(odir)
        odir.mkdir(parents=True)
        frames, portraits, cut_ims = {}, {}, {}
        for skey, over in ocfg['sheets'].items():
            path = SRC_DIR / oid / f'{skey}.jpg'
            if not path.exists():
                print(f'BRAK ARKUSZA {path}')
                continue
            img = X.sheet(str(path))
            bg_cfg = over.get('background', 'auto')
            bg = np.array(auto_background(img) if bg_cfg == 'auto' else bg_cfg, float)
            pad = over.get('pad', DEFAULT_PAD)
            pairs = []
            for group, name, e in frames_on(skey, skip):
                period = over.get('gridPeriod', e['period'])
                im = cut(img, e, bg, period, pad, palette)
                if group == 'body':
                    base = BASE_META['frames'][name]
                    if abs(im.height / base['h'] - 1) > SIZE_TOL:
                        print(f'POMINIĘTA {oid}/{name}: wysokość {im.height} (oryginał {base["h"]})')
                        continue
                    frames[name] = body_meta(im, base)
                else:
                    bw, bh = BASE_META['portraits'][name]
                    if abs(im.width / bw - 1) > SIZE_TOL or abs(im.height / bh - 1) > SIZE_TOL:
                        print(f'POMINIĘTY {oid}/{name}: {im.width}x{im.height} (oryginał {bw}x{bh})')
                        continue
                    portraits[name] = [im.width, im.height]
                im.save(odir / f'{name}.png')
                cut_ims[name] = im
                pairs.append((Image.open(X.OUT_DIR / f'{name}.png').convert('RGBA'), im))
                print(f'{oid}/{name:14s} {im.width:3d}x{im.height:3d}')
            save_pair_preview(oid, skey, pairs)
        for name, spec in CFG.get('derived', {}).items():
            if spec['from'] in frames and not X.matches(name, skip):
                src = cut_ims[spec['from']]
                im = X.without_stool(src, spec['noStool']) if 'noStool' in spec else src.copy()
                im.save(odir / f'{name}.png')
                frames[name] = {**frames[spec['from']], 'w': im.width, 'h': im.height}
                print(f'{oid}/{name:14s} <- {spec["from"]}')
        meta[oid] = {'frames': frames, 'portraits': portraits}
        print(f'{oid}: klatek {len(frames)}, portretów {len(portraits)}')
    META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Metadane: {META_PATH}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Uruchom**

Run: `cd /c/Users/Al8c/Documents/gabigochi && /c/gvenv/Scripts/python tools/extract_outfits.py`
Expected: linie `goth_lolita/idle_front …`, `walk_a1…a4`, `fun_wave`, `fun_talk`, `portrait_a`, `portrait_b`; podsumowanie `goth_lolita: klatek 7, portretów 2` (bez `fun_eat`). Żadnych `POMINIĘTA`.
Jeśli coś jest pominięte albo wycięte źle (obejrzyj `tools/out/stroj_goth_lolita_main.png` narzędziem Read): dla zbyt ciasnego/szerokiego wycięcia zmień `pad` w `outfits.goth_lolita.sheets.main`; dla dziur w postaci albo resztek tła — `background` (podaj kolor jawnie) albo `holeTol`. NIE zmieniaj `extract_sprites.py`.

- [ ] **Step 4: Obejrzyj podgląd i klatki**

Read `tools/out/stroj_goth_lolita_main.png` oraz kilka `public/sprites/stroje/goth_lolita/*.png`. Sprawdź: cała postać (włosy, buty, falbany), bez kawałków sąsiednich postaci, bez szarego tła i dziur; wielkość zbliżona do oryginału w rzędzie wyżej. `head` w `src/sprites/outfits.generated.json` ma sensowne `y` (0–3) i `w` (szerokość włosów, ~15–22) dla `idle_front`.

- [ ] **Step 5: Upewnij się, że główny ekstraktor nic nie zmienia**

Run: `git status --short public/sprites src/sprites/frames.generated.json public/masks`
Expected: tylko nowe `public/sprites/stroje/` (żadne istniejące PNG ani `frames.generated.json` zmienione).

- [ ] **Step 6: Commit**

```bash
git add tools/extract_outfits.py tools/frames.json public/sprites/stroje src/sprites/outfits.generated.json
git commit -m "Stroje z arkuszy: ekstraktor klatek stroju (gotycka lolita, arkusz główny)"
```

---

### Task 2: Moduł `outfitFrames`

**Files:**
- Create: `src/sprites/outfitFrames.ts`
- Test: `tests/sprites/outfitFrames.test.ts`

Kontekst: `src/sprites/outfits.generated.json` (Task 1) ma postać `{"goth_lolita": {"frames": {"idle_front": {w,h,anchorX,foot,scale,head}, …}, "portraits": {"portrait_a": [w, h], …}}}`. `FrameMeta` i `FRAMES` są w `src/sprites/loader.ts`; `frames.generated.json` ma też `portraits` (`{nazwa: [w, h]}`). `import.meta.env.BASE_URL` działa w Vitest (jak w `loader.ts`).

- [ ] **Step 1: Napisz test**

```ts
import { describe, expect, it } from 'vitest';
import framesMeta from '../../src/sprites/frames.generated.json';
import { FRAMES } from '../../src/sprites/loader';
import {
  OUTFIT_IDS,
  hasOutfitFrames,
  outfitFrame,
  outfitPortrait,
  outfitSpriteNames,
  outfitSpriteUrl,
} from '../../src/sprites/outfitFrames';

describe('klatki strojów z arkuszy', () => {
  it('gotycka lolita ma klatki arkusza głównego, bez pominiętej fun_eat', () => {
    expect(OUTFIT_IDS).toContain('goth_lolita');
    expect(hasOutfitFrames('goth_lolita')).toBe(true);
    for (const n of ['idle_front', 'walk_a1', 'walk_a2', 'walk_a3', 'walk_a4', 'fun_wave', 'fun_talk']) {
      expect(outfitFrame('goth_lolita', n), n).not.toBeNull();
    }
    expect(outfitFrame('goth_lolita', 'fun_eat')).toBeNull();
  });

  it('brak stroju albo klatki — null (zostaje przemalowanie)', () => {
    expect(outfitFrame(null, 'idle_front')).toBeNull();
    expect(outfitFrame(undefined, 'idle_front')).toBeNull();
    expect(outfitFrame('dress_dots', 'idle_front')).toBeNull();
    expect(outfitFrame('goth_lolita', 'sit_idle_1')).toBeNull();
    expect(hasOutfitFrames('dress_dots')).toBe(false);
  });

  it('klucz i adres obrazka', () => {
    expect(outfitFrame('goth_lolita', 'idle_front')!.key).toBe('goth_lolita/idle_front');
    expect(outfitSpriteUrl('goth_lolita/idle_front')).toMatch(/sprites\/stroje\/goth_lolita\/idle_front\.png$/);
    expect(outfitSpriteNames()).toContain('goth_lolita/idle_front');
    expect(outfitSpriteNames()).toContain('goth_lolita/portrait_a');
  });

  it('portrety stroju', () => {
    const p = outfitPortrait('goth_lolita', 'portrait_a')!;
    expect(p.key).toBe('goth_lolita/portrait_a');
    expect(p.meta.w).toBeGreaterThan(0);
    expect(p.meta.scale).toBe(1);
    expect(outfitPortrait('goth_lolita', 'idle_front')).toBeNull();
    expect(outfitPortrait(null, 'portrait_a')).toBeNull();
  });

  it('każda klatka stroju ma klatkę bazową o podobnej wysokości, tę samą skalę i czubek głowy', () => {
    for (const id of OUTFIT_IDS) {
      for (const name of outfitSpriteNames().filter((k) => k.startsWith(`${id}/`)).map((k) => k.slice(id.length + 1))) {
        const p = outfitPortrait(id, name);
        if (p) {
          const [bw, bh] = (framesMeta.portraits as Record<string, number[]>)[name];
          expect(Math.abs(p.meta.w / bw - 1), name).toBeLessThanOrEqual(0.15);
          expect(Math.abs(p.meta.h / bh - 1), name).toBeLessThanOrEqual(0.15);
          continue;
        }
        const f = outfitFrame(id, name)!;
        const base = FRAMES[name]!;
        expect(base, name).toBeDefined();
        expect(f.meta.scale, name).toBe(base.scale);
        expect(Math.abs(f.meta.h / base.h - 1), name).toBeLessThanOrEqual(0.15);
        expect(f.meta.head, name).toBeDefined();
        expect(f.meta.mask, name).toBeUndefined();
      }
    }
  });
});
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npx vitest run tests/sprites/outfitFrames.test.ts`
Expected: FAIL (brak modułu `outfitFrames`).

- [ ] **Step 3: Napisz `src/sprites/outfitFrames.ts`**

```ts
import data from './outfits.generated.json';
import type { FrameMeta } from './loader';

/** Klatki jednego stroju wycięte z jego arkuszy (tools/extract_outfits.py). */
interface OutfitSheetData {
  frames: Record<string, FrameMeta>;
  /** Portrety: [szerokość, wysokość]. */
  portraits: Record<string, [number, number]>;
}

const OUTFITS = data as unknown as Record<string, OutfitSheetData>;

/** Stroje (id sukienki z katalogu), które mają klatki z arkuszy. */
export const OUTFIT_IDS: readonly string[] = Object.keys(OUTFITS);

/** Klatka stroju: klucz obrazka w mapie sprite'ów strojów (`<id>/<klatka>`) i jej metadane. */
export interface OutfitFrame {
  key: string;
  meta: FrameMeta;
}

/** Adres obrazka klatki albo portretu stroju. */
export const outfitSpriteUrl = (key: string): string => `${import.meta.env.BASE_URL}sprites/stroje/${key}.png`;

/** Klucze wszystkich obrazków strojów (klatki i portrety) — do wczytania przy starcie. */
export function outfitSpriteNames(): string[] {
  return OUTFIT_IDS.flatMap((id) => [
    ...Object.keys(OUTFITS[id].frames).map((n) => `${id}/${n}`),
    ...Object.keys(OUTFITS[id].portraits).map((n) => `${id}/${n}`),
  ]);
}

/** Klatka `name` w stroju `dress` (id sukienki) albo `null` — wtedy przemalowanie oryginału. */
export function outfitFrame(dress: string | null | undefined, name: string): OutfitFrame | null {
  const meta = dress ? OUTFITS[dress]?.frames[name] : undefined;
  return meta ? { key: `${dress}/${name}`, meta } : null;
}

/** Portret `name` w stroju `dress` albo `null`. */
export function outfitPortrait(dress: string | null | undefined, name: string): OutfitFrame | null {
  const size = dress ? OUTFITS[dress]?.portraits[name] : undefined;
  return size ? { key: `${dress}/${name}`, meta: { w: size[0], h: size[1], anchorX: 0, scale: 1 } } : null;
}

/** Czy strój ma klatki z arkusza (wtedy miniatura w Szafie to Gabi w tym stroju). */
export function hasOutfitFrames(id: string): boolean {
  return OUTFITS[id]?.frames.idle_front !== undefined;
}
```

- [ ] **Step 4: Testy i typy**

Run: `npx vitest run tests/sprites/outfitFrames.test.ts && npx tsc --noEmit -p .`
Expected: PASS, tsc bez błędów.

- [ ] **Step 5: Commit**

```bash
git add src/sprites/outfitFrames.ts tests/sprites/outfitFrames.test.ts
git commit -m "Stroje z arkuszy: moduł klatek strojów (outfitFrames)"
```

---

### Task 3: Klatki stroju w grze (`figures` + start)

**Files:**
- Modify: `src/wardrobe/figures.ts` (funkcje `createFigures`, `dressed`, `url`)
- Modify: `src/main.ts:145-150`

Kontekst: `figures` to jedyne źródło klatek Gabi w grze (pokój, Szafa, zajęcia, portrety). Dziś: obrazek z `sprites` + `dressPixels` (przemalowanie wg maski + ozdoba głowy). `dressPixels(src, null, meta, look, opts)` z metadanymi bez `mask` dokleja tylko ozdobę głowy (albo zwraca `null`, gdy nic nie zmienia). Moduł jest zależny od DOM (canvas) — bez testów jednostkowych; sprawdzenie w przeglądarce w Task 5.

- [ ] **Step 1: `figures.ts` — import i parametr**

Dodaj import:

```ts
import { outfitFrame, outfitPortrait, outfitSpriteUrl } from '../sprites/outfitFrames';
```

Zmień sygnaturę (nowy ostatni parametr):

```ts
export function createFigures(
  sprites: SpriteMap,
  masks: SpriteMap,
  outfit: () => Outfit,
  hats: SpriteMap = new Map(),
  outfitSprites: SpriteMap = new Map(),
): Figures {
```

W komentarzu nad funkcją dopisz zdanie: „Strój z arkuszy (`outfitFrames`) ma własne klatki — wtedy zamiast przemalowania rysujemy klatkę stroju (z ozdobą głowy).”

- [ ] **Step 2: `dressed` — klatka stroju przed przemalowaniem**

Zastąp całe ciało funkcji `dressed` tym:

```ts
  function dressed(name: string, opts: FigureOpts | undefined): { fig: Figure; url?: string } | null {
    const o = opts?.outfit ?? outfit();
    const portrait = PORTRAIT_MASKS.includes(name);
    const hat = (opts?.hat ?? true) && !portrait;
    const key = `${name}#${hat ? 1 : 0}#${outfitKey(o)}`;
    const hit = cache.get(key);
    if (hit !== undefined) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    // Strój z arkuszy: własna klatka (albo portret) zamiast przemalowania oryginału.
    const own = outfitPortrait(o.dress, name) ?? outfitFrame(o.dress, name);
    const ownImg = own ? outfitSprites.get(own.key) : undefined;
    const img = ownImg ?? sprites.get(name);
    const meta = ownImg ? own!.meta : FRAMES[name] ?? (img && portrait ? portraitMeta(img) : undefined);
    if (!img || !meta) return null;
    let entry: { fig: Figure; url?: string } | null = { fig: { img, meta }, url: ownImg ? outfitSpriteUrl(own!.key) : undefined };
    try {
      const mask = !ownImg && hasClothesMask(name) ? masks.get(name) : undefined;
      const art = (sprite: string) => {
        const h = hats.get(sprite);
        return h ? px(`hat:${sprite}`, h) : null;
      };
      const srcKey = ownImg ? `stroj:${own!.key}` : name;
      const r = dressPixels(px(srcKey, img), mask ? px(`mask:${name}`, mask) : null, meta, lookOf(o), { hat, seated: isSeated(name), art, back: isBackView(name) });
      if (r) entry = { fig: { img: canvasOf(r.px), meta: r.meta } };
    } catch (err) {
      // Bez canvasa (albo uszkodzona maska) zostaje oryginał — gra działa dalej.
      console.warn('figures', name, err);
    }
    cache.set(key, entry);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
    return entry;
  }
```

(Uwaga: `px(name, img)` cache'uje piksele po kluczu — klatka stroju musi mieć inny klucz niż oryginał, stąd `stroj:`.)

- [ ] **Step 3: `url` — gotowy adres obrazka stroju**

Zastąp metodę `url`:

```ts
    url(name, opts) {
      const e = dressed(name, opts);
      if (!e) return spriteUrl(name);
      if (e.url) return e.url;
      if (e.fig.img === sprites.get(name)) return spriteUrl(name);
      e.url = (e.fig.img as HTMLCanvasElement).toDataURL();
      return e.url;
    },
```

- [ ] **Step 4: `main.ts` — wczytanie obrazków strojów**

Dodaj import:

```ts
import { outfitSpriteNames, outfitSpriteUrl } from './sprites/outfitFrames';
```

Zmień blok wczytywania (`src/main.ts` ok. linii 145–150):

```ts
    const [sprites, masks, hats, outfitSprites] = await Promise.all([
      loadSprites([...names]),
      loadSprites(maskNames, maskUrl),
      loadSprites(headSpriteNames(), itemUrl),
      loadSprites(outfitSpriteNames(), outfitSpriteUrl),
    ]);
    const figures = createFigures(sprites, masks, () => store.get().outfit, hats, outfitSprites);
```

- [ ] **Step 5: Typy, testy, build**

Run: `npx tsc --noEmit -p . && npx vitest run && npm run build`
Expected: tsc czysto, wszystkie testy PASS, build OK. Sprawdź, że obrazki strojów są w precache: `grep -c "sprites/stroje/goth_lolita" dist/sw.js` → liczba > 0.

- [ ] **Step 6: Commit**

```bash
git add src/wardrobe/figures.ts src/main.ts
git commit -m "Stroje z arkuszy: klatki i portrety stroju zamiast przemalowania"
```

---

### Task 4: Miniatura w Szafie

**Files:**
- Modify: `src/ui/screens/wardrobe.ts` (funkcja `card`, ok. linii 160–168)

- [ ] **Step 1: Import**

```ts
import { hasOutfitFrames } from '../../sprites/outfitFrames';
```

- [ ] **Step 2: Miniatura = Gabi w stroju, gdy strój ma klatki z arkusza**

Zastąp tworzenie `thumb`:

```ts
    // Strój z arkuszy wygląda na Gabi jak na miniaturze — pokazujemy Gabi, a nie obrazek z wieszaka.
    const rack = def.thumb !== undefined && !hasOutfitFrames(def.id);
    const thumb = h('img', {
      class: rack ? 'px cloth-art' : 'px',
      src: rack ? itemUrl(def.thumb!) : app.figures.url('idle_front', { outfit: tryOn(s.outfit, def) }),
      alt: '',
      draggable: 'false',
    });
```

- [ ] **Step 3: Typy, testy**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: czysto, PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/wardrobe.ts
git commit -m "Stroje z arkuszy: miniatura stroju w Szafie to Gabi w tym stroju"
```

---

### Task 5 (kontroler): prompty, notatki, sprawdzenie w przeglądarce

**Files:**
- Create: `docs/prompty-stroje.md`
- Modify: `docs/NASTEPNA-SESJA.md` (nowa sekcja „Stroje z arkuszy”)

- [ ] **Step 1: `docs/prompty-stroje.md`** — instrukcja generowania: załącz oryginalny arkusz z gry jako szablon układu + arkusz główny stroju jako wzór wyglądu; „przerysuj ten arkusz bez zmian układu, póz, rekwizytów (kanapka, kubek, telefon, kot, ukulele, mikrofon…), podpisów i tła; zmień tylko ubranie Gabi na <opis stroju>; bez torby na ramieniu”. Nazwy plików `assets/source/stroje/<id>/<klucz>.jpg` i tabela arkuszy: `main` (sprite-sheet.jpg), `turnaround`, `back`, `status`, `expressions`, `sitting`, `table`, `lying`, `hobby`, `nursing` (liczą się tylko klatki nauki — opieka nad chorą jest w innym stroju), `cat`, `drink`, `drag`, `plants2`, `karaoke`, `ukulele`, `teethcomb`, `laundry`, `birthday` — z plikiem oryginału przy każdym. Bez `bed`, `bathroom`, `bathfoam`, `showerglass` (piżama, ręcznik, piana). Po dodaniu pliku: wpis w `outfits.<id>.sheets` w `tools/frames.json` i `/c/gvenv/Scripts/python tools/extract_outfits.py`.
- [ ] **Step 2: Notatki** w `docs/NASTEPNA-SESJA.md`: stan pilotażu, polecenia, gdzie podgląd.
- [ ] **Step 3: Przeglądarka** (`preview_start gabigochi`, `?play&monety=9000`): Szafa — miniatura gotyckiej lolity = Gabi w stroju; kupno/założenie; podgląd i „Pokaż spacer”; pokój — chodzenie, machanie, rozmowa w stroju z arkusza, siedzenie i inne zajęcia — przemalowanie; avatar w rogu — portret w stroju; ozdoba głowy (np. kokardka) na klatkach stroju; brak błędów w konsoli. Zrzuty dla użytkownika.
- [ ] **Step 4: Commit** dokumentów.
