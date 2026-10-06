/** Cień pod postacią (px logiczne); przy skoku węższy. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, feetY: number, jump: number): void {
  const w = jump > 4 ? 14 : 20;
  ctx.fillStyle = 'rgba(42, 31, 61, 0.3)';
  ctx.fillRect(Math.round(x - w / 2), feetY - 1, w, 2);
}
