import { ICONS } from '../../art/icons';
import { artCanvas } from '../../art/pixels';
import type { PlacedItem, RoomId, RoomState } from '../../core/types';
import { findItem } from '../../home/catalog';
import { GABI, drawOrder, itemBox } from '../../home/layout';
import { DEFAULT_LOOKS, findLook } from '../../home/looks';
import { NIGHT_TINT, ROOM_H, ROOM_W, drawRoomBase } from '../../pet/room';
import { deviceRect, drawSprite } from '../pixelStage';
import { itemSource } from './itemSprites';
import { isLitLamp, itemAnchor, itemFrameAnchor, itemTints, needsWater } from './scene';

/** Gabi (albo scena zajęcia / snu) jako jeden element kolejności rysowania. */
export interface GabiLayer {
  /** Linia stóp do sortowania z meblami. */
  orderY: number;
  /** Przezroczystość (w trybie urządzania postać jest przygaszona). */
  alpha: number;
  /** Rysuje cień i postać w pikselach urządzenia. */
  draw(ctx: CanvasRenderingContext2D, k: number): void;
}

export interface RoomFrame {
  room: RoomId;
  looks: Pick<RoomState, 'wallpaper' | 'floor'>;
  items: readonly PlacedItem[];
  /** Zgaszone światło. */
  night: boolean;
  /** Date.now() — stan roślin. */
  now: number;
  /** performance.now() — animacje (kropla). */
  t: number;
  /** Przedmioty zastąpione przez Gabi (łóżko w czasie snu, biurko/siedzisko w czasie zajęcia, wieszak przy wycieraniu rąk). */
  hidden: ReadonlySet<string>;
  /** Przedmioty rysowane klatką stanu (uid → sprite z `itemFrames`), np. prysznic z wodą. */
  states: ReadonlyMap<string, string>;
  /** Zaznaczony w trybie urządzania. */
  selectedUid: string | null;
  gabi: GabiLayer | null;
}

/** Promień poświaty zapalonej lampki (px logiczne). */
const GLOW_R = 22;

export interface RoomRenderer {
  /** Tło w px logicznych (warstwa `bg` sceny): tapeta, podłoga, girlanda — zbuforowane; nocą przyciemnione. */
  drawBackground(bg: CanvasRenderingContext2D, f: RoomFrame): void;
  /** Przedmioty i Gabi w kolejności warstw, w pikselach urządzenia; na końcu poświata lamp i ramka zaznaczenia. */
  drawItems(ctx: CanvasRenderingContext2D, k: number, f: RoomFrame): void;
  /** Znaczki nad przedmiotami w px logicznych (warstwa `fx`): krople nad spragnionymi roślinami. */
  drawOverlays(fx: CanvasRenderingContext2D, f: RoomFrame): void;
}

export function createRoomRenderer(): RoomRenderer {
  const base = document.createElement('canvas');
  base.width = ROOM_W;
  base.height = ROOM_H;
  const baseCtx = base.getContext('2d')!;
  let baseKey = '';

  function drawBackground(bg: CanvasRenderingContext2D, f: RoomFrame): void {
    const key = `${f.room}|${f.looks.wallpaper}|${f.looks.floor}|${f.night}`;
    if (key !== baseKey) {
      baseKey = key;
      const wall = findLook(f.looks.wallpaper) ?? findLook(DEFAULT_LOOKS[f.room].wallpaper)!;
      const floor = findLook(f.looks.floor) ?? findLook(DEFAULT_LOOKS[f.room].floor)!;
      baseCtx.clearRect(0, 0, ROOM_W, ROOM_H);
      drawRoomBase(baseCtx, f.room, wall, floor);
      if (f.night) {
        baseCtx.fillStyle = NIGHT_TINT;
        baseCtx.fillRect(0, 0, ROOM_W, ROOM_H);
      }
    }
    bg.drawImage(base, 0, 0);
  }

  function drawItem(ctx: CanvasRenderingContext2D, k: number, it: PlacedItem, f: RoomFrame): void {
    const def = findItem(it.itemId);
    if (!def) return;
    const tints = itemTints(def, it, f.night, f.now);
    const state = f.states.get(it.uid);
    const stateSrc = state ? itemSource(state, tints) : null;
    if (state && stateSrc) {
      const a = itemFrameAnchor(it, def, state);
      drawSprite(ctx, k, stateSrc, a.meta, { x: a.x, feetY: a.feetY, flip: it.flip, bob: 0, squash: 0, jump: 0 });
      return;
    }
    // bez klatki stanu (albo jeszcze się wczytuje) — zwykły przedmiot
    const src = itemSource(def.sprite, tints);
    if (!src) return;
    const a = itemAnchor(it, def);
    drawSprite(ctx, k, src, a.meta, { x: a.x, feetY: a.feetY, flip: it.flip, bob: 0, squash: 0, jump: 0 });
  }

  function drawGlow(ctx: CanvasRenderingContext2D, k: number, it: PlacedItem, night: boolean): void {
    const b = itemBox(it);
    const cx = it.x * k;
    const cy = (b.y + Math.min(b.h * 0.3, 10)) * k;
    const r = GLOW_R * k;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255, 226, 140, ${night ? 0.55 : 0.3})`);
    g.addColorStop(1, 'rgba(255, 226, 140, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.restore();
  }

  function drawSelection(ctx: CanvasRenderingContext2D, k: number, it: PlacedItem, t: number): void {
    const r = deviceRect(k, itemBox(it));
    const lw = Math.max(2, Math.round(k * 0.6));
    const pad = lw;
    ctx.save();
    ctx.lineWidth = lw + 2;
    ctx.strokeStyle = '#1b1326';
    ctx.strokeRect(r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad);
    ctx.lineWidth = lw;
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([lw * 3, lw * 2]);
    ctx.lineDashOffset = -Math.floor(t / 120) * lw;
    ctx.strokeRect(r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad);
    ctx.restore();
  }

  function drawItems(ctx: CanvasRenderingContext2D, k: number, f: RoomFrame): void {
    const visible = f.hidden.size > 0 ? f.items.filter((i) => !f.hidden.has(i.uid)) : f.items;
    for (const e of drawOrder(visible, f.gabi?.orderY)) {
      if (e === GABI) {
        const g = f.gabi!;
        ctx.save();
        ctx.globalAlpha = g.alpha;
        g.draw(ctx, k);
        ctx.restore();
      } else {
        drawItem(ctx, k, e, f);
      }
    }
    for (const it of visible) if (isLitLamp(it)) drawGlow(ctx, k, it, f.night);
    const sel = f.selectedUid ? f.items.find((i) => i.uid === f.selectedUid) : undefined;
    if (sel) drawSelection(ctx, k, sel, f.t);
  }

  function drawOverlays(fx: CanvasRenderingContext2D, f: RoomFrame): void {
    const drop = artCanvas(ICONS.drop);
    const bob = Math.floor(f.t / 500) % 2;
    for (const it of f.items) {
      if (f.hidden.has(it.uid) || !needsWater(it, f.now)) continue;
      const b = itemBox(it);
      fx.drawImage(drop, Math.round(it.x - drop.width / 2), Math.max(0, Math.round(b.y) - drop.height - 2 - bob));
    }
  }

  return { drawBackground, drawItems, drawOverlays };
}
