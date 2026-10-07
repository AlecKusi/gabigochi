import { ICONS } from '../art/icons';
import { PALETTE, type PixelArt } from '../art/pixels';
import type { Outfit } from '../core/types';
import type { FrameMeta } from '../sprites/loader';
import { findCloth, type ClothColors, type ClothDef, type ClothPattern, type LegWear } from './catalog';

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
  /** Obrazki ozdób z arkusza (`HeadSprite.sprite`); brak — ozdoby z arkusza pomijane. */
  art?: (sprite: string) => Pixels | null;
}

/** Kolory i wzór do malowania jednego kawałka ubrania. */
interface Paint {
  colors: ClothColors;
  pattern?: ClothPattern;
  patternColor?: string;
}

/** Klatki, w których nogi nie stoją pionowo — wiersz kolan nic tu nie znaczy. */
export const SEATED_FRAMES: ReadonlySet<string> = new Set([
  'drag_4', 'tired_4', 'tired_5', 'hunger_5', 'crochet_1', 'crochet_2', 'crochet_3', 'crochet_4', 'crochet_5',
  'sit_crochet_1', 'sit_crochet_2', 'sit_crochet_3', 'sit_crochet_4', 'sit_crochet_5',
]);

/** Skóra nóg pod spódnicą: jasny, średni (ten sam — bez pasków po nogawkach), cień. */
export const SKIN: readonly [RGB, RGB, RGB] = [hex('#facab1'), hex('#facab1'), hex('#da9588')];
/** Kontur rysunku (najciemniejszy kolor arkuszy). */
export const OUTLINE: RGB = hex('#030205');

/** Jak ozdoba z ikony siedzi na głowie: ile wierszy nachodzi na włosy i przesunięcie w bok (ułamek szerokości głowy). */
export const HEAD_FIT: Readonly<Record<string, { overlap: number; dx: number }>> = {
  hat_party: { overlap: 3, dx: 0.1 },
  crown: { overlap: 2, dx: 0 },
  cat_ears: { overlap: 3, dx: 0 },
  flower: { overlap: 4, dx: 0.3 },
  beret: { overlap: 4, dx: 0.1 },
  bow: { overlap: 2, dx: 0.25 },
  bunny_hood: { overlap: 10, dx: 0 },
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

/** Czy wzór zapala piksel (x, y) (współrzędne klatki). Serduszko i czaszka to jeden znaczek na piersi. */
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
    case 'rips':
      // rzadkie, krótkie poziome rozdarcia (2 px)
      return (x * 5 + y * 13) % 37 === 0 || ((x - 1) * 5 + y * 13) % 37 === 0;
    case 'hearts':
    case 'skull':
      return false;
  }
}

/** Wzór rajstop/skarpetek: kabaretki — ukośna kratka, skarpetki — paski co drugi wiersz. */
export function legPatternAt(p: NonNullable<LegWear['pattern']>, x: number, y: number): boolean {
  return p === 'fishnet' ? (x + y) % 4 === 0 || (x - y + 4000) % 4 === 0 : y % 2 === 0;
}

/** Znaczki na piersi: serduszko 3×3, czaszka 5×4. */
const STAMPS: Partial<Record<ClothPattern, readonly string[]>> = {
  hearts: ['x.x', 'xxx', '.x.'],
  skull: ['.xxx.', 'x.x.x', 'xxxxx', '.x.x.'],
};

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

/** Co nosi głowa: ozdoba ze slotu głowy, a bez niej — kaptur sukienki (bluza z uszkami). */
export function headwearOf(look: Look): ClothDef | null {
  const has = (d: ClothDef | null) => d !== null && (d.headArt !== undefined || (d.headSprites?.length ?? 0) > 0);
  if (has(look.head)) return look.head;
  return has(look.dress) ? look.dress : null;
}

/** Czy strój w ogóle zmienia tę klatkę. */
export function changesFrame(meta: FrameMeta, look: Look, opts: DressOpts): boolean {
  const body = meta.mask === true && (look.top !== null || look.bottom !== null || look.dress !== null);
  const hat = opts.hat && headwearOf(look) !== null && meta.head !== undefined && !meta.noHat;
  return body || hat;
}

/** Części ozdoby głowy gotowe do doklejenia (ikona albo obrazki z arkusza). */
function hatParts(def: ClothDef, opts: DressOpts): { art: Pixels; fit: { overlap: number; dx: number } }[] {
  if (def.headArt) {
    const art = ICONS[def.headArt] as PixelArt | undefined;
    return art ? [{ art: artPixels(art), fit: HEAD_FIT[def.headArt] ?? { overlap: 2, dx: 0 } }] : [];
  }
  const parts: { art: Pixels; fit: { overlap: number; dx: number } }[] = [];
  for (const s of def.headSprites ?? []) {
    const art = opts.art?.(s.sprite);
    if (art) parts.push({ art, fit: { overlap: s.overlap, dx: s.dx } });
  }
  return parts;
}

/**
 * Klatka w stroju albo `null`, gdy strój jej nie zmienia (rysujemy oryginał).
 * `mask` może być `null` (klatka bez maski — wtedy tylko ozdoba głowy).
 */
export function dressPixels(src: Pixels, mask: Pixels | null, meta: FrameMeta, look: Look, opts: DressOpts): { px: Pixels; meta: FrameMeta } | null {
  if (!changesFrame(meta, look, opts)) return null;
  let res = { px: { w: src.w, h: src.h, data: new Uint8ClampedArray(src.data) } as Pixels, meta };
  if (mask && meta.mask) recolorBody(src, mask, res.px, meta, look, opts.seated);
  const headwear = headwearOf(look);
  if (opts.hat && headwear && meta.head && !meta.noHat) {
    for (const part of hatParts(headwear, opts)) res = addHat(res.px, res.meta, part.art, part.fit);
  }
  return res;
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

/** Kolor dodatku (kołnierz, fartuszek…) w tonie: w cieniu przygaszony. */
function trim(color: string, tone: 0 | 1 | 2): RGB {
  const c = hex(color);
  return tone === 2 ? [Math.round(c[0] * 0.72), Math.round(c[1] * 0.72), Math.round(c[2] * 0.76)] : c;
}

/** Kolor ubrania dla tonu, z wzorem (na ciemnym tonie wzór przygaszony). */
function clothColor(p: Paint, tone: 0 | 1 | 2, x: number, y: number): RGB {
  const base = hex(p.colors[tone]);
  if (p.pattern && p.patternColor && patternAt(p.pattern, x, y)) {
    const pc = hex(p.patternColor);
    return tone === 2 ? mix(pc, base) : pc;
  }
  return base;
}

/** Nogi pod rąbkiem: skóra albo rajstopy/skarpetki. */
function legColor(legs: LegWear | undefined, tone: 0 | 1 | 2, x: number, y: number): RGB {
  if (!legs) return SKIN[tone];
  if (legs.pattern && legs.patternColor && legPatternAt(legs.pattern, x, y)) return hex(legs.patternColor);
  return hex(legs.colors[tone]);
}

/** Wiersze regionu: najmniejsze i największe x w każdym wierszu. */
function rowsOf(idx: readonly number[], w: number): Map<number, { min: number; max: number }> {
  const rows = new Map<number, { min: number; max: number }>();
  for (const i of idx) {
    const x = i % w;
    const y = Math.floor(i / w);
    const r = rows.get(y);
    if (!r) rows.set(y, { min: x, max: x });
    else {
      r.min = Math.min(r.min, x);
      r.max = Math.max(r.max, x);
    }
  }
  return rows;
}

/** Czy piksel leży w środkowym pasie wiersza (śliniaczek, fartuszek): `frac` szerokości wiersza. */
function inCentre(x: number, r: { min: number; max: number }, frac: number): boolean {
  const c = (r.min + r.max) / 2;
  const half = Math.max(1, ((r.max - r.min + 1) * frac) / 2);
  return Math.abs(x - c) <= half;
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
    const paint: Paint = look.dress?.upper ? { colors: look.dress.upper } : upper;
    const ref = medianLum(src, shirt);
    // Ciemne kreski grafiki przy nadruku to nie fałdy — na gładkiej koszulce byłyby kropkami brudu.
    const printSet = new Set(print);
    const nearPrint = (i: number) => printSet.has(i - 1) || printSet.has(i + 1) || printSet.has(i - w) || printSet.has(i + w);
    const tones = new Map<number, 0 | 1 | 2>();
    for (const i of shirt) tones.set(i, nearPrint(i) ? 1 : toneOf(lumAt(i), ref));
    for (const i of print) tones.set(i, 1);
    const all = [...shirt, ...print];
    for (const i of all) setPx(out, i, clothColor(paint, tones.get(i)!, i % w, Math.floor(i / w)));
    const stamp = upper.pattern ? STAMPS[upper.pattern] : undefined;
    if (stamp && upper.patternColor) stampAt(out, w, all, print, hex(upper.patternColor), stamp);
    // dodatki: śliniaczek / chusta, gorset, kołnierzyk
    const rows = rowsOf(all, w);
    const ys = [...rows.keys()];
    if (ys.length > 0) {
      const top = Math.min(...ys);
      const bot = Math.max(...ys);
      const bibFrom = top + Math.round((bot - top) * 0.35);
      for (const i of all) {
        const x = i % w;
        const y = Math.floor(i / w);
        const tone = tones.get(i)!;
        if (look.dress?.bib && y >= bibFrom && inCentre(x, rows.get(y)!, 0.4)) setPx(out, i, trim(look.dress.bib, tone));
        if (look.dress?.waist && y >= bot - 2) setPx(out, i, trim(look.dress.waist, tone));
        if (look.dress?.collar && y <= top + 1) setPx(out, i, trim(look.dress.collar, tone));
      }
    }
  }

  if (lower && jeans.length > 0) {
    const ref = medianLum(src, jeans);
    const skirtLike = look.dress !== null || lower.cut === 'skirt';
    const knee = meta.knee;
    if (!skirtLike || seated || knee === undefined) {
      for (const i of jeans) setPx(out, i, clothColor(lower, toneOf(lumAt(i), ref), i % w, Math.floor(i / w)));
    } else {
      const lastJeans = Math.max(...jeans.map((i) => Math.floor(i / w)));
      const hemRow = Math.min(knee + (lower.hemDrop ?? 0), Math.max(knee, lastJeans - 1));
      skirt(src, out, jeans, lower, ref, hemRow);
    }
  }
}

/** Znaczek (serduszko, czaszka) na środku nadruku (albo piersi, gdy klatka nie ma nadruku). */
function stampAt(out: Pixels, w: number, chest: number[], print: number[], color: RGB, shape: readonly string[]): void {
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
  const ox = Math.floor(shape[0].length / 2);
  const oy = Math.floor(shape.length / 2);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 'x') continue;
      const i = (cy - oy + r) * w + (cx - ox + c);
      if (inChest.has(i)) setPx(out, i, color);
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

/**
 * Spódnica: od pasa do wiersza nad rąbkiem pas między skrajnymi pikselami nogawek w kolorze ubrania (szpara między
 * nogami — fałd w ciemnym tonie), dwa dolne wiersze poszerzone o piksel na stronę (falbana w kolorze `hem`),
 * fartuszek na środku, w wierszu `hemRow` rąbek (kontur), niżej nogawki zamienione na nogi (skóra albo rajstopy).
 */
function skirt(src: Pixels, out: Pixels, jeans: number[], def: ClothDef, ref: number, hemRow: number): void {
  const { w, h } = src;
  const rows = rowsOf(jeans, w);
  const jeansSet = new Set(jeans);
  const waist = Math.min(...rows.keys());
  const lastRow = Math.max(waist, hemRow - 1);
  const flare = (y: number) => (y >= lastRow - 1 ? 1 : 0);
  // Piksel, który wolno nadpisać poszerzeniem: przezroczysty albo konturowy (nie dłoń, nie skóra).
  const free = (i: number) => src.data[i * 4 + 3] === 0 || lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]) < 24;
  const lumOf = (i: number) => lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]);
  let hem: { min: number; max: number } | null = null;
  for (let y = waist; y <= lastRow; y++) {
    const r: { min: number; max: number } | null = rows.get(y) ?? hem;
    if (!r) continue;
    const f = flare(y);
    const min = r.min - f;
    const max = r.max + f;
    const frill = def.hem !== undefined && y >= lastRow - 1;
    for (let x = Math.max(0, min); x <= Math.min(w - 1, max); x++) {
      const i = y * w + x;
      let tone: 0 | 1 | 2;
      if (jeansSet.has(i)) tone = toneOf(lumOf(i), ref);
      else if (x >= r.min && x <= r.max) tone = 2; // fałd między nogami
      else if (free(i)) tone = 1;
      else continue;
      let c = clothColor(def, tone, x, y);
      if (frill) c = trim(def.hem!, tone);
      else if (def.apron && y > waist && inCentre(x, r, 0.5)) c = trim(def.apron, tone === 2 ? 1 : tone);
      setPx(out, i, c);
    }
    if (f) {
      for (const x of [min - 1, max + 1]) if (x >= 0 && x < w && free(y * w + x)) setPx(out, y * w + x, OUTLINE);
    }
    hem = { min: r.min, max: r.max };
  }
  // rąbek
  if (hem && hemRow < h) {
    for (let x = Math.max(0, hem.min - 2); x <= Math.min(w - 1, hem.max + 2); x++) {
      const i = hemRow * w + x;
      if (jeansSet.has(i) || free(i)) setPx(out, i, OUTLINE);
    }
  }
  // nogi poniżej rąbka
  for (const i of jeans) {
    const y = Math.floor(i / w);
    if (y <= hemRow) continue;
    setPx(out, i, legColor(def.legs, toneOf(lumOf(i), ref), i % w, y));
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
  const padBottom = Math.max(0, ay + art.h - px.h);
  const w = px.w + padLeft + padRight;
  const h = px.h + padTop + padBottom;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < px.h; y++) {
    data.set(px.data.subarray(y * px.w * 4, (y + 1) * px.w * 4), ((y + padTop) * w + padLeft) * 4);
  }
  for (let y = 0; y < art.h; y++) {
    for (let x = 0; x < art.w; x++) {
      const s = (y * art.w + x) * 4;
      const a = art.data[s + 3];
      if (a === 0) continue;
      const d = ((ay + padTop + y) * w + (ax + padLeft + x)) * 4;
      if (a === 255) data.set(art.data.subarray(s, s + 4), d);
      else {
        // półprzezroczysty welon: mieszanie z tym, co pod spodem
        const t = a / 255;
        for (let k = 0; k < 3; k++) data[d + k] = Math.round(art.data[s + k] * t + data[d + k] * (1 - t));
        data[d + 3] = Math.max(data[d + 3], a);
      }
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
