export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animate(ms: number, fn: (p: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      fn(p);
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

const COLS = 9;
const ROWS = 18;

/** Przejście „rozpad na kratki”: zakrywa ekran pikselami, podmienia, odkrywa. */
export async function pixelTransition(host: HTMLElement, swap: () => void): Promise<void> {
  if (reducedMotion()) {
    swap();
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = COLS;
  canvas.height = ROWS;
  canvas.className = 'px transition';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3b2a5c';
  const order = [...Array(COLS * ROWS).keys()].sort(() => Math.random() - 0.5);
  const cell = (i: number, fn: (x: number, y: number) => void) => fn(order[i] % COLS, Math.floor(order[i] / COLS));
  await animate(150, (p) => {
    const n = Math.ceil(p * order.length);
    for (let i = 0; i < n; i++) cell(i, (x, y) => ctx.fillRect(x, y, 1, 1));
  });
  swap();
  await animate(150, (p) => {
    const n = Math.ceil(p * order.length);
    for (let i = 0; i < n; i++) cell(i, (x, y) => ctx.clearRect(x, y, 1, 1));
  });
  canvas.remove();
}
