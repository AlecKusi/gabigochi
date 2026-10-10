import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import type { PlacedItem } from '../../src/core/types';
import { ROUTINES, pickRoutine } from '../../src/home/routines';
import { INTERACTIONS } from '../../src/home/catalog';

const NOW = new Date(2026, 9, 12, 8).getTime();
const it_ = (uid: string, itemId: string): PlacedItem => ({ uid, itemId, x: 64, y: 140, flip: false });
const ITEMS = [it_('k', 'coffee_maker'), it_('s', 'wall_sink'), it_('w', 'washing_machine'), it_('b', 'clawfoot_tub'), it_('p', 'pc_desk')];
const first = () => 0;

describe('nawyki Gabi (sama używa sprzętów o swojej porze)', () => {
  const state = createState(NOW);

  it('rano kawa albo zęby, wieczorem zęby albo kąpiel, w nocy nic', () => {
    const at = (hour: number) => new Set(Array.from({ length: 40 }, (_, i) => pickRoutine(state, ITEMS, hour, NOW, () => i / 40)?.itemId));
    expect(at(8)).toEqual(new Set(['coffee_maker', 'wall_sink']));
    expect(at(21)).toEqual(new Set(['wall_sink', 'clawfoot_tub']));
    expect(at(14)).toEqual(new Set(['washing_machine']));
    expect(pickRoutine(state, ITEMS, 3, NOW, first)).toBeNull();
  });

  it('nie powtarza tego samego przy meblu, dopóki trwa przerwa po poprzednim użyciu', () => {
    const used = { ...state, itemCooldowns: { k: NOW - 60_000, s: NOW - 60_000 } };
    expect(pickRoutine(used, ITEMS, 8, NOW, first)).toBeNull();
    const later = { ...state, itemCooldowns: { k: NOW - 2 * 3_600_000 } };
    expect(pickRoutine(later, ITEMS, 8, NOW, first)?.itemId).toBe('coffee_maker');
  });

  it('pokój bez sprzętów — nic; nawyki dotyczą istniejących interakcji', () => {
    expect(pickRoutine(state, [it_('p', 'pc_desk')], 8, NOW, first)).toBeNull();
    for (const r of ROUTINES) {
      expect(INTERACTIONS, r.kind).toContain(r.kind);
      for (const [from, to] of r.hours) expect(from < to && from >= 0 && to <= 24, r.kind).toBe(true);
    }
  });
});
