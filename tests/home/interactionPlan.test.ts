import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import type { GameState } from '../../src/core/types';
import { INSIDE_SPOTS } from '../../src/home/activitySpots';
import { CATALOG, INTERACTIONS, itemFrames } from '../../src/home/catalog';
import { cookDish, interactionReward, interactionSteps, napMs, rewardInteraction, stepAt, toggleLamp, totalMs } from '../../src/home/interactionPlan';
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

  it('klatki stanów przedmiotów i pozy postaci istnieją (też w wersjach bez klatek z Gabi)', () => {
    for (const k of INTERACTIONS) {
      const steps = [...(interactionSteps(k, { hasRail: true }) ?? []), ...(interactionSteps(k, { hasRail: false, itemStates: [] }) ?? [])];
      for (const s of steps) {
        if (s.item) expect(itemFrames(ITEM_OF[k])[s.item], `${k}:${s.item}`).toBeDefined();
        if (s.gabi.kind === 'frames') for (const f of s.gabi.frames) expect(framesMeta.body, f).toContain(f);
        if (s.gabi.kind === 'bust') for (const b of s.gabi.busts) expect(framesMeta.body, b).toContain(b);
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

describe('meble: drzemka, stół, okno, TV, siedziska, kotek', () => {
  it('drzemka na kanapie na leżąco trwa, aż energia się zapełni (pełna w 10 minut)', () => {
    const [step] = interactionSteps('nap', { hasRail: false, energy: 0 })!;
    expect(step.gabi).toMatchObject({ kind: 'frames', frames: ['nap_1', 'nap_2'], at: 'lie' });
    expect(step.ms).toBe(600_000);
    expect(napMs(50)).toBe(300_000);
    expect(napMs(99.9)).toBe(9000);
    expect(interactionReward('nap')).toEqual({ mood: 1, energy: 0 });
  });

  it('przy stole: kawa, ciasto albo KitKat (wariant), Gabi za stołem', () => {
    const kinds = [0, 0.5, 0.99].map((v) => interactionSteps('coffee', { hasRail: false, variant: v })![0]);
    expect(kinds.map((st) => st.line)).toEqual(['coffee', 'cake', 'kitkat']);
    for (const st of kinds) expect(st.gabi).toMatchObject({ kind: 'frames', at: 'behind' });
  });

  it('okno od tyłu: w dzień macha, w nocy tylko patrzy', () => {
    const wave = (night: boolean) => interactionSteps('window', { hasRail: false, night })![2].gabi;
    const day = wave(false);
    const nightPose = wave(true);
    expect(day.kind === 'frames' && day.frames).toContain('back_wave');
    expect(nightPose.kind === 'frames' && nightPose.frames).toEqual(['back_idle']);
  });

  it('telewizor: oglądanie i konsola przed ekranem, ekran miga', () => {
    const steps = interactionSteps('tv', { hasRail: false })!;
    for (const st of steps) {
      expect(st.effect).toBe('screen');
      expect(st.gabi).toMatchObject({ at: 'front' });
    }
  });

  it('siedzisko: relaks z telefonem albo herbatką; kanapa na leżąco; kotek', () => {
    expect(interactionSteps('relax', { hasRail: false, variant: 0 })![1].line).toBe('relaxPhone');
    expect(interactionSteps('relax', { hasRail: false, variant: 0.9 })![1].line).toBe('tea');
    expect(interactionSteps('lounge', { hasRail: false })!.every((st) => st.gabi.kind === 'frames' && st.gabi.at === 'lie')).toBe(true);
    expect(interactionSteps('cat', { hasRail: false })!.some((st) => st.effect === 'hearts')).toBe(true);
  });
});

describe('kuchnia', () => {
  it('lodówka, gotowanie z parą, karmienie kota', () => {
    expect(interactionSteps('fridge', { hasRail: false })![0].gabi).toMatchObject({ at: 'under' });
    const cook = interactionSteps('cook', { hasRail: false })!;
    expect(cook[0].effect).toBe('steam');
    expect(cook[0].line).toBe('cook');
    expect(interactionSteps('catfood', { hasRail: false })![0].line).toBe('catfood');
  });
  it('gotowanie wkłada danie do lodówki', () => {
    const s = createState(NOW);
    const r = cookDish(s, () => 0.5);
    expect(r.state.fridge[r.food]).toBe((s.fridge[r.food] ?? 0) + 1);
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

describe('lodówki z arkusza: drzwi się otwierają', () => {
  const states = ['ajar', 'open', 'gabi'];
  it('w oryginalnym stroju Gabi jest w klatce lodówki; w innym — zagląda do otwartej (od tyłu)', () => {
    const dressed = interactionSteps('fridge', { hasRail: false, itemStates: states, defaultOutfit: false })!;
    const plain = interactionSteps('fridge', { hasRail: false, itemStates: states, defaultOutfit: true })!;
    expect(plain.map((s) => s.item)).toEqual(['ajar', 'open', 'gabi', 'ajar']);
    expect(plain[2].gabi.kind).toBe('hidden');
    expect(dressed.map((s) => s.item)).toEqual(['ajar', 'open', 'open', 'ajar']);
    expect(dressed.every((s) => s.gabi.kind === 'frames')).toBe(true);
    expect(dressed.some((s) => s.line === 'fridge')).toBe(true);
  });
  it('zwykła lodówka (bez klatek) — jak dawniej', () => {
    const steps = interactionSteps('fridge', { hasRail: false })!;
    expect(steps).toHaveLength(1);
    expect(steps[0].item).toBeNull();
  });
});

describe('łazienka z nowych arkuszy (bez klatek z Gabi)', () => {
  const plain = { hasRail: false, itemStates: [] as string[] };
  it('prysznic: Gabi za szybą w kabinie, leci woda, wychodzi w ręczniku; wanna: w pianie; bez klatek przedmiotu', () => {
    const shower = interactionSteps('shower', plain)!;
    const inShower = shower.filter((s) => s.gabi.kind === 'frames' && s.gabi.at === 'inside');
    expect(inShower.map((s) => (s.gabi.kind === 'frames' ? s.gabi.frames[0] : ''))).toEqual(['gabi_shower_1', 'gabi_shower_2', 'gabi_shower_3']);
    expect(inShower.every((s) => s.effect === 'rain')).toBe(true);
    expect(shower.at(-1)!.gabi).toMatchObject({ kind: 'bust', busts: ['gabi_turban'] });
    const bath = interactionSteps('bath', plain)!;
    const inBath = bath.filter((s) => s.gabi.kind === 'frames' && s.gabi.at === 'inside');
    expect(inBath).toHaveLength(3);
    expect(inBath.every((s) => s.effect === 'bubbles')).toBe(true);
    expect(bath.some((s) => s.line === 'duck')).toBe(true);
    for (const s of [...shower, ...bath]) expect(s.item).toBeNull();
  });
  it('wanny i kabiny z arkuszy mają miejsce dla Gabi w środku', () => {
    for (const d of CATALOG.filter((x) => x.interaction === 'bath' || x.interaction === 'shower')) {
      if (itemFrames(d.id).gabi) continue;
      expect(INSIDE_SPOTS[d.id], d.id).toBeDefined();
    }
    for (const id of Object.keys(INSIDE_SPOTS)) expect(CATALOG.some((d) => d.id === id), id).toBe(true);
  });
  it('toaleta: siedzi z telefonem; umywalka: myje zęby przodem (popiersie pod umywalką), płucze usta z wodą', () => {
    expect(interactionSteps('toilet', plain)![0].gabi).toMatchObject({ at: 'seat' });
    const sink = interactionSteps('sink', plain)!;
    expect(sink.every((s) => s.gabi.kind === 'bust' && s.gabi.at === 'under')).toBe(true);
    expect(sink.some((s) => s.line === 'teeth')).toBe(true);
    expect(sink.at(-1)).toMatchObject({ effect: 'water', gabi: { busts: ['brush_3'] } });
    // stara umywalka z klatkami — jak dawniej
    expect(interactionSteps('sink', { hasRail: false, itemStates: ['on', 'gabi'] })![1].item).toBe('gabi');
  });
  it('lustro, pranie, waga: kwestie i nagrody', () => {
    const mirror = interactionSteps('mirror', plain)!;
    expect(mirror.some((s) => s.line === 'mirror')).toBe(true);
    expect(mirror.every((s) => s.gabi.kind === 'bust' && s.gabi.busts.every((b) => b.startsWith('comb_')))).toBe(true);
    const laundry = interactionSteps('laundry', plain)!;
    expect(laundry.some((s) => s.effect === 'spin' && s.line === 'laundry')).toBe(true);
    expect(laundry.every((s) => s.gabi.kind === 'frames' && s.gabi.face === true && s.gabi.frames.every((f) => f.startsWith('laundry_')))).toBe(true);
    expect(interactionSteps('scale', plain)!.every((s) => s.gabi.kind === 'frames' && s.gabi.at === 'seat')).toBe(true);
    expect(interactionReward('laundry')).toMatchObject({ mood: 2 });
    expect(interactionReward('mirror')).toMatchObject({ mood: 1 });
  });
});
