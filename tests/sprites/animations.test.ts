import { describe, expect, it } from 'vitest';
import { ANIMATIONS, allFrameNames, frameAt, resolveAnimation, type AnimDef } from '../../src/sprites/animations';
import framesMeta from '../../src/sprites/frames.generated.json';

const M: Record<string, AnimDef> = {
  idle: { frames: ['a'], fps: 1 },
  walk: { frames: ['w1', 'w2'], fps: 4, flipForRight: true },
  sleep: { fallback: 'a', overlay: 'zzz', dim: true },
  broken: {},
};

describe('resolveAnimation', () => {
  it('animacja z klatek', () => {
    expect(resolveAnimation(M, 'walk')).toEqual({ frames: ['w1', 'w2'], fps: 4, overlay: null, dim: false, flipForRight: true });
  });
  it('zastępstwo: klatka + nakładka', () => {
    expect(resolveAnimation(M, 'sleep')).toEqual({ frames: ['a'], fps: 1, overlay: 'zzz', dim: true, flipForRight: false });
  });
  it('nieznana nazwa → idle', () => {
    expect(resolveAnimation(M, 'taniec').frames).toEqual(['a']);
  });
  it('wpis bez klatek i zastępstwa to błąd', () => {
    expect(() => resolveAnimation(M, 'broken')).toThrow();
  });
});

describe('frameAt', () => {
  it('przewija klatki w pętli', () => {
    const walk = resolveAnimation(M, 'walk');
    expect(frameAt(walk, 0)).toBe('w1');
    expect(frameAt(walk, 250)).toBe('w2');
    expect(frameAt(walk, 500)).toBe('w1');
  });
  it('ujemny czas daje poprawną klatkę', () => {
    const walk = resolveAnimation(M, 'walk');
    expect(['w1', 'w2']).toContain(frameAt(walk, -100));
    expect(frameAt(walk, -250)).toBe('w2');
  });
});

describe('prawdziwy manifest', () => {
  it('każda animacja się rozwiązuje i używa istniejących klatek', () => {
    for (const name of Object.keys(ANIMATIONS)) {
      expect(() => resolveAnimation(ANIMATIONS, name)).not.toThrow();
    }
    for (const frame of allFrameNames(ANIMATIONS)) {
      expect(framesMeta.body).toContain(frame);
    }
  });
  it('ma animacje używane przez pokój', () => {
    for (const name of ['idle', 'walk', 'eat', 'wave', 'talk', 'sleep', 'sad', 'hungry']) {
      expect(ANIMATIONS[name], name).toBeDefined();
    }
  });
});
