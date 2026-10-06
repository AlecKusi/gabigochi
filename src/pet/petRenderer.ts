export interface PetDraw {
  frame: HTMLImageElement;
  x: number;
  feetY: number;
  flip: boolean;
  /** Podskok „oddychania” w pikselach. */
  bob: number;
  /** Spłaszczenie 0–0.1 (squash & stretch). */
  squash: number;
  /** Wysokość skoku w pikselach. */
  jump: number;
}

export function drawShadow(ctx: CanvasRenderingContext2D, x: number, feetY: number, jump: number): void {
  const w = jump > 4 ? 14 : 20;
  ctx.fillStyle = 'rgba(42, 31, 61, 0.3)';
  ctx.fillRect(Math.round(x - w / 2), feetY - 1, w, 2);
}

export function drawPet(ctx: CanvasRenderingContext2D, o: PetDraw): void {
  ctx.save();
  ctx.translate(Math.round(o.x), Math.round(o.feetY - o.bob - o.jump));
  ctx.scale((o.flip ? -1 : 1) * (1 + o.squash), 1 - o.squash);
  ctx.drawImage(o.frame, -Math.floor(o.frame.width / 2), -o.frame.height);
  ctx.restore();
}
