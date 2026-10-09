import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOKS, FLOOR_PATTERNS, LATER_DEFAULT_LOOKS, LOOKS, WALL_PATTERNS, drawFloor, drawWallpaper, findLook, lookById,
} from '../../src/home/looks';

const HEX = /^#[0-9a-f]{6}$/;

/** Udawany kontekst: zapisuje wywołania fillRect z bieżącym kolorem. */
function recorder() {
  const calls: [string, number, number, number, number][] = [];
  const ctx = {
    fillStyle: '' as string,
    fillRect(x: number, y: number, w: number, h: number) {
      calls.push([this.fillStyle, x, y, w, h]);
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('wyglądy (tapety i podłogi)', () => {
  it('~8 tapet i ~6 podłóg z unikalnymi id', () => {
    expect(LOOKS.filter((l) => l.kind === 'wallpaper').length).toBeGreaterThanOrEqual(8);
    expect(LOOKS.filter((l) => l.kind === 'floor').length).toBeGreaterThanOrEqual(6);
    expect(new Set(LOOKS.map((l) => l.id)).size).toBe(LOOKS.length);
  });

  it('wzory i kolory są poprawne, każdy wzór jest użyty', () => {
    for (const l of LOOKS) {
      expect(l.name.length, l.id).toBeGreaterThan(0);
      const patterns: readonly string[] = l.kind === 'wallpaper' ? WALL_PATTERNS : FLOOR_PATTERNS;
      expect(patterns, l.id).toContain(l.pattern);
      expect(l.colors.length, l.id).toBeGreaterThanOrEqual(2);
      for (const c of l.colors) expect(c, l.id).toMatch(HEX);
    }
    for (const p of WALL_PATTERNS) expect(LOOKS.some((l) => l.kind === 'wallpaper' && l.pattern === p), p).toBe(true);
    for (const p of FLOOR_PATTERNS) expect(LOOKS.some((l) => l.kind === 'floor' && l.pattern === p), p).toBe(true);
  });

  it('dokładnie 8 domyślnych za 0 (po dwa na pokój), reszta płatna', () => {
    const free = LOOKS.filter((l) => l.price === 0).map((l) => l.id).sort();
    const defaults = [...new Set(Object.values(DEFAULT_LOOKS).flatMap((d) => [d.wallpaper, d.floor]))].sort();
    expect(free).toEqual(defaults);
    expect(free).toHaveLength(11); // 6 pokoi (balkon bez własnej tapety — niebo)
    for (const l of LOOKS) if (l.price > 0) expect(l.price).toBeGreaterThanOrEqual(30);
  });

  it('domyślne wyglądy pokoi mają właściwe rodzaje i wzory z ustaleń', () => {
    const k = (id: string) => lookById(id);
    expect(k(DEFAULT_LOOKS.salon.wallpaper)).toMatchObject({ kind: 'wallpaper', pattern: 'stripes' });
    expect(k(DEFAULT_LOOKS.salon.floor)).toMatchObject({ kind: 'floor', pattern: 'boards' });
    expect(k(DEFAULT_LOOKS.bedroom.wallpaper)).toMatchObject({ kind: 'wallpaper', pattern: 'dots' });
    expect(k(DEFAULT_LOOKS.bedroom.floor)).toMatchObject({ kind: 'floor', pattern: 'boards' });
    expect(k(DEFAULT_LOOKS.studio.wallpaper)).toMatchObject({ kind: 'wallpaper', pattern: 'plain' });
    expect(k(DEFAULT_LOOKS.studio.floor)).toMatchObject({ kind: 'floor', pattern: 'tiles' });
    expect(k(DEFAULT_LOOKS.bathroom.wallpaper)).toMatchObject({ kind: 'wallpaper', pattern: 'tiles' });
    expect(k(DEFAULT_LOOKS.bathroom.floor)).toMatchObject({ kind: 'floor', pattern: 'tiles' });
  });

  it('salon odtwarza obecny wygląd: lawendowe paski i fioletowe deski', () => {
    expect(lookById(DEFAULT_LOOKS.salon.wallpaper).colors.slice(0, 3)).toEqual(['#cdb8f0', '#c2abea', '#7a4fb3']);
    expect(lookById(DEFAULT_LOOKS.salon.floor).colors.slice(0, 2)).toEqual(['#8d68c4', '#7f5bb6']);
  });

  it('wyglądy dodane później (łazienka, kuchnia, balkon) są darmowe i domyślne', () => {
    const later = [...new Set(['bathroom', 'kitchen', 'balcony'].flatMap((r) => [DEFAULT_LOOKS[r as 'kitchen'].wallpaper, DEFAULT_LOOKS[r as 'kitchen'].floor]))];
    expect([...LATER_DEFAULT_LOOKS].sort()).toEqual(later.sort());
    for (const id of LATER_DEFAULT_LOOKS) expect(lookById(id).price).toBe(0);
  });

  it('findLook / lookById', () => {
    expect(findLook('nope')).toBeUndefined();
    expect(() => lookById('nope')).toThrow();
  });

  it('salonowa tapeta rysuje się dokładnie jak dotychczasowa ściana', () => {
    const { ctx, calls } = recorder();
    drawWallpaper(ctx, lookById(DEFAULT_LOOKS.salon.wallpaper), 128, 128);
    const expected: [string, number, number, number, number][] = [['#cdb8f0', 0, 0, 128, 128]];
    for (let x = 0; x < 128; x += 8) expected.push(['#c2abea', x, 0, 4, 128]);
    expected.push(['#7a4fb3', 0, 125, 128, 3]);
    expect(calls).toEqual(expected);
  });

  it('salonowa podłoga rysuje się dokładnie jak dotychczasowe deski', () => {
    const { ctx, calls } = recorder();
    drawFloor(ctx, lookById(DEFAULT_LOOKS.salon.floor), 128, 128, 32);
    const expected: [string, number, number, number, number][] = [['#8d68c4', 0, 128, 128, 32]];
    for (let y = 134; y < 160; y += 6) expected.push(['#7f5bb6', 0, y, 128, 1]);
    expect(calls).toEqual(expected);
  });

  it('każdy wzór rysuje deterministycznie i w swoim obszarze', () => {
    for (const l of LOOKS) {
      const a = recorder();
      const b = recorder();
      if (l.kind === 'wallpaper') {
        drawWallpaper(a.ctx, l, 128, 128);
        drawWallpaper(b.ctx, l, 128, 128);
      } else {
        drawFloor(a.ctx, l, 128, 128, 32);
        drawFloor(b.ctx, l, 128, 128, 32);
      }
      expect(a.calls, l.id).toEqual(b.calls);
      expect(a.calls.length, l.id).toBeGreaterThan(1);
      const [y0, y1] = l.kind === 'wallpaper' ? [0, 128] : [128, 160];
      for (const [color, x, y, w, h] of a.calls) {
        expect(l.colors, l.id).toContain(color);
        expect(x, l.id).toBeGreaterThanOrEqual(0);
        expect(x + w, l.id).toBeLessThanOrEqual(128);
        expect(y, l.id).toBeGreaterThanOrEqual(y0);
        expect(y + h, l.id).toBeLessThanOrEqual(y1);
      }
    }
  });
});
