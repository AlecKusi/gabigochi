export type PixelArt = readonly string[];

export const PALETTE: Readonly<Record<string, string>> = {
  k: '#1b1326', // kontur
  w: '#ffffff',
  g: '#c9c3d6',
  r: '#e0384f',
  R: '#9c1f36',
  o: '#f08a3c',
  y: '#ffd34d',
  Y: '#c99a2e',
  b: '#b5763f',
  B: '#5c3a26',
  c: '#f4dcb0',
  G: '#5fb84a',
  D: '#2f7a34',
  p: '#b48ae0',
  P: '#7a4fb3',
  l: '#e6d7ff',
  i: '#ff9ec4',
  u: '#5aa8f0',
  U: '#2f5fae',
};

export function drawArt(ctx: CanvasRenderingContext2D, art: PixelArt, x: number, y: number, scale = 1): void {
  for (let r = 0; r < art.length; r++) {
    const row = art[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(Math.round(x + c * scale), Math.round(y + r * scale), scale, scale);
    }
  }
}

const canvasCache = new Map<PixelArt, HTMLCanvasElement>();

/** Pixel art wyrenderowany raz do małego canvasa — do szybkiego drawImage w grach. */
export function artCanvas(art: PixelArt): HTMLCanvasElement {
  let canvas = canvasCache.get(art);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = art[0].length;
    canvas.height = art.length;
    drawArt(canvas.getContext('2d')!, art, 0, 0);
    canvasCache.set(art, canvas);
  }
  return canvas;
}

const urlCache = new Map<string, string>();

/** Pixel art jako data URL w danej skali — ostre krawędzie bez polegania na CSS. */
export function artDataUrl(key: string, art: PixelArt, scale: number): string {
  const cacheKey = `${key}@${scale}`;
  let url = urlCache.get(cacheKey);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = art[0].length * scale;
    canvas.height = art.length * scale;
    drawArt(canvas.getContext('2d')!, art, 0, 0, scale);
    url = canvas.toDataURL('image/png');
    urlCache.set(cacheKey, url);
  }
  return url;
}
