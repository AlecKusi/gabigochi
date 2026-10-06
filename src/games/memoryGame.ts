import type { IconName } from '../art/icons';
import { h, icon } from '../ui/dom';
import { createMemory, flipCard, isComplete, memoryScore, resolveMismatch } from './memoryLogic';
import { memoryReward } from './rewards';
import type { MiniGame } from './types';

const FACES: IconName[] = ['kitkat', 'cake', 'gift', 'heart', 'glasses', 'bag', 'balloon', 'star'];

export const memoryGame: MiniGame = {
  id: 'memory',
  name: 'Memory',
  description: 'Znajdź wszystkie pary',
  icon: 'star',
  category: 'arcade',
  reward: memoryReward,
  play(env) {
    return new Promise((resolve) => {
      let s = createMemory(FACES, Math.random);
      const buttons = s.cards.map((card, i) => {
        const btn = h(
          'button',
          { class: 'mem-card', 'aria-label': `Karta ${i + 1}` },
          h('div', { class: 'mem-inner' }, h('div', { class: 'mem-back' }), h('div', { class: 'mem-front' }, icon(card.face as IconName, 4))),
        );
        btn.addEventListener('click', () => onFlip(i));
        return btn;
      });
      env.body.append(h('div', { class: 'memory-grid' }, ...buttons));

      const sync = () => {
        s.cards.forEach((c, i) => {
          buttons[i].classList.toggle('up', c.up || c.matched);
          buttons[i].classList.toggle('matched', c.matched);
        });
        env.setHud(`Ruchy: ${s.moves}`);
      };

      function onFlip(i: number): void {
        if (env.signal.aborted) return;
        const before = s;
        s = flipCard(s, i);
        if (s === before) return;
        sync();
        if (s.locked) {
          setTimeout(() => {
            s = resolveMismatch(s);
            sync();
          }, 750);
        } else if (isComplete(s)) {
          setTimeout(() => resolve(memoryScore(s.moves)), 700);
        }
      }

      sync();
    });
  },
};
