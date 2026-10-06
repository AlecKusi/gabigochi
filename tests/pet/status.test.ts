import { describe, expect, it } from 'vitest';
import { ANGRY_TAPS, SUGAR_RUSH, avatarFor, countRecent, statusAnimation } from '../../src/pet/status';

const n = (hunger: number, energy: number, mood: number) => ({ hunger, energy, mood });

describe('statusAnimation', () => {
  it('priorytety', () => {
    expect(statusAnimation(n(5, 5, 5))).toBe('starving');
    expect(statusAnimation(n(50, 5, 5))).toBe('exhausted');
    expect(statusAnimation(n(20, 15, 5))).toBe('hungry');
    expect(statusAnimation(n(50, 15, 5))).toBe('tired');
    expect(statusAnimation(n(50, 50, 20))).toBe('sad');
    expect(statusAnimation(n(50, 50, 50))).toBeNull();
  });
  it('progi są ostre (< nie <=)', () => {
    expect(statusAnimation(n(25, 20, 30))).toBeNull();
  });
});

describe('countRecent', () => {
  it('liczy w oknie czasu', () => {
    expect(countRecent([0, 1000, 2500, 2900], 3000, ANGRY_TAPS.windowMs)).toBe(4);
    expect(countRecent([0, 1000, 2500, 2900], 3500, ANGRY_TAPS.windowMs)).toBe(3);
    expect(countRecent([5000], 3000, 1000)).toBe(0);
  });
  it('stałe ze specyfikacji', () => {
    expect(ANGRY_TAPS).toEqual({ count: 5, windowMs: 3000 });
    expect(SUGAR_RUSH).toEqual({ count: 3, windowMs: 600_000 });
  });
});

describe('avatarFor', () => {
  it('wybiera portret stanu', () => {
    expect(avatarFor(null, null, 0)).toBe('portrait_a');
    expect(avatarFor('hungry', null, 0)).toBe('face_hungry');
    expect(avatarFor('starving', null, 0)).toBe('face_hungry');
    expect(avatarFor('tired', null, 0)).toBe('face_tired');
    expect(avatarFor('exhausted', null, 0)).toBe('face_tired');
    expect(avatarFor('sad', null, 0)).toBe('portrait_a');
    expect(avatarFor('hungry', 'scared', 0)).toBe('face_dizzy');
    expect(avatarFor(null, 'crazy', 0)).toBe('face_crazy_1');
    expect(avatarFor(null, 'crazy', 450)).toBe('face_crazy_2');
  });
});
