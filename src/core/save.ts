import { GABI_BED, WARDROBE_ITEM, findItem } from '../home/catalog';
import { ROOMS, clampToLayer } from '../home/layout';
import { DEFAULT_LOOKS, LATER_DEFAULT_LOOKS, defaultLookIds, findLook } from '../home/looks';
import { STARTER_LAYOUT, createHome, type HomeState } from '../home/starter';
import { CLOTH_SLOTS, findCloth } from '../wardrobe/catalog';
import { defaultOutfit } from '../wardrobe/outfit';
import { CONFIG } from './config';
import { createState } from './state';
import type { GameState, Outfit, PlacedItem, RoomId, RoomState } from './types';

export const SAVE_KEY = 'gabigochi.save';
export const BACKUP_KEY = 'gabigochi.save_backup';

/** Wersja zapisu, którą ta gra pisze i rozumie. */
export const SAVE_VERSION = 2;

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  state: GameState;
  /** Nowa gra (brak zapisu albo zapis nie do odczytania). */
  fresh: boolean;
  /** Zapis był nie do odczytania: kopia w BACKUP_KEY, gra od nowa. */
  recovered: boolean;
  /** Część mieszkania była uszkodzona: kopia w BACKUP_KEY, reszta postępu zachowana, uszkodzone części domyślne. */
  repaired: boolean;
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
/**
 * Pokoje dodane po pierwszej wersji zapisu v2. Zapis bez takiego pokoju nie jest uszkodzony — pokój dochodzi
 * po cichu (domyślny wygląd i meble startowe z nowymi `uid`), bez kopii zapasowej i bez komunikatu.
 */
const LATER_ROOMS: readonly RoomId[] = ['bathroom', 'kitchen', 'balcony'];

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const allNums = (x: Record<string, unknown>): boolean => Object.values(x).every(isNum);

/** Pola wspólne dla v1 i v2 (bez `version`). */
function isValidCore(x: Record<string, unknown>): boolean {
  const n = x.needs;
  return (
    isNum(x.createdAt) && isNum(x.lastUpdate) && isNum(x.coins) && isNum(x.lastPetAt) &&
    isRecord(n) && isNum(n.hunger) && isNum(n.mood) && isNum(n.energy) &&
    isRecord(x.fridge) && allNums(x.fridge) && isRecord(x.records) && allNums(x.records) &&
    typeof x.sleeping === 'boolean' && typeof x.seenBirthday === 'boolean' &&
    typeof x.lastDailyBonus === 'string' &&
    (x.lastFreeKitkat === null || typeof x.lastFreeKitkat === 'string')
  );
}

/** Poprawny przedmiot w pokoju (bez sprawdzania zakresu pozycji — ten jest cicho poprawiany). */
function readItem(x: unknown): PlacedItem | null {
  if (!isRecord(x)) return null;
  const { uid, itemId, x: px, y, flip, wateredAt, lampOn } = x;
  if (typeof uid !== 'string' || uid === '' || typeof itemId !== 'string' || !findItem(itemId)) return null;
  if (!isNum(px) || !isNum(y) || typeof flip !== 'boolean') return null;
  if (wateredAt !== undefined && !isNum(wateredAt)) return null;
  if (lampOn !== undefined && typeof lampOn !== 'boolean') return null;
  const it: PlacedItem = { uid, itemId, x: px, y, flip };
  if (wateredAt !== undefined) it.wateredAt = wateredAt;
  if (lampOn !== undefined) it.lampOn = lampOn;
  return it;
}

/**
 * Odczytuje mieszkanie z zapisu v2. Uszkodzone części zastępuje domyślnymi (`repaired`), poprawne zostawia.
 * Bez zgłaszania naprawy: pozycje są przyciągane do warstwy, roślina bez `wateredAt` dostaje `now`.
 * Zawsze jest dokładnie jedno łóżko Gabi, a `uid` są unikalne i mniejsze niż `nextUid`.
 */
function readHome(x: Record<string, unknown>, now: number): { home: HomeState; repaired: boolean } {
  const defaults = createHome(now);
  let repaired = false;
  const bad = () => {
    repaired = true;
  };

  // wyglądy
  let ownedLooks: string[];
  if (Array.isArray(x.ownedLooks)) {
    ownedLooks = x.ownedLooks.filter((id): id is string => typeof id === 'string' && findLook(id) !== undefined);
    if (ownedLooks.length !== x.ownedLooks.length) bad();
    ownedLooks = [...new Set(ownedLooks)];
    for (const id of defaultLookIds()) if (!ownedLooks.includes(id)) {
      if (!LATER_DEFAULT_LOOKS.includes(id)) bad();
      ownedLooks.push(id);
    }
  } else {
    bad();
    ownedLooks = defaults.ownedLooks;
  }
  const lookOk = (id: unknown, kind: 'wallpaper' | 'floor'): id is string =>
    typeof id === 'string' && findLook(id)?.kind === kind && ownedLooks.includes(id);

  // pokoje
  const rawRooms = isRecord(x.rooms) ? x.rooms : (bad(), {});
  const rooms = {} as Record<RoomId, RoomState>;
  /** Meble startowe pokoi dodanych po cichu — dostaną `uid` za licznikiem. */
  const added = new Set<PlacedItem>();
  for (const r of ROOMS) {
    const raw = rawRooms[r];
    if (raw === undefined && LATER_ROOMS.includes(r) && isRecord(x.rooms)) {
      const items = defaults.rooms[r].items.map((it) => ({ ...it, uid: '' }));
      for (const it of items) added.add(it);
      rooms[r] = { ...defaults.rooms[r], items };
      continue;
    }
    if (!isRecord(raw)) {
      bad();
      rooms[r] = defaults.rooms[r];
      continue;
    }
    const wallpaper = lookOk(raw.wallpaper, 'wallpaper') ? raw.wallpaper : (bad(), DEFAULT_LOOKS[r].wallpaper);
    const floor = lookOk(raw.floor, 'floor') ? raw.floor : (bad(), DEFAULT_LOOKS[r].floor);
    const items: PlacedItem[] = [];
    if (Array.isArray(raw.items)) {
      for (const e of raw.items) {
        const it = readItem(e);
        if (it) items.push(it);
        else bad();
      }
    } else bad();
    rooms[r] = { wallpaper, floor, items };
  }

  // jedno łóżko Gabi, unikalne uid
  const seen = new Set<string>();
  const needUid: PlacedItem[] = [];
  let beds = 0;
  for (const r of ROOMS) {
    rooms[r].items = rooms[r].items.filter((it) => {
      if (added.has(it)) return true;
      if (it.itemId === GABI_BED && ++beds > 1) {
        bad();
        return false;
      }
      if (seen.has(it.uid)) {
        bad();
        needUid.push(it);
      }
      seen.add(it.uid);
      return true;
    });
  }
  if (beds === 0) {
    bad();
    const spot = STARTER_LAYOUT.bedroom.find((e) => e.itemId === GABI_BED)!;
    const bed: PlacedItem = { uid: '', itemId: GABI_BED, x: spot.x, y: spot.y, flip: false };
    rooms.bedroom.items.unshift(bed);
    needUid.push(bed);
  }
  let maxUid = 0;
  for (const u of seen) {
    const m = /^u(\d+)$/.exec(u);
    if (m) maxUid = Math.max(maxUid, Number(m[1]));
  }
  let nextUid = maxUid + 1;
  if (Number.isInteger(x.nextUid) && (x.nextUid as number) >= nextUid) nextUid = x.nextUid as number;
  else bad();
  for (const it of [...needUid, ...added]) it.uid = `u${nextUid++}`;

  // normalizacja bez zgłaszania
  for (const r of ROOMS) {
    rooms[r].items = rooms[r].items.map((it) => {
      const def = findItem(it.itemId)!;
      const out = { ...it, ...clampToLayer(def, it) };
      if (def.interaction === 'water' && out.wateredAt === undefined) out.wateredAt = now;
      return out;
    });
  }

  // magazyn
  const inventory: Record<string, number> = {};
  if (isRecord(x.inventory)) {
    for (const [id, n] of Object.entries(x.inventory)) {
      const def = findItem(id);
      if (def && !def.special && Number.isInteger(n) && (n as number) > 0) inventory[id] = n as number;
      else bad();
    }
  } else bad();
  // Wieszak na ubrania otwiera Szafę: zapisy sprzed szafy dostają go po cichu do magazynu.
  if (!inventory[WARDROBE_ITEM] && !ROOMS.some((r) => rooms[r].items.some((it) => it.itemId === WARDROBE_ITEM))) {
    inventory[WARDROBE_ITEM] = 1;
  }

  const currentRoom = ROOMS.includes(x.currentRoom as RoomId) ? (x.currentRoom as RoomId) : (bad(), 'salon');

  const itemCooldowns: Record<string, number> = {};
  if (isRecord(x.itemCooldowns)) {
    for (const [uid, t] of Object.entries(x.itemCooldowns)) {
      if (isNum(t)) itemCooldowns[uid] = t;
      else bad();
    }
  } else bad();

  return { home: { rooms, inventory, ownedLooks, currentRoom, itemCooldowns, nextUid }, repaired };
}

/**
 * Odczytuje szafę (kupione ubrania i strój). Pola dodane po pierwszej wersji zapisu v2, więc nic tu nie jest
 * „uszkodzeniem”: braki dostają wartości domyślne, nieznane identyfikatory wypadają, a strój zawiera tylko
 * ubrania posiadane, z właściwego slotu (sukienka wygrywa z koszulką i dołem) — wszystko po cichu.
 */
function readWardrobe(x: Record<string, unknown>): { outfit: Outfit; ownedClothes: string[] } {
  const owned = new Set<string>();
  if (Array.isArray(x.ownedClothes)) {
    for (const id of x.ownedClothes) if (typeof id === 'string' && findCloth(id)) owned.add(id);
  }
  const outfit = defaultOutfit();
  if (isRecord(x.outfit)) {
    for (const slot of CLOTH_SLOTS) {
      const id = x.outfit[slot];
      if (typeof id === 'string' && owned.has(id) && findCloth(id)?.slot === slot) outfit[slot] = id;
    }
    if (outfit.dress !== null) {
      outfit.top = null;
      outfit.bottom = null;
    }
  }
  return { outfit, ownedClothes: [...owned] };
}

/** Kotek (pole dodane później): braki i błędy — po cichu wartości domyślne. */
function readCat(x: Record<string, unknown>): { cat: GameState['cat'] } {
  const c = isRecord(x.cat) ? x.cat : {};
  const name = typeof c.name === 'string' && c.name.trim() !== '' ? c.name.trim().slice(0, CONFIG.cat.maxName) : CONFIG.cat.defaultName;
  const num = (v: unknown, d: number) => (isNum(v) ? Math.max(0, Math.min(100, v)) : d);
  return { cat: { name, hunger: num(c.hunger, 80), love: num(c.love, 60) } };
}

/** Zapis v1 → v2 (dochodzą mieszkanie i szafa), v2 → odczyt z naprawą mieszkania. `null` — zapis nie do odczytania. */
function migrate(x: unknown, now: number): { state: GameState; repaired: boolean } | null {
  if (!isRecord(x) || !isValidCore(x)) return null;
  if (x.version === 1) {
    return {
      state: { ...(x as unknown as Omit<GameState, 'version'>), version: 2, ...readWardrobe({}), ...readCat({}), ...createHome(now) },
      repaired: false,
    };
  }
  if (x.version === 2) {
    const { home, repaired } = readHome(x, now);
    return { state: { ...(x as unknown as GameState), ...readWardrobe(x), ...readCat(x), ...home }, repaired };
  }
  return null;
}

/** Zapis pochodzi z nowszej wersji gry niż ta, która go czyta — nie wolno go ruszać. */
export class NewerSaveError extends Error {
  constructor() {
    super('Zapis pochodzi z nowszej wersji gry.');
    this.name = 'NewerSaveError';
  }
}

function backup(kv: KV, raw: string): void {
  try {
    kv.setItem(BACKUP_KEY, raw);
  } catch {
    // brak miejsca na kopię — trudno
  }
}

export function loadState(kv: KV, now: number): LoadResult {
  const raw = kv.getItem(SAVE_KEY);
  if (raw === null) return { state: createState(now), fresh: true, recovered: false, repaired: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && isNum(parsed.version) && parsed.version > SAVE_VERSION) throw new NewerSaveError();
    const m = migrate(parsed, now);
    if (m) {
      if (m.repaired) backup(kv, raw);
      return { state: m.state, fresh: false, recovered: false, repaired: m.repaired };
    }
  } catch (err) {
    if (err instanceof NewerSaveError) throw err;
    // uszkodzony JSON — obsłużony poniżej
  }
  backup(kv, raw);
  return { state: createState(now), fresh: true, recovered: true, repaired: false };
}

/** Czy stan nadaje się do zapisu (NaN/Infinity zamieniłyby się w null i następny odczyt odrzuciłby zapis). */
function isSavable(state: GameState): boolean {
  const x = state as unknown as Record<string, unknown>;
  return x.version === SAVE_VERSION && isValidCore(x) && !readHome(x, state.lastUpdate).repaired;
}

export function saveState(kv: KV, state: GameState): boolean {
  if (!isSavable(state)) return false;
  try {
    kv.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
