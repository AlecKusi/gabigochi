import type { FoodId } from './config';

export interface Needs {
  hunger: number;
  mood: number;
  energy: number;
}

export type MoodLevel = 'happy' | 'ok' | 'sad';

export type RoomId = 'salon' | 'bedroom' | 'studio' | 'bathroom' | 'kitchen' | 'balcony';

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

/** Miejsce na ciele: ozdoba głowy, koszulka, spodnie/spódnica, sukienka (zastępuje koszulkę i dół). */
export type ClothSlot = 'head' | 'top' | 'bottom' | 'dress';

/** Co Gabi ma na sobie; `null` — oryginalne ubranie z rysunku (czarna koszulka z nadrukiem, dżinsy) albo brak ozdoby. */
export interface Outfit {
  head: string | null;
  top: string | null;
  bottom: string | null;
  dress: string | null;
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
  /** Rok, w którym Gabi dostała już urodzinowy prezent (brak — jeszcze nigdy). */
  lastBirthdayGift?: number;
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
  /** Aktualny strój Gabi (identyfikatory z katalogu ubrań). */
  outfit: Outfit;
  /** Kupione ubrania (identyfikatory z katalogu ubrań). */
  ownedClothes: string[];
  /** Licznik do nadawania unikalnych `uid` postawionym przedmiotom. */
  nextUid: number;
  /** Kotek Gabi: imię, najedzenie i sympatia (0–100). */
  cat: CatInfo;
}

export interface CatInfo {
  name: string;
  hunger: number;
  love: number;
}

export interface GameResult {
  gameId: string;
  score: number;
  coins: number;
  moodBoost: number;
  aborted: boolean;
}
