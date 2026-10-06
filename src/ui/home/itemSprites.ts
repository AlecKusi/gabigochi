/** Obrazki przedmiotów (public/items/*.png): wczytywane raz, leniwie, i wspólne dla wszystkich ekranów. */

export const itemUrl = (sprite: string): string => `${import.meta.env.BASE_URL}items/${sprite}.png`;

const images = new Map<string, HTMLImageElement>();
const tinted = new Map<string, HTMLCanvasElement>();

function image(sprite: string): HTMLImageElement {
  let img = images.get(sprite);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = itemUrl(sprite);
    images.set(sprite, img);
  }
  return img;
}

/** Zaczyna wczytywać obrazki (np. wszystkich przedmiotów w mieszkaniu), żeby nie „wskakiwały” przy przejściu. */
export function preloadItems(sprites: Iterable<string>): void {
  for (const s of sprites) image(s);
}

/**
 * Sprite przedmiotu gotowy do rysowania albo `null`, dopóki się nie wczytał. Z nakładkami (`tints`) — kopia
 * w rozdzielczości natywnej z kolorami nałożonymi `source-atop` (tylko na nieprzezroczyste piksele), zbuforowana.
 * `ctx.filter` byłby prostszy, ale na iOS Safari bywa ignorowany.
 */
export function itemSource(sprite: string, tints: readonly string[] = []): CanvasImageSource | null {
  const img = image(sprite);
  if (!img.complete || img.naturalWidth === 0) return null;
  if (tints.length === 0) return img;
  const key = `${sprite}|${tints.join('|')}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    for (const t of tints) {
      ctx.fillStyle = t;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    tinted.set(key, c);
  }
  return c;
}
