import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import editSrc from '../../src/ui/home/editMode.ts?raw';
import roomSrc from '../../src/ui/screens/room.ts?raw';

describe('samouczek przy pierwszym wejściu do pokoju', () => {
  it('kilka krótkich wskazówek, każda wskazuje element, który naprawdę jest w pokoju', () => {
    expect(content.tips.length).toBeGreaterThanOrEqual(4);
    const src = `${roomSrc}\n${editSrc}`;
    for (const tip of content.tips) {
      expect(tip.text.length, tip.text).toBeLessThan(140);
      const cls = /^\.([\w-]+)$/.exec(tip.target)?.[1];
      const nav = /^\[data-nav="(\w+)"\]$/.exec(tip.target)?.[1];
      expect(cls ?? nav, tip.target).toBeTruthy();
      if (cls) expect(src, tip.target).toMatch(new RegExp(`class: '[^']*\\b${cls}\\b`));
      if (nav) expect(src, tip.target).toContain(`'${nav}')`);
    }
  });
});
