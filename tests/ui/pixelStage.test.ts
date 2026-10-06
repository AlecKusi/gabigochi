import { describe, expect, it } from 'vitest';
import { spriteRect } from '../../src/ui/pixelStage';

const meta = { w: 20, h: 40, anchorX: 8, scale: 1.5 };
const at = { x: 64, feetY: 144, bob: 0, jump: 0 };

describe('spriteRect', () => {
  it('przy całkowitym k liczy rozmiar i położenie w pikselach urządzenia', () => {
    expect(spriteRect(meta, 3, at)).toEqual({ x: 64 * 3 - 36, y: 144 * 3 - 180, w: 90, h: 180 });
  });

  it('przy ułamkowym k zaokrągla do całych pikseli', () => {
    const r = spriteRect({ w: 21, h: 42, anchorX: 10.35, scale: 4 / 3 }, 2.93, { x: 63.4, feetY: 144, bob: 0, jump: 0 });
    expect(r.w).toBe(82);
    expect(r.h).toBe(164);
    for (const v of Object.values(r)) expect(Number.isInteger(v)).toBe(true);
  });

  it('punkt zaczepienia (czubek głowy) trafia w round(x·k)', () => {
    for (const k of [1, 2.5, 2.93, 3, 8.04]) {
      for (const x of [10, 63.4, 64, 100.7]) {
        const r = spriteRect(meta, k, { ...at, x });
        const anchorDev = Math.round(meta.anchorX * meta.scale * k);
        expect(r.x + anchorDev).toBe(Math.round(x * k));
      }
    }
  });

  it('dół klatki leży na round((feetY − bob − jump)·k)', () => {
    for (const k of [1, 2.5, 2.93, 3]) {
      const r = spriteRect(meta, k, { x: 64, feetY: 144, bob: 1, jump: 7 });
      expect(r.y + r.h).toBe(Math.round(136 * k));
    }
  });
});
