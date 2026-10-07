import { describe, expect, it } from 'vitest';
import { CAT_BOUNDS, CAT_SPRITES, calmCat, createCat, stepCat, type CatState } from '../../src/home/cat';
import items from '../../src/home/items.generated.json';

const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};

describe('kotek w pokoju', () => {
  it('startuje siedząc w granicach pokoju', () => {
    const c = createCat(0, seq(0.5));
    expect(c.mode).toBe('sit');
    expect(c.x).toBeGreaterThanOrEqual(CAT_BOUNDS.minX);
    expect(c.x).toBeLessThanOrEqual(CAT_BOUNDS.maxX);
  });

  it('po siedzeniu idzie na spacer i zatrzymuje się u celu', () => {
    let c: CatState = { x: 30, targetX: 30, mode: 'sit', until: 100, facing: 'left' };
    c = stepCat(c, 16, 200, seq(0.9, 1));
    expect(c.mode).toBe('walk');
    expect(c.targetX).toBe(CAT_BOUNDS.maxX);
    expect(c.facing).toBe('right');
    for (let t = 0; t < 20_000 && c.mode === 'walk'; t += 50) c = stepCat(c, 50, 200 + t, seq(0.1));
    expect(c.mode).toBe('sit');
    expect(c.x).toBe(CAT_BOUNDS.maxX);
  });

  it('po drzemce przeciąga się, potem siada', () => {
    let c: CatState = { x: 50, targetX: 50, mode: 'sleep', until: 10, facing: 'left' };
    c = stepCat(c, 16, 20, seq(0.5));
    expect(c.mode).toBe('stretch');
    c = stepCat(c, 16, c.until + 1, seq(0.5));
    expect(c.mode).toBe('sit');
  });

  it('stuknięty siada i czeka', () => {
    const c = calmCat({ x: 40, targetX: 90, mode: 'walk', until: Infinity, facing: 'right' }, 1000);
    expect(c).toMatchObject({ mode: 'sit', targetX: 40 });
    expect(c.until).toBeGreaterThan(1000);
  });

  it('każdy tryb ma obrazek kota', () => {
    for (const s of Object.values(CAT_SPRITES)) expect((items as Record<string, unknown>)[s], s).toBeDefined();
  });
});
