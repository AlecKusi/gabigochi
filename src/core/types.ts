import type { FoodId } from './config';

export interface Needs {
  hunger: number;
  mood: number;
  energy: number;
}

export type MoodLevel = 'happy' | 'ok' | 'sad';

export type RoomId = 'salon' | 'bedroom' | 'studio';

/** Przedmiot postawiony w pokoju; `x` — środek, `y` — linia dolna (stopy), w px logicznych pokoju. */
export interface PlacedItem {
  uid: string;
  itemId: string;
  x: number;
  y: number;
  flip: boolean;
  /** Tylko rośliny: kiedy ostatnio podlana. */
  wateredAt?: number;
  /** Tylko lampki: czy świeci. */
  lampOn?: boolean;
}

export interface RoomState {
  wallpaper: string;
  floor: string;
  items: PlacedItem[];
}

export interface GameState {
  version: 2;
  createdAt: number;
  lastUpdate: number;
  needs: Needs;
  coins: number;
  fridge: Partial<Record<FoodId, number>>;
  sleeping: boolean;
  lastDailyBonus: string;
  lastFreeKitkat: string | null;
  lastPetAt: number;
  seenBirthday: boolean;
  records: Record<string, number>;
  rooms: Record<RoomId, RoomState>;
  /** Kupione, niepostawione przedmioty: id → liczba sztuk. */
  inventory: Record<string, number>;
  /** Posiadane tapety i podłogi (id wyglądów). */
  ownedLooks: string[];
  currentRoom: RoomId;
  /** uid przedmiotu → kiedy ostatnio dał bonus humoru za interakcję. */
  itemCooldowns: Record<string, number>;
  /** Licznik do nadawania unikalnych `uid` postawionym przedmiotom. */
  nextUid: number;
}

export interface GameResult {
  gameId: string;
  score: number;
  coins: number;
  moodBoost: number;
  aborted: boolean;
}
