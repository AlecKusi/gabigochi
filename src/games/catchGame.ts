import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';
import { drawPet } from '../pet/petRenderer';
import { ANIMATIONS, frameAt, resolveAnimation } from '../sprites/animations';
import { makeCanvas, runLoop } from './canvas';
import { CATCH, createCatch, stepCatch } from './catchLogic';
import { catchReward } from './rewards';
import type { MiniGame } from './types';

export const catchGame: MiniGame = {
  id: 'catch',
  name: 'Łapanie jedzenia',
  description: 'Łap smakołyki, omijaj brokuły!',
  icon: 'pizza',
  category: 'arcade',
  reward: catchReward,
  async play(env) {
    const { canvas, ctx, toLogical, dispose } = makeCanvas(env.body, CATCH.W, CATCH.H);
    let s = createCatch();
    const aim = (e: PointerEvent) => {
      s = { ...s, targetX: toLogical(e).x };
    };
    canvas.addEventListener('pointerdown', aim);
    canvas.addEventListener('pointermove', aim);
    const walk = resolveAnimation(ANIMATIONS, 'walk');
    const idle = env.sprites.get('idle_front');
    let walkT = 0;
    let flash = 0;

    const draw = () => {
      ctx.fillStyle = '#cdb8f0';
      ctx.fillRect(0, 0, CATCH.W, CATCH.H);
      ctx.fillStyle = '#c2abea';
      for (let x = 0; x < CATCH.W; x += 8) ctx.fillRect(x, 0, 4, CATCH.H);
      ctx.fillStyle = '#8d68c4';
      ctx.fillRect(0, CATCH.playerY, CATCH.W, CATCH.H - CATCH.playerY);
      for (const it of s.items) ctx.drawImage(artCanvas(ICONS[it.kind]), Math.round(it.x), Math.round(it.y));
      const img = s.moving !== 0 ? env.sprites.get(frameAt(walk, walkT)) : idle;
      if (img) drawPet(ctx, { frame: img, x: s.playerX, feetY: CATCH.playerY, flip: s.moving > 0, bob: 0, squash: 0, jump: 0 });
      for (let i = 0; i < CATCH.lives; i++) {
        ctx.drawImage(artCanvas(i < s.lives ? ICONS.heartSmall : ICONS.heartEmpty), 3 + i * 7, 3);
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(224, 56, 79, ${flash / 600})`;
        ctx.fillRect(0, 0, CATCH.W, CATCH.H);
      }
    };

    await runLoop(env.signal, (dt) => {
      const { state, events } = stepCatch(s, dt, Math.random);
      s = state;
      if (events.some((e) => e.type === 'hit')) flash = 300;
      flash = Math.max(0, flash - dt);
      if (s.moving !== 0) walkT += dt;
      draw();
      env.setHud(`${s.score} pkt · ${Math.max(0, Math.ceil((CATCH.duration - s.t) / 1000))} s`);
      return !s.over;
    });
    dispose();
    return s.score;
  },
};
