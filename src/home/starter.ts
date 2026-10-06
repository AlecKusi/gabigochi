import type { GameState, PlacedItem, RoomId } from '../core/types';
import { GABI_BED, itemById } from './catalog';
import { ROOMS } from './layout';
import { DEFAULT_LOOKS, defaultLookIds } from './looks';

/** Część stanu gry opisująca mieszkanie. */
export type HomeState = Pick<GameState, 'rooms' | 'inventory' | 'ownedLooks' | 'currentRoom' | 'itemCooldowns' | 'nextUid'>;

/**
 * Darmowe meble startowe (x — środek, y — linia dolna; px logiczne, na siatce 4 px, w swoich warstwach).
 * Salon odtwarza dawny pokój: okno po lewej, półka po prawej, dywan na środku pod Gabi. Łóżko Gabi ma już szafkę.
 */
export const STARTER_LAYOUT: Readonly<Record<RoomId, readonly { itemId: string; x: number; y: number }[]>> = {
  salon: [
    { itemId: 'rug_round', x: 64, y: 152 },
    { itemId: 'window_flower', x: 24, y: 48 },
    { itemId: 'wall_shelves', x: 100, y: 84 },
    { itemId: 'monstera', x: 108, y: 140 },
  ],
  bedroom: [
    // za linią stóp Gabi (FEET_Y = 144) — w dzień chodzi przed łóżkiem, a nie znika za nim
    { itemId: GABI_BED, x: 64, y: 136 },
    { itemId: 'window_curtains', x: 24, y: 52 },
    { itemId: 'poster_moon', x: 104, y: 56 },
  ],
  studio: [
    { itemId: 'window_blinds', x: 32, y: 56 },
    { itemId: 'writing_desk', x: 92, y: 140 },
    { itemId: 'office_chair', x: 76, y: 148 },
    { itemId: 'cactus_flower', x: 20, y: 140 },
  ],
  // Łazienka bez armatury (brak jej w arkuszach) — lustro, okno, roślina i dywanik.
  bathroom: [
    { itemId: 'rug_striped', x: 64, y: 152 },
    { itemId: 'mirror_wall', x: 32, y: 64 },
    { itemId: 'window_flower', x: 100, y: 52 },
    { itemId: 'snake_plant', x: 20, y: 140 },
  ],
};

/** Mieszkanie na start gry (i po migracji z zapisu v1): domyślne wyglądy i meble startowe, rośliny podlane `now`. */
export function createHome(now: number): HomeState {
  let uid = 1;
  const place = (e: { itemId: string; x: number; y: number }): PlacedItem => {
    const it: PlacedItem = { uid: `u${uid++}`, itemId: e.itemId, x: e.x, y: e.y, flip: false };
    if (itemById(e.itemId).interaction === 'water') it.wateredAt = now;
    return it;
  };
  const rooms = {} as GameState['rooms'];
  for (const r of ROOMS) rooms[r] = { ...DEFAULT_LOOKS[r], items: STARTER_LAYOUT[r].map(place) };
  return { rooms, inventory: {}, ownedLooks: defaultLookIds(), currentRoom: 'salon', itemCooldowns: {}, nextUid: uid };
}
