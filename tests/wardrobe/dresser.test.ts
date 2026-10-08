import { describe, expect, it } from 'vitest';
import { defaultOutfit } from '../../src/wardrobe/outfit';
import {
  HEAD_FIT,
  hatFactor,
  scalePixels,
  isBackView,
  isSeated,
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
const COLORS: Record<string, string> = { S: '#1f1e28', s: '#0f0c15', J: '#252b42', L: '#3b4550', o: '#030205', P: '#c3b8cb', k: '#facab1', b: '#2a2433' };

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

  /**
   * Wyższa figurka do kroju spódnicy: koszulka (wiersze 1–7), dłoń przy biodrze (k), nogawki (8–27) ze szparą między
   * nogami, buty (28–29). Pas = 8, nogi do 27 → sukienka do wiersza 19 (rąbek 20), spódnica do 18 (rąbek 19).
   */
  const TALL = [
    '...ooooooooo...',
    '..oSSSSSSSSSo..',
    '..oSSSSPSSSSo..',
    '..oSSSSSSSSSo..',
    '..oSSSSSSSSSo..',
    '..oSSSSSSSSSo..',
    '..oSSSSSSSSSo..',
    '..ooooooooooo..',
    'ok.oJJJJoJJJJo.',
    'ok.oJJJJoJJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...oJJJo.oJJJo.',
    '...obbbo.obbbo.',
    '...ooooo.ooooo.',
  ];
  const TALL_META: FrameMeta = { w: 15, h: 30, anchorX: 7, scale: 1, foot: 30, mask: true, knee: 17, head: { x: 7, y: 0, w: 9 } };
  const clothOf = (id: string) => findCloth(id)!.colors.map((c) => hex(c));

  it('sukienka: litera A do kolan — szpara między nogami zamalowana, dół szerszy niż nogi, rąbek, niżej gołe nogi', () => {
    const { src, mask } = sprite(TALL);
    const r = dressPixels(src, mask, TALL_META, out({ dress: 'dress_evening' }), plain)!;
    const cloth = clothOf('dress_evening');
    // szpara między nogawkami (x 8) w połowie spódnicy — materiał, nie kontur ani przezroczystość
    expect(cloth).toContainEqual(rgbAt(r.px, 8, 13));
    // rozkloszowanie: przy rąbku (wiersz 19) materiał wychodzi poza nogawki (x 3 → x 2)
    expect(cloth).toContainEqual(rgbAt(r.px, 2, 19));
    // rąbek pod spódnicą
    expect(rgbAt(r.px, 6, 20)).toEqual([...OUTLINE]);
    // poniżej rąbka — skóra
    expect(rgbAt(r.px, 5, 24)).toEqual([...SKIN[1]]);
    // dłoń przy biodrze zostaje
    expect(rgbAt(r.px, 1, 8)).toEqual(hex(COLORS.k));
  });

  it('spódnica (dół) krótsza niż sukienka', () => {
    const { src, mask } = sprite(TALL);
    const skirt = dressPixels(src, mask, TALL_META, out({ bottom: 'skirt_purple' }), plain)!;
    const dress = dressPixels(src, mask, TALL_META, out({ dress: 'dress_evening' }), plain)!;
    expect(rgbAt(skirt.px, 6, 19)).toEqual([...OUTLINE]); // rąbek spódnicy
    expect(clothOf('dress_evening')).toContainEqual(rgbAt(dress.px, 6, 19)); // sukienka jeszcze trwa
  });

  it('rajstopy pod sukienką zamiast gołych nóg, falbana w kolorze `hem`', () => {
    const { src, mask } = sprite(TALL);
    const lolita = findCloth('goth_lolita')!;
    const r = dressPixels(src, mask, TALL_META, out({ dress: 'goth_lolita' }), plain)!;
    expect(rgbAt(r.px, 5, 24)).toEqual(hex(lolita.legs!.colors[1]));
    expect(rgbAt(r.px, 6, 19)).toEqual(hex(lolita.hem!));
  });

  it('w pozie siedzącej sukienka okrywa uda, łydki są gołe', () => {
    const { src, mask } = sprite(TALL);
    const r = dressPixels(src, mask, TALL_META, out({ dress: 'dress_evening' }), { hat: true, seated: true })!;
    expect(clothOf('dress_evening')).toContainEqual(rgbAt(r.px, 5, 9)); // udo
    expect(rgbAt(r.px, 5, 26)).toEqual([...SKIN[1]]); // łydka
  });

  it('wzór kropek na materiale sukienki', () => {
    const { src, mask } = sprite(ROWS);
    const d = findCloth('dress_dots')!;
    const r = dressPixels(src, mask, META, out({ dress: 'dress_dots' }), plain)!;
    expect(patternAt('dots', 5, 1)).toBe(true);
    expect(rgbAt(r.px, 5, 1)).toEqual(hex(d.patternColor!));
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

  it('klatki od tyłu bez znaczka na piersi; nowe pozy siedzące i leżące', () => {
    for (const n of ['back_idle', 'tv_2', 'console_4', 'turn_back']) expect(isBackView(n), n).toBe(true);
    expect(isBackView('turn_front')).toBe(false);
    for (const n of ['sit_tea_1', 'table_cake_2', 'nap_1', 'lie_read_2', 'cat_pet_1', 'crochet_3']) expect(isSeated(n), n).toBe(true);
    expect(isSeated('idle_front')).toBe(false);
  });

  it('ozdoba na klatkach z drobniejszymi pikselami jest powiększona', () => {
    expect(hatFactor(1.02)).toBe(1);
    expect(hatFactor(0.84)).toBe(1);
    expect(hatFactor(0.46)).toBe(2);
    const big = scalePixels(artPixels(['k.', '.k']), 2);
    expect([big.w, big.h]).toEqual([4, 4]);
    expect(big.data[(1 * 4 + 1) * 4 + 3]).toBe(255);
    expect(big.data[(0 * 4 + 2) * 4 + 3]).toBe(0);
  });
});
