# Pory roku i pogoda — etap 1 — plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pora roku i dzienna pogoda z daty telefonu: balkon z namalowanymi tłami (4 pory × dzień/noc) i animowaną pogodą, opady w szybach okien, długość dnia zależna od pory roku, ikonka pogody przy zegarze, kwestie Gabi o pogodzie; wydanie jako wersja 3.

**Architecture:** Czyste moduły `src/home/season.ts` (pora roku, pogoda, podgląd), `src/home/daytime.ts` (pory dnia wg pory roku), `src/home/weatherFx.ts` (drobinki pogody jako funkcje czasu) i `src/home/glass.ts` (wykrywanie szyby w sprite'cie okna) z testami. Rysowanie: `src/pet/room.ts` (`drawBalcony`), `src/ui/home/balconyBackdrop.ts` (wczytywanie teł), `src/ui/home/windowWeather.ts` (opady na szybach), zmiany w rendererze pokoju i ekranie pokoju. Tła przygotowuje narzędzie `tools/make_backgrounds.py`.

**Tech Stack:** Vite + TypeScript + Vitest (środowisko `node`), canvas 2D, Python 3 (`/c/gvenv/Scripts/python`, Pillow + numpy) dla narzędzia teł.

**Spec:** `docs/superpowers/specs/2026-10-18-pory-roku-design.md` (etap 1). Etap 2 (ozdoby sezonowe) — osobny plan.

**Repozytorium:** `C:\Users\Al8c\Documents\gabigochi`, gałąź `etap-1`. Commity na `etap-1`, **bez wypychania** (wypchnięcie tylko w Task 10, za zgodą użytkownika). Testy: `npx vitest run`, typy: `npx tsc --noEmit -p .`, build: `npm run build`. Pliki mają końce linii LF (git zamienia na CRLF — ostrzeżenia są nieszkodliwe).

---

## Struktura plików

| Plik | Odpowiedzialność |
| --- | --- |
| `src/home/season.ts` (nowy) | pora roku z daty, pogoda dnia, nazwy, tabela szans, nazwy teł, podgląd `?pora=`/`?pogoda=` |
| `src/home/daytime.ts` | pora dnia wg pory roku (`PHASE_STARTS`), `eveningProgress`; usunięte `SKY` |
| `tools/make_backgrounds.py` (nowy) | 8 obrazków od użytkownika → `public/backgrounds/*.png` 128×160 + podgląd |
| `src/home/weatherFx.ts` (nowy) | drobinki: deszcz, śnieg, mróz, liście, płatki, motyle, świetliki, migotanie gwiazd, błyskawice; `weatherParticles`, `WEATHER_TINT` |
| `src/pet/room.ts` | `drawBalcony` (tło + odcienie + pogoda + ptaki/gwiazdy), `drawParticles`; usunięte rysowane niebo/miasto/balustrada |
| `src/home/balconySky.ts` | zostaje `skyHash`, ptaki i spadające gwiazdy; usunięte okna miasta, chmurki, migotanie |
| `src/ui/home/balconyBackdrop.ts` (nowy) | wczytywanie obrazków teł |
| `src/ui/home/roomRenderer.ts` | balkon przez `drawBalcony`; opady na szybach okien; odcień pogody okien |
| `src/home/glass.ts` (nowy) | maska szyby z pikseli sprite'a okna |
| `src/ui/home/windowWeather.ts` (nowy) | rysowanie opadów na szybie (maska, klatka, odbicie) |
| `src/ui/home/scene.ts` | `itemTints` z parametrem pogody |
| `src/ui/home/inventoryPanel.ts` | na balkonie bez zakładki „Podłoga” |
| `src/ui/sound.ts` | efekt `thunder` |
| `src/art/icons.ts`, `src/home/clock.ts` | ikonki pogody, `clockNow` z porą roku i pogodą, `WEATHER_ICON` |
| `src/content.ts`, `src/pet/speech.ts` | kwestie pór roku/pogody/o kotku; `worldLine`, `windowLine`, `greetingLine`, `pickLine` z porą roku |
| `src/ui/screens/room.ts` | pola klatki (pora roku, pogoda, zmierzch, ograniczony ruch), grzmot, ikonka pogody przy zegarze, kwestie |
| `src/main.ts` | podgląd `?pora=`/`?pogoda=` (tylko `npm run dev`) |

---

### Task 1: Pora roku i pogoda (`src/home/season.ts`)

**Files:**
- Create: `src/home/season.ts`
- Create: `tests/home/season.test.ts`
- Modify: `src/main.ts` (podgląd przy tworzeniu gry)

- [ ] **Step 1: Test** — utwórz `tests/home/season.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import {
  SEASONS,
  WEATHER_ODDS,
  backdropName,
  dayRoll,
  seasonNow,
  seasonOf,
  setSeasonOverride,
  setWeatherOverride,
  weatherFor,
  weatherNow,
  weatherOf,
  type Season,
  type Weather,
} from '../../src/home/season';

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

afterEach(() => {
  setSeasonOverride(null);
  setWeatherOverride(null);
});

describe('pora roku z daty', () => {
  it('miesiącami: wiosna III–V, lato VI–VIII, jesień IX–XI, zima XII–II', () => {
    expect(seasonOf(day(2026, 2, 28))).toBe('winter');
    expect(seasonOf(day(2026, 3, 1))).toBe('spring');
    expect(seasonOf(day(2026, 5, 31))).toBe('spring');
    expect(seasonOf(day(2026, 6, 1))).toBe('summer');
    expect(seasonOf(day(2026, 8, 31))).toBe('summer');
    expect(seasonOf(day(2026, 9, 1))).toBe('autumn');
    expect(seasonOf(day(2026, 11, 30))).toBe('autumn');
    expect(seasonOf(day(2026, 12, 1))).toBe('winter');
    expect(seasonOf(day(2027, 1, 15))).toBe('winter');
  });
});

describe('pogoda dnia', () => {
  it('szanse w każdej porze roku sumują się do 1', () => {
    for (const s of SEASONS) {
      const sum = WEATHER_ODDS[s].reduce((a, [, p]) => a + p, 0);
      expect(sum, s).toBeCloseTo(1, 9);
    }
  });

  it('cały dzień ta sama pogoda; liczba dnia w [0, 1)', () => {
    expect(weatherOf(day(2026, 10, 19, 0))).toBe(weatherOf(day(2026, 10, 19, 23)));
    expect(dayRoll(day(2026, 10, 19, 0))).toBe(dayRoll(day(2026, 10, 19, 23)));
    for (let d = 1; d <= 31; d++) {
      const r = dayRoll(day(2026, 10, d));
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it('tylko pogody danej pory roku, z szansami jak w tabeli (±5 pkt proc. na 100 latach)', () => {
    const count = new Map<Season, Map<Weather, number>>();
    const total = new Map<Season, number>();
    for (let y = 2000; y < 2100; y++) {
      for (let doy = 0; doy < 365; doy++) {
        const d = new Date(y, 0, 1 + doy, 12);
        const s = seasonOf(d);
        const w = weatherOf(d);
        expect(WEATHER_ODDS[s].map(([x]) => x)).toContain(w);
        const m = count.get(s) ?? new Map<Weather, number>();
        m.set(w, (m.get(w) ?? 0) + 1);
        count.set(s, m);
        total.set(s, (total.get(s) ?? 0) + 1);
      }
    }
    for (const s of SEASONS) {
      for (const [w, p] of WEATHER_ODDS[s]) {
        expect((count.get(s)!.get(w) ?? 0) / total.get(s)!, `${s} ${w}`).toBeGreaterThan(p - 0.05);
        expect((count.get(s)!.get(w) ?? 0) / total.get(s)!, `${s} ${w}`).toBeLessThan(p + 0.05);
      }
    }
  });

  it('weatherFor liczy pogodę z tabeli podanej pory roku', () => {
    const d = day(2026, 7, 10);
    expect(WEATHER_ODDS.winter.map(([x]) => x)).toContain(weatherFor('winter', d));
  });
});

describe('podgląd ?pora= / ?pogoda=', () => {
  it('pora roku nadpisana polską nazwą; pogoda wtedy z tabeli tej pory roku', () => {
    const july = day(2026, 7, 10);
    expect(setSeasonOverride('zima')).toBe(true);
    expect(seasonNow(july)).toBe('winter');
    expect(WEATHER_ODDS.winter.map(([x]) => x)).toContain(weatherNow(july));
    expect(setSeasonOverride('jesien')).toBe(true);
    expect(seasonNow(july)).toBe('autumn');
  });

  it('pogoda nadpisana; zła nazwa — false i bez zmian; null wraca do daty', () => {
    const d = day(2026, 10, 19);
    expect(setWeatherOverride('burza')).toBe(true);
    expect(weatherNow(d)).toBe('storm');
    expect(setWeatherOverride('tornado')).toBe(false);
    expect(weatherNow(d)).toBe('storm');
    expect(setWeatherOverride('snieg')).toBe(true);
    expect(weatherNow(d)).toBe('snow');
    setWeatherOverride(null);
    expect(weatherNow(d)).toBe(weatherOf(d));
    expect(setSeasonOverride('lato?')).toBe(false);
    expect(seasonNow(d)).toBe('autumn');
  });

  it('nazwy plików teł', () => {
    expect(backdropName('winter', 'night')).toBe('winter-night');
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/season.test.ts`
Expected: FAIL — brak modułu `src/home/season`.

- [ ] **Step 3: Moduł** — utwórz `src/home/season.ts`:

```ts
/**
 * Pora roku i pogoda (czyste funkcje). Pora roku — z miesiąca w telefonie; pogoda — jedna na cały dzień,
 * losowana z daty (ten sam dzień = ta sama pogoda na każdym urządzeniu), z szansami zależnymi od pory roku.
 * Nic z tego nie trafia do zapisu gry. Przy tworzeniu gry można podejrzeć inną porę/pogodę (`?pora=`, `?pogoda=`).
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'frost';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_NAMES: Readonly<Record<Season, string>> = {
  spring: 'Wiosna',
  summer: 'Lato',
  autumn: 'Jesień',
  winter: 'Zima',
};

export const WEATHER_NAMES: Readonly<Record<Weather, string>> = {
  sunny: 'słonecznie',
  cloudy: 'pochmurno',
  rain: 'deszczowo',
  storm: 'burza',
  snow: 'śnieg',
  frost: 'mróz',
};

/** Szanse pogody w każdej porze roku (sumują się do 1; kolejność = kolejność losowania). */
export const WEATHER_ODDS: Readonly<Record<Season, readonly (readonly [Weather, number])[]>> = {
  spring: [['sunny', 0.45], ['cloudy', 0.25], ['rain', 0.3]],
  summer: [['sunny', 0.6], ['cloudy', 0.15], ['rain', 0.1], ['storm', 0.15]],
  autumn: [['sunny', 0.35], ['cloudy', 0.25], ['rain', 0.4]],
  winter: [['snow', 0.4], ['frost', 0.35], ['cloudy', 0.25]],
};

/** Pora roku z miesiąca: wiosna III–V, lato VI–VIII, jesień IX–XI, zima XII–II. */
export function seasonOf(d: Date): Season {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/** Liczba z [0, 1) stała dla dnia kalendarzowego (FNV-1a z „RRRR-M-D”, potem mieszanie jak w mulberry32). */
export function dayRoll(d: Date): number {
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let t = (h + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Pogoda dnia `d` z tabeli szans pory roku `season`. */
export function weatherFor(season: Season, d: Date): Weather {
  const r = dayRoll(d);
  const odds = WEATHER_ODDS[season];
  let acc = 0;
  for (const [w, p] of odds) {
    acc += p;
    if (r < acc) return w;
  }
  return odds[odds.length - 1][0];
}

/** Pogoda dnia wg prawdziwej pory roku. */
export function weatherOf(d: Date): Weather {
  return weatherFor(seasonOf(d), d);
}

/** Tło balkonu: pora roku × dzień/noc → nazwa pliku w `public/backgrounds` (bez `.png`). */
export type BackdropTime = 'day' | 'night';

export function backdropName(season: Season, time: BackdropTime): string {
  return `${season}-${time}`;
}

// ---------------------------------------------------------------------------
// Podgląd przy tworzeniu gry (`?pora=zima&pogoda=snieg`, tylko `npm run dev`)

const SEASON_PARAM: Readonly<Record<string, Season>> = {
  wiosna: 'spring',
  lato: 'summer',
  jesien: 'autumn',
  jesień: 'autumn',
  zima: 'winter',
};

const WEATHER_PARAM: Readonly<Record<string, Weather>> = {
  slonce: 'sunny',
  słońce: 'sunny',
  pochmurno: 'cloudy',
  deszcz: 'rain',
  burza: 'storm',
  snieg: 'snow',
  śnieg: 'snow',
  mroz: 'frost',
  mróz: 'frost',
};

let seasonOverride: Season | null = null;
let weatherOverride: Weather | null = null;

/** Podgląd pory roku (polska nazwa z adresu); null — z daty. Nieznana nazwa → false, bez zmian. */
export function setSeasonOverride(name: string | null): boolean {
  if (name === null) {
    seasonOverride = null;
    return true;
  }
  const s = SEASON_PARAM[name.trim().toLowerCase()];
  if (!s) return false;
  seasonOverride = s;
  return true;
}

/** Podgląd pogody (polska nazwa z adresu); null — z daty. Nieznana nazwa → false, bez zmian. */
export function setWeatherOverride(name: string | null): boolean {
  if (name === null) {
    weatherOverride = null;
    return true;
  }
  const w = WEATHER_PARAM[name.trim().toLowerCase()];
  if (!w) return false;
  weatherOverride = w;
  return true;
}

/** Pora roku w grze (z daty albo podglądu). */
export function seasonNow(d: Date): Season {
  return seasonOverride ?? seasonOf(d);
}

/** Pogoda w grze (podgląd albo z daty wg pory roku w grze — przy podglądzie zimy pogoda zimowa). */
export function weatherNow(d: Date): Weather {
  return weatherOverride ?? weatherFor(seasonNow(d), d);
}
```

- [ ] **Step 4: Testy przechodzą**

Run: `npx vitest run tests/home/season.test.ts`
Expected: PASS (7 testów).

- [ ] **Step 5: Podgląd w `src/main.ts`** — dopisz import obok importu `setClockOverride` (z `./home/clock`):

```ts
import { setSeasonOverride, setWeatherOverride } from './home/season';
```

i zastąp blok:

```ts
    // podgląd innej pory dnia przy tworzeniu gry: ?godzina=23 albo ?godzina=7:30 (tylko wygląd, potrzeby bez zmian)
    const hour = new URLSearchParams(location.search).get('godzina');
    if (import.meta.env.DEV && hour) setClockOverride(hour);
```

blokiem:

```ts
    // podgląd przy tworzeniu gry (tylko wygląd, potrzeby bez zmian): ?godzina=23 albo ?godzina=7:30,
    // ?pora=wiosna|lato|jesien|zima, ?pogoda=slonce|pochmurno|deszcz|burza|snieg|mroz
    const params = new URLSearchParams(location.search);
    if (import.meta.env.DEV) {
      const hour = params.get('godzina');
      if (hour) setClockOverride(hour);
      const pora = params.get('pora');
      if (pora) setSeasonOverride(pora);
      const pogoda = params.get('pogoda');
      if (pogoda) setWeatherOverride(pogoda);
    }
```

- [ ] **Step 6: Typy i całość**

Run: `npx tsc --noEmit -p .` oraz `npx vitest run`
Expected: bez błędów, wszystkie testy PASS.

- [ ] **Step 7: Commit**

```bash
git add src/home/season.ts tests/home/season.test.ts src/main.ts
git commit -m "Pory roku: pora roku i pogoda dnia z daty, podgląd ?pora= i ?pogoda="
```

---

### Task 2: Długość dnia wg pory roku (`src/home/daytime.ts`)

**Files:**
- Modify: `src/home/daytime.ts:1-20` (`dayPhase`)
- Modify: `tests/home/daytime.test.ts`

- [ ] **Step 1: Testy** — w `tests/home/daytime.test.ts` uzupełnij importy u góry pliku: do importu z `vitest` dodaj
`afterEach`, do importu z `../../src/home/daytime` dodaj `PHASE_STARTS, eveningProgress`, oraz dodaj wiersz
`import { setSeasonOverride } from '../../src/home/season';`. Potem dopisz na końcu pliku:

```ts
const on = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min);

describe('pora dnia wg pory roku', () => {
  afterEach(() => setSeasonOverride(null));

  it('zimą krótki dzień: rano 7–9, dzień 9–15:30, wieczór 15:30–17, noc od 17', () => {
    expect(dayPhase(on(1, 10, 6, 50))).toBe('night');
    expect(dayPhase(on(1, 10, 8))).toBe('morning');
    expect(dayPhase(on(1, 10, 15, 20))).toBe('day');
    expect(dayPhase(on(1, 10, 15, 40))).toBe('evening');
    expect(dayPhase(on(1, 10, 17, 10))).toBe('night');
  });

  it('latem długi dzień: rano 5–9, dzień 9–20, wieczór 20–22, noc od 22', () => {
    expect(dayPhase(on(7, 10, 5, 30))).toBe('morning');
    expect(dayPhase(on(7, 10, 19, 30))).toBe('day');
    expect(dayPhase(on(7, 10, 21))).toBe('evening');
    expect(dayPhase(on(7, 10, 22, 30))).toBe('night');
  });

  it('wiosną i jesienią jak dawniej; progi rosną w ciągu doby', () => {
    expect(PHASE_STARTS.spring).toEqual(PHASE_STARTS.autumn);
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const p = PHASE_STARTS[s];
      expect(p.morning < p.day && p.day < p.evening && p.evening < p.night, s).toBe(true);
    }
  });

  it('zmierzch: 0 w dzień i rano, wieczorem rośnie, 1 w nocy', () => {
    expect(eveningProgress(on(10, 9, 12))).toBe(0);
    expect(eveningProgress(on(10, 9, 7))).toBe(0);
    expect(eveningProgress(on(10, 9, 19, 30))).toBeCloseTo(0.5);
    expect(eveningProgress(on(10, 9, 23))).toBe(1);
    expect(eveningProgress(on(10, 9, 3))).toBe(1);
  });

  it('podgląd pory roku zmienia długość dnia', () => {
    setSeasonOverride('zima');
    expect(dayPhase(on(10, 9, 16))).toBe('evening');
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/daytime.test.ts`
Expected: FAIL — brak eksportów `PHASE_STARTS`, `eveningProgress`.

- [ ] **Step 3: Implementacja** — w `src/home/daytime.ts` zastąp nagłówek i funkcję `dayPhase` (od początku pliku do końca `dayPhase`):

```ts
import { seasonNow, type Season } from './season';

/**
 * Pora dnia z zegara telefonu, zależna od pory roku: zimą krótki dzień (noc od 17), latem długi (noc od 22),
 * wiosną i jesienią rano 6–10, dzień 10–18, wieczór 18–21, noc 21–6. Okna i balkon pokazują poranną różowość,
 * wieczorny zachód i nocne niebo; pokój dostaje delikatną poświatę. Tylko wygląd — sen i potrzeby bez zmian.
 */
export type DayPhase = 'morning' | 'day' | 'evening' | 'night';

/** Początki pór dnia (godzina z ułamkiem) w każdej porze roku. */
export const PHASE_STARTS: Readonly<Record<Season, { morning: number; day: number; evening: number; night: number }>> = {
  winter: { morning: 7, day: 9, evening: 15.5, night: 17 },
  spring: { morning: 6, day: 10, evening: 18, night: 21 },
  summer: { morning: 5, day: 9, evening: 20, night: 22 },
  autumn: { morning: 6, day: 10, evening: 18, night: 21 },
};

const hoursOf = (d: Date) => d.getHours() + d.getMinutes() / 60;

export function dayPhase(d: Date): DayPhase {
  const s = PHASE_STARTS[seasonNow(d)];
  const h = hoursOf(d);
  if (h >= s.morning && h < s.day) return 'morning';
  if (h >= s.day && h < s.evening) return 'day';
  if (h >= s.evening && h < s.night) return 'evening';
  return 'night';
}

/** Jak daleko w zmierzch: 0 — rano i w dzień, 1 — w nocy, wieczorem rośnie od 0 do 1 (przejście tła balkonu). */
export function eveningProgress(d: Date): number {
  const s = PHASE_STARTS[seasonNow(d)];
  const h = hoursOf(d);
  if (h >= s.morning && h < s.evening) return 0;
  if (h >= s.evening && h < s.night) return (h - s.evening) / (s.night - s.evening);
  return 1;
}
```

(Reszta pliku — `PHASE_NAMES`, `WINDOW_PHASE_TINT`, `ROOM_PHASE_TINT`, `SKY` — bez zmian; `SKY` zniknie w Task 5.)

- [ ] **Step 4: Testy przechodzą**

Run: `npx vitest run tests/home` oraz `npx tsc --noEmit -p .`
Expected: PASS (stare testy pory dnia używają dat z października — progi jesieni = dawne progi), tsc bez błędów.

- [ ] **Step 5: Commit**

```bash
git add src/home/daytime.ts tests/home/daytime.test.ts
git commit -m "Pory roku: długość dnia zależna od pory roku, postęp zmierzchu"
```

---

### Task 3: Tła balkonu (`tools/make_backgrounds.py`, `public/backgrounds/`)

**Files:**
- Create: `tools/make_backgrounds.py`
- Create (wynik narzędzia): `public/backgrounds/{spring,summer,autumn,winter}-{day,night}.png`
- Create: `tests/home/backgrounds.test.ts`

Źródła są już w repozytorium: `assets/source/bg-{wiosna,lato,jesien,zima}-{dzien,noc}.jpg`.

- [ ] **Step 1: Test obecności teł** — utwórz `tests/home/backgrounds.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SEASONS, backdropName } from '../../src/home/season';

const files = Object.keys(import.meta.glob('../../public/backgrounds/*.png'));

describe('tła balkonu', () => {
  it('każda pora roku ma tło dzienne i nocne', () => {
    for (const s of SEASONS) {
      for (const t of ['day', 'night'] as const) expect(files).toContain(`../../public/backgrounds/${backdropName(s, t)}.png`);
    }
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/backgrounds.test.ts`
Expected: FAIL — brak plików.

- [ ] **Step 3: Narzędzie** — utwórz `tools/make_backgrounds.py`:

```python
"""Tła balkonu w porach roku: obrazki od użytkownika → 128×160 px gry (public/backgrounds/).

Wejście: assets/source/bg-{wiosna,lato,jesien,zima}-{dzien,noc}.jpg (namalowane „pixel art” w dużej rozdzielczości,
proporcje ~0,747). Każdy piksel gry = mediana środka swojej komórki (krawędzie komórek w JPG są rozmyte);
lekkie spłaszczenie w pionie do proporcji 0,8 — zostaje daszek u góry i podłoga u dołu.
Szary pas na dole (artefakt generatora, np. „jesień dzień”) zastępujemy powieleniem ostatniego dobrego rzędu.

Uruchom: python tools/make_backgrounds.py            (zapis + podgląd tools/out/backgrounds_preview.png)
         python tools/make_backgrounds.py --selftest (sprawdzenie bez zapisu)
"""
import argparse
import colorsys
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'source')
OUT = os.path.join(ROOT, 'public', 'backgrounds')
PREVIEW = os.path.join(ROOT, 'tools', 'out', 'backgrounds_preview.png')
W, H = 128, 160
SEASONS = {'wiosna': 'spring', 'lato': 'summer', 'jesien': 'autumn', 'zima': 'winter'}
TIMES = {'dzien': 'day', 'noc': 'night'}
# ile dolnych rzędów sprawdzamy pod kątem szarego pasa
BAND_ROWS = 12


def cell_median(im: Image.Image) -> np.ndarray:
    """Obrazek → W×H: każdy piksel to mediana środkowej połowy komórki (bez rozmytych brzegów)."""
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    h, w, _ = a.shape
    out = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0, y1 = int(y * h / H), int((y + 1) * h / H)
        cy0, cy1 = y0 + (y1 - y0) // 4, max(y0 + (y1 - y0) // 4 + 1, y1 - (y1 - y0) // 4)
        for x in range(W):
            x0, x1 = int(x * w / W), int((x + 1) * w / W)
            cx0, cx1 = x0 + (x1 - x0) // 4, max(x0 + (x1 - x0) // 4 + 1, x1 - (x1 - x0) // 4)
            blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3)
            out[y, x] = np.median(blk, axis=0)
    return out


def grey_row(row: np.ndarray) -> bool:
    """Rząd jednolity i szarawy (artefakt): prawie zerowa zmienność i niskie nasycenie (prawdziwa podłoga ma deski)."""
    sats = [colorsys.rgb_to_hsv(*(c / 255.0))[1] for c in row]
    return float(np.mean(sats)) < 0.25 and float(row.std(axis=0).mean()) < 3


def fix_bottom_band(px: np.ndarray) -> int:
    """Szare rzędy na dole → kopia ostatniego dobrego rzędu. Zwraca liczbę poprawionych rzędów."""
    fixed = 0
    for y in range(H - 1, H - 1 - BAND_ROWS, -1):
        if not grey_row(px[y]):
            break
        fixed += 1
    if fixed:
        good = px[H - 1 - fixed].copy()
        for y in range(H - fixed, H):
            px[y] = good
    return fixed


def build() -> dict:
    result = {}
    for pl, season in SEASONS.items():
        for plt, time in TIMES.items():
            path = os.path.join(SRC, f'bg-{pl}-{plt}.jpg')
            if not os.path.exists(path):
                raise FileNotFoundError(path)
            px = cell_median(Image.open(path))
            fixed = fix_bottom_band(px)
            result[f'{season}-{time}'] = (px, fixed)
    return result


def selftest(result: dict) -> None:
    assert len(result) == 8, result.keys()
    for name, (px, _) in result.items():
        assert px.shape == (H, W, 3), (name, px.shape)
        assert not grey_row(px[H - 1]), f'{name}: szary dół'
    # słońce w dzień ma zostać ciepłe i jasne (nie szare): w górnej 1/3 jest jasny piksel z przewagą czerwieni nad niebieskim
    for season in SEASONS.values():
        px = result[f'{season}-day'][0][: H // 3].astype(int)
        r, g, b = px[..., 0], px[..., 1], px[..., 2]
        assert (((r + g) / 2 > 185) & (r > b + 40)).any(), f'{season}-day: brak słońca'
    print('selftest OK')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()
    result = build()
    selftest(result)
    if args.selftest:
        return
    os.makedirs(OUT, exist_ok=True)
    order = [f'{s}-{t}' for t in TIMES.values() for s in SEASONS.values()]
    sheet = Image.new('RGB', (4 * (W * 2 + 8), 2 * (H * 2 + 8)), (40, 30, 60))
    for i, name in enumerate(order):
        px, fixed = result[name]
        img = Image.fromarray(px)
        img.save(os.path.join(OUT, f'{name}.png'), optimize=True)
        sheet.paste(img.resize((W * 2, H * 2), Image.NEAREST), ((i % 4) * (W * 2 + 8), (i // 4) * (H * 2 + 8)))
        print(f'{name}: zapisano' + (f' (poprawiony szary pas: {fixed} rz.)' if fixed else ''))
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    sheet.save(PREVIEW)
    print('podgląd:', PREVIEW)


if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 4: Selftest i generowanie**

Run: `/c/gvenv/Scripts/python tools/make_backgrounds.py --selftest`
Expected: `selftest OK`.

Run: `/c/gvenv/Scripts/python tools/make_backgrounds.py`
Expected: 8 linii „…: zapisano”, przy `autumn-day` „(poprawiony szary pas: 5 rz.)”, ścieżka podglądu. Pliki w `public/backgrounds/` mają po ~20–30 kB.

- [ ] **Step 5: Obejrzyj podgląd** — otwórz `tools/out/backgrounds_preview.png` (Read). Górny rząd: dni (wiosna, lato, jesień, zima), dolny: noce; słońca żółte, jesień dzień bez szarego pasa na dole.

- [ ] **Step 6: Test przechodzi**

Run: `npx vitest run tests/home/backgrounds.test.ts` oraz `npx tsc --noEmit -p .`
Expected: PASS, tsc bez błędów (`import.meta.glob` ma typy z `vite/client`, jak `import.meta.env` w `src/`).

- [ ] **Step 7: Commit**

```bash
git add tools/make_backgrounds.py public/backgrounds tests/home/backgrounds.test.ts
git commit -m "Pory roku: tła balkonu 128x160 z obrazków użytkownika (narzędzie i 8 plików)"
```

---

### Task 4: Drobinki pogody (`src/home/weatherFx.ts`)

**Files:**
- Create: `src/home/weatherFx.ts`
- Create: `tests/home/weatherFx.test.ts`

- [ ] **Step 1: Test** — utwórz `tests/home/weatherFx.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  WEATHER_TINT,
  butterflies,
  fireflies,
  flashSlot,
  frostFlakes,
  leaves,
  lightning,
  petals,
  rain,
  snow,
  twinkles,
  weatherParticles,
  type Area,
  type Particle,
} from '../../src/home/weatherFx';

const SKY: Area = { x: 0, y: 9, w: 128, h: 119 };
const PANE: Area = { x: 0, y: 0, w: 32, h: 30 };
const inside = (ps: readonly Particle[], a: Area) =>
  ps.every((p) => p.x >= a.x && p.y >= a.y && p.x + p.w <= a.x + a.w + 1e-9 && p.y + p.h <= a.y + a.h + 1e-9);

describe('drobinki pogody', () => {
  const kinds: [string, (a: Area, t: number) => Particle[]][] = [
    ['deszcz', (a, t) => rain(a, t, false)],
    ['ulewa', (a, t) => rain(a, t, true)],
    ['śnieg', snow],
    ['mróz', frostFlakes],
    ['liście', leaves],
    ['płatki', petals],
    ['motyle', butterflies],
    ['świetliki', fireflies],
    ['gwiazdy', twinkles],
  ];

  it('te same w tej samej chwili i zawsze w obszarze (balkon i szyba okna)', () => {
    for (const [name, fn] of kinds) {
      expect(fn(SKY, 1234), name).toEqual(fn(SKY, 1234));
      for (const t of [0, 777, 12_345, 99_999, 600_000]) {
        expect(inside(fn(SKY, t), SKY), `${name} @${t}`).toBe(true);
        expect(inside(fn(PANE, t), PANE), `${name} w oknie @${t}`).toBe(true);
      }
    }
  });

  it('opady spadają w czasie; ulewa gęstsza od deszczu; mała szyba też ma kilka drobinek', () => {
    expect(rain(SKY, 0, false).map((p) => p.y)).not.toEqual(rain(SKY, 300, false).map((p) => p.y));
    expect(snow(SKY, 0).map((p) => p.y)).not.toEqual(snow(SKY, 2000).map((p) => p.y));
    expect(rain(SKY, 0, true).length).toBeGreaterThan(rain(SKY, 0, false).length);
    expect(snow(PANE, 0).length).toBeGreaterThanOrEqual(4);
    expect(rain(PANE, 0, false).length).toBeGreaterThanOrEqual(3);
    expect(frostFlakes(PANE, 0).length).toBeGreaterThanOrEqual(1);
  });

  it('błyskawica: krótko, raz na kilka sekund; grzmot raz na błysk', () => {
    let lit = 0;
    let flashes = 0;
    let prev: number | null = null;
    for (let t = 0; t < 60_000; t += 20) {
      if (lightning(t) > 0) lit++;
      const s = flashSlot(t);
      expect(s !== null).toBe(lightning(t) > 0);
      if (s !== null && s !== prev) flashes++;
      if (s !== null) prev = s;
    }
    expect(lit / 3000).toBeGreaterThan(0.01);
    expect(lit / 3000).toBeLessThan(0.15);
    expect(flashes).toBeGreaterThan(4);
    expect(flashes).toBeLessThan(16);
  });
});

describe('pogoda na scenie', () => {
  const scene = (o: Partial<Parameters<typeof weatherParticles>[0]>) =>
    weatherParticles({ season: 'autumn', weather: 'sunny', phase: 'day', area: SKY, t: 5000, open: true, ...o });
  const colours = (ps: readonly Particle[]) => new Set(ps.map((p) => p.color));

  it('śnieg — same białe płatki; deszcz — kreski 1×3; mróz — pojedyncze płatki', () => {
    const s = scene({ season: 'winter', weather: 'snow' });
    expect(s.length).toBeGreaterThan(20);
    expect(colours(s)).toEqual(new Set(['#ffffff']));
    const r = scene({ weather: 'rain' });
    expect(r.every((p) => p.w === 1 && p.h === 3)).toBe(true);
    const f = scene({ season: 'winter', weather: 'frost' });
    expect(f.length).toBeGreaterThanOrEqual(1);
    expect(f.length).toBeLessThan(15);
  });

  it('jesień przy słońcu — liście; wiosna przy słońcu — płatki, w deszcz bez płatków', () => {
    expect(scene({}).length).toBeGreaterThan(0);
    expect([...colours(scene({}))].every((c) => ['#e8902c', '#c9581e', '#f2c14a', '#a8452a'].includes(c))).toBe(true);
    expect(colours(scene({ season: 'spring' })).has('#ffc4dc')).toBe(true);
    expect(colours(scene({ season: 'spring', weather: 'rain' })).has('#ffc4dc')).toBe(false);
  });

  it('lato: motyle w słoneczny dzień tylko na balkonie; świetliki nocą', () => {
    expect(colours(scene({ season: 'summer' })).has('#2a1f3d')).toBe(true);
    expect(scene({ season: 'summer', open: false })).toEqual([]);
    const nights = [1000, 3000, 7000, 11_000].map((t) => scene({ season: 'summer', phase: 'night', t }));
    expect(nights.some((ps) => ps.some((p) => p.color === '#e8ff8a'))).toBe(true);
  });

  it('odcień pogody: pogodnie bez, pochmurno/deszcz/burza coraz ciemniej', () => {
    expect(WEATHER_TINT.sunny).toBeNull();
    expect(WEATHER_TINT.frost).toBeNull();
    for (const w of ['cloudy', 'rain', 'storm', 'snow'] as const) expect(WEATHER_TINT[w]).toMatch(/^rgba/);
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/weatherFx.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: Moduł** — utwórz `src/home/weatherFx.ts`:

```ts
import { skyHash as hash } from './balconySky';
import type { DayPhase } from './daytime';
import type { Season, Weather } from './season';

/**
 * Drobinki pogody i pór roku jako czyste funkcje czasu (te same dla tej samej chwili): deszcz, ulewa, śnieg,
 * pojedyncze płatki przy mrozie, liście jesienią, płatki kwiatów wiosną, motyle i świetliki latem, migotanie gwiazd
 * i błyskawice. Współrzędne w obszarze `Area` — na balkonie px logiczne pokoju, w oknie px natywne sprite'a.
 */

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Jeden prostokącik do narysowania (kropla, płatek, liść…). */
export interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const wrap = (v: number, span: number) => ((v % span) + span) % span;

/** Ile drobinek na tę powierzchnię (gęstość na px²), co najmniej `min`. */
const countFor = (a: Area, density: number, min: number) => Math.max(min, Math.round(a.w * a.h * density));

interface Fall {
  /** Prędkość spadania (px/s): od–do. */
  speed: readonly [number, number];
  /** Dryf w bok (px/s). */
  drift: number;
  /** Kołysanie na boki (px). */
  sway: number;
  size: (i: number, t: number) => readonly [number, number];
  color: (i: number) => string;
}

/** Drobinki spadające w dół (zawijane w obszarze), z dryfem w bok i kołysaniem. */
function falling(a: Area, t: number, n: number, seed: number, o: Fall): Particle[] {
  const out: Particle[] = [];
  const s = t / 1000;
  for (let i = 0; i < n; i++) {
    const k = i + seed * 1000;
    const speed = o.speed[0] + hash(k * 1.3 + 0.1) * (o.speed[1] - o.speed[0]);
    const [w, h] = o.size(i, t);
    const y = a.y + wrap(hash(k * 3.3 + 0.7) * a.h + s * speed, a.h);
    const x = a.x + wrap(hash(k * 2.1 + 0.3) * a.w + s * o.drift + Math.sin(t / 900 + i) * o.sway, a.w);
    out.push({ x: Math.min(x, a.x + a.w - w), y: Math.min(y, a.y + a.h - h), w, h, color: o.color(i) });
  }
  return out;
}

/** Deszcz (ukośne kreski 1×3); `heavy` — ulewa (burza). */
export function rain(a: Area, t: number, heavy: boolean): Particle[] {
  return falling(a, t, countFor(a, heavy ? 0.006 : 0.0035, heavy ? 5 : 3), 1, {
    speed: heavy ? [150, 190] : [110, 150],
    drift: heavy ? 45 : 25,
    sway: 0,
    size: () => [1, 3],
    color: () => 'rgba(205, 222, 255, 0.75)',
  });
}

/** Śnieg: płatki 1–2 px, różna prędkość, kołysanie. */
export function snow(a: Area, t: number): Particle[] {
  return falling(a, t, countFor(a, 0.004, 4), 2, {
    speed: [8, 16],
    drift: 2,
    sway: 3,
    size: (i) => (hash(i * 5.7) > 0.8 ? [2, 2] : [1, 1]),
    color: () => '#ffffff',
  });
}

/** Mróz: pojedyncze, wolne płatki. */
export function frostFlakes(a: Area, t: number): Particle[] {
  return falling(a, t, countFor(a, 0.0004, 1), 3, {
    speed: [6, 10],
    drift: 1,
    sway: 2,
    size: () => [1, 1],
    color: () => '#f4fbff',
  });
}

const LEAF_COLORS = ['#e8902c', '#c9581e', '#f2c14a', '#a8452a'];

/** Jesienne liście: koziołkują (2×1 ↔ 1×2), lecą z wiatrem. */
export function leaves(a: Area, t: number): Particle[] {
  return falling(a, t, countFor(a, 0.0011, 2), 4, {
    speed: [10, 20],
    drift: 12,
    sway: 6,
    size: (i, tt) => (Math.floor(tt / 250 + i) % 2 ? [2, 1] : [1, 2]),
    color: (i) => LEAF_COLORS[i % LEAF_COLORS.length],
  });
}

const PETAL_COLORS = ['#ffc4dc', '#ffffff', '#ffb0cf'];

/** Wiosenne płatki kwiatów. */
export function petals(a: Area, t: number): Particle[] {
  return falling(a, t, countFor(a, 0.0015, 2), 5, {
    speed: [7, 14],
    drift: 9,
    sway: 5,
    size: () => [1, 1],
    color: (i) => PETAL_COLORS[i % PETAL_COLORS.length],
  });
}

const WING_COLORS = ['#ffd34d', '#ff9ad5', '#9ad0ff'];

/** Trzy motyle: tułów i machające skrzydła, krążą w dolnej części obszaru. */
export function butterflies(a: Area, t: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 3; i++) {
    const cx = a.x + a.w * (0.2 + 0.3 * i) + Math.sin(t / 800 + i * 2) * Math.min(14, a.w * 0.12);
    const cy = a.y + a.h * 0.6 + Math.cos(t / 600 + i) * Math.min(10, a.h * 0.12);
    const ww = Math.floor(t / 150 + i) % 2 === 0 ? 2 : 1;
    const x = Math.min(Math.max(Math.round(cx), a.x + ww), a.x + a.w - 1 - ww);
    const y = Math.min(Math.max(Math.round(cy), a.y), a.y + a.h - 2);
    out.push(
      { x: x - ww, y, w: ww, h: 2, color: WING_COLORS[i] },
      { x, y, w: 1, h: 2, color: '#2a1f3d' },
      { x: x + 1, y, w: ww, h: 2, color: WING_COLORS[i] },
    );
  }
  return out;
}

/** Świetliki: migające żółtozielone punkciki nisko, nad krzakami. */
export function fireflies(a: Area, t: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 10; i++) {
    if (wrap(t / 400 + hash(i * 7.1) * 10, 3) >= 1.6) continue;
    const x = a.x + hash(i * 2.9 + 0.4) * (a.w - 1) + Math.sin(t / 1300 + i) * 2;
    const y = a.y + a.h * 0.45 + hash(i * 4.3 + 0.2) * (a.h * 0.55 - 1) + Math.cos(t / 1100 + i) * 2;
    out.push({
      x: Math.min(Math.max(x, a.x), a.x + a.w - 1),
      y: Math.min(Math.max(y, a.y), a.y + a.h - 1),
      w: 1,
      h: 1,
      color: '#e8ff8a',
    });
  }
  return out;
}

/** Migoczące gwiazdy w górnej części nieba: każda co chwilę na moment rozbłyska. */
export function twinkles(a: Area, t: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 14; i++) {
    const period = 1800 + hash(i * 2.3) * 2600;
    if (wrap(t + hash(i * 9.1) * period, period) / period >= 0.15) continue;
    out.push({
      x: a.x + Math.floor(hash(i * 5.9 + 0.3) * a.w),
      y: a.y + Math.floor(hash(i * 6.7 + 0.8) * a.h * 0.45),
      w: 1,
      h: 1,
      color: '#ffffff',
    });
  }
  return out;
}

/** Co tyle ms jest szansa na błyskawicę (w burzy). */
export const LIGHTNING_SLOT_MS = 4200;
const LIGHTNING_CHANCE = 0.7;

/** Początek błysku w oknie czasu `slot` (ms) albo null — w tym oknie bez błyskawicy. */
function flashStart(slot: number): number | null {
  if (hash(slot * 3.71 + 0.5) > LIGHTNING_CHANCE) return null;
  return slot * LIGHTNING_SLOT_MS + hash(slot * 1.93 + 0.2) * (LIGHTNING_SLOT_MS - 400);
}

/** Jasność błysku burzy w chwili `t` (0–1): podwójne mignięcie raz na kilka sekund. */
export function lightning(t: number): number {
  const slot = Math.floor(t / LIGHTNING_SLOT_MS);
  const start = flashStart(slot);
  if (start === null) return 0;
  const local = t - start;
  if (local >= 0 && local < 120) return 1;
  if (local >= 220 && local < 300) return 0.6;
  return 0;
}

/** Numer okna czasu z trwającym błyskiem (grzmot raz na błysk) albo null. */
export function flashSlot(t: number): number | null {
  return lightning(t) > 0 ? Math.floor(t / LIGHTNING_SLOT_MS) : null;
}

/** Co w danej chwili pada albo lata (balkon: `open` — także motyle i świetliki; okno: tylko opady). */
export interface WeatherScene {
  season: Season;
  weather: Weather;
  phase: DayPhase;
  area: Area;
  t: number;
  open: boolean;
}

export function weatherParticles(s: WeatherScene): Particle[] {
  const { area: a, t } = s;
  const out: Particle[] = [];
  const daylight = s.phase === 'day' || s.phase === 'morning';
  if (s.weather === 'rain' || s.weather === 'storm') out.push(...rain(a, t, s.weather === 'storm'));
  if (s.weather === 'snow') out.push(...snow(a, t));
  if (s.weather === 'frost') out.push(...frostFlakes(a, t));
  if (s.season === 'autumn' && (s.weather === 'sunny' || s.weather === 'cloudy')) out.push(...leaves(a, t));
  if (s.season === 'spring' && s.weather === 'sunny') out.push(...petals(a, t));
  if (s.open && s.season === 'summer' && s.weather === 'sunny' && daylight) out.push(...butterflies(a, t));
  if (s.open && s.season === 'summer' && s.phase === 'night' && (s.weather === 'sunny' || s.weather === 'cloudy')) {
    out.push(...fireflies(a, t));
  }
  return out;
}

/** Odcień pogody: na tło balkonu i na okna (pogodnie i przy mrozie bez zmian). */
export const WEATHER_TINT: Readonly<Record<Weather, string | null>> = {
  sunny: null,
  frost: null,
  cloudy: 'rgba(110, 118, 140, 0.22)',
  rain: 'rgba(60, 70, 100, 0.32)',
  storm: 'rgba(35, 38, 62, 0.42)',
  snow: 'rgba(190, 200, 225, 0.14)',
};
```

- [ ] **Step 4: Testy przechodzą**

Run: `npx vitest run tests/home/weatherFx.test.ts` oraz `npx tsc --noEmit -p .`
Expected: PASS, tsc bez błędów. Jeśli test „świetliki” albo „błyskawica” nie przejdzie, nie poluzowuj go na ślepo — sprawdź liczby wypisując je (`console.log`) i zgłoś (status DONE_WITH_CONCERNS).

- [ ] **Step 5: Commit**

```bash
git add src/home/weatherFx.ts tests/home/weatherFx.test.ts
git commit -m "Pory roku: drobinki pogody (deszcz, śnieg, liście, płatki, motyle, świetliki, błyskawice)"
```

---

### Task 5: Balkon z tłem pory roku i pogodą

**Files:**
- Create: `src/ui/home/balconyBackdrop.ts`
- Modify (cały plik): `src/pet/room.ts`
- Modify: `src/home/balconySky.ts` (usunięcie nieużywanych funkcji)
- Modify: `src/home/daytime.ts` (usunięcie `SKY`)
- Modify: `src/ui/home/roomRenderer.ts` (`RoomFrame`, `drawBackground`)
- Modify: `src/ui/home/inventoryPanel.ts:89-92`
- Modify: `src/ui/sound.ts` (efekt `thunder`)
- Modify: `src/ui/screens/room.ts` (pola klatki, wczytanie teł, grzmot)
- Modify: `tests/home/balconySky.test.ts`, `tests/home/daytime.test.ts`

- [ ] **Step 1: Wczytywanie teł** — utwórz `src/ui/home/balconyBackdrop.ts`:

```ts
import { backdropName, type BackdropTime, type Season } from '../../home/season';

/** Tła balkonu (public/backgrounds/*.png): wczytywane raz, leniwie. */
export const backdropUrl = (name: string): string => `${import.meta.env.BASE_URL}backgrounds/${name}.png`;

const images = new Map<string, HTMLImageElement>();

function image(name: string): HTMLImageElement {
  let img = images.get(name);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = backdropUrl(name);
    images.set(name, img);
  }
  return img;
}

/** Tło pory roku na dzień albo noc; null, dopóki się nie wczytało. */
export function backdropImage(season: Season, time: BackdropTime): HTMLImageElement | null {
  const img = image(backdropName(season, time));
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Zaczyna wczytywać oba tła pory roku (żeby balkon nie mignął pustym tłem). */
export function preloadBackdrops(season: Season): void {
  image(backdropName(season, 'day'));
  image(backdropName(season, 'night'));
}
```

- [ ] **Step 2: `src/pet/room.ts`** — zastąp całą zawartość:

```ts
import type { DayPhase } from '../home/daytime';
import { drawFloor, drawWallpaper, type LookDef } from '../home/looks';
import { METEOR_FLIGHT, birdsAt, meteorAt } from '../home/balconySky';
import type { Season, Weather } from '../home/season';
import { WEATHER_TINT, lightning, twinkles, weatherParticles, type Area, type Particle } from '../home/weatherFx';

/** Wymiary pokoju w pikselach logicznych; canvas skalowany CSS-em. */
export const ROOM_W = 128;
export const ROOM_H = 160;
export const FLOOR_Y = 128;
export const FEET_Y = 144;

/**
 * Zgaszone światło: nakładka na cały pokój (tło i przedmioty). Dobrana tak, by lawendowe paski i fioletowe deski
 * salonu wyglądały jak dawne kolory nocne (#4a3a72 / #3a2a58).
 */
export const NIGHT_TINT = 'rgba(30, 16, 72, 0.75)';

/**
 * Stałe tło pokoju (px logiczne): tapeta na ścianie i podłoga. Okna, półki, dywany, a także urodzinowa girlanda
 * i obrazek „26” w salonie to przedmioty rysowane osobno. Balkon ma namalowane tło — `drawBalcony`.
 */
export function drawRoomBase(ctx: CanvasRenderingContext2D, wallpaper: LookDef, floor: LookDef): void {
  drawWallpaper(ctx, wallpaper, ROOM_W, FLOOR_Y);
  drawFloor(ctx, floor, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
}

/** Na namalowane tło balkonu: rano lekko różowo, wieczorem ciepło. */
export const BALCONY_PHASE_TINT: Readonly<Record<DayPhase, string | null>> = {
  morning: 'rgba(255, 168, 150, 0.16)',
  day: null,
  evening: 'rgba(255, 130, 70, 0.14)',
  night: null,
};

/** Widok nad podłogą balkonu, pod daszkiem: tu padają opady i latają ptaki (pod daszkiem nie pada). */
export const BALCONY_SKY: Area = { x: 0, y: 9, w: ROOM_W, h: FLOOR_Y - 9 };

/** Co narysować na balkonie w tej klatce. */
export interface BalconyView {
  /** Tła pory roku (null — jeszcze się wczytują). */
  day: CanvasImageSource | null;
  night: CanvasImageSource | null;
  phase: DayPhase;
  /** 0 — dzień, 1 — noc; wieczorem nocne tło stopniowo przykrywa dzienne. */
  dusk: number;
  season: Season;
  weather: Weather;
  /** Zegar animacji (ms); przy ograniczonym ruchu stały — opady stoją. */
  t: number;
  /** Ograniczony ruch: bez błysków burzy, ptaków i spadających gwiazd. */
  calm: boolean;
}

/**
 * Balkon: namalowane tło pory roku (rano i w dzień dzienne, wieczorem przejście w nocne, w nocy nocne), odcień pory
 * dnia i pogody, błysk burzy, w pogodny dzień ptaki, w pogodną noc migoczące i spadające gwiazdy, a na wierzchu
 * opady i drobinki pory roku (liście, płatki, motyle, świetliki).
 */
export function drawBalcony(ctx: CanvasRenderingContext2D, v: BalconyView): void {
  ctx.fillStyle = '#2a1f3d';
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  if (v.dusk < 1 && v.day) ctx.drawImage(v.day, 0, 0, ROOM_W, ROOM_H);
  if (v.dusk > 0 && v.night) {
    ctx.save();
    ctx.globalAlpha = v.dusk;
    ctx.drawImage(v.night, 0, 0, ROOM_W, ROOM_H);
    ctx.restore();
  }
  const phaseTint = BALCONY_PHASE_TINT[v.phase];
  if (phaseTint) {
    ctx.fillStyle = phaseTint;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }
  const weatherTint = WEATHER_TINT[v.weather];
  if (weatherTint) {
    ctx.fillStyle = weatherTint;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }
  const flash = v.weather === 'storm' && !v.calm ? lightning(v.t) : 0;
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * flash})`;
    ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);
  }
  const clear = v.weather === 'sunny' || v.weather === 'frost';
  if (clear && !v.calm && (v.phase === 'day' || v.phase === 'morning')) drawBirds(ctx, v.phase, v.t);
  if (clear && v.phase === 'night') {
    drawParticles(ctx, twinkles(BALCONY_SKY, v.t));
    if (!v.calm) drawMeteor(ctx, v.t);
  }
  drawParticles(ctx, weatherParticles({ season: v.season, weather: v.weather, phase: v.phase, area: BALCONY_SKY, t: v.t, open: true }));
}

/** Drobinki jako prostokąciki w px logicznych. */
export function drawParticles(ctx: CanvasRenderingContext2D, ps: readonly Particle[]): void {
  for (const p of ps) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
  }
}

/** Ptaki: ciemne sylwetki „v” (skrzydła w górze) i „^” (w dole), machają na zmianę. */
function drawBirds(ctx: CanvasRenderingContext2D, phase: DayPhase, t: number): void {
  ctx.fillStyle = phase === 'evening' ? '#3a2350' : '#3d3358';
  for (const b of birdsAt(t, ROOM_W)) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    if (b.wings === 0) {
      ctx.fillRect(x - 2, y - 1, 1, 1);
      ctx.fillRect(x + 2, y - 1, 1, 1);
      ctx.fillRect(x - 1, y, 3, 1);
    } else {
      ctx.fillRect(x - 1, y - 1, 3, 1);
      ctx.fillRect(x - 2, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
    }
  }
}

/** Ogon spadającej gwiazdy: od głowy (biel) przez kremowy do złotego, coraz bledszy. */
const METEOR_TAIL = 12;

/** Spadająca gwiazda: świecąca głowa i długi, gasnący ogon; pojawia się i znika płynnie. */
function drawMeteor(ctx: CanvasRenderingContext2D, t: number): void {
  const m = meteorAt(t);
  if (!m) return;
  const len = Math.hypot(METEOR_FLIGHT.dx, METEOR_FLIGHT.dy);
  const ux = (m.dir * METEOR_FLIGHT.dx) / len;
  const uy = METEOR_FLIGHT.dy / len;
  // ogon rośnie na starcie, a pod koniec całość blednie
  const fade = Math.min(1, (1 - m.p) * 3);
  const tail = Math.max(2, Math.round(METEOR_TAIL * Math.min(1, m.p * 4)));
  const hx = Math.round(m.x);
  const hy = Math.round(m.y);
  ctx.save();
  for (let k = tail; k >= 1; k--) {
    ctx.globalAlpha = fade * (0.95 - (0.8 * k) / tail);
    ctx.fillStyle = k < 3 ? '#fffbe6' : k < 7 ? '#fff0b0' : '#ffd86a';
    ctx.fillRect(Math.round(m.x - ux * k), Math.round(m.y - uy * k), 1, 1);
  }
  // głowa z poświatą
  ctx.globalAlpha = fade * 0.45;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hx - 1, hy, 3, 1);
  ctx.fillRect(hx, hy - 1, 1, 3);
  ctx.globalAlpha = fade;
  ctx.fillRect(hx, hy, 1, 1);
  ctx.restore();
}
```

- [ ] **Step 3: `src/home/balconySky.ts`** — usuń funkcje rysowanego miasta i nieba, których już nic nie używa: `litShare`, `windowLit`, `starDimmed`, `CLOUDS`, `CLOUD_WRAP`, `cloudX` (z komentarzami nad nimi) oraz import `DayPhase`. Zostają: `skyHash`, `Meteor`, `METEOR_SLOT_MS`, `METEOR_MS`, `METEOR_CHANCE`, `METEOR_FLIGHT`, `meteorAt`, `Bird`, `BIRDS_SLOT_MS`, `BIRDS_MS`, `BIRDS_CHANCE`, `BIRDS_Y`, `birdsAt`. Komentarz na górze pliku zmień na:

```ts
/**
 * Życie nieba nad balkonem (czyste funkcje; rysuje `pet/room.ts`): w pogodny dzień przelatują klucze ptaków,
 * a w pogodną noc od czasu do czasu spadająca gwiazda. Wspólny „los” `skyHash` służy też drobinkom pogody.
 */
```

W `tests/home/balconySky.test.ts`: import zmień na
`import { BIRDS_MS, METEOR_MS, METEOR_SLOT_MS, birdsAt, meteorAt } from '../../src/home/balconySky';`
i usuń bloki `it(...)` o tytułach: „im później w nocy, tym mniej okien świeci…”, „okna gasną i zapalają się w czasie…”, „migocząca gwiazda przygasa tylko na chwilę”, „chmurki w dzień dryfują w prawo…”. Jeśli po usunięciu `at` (`const at = …`) nie jest już używane, usuń też tę stałą.

- [ ] **Step 4: `src/home/daytime.ts`** — usuń eksport `SKY` z komentarzem („Niebo nad balkonem…”). W `tests/home/daytime.test.ts` usuń `SKY` z importu i wiersz `for (const p of ['morning', 'day', 'evening', 'night'] as const) expect(SKY[p]).toHaveLength(2);`, a tytuł testu zmień na `'okna w dzień bez barwy, w pozostałych porach zabarwione'`.

- [ ] **Step 5: Renderer pokoju** — w `src/ui/home/roomRenderer.ts`:

Importy — zastąp wiersz importu z `../../pet/room`:

```ts
import { NIGHT_TINT, ROOM_H, ROOM_W, drawBalcony, drawRoomBase } from '../../pet/room';
```

i dodaj:

```ts
import type { Season, Weather } from '../../home/season';
import { backdropImage } from './balconyBackdrop';
```

W `interface RoomFrame` po polu `phase?: DayPhase;` dodaj:

```ts
  /** Pora roku i pogoda (balkon, okna); domyślnie jesień i pogodnie. */
  season?: Season;
  weather?: Weather;
  /** Zmierzch 0–1 (przejście tła balkonu dzień → noc); domyślnie z pory dnia. */
  dusk?: number;
  /** Ograniczony ruch (ustawienie telefonu): opady stoją, bez błysków. */
  calm?: boolean;
```

W `createRoomRenderer` usuń płótno `front` (`const front…`, `front.width…`, `front.height…`, `const frontCtx…` i komentarz nad nim) i zastąp całą funkcję `drawBackground`:

```ts
  function drawBackground(bg: CanvasRenderingContext2D, f: RoomFrame): void {
    const phase = f.phase ?? 'day';
    if (f.room === 'balcony') {
      // balkon: namalowane tło pory roku (wieczorem przejście w noc) i pogoda — co klatkę
      const season = f.season ?? 'autumn';
      const calm = f.calm ?? false;
      drawBalcony(bg, {
        day: backdropImage(season, 'day'),
        night: backdropImage(season, 'night'),
        phase,
        dusk: f.dusk ?? (phase === 'night' ? 1 : 0),
        season,
        weather: f.weather ?? 'sunny',
        t: calm ? 0 : f.t,
        calm,
      });
      if (f.night) {
        bg.fillStyle = NIGHT_TINT;
        bg.fillRect(0, 0, ROOM_W, ROOM_H);
      }
      return;
    }
    const key = `${f.room}|${f.looks.wallpaper}|${f.looks.floor}|${f.night}`;
    if (key !== baseKey) {
      baseKey = key;
      const wall = findLook(f.looks.wallpaper) ?? findLook(DEFAULT_LOOKS[f.room].wallpaper)!;
      const floor = findLook(f.looks.floor) ?? findLook(DEFAULT_LOOKS[f.room].floor)!;
      baseCtx.clearRect(0, 0, ROOM_W, ROOM_H);
      drawRoomBase(baseCtx, wall, floor);
      if (f.night) {
        baseCtx.fillStyle = NIGHT_TINT;
        baseCtx.fillRect(0, 0, ROOM_W, ROOM_H);
      }
    }
    bg.drawImage(base, 0, 0);
  }
```

Usuń nieużywany już import `gameClock` z `../../home/clock` tylko wtedy, gdy nic innego w pliku go nie używa (`drawClockHands` używa — zostaje).

- [ ] **Step 6: Panel urządzania** — w `src/ui/home/inventoryPanel.ts` zastąp:

```ts
    // balkon nie ma tapety (niebo z pory dnia) — bez zakładki „Tapeta”
    const noWall = room === 'balcony';
    tabs[1].hidden = noWall;
    if (noWall && tab === 'wallpaper') tab = 'inventory';
```

na:

```ts
    // balkon ma namalowane tło pory roku (z podłogą) — bez zakładek „Tapeta” i „Podłoga”
    const noLooks = room === 'balcony';
    tabs[1].hidden = noLooks;
    tabs[2].hidden = noLooks;
    if (noLooks && tab !== 'inventory') tab = 'inventory';
```

- [ ] **Step 7: Grzmot** — w `src/ui/sound.ts` dopisz do typu `Sfx` (w ostatnim wierszu unii, przed średnikiem) `| 'thunder'` z komentarzem nad wierszem `// pogoda: grzmot przy błyskawicy`, a w `switch` funkcji `play` przed `case 'record':` dodaj:

```ts
    case 'thunder':
      noise(1.4, 0.55, 0, 180, 'lowpass');
      return tone('triangle', 70, 40, 1.1, 0.35, 0.05);
```

Jeśli `play` ma `default` albo wyczerpujące sprawdzenie typu, dopasuj się do istniejącego wzoru.

- [ ] **Step 8: Ekran pokoju** — w `src/ui/screens/room.ts`:

Importy — rozszerz import z `../../home/daytime` o `eveningProgress` i dodaj:

```ts
import { seasonNow, weatherNow } from '../../home/season';
import { flashSlot } from '../../home/weatherFx';
import { preloadBackdrops } from '../home/balconyBackdrop';
import { reducedMotion } from '../transition';
```

(jeśli `reducedMotion` jest już importowane — nie dubluj).

Przy pozostałych `preloadItems(...)` (ok. wiersza 310) dodaj:

```ts
  preloadBackdrops(seasonNow(gameClock()));
  /** Ograniczony ruch (ustawienie telefonu): opady na balkonie i w oknach stoją, bez błysków i grzmotów. */
  const calm = reducedMotion();
  /** Ostatnia błyskawica z grzmotem (numer okna czasu) — grzmot raz na błysk. */
  let lastThunder: number | null = null;
```

W funkcji klatki, tuż przed `const f: RoomFrame = {`, dodaj `const clock = gameClock();`, a w obiekcie `f` zastąp `phase: dayPhase(gameClock()),` przez:

```ts
      phase: dayPhase(clock),
      season: seasonNow(clock),
      weather: weatherNow(clock),
      dusk: eveningProgress(clock),
      calm,
```

Zaraz po zamknięciu obiektu `f` (przed pierwszym użyciem `f`) dodaj:

```ts
    // burza na balkonie: grzmot przy każdym błysku
    if (viewRoom === 'balcony' && f.weather === 'storm' && !calm) {
      const slot = flashSlot(t);
      if (slot !== null && slot !== lastThunder) {
        lastThunder = slot;
        play('thunder');
      }
    }
```

- [ ] **Step 9: Typy, testy, build**

Run: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`
Expected: bez błędów; wszystkie testy PASS. Typowe poprawki: pozostałe importy `SKY`, `drawBalconyBack/Live/Front`, `CLOUDS`, `litShare`, `windowLit`, `starDimmed`, `cloudX` w innych plikach (sprawdź `git grep`), parametr `phase` w wywołaniach `drawRoomBase`.

- [ ] **Step 10: Commit**

```bash
git add -A src/pet/room.ts src/home/balconySky.ts src/home/daytime.ts src/ui/home/balconyBackdrop.ts src/ui/home/roomRenderer.ts src/ui/home/inventoryPanel.ts src/ui/sound.ts src/ui/screens/room.ts tests/home/balconySky.test.ts tests/home/daytime.test.ts
git commit -m "Pory roku: balkon z tłem pory roku, przejściem w noc i pogodą (deszcz, śnieg, burza z grzmotem)"
```

---

### Task 6: Opady w oknach pokoi

**Files:**
- Create: `src/home/glass.ts`
- Create: `tests/home/glass.test.ts`
- Create: `src/ui/home/windowWeather.ts`
- Modify: `src/ui/home/scene.ts` (`itemTints`)
- Modify: `src/ui/home/roomRenderer.ts` (`drawItem`, `drawItems`)
- Modify: `tests/ui/homeScene.test.ts`

Reguła szyby sprawdzona na wszystkich 26 oknach w katalogu (jasne i ciemne szyby, bez obrysów i ramek; wyjątki: zamknięta okiennica, witraże, teleskop).

- [ ] **Step 1: Test maski** — utwórz `tests/home/glass.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GLASS_MIN_SHARE, NO_GLASS, glassMask, isGlassColour } from '../../src/home/glass';

type Px = readonly [number, number, number, number];
const OUTLINE: Px = [42, 31, 61, 255];
const WOOD: Px = [120, 80, 50, 255];
const SKY: Px = [150, 200, 240, 255];

function image(w: number, h: number, paint: (x: number, y: number) => Px): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(paint(x, y), (y * w + x) * 4);
  return data;
}

describe('szyba okna', () => {
  it('kolory szyby: jasne niebo i ciemna nocna szyba tak; drewno, biel, czerwień nie', () => {
    expect(isGlassColour(150, 200, 240)).toBe(true);
    expect(isGlassColour(40, 50, 90)).toBe(true);
    expect(isGlassColour(120, 80, 50)).toBe(false);
    expect(isGlassColour(255, 255, 255)).toBe(false);
    expect(isGlassColour(200, 40, 50)).toBe(false);
  });

  it('okno 10×10: obrys, rama i szyba 6×6 — maska to szyba bez narożników, obrys odpada', () => {
    const w = 10;
    const data = image(w, w, (x, y) => {
      if (x === 0 || y === 0 || x === 9 || y === 9) return OUTLINE;
      if (x === 1 || y === 1 || x === 8 || y === 8) return WOOD;
      return SKY;
    });
    const m = glassMask(data, w, w)!;
    expect(m).not.toBeNull();
    const at = (x: number, y: number) => m[y * w + x];
    expect(m.reduce((a, v) => a + v, 0)).toBe(32);
    expect(at(0, 0)).toBe(0);
    expect(at(5, 0)).toBe(0);
    expect(at(1, 5)).toBe(0);
    expect(at(2, 2)).toBe(0);
    expect(at(2, 4)).toBe(1);
    expect(at(5, 5)).toBe(1);
  });

  it('bez szyby albo z maleńką szybą — null; samotna linia w kolorze szyby to nie szyba', () => {
    expect(glassMask(image(10, 10, () => WOOD), 10, 10)).toBeNull();
    expect(glassMask(image(20, 20, (x, y) => (x >= 9 && x <= 10 && y >= 9 && y <= 10 ? SKY : WOOD)), 20, 20)).toBeNull();
    expect(glassMask(image(20, 20, (x) => (x === 10 ? OUTLINE : WOOD)), 20, 20)).toBeNull();
  });

  it('próg udziału i wyjątki', () => {
    expect(GLASS_MIN_SHARE).toBeGreaterThan(0);
    for (const id of ['window_shutter', 'window_rose_2', 'window_rose_3', 'window_gothic_stained', 'telescope']) {
      expect(NO_GLASS.has(id), id).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/glass.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: Moduł maski** — utwórz `src/home/glass.ts`:

```ts
/**
 * Szyba w sprite'cie okna (czyste funkcje): piksele w kolorach nieba — jasnoniebieskie w dzień albo ciemnogranatowe
 * nocą — po otwarciu morfologicznym (erozja i dylatacja w obrębie kandydatów), żeby odpadły 1-pikselowe obrysy
 * i drobiazgi. Na szybie rysujemy opady (`ui/home/windowWeather.ts`); nowe okna działają same.
 */

/** Okna bez przezroczystej szyby (zamknięta okiennica, witraże) i przedmioty „okienne”, które nie są oknem. */
export const NO_GLASS: ReadonlySet<string> = new Set(['window_shutter', 'window_rose_2', 'window_rose_3', 'window_gothic_stained', 'telescope']);

/** Szyba musi zajmować co najmniej taką część nieprzezroczystych pikseli (inaczej to tylko niebieskie drobiazgi). */
export const GLASS_MIN_SHARE = 0.08;

/** Kolor szyby: jasne niebo albo ciemna nocna szyba (niebieski przeważa nad czerwonym i zielonym). */
export function isGlassColour(r: number, g: number, b: number): boolean {
  const light = b > r + 25 && b > 150 && g > r;
  const dark = b >= r + 12 && b >= g && b <= 150 && b >= 40;
  return light || dark;
}

/** Maska szyby (1 — szyba) dla pikseli RGBA `w`×`h`, albo null, gdy szyby brak lub jest za mała. */
export function glassMask(rgba: ArrayLike<number>, w: number, h: number): Uint8Array | null {
  const cand = new Uint8Array(w * h);
  let opaque = 0;
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] === 0) continue;
    opaque++;
    if (isGlassColour(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])) cand[i] = 1;
  }
  // erozja (4-sąsiedztwo; brzegi obrazka odpadają)
  const core = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (cand[i] && cand[i - 1] && cand[i + 1] && cand[i - w] && cand[i + w]) core[i] = 1;
    }
  }
  // dylatacja w obrębie kandydatów
  const out = new Uint8Array(w * h);
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!cand[i]) continue;
      if (core[i] || (x > 0 && core[i - 1]) || (x < w - 1 && core[i + 1]) || (y > 0 && core[i - w]) || (y < h - 1 && core[i + w])) {
        out[i] = 1;
        n++;
      }
    }
  }
  return opaque > 0 && n / opaque >= GLASS_MIN_SHARE ? out : null;
}
```

- [ ] **Step 4: Testy maski przechodzą**

Run: `npx vitest run tests/home/glass.test.ts`
Expected: PASS.

- [ ] **Step 5: Odcień pogody okien** — w `src/ui/home/scene.ts`:

dodaj importy:

```ts
import type { Weather } from '../../home/season';
import { WEATHER_TINT } from '../../home/weatherFx';
```

i zmień `itemTints`:

```ts
/** Nakładki koloru dla przedmiotu (kolejno, `source-atop`); pusta lista = oryginalny sprite. */
export function itemTints(def: ItemDef, item: PlacedItem, night: boolean, now: number, phase: DayPhase = 'day', weather: Weather = 'sunny'): string[] {
  const tints: string[] = [];
  if (plantState(item, now) === 'wilted') tints.push(WILTED_TINT);
  if (night && !(def.interaction === 'lamp' && item.lampOn)) {
    tints.push(NIGHT_TINT);
    if (def.interaction === 'window') tints.push(WINDOW_NIGHT_TINT);
  } else if (!night && def.interaction === 'window') {
    // za oknem pora dnia (różowy poranek, pomarańczowy wieczór, ciemna noc) i pogoda (szaro, deszczowo, burza)
    const t = WINDOW_PHASE_TINT[phase];
    if (t) tints.push(t);
    const w = WEATHER_TINT[weather];
    if (w) tints.push(w);
  }
  return tints;
}
```

W `tests/ui/homeScene.test.ts` dopisz w tym samym `describe`, w którym są asercje `itemTints` (dopisz import `WEATHER_TINT` z `../../src/home/weatherFx`):

```ts
  it('okno: odcień pogody w dzień, przy zgaszonym świetle tylko noc', () => {
    const w = itemById('window_flower');
    expect(itemTints(w, item('window_flower', 24, 48), false, T0, 'day', 'rain')).toEqual([WEATHER_TINT.rain]);
    expect(itemTints(w, item('window_flower', 24, 48), false, T0, 'day', 'sunny')).toEqual([]);
    expect(itemTints(w, item('window_flower', 24, 48), true, T0, 'day', 'rain')).toEqual([NIGHT_TINT, WINDOW_NIGHT_TINT]);
  });
```

(`itemById`, `item`, `T0`, `NIGHT_TINT`, `WINDOW_NIGHT_TINT` są już w tym pliku — użyj ich nazw z pliku; jeśli funkcje pomocnicze nazywają się inaczej, dopasuj.)

- [ ] **Step 6: Rysowanie na szybie** — utwórz `src/ui/home/windowWeather.ts`:

```ts
import type { PlacedItem } from '../../core/types';
import type { ItemDef } from '../../home/catalog';
import type { DayPhase } from '../../home/daytime';
import { NO_GLASS, glassMask } from '../../home/glass';
import type { Season, Weather } from '../../home/season';
import { lightning, weatherParticles } from '../../home/weatherFx';
import { drawSprite } from '../pixelStage';
import { itemSource } from './itemSprites';
import { itemAnchor, itemFrameAnchor } from './scene';

/** Pola klatki pokoju potrzebne do pogody w oknach (podzbiór `RoomFrame`). */
export interface WindowWeatherFrame {
  season?: Season;
  weather?: Weather;
  phase?: DayPhase;
  t: number;
  /** Zgaszone światło — opady przygaszone. */
  night: boolean;
  calm?: boolean;
}

/** Maska szyby dla sprite'a (null — bez szyby); liczona raz. */
const masks = new Map<string, HTMLCanvasElement | null>();
/** Płótno robocze opadów na rozmiar sprite'a. */
const layers = new Map<string, HTMLCanvasElement>();

function maskFor(sprite: string, img: HTMLImageElement): HTMLCanvasElement | null {
  if (masks.has(sprite)) return masks.get(sprite)!;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h);
  const m = glassMask(px.data, w, h);
  if (!m) {
    masks.set(sprite, null);
    return null;
  }
  for (let i = 0; i < w * h; i++) {
    px.data[i * 4] = 255;
    px.data[i * 4 + 1] = 255;
    px.data[i * 4 + 2] = 255;
    px.data[i * 4 + 3] = m[i] ? 255 : 0;
  }
  ctx.putImageData(px, 0, 0);
  masks.set(sprite, c);
  return c;
}

function layerFor(w: number, h: number): HTMLCanvasElement {
  const key = `${w}x${h}`;
  let c = layers.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    layers.set(key, c);
  }
  return c;
}

/**
 * Opady (śnieg, deszcz, liście, płatki) i błysk burzy na szybie okna `it`, narysowanego klatką `sprite`
 * (zwykły sprite albo klatka stanu, np. nocna). Drobinki w px natywnych sprite'a, przycięte do maski szyby
 * i narysowane tą samą kotwicą co okno — także odbite.
 */
export function drawWindowWeather(ctx: CanvasRenderingContext2D, k: number, it: PlacedItem, def: ItemDef, sprite: string, f: WindowWeatherFrame): void {
  if (NO_GLASS.has(def.id)) return;
  const img = itemSource(sprite);
  if (!(img instanceof HTMLImageElement)) return;
  const mask = maskFor(sprite, img);
  if (!mask) return;
  const calm = f.calm ?? false;
  const t = calm ? 0 : f.t;
  const weather = f.weather ?? 'sunny';
  const ps = weatherParticles({
    season: f.season ?? 'autumn',
    weather,
    phase: f.phase ?? 'day',
    area: { x: 0, y: 0, w: mask.width, h: mask.height },
    t,
    open: false,
  });
  const flash = weather === 'storm' && !calm ? lightning(t) : 0;
  if (ps.length === 0 && flash === 0) return;
  const layer = layerFor(mask.width, mask.height);
  const lc = layer.getContext('2d')!;
  lc.clearRect(0, 0, layer.width, layer.height);
  for (const p of ps) {
    lc.fillStyle = p.color;
    lc.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
  }
  if (flash > 0) {
    lc.fillStyle = `rgba(255, 255, 255, ${0.5 * flash})`;
    lc.fillRect(0, 0, layer.width, layer.height);
  }
  lc.globalCompositeOperation = 'destination-in';
  lc.drawImage(mask, 0, 0);
  lc.globalCompositeOperation = 'source-over';
  const a = sprite === def.sprite ? itemAnchor(it, def) : itemFrameAnchor(it, def, sprite);
  ctx.save();
  if (f.night) ctx.globalAlpha = 0.45;
  drawSprite(ctx, k, layer, a.meta, { x: a.x, feetY: a.feetY, flip: it.flip, bob: 0, squash: 0, jump: 0 });
  ctx.restore();
}
```

- [ ] **Step 7: Renderer** — w `src/ui/home/roomRenderer.ts`:

dodaj import `import { drawWindowWeather } from './windowWeather';`.

`drawItem` ma zwracać nazwę narysowanej klatki (albo null). Zmień sygnaturę na `function drawItem(ctx: CanvasRenderingContext2D, k: number, it: PlacedItem, f: RoomFrame): string | null` i w środku:
- `if (!def) return;` → `if (!def) return null;`
- wiersz z `itemTints(...)` zmień na `const tints = itemTints(def, it, f.night, f.now, phase, f.weather ?? 'sunny').filter((t) => !nightFrame || (t !== WINDOW_NIGHT_TINT && t !== WINDOW_PHASE_TINT.night));`
- w gałęzi klatki stanu po `drawSprite(...)` zamiast `return;` daj `return state;`
- `if (!src) return;` → `if (!src) return null;`
- na końcu funkcji, po ostatnim `drawSprite(...)`, dodaj `return def.sprite;`

W `drawItems` zastąp `drawItem(ctx, k, e, f);` na:

```ts
        const sprite = drawItem(ctx, k, e, f);
        const def = findItem(e.itemId);
        // na szybie okna: śnieg, deszcz, liście, płatki (tuż nad oknem, pod tym, co przed nim stoi)
        if (sprite && def?.interaction === 'window') drawWindowWeather(ctx, k, e, def, sprite, f);
```

- [ ] **Step 8: Typy, testy, build**

Run: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`
Expected: bez błędów, wszystkie testy PASS.

- [ ] **Step 9: Commit**

```bash
git add src/home/glass.ts tests/home/glass.test.ts src/ui/home/windowWeather.ts src/ui/home/scene.ts src/ui/home/roomRenderer.ts tests/ui/homeScene.test.ts
git commit -m "Pory roku: opady na szybach okien (wykrywanie szyby) i odcień pogody okien"
```

---

### Task 7: Ikonka pogody przy zegarze

**Files:**
- Modify: `src/art/icons.ts` (5 ikonek)
- Modify: `src/home/clock.ts` (`clockNow`, `WEATHER_ICON`)
- Modify: `src/ui/screens/room.ts` (pasek z zegarem, ok. wierszy 266–295)
- Modify: `tests/home/clock.test.ts`

- [ ] **Step 1: Test** — dopisz na końcu `tests/home/clock.test.ts` (import `WEATHER_ICON` dopisz do importu z `../../src/home/clock`, a `ICONS` z `../../src/art/icons`):

```ts
describe('pogoda przy zegarze', () => {
  it('clockNow podaje porę roku i pogodę; ikonka dla każdej pogody poza pogodną (wtedy jest słońce/księżyc pory dnia)', () => {
    const c = clockNow(new Date(2026, 9, 19, 12, 0));
    expect(c.season).toBe('autumn');
    expect(['sunny', 'cloudy', 'rain']).toContain(c.weather);
    expect(WEATHER_ICON.sunny).toBeNull();
    for (const w of ['cloudy', 'rain', 'storm', 'snow', 'frost'] as const) {
      const name = WEATHER_ICON[w];
      expect(name, w).not.toBeNull();
      expect(ICONS[name!], w).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/home/clock.test.ts`
Expected: FAIL — brak `WEATHER_ICON`, `c.season`.

- [ ] **Step 3: Ikonki** — w `src/art/icons.ts` dopisz po ikonce `sunset` (przed `shopbag`):

```ts
  // pogoda (pasek z zegarem)
  weather_cloud: [
    '............',
    '............',
    '.....kkk....',
    '....kwwwk...',
    '..kkkwwwwk..',
    '.kwwwwwwwwk.',
    'kwwwwwwwwwwk',
    'kggwwwwwwwgk',
    '.kggggggggk.',
    '..kkkkkkkk..',
    '............',
    '............',
  ],
  weather_rain: [
    '.....kkk....',
    '....kwwwk...',
    '..kkkwwwwk..',
    '.kwwwwwwwwk.',
    'kwwwwwwwwwwk',
    'kggwwwwwwwgk',
    '.kggggggggk.',
    '..kkkkkkkk..',
    '..u...u...u.',
    '.u...u...u..',
    '...u...u....',
    '..u...u.....',
  ],
  weather_storm: [
    '.....kkk....',
    '....kgggk...',
    '..kkkggggk..',
    '.kggggggggk.',
    'kggggggggggk',
    'kPPggggggPPk',
    '.kPPPPPPPPk.',
    '..kkkykkkk..',
    '.....yy.....',
    '....yy......',
    '.....y......',
    '....y.......',
  ],
  weather_snow: [
    '.....kk.....',
    '..k..ww..k..',
    '...kwwwwk...',
    '....kwwk....',
    '.k..kwwk..k.',
    'kwwwwuuwwwwk',
    'kwwwwuuwwwwk',
    '.k..kwwk..k.',
    '....kwwk....',
    '...kwwwwk...',
    '..k..ww..k..',
    '.....kk.....',
  ],
  weather_frost: [
    '.....kk.....',
    '..k..uu..k..',
    '...kuuuuk...',
    '....kuuk....',
    '.k..kuuk..k.',
    'kuuuuwwuuuuk',
    'kuuuuwwuuuuk',
    '.k..kuuk..k.',
    '....kuuk....',
    '...kuuuuk...',
    '..k..uu..k..',
    '.....kk.....',
  ],
```

- [ ] **Step 4: Zegar** — w `src/home/clock.ts`:

dodaj import:

```ts
import { seasonNow, weatherNow, type Season, type Weather } from './season';
```

dopisz po `PHASE_ICON`:

```ts
/** Ikonka pogody na pasku (pogodnie — bez ikonki: słońce/księżyc pokazuje już pora dnia). */
export const WEATHER_ICON: Readonly<Record<Weather, 'weather_cloud' | 'weather_rain' | 'weather_storm' | 'weather_snow' | 'weather_frost' | null>> = {
  sunny: null,
  cloudy: 'weather_cloud',
  rain: 'weather_rain',
  storm: 'weather_storm',
  snow: 'weather_snow',
  frost: 'weather_frost',
};
```

i zastąp `clockNow`:

```ts
/** Godzina, pora dnia, pora roku i pogoda naraz (pasek, kwestia Gabi). */
export function clockNow(d: Date): { text: string; phase: DayPhase; season: Season; weather: Weather } {
  return { text: clockText(d), phase: dayPhase(d), season: seasonNow(d), weather: weatherNow(d) };
}
```

- [ ] **Step 5: Test przechodzi**

Run: `npx vitest run tests/home/clock.test.ts tests/art/icons.test.ts`
Expected: PASS (ikonki: prostokątne siatki ze znanymi kolorami).

- [ ] **Step 6: Pasek w pokoju** — w `src/ui/screens/room.ts`:

dodaj import `import { SEASON_NAMES, WEATHER_NAMES, type Weather } from '../../home/season';` (jeśli z Task 5 jest już import z `../../home/season`, rozszerz go) i do importu z `../../home/clock` dodaj `WEATHER_ICON`.

Zastąp blok zegarka (od `const clockIcon = h('span', { class: 'clock-icon' });` do końca funkcji `syncClock`):

```ts
  const clockIcon = h('span', { class: 'clock-icon' });
  const weatherIcon = h('span', { class: 'clock-icon' });
  const clockTime = h('span', { class: 'clock-time' });
  const clockPill = h(
    'button',
    {
      class: 'clock-pill px-box',
      onclick: () => {
        const c = clockNow(gameClock());
        play('tap');
        app.toast(`${PHASE_NAMES[c.phase]} · ${c.text} · ${SEASON_NAMES[c.season]}, ${WEATHER_NAMES[c.weather]}`);
      },
    },
    clockIcon,
    weatherIcon,
    clockTime,
  );
  let shownClock = '';
  let shownPhase: DayPhase | null = null;
  let shownWeather: Weather | null = null;
  function syncClock(): void {
    const c = clockNow(gameClock());
    if (c.text !== shownClock || c.weather !== shownWeather) {
      clockPill.setAttribute(
        'aria-label',
        `Godzina ${c.text}, ${PHASE_NAMES[c.phase].toLowerCase()}, ${SEASON_NAMES[c.season].toLowerCase()}, ${WEATHER_NAMES[c.weather]}`,
      );
    }
    if (c.text !== shownClock) {
      shownClock = c.text;
      clockTime.textContent = c.text;
    }
    if (c.phase !== shownPhase) {
      shownPhase = c.phase;
      clockIcon.replaceChildren(icon(PHASE_ICON[c.phase], 2));
    }
    if (c.weather !== shownWeather) {
      shownWeather = c.weather;
      const name = WEATHER_ICON[c.weather];
      weatherIcon.replaceChildren(...(name ? [icon(name, 2)] : []));
      weatherIcon.hidden = name === null;
    }
  }
```

(Jeśli w oryginale po tym bloku jest coś jeszcze w `syncClock` — zachowaj to.)

- [ ] **Step 7: Typy, testy, build**

Run: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`
Expected: bez błędów, wszystkie testy PASS.

- [ ] **Step 8: Commit**

```bash
git add src/art/icons.ts src/home/clock.ts src/ui/screens/room.ts tests/home/clock.test.ts
git commit -m "Pory roku: ikonka pogody przy zegarze, w dymku pora roku i pogoda"
```

---

### Task 8: Kwestie o porze roku, pogodzie i kotku

**Files:**
- Modify: `src/content.ts` (`seasonLines`)
- Modify: `src/pet/speech.ts` (`worldLine`, `windowLine`, `greetingLine`, `pickLine`)
- Modify: `src/ui/screens/room.ts` (okno, pogawędki, powitanie)
- Modify: `tests/pet/speech.test.ts`

- [ ] **Step 1: Testy** — dopisz na końcu `tests/pet/speech.test.ts` (import uzupełnij o `greetingLine, windowLine, worldLine, SEASON_LINE_CHANCE`):

```ts
describe('kwestie o porze roku i pogodzie', () => {
  const L = content.seasonLines;

  it('jesienią jest pumpkin spice latte; kwestie o kotku mają {kot}', () => {
    expect(L.season.autumn.some((l) => l.includes('pumpkin spice latte'))).toBe(true);
    for (const pool of [...Object.values(L.catWeather), ...Object.values(L.catSeason)]) {
      for (const l of pool ?? []) expect(l).toContain('{kot}');
    }
  });

  it('worldLine: z pory roku, pogody albo o kotku w tej pogodzie/porze roku', () => {
    const allowed = [...L.season.winter, ...L.weather.snow, ...(L.catWeather.snow ?? []), ...(L.catSeason.winter ?? [])];
    for (let i = 0; i < 20; i++) expect(allowed).toContain(worldLine({ season: 'winter', weather: 'snow' }, () => i / 20));
  });

  it('przy oknie: w deszcz nigdy „Ładna pogoda!”; pogodnie — zwykłe; nocą gwiazdy, a w śnieg — śnieg', () => {
    for (let i = 0; i < 20; i++) {
      const r = () => i / 20;
      expect(windowLine('rain', false, r)).not.toBe('Ładna pogoda!');
      expect(L.weather.rain).toContain(windowLine('rain', false, r));
      expect(content.lines.window).toContain(windowLine('sunny', false, r));
      expect(content.lines.windowNight).toContain(windowLine('rain', true, r));
      expect(L.weather.snow).toContain(windowLine('snow', true, r));
    }
  });

  it('powitanie: czasem o pogodzie, zwykle „Cześć!”', () => {
    expect(L.weather.storm).toContain(greetingLine('storm', () => 0));
    expect(content.lines.greeting).toContain(greetingLine('storm', () => 0.99));
  });

  it('pogawędka: przy dobrych potrzebach czasem o porze roku; głód dalej wygrywa', () => {
    const world = { season: 'summer', weather: 'sunny' } as const;
    const ok = { hunger: 90, mood: 90, energy: 90 };
    const pool = [...L.season.summer, ...L.weather.sunny, ...(L.catWeather.sunny ?? []), ...(L.catSeason.summer ?? [])];
    expect(pool).toContain(pickLine(ok, () => 0, world));
    expect(content.lines.hungry).toContain(pickLine({ hunger: 10, mood: 90, energy: 90 }, () => 0, world));
    expect(SEASON_LINE_CHANCE).toBeGreaterThan(0.2);
    expect(SEASON_LINE_CHANCE).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: Uruchom — ma się nie udać**

Run: `npx vitest run tests/pet/speech.test.ts`
Expected: FAIL — brak `seasonLines` i funkcji.

- [ ] **Step 3: Kwestie** — w `src/content.ts` na górze pliku dodaj:

```ts
import type { Season, Weather } from './home/season';

/** Kwestie o porze roku, pogodzie i o kotku w tej pogodzie/porze (`{kot}` — imię kota). */
const seasonLines: {
  season: Readonly<Record<Season, readonly string[]>>;
  weather: Readonly<Record<Weather, readonly string[]>>;
  catWeather: Readonly<Partial<Record<Weather, readonly string[]>>>;
  catSeason: Readonly<Partial<Record<Season, readonly string[]>>>;
} = {
  season: {
    spring: ['Wiosna! Wszystko kwitnie!', 'Pachnie wiosną!', 'Czas na nowe kwiatki na balkonie.'],
    summer: ['Ale upał!', 'Lody by się przydały…', 'Lato, wakacje, KitKat w lodówce!'],
    autumn: [
      'Jestem jesieniarą!',
      'Czas na herbatkę i kocyk.',
      'Czas na pumpkin spice latte!',
      'Pumpkin spice latte, poproszę!',
      'Liście są takie kolorowe!',
    ],
    winter: ['Brr, zimno!', 'Kakao i kocyk — idealnie.', 'Ulepimy bałwanka?'],
  },
  weather: {
    sunny: ['Ładna pogoda!', 'Ale słoneczko!'],
    cloudy: ['Szaro dziś…', 'Chmurki zasłoniły słońce.'],
    rain: ['Pada i pada…', 'Kap, kap, kap…', 'Dobrze, że jestem w domu.'],
    storm: ['Aaa! Grzmi!', 'Ale błyska!'],
    snow: ['Śnieg! Wszystko białe!', 'Pada śnieg!'],
    frost: ['Mróz szczypie w nos!', 'Szron na szybach!'],
  },
  catWeather: {
    snow: ['{kot} chce łapać płatki za szybą!'],
    rain: ['{kot} patrzy na krople na szybie.'],
    storm: ['{kot} chowa się pod łóżkiem!'],
  },
  catSeason: {
    spring: ['{kot} kicha od kwiatków!'],
    summer: ['{kot} wygrzewa się w słoneczku.'],
    autumn: ['{kot} poluje na liście!'],
  },
};
```

i w obiekcie `content` (np. zaraz po `foodLines`) dodaj pole `seasonLines,`.

- [ ] **Step 4: Wybór kwestii** — w `src/pet/speech.ts`:

dodaj import `import type { Season, Weather } from '../home/season';` i zastąp `pickLine` oraz dopisz nowe funkcje:

```ts
/** Pora roku i pogoda (do kwestii). */
export interface World {
  season: Season;
  weather: Weather;
}

/** Jak często (gdy niczego nie brakuje) pogawędka jest o porze roku, pogodzie albo o kotku w tej pogodzie. */
export const SEASON_LINE_CHANCE = 1 / 3;
/** Jak często powitanie jest o pogodzie zamiast „Cześć!”. */
export const WEATHER_GREETING_CHANCE = 0.4;

/** Kwestia o porze roku, pogodzie albo o kotku (z `{kot}` — do podstawienia imienia). */
export function worldLine(w: World, rng: () => number = Math.random): string {
  const L = content.seasonLines;
  return pick([...L.season[w.season], ...L.weather[w.weather], ...(L.catWeather[w.weather] ?? []), ...(L.catSeason[w.season] ?? [])], rng);
}

/** Przy oknie: w dzień o pogodzie (pogodnie — zwykłe kwestie okna), nocą gwiazdy, a w śnieg — o śniegu. */
export function windowLine(weather: Weather, night: boolean, rng: () => number = Math.random): string {
  if (night) return pick(weather === 'snow' ? content.seasonLines.weather.snow : content.lines.windowNight, rng);
  return pick(weather === 'sunny' ? content.lines.window : content.seasonLines.weather[weather], rng);
}

/** Powitanie po otwarciu gry: czasem o pogodzie, zwykle „Cześć!”. */
export function greetingLine(weather: Weather, rng: () => number = Math.random): string {
  return rng() < WEATHER_GREETING_CHANCE ? pick(content.seasonLines.weather[weather], rng) : pick(content.lines.greeting, rng);
}

/**
 * Kwestia zależna od potrzeb: głód > senność > nuda > zadowolenie; przy zadowoleniu czasem o porze roku i pogodzie
 * (gdy podano `world`), a czasem losowy tekst.
 */
export function pickLine(needs: Needs, rng: () => number = Math.random, world?: World): string {
  const st = needStatus(needs);
  if (st.hungry) return pick(content.lines.hungry, rng);
  if (st.sleepy) return pick(content.lines.sleepy, rng);
  if (st.bored) return pick(content.lines.bored, rng);
  if (world && rng() < SEASON_LINE_CHANCE) return worldLine(world, rng);
  return pick(rng() < RANDOM_LINE_CHANCE ? content.lines.random : content.lines.happy, rng);
}
```

- [ ] **Step 5: Testy przechodzą**

Run: `npx vitest run tests/pet/speech.test.ts`
Expected: PASS (stare testy `pickLine` bez `world` — bez zmian).

- [ ] **Step 6: Ekran pokoju** — w `src/ui/screens/room.ts`:

do importu z `../../pet/speech` (albo tam, skąd plik bierze `pick`/`pickLine`) dodaj `greetingLine, windowLine`; upewnij się, że `seasonNow`, `weatherNow` są importowane z `../../home/season` (Task 5).

W `interactionLine` zastąp wiersz okna:

```ts
    if (key === 'window') {
      const d = gameClock(now);
      return withCat(windowLine(weatherNow(d), isNightHour(d)));
    }
```

W pogawędce zastąp `} else say(pickLine(s.needs));` na:

```ts
        } else {
          const d = gameClock();
          say(withCat(pickLine(s.needs, Math.random, { season: seasonNow(d), weather: weatherNow(d) })));
        }
```

W powitaniu zastąp `say(pick(content.lines.greeting), 2400);` na `say(greetingLine(weatherNow(gameClock())), 2400);`.

- [ ] **Step 7: Typy, testy, build**

Run: `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`
Expected: bez błędów, wszystkie testy PASS (sprawdź też testy treści, np. czy któryś test przegląda wszystkie pola `content` — nowe pole `seasonLines` ma dobre typy).

- [ ] **Step 8: Commit**

```bash
git add src/content.ts src/pet/speech.ts src/ui/screens/room.ts tests/pet/speech.test.ts
git commit -m "Pory roku: kwestie Gabi o porze roku, pogodzie i o kotku (okno, pogawędki, powitanie)"
```

---

### Task 9: Sprawdzenie w przeglądarce, pokaz animacji, „Co nowego?”, notatki (kontroler)

**Files:**
- Modify: `src/core/changelog.ts` (`RELEASES` wersja 3)
- Modify: `docs/NASTEPNA-SESJA.md`

- [ ] **Step 1: „Co nowego?”** — w `src/core/changelog.ts` dopisz na górze `RELEASES` (data = dzień wydania; poniżej data planu):

```ts
  {
    version: 3,
    date: '2026-10-19',
    changes: [
      'Pory roku i pogoda: balkon zmienia się z porą roku, pada deszcz i śnieg.',
      'Gabi mówi o pogodzie, a w oknach widać deszcz, śnieg i liście.',
    ],
    soon: ['Ozdoby sezonowe w sklepie: dynie, choinki, wiatrak i dużo jesiennych rzeczy!'],
  },
```

Run: `npx vitest run` — Expected: PASS (test wersji: rosnące numery, `APP_VERSION` = 3).

- [ ] **Step 2: Notatki** — dopisz na końcu `docs/NASTEPNA-SESJA.md`:

```markdown
## Pory roku i pogoda — etap 1 (2026-10-19)
- Pora roku z miesiąca, pogoda dnia z daty (`src/home/season.ts`, tabela `WEATHER_ODDS`), długość dnia wg pory
  roku (`PHASE_STARTS` w `daytime.ts`). Nic w zapisie gry.
- Balkon: namalowane tła `public/backgrounds/{pora}-{day|night}.png` (narzędzie `tools/make_backgrounds.py` ze źródeł
  `assets/source/bg-*.jpg`), wieczorem przejście dzień → noc, pogoda i drobinki z `src/home/weatherFx.ts`;
  na balkonie nie ma wyboru tapety ani podłogi.
- Okna: opady na szybie (`src/home/glass.ts` — wykrywanie szyby z kolorów sprite'a; wyjątki `NO_GLASS`).
- Podgląd: `?pora=wiosna|lato|jesien|zima`, `?pogoda=slonce|pochmurno|deszcz|burza|snieg|mroz` (z `npm run dev`).
- Etap 2 (ozdoby sezonowe z `assets/source/sheet-seasonal.jpg`, `sheet-autumn1.jpg`, `sheet-autumn2.jpg`) — osobny plan.
```

- [ ] **Step 3: Przeglądarka (telefon 375×812)** — kopia zapisu przed testem (`localStorage['gabigochi.save']` → `gabigochi.save.backup-seasons`), po teście przywrócenie z zablokowanym `setItem` i usunięcie kopii. Serwer `gabigochi` (preview_start), sprawdzić:
  - balkon w każdej porze roku i pogodzie: `/?pora=…&pogoda=…` (4 × 6 wariantów, wystarczą typowe: wiosna słońce/deszcz, lato słońce/burza + noc ze świetlikami, jesień słońce/deszcz, zima śnieg/mróz);
  - rano / wieczór (przejście tła) / noc przez `&godzina=7`, `&godzina=19:30`, `&godzina=23` (latem `&godzina=21`);
  - okna w salonie/sypialni z opadami (śnieg, deszcz, liście), także odbite okno; nocne okno;
  - zakładki urządzania na balkonie (tylko „Magazyn”);
  - ikonka pogody i dymek zegara; kwestia przy oknie w deszcz;
  - brak błędów w konsoli; płynność (bez zacięć) na balkonie.

- [ ] **Step 4: Pokaz animacji użytkownikowi** — przed wydaniem pokazać użytkownikowi animacje (zrzuty/krótkie podglądy z przeglądarki albo link do serwera na telefonie w tej samej sieci `http://<IP komputera>:5173/?pora=…&pogoda=…`) i poczekać na uwagi; poprawki — przed wydaniem.

- [ ] **Step 5: Commit**

```bash
git add src/core/changelog.ts docs/NASTEPNA-SESJA.md
git commit -m "Pory roku: wpis Co nowego (wersja 3), notatki"
```

---

### Task 10: Wydanie (tylko za zgodą użytkownika)

- [ ] **Step 1: Zapytaj użytkownika o zgodę** — to wydanie trafi do telefonu Gabi (pamięć: „confirm each later push/deploy”). Datę w `RELEASES` (wersja 3) ustaw na dzień wydania.
- [ ] **Step 2: Po zgodzie**

```bash
git branch -f main etap-1
git push origin main etap-1
```

- [ ] **Step 3: Poczekaj na workflow „Deploy”** (API `https://api.github.com/repos/AlecKusi/gabigochi/actions/runs?per_page=1`, pętla w tle do `"status": "completed"` dla nowego `head_sha`), sprawdź `conclusion: success`, otwórz `https://aleckusi.github.io/gabigochi/?play` i sprawdź, że nowy kod jest w paczce (np. tekst „Pory roku i pogoda” w `assets/index-*.js`) i nie ma błędów w konsoli.
