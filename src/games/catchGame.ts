import { ICONS } from '../art/icons';
import { artCanvas } from '../art/pixels';
import { ANIMATIONS, frameAt, resolveAnimation } from '../sprites/animations';
import { drawSprite } from '../ui/pixelStage';
import { makeCanvas, runLoop } from './canvas';
import { CATCH, createCatch, stepCatch } from './catchLogic';
import { catchReward } from './rewards';
import type { MiniGame } from './types';
import { play } from '../ui/sound';

export const catchGame: MiniGame = {
  id: 'catch',
  name: 'Łapanie jedzenia',
  description: 'Łap smakołyki, omijaj brokuły!',
  icon: 'pizza',
  category: 'arcade',
  reward: catchReward,
  async play(env) {
    const { canvas, ctx, fx, present, toLogical, dispose } = makeCanvas(env.body, CATCH.W, CATCH.H);
    let s = createCatch();
    const aim = (e: PointerEvent) => {
      s = { ...s, targetX: toLogical(e).x };
    };
    canvas.addEventListener('pointerdown', aim);
    canvas.addEventListener('pointermove', aim);
    const walk = resolveAnimation(ANIMATIONS, 'walk');
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
      fx.clearRect(0, 0, CATCH.W, CATCH.H);
      for (let i = 0; i < CATCH.lives; i++) {
        fx.drawImage(artCanvas(i < s.lives ? ICONS.heartSmall : ICONS.heartEmpty), 3 + i * 7, 3);
      }
      if (flash > 0) {
        fx.fillStyle = `rgba(224, 56, 79, ${flash / 600})`;
        fx.fillRect(0, 0, CATCH.W, CATCH.H);
      }
      const name = s.moving !== 0 ? frameAt(walk, walkT) : 'idle_front';
      const fig = env.figures.get(name);
      present((d, k) => {
        if (fig) drawSprite(d, k, fig.img, fig.meta, { x: s.playerX, feetY: CATCH.playerY, flip: walk.flipForRight && s.moving > 0, bob: 0, squash: 0, jump: 0 });
      });
    };

    await runLoop(env.signal, (dt) => {
      const { state, events } = stepCatch(s, dt, Math.random);
      s = state;
      if (events.some((e) => e.type === 'hit')) {
        flash = 300;
        play('bad');
      }
      if (events.some((e) => e.type === 'caught')) play('catch');
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
