# Nowe animacje stanów, przeciąganie i sen w łóżku — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Podłączyć trzy nowe arkusze (statusy/emocje, przeciąganie palcem, sen w łóżku z kotem) jako ostre animacje sterowane potrzebami i zdarzeniami.

**Architecture:** Wycinanie rozszerzone o wiele arkuszy, maski wymazywania i punkt stóp (`foot`). Manifest animacji dostaje `intro` (raz) + pętlę. Czysta logika (wybór animacji stanu, liczniki emocji, fizyka spadania) w `src/pet/*` z testami; pokój spina to w zachowanie.

**Tech Stack:** jak dotąd — Vite, TypeScript, Vitest, Python (Pillow, numpy; interpreter `/c/gvenv/Scripts/python`).

**Spec:** `docs/superpowers/specs/2026-10-06-nowe-animacje-design.md`

**Konwencje:** repo `C:\Users\Al8c\Documents\gabigochi`, gałąź `etap-1`. Pliki pisz narzędziem Write/Edit (heredoki psują polskie znaki). Commit z drugim `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 1: Wycinanie nowych arkuszy

**Files:**
- Modify: `tools/frames.json`, `tools/extract_sprites.py`
- Generated: `public/sprites/*.png`, `src/sprites/frames.generated.json`, `public/icons/*`, `tools/out/preview*.png`

Zasady (spec §2): wiele arkuszy; tryb „wszystkie kształty w prostokącie” dla nowych arkuszy; wymazywanie prostokątów/wielokątów; `foot` z największego kształtu; skala na arkusz z klatki referencyjnej; kotwica `center` dla łóżka.

- [ ] **Step 1: `tools/frames.json` — sekcja `sheets` i nowe wpisy**

Dodaj na górze (obecne pola `sheet`, `background`, `gridPeriod` zostają jako domyślny arkusz `main`):

```json
"paletteSize": 64,
"sheets": {
  "status": { "path": "assets/source/sheet-status.jpg", "background": [208, 207, 212], "gridPeriod": 7.82, "keep": "all", "scaleRef": "sad_cry" },
  "drag":   { "path": "assets/source/sheet-drag.jpg",   "background": [207, 206, 211], "gridPeriod": 7.82, "keep": "all", "scaleRef": "drag_1" },
  "bed":    { "path": "assets/source/sheet-bed.jpg",    "background": [207, 206, 211], "gridPeriod": 7.82, "keep": "all", "scaleRef": "sad_cry", "anchor": "center" }
}
```

(`paletteSize` zastępuje dotychczasowe 40 — nowe kolory: łóżko, kot, złość.)

Dopisz do `body` (prostokąty z analizy komponentów; `erase` = wymazanie, px arkusza; wielokąt = lista punktów `[[x,y],…]`, prostokąt = `[x0,y0,x1,y1]`):

```json
"tired_1":  { "sheet": "status", "rect": [84, 184, 312, 662] },
"tired_2":  { "sheet": "status", "rect": [372, 190, 572, 662] },
"tired_3":  { "sheet": "status", "rect": [640, 190, 892, 662] },
"tired_4":  { "sheet": "status", "rect": [920, 306, 1136, 662] },
"tired_5":  { "sheet": "status", "rect": [1196, 306, 1480, 662] },
"hunger_1": { "sheet": "status", "rect": [74, 798, 300, 1318], "erase": [[244, 962, 300, 1004], [262, 1056, 300, 1094]] },
"hunger_2": { "sheet": "status", "rect": [372, 798, 602, 1318] },
"hunger_3": { "sheet": "status", "rect": [662, 698, 1018, 1318] },
"hunger_4": { "sheet": "status", "rect": [928, 830, 1142, 1318] },
"hunger_5": { "sheet": "status", "rect": [1156, 970, 1480, 1310] },
"happy":    { "sheet": "status", "rect": [20, 1430, 336, 1950] },
"angry":    { "sheet": "status", "rect": [372, 1426, 596, 1950] },
"sad_cry":  { "sheet": "status", "rect": [662, 1446, 880, 1950] },
"scared":   { "sheet": "status", "rect": [910, 1440, 1150, 1950] },
"crazy":    { "sheet": "status", "rect": [1170, 1440, 1384, 1950] },
"drag_1":   { "sheet": "drag", "rect": [80, 336, 266, 888] },
"drag_2":   { "sheet": "drag", "rect": [622, 258, 1099, 935], "erase": [[640, 900, 700, 940]] },
"drag_3":   { "sheet": "drag", "rect": [1012, 570, 1475, 1185] },
"drag_4":   { "sheet": "drag", "rect": [144, 1266, 667, 1835] },
"drag_5":   { "sheet": "drag", "rect": [1068, 1188, 1459, 1888] },
"bed_1":    { "sheet": "bed", "rect": [28, 212, 830, 756], "erase": [[620, 250, 830, 520], [36, 700, 100, 760]] },
"bed_2":    { "sheet": "bed", "rect": [834, 244, 1425, 770], "erase": [[1170, 130, 1470, 404]] },
"bed_3":    { "sheet": "bed", "rect": [28, 846, 736, 1364], "erase": [[36, 1300, 100, 1364]] },
"bed_3b":   { "sheet": "bed", "rect": [764, 846, 1472, 1364], "erase": [[770, 1300, 836, 1364]] },
"bed_4":    { "sheet": "bed", "rect": [20, 1440, 736, 1975], "erase": [[30, 1905, 100, 1975]] },
"bed_5":    { "sheet": "bed", "rect": [756, 1430, 1472, 1975], "erase": [[770, 1905, 836, 1975]] }
```

Dopisz do `portraits`:

```json
"face_tired":   { "sheet": "status", "rect": [1272, 96, 1456, 286] },
"face_hungry":  { "sheet": "status", "rect": [1226, 704, 1472, 936] },
"face_crazy_1": { "sheet": "status", "rect": [1384, 1440, 1488, 1560] },
"face_crazy_2": { "sheet": "status", "rect": [1384, 1572, 1488, 1692] },
"face_crazy_3": { "sheet": "status", "rect": [1384, 1704, 1488, 1826] },
"face_dizzy":   { "sheet": "drag",   "rect": [1154, 80, 1473, 399] }
```

- [ ] **Step 2: `tools/extract_sprites.py` — obsługa arkuszy, `keep: all`, `erase`, `foot`, skala z `scaleRef`, kotwica `center`**

Wymagania implementacyjne (przeczytaj obecny plik; zachowaj jego styl i funkcje `sample`, `background_mask`, `outside_box`, `kmeans`, `to_rgba`):

1. `entry(spec)` zwraca słownik: `path`, `rect`, `background`, `period` (z arkusza lub domyślny `gridPeriod`/`portraitPeriod`), `keep` (`"largest"` domyślnie, `"all"` z arkusza), `erase` (lista, domyślnie `[]`), `sheet` (nazwa lub `"main"`), `anchor` (`"head"` domyślnie).
2. Dla `keep == "all"`: nie zawężaj prostokąta do `tight_box`; użyj całego `rect` (z marginesem 0) do próbkowania i nie wymazuj kształtów spoza największego.
3. Wymazywanie: po próbkowaniu znane są środki komórek w px arkusza; komórka, której środek leży w którymś prostokącie z `erase` albo wewnątrz wielokąta (test parzystości przecięć), staje się tłem. Dodaj funkcję:
   ```python
   def in_erase(x, y, shapes):
       for s in shapes:
           if len(s) == 4 and all(isinstance(v, (int, float)) for v in s):
               if s[0] <= x <= s[2] and s[1] <= y <= s[3]:
                   return True
           else:
               inside = False
               for (x1, y1), (x2, y2) in zip(s, s[1:] + s[:1]):
                   if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                       inside = not inside
               if inside:
                   return True
       return False
   ```
4. `foot`: po kwantyzacji i przycięciu do obrysu policz największy 8-spójny nieprzezroczysty kształt; `foot` = jego dolny wiersz + 1 (we współrzędnych przyciętego PNG). Dla `anchor == "head"`: `anchorX` jak dotąd, ale liczony z pierwszych `anchorRows` wierszy **największego kształtu**; dla `"center"`: `anchorX = w / 2`. Wysokość ciała `bodyH` = wysokość największego kształtu.
5. Skala: arkusz `main` — jak dotąd (mediana grupy z `re.sub(r'\d+$','',name)`, liczona na `bodyH`). Arkusze z `scaleRef`: `scale = displayHeight / bodyH(scaleRef)` dla wszystkich klatek arkusza.
6. `frames.generated.json`: każda klatka `{ "w", "h", "anchorX", "foot", "scale" }` (dla starych klatek `foot` = `h` jeśli największy kształt sięga dołu — po prostu licz tak samo).
7. Podgląd: oprócz `tools/out/preview.png` zapisz `tools/out/preview_new.png` z nowymi klatkami w skali ×3·scale (min. 1) na wspólnej linii stóp (`foot`), plus `tools/out/drag_x4.png` — klatki `drag_2..5` powiększone ×4 na szachownicy (do strojenia masek dłoni).

- [ ] **Step 3: Uruchom i obejrzyj**

Run: `/c/gvenv/Scripts/python tools/extract_sprites.py && /c/gvenv/Scripts/python tools/make_icons.py`

Obejrzyj (Read) `tools/out/preview_new.png`. Sprawdź i popraw `erase`/`rect` aż do skutku:
- brak cyfr „1.”…„5.” i napisów (RUMBLE!, GURR!, podpisy) — jeśli zostały, dopisz prostokąty `erase`;
- efekty zostały (zz, dymek „Z”, dymek z pizzą, gwiazdki, serca, znak złości, krople, łzy);
- łóżko 1 bez „ducha kota” po prawej, łóżko 2 bez obrazka-portretu;
- wszystkie stojące postacie mają podobną wysokość jak `idle_front` w `preview.png`.

- [ ] **Step 4: Maski dłoni w przeciąganiu**

Obejrzyj `tools/out/drag_x4.png`. Dla `drag_2`…`drag_5` dopisz do `erase` wielokąt(y) obejmujące narysowaną dłoń (współrzędne w px arkusza = rect.x0 + x_podglądu/4·period… prościej: wyznacz je na samym arkuszu `assets/source/sheet-drag.jpg`, otwierając wycinek ×2 skryptem pomocniczym w scratchpadzie). Dłoń jest jasnoróżowa, z czarnym konturem, nad głową; włosy postaci są lawendowe — granica dłoń/włosy to miejsce zetknięcia konturów. Iteruj (uruchom → obejrzyj) aż na podglądzie nie ma dłoni, a włosy są kompletne; drobny ubytek konturu włosów jest akceptowalny. Zanotuj w raporcie, jak wyglądają wyniki.

- [ ] **Step 5: Testy istniejące + commit**

Run: `npm test` (test `animations` sprawdza, że klatki z manifestu istnieją — nie zmieniasz manifestu w tym zadaniu, więc ma przejść).

```bash
git add tools public/sprites public/icons src/sprites/frames.generated.json
git commit -m "Wycinanie: wiele arkuszy, maski wymazywania, punkt stóp, nowe klatki stanów/przeciągania/łóżka" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `foot` w pozycjonowaniu i `intro` w animacjach

**Files:**
- Modify: `src/sprites/loader.ts`, `src/ui/pixelStage.ts`, `src/sprites/animations.ts`, `src/sprites/animations.json`
- Test: `tests/ui/pixelStage.test.ts`, `tests/sprites/animations.test.ts`

- [ ] **Step 1: Testy (dopisz)**

`tests/ui/pixelStage.test.ts` — dopisz:
```ts
it('dół rysowania liczony od punktu stóp (foot), nie od dołu obrazka', () => {
  const meta = { w: 20, h: 40, anchorX: 10, scale: 1, foot: 30 };
  const r = spriteRect(meta, 2, { x: 50, feetY: 100, bob: 0, jump: 0 });
  expect(r.y + 30 * 2).toBe(200);
  expect(r.h).toBe(80);
});
```

`tests/sprites/animations.test.ts` — dopisz:
```ts
describe('intro', () => {
  const M2: Record<string, AnimDef> = {
    idle: { frames: ['a'], fps: 1 },
    sleep: { intro: ['i1', 'i2'], introFps: 2, frames: ['l1', 'l2'], fps: 1 },
  };
  it('najpierw intro raz, potem pętla', () => {
    const a = resolveAnimation(M2, 'sleep');
    expect(frameAt(a, 0)).toBe('i1');
    expect(frameAt(a, 600)).toBe('i2');
    expect(frameAt(a, 1000)).toBe('l1');
    expect(frameAt(a, 2000)).toBe('l2');
    expect(frameAt(a, 3000)).toBe('l1');
  });
  it('allFrameNames zawiera klatki intro', () => {
    expect(allFrameNames(M2)).toEqual(expect.arrayContaining(['i1', 'i2', 'l1', 'l2']));
  });
});
```
W istniejących testach `resolveAnimation(...)` z `toEqual` dopisz do oczekiwanych obiektów `intro: [], introFps: <fps animacji>` (np. dla `walk`: `intro: [], introFps: 4`; dla `sleep` z fallback: `intro: [], introFps: 1`). W teście „ma animacje używane przez pokój” zamień listę na:
`['idle','walk','eat','wave','talk','sleep','wake','sad','hungry','starving','tired','exhausted','happy','angry','scared','crazy','drag_pick','drag_dangle','drag_panic']`.

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/ui tests/sprites` → FAIL (brak `foot`, `intro`, nowych animacji).

- [ ] **Step 3: Implementacja**

`src/sprites/loader.ts` — w `FrameMeta` dodaj:
```ts
  /** Wiersz stóp (od góry obrazka, px natywne); brak = dół obrazka. */
  foot?: number;
```

`src/ui/pixelStage.ts` — w `spriteRect` zamień linię z `y`:
```ts
  const foot = Math.round((meta.foot ?? meta.h) * meta.scale * k);
  const y = Math.round((o.feetY - o.bob - o.jump) * k) - foot;
```
(i zaktualizuj komentarz JSDoc: „punkt stóp (`foot`) trafia w …”). `drawSprite` liczy `by = r.y + r.h` dla spłaszczenia — zmień na `by = r.y + Math.round((meta.foot ?? meta.h) * meta.scale * k)`.

`src/sprites/animations.ts`:
```ts
export interface AnimDef {
  intro?: string[];
  introFps?: number;
  frames?: string[];
  fps?: number;
  fallback?: string;
  overlay?: string;
  dim?: boolean;
  flipForRight?: boolean;
}

export interface ResolvedAnim {
  intro: string[];
  introFps: number;
  frames: string[];
  fps: number;
  overlay: OverlayName | null;
  dim: boolean;
  flipForRight: boolean;
}
```
W `resolveAnimation` dodaj do obu zwracanych obiektów `intro: def.intro ?? []` i `introFps: def.introFps ?? <fps tej gałęzi>` (gałąź `frames`: `def.fps ?? 6`; gałąź `fallback`: `1`).

```ts
export function frameAt(anim: ResolvedAnim, elapsedMs: number): string {
  const introMs = (anim.intro.length * 1000) / anim.introFps;
  if (anim.intro.length > 0 && elapsedMs >= 0 && elapsedMs < introMs) {
    return anim.intro[Math.floor((elapsedMs / 1000) * anim.introFps)];
  }
  const t = anim.intro.length > 0 ? elapsedMs - introMs : elapsedMs;
  const n = anim.frames.length;
  const index = ((Math.floor((t / 1000) * anim.fps) % n) + n) % n;
  return anim.frames[index];
}
```
W `allFrameNames` dodaj `def.intro?.forEach((f) => names.add(f));`.

`src/sprites/animations.json` — pełna nowa treść:
```json
{
  "idle": { "frames": ["idle_front"], "fps": 1 },
  "walk": { "frames": ["walk_a1", "walk_a2", "walk_a3", "walk_a4"], "fps": 6, "flipForRight": true },
  "eat": { "frames": ["fun_eat", "idle_front"], "fps": 2.5 },
  "wave": { "frames": ["fun_wave"], "fps": 1 },
  "talk": { "frames": ["fun_talk"], "fps": 1 },
  "sleep": { "intro": ["bed_1", "bed_2", "bed_3"], "introFps": 0.8, "frames": ["bed_4", "bed_5"], "fps": 0.8 },
  "wake": { "frames": ["bed_1"], "fps": 1 },
  "sad": { "frames": ["sad_cry"], "fps": 1 },
  "hungry": { "frames": ["hunger_1", "hunger_2", "hunger_3"], "fps": 0.4 },
  "starving": { "intro": ["hunger_4"], "introFps": 0.6, "frames": ["hunger_5"], "fps": 1 },
  "tired": { "frames": ["tired_1", "tired_2", "tired_3"], "fps": 0.45 },
  "exhausted": { "intro": ["tired_4"], "introFps": 0.6, "frames": ["tired_5"], "fps": 1 },
  "happy": { "frames": ["happy"], "fps": 1 },
  "angry": { "frames": ["angry"], "fps": 1 },
  "scared": { "frames": ["scared"], "fps": 1 },
  "crazy": { "frames": ["crazy"], "fps": 1 },
  "drag_pick": { "frames": ["drag_1"], "fps": 1 },
  "drag_dangle": { "frames": ["drag_2", "drag_3", "drag_5", "drag_3"], "fps": 3 },
  "drag_panic": { "frames": ["drag_4"], "fps": 1 }
}
```

- [ ] **Step 4: Uruchom — PASS**

Run: `npm test && npx tsc --noEmit` → wszystko zielone. (Pokój nadal woła stare nazwy `hungry`/`sad`/`sleep` — działają; nakładki `cloud`/`food`/`zzz` przestają się rysować, bo manifest ich już nie ma — zamierzone.)

- [ ] **Step 5: Commit**

```bash
git add src/sprites src/ui/pixelStage.ts tests
git commit -m "Animacje: intro + pętla, punkt stóp w pozycjonowaniu, manifest nowych stanów" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Czysta logika — stan, emocje, spadanie

**Files:**
- Create: `src/pet/status.ts`, `src/pet/fall.ts`
- Modify: `src/pet/brain.ts`
- Test: `tests/pet/status.test.ts`, `tests/pet/fall.test.ts`, `tests/pet/brain.test.ts`

- [ ] **Step 1: Testy**

`tests/pet/status.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ANGRY_TAPS, SUGAR_RUSH, avatarFor, countRecent, statusAnimation } from '../../src/pet/status';

const n = (hunger: number, energy: number, mood: number) => ({ hunger, energy, mood });

describe('statusAnimation', () => {
  it('priorytety', () => {
    expect(statusAnimation(n(5, 5, 5))).toBe('starving');
    expect(statusAnimation(n(50, 5, 5))).toBe('exhausted');
    expect(statusAnimation(n(20, 15, 5))).toBe('hungry');
    expect(statusAnimation(n(50, 15, 5))).toBe('tired');
    expect(statusAnimation(n(50, 50, 20))).toBe('sad');
    expect(statusAnimation(n(50, 50, 50))).toBeNull();
  });
  it('progi są ostre (< nie <=)', () => {
    expect(statusAnimation(n(25, 20, 30))).toBeNull();
  });
});

describe('countRecent', () => {
  it('liczy w oknie czasu', () => {
    expect(countRecent([0, 1000, 2500, 2900], 3000, ANGRY_TAPS.windowMs)).toBe(4);
    expect(countRecent([0, 1000, 2500, 2900], 3500, ANGRY_TAPS.windowMs)).toBe(3);
    expect(countRecent([5000], 3000, 1000)).toBe(0);
  });
  it('stałe ze specyfikacji', () => {
    expect(ANGRY_TAPS).toEqual({ count: 5, windowMs: 3000 });
    expect(SUGAR_RUSH).toEqual({ count: 3, windowMs: 600_000 });
  });
});

describe('avatarFor', () => {
  it('wybiera portret stanu', () => {
    expect(avatarFor(null, null, 0)).toBe('portrait_a');
    expect(avatarFor('hungry', null, 0)).toBe('face_hungry');
    expect(avatarFor('starving', null, 0)).toBe('face_hungry');
    expect(avatarFor('tired', null, 0)).toBe('face_tired');
    expect(avatarFor('exhausted', null, 0)).toBe('face_tired');
    expect(avatarFor('sad', null, 0)).toBe('portrait_a');
    expect(avatarFor('hungry', 'scared', 0)).toBe('face_dizzy');
    expect(avatarFor(null, 'crazy', 0)).toBe('face_crazy_1');
    expect(avatarFor(null, 'crazy', 450)).toBe('face_crazy_2');
  });
});
```

`tests/pet/fall.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FALL, landingEmotion, startFall, stepFall } from '../../src/pet/fall';

const run = (lift: number) => {
  let f = startFall(lift);
  let bounces = 0;
  let prevVy = f.vy;
  for (let i = 0; i < 400 && !f.done; i++) {
    f = stepFall(f, 16);
    if (prevVy > 0 && f.vy < 0) bounces++;
    prevVy = f.vy;
  }
  return { f, bounces };
};

describe('spadanie', () => {
  it('z ziemi od razu koniec', () => {
    expect(startFall(0).done).toBe(true);
  });
  it('spada na podłogę, odbija się raz i kończy', () => {
    const { f, bounces } = run(80);
    expect(f.done).toBe(true);
    expect(f.lift).toBe(0);
    expect(bounces).toBe(1);
  });
  it('nigdy nie schodzi pod podłogę', () => {
    let f = startFall(30);
    for (let i = 0; i < 200; i++) {
      f = stepFall(f, 33);
      expect(f.lift).toBeGreaterThanOrEqual(0);
    }
  });
  it('emocja po lądowaniu zależy od wysokości', () => {
    expect(landingEmotion(startFall(FALL.scaredHeight + 1))).toBe('scared');
    expect(landingEmotion(startFall(FALL.scaredHeight))).toBe('happy');
  });
});
```

`tests/pet/brain.test.ts` — zamień `describe('animationName', …)` na:
```ts
describe('animationName', () => {
  const b = createBrain(0);
  it('sen > akcja > chód > stan > spoczynek', () => {
    expect(animationName(b, { sleeping: true, status: 'hungry' })).toBe('sleep');
    expect(animationName({ ...b, action: 'angry' }, { sleeping: false, status: 'starving' })).toBe('angry');
    expect(animationName({ ...b, action: 'happy' }, { sleeping: false, status: null })).toBe('happy');
    expect(animationName({ ...b, action: 'walk' }, { sleeping: false, status: null })).toBe('walk');
    expect(animationName(b, { sleeping: false, status: 'tired' })).toBe('tired');
    expect(animationName(b, { sleeping: false, status: null })).toBe('idle');
  });
});

it('bez pozwolenia na chód (canWalk=false) nie rusza w drogę', () => {
  const next = stepBrain(createBrain(0), 16, { now: 10_000, mood: 'happy', sleeping: false, rng: () => 0, canWalk: false });
  expect(next.action).toBe('idle');
});
```
Wszystkie inne użycia `'jump'` w testach brain zamień na `'happy'`.

- [ ] **Step 2: Uruchom — FAIL**

Run: `npx vitest run tests/pet` → FAIL.

- [ ] **Step 3: `src/pet/status.ts`**

```ts
import type { Needs } from '../core/types';

export type StatusAnim = 'starving' | 'exhausted' | 'hungry' | 'tired' | 'sad' | null;
export type AvatarEmotion = 'crazy' | 'scared' | null;

/** Progi stanów (spec §4): poniżej wartości stan jest aktywny. */
export const STATUS = { starving: 10, exhausted: 8, hungry: 25, tired: 20, sad: 30 } as const;
/** 5 stuknięć w 3 s — złość. */
export const ANGRY_TAPS = { count: 5, windowMs: 3000 } as const;
/** 3 KitKaty w 10 min — cukrowy szał. */
export const SUGAR_RUSH = { count: 3, windowMs: 600_000 } as const;

export function statusAnimation(n: Needs): StatusAnim {
  if (n.hunger < STATUS.starving) return 'starving';
  if (n.energy < STATUS.exhausted) return 'exhausted';
  if (n.hunger < STATUS.hungry) return 'hungry';
  if (n.energy < STATUS.tired) return 'tired';
  if (n.mood < STATUS.sad) return 'sad';
  return null;
}

/** Ile znaczników czasu mieści się w oknie [now − windowMs, now]. */
export function countRecent(times: readonly number[], now: number, windowMs: number): number {
  return times.filter((t) => t <= now && now - t <= windowMs).length;
}

const CRAZY_FACES = ['face_crazy_1', 'face_crazy_2', 'face_crazy_3'];

/** Portret do nagłówka: emocja > stan > zwykły portret. */
export function avatarFor(status: StatusAnim, emotion: AvatarEmotion, t: number): string {
  if (emotion === 'crazy') return CRAZY_FACES[Math.floor(t / 400) % CRAZY_FACES.length];
  if (emotion === 'scared') return 'face_dizzy';
  if (status === 'starving' || status === 'hungry') return 'face_hungry';
  if (status === 'exhausted' || status === 'tired') return 'face_tired';
  return 'portrait_a';
}
```

- [ ] **Step 4: `src/pet/fall.ts`**

```ts
/** Fizyka upuszczenia: `lift` = wysokość nad podłogą (px logiczne, w górę dodatnio), `vy` > 0 = w dół. */
export const FALL = { gravity: 600, bounce: 0.3, minBounceSpeed: 60, scaredHeight: 40 } as const;

export interface Fall {
  lift: number;
  vy: number;
  startLift: number;
  bounced: boolean;
  done: boolean;
}

export function startFall(lift: number): Fall {
  const l = Math.max(0, lift);
  return { lift: l, vy: 0, startLift: l, bounced: false, done: l <= 0 };
}

export function stepFall(f: Fall, dtMs: number): Fall {
  if (f.done) return f;
  const dt = dtMs / 1000;
  let vy = f.vy + FALL.gravity * dt;
  let lift = f.lift - vy * dt;
  let bounced = f.bounced;
  if (lift <= 0) {
    lift = 0;
    if (!bounced && vy > FALL.minBounceSpeed) {
      vy = -vy * FALL.bounce;
      bounced = true;
    } else {
      return { ...f, lift: 0, vy: 0, bounced, done: true };
    }
  }
  return { ...f, lift, vy, bounced, done: false };
}

export const landingEmotion = (f: Fall): 'scared' | 'happy' => (f.startLift > FALL.scaredHeight ? 'scared' : 'happy');
```

- [ ] **Step 5: `src/pet/brain.ts`**

- `PetAction`: `'idle' | 'walk' | 'eat' | 'wave' | 'talk' | 'happy' | 'angry' | 'scared' | 'crazy'` (bez `'jump'`).
- `ACTION_MS`: `{ eat: 1600, wave: 1200, talk: 2500, happy: 900, angry: 2000, scared: 1800, crazy: 2500 }`.
- `BrainCtx`: dodaj `canWalk?: boolean` (domyślnie `true`); w decyzji o spacerze: `if ((ctx.canWalk ?? true) && ctx.rng() < WALK_CHANCE[ctx.mood])`.
- `animationName`:
```ts
export function animationName(b: Brain, s: { sleeping: boolean; status: StatusAnim }): string {
  if (s.sleeping) return 'sleep';
  if (b.action !== 'idle' && b.action !== 'walk') return b.action;
  if (b.action === 'walk') return 'walk';
  return s.status ?? 'idle';
}
```
(import `type StatusAnim` z `./status`).

- [ ] **Step 6: Uruchom — PASS (testy pet), tsc pokaże błędy w room.ts**

Run: `npx vitest run tests/pet` → PASS. `npx tsc --noEmit` → błędy tylko w `src/ui/screens/room.ts` (stare `'jump'`, stara sygnatura `animationName`) — naprawiane w Task 4. Nie commituj jeszcze, jeśli `npm test` nie przechodzi; jeśli wszystkie testy przechodzą (testy nie importują room.ts), commit:

```bash
git add src/pet tests/pet
git commit -m "Logika stanów i emocji, fizyka upuszczenia, priorytety animacji" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pokój — stany, emocje, przeciąganie, łóżko, mina w nagłówku

**Files:**
- Modify: `src/ui/screens/room.ts`, `src/content.ts`
- (jeśli potrzeba) Modify: `src/styles/screens.css`

Przeczytaj cały `src/ui/screens/room.ts` przed zmianami. Zachowaj istniejącą strukturę (PixelStage: tło → `compose(drawSprite)` → efekty), sprzątanie w `destroy()`.

- [ ] **Step 1: Kwestie w `src/content.ts` (`lines`)**

```ts
    angry: ['Hej! Przestań!', 'Nie zaczepiaj mnie!'],
    scared: ['Aaa! Ostrożnie!', 'Kręci mi się w głowie…'],
    crazy: ['Cukier! Cukieeer!', 'Wiiiii!'],
    drag: ['Łiii!', 'Postaw mnie!', 'Lecę!'],
    landHappy: ['Jeszcze raz!', 'Hihi!'],
```

- [ ] **Step 2: Stan i animacja**

- Co klatkę: `const status = statusAnimation(s.needs)`; `stepBrain(…, { …, canWalk: status === null })`; `animationName(brain, { sleeping: s.sleeping, status })`.
- Usuń stare nakładki `cloud`/`food`/cząstki `zzz` (manifest ich nie zwraca; usuń martwy kod `drawOverlay` dla nich).
- Spontaniczna radość: gdy wybija `nextChatAt` i `s.needs.mood >= 99`, z prawdopodobieństwem 0,3 zamiast mówienia `triggerBrain(brain, 'happy', t)` + serduszka.
- Wszystkie dotychczasowe `triggerBrain(…, 'jump', …)` → `'happy'`; offset skoku (`jumpStart`) liczony, gdy `brain.action === 'happy'` (start ustawiany przy wyzwoleniu jak dotąd).

- [ ] **Step 3: Emocje ze zdarzeń**

- Złość: tablica `taps: number[]` (ms). Przy każdym stuknięciu w postać (nie w trakcie snu/przeciągania) dopisz `now`, przytnij do ostatnich 10; jeśli `countRecent(taps, now, ANGRY_TAPS.windowMs) >= ANGRY_TAPS.count` → `triggerBrain(brain, 'angry', now)`, `say(pick(content.lines.angry))`, `taps.length = 0`, **bez** `petCharacter`.
- Szał: tablica `kitkats: number[]`. Po nakarmieniu KitKatem dopisz `Date.now()`; jeśli `countRecent(kitkats, Date.now(), SUGAR_RUSH.windowMs) >= SUGAR_RUSH.count` → po animacji jedzenia (tam gdzie dziś skok z serduszkami) `triggerBrain(brain, 'crazy', t)` + `say(pick(content.lines.crazy))` i wyczyść `kitkats`; inaczej jak dotąd radość (`'happy'`) z serduszkami.

- [ ] **Step 4: Przeciąganie i upuszczenie**

Stan w ekranie: `drag: null | { x: number; y: number; startedAt: number; lastX: number; lastY: number; lastT: number; speed: number }`, `fall: Fall | null`, `fallX: number`.

- `pointerdown` na postaci (dotychczasowy hit-test, poza snem): zapamiętaj `down = { x, y, id: e.pointerId, t }`, `canvas.setPointerCapture(e.pointerId)` (try/catch). Nie wykonuj jeszcze głaskania.
- `pointermove` (ten sam pointerId): jeśli brak `drag` i przesunięcie od `down` > 6 px logicznych → start: `drag = { …, startedAt: now }`, `brain = { ...brain, action: 'idle', targetX: brain.x }`, `say(pick(content.lines.drag), 1500)`. W trakcie: aktualizuj pozycję i `speed` (px log./s, wygładzanie `speed = speed*0.7 + chwilowa*0.3`).
- `pointerup`: jeśli był `drag` → `fall = startFall(lift)`, `fallX = x` (ograniczone do `ROOM_BOUNDS`), `drag = null`; jeśli nie było przesunięcia → dotychczasowa logika stuknięcia (głaskanie/złość/pobudka). `pointercancel` → jak puszczenie (bez głaskania).
- Pozycja przy trzymaniu: `x = clamp(pointer.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX)`; czubek głowy pod palcem: `feetY = min(FEET_Y, pointer.y + DISPLAY_HEIGHT)`, `lift = FEET_Y - feetY`.
- Animacja: trzymanie < 200 ms → `drag_pick`; dalej `speed > 120` → `drag_panic`, inaczej `drag_dangle`. Spadanie (`fall` nie `done`) → `drag_dangle`; rysuj w `feetY = FEET_Y - fall.lift`, `x = fallX`.
- Każda klatka: `fall = stepFall(fall, dt)`; gdy `fall.done` → `brain = { ...brain, x: fallX, targetX: fallX }`, `const emo = landingEmotion(fall)`, `triggerBrain(brain, emo, t)`, `say(pick(emo === 'scared' ? content.lines.scared : content.lines.landHappy))`, `fall = null`.
- Te nazwy animacji mają pierwszeństwo przed `animationName` (spec: trzymanie/spadanie zaraz po śnie). Cień rysuj na podłodze pod `x` (mniejszy przy dużym `lift`).
- Lodówka i inne przyciski działają bez zmian; przeciąganie wyłączone w trakcie snu.

- [ ] **Step 5: Sen w łóżku**

- Gdy `s.sleeping`: animacja `sleep` (intro łóżko 1→2→3, potem pętla 4↔5) rysowana w `x = 64`, `feetY = FEET_Y + 2`, bez odbicia i bez podskoku; postać chodząca nie jest rysowana. Start animacji (`animStart`) zerowany przy przejściu w sen (istniejąca logika zmiany nazwy animacji to zapewnia).
- Pobudka (każde przejście `sleeping` true→false w `sync`): przez 1000 ms animacja `wake` w tym samym miejscu (`x = 64`), potem `brain.x = brain.targetX = 64` i dotychczasowe `wakeBrain` + kwestia `wakeUp`.
- Usuń dotychczasowe przyciemnianie `dim` (manifest go nie ma) — nocna paleta pokoju zostaje.
- Stuknięcie w łóżko w trakcie snu budzi (hit-test na prostokącie łóżka: |x−64| ≤ 40, y ∈ [FEET_Y−60, FEET_Y]).

- [ ] **Step 6: Mina w nagłówku**

`avatarImg.src` = `spriteUrl(avatarFor(status, emotion, performance.now()))`, gdzie `emotion` = `'crazy'` gdy `brain.action === 'crazy'`, `'scared'` gdy `brain.action === 'scared'`, inaczej `null`. Aktualizuj tylko przy zmianie nazwy (porównaj z poprzednią).

- [ ] **Step 7: Weryfikacja i commit**

Run: `npx tsc --noEmit && npm test && npm run build` → czysto.

```bash
git add src
git commit -m "Pokój: animacje stanów, emocje, przeciąganie palcem, sen w łóżku z kotem, mina w nagłówku" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Weryfikacja w przeglądarce (kontroler)

- [ ] Głód 20 / 5, energia 15 / 5, humor 20 (przez edycję zapisu + blokadę `setItem` na czas przeładowania) → właściwe animacje i miny w nagłówku, brak chodzenia.
- [ ] 5 szybkich stuknięć → złość; 3 KitKaty → szał.
- [ ] Przeciąganie: złapanie, dyndanie, panika przy szybkim ruchu, upadek z odbiciem, przestraszona z wysoka / wesoła z nisko.
- [ ] Sen: łóżko z kotem (intro → pętla), pobudka stuknięciem i światłem.
- [ ] Zbliżenia klatek: ostre, bez resztek dłoni i napisów; konsola bez błędów.
