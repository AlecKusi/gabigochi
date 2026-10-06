import type { GameState } from '../core/types';
import { CATALOG, SHOP_CATEGORIES, type ItemDef, type ShopCategory } from './catalog';
import { LOOKS, type LookDef, type LookKind } from './looks';

export interface ItemCounts {
  /** Sztuki w magazynie (kupione, niepostawione). */
  stored: number;
  /** Sztuki postawione we wszystkich pokojach. */
  placed: number;
}

/** Ile sztuk przedmiotu jest w magazynie i ile postawionych (we wszystkich pokojach). */
export function itemCounts(state: GameState, itemId: string): ItemCounts {
  let placed = 0;
  for (const room of Object.values(state.rooms)) {
    for (const it of room.items) if (it.itemId === itemId) placed++;
  }
  return { stored: Math.max(0, state.inventory[itemId] ?? 0), placed };
}

/** Podpis kafelka sklepu: „W magazynie: N · Postawione: M” (tylko to, co niezerowe). */
export function countsLabel(c: ItemCounts): string {
  const parts: string[] = [];
  if (c.stored > 0) parts.push(`W magazynie: ${c.stored}`);
  if (c.placed > 0) parts.push(`Postawione: ${c.placed}`);
  return parts.length ? parts.join(' · ') : 'Jeszcze nie masz';
}

/** Przedmioty kategorii sklepu w kolejności katalogu (bez przedmiotów specjalnych). */
export function shopItems(category: ShopCategory): ItemDef[] {
  return CATALOG.filter((d) => !d.special && d.category === category);
}

/** Tapety albo podłogi w kolejności `LOOKS`; `null` dla kategorii przedmiotów. */
export function shopLooks(category: ShopCategory): LookDef[] | null {
  if (category !== 'wallpaper' && category !== 'floor') return null;
  const kind: LookKind = category;
  return LOOKS.filter((l) => l.kind === kind);
}

/** Całkowity współczynnik powiększenia, przy którym sprite (w × h) mieści się w kwadracie `box`; co najmniej 1. */
export function thumbScale(w: number, h: number, box: number): number {
  return Math.max(1, Math.floor(box / Math.max(w, h, 1)));
}

/** Pierwsza kategoria sklepu (domyślnie wybrana). */
export const DEFAULT_SHOP_CATEGORY: ShopCategory = SHOP_CATEGORIES[0].id;
