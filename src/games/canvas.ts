import { h } from '../ui/dom';

export interface GameCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  toLogical(e: PointerEvent): { x: number; y: number };
  dispose(): void;
}

/** Canvas w rozdzielczości logicznej, skalowany do miejsca (całkowicie, gdy się da). */
export function makeCanvas(body: HTMLElement, w: number, hgt: number): GameCanvas {
  const canvas = h('canvas', { class: 'px game-canvas', width: w, height: hgt });
  body.append(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const fit = () => {
    const s = Math.min(body.clientWidth / w, body.clientHeight / hgt);
    const scale = s >= 2 ? Math.floor(s) : s;
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
      const dt = Math.min(50, t - last);
      last = t;
      if (fn(dt)) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
