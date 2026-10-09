import { h, icon } from '../ui/dom';
import { play } from '../ui/sound';
import { foodById, type FoodId } from '../core/config';
import {
  FOOD_CHAIN, SIZE, bestLevel, create2048, food2048Reward, move, swipeDir, type Dir, type Food2048State,
} from './food2048Logic';
import type { MiniGame } from './types';

/** Nazwa potrawy z łańcucha (każda jest też jedzeniem z lodówki). */
const foodName = (level: number): string => foodById(FOOD_CHAIN[level - 1] as FoodId).name;

const KEYS: Readonly<Record<string, Dir>> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

export const food2048Game: MiniGame = {
  id: 'food2048',
  name: '2048 z jedzeniem',
  description: 'Łącz jedzenie aż do tortu!',
  icon: 'donut',
  category: 'puzzle',
  reward: food2048Reward,
  play(env) {
    return new Promise((resolve) => {
      let s: Food2048State = create2048(Math.random);
      let best = bestLevel(s.grid);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey);
        resolve(s.score);
      };

      const cells = Array.from({ length: SIZE * SIZE }, () => h('div', { class: 'f2048-cell' }));
      const board = h('div', { class: 'f2048-board px-box', role: 'grid', 'aria-label': 'Plansza — przesuń palcem' }, ...cells);
      const links = FOOD_CHAIN.map((f, i) => h('span', { class: 'f2048-link', title: foodName(i + 1) }, icon(f, 2)));
      const bestLabel = h('p', { class: 'f2048-best' });
      const end = h('button', { class: 'px-btn secondary', onclick: () => finish() }, 'Zakończ i odbierz');
      env.body.append(h('div', { class: 'f2048' }, board, bestLabel, h('div', { class: 'f2048-chain' }, ...links), end));

      const render = (merged: readonly number[] = [], spawned: number | null = null) => {
        s.grid.forEach((v, i) => {
          const cell = cells[i];
          cell.className = `f2048-cell${v ? ` lv${Math.min(v, 13)}` : ''}${merged.includes(i) ? ' pop' : ''}${i === spawned ? ' new' : ''}`;
          cell.replaceChildren(...(v ? [icon(FOOD_CHAIN[v - 1], 4)] : []));
          cell.setAttribute('aria-label', v ? foodName(v) : 'puste');
        });
        links.forEach((l, i) => l.classList.toggle('on', i < best));
        bestLabel.textContent = `Najlepsze: ${foodName(best)}`;
        env.setHud(`${s.score} pkt`);
      };

      const go = (dir: Dir) => {
        if (done || env.signal.aborted || s.over) return;
        const r = move(s, dir, Math.random);
        if (!r.moved) return;
        s = r.state;
        const nb = bestLevel(s.grid);
        if (nb > best) {
          best = nb;
          play('sparkle');
        } else {
          play(r.merged.length ? 'pop' : 'tap');
        }
        render(r.merged, r.spawned);
        if (s.over) window.setTimeout(finish, 900);
      };

      // przesunięcie palcem po planszy
      let start: { x: number; y: number } | null = null;
      board.addEventListener('pointerdown', (e) => {
        start = { x: e.clientX, y: e.clientY };
        board.setPointerCapture?.(e.pointerId);
      });
      board.addEventListener('pointerup', (e) => {
        if (!start) return;
        const dir = swipeDir(e.clientX - start.x, e.clientY - start.y);
        start = null;
        if (dir) go(dir);
      });
      board.addEventListener('pointercancel', () => (start = null));
      const onKey = (e: KeyboardEvent) => {
        const dir = KEYS[e.key];
        if (!dir) return;
        e.preventDefault();
        go(dir);
      };
      document.addEventListener('keydown', onKey);
      env.signal.addEventListener('abort', () => document.removeEventListener('keydown', onKey));

      render();
    });
  },
};
