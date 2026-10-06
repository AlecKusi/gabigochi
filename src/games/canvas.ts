import { h } from '../ui/dom';

export interface GameCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  toLogical(e: PointerEvent): { x: number; y: number };
  dispose(): void;
}

/** Skala całkowita, o ile nie marnuje za dużo miejsca (>= 85%); inaczej kroki co pół piksela. */
export function fitScale(s: number): number {
  if (s < 1) return s;
  const whole = Math.floor(s);
  if (whole / s >= 0.85) return whole;
  return Math.max(1, Math.floor(s * 2) / 2);
}

/** Canvas w rozdzielczości logicznej, skalowany do miejsca (całkowicie, gdy się da). */
export function makeCanvas(body: HTMLElement, w: number, hgt: number): GameCanvas {
  const canvas = h('canvas', { class: 'px game-canvas', width: w, height: hgt });
  body.append(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const fit = () => {
    // Pole robocze to wnętrze elementu (bez paddingu).
    const cs = getComputedStyle(body);
    const availW = body.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const availH = body.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    const s = Math.min(availW / w, availH / hgt);
    const scale = fitScale(s);
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${hgt * scale}px`;
  };
  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(body);
  return {
    canvas,
    ctx,
    toLogical(e) {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * w) / r.width, y: ((e.clientY - r.top) * hgt) / r.height };
    },
    dispose: () => observer.disconnect(),
  };
}

/** Pętla gry: woła `fn(dt)` co klatkę, dopóki zwraca true i gra nie została przerwana. */
export function runLoop(signal: AbortSignal, fn: (dtMs: number) => boolean): Promise<void> {
  return new Promise((resolve) => {
    let last = performance.now();
    const frame = (t: number) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const dt = Math.max(0, Math.min(50, t - last));
      last = t;
      if (fn(dt)) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
