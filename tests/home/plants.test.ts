import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import { HOUR } from '../../src/core/time';
import type { GameState, PlacedItem } from '../../src/core/types';
import { THIRSTY_AFTER, WILTED_AFTER, isPlant, plantState, water } from '../../src/home/plants';
import { REWARD_COOLDOWN, canReward, markReward } from '../../src/home/rewards';

const T0 = new Date(2026, 9, 6, 12).getTime();
const plant = (wateredAt?: number): PlacedItem => ({ uid: 'p', itemId: 'monstera', x: 64, y: 140, flip: false, wateredAt });

describe('rośliny', () => {
  it('progi 24 h i 72 h', () => {
    expect(THIRSTY_AFTER).toBe(24 * HOUR);
    expect(WILTED_AFTER).toBe(72 * HOUR);
  });

  it('isPlant po interakcji water', () => {
    expect(isPlant('monstera')).toBe(true);
    expect(isPlant('hanging_fern')).toBe(true);
    expect(isPlant('watering_can')).toBe(false);
    expect(isPlant('nope')).toBe(false);
  });

  it('plantState: ok → thirsty → wilted', () => {
    expect(plantState(plant(T0), T0)).toBe('ok');
    expect(plantState(plant(T0), T0 + 24 * HOUR - 1)).toBe('ok');
    expect(plantState(plant(T0), T0 + 24 * HOUR)).toBe('thirsty');
    expect(plantState(plant(T0), T0 + 72 * HOUR - 1)).toBe('thirsty');
    expect(plantState(plant(T0), T0 + 72 * HOUR)).toBe('wilted');
    expect(plantState(plant(T0), T0 + 1000 * HOUR)).toBe('wilted');
  });

  it('plantState: nie-roślina i brak wateredAt → ok', () => {
    expect(plantState({ ...plant(T0), itemId: 'pouf' }, T0 + 1000 * HOUR)).toBe('ok');
    expect(plantState(plant(undefined), T0)).toBe('ok');
  });

  it('water ustawia wateredAt tylko podlanej roślinie', () => {
    const s0 = createState(T0);
    const salonPlant = s0.rooms.salon.items.find((i) => isPlant(i.itemId))!;
    const r = water(s0, 'salon', salonPlant.uid, T0 + 80 * HOUR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const watered = r.state.rooms.salon.items.find((i) => i.uid === salonPlant.uid)!;
    expect(watered.wateredAt).toBe(T0 + 80 * HOUR);
    expect(plantState(watered, T0 + 80 * HOUR)).toBe('ok');
    expect(r.state.rooms.studio).toBe(s0.rooms.studio);
    expect(s0.rooms.salon.items.find((i) => i.uid === salonPlant.uid)!.wateredAt).toBe(T0);
  });

  it('water: nie-roślina lub brak przedmiotu → błąd', () => {
    const s0 = createState(T0);
    const rug = s0.rooms.salon.items.find((i) => i.itemId === 'rug_round')!;
    expect(water(s0, 'salon', rug.uid, T0)).toEqual({ ok: false, reason: 'not-plant' });
    expect(water(s0, 'salon', 'zzz', T0)).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('cooldown bonusu za interakcję', () => {
  const s0: GameState = createState(T0);

  it('raz na godzinę na przedmiot', () => {
    expect(REWARD_COOLDOWN).toBe(HOUR);
    expect(canReward(s0, 'u1', T0)).toBe(true);
    const s1 = markReward(s0, 'u1', T0);
    expect(s1.itemCooldowns.u1).toBe(T0);
    expect(canReward(s1, 'u1', T0 + HOUR - 1)).toBe(false);
    expect(canReward(s1, 'u2', T0 + 1)).toBe(true);
    expect(canReward(s1, 'u1', T0 + HOUR)).toBe(true);
    expect(s0.itemCooldowns).toEqual({});
  });

  it('markReward usuwa przeterminowane wpisy', () => {
    const s1 = markReward(markReward(s0, 'old', T0), 'mid', T0 + 30 * 60_000);
    const s2 = markReward(s1, 'new', T0 + HOUR + 1);
    expect(s2.itemCooldowns).toEqual({ mid: T0 + 30 * 60_000, new: T0 + HOUR + 1 });
  });
});
