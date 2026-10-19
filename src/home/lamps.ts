import { itemFrames } from './catalog';

/**
 * Włączone przedmioty (czyste funkcje): zapalona dynia i choinka mają klatkę `lit` (choinka co chwilę gaśnie —
 * lampki migają), włączony wiatrak kręci się przez klatki `spin_2`/`spin_3`, a poświata płomieni drga.
 */

/** Przedmioty z płomieniem: poświata drga. */
export const FLAME_ITEMS: ReadonlySet<string> = new Set(['pumpkin', 'jar_candle', 'autumn_lantern', 'fireplace', 'fire_pit']);
/** Choinki: lampki migają, poświata pulsuje. */
export const TWINKLE_ITEMS: ReadonlySet<string> = new Set(['xmas_tree', 'xmas_tree_blue']);

/** Klatka włączonego przedmiotu w chwili `t` (ms) albo null — zwykły sprite. */
export function onFrame(itemId: string, on: boolean, t: number): string | null {
  if (!on) return null;
  const frames = itemFrames(itemId);
  if (frames.spin_2 && frames.spin_3) {
    const k = Math.floor(t / 90) % 3;
    return k === 0 ? null : k === 1 ? frames.spin_2 : frames.spin_3;
  }
  if (!frames.lit) return null;
  // choinka: lampki gasną na chwilę co czwarty takt (400 ms)
  if (TWINKLE_ITEMS.has(itemId) && Math.floor(t / 400) % 4 === 3) return null;
  return frames.lit;
}

/** Siła poświaty zapalonej lampki (0,6–1): płomienie drgają, choinki pulsują, inne świecą równo. */
export function glowStrength(itemId: string, t: number): number {
  if (FLAME_ITEMS.has(itemId)) return 0.8 + 0.2 * Math.sin(t / 90) * Math.sin(t / 37 + 1.3);
  if (TWINKLE_ITEMS.has(itemId)) return Math.floor(t / 600) % 2 === 0 ? 0.75 : 1;
  return 1;
}
