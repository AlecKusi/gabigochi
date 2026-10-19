import type { PlacedItem } from '../../core/types';
import type { ItemDef } from '../../home/catalog';
import type { DayPhase } from '../../home/daytime';
import { NO_GLASS, glassMask } from '../../home/glass';
import type { Season, Weather } from '../../home/season';
import { lightning, weatherParticles } from '../../home/weatherFx';
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

/** Maska szyby dla sprite'a (null — bez szyby); liczona raz. */
const masks = new Map<string, HTMLCanvasElement | null>();
/** Płótno robocze opadów na rozmiar sprite'a. */
const layers = new Map<string, HTMLCanvasElement>();

function maskFor(sprite: string, img: HTMLImageElement): HTMLCanvasElement | null {
  if (masks.has(sprite)) return masks.get(sprite)!;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h);
  const m = glassMask(px.data, w, h);
  if (!m) {
    masks.set(sprite, null);
    return null;
  }
  for (let i = 0; i < w * h; i++) {
    px.data[i * 4] = 255;
    px.data[i * 4 + 1] = 255;
    px.data[i * 4 + 2] = 255;
    px.data[i * 4 + 3] = m[i] ? 255 : 0;
  }
  ctx.putImageData(px, 0, 0);
  masks.set(sprite, c);
  return c;
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
  const mask = maskFor(sprite, img);
  if (!mask) return;
  const calm = f.calm ?? false;
  const t = calm ? 0 : f.t;
  const weather = f.weather ?? 'sunny';
  const ps = weatherParticles({
    season: f.season ?? 'autumn',
    weather,
    phase: f.phase ?? 'day',
    area: { x: 0, y: 0, w: mask.width, h: mask.height },
    t,
    open: false,
  });
  const flash = weather === 'storm' && !calm ? lightning(t) : 0;
  if (ps.length === 0 && flash === 0) return;
  const layer = layerFor(mask.width, mask.height);
  const lc = layer.getContext('2d')!;
  lc.clearRect(0, 0, layer.width, layer.height);
  for (const p of ps) {
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
