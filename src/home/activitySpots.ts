import type { GameState, PlacedItem, RoomId } from '../core/types';
import type { ActivityId } from '../pet/activities';
import { ROOMS, ROOM_NAMES } from './layout';

/** Biurko, przy którym Gabi się uczy. */
export const STUDY_DESK = 'writing_desk';
/** Kanapy: Gabi szydełkuje na nich albo — zmęczona — ucina sobie drzemkę. */
export const SOFAS: readonly string[] = [
  'sofa_cozy', 'sofa_kawaii', 'sofa_gothic', 'sofa_leather', 'loveseat',
  // balkon: rattanowa ławka i leżak (też leżenie i drzemka), jesienna ławka z kocem
  'rattan_bench', 'sun_lounger', 'blanket_bench',
];
/** Siedziska, na których Gabi szydełkuje (siedzi na meblu, mebel zostaje widoczny). */
export const SEATS: readonly string[] = [
  'pouf', 'bean_bag', 'office_chair', 'gaming_chair_purple', 'gaming_chair_pink',
  ...SOFAS,
  'armchair_cozy', 'armchair_bunny', 'armchair_gothic', 'hanging_chair', 'armchair_wingback',
  'chair_wooden', 'chair_upholstered', 'bar_stool', 'pouf_frog', 'office_chair_black', 'chair_gothic',
  // balkon
  'balcony_folding_chair', 'balcony_metal_chair', 'rattan_armchair', 'egg_chair', 'outdoor_pouf',
  // kuchnia
  'kitchen_stool',
];
/**
 * Gabi w środku przedmiotu (`PoseAt` 'inside'), px logiczne: `dx` — środek wnętrza (niecki) od środka przedmiotu
 * (odbity z przedmiotem), `headDx` — głowa od środka piany w klatkach (klatki się nie odbijają), `lift` — linia
 * dołu klatki nad dołem przedmiotu (wanna: przedni brzeg — piana „w wannie”; kabina: brodzik), `glass` — krycie
 * Gabi za szybą kabiny.
 */
export const INSIDE_SPOTS: Readonly<Record<string, { dx: number; headDx?: number; lift: number; glass?: number }>> = {
  clawfoot_tub: { dx: 0, headDx: 5, lift: 22 },
  builtin_tub: { dx: -1, headDx: 5, lift: 22 },
  corner_tub: { dx: 1, headDx: 5, lift: 18 },
  glass_shower: { dx: 0, lift: 5, glass: 0.8 },
  shower_cabin: { dx: 0, lift: 5, glass: 0.8 },
};

/** O ile (px logiczne) siedzisko jest wyżej niż stołek z klatek szydełkowania (hoker — nogi w powietrzu). */
export const SEAT_LIFT: Readonly<Record<string, number>> = {
  bar_stool: 9, kitchen_stool: 9, hanging_chair: 3, egg_chair: 3,
  // łazienka: toaleta (nowa) wyżej niż stołek, Gabi stoi na wadze
  toilet_white: 4, bath_scale: 5,
};

/** Gdzie wolno zająć się danym zajęciem. */
export type SpotRule =
  | { kind: 'any' }
  /** Gdziekolwiek w tym pokoju. */
  | { kind: 'room'; room: RoomId; label: string }
  /** Tylko przy jednym z tych mebli (w dowolnym pokoju); scena rysowana w miejscu mebla, mebel ukryty. */
  | { kind: 'item'; itemIds: readonly string[]; label: string };

export const ACTIVITY_RULES: Readonly<Record<ActivityId, SpotRule>> = {
  study: { kind: 'item', itemIds: [STUDY_DESK], label: 'Potrzebne: biurko do nauki' },
  nursing: { kind: 'room', room: 'studio', label: 'Tylko w pracowni' },
  phone: { kind: 'any' },
  crochet: { kind: 'item', itemIds: SEATS, label: 'Potrzebne: siedzisko' },
  music: { kind: 'room', room: 'salon', label: 'Tylko w salonie' },
  karaoke: { kind: 'room', room: 'salon', label: 'Tylko w salonie' },
  dance: { kind: 'any' },
  ukulele: { kind: 'any' },
};

/** Mebel, przy którym odbywa się zajęcie. */
export interface Spot {
  room: RoomId;
  uid: string;
}

/**
 * Czy i gdzie zająć się zajęciem, patrząc z pokoju `room`:
 * - `here` — od razu w tym pokoju (`spot` — mebel, do którego Gabi najpierw idzie);
 * - `elsewhere` — w innym pokoju (widok przechodzi tam, Gabi idzie do mebla / wchodzi, potem start);
 * - `missing` — nigdzie w mieszkaniu nie ma potrzebnego mebla (karta wyszarzona z podpisem).
 */
export type Availability =
  | { status: 'here'; spot: Spot | null }
  | { status: 'elsewhere'; room: RoomId; spot: Spot | null; label: string }
  | { status: 'missing'; label: string };

type Rooms = Pick<GameState, 'rooms'>;

/** Najbliższy (w poziomie) od `x` przedmiot spośród `itemIds`; przy remisie wcześniejszy na liście. */
export function nearestItem(items: readonly PlacedItem[], itemIds: readonly string[], x: number): PlacedItem | null {
  let best: PlacedItem | null = null;
  for (const it of items) {
    if (!itemIds.includes(it.itemId)) continue;
    if (!best || Math.abs(it.x - x) < Math.abs(best.x - x)) best = it;
  }
  return best;
}

/** Pokoje od `room` w kolejności odległości na liście pokoi (sąsiednie najpierw; przy remisie wcześniejszy). */
function roomsByDistance(room: RoomId): RoomId[] {
  const i = ROOMS.indexOf(room);
  return [...ROOMS].sort((a, b) => Math.abs(ROOMS.indexOf(a) - i) - Math.abs(ROOMS.indexOf(b) - i) || ROOMS.indexOf(a) - ROOMS.indexOf(b));
}

/** Dostępność zajęcia z pokoju `room`; `petX` wybiera najbliższy mebel w bieżącym pokoju. */
export function activityAvailability(state: Rooms, id: ActivityId, room: RoomId, petX: number): Availability {
  const rule = ACTIVITY_RULES[id];
  if (rule.kind === 'any') return { status: 'here', spot: null };
  if (rule.kind === 'room') {
    return rule.room === room ? { status: 'here', spot: null } : { status: 'elsewhere', room: rule.room, spot: null, label: rule.label };
  }
  for (const r of roomsByDistance(room)) {
    // w innym pokoju Gabi wchodzi od krawędzi — „najbliższy” liczymy wtedy od środka
    const it = nearestItem(state.rooms[r].items, rule.itemIds, r === room ? petX : 64);
    if (!it) continue;
    const spot = { room: r, uid: it.uid };
    return r === room ? { status: 'here', spot } : { status: 'elsewhere', room: r, spot, label: `W pokoju: ${ROOM_NAMES[r]}` };
  }
  return { status: 'missing', label: rule.label };
}

/** Zajęcia, które mogą zacząć się same w tym pokoju (bez zmiany pokoju). */
export function activitiesHere(state: Rooms, room: RoomId, ids: readonly ActivityId[]): ActivityId[] {
  return ids.filter((id) => activityAvailability(state, id, room, 64).status === 'here');
}

/** Losuje zajęcie spośród dostępnych w tym pokoju; null, gdy żadne nie jest dostępne. */
export function pickActivityHere(state: Rooms, room: RoomId, ids: readonly ActivityId[], rng: () => number): ActivityId | null {
  const here = activitiesHere(state, room, ids);
  if (here.length === 0) return null;
  return here[Math.min(here.length - 1, Math.floor(rng() * here.length))];
}

/** Czy trwające zajęcie może trwać dalej w pokoju `room` (zajęcia przy meblu i pokojowe kończą się po wyjściu). */
export function activityAllowedIn(id: ActivityId, room: RoomId, spot: Spot | null): boolean {
  const rule = ACTIVITY_RULES[id];
  if (rule.kind === 'any') return true;
  if (rule.kind === 'room') return rule.room === room;
  return spot !== null && spot.room === room;
}

/** Siedzisko do szydełkowania najbliższe koszykowi z włóczką (w tym samym pokoju) albo null. */
export function seatNear(items: readonly PlacedItem[], x: number): PlacedItem | null {
  return nearestItem(items, SEATS, x);
}

/** Miejsce sceny zajęcia przy meblu: środek dolnej krawędzi mebla (jego linia stóp). */
export function spotAnchor(item: PlacedItem): { x: number; feetY: number } {
  return { x: item.x, feetY: item.y };
}

/** Gdzie posadzić Gabi na siedzisku: stopy tuż przed meblem (rysowana nad nim), podniesione o wysokość siedziska. */
export function seatAnchor(item: PlacedItem): { x: number; feetY: number } {
  return { x: item.x, feetY: item.y + 1 - (SEAT_LIFT[item.itemId] ?? 0) };
}

/** Podpis karty zajęcia w panelu (null — bez podpisu). */
export function availabilityHint(a: Availability): string | null {
  return a.status === 'here' ? null : a.label;
}
