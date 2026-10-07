import { HOUR } from '../core/time';
import type { GameState, PlacedItem, RoomId } from '../core/types';
import { findItem } from './catalog';
import type { HomeOutcome } from './layout';

/** Po tylu ms od podlania roślina jest spragniona (ikonka kropli). */
export const THIRSTY_AFTER = 24 * HOUR;
/** Po tylu ms — zwiędnięta (rysowana przyciemniona; nie umiera). */
export const WILTED_AFTER = 72 * HOUR;

export type PlantState = 'ok' | 'thirsty' | 'wilted';

export function isPlant(itemId: string): boolean {
  return findItem(itemId)?.interaction === 'water';
}

/** Stan rośliny; dla nie-roślin (i roślin bez `wateredAt`) zawsze 'ok'. */
export function plantState(item: PlacedItem, now: number): PlantState {
  if (!isPlant(item.itemId) || item.wateredAt === undefined) return 'ok';
  const dry = now - item.wateredAt;
  if (dry >= WILTED_AFTER) return 'wilted';
  if (dry >= THIRSTY_AFTER) return 'thirsty';
  return 'ok';
}

/** Dymek „Kwiatki chcą pić!” najwyżej raz na tyle ms (performance.now()). */
export const PLANT_NAG_EVERY = 3 * 60_000;

/** Czy w pokoju jest spragniona albo zwiędnięta roślina. */
export function hasThirstyPlant(items: readonly PlacedItem[], now: number): boolean {
  return items.some((i) => plantState(i, now) !== 'ok');
}

/** Czy przy najbliższej pogawędce Gabi ma przypomnieć o podlaniu (spragniona roślina + odstęp od ostatniego razu). */
export function shouldNagPlants(items: readonly PlacedItem[], now: number, t: number, lastNagAt: number | null): boolean {
  return hasThirstyPlant(items, now) && (lastNagAt === null || t - lastNagAt >= PLANT_NAG_EVERY);
}

export function water(state: GameState, room: RoomId, uid: string, now: number): HomeOutcome {
  const it = state.rooms[room].items.find((i) => i.uid === uid);
  if (!it) return { ok: false, reason: 'not-found' };
  if (!isPlant(it.itemId)) return { ok: false, reason: 'not-plant' };
  const r = state.rooms[room];
  return {
    ok: true,
    state: {
      ...state,
      rooms: { ...state.rooms, [room]: { ...r, items: r.items.map((i) => (i.uid === uid ? { ...i, wateredAt: now } : i)) } },
    },
  };
}
