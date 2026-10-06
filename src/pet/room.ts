import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';
import type { RoomId } from '../core/types';
import { drawFloor, drawWallpaper, type LookDef } from '../home/looks';

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
export function drawRoomBase(ctx: CanvasRenderingContext2D, room: RoomId, wallpaper: LookDef, floor: LookDef): void {
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
