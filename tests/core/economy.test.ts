import { describe, expect, it } from 'vitest';
import {
  applyGameResult, buyFood, claimDailyBonus, feed, petCharacter, priceOf, setSleeping,
} from '../../src/core/economy';
import { createState } from '../../src/core/state';
import { DAY } from '../../src/core/time';
import type { GameState } from '../../src/core/types';

const T0 = new Date(2026, 9, 6, 12).getTime();
const base = (patch: Partial<GameState> = {}): GameState => ({ ...createState(T0), ...patch });

describe('buyFood', () => {
  it('kupuje jabłko za 5 monet do lodówki', () => {
    const r = buyFood(base(), 'apple', T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.coins).toBe(145);
    expect(r.state.fridge.apple).toBe(1);
  });

  it('odmawia przy braku monet', () => {
    const s = base({ coins: 3 });
    const r = buyFood(s, 'apple', T0);
    expect(r).toEqual({ ok: false, reason: 'no-coins' });
  });

  it('KitKat raz dziennie gratis', () => {
    const s0 = base();
    expect(priceOf(s0, 'kitkat', T0)).toBe(0);
    const r1 = buyFood(s0, 'kitkat', T0);
    if (!r1.ok) throw new Error('powinno się udać');
    expect(r1.state.coins).toBe(150);
    expect(r1.state.fridge.kitkat).toBe(2);
    expect(priceOf(r1.state, 'kitkat', T0)).toBe(15);
    const r2 = buyFood(r1.state, 'kitkat', T0 + 1000);
    if (!r2.ok) throw new Error('powinno się udać');
    expect(r2.state.coins).toBe(135);
    expect(priceOf(r2.state, 'kitkat', T0 + DAY)).toBe(0);
  });
});

describe('feed', () => {
  it('karmi i zdejmuje z lodówki', () => {
    const s = base({ fridge: { apple: 2 }, needs: { hunger: 50, mood: 50, energy: 50 } });
    const r = feed(s, 'apple');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.needs.hunger).toBe(60);
    expect(r.state.fridge.apple).toBe(1);
  });

  it('ostatnia sztuka znika z lodówki', () => {
    const r = feed(base({ fridge: { apple: 1 } }), 'apple');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.fridge.apple).toBeUndefined();
  });

  it('KitKat mocno podnosi humor, wartości do 100', () => {
    const s = base({ fridge: { kitkat: 1 }, needs: { hunger: 95, mood: 50, energy: 50 } });
    const r = feed(s, 'kitkat');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.needs.hunger).toBe(100);
    expect(r.state.needs.mood).toBe(75);
  });

  it('pusta lodówka', () => {
    expect(feed(base({ fridge: {} }), 'pizza')).toEqual({ ok: false, reason: 'empty' });
  });

  it('karmienie budzi', () => {
    const r = feed(base({ sleeping: true }), 'kitkat');
    if (!r.ok) throw new Error('powinno się udać');
    expect(r.state.sleeping).toBe(false);
  });
});

describe('claimDailyBonus', () => {
  it('ten sam dzień — brak bonusu', () => {
    const s = base();
    const r = claimDailyBonus(s, T0 + 1000);
    expect(r.granted).toBe(false);
    expect(r.state).toBe(s);
  });
  it('nowy dzień — +20 monet', () => {
    const r = claimDailyBonus(base(), T0 + DAY);
    expect(r.granted).toBe(true);
    expect(r.state.coins).toBe(170);
    expect(r.state.lastDailyBonus).not.toBe(base().lastDailyBonus);
  });
});

describe('petCharacter', () => {
  it('głaskanie z limitem co 30 s', () => {
    const s = base({ needs: { hunger: 50, mood: 50, energy: 50 } });
    const r1 = petCharacter(s, T0);
    expect(r1.accepted).toBe(true);
    expect(r1.state.needs.mood).toBe(52);
    const r2 = petCharacter(r1.state, T0 + 10_000);
    expect(r2.accepted).toBe(false);
    expect(r2.state).toBe(r1.state);
    expect(petCharacter(r1.state, T0 + 30_000).accepted).toBe(true);
  });
});

describe('applyGameResult', () => {
  const result = { gameId: 'catch', score: 120, coins: 12, moodBoost: 10, aborted: false };
  it('nalicza monety, humor, koszt energii i rekord', () => {
    const s = base({ needs: { hunger: 50, mood: 50, energy: 50 }, records: { catch: 100 } });
    const r = applyGameResult(s, result);
    expect(r.coins).toBe(162);
    expect(r.needs.mood).toBe(60);
    expect(r.needs.energy).toBe(45);
    expect(r.records.catch).toBe(120);
  });
  it('nie obniża rekordu', () => {
    const r = applyGameResult(base({ records: { catch: 500 } }), result);
    expect(r.records.catch).toBe(500);
  });
  it('przerwana gra nic nie zmienia', () => {
    const s = base();
    expect(applyGameResult(s, { ...result, aborted: true })).toBe(s);
  });
});

describe('setSleeping', () => {
  it('przełącza sen', () => {
    expect(setSleeping(base(), true).sleeping).toBe(true);
    const s = base();
    expect(setSleeping(s, false)).toBe(s);
  });
});
