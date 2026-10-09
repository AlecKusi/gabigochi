import { describe, expect, it } from 'vitest';
import { CLOCK_FACE, PHASE_ICON, WALL_CLOCK, clockNow, clockText, handAngles } from '../../src/home/clock';
import { findItem, itemFrames } from '../../src/home/catalog';
import { interactionSteps } from '../../src/home/interactionPlan';
import { content } from '../../src/content';
import { ICONS } from '../../src/art/icons';

const at = (h: number, m: number, s = 0) => new Date(2026, 9, 9, h, m, s);

describe('zegar z porą dnia', () => {
  it('godzina bez zera z przodu, minuty dwucyfrowo', () => {
    expect(clockText(at(7, 5))).toBe('7:05');
    expect(clockText(at(21, 30))).toBe('21:30');
    expect(clockText(at(0, 0))).toBe('0:00');
  });

  it('wskazówki: 3:00 — godzinowa na „3”, minutowa na „12”; 6:30 — godzinowa w pół drogi do „7”', () => {
    const a = handAngles(at(15, 0));
    expect(a.hour).toBeCloseTo(Math.PI / 2);
    expect(a.minute).toBeCloseTo(0);
    const b = handAngles(at(6, 30, 15));
    expect(b.minute).toBeCloseTo(((30 + 15 / 60) / 60) * 2 * Math.PI);
    expect(b.hour).toBeCloseTo((6.5 / 12) * 2 * Math.PI, 2);
    expect(b.second).toBeCloseTo((15 / 60) * 2 * Math.PI);
  });

  it('pora dnia zgodna z oknami: ikonka na pasku dla każdej pory', () => {
    expect(clockNow(at(8, 0)).phase).toBe('morning');
    expect(clockNow(at(12, 0)).phase).toBe('day');
    expect(clockNow(at(19, 0)).phase).toBe('evening');
    expect(clockNow(at(23, 0)).phase).toBe('night');
    for (const name of Object.values(PHASE_ICON)) {
      expect(ICONS[name], name).toBeDefined();
      expect(ICONS[name].every((row) => row.length === 12), name).toBe(true);
    }
  });

  it('zegar ścienny w sklepie: klatki okienka nieba na poranek, wieczór i noc; tarcza w obrysie', () => {
    const def = findItem(WALL_CLOCK)!;
    expect(def.layer).toBe('wall');
    expect(def.interaction).toBe('clock');
    expect(Object.keys(itemFrames(WALL_CLOCK)).sort()).toEqual(['evening', 'morning', 'night']);
    expect(-CLOCK_FACE.dy + CLOCK_FACE.minute).toBeLessThan(def.h);
    expect(CLOCK_FACE.minute).toBeLessThan(def.w / 2);
  });

  it('Gabi zerka na zegar i mówi godzinę; kwestie na każdą porę mają {czas}', () => {
    const steps = interactionSteps('clock', { hasRail: false })!;
    expect(steps.some((s) => s.line === 'clock')).toBe(true);
    for (const key of ['clockMorning', 'clockDay', 'clockEvening', 'clockNight'] as const) {
      expect(content.lines[key].length).toBeGreaterThan(0);
      for (const l of content.lines[key]) expect(l).toContain('{czas}');
    }
  });
});

describe('podgląd innej pory dnia', () => {
  it('?godzina=23 — zegar gry na 23:00 dziś i płynie dalej; null wraca do telefonu; zły zapis bez zmian', async () => {
    const { gameClock, setClockOverride } = await import('../../src/home/clock');
    const now = new Date(2026, 9, 9, 16, 30).getTime();
    expect(setClockOverride('23', now)).toBe(true);
    expect(clockText(gameClock(now))).toBe('23:00');
    expect(clockText(gameClock(now + 5 * 60_000))).toBe('23:05');
    expect(clockNow(gameClock(now)).phase).toBe('night');
    expect(setClockOverride('7:30', now)).toBe(true);
    expect(clockNow(gameClock(now)).phase).toBe('morning');
    expect(setClockOverride('25', now)).toBe(false);
    expect(clockText(gameClock(now))).toBe('7:30');
    setClockOverride(null);
    expect(gameClock(now).getTime()).toBe(now);
  });
});
