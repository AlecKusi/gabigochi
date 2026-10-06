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
