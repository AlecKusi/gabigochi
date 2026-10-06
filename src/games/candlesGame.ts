import { content } from '../content';
import { drawPet } from '../pet/petRenderer';
import { makeCanvas, runLoop } from './canvas';
import { CANDLES, blowCandle, createCandles, stepCandles, type CandlesState } from './candlesLogic';
import { candlesReward } from './rewards';
import type { MiniGame } from './types';

const W = 128;
const H = 176;

interface CandlePos {
  x: number;
  top: number;
  base: number;
  w: number;
}

function candlePos(phase: CandlesState['phase'], i: number): CandlePos {
  if (phase === 'main') return { x: 20 + i * 12, top: 96, base: 108, w: 4 };
  const back = i < 13;
  const x = back ? 14 + i * 8 : 18 + (i - 13) * 8;
  const base = back ? 102 : 112;
  return { x, top: base - 10, base, w: 3 };
}

function isLit(s: CandlesState, i: number): boolean {
  return s.phase === 'main' ? s.lit[i] != null : s.finale[i] === true;
}

function hitCandle(s: CandlesState, x: number, y: number): number {
  const count = s.phase === 'main' ? CANDLES.slots : CANDLES.finaleCount;
  const reach = s.phase === 'main' ? 7 : 4;
  let best = -1;
  let bestDx = Infinity;
  for (let i = 0; i < count; i++) {
    if (!isLit(s, i)) continue;
    const p = candlePos(s.phase, i);
    const dx = Math.abs(x - (p.x + p.w / 2));
    if (dx <= reach && y >= p.top - 14 && y <= p.base + 4 && dx < bestDx) {
      best = i;
      bestDx = dx;
    }
  }
  return best;
}

export const candlesGame: MiniGame = {
  id: 'candles',
  name: 'Zdmuchnij świeczki',
  description: 'Stukaj w płomyki, zanim zgasną!',
  icon: 'cake',
  category: 'arcade',
  reward: candlesReward,
  async play(env) {
    const { canvas, ctx, toLogical, dispose } = makeCanvas(env.body, W, H);
    let s = createCandles();
    let clock = 0;
    const puffs: { x: number; y: number; life: number }[] = [];

    canvas.addEventListener('pointerdown', (e) => {
      const p = toLogical(e);
      const idx = hitCandle(s, p.x, p.y);
      if (idx < 0) return;
      const pos = candlePos(s.phase, idx);
      s = blowCandle(s, idx);
      puffs.push({ x: pos.x + pos.w / 2, y: pos.top - 4, life: 0.6 });
    });

    const drawCandle = (p: CandlePos, lit: boolean) => {
      ctx.fillStyle = '#5aa8f0';
      ctx.fillRect(p.x, p.top, p.w, p.base - p.top);
      ctx.fillStyle = '#ffffff';
      for (let y = p.top + 1; y < p.base; y += 3) ctx.fillRect(p.x, y, p.w, 1);
      ctx.fillStyle = '#1b1326';
      ctx.fillRect(p.x + Math.floor(p.w / 2), p.top - 2, 1, 2);
      if (!lit) return;
      const flicker = Math.floor(clock / 120) % 2;
      const cx = p.x + Math.floor(p.w / 2);
      ctx.fillStyle = 'rgba(255, 211, 77, 0.25)';
      ctx.fillRect(cx - 3, p.top - 9, 7, 7);
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(cx - 1, p.top - 6, 3, 4);
      ctx.fillStyle = '#f08a3c';
      ctx.fillRect(cx - 1 + flicker, p.top - 8, 1, 2);
    };

    const drawCake = () => {
      ctx.fillStyle = '#2a1f3d';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3b2a5c';
      ctx.fillRect(0, 156, W, H - 156);
      if (s.phase === 'main') {
        ctx.fillStyle = '#ff9ec4';
        ctx.fillRect(16, 108, 96, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 108, 96, 3);
        for (let x = 20; x < 110; x += 9) ctx.fillRect(x, 111, 3, 3);
        ctx.fillStyle = '#b48ae0';
        ctx.fillRect(10, 130, 108, 26);
        ctx.fillStyle = '#f3ecff';
        ctx.fillRect(10, 130, 108, 3);
        ctx.fillStyle = '#ffd34d';
        for (let x = 16; x < 116; x += 12) ctx.fillRect(x, 142, 2, 2);
      } else {
        ctx.fillStyle = '#f3ecff';
        ctx.fillRect(8, 98, 112, 14);
        ctx.fillStyle = '#ff9ec4';
        ctx.fillRect(8, 112, 112, 44);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 112, 112, 3);
        ctx.fillStyle = '#b48ae0';
        ctx.fillRect(8, 136, 112, 4);
      }
      ctx.fillStyle = '#c9c3d6';
      ctx.fillRect(4, 156, 120, 3);
      const count = s.phase === 'main' ? CANDLES.slots : CANDLES.finaleCount;
      for (let i = 0; i < count; i++) drawCandle(candlePos(s.phase, i), isLit(s, i));
    };

    const drawPuffs = (dt: number) => {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt / 1000;
        p.y -= (dt / 1000) * 12;
        if (p.life <= 0) {
          puffs.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(201, 195, 214, ${p.life})`;
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y), 3, 2);
        ctx.fillRect(Math.round(p.x), Math.round(p.y - 2), 2, 2);
      }
    };

    await runLoop(env.signal, (dt) => {
      clock += dt;
      s = stepCandles(s, dt, Math.random);
      drawCake();
      drawPuffs(dt);
      if (s.phase === 'main') {
        env.setHud(`${s.score} pkt · ${Math.max(0, Math.ceil((CANDLES.mainDuration - s.phaseT) / 1000))} s`);
      } else if (s.phase === 'finale') {
        const left = s.finale.filter(Boolean).length;
        ctx.fillStyle = '#ffd34d';
        ctx.font = '700 10px "Pixelify Sans"';
        ctx.textAlign = 'center';
        ctx.fillText(`Finał! Zdmuchnij ${content.age}!`, W / 2, 24);
        env.setHud(`${s.score} pkt · zostało ${left} · ${Math.max(0, Math.ceil((CANDLES.finaleDuration - s.phaseT) / 1000))} s`);
      }
      return s.phase !== 'done';
    });

    let party = 0;
    await runLoop(env.signal, (dt) => {
      party += dt;
      ctx.fillStyle = '#2a1f3d';
      ctx.fillRect(0, 0, W, H);
      const wave = env.sprites.get('fun_wave');
      if (wave) drawPet(ctx, { frame: wave, x: W / 2, feetY: 150, flip: false, bob: Math.floor(party / 300) % 2, squash: 0, jump: 0 });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd34d';
      ctx.font = '700 12px "Pixelify Sans"';
      ctx.fillText(content.wishesTitle, W / 2, 30);
      ctx.fillStyle = '#f3ecff';
      ctx.font = '8px "Pixelify Sans"';
      ctx.fillText('Wszystkiego najlepszego!', W / 2, 46);
      return party < 2200;
    });

    dispose();
    return s.score;
  },
};
