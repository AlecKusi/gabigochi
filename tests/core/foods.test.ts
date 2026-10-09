import { describe, expect, it } from 'vitest';
import { FOODS, foodById } from '../../src/core/config';
import { content } from '../../src/content';
import { createState } from '../../src/core/state';
import { cookDish } from '../../src/home/interactionPlan';

describe('jedzenie', () => {
  it('14 potraw o unikalnych id, z ceną i działaniem', () => {
    expect(FOODS).toHaveLength(14);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
    for (const f of FOODS) {
      expect(f.price, f.id).toBeGreaterThan(0);
      expect(f.hunger + f.mood, f.id).toBeGreaterThan(0);
      expect(foodById(f.id)).toBe(f);
    }
    for (const id of ['pierogi', 'ramen', 'sushi', 'zapiekanka', 'pancakes', 'donut', 'icecream', 'strawberry'] as const) {
      expect(foodById(id).name.length).toBeGreaterThan(0);
    }
  });

  it('kwestie przy jedzeniu dotyczą istniejących potraw', () => {
    const ids = new Set(FOODS.map((f) => f.id as string));
    for (const [id, lines] of Object.entries(content.foodLines)) {
      expect(ids.has(id), id).toBe(true);
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  it('kuchenka gotuje też pierogi, naleśniki, zapiekankę i ramen', () => {
    const dishes = new Set(Array.from({ length: 50 }, (_, i) => cookDish(createState(0), () => i / 50).food));
    for (const d of ['pierogi', 'pancakes', 'zapiekanka', 'ramen'] as const) expect(dishes.has(d), d).toBe(true);
  });
});
