import type { RoomId } from '../core/types';
import { drawFloor, drawWallpaper, type LookDef } from '../home/looks';
import { SKY, type DayPhase } from '../home/daytime';
import { CLOUDS, METEOR_FLIGHT, birdsAt, cloudX, litShare, meteorAt, skyHash as hash, starDimmed, windowLit } from '../home/balconySky';

/** Wymiary pokoju w pikselach logicznych; canvas skalowany CSS-em. */
export const ROOM_W = 128;
export const ROOM_H = 160;
export const FLOOR_Y = 128;
export const FEET_Y = 144;

/**
 * Zgaszone światło: nakładka na cały pokój (tło i przedmioty). Dobrana tak, by lawendowe paski i fioletowe deski
 * salonu wyglądały jak dawne kolory nocne (#4a3a72 / #3a2a58).
 */
export const NIGHT_TINT = 'rgba(30, 16, 72, 0.75)';

/**
 * Stałe tło pokoju (px logiczne): tapeta na ścianie i podłoga (na balkonie — niebo i balustrada). Okna, półki,
 * dywany, a także urodzinowa girlanda i obrazek „26” w salonie to przedmioty rysowane osobno.
 */
export function drawRoomBase(ctx: CanvasRenderingContext2D, room: RoomId, wallpaper: LookDef, floor: LookDef, phase: DayPhase = 'day'): void {
  if (room === 'balcony') {
    // nieruchomy widok (okna wg pory, bez spadających gwiazd); w grze warstwy rysuje renderer pokoju
    drawBalconyBack(ctx, phase);
    drawBalconyLive(ctx, phase, null, 0);
    drawBalconyFront(ctx, floor);
    return;
  }
  drawWallpaper(ctx, wallpaper, ROOM_W, FLOOR_Y);
  drawFloor(ctx, floor, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

/** Gwiazdy nad balkonem (px logiczne) — co piąta migocze. */
const STARS = Array.from({ length: 40 }, (_, i) => ({ x: Math.floor(hash(i) * ROOM_W), y: Math.floor(hash(i + 99) * 70) }));

/** Miasto na horyzoncie: budynki i miejsca na okna (każde może świecić albo być ciemne). */
const CITY = (() => {
  const buildings: { x: number; w: number; h: number }[] = [];
  const windows: { x: number; y: number }[] = [];
  let x = 0;
  for (let i = 0; x < ROOM_W; i++) {
    const w = 8 + Math.floor(hash(i + 7) * 10);
    const h = 18 + Math.floor(hash(i + 31) * 30);
    buildings.push({ x, w, h });
    for (let wy = FLOOR_Y - h + 3; wy < FLOOR_Y - 4; wy += 5) {
      for (let wx = x + 2; wx < x + w - 3; wx += 3) if (hash(wx * 13 + wy) > 0.55) windows.push({ x: wx, y: wy });
    }
    x += w;
  }
  return { buildings, windows };
})();

/**
 * Widok z balkonu bez tego, co żyje: niebo z pory dnia (pasy gradientu), słońce/księżyc albo gwiazdy, daszek
 * i sylwetki budynków (chmurki, ptaki i okna dorysowuje `drawBalconyLive`).
 */
export function drawBalconyBack(ctx: CanvasRenderingContext2D, phase: DayPhase): void {
  const [top, bottom] = SKY[phase];
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = mixHex(top, bottom, i / (bands - 1));
    ctx.fillRect(0, Math.floor((FLOOR_Y * i) / bands), ROOM_W, Math.ceil(FLOOR_Y / bands) + 1);
  }
  if (phase === 'night') {
    STARS.forEach((st, i) => {
      ctx.fillStyle = i % 7 === 0 ? '#ffe9a8' : '#ffffff';
      ctx.fillRect(st.x, st.y, 1, 1);
    });
    // księżyc
    ctx.fillStyle = '#fff4c8';
    ctx.fillRect(98, 14, 10, 10);
    ctx.fillRect(97, 16, 12, 6);
    ctx.fillStyle = SKY.night[0];
    ctx.fillRect(102, 13, 8, 8);
  } else {
    // słońce: rano nisko z lewej, w dzień wysoko, wieczorem nisko z prawej
    const sun = phase === 'morning' ? { x: 22, y: 50, c: '#ffd9a0' } : phase === 'day' ? { x: 90, y: 16, c: '#fff1a0' } : { x: 100, y: 62, c: '#ff8a5a' };
    ctx.fillStyle = sun.c;
    ctx.fillRect(sun.x - 5, sun.y - 3, 10, 6);
    ctx.fillRect(sun.x - 3, sun.y - 5, 6, 10);
    ctx.fillRect(sun.x - 4, sun.y - 4, 8, 8);
  }
  // daszek nad balkonem (na nim wiszą lampki)
  ctx.fillStyle = '#5a3a8a';
  ctx.fillRect(0, 0, ROOM_W, 6);
  ctx.fillStyle = '#7a52b0';
  ctx.fillRect(0, 0, ROOM_W, 2);
  ctx.fillStyle = '#2a1f3d';
  ctx.fillRect(0, 6, ROOM_W, 1);
  for (let x = 0; x < ROOM_W; x += 8) {
    ctx.fillStyle = '#2a1f3d';
    ctx.fillRect(x, 7, 8, 1);
    ctx.fillRect(x + 1, 8, 6, 1);
  }
  // miasto na horyzoncie
  ctx.fillStyle = phase === 'night' ? '#1f1b45' : phase === 'evening' ? '#5a3f78' : '#9aa7cf';
  for (const b of CITY.buildings) ctx.fillRect(b.x, FLOOR_Y - b.h, b.w - 1, b.h);
}

/**
 * To, co żyje na niebie (rysowane co klatkę między widokiem a balustradą): za dnia dryfują chmurki i przelatują
 * klucze ptaków; okna w mieście wieczorem i nocą gasną i zapalają się (im później, tym mniej świeci), a nocą
 * migoczą gwiazdy i przelatują spadające gwiazdy.
 * `clockMs` — godzina gry (ms); null — nieruchomy widok: chmurki na miejscach startowych, świecą wszystkie okna.
 * `t` — zegar animacji (ms).
 */
export function drawBalconyLive(ctx: CanvasRenderingContext2D, phase: DayPhase, clockMs: number | null, t: number): void {
  const still = clockMs === null;
  if (phase !== 'night') drawClouds(ctx, phase, still ? 0 : t);
  if (phase === 'night' || phase === 'evening') {
    const d = still ? null : new Date(clockMs);
    const share = d ? litShare(phase, d.getHours() + d.getMinutes() / 60) : 1;
    ctx.fillStyle = '#ffd86a';
    CITY.windows.forEach((w, i) => {
      if (still || windowLit(i, clockMs, share)) ctx.fillRect(w.x, w.y, 1, 2);
    });
  }
  if (still) return;
  if (phase !== 'night') {
    drawBirds(ctx, phase, t);
    return;
  }
  // migotanie: co piąta gwiazda co chwilę przygasa
  ctx.fillStyle = '#5d5796';
  STARS.forEach((st, i) => {
    if (i % 5 === 0 && starDimmed(i, t)) ctx.fillRect(st.x, st.y, 1, 1);
  });
  drawMeteor(ctx, t);
}

/** Chmurki dryfujące w prawo (za krawędzią wracają z lewej); wieczorem różowe od zachodu. */
function drawClouds(ctx: CanvasRenderingContext2D, phase: DayPhase, t: number): void {
  ctx.fillStyle = phase === 'evening' ? '#ffb9a0' : '#ffffff';
  CLOUDS.forEach((c, i) => {
    const x = Math.round(cloudX(i, t, ROOM_W));
    const top = Math.round(c.w * 0.25);
    ctx.fillRect(x, c.y, c.w, 4);
    ctx.fillRect(x + top, c.y - 3, c.w - 2 * top, 3);
  });
}

/** Ptaki: ciemne sylwetki „v” (skrzydła w górze) i „^” (w dole), machają na zmianę. */
function drawBirds(ctx: CanvasRenderingContext2D, phase: DayPhase, t: number): void {
  ctx.fillStyle = phase === 'evening' ? '#3a2350' : '#3d3358';
  for (const b of birdsAt(t, ROOM_W)) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    if (b.wings === 0) {
      ctx.fillRect(x - 2, y - 1, 1, 1);
      ctx.fillRect(x + 2, y - 1, 1, 1);
      ctx.fillRect(x - 1, y, 3, 1);
    } else {
      ctx.fillRect(x - 1, y - 1, 3, 1);
      ctx.fillRect(x - 2, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
    }
  }
}

/** Ogon spadającej gwiazdy: od głowy (biel) przez kremowy do złotego, coraz bledszy. */
const METEOR_TAIL = 12;

/** Spadająca gwiazda: świecąca głowa i długi, gasnący ogon; pojawia się i znika płynnie. */
function drawMeteor(ctx: CanvasRenderingContext2D, t: number): void {
  const m = meteorAt(t);
  if (!m) return;
  const len = Math.hypot(METEOR_FLIGHT.dx, METEOR_FLIGHT.dy);
  const ux = (m.dir * METEOR_FLIGHT.dx) / len;
  const uy = METEOR_FLIGHT.dy / len;
  // ogon rośnie na starcie, a pod koniec całość blednie
  const fade = Math.min(1, (1 - m.p) * 3);
  const tail = Math.max(2, Math.round(METEOR_TAIL * Math.min(1, m.p * 4)));
  const hx = Math.round(m.x);
  const hy = Math.round(m.y);
  ctx.save();
  for (let k = tail; k >= 1; k--) {
    ctx.globalAlpha = fade * (0.95 - (0.8 * k) / tail);
    ctx.fillStyle = k < 3 ? '#fffbe6' : k < 7 ? '#fff0b0' : '#ffd86a';
    ctx.fillRect(Math.round(m.x - ux * k), Math.round(m.y - uy * k), 1, 1);
  }
  // głowa z poświatą
  ctx.globalAlpha = fade * 0.45;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hx - 1, hy, 3, 1);
  ctx.fillRect(hx, hy - 1, 1, 3);
  ctx.globalAlpha = fade;
  ctx.fillRect(hx, hy, 1, 1);
  ctx.restore();
}

/** Przód balkonu (na wierzchu nieba): podłoga i balustrada. */
export function drawBalconyFront(ctx: CanvasRenderingContext2D, floor: LookDef): void {
  drawFloor(ctx, floor, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  drawRailing(ctx);
}

/** Balustrada balkonu: poręcz i szczeble na tle miasta. */
function drawRailing(ctx: CanvasRenderingContext2D): void {
  const top = FLOOR_Y - 26;
  ctx.fillStyle = '#2a1f3d';
  ctx.fillRect(0, top, ROOM_W, 3);
  ctx.fillRect(0, FLOOR_Y - 3, ROOM_W, 3);
  ctx.fillStyle = '#f3ecff';
  ctx.fillRect(0, top + 1, ROOM_W, 1);
  for (let x = 2; x < ROOM_W; x += 7) {
    ctx.fillStyle = '#2a1f3d';
    ctx.fillRect(x, top + 3, 2, 23);
    ctx.fillStyle = '#c9b9e8';
    ctx.fillRect(x, top + 3, 1, 23);
  }
}

