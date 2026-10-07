import { describe, expect, it } from 'vitest';
import { FRAMES, PORTRAIT_MASKS, hasClothesMask, maskUrl } from '../../src/sprites/loader';
import framesMeta from '../../src/sprites/frames.generated.json';

/** Pliki masek jako data URL (nazwa klatki → PNG). */
const MASK_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../../public/masks/*.png', { eager: true, query: '?inline', import: 'default' })).map(
    ([path, url]) => [path.replace(/^.*\/|\.png$/g, ''), url],
  ),
);

/** Szerokość i wysokość PNG z nagłówka IHDR. */
function pngSize(name: string): [number, number] {
  const bin = atob(MASK_FILES[name].split(',')[1]);
  const u32 = (o: number) => ((bin.charCodeAt(o) << 24) | (bin.charCodeAt(o + 1) << 16) | (bin.charCodeAt(o + 2) << 8) | bin.charCodeAt(o + 3)) >>> 0;
  return [u32(16), u32(20)];
}

const portraitSize = framesMeta.portraits as Record<string, number[]>;

describe('metadane szafy', () => {
  const body = framesMeta.body;

  it('każda klatka ciała ma pole mask; strój z rysunku (pielęgniarka, łóżko) bez maski', () => {
    for (const name of body) expect(typeof FRAMES[name]?.mask, name).toBe('boolean');
    for (const name of body.filter((n) => /^(nurse|bed)_/.test(n))) {
      expect(FRAMES[name]?.mask, name).toBe(false);
      expect(FRAMES[name]?.head, name).toBeUndefined();
    }
    for (const name of ['idle_front', 'walk_a1', 'walk_a2', 'walk_a3', 'walk_a4', 'fun_wave', 'drag_1', 'happy']) {
      expect(FRAMES[name]?.mask, name).toBe(true);
    }
  });

  it('pliki masek: dokładnie klatki z maską i portrety, w rozmiarze klatki', () => {
    const masked = body.filter((n) => FRAMES[n]?.mask);
    const files = Object.keys(MASK_FILES).sort();
    expect(files).toEqual([...masked, ...PORTRAIT_MASKS].sort());
    for (const name of masked) {
      const f = FRAMES[name]!;
      expect(pngSize(name), name).toEqual([f.w, f.h]);
    }
    for (const name of PORTRAIT_MASKS) expect(pngSize(name), name).toEqual(portraitSize[name]);
  });

  it('czubek głowy i kolana leżą w klatce', () => {
    for (const name of body) {
      const f = FRAMES[name]!;
      if (f.mask) expect(f.head, name).toBeDefined();
      if (f.head) {
        expect(f.head.x, name).toBeGreaterThanOrEqual(0);
        expect(f.head.x, name).toBeLessThan(f.w);
        expect(f.head.y, name).toBeGreaterThanOrEqual(0);
        expect(f.head.y, name).toBeLessThan(f.h / 2);
        expect(f.head.w, name).toBeGreaterThan(4);
        expect(f.head.w, name).toBeLessThanOrEqual(f.w);
      }
      if (f.knee !== undefined) {
        expect(f.mask, name).toBe(true);
        expect(f.knee, name).toBeGreaterThan(0);
        expect(f.knee, name).toBeLessThan(f.foot ?? f.h);
      }
    }
  });

  it('turban bez ozdoby głowy, popiersia bez kolan', () => {
    expect(FRAMES.gabi_turban?.noHat).toBe(true);
    expect(FRAMES.idle_front?.noHat).toBeUndefined();
    for (const name of ['gabi_turban', 'gabi_hairdryer', 'study_2']) expect(FRAMES[name]?.knee, name).toBeUndefined();
  });

  it('hasClothesMask i maskUrl', () => {
    expect(hasClothesMask('idle_front')).toBe(true);
    expect(hasClothesMask('nurse_1')).toBe(false);
    expect(hasClothesMask('nie_ma_takiej')).toBe(false);
    for (const name of PORTRAIT_MASKS) expect(hasClothesMask(name)).toBe(true);
    expect(maskUrl('idle_front')).toMatch(/masks\/idle_front\.png$/);
  });
});
