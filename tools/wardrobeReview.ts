/**
 * Strona przeglądu strojów (tylko w `npm run dev`: http://localhost:5173/tools/wardrobe-review.html): każda klatka
 * z maską w kilku strojach kontrolnych, z licznikami przecieków i braków (`src/wardrobe/review.ts`). Najgorsze
 * klatki na górze; `window.__review` — wyniki do odczytu z konsoli.
 */
import type { Outfit } from '../src/core/types';
import { FRAMES, PORTRAIT_MASKS, hasClothesMask, loadSprites, maskUrl, type FrameMeta } from '../src/sprites/loader';
import { itemUrl } from '../src/ui/home/itemSprites';
import { headSpriteNames } from '../src/wardrobe/catalog';
import { dressPixels, isBackView, isSeated, lookOf, shoeTopRow, type Pixels } from '../src/wardrobe/dresser';
import { checkDress, type DressCheck } from '../src/wardrobe/review';

const none: Outfit = { head: null, top: null, bottom: null, dress: null };
/** Stroje kontrolne: dwa do liczników (koszulka + spodnie), reszta do oglądania. */
const OUTFITS: { label: string; outfit: Outfit; scored: boolean }[] = [
  { label: 'różowa + jasne dżinsy', outfit: { ...none, top: 'top_pink', bottom: 'bottom_jeans_light' }, scored: true },
  { label: 'biała + czarne', outfit: { ...none, top: 'top_white', bottom: 'bottom_black' }, scored: true },
  { label: 'sukienka letnia', outfit: { ...none, dress: 'dress_summer_pink' }, scored: false },
  { label: 'marynarska', outfit: { ...none, dress: 'kawaii_sailor' }, scored: false },
  { label: 'korona', outfit: { ...none, head: 'head_crown' }, scored: false },
];
/** Adres: `?names=a,b,c` — tylko te klatki, `?zoom=3` — powiększenie. */
const params = new URLSearchParams(location.search);
const ONLY = params.get('names')?.split(',').filter(Boolean) ?? null;
const ZOOM = Number(params.get('zoom') ?? 2);

function pixelsOf(img: HTMLImageElement): Pixels {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { w: d.width, h: d.height, data: d.data };
}

function canvasOf(px: Pixels, marks?: DressCheck): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = px.w * ZOOM;
  c.height = px.h * ZOOM;
  const small = document.createElement('canvas');
  small.width = px.w;
  small.height = px.h;
  const d = new ImageData(px.w, px.h);
  d.data.set(px.data);
  small.getContext('2d')!.putImageData(d, 0, 0);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, c.width, c.height);
  if (marks) {
    // błędy: czerwony — przeciek, turkus — brak
    const paint = (at: number[], colour: string) => {
      ctx.fillStyle = colour;
      for (const i of at) ctx.fillRect((i % px.w) * ZOOM, Math.floor(i / px.w) * ZOOM, ZOOM, ZOOM);
    };
    paint(marks.leakAt, 'rgba(255, 0, 60, 0.85)');
    paint(marks.missAt, 'rgba(0, 230, 230, 0.85)');
  }
  return c;
}

async function main(): Promise<void> {
  const names = [...Object.keys(FRAMES).filter((n) => hasClothesMask(n)), ...PORTRAIT_MASKS].filter((n) => !ONLY || ONLY.includes(n));
  const [sprites, masks, hats] = await Promise.all([
    loadSprites(names),
    loadSprites(names, maskUrl),
    loadSprites(headSpriteNames(), itemUrl),
  ]);
  const hatPx = new Map<string, Pixels>();
  const art = (s: string) => {
    const img = hats.get(s);
    if (!img) return null;
    if (!hatPx.has(s)) hatPx.set(s, pixelsOf(img));
    return hatPx.get(s)!;
  };

  const rows: { name: string; score: number; checks: DressCheck[]; el: HTMLElement }[] = [];
  for (const name of names) {
    const img = sprites.get(name);
    const maskImg = masks.get(name);
    const meta: FrameMeta | undefined = FRAMES[name] ?? (img ? { w: img.naturalWidth, h: img.naturalHeight, anchorX: 0, scale: 1, mask: true } : undefined);
    if (!img || !meta) continue;
    const src = pixelsOf(img);
    const mask = maskImg ? pixelsOf(maskImg) : null;
    const opts = { seated: isSeated(name), back: isBackView(name), art };
    const checks: DressCheck[] = [];
    const figs: HTMLElement[] = [h('figure', {}, canvasOf(src), h('figcaption', {}, 'oryginał'))];
    for (const o of OUTFITS) {
      const scoredOpts = { ...opts, hat: !o.scored };
      const r = dressPixels(src, mask, meta, lookOf(o.outfit), scoredOpts);
      const px = r?.px ?? src;
      let check: DressCheck | undefined;
      if (o.scored) {
        // buty zostają czarne: na stojąco — strefa butów gry, na siedząco — dolne 12% klatki
        check = checkDress(src, mask, px, opts.seated ? Math.round(src.h * 0.88) : shoeTopRow(meta, src.h));
        checks.push(check);
      }
      figs.push(h('figure', {}, canvasOf(px, check), h('figcaption', {}, check ? `${o.label} · ✗${check.leak} ○${check.miss}` : o.label)));
    }
    // klatka z przodu bez koszulki w masce — strój nie zmieni góry (alarm)
    const noShirt = !opts.back && checks[0].shirt < 30;
    const score = checks.reduce((a, c) => a + c.leak + c.miss, 0) + (noShirt ? 1000 : 0);
    const el = h(
      'div',
      { class: `row${score > 0 ? ' bad' : ''}` },
      h('div', { class: 'name' }, name, h('small', {}, `błędy: ${score}${noShirt ? ' · brak koszulki w masce!' : ''}`)),
      ...figs,
    );
    rows.push({ name, score, checks, el });
  }
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const list = document.getElementById('list')!;
  list.replaceChildren(...rows.map((r) => r.el));
  const bad = rows.filter((r) => r.score > 0).length;
  document.getElementById('summary')!.textContent =
    `${rows.length} klatek · z błędami: ${bad} · razem przecieków ${rows.reduce((a, r) => a + r.checks.reduce((x, c) => x + c.leak, 0), 0)}, braków ${rows.reduce((a, r) => a + r.checks.reduce((x, c) => x + c.miss, 0), 0)}`;
  (window as unknown as { __review: unknown }).__review = rows.map((r) => ({
    name: r.name,
    score: r.score,
    leak: r.checks.map((c) => c.leak),
    miss: r.checks.map((c) => c.miss),
  }));
  const only = document.getElementById('only') as HTMLInputElement;
  only.addEventListener('change', () => rows.forEach((r) => (r.el.hidden = only.checked && r.score === 0)));
}

function h(tag: string, attrs: Record<string, string>, ...children: (Node | string)[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

void main();
