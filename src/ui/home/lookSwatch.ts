import { drawFloor, drawWallpaper, type LookDef } from '../../home/looks';
import { h } from '../dom';

/** Próbka tapety lub podłogi: wzór narysowany w `w`×`h` px logicznych i powiększony `scale` razy. */
export function lookSwatch(look: LookDef, w: number, hgt: number, scale: number): HTMLCanvasElement {
  const c = h('canvas', { class: 'px look-swatch', width: w, height: hgt });
  c.style.width = `${w * scale}px`;
  c.style.height = `${hgt * scale}px`;
  const ctx = c.getContext('2d');
  if (ctx) {
    if (look.kind === 'wallpaper') drawWallpaper(ctx, look, w, hgt);
    else drawFloor(ctx, look, 0, w, hgt);
  }
  return c;
}
