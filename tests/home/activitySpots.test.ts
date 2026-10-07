import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import type { GameState } from '../../src/core/types';
import {
  ACTIVITY_RULES,
  activityAllowedIn,
  activityAvailability,
  activitiesHere,
  availabilityHint,
  pickActivityHere,
  SEATS,
  SOFAS,
  seatAnchor,
  seatNear,
  spotAnchor,
} from '../../src/home/activitySpots';
import { ACTIVITY_IDS } from '../../src/pet/activities';

const NOW = new Date(2026, 9, 6, 12).getTime();
const fresh = (): GameState => createState(NOW);
const uidOf = (s: GameState, room: keyof GameState['rooms'], itemId: string) => s.rooms[room].items.find((i) => i.itemId === itemId)?.uid;

describe('reguły miejsc zajęć', () => {
  it('nauka tylko przy biurku do nauki: z salonu w pracowni, w pracowni od razu', () => {
    const s = fresh();
    const desk = uidOf(s, 'studio', 'writing_desk');
    expect(desk).toBeDefined();
    expect(activityAvailability(s, 'study', 'salon', 64)).toMatchObject({ status: 'elsewhere', room: 'studio', spot: { room: 'studio', uid: desk } });
    expect(activityAvailability(s, 'study', 'studio', 64)).toEqual({ status: 'here', spot: { room: 'studio', uid: desk } });
  });

  it('bez biurka nauka jest niedostępna z podpisem', () => {
    const s = fresh();
    const noDesk: GameState = { ...s, rooms: { ...s.rooms, studio: { ...s.rooms.studio, items: s.rooms.studio.items.filter((i) => i.itemId !== 'writing_desk') } } };
    const a = activityAvailability(noDesk, 'study', 'studio', 64);
    expect(a).toEqual({ status: 'missing', label: 'Potrzebne: biurko do nauki' });
    expect(availabilityHint(a)).toBe('Potrzebne: biurko do nauki');
  });

  it('szydełko na siedzisku w dowolnym pokoju (startowe krzesło w pracowni)', () => {
    const s = fresh();
    expect(activityAvailability(s, 'crochet', 'studio', 64)).toMatchObject({ status: 'here', spot: { room: 'studio' } });
    expect(activityAvailability(s, 'crochet', 'salon', 64)).toMatchObject({ status: 'elsewhere', room: 'studio' });
  });

  it('praktyka tylko w pracowni, muzyka tylko w salonie, telefon wszędzie', () => {
    const s = fresh();
    expect(activityAvailability(s, 'nursing', 'studio', 64)).toEqual({ status: 'here', spot: null });
    expect(activityAvailability(s, 'nursing', 'salon', 64)).toMatchObject({ status: 'elsewhere', room: 'studio', label: 'Tylko w pracowni' });
    expect(activityAvailability(s, 'music', 'salon', 64)).toEqual({ status: 'here', spot: null });
    expect(activityAvailability(s, 'music', 'bedroom', 64)).toMatchObject({ status: 'elsewhere', room: 'salon' });
    for (const room of ['salon', 'bedroom', 'studio', 'bathroom'] as const) {
      expect(activityAvailability(s, 'phone', room, 64)).toEqual({ status: 'here', spot: null });
    }
  });

  it('samo z siebie losuje tylko to, co jest dostępne w pokoju', () => {
    const s = fresh();
    expect(activitiesHere(s, 'bedroom', ACTIVITY_IDS)).toEqual(['phone', 'dance']);
    expect(['phone', 'dance']).toContain(pickActivityHere(s, 'bedroom', ACTIVITY_IDS, () => 0.99));
    expect(new Set(activitiesHere(s, 'studio', ACTIVITY_IDS))).toEqual(new Set(['study', 'nursing', 'phone', 'crochet', 'dance']));
    expect(pickActivityHere(s, 'bedroom', ['music'], () => 0)).toBeNull();
  });

  it('zajęcie przy meblu i pokojowe kończy się po wyjściu z pokoju', () => {
    expect(activityAllowedIn('phone', 'bathroom', null)).toBe(true);
    expect(activityAllowedIn('music', 'salon', null)).toBe(true);
    expect(activityAllowedIn('music', 'studio', null)).toBe(false);
    expect(activityAllowedIn('study', 'studio', { room: 'studio', uid: 'u1' })).toBe(true);
    expect(activityAllowedIn('study', 'salon', { room: 'studio', uid: 'u1' })).toBe(false);
    expect(activityAllowedIn('study', 'studio', null)).toBe(false);
  });

  it('najbliższe siedzisko i miejsce sceny przy meblu', () => {
    const items = [
      { uid: 'a', itemId: 'pouf', x: 20, y: 140, flip: false },
      { uid: 'b', itemId: 'bean_bag', x: 100, y: 144, flip: false },
      { uid: 'c', itemId: 'monstera', x: 60, y: 140, flip: false },
    ];
    expect(seatNear(items, 90)?.uid).toBe('b');
    expect(seatNear(items, 30)?.uid).toBe('a');
    expect(seatNear([items[2]], 30)).toBeNull();
    expect(spotAnchor(items[1])).toEqual({ x: 100, feetY: 144 });
  });

  it('każde zajęcie ma regułę', () => {
    for (const id of ACTIVITY_IDS) expect(ACTIVITY_RULES[id]).toBeDefined();
  });

  it('siedziska: kanapy i nowe meble, Gabi na siedzisku (hoker wyżej)', () => {
    for (const id of SOFAS) expect(SEATS).toContain(id);
    for (const id of ['armchair_bunny', 'chair_wooden', 'pouf_frog', 'hanging_chair']) expect(SEATS).toContain(id);
    expect(seatAnchor({ uid: 'a', itemId: 'sofa_cozy', x: 40, y: 136, flip: false })).toEqual({ x: 40, feetY: 137 });
    expect(seatAnchor({ uid: 'b', itemId: 'bar_stool', x: 90, y: 140, flip: false }).feetY).toBeLessThan(141);
  });
});
