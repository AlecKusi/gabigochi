import { ICONS } from '../art/icons';
import { PALETTE, type PixelArt } from '../art/pixels';
import type { Outfit } from '../core/types';
import type { FrameMeta } from '../sprites/loader';
import { findCloth, type ClothDef, type ClothPattern } from './catalog';

/**
 * „Ubieralnia”: składa klatkę postaci w wybranym stroju z oryginalnej klatki i jej maski (R = koszulka, G = nadruk,
 * B = dżinsy). Czysta logika na tablicach pikseli RGBA — bez canvasa, więc da się ją testować.
 */

/** Obrazek RGBA (jak `ImageData`). */
export interface Pixels {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

type RGB = readonly [number, number, number];

/** Strój rozwinięty do definicji ubrań (sukienka wyklucza koszulkę i dół). */
export interface Look {
  head: ClothDef | null;
  top: ClothDef | null;
  bottom: ClothDef | null;
  dress: ClothDef | null;
}

export interface DressOpts {
  /** Czy doklejać ozdobę głowy (np. nogi do popiersia — bez). */
  hat: boolean;
  /** Poza siedząca/leżąca: spódnica przemalowana w całości, bez zamiany nogawek na nogi. */
  seated: boolean;
}

/** Klatki, w których nogi nie stoją pionowo — wiersz kolan nic tu nie znaczy. */
export const SEATED_FRAMES: ReadonlySet<string> = new Set([
  'drag_4', 'tired_4', 'tired_5', 'hunger_5', 'crochet_1', 'crochet_2', 'crochet_3', 'crochet_4', 'crochet_5',
]);

/** Skóra nóg pod spódnicą: jasny, średni (ten sam — bez pasków po nogawkach), cień. */
export const SKIN: readonly [RGB, RGB, RGB] = [hex('#facab1'), hex('#facab1'), hex('#da9588')];
/** Kontur rysunku (najciemniejszy kolor arkuszy). */
export const OUTLINE: RGB = hex('#030205');

/** Jak ozdoba siedzi na głowie: ile wierszy nachodzi na włosy i przesunięcie w bok (ułamek szerokości głowy). */
export const HEAD_FIT: Readonly<Record<string, { overlap: number; dx: number }>> = {
  hat_party: { overlap: 3, dx: 0.1 },
  crown: { overlap: 2, dx: 0 },
  cat_ears: { overlap: 3, dx: 0 },
  flower: { overlap: 4, dx: 0.3 },
  beret: { overlap: 4, dx: 0.1 },
  bow: { overlap: 2, dx: 0.25 },
};

export function hex(c: string): RGB {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

export function lookOf(outfit: Outfit): Look {
  const get = (id: string | null) => (id ? (findCloth(id) ?? null) : null);
  const dress = get(outfit.dress);
  return { head: get(outfit.head), top: dress ? null : get(outfit.top), bottom: dress ? null : get(outfit.bottom), dress };
}

/** Czy wzór zapala piksel (x, y) (współrzędne klatki). Serduszko to jeden znaczek na piersi — nie powtarza się. */
export function patternAt(p: ClothPattern, x: number, y: number): boolean {
  switch (p) {
    case 'dots':
      return y % 3 === 1 && (x + (Math.floor(y / 3) % 2) * 2) % 4 === 1;
    case 'flowers':
      return y % 4 === 1 && (x + (Math.floor(y / 4) % 2) * 3) % 5 === 1;
    case 'stripes':
      return y % 3 === 0;
    case 'checks':
      return x % 4 === 0 || y % 4 === 0;
    case 'hearts':
      return false;
  }
}

/** Serduszko 5×4 (środek w kolumnie 2, wiersz 1). */
const HEART = ['x.x', 'xxx', '.x.'];

/**
 * Ton piksela regionu: 0 jasny, 1 średni, 2 ciemny — względem mediany jasności regionu (najczęstszy kolor = średni).
 * `ref` = mediana jasności pikseli regionu.
 */
export function toneOf(l: number, ref: number): 0 | 1 | 2 {
  if (l > ref + 6) return 0;
  if (l < ref - 6) return 2;
  return 1;
}

export function medianLum(src: Pixels, idx: number[]): number {
  if (idx.length === 0) return 0;
  const ls = idx.map((i) => lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2])).sort((a, b) => a - b);
  return ls[Math.floor(ls.length / 2)];
}

/** Pikselowy obrazek ozdoby z ikony (paleta `PALETTE`). */
export function artPixels(art: PixelArt): Pixels {
  const w = art[0].length;
  const h = art.length;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = art[y][x];
      if (ch === '.') continue;
      const [r, g, b] = hex(PALETTE[ch]);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return { w, h, data };
}

/** Czy strój w ogóle zmienia tę klatkę. */
export function changesFrame(meta: FrameMeta, look: Look, opts: DressOpts): boolean {
  const body = meta.mask === true && (look.top !== null || look.bottom !== null || look.dress !== null);
  const hat = opts.hat && look.head?.headArt !== undefined && meta.head !== undefined && !meta.noHat;
  return body || hat;
}

/**
 * Klatka w stroju albo `null`, gdy strój jej nie zmienia (rysujemy oryginał).
 * `mask` może być `null` (klatka bez maski — wtedy tylko ozdoba głowy).
 */
export function dressPixels(src: Pixels, mask: Pixels | null, meta: FrameMeta, look: Look, opts: DressOpts): { px: Pixels; meta: FrameMeta } | null {
  if (!changesFrame(meta, look, opts)) return null;
  const out: Pixels = { w: src.w, h: src.h, data: new Uint8ClampedArray(src.data) };
  if (mask && meta.mask) recolorBody(src, mask, out, meta, look, opts.seated);
  if (opts.hat && look.head?.headArt && meta.head && !meta.noHat) {
    const art = ICONS[look.head.headArt] as PixelArt | undefined;
    if (art) return addHat(out, meta, artPixels(art), HEAD_FIT[look.head.headArt] ?? { overlap: 2, dx: 0 });
  }
  return { px: out, meta };
}

function setPx(px: Pixels, i: number, c: RGB): void {
  px.data[i * 4] = c[0];
  px.data[i * 4 + 1] = c[1];
  px.data[i * 4 + 2] = c[2];
  px.data[i * 4 + 3] = 255;
}

function mix(a: RGB, b: RGB): RGB {
  return [(a[0] + b[0]) >> 1, (a[1] + b[1]) >> 1, (a[2] + b[2]) >> 1];
}

/** Kolor ubrania dla tonu, z wzorem (na ciemnym tonie wzór przygaszony). */
function clothColor(def: ClothDef, tone: 0 | 1 | 2, x: number, y: number): RGB {
  const base = hex(def.colors[tone]);
  if (def.pattern && def.patternColor && patternAt(def.pattern, x, y)) {
    const pc = hex(def.patternColor);
    return tone === 2 ? mix(pc, base) : pc;
  }
  return base;
}

function recolorBody(src: Pixels, mask: Pixels, out: Pixels, meta: FrameMeta, look: Look, seated: boolean): void {
  const { w, h } = src;
  const shirt: number[] = [];
  const print: number[] = [];
  const jeans: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (src.data[i * 4 + 3] === 0) continue;
    if (mask.data[i * 4] > 127) shirt.push(i);
    else if (mask.data[i * 4 + 1] > 127) print.push(i);
    else if (mask.data[i * 4 + 2] > 127) jeans.push(i);
  }
  // Okruchy, które maska pominęła (pojedyncze piksele nadruku/szwów otoczone ubraniem), dołączamy do regionu.
  const lumAt = (i: number) => lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]);
  const taken = new Set([...shirt, ...print, ...jeans]);
  print.push(...strays(src, taken, new Set([...shirt, ...print])));
  for (const i of print) taken.add(i);
  jeans.push(...strays(src, taken, new Set(jeans)));
  const upper = look.dress ?? look.top;
  const lower = look.dress ?? look.bottom;

  if (upper) {
    const ref = medianLum(src, shirt);
    // Ciemne kreski grafiki przy nadruku to nie fałdy — na gładkiej koszulce byłyby kropkami brudu.
    const printSet = new Set(print);
    const nearPrint = (i: number) => printSet.has(i - 1) || printSet.has(i + 1) || printSet.has(i - w) || printSet.has(i + w);
    for (const i of shirt) setPx(out, i, clothColor(upper, nearPrint(i) ? 1 : toneOf(lumAt(i), ref), i % w, Math.floor(i / w)));
    for (const i of print) setPx(out, i, clothColor(upper, 1, i % w, Math.floor(i / w)));
    if (upper.pattern === 'hearts' && upper.patternColor) stampHeart(out, w, [...shirt, ...print], print, hex(upper.patternColor));
  }

  if (lower && jeans.length > 0) {
    const ref = medianLum(src, jeans);
    const skirtLike = look.dress !== null || lower.cut === 'skirt';
    const knee = meta.knee;
    if (!skirtLike || seated || knee === undefined) {
      for (const i of jeans) setPx(out, i, clothColor(lower, toneOf(lumAt(i), ref), i % w, Math.floor(i / w)));
    } else {
      skirt(src, out, jeans, lower, ref, knee);
    }
  }
}

/**
 * Piksele spoza maski (nie kontur, nieprzezroczyste), których co najmniej 3 z 4 sąsiadów należy do regionu —
 * dwa przebiegi, żeby domknąć dwupikselowe dziury.
 */
export function strays(src: Pixels, taken: ReadonlySet<number>, region: ReadonlySet<number>): number[] {
  const { w, h, data } = src;
  const inRegion = new Set(region);
  const found: number[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const add: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (taken.has(i) || inRegion.has(i) || data[i * 4 + 3] === 0) continue;
        if (lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < 24) continue;
        const n = [i - 1, i + 1, i - w, i + w].filter((j) => inRegion.has(j)).length;
        if (n >= 3) add.push(i);
      }
    }
    for (const i of add) inRegion.add(i);
    found.push(...add);
  }
  return found;
}

/** Serduszko na środku nadruku (albo piersi, gdy klatka nie ma nadruku). */
function stampHeart(out: Pixels, w: number, chest: number[], print: number[], color: RGB): void {
  const area = print.length >= 4 ? print : chest;
  if (area.length === 0) return;
  let sx = 0;
  let sy = 0;
  for (const i of area) {
    sx += i % w;
    sy += Math.floor(i / w);
  }
  const cx = Math.round(sx / area.length);
  const cy = Math.round(sy / area.length);
  const inChest = new Set(chest);
  for (let r = 0; r < HEART.length; r++) {
    for (let c = 0; c < HEART[r].length; c++) {
      if (HEART[r][c] !== 'x') continue;
      const i = (cy - 1 + r) * w + (cx - 1 + c);
      if (inChest.has(i)) setPx(out, i, color);
    }
  }
}

/**
 * Spódnica: od pasa do wiersza nad kolanami pas między skrajnymi pikselami nogawek w kolorze ubrania (szpara między
 * nogami — fałd w ciemnym tonie), dwa dolne wiersze poszerzone o piksel na stronę, w wierszu kolan rąbek (kontur),
 * niżej nogawki zamienione na gołe nogi.
 */
function skirt(src: Pixels, out: Pixels, jeans: number[], def: ClothDef, ref: number, knee: number): void {
  const { w, h } = src;
  const rows = new Map<number, { min: number; max: number }>();
  const jeansSet = new Set(jeans);
  for (const i of jeans) {
    const x = i % w;
    const y = Math.floor(i / w);
    const r = rows.get(y);
    if (!r) rows.set(y, { min: x, max: x });
    else {
      r.min = Math.min(r.min, x);
      r.max = Math.max(r.max, x);
    }
  }
  const waist = Math.min(...rows.keys());
  const lastRow = Math.max(waist, knee - 1);
  const flare = (y: number) => (y >= lastRow - 1 ? 1 : 0);
  // Piksel, który wolno nadpisać poszerzeniem: przezroczysty albo konturowy (nie dłoń, nie skóra).
  const free = (i: number) => src.data[i * 4 + 3] === 0 || lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]) < 24;
  let hem: { min: number; max: number } | null = null;
  for (let y = waist; y <= lastRow; y++) {
    const r: { min: number; max: number } | null = rows.get(y) ?? hem;
    if (!r) continue;
    const f = flare(y);
    const min = r.min - f;
    const max = r.max + f;
    for (let x = Math.max(0, min); x <= Math.min(w - 1, max); x++) {
      const i = y * w + x;
      if (jeansSet.has(i)) {
        setPx(out, i, clothColor(def, toneOf(lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]), ref), x, y));
      } else if (x >= r.min && x <= r.max) {
        setPx(out, i, clothColor(def, 2, x, y)); // fałd między nogami
      } else if (free(i)) {
        setPx(out, i, clothColor(def, 1, x, y));
      }
    }
    if (f) {
      for (const x of [min - 1, max + 1]) if (x >= 0 && x < w && free(y * w + x)) setPx(out, y * w + x, OUTLINE);
    }
    hem = { min: r.min, max: r.max };
  }
  // rąbek
  if (hem && knee < h) {
    for (let x = Math.max(0, hem.min - 2); x <= Math.min(w - 1, hem.max + 2); x++) {
      const i = knee * w + x;
      if (jeansSet.has(i) || free(i)) setPx(out, i, OUTLINE);
    }
  }
  // gołe nogi poniżej rąbka
  for (const i of jeans) {
    if (Math.floor(i / w) <= knee) continue;
    setPx(out, i, SKIN[toneOf(lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]), ref)]);
  }
}

/** Dokleja ozdobę nad czubkiem głowy; płótno rośnie w górę / na boki, metadane przesunięte o tyle samo. */
export function addHat(px: Pixels, meta: FrameMeta, art: Pixels, fit: { overlap: number; dx: number }): { px: Pixels; meta: FrameMeta } {
  const head = meta.head!;
  const ax = Math.round(head.x + fit.dx * head.w - art.w / 2);
  const ay = head.y + fit.overlap - art.h + 1;
  const padTop = Math.max(0, -ay);
  const padLeft = Math.max(0, -ax);
  const padRight = Math.max(0, ax + art.w - px.w);
  const w = px.w + padLeft + padRight;
  const h = px.h + padTop;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < px.h; y++) {
    data.set(px.data.subarray(y * px.w * 4, (y + 1) * px.w * 4), ((y + padTop) * w + padLeft) * 4);
  }
  for (let y = 0; y < art.h; y++) {
    for (let x = 0; x < art.w; x++) {
      const s = (y * art.w + x) * 4;
      if (art.data[s + 3] === 0) continue;
      data.set(art.data.subarray(s, s + 4), ((ay + padTop + y) * w + (ax + padLeft + x)) * 4);
    }
  }
  return {
    px: { w, h, data },
    meta: {
      ...meta,
      w,
      h,
      anchorX: meta.anchorX + padLeft,
      foot: (meta.foot ?? meta.h) + padTop,
      head: { ...head, x: head.x + padLeft, y: head.y + padTop },
      knee: meta.knee === undefined ? undefined : meta.knee + padTop,
    },
  };
}
