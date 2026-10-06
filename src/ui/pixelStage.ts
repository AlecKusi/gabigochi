import type { FrameMeta } from '../sprites/loader';

/** Prostokąt w pikselach urządzenia. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Położenie postaci w pikselach logicznych. */
export interface SpriteAt {
  x: number;
  feetY: number;
  /** Podskok „oddychania”. */
  bob: number;
  /** Wysokość skoku. */
  jump: number;
}

export interface SpriteDraw extends SpriteAt {
  flip: boolean;
  /** Spłaszczenie 0–0.1 (squash & stretch). */
  squash: number;
}

/**
 * Gdzie narysować klatkę w pikselach urządzenia (`k` px urządzenia na px logiczny):
 * czubek głowy (`anchorX`) trafia w round(x·k), punkt stóp (`foot`; brak = dół klatki) w round((feetY − bob − jump)·k).
 */
export function spriteRect(meta: FrameMeta, k: number, o: SpriteAt): Rect {
  const w = Math.round(meta.w * meta.scale * k);
  const h = Math.round(meta.h * meta.scale * k);
  const x = Math.round(o.x * k) - Math.round(meta.anchorX * meta.scale * k);
  const foot = Math.round((meta.foot ?? meta.h) * meta.scale * k);
  const y = Math.round((o.feetY - o.bob - o.jump) * k) - foot;
  return { x, y, w, h };
}

/** Rysuje klatkę postaci w rozdzielczości urządzenia; odbicie wokół czubka głowy, spłaszczenie względem stóp. */
export function drawSprite(ctx: CanvasRenderingContext2D, k: number, img: CanvasImageSource, meta: FrameMeta, o: SpriteDraw): void {
  const r = spriteRect(meta, k, o);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (o.flip || o.squash) {
    const ax = Math.round(o.x * k);
    const by = r.y + Math.round((meta.foot ?? meta.h) * meta.scale * k);
    ctx.translate(ax, by);
    ctx.scale((o.flip ? -1 : 1) * (1 + o.squash), 1 - o.squash);
    ctx.drawImage(img, r.x - ax, r.y - by, r.w, r.h);
  } else {
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  }
  ctx.restore();
}

export type SpriteStep = (ctx: CanvasRenderingContext2D, k: number) => void;

export interface PixelStage {
  /** Canvas na ekranie, w rozdzielczości urządzenia. */
  canvas: HTMLCanvasElement;
  /** Warstwa tła (W×H px logicznych) — pod postacią. */
  bg: CanvasRenderingContext2D;
  /** Warstwa efektów (W×H px logicznych) — nad postacią. */
  fx: CanvasRenderingContext2D;
  /** Pikseli urządzenia na piksel logiczny. */
  readonly k: number;
  /** Czyści obie warstwy logiczne. */
  clear(): void;
  /** Składa klatkę: tło, potem `drawSprites` w pikselach urządzenia, potem efekty. */
  compose(drawSprites?: SpriteStep): void;
  toLogical(e: PointerEvent): { x: number; y: number };
  dispose(): void;
}

function layer(w: number, hgt: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = hgt;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/**
 * Scena pikselowa W×H: tło i efekty rysowane w pikselach logicznych, postać w pikselach urządzenia
 * (skale klatek nie są całkowite, więc w małym canvasie pojawiałyby się poszarpane piksele).
 */
export function createPixelStage(W: number, H: number): PixelStage {
  const canvas = document.createElement('canvas');
  canvas.className = 'px px-stage';
  canvas.width = W;
  canvas.height = H;
  canvas.style.aspectRatio = `${W} / ${H}`;
  const ctx = canvas.getContext('2d')!;
  const bg = layer(W, H);
  const fx = layer(W, H);
  let k = 1;
  let last: SpriteStep | undefined;

  const compose = (drawSprites?: SpriteStep) => {
    last = drawSprites;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg.canvas, 0, 0, canvas.width, canvas.height);
    drawSprites?.(ctx, k);
    ctx.drawImage(fx.canvas, 0, 0, canvas.width, canvas.height);
  };

  const observer = new ResizeObserver((entries) => {
    const cssW = entries[entries.length - 1].contentRect.width;
    if (cssW <= 0) return;
    const bw = Math.max(1, Math.round(cssW * (window.devicePixelRatio || 1)));
    if (bw === canvas.width) return;
    canvas.width = bw;
    canvas.height = Math.max(1, Math.round((bw * H) / W));
    k = bw / W;
    // Zmiana rozmiaru czyści canvas — odtwarzamy ostatnią klatkę (ważne, gdy pętla już stoi).
    compose(last);
  });
  observer.observe(canvas);

  return {
    canvas,
    bg,
    fx,
    get k() {
      return k;
    },
    clear() {
      bg.clearRect(0, 0, W, H);
      fx.clearRect(0, 0, W, H);
    },
    compose,
    toLogical(e) {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
    },
    dispose: () => observer.disconnect(),
  };
}
