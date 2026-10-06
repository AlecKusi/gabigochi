import { describe, expect, it } from 'vitest';
import { FALL, landingEmotion, startFall, stepFall } from '../../src/pet/fall';

const run = (lift: number) => {
  let f = startFall(lift);
  let bounces = 0;
  let prevVy = f.vy;
  for (let i = 0; i < 400 && !f.done; i++) {
    f = stepFall(f, 16);
    if (prevVy > 0 && f.vy < 0) bounces++;
    prevVy = f.vy;
  }
  return { f, bounces };
};

describe('spadanie', () => {
  it('z ziemi od razu koniec', () => {
    expect(startFall(0).done).toBe(true);
  });
  it('spada na podłogę, odbija się raz i kończy', () => {
    const { f, bounces } = run(80);
    expect(f.done).toBe(true);
    expect(f.lift).toBe(0);
    expect(bounces).toBe(1);
  });
  it('nigdy nie schodzi pod podłogę', () => {
    let f = startFall(30);
    for (let i = 0; i < 200; i++) {
      f = stepFall(f, 33);
      expect(f.lift).toBeGreaterThanOrEqual(0);
    }
  });
  it('emocja po lądowaniu zależy od wysokości', () => {
    expect(landingEmotion(startFall(FALL.scaredHeight + 1))).toBe('scared');
    expect(landingEmotion(startFall(FALL.scaredHeight))).toBe('happy');
  });
});
