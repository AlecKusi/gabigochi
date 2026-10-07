import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import { CONFIG } from '../../src/core/config';
import { dayKey } from '../../src/core/time';
import { createHome } from '../../src/home/starter';

describe('createState', () => {
  it('tworzy stan startowy z prezentem urodzinowym', () => {
    const now = new Date(2026, 9, 6, 12).getTime();
    const s = createState(now);
    expect(s.version).toBe(2);
    expect(s.coins).toBe(150);
    expect(s.needs).toEqual(CONFIG.startNeeds);
    expect(s.fridge.kitkat).toBe(1);
    expect(s.lastDailyBonus).toBe(dayKey(now));
    expect(s.sleeping).toBe(false);
    expect(s.seenBirthday).toBe(false);
    expect(s.createdAt).toBe(now);
    expect(s.lastUpdate).toBe(now);
    expect(s.currentRoom).toBe('salon');
    expect(s.rooms).toEqual(createHome(now).rooms);
    expect(s.inventory).toEqual({});
    expect(s.outfit).toEqual({ head: null, top: null, bottom: null, dress: null });
    expect(s.ownedClothes).toEqual([]);
  });
});
