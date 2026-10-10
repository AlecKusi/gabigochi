import { describe, expect, it } from 'vitest';
import { NewerSaveError, loadState, type KV } from '../../src/core/save';
import fixture from '../fixtures/save-v2-2026-10-10.json';

/**
 * Zapis z wersji z 2026-10-10 (wszystkie przedmioty, ubrania, tapety, jedzenie i rekordy z tego dnia). Plik jest
 * zamrożony: każda kolejna wersja gry musi go wczytać bez utraty postępu. Gdy test nie przechodzi, zmiana usunęła
 * albo przemianowała coś, co gracz mógł mieć — trzeba dopisać migrację (patrz docs/AKTUALIZACJE.md), a nie
 * poprawiać ten plik.
 */
const NOW = new Date(2026, 9, 10, 13).getTime();
const kvOf = (raw: string): KV => ({ getItem: () => raw, setItem: () => {} });
const load = () => loadState(kvOf(JSON.stringify(fixture)), NOW);

describe('zgodność zapisów: zapis z 2026-10-10', () => {
  it('wczytuje się bez naprawy i bez kopii awaryjnej', () => {
    const r = load();
    expect(r).toMatchObject({ fresh: false, recovered: false, repaired: false });
    expect(r.state).toMatchObject({ coins: 1234, seenBirthday: true, currentRoom: 'kitchen', cat: fixture.cat, outfit: fixture.outfit });
    expect(r.state.records).toEqual(fixture.records);
  });

  it('nic z zapisu nie znika: przedmioty w pokojach i w magazynie, ubrania, wyglądy, jedzenie', () => {
    const s = load().state;
    for (const [id, n] of Object.entries(fixture.inventory)) expect(s.inventory[id], `magazyn: ${id}`).toBe(n);
    for (const [room, r] of Object.entries(fixture.rooms)) {
      const now = s.rooms[room as keyof typeof s.rooms];
      expect(now.wallpaper, room).toBe(r.wallpaper);
      expect(now.floor, room).toBe(r.floor);
      for (const it of r.items) {
        expect(now.items.find((x) => x.uid === it.uid), `${room}: ${it.itemId}`).toMatchObject({ itemId: it.itemId, flip: it.flip });
      }
    }
    for (const id of fixture.ownedClothes) expect(s.ownedClothes, id).toContain(id);
    for (const id of fixture.ownedLooks) expect(s.ownedLooks, id).toContain(id);
    for (const [food, n] of Object.entries(fixture.fridge)) expect(s.fridge[food as keyof typeof s.fridge], food).toBe(n);
  });

  it('zapis z nowszej wersji gry nie jest wczytywany ani nadpisywany', () => {
    expect(() => loadState(kvOf(JSON.stringify({ ...fixture, version: 99 })), NOW)).toThrow(NewerSaveError);
  });
});
