import { describe, expect, it } from 'vitest';
import { ICONS } from '../../src/art/icons';
import { PALETTE } from '../../src/art/pixels';
import { FOODS } from '../../src/core/config';

describe('ICONS', () => {
  for (const [name, art] of Object.entries(ICONS)) {
    it(`${name}: prostokątna siatka ze znanymi kolorami`, () => {
      expect(art.length).toBeGreaterThan(0);
      const width = art[0].length;
      for (const row of art) {
        expect(row.length, `szerokość wiersza w ${name}`).toBe(width);
        for (const ch of row) {
          if (ch !== '.') expect(PALETTE[ch], `znak "${ch}" w ${name}`).toBeDefined();
        }
      }
    });
  }

  it('każde jedzenie ma ikonę', () => {
    for (const f of FOODS) expect(ICONS[f.id]).toBeDefined();
  });
});
