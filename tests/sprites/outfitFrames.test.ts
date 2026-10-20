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
  sheetSource,
} from '../../src/sprites/outfitFrames';

describe('klatki strojów z arkuszy', () => {
  it('gotycka lolita ma klatki z arkuszy (główny, siedzenie, stół, kotek, plecy, szydełko na meblu)', () => {
    expect(OUTFIT_IDS).toContain('goth_lolita');
    expect(hasOutfitFrames('goth_lolita')).toBe(true);
    for (const n of ['idle_front', 'walk_a1', 'walk_a2', 'walk_a3', 'walk_a4', 'fun_wave', 'fun_talk', 'fun_eat',
      'sit_idle_1', 'table_coffee_1', 'cat_pet_1', 'cat_hug_1', 'back_idle', 'tv_1', 'sit_crochet_1']) {
      expect(outfitFrame('goth_lolita', n), n).not.toBeNull();
    }
  });

  it('brak stroju albo klatki — null (zostaje przemalowanie)', () => {
    expect(outfitFrame(null, 'idle_front')).toBeNull();
    expect(outfitFrame(undefined, 'idle_front')).toBeNull();
    expect(outfitFrame('dress_dots', 'idle_front')).toBeNull();
    // klatki bez arkusza stroju: opieka nad chorą (inny strój) i piana w wannie
    expect(outfitFrame('goth_lolita', 'nurse_1')).toBeNull();
    expect(outfitFrame('goth_lolita', 'gabi_foam_1')).toBeNull();
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

  it('każda klatka stroju ma klatkę bazową o podobnej wysokości, tę samą skalę i czubek głowy (gdy ma go baza)', () => {
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
        const head = f.meta.head;
        if (base.head) {
          expect(head, name).toBeTruthy();
          expect(head!.w, name).toBeGreaterThan(0);
        }
        if (base.anchorX === base.w / 2) {
          // kotwica w środku obrazka (leżenie, sceny), jak w oryginale
          expect(f.meta.anchorX, name).toBe(f.meta.w / 2);
        } else if (head && base.head) {
          // kotwica przy czubku głowy — inaczej Gabi skakałaby w poziomie przy zmianie klatki; gdy już oryginał
          // ma kotwicę obok głowy (ręka w górze, efekt nad głową, wyrównanie po butach), tyle samo ±2
          const limit = Math.max(1.5, Math.abs(base.anchorX - base.head.x) + 2);
          expect(Math.abs(f.meta.anchorX - head.x), name).toBeLessThanOrEqual(limit);
        }
        expect(f.meta.anchorX, name).toBeGreaterThanOrEqual(0);
        expect(f.meta.anchorX, name).toBeLessThanOrEqual(f.meta.w);
        expect(f.meta.mask, name).toBeUndefined();
      }
    }
  });

  it('każdy obrazek stroju istnieje w public/ i ma wymiary z metadanych', () => {
    // pliki jako data URI (bez typów Node w projekcie); klucz: `<id>/<klatka>`
    const files = import.meta.glob<string>('../../public/sprites/stroje/*/*.png', { query: '?inline', import: 'default', eager: true });
    const pngs = new Map(Object.entries(files).map(([path, uri]) => [path.replace(/^.*\/stroje\/|\.png$/g, ''), uri]));
    for (const key of outfitSpriteNames()) {
      const uri = pngs.get(key);
      expect(uri, key).toBeDefined();
      const bytes = Uint8Array.from(atob(uri!.slice(uri!.indexOf(',') + 1)), (c) => c.charCodeAt(0));
      // nagłówek IHDR: szerokość i wysokość w bajtach 16–23 (big-endian)
      const view = new DataView(bytes.buffer);
      const size = [view.getUint32(16), view.getUint32(20)];
      const [id, name] = key.split('/');
      const meta = outfitPortrait(id, name)?.meta ?? outfitFrame(id, name)!.meta;
      expect(size, key).toEqual([meta.w, meta.h]);
    }
  });

  it('źródło z arkusza: portret, klatka, brak; `sheet: false` — zawsze przemalowanie', () => {
    expect(sheetSource('goth_lolita', 'idle_front')!.key).toBe('goth_lolita/idle_front');
    expect(sheetSource('goth_lolita', 'portrait_b')!.meta.scale).toBe(1);
    expect(sheetSource('goth_lolita', 'idle_front', false)).toBeNull();
    expect(sheetSource('goth_lolita', 'portrait_a', false)).toBeNull();
    expect(sheetSource('goth_lolita', 'fun_eat')!.key).toBe('goth_lolita/fun_eat');
    expect(sheetSource('goth_lolita', 'nurse_1')).toBeNull();
    expect(sheetSource(null, 'idle_front')).toBeNull();
  });
});
