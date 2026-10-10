import type { GameState, PlacedItem } from '../core/types';
import { findItem, type Interaction } from './catalog';
import { canReward } from './rewards';

/** Codzienny nawyk Gabi: interakcja z przedmiotem w pokoju o danej porze (godziny gry, przedziały [od, do)). */
export interface Routine {
  kind: Interaction;
  hours: readonly (readonly [number, number])[];
  /** Waga losowania między nawykami pasującymi w tej chwili. */
  weight: number;
}

export const ROUTINES: readonly Routine[] = [
  // poranna kawa albo herbata z ekspresu / czajnika
  { kind: 'brew', hours: [[6, 11]], weight: 3 },
  // zęby rano i wieczorem
  { kind: 'sink', hours: [[6, 10], [20, 24]], weight: 3 },
  { kind: 'mirror', hours: [[7, 12], [17, 21]], weight: 2 },
  { kind: 'shower', hours: [[6, 9], [19, 23]], weight: 2 },
  { kind: 'bath', hours: [[19, 23]], weight: 2 },
  { kind: 'laundry', hours: [[10, 18]], weight: 1 },
  { kind: 'dishes', hours: [[13, 15], [19, 22]], weight: 1 },
];

/** Szansa, że w chwili na samodzielne zajęcie Gabi wybierze nawyk z przedmiotem (gdy jakiś pasuje). */
export const ROUTINE_CHANCE = 0.4;

/**
 * Przedmiot w pokoju, z którym Gabi sama coś zrobi o godzinie `hour`: interakcja z nawyków pasująca do pory,
 * bez świeżej przerwy po poprzednim użyciu (`canReward` — nie myje zębów co pięć minut), losowo wg wag.
 * `null`, gdy nic nie pasuje.
 */
export function pickRoutine(state: GameState, items: readonly PlacedItem[], hour: number, now: number, rng: () => number): PlacedItem | null {
  const options: { it: PlacedItem; w: number }[] = [];
  for (const it of items) {
    const kind = findItem(it.itemId)?.interaction;
    const r = ROUTINES.find((x) => x.kind === kind);
    if (!r || !r.hours.some(([from, to]) => hour >= from && hour < to)) continue;
    if (!canReward(state, it.uid, now)) continue;
    options.push({ it, w: r.weight });
  }
  if (options.length === 0) return null;
  let x = rng() * options.reduce((a, o) => a + o.w, 0);
  for (const o of options) {
    x -= o.w;
    if (x < 0) return o.it;
  }
  return options[options.length - 1].it;
}
