import { play } from '../ui/sound';
import { makeCanvas, runLoop } from './canvas';
import { drawCat, preloadCat } from './catDraw';
import { OBSTACLES, RUN, catRunReward, createRun, jumpRun, runScore, stepRun, type Obstacle, type RunState } from './catRunLogic';
import type { MiniGame } from './types';

const { W, H, groundY: G } = RUN;
const CAT_ZOOM = 1;

/** Doniczka z kwiatkiem, ogórek albo wysoka doniczka (x — lewy brzeg, na ziemi). */
function drawObstacle(c: CanvasRenderingContext2D, o: Obstacle): void {
  const { w, h } = OBSTACLES[o.kind];
  const x = Math.round(o.x);
  const top = G - h;
  c.fillStyle = '#1b1326';
  if (o.kind === 'cucumber') {
    c.fillRect(x, top, w, h);
    c.fillStyle = '#5fb84a';
    c.fillRect(x + 1, top + 1, w - 2, h - 2);
    c.fillStyle = '#2f7a34';
    for (let i = x + 2; i < x + w - 2; i += 3) c.fillRect(i, top + 2, 1, 1);
    c.fillStyle = '#a8e08c';
    c.fillRect(x + 2, top + 1, w - 4, 1);
    return;
  }
  // roślinka nad doniczką
  const pot = Math.round(h * 0.6);
  c.fillRect(x + 1, top - 1, w - 2, h - pot + 1);
  c.fillStyle = '#5fb84a';
  c.fillRect(x + 2, top, w - 4, h - pot);
  if (o.kind === 'tall') {
    c.fillStyle = '#ff9ec4';
    c.fillRect(x + w / 2 - 1, top, 2, 2);
  }
  // doniczka
  c.fillStyle = '#1b1326';
  c.fillRect(x, G - pot, w, pot);
  c.fillStyle = '#d9774a';
  c.fillRect(x + 1, G - pot + 1, w - 2, pot - 1);
  c.fillStyle = '#a34e2a';
  c.fillRect(x + 1, G - pot + 1, w - 2, 1);
}

/** Rybka w powietrzu (środek x, wysokość nad ziemią), lekko się kołysze. */
function drawFish(c: CanvasRenderingContext2D, x: number, t: number): void {
  const y = Math.round(G - RUN.fishH - Math.sin(t / 250 + x) * 1.5);
  const fx = Math.round(x) - 4;
  c.fillStyle = '#1b1326';
  c.fillRect(fx - 1, y - 2, 8, 5);
  c.fillRect(fx + 7, y - 2, 2, 5);
  c.fillStyle = '#5aa8f0';
  c.fillRect(fx, y - 1, 6, 3);
  c.fillRect(fx + 7, y - 1, 1, 3);
  c.fillStyle = '#ffffff';
  c.fillRect(fx + 1, y - 1, 1, 1);
}

export const catRunGame: MiniGame = {
  id: 'catrun',
  name: 'Skaczący kotek',
  description: 'Skacz nad doniczkami, łap rybki!',
  icon: 'fish',
  category: 'arcade',
  reward: catRunReward,
  async play(env) {
    preloadCat(['cat_run_1', 'cat_run_2', 'cat_leap', 'cat_scared', 'cat_sit']);
    const { canvas, ctx, present, dispose } = makeCanvas(env.body, W, H);
    let s: RunState = createRun();
    let started = false;

    const jump = () => {
      if (!started) {
        started = true;
        return;
      }
      const r = jumpRun(s);
      s = r.state;
      if (r.events.length) play('jump');
    };
    canvas.addEventListener('pointerdown', jump);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      jump();
    };
    document.addEventListener('keydown', onKey);

    let crashT = 0;
    const draw = () => {
      // niebo, chmurki i wzgórza przesuwające się wolniej niż ziemia
      ctx.fillStyle = '#9fc4f0';
      ctx.fillRect(0, 0, W, G);
      ctx.fillStyle = '#c7e6ff';
      ctx.fillRect(0, 40, W, G - 40);
      ctx.fillStyle = '#ffffff';
      for (const [x0, y, w] of [[10, 14, 16], [60, 8, 12], [100, 22, 18]] as const) {
        const x = Math.round(((x0 - s.distance * 0.1) % (W + 30) + W + 30) % (W + 30)) - 20;
        ctx.fillRect(x, y, w, 4);
        ctx.fillRect(x + 3, y - 2, w - 6, 2);
      }
      ctx.fillStyle = '#b48ae0';
      for (let i = 0; i < 6; i++) {
        const x = Math.round(((i * 40 - s.distance * 0.3) % 240 + 240) % 240) - 40;
        ctx.fillRect(x, G - 18, 36, 18);
        ctx.fillRect(x + 6, G - 24, 24, 6);
        ctx.fillRect(x + 12, G - 28, 12, 4);
      }
      // ziemia z przesuwającymi się płytkami
      ctx.fillStyle = '#8d68c4';
      ctx.fillRect(0, G, W, H - G);
      ctx.fillStyle = '#5a3f8a';
      ctx.fillRect(0, G, W, 2);
      ctx.fillStyle = '#7a58b2';
      for (let x = -((s.distance % 12) | 0); x < W; x += 12) ctx.fillRect(x, G + 6, 6, 1);
      for (const o of s.obstacles) drawObstacle(ctx, o);
      for (const f of s.fish) drawFish(ctx, f.x, s.t);
      const sprite = s.over ? 'cat_scared' : !started ? 'cat_sit' : s.y > 0 ? 'cat_leap' : Math.floor(s.distance / 9) % 2 ? 'cat_run_1' : 'cat_run_2';
      present((d, k) => {
        drawCat(d, k, sprite, RUN.catX, G - Math.round(s.y), { zoom: CAT_ZOOM });
        if (!started) {
          d.font = `700 ${9 * k}px "Pixelify Sans"`;
          d.textAlign = 'center';
          d.lineWidth = 2 * k;
          d.strokeStyle = '#1b1326';
          d.strokeText('Stuknij, żeby zacząć!', (W / 2) * k, 50 * k);
          d.fillStyle = '#ffffff';
          d.fillText('Stuknij, żeby zacząć!', (W / 2) * k, 50 * k);
        }
      });
    };

    await runLoop(env.signal, (dt) => {
      if (started && !s.over) {
        const r = stepRun(s, dt, Math.random);
        s = r.state;
        for (const e of r.events) {
          if (e.type === 'fish') play('catch');
          if (e.type === 'crash') play('bad');
        }
      }
      if (s.over) crashT += dt;
      draw();
      env.setHud(`${runScore(s)} pkt · rybki: ${s.fishCount}`);
      return crashT < 1200;
    });
    document.removeEventListener('keydown', onKey);
    dispose();
    return runScore(s);
  },
};
