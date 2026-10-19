import { describe, expect, it } from 'vitest';
import framesMeta from '../../src/sprites/frames.generated.json';
import { FRAMES } from '../../src/sprites/loader';
import {
  OUTFIT_IDS,
  hasOutfitFrames,
  outfitFrame,
  outfitPortrait,
  outfitSpriteNames,
  outfitSpriteUrl,
} from '../../src/sprites/outfitFrames';

describe('klatki strojów z arkuszy', () => {
  it('gotycka lolita ma klatki arkusza głównego, bez pominiętej fun_eat', () => {
    expect(OUTFIT_IDS).toContain('goth_lolita');
    expect(hasOutfitFrames('goth_lolita')).toBe(true);
    for (const n of ['idle_front', 'walk_a1', 'walk_a2', 'walk_a3', 'walk_a4', 'fun_wave', 'fun_talk']) {
      expect(outfitFrame('goth_lolita', n), n).not.toBeNull();
    }
    expect(outfitFrame('goth_lolita', 'fun_eat')).toBeNull();
  });

  it('brak stroju albo klatki — null (zostaje przemalowanie)', () => {
    expect(outfitFrame(null, 'idle_front')).toBeNull();
    expect(outfitFrame(undefined, 'idle_front')).toBeNull();
    expect(outfitFrame('dress_dots', 'idle_front')).toBeNull();
    expect(outfitFrame('goth_lolita', 'sit_idle_1')).toBeNull();
    expect(hasOutfitFrames('dress_dots')).toBe(false);
  });

  it('klucz i adres obrazka', () => {
    expect(outfitFrame('goth_lolita', 'idle_front')!.key).toBe('goth_lolita/idle_front');
    expect(outfitSpriteUrl('goth_lolita/idle_front')).toMatch(/sprites\/stroje\/goth_lolita\/idle_front\.png$/);
    expect(outfitSpriteNames()).toContain('goth_lolita/idle_front');
    expect(outfitSpriteNames()).toContain('goth_lolita/portrait_a');
  });

  it('portrety stroju', () => {
    const p = outfitPortrait('goth_lolita', 'portrait_a')!;
    expect(p.key).toBe('goth_lolita/portrait_a');
    expect(p.meta.w).toBeGreaterThan(0);
    expect(p.meta.scale).toBe(1);
    expect(outfitPortrait('goth_lolita', 'idle_front')).toBeNull();
    expect(outfitPortrait(null, 'portrait_a')).toBeNull();
  });

  it('każda klatka stroju ma klatkę bazową o podobnej wysokości, tę samą skalę i czubek głowy', () => {
    for (const id of OUTFIT_IDS) {
      for (const name of outfitSpriteNames().filter((k) => k.startsWith(`${id}/`)).map((k) => k.slice(id.length + 1))) {
        const p = outfitPortrait(id, name);
        if (p) {
          const [bw, bh] = (framesMeta.portraits as Record<string, number[]>)[name];
          expect(Math.abs(p.meta.w / bw - 1), name).toBeLessThanOrEqual(0.15);
          expect(Math.abs(p.meta.h / bh - 1), name).toBeLessThanOrEqual(0.15);
          continue;
        }
        const f = outfitFrame(id, name)!;
        const base = FRAMES[name]!;
        expect(base, name).toBeDefined();
        expect(f.meta.scale, name).toBe(base.scale);
        expect(Math.abs(f.meta.h / base.h - 1), name).toBeLessThanOrEqual(0.15);
        expect(f.meta.head, name).toBeDefined();
        expect(f.meta.mask, name).toBeUndefined();
      }
    }
  });
});
