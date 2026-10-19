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

/**
 * Obrazek z arkusza stroju dla klatki albo portretu `name` — `null`, gdy go nie ma albo nie wolno go użyć
 * (`sheet: false`, np. nogi pod popiersiem pozy łazienkowej); wtedy przemalowanie oryginału.
 */
export function sheetSource(dress: string | null | undefined, name: string, sheet = true): OutfitFrame | null {
  return sheet ? outfitPortrait(dress, name) ?? outfitFrame(dress, name) : null;
}

/** Czy strój ma klatki z arkusza (wtedy miniatura w Szafie to Gabi w tym stroju). */
export function hasOutfitFrames(id: string): boolean {
  return OUTFITS[id]?.frames.idle_front !== undefined;
}
