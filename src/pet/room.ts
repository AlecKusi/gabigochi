import type { DayPhase } from '../home/daytime';
import { drawFloor, drawWallpaper, type LookDef } from '../home/looks';
import { METEOR_FLIGHT, birdsAt, meteorAt } from '../home/balconySky';
import type { Season, Weather } from '../home/season';
import { SUN_BOX, WEATHER_TINT, lightning, overcast, twinkles, weatherParticles, type Area, type Particle } from '../home/weatherFx';

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
 * Stałe tło pokoju (px logiczne): tapeta na ścianie i podłoga. Okna, półki, dywany, a także urodzinowa girlanda
 * i obrazek „26” w salonie to przedmioty rysowane osobno. Balkon ma namalowane tło — `drawBalcony`.
 */
export function drawRoomBase(ctx: CanvasRenderingContext2D, wallpaper: LookDef, floor: LookDef): void {
  drawWallpaper(ctx, wallpaper, ROOM_W, FLOOR_Y);
  drawFloor(ctx, floor, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
}

/** Widok nad podłogą balkonu, pod daszkiem: tu padają opady i latają ptaki (pod daszkiem nie pada). */
export const BALCONY_SKY: Area = { x: 0, y: 9, w: ROOM_W, h: FLOOR_Y - 9 };

/** Migoczące gwiazdy tylko wysoko na niebie (`twinkles` bierze górne 45% → y 10–44) i nie na księżycu. */
const BALCONY_STARS: Area = { x: 0, y: 10, w: ROOM_W, h: 76 };
const outside = (p: Particle, b: Area) => p.x + p.w <= b.x || p.x >= b.x + b.w || p.y + p.h <= b.y || p.y >= b.y + b.h;

/** Co narysować na balkonie w tej klatce. */
export interface BalconyView {
  /** Tła pory roku (null — jeszcze się wczytują). */
  day: CanvasImageSource | null;
  night: CanvasImageSource | null;
  phase: DayPhase;
  /** 0 — dzień, 1 — noc; wieczorem nocne tło stopniowo przykrywa dzienne. */
  dusk: number;
  season: Season;
  weather: Weather;
  /** Zegar animacji (ms); przy ograniczonym ruchu stały — opady stoją. */
  t: number;
  /** Ograniczony ruch: bez błysków burzy, ptaków i spadających gwiazd. */
  calm: boolean;
}

/**
 * Balkon: namalowane tło pory roku (rano i w dzień dzienne, wieczorem przejście w nocne, w nocy nocne), odcień
 * pogody i szare chmury (zasłaniają namalowane słońce/księżyc; wieczorem płynnie ciemnieją), błysk burzy,
 * w pogodny dzień ptaki, w pogodną noc migoczące i spadające gwiazdy, a na wierzchu opady i drobinki pory roku
 * (liście, płatki, motyle, świetliki).
 */
export function drawBalcony(ctx: CanvasRenderingContext2D, v: BalconyView): void {
  ctx.fillStyle = '#2a1f3d';
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  if (v.dusk < 1 && v.day) ctx.drawImage(v.day, 0, 0, ROOM_W, ROOM_H);
  if (v.dusk > 0 && v.night) {
    ctx.save();
    ctx.globalAlpha = v.dusk;
    ctx.drawImage(v.night, 0, 0, ROOM_W, ROOM_H);
    ctx.restore();
  }
  const weatherTint = WEATHER_TINT[v.weather];
  if (weatherTint) {
    ctx.fillStyle = weatherTint;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }
  // chmury ciemnieją razem z tłem: dzienne kolory znikają, a nocne wchodzą wraz ze zmierzchem
  if (v.dusk < 1) drawParticles(ctx, overcast(BALCONY_SKY, v.t, v.weather, false));
  if (v.dusk > 0) {
    ctx.save();
    ctx.globalAlpha = v.dusk;
    drawParticles(ctx, overcast(BALCONY_SKY, v.t, v.weather, true));
    ctx.restore();
  }
  const flash = v.weather === 'storm' && !v.calm ? lightning(v.t) : 0;
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * flash})`;
    ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);
  }
  const clear = v.weather === 'sunny' || v.weather === 'frost';
  if (clear && !v.calm && (v.phase === 'day' || v.phase === 'morning')) drawBirds(ctx, v.phase, v.t);
  if (clear && v.phase === 'night') {
    drawParticles(ctx, twinkles(BALCONY_STARS, v.t).filter((p) => outside(p, SUN_BOX)));
    if (!v.calm) drawMeteor(ctx, v.t);
  }
  drawParticles(ctx, weatherParticles({ season: v.season, weather: v.weather, phase: v.phase, area: BALCONY_SKY, t: v.t, open: true }));
}

/** Drobinki jako prostokąciki w px logicznych. */
export function drawParticles(ctx: CanvasRenderingContext2D, ps: readonly Particle[]): void {
  for (const p of ps) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
  }
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
