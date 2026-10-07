import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import type { GameState } from '../../src/core/types';
import { INTERACTIONS, itemFrames } from '../../src/home/catalog';
import { interactionReward, interactionSteps, rewardInteraction, stepAt, toggleLamp, totalMs } from '../../src/home/interactionPlan';
import framesMeta from '../../src/sprites/frames.generated.json';

const NOW = new Date(2026, 9, 6, 12).getTime();
const HOUR = 3_600_000;

/** Przedmiot, którego klatki stanów używa dana interakcja. */
const ITEM_OF: Record<string, string> = { toilet: 'toilet', shower: 'shower', bath: 'bathtub', sink: 'sink' };

describe('kroki interakcji', () => {
  it('zajęcia i przedmioty bez interakcji nie mają kroków', () => {
    for (const k of ['study', 'crochet', 'music', 'none'] as const) expect(interactionSteps(k, { hasRail: true })).toBeNull();
  });

  it('każda pozostała interakcja ma kroki o dodatnim czasie', () => {
    for (const k of INTERACTIONS) {
      if (['study', 'crochet', 'music', 'none'].includes(k)) continue;
      const steps = interactionSteps(k, { hasRail: true });
      expect(steps, k).not.toBeNull();
      for (const s of steps!) expect(s.ms).toBeGreaterThan(0);
    }
  });

  it('umywalka: wycieranie rąk tylko przy wieszaku z ręcznikiem', () => {
    expect(interactionSteps('sink', { hasRail: false })).toHaveLength(2);
    const withRail = interactionSteps('sink', { hasRail: true })!;
    expect(withRail).toHaveLength(3);
    expect(withRail[2].rail).toBe('gabi');
    expect(itemFrames('towel_rail').gabi).toBeDefined();
  });

  it('klatki stanów przedmiotów i pozy postaci istnieją', () => {
    for (const k of INTERACTIONS) {
      const steps = interactionSteps(k, { hasRail: true });
      if (!steps) continue;
      for (const s of steps) {
        if (s.item) expect(itemFrames(ITEM_OF[k])[s.item], `${k}:${s.item}`).toBeDefined();
        if (s.gabi.kind === 'frames') for (const f of s.gabi.frames) expect(framesMeta.body, f).toContain(f);
        if (s.gabi.kind === 'bust') expect(framesMeta.body).toContain(s.gabi.bust);
      }
    }
  });

  it('stepAt i totalMs', () => {
    const steps = interactionSteps('toilet', { hasRail: false })!;
    expect(totalMs(steps)).toBe(700 + 2500 + 1400 + 400);
    expect(stepAt(steps, 0)?.index).toBe(0);
    expect(stepAt(steps, 700)).toMatchObject({ index: 1, startMs: 700 });
    expect(stepAt(steps, -5)?.index).toBe(0);
    expect(stepAt(steps, totalMs(steps))).toBeNull();
  });
});

describe('bonusy i lampki', () => {
  const base = (): GameState => ({ ...createState(NOW), needs: { hunger: 50, mood: 50, energy: 50 } });

  it('bonus raz na godzinę na przedmiot', () => {
    const r1 = rewardInteraction(base(), 'u9', 'water', NOW);
    expect(r1.rewarded).toBe(true);
    expect(r1.state.needs.mood).toBe(52);
    const r2 = rewardInteraction(r1.state, 'u9', 'water', NOW + 1000);
    expect(r2.rewarded).toBe(false);
    expect(r2.state).toBe(r1.state);
    expect(rewardInteraction(r1.state, 'u9', 'water', NOW + HOUR).rewarded).toBe(true);
    expect(rewardInteraction(r1.state, 'u10', 'water', NOW + 1000).rewarded).toBe(true);
  });

  it('granie męczy, słodziaki dają mniej, lampka nic', () => {
    expect(interactionReward('play')).toEqual({ mood: 2, energy: -2 });
    expect(interactionReward('cute')).toEqual({ mood: 1, energy: 0 });
    expect(interactionReward('lamp')).toBeNull();
    expect(rewardInteraction(base(), 'u1', 'play', NOW).state.needs.energy).toBe(48);
  });

  it('lampka przełącza się i zapamiętuje stan; inne przedmioty — błąd', () => {
    const s = base();
    const lamp = { uid: 'L', itemId: 'nightstand_lamp', x: 100, y: 144, flip: false };
    const withLamp: GameState = { ...s, rooms: { ...s.rooms, bedroom: { ...s.rooms.bedroom, items: [...s.rooms.bedroom.items, lamp] } } };
    const on = toggleLamp(withLamp, 'bedroom', 'L');
    expect(on.ok && on.state.rooms.bedroom.items.find((i) => i.uid === 'L')?.lampOn).toBe(true);
    const poster = withLamp.rooms.bedroom.items.find((i) => i.itemId === 'poster_moon')!;
    expect(toggleLamp(withLamp, 'bedroom', poster.uid)).toEqual({ ok: false, reason: 'unknown-item' });
    expect(toggleLamp(withLamp, 'bedroom', 'nope')).toEqual({ ok: false, reason: 'not-found' });
  });
});
