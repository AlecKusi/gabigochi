import { createPixelStage, type SpriteStep } from '../ui/pixelStage';

export interface GameCanvas {
  canvas: HTMLCanvasElement;
  /** Warstwa tła w pikselach logicznych (dotychczasowy kod gier rysuje tutaj). */
  ctx: CanvasRenderingContext2D;
  /** Warstwa efektów nad postacią, w pikselach logicznych. */
  fx: CanvasRenderingContext2D;
  /** Pikseli urządzenia na piksel logiczny. */
  readonly k: number;
  /** Pokazuje klatkę: tło, `drawSprites` (w pikselach urządzenia), efekty. */
  present(drawSprites?: SpriteStep): void;
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

/**
 * Scena gry w rozdzielczości urządzenia, wpasowana w `body`. Skala (px urządzenia na px logiczny)
 * jest całkowita, gdy się da — wtedy tło rysowane w pikselach logicznych zostaje równe.
 */
export function makeCanvas(body: HTMLElement, w: number, hgt: number): GameCanvas {
  const stage = createPixelStage(w, hgt);
  const { canvas } = stage;
  canvas.classList.add('game-canvas');
  body.append(canvas);
  const fit = () => {
    // Pole robocze to wnętrze elementu (bez paddingu).
    const cs = getComputedStyle(body);
    const availW = body.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const availH = body.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    if (availW <= 0 || availH <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const scale = fitScale(Math.min(availW / w, availH / hgt) * dpr);
    canvas.style.width = `${(w * scale) / dpr}px`;
  };
  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(body);
  return {
    canvas,
    ctx: stage.bg,
    fx: stage.fx,
    get k() {
      return stage.k;
    },
    present: stage.compose,
    toLogical: stage.toLogical,
    dispose() {
      observer.disconnect();
      stage.dispose();
    },
  };
}

/** Pauza wszystkich pętli gier (otwarte okienko zasad) — czas gry stoi. */
let paused = false;
export function setGamesPaused(v: boolean): void {
  paused = v;
}
export function gamesPaused(): boolean {
  return paused;
}

/** Pętla gry: woła `fn(dt)` co klatkę, dopóki zwraca true i gra nie została przerwana (w pauzie czas stoi). */
export function runLoop(signal: AbortSignal, fn: (dtMs: number) => boolean): Promise<void> {
  return new Promise((resolve) => {
    let last = performance.now();
    const frame = (t: number) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      if (paused) {
        last = t;
        requestAnimationFrame(frame);
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
