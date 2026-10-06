# Gabigochi — etap 1 (wersja na urodziny) — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA „Gabigochi” na iPhone'a — pixelartowa Gabriela jako zwierzak w stylu Pou: potrzeby, monety, sklep z jedzeniem (z KitKatem), ekran urodzinowy i trzy minigry (Łapanie jedzenia, Zdmuchnij świeczki, Memory), wdrożona na GitHub Pages.

**Architecture:** Vite + TypeScript bez frameworka. Czysta, testowalna logika w `src/core`, `src/pet/brain.ts` i plikach `*Logic.ts` gier; cienka warstwa DOM/canvas w `src/ui`, `src/pet`, `src/games`. Sprite'y wycinane jednorazowo skryptem Pythona z arkusza JPG do natywnych PNG; animacje opisane w `animations.json`. Stan w `localStorage`, czas offline liczony z różnicy znaczników czasu.

**Tech Stack:** Vite, TypeScript, Vitest, vite-plugin-pwa (Workbox), @fontsource/pixelify-sans, Python 3.13 + Pillow + numpy (narzędzia), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-06-urodzinowe-tamagotchi-design.md`

**Konwencje:**
- System: Windows, polecenia w Git Bash. Python narzędzi: `tools/.venv/Scripts/python`.
- Każdy commit kończy się linią `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (drugie `-m`).
- Teksty w UI po polsku, formy żeńskie dla Gabi („jestem głodna”).
- Poza zakresem etapu 1 (etap 2): Bricks n Balls, Sudoku, Szyfrokrzyżówki, dodatki/Szafa, mruganie postaci.

---

## Mapa plików

```
index.html                         meta iOS, kontener #app
package.json, tsconfig.json, vite.config.ts
.github/workflows/deploy.yml       build + test + GitHub Pages
.claude/launch.json                serwer podglądu
tools/requirements.txt             pillow, numpy
tools/frames.json                  prostokąty klatek w arkuszu
tools/extract_sprites.py           arkusz JPG → public/sprites/*.png + src/sprites/frames.generated.json
tools/make_icons.py                portret → public/icons/*.png
public/sprites/*.png               (generowane, commitowane)
public/icons/*.png                 (generowane, commitowane)
src/main.ts                        start aplikacji, PWA, tyknięcia zegara
src/app.ts                         router ekranów + kontekst App
src/content.ts                     imię, życzenia, kwestie postaci
src/core/config.ts                 liczby balansu + lista jedzenia
src/core/types.ts                  GameState, Needs, GameResult, MoodLevel
src/core/time.ts                   dayKey, dayNumber
src/core/state.ts                  createState
src/core/needs.ts                  applyElapsed, moodLevel, needStatus
src/core/economy.ts                buyFood, priceOf, feed, claimDailyBonus, petCharacter, applyGameResult, setSleeping
src/core/save.ts                   loadState, saveState (z kopią zapasową)
src/core/store.ts                  Store: stan + subskrypcje + autozapis
src/art/pixels.ts                  paleta, rysowanie pixel artu, cache canvas/dataURL
src/art/icons.ts                   ikony pixel art jako tablice znaków
src/sprites/animations.json        manifest animacji
src/sprites/animations.ts          resolveAnimation, frameAt, allFrameNames
src/sprites/loader.ts              loadSprites, spriteUrl
src/sprites/frames.generated.json  (generowany) rozmiar płótna klatek
src/pet/brain.ts                   maszyna stanów postaci (czysta)
src/pet/speech.ts                  pick, pickLine
src/pet/room.ts                    rysowanie pokoju
src/pet/petRenderer.ts             rysowanie postaci (bob, squash, skok, odbicie)
src/ui/dom.ts                      h(), icon()
src/ui/transition.ts               pixelTransition, animate, reducedMotion
src/ui/toast.ts, confetti.ts, coinCounter.ts, needBar.ts, dialog.ts, screenHeader.ts, comingSoon.ts, fridge.ts, install.ts
src/ui/screens/room.ts, shop.ts, games.ts, profile.ts, birthday.ts, wardrobe.ts
src/games/types.ts                 MiniGame, GameEnv
src/games/shell.ts                 runGame: nakładka, HUD, panel końca
src/games/canvas.ts                makeCanvas, runLoop
src/games/rewards.ts               nagrody (czyste)
src/games/catchLogic.ts + catchGame.ts
src/games/candlesLogic.ts + candlesGame.ts
src/games/memoryLogic.ts + memoryGame.ts
src/games/index.ts                 GAMES, COMING_SOON
src/styles/theme.css, components.css, screens.css, games.css
tests/**                           Vitest
```

---

### Task 1: Szkielet projektu

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts` (tymczasowy), `tests/sanity.test.ts`

- [ ] **Step 1: Zainicjuj npm i zainstaluj zależności**

```bash
npm init -y
npm install -D vite typescript vitest vite-plugin-pwa
npm install @fontsource/pixelify-sans
```

- [ ] **Step 2: Nadpisz `package.json` (zachowaj wersje z `dependencies`/`devDependencies` wpisane przez npm)**

Ustaw pola:
```json
{
  "name": "gabigochi",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host",
    "test": "vitest run",
    "sprites": "tools/.venv/Scripts/python tools/extract_sprites.py && tools/.venv/Scripts/python tools/make_icons.py"
  }
}
```
Usuń pola `main`, `keywords`, `author`, `license`, `description` dodane przez `npm init`.

- [ ] **Step 3: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 4: `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'sprites/*.png'],
      manifest: {
        name: 'Gabigochi',
        short_name: 'Gabigochi',
        lang: 'pl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#2a1f3d',
        theme_color: '#2a1f3d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,woff2,json}'] },
    }),
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 5: `index.html`**

```html
<!doctype html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#2a1f3d" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Gabigochi" />
  <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
  <link rel="icon" type="image/png" href="icons/favicon-32.png" />
  <title>Gabigochi</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: `.gitignore`**

```
node_modules/
dist/
dev-dist/
tools/.venv/
tools/out/
__pycache__/
```

- [ ] **Step 7: Tymczasowy `src/main.ts` i test sanity**

`src/main.ts`:
```ts
document.getElementById('app')!.textContent = 'Gabigochi';
```

`tests/sanity.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

describe('sanity', () => {
  it('działa', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Sprawdź test i build**

Run: `npm test`
Expected: `1 passed`

Run: `npm run build`
Expected: kończy się bez błędów, powstaje `dist/`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Szkielet projektu Vite + TS + PWA" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Wycinanie sprite'ów z arkusza

**Files:**
- Create: `tools/requirements.txt`, `tools/frames.json`, `tools/extract_sprites.py`
- Generated: `public/sprites/*.png`, `src/sprites/frames.generated.json`, `tools/out/preview.png`

Kontekst: arkusz `assets/source/sprite-sheet.jpg` (768×1024, tło RGB 207,210,215). Rzędy mają różną skalę (okres siatki pikseli: IDLE ≈3,93 px, WALK A ≈3,05, WALK B ≈3,5, SPECIAL ≈4,82), więc każdą klatkę próbkujemy tak, by postać miała 56 natywnych pikseli wysokości. Prostokąty poniżej zmierzono analizą komponentów spójnych.

- [ ] **Step 1: `tools/requirements.txt` i środowisko**

```
pillow>=12
numpy>=2
```

```bash
python -m venv tools/.venv
tools/.venv/Scripts/python -m pip install -q -r tools/requirements.txt
```

- [ ] **Step 2: `tools/frames.json`**

Wpis klatki to `[x0, y0, x1, y1]` w domyślnym arkuszu albo obiekt `{"sheet": "...", "rect": [...], "background": [r,g,b]}` — tak dodaje się przyszłe animacje z innych plików.

```json
{
  "sheet": "assets/source/sprite-sheet.jpg",
  "background": [207, 210, 215],
  "bodyHeight": 56,
  "portraitPeriod": 4.0,
  "paletteSize": 40,
  "anchorRows": 8,
  "body": {
    "idle_front": [34, 47, 127, 266],
    "idle_side": [203, 47, 279, 266],
    "idle_back": [348, 47, 436, 266],
    "walk_a1": [46, 309, 126, 479],
    "walk_a2": [194, 309, 276, 478],
    "walk_a3": [336, 309, 420, 478],
    "walk_a4": [491, 309, 561, 482],
    "walk_a5": [637, 309, 721, 482],
    "walk_b1": [38, 489, 135, 683],
    "walk_b2": [190, 489, 279, 682],
    "walk_b3": [335, 486, 424, 686],
    "walk_b4": [488, 489, 568, 686],
    "walk_b5": [636, 493, 722, 682],
    "fun_wave": [22, 731, 135, 1000],
    "fun_eat": [178, 731, 275, 1000],
    "fun_talk": [315, 731, 460, 1000]
  },
  "portraits": {
    "portrait_a": [507, 40, 753, 290],
    "portrait_b": [491, 726, 747, 997]
  }
}
```

- [ ] **Step 3: `tools/extract_sprites.py`**

```python
"""Wycina klatki postaci z arkusza i zapisuje czyste PNG w natywnej rozdzielczości.

Użycie: tools/.venv/Scripts/python tools/extract_sprites.py
Konfiguracja: tools/frames.json
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / 'tools' / 'frames.json').read_text(encoding='utf-8'))
OUT_DIR = ROOT / 'public' / 'sprites'
META_PATH = ROOT / 'src' / 'sprites' / 'frames.generated.json'
PREVIEW = ROOT / 'tools' / 'out' / 'preview.png'
NEIGH4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
NEIGH8 = tuple((dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
_sheets = {}


def sheet(path):
    if path not in _sheets:
        _sheets[path] = np.asarray(Image.open(ROOT / path).convert('RGB')).astype(float)
    return _sheets[path]


def entry(spec):
    """Wpis klatki: [x0,y0,x1,y1] albo {"sheet":..., "rect":[...], "background":[r,g,b]}."""
    if isinstance(spec, list):
        return CFG['sheet'], spec, CFG['background']
    return spec.get('sheet', CFG['sheet']), spec['rect'], spec.get('background', CFG['background'])


def components(mask, neigh):
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue = deque([(y, x)])
                comp = []
                while queue:
                    cy, cx = queue.popleft()
                    comp.append((cy, cx))
                    for dy, dx in neigh:
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((ny, nx))
                yield comp


def tight_box(img, rect, bg):
    """Ramka największego spójnego obiektu w prostokącie (odrzuca podpisy typu '1.')."""
    x0, y0, x1, y1 = rect
    mask = np.abs(img[y0:y1 + 1, x0:x1 + 1] - bg).sum(axis=2) > 40
    best = max(components(mask, NEIGH8), key=len)
    ys = [p[0] for p in best]
    xs = [p[1] for p in best]
    return x0 + min(xs), y0 + min(ys), x0 + max(xs), y0 + max(ys)


def best_offset(grad, period):
    def score(offset):
        idx = np.round(offset + np.arange(int((len(grad) - offset) / period)) * period).astype(int)
        return grad[idx[idx < len(grad)]].sum()
    return max(np.arange(0, period, 0.25), key=score)


def sample(img, box, period):
    """Próbkuje siatkę pikseli o danym okresie: mediana środka każdej komórki."""
    x0, y0, x1, y1 = box
    pad = int(period * 2)
    reg = img[max(0, y0 - pad):y1 + pad + 1, max(0, x0 - pad):x1 + pad + 1]
    gx = np.abs(np.diff(reg, axis=1)).sum(axis=(0, 2))
    gy = np.abs(np.diff(reg, axis=0)).sum(axis=(1, 2))
    ox = best_offset(gx, period) + 1
    oy = best_offset(gy, period) + 1
    w = int((reg.shape[1] - ox) / period)
    h = int((reg.shape[0] - oy) / period)
    out = np.zeros((h, w, 3))
    inset = period * 0.25
    for j in range(h):
        ya = int(round(oy + j * period + inset))
        yb = max(ya + 1, int(round(oy + (j + 1) * period - inset)))
        for i in range(w):
            xa = int(round(ox + i * period + inset))
            xb = max(xa + 1, int(round(ox + (i + 1) * period - inset)))
            out[j, i] = np.median(reg[ya:yb, xa:xb].reshape(-1, 3), axis=0)
    return out


def background_mask(cells, bg):
    near = np.abs(cells - bg).sum(axis=2) < 30
    h, w = near.shape
    mask = np.zeros((h, w), bool)
    for comp in components(near, NEIGH4):
        touches_edge = any(y in (0, h - 1) or x in (0, w - 1) for y, x in comp)
        if touches_edge or len(comp) >= 6:
            for p in comp:
                mask[p] = True
    for comp in components(~mask, NEIGH8):
        if len(comp) < 12:
            for p in comp:
                mask[p] = True
    return mask


def kmeans(px, k, iters=15):
    rng = np.random.default_rng(1)
    centers = px[rng.choice(len(px), k, replace=False)].copy()
    for _ in range(iters):
        labels = ((px[:, None] - centers[None]) ** 2).sum(axis=2).argmin(axis=1)
        for i in range(k):
            sel = px[labels == i]
            if len(sel):
                centers[i] = sel.mean(axis=0)
    return centers


def to_rgba(cells, mask, palette):
    idx = ((cells[:, :, None, :] - palette[None, None]) ** 2).sum(axis=3).argmin(axis=2)
    rgb = palette[idx].round().astype(np.uint8)
    alpha = np.where(mask, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    return img.crop(img.getbbox())


def anchor_x(img):
    """Środek czubka głowy (pierwsze wiersze) — stabilny punkt między klatkami."""
    alpha = np.asarray(img)[:CFG['anchorRows'], :, 3]
    xs = np.nonzero(alpha)[1]
    return float(xs.mean()) if len(xs) else img.width / 2


def save_preview(images):
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    scaled = [im.resize((im.width * 3, im.height * 3), Image.NEAREST) for im in images]
    width = sum(im.width + 10 for im in scaled) + 10
    sheet_img = Image.new('RGBA', (width, max(im.height for im in scaled) + 20), (255, 255, 255, 255))
    x = 10
    for im in scaled:
        sheet_img.alpha_composite(im, (x, 10))
        x += im.width + 10
    sheet_img.save(PREVIEW)


def main():
    raw = {}
    for group in ('body', 'portraits'):
        for name, spec in CFG[group].items():
            path, rect, bg = entry(spec)
            img = sheet(path)
            bg = np.array(bg, float)
            box = tight_box(img, rect, bg)
            period = (box[3] - box[1] + 1) / CFG['bodyHeight'] if group == 'body' else CFG['portraitPeriod']
            cells = sample(img, box, period)
            raw[name] = (group, cells, background_mask(cells, bg))
            print(f'{name:12s} okres={period:.2f} komórki={cells.shape[1]}x{cells.shape[0]}')

    pixels = np.concatenate([c[~m] for _, c, m in raw.values()])
    palette = kmeans(pixels, CFG['paletteSize'])
    images = {name: (group, to_rgba(c, m, palette)) for name, (group, c, m) in raw.items()}

    body = {n: im for n, (g, im) in images.items() if g == 'body'}
    anchors = {n: anchor_x(im) for n, im in body.items()}
    half = max(max(a, im.width - a) for a, im in ((anchors[n], body[n]) for n in body))
    cw = int(np.ceil(half)) * 2 + 2
    ch = max(im.height for im in body.values())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    framed = []
    for name, im in body.items():
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.alpha_composite(im, (int(round(cw / 2 - anchors[name])), ch - im.height))
        canvas.save(OUT_DIR / f'{name}.png')
        framed.append(canvas)

    portraits = {}
    for name, (group, im) in images.items():
        if group == 'portraits':
            im.save(OUT_DIR / f'{name}.png')
            portraits[name] = [im.width, im.height]
            framed.append(im)

    META_PATH.parent.mkdir(parents=True, exist_ok=True)
    META_PATH.write_text(json.dumps({'canvas': [cw, ch], 'body': sorted(body), 'portraits': portraits}, indent=2) + '\n', encoding='utf-8')
    save_preview(framed)
    print(f'Płótno klatek: {cw}x{ch}. Podgląd: {PREVIEW}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: Uruchom i obejrzyj podgląd**

Run: `tools/.venv/Scripts/python tools/extract_sprites.py`
Expected: 18 linii `nazwa okres=… komórki=…`, potem `Płótno klatek: WxH` (szerokość ok. 40–50, wysokość 56–57).

Otwórz `tools/out/preview.png` (narzędzie Read) i sprawdź:
- wszystkie klatki ciała mają tę samą wysokość, stopy na dole, głowy w jednej linii;
- fioletowe pasemka włosów i czerwony nadruk koszulki są widoczne;
- brak cyfr „1.”, „2.”, „3.” i resztek napisu PORTRAIT;
- `walk_a1`…`walk_a4` patrzą w lewo i tworzą płynny cykl kroków. Jeśli kolejność kroków jest inna — zanotuj właściwą, użyjesz jej w Task 10 (manifest).

- [ ] **Step 5: Commit**

```bash
git add tools/requirements.txt tools/frames.json tools/extract_sprites.py public/sprites src/sprites/frames.generated.json
git commit -m "Narzędzie do wycinania sprite'ów + wygenerowane klatki" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Ikony aplikacji z portretu

**Files:**
- Create: `tools/make_icons.py`
- Generated: `public/icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon-32.png`

- [ ] **Step 1: `tools/make_icons.py`**

```python
"""Generuje ikony aplikacji z portretu.

Użycie: tools/.venv/Scripts/python tools/make_icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'sprites' / 'portrait_a.png'
OUT = ROOT / 'public' / 'icons'
BG = (59, 42, 92, 255)  # #3b2a5c
INSET = 5  # grubość ramki portretu w pikselach natywnych
SIZES = ((180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png'), (32, 'favicon-32.png'))


def main():
    portrait = Image.open(SRC).convert('RGBA')
    face = portrait.crop((INSET, INSET, portrait.width - INSET, portrait.height - INSET))
    side = max(face.size)
    square = Image.new('RGBA', (side, side), BG)
    square.alpha_composite(face, ((side - face.width) // 2, side - face.height))
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in SIZES:
        if size < side:
            icon = square.resize((size, size), Image.LANCZOS)
        else:
            scale = size // side
            big = square.resize((side * scale, side * scale), Image.NEAREST)
            icon = Image.new('RGBA', (size, size), BG)
            icon.alpha_composite(big, ((size - big.width) // 2, size - big.height))
        icon.convert('RGB').save(OUT / name)
        print(f'{name}: {size}x{size}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Uruchom i obejrzyj**

Run: `tools/.venv/Scripts/python tools/make_icons.py`
Expected: 4 linie z rozmiarami.

Otwórz `public/icons/icon-512.png`: twarz Gabi na fioletowym tle, bez resztek ramki portretu na krawędziach. Jeśli ramka wystaje — zwiększ `INSET` o 1–2 i uruchom ponownie.

- [ ] **Step 3: Commit**

```bash
git add tools/make_icons.py public/icons
git commit -m "Ikony aplikacji z portretu" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Konfiguracja, typy, czas i stan początkowy

**Files:**
- Create: `src/core/config.ts`, `src/core/types.ts`, `src/core/time.ts`, `src/core/state.ts`
- Test: `tests/core/time.test.ts`, `tests/core/state.test.ts`

- [ ] **Step 1: Napisz testy**

`tests/core/time.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { dayKey, dayNumber } from '../../src/core/time';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('dayKey', () => {
  it('formatuje lokalną datę', () => {
    expect(dayKey(at(2026, 10, 6, 23))).toBe('2026-10-06');
    expect(dayKey(at(2026, 1, 9, 0))).toBe('2026-01-09');
  });
});

describe('dayNumber', () => {
  it('dzień utworzenia to dzień 1', () => {
    expect(dayNumber(at(2026, 10, 6, 8), at(2026, 10, 6, 22))).toBe(1);
  });
  it('liczy dni kalendarzowe, nie pełne doby', () => {
    expect(dayNumber(at(2026, 10, 6, 23), at(2026, 10, 7, 1))).toBe(2);
    expect(dayNumber(at(2026, 10, 6), at(2026, 10, 16))).toBe(11);
  });
});
```

`tests/core/state.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import { CONFIG } from '../../src/core/config';
import { dayKey } from '../../src/core/time';

describe('createState', () => {
  it('tworzy stan startowy z prezentem urodzinowym', () => {
    const now = new Date(2026, 9, 6, 12).getTime();
    const s = createState(now);
    expect(s.version).toBe(1);
    expect(s.coins).toBe(150);
    expect(s.needs).toEqual(CONFIG.startNeeds);
    expect(s.fridge.kitkat).toBe(1);
    expect(s.lastDailyBonus).toBe(dayKey(now));
    expect(s.sleeping).toBe(false);
    expect(s.seenBirthday).toBe(false);
    expect(s.createdAt).toBe(now);
    expect(s.lastUpdate).toBe(now);
  });
});
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npx vitest run tests/core`
Expected: FAIL — `Cannot find module '../../src/core/time'`.

- [ ] **Step 3: Implementacja**

`src/core/config.ts`:
```ts
export const CONFIG = {
  needs: {
    max: 100,
    awakeDecayPerHour: { hunger: 6, mood: 4, energy: 5 },
    sleepDecayPerHour: { hunger: 3, mood: 2 },
    sleepEnergyGainPerHour: 15,
    moodHappyAbove: 60,
    moodSadBelow: 30,
    hungryBelow: 25,
    sleepyBelow: 20,
    boredBelow: 25,
  },
  startNeeds: { hunger: 80, mood: 90, energy: 90 },
  coins: { start: 150, dailyBonus: 20 },
  pet: { moodGain: 2, cooldownMs: 30_000 },
  games: { energyCost: 5, tiredBelow: 10 },
} as const;

export type FoodId = 'apple' | 'sandwich' | 'kitkat' | 'pizza' | 'cake';

export interface FoodDef {
  id: FoodId;
  name: string;
  price: number;
  hunger: number;
  mood: number;
}

export const FOODS: readonly FoodDef[] = [
  { id: 'apple', name: 'Jabłko', price: 5, hunger: 10, mood: 0 },
  { id: 'sandwich', name: 'Kanapka', price: 10, hunger: 20, mood: 0 },
  { id: 'kitkat', name: 'KitKat', price: 15, hunger: 15, mood: 25 },
  { id: 'pizza', name: 'Pizza', price: 20, hunger: 35, mood: 5 },
  { id: 'cake', name: 'Tort urodzinowy', price: 40, hunger: 30, mood: 20 },
];

export function foodById(id: FoodId): FoodDef {
  const food = FOODS.find((f) => f.id === id);
  if (!food) throw new Error(`Nieznane jedzenie: ${id}`);
  return food;
}
```

`src/core/types.ts`:
```ts
import type { FoodId } from './config';

export interface Needs {
  hunger: number;
  mood: number;
  energy: number;
}

export type MoodLevel = 'happy' | 'ok' | 'sad';

export interface GameState {
  version: 1;
  createdAt: number;
  lastUpdate: number;
  needs: Needs;
  coins: number;
  fridge: Partial<Record<FoodId, number>>;
  sleeping: boolean;
  lastDailyBonus: string;
  lastFreeKitkat: string | null;
  lastPetAt: number;
  seenBirthday: boolean;
  records: Record<string, number>;
}

export interface GameResult {
  gameId: string;
  score: number;
  coins: number;
  moodBoost: number;
  aborted: boolean;
}
```

`src/core/time.ts`:
```ts
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** Klucz dnia w lokalnej strefie czasowej, np. "2026-10-06". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Numer dnia życia zwierzaka: dzień utworzenia = 1. */
export function dayNumber(createdAt: number, now: number): number {
  const a = new Date(createdAt);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / DAY) + 1;
}
```

`src/core/state.ts`:
```ts
import { CONFIG } from './config';
import { dayKey } from './time';
import type { GameState } from './types';

export function createState(now: number): GameState {
  return {
    version: 1,
    createdAt: now,
    lastUpdate: now,
    needs: { ...CONFIG.startNeeds },
    coins: CONFIG.coins.start,
    fridge: { kitkat: 1 },
    sleeping: false,
    lastDailyBonus: dayKey(now),
    lastFreeKitkat: null,
    lastPetAt: 0,
    seenBirthday: false,
    records: {},
  };
}
```

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run tests/core`
Expected: PASS (4 testy).

- [ ] **Step 5: Commit**

```bash
git add src/core tests/core
git commit -m "Konfiguracja, typy, czas i stan początkowy" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Potrzeby i upływ czasu

**Files:**
- Create: `src/core/needs.ts`
- Test: `tests/core/needs.test.ts`

- [ ] **Step 1: Testy**

`tests/core/needs.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { applyElapsed, moodLevel, needStatus } from '../../src/core/needs';
import { createState } from '../../src/core/state';
import { HOUR } from '../../src/core/time';

const T0 = new Date(2026, 9, 6, 12).getTime();

describe('applyElapsed', () => {
  it('na jawie: godzina zmniejsza potrzeby', () => {
    const s = applyElapsed(createState(T0), T0 + HOUR);
    expect(s.needs.hunger).toBeCloseTo(74);
    expect(s.needs.mood).toBeCloseTo(86);
    expect(s.needs.energy).toBeCloseTo(85);
    expect(s.lastUpdate).toBe(T0 + HOUR);
  });

  it('3 dni offline: potrzeby nie schodzą poniżej zera', () => {
    const s = applyElapsed(createState(T0), T0 + 72 * HOUR);
    expect(s.needs).toEqual({ hunger: 0, mood: 0, energy: 0 });
  });

  it('sen: energia rośnie, głód i humor spadają wolniej', () => {
    const start = { ...createState(T0), sleeping: true, needs: { hunger: 80, mood: 90, energy: 50 } };
    const s = applyElapsed(start, T0 + 2 * HOUR);
    expect(s.needs.energy).toBeCloseTo(80);
    expect(s.needs.hunger).toBeCloseTo(74);
    expect(s.needs.mood).toBeCloseTo(86);
    expect(s.sleeping).toBe(true);
  });

  it('sen: budzi się przy pełnej energii, resztę czasu liczy na jawie', () => {
    const start = { ...createState(T0), sleeping: true, needs: { hunger: 80, mood: 90, energy: 40 } };
    const s = applyElapsed(start, T0 + 10 * HOUR);
    expect(s.sleeping).toBe(false);
    expect(s.needs.energy).toBeCloseTo(70);
    expect(s.needs.hunger).toBeCloseTo(32);
    expect(s.needs.mood).toBeCloseTo(58);
  });

  it('brak upływu czasu zwraca ten sam obiekt', () => {
    const s = createState(T0);
    expect(applyElapsed(s, T0)).toBe(s);
    expect(applyElapsed(s, T0 - 1000)).toBe(s);
  });
});

describe('moodLevel', () => {
  it('zależy od najniższej potrzeby', () => {
    expect(moodLevel({ hunger: 70, mood: 90, energy: 61 })).toBe('happy');
    expect(moodLevel({ hunger: 30, mood: 90, energy: 90 })).toBe('ok');
    expect(moodLevel({ hunger: 90, mood: 90, energy: 29 })).toBe('sad');
  });
});

describe('needStatus', () => {
  it('flaguje niskie potrzeby', () => {
    expect(needStatus({ hunger: 24, mood: 24, energy: 19 })).toEqual({ hungry: true, bored: true, sleepy: true });
    expect(needStatus({ hunger: 25, mood: 25, energy: 20 })).toEqual({ hungry: false, bored: false, sleepy: false });
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/core/needs.test.ts`
Expected: FAIL — brak modułu `needs`.

- [ ] **Step 3: Implementacja `src/core/needs.ts`**

```ts
import { CONFIG } from './config';
import { HOUR } from './time';
import type { GameState, MoodLevel, Needs } from './types';

const clamp = (v: number) => Math.max(0, Math.min(CONFIG.needs.max, v));

/** Przelicza potrzeby za czas od ostatniej aktualizacji (także gdy aplikacja była zamknięta). */
export function applyElapsed(state: GameState, now: number): GameState {
  const dtMs = now - state.lastUpdate;
  if (dtMs <= 0) return state;
  const n = CONFIG.needs;
  let hours = dtMs / HOUR;
  let { hunger, mood, energy } = state.needs;
  let sleeping = state.sleeping;

  if (sleeping) {
    const toFull = Math.max(0, (n.max - energy) / n.sleepEnergyGainPerHour);
    const sleepHours = Math.min(hours, toFull);
    energy += sleepHours * n.sleepEnergyGainPerHour;
    hunger -= sleepHours * n.sleepDecayPerHour.hunger;
    mood -= sleepHours * n.sleepDecayPerHour.mood;
    hours -= sleepHours;
    if (toFull <= dtMs / HOUR) {
      energy = n.max;
      sleeping = false;
    }
  }

  if (!sleeping && hours > 0) {
    hunger -= hours * n.awakeDecayPerHour.hunger;
    mood -= hours * n.awakeDecayPerHour.mood;
    energy -= hours * n.awakeDecayPerHour.energy;
  }

  return {
    ...state,
    lastUpdate: now,
    sleeping,
    needs: { hunger: clamp(hunger), mood: clamp(mood), energy: clamp(energy) },
  };
}

export function moodLevel(needs: Needs): MoodLevel {
  const lowest = Math.min(needs.hunger, needs.mood, needs.energy);
  if (lowest > CONFIG.needs.moodHappyAbove) return 'happy';
  if (lowest < CONFIG.needs.moodSadBelow) return 'sad';
  return 'ok';
}

export function needStatus(needs: Needs): { hungry: boolean; bored: boolean; sleepy: boolean } {
  return {
    hungry: needs.hunger < CONFIG.needs.hungryBelow,
    bored: needs.mood < CONFIG.needs.boredBelow,
    sleepy: needs.energy < CONFIG.needs.sleepyBelow,
  };
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npx vitest run tests/core/needs.test.ts`
Expected: PASS (7 testów).

- [ ] **Step 5: Commit**

```bash
git add src/core/needs.ts tests/core/needs.test.ts
git commit -m "Potrzeby i upływ czasu offline" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ekonomia — sklep, karmienie, bonusy, wyniki gier

**Files:**
- Create: `src/core/economy.ts`
- Test: `tests/core/economy.test.ts`

- [ ] **Step 1: Testy**

`tests/core/economy.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  applyGameResult, buyFood, claimDailyBonus, feed, petCharacter, priceOf, setSleeping,
} from '../../src/core/economy';
import { createState } from '../../src/core/state';
import { DAY } from '../../src/core/time';
import type { GameState } from '../../src/core/types';

const T0 = new Date(2026, 9, 6, 12).getTime();
const base = (patch: Partial<GameState> = {}): GameState => ({ ...createState(T0), ...patch });

describe('buyFood', () => {
  it('kupuje jabłko za 5 monet do lodówki', () => {
    const r = buyFood(base(), 'apple', T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.coins).toBe(145);
    expect(r.state.fridge.apple).toBe(1);
  });

  it('odmawia przy braku monet', () => {
    const s = base({ coins: 3 });
    const r = buyFood(s, 'apple', T0);
    expect(r).toEqual({ ok: false, reason: 'no-coins' });
  });

  it('KitKat raz dziennie gratis', () => {
    const s0 = base();
    expect(priceOf(s0, 'kitkat', T0)).toBe(0);
    const r1 = buyFood(s0, 'kitkat', T0);
    if (!r1.ok) throw new Error('powinno się udać');
    expect(r1.state.coins).toBe(150);
    expect(r1.state.fridge.kitkat).toBe(2);
    expect(priceOf(r1.state, 'kitkat', T0)).toBe(15);
    const r2 = buyFood(r1.state, 'kitkat', T0 + 1000);
    if (!r2.ok) throw new Error('powinno się udać');
    expect(r2.state.coins).toBe(135);
    expect(priceOf(r2.state, 'kitkat', T0 + DAY)).toBe(0);
  });
});

describe('feed', () => {
  it('karmi i zdejmuje z lodówki', () => {
    const s = base({ fridge: { apple: 2 }, needs: { hunger: 50, mood: 50, energy: 50 } });
    const r = feed(s, 'apple');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.needs.hunger).toBe(60);
    expect(r.state.fridge.apple).toBe(1);
  });

  it('ostatnia sztuka znika z lodówki', () => {
    const r = feed(base({ fridge: { apple: 1 } }), 'apple');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.fridge.apple).toBeUndefined();
  });

  it('KitKat mocno podnosi humor, wartości do 100', () => {
    const s = base({ fridge: { kitkat: 1 }, needs: { hunger: 95, mood: 50, energy: 50 } });
    const r = feed(s, 'kitkat');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.needs.hunger).toBe(100);
    expect(r.state.needs.mood).toBe(75);
  });

  it('pusta lodówka', () => {
    expect(feed(base({ fridge: {} }), 'pizza')).toEqual({ ok: false, reason: 'empty' });
  });

  it('karmienie budzi', () => {
    const r = feed(base({ sleeping: true }), 'kitkat');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.sleeping).toBe(false);
  });
});

describe('claimDailyBonus', () => {
  it('ten sam dzień — brak bonusu', () => {
    const s = base();
    const r = claimDailyBonus(s, T0 + 1000);
    expect(r.granted).toBe(false);
    expect(r.state).toBe(s);
  });
  it('nowy dzień — +20 monet', () => {
    const r = claimDailyBonus(base(), T0 + DAY);
    expect(r.granted).toBe(true);
    expect(r.state.coins).toBe(170);
    expect(r.state.lastDailyBonus).not.toBe(base().lastDailyBonus);
  });
});

describe('petCharacter', () => {
  it('głaskanie z limitem co 30 s', () => {
    const s = base({ needs: { hunger: 50, mood: 50, energy: 50 } });
    const r1 = petCharacter(s, T0);
    expect(r1.accepted).toBe(true);
    expect(r1.state.needs.mood).toBe(52);
    const r2 = petCharacter(r1.state, T0 + 10_000);
    expect(r2.accepted).toBe(false);
    expect(r2.state).toBe(r1.state);
    expect(petCharacter(r1.state, T0 + 30_000).accepted).toBe(true);
  });
});

describe('applyGameResult', () => {
  const result = { gameId: 'catch', score: 120, coins: 12, moodBoost: 10, aborted: false };
  it('nalicza monety, humor, koszt energii i rekord', () => {
    const s = base({ needs: { hunger: 50, mood: 50, energy: 50 }, records: { catch: 100 } });
    const r = applyGameResult(s, result);
    expect(r.coins).toBe(162);
    expect(r.needs.mood).toBe(60);
    expect(r.needs.energy).toBe(45);
    expect(r.records.catch).toBe(120);
  });
  it('nie obniża rekordu', () => {
    const r = applyGameResult(base({ records: { catch: 500 } }), result);
    expect(r.records.catch).toBe(500);
  });
  it('przerwana gra nic nie zmienia', () => {
    const s = base();
    expect(applyGameResult(s, { ...result, aborted: true })).toBe(s);
  });
});

describe('setSleeping', () => {
  it('przełącza sen', () => {
    expect(setSleeping(base(), true).sleeping).toBe(true);
    const s = base();
    expect(setSleeping(s, false)).toBe(s);
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/core/economy.test.ts`
Expected: FAIL — brak modułu `economy`.

- [ ] **Step 3: Implementacja `src/core/economy.ts`**

```ts
import { CONFIG, foodById, type FoodId } from './config';
import { dayKey } from './time';
import type { GameResult, GameState } from './types';

export type Outcome =
  | { ok: true; state: GameState }
  | { ok: false; reason: 'no-coins' | 'empty' };

const clamp = (v: number) => Math.max(0, Math.min(CONFIG.needs.max, v));

export function priceOf(state: GameState, id: FoodId, now: number): number {
  if (id === 'kitkat' && state.lastFreeKitkat !== dayKey(now)) return 0;
  return foodById(id).price;
}

export function buyFood(state: GameState, id: FoodId, now: number): Outcome {
  const price = priceOf(state, id, now);
  if (state.coins < price) return { ok: false, reason: 'no-coins' };
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - price,
      fridge: { ...state.fridge, [id]: (state.fridge[id] ?? 0) + 1 },
      lastFreeKitkat: id === 'kitkat' && price === 0 ? dayKey(now) : state.lastFreeKitkat,
    },
  };
}

export function feed(state: GameState, id: FoodId): Outcome {
  const count = state.fridge[id] ?? 0;
  if (count <= 0) return { ok: false, reason: 'empty' };
  const food = foodById(id);
  const fridge = { ...state.fridge };
  if (count === 1) delete fridge[id];
  else fridge[id] = count - 1;
  return {
    ok: true,
    state: {
      ...state,
      fridge,
      sleeping: false,
      needs: {
        ...state.needs,
        hunger: clamp(state.needs.hunger + food.hunger),
        mood: clamp(state.needs.mood + food.mood),
      },
    },
  };
}

export function claimDailyBonus(state: GameState, now: number): { state: GameState; granted: boolean } {
  const today = dayKey(now);
  if (state.lastDailyBonus === today) return { state, granted: false };
  return {
    state: { ...state, coins: state.coins + CONFIG.coins.dailyBonus, lastDailyBonus: today },
    granted: true,
  };
}

export function petCharacter(state: GameState, now: number): { state: GameState; accepted: boolean } {
  if (now - state.lastPetAt < CONFIG.pet.cooldownMs) return { state, accepted: false };
  return {
    state: {
      ...state,
      lastPetAt: now,
      needs: { ...state.needs, mood: clamp(state.needs.mood + CONFIG.pet.moodGain) },
    },
    accepted: true,
  };
}

export function applyGameResult(state: GameState, result: GameResult): GameState {
  if (result.aborted) return state;
  const prev = state.records[result.gameId] ?? 0;
  return {
    ...state,
    sleeping: false,
    coins: state.coins + result.coins,
    needs: {
      ...state.needs,
      mood: clamp(state.needs.mood + result.moodBoost),
      energy: clamp(state.needs.energy - CONFIG.games.energyCost),
    },
    records: { ...state.records, [result.gameId]: Math.max(prev, result.score) },
  };
}

export function setSleeping(state: GameState, sleeping: boolean): GameState {
  return state.sleeping === sleeping ? state : { ...state, sleeping };
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npx vitest run tests/core/economy.test.ts`
Expected: PASS (15 testów).

- [ ] **Step 5: Commit**

```bash
git add src/core/economy.ts tests/core/economy.test.ts
git commit -m "Ekonomia: sklep, karmienie, bonusy, wyniki gier" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Zapis i odczyt stanu

**Files:**
- Create: `src/core/save.ts`
- Test: `tests/core/save.test.ts`

- [ ] **Step 1: Testy**

`tests/core/save.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, SAVE_KEY, loadState, saveState, type KV } from '../../src/core/save';
import { createState } from '../../src/core/state';

const T0 = new Date(2026, 9, 6, 12).getTime();

function memoryKV(init: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('save', () => {
  it('brak zapisu → nowy stan', () => {
    const r = loadState(memoryKV(), T0);
    expect(r.fresh).toBe(true);
    expect(r.recovered).toBe(false);
    expect(r.state.coins).toBe(150);
  });

  it('zapis i odczyt dają ten sam stan', () => {
    const kv = memoryKV();
    const s = { ...createState(T0), coins: 777, records: { catch: 5 } };
    expect(saveState(kv, s)).toBe(true);
    const r = loadState(kv, T0 + 5);
    expect(r.fresh).toBe(false);
    expect(r.state).toEqual(s);
  });

  it('uszkodzony JSON → kopia zapasowa i nowy stan', () => {
    const kv = memoryKV({ [SAVE_KEY]: '{oops' });
    const r = loadState(kv, T0);
    expect(r.recovered).toBe(true);
    expect(r.fresh).toBe(true);
    expect(kv.data.get(BACKUP_KEY)).toBe('{oops');
  });

  it('nieznana wersja lub zły kształt → kopia i nowy stan', () => {
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify({ version: 99 }) });
    expect(loadState(kv, T0).recovered).toBe(true);
    const kv2 = memoryKV({ [SAVE_KEY]: JSON.stringify({ ...createState(T0), coins: 'dużo' }) });
    expect(loadState(kv2, T0).recovered).toBe(true);
  });

  it('błąd zapisu (np. pełna pamięć) nie wywraca aplikacji', () => {
    const kv: KV = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(saveState(kv, createState(T0))).toBe(false);
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/core/save.test.ts`
Expected: FAIL — brak modułu `save`.

- [ ] **Step 3: Implementacja `src/core/save.ts`**

```ts
import { createState } from './state';
import type { GameState } from './types';

export const SAVE_KEY = 'gabigochi.save';
export const BACKUP_KEY = 'gabigochi.save_backup';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  state: GameState;
  fresh: boolean;
  recovered: boolean;
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function isValidV1(x: Record<string, unknown>): boolean {
  const n = x.needs;
  return (
    x.version === 1 &&
    isNum(x.createdAt) && isNum(x.lastUpdate) && isNum(x.coins) && isNum(x.lastPetAt) &&
    isRecord(n) && isNum(n.hunger) && isNum(n.mood) && isNum(n.energy) &&
    isRecord(x.fridge) && isRecord(x.records) &&
    typeof x.sleeping === 'boolean' && typeof x.seenBirthday === 'boolean' &&
    typeof x.lastDailyBonus === 'string' &&
    (x.lastFreeKitkat === null || typeof x.lastFreeKitkat === 'string')
  );
}

/** Miejsce na przyszłe migracje (etap 2 podbije `version`). */
function migrate(x: unknown): GameState | null {
  if (!isRecord(x)) return null;
  if (isValidV1(x)) return x as unknown as GameState;
  return null;
}

export function loadState(kv: KV, now: number): LoadResult {
  const raw = kv.getItem(SAVE_KEY);
  if (raw === null) return { state: createState(now), fresh: true, recovered: false };
  try {
    const state = migrate(JSON.parse(raw));
    if (state) return { state, fresh: false, recovered: false };
  } catch {
    // uszkodzony JSON — obsłużony poniżej
  }
  try {
    kv.setItem(BACKUP_KEY, raw);
  } catch {
    // brak miejsca na kopię — trudno, startujemy od nowa
  }
  return { state: createState(now), fresh: true, recovered: true };
}

export function saveState(kv: KV, state: GameState): boolean {
  try {
    kv.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npx vitest run tests/core/save.test.ts`
Expected: PASS (5 testów).

- [ ] **Step 5: Commit**

```bash
git add src/core/save.ts tests/core/save.test.ts
git commit -m "Zapis stanu z kopią zapasową" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Store z subskrypcjami i autozapisem

**Files:**
- Create: `src/core/store.ts`
- Test: `tests/core/store.test.ts`

- [ ] **Step 1: Testy**

`tests/core/store.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { Store } from '../../src/core/store';
import { SAVE_KEY, type KV } from '../../src/core/save';
import { createState } from '../../src/core/state';

const T0 = new Date(2026, 9, 6, 12).getTime();

function kv(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('Store', () => {
  it('update powiadamia i zapisuje', () => {
    const storage = kv();
    const store = new Store(createState(T0), storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => ({ ...s, coins: 1 }));
    expect(store.get().coins).toBe(1);
    expect(listener).toHaveBeenCalledWith(store.get());
    expect(JSON.parse(storage.data.get(SAVE_KEY)!).coins).toBe(1);
  });

  it('ten sam obiekt stanu nie powiadamia', () => {
    const store = new Store(createState(T0), kv());
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => s);
    expect(listener).not.toHaveBeenCalled();
  });

  it('odsubskrybowanie', () => {
    const store = new Store(createState(T0), kv());
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.update((s) => ({ ...s, coins: 2 }));
    expect(listener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/core/store.test.ts`
Expected: FAIL — brak modułu `store`.

- [ ] **Step 3: Implementacja `src/core/store.ts`**

```ts
import { saveState, type KV } from './save';
import type { GameState } from './types';

type Listener = (state: GameState) => void;

export class Store {
  private listeners = new Set<Listener>();

  constructor(private state: GameState, private readonly kv: KV) {}

  get(): GameState {
    return this.state;
  }

  update(fn: (state: GameState) => GameState): void {
    const next = fn(this.state);
    if (next === this.state) return;
    this.state = next;
    saveState(this.kv, next);
    this.listeners.forEach((l) => l(next));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npm test`
Expected: wszystkie testy PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/store.ts tests/core/store.test.ts
git commit -m "Store z subskrypcjami i autozapisem" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---


### Task 9: Pixel art — paleta i ikony

**Files:**
- Create: `src/art/pixels.ts`, `src/art/icons.ts`
- Test: `tests/art/icons.test.ts`

Ikony to tablice napisów: każdy znak to piksel w kolorze z `PALETTE`, `.` = przezroczysty. Test pilnuje, że każda ikona jest prostokątna i używa tylko znanych kolorów.

- [ ] **Step 1: Test**

`tests/art/icons.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ICONS } from '../../src/art/icons';
import { PALETTE } from '../../src/art/pixels';
import { FOODS } from '../../src/core/config';

describe('ICONS', () => {
  for (const [name, art] of Object.entries(ICONS)) {
    it(`${name}: prostokątna siatka ze znanymi kolorami`, () => {
      expect(art.length).toBeGreaterThan(0);
      const width = art[0].length;
      for (const row of art) {
        expect(row.length, `szerokość wiersza w ${name}`).toBe(width);
        for (const ch of row) {
          if (ch !== '.') expect(PALETTE[ch], `znak "${ch}" w ${name}`).toBeDefined();
        }
      }
    });
  }

  it('każde jedzenie ma ikonę', () => {
    for (const f of FOODS) expect(ICONS[f.id]).toBeDefined();
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/art`
Expected: FAIL — brak modułu `icons`.

- [ ] **Step 3: `src/art/pixels.ts`**

```ts
export type PixelArt = readonly string[];

export const PALETTE: Readonly<Record<string, string>> = {
  k: '#1b1326', // kontur
  w: '#ffffff',
  g: '#c9c3d6',
  r: '#e0384f',
  R: '#9c1f36',
  o: '#f08a3c',
  y: '#ffd34d',
  Y: '#c99a2e',
  b: '#b5763f',
  B: '#5c3a26',
  c: '#f4dcb0',
  G: '#5fb84a',
  D: '#2f7a34',
  p: '#b48ae0',
  P: '#7a4fb3',
  l: '#e6d7ff',
  i: '#ff9ec4',
  u: '#5aa8f0',
  U: '#2f5fae',
};

export function drawArt(ctx: CanvasRenderingContext2D, art: PixelArt, x: number, y: number, scale = 1): void {
  for (let r = 0; r < art.length; r++) {
    const row = art[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(Math.round(x + c * scale), Math.round(y + r * scale), scale, scale);
    }
  }
}

const canvasCache = new Map<PixelArt, HTMLCanvasElement>();

/** Pixel art wyrenderowany raz do małego canvasa — do szybkiego drawImage w grach. */
export function artCanvas(art: PixelArt): HTMLCanvasElement {
  let canvas = canvasCache.get(art);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = art[0].length;
    canvas.height = art.length;
    drawArt(canvas.getContext('2d')!, art, 0, 0);
    canvasCache.set(art, canvas);
  }
  return canvas;
}

const urlCache = new Map<string, string>();

/** Pixel art jako data URL w danej skali — ostre krawędzie bez polegania na CSS. */
export function artDataUrl(key: string, art: PixelArt, scale: number): string {
  const cacheKey = `${key}@${scale}`;
  let url = urlCache.get(cacheKey);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = art[0].length * scale;
    canvas.height = art.length * scale;
    drawArt(canvas.getContext('2d')!, art, 0, 0, scale);
    url = canvas.toDataURL('image/png');
    urlCache.set(cacheKey, url);
  }
  return url;
}
```

- [ ] **Step 4: `src/art/icons.ts`**

```ts
import type { PixelArt } from './pixels';

export const ICONS = {
  apple: [
    '.....k......',
    '....kbk.kk..',
    '.....kbkGGk.',
    '..kkkkbkkk..',
    '.krrrrrrrRk.',
    'krwwrrrrrrRk',
    'krwrrrrrrrRk',
    'krrrrrrrrrRk',
    'krrrrrrrrRRk',
    '.kRrrrrrRRk.',
    '.kRRRkkRRRk.',
    '..kkk..kkk..',
  ],
  sandwich: [
    '............',
    '............',
    '..kkkkkkkk..',
    '.kcccccccck.',
    'kcccccccccck',
    'kGGGGGGGGGGk',
    'krrrrrrrrrrk',
    'kyyyyyyyyyyk',
    'kiiiiiiiiiik',
    'kcccccccccck',
    '.kkkkkkkkkk.',
    '............',
  ],
  kitkat: [
    '............',
    '............',
    '............',
    'kkkkkkkkkkkk',
    'kgrrrrrrrrgk',
    'kgrrwwwwrrgk',
    'kgrwrRRrwrgk',
    'kgrrwwwwrrgk',
    'kgrrrrrrrrgk',
    'kkkkkkkkkkkk',
    '............',
    '............',
  ],
  pizza: [
    'kkkkkkkkkkkk',
    'kbbbbbbbbbbk',
    '.kyyryyyyyk.',
    '.kyrrryyryk.',
    '..kyyyyrrk..',
    '..kyyyyyyk..',
    '...kyrryk...',
    '...kyyyyk...',
    '....kyyk....',
    '....kyyk....',
    '.....kk.....',
    '............',
  ],
  cake: [
    '.....y......',
    '.....o......',
    '.....w......',
    '.....i......',
    '..kkkkkkkk..',
    '.kwwwwwwwwk.',
    '.kwiwwiwwik.',
    '.kiiiiiiiik.',
    '.kbbbbbbbbk.',
    '.kcccccccck.',
    '.kbbbbbbbbk.',
    '..kkkkkkkk..',
  ],
  broccoli: [
    '...kkk.kk...',
    '..kGGGkGGk..',
    '.kGGDGGGDGk.',
    'kGDGGGDGGGGk',
    'kGGGDGGGDGGk',
    '.kGGGGGGGGk.',
    '..kkGkkGkk..',
    '....kGGk....',
    '....kGGk....',
    '....kGGk....',
    '....kDDk....',
    '.....kk.....',
  ],
  heart: [
    '............',
    '..kk....kk..',
    '.krrk..krrk.',
    'krwrrkkrrrrk',
    'krwrrrrrrrrk',
    'krrrrrrrrrrk',
    '.krrrrrrrrk.',
    '..krrrrrrk..',
    '...krrrrk...',
    '....krrk....',
    '.....kk.....',
    '............',
  ],
  heartSmall: ['rr.rr', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
  heartEmpty: ['kk.kk', 'k.k.k', 'k...k', '.k.k.', '..k..'],
  gift: [
    '...kk..kk...',
    '..kpk..kpk..',
    '...kpkkpk...',
    'kkkkkkkkkkkk',
    'kuuuuppuuuuk',
    'kkkkkkkkkkkk',
    '.kuuuppuuuk.',
    '.kuuuppuuuk.',
    '.kUuuppuuUk.',
    '.kUUUppUUUk.',
    '.kkkkkkkkkk.',
    '............',
  ],
  glasses: [
    '............',
    '............',
    '............',
    '............',
    'kkkkk..kkkkk',
    'klllkkkklllk',
    'klllk..klllk',
    'kkkkk..kkkkk',
    '............',
    '............',
    '............',
    '............',
  ],
  bag: [
    '...kkkkkk...',
    '..k......k..',
    '..k......k..',
    '.kkkkkkkkkk.',
    '.kcccccccck.',
    '.kcccccccck.',
    '.kcccrrccck.',
    '.kcccccccck.',
    '.kcccccccck.',
    '.kcccccccck.',
    '.kkkkkkkkkk.',
    '............',
  ],
  balloon: [
    '....kkkk....',
    '...kppppk...',
    '..kpwppppk..',
    '..kpwppppk..',
    '..kppppppk..',
    '..kpppppPk..',
    '...kpppPk...',
    '....kkkk....',
    '.....kk.....',
    '......k.....',
    '.....k......',
    '......k.....',
  ],
  star: [
    '.....kk.....',
    '....kyyk....',
    'kkkkkyykkkkk',
    '.kyyyyyyyyk.',
    '..kyyyyyyk..',
    '...kyyyyk...',
    '..kyyyyyyk..',
    '..kyykkyyk..',
    '.kyyk..kyyk.',
    '.kkk....kkk.',
    '............',
    '............',
  ],
  coin: [
    '...kkkkkk...',
    '..kyyyyyyk..',
    '.kyywyyyyYk.',
    '.kywyYYyyYk.',
    '.kywyYyyyYk.',
    '.kyyyYyyyYk.',
    '.kyyyYyyyYk.',
    '.kyyyYYyyYk.',
    '.kyyyyyyYYk.',
    '..kYYYYYYk..',
    '...kkkkkk...',
    '............',
  ],
  bolt: [
    '.....kkkk...',
    '....kyyyk...',
    '...kyyyk....',
    '..kyyyk.....',
    '.kyyyykkkk..',
    '.kkkkyyyyk..',
    '....kyyyk...',
    '...kyyyk....',
    '..kyyk......',
    '..kyk.......',
    '..kk........',
    '............',
  ],
  gamepad: [
    '............',
    '............',
    '............',
    '..kkkkkkkk..',
    '.kppppppppk.',
    'kppkppppippk',
    'kpkkkppippik',
    'kppkppppippk',
    'kppppkkppppk',
    '.kpppk.kpppk',
    '..kkk...kkk.',
    '............',
  ],
  bulb: [
    '....kkkk....',
    '...kyyyyk...',
    '..kyywyyyk..',
    '..kywyyyyk..',
    '..kyyyyyyk..',
    '..kyyyyyyk..',
    '...kyyyyk...',
    '....kggk....',
    '....kggk....',
    '....kkkk....',
    '............',
    '............',
  ],
  moon: [
    '...kkkk.....',
    '..kyyk......',
    '.kyyk.......',
    '.kyyk.......',
    'kyyk........',
    'kyyk........',
    'kyyyk....kk.',
    '.kyyyykkkyyk',
    '.kyyyyyyyyk.',
    '..kyyyyyyk..',
    '...kkkkkk...',
    '............',
  ],
  shopbag: [
    '....kkkk....',
    '...k....k...',
    '...k....k...',
    '.kkkkkkkkkk.',
    '.kppppppppk.',
    '.kppppppppk.',
    '.kpppyypppk.',
    '.kpppyypppk.',
    '.kppppppppk.',
    '.kPPPPPPPPk.',
    '.kkkkkkkkkk.',
    '............',
  ],
  dress: [
    '...k....k...',
    '...kk..kk...',
    '...kpkkpk...',
    '...kppppk...',
    '...kppppk...',
    '....kwwk....',
    '...kppppk...',
    '..kppppppk..',
    '.kppppppppk.',
    'kppppppppppk',
    'kkkkkkkkkkkk',
    '............',
  ],
  lock: [
    '............',
    '....kkkk....',
    '...k....k...',
    '...k....k...',
    '..kkkkkkkk..',
    '..kyyyyyyk..',
    '..kyykkyyk..',
    '..kyykkyyk..',
    '..kyyyyyyk..',
    '..kkkkkkkk..',
    '............',
    '............',
  ],
  back: [
    '............',
    '............',
    '....k.......',
    '...kk.......',
    '..kkkkkkkk..',
    '.kkkkkkkkk..',
    '..kkkkkkkk..',
    '...kk.......',
    '....k.......',
    '............',
    '............',
    '............',
  ],
  bricks: [
    'kkkkk.kkkkk.',
    'kpppk.kuuuk.',
    'kkkkk.kkkkk.',
    '............',
    '............',
    '......kkk...',
    '.....kwyyk..',
    '.....kyyyk..',
    '.....kyyYk..',
    '......kkk...',
    '............',
    '...kkkkkk...',
  ],
  grid: [
    'kkkkkkkkkkkkk',
    'kwwwkwwwkwwwk',
    'kwpwkwwwkwpwk',
    'kwwwkwwwkwwwk',
    'kkkkkkkkkkkkk',
    'kwwwkwwwkwwwk',
    'kwwwkwpwkwwwk',
    'kwwwkwwwkwwwk',
    'kkkkkkkkkkkkk',
    'kwwwkwwwkwwwk',
    'kwpwkwwwkwwwk',
    'kwwwkwwwkwwwk',
    'kkkkkkkkkkkkk',
  ],
  letters: [
    'kkkkkkkkkkkk',
    'kwwwwwwwwPwk',
    'kwwwwkkwwwwk',
    'kwwwkwwkwwwk',
    'kwwkwwwwkwwk',
    'kwwkkkkkkwwk',
    'kwwkwwwwkwwk',
    'kwwkwwwwkwwk',
    'kwwwwwwwwwwk',
    'kkkkkkkkkkkk',
    '.kkkkkkkkkk.',
    '............',
  ],
  zzz: ['wwwww', '...w.', '..w..', '.w...', 'wwwww'],
  cloud: [
    '...kkkk.....',
    '..kggggkkk..',
    '.kgggggggk..',
    'kgggggggggk.',
    'kgggggggggk.',
    '.kkkkkkkkk..',
    '..u..u..u...',
    '...u..u..u..',
  ],
  foodBubble: [
    '..kkkkkk..',
    '.kwwwwwwk.',
    'kwwwrrwwwk',
    'kwwrrrrwwk',
    'kwwrrrrwwk',
    'kwwwrrwwwk',
    '.kwwwwwwk.',
    '..kkkkkk..',
    '..kk......',
    '.k........',
  ],
  digit2: ['PPP', '..P', 'PPP', 'P..', 'PPP'],
  digit6: ['PPP', 'P..', 'PPP', 'P.P', 'PPP'],
} as const satisfies Record<string, PixelArt>;

export type IconName = keyof typeof ICONS;
```

- [ ] **Step 5: Uruchom — PASS**

Run: `npx vitest run tests/art`
Expected: PASS (31 ikon + test jedzenia). Jeśli któraś ikona ma złą szerokość wiersza — popraw ten wiersz, nie test.

- [ ] **Step 6: Commit**

```bash
git add src/art tests/art
git commit -m "Pixel art: paleta i ikony" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Teksty i kwestie postaci

**Files:**
- Create: `src/content.ts`, `src/pet/speech.ts`
- Test: `tests/pet/speech.test.ts`

- [ ] **Step 1: Test**

`tests/pet/speech.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { pick, pickLine } from '../../src/pet/speech';
import { content } from '../../src/content';

const first = () => 0;

describe('pickLine', () => {
  it('głód ma pierwszeństwo', () => {
    expect(content.lines.hungry).toContain(pickLine({ hunger: 10, mood: 10, energy: 10 }, first));
  });
  it('śpiąca', () => {
    expect(content.lines.sleepy).toContain(pickLine({ hunger: 90, mood: 90, energy: 10 }, first));
  });
  it('znudzona', () => {
    expect(content.lines.bored).toContain(pickLine({ hunger: 90, mood: 10, energy: 90 }, first));
  });
  it('zadowolona', () => {
    expect(content.lines.happy).toContain(pickLine({ hunger: 90, mood: 90, energy: 90 }, first));
  });
});

describe('pick', () => {
  it('nie wychodzi poza tablicę', () => {
    expect(pick(['a', 'b'], () => 0.999)).toBe('b');
    expect(pick(['a', 'b'], () => 1)).toBe('a');
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/pet/speech.test.ts`
Expected: FAIL — brak modułów.

- [ ] **Step 3: `src/content.ts`**

Życzenia to szkic — użytkownik podmieni je na własne (spec, rozdz. 11).

```ts
export const content = {
  name: 'Gabriela',
  nameGenitive: 'Gabrieli',
  shortName: 'Gabi',
  appName: 'Gabigochi',
  age: 26,
  wishesTitle: 'Sto lat, Gabi!',
  wishes: [
    'Wszystkiego najlepszego z okazji 26. urodzin!',
    'Niech ten rok będzie pełen radości, przygód i ulubionych KitKatów.',
    'A teraz masz własną, małą Gabi w telefonie. Karm ją, baw się z nią i nie zapominaj gasić jej światła na noc!',
  ],
  signature: 'Z całego serca!',
  lines: {
    greeting: ['Cześć!', 'Hej, tęskniłam!', 'O, jesteś!'],
    happy: ['Ale fajny dzień!', 'Lubię ten pokój.', 'Zagramy w coś?', 'Sto lat dla mnie!', 'Mam ochotę na KitKata…'],
    hungry: ['Zjadłabym coś…', 'Burczy mi w brzuchu!', 'Może KitKat?'],
    sleepy: ['Ziew… jestem śpiąca.', 'Zgasisz światło?'],
    bored: ['Pobawisz się ze mną?', 'Nudzę się…'],
    eat: ['Mniam!', 'Pyszne!', 'Dziękuję!'],
    kitkat: ['KITKAT! Kocham!', 'Mój ulubiony!!!', 'Najlepszy prezent!'],
    pet: ['Hihi!', 'To łaskocze!', 'Miło!'],
    goodNight: ['Dobranoc!', 'Słodkich snów…'],
    wakeUp: ['Dzień dobry!', 'Już nie śpię!', 'Ziew… co się dzieje?'],
  },
} as const;
```

- [ ] **Step 4: `src/pet/speech.ts`**

```ts
import { content } from '../content';
import { needStatus } from '../core/needs';
import type { Needs } from '../core/types';

export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/** Kwestia zależna od potrzeb: głód > senność > nuda > zadowolenie. */
export function pickLine(needs: Needs, rng: () => number = Math.random): string {
  const st = needStatus(needs);
  const pool = st.hungry
    ? content.lines.hungry
    : st.sleepy
      ? content.lines.sleepy
      : st.bored
        ? content.lines.bored
        : content.lines.happy;
  return pick(pool, rng);
}
```

- [ ] **Step 5: Uruchom — PASS**

Run: `npx vitest run tests/pet/speech.test.ts`
Expected: PASS (5 testów).

- [ ] **Step 6: Commit**

```bash
git add src/content.ts src/pet/speech.ts tests/pet/speech.test.ts
git commit -m "Teksty, życzenia i kwestie postaci" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Manifest animacji i ładowanie sprite'ów

**Files:**
- Create: `src/sprites/animations.json`, `src/sprites/animations.ts`, `src/sprites/loader.ts`
- Test: `tests/sprites/animations.test.ts`

- [ ] **Step 1: Test**

`tests/sprites/animations.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ANIMATIONS, allFrameNames, frameAt, resolveAnimation, type AnimDef } from '../../src/sprites/animations';
import framesMeta from '../../src/sprites/frames.generated.json';

const M: Record<string, AnimDef> = {
  idle: { frames: ['a'], fps: 1 },
  walk: { frames: ['w1', 'w2'], fps: 4, flipForRight: true },
  sleep: { fallback: 'a', overlay: 'zzz', dim: true },
  broken: {},
};

describe('resolveAnimation', () => {
  it('animacja z klatek', () => {
    expect(resolveAnimation(M, 'walk')).toEqual({ frames: ['w1', 'w2'], fps: 4, overlay: null, dim: false, flipForRight: true });
  });
  it('zastępstwo: klatka + nakładka', () => {
    expect(resolveAnimation(M, 'sleep')).toEqual({ frames: ['a'], fps: 1, overlay: 'zzz', dim: true, flipForRight: false });
  });
  it('nieznana nazwa → idle', () => {
    expect(resolveAnimation(M, 'taniec').frames).toEqual(['a']);
  });
  it('wpis bez klatek i zastępstwa to błąd', () => {
    expect(() => resolveAnimation(M, 'broken')).toThrow();
  });
});

describe('frameAt', () => {
  it('przewija klatki w pętli', () => {
    const walk = resolveAnimation(M, 'walk');
    expect(frameAt(walk, 0)).toBe('w1');
    expect(frameAt(walk, 250)).toBe('w2');
    expect(frameAt(walk, 500)).toBe('w1');
  });
});

describe('prawdziwy manifest', () => {
  it('każda animacja się rozwiązuje i używa istniejących klatek', () => {
    for (const name of Object.keys(ANIMATIONS)) {
      expect(() => resolveAnimation(ANIMATIONS, name)).not.toThrow();
    }
    for (const frame of allFrameNames(ANIMATIONS)) {
      expect(framesMeta.body).toContain(frame);
    }
  });
  it('ma animacje używane przez pokój', () => {
    for (const name of ['idle', 'walk', 'eat', 'wave', 'talk', 'sleep', 'sad', 'hungry']) {
      expect(ANIMATIONS[name], name).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/sprites`
Expected: FAIL — brak modułu `animations`.

- [ ] **Step 3: `src/sprites/animations.json`**

Klatki `walk` patrzą w lewo; dla ruchu w prawo renderer je odbija (`flipForRight`). Jeśli w Task 2 ustalono inną kolejność kroków — wpisz ją tutaj.

```json
{
  "idle": { "frames": ["idle_front"], "fps": 1 },
  "walk": { "frames": ["walk_a1", "walk_a2", "walk_a3", "walk_a4"], "fps": 6, "flipForRight": true },
  "eat": { "frames": ["fun_eat", "idle_front"], "fps": 2.5 },
  "wave": { "frames": ["fun_wave"], "fps": 1 },
  "talk": { "frames": ["fun_talk"], "fps": 1 },
  "sleep": { "fallback": "idle_front", "overlay": "zzz", "dim": true },
  "sad": { "fallback": "idle_front", "overlay": "cloud" },
  "hungry": { "fallback": "idle_front", "overlay": "food" }
}
```

- [ ] **Step 4: `src/sprites/animations.ts`**

```ts
import manifest from './animations.json';

export type OverlayName = 'zzz' | 'cloud' | 'food';

/** Wpis manifestu: albo `frames`, albo `fallback` (istniejąca klatka + nakładka). */
export interface AnimDef {
  frames?: string[];
  fps?: number;
  fallback?: string;
  overlay?: string;
  dim?: boolean;
  flipForRight?: boolean;
}

export interface ResolvedAnim {
  frames: string[];
  fps: number;
  overlay: OverlayName | null;
  dim: boolean;
  flipForRight: boolean;
}

export const ANIMATIONS: Record<string, AnimDef> = manifest;

export function resolveAnimation(m: Record<string, AnimDef>, name: string): ResolvedAnim {
  const def = m[name] ?? m.idle;
  const overlay = (def.overlay ?? null) as OverlayName | null;
  if (def.frames && def.frames.length > 0) {
    return { frames: def.frames, fps: def.fps ?? 6, overlay, dim: def.dim ?? false, flipForRight: def.flipForRight ?? false };
  }
  if (def.fallback) {
    return { frames: [def.fallback], fps: 1, overlay, dim: def.dim ?? false, flipForRight: false };
  }
  throw new Error(`Animacja "${name}" nie ma klatek ani zastępstwa`);
}

export function frameAt(anim: ResolvedAnim, elapsedMs: number): string {
  const index = Math.floor((elapsedMs / 1000) * anim.fps) % anim.frames.length;
  return anim.frames[index];
}

export function allFrameNames(m: Record<string, AnimDef>): string[] {
  const names = new Set<string>();
  for (const def of Object.values(m)) {
    def.frames?.forEach((f) => names.add(f));
    if (def.fallback) names.add(def.fallback);
  }
  return [...names];
}
```

- [ ] **Step 5: `src/sprites/loader.ts`**

```ts
export type SpriteMap = Map<string, HTMLImageElement>;

export const spriteUrl = (name: string): string => `${import.meta.env.BASE_URL}sprites/${name}.png`;

export async function loadSprites(names: string[]): Promise<SpriteMap> {
  const entries = await Promise.all(
    names.map(
      (name) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([name, img]);
          img.onerror = () => reject(new Error(`Brak sprite'a: ${name}`));
          img.src = spriteUrl(name);
        }),
    ),
  );
  return new Map(entries);
}
```

- [ ] **Step 6: Uruchom — PASS**

Run: `npx vitest run tests/sprites`
Expected: PASS (7 testów).

- [ ] **Step 7: Commit**

```bash
git add src/sprites tests/sprites
git commit -m "Manifest animacji z zastępstwami + ładowanie sprite'ów" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: „Mózg” postaci — maszyna stanów

**Files:**
- Create: `src/pet/brain.ts`
- Test: `tests/pet/brain.test.ts`

- [ ] **Step 1: Test**

`tests/pet/brain.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ACTION_MS, ROOM_BOUNDS, animationName, createBrain, stepBrain, triggerBrain, type BrainCtx } from '../../src/pet/brain';

const ctx = (patch: Partial<BrainCtx> = {}): BrainCtx => ({ now: 10_000, mood: 'happy', sleeping: false, rng: () => 0, ...patch });

describe('stepBrain', () => {
  it('po pauzie decyduje się iść', () => {
    const b = stepBrain(createBrain(0), 16, ctx());
    expect(b.action).toBe('walk');
    expect(b.targetX).toBe(ROOM_BOUNDS.minX);
  });

  it('nie decyduje przed końcem pauzy', () => {
    const b0 = createBrain(0);
    expect(stepBrain(b0, 16, ctx({ now: 100 }))).toBe(b0);
  });

  it('idzie z prędkością walkSpeed i patrzy w stronę celu', () => {
    const b = { ...createBrain(0), action: 'walk' as const, x: 64, targetX: 24 };
    const next = stepBrain(b, 1000, ctx());
    expect(next.x).toBeCloseTo(64 - ROOM_BOUNDS.walkSpeed);
    expect(next.facing).toBe('left');
  });

  it('po dojściu staje', () => {
    const b = { ...createBrain(0), action: 'walk' as const, x: 25, targetX: 24 };
    const next = stepBrain(b, 1000, ctx());
    expect(next.x).toBe(24);
    expect(next.action).toBe('idle');
    expect(next.nextDecisionAt).toBeGreaterThan(10_000);
  });

  it('śpiąca stoi w miejscu', () => {
    const b = { ...createBrain(0), action: 'walk' as const, x: 50, targetX: 90 };
    const next = stepBrain(b, 1000, ctx({ sleeping: true }));
    expect(next.action).toBe('idle');
    expect(next.x).toBe(50);
  });

  it('akcja czasowa trwa ACTION_MS, potem idle', () => {
    const b = triggerBrain(createBrain(0), 'eat', 1000);
    expect(stepBrain(b, 16, ctx({ now: 1000 + ACTION_MS.eat - 1 }))).toBe(b);
    expect(stepBrain(b, 16, ctx({ now: 1000 + ACTION_MS.eat })).action).toBe('idle');
  });

  it('smutna rzadko chodzi', () => {
    const b = stepBrain(createBrain(0), 16, ctx({ mood: 'sad', rng: () => 0.5 }));
    expect(b.action).toBe('idle');
  });
});

describe('animationName', () => {
  const b = createBrain(0);
  const st = { sleeping: false, hungry: false, mood: 'happy' as const };
  it('mapuje stany na animacje', () => {
    expect(animationName(b, { ...st, sleeping: true })).toBe('sleep');
    expect(animationName({ ...b, action: 'walk' }, st)).toBe('walk');
    expect(animationName({ ...b, action: 'jump' }, st)).toBe('wave');
    expect(animationName(b, { ...st, hungry: true })).toBe('hungry');
    expect(animationName(b, { ...st, mood: 'sad' })).toBe('sad');
    expect(animationName(b, st)).toBe('idle');
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/pet/brain.test.ts`
Expected: FAIL — brak modułu `brain`.

- [ ] **Step 3: `src/pet/brain.ts`**

```ts
import type { MoodLevel } from '../core/types';

export type PetAction = 'idle' | 'walk' | 'eat' | 'wave' | 'talk' | 'jump';
export type TimedAction = Exclude<PetAction, 'idle' | 'walk'>;

export interface Brain {
  action: PetAction;
  x: number;
  targetX: number;
  facing: 'left' | 'right';
  actionEndsAt: number;
  nextDecisionAt: number;
}

export interface BrainCtx {
  now: number;
  mood: MoodLevel;
  sleeping: boolean;
  rng: () => number;
}

/** Współrzędne w pikselach logicznych pokoju (128 px szerokości). */
export const ROOM_BOUNDS = { minX: 24, maxX: 104, walkSpeed: 14 } as const;
export const ACTION_MS: Record<TimedAction, number> = { eat: 1600, wave: 1200, talk: 2500, jump: 700 };
const WALK_CHANCE: Record<MoodLevel, number> = { happy: 0.7, ok: 0.45, sad: 0.15 };
const PAUSE_MS: Record<MoodLevel, number> = { happy: 2000, ok: 3500, sad: 6000 };

const isTimed = (a: PetAction): a is TimedAction => a !== 'idle' && a !== 'walk';
const pause = (ctx: BrainCtx) => PAUSE_MS[ctx.mood] + ctx.rng() * 2000;

export function createBrain(now: number): Brain {
  return { action: 'idle', x: 64, targetX: 64, facing: 'right', actionEndsAt: 0, nextDecisionAt: now + 2000 };
}

export function stepBrain(b: Brain, dtMs: number, ctx: BrainCtx): Brain {
  if (ctx.sleeping) {
    return b.action === 'idle' && b.targetX === b.x ? b : { ...b, action: 'idle', targetX: b.x };
  }
  if (isTimed(b.action)) {
    if (ctx.now < b.actionEndsAt) return b;
    return { ...b, action: 'idle', nextDecisionAt: ctx.now + 1500 };
  }
  if (b.action === 'walk') {
    const diff = b.targetX - b.x;
    const step = (ROOM_BOUNDS.walkSpeed * dtMs) / 1000;
    if (Math.abs(diff) <= step) {
      return { ...b, x: b.targetX, action: 'idle', nextDecisionAt: ctx.now + pause(ctx) };
    }
    return { ...b, x: b.x + Math.sign(diff) * step, facing: diff < 0 ? 'left' : 'right' };
  }
  if (ctx.now < b.nextDecisionAt) return b;
  if (ctx.rng() < WALK_CHANCE[ctx.mood]) {
    const targetX = ROOM_BOUNDS.minX + ctx.rng() * (ROOM_BOUNDS.maxX - ROOM_BOUNDS.minX);
    return { ...b, action: 'walk', targetX };
  }
  return { ...b, nextDecisionAt: ctx.now + pause(ctx) };
}

export function triggerBrain(b: Brain, action: TimedAction, now: number): Brain {
  return { ...b, action, targetX: b.x, actionEndsAt: now + ACTION_MS[action] };
}

export function animationName(b: Brain, s: { sleeping: boolean; hungry: boolean; mood: MoodLevel }): string {
  if (s.sleeping) return 'sleep';
  if (b.action === 'walk' || b.action === 'eat' || b.action === 'wave' || b.action === 'talk') return b.action;
  if (b.action === 'jump') return 'wave';
  if (s.hungry) return 'hungry';
  if (s.mood === 'sad') return 'sad';
  return 'idle';
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npx vitest run tests/pet/brain.test.ts`
Expected: PASS (8 testów).

- [ ] **Step 5: Commit**

```bash
git add src/pet/brain.ts tests/pet/brain.test.ts
git commit -m "Maszyna stanów postaci" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Style — fioletowy motyw pikselowy i animacje

**Files:**
- Create: `src/styles/theme.css`, `src/styles/components.css`, `src/styles/screens.css`, `src/styles/games.css`

Brak testów jednostkowych — weryfikacja wizualna w Task 19 i 23.

- [ ] **Step 1: `src/styles/theme.css`**

```css
:root {
  --font: 'Pixelify Sans', ui-monospace, monospace;
  --px: 3px;
  --bg: #2a1f3d;
  --bg-2: #3b2a5c;
  --panel: #f3ecff;
  --panel-2: #e2d4fb;
  --ink: #1b1326;
  --text: #2b1d40;
  --text-soft: #6b5a85;
  --text-light: #f3ecff;
  --accent: #9b6ee0;
  --accent-2: #7a4fb3;
  --hunger: #f08a3c;
  --mood: #ff7fb0;
  --energy: #5aa8f0;
  --coin: #ffd34d;
  --danger: #e0384f;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --outline:
    calc(var(--px) * -1) 0 0 0 var(--ink),
    var(--px) 0 0 0 var(--ink),
    0 calc(var(--px) * -1) 0 0 var(--ink),
    0 var(--px) 0 0 var(--ink);
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

html, body {
  margin: 0;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
}

body {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(circle at 50% 0%, var(--bg-2) 0%, var(--bg) 70%);
}

#app { position: absolute; inset: 0; max-width: 480px; margin: 0 auto; overflow: hidden; }

h1, h2, h3, p { margin: 0; }
button { font: inherit; color: inherit; -webkit-appearance: none; appearance: none; }
img.px, canvas.px, .px-icon { image-rendering: pixelated; image-rendering: crisp-edges; }
```

- [ ] **Step 2: `src/styles/components.css`**

```css
.px-box {
  background: var(--panel);
  margin: var(--px);
  box-shadow: var(--outline), inset 0 calc(var(--px) * -1) 0 0 var(--panel-2);
}

.px-btn {
  --btn-bg: var(--accent);
  --btn-shade: var(--accent-2);
  --btn-fg: #fff;
  font-size: 16px;
  line-height: 1;
  color: var(--btn-fg);
  background: var(--btn-bg);
  border: 0;
  padding: 12px 16px;
  margin: var(--px);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: var(--outline), inset 0 calc(var(--px) * -1) 0 0 var(--btn-shade);
  transition: transform 80ms steps(2);
}
.px-btn:active { transform: translateY(var(--px)); box-shadow: var(--outline), inset 0 var(--px) 0 0 var(--btn-shade); }
.px-btn.secondary { --btn-bg: var(--panel-2); --btn-shade: #c5b2ea; --btn-fg: var(--text); }
.px-btn.big { font-size: 22px; padding: 16px 28px; }
.px-btn.free { --btn-bg: var(--mood); --btn-shade: #d65a90; }
.px-btn.icon-only { padding: 8px; }
.px-btn.shake { animation: shake 320ms steps(8); }

.coin-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #fff6d6;
  color: #6b4a00;
  font-size: 18px;
}
.coin-pill.bump { animation: bump 300ms cubic-bezier(.3, 1.8, .5, 1); }

.need { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-light); }
.need-label { display: flex; align-items: center; gap: 4px; }
.need-track { height: 12px; background: var(--bg); box-shadow: 0 0 0 2px var(--ink); overflow: hidden; }
.need-fill {
  height: 100%;
  transition: width 600ms cubic-bezier(.2, .8, .2, 1);
  background-image: repeating-linear-gradient(90deg, transparent 0 9px, rgba(0, 0, 0, .18) 9px 10px);
}
.need-hunger .need-fill { background-color: var(--hunger); }
.need-mood .need-fill { background-color: var(--mood); }
.need-energy .need-fill { background-color: var(--energy); }
.need.low .need-track { animation: blink 900ms steps(2) infinite; }

.toast {
  position: absolute;
  left: 50%;
  top: calc(var(--safe-top) + 12px);
  transform: translateX(-50%);
  z-index: 90;
  padding: 10px 14px;
  font-size: 15px;
  max-width: 90%;
  text-align: center;
  animation: drop-in 260ms cubic-bezier(.2, 1.5, .4, 1);
}
.toast.out { animation: drop-out 220ms ease-in forwards; }

.overlay {
  position: absolute;
  inset: 0;
  z-index: 80;
  background: rgba(27, 19, 38, .55);
  display: grid;
  place-items: center;
  padding: 24px;
  animation: fade-in 160ms ease-out;
}
.dialog { padding: 18px; max-width: 320px; text-align: center; animation: pop-in 280ms cubic-bezier(.2, 1.5, .4, 1); }
.dialog p { font-size: 17px; line-height: 1.35; }
.dialog-actions { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }

.sheet-backdrop { position: absolute; inset: 0; z-index: 70; background: rgba(27, 19, 38, .35); animation: fade-in 160ms; }
.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px 14px calc(14px + var(--safe-bottom));
  animation: sheet-in 320ms cubic-bezier(.2, 1.3, .4, 1);
  transition: transform 200ms ease;
}
.sheet.peek { transform: translateY(75%); }
.sheet.out { animation: sheet-out 200ms ease-in forwards; }
.sheet-head { display: flex; justify-content: space-between; align-items: center; }
.sheet .hint { color: var(--text-soft); font-size: 14px; margin: 6px 0 10px; }
.fridge-items { display: flex; flex-wrap: wrap; gap: 10px; }
.food-item {
  position: relative;
  background: var(--panel-2);
  border: 0;
  padding: 10px;
  box-shadow: 0 0 0 2px var(--ink);
  touch-action: none;
  cursor: grab;
}
.food-item:active { transform: scale(.94); }
.food-count { position: absolute; right: -6px; bottom: -6px; background: var(--accent); color: #fff; font-size: 13px; padding: 2px 5px; box-shadow: 0 0 0 2px var(--ink); }
.fridge-empty { display: grid; justify-items: center; gap: 10px; padding: 10px; }
.drag-ghost { position: fixed; z-index: 100; pointer-events: none; transform: translate(-50%, -60%) scale(1.1); }

.coming-soon { padding: 20px; text-align: center; display: grid; justify-items: center; gap: 10px; color: var(--text-soft); font-size: 16px; }

.screen-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; color: var(--text-light); }
.screen-header h1 { flex: 1; font-size: 22px; }

.badge { margin-left: 6px; font-size: 11px; background: var(--mood); color: #fff; padding: 2px 5px; vertical-align: middle; }

canvas.transition, canvas.confetti { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
canvas.transition { z-index: 95; }
canvas.confetti { z-index: 85; }

@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@keyframes bump { 50% { transform: scale(1.15); } }
@keyframes blink { 50% { opacity: .45; } }
@keyframes drop-in { from { transform: translate(-50%, -30px); opacity: 0; } }
@keyframes drop-out { to { transform: translate(-50%, -30px); opacity: 0; } }
@keyframes fade-in { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }
@keyframes pop-in { from { transform: scale(.7); opacity: 0; } }
@keyframes sheet-in { from { transform: translateY(100%); } }
@keyframes sheet-out { to { transform: translateY(100%); } }
@keyframes row-in { from { transform: translateY(16px); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

- [ ] **Step 3: `src/styles/screens.css`**

```css
.screen { position: absolute; inset: 0; display: flex; flex-direction: column; padding: var(--safe-top) 0 var(--safe-bottom); }

/* Pokój */
.room-top { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px 4px; }
.profile-btn { display: flex; align-items: center; gap: 8px; background: none; border: 0; padding: 0; color: var(--text-light); font-size: 18px; cursor: pointer; }
.avatar { width: 40px; height: 40px; object-fit: cover; object-position: 50% 30%; background: var(--bg-2); box-shadow: 0 0 0 2px var(--ink); }
.needs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 6px 14px; }
.stage-wrap { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; padding: 6px 14px; }
.stage { position: relative; width: 100%; max-width: min(100%, calc((100dvh - 260px) * 1.14)); background: #cdb8f0; overflow: hidden; }
.room.night .stage { background: #4a3a72; }
.stage-canvas { display: block; width: 100%; height: auto; touch-action: none; }
.speech {
  position: absolute;
  top: 6%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  font-size: 15px;
  white-space: nowrap;
  pointer-events: none;
}
.speech.hidden { display: none; }
.speech.pop { animation: speech-pop 260ms cubic-bezier(.2, 1.6, .4, 1); }
.room-nav { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 6px 10px 12px; }
.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-light);
  background: var(--bg-2);
  border: 0;
  cursor: pointer;
  box-shadow: 0 0 0 2px var(--ink), inset 0 -3px 0 0 var(--bg);
  transition: transform 80ms steps(2);
}
.nav-btn:active { transform: translateY(3px); box-shadow: 0 0 0 2px var(--ink), inset 0 3px 0 0 var(--bg); }
@keyframes speech-pop { from { transform: translateX(-50%) scale(.5); opacity: 0; } }

/* Sklep */
.tabs { display: flex; gap: 6px; padding: 0 14px; }
.tab { flex: 1; font-size: 16px; padding: 10px; border: 0; background: var(--bg-2); color: #cdb8f0; box-shadow: 0 0 0 2px var(--ink); cursor: pointer; }
.tab.active { background: var(--accent); color: #fff; }
.shop-body { flex: 1; overflow-y: auto; padding: 12px 14px 20px; display: flex; flex-direction: column; gap: 10px; }
.shop-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; animation: row-in 300ms cubic-bezier(.2, 1.3, .4, 1) backwards; }
.shop-row:nth-child(2) { animation-delay: 40ms; }
.shop-row:nth-child(3) { animation-delay: 80ms; }
.shop-row:nth-child(4) { animation-delay: 120ms; }
.shop-row:nth-child(5) { animation-delay: 160ms; }
.shop-row.fav { background: #ffe3ef; }
.shop-info { display: flex; flex-direction: column; gap: 2px; }
.shop-info strong { font-size: 17px; }
.shop-info small { color: var(--text-soft); font-size: 13px; }
.price { display: inline-flex; align-items: center; gap: 4px; }

/* Lista minigier */
.games-body { flex: 1; overflow-y: auto; padding: 0 14px 20px; }
.game-section h2 { color: #cdb8f0; font-size: 16px; margin: 14px 4px 8px; }
.game-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.game-card {
  position: relative;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  color: var(--text);
  cursor: pointer;
  text-align: center;
  transition: transform 120ms;
}
.game-card:active { transform: scale(.96); }
.game-card small { color: var(--text-soft); font-size: 12px; }
.game-card .record { color: var(--accent-2); }
.game-card.soon { opacity: .6; cursor: default; }
.game-card .lock { position: absolute; top: 8px; right: 8px; }

/* Profil */
.profile-body { flex: 1; overflow-y: auto; padding: 0 14px 20px; display: flex; flex-direction: column; align-items: stretch; gap: 12px; }
.profile-card { display: grid; justify-items: center; gap: 6px; padding: 16px; text-align: center; }
.portrait-mid { width: 198px; }
.records { padding: 14px 16px; }
.records h2 { font-size: 18px; margin-bottom: 8px; }
.records ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.records li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; }

/* Urodziny */
.birthday { overflow-y: auto; align-items: center; text-align: center; gap: 12px; padding: calc(var(--safe-top) + 16px) 16px calc(var(--safe-bottom) + 24px); color: var(--text-light); }
.bday-age { font-size: 72px; font-weight: 700; line-height: 1; color: var(--coin); text-shadow: 4px 4px 0 var(--ink); animation: pulse 1.6s ease-in-out infinite; }
.bday-hero { position: relative; }
.portrait-big { width: 264px; animation: portrait-in 600ms cubic-bezier(.2, 1.4, .4, 1); }
.wave-sprite { position: absolute; right: -40px; bottom: -6px; width: 84px; animation: hop 1.2s steps(2) infinite; }
.bday-title { font-size: 30px; text-shadow: 3px 3px 0 var(--ink); }
.bday-wishes { padding: 14px 16px; color: var(--text); text-align: left; font-size: 17px; line-height: 1.4; max-width: 360px; display: grid; gap: 8px; }
.signature { text-align: right; color: var(--text-soft); }
@keyframes pulse { 50% { transform: scale(1.08); } }
@keyframes hop { 50% { transform: translateY(-6px); } }
@keyframes portrait-in { from { transform: translateY(-40px) scale(.9); opacity: 0; } }

/* Szafa */
.wardrobe-body { flex: 1; display: grid; justify-items: center; align-content: center; gap: 16px; padding: 0 14px 20px; }
.wardrobe-preview { width: 144px; }

/* Instalacja */
.install { overflow-y: auto; align-items: center; text-align: center; gap: 14px; padding: calc(var(--safe-top) + 24px) 20px 24px; color: var(--text-light); }
.install h1 { font-size: 34px; text-shadow: 3px 3px 0 var(--ink); }
.install p { font-size: 17px; line-height: 1.35; }
.install-steps { text-align: left; color: var(--text); padding: 14px 16px 14px 36px; font-size: 16px; line-height: 1.4; display: grid; gap: 8px; max-width: 360px; }
.small-link { color: #cdb8f0; font-size: 13px; }
```

- [ ] **Step 4: `src/styles/games.css`**

```css
.game-shell {
  position: absolute;
  inset: 0;
  z-index: 75;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  padding: var(--safe-top) 0 var(--safe-bottom);
  animation: fade-in 200ms;
}
.game-shell.out { animation: fade-out 200ms forwards; }
.game-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; color: var(--text-light); }
.game-head h1 { font-size: 18px; flex: 1; }
.hud { font-size: 15px; }
.game-body { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; position: relative; padding: 8px; }
.game-canvas { box-shadow: 0 0 0 3px var(--ink); touch-action: none; }
.end-panel h2 { font-size: 24px; margin-bottom: 8px; }
.end-score { font-size: 18px; }
.end-reward { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 20px; margin: 10px 0 4px; }

.memory-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: min(100%, 360px); }
.mem-card { aspect-ratio: 1; border: 0; padding: 0; background: none; perspective: 400px; cursor: pointer; }
.mem-inner { position: relative; width: 100%; height: 100%; transition: transform 320ms cubic-bezier(.3, 1.3, .5, 1); transform-style: preserve-3d; }
.mem-card.up .mem-inner { transform: rotateY(180deg); }
.mem-back, .mem-front {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 0 0 3px var(--ink);
}
.mem-back { background: var(--accent) repeating-linear-gradient(45deg, transparent 0 6px, rgba(255, 255, 255, .15) 6px 12px); }
.mem-front { background: var(--panel); transform: rotateY(180deg); }
.mem-card.matched .mem-front { background: #e3ffd9; }
.mem-card.matched .mem-inner { animation: matched 420ms; }
@keyframes matched { 50% { transform: rotateY(180deg) scale(1.12); } }
```

- [ ] **Step 5: Commit**

```bash
git add src/styles
git commit -m "Style: fioletowy motyw pikselowy, komponenty i animacje" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Prymitywy UI i router aplikacji

**Files:**
- Create: `src/ui/dom.ts`, `src/ui/transition.ts`, `src/ui/toast.ts`, `src/ui/confetti.ts`, `src/ui/coinCounter.ts`, `src/ui/needBar.ts`, `src/ui/dialog.ts`, `src/ui/comingSoon.ts`, `src/ui/screenHeader.ts`, `src/app.ts`

Kod DOM — weryfikacja przez `npm run build` (typy) i w przeglądarce w Task 19.

- [ ] **Step 1: `src/ui/dom.ts`**

```ts
import { ICONS, type IconName } from '../art/icons';
import { artDataUrl } from '../art/pixels';

type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

/** Ikona pixel art jako <img> w skali całkowitej (ostre piksele). */
export function icon(name: IconName, scale = 3, cls = 'px-icon'): HTMLImageElement {
  const art = ICONS[name];
  return h('img', {
    src: artDataUrl(name, art, scale),
    class: cls,
    alt: '',
    draggable: 'false',
    width: art[0].length * scale,
    height: art.length * scale,
  });
}
```

- [ ] **Step 2: `src/ui/transition.ts`**

```ts
export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animate(ms: number, fn: (p: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      fn(p);
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

const COLS = 9;
const ROWS = 18;

/** Przejście „rozpad na kratki”: zakrywa ekran pikselami, podmienia, odkrywa. */
export async function pixelTransition(host: HTMLElement, swap: () => void): Promise<void> {
  if (reducedMotion()) {
    swap();
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = COLS;
  canvas.height = ROWS;
  canvas.className = 'px transition';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3b2a5c';
  const order = [...Array(COLS * ROWS).keys()].sort(() => Math.random() - 0.5);
  const cell = (i: number, fn: (x: number, y: number) => void) => fn(order[i] % COLS, Math.floor(order[i] / COLS));
  await animate(150, (p) => {
    const n = Math.ceil(p * order.length);
    for (let i = 0; i < n; i++) cell(i, (x, y) => ctx.fillRect(x, y, 1, 1));
  });
  swap();
  await animate(150, (p) => {
    const n = Math.ceil(p * order.length);
    for (let i = 0; i < n; i++) cell(i, (x, y) => ctx.clearRect(x, y, 1, 1));
  });
  canvas.remove();
}
```

- [ ] **Step 3: `src/ui/toast.ts`**

```ts
import { h } from './dom';

let active: HTMLElement | null = null;

export function showToast(host: HTMLElement, text: string): void {
  active?.remove();
  const el = h('div', { class: 'toast px-box', role: 'status' }, text);
  host.append(el);
  active = el;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, 2200);
}
```

- [ ] **Step 4: `src/ui/confetti.ts`**

```ts
import { reducedMotion } from './transition';

const COLORS = ['#b48ae0', '#7a4fb3', '#ff7fb0', '#ffd34d', '#5aa8f0', '#ffffff', '#e0384f'];
const SCALE = 3;

/** Konfetti z pikselowych kwadracików na całym ekranie. */
export function confetti(host: HTMLElement, count = 90): void {
  if (reducedMotion()) return;
  const w = Math.ceil(host.clientWidth / SCALE);
  const hgt = Math.ceil(host.clientHeight / SCALE);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  canvas.className = 'px confetti';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const parts = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.8,
    y: -Math.random() * hgt * 0.3,
    vx: (Math.random() - 0.5) * 40,
    vy: 10 + Math.random() * 40,
    size: Math.random() < 0.3 ? 2 : 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    wobble: Math.random() * Math.PI * 2,
  }));
  const start = performance.now();
  let last = start;
  const frame = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.clearRect(0, 0, w, hgt);
    for (const p of parts) {
      p.vy += 60 * dt;
      p.wobble += dt * 8;
      p.x += (p.vx + Math.sin(p.wobble) * 10) * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    if (t - start < 2200) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
```

- [ ] **Step 5: `src/ui/coinCounter.ts`**

```ts
import { h, icon } from './dom';

export interface CoinCounter {
  el: HTMLElement;
  set(value: number): void;
}

/** Licznik monet z płynnym przeliczaniem i „podskokiem” przy zmianie. */
export function coinCounter(initial: number): CoinCounter {
  const num = h('span', { class: 'coin-num' }, String(initial));
  const el = h('div', { class: 'coin-pill px-box' }, icon('coin', 2), num);
  let shown = initial;
  let raf = 0;
  return {
    el,
    set(value) {
      if (value === shown) return;
      const from = shown;
      const start = performance.now();
      shown = value;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
      cancelAnimationFrame(raf);
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 500);
        num.textContent = String(Math.round(from + (value - from) * p));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
  };
}
```

- [ ] **Step 6: `src/ui/needBar.ts`**

```ts
import type { IconName } from '../art/icons';
import { h, icon } from './dom';

export interface NeedBar {
  el: HTMLElement;
  set(value: number): void;
}

export function needBar(kind: 'hunger' | 'mood' | 'energy', label: string, iconName: IconName): NeedBar {
  const fill = h('div', { class: 'need-fill' });
  const el = h(
    'div',
    { class: `need need-${kind}`, role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('div', { class: 'need-label' }, icon(iconName, 1), label),
    h('div', { class: 'need-track' }, fill),
  );
  return {
    el,
    set(value) {
      const v = Math.round(value);
      fill.style.width = `${v}%`;
      el.classList.toggle('low', v < 25);
      el.setAttribute('aria-valuenow', String(v));
      el.setAttribute('aria-label', `${label}: ${v}%`);
    },
  };
}
```

- [ ] **Step 7: `src/ui/dialog.ts`**

```ts
import { h } from './dom';

export function confirmDialog(host: HTMLElement, text: string, yes = 'Tak', no = 'Nie'): Promise<boolean> {
  return new Promise((resolve) => {
    const close = (value: boolean) => {
      overlay.remove();
      resolve(value);
    };
    const overlay = h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'dialog px-box', role: 'dialog' },
        h('p', {}, text),
        h(
          'div',
          { class: 'dialog-actions' },
          h('button', { class: 'px-btn secondary', onclick: () => close(false) }, no),
          h('button', { class: 'px-btn', onclick: () => close(true) }, yes),
        ),
      ),
    );
    host.append(overlay);
  });
}
```

- [ ] **Step 8: `src/ui/comingSoon.ts`**

```ts
import { h, icon } from './dom';

export function comingSoon(text: string): HTMLElement {
  return h('div', { class: 'coming-soon px-box' }, icon('lock', 4), h('p', {}, text));
}
```

- [ ] **Step 9: `src/app.ts`**

```ts
import type { Store } from './core/store';
import type { SpriteMap } from './sprites/loader';
import { confetti } from './ui/confetti';
import { showToast } from './ui/toast';
import { pixelTransition } from './ui/transition';

export type ScreenName = 'birthday' | 'room' | 'shop' | 'games' | 'profile' | 'wardrobe';
export type ScreenParams = Record<string, unknown>;

export interface Screen {
  el: HTMLElement;
  destroy?(): void;
}

export type ScreenFactory = (app: App, params?: ScreenParams) => Screen;

export interface App {
  readonly store: Store;
  readonly sprites: SpriteMap;
  readonly root: HTMLElement;
  go(name: ScreenName, params?: ScreenParams): Promise<void>;
  toast(text: string): void;
  celebrate(): void;
}

export function createApp(
  root: HTMLElement,
  store: Store,
  sprites: SpriteMap,
  screens: Record<ScreenName, ScreenFactory>,
): App {
  let current: Screen | null = null;
  let busy = false;
  const app: App = {
    store,
    sprites,
    root,
    async go(name, params) {
      if (busy) return;
      busy = true;
      try {
        const swap = () => {
          current?.destroy?.();
          current?.el.remove();
          current = screens[name](app, params);
          root.prepend(current.el);
        };
        if (current) await pixelTransition(root, swap);
        else swap();
      } finally {
        busy = false;
      }
    },
    toast: (text) => showToast(root, text),
    celebrate: () => confetti(root),
  };
  return app;
}
```

- [ ] **Step 10: `src/ui/screenHeader.ts`**

```ts
import type { App } from '../app';
import { coinCounter } from './coinCounter';
import { h, icon } from './dom';

/** Nagłówek podstron: przycisk powrotu do pokoju, tytuł, monety. */
export function screenHeader(app: App, title: string): { el: HTMLElement; destroy(): void } {
  const coins = coinCounter(app.store.get().coins);
  const unsubscribe = app.store.subscribe((s) => coins.set(s.coins));
  const el = h(
    'header',
    { class: 'screen-header' },
    h('button', { class: 'px-btn secondary icon-only', 'aria-label': 'Wróć', onclick: () => app.go('room') }, icon('back', 2)),
    h('h1', {}, title),
    coins.el,
  );
  return { el, destroy: unsubscribe };
}
```

- [ ] **Step 11: Sprawdź typy**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 12: Commit**

```bash
git add src/ui src/app.ts
git commit -m "Prymitywy UI, przejścia, konfetti i router ekranów" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Pokój — rysowanie, postać, lodówka

**Files:**
- Create: `src/pet/room.ts`, `src/pet/petRenderer.ts`, `src/ui/fridge.ts`, `src/ui/screens/room.ts`

- [ ] **Step 1: `src/pet/room.ts`**

```ts
import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';

/** Wymiary pokoju w pikselach logicznych; canvas skalowany CSS-em. */
export const ROOM_W = 128;
export const ROOM_H = 112;
export const FLOOR_Y = 88;
export const FEET_Y = 104;

const DAY = { wall: '#cdb8f0', stripe: '#c2abea', floor: '#8d68c4', board: '#7f5bb6', sky: '#9fd3ff', rug: '#ff9ec4', rugLine: '#f27fb0' };
const NIGHT = { wall: '#4a3a72', stripe: '#433468', floor: '#3a2a58', board: '#33254f', sky: '#1f1a3d', rug: '#7a3f63', rugLine: '#6a3556' };
const BUNTING = ['#ff7fb0', '#ffd34d', '#5aa8f0', '#9b6ee0'];

type Colors = typeof DAY;

export function drawRoom(ctx: CanvasRenderingContext2D, night: boolean, t: number): void {
  const c = night ? NIGHT : DAY;
  ctx.fillStyle = c.wall;
  ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);
  ctx.fillStyle = c.stripe;
  for (let x = 0; x < ROOM_W; x += 8) ctx.fillRect(x, 0, 4, FLOOR_Y);
  ctx.fillStyle = '#7a4fb3';
  ctx.fillRect(0, FLOOR_Y - 3, ROOM_W, 3);
  ctx.fillStyle = c.floor;
  ctx.fillRect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  ctx.fillStyle = c.board;
  for (let y = FLOOR_Y + 6; y < ROOM_H; y += 6) ctx.fillRect(0, y, ROOM_W, 1);
  drawWindow(ctx, 10, 16, c, night, t);
  drawPicture(ctx, 94, 22);
  drawBunting(ctx);
  drawRug(ctx, c);
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors, night: boolean, t: number): void {
  const w = 30;
  const h = 26;
  ctx.fillStyle = '#1b1326';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#f3ecff';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c.sky;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  if (night) {
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(x + 19, y + 5, 4, 4);
    ctx.fillStyle = c.sky;
    ctx.fillRect(x + 21, y + 4, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 6, 1, 1);
    ctx.fillRect(x + 11, y + 16, 1, 1);
    if (Math.floor(t / 600) % 2) ctx.fillRect(x + 23, y + 18, 1, 1);
    else ctx.fillRect(x + 5, y + 19, 1, 1);
  } else {
    const cloudX = x + 2 + (Math.floor(t / 250) % (w + 8)) - 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, w - 4, h - 4);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cloudX, y + 7, 8, 3);
    ctx.fillRect(cloudX + 2, y + 5, 4, 2);
    ctx.restore();
  }
  ctx.fillStyle = '#f3ecff';
  ctx.fillRect(x + 14, y, 2, h);
  ctx.fillRect(x, y + 12, w, 2);
  ctx.fillStyle = '#7a4fb3';
  ctx.fillRect(x - 3, y + h + 1, w + 6, 2);
}

function drawPicture(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#5c3a26';
  ctx.fillRect(x, y, 20, 16);
  ctx.fillStyle = '#f3ecff';
  ctx.fillRect(x + 2, y + 2, 16, 12);
  ctx.drawImage(artCanvas(ICONS.digit2), x + 6, y + 5);
  ctx.drawImage(artCanvas(ICONS.digit6), x + 11, y + 5);
}

function drawBunting(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#1b1326';
  ctx.fillRect(0, 4, ROOM_W, 1);
  for (let i = 0, x = 2; x < ROOM_W; i++, x += 10) {
    ctx.fillStyle = BUNTING[i % BUNTING.length];
    for (let r = 0; r < 4; r++) ctx.fillRect(x + r, 5 + r, 7 - 2 * r, 1);
  }
}

function drawRug(ctx: CanvasRenderingContext2D, c: Colors): void {
  ctx.fillStyle = c.rug;
  ctx.fillRect(36, 99, 56, 7);
  ctx.fillRect(34, 100, 60, 5);
  ctx.fillStyle = c.rugLine;
  ctx.fillRect(40, 101, 48, 1);
  ctx.fillRect(40, 103, 48, 1);
}
```

- [ ] **Step 2: `src/pet/petRenderer.ts`**

```ts
export interface PetDraw {
  frame: HTMLImageElement;
  x: number;
  feetY: number;
  flip: boolean;
  /** Podskok „oddychania” w pikselach. */
  bob: number;
  /** Spłaszczenie 0–0.1 (squash & stretch). */
  squash: number;
  /** Wysokość skoku w pikselach. */
  jump: number;
}

export function drawShadow(ctx: CanvasRenderingContext2D, x: number, feetY: number, jump: number): void {
  const w = jump > 4 ? 14 : 20;
  ctx.fillStyle = 'rgba(42, 31, 61, 0.3)';
  ctx.fillRect(Math.round(x - w / 2), feetY - 1, w, 2);
}

export function drawPet(ctx: CanvasRenderingContext2D, o: PetDraw): void {
  ctx.save();
  ctx.translate(Math.round(o.x), Math.round(o.feetY - o.bob - o.jump));
  ctx.scale((o.flip ? -1 : 1) * (1 + o.squash), 1 - o.squash);
  ctx.drawImage(o.frame, -Math.floor(o.frame.width / 2), -o.frame.height);
  ctx.restore();
}
```

- [ ] **Step 3: `src/ui/fridge.ts`**

```ts
import type { App } from '../app';
import { FOODS, type FoodDef, type FoodId } from '../core/config';
import { h, icon } from './dom';

/** Wysuwana lodówka: przeciągnij jedzenie na scenę albo stuknij, żeby nakarmić. */
export function openFridge(app: App, host: HTMLElement, target: HTMLElement, onFeed: (id: FoodId) => void): void {
  const state = app.store.get();
  const items = FOODS.filter((f) => (state.fridge[f.id] ?? 0) > 0);

  const close = () => {
    sheet.classList.add('out');
    setTimeout(() => backdrop.remove(), 220);
  };

  const list = items.length
    ? h('div', { class: 'fridge-items' }, ...items.map((f) => foodItem(f, state.fridge[f.id] ?? 0)))
    : h(
        'div',
        { class: 'fridge-empty' },
        h('p', {}, 'Lodówka jest pusta.'),
        h('button', { class: 'px-btn', onclick: () => { close(); void app.go('shop'); } }, 'Do sklepu'),
      );

  const sheet = h(
    'div',
    { class: 'sheet px-box' },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, 'Lodówka'),
      h('button', { class: 'px-btn secondary', onclick: close, 'aria-label': 'Zamknij' }, 'X'),
    ),
    h('p', { class: 'hint' }, 'Przeciągnij jedzenie do Gabi albo stuknij.'),
    list,
  );
  const backdrop = h('div', { class: 'sheet-backdrop' }, sheet);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  host.append(backdrop);

  function foodItem(food: FoodDef, count: number): HTMLElement {
    const btn = h(
      'button',
      { class: 'food-item', 'aria-label': `${food.name}, ${count} szt.` },
      icon(food.id, 4),
      h('span', { class: 'food-count' }, `×${count}`),
    );
    btn.addEventListener('pointerdown', (e) => startDrag(e, food));
    return btn;
  }

  function startDrag(e: PointerEvent, food: FoodDef): void {
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let dragging = false;
    const ghost = icon(food.id, 5, 'px-icon drag-ghost');
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
        dragging = true;
        document.body.append(ghost);
        sheet.classList.add('peek');
      }
      if (dragging) {
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      ghost.remove();
      sheet.classList.remove('peek');
      const r = target.getBoundingClientRect();
      const onTarget = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      if (!dragging || onTarget) {
        close();
        onFeed(food.id);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
}
```

- [ ] **Step 4: `src/ui/screens/room.ts`**

```ts
import type { App, Screen } from '../../app';
import type { IconName } from '../../art/icons';
import { ICONS } from '../../art/icons';
import { artCanvas } from '../../art/pixels';
import { content } from '../../content';
import type { FoodId } from '../../core/config';
import { feed, petCharacter, setSleeping } from '../../core/economy';
import { moodLevel, needStatus } from '../../core/needs';
import { dayNumber } from '../../core/time';
import type { GameState } from '../../core/types';
import { animationName, createBrain, stepBrain, triggerBrain, type Brain } from '../../pet/brain';
import { drawPet, drawShadow } from '../../pet/petRenderer';
import { FEET_Y, ROOM_H, ROOM_W, drawRoom } from '../../pet/room';
import { pick, pickLine } from '../../pet/speech';
import { ANIMATIONS, frameAt, resolveAnimation, type OverlayName } from '../../sprites/animations';
import framesMeta from '../../sprites/frames.generated.json';
import { spriteUrl } from '../../sprites/loader';
import { coinCounter } from '../coinCounter';
import { h, icon } from '../dom';
import { openFridge } from '../fridge';
import { needBar } from '../needBar';

interface Particle {
  kind: 'heart' | 'zzz';
  x: number;
  y: number;
  vy: number;
  life: number;
}

const [FRAME_W, FRAME_H] = framesMeta.canvas;
const HEAD_Y = FEET_Y - FRAME_H;

export function roomScreen(app: App): Screen {
  const { store } = app;
  const s0 = store.get();

  const canvas = h('canvas', { class: 'px stage-canvas', width: ROOM_W, height: ROOM_H });
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const speech = h('div', { class: 'speech px-box hidden', 'aria-live': 'polite' });
  const coins = coinCounter(s0.coins);
  const dayLabel = h('span', {}, `Dzień ${dayNumber(s0.createdAt, Date.now())}`);
  const bars = {
    hunger: needBar('hunger', 'Głód', 'apple'),
    mood: needBar('mood', 'Humor', 'heart'),
    energy: needBar('energy', 'Energia', 'bolt'),
  };
  const lightIcon = h('span', { class: 'nav-icon' });
  const lightLabel = h('span', {}, 'Światło');

  const navBtn = (name: IconName, label: string, onClick: () => void) =>
    h('button', { class: 'nav-btn', onclick: onClick }, h('span', { class: 'nav-icon' }, icon(name, 3)), h('span', {}, label));

  const stage = h('div', { class: 'stage px-box' }, canvas, speech);
  const el = h(
    'div',
    { class: 'screen room' },
    h(
      'header',
      { class: 'room-top' },
      h(
        'button',
        { class: 'profile-btn', 'aria-label': 'Profil', onclick: () => app.go('profile') },
        h('img', { class: 'px avatar', src: spriteUrl('portrait_a'), alt: '' }),
        dayLabel,
      ),
      coins.el,
    ),
    h('div', { class: 'needs' }, bars.hunger.el, bars.mood.el, bars.energy.el),
    h('div', { class: 'stage-wrap' }, stage),
    h(
      'nav',
      { class: 'room-nav' },
      navBtn('apple', 'Karm', () => openFridge(app, el, stage, doFeed)),
      navBtn('gamepad', 'Graj', () => app.go('games')),
      h('button', { class: 'nav-btn', onclick: toggleLight }, lightIcon, lightLabel),
      navBtn('shopbag', 'Sklep', () => app.go('shop')),
      navBtn('dress', 'Szafa', () => app.go('wardrobe')),
    ),
  );

  let destroyed = false;
  let brain: Brain = createBrain(performance.now());
  let lastAnim = '';
  let animStart = 0;
  let squashUntil = 0;
  let jumpStart = -1;
  let speechTimer = 0;
  let nextChatAt = performance.now() + 20_000;
  let zzzTimer = 0;
  let raf = 0;
  let last = performance.now();
  const particles: Particle[] = [];

  function say(text: string, ms = 3200): void {
    speech.textContent = text;
    speech.classList.remove('hidden', 'pop');
    void speech.offsetWidth;
    speech.classList.add('pop');
    clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => speech.classList.add('hidden'), ms);
  }

  function hearts(n: number): void {
    for (let i = 0; i < n; i++) {
      particles.push({ kind: 'heart', x: brain.x - 8 + Math.random() * 16, y: HEAD_Y + 4 - Math.random() * 6, vy: 10 + Math.random() * 8, life: 1.4 + Math.random() * 0.5 });
    }
  }

  function jump(now: number): void {
    jumpStart = now;
    brain = triggerBrain(brain, 'jump', now);
  }

  function sync(s: GameState): void {
    bars.hunger.set(s.needs.hunger);
    bars.mood.set(s.needs.mood);
    bars.energy.set(s.needs.energy);
    coins.set(s.coins);
    lightIcon.replaceChildren(icon(s.sleeping ? 'moon' : 'bulb', 3));
    lightLabel.textContent = s.sleeping ? 'Pobudka' : 'Światło';
    el.classList.toggle('night', s.sleeping);
  }

  function doFeed(id: FoodId): void {
    const res = feed(store.get(), id);
    if (!res.ok) {
      app.toast('Lodówka jest pusta');
      return;
    }
    store.update(() => res.state);
    brain = triggerBrain(brain, 'eat', performance.now());
    say(pick(id === 'kitkat' ? content.lines.kitkat : content.lines.eat), 2400);
    if (id === 'kitkat') {
      setTimeout(() => {
        if (destroyed) return;
        jump(performance.now());
        hearts(8);
      }, 1600);
    }
  }

  function toggleLight(): void {
    const wasSleeping = store.get().sleeping;
    store.update((s) => setSleeping(s, !wasSleeping));
    if (wasSleeping) {
      brain = triggerBrain(brain, 'wave', performance.now());
      say(pick(content.lines.wakeUp));
    } else {
      say(pick(content.lines.goodNight), 2000);
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * ROOM_W) / r.width;
    const y = ((e.clientY - r.top) * ROOM_H) / r.height;
    if (Math.abs(x - brain.x) > FRAME_W / 2 || y < HEAD_Y || y > FEET_Y) return;
    const now = performance.now();
    if (store.get().sleeping) {
      store.update((s) => setSleeping(s, false));
      brain = triggerBrain(brain, 'wave', now);
      say(pick(content.lines.wakeUp));
      return;
    }
    squashUntil = now + 220;
    const res = petCharacter(store.get(), Date.now());
    if (res.accepted) {
      store.update(() => res.state);
      jump(now);
      hearts(3);
      say(pick(content.lines.pet), 2000);
    } else {
      brain = triggerBrain(brain, 'wave', now);
    }
  });

  function drawOverlay(kind: OverlayName | null, t: number, dt: number): void {
    if (kind === 'zzz') {
      zzzTimer -= dt;
      if (zzzTimer <= 0) {
        zzzTimer = 900;
        particles.push({ kind: 'zzz', x: brain.x + 8, y: HEAD_Y + 4, vy: 8, life: 2.2 });
      }
    } else if (kind === 'cloud') {
      ctx.drawImage(artCanvas(ICONS.cloud), Math.round(brain.x - 6), HEAD_Y - 12 + (Math.floor(t / 500) % 2));
    } else if (kind === 'food') {
      ctx.drawImage(artCanvas(ICONS.foodBubble), Math.round(brain.x + 10), HEAD_Y - 4 + (Math.floor(t / 600) % 2));
    }
  }

  function drawParticles(dt: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt / 1000;
      p.y -= (p.vy * dt) / 1000;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.min(1, p.life * 2);
      const art = artCanvas(p.kind === 'zzz' ? ICONS.zzz : ICONS.heartSmall);
      const sway = p.kind === 'zzz' ? Math.sin(p.life * 3) * 3 : 0;
      ctx.drawImage(art, Math.round(p.x + sway), Math.round(p.y));
      ctx.globalAlpha = 1;
    }
  }

  function frame(t: number): void {
    if (destroyed) return;
    const dt = Math.min(50, t - last);
    last = t;
    const s = store.get();
    const mood = moodLevel(s.needs);
    const status = needStatus(s.needs);
    brain = stepBrain(brain, dt, { now: t, mood, sleeping: s.sleeping, rng: Math.random });
    const name = animationName(brain, { sleeping: s.sleeping, hungry: status.hungry, mood });
    if (name !== lastAnim) {
      lastAnim = name;
      animStart = t;
    }
    const anim = resolveAnimation(ANIMATIONS, name);
    const img = app.sprites.get(frameAt(anim, t - animStart));

    drawRoom(ctx, s.sleeping, t);
    const bob = brain.action === 'idle' && !s.sleeping ? Math.floor(t / 750) % 2 : 0;
    const squash = t < squashUntil ? 0.08 * Math.sin(((squashUntil - t) / 220) * Math.PI) : 0;
    const jumpH = jumpStart >= 0 && t - jumpStart < 600 ? Math.round(Math.sin(((t - jumpStart) / 600) * Math.PI) * 10) : 0;
    drawShadow(ctx, brain.x, FEET_Y, jumpH);
    if (img) {
      drawPet(ctx, { frame: img, x: brain.x, feetY: FEET_Y, flip: anim.flipForRight && brain.facing === 'right', bob, squash, jump: jumpH });
    }
    if (anim.dim) {
      ctx.fillStyle = 'rgba(20, 12, 45, 0.45)';
      ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    }
    drawOverlay(anim.overlay, t, dt);
    drawParticles(dt);

    if (!s.sleeping && t >= nextChatAt) {
      nextChatAt = t + 20_000 + Math.random() * 10_000;
      brain = triggerBrain(brain, 'talk', t);
      say(pickLine(s.needs));
    }
    raf = requestAnimationFrame(frame);
  }

  sync(s0);
  const unsubscribe = store.subscribe(sync);
  if (!s0.sleeping) {
    brain = triggerBrain(brain, 'wave', performance.now());
    say(pick(content.lines.greeting), 2400);
  }
  raf = requestAnimationFrame(frame);

  return {
    el,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(speechTimer);
      unsubscribe();
    },
  };
}
```

- [ ] **Step 5: Sprawdź typy**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 6: Commit**

```bash
git add src/pet/room.ts src/pet/petRenderer.ts src/ui/fridge.ts src/ui/screens/room.ts
git commit -m "Pokój: tło, postać z animacjami, lodówka i reakcje" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Sklep

**Files:**
- Create: `src/ui/screens/shop.ts`

- [ ] **Step 1: `src/ui/screens/shop.ts`**

```ts
import type { App, Screen } from '../../app';
import { FOODS, type FoodDef } from '../../core/config';
import { buyFood, priceOf } from '../../core/economy';
import { comingSoon } from '../comingSoon';
import { h, icon } from '../dom';
import { screenHeader } from '../screenHeader';

type Tab = 'food' | 'extras';

export function shopScreen(app: App): Screen {
  const header = screenHeader(app, 'Sklep');
  const body = h('div', { class: 'shop-body' });
  let tab: Tab = 'food';

  const tabButton = (label: string, id: Tab) =>
    h('button', { class: 'tab', 'data-tab': id, onclick: () => { tab = id; render(); } }, label);
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, tabButton('Jedzenie', 'food'), tabButton('Dodatki', 'extras'));

  function foodRow(food: FoodDef): HTMLElement {
    const state = app.store.get();
    const price = priceOf(state, food.id, Date.now());
    const owned = state.fridge[food.id] ?? 0;
    const effects = [`+${food.hunger} głodu`, food.mood ? `+${food.mood} humoru` : null].filter(Boolean).join(' · ');
    const buy = h(
      'button',
      { class: price === 0 ? 'px-btn free' : 'px-btn', 'aria-label': `Kup: ${food.name}` },
      price === 0 ? 'Gratis!' : h('span', { class: 'price' }, icon('coin', 2), String(price)),
    );
    buy.addEventListener('click', () => {
      const res = buyFood(app.store.get(), food.id, Date.now());
      if (!res.ok) {
        buy.classList.remove('shake');
        void buy.offsetWidth;
        buy.classList.add('shake');
        app.toast('Za mało monet. Zagraj w minigrę!');
        return;
      }
      app.store.update(() => res.state);
      app.toast(`${food.name} jest w lodówce!`);
      if (food.id === 'kitkat' || food.id === 'cake') app.celebrate();
      render();
    });
    const fav = food.id === 'kitkat';
    return h(
      'div',
      { class: fav ? 'shop-row px-box fav' : 'shop-row px-box' },
      icon(food.id, 4),
      h(
        'div',
        { class: 'shop-info' },
        h('strong', {}, food.name, fav ? h('span', { class: 'badge' }, 'ulubiony') : null),
        h('small', {}, effects),
        h('small', {}, price === 0 ? 'Prezent dnia!' : `W lodówce: ${owned}`),
      ),
      buy,
    );
  }

  function render(): void {
    tabs.querySelectorAll<HTMLElement>('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    body.replaceChildren(
      ...(tab === 'food' ? FOODS.map(foodRow) : [comingSoon('Czapki, sukienki i nowe tła już wkrótce!')]),
    );
  }

  render();
  return { el: h('div', { class: 'screen shop' }, header.el, tabs, body), destroy: header.destroy };
}
```

- [ ] **Step 2: Sprawdź typy**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 3: Commit**

```bash
git add src/ui/screens/shop.ts
git commit -m "Sklep z jedzeniem i darmowym KitKatem dnia" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Szkielet minigier — nagrody, powłoka, lista gier

**Files:**
- Create: `src/games/types.ts`, `src/games/rewards.ts`, `src/games/canvas.ts`, `src/games/shell.ts`, `src/games/index.ts`, `src/ui/screens/games.ts`
- Test: `tests/games/rewards.test.ts`

- [ ] **Step 1: Test nagród**

`tests/games/rewards.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { candlesReward, catchReward, memoryReward } from '../../src/games/rewards';

describe('nagrody', () => {
  it('Łapanie: 1 moneta za 10 pkt, maks. 50', () => {
    expect(catchReward(0)).toEqual({ coins: 0, moodBoost: 10 });
    expect(catchReward(125).coins).toBe(12);
    expect(catchReward(900).coins).toBe(50);
  });
  it('Świeczki: 5–40 monet', () => {
    expect(candlesReward(0)).toEqual({ coins: 5, moodBoost: 15 });
    expect(candlesReward(60).coins).toBe(21);
    expect(candlesReward(500).coins).toBe(40);
  });
  it('Memory: 15–40 monet', () => {
    expect(memoryReward(100)).toEqual({ coins: 40, moodBoost: 10 });
    expect(memoryReward(52).coins).toBe(21);
    expect(memoryReward(10).coins).toBe(15);
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/games/rewards.test.ts`
Expected: FAIL — brak modułu `rewards`.

- [ ] **Step 3: `src/games/types.ts`**

```ts
import type { IconName } from '../art/icons';
import type { SpriteMap } from '../sprites/loader';

export interface GameEnv {
  body: HTMLElement;
  sprites: SpriteMap;
  signal: AbortSignal;
  setHud(text: string): void;
}

export interface Reward {
  coins: number;
  moodBoost: number;
}

export interface MiniGame {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  category: 'arcade' | 'puzzle';
  /** Rozgrywka; zwraca wynik punktowy. Przy przerwaniu (`signal`) może nigdy się nie rozwiązać. */
  play(env: GameEnv): Promise<number>;
  reward(score: number): Reward;
}
```

- [ ] **Step 4: `src/games/rewards.ts`**

```ts
import type { Reward } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function catchReward(score: number): Reward {
  return { coins: Math.min(50, Math.floor(score / 10)), moodBoost: 10 };
}

export function candlesReward(score: number): Reward {
  return { coins: clamp(Math.round(score * 0.35), 5, 40), moodBoost: 15 };
}

export function memoryReward(score: number): Reward {
  return { coins: clamp(Math.round(score * 0.4), 15, 40), moodBoost: 10 };
}
```

- [ ] **Step 5: Uruchom — PASS**

Run: `npx vitest run tests/games/rewards.test.ts`
Expected: PASS (3 testy).

- [ ] **Step 6: `src/games/canvas.ts`**

```ts
import { h } from '../ui/dom';

export interface GameCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  toLogical(e: PointerEvent): { x: number; y: number };
  dispose(): void;
}

/** Canvas w rozdzielczości logicznej, skalowany do miejsca (całkowicie, gdy się da). */
export function makeCanvas(body: HTMLElement, w: number, hgt: number): GameCanvas {
  const canvas = h('canvas', { class: 'px game-canvas', width: w, height: hgt });
  body.append(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const fit = () => {
    const s = Math.min(body.clientWidth / w, body.clientHeight / hgt);
    const scale = s >= 2 ? Math.floor(s) : s;
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${hgt * scale}px`;
  };
  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(body);
  return {
    canvas,
    ctx,
    toLogical(e) {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * w) / r.width, y: ((e.clientY - r.top) * hgt) / r.height };
    },
    dispose: () => observer.disconnect(),
  };
}

/** Pętla gry: woła `fn(dt)` co klatkę, dopóki zwraca true i gra nie została przerwana. */
export function runLoop(signal: AbortSignal, fn: (dtMs: number) => boolean): Promise<void> {
  return new Promise((resolve) => {
    let last = performance.now();
    const frame = (t: number) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const dt = Math.min(50, t - last);
      last = t;
      if (fn(dt)) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
```

- [ ] **Step 7: `src/games/shell.ts`**

```ts
import type { App } from '../app';
import type { GameResult } from '../core/types';
import { h, icon } from '../ui/dom';
import type { MiniGame } from './types';

/** Uruchamia minigrę na pełnym ekranie; rozwiązuje się po odebraniu nagrody albo przerwaniu. */
export function runGame(game: MiniGame, app: App): Promise<GameResult> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const hud = h('span', { class: 'hud', 'aria-live': 'polite' });
    const body = h('div', { class: 'game-body' });
    const close = h('button', { class: 'px-btn secondary', 'aria-label': 'Zakończ grę' }, 'X');
    const shell = h('div', { class: 'game-shell' }, h('header', { class: 'game-head' }, close, h('h1', {}, game.name), hud), body);
    app.root.append(shell);

    let finished = false;
    const finish = (result: GameResult) => {
      if (finished) return;
      finished = true;
      controller.abort();
      shell.classList.add('out');
      setTimeout(() => shell.remove(), 200);
      resolve(result);
    };

    close.addEventListener('click', () => finish({ gameId: game.id, score: 0, coins: 0, moodBoost: 0, aborted: true }));

    void game
      .play({ body, sprites: app.sprites, signal: controller.signal, setHud: (t) => { hud.textContent = t; } })
      .then((score) => {
        if (finished) return;
        const reward = game.reward(score);
        const isRecord = score > (app.store.get().records[game.id] ?? 0);
        const result: GameResult = { gameId: game.id, score, ...reward, aborted: false };
        shell.append(
          h(
            'div',
            { class: 'overlay' },
            h(
              'div',
              { class: 'dialog px-box end-panel' },
              h('h2', {}, isRecord ? 'Nowy rekord!' : 'Koniec gry!'),
              h('p', { class: 'end-score' }, `Wynik: ${score}`),
              h('p', { class: 'end-reward' }, icon('coin', 3), `+${reward.coins}`, icon('heart', 2), `+${reward.moodBoost}`),
              h('button', { class: 'px-btn big', onclick: () => finish(result) }, 'Odbierz'),
            ),
          ),
        );
        if (isRecord || reward.coins >= 30) app.celebrate();
      });
  });
}
```

- [ ] **Step 8: `src/games/index.ts`**

```ts
import type { IconName } from '../art/icons';
import type { MiniGame } from './types';

export const GAMES: MiniGame[] = [];

/** Gry z etapu 2 — widoczne jako zablokowane „wkrótce”. */
export const COMING_SOON: { name: string; icon: IconName; category: MiniGame['category'] }[] = [
  { name: 'Bricks n Balls', icon: 'bricks', category: 'arcade' },
  { name: 'Sudoku', icon: 'grid', category: 'puzzle' },
  { name: 'Szyfrokrzyżówka', icon: 'letters', category: 'puzzle' },
];
```

- [ ] **Step 9: `src/ui/screens/games.ts`**

```ts
import type { App, Screen } from '../../app';
import { CONFIG } from '../../core/config';
import { applyGameResult } from '../../core/economy';
import { COMING_SOON, GAMES } from '../../games';
import { runGame } from '../../games/shell';
import type { MiniGame } from '../../games/types';
import { confirmDialog } from '../dialog';
import { h, icon } from '../dom';
import { screenHeader } from '../screenHeader';

export function gamesScreen(app: App): Screen {
  const header = screenHeader(app, 'Minigry');
  const body = h('div', { class: 'games-body' });

  function card(game: MiniGame): HTMLElement {
    const record = app.store.get().records[game.id];
    return h(
      'button',
      { class: 'game-card px-box', onclick: () => void start(game) },
      icon(game.icon, 4),
      h('strong', {}, game.name),
      h('small', {}, game.description),
      record ? h('small', { class: 'record' }, `Rekord: ${record}`) : null,
    );
  }

  function soon(item: (typeof COMING_SOON)[number]): HTMLElement {
    return h(
      'div',
      { class: 'game-card px-box soon', 'aria-disabled': 'true' },
      icon(item.icon, 4),
      h('strong', {}, item.name),
      h('small', {}, 'wkrótce'),
      icon('lock', 2, 'px-icon lock'),
    );
  }

  function section(title: string, category: MiniGame['category']): HTMLElement {
    const cards = [
      ...GAMES.filter((g) => g.category === category).map(card),
      ...COMING_SOON.filter((s) => s.category === category).map(soon),
    ];
    return h('section', { class: 'game-section' }, h('h2', {}, title), h('div', { class: 'game-grid' }, ...cards));
  }

  function render(): void {
    body.replaceChildren(section('Zręcznościowe', 'arcade'), section('Łamigłówki', 'puzzle'));
  }

  async function start(game: MiniGame): Promise<void> {
    if (app.store.get().needs.energy < CONFIG.games.tiredBelow) {
      const ok = await confirmDialog(app.root, 'Jestem zbyt śpiąca… Zagrać mimo to?', 'Gramy!', 'Nie');
      if (!ok) return;
    }
    const result = await runGame(game, app);
    if (result.aborted) return;
    app.store.update((s) => applyGameResult(s, result));
    app.toast(`+${result.coins} monet!`);
    render();
  }

  render();
  return { el: h('div', { class: 'screen games' }, header.el, body), destroy: header.destroy };
}
```

- [ ] **Step 10: Typy i testy**

Run: `npx tsc --noEmit && npm test`
Expected: brak błędów typów, wszystkie testy PASS.

- [ ] **Step 11: Commit**

```bash
git add src/games src/ui/screens/games.ts tests/games
git commit -m "Szkielet minigier: nagrody, powłoka gry, lista gier" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Ekrany: urodziny, profil, szafa, instalacja

**Files:**
- Create: `src/ui/screens/birthday.ts`, `src/ui/screens/profile.ts`, `src/ui/screens/wardrobe.ts`, `src/ui/install.ts`

- [ ] **Step 1: `src/ui/screens/birthday.ts`**

```ts
import type { App, Screen, ScreenParams } from '../../app';
import { content } from '../../content';
import { spriteUrl } from '../../sprites/loader';
import { h } from '../dom';

export function birthdayScreen(app: App, params?: ScreenParams): Screen {
  const replay = params?.replay === true;
  const start = () => {
    app.store.update((s) => (s.seenBirthday ? s : { ...s, seenBirthday: true }));
    void app.go(replay ? 'profile' : 'room');
  };
  const el = h(
    'div',
    { class: 'screen birthday' },
    h('div', { class: 'bday-age', 'aria-label': `${content.age} urodziny` }, String(content.age)),
    h(
      'div',
      { class: 'bday-hero' },
      h('img', { class: 'px portrait-big', src: spriteUrl('portrait_b'), alt: `Portret: ${content.name}` }),
      h('img', { class: 'px wave-sprite', src: spriteUrl('fun_wave'), alt: '' }),
    ),
    h('h1', { class: 'bday-title' }, content.wishesTitle),
    h(
      'div',
      { class: 'bday-wishes px-box' },
      ...content.wishes.map((p) => h('p', {}, p)),
      h('p', { class: 'signature' }, content.signature),
    ),
    h('button', { class: 'px-btn big', onclick: start }, replay ? 'Wróć' : 'Zaczynamy!'),
  );
  const timers = [setTimeout(() => app.celebrate(), 400), setTimeout(() => app.celebrate(), 2600)];
  return { el, destroy: () => timers.forEach(clearTimeout) };
}
```

- [ ] **Step 2: `src/ui/screens/profile.ts`**

```ts
import type { App, Screen } from '../../app';
import { content } from '../../content';
import { dayNumber } from '../../core/time';
import { GAMES } from '../../games';
import { spriteUrl } from '../../sprites/loader';
import { h, icon } from '../dom';
import { screenHeader } from '../screenHeader';

export function profileScreen(app: App): Screen {
  const header = screenHeader(app, 'Profil');
  const s = app.store.get();
  const rows = GAMES.map((g) =>
    h('li', {}, icon(g.icon, 2), h('span', {}, g.name), h('strong', {}, String(s.records[g.id] ?? '—'))),
  );
  const el = h(
    'div',
    { class: 'screen profile' },
    header.el,
    h(
      'div',
      { class: 'profile-body' },
      h(
        'div',
        { class: 'profile-card px-box' },
        h('img', { class: 'px portrait-mid', src: spriteUrl('portrait_a'), alt: '' }),
        h('h2', {}, content.name),
        h('p', {}, `Dzień ${dayNumber(s.createdAt, Date.now())} w ${content.appName}`),
      ),
      h('section', { class: 'records px-box' }, h('h2', {}, 'Rekordy'), h('ul', {}, ...rows)),
      h('button', { class: 'px-btn', onclick: () => app.go('birthday', { replay: true }) }, 'Pokaż życzenia'),
    ),
  );
  return { el, destroy: header.destroy };
}
```

- [ ] **Step 3: `src/ui/screens/wardrobe.ts`**

```ts
import type { App, Screen } from '../../app';
import { spriteUrl } from '../../sprites/loader';
import { comingSoon } from '../comingSoon';
import { h } from '../dom';
import { screenHeader } from '../screenHeader';

export function wardrobeScreen(app: App): Screen {
  const header = screenHeader(app, 'Szafa');
  const el = h(
    'div',
    { class: 'screen wardrobe' },
    header.el,
    h(
      'div',
      { class: 'wardrobe-body' },
      h('img', { class: 'px wardrobe-preview', src: spriteUrl('idle_front'), alt: '' }),
      comingSoon('Szafa otworzy się już wkrótce: sukienki, czapki i nowe tła!'),
    ),
  );
  return { el, destroy: header.destroy };
}
```

- [ ] **Step 4: `src/ui/install.ts`**

```ts
import { content } from '../content';
import { spriteUrl } from '../sprites/loader';
import { h } from './dom';

/** Ekran dla zwykłej karty Safari: zapis gry działa tylko w aplikacji z ekranu początkowego. */
export function mountInstall(root: HTMLElement): void {
  root.append(
    h(
      'div',
      { class: 'screen install' },
      h('img', { class: 'px portrait-mid', src: spriteUrl('portrait_a'), alt: '' }),
      h('h1', {}, content.appName),
      h('p', {}, `Prezent dla ${content.nameGenitive}! Zainstaluj go na ekranie początkowym:`),
      h(
        'ol',
        { class: 'install-steps px-box' },
        h('li', {}, 'Stuknij ', h('strong', {}, 'Udostępnij'), ' na pasku Safari (kwadrat ze strzałką).'),
        h('li', {}, 'Wybierz ', h('strong', {}, 'Dodaj do ekranu początkowego'), '.'),
        h('li', {}, 'Otwórz ', h('strong', {}, content.appName), ' z ekranu początkowego.'),
      ),
      h('a', { class: 'small-link', href: '?play' }, 'Zagraj w przeglądarce (osobny zapis)'),
    ),
  );
}
```

- [ ] **Step 5: Sprawdź typy**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/birthday.ts src/ui/screens/profile.ts src/ui/screens/wardrobe.ts src/ui/install.ts
git commit -m "Ekrany: urodziny, profil, szafa (wkrótce), instalacja" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Start aplikacji, PWA i pierwszy podgląd

**Files:**
- Modify: `src/main.ts` (zastąp całość)
- Create: `.claude/launch.json`
- Delete: `tests/sanity.test.ts`

- [ ] **Step 1: `src/main.ts`**

```ts
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import './styles/theme.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/games.css';
import { registerSW } from 'virtual:pwa-register';
import { createApp, type ScreenFactory, type ScreenName } from './app';
import { CONFIG } from './core/config';
import { claimDailyBonus } from './core/economy';
import { applyElapsed } from './core/needs';
import { loadState, saveState } from './core/save';
import { Store } from './core/store';
import { ANIMATIONS, allFrameNames } from './sprites/animations';
import framesMeta from './sprites/frames.generated.json';
import { loadSprites } from './sprites/loader';
import { mountInstall } from './ui/install';
import { birthdayScreen } from './ui/screens/birthday';
import { gamesScreen } from './ui/screens/games';
import { profileScreen } from './ui/screens/profile';
import { roomScreen } from './ui/screens/room';
import { shopScreen } from './ui/screens/shop';
import { wardrobeScreen } from './ui/screens/wardrobe';

const SCREENS: Record<ScreenName, ScreenFactory> = {
  birthday: birthdayScreen,
  room: roomScreen,
  shop: shopScreen,
  games: gamesScreen,
  profile: profileScreen,
  wardrobe: wardrobeScreen,
};

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || matchMedia('(display-mode: standalone)').matches;
}

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  const browserAllowed = import.meta.env.DEV || new URLSearchParams(location.search).has('play');
  if (!isStandalone() && !browserAllowed) {
    mountInstall(root);
    return;
  }
  void navigator.storage?.persist?.();

  const now = Date.now();
  const loaded = loadState(localStorage, now);
  const bonus = claimDailyBonus(applyElapsed(loaded.state, now), now);
  const store = new Store(bonus.state, localStorage);
  saveState(localStorage, bonus.state);

  const names = new Set([...allFrameNames(ANIMATIONS), ...framesMeta.body, ...Object.keys(framesMeta.portraits)]);
  const sprites = await loadSprites([...names]);
  const app = createApp(root, store, sprites, SCREENS);
  await app.go(store.get().seenBirthday ? 'room' : 'birthday');

  if (loaded.recovered) app.toast('Nie udało się wczytać zapisu, zaczynamy od nowa.');
  else if (bonus.granted) app.toast(`Codzienny bonus: +${CONFIG.coins.dailyBonus} monet!`);

  const tick = () => {
    const t = Date.now();
    let granted = false;
    store.update((s) => {
      const r = claimDailyBonus(applyElapsed(s, t), t);
      granted = r.granted;
      return r.state;
    });
    if (granted) app.toast(`Codzienny bonus: +${CONFIG.coins.dailyBonus} monet!`);
  };
  setInterval(tick, 10_000);

  let pendingUpdate = false;
  const updateSW = registerSW({
    onNeedRefresh() {
      pendingUpdate = true;
      app.toast('Jest nowa wersja! Uruchom aplikację ponownie.');
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveState(localStorage, store.get());
      if (pendingUpdate) void updateSW(true);
    } else {
      tick();
    }
  });
}

void boot();
```

- [ ] **Step 2: `.claude/launch.json` i usunięcie testu sanity**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "gabigochi", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

```bash
git rm tests/sanity.test.ts
```

- [ ] **Step 3: Typy, testy, build**

Run: `npm test && npm run build`
Expected: testy PASS; build bez błędów; w `dist/` są `sw.js`, `manifest.webmanifest`, `sprites/`, `icons/`.

- [ ] **Step 4: Podgląd w przeglądarce (wbudowana przeglądarka)**

1. `preview_start` z nazwą `gabigochi`, potem `resize_window` z presetem `mobile`.
2. Wyczyść zapis: `javascript_tool` → `localStorage.clear(); location.reload()`.
3. Zrzut ekranu: ekran urodzinowy (26, portret, machająca postać, życzenia, konfetti).
4. Kliknij „Zaczynamy!” → pokój: paski, monety 150, postać macha i mówi powitanie, potem chodzi.
5. `read_console_messages` z `onlyErrors: true` → brak błędów.
6. Napraw problemy wizualne (rozmiary, przycięcia), zanim przejdziesz dalej.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Start aplikacji, rejestracja PWA, tyknięcia zegara" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Minigra „Łapanie jedzenia”

**Files:**
- Create: `src/games/catchLogic.ts`, `src/games/catchGame.ts`
- Modify: `src/games/index.ts`
- Test: `tests/games/catchLogic.test.ts`

- [ ] **Step 1: Test**

`tests/games/catchLogic.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CATCH, POINTS, createCatch, pickKind, stepCatch, type CatchState } from '../../src/games/catchLogic';

const quiet = (patch: Partial<CatchState>): CatchState => ({ ...createCatch(), spawnIn: 1e9, ...patch });
const rng = () => 0.99;

describe('stepCatch', () => {
  it('złapane jedzenie daje punkty', () => {
    const s = quiet({ items: [{ x: 58, y: CATCH.catchTop, kind: 'apple', vy: 0 }] });
    const { state, events } = stepCatch(s, 16, rng);
    expect(state.score).toBe(POINTS.apple);
    expect(state.items).toHaveLength(0);
    expect(events).toContainEqual({ type: 'caught', kind: 'apple', points: POINTS.apple });
  });

  it('brokuł zabiera serduszko', () => {
    const s = quiet({ items: [{ x: 58, y: CATCH.catchTop, kind: 'broccoli', vy: 0 }] });
    const { state, events } = stepCatch(s, 16, rng);
    expect(state.lives).toBe(CATCH.lives - 1);
    expect(events).toContainEqual({ type: 'hit' });
  });

  it('nie złapane spada poza ekran', () => {
    const s = quiet({ items: [{ x: 0, y: CATCH.H - 1, kind: 'pizza', vy: 100 }] });
    const { state } = stepCatch(s, 16, rng);
    expect(state.items).toHaveLength(0);
    expect(state.score).toBe(0);
  });

  it('koniec po czasie', () => {
    const { state, events } = stepCatch(quiet({ t: CATCH.duration - 10 }), 20, rng);
    expect(state.over).toBe(true);
    expect(events).toContainEqual({ type: 'over' });
  });

  it('koniec po utracie serduszek', () => {
    const s = quiet({ lives: 1, items: [{ x: 58, y: CATCH.catchTop, kind: 'broccoli', vy: 0 }] });
    expect(stepCatch(s, 16, rng).state.over).toBe(true);
  });

  it('postać idzie do celu z ograniczoną prędkością, w granicach planszy', () => {
    const { state } = stepCatch(quiet({ playerX: 64, targetX: 999 }), 100, rng);
    expect(state.playerX).toBeCloseTo(64 + CATCH.playerSpeed * 0.1);
    expect(state.moving).toBe(1);
    const far = stepCatch(quiet({ playerX: 110, targetX: 999 }), 1000, rng).state;
    expect(far.playerX).toBe(CATCH.maxX);
  });

  it('pojawia się nowe jedzenie', () => {
    const { state } = stepCatch({ ...createCatch(), spawnIn: 0 }, 16, () => 0.3);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].kind).toBe('apple');
  });
});

describe('pickKind', () => {
  it('rozkład rodzajów', () => {
    expect(pickKind(0.01)).toBe('kitkat');
    expect(pickKind(0.1)).toBe('broccoli');
    expect(pickKind(0.99)).toBe('cake');
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/games/catchLogic.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: `src/games/catchLogic.ts`**

```ts
export const CATCH = {
  W: 128,
  H: 200,
  duration: 60_000,
  playerY: 192,
  catchTop: 140,
  catchBottom: 165,
  catchHalfWidth: 14,
  itemSize: 12,
  lives: 3,
  playerSpeed: 160,
  minX: 12,
  maxX: 116,
} as const;

export type ItemKind = 'apple' | 'sandwich' | 'pizza' | 'cake' | 'kitkat' | 'broccoli';

/** KitKat = 5× kanapka (spec: rzadki bonus ×5). */
export const POINTS: Record<ItemKind, number> = { apple: 3, sandwich: 5, pizza: 7, cake: 10, kitkat: 25, broccoli: 0 };

export interface FallingItem {
  x: number;
  y: number;
  kind: ItemKind;
  vy: number;
}

export interface CatchState {
  t: number;
  items: FallingItem[];
  playerX: number;
  targetX: number;
  moving: -1 | 0 | 1;
  score: number;
  lives: number;
  spawnIn: number;
  over: boolean;
}

export type CatchEvent = { type: 'caught'; kind: ItemKind; points: number } | { type: 'hit' } | { type: 'over' };

export function createCatch(): CatchState {
  return { t: 0, items: [], playerX: CATCH.W / 2, targetX: CATCH.W / 2, moving: 0, score: 0, lives: CATCH.lives, spawnIn: 600, over: false };
}

export function pickKind(r: number): ItemKind {
  if (r < 0.04) return 'kitkat';
  if (r < 0.26) return 'broccoli';
  if (r < 0.5) return 'apple';
  if (r < 0.7) return 'sandwich';
  if (r < 0.87) return 'pizza';
  return 'cake';
}

export function stepCatch(s: CatchState, dtMs: number, rng: () => number): { state: CatchState; events: CatchEvent[] } {
  if (s.over) return { state: s, events: [] };
  const events: CatchEvent[] = [];
  const t = s.t + dtMs;
  const p = Math.min(1, t / CATCH.duration);
  const sec = dtMs / 1000;

  const target = Math.max(CATCH.minX, Math.min(CATCH.maxX, s.targetX));
  const diff = target - s.playerX;
  const maxStep = CATCH.playerSpeed * sec;
  const playerX = Math.abs(diff) <= maxStep ? target : s.playerX + Math.sign(diff) * maxStep;
  const moving: CatchState['moving'] = Math.abs(diff) < 0.5 ? 0 : diff > 0 ? 1 : -1;

  let items = s.items.map((it) => ({ ...it, y: it.y + it.vy * sec }));
  let spawnIn = s.spawnIn - dtMs;
  if (spawnIn <= 0) {
    items.push({ kind: pickKind(rng()), x: 4 + rng() * (CATCH.W - 8 - CATCH.itemSize), y: -CATCH.itemSize, vy: 40 + 70 * p });
    spawnIn += 900 - 550 * p;
  }

  let score = s.score;
  let lives = s.lives;
  items = items.filter((it) => {
    const centerX = it.x + CATCH.itemSize / 2;
    const inZone = it.y + CATCH.itemSize >= CATCH.catchTop && it.y <= CATCH.catchBottom;
    if (inZone && Math.abs(centerX - playerX) <= CATCH.catchHalfWidth) {
      if (it.kind === 'broccoli') {
        lives -= 1;
        events.push({ type: 'hit' });
      } else {
        score += POINTS[it.kind];
        events.push({ type: 'caught', kind: it.kind, points: POINTS[it.kind] });
      }
      return false;
    }
    return it.y < CATCH.H;
  });

  const over = lives <= 0 || t >= CATCH.duration;
  if (over) events.push({ type: 'over' });
  return { state: { t, items, playerX, targetX: s.targetX, moving, score, lives, spawnIn, over }, events };
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npx vitest run tests/games/catchLogic.test.ts`
Expected: PASS (8 testów).

- [ ] **Step 5: `src/games/catchGame.ts`**

```ts
import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';
import { drawPet } from '../pet/petRenderer';
import { ANIMATIONS, frameAt, resolveAnimation } from '../sprites/animations';
import { makeCanvas, runLoop } from './canvas';
import { CATCH, createCatch, stepCatch } from './catchLogic';
import { catchReward } from './rewards';
import type { MiniGame } from './types';

export const catchGame: MiniGame = {
  id: 'catch',
  name: 'Łapanie jedzenia',
  description: 'Łap smakołyki, omijaj brokuły!',
  icon: 'pizza',
  category: 'arcade',
  reward: catchReward,
  async play(env) {
    const { canvas, ctx, toLogical, dispose } = makeCanvas(env.body, CATCH.W, CATCH.H);
    let s = createCatch();
    const aim = (e: PointerEvent) => {
      s = { ...s, targetX: toLogical(e).x };
    };
    canvas.addEventListener('pointerdown', aim);
    canvas.addEventListener('pointermove', aim);
    const walk = resolveAnimation(ANIMATIONS, 'walk');
    const idle = env.sprites.get('idle_front');
    let walkT = 0;
    let flash = 0;

    const draw = () => {
      ctx.fillStyle = '#cdb8f0';
      ctx.fillRect(0, 0, CATCH.W, CATCH.H);
      ctx.fillStyle = '#c2abea';
      for (let x = 0; x < CATCH.W; x += 8) ctx.fillRect(x, 0, 4, CATCH.H);
      ctx.fillStyle = '#8d68c4';
      ctx.fillRect(0, CATCH.playerY, CATCH.W, CATCH.H - CATCH.playerY);
      for (const it of s.items) ctx.drawImage(artCanvas(ICONS[it.kind]), Math.round(it.x), Math.round(it.y));
      const img = s.moving !== 0 ? env.sprites.get(frameAt(walk, walkT)) : idle;
      if (img) drawPet(ctx, { frame: img, x: s.playerX, feetY: CATCH.playerY, flip: s.moving > 0, bob: 0, squash: 0, jump: 0 });
      for (let i = 0; i < CATCH.lives; i++) {
        ctx.drawImage(artCanvas(i < s.lives ? ICONS.heartSmall : ICONS.heartEmpty), 3 + i * 7, 3);
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(224, 56, 79, ${flash / 600})`;
        ctx.fillRect(0, 0, CATCH.W, CATCH.H);
      }
    };

    await runLoop(env.signal, (dt) => {
      const { state, events } = stepCatch(s, dt, Math.random);
      s = state;
      if (events.some((e) => e.type === 'hit')) flash = 300;
      flash = Math.max(0, flash - dt);
      if (s.moving !== 0) walkT += dt;
      draw();
      env.setHud(`${s.score} pkt · ${Math.max(0, Math.ceil((CATCH.duration - s.t) / 1000))} s`);
      return !s.over;
    });
    dispose();
    return s.score;
  },
};
```

- [ ] **Step 6: Zarejestruj grę w `src/games/index.ts`**

Dodaj import i wpis:
```ts
import { catchGame } from './catchGame';
```
```ts
export const GAMES: MiniGame[] = [catchGame];
```

- [ ] **Step 7: Sprawdź w przeglądarce**

`npx tsc --noEmit`, potem w podglądzie (mobile): Graj → Łapanie jedzenia. Sprawdź: postać chodzi za palcem/kursorem z animacją chodu, jedzenie spada, brokuł miga na czerwono i zabiera serduszko, po 60 s panel „Koniec gry!” z nagrodą, „Odbierz” dolicza monety.

- [ ] **Step 8: Commit**

```bash
git add src/games/catchLogic.ts src/games/catchGame.ts src/games/index.ts tests/games/catchLogic.test.ts
git commit -m "Minigra: Łapanie jedzenia" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Minigra „Zdmuchnij świeczki”

**Files:**
- Create: `src/games/candlesLogic.ts`, `src/games/candlesGame.ts`
- Modify: `src/games/index.ts`
- Test: `tests/games/candlesLogic.test.ts`

- [ ] **Step 1: Test**

`tests/games/candlesLogic.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CANDLES, blowCandle, createCandles, stepCandles, type CandlesState } from '../../src/games/candlesLogic';

const rng = () => 0;
const withLit = (lit: (number | null)[], patch: Partial<CandlesState> = {}): CandlesState => ({
  ...createCandles(),
  spawnIn: 1e9,
  lit,
  ...patch,
});

describe('stepCandles', () => {
  it('zapala świeczkę po odliczeniu', () => {
    const s = stepCandles({ ...createCandles(), spawnIn: 10 }, 16, rng);
    expect(s.lit.filter((v) => v !== null)).toHaveLength(1);
  });

  it('świeczka gaśnie sama po czasie', () => {
    const s = withLit([100, null, null, null, null, null, null, null]);
    expect(stepCandles(s, 200, rng).lit[0]).toBeNull();
  });

  it('po 30 s finał z 26 świeczkami', () => {
    const s = stepCandles({ ...createCandles(), phaseT: CANDLES.mainDuration - 1 }, 16, rng);
    expect(s.phase).toBe('finale');
    expect(s.finale).toHaveLength(26);
    expect(s.finale.every(Boolean)).toBe(true);
  });

  it('finał kończy się po zdmuchnięciu wszystkich lub po czasie', () => {
    const allOut = { ...createCandles(), phase: 'finale' as const, finale: Array(26).fill(false) };
    expect(stepCandles(allOut, 16, rng).phase).toBe('done');
    const timeout = { ...createCandles(), phase: 'finale' as const, phaseT: CANDLES.finaleDuration, finale: Array(26).fill(true) };
    expect(stepCandles(timeout, 16, rng).phase).toBe('done');
  });
});

describe('blowCandle', () => {
  it('zdmuchnięcie zapalonej daje punkt', () => {
    const s = blowCandle(withLit([5000, null, null, null, null, null, null, null], { t: 1000 }), 0);
    expect(s.score).toBe(1);
    expect(s.lit[0]).toBeNull();
  });

  it('szybka seria daje combo', () => {
    let s = withLit([5000, 5000, 5000, null, null, null, null, null], { t: 1000 });
    s = blowCandle(s, 0);
    s = blowCandle({ ...s, t: 1300 }, 1);
    expect(s.combo).toBe(1);
    expect(s.score).toBe(1 + 2);
  });

  it('zgaszona świeczka nic nie robi', () => {
    const s = withLit(Array(8).fill(null));
    expect(blowCandle(s, 3)).toBe(s);
  });

  it('w finale każda świeczka to punkt', () => {
    const s = { ...createCandles(), phase: 'finale' as const, finale: Array(26).fill(true) };
    const next = blowCandle(s, 25);
    expect(next.score).toBe(1);
    expect(next.finale[25]).toBe(false);
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/games/candlesLogic.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: `src/games/candlesLogic.ts`**

```ts
export const CANDLES = {
  slots: 8,
  mainDuration: 30_000,
  finaleDuration: 10_000,
  finaleCount: 26,
  comboWindow: 600,
  maxComboBonus: 3,
} as const;

export type CandlesPhase = 'main' | 'finale' | 'done';

export interface CandlesState {
  phase: CandlesPhase;
  t: number;
  phaseT: number;
  /** Czas zgaśnięcia (w phaseT) zapalonej świeczki albo null. */
  lit: (number | null)[];
  finale: boolean[];
  score: number;
  combo: number;
  lastBlowAt: number;
  spawnIn: number;
}

export function createCandles(): CandlesState {
  return {
    phase: 'main',
    t: 0,
    phaseT: 0,
    lit: Array(CANDLES.slots).fill(null),
    finale: [],
    score: 0,
    combo: 0,
    lastBlowAt: -1e9,
    spawnIn: 400,
  };
}

export function stepCandles(s: CandlesState, dtMs: number, rng: () => number): CandlesState {
  if (s.phase === 'done') return s;
  const t = s.t + dtMs;
  const phaseT = s.phaseT + dtMs;

  if (s.phase === 'main') {
    if (phaseT >= CANDLES.mainDuration) {
      return { ...s, t, phaseT: 0, phase: 'finale', lit: Array(CANDLES.slots).fill(null), finale: Array(CANDLES.finaleCount).fill(true) };
    }
    const p = phaseT / CANDLES.mainDuration;
    const lit = s.lit.map((expires) => (expires !== null && expires <= phaseT ? null : expires));
    let spawnIn = s.spawnIn - dtMs;
    if (spawnIn <= 0) {
      const free = lit.flatMap((v, i) => (v === null ? [i] : []));
      if (free.length > 0) lit[free[Math.floor(rng() * free.length)]] = phaseT + 1800 - 800 * p;
      spawnIn += 700 - 350 * p;
    }
    return { ...s, t, phaseT, lit, spawnIn };
  }

  const done = phaseT >= CANDLES.finaleDuration || s.finale.every((f) => !f);
  return { ...s, t, phaseT, phase: done ? 'done' : 'finale' };
}

export function blowCandle(s: CandlesState, index: number): CandlesState {
  if (s.phase === 'main') {
    if (s.lit[index] == null) return s;
    const lit = [...s.lit];
    lit[index] = null;
    const combo = s.t - s.lastBlowAt <= CANDLES.comboWindow ? s.combo + 1 : 0;
    return { ...s, lit, combo, lastBlowAt: s.t, score: s.score + 1 + Math.min(combo, CANDLES.maxComboBonus) };
  }
  if (s.phase === 'finale') {
    if (!s.finale[index]) return s;
    const finale = [...s.finale];
    finale[index] = false;
    return { ...s, finale, score: s.score + 1 };
  }
  return s;
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npx vitest run tests/games/candlesLogic.test.ts`
Expected: PASS (8 testów).

- [ ] **Step 5: `src/games/candlesGame.ts`**

```ts
import { content } from '../content';
import { drawPet } from '../pet/petRenderer';
import { makeCanvas, runLoop } from './canvas';
import { CANDLES, blowCandle, createCandles, stepCandles, type CandlesState } from './candlesLogic';
import { candlesReward } from './rewards';
import type { MiniGame } from './types';

const W = 128;
const H = 176;

interface CandlePos {
  x: number;
  top: number;
  base: number;
  w: number;
}

function candlePos(phase: CandlesState['phase'], i: number): CandlePos {
  if (phase === 'main') return { x: 20 + i * 12, top: 96, base: 108, w: 4 };
  const back = i < 13;
  const x = back ? 14 + i * 8 : 18 + (i - 13) * 8;
  const base = back ? 102 : 112;
  return { x, top: base - 10, base, w: 3 };
}

function isLit(s: CandlesState, i: number): boolean {
  return s.phase === 'main' ? s.lit[i] != null : s.finale[i] === true;
}

function hitCandle(s: CandlesState, x: number, y: number): number {
  const count = s.phase === 'main' ? CANDLES.slots : CANDLES.finaleCount;
  const reach = s.phase === 'main' ? 7 : 4;
  let best = -1;
  let bestDx = Infinity;
  for (let i = 0; i < count; i++) {
    if (!isLit(s, i)) continue;
    const p = candlePos(s.phase, i);
    const dx = Math.abs(x - (p.x + p.w / 2));
    if (dx <= reach && y >= p.top - 14 && y <= p.base + 4 && dx < bestDx) {
      best = i;
      bestDx = dx;
    }
  }
  return best;
}

export const candlesGame: MiniGame = {
  id: 'candles',
  name: 'Zdmuchnij świeczki',
  description: 'Stukaj w płomyki, zanim zgasną!',
  icon: 'cake',
  category: 'arcade',
  reward: candlesReward,
  async play(env) {
    const { canvas, ctx, toLogical, dispose } = makeCanvas(env.body, W, H);
    let s = createCandles();
    let clock = 0;
    const puffs: { x: number; y: number; life: number }[] = [];

    canvas.addEventListener('pointerdown', (e) => {
      const p = toLogical(e);
      const idx = hitCandle(s, p.x, p.y);
      if (idx < 0) return;
      const pos = candlePos(s.phase, idx);
      s = blowCandle(s, idx);
      puffs.push({ x: pos.x + pos.w / 2, y: pos.top - 4, life: 0.6 });
    });

    const drawCandle = (p: CandlePos, lit: boolean) => {
      ctx.fillStyle = '#5aa8f0';
      ctx.fillRect(p.x, p.top, p.w, p.base - p.top);
      ctx.fillStyle = '#ffffff';
      for (let y = p.top + 1; y < p.base; y += 3) ctx.fillRect(p.x, y, p.w, 1);
      ctx.fillStyle = '#1b1326';
      ctx.fillRect(p.x + Math.floor(p.w / 2), p.top - 2, 1, 2);
      if (!lit) return;
      const flicker = Math.floor(clock / 120) % 2;
      const cx = p.x + Math.floor(p.w / 2);
      ctx.fillStyle = 'rgba(255, 211, 77, 0.25)';
      ctx.fillRect(cx - 3, p.top - 9, 7, 7);
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(cx - 1, p.top - 6, 3, 4);
      ctx.fillStyle = '#f08a3c';
      ctx.fillRect(cx - 1 + flicker, p.top - 8, 1, 2);
    };

    const drawCake = () => {
      ctx.fillStyle = '#2a1f3d';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3b2a5c';
      ctx.fillRect(0, 156, W, H - 156);
      if (s.phase === 'main') {
        ctx.fillStyle = '#ff9ec4';
        ctx.fillRect(16, 108, 96, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 108, 96, 3);
        for (let x = 20; x < 110; x += 9) ctx.fillRect(x, 111, 3, 3);
        ctx.fillStyle = '#b48ae0';
        ctx.fillRect(10, 130, 108, 26);
        ctx.fillStyle = '#f3ecff';
        ctx.fillRect(10, 130, 108, 3);
        ctx.fillStyle = '#ffd34d';
        for (let x = 16; x < 116; x += 12) ctx.fillRect(x, 142, 2, 2);
      } else {
        ctx.fillStyle = '#f3ecff';
        ctx.fillRect(8, 98, 112, 14);
        ctx.fillStyle = '#ff9ec4';
        ctx.fillRect(8, 112, 112, 44);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 112, 112, 3);
        ctx.fillStyle = '#b48ae0';
        ctx.fillRect(8, 136, 112, 4);
      }
      ctx.fillStyle = '#c9c3d6';
      ctx.fillRect(4, 156, 120, 3);
      const count = s.phase === 'main' ? CANDLES.slots : CANDLES.finaleCount;
      for (let i = 0; i < count; i++) drawCandle(candlePos(s.phase, i), isLit(s, i));
    };

    const drawPuffs = (dt: number) => {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt / 1000;
        p.y -= (dt / 1000) * 12;
        if (p.life <= 0) {
          puffs.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(201, 195, 214, ${p.life})`;
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y), 3, 2);
        ctx.fillRect(Math.round(p.x), Math.round(p.y - 2), 2, 2);
      }
    };

    await runLoop(env.signal, (dt) => {
      clock += dt;
      s = stepCandles(s, dt, Math.random);
      drawCake();
      drawPuffs(dt);
      if (s.phase === 'main') {
        env.setHud(`${s.score} pkt · ${Math.max(0, Math.ceil((CANDLES.mainDuration - s.phaseT) / 1000))} s`);
      } else if (s.phase === 'finale') {
        const left = s.finale.filter(Boolean).length;
        ctx.fillStyle = '#ffd34d';
        ctx.font = '700 10px "Pixelify Sans"';
        ctx.textAlign = 'center';
        ctx.fillText(`Finał! Zdmuchnij ${content.age}!`, W / 2, 24);
        env.setHud(`${s.score} pkt · zostało ${left} · ${Math.max(0, Math.ceil((CANDLES.finaleDuration - s.phaseT) / 1000))} s`);
      }
      return s.phase !== 'done';
    });

    let party = 0;
    await runLoop(env.signal, (dt) => {
      party += dt;
      ctx.fillStyle = '#2a1f3d';
      ctx.fillRect(0, 0, W, H);
      const wave = env.sprites.get('fun_wave');
      if (wave) drawPet(ctx, { frame: wave, x: W / 2, feetY: 150, flip: false, bob: Math.floor(party / 300) % 2, squash: 0, jump: 0 });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd34d';
      ctx.font = '700 12px "Pixelify Sans"';
      ctx.fillText(content.wishesTitle, W / 2, 30);
      ctx.fillStyle = '#f3ecff';
      ctx.font = '8px "Pixelify Sans"';
      ctx.fillText('Wszystkiego najlepszego!', W / 2, 46);
      return party < 2200;
    });

    dispose();
    return s.score;
  },
};
```

- [ ] **Step 6: Zarejestruj grę w `src/games/index.ts`**

```ts
import { candlesGame } from './candlesGame';
```
```ts
export const GAMES: MiniGame[] = [catchGame, candlesGame];
```

- [ ] **Step 7: Sprawdź w przeglądarce**

`npx tsc --noEmit`, potem w podglądzie: Graj → Zdmuchnij świeczki. Sprawdź: płomyki migoczą, kliknięcie gasi i puszcza dymek, szybkie serie dają więcej punktów, po 30 s finał z 26 świeczkami w dwóch rzędach, potem ekran „Sto lat, Gabi!” z machającą postacią i panel nagrody.

- [ ] **Step 8: Commit**

```bash
git add src/games/candlesLogic.ts src/games/candlesGame.ts src/games/index.ts tests/games/candlesLogic.test.ts
git commit -m "Minigra: Zdmuchnij świeczki z finałem 26 świeczek" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Minigra „Memory”

**Files:**
- Create: `src/games/memoryLogic.ts`, `src/games/memoryGame.ts`
- Modify: `src/games/index.ts`
- Test: `tests/games/memoryLogic.test.ts`

- [ ] **Step 1: Test**

`tests/games/memoryLogic.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createMemory, flipCard, isComplete, memoryScore, resolveMismatch, type MemoryState } from '../../src/games/memoryLogic';

const FACES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ordered = (): MemoryState => ({
  cards: ['a', 'a', 'b', 'b'].map((face) => ({ face, up: false, matched: false })),
  first: null,
  second: null,
  moves: 0,
  locked: false,
});

describe('createMemory', () => {
  it('16 kart, każdy obrazek dwa razy', () => {
    const s = createMemory(FACES, Math.random);
    expect(s.cards).toHaveLength(16);
    for (const f of FACES) expect(s.cards.filter((c) => c.face === f)).toHaveLength(2);
  });
});

describe('flipCard', () => {
  it('para zostaje odkryta na stałe', () => {
    let s = flipCard(ordered(), 0);
    s = flipCard(s, 1);
    expect(s.cards[0].matched && s.cards[1].matched).toBe(true);
    expect(s.moves).toBe(1);
    expect(s.first).toBeNull();
  });

  it('pomyłka blokuje planszę do resolveMismatch', () => {
    let s = flipCard(ordered(), 0);
    s = flipCard(s, 2);
    expect(s.locked).toBe(true);
    expect(flipCard(s, 3)).toBe(s);
    s = resolveMismatch(s);
    expect(s.locked).toBe(false);
    expect(s.cards[0].up || s.cards[2].up).toBe(false);
  });

  it('ignoruje odkrytą kartę', () => {
    const s = flipCard(ordered(), 0);
    expect(flipCard(s, 0)).toBe(s);
  });

  it('koniec, gdy wszystkie pary znalezione', () => {
    let s = ordered();
    for (const i of [0, 1, 2, 3]) s = flipCard(s, i);
    expect(isComplete(s)).toBe(true);
  });
});

describe('memoryScore', () => {
  it('mniej ruchów = więcej punktów', () => {
    expect(memoryScore(8)).toBe(100);
    expect(memoryScore(20)).toBe(52);
    expect(memoryScore(50)).toBe(10);
  });
});
```

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/games/memoryLogic.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: `src/games/memoryLogic.ts`**

```ts
export interface Card {
  face: string;
  up: boolean;
  matched: boolean;
}

export interface MemoryState {
  cards: Card[];
  first: number | null;
  second: number | null;
  moves: number;
  locked: boolean;
}

export function createMemory(faces: readonly string[], rng: () => number): MemoryState {
  const deck = [...faces, ...faces];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { cards: deck.map((face) => ({ face, up: false, matched: false })), first: null, second: null, moves: 0, locked: false };
}

export function flipCard(s: MemoryState, i: number): MemoryState {
  const card = s.cards[i];
  if (s.locked || !card || card.up || card.matched) return s;
  const cards = s.cards.map((c, j) => (j === i ? { ...c, up: true } : c));
  if (s.first === null) return { ...s, cards, first: i };
  const moves = s.moves + 1;
  const first = s.first;
  if (cards[first].face === card.face) {
    const matched = cards.map((c, j) => (j === i || j === first ? { ...c, matched: true } : c));
    return { ...s, cards: matched, first: null, second: null, moves };
  }
  return { ...s, cards, second: i, moves, locked: true };
}

export function resolveMismatch(s: MemoryState): MemoryState {
  if (!s.locked || s.first === null || s.second === null) return s;
  const { first, second } = s;
  const cards = s.cards.map((c, j) => (j === first || j === second ? { ...c, up: false } : c));
  return { ...s, cards, first: null, second: null, locked: false };
}

export const isComplete = (s: MemoryState): boolean => s.cards.every((c) => c.matched);

/** 8 ruchów (idealnie) = 100 pkt, każdy dodatkowy ruch −4, minimum 10. */
export function memoryScore(moves: number): number {
  return Math.max(10, Math.min(100, 100 - (moves - 8) * 4));
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npx vitest run tests/games/memoryLogic.test.ts`
Expected: PASS (6 testów).

- [ ] **Step 5: `src/games/memoryGame.ts`**

```ts
import type { IconName } from '../art/icons';
import { h, icon } from '../ui/dom';
import { createMemory, flipCard, isComplete, memoryScore, resolveMismatch } from './memoryLogic';
import { memoryReward } from './rewards';
import type { MiniGame } from './types';

const FACES: IconName[] = ['kitkat', 'cake', 'gift', 'heart', 'glasses', 'bag', 'balloon', 'star'];

export const memoryGame: MiniGame = {
  id: 'memory',
  name: 'Memory',
  description: 'Znajdź wszystkie pary',
  icon: 'star',
  category: 'arcade',
  reward: memoryReward,
  play(env) {
    return new Promise((resolve) => {
      let s = createMemory(FACES, Math.random);
      const buttons = s.cards.map((card, i) => {
        const btn = h(
          'button',
          { class: 'mem-card', 'aria-label': `Karta ${i + 1}` },
          h('div', { class: 'mem-inner' }, h('div', { class: 'mem-back' }), h('div', { class: 'mem-front' }, icon(card.face as IconName, 4))),
        );
        btn.addEventListener('click', () => onFlip(i));
        return btn;
      });
      env.body.append(h('div', { class: 'memory-grid' }, ...buttons));

      const sync = () => {
        s.cards.forEach((c, i) => {
          buttons[i].classList.toggle('up', c.up || c.matched);
          buttons[i].classList.toggle('matched', c.matched);
        });
        env.setHud(`Ruchy: ${s.moves}`);
      };

      function onFlip(i: number): void {
        if (env.signal.aborted) return;
        const before = s;
        s = flipCard(s, i);
        if (s === before) return;
        sync();
        if (s.locked) {
          setTimeout(() => {
            s = resolveMismatch(s);
            sync();
          }, 750);
        } else if (isComplete(s)) {
          setTimeout(() => resolve(memoryScore(s.moves)), 700);
        }
      }

      sync();
    });
  },
};
```

- [ ] **Step 6: Zarejestruj grę w `src/games/index.ts`**

```ts
import { memoryGame } from './memoryGame';
```
```ts
export const GAMES: MiniGame[] = [catchGame, candlesGame, memoryGame];
```

- [ ] **Step 7: Sprawdź w przeglądarce**

`npx tsc --noEmit && npm test`, potem: Graj → Memory. Karty obracają się z animacją 3D, pary zostają zielone, pomyłka odwraca karty po chwili, po ostatniej parze panel nagrody.

- [ ] **Step 8: Commit**

```bash
git add src/games/memoryLogic.ts src/games/memoryGame.ts src/games/index.ts tests/games/memoryLogic.test.ts
git commit -m "Minigra: Memory" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Pełna weryfikacja w przeglądarce

**Files:** poprawki w plikach, w których wyjdą błędy.

- [ ] **Step 1: Testy i build**

Run: `npm test && npm run build`
Expected: wszystkie testy PASS, build bez błędów.

- [ ] **Step 2: Scenariusz w podglądzie (preset `mobile`, po `localStorage.clear()`)**

Dla każdego punktu zrób zrzut ekranu i sprawdź konsolę (`onlyErrors: true`):

1. Ekran urodzinowy → „Zaczynamy!” → pokój (przejście pikselowe).
2. Pokój: postać macha, mówi, chodzi; stuknięcie w postać → skok, serduszka, +humor; drugie stuknięcie w ciągu 30 s → tylko machanie.
3. Karm → lodówka z 1 KitKatem → przeciągnij na scenę → animacja jedzenia, dymek „KITKAT!”, skok i serduszka; lodówka pusta → przycisk „Do sklepu”.
4. Sklep: KitKat „Gratis!” → kupno → konfetti, przycisk wraca do ceny 15; pizza za 20; przy braku monet przycisk się trzęsie i jest toast.
5. Światło → noc: przyciemnienie, „Zzz”, księżyc w oknie, przycisk „Pobudka”; stuknięcie w postać budzi.
6. Głód: `javascript_tool` → ustaw w zapisie `needs.hunger = 10`, przeładuj → dymek z jabłkiem nad głową, pasek głodu miga.
7. Humor < 30: chmurka z deszczem nad głową.
8. Minigry: każda od startu do „Odbierz”; monety i rekord w profilu się zgadzają; „X” przerywa grę bez nagrody.
9. Energia < 10 → przy starcie gry pytanie „Jestem zbyt śpiąca…”.
10. Profil → „Pokaż życzenia” → ekran urodzinowy z przyciskiem „Wróć”.
11. Szafa i zakładka Dodatki: „wkrótce”.
12. Czas offline: w zapisie ustaw `lastUpdate` na 3 h wstecz, przeładuj → potrzeby niższe o ~18/12/15.
13. Codzienny bonus: ustaw `lastDailyBonus` na wczoraj, przeładuj → toast „+20 monet”.
14. Uszkodzony zapis: `localStorage.setItem('gabigochi.save','{x')`, przeładuj → toast o nowym starcie, aplikacja działa.

Przykład zmiany zapisu (krok 6):
```js
const s = JSON.parse(localStorage.getItem('gabigochi.save')); s.needs.hunger = 10; s.lastUpdate = Date.now(); localStorage.setItem('gabigochi.save', JSON.stringify(s)); location.reload();
```

- [ ] **Step 3: Tryb „zwykłego Safari”**

Zbuduj i uruchom `npm run preview`, otwórz bez `?play` → ekran instalacji; z `?play` → gra.

- [ ] **Step 4: Commit poprawek**

```bash
git add -A
git commit -m "Poprawki po weryfikacji w przeglądarce" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: Wdrożenie na GitHub Pages i lista kontrolna iPhone'a

**Files:**
- Create: `.github/workflows/deploy.yml`, `docs/checklista-iphone.md`

- [ ] **Step 1: `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: `docs/checklista-iphone.md`**

```markdown
# Gabigochi — sprawdzenie na iPhonie przed wręczeniem

1. Otwórz link w Safari → Udostępnij → „Dodaj do ekranu początkowego”. Ikona z twarzą Gabi, nazwa „Gabigochi”.
2. Uruchom z ikony: pełny ekran, nic nie chowa się pod notchem / Dynamic Island ani paskiem gestów.
3. Przejdź ekran urodzinowy, nakarm KitKatem, kup coś w sklepie.
4. Zagraj w każdą minigrę do końca, odbierz nagrody.
5. Włącz tryb samolotowy, zamknij i otwórz aplikację — działa offline.
6. Zamknij aplikację na 30+ minut, otwórz — paski potrzeb spadły, monety i lodówka zachowane.
7. Zgaś światło, zamknij na noc — rano energia wyższa, postać obudzona.
8. Przed wręczeniem: usuń ikonę i dodaj ją ponownie (czysty zapis, ekran urodzinowy pojawi się Gabi od nowa).
```

- [ ] **Step 3: Gałąź `main` i commit**

```bash
git branch -M main
git add .github docs/checklista-iphone.md
git commit -m "Wdrożenie GitHub Pages + lista kontrolna iPhone'a" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Publikacja — ZAPYTAJ UŻYTKOWNIKA PRZED WYKONANIEM**

Repozytorium będzie publiczne (darmowe Pages), więc portret i imię Gabi będą pod publicznym adresem. Potwierdź z użytkownikiem nazwę repo i zgodę. Następnie:

```bash
gh auth status
gh repo create gabigochi --public --source=. --push
gh api -X POST "repos/{owner}/gabigochi/pages" -f build_type=workflow
gh workflow run Deploy
gh run watch
```

Jeśli `gh` nie jest zalogowany — poproś użytkownika o `gh auth login` (sam wpisuje dane) albo o utworzenie repo w przeglądarce i podanie adresu.

- [ ] **Step 5: Sprawdzenie wdrożenia**

Otwórz `https://<użytkownik>.github.io/gabigochi/` w podglądzie: ekran instalacji, a z `?play` gra; w DevTools/Network ładuje się `sw.js` i `manifest.webmanifest`. Przekaż użytkownikowi link i `docs/checklista-iphone.md`.
