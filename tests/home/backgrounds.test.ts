import { describe, expect, it } from 'vitest';
import { SEASONS, backdropName } from '../../src/home/season';

const files = Object.keys(import.meta.glob('../../public/backgrounds/*.png'));

describe('tła balkonu', () => {
  it('każda pora roku ma tło dzienne i nocne', () => {
    for (const s of SEASONS) {
      for (const t of ['day', 'night'] as const) expect(files).toContain(`../../public/backgrounds/${backdropName(s, t)}.png`);
    }
  });
});
