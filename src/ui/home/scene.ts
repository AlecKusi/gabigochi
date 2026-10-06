import type { GameState, PlacedItem, RoomId } from '../../core/types';
import { GABI_BED, findItem, itemFrameMeta, type ItemDef } from '../../home/catalog';
import { ROOMS, itemBox } from '../../home/layout';
import { plantState } from '../../home/plants';
import { ROOM_BOUNDS } from '../../pet/brain';
import { FEET_Y, NIGHT_TINT } from '../../pet/room';
import type { FrameMeta } from '../../sprites/loader';

/** Zwiędnięta roślina: brązowawe przyciemnienie (nakładka `source-atop` na kopii sprite'a). */
export const WILTED_TINT = 'rgba(112, 72, 28, 0.55)';
/** Nocą szyby okien ciemnieją mocniej niż reszta pokoju. */
export const WINDOW_NIGHT_TINT = 'rgba(20, 16, 60, 0.55)';

/** Gdzie i jak narysować przedmiot jak klatkę postaci: kotwica (x, linia stóp) w px logicznych + metadane. */
export interface ItemAnchor {
  x: number;
  feetY: number;
  meta: FrameMeta;
}

/**
 * Kotwica przedmiotu dla `drawSprite`. Zwykle środek dolnej krawędzi (`x`, `y` z układu); łóżko Gabi ma własną
 * kotwicę (`anchorX`/`foot`) wspólną z klatkami snu, więc scena snu wypada dokładnie w miejscu pustego łóżka.
 */
export function itemAnchor(item: PlacedItem, def: ItemDef): ItemAnchor {
  const anchorX = def.anchorX ?? def.w / 2;
  const foot = def.foot ?? def.h;
  return {
    x: item.x + (anchorX - def.w / 2) * def.scale,
    feetY: item.y + (foot - def.h) * def.scale,
    meta: { w: def.w, h: def.h, anchorX, foot, scale: def.scale },
  };
}

/**
 * Kotwica klatki stanu przedmiotu (`itemFrames`, np. toaleta z otwartą klapą) rysowanej zamiast niego: ten sam punkt
 * co `itemAnchor` przedmiotu, a metadane klatki — jej `anchorX`/`foot` pokrywają się z kotwicą przedmiotu, więc klatka
 * wypada dokładnie w jego miejscu (także odbita: oba odbijają się wokół tej samej osi). Klatka z `overlay: false`
 * (narysowana inaczej niż przedmiot, np. Gabi przy innym wieszaku) ma kotwicę postaci — staje na linii stóp Gabi
 * (FEET_Y) w osi przedmiotu; przedmiot trzeba wtedy ukryć.
 */
export function itemFrameAnchor(item: PlacedItem, def: ItemDef, sprite: string): ItemAnchor {
  const m = itemFrameMeta(sprite);
  if (!m) throw new Error(`Nieznana klatka przedmiotu: ${sprite}`);
  const base = itemAnchor(item, def);
  return { x: base.x, feetY: m.overlay ? base.feetY : FEET_Y, meta: { w: m.w, h: m.h, anchorX: m.anchorX, foot: m.foot, scale: m.scale } };
}

/** Nakładki koloru dla przedmiotu (kolejno, `source-atop`); pusta lista = oryginalny sprite. */
export function itemTints(def: ItemDef, item: PlacedItem, night: boolean, now: number): string[] {
  const tints: string[] = [];
  if (plantState(item, now) === 'wilted') tints.push(WILTED_TINT);
  if (night && !(def.interaction === 'lamp' && item.lampOn)) {
    tints.push(NIGHT_TINT);
    if (def.interaction === 'window') tints.push(WINDOW_NIGHT_TINT);
  }
  return tints;
}

/** Czy nad rośliną pokazać kroplę (spragniona albo zwiędnięta). */
export function needsWater(item: PlacedItem, now: number): boolean {
  return plantState(item, now) !== 'ok';
}

export function isLitLamp(item: PlacedItem): boolean {
  return findItem(item.itemId)?.interaction === 'lamp' && item.lampOn === true;
}

/** Łóżko Gabi i pokój, w którym stoi (zapis gwarantuje dokładnie jedno). */
export function findBed(state: Pick<GameState, 'rooms'>): { room: RoomId; item: PlacedItem } | null {
  for (const room of ROOMS) {
    const item = state.rooms[room].items.find((i) => i.itemId === GABI_BED);
    if (item) return { room, item };
  }
  return null;
}

const clampWalk = (x: number) => Math.max(ROOM_BOUNDS.minX, Math.min(ROOM_BOUNDS.maxX, x));

/** Odstęp Gabi od boku łóżka, gdy staje obok niego. */
const BESIDE_GAP = 10;

/**
 * Gdzie Gabi staje po wstaniu z łóżka. Łóżko za linią jej stóp — przed nim, na wprost. Łóżko bliżej widza
 * (zasłoniłoby ją) — obok, po stronie, na którą jest miejsce; gdy nigdzie się nie mieści, na wprost.
 */
export function wakeSpot(bed: PlacedItem): number {
  if (bed.y < FEET_Y) return clampWalk(bed.x);
  const b = itemBox(bed);
  const left = b.x - BESIDE_GAP;
  const right = b.x + b.w + BESIDE_GAP;
  const leftOk = left >= ROOM_BOUNDS.minX;
  const rightOk = right <= ROOM_BOUNDS.maxX;
  if (leftOk && (!rightOk || bed.x - left <= right - bed.x)) return left;
  if (rightOk) return right;
  return clampWalk(bed.x);
}

/** Minimalne przesunięcie palca (px CSS), które zmienia pokój. */
export const SWIPE_MIN = 40;

/**
 * Kierunek przewinięcia po geście: palec w lewo (dx < 0) → następny pokój (+1), w prawo → poprzedni (−1);
 * 0, gdy za krótko albo bardziej pionowo niż poziomo.
 */
export function swipeDir(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) <= SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/** Sąsiedni pokój (w kółko). */
export function neighborRoom(room: RoomId, dir: -1 | 1): RoomId {
  const i = ROOMS.indexOf(room);
  return ROOMS[(i + dir + ROOMS.length) % ROOMS.length];
}

/** Skąd Gabi wchodzi: tuż przy krawędzi (częściowo za nią), potem kilka kroków w głąb. */
const ENTRY = { edge: 6, steps: 12 } as const;

/** Wejście do pokoju: idąc „w prawo” (+1) Gabi pojawia się przy lewej krawędzi i wchodzi w głąb. */
export function entryWalk(dir: -1 | 1, roomW: number): { x: number; targetX: number; facing: 'left' | 'right' } {
  return dir === 1
    ? { x: ENTRY.edge, targetX: ROOM_BOUNDS.minX + ENTRY.steps, facing: 'right' }
    : { x: roomW - ENTRY.edge, targetX: ROOM_BOUNDS.maxX - ENTRY.steps, facing: 'left' };
}
