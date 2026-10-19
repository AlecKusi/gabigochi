import type { Outfit } from '../core/types';
import { FRAMES, PORTRAIT_MASKS, hasClothesMask, spriteUrl, type FrameMeta, type SpriteMap } from '../sprites/loader';
import { dressPixels, isBackView, isSeated, lookOf, type Pixels } from './dresser';
import { outfitKey } from './outfit';
import { outfitFrame, outfitPortrait, outfitSpriteUrl } from '../sprites/outfitFrames';

/** Klatka postaci gotowa do `drawSprite`: obrazek (oryginał albo przebrany canvas) i jego metadane. */
export interface Figure {
  img: CanvasImageSource;
  meta: FrameMeta;
}

export interface FigureOpts {
  /** Domyślnie `true`; `false` — bez ozdoby głowy (nogi pod popiersiem). */
  hat?: boolean;
  /** Inny strój niż bieżący (podglądy w Szafie). */
  outfit?: Outfit;
}

export interface Figures {
  /** Klatka w stroju; `null`, gdy brak obrazka lub metadanych. */
  get(name: string, opts?: FigureOpts): Figure | null;
  /** Adres obrazka w stroju (do `<img>`): portrety i klatki; oryginał, gdy strój go nie zmienia. */
  url(name: string, opts?: FigureOpts): string;
}

/** Ile przebranych klatek trzymamy (bieżący strój + podglądy). */
const CACHE_MAX = 400;

function pixelsOf(img: HTMLImageElement): Pixels {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { w: d.width, h: d.height, data: d.data };
}

function canvasOf(px: Pixels): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = px.w;
  c.height = px.h;
  const d = new ImageData(px.w, px.h);
  d.data.set(px.data);
  c.getContext('2d')!.putImageData(d, 0, 0);
  return c;
}

/** Metadane portretu (bez kotwic — tylko do przemalowania koszulki). */
function portraitMeta(img: HTMLImageElement): FrameMeta {
  return { w: img.naturalWidth, h: img.naturalHeight, anchorX: 0, scale: 1, mask: true };
}

/**
 * Źródło klatek postaci w stroju: wszystkie miejsca rysujące Gabi pobierają klatki stąd, więc nowe ubranie widać
 * w każdej animacji bez nowych sprite'ów. Wynik cache'owany per (klatka, ozdoba, strój).
 * Strój z arkuszy (`outfitFrames`) ma własne klatki — wtedy zamiast przemalowania rysujemy klatkę stroju (z ozdobą głowy).
 */
export function createFigures(
  sprites: SpriteMap,
  masks: SpriteMap,
  outfit: () => Outfit,
  hats: SpriteMap = new Map(),
  outfitSprites: SpriteMap = new Map(),
): Figures {
  const cache = new Map<string, { fig: Figure; url?: string } | null>();
  const pixels = new Map<string, Pixels>();
  const px = (key: string, img: HTMLImageElement) => {
    let p = pixels.get(key);
    if (!p) {
      p = pixelsOf(img);
      pixels.set(key, p);
    }
    return p;
  };

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

  return {
    get: (name, opts) => dressed(name, opts)?.fig ?? null,
    url(name, opts) {
      const e = dressed(name, opts);
      if (!e) return spriteUrl(name);
      if (e.url) return e.url;
      if (e.fig.img === sprites.get(name)) return spriteUrl(name);
      e.url = (e.fig.img as HTMLCanvasElement).toDataURL();
      return e.url;
    },
  };
}
