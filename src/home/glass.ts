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
