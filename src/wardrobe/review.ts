import type { Pixels } from './dresser';

/**
 * Kontrola jakości przebierania (strona tools/wardrobe-review.html i testy): porównanie oryginalnej klatki z klatką
 * w stroju (koszulka i spodnie — bez sukienek i ozdób głowy, które zmieniają kształt).
 * - `leak` — przecieki: przemalowane jasne piksele spoza nadruku (skóra, włosy, rekwizyty) — koszulka i dżinsy
 *   z rysunku są ciemne, więc jasny piksel zmieniony przez strój to prawie zawsze błąd maski;
 * - `miss` — braki: piksele w kolorach koszulki albo dżinsów z rysunku, które zostały nieprzemalowane (strój
 *   „prześwituje” oryginałem); bez zwierzaka (biały w masce) — kot ma zostać czarny;
 * - `shirt` — ile pikseli maski to koszulka (z nadrukiem): prawie zero w klatce z przodu = koszulka nie
 *   przemaluje się wcale (np. wpadła do obszaru zwierzaka).
 */
export interface DressCheck {
  leak: number;
  miss: number;
  shirt: number;
  /** Indeksy pikseli (do podświetlenia na stronie przeglądu). */
  leakAt: number[];
  missAt: number[];
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Odcień (stopnie), nasycenie i jasność (0–1). */
export function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}

/** Kolory koszulki z rysunku (ciemny fiolet) i dżinsów (szaroniebieski) — jak klasy `shirt`/`jeans` ekstraktora. */
export function clothesColour(r: number, g: number, b: number): 'shirt' | 'jeans' | null {
  const [h, s, v] = hsv(r, g, b);
  if (h >= 228 && h <= 280 && s >= 0.1 && s <= 0.58 && v >= 0.09 && v <= 0.23) return 'shirt';
  if (h >= 198 && h <= 236 && s >= 0.18 && s <= 0.52 && v >= 0.2 && v <= 0.48) return 'jeans';
  return null;
}

/** Jasność, od której zmieniony piksel uznajemy za przeciek (ubrania z rysunku są ciemniejsze). */
export const LEAK_LUM = 110;

/** `shoeTop` — wiersz, od którego zaczynają się buty (czarne buty zostają — nie liczą się jako braki). */
export function checkDress(src: Pixels, mask: Pixels | null, out: Pixels, shoeTop = src.h): DressCheck {
  const leakAt: number[] = [];
  const missAt: number[] = [];
  let shirt = 0;
  const n = src.w * src.h;
  for (let i = 0; i < n; i++) {
    const a = src.data[i * 4 + 3];
    if (a === 0) continue;
    const r = src.data[i * 4];
    const g = src.data[i * 4 + 1];
    const b = src.data[i * 4 + 2];
    const changed = out.data[i * 4] !== r || out.data[i * 4 + 1] !== g || out.data[i * 4 + 2] !== b;
    const mr = mask !== null && mask.data[i * 4] > 127;
    const mg = mask !== null && mask.data[i * 4 + 1] > 127;
    const mb = mask !== null && mask.data[i * 4 + 2] > 127;
    const pet = mr && mg && mb;
    const print = mg && !mr && !pet;
    if ((mr || print) && !pet) shirt++;
    if (changed && !print && lum(r, g, b) > LEAK_LUM) leakAt.push(i);
    if (!changed && !pet && Math.floor(i / src.w) < shoeTop && clothesColour(r, g, b) !== null) missAt.push(i);
  }
  return { leak: leakAt.length, miss: missAt.length, shirt, leakAt, missAt };
}
