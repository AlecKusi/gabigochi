import { describe, expect, it } from 'vitest';
import { itemFrames } from '../../src/home/catalog';
import { FLAME_ITEMS, TWINKLE_ITEMS, glowStrength, onFrame } from '../../src/home/lamps';

describe('włączone przedmioty', () => {
  it('wyłączone — zwykły sprite', () => {
    for (const id of ['pumpkin', 'xmas_tree', 'fan']) expect(onFrame(id, false, 1234)).toBeNull();
  });

  it('zapalona dynia — klatka zapalona', () => {
    expect(onFrame('pumpkin', true, 0)).toBe(itemFrames('pumpkin').lit);
    expect(onFrame('pumpkin', true, 5000)).toBe(itemFrames('pumpkin').lit);
  });

  it('choinka miga: najczęściej zapalona, na chwilę gaśnie', () => {
    const states = Array.from({ length: 40 }, (_, i) => onFrame('xmas_tree', true, i * 100));
    expect(states.filter((s) => s === itemFrames('xmas_tree').lit).length).toBeGreaterThan(20);
    expect(states).toContain(null);
  });

  it('wiatrak kręci się przez 3 klatki', () => {
    const f = itemFrames('fan');
    const seen = new Set([0, 90, 180, 270].map((t) => onFrame('fan', true, t)));
    expect(seen).toEqual(new Set([null, f.spin_2, f.spin_3]));
  });

  it('poświata: płomienie drgają w 0,6–1, choinki pulsują, reszta stała', () => {
    expect(FLAME_ITEMS.has('fire_pit')).toBe(true);
    expect(TWINKLE_ITEMS.has('xmas_tree_blue')).toBe(true);
    const flame = Array.from({ length: 200 }, (_, i) => glowStrength('jar_candle', i * 17));
    expect(Math.min(...flame)).toBeGreaterThanOrEqual(0.6);
    expect(Math.max(...flame)).toBeLessThanOrEqual(1);
    expect(new Set(flame.map((v) => v.toFixed(2))).size).toBeGreaterThan(10);
    expect(new Set([0, 600].map((t) => glowStrength('xmas_tree', t))).size).toBe(2);
    expect(glowStrength('nightstand_lamp', 999)).toBe(1);
  });
});
