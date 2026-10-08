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
  /** Klatka od tyłu (bez znaczka na piersi). */
  back?: boolean;
  /** Dopełnianie maski po kolorach (domyślnie tak; nie w klatkach z czarnym kotem w ramionach). */
  flood?: boolean;
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

/** Poza siedząca/leżąca/kucająca (lista albo nowe arkusze: siedzenie, stół, leżenie, TV, głaskanie kota). */
export function isSeated(name: string): boolean {
  return SEATED_FRAMES.has(name) || /^(sit_|table_|nap_|lie_|tv_|console_|cat_pet_)/.test(name);
}

/** Klatki od tyłu: bez znaczków z przodu koszulki (serduszko, czaszka). */
export function isBackView(name: string): boolean {
  return /^(back_|tv_|console_)/.test(name) || name === 'turn_back';
}

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
  if (mask && meta.mask) recolorBody(src, mask, res.px, meta, look, opts.seated, opts.back === true, opts.flood !== false);
  const headwear = headwearOf(look);
  if (opts.hat && headwear && meta.head && !meta.noHat) {
    // Klatki z drobniejszymi pikselami (gładkie arkusze, skala ~0,45) — ozdoba powiększona, żeby w grze była tej samej wielkości.
    const f = hatFactor(meta.scale);
    for (const part of hatParts(headwear, opts)) {
      res = addHat(res.px, res.meta, scalePixels(part.art, f), { overlap: part.fit.overlap * f, dx: part.fit.dx });
    }
  }
  return res;
}

/** Skala klatek, dla których rysowano ozdoby (px natywne ≈ 0,9–1,5 px logicznego). */
const HAT_REF_SCALE = 0.93;

/** Całkowite powiększenie ozdoby dla klatki o skali `scale` (zwykłe klatki: 1). */
export function hatFactor(scale: number): number {
  return Math.max(1, Math.round(HAT_REF_SCALE / scale));
}

/** Powiększenie pikseli całkowitym czynnikiem (najbliższy sąsiad). */
export function scalePixels(px: Pixels, f: number): Pixels {
  if (f === 1) return px;
  const w = px.w * f;
  const h = px.h * f;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((Math.floor(y / f) * px.w) + Math.floor(x / f)) * 4;
      data.set(px.data.subarray(s, s + 4), (y * w + x) * 4);
    }
  }
  return { w, h, data };
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

function recolorBody(src: Pixels, mask: Pixels, out: Pixels, meta: FrameMeta, look: Look, seated: boolean, back: boolean, flood: boolean): void {
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
  for (const i of jeans) taken.add(i);
  // Fragmenty ubrania poza maską (koszulka za ramieniem, dolne nogawki na nowych arkuszach): piksele w kolorach
  // koszulki/dżinsów stykające się z wykrytym ubraniem dołączają do niego — strój nie prześwituje oryginałem.
  if (flood) {
    const jeansTop = jeans.length > 0 ? Math.min(...jeans.map((i) => Math.floor(i / w))) : h;
    const nearShirt = near(shirt, w, h, 3);
    const moreShirt = colourFlood(src, taken, shirt, (i) => Math.floor(i / w) < jeansTop && nearShirt.has(i));
    shirt.push(...moreShirt);
    for (const i of moreShirt) taken.add(i);
    // bez strefy butów (czarne buty mają kolor dolnych nogawek)
    const foot = meta.foot ?? h;
    const shoeTop = foot - Math.max(2, Math.round(foot * 0.085));
    jeans.push(...colourFlood(src, taken, jeans, (i) => Math.floor(i / w) >= jeansTop && Math.floor(i / w) < shoeTop));
  }
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
    if (stamp && upper.patternColor && !back) stampAt(out, w, all, print, hex(upper.patternColor), stamp);
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
    if (!skirtLike) {
      for (const i of jeans) setPx(out, i, clothColor(lower, toneOf(lumAt(i), ref), i % w, Math.floor(i / w)));
    } else if (seated) {
      seatedSkirt(src, out, jeans, lower, ref);
    } else {
      skirt(src, out, jeans, lower, ref, meta, look.dress !== null);
    }
  }
}

/**
 * Rozlewanie regionu po kolorach: piksele (nie kontur, nie zajęte), których kolor należy do kolorów regionu
 * (występujących w nim co najmniej 3 razy), osiągalne 4-sąsiedztwem od regionu i spełniające `allowed`.
 */
export function colourFlood(src: Pixels, taken: ReadonlySet<number>, region: readonly number[], allowed: (i: number) => boolean): number[] {
  const { w, h, data } = src;
  if (region.length === 0) return [];
  const key = (i: number) => (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
  const counts = new Map<number, number>();
  for (const i of region) counts.set(key(i), (counts.get(key(i)) ?? 0) + 1);
  const colours = new Set([...counts].filter(([, n]) => n >= 3).map(([k]) => k));
  const seen = new Set(region);
  const queue = [...region];
  const found: number[] = [];
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j < 0 || j >= w * h || seen.has(j)) continue;
      seen.add(j);
      if (taken.has(j) || data[j * 4 + 3] === 0 || !colours.has(key(j)) || !allowed(j)) continue;
      if (lum(data[j * 4], data[j * 4 + 1], data[j * 4 + 2]) < 8) continue; // czarny kontur
      found.push(j);
      queue.push(j);
    }
  }
  return found;
}

/** Piksele w odległości (Czebyszewa) co najwyżej `r` od regionu. */
function near(region: readonly number[], w: number, h: number, r: number): Set<number> {
  const out = new Set<number>();
  for (const i of region) {
    const x = i % w;
    const y = Math.floor(i / w);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) out.add(ny * w + nx);
      }
    }
  }
  return out;
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

/** Długość spódnicy (ułamek długości nóg od pasa): sukienka za kolano, spódnica do połowy uda. */
export const DRESS_LENGTH = 0.56;
export const SKIRT_LENGTH = 0.5;

/**
 * Spódnica/sukienka w kształcie litery A: od pasa (góra dżinsów) do rąbka (ułamek długości nóg + `hemDrop`),
 * coraz szersza w dół (`flare` — ok. 1/4 szerokości bioder na stronę), z bocznym konturem i rąbkiem. Malowane są tylko
 * piksele „ubraniowe” (przezroczyste, ciemne, dżinsy) — dłonie przed spódnicą zostają. Pod rąbkiem nogi: dżinsy
 * i ciemne nogawki (na nowych arkuszach poza maską) zamienione na skórę albo rajstopy/skarpetki.
 */
function skirt(src: Pixels, out: Pixels, jeans: number[], def: ClothDef, ref: number, meta: FrameMeta, dress: boolean): void {
  const { w, h } = src;
  const rows = rowsOf(jeans, w);
  const jeansSet = new Set(jeans);
  const lumOf = (i: number) => lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]);
  const alpha = (i: number) => src.data[i * 4 + 3];
  // ubranie/nogawka/tło — wolno zamalować; jasne (dłonie, skóra, białe podeszwy) zostają
  const paintable = (i: number) => alpha(i) === 0 || jeansSet.has(i) || lumOf(i) < 95;
  const waist = Math.min(...rows.keys());
  const lastJeans = Math.max(...rows.keys());
  const foot = Math.min(h - 1, (meta.foot ?? h) - 1);
  const shoe = Math.max(2, Math.round((foot - waist) * 0.12));
  const legEnd = Math.max(lastJeans, foot - shoe);
  const legLen = Math.max(2, legEnd - waist);
  const hem = Math.min(legEnd - 1, waist + Math.round(legLen * (dress ? DRESS_LENGTH : SKIRT_LENGTH)) + (def.hemDrop ?? 0));
  // biodra: najszerszy wiersz w górnej części nogawek (pierwszy wiersz maski bywa wąski — pasek, dłonie)
  let hip = rows.get(waist)!;
  for (let y = waist; y <= waist + Math.max(2, Math.round((lastJeans - waist) * 0.3)); y++) {
    const r = rows.get(y);
    if (r && r.max - r.min > hip.max - hip.min) hip = r;
  }
  const flareMax = Math.max(3, Math.round((hip.max - hip.min + 1) * 0.45));
  const setIf = (x: number, y: number, c: RGB) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = y * w + x;
    if (paintable(i)) setPx(out, i, c);
  };

  let base = { min: hip.min, max: hip.max };
  let last = { L: hip.min, R: hip.max };
  for (let y = waist; y <= hem; y++) {
    const r = rows.get(y);
    if (r) base = { min: r.min, max: r.max };
    // rozkloszowanie rośnie w dół szybciej przy rąbku (kształt dzwonu)
    const t = (y - waist) / Math.max(1, hem - waist);
    const f = Math.round(flareMax * t * (0.6 + 0.4 * t));
    const L = Math.max(0, Math.min(base.min, hip.min - f));
    const R = Math.min(w - 1, Math.max(base.max, hip.max + f));
    const frill = def.hem !== undefined && y >= hem - 1;
    for (let x = L; x <= R; x++) {
      const i = y * w + x;
      if (!paintable(i)) continue;
      // gładki materiał (bez śladu nogawek): światło z lewej, cień z prawej, zakładki rozchodzące się w dół
      let tone: 0 | 1 | 2 = 1;
      if (x <= L + 1) tone = 0;
      else if (x >= R - 1) tone = 2;
      else if (y > waist + (hem - waist) / 3 && pleatAt(x, L, R)) tone = 2;
      let c = clothColor(def, tone, x, y);
      if (frill) c = trim(def.hem!, tone);
      else if (def.apron && y > waist + 1 && x > L + 1 && x < R - 1 && inCentre(x, { min: L, max: R }, 0.45)) c = trim(def.apron, tone === 2 ? 1 : tone);
      setPx(out, i, c);
    }
    setIf(L - 1, y, OUTLINE);
    setIf(R + 1, y, OUTLINE);
    last = { L, R };
  }
  // rąbek
  for (let x = last.L - 1; x <= last.R + 1; x++) setIf(x, hem + 1, OUTLINE);
  // nogi pod rąbkiem: dżinsy i ciemne nogawki (nie kontur) w obrębie nóg
  base = rows.get(Math.min(lastJeans, hem)) ?? base;
  for (let y = hem + 2; y <= legEnd; y++) {
    const r = rows.get(y);
    if (r) base = { min: r.min, max: r.max };
    for (let x = Math.max(0, base.min - 1); x <= Math.min(w - 1, base.max + 1); x++) {
      const i = y * w + x;
      const l = lumOf(i);
      if (alpha(i) === 0) continue;
      if (jeansSet.has(i) || (l >= 24 && l < 95)) setPx(out, i, legColor(def.legs, toneOf(l, ref), x, y));
    }
  }
}

/** Zakładka spódnicy: co ~1/4 szerokości (bez skrajnych kolumn). */
function pleatAt(x: number, L: number, R: number): boolean {
  const span = R - L;
  if (span < 8) return false;
  for (let k = 1; k <= 3; k++) if (x === L + Math.round((span * k) / 4)) return true;
  return false;
}

/**
 * Sukienka/spódnica w pozie siedzącej: górna część nogawek (uda) w kolorze ubrania z rąbkiem, dolna (łydki) — nogi.
 */
function seatedSkirt(src: Pixels, out: Pixels, jeans: number[], def: ClothDef, ref: number): void {
  const { w } = src;
  const ys = jeans.map((i) => Math.floor(i / w));
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const split = top + Math.round((bottom - top) * 0.55);
  const lumOf = (i: number) => lum(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]);
  for (const i of jeans) {
    const y = Math.floor(i / w);
    const x = i % w;
    const tone = toneOf(lumOf(i), ref);
    if (y < split) setPx(out, i, def.hem !== undefined && y >= split - 1 ? trim(def.hem, tone) : clothColor(def, tone, x, y));
    else if (y === split) setPx(out, i, OUTLINE);
    else setPx(out, i, legColor(def.legs, tone, x, y));
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
