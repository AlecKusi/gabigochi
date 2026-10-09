import items from '../home/items.generated.json';
import type { FrameMeta } from '../sprites/loader';
import { itemSource, preloadItems } from '../ui/home/itemSprites';
import { drawSprite } from '../ui/pixelStage';

/** Kotek w minigrach: te same klatki co w pokoju (public/items/cat_*.png), opcjonalnie powiększone. */

export function preloadCat(sprites: Iterable<string>): void {
  preloadItems(sprites);
}

/** Metadane klatki kota (środek dołu = łapki), z powiększeniem `zoom`; null — nieznana klatka. */
export function catMeta(sprite: string, zoom = 1): FrameMeta | null {
  const m = (items as Record<string, { w: number; h: number; scale?: number } | undefined>)[sprite];
  return m ? { w: m.w, h: m.h, anchorX: m.w / 2, scale: (m.scale ?? 1) * zoom, foot: m.h } : null;
}

/** Rysuje kota (px urządzenia): `x` — środek, `feetY` — linia łapek (px logiczne). Bez obrazka — nic. */
export function drawCat(
  d: CanvasRenderingContext2D,
  k: number,
  sprite: string,
  x: number,
  feetY: number,
  o: { flip?: boolean; zoom?: number; tints?: readonly string[] } = {},
): void {
  const meta = catMeta(sprite, o.zoom);
  const src = itemSource(sprite, o.tints ?? []);
  if (!meta || !src) return;
  drawSprite(d, k, src, meta, { x, feetY, flip: o.flip ?? false, bob: 0, squash: 0, jump: 0 });
}
