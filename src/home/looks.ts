import type { RoomId } from '../core/types';

export type LookKind = 'wallpaper' | 'floor';

export const WALL_PATTERNS = ['plain', 'stripes', 'dots', 'hearts', 'checks', 'stars', 'tiles'] as const;
export const FLOOR_PATTERNS = ['boards', 'tiles', 'carpet', 'herringbone'] as const;
export type WallPattern = (typeof WALL_PATTERNS)[number];
export type FloorPattern = (typeof FLOOR_PATTERNS)[number];

/**
 * Tapeta albo podłoga (kupowana raz, używana w dowolnej liczbie pokoi).
 * Kolory tapety: [tło, wzór, listwa przypodłogowa]. Kolory podłogi: [tło, linie/wzór, (opcjonalnie) akcent].
 */
export interface LookDef {
  id: string;
  kind: LookKind;
  name: string;
  price: number;
  pattern: WallPattern | FloorPattern;
  colors: readonly string[];
}

const wall = (id: string, name: string, price: number, pattern: WallPattern, colors: string[]): LookDef =>
  ({ id, kind: 'wallpaper', name, price, pattern, colors });
const floor = (id: string, name: string, price: number, pattern: FloorPattern, colors: string[]): LookDef =>
  ({ id, kind: 'floor', name, price, pattern, colors });

export const LOOKS: readonly LookDef[] = [
  wall('wall_lilac_stripes', 'Lawendowe paski', 0, 'stripes', ['#cdb8f0', '#c2abea', '#7a4fb3']),
  wall('wall_pink_dots', 'Różowe kropki', 0, 'dots', ['#ffd9e8', '#ffb3cf', '#d97aa5']),
  wall('wall_mint', 'Miętowa gładka', 0, 'plain', ['#c6eedb', '#b3e3cc', '#4f9e7f']),
  wall('wall_cream', 'Kremowa gładka', 60, 'plain', ['#f7efdf', '#efe3cc', '#b08a5c']),
  wall('wall_lemon_stripes', 'Cytrynowe paski', 80, 'stripes', ['#fff1b8', '#ffe48a', '#c99a2e']),
  wall('wall_sky_checks', 'Błękitna kratka', 100, 'checks', ['#d4e6ff', '#bfd6f7', '#5a7fc0']),
  wall('wall_peach_hearts', 'Brzoskwiniowe serduszka', 120, 'hearts', ['#ffe3d1', '#ff8fb8', '#d98a66']),
  wall('wall_lilac_hearts', 'Liliowe serduszka', 120, 'hearts', ['#e8dcff', '#c9a6f2', '#8a63c7']),
  wall('wall_night_stars', 'Nocne niebo', 160, 'stars', ['#3b3772', '#ffd34d', '#26224f']),
  wall('wall_aqua_tiles', 'Błękitne kafelki', 0, 'tiles', ['#e3f6f6', '#b7dcdf', '#6aa6ad']),
  floor('floor_purple_boards', 'Fioletowe deski', 0, 'boards', ['#8d68c4', '#7f5bb6']),
  floor('floor_light_boards', 'Jasne deski', 0, 'boards', ['#e2bf92', '#c79c6c', '#edd0aa']),
  floor('floor_white_tiles', 'Białe kafelki', 0, 'tiles', ['#eceff5', '#c8cdd9']),
  floor('floor_mint_tiles', 'Miętowe kafelki', 90, 'tiles', ['#bfe8d6', '#9ccfb8']),
  floor('floor_pink_carpet', 'Różowa wykładzina', 100, 'carpet', ['#f3a9c9', '#e590b5']),
  floor('floor_dark_boards', 'Ciemne deski', 120, 'boards', ['#6e4a33', '#553724', '#80583e']),
  floor('floor_herringbone', 'Parkiet w jodełkę', 160, 'herringbone', ['#c99260', '#ad7646', '#8c5a32']),
  floor('floor_blue_tiles', 'Niebieskie kafelki', 0, 'tiles', ['#cfe3f7', '#a3bfdc']),
];

/** Darmowe wyglądy startowe; salon odtwarza dawny pokój (lawendowe paski + fioletowe deski). */
export const DEFAULT_LOOKS: Readonly<Record<RoomId, { wallpaper: string; floor: string }>> = {
  salon: { wallpaper: 'wall_lilac_stripes', floor: 'floor_purple_boards' },
  bedroom: { wallpaper: 'wall_pink_dots', floor: 'floor_light_boards' },
  studio: { wallpaper: 'wall_mint', floor: 'floor_white_tiles' },
  bathroom: { wallpaper: 'wall_aqua_tiles', floor: 'floor_blue_tiles' },
};

/**
 * Darmowe wyglądy dodane po pierwszej wersji zapisu v2 (z łazienką). Starszy zapis ich nie zna — dostaje je
 * po cichu, bez zgłaszania naprawy.
 */
export const LATER_DEFAULT_LOOKS: readonly string[] = ['wall_aqua_tiles', 'floor_blue_tiles'];

const BY_ID: ReadonlyMap<string, LookDef> = new Map(LOOKS.map((l) => [l.id, l]));

export function findLook(id: string): LookDef | undefined {
  return BY_ID.get(id);
}

export function lookById(id: string): LookDef {
  const l = BY_ID.get(id);
  if (!l) throw new Error(`Nieznany wygląd: ${id}`);
  return l;
}

/** Wszystkie id darmowych wyglądów (posiadane od początku). */
export function defaultLookIds(): string[] {
  return LOOKS.filter((l) => l.price === 0).map((l) => l.id);
}

// --- rysowanie (piksele logiczne, tylko fillRect; wynik zależy wyłącznie od argumentów) ---
// Wzory rysują się co klatkę dziesiątkami prostokątów — wywołujący może je zbuforować na osobnym canvasie.

type Ctx = CanvasRenderingContext2D;

/** fillRect przycięty do prostokąta [x0, x1) × [y0, y1); puste pomija. */
function clipRect(ctx: Ctx, x: number, y: number, w: number, h: number, x0: number, y0: number, x1: number, y1: number): void {
  const l = Math.max(x, x0);
  const t = Math.max(y, y0);
  const r = Math.min(x + w, x1);
  const b = Math.min(y + h, y1);
  if (r > l && b > t) ctx.fillRect(l, t, r - l, b - t);
}

/** Tapeta na całą ścianę (0, 0, w, h) z listwą przypodłogową 3 px na dole. */
export function drawWallpaper(ctx: Ctx, look: LookDef, w: number, h: number): void {
  const [base, pat, trim] = look.colors;
  const rect = (x: number, y: number, rw: number, rh: number) => clipRect(ctx, x, y, rw, rh, 0, 0, w, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = pat;
  switch (look.pattern) {
    case 'stripes':
      for (let x = 0; x < w; x += 8) rect(x, 0, 4, h);
      break;
    case 'dots':
      for (let r = 0, y = 3; y < h - 3; r++, y += 8)
        for (let x = 2 + (r % 2) * 4; x < w; x += 8) rect(x, y, 2, 2);
      break;
    case 'hearts':
      for (let r = 0, y = 5; y < h - 3; r++, y += 12)
        for (let x = 3 + (r % 2) * 8; x < w; x += 16) {
          rect(x, y, 2, 1);
          rect(x + 3, y, 2, 1);
          rect(x, y + 1, 5, 1);
          rect(x + 1, y + 2, 3, 1);
          rect(x + 2, y + 3, 1, 1);
        }
      break;
    case 'checks':
      for (let cy = 0; cy * 8 < h; cy++)
        for (let cx = cy % 2; cx * 8 < w; cx += 2) rect(cx * 8, cy * 8, 8, 8);
      break;
    case 'tiles':
      // kafelki 8×8 z fugą (kolor wzoru) — łazienkowa glazura
      for (let y = 7; y < h - 3; y += 8) rect(0, y, w, 1);
      for (let x = 7; x < w; x += 8) rect(x, 0, 1, h - 3);
      break;
    case 'stars':
      for (let cy = 0; cy * 16 < h - 3; cy++)
        for (let cx = 0; cx * 16 < w; cx++) {
          const x = cx * 16 + ((cx * 7 + cy * 3) % 11) + 2;
          const y = cy * 16 + ((cx * 5 + cy * 11) % 11) + 2;
          rect(x + 1, y, 1, 3);
          rect(x, y + 1, 3, 1);
        }
      break;
    default:
      break;
  }
  ctx.fillStyle = trim;
  ctx.fillRect(0, h - 3, w, 3);
}

/** Podłoga w pasie (0, y0, w, h). */
export function drawFloor(ctx: Ctx, look: LookDef, y0: number, w: number, h: number): void {
  const [base, line, accent] = look.colors;
  const y1 = y0 + h;
  const rect = (x: number, y: number, rw: number, rh: number) => clipRect(ctx, x, y, rw, rh, 0, y0, w, y1);
  ctx.fillStyle = base;
  ctx.fillRect(0, y0, w, h);
  switch (look.pattern) {
    case 'boards':
      if (accent) {
        // jaśniejsza krawędź każdej deski i przesunięte łączenia
        ctx.fillStyle = accent;
        for (let y = y0 + 1; y < y1; y += 6) rect(0, y, w, 1);
        ctx.fillStyle = line;
        for (let r = 0, y = y0; y < y1; r++, y += 6)
          for (let x = (r * 13) % 24; x < w; x += 24) rect(x, y, 1, 6);
      }
      ctx.fillStyle = line;
      for (let y = y0 + 6; y < y1; y += 6) rect(0, y, w, 1);
      break;
    case 'tiles':
      ctx.fillStyle = line;
      for (let y = y0 + 7; y < y1; y += 8) rect(0, y, w, 1);
      for (let x = 7; x < w; x += 8) rect(x, y0, 1, h);
      break;
    case 'carpet':
      ctx.fillStyle = line;
      for (let r = 0, y = y0 + 1; y < y1; r++, y += 3)
        for (let x = (r * 5) % 7; x < w; x += 7) rect(x, y, 1, 1);
      break;
    case 'herringbone':
      // klocki 8 px szerokości, ukośne pasy w przeciwnych kierunkach; łączone w poziome odcinki jednego koloru
      for (let y = y0; y < y1; y++) {
        let runStart = 0;
        let runColor = '';
        for (let x = 0; x <= w; x++) {
          let c = '';
          if (x < w) {
            const u = x % 8;
            const v = y - y0;
            const d = Math.floor(x / 8) % 2 === 0 ? u + v : u - v + 1024;
            c = u === 0 ? (accent ?? line) : Math.floor(d / 4) % 2 ? line : base;
          }
          if (c !== runColor) {
            if (runColor && runColor !== base) {
              ctx.fillStyle = runColor;
              rect(runStart, y, x - runStart, 1);
            }
            runStart = x;
            runColor = c;
          }
        }
      }
      break;
    default:
      break;
  }
}
