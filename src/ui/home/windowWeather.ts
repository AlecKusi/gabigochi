import type { PlacedItem } from '../../core/types';
import type { ItemDef } from '../../home/catalog';
import type { DayPhase } from '../../home/daytime';
import { GLASS_CLIP, NO_GLASS, glassMask, type GlassClip } from '../../home/glass';
import type { Season, Weather } from '../../home/season';
import { lightning, mirrorIn, weatherParticles, type Area } from '../../home/weatherFx';
import { drawSprite } from '../pixelStage';
import { itemSource } from './itemSprites';
import { itemAnchor, itemFrameAnchor } from './scene';

/** Pola klatki pokoju potrzebne do pogody w oknach (podzbiór `RoomFrame`). */
export interface WindowWeatherFrame {
  season?: Season;
  weather?: Weather;
  phase?: DayPhase;
  t: number;
  /** Zgaszone światło — opady przygaszone. */
  night: boolean;
  calm?: boolean;
}

/** Gęstość opadów na szybie względem balkonu — szyba jest mała, a drobinki mają być dobrze widoczne. */
const PANE_DENSITY = 3;

/** Maska szyby i prostokąt, w którym leży (do rozmieszczenia drobinek tylko na szybie). */
interface Pane {
  canvas: HTMLCanvasElement;
  box: Area;
}

/** Maska szyby dla sprite'a (null — bez szyby albo nie do odczytu); liczona raz. */
const masks = new Map<string, Pane | null>();
/** Płótno robocze opadów na rozmiar sprite'a. */
const layers = new Map<string, HTMLCanvasElement>();

function maskFor(sprite: string, img: HTMLImageElement, clip?: GlassClip): Pane | null {
  if (masks.has(sprite)) return masks.get(sprite)!;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  let px: ImageData;
  try {
    px = ctx.getImageData(0, 0, w, h);
  } catch {
    masks.set(sprite, null);
    return null;
  }
  const m = glassMask(px.data, w, h, clip);
  if (!m) {
    masks.set(sprite, null);
    return null;
  }
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const on = m[y * w + x] === 1;
      const i = (y * w + x) * 4;
      px.data[i] = 255;
      px.data[i + 1] = 255;
      px.data[i + 2] = 255;
      px.data[i + 3] = on ? 255 : 0;
      if (!on) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  ctx.putImageData(px, 0, 0);
  const pane: Pane = { canvas: c, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
  masks.set(sprite, pane);
  return pane;
}

function layerFor(w: number, h: number): HTMLCanvasElement {
  const key = `${w}x${h}`;
  let c = layers.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    layers.set(key, c);
  }
  return c;
}

/**
 * Opady (śnieg, deszcz, liście, płatki) i błysk burzy na szybie okna `it`, narysowanego klatką `sprite`
 * (zwykły sprite albo klatka stanu, np. nocna). Drobinki w px natywnych sprite'a, przycięte do maski szyby
 * i narysowane tą samą kotwicą co okno — także odbite.
 */
export function drawWindowWeather(ctx: CanvasRenderingContext2D, k: number, it: PlacedItem, def: ItemDef, sprite: string, f: WindowWeatherFrame): void {
  if (NO_GLASS.has(def.id)) return;
  const img = itemSource(sprite);
  if (!(img instanceof HTMLImageElement)) return;
  const pane = maskFor(sprite, img, GLASS_CLIP[def.id]);
  if (!pane) return;
  const mask = pane.canvas;
  const calm = f.calm ?? false;
  // każde okno ma własny przebieg opadów (identyczne okna nie pokazują identycznych drobinek); błysk — wspólny z balkonem
  const t = calm ? 0 : f.t;
  const tp = calm ? 0 : f.t + it.x * 37 + it.y * 11;
  const weather = f.weather ?? 'sunny';
  const ps = weatherParticles({
    season: f.season ?? 'autumn',
    weather,
    phase: f.phase ?? 'day',
    area: pane.box,
    t: tp,
    open: false,
    density: PANE_DENSITY,
  });
  const flash = weather === 'storm' && !calm ? lightning(t) : 0;
  if (ps.length === 0 && flash === 0) return;
  const layer = layerFor(mask.width, mask.height);
  const lc = layer.getContext('2d')!;
  lc.clearRect(0, 0, layer.width, layer.height);
  // okno odbite: warstwa pójdzie w lustrze, więc odbijamy drobinki z góry — wiatr na ekranie wieje jak przedtem
  for (const p of it.flip ? mirrorIn(ps, pane.box) : ps) {
    lc.fillStyle = p.color;
    lc.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
  }
  if (flash > 0) {
    lc.fillStyle = `rgba(255, 255, 255, ${0.5 * flash})`;
    lc.fillRect(0, 0, layer.width, layer.height);
  }
  lc.globalCompositeOperation = 'destination-in';
  lc.drawImage(mask, 0, 0);
  lc.globalCompositeOperation = 'source-over';
  const a = sprite === def.sprite ? itemAnchor(it, def) : itemFrameAnchor(it, def, sprite);
  ctx.save();
  if (f.night) ctx.globalAlpha = 0.45;
  drawSprite(ctx, k, layer, a.meta, { x: a.x, feetY: a.feetY, flip: it.flip, bob: 0, squash: 0, jump: 0 });
  ctx.restore();
}
