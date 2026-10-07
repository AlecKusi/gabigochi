import { describe, expect, it } from 'vitest';
import { defaultOutfit } from '../../src/wardrobe/outfit';
import {
  HEAD_FIT,
  OUTLINE,
  headwearOf,
  legPatternAt,
  SKIN,
  addHat,
  artPixels,
  changesFrame,
  dressPixels,
  hex,
  lookOf,
  medianLum,
  patternAt,
  toneOf,
  type Pixels,
} from '../../src/wardrobe/dresser';
import { findCloth } from '../../src/wardrobe/catalog';
import type { FrameMeta } from '../../src/sprites/loader';

/** Obrazek z wierszy znaków: S koszulka (#1f1e28), s ciemna koszulka, J dżinsy (#252b42), L jasne dżinsy, o kontur, . pusto. */
const COLORS: Record<string, string> = { S: '#1f1e28', s: '#0f0c15', J: '#252b42', L: '#3b4550', o: '#030205', P: '#c3b8cb' };

function sprite(rows: string[]): { src: Pixels; mask: Pixels } {
  const w = rows[0].length;
  const h = rows.length;
  const src = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const i = (y * w + x) * 4;
      if (ch === '.') return;
      const [r, g, b] = hex(COLORS[ch]);
      src.set([r, g, b, 255], i);
      mask.set([ch === 'S' || ch === 's' ? 255 : 0, ch === 'P' ? 255 : 0, ch === 'J' || ch === 'L' ? 255 : 0, 255], i);
    }),
  );
  return { src: { w, h, data: src }, mask: { w, h, data: mask } };
}

const rgbAt = (p: Pixels, x: number, y: number) => [...p.data.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 3)];
const alphaAt = (p: Pixels, x: number, y: number) => p.data[(y * p.w + x) * 4 + 3];

const ROWS = [
  '..ooooo..',
  '.oSSPSSo.',
  '.oSsSSSo.',
  '.oSSSSSo.',
  '.oJJoJLo.',
  '.oJLoJJo.',
  '.oJJoJJo.',
  '.oJJoJJo.',
  '.oooooooo',
];
const META: FrameMeta = { w: 9, h: 9, anchorX: 4, scale: 1, foot: 9, mask: true, knee: 6, head: { x: 4, y: 0, w: 5 } };
const out = (o: Partial<ReturnType<typeof defaultOutfit>>) => lookOf({ ...defaultOutfit(), ...o });
const plain = { hat: true, seated: false };

describe('ubieralnia — części czyste', () => {
  it('tony względem mediany jasności regionu', () => {
    expect(toneOf(100, 100)).toBe(1);
    expect(toneOf(120, 100)).toBe(0);
    expect(toneOf(80, 100)).toBe(2);
    const { src } = sprite(['SSSs']);
    expect(medianLum(src, [0, 1, 2, 3])).toBeCloseTo(0.299 * 0x1f + 0.587 * 0x1e + 0.114 * 0x28, 3);
  });

  it('wzory: kropki rzadkie, paski co 3 wiersze, kratka, serduszko nie powtarza się', () => {
    let dots = 0;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (patternAt('dots', x, y)) dots++;
    expect(dots).toBeGreaterThan(4);
    expect(dots).toBeLessThan(30);
    expect(patternAt('stripes', 5, 3)).toBe(true);
    expect(patternAt('stripes', 5, 4)).toBe(false);
    expect(patternAt('checks', 4, 1)).toBe(true);
    expect(patternAt('hearts', 0, 0)).toBe(false);
  });

  it('strój: sukienka wyklucza koszulkę i dół', () => {
    const l = lookOf({ head: 'head_crown', top: 'top_pink', bottom: 'skirt_purple', dress: 'dress_dots' });
    expect(l.dress?.id).toBe('dress_dots');
    expect(l.top).toBeNull();
    expect(l.bottom).toBeNull();
    expect(l.head?.id).toBe('head_crown');
  });

  it('oryginalny strój nie zmienia klatki', () => {
    const { src, mask } = sprite(ROWS);
    expect(changesFrame(META, out({}), plain)).toBe(false);
    expect(dressPixels(src, mask, META, out({}), plain)).toBeNull();
    // klatka bez maski (pielęgniarka) — koszulka jej nie dotyczy
    expect(dressPixels(src, null, { ...META, mask: false, head: undefined }, out({ top: 'top_pink' }), plain)).toBeNull();
  });

  it('koszulka: przemalowanie z cieniem, nadruk znika, dżinsy bez zmian', () => {
    const { src, mask } = sprite(ROWS);
    const r = dressPixels(src, mask, META, out({ top: 'top_pink' }), plain)!;
    const pink = findCloth('top_pink')!.colors;
    expect(rgbAt(r.px, 2, 1)).toEqual(hex(pink[1]));
    expect(rgbAt(r.px, 4, 1)).toEqual(hex(pink[1])); // nadruk
    expect(rgbAt(r.px, 3, 2)).toEqual(hex(pink[2])); // ciemniejszy fałd
    expect(rgbAt(r.px, 2, 4)).toEqual(hex(COLORS.J));
    expect(rgbAt(r.px, 1, 1)).toEqual(hex(COLORS.o)); // kontur zostaje
    expect(r.meta).toBe(META);
  });

  it('spodnie: nogawki w kolorze, tony zachowane', () => {
    const { src, mask } = sprite(ROWS);
    const r = dressPixels(src, mask, META, out({ bottom: 'bottom_black' }), plain)!;
    const c = findCloth('bottom_black')!.colors;
    expect(rgbAt(r.px, 2, 7)).toEqual(hex(c[1]));
    expect(rgbAt(r.px, 3, 5)).toEqual(hex(c[0])); // jaśniejszy przetarcie
    expect(rgbAt(r.px, 4, 5)).toEqual(hex(COLORS.o)); // szpara między nogawkami
  });

  it('spódnica: pas między nogami zamalowany, rąbek w wierszu kolan, poniżej gołe nogi', () => {
    const { src, mask } = sprite(ROWS);
    const r = dressPixels(src, mask, META, out({ bottom: 'skirt_purple' }), plain)!;
    const c = findCloth('skirt_purple')!.colors;
    expect(rgbAt(r.px, 4, 4)).toEqual(hex(c[2])); // fałd zamiast szpary
    expect(rgbAt(r.px, 1, 5)).toEqual(hex(c[1])); // poszerzenie dołu (kontur → materiał)
    expect(rgbAt(r.px, 0, 5)).toEqual([...OUTLINE]); // nowy kontur poszerzenia
    expect(rgbAt(r.px, 3, 6)).toEqual([...OUTLINE]); // rąbek
    expect(rgbAt(r.px, 2, 7)).toEqual([...SKIN[1]]);
  });

  it('spódnica w pozie siedzącej — całe nogawki w materiale', () => {
    const { src, mask } = sprite(ROWS);
    const r = dressPixels(src, mask, META, out({ bottom: 'skirt_purple' }), { hat: true, seated: true })!;
    expect(rgbAt(r.px, 2, 7)).toEqual(hex(findCloth('skirt_purple')!.colors[1]));
  });

  it('sukienka maluje górę i dół, wzór kropek na materiale', () => {
    const { src, mask } = sprite(ROWS);
    const r = dressPixels(src, mask, META, out({ dress: 'dress_dots' }), plain)!;
    const d = findCloth('dress_dots')!;
    expect([hex(d.colors[1]), hex(d.patternColor!)]).toContainEqual(rgbAt(r.px, 2, 3));
    expect(rgbAt(r.px, 2, 7)).toEqual([...SKIN[1]]);
    // kropka: patternAt('dots', 5, 1) — nadruk w (4,1) ma kolor sukienki albo kropki
    expect(patternAt('dots', 5, 1)).toBe(true);
    expect(rgbAt(r.px, 5, 1)).toEqual(hex(d.patternColor!));
  });

  it('ozdoba głowy: płótno rośnie w górę, stopy i oś przesunięte', () => {
    const { src } = sprite(ROWS);
    const art = artPixels(['.k.', 'kyk', 'kkk']);
    const r = addHat(src, META, art, { overlap: 1, dx: 0 });
    // dół ozdoby (wiersz 2) w wierszu head.y + overlap = 1 → góra ozdoby w -1 → 1 wiersz dopełnienia
    expect(r.px.h).toBe(10);
    expect(r.meta.h).toBe(10);
    expect(r.meta.foot).toBe(10);
    expect(r.meta.anchorX).toBe(4);
    expect(r.meta.head?.y).toBe(1);
    expect(r.meta.knee).toBe(7);
    expect(alphaAt(r.px, 4, 0)).toBe(255);
    expect(alphaAt(r.px, 0, 0)).toBe(0);
    // oryginał przesunięty o 1 wiersz
    expect(rgbAt(r.px, 2, 2)).toEqual(hex(COLORS.S));
  });

  it('ozdoba wystająca za lewą krawędź poszerza płótno i przesuwa oś', () => {
    const { src } = sprite(ROWS);
    const r = addHat(src, { ...META, head: { x: 0, y: 3, w: 4 } }, artPixels(['kkkkk']), { overlap: 0, dx: 0 });
    expect(r.meta.w).toBe(11);
    expect(r.meta.anchorX).toBe(6);
    expect(r.meta.foot).toBe(9);
  });

  it('bez ozdoby na turbanie i gdy wyłączona (nogi popiersia)', () => {
    const { src, mask } = sprite(ROWS);
    expect(dressPixels(src, mask, { ...META, noHat: true }, out({ head: 'head_crown' }), plain)).toBeNull();
    expect(dressPixels(src, mask, META, out({ head: 'head_crown' }), { hat: false, seated: false })).toBeNull();
    const r = dressPixels(src, mask, META, out({ head: 'head_crown' }), plain)!;
    expect(r.px.h).toBeGreaterThan(9);
  });

  it('rajstopy pod sukienką zamiast gołych nóg, falbana w kolorze `hem`', () => {
    const { src, mask } = sprite(ROWS);
    const lolita = findCloth('goth_lolita')!;
    const r = dressPixels(src, mask, META, out({ dress: 'goth_lolita' }), plain)!;
    expect(rgbAt(r.px, 2, 7)).toEqual(hex(lolita.legs!.colors[1]));
    expect(rgbAt(r.px, 2, 5)).toEqual(hex(lolita.hem!)); // dolny wiersz spódnicy
    expect(rgbAt(r.px, 3, 6)).toEqual([...OUTLINE]); // rąbek bez zmian
  });

  it('kabaretki: ukośna kratka na skórze', () => {
    expect(legPatternAt('fishnet', 0, 0)).toBe(true);
    expect(legPatternAt('fishnet', 1, 0)).toBe(false);
    expect(legPatternAt('stripes', 3, 2)).toBe(true);
    expect(legPatternAt('stripes', 3, 3)).toBe(false);
  });

  it('ogrodniczka: biała góra, śliniaczek na środku w kolorze sukienki', () => {
    const { src, mask } = sprite(ROWS);
    const d = findCloth('kawaii_overall')!;
    const r = dressPixels(src, mask, META, out({ dress: 'kawaii_overall' }), plain)!;
    expect(rgbAt(r.px, 2, 2)).toEqual(hex(d.upper![1])); // bok góry
    expect(rgbAt(r.px, 4, 3)).toEqual(hex(d.bib!)); // środek dolnej części góry
  });

  it('ozdoba z arkusza: części z dostawcy obrazków; bez obrazka — bez ozdoby', () => {
    const { src, mask } = sprite(ROWS);
    const art = (name: string) => (name === 'hat_bear' ? artPixels(['kkk', 'kyk']) : null);
    const r = dressPixels(src, mask, META, out({ head: 'head_bear' }), { ...plain, art })!;
    expect(r.px.h).toBeGreaterThan(9);
    const none = dressPixels(src, mask, META, out({ head: 'head_bear' }), plain)!;
    expect(none.px.h).toBe(9);
  });

  it('kaptur bluzy-sukienki, gdy na głowie nic nie ma; ozdoba głowy ma pierwszeństwo', () => {
    expect(headwearOf(out({ dress: 'kawaii_bunny' }))?.id).toBe('kawaii_bunny');
    expect(headwearOf(out({ dress: 'kawaii_bunny', head: 'head_crown' }))?.id).toBe('head_crown');
    expect(headwearOf(out({ dress: 'dress_dots' }))).toBeNull();
    expect(HEAD_FIT.bunny_hood).toBeDefined();
  });
});
