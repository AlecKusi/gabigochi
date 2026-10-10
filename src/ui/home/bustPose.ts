import type { BustName } from '../../home/interactionPlan';
import type { FrameMeta } from '../../sprites/loader';

/**
 * Popiersia z arkusza łazienki (`gabi_turban`, `gabi_hairdryer`) kończą się w pół tułowia. Rysujemy je na nogach
 * z `idle_front`: dół klatki stojącej Gabi od wiersza `cut` (pas koszulki) w dół, a nad nim popiersie w skali
 * postaci, z dolną krawędzią w tym samym wierszu i z czubkiem głowy w osi postaci. Suszarka trzyma prawą rękę
 * w górze — opuszczoną prawą dłoń z `idle_front` (wiersze `cut`…`armRows`, kolumny od `armClipX`) wycinamy.
 * Mycie zębów i czesanie (osobny arkusz, drobniejsze piksele) mają własną skalę (`ownScale`).
 */
export interface BustCfg {
  /** Wiersz `idle_front` (px natywne), od którego rysujemy nogi; na nim stoi dolna krawędź popiersia. */
  cut: number;
  /** Do tego wiersza nogi są przycięte do kolumn [0, armClipX) — bez drugiej prawej dłoni. */
  armRows?: number;
  armClipX?: number;
  /** Popiersie w swojej skali (`FrameMeta.scale`), a nie w skali nóg — arkusz z innym rozmiarem piksela. */
  ownScale?: boolean;
}

const MIRROR: BustCfg = { cut: 33, ownScale: true };

export const BUSTS: Readonly<Record<BustName, BustCfg>> = {
  gabi_turban: { cut: 33 },
  gabi_hairdryer: { cut: 33, armRows: 39, armClipX: 18 },
  brush_1: MIRROR,
  brush_2: MIRROR,
  brush_3: MIRROR,
  comb_1: MIRROR,
  comb_2: MIRROR,
  comb_3: MIRROR,
};

/** Kawałek do narysowania: obrazek, prostokąt źródłowy (px natywne) i docelowy (px urządzenia). */
export interface BustPiece {
  img: 'body' | 'bust';
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** Kawałki złożonej postaci (nogi z `body`, popiersie `bust`) w pikselach urządzenia; `k` px urządzenia na px logiczny. */
export function bustPieces(body: FrameMeta, bust: FrameMeta, cfg: BustCfg, k: number, x: number, feetY: number): BustPiece[] {
  const s = body.scale;
  const x0 = Math.round(x * k) - Math.round(body.anchorX * s * k);
  const y0 = Math.round(feetY * k) - Math.round((body.foot ?? body.h) * s * k);
  const rowY = (r: number) => y0 + Math.round(r * s * k);
  const colX = (c: number) => x0 + Math.round(c * s * k);
  const legs = (r0: number, r1: number, c1: number): BustPiece => ({
    img: 'body', sx: 0, sy: r0, sw: c1, sh: r1 - r0, dx: x0, dy: rowY(r0), dw: colX(c1) - x0, dh: rowY(r1) - rowY(r0),
  });
  const pieces: BustPiece[] = [];
  if (cfg.armRows !== undefined && cfg.armClipX !== undefined && cfg.armRows > cfg.cut) {
    pieces.push(legs(cfg.cut, cfg.armRows, cfg.armClipX), legs(cfg.armRows, body.h, body.w));
  } else {
    pieces.push(legs(cfg.cut, body.h, body.w));
  }
  const bs = cfg.ownScale ? bust.scale : s;
  const bw = Math.round(bust.w * bs * k);
  const bh = Math.round(bust.h * bs * k);
  const bottom = rowY(cfg.cut);
  pieces.push({ img: 'bust', sx: 0, sy: 0, sw: bust.w, sh: bust.h, dx: Math.round(x * k) - Math.round(bust.anchorX * bs * k), dy: bottom - bh, dw: bw, dh: bh });
  return pieces;
}

/** Rysuje złożoną postać (patrz `bustPieces`). */
export function drawBust(
  ctx: CanvasRenderingContext2D,
  k: number,
  imgs: { body: CanvasImageSource; bust: CanvasImageSource },
  metas: { body: FrameMeta; bust: FrameMeta },
  cfg: BustCfg,
  x: number,
  feetY: number,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const p of bustPieces(metas.body, metas.bust, cfg, k, x, feetY)) {
    if (p.dw <= 0 || p.dh <= 0) continue;
    ctx.drawImage(imgs[p.img], p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh);
  }
  ctx.restore();
}
