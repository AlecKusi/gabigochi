import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';
import { play } from '../ui/sound';
import { makeCanvas, runLoop } from './canvas';
import { BOXES, catBoxesReward, createBoxes, stepBoxes, tapBox, type Hole, type BoxesState } from './catBoxesLogic';
import { drawCat, preloadCat } from './catDraw';
import type { MiniGame } from './types';

const W = 128;
const H = 168;
/** Pudełka 3×3: środki kolumn i góry (otwory) wierszy; wymiary przedniej ścianki. */
const COLS = [22, 64, 106];
const ROWS = [62, 104, 146];
const BOX_W = 32;
const BOX_H = 16;
/** Jak głęboko łapki kota są w pudełku, gdy całkiem wystaje (zasłania je przednia ścianka). */
const DEPTH = 6;
const HIDE = 24;
const RISE_MS = 140;
const CAT_ZOOM = 1.35;
const GOLDEN = ['rgba(255, 211, 77, 0.55)'];

const boxAt = (i: number) => ({ cx: COLS[i % 3], top: ROWS[Math.floor(i / 3)] });

/** Jak wysoko wysunięty (0–1): wyskakuje i chowa się płynnie. */
function rise(h: Hole, t: number): number {
  const up = Math.min(1, (t - h.since) / RISE_MS);
  const down = h.hit ? 1 : Math.min(1, Math.max(0, (h.until - t) / RISE_MS));
  return Math.max(0, Math.min(up, down));
}

/** Stuknięte pudełko (px logiczne): nad otworem albo w przedniej ściance. */
function hitBox(x: number, y: number): number {
  for (let i = 0; i < BOXES.count; i++) {
    const { cx, top } = boxAt(i);
    if (Math.abs(x - cx) <= BOX_W / 2 + 1 && y >= top - 28 && y <= top + BOX_H) return i;
  }
  return -1;
}

export const catBoxesGame: MiniGame = {
  id: 'catboxes',
  name: 'Kot w pudełkach',
  description: 'Stuknij kotka, zanim się schowa!',
  icon: 'catface',
  category: 'arcade',
  reward: catBoxesReward,
  async play(env) {
    preloadCat(['cat_beg', 'cat_scared', 'cat_sit']);
    const { canvas, ctx, fx, present, toLogical, dispose } = makeCanvas(env.body, W, H);
    let s: BoxesState = createBoxes();
    const floaters: { x: number; y: number; text: string; color: string; life: number }[] = [];
    let flash = 0;

    canvas.addEventListener('pointerdown', (e) => {
      const p = toLogical(e);
      const i = hitBox(p.x, p.y);
      if (i < 0) return;
      const r = tapBox(s, i);
      s = r.state;
      for (const ev of r.events) {
        if (ev.type === 'miss') play('thud');
        if (ev.type !== 'hit') continue;
        const { cx, top } = boxAt(i);
        const good = ev.points > 0;
        floaters.push({ x: cx, y: top - 22, text: `${good ? '+' : ''}${ev.points}`, color: good ? '#ffd34d' : '#ff6b81', life: 700 });
        if (ev.kind === 'cucumber') {
          flash = 260;
          play('bad');
        } else play(ev.kind === 'golden' ? 'sparkle' : 'catch');
      }
    });

    const drawRoom = () => {
      ctx.fillStyle = '#cdb8f0';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#c2abea';
      for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 4, 36);
      ctx.fillStyle = '#8d68c4';
      ctx.fillRect(0, 36, W, H - 36);
      ctx.fillStyle = '#7a58b2';
      for (let y = 44; y < H; y += 10) ctx.fillRect(0, y, W, 1);
      // tylne ścianki i ciemne wnętrza pudełek
      for (let i = 0; i < BOXES.count; i++) {
        const { cx, top } = boxAt(i);
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(cx - BOX_W / 2 + 2, top - 5, BOX_W - 4, 5);
        ctx.fillStyle = '#3b2414';
        ctx.fillRect(cx - BOX_W / 2 + 3, top - 3, BOX_W - 6, 3);
      }
    };

    const drawFronts = () => {
      fx.clearRect(0, 0, W, H);
      for (let i = 0; i < BOXES.count; i++) {
        const { cx, top } = boxAt(i);
        const x = cx - BOX_W / 2;
        fx.fillStyle = '#1b1326';
        fx.fillRect(x - 1, top - 1, BOX_W + 2, BOX_H + 2);
        fx.fillStyle = '#c98c4f';
        fx.fillRect(x, top, BOX_W, BOX_H);
        fx.fillStyle = '#e0a868';
        fx.fillRect(x, top, BOX_W, 2);
        fx.fillStyle = '#a8703a';
        fx.fillRect(x, top + BOX_H - 2, BOX_W, 2);
        // taśma i klapki
        fx.fillStyle = '#e8d3a8';
        fx.fillRect(cx - 2, top, 4, BOX_H);
        fx.fillStyle = '#b07b44';
        fx.fillRect(x - 4, top - 4, 6, 3);
        fx.fillRect(x + BOX_W - 2, top - 4, 6, 3);
      }
      for (let i = 0; i < s.holes.length; i++) {
        const { cx, top } = boxAt(i);
        // ogórek: zielony, wystaje jak kot
        const hole = s.holes[i];
        if (hole?.kind !== 'cucumber') continue;
        const lift = Math.round(rise(hole, s.t) * 14);
        if (lift <= 0) continue;
        fx.fillStyle = '#1b1326';
        fx.fillRect(cx - 3, top - lift - 1, 7, lift + 1);
        fx.fillStyle = '#5fb84a';
        fx.fillRect(cx - 2, top - lift, 5, lift);
        fx.fillStyle = '#2f7a34';
        for (let y = top - lift + 2; y < top; y += 3) fx.fillRect(cx - 1, y, 1, 1);
        fx.fillStyle = '#a8e08c';
        fx.fillRect(cx + 1, top - lift + 1, 1, Math.max(1, lift - 2));
      }
      if (flash > 0) {
        fx.fillStyle = `rgba(95, 184, 74, ${flash / 700})`;
        fx.fillRect(0, 0, W, H);
      }
      // pozostały czas jako pasek u góry
      const left = Math.max(0, 1 - s.t / BOXES.duration);
      fx.fillStyle = '#1b1326';
      fx.fillRect(3, 3, W - 6, 4);
      fx.fillStyle = left > 0.25 ? '#ffd34d' : '#e0384f';
      fx.fillRect(4, 4, Math.round((W - 8) * left), 2);
      fx.drawImage(artCanvas(ICONS.catface), W - 15, 9);
    };

    await runLoop(env.signal, (dt) => {
      const r = stepBoxes(s, dt, Math.random);
      s = r.state;
      if (r.events.some((ev) => ev.type === 'pop' && ev.kind !== 'cucumber')) play('peek');
      flash = Math.max(0, flash - dt);
      drawRoom();
      drawFronts();
      present((d, k) => {
        // koty wysuwają się zza przedniej ścianki (rysowanej na warstwie efektów, nad nimi)
        s.holes.forEach((hole, i) => {
          if (!hole || hole.kind === 'cucumber') return;
          const { cx, top } = boxAt(i);
          const up = rise(hole, s.t);
          if (up <= 0) return;
          const feet = top + DEPTH + Math.round((1 - up) * HIDE);
          // wnętrze pudełka: nic nie wystaje pod przednią ścianką
          d.save();
          d.beginPath();
          d.rect((cx - BOX_W / 2) * k, 0, BOX_W * k, (top + BOX_H) * k);
          d.clip();
          drawCat(d, k, hole.hit ? 'cat_scared' : 'cat_beg', cx, feet, { zoom: CAT_ZOOM, tints: hole.kind === 'golden' ? GOLDEN : [] });
          d.restore();
        });
        // „+1”, „+5”, „-3” unoszące się nad pudełkiem
        for (let i = floaters.length - 1; i >= 0; i--) {
          const f = floaters[i];
          f.life -= dt;
          f.y -= dt * 0.02;
          if (f.life <= 0) {
            floaters.splice(i, 1);
            continue;
          }
          d.globalAlpha = Math.min(1, f.life / 300);
          d.font = `700 ${9 * k}px "Pixelify Sans"`;
          d.textAlign = 'center';
          d.lineWidth = 2 * k;
          d.strokeStyle = '#1b1326';
          d.strokeText(f.text, f.x * k, f.y * k);
          d.fillStyle = f.color;
          d.fillText(f.text, f.x * k, f.y * k);
          d.globalAlpha = 1;
        }
      });
      env.setHud(`${s.score} pkt · ${Math.max(0, Math.ceil((BOXES.duration - s.t) / 1000))} s`);
      return !s.over;
    });
    dispose();
    return s.score;
  },
};
