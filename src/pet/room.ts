import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';
import type { RoomId } from '../core/types';
import { drawFloor, drawWallpaper, type LookDef } from '../home/looks';
import { SKY, type DayPhase } from '../home/daytime';

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

const BUNTING = ['#ff7fb0', '#ffd34d', '#5aa8f0', '#9b6ee0'];

/**
 * Stałe tło pokoju (px logiczne): tapeta na ścianie, podłoga, a w salonie urodzinowa girlanda i obrazek „26”.
 * Okna, półki, dywany itd. to przedmioty rysowane osobno.
 */
export function drawRoomBase(ctx: CanvasRenderingContext2D, room: RoomId, wallpaper: LookDef, floor: LookDef, phase: DayPhase = 'day'): void {
  if (room === 'balcony') {
    drawBalconyView(ctx, phase);
    drawFloor(ctx, floor, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
    drawRailing(ctx);
    return;
  }
  drawWallpaper(ctx, wallpaper, ROOM_W, FLOOR_Y);
  drawFloor(ctx, floor, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  if (room === 'salon') {
    drawPicture(ctx, 94, 22);
    drawBunting(ctx);
  }
}

function drawPicture(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#5c3a26';
  ctx.fillRect(x, y, 20, 16);
  ctx.fillStyle = '#f3ecff';
  ctx.fillRect(x + 2, y + 2, 16, 12);
  ctx.drawImage(artCanvas(ICONS.digit2), x + 6, y + 5);
  ctx.drawImage(artCanvas(ICONS.digit6), x + 11, y + 5);
}

function drawBunting(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#1b1326';
  ctx.fillRect(0, 4, ROOM_W, 1);
  for (let i = 0, x = 2; x < ROOM_W; i++, x += 10) {
    ctx.fillStyle = BUNTING[i % BUNTING.length];
    for (let r = 0; r < 4; r++) ctx.fillRect(x + r, 5 + r, 7 - 2 * r, 1);
  }
}

/** Deterministyczny „los” do gwiazd i okien (to samo tło przy każdym rysowaniu). */
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

/** Widok z balkonu: niebo z pory dnia (pasy gradientu), słońce/księżyc, chmurki albo gwiazdy, miasto na horyzoncie. */
function drawBalconyView(ctx: CanvasRenderingContext2D, phase: DayPhase): void {
  const [top, bottom] = SKY[phase];
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = mixHex(top, bottom, i / (bands - 1));
    ctx.fillRect(0, Math.floor((FLOOR_Y * i) / bands), ROOM_W, Math.ceil(FLOOR_Y / bands) + 1);
  }
  if (phase === 'night') {
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 7 === 0 ? '#ffe9a8' : '#ffffff';
      ctx.fillRect(Math.floor(hash(i) * ROOM_W), Math.floor(hash(i + 99) * 70), 1, 1);
    }
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
    // chmurki
    ctx.fillStyle = phase === 'evening' ? '#ffb9a0' : '#ffffff';
    for (const [x, y] of [[14, 22], [56, 12], [70, 36]] as const) {
      ctx.fillRect(x, y, 16, 4);
      ctx.fillRect(x + 4, y - 3, 8, 3);
    }
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
  const city = phase === 'night' ? '#1f1b45' : phase === 'evening' ? '#5a3f78' : '#9aa7cf';
  const win = phase === 'night' || phase === 'evening' ? '#ffd86a' : null;
  let x = 0;
  for (let i = 0; x < ROOM_W; i++) {
    const w = 8 + Math.floor(hash(i + 7) * 10);
    const h = 18 + Math.floor(hash(i + 31) * 30);
    ctx.fillStyle = city;
    ctx.fillRect(x, FLOOR_Y - h, w - 1, h);
    if (win) {
      ctx.fillStyle = win;
      for (let wy = FLOOR_Y - h + 3; wy < FLOOR_Y - 4; wy += 5) {
        for (let wx = x + 2; wx < x + w - 3; wx += 3) if (hash(wx * 13 + wy) > 0.55) ctx.fillRect(wx, wy, 1, 2);
      }
    }
    x += w;
  }
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

