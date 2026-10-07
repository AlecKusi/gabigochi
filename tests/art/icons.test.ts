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

  it('ikony ozdób głowy: 12–16 px szerokości, niewysokie, bez pustych skrajnych wierszy', () => {
    for (const name of ['hat_party', 'crown', 'cat_ears', 'flower', 'beret', 'bow'] as const) {
      const art = ICONS[name];
      expect(art, name).toBeDefined();
      expect(art[0].length, name).toBeGreaterThanOrEqual(12);
      expect(art[0].length, name).toBeLessThanOrEqual(16);
      expect(art.length, name).toBeLessThanOrEqual(16);
      expect(art[0].replace(/\./g, '').length, `${name}: górny wiersz`).toBeGreaterThan(0);
      expect(art[art.length - 1].replace(/\./g, '').length, `${name}: dolny wiersz`).toBeGreaterThan(0);
      const fills = new Set(art.join('').replace(/[.k]/g, ''));
      expect(fills.size, `${name}: kolory wypełnienia`).toBeGreaterThanOrEqual(2);
    }
  });
});
