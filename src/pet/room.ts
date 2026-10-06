import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';

/** Wymiary pokoju w pikselach logicznych; canvas skalowany CSS-em. */
export const ROOM_W = 128;
export const ROOM_H = 112;
export const FLOOR_Y = 88;
export const FEET_Y = 104;

const DAY = { wall: '#cdb8f0', stripe: '#c2abea', floor: '#8d68c4', board: '#7f5bb6', sky: '#9fd3ff', rug: '#ff9ec4', rugLine: '#f27fb0' };
const NIGHT = { wall: '#4a3a72', stripe: '#433468', floor: '#3a2a58', board: '#33254f', sky: '#1f1a3d', rug: '#7a3f63', rugLine: '#6a3556' };
const BUNTING = ['#ff7fb0', '#ffd34d', '#5aa8f0', '#9b6ee0'];

type Colors = typeof DAY;

export function drawRoom(ctx: CanvasRenderingContext2D, night: boolean, t: number): void {
  const c = night ? NIGHT : DAY;
  ctx.fillStyle = c.wall;
  ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);
  ctx.fillStyle = c.stripe;
  for (let x = 0; x < ROOM_W; x += 8) ctx.fillRect(x, 0, 4, FLOOR_Y);
  ctx.fillStyle = '#7a4fb3';
  ctx.fillRect(0, FLOOR_Y - 3, ROOM_W, 3);
  ctx.fillStyle = c.floor;
  ctx.fillRect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  ctx.fillStyle = c.board;
  for (let y = FLOOR_Y + 6; y < ROOM_H; y += 6) ctx.fillRect(0, y, ROOM_W, 1);
  drawWindow(ctx, 10, 16, c, night, t);
  drawPicture(ctx, 94, 22);
  drawBunting(ctx);
  drawRug(ctx, c);
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors, night: boolean, t: number): void {
  const w = 30;
  const h = 26;
  ctx.fillStyle = '#1b1326';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#f3ecff';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c.sky;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  if (night) {
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(x + 19, y + 5, 4, 4);
    ctx.fillStyle = c.sky;
    ctx.fillRect(x + 21, y + 4, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 6, 1, 1);
    ctx.fillRect(x + 11, y + 16, 1, 1);
    if (Math.floor(t / 600) % 2) ctx.fillRect(x + 23, y + 18, 1, 1);
    else ctx.fillRect(x + 5, y + 19, 1, 1);
  } else {
    const cloudX = x + 2 + (Math.floor(t / 250) % (w + 8)) - 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, w - 4, h - 4);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cloudX, y + 7, 8, 3);
    ctx.fillRect(cloudX + 2, y + 5, 4, 2);
    ctx.restore();
  }
  ctx.fillStyle = '#f3ecff';
  ctx.fillRect(x + 14, y, 2, h);
  ctx.fillRect(x, y + 12, w, 2);
  ctx.fillStyle = '#7a4fb3';
  ctx.fillRect(x - 3, y + h + 1, w + 6, 2);
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

function drawRug(ctx: CanvasRenderingContext2D, c: Colors): void {
  ctx.fillStyle = c.rug;
  ctx.fillRect(36, 99, 56, 7);
  ctx.fillRect(34, 100, 60, 5);
  ctx.fillStyle = c.rugLine;
  ctx.fillRect(40, 101, 48, 1);
  ctx.fillRect(40, 103, 48, 1);
}
