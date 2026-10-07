import '../styles/bricks.css';
import { h } from '../ui/dom';
import { makeCanvas, runLoop } from './canvas';
import {
  BRICKS,
  aimAngle,
  aimPath,
  bonusCenter,
  brickRect,
  bricksReward,
  createBricks,
  fire,
  stepBricks,
  type Brick,
  type BricksEvent,
} from './bricksLogic';
import type { MiniGame } from './types';

export { bricksReward };

const { W, H, FLOOR, R, DT, CELL_H, CELL_W, LEFT, TOP, ROWS } = BRICKS;

/** Paleta od „prawie rozbity” (żółć) przez róż do „świeży, mocny” (fiolet). */
const PALETTE: { fill: string; shade: string; text: string }[] = [
  { fill: '#ffe08a', shade: '#e0b84a', text: '#1b1326' },
  { fill: '#ffd34d', shade: '#d9a92a', text: '#1b1326' },
  { fill: '#ffb38a', shade: '#e08a5e', text: '#1b1326' },
  { fill: '#ff9ec4', shade: '#d6789f', text: '#1b1326' },
  { fill: '#ff7fb0', shade: '#d65a90', text: '#1b1326' },
  { fill: '#e08ad8', shade: '#b462ae', text: '#1b1326' },
  { fill: '#b48ae0', shade: '#8d66bd', text: '#1b1326' },
  { fill: '#9b6ee0', shade: '#7a4fb3', text: '#f3ecff' },
  { fill: '#7a4fb3', shade: '#5a3590', text: '#f3ecff' },
];

/** Kolor klocka zależny od liczby trafień względem rundy (×2 = najciemniejszy fiolet). */
export function brickColor(hits: number, round: number): (typeof PALETTE)[number] {
  const idx = Math.max(0, Math.min(PALETTE.length - 1, Math.round((hits / Math.max(1, round)) * 4)));
  return PALETTE[idx];
}

/** Po tylu sekundach tury pojawia się przycisk przyspieszenia. */
const FF_AFTER = 2.5;
const SLIDE_MS = 170;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export const bricksGame: MiniGame = {
  id: 'bricks',
  name: 'Bricks n Balls',
  description: 'Celuj, strzelaj kulkami, rozbijaj klocki!',
  icon: 'bricks',
  category: 'arcade',
  reward: bricksReward,
  async play(env) {
    const { canvas, ctx, fx, present, toLogical, dispose } = makeCanvas(env.body, W, H);
    canvas.classList.add('bricks-canvas');
    const ff = h('button', { class: 'px-btn bricks-ff', type: 'button', 'aria-label': 'Przyspiesz', 'aria-pressed': 'false' }, '×2');
    ff.hidden = true;
    env.body.append(ff);

    const s = createBricks(Math.random);
    let speed = 1;
    let acc = 0;
    let clock = 0;
    let slide = 0;
    let overT = 0;
    const flash = new Map<Brick, number>();
    const particles: Particle[] = [];
    const floats: { x: number; y: number; life: number }[] = [];

    // ── Celowanie: kierunek od punktu startu w stronę palca; puszczenie = strzał,
    //    zjechanie palcem na podłogę = anulowanie.
    let aimId: number | null = null;
    let angle: number | null = null;
    let aimEnd: { x: number; y: number } | null = null;
    const updateAim = (e: PointerEvent) => {
      const p = toLogical(e);
      const a = p.y > FLOOR ? null : aimAngle({ x: s.startX, y: FLOOR - R }, p);
      if (a !== angle) aimEnd = a === null ? null : aimPath(s, a);
      angle = a;
    };
    const stopAim = () => {
      aimId = null;
      angle = null;
      aimEnd = null;
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (s.phase !== 'aim' || aimId !== null) return;
      e.preventDefault();
      aimId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* bez przechwycenia też działa, dopóki palec jest na canvasie */
      }
      updateAim(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === aimId) updateAim(e);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerId !== aimId) return;
      updateAim(e);
      const a = angle;
      stopAim();
      if (a === null || s.phase !== 'aim' || env.signal.aborted) return;
      fire(s, a);
      setSpeed(1);
      acc = 0;
    });
    canvas.addEventListener('pointercancel', (e) => {
      if (e.pointerId === aimId) stopAim();
    });

    const setSpeed = (v: number) => {
      speed = v;
      ff.classList.toggle('on', v === 2);
      ff.setAttribute('aria-pressed', String(v === 2));
    };
    ff.addEventListener('click', () => {
      if (s.phase === 'fire') setSpeed(speed === 2 ? 1 : 2);
    });

    const burst = (b: Brick) => {
      const r = brickRect(b);
      const color = brickColor(b.max, s.round).fill;
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 20 + Math.random() * 50;
        particles.push({ x: r.x + Math.random() * r.w, y: r.y + Math.random() * r.h, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.45 + Math.random() * 0.25, color });
      }
    };

    const handle = (events: BricksEvent[]) => {
      for (const e of events) {
        if (e.type === 'hit') flash.set(e.brick, 80);
        else if (e.type === 'break') {
          flash.delete(e.brick);
          burst(e.brick);
        } else if (e.type === 'bonus') {
          const c = bonusCenter(e.bonus);
          floats.push({ x: c.x, y: c.y, life: 0.7 });
        } else if (e.type === 'turn') {
          slide = 1;
          setSpeed(1);
        }
      }
    };

    // ── Rysowanie: tło i klocki w pikselach logicznych, liczby / kulki / celownik w pikselach urządzenia.
    const slideOff = () => Math.round(slide * CELL_H);

    const drawBoard = () => {
      ctx.fillStyle = '#2a1f3d';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2f2346';
      for (let c = 0; c < BRICKS.COLS; c += 2) ctx.fillRect(LEFT + c * CELL_W, 0, CELL_W, FLOOR);
      const lastY = TOP + (ROWS - 1) * CELL_H;
      if (s.bricks.some((b) => b.row >= ROWS - 2)) {
        const pulse = 0.5 + 0.5 * Math.sin(clock / 180);
        ctx.fillStyle = `rgba(224, 56, 79, ${0.12 + 0.14 * pulse})`;
        ctx.fillRect(0, lastY, W, FLOOR - lastY);
      }
      ctx.fillStyle = '#3b2a5c';
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.fillStyle = '#9b6ee0';
      ctx.fillRect(0, FLOOR, W, 1);

      const off = slideOff();
      for (const b of s.bricks) {
        const r = brickRect(b);
        const y = r.y - off;
        const col = brickColor(b.hits, s.round);
        ctx.fillStyle = col.fill;
        ctx.fillRect(r.x, y, r.w, r.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(r.x, y, r.w, 1);
        ctx.fillStyle = col.shade;
        ctx.fillRect(r.x, y + r.h - 2, r.w, 2);
        if (flash.has(b)) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillRect(r.x, y, r.w, r.h);
        }
      }

      fx.clearRect(0, 0, W, H);
      for (const p of particles) {
        fx.globalAlpha = Math.min(1, p.life * 2.5);
        fx.fillStyle = p.color;
        fx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      }
      fx.globalAlpha = 1;
    };

    const text = (d: CanvasRenderingContext2D, k: number, str: string, x: number, y: number, size: number, color: string, weight = '700', maxW?: number) => {
      d.fillStyle = color;
      d.font = `${weight} ${Math.max(1, Math.round(size * k))}px "Pixelify Sans"`;
      d.textAlign = 'center';
      d.textBaseline = 'middle';
      d.fillText(str, Math.round(x * k), Math.round(y * k), maxW === undefined ? undefined : maxW * k);
    };

    const dot = (d: CanvasRenderingContext2D, k: number, x: number, y: number, r: number) => {
      d.beginPath();
      d.arc(x * k, y * k, Math.max(1, r * k), 0, Math.PI * 2);
      d.fill();
    };

    const drawTop = (d: CanvasRenderingContext2D, k: number) => {
      const off = slideOff();
      // Liczby na klockach — ostre, w rozdzielczości urządzenia.
      for (const b of s.bricks) {
        const r = brickRect(b);
        text(d, k, String(b.hits), r.x + r.w / 2, r.y - off + (r.h - 2) / 2 + 0.5, 8, brickColor(b.hits, s.round).text, '700', r.w - 2);
      }
      // Bonusy +1 kulka: pulsujące kółka.
      const pulse = Math.sin(clock / 160);
      d.strokeStyle = '#ffd34d';
      d.fillStyle = '#ffd34d';
      d.lineWidth = Math.max(1, Math.round(k * 0.9));
      for (const bn of s.bonuses) {
        const c = bonusCenter(bn);
        d.beginPath();
        d.arc(c.x * k, (c.y - off) * k, (BRICKS.BONUS_R - 0.6 + 0.5 * pulse) * k, 0, Math.PI * 2);
        d.stroke();
        dot(d, k, c.x, c.y - off, 1.1);
      }
      // Linia celowania z kropek + duch kulki w miejscu pierwszego zetknięcia.
      if (s.phase === 'aim' && angle !== null && aimEnd) {
        const sx = s.startX;
        const sy = FLOOR - R;
        const len = Math.hypot(aimEnd.x - sx, aimEnd.y - sy);
        const ux = (aimEnd.x - sx) / (len || 1);
        const uy = (aimEnd.y - sy) / (len || 1);
        const phase = (clock / 40) % 6;
        for (let t = 6 + phase; t < len - 3; t += 6) {
          d.fillStyle = `rgba(243, 236, 255, ${0.9 - (0.5 * t) / Math.max(len, 1)})`;
          dot(d, k, sx + ux * t, sy + uy * t, 0.7);
        }
        d.strokeStyle = 'rgba(243, 236, 255, 0.85)';
        d.lineWidth = Math.max(1, Math.round(k * 0.5));
        d.beginPath();
        d.arc(aimEnd.x * k, aimEnd.y * k, R * k, 0, Math.PI * 2);
        d.stroke();
      }
      // Kulki w locie.
      d.fillStyle = '#f3ecff';
      d.beginPath();
      for (const b of s.flying) {
        d.moveTo((b.x + R) * k, b.y * k);
        d.arc(b.x * k, b.y * k, R * k, 0, Math.PI * 2);
      }
      d.fill();
      // Wyrzutnia: kulki czekające w punkcie startu i te, które już wróciły.
      const waiting = s.phase === 'aim' ? s.balls : s.toFire;
      if (s.phase !== 'over' && waiting > 0) {
        d.fillStyle = '#f3ecff';
        dot(d, k, s.startX, FLOOR - R, R);
        text(d, k, `×${waiting}`, s.startX, FLOOR + 4.5, 6, '#f3ecff', '700');
      }
      if (s.phase === 'fire' && s.nextX !== null) {
        const back = s.balls - s.toFire - s.flying.length;
        d.fillStyle = '#ffd34d';
        dot(d, k, s.nextX, FLOOR - R, R);
        if (back > 0) text(d, k, `×${back}`, s.nextX, FLOOR + 4.5, 6, '#ffd34d', '700');
      }
      for (const f of floats) {
        d.globalAlpha = Math.min(1, f.life * 2);
        text(d, k, '+1', f.x, f.y - (0.7 - f.life) * 18, 8, '#ffd34d');
      }
      d.globalAlpha = 1;
      if (s.round === 1 && s.phase === 'aim' && angle === null) {
        text(d, k, 'Przeciągnij palcem i puść', W / 2, 150, 7, '#c9c3d6', '400', W - 8);
      }
      if (s.phase === 'over') {
        d.fillStyle = `rgba(27, 19, 38, ${Math.min(0.6, overT / 800)})`;
        d.fillRect(0, 0, d.canvas.width, d.canvas.height);
        text(d, k, 'Koniec!', W / 2, H / 2 - 8, 16, '#ffd34d');
        text(d, k, `Runda ${s.round}`, W / 2, H / 2 + 8, 9, '#f3ecff', '400');
      }
    };

    const animate = (dt: number) => {
      const sec = dt / 1000;
      slide = Math.max(0, slide - dt / SLIDE_MS);
      for (const [b, t] of flash) {
        if (t - dt <= 0) flash.delete(b);
        else flash.set(b, t - dt);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= sec;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += 120 * sec;
        p.x += p.vx * sec;
        p.y += p.vy * sec;
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].life -= sec;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }
    };

    await runLoop(env.signal, (dt) => {
      clock += dt;
      if (s.phase === 'fire') {
        acc += (dt / 1000) * speed;
        let n = 0;
        while (acc >= DT && s.phase === 'fire' && n++ < 40) {
          handle(stepBricks(s, Math.random));
          acc -= DT;
        }
        if (s.phase !== 'fire') acc = 0;
      }
      ff.hidden = !(s.phase === 'fire' && s.turnT > FF_AFTER);
      animate(dt);
      drawBoard();
      present(drawTop);
      env.setHud(`Runda ${s.round} · kulek ${s.balls + s.pending}`);
      if (s.phase === 'over') {
        overT += dt;
        return overT < 1600;
      }
      return true;
    });

    ff.remove();
    dispose();
    return s.round;
  },
};
