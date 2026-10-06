import type { App } from '../app';
import type { GameResult } from '../core/types';
import { h, icon } from '../ui/dom';
import type { MiniGame } from './types';

/** Uruchamia minigrę na pełnym ekranie; rozwiązuje się po odebraniu nagrody albo przerwaniu. */
export function runGame(game: MiniGame, app: App): Promise<GameResult> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const hud = h('span', { class: 'hud', 'aria-live': 'polite' });
    const body = h('div', { class: 'game-body' });
    const close = h('button', { class: 'px-btn secondary', 'aria-label': 'Zakończ grę' }, 'X');
    const shell = h('div', { class: 'game-shell' }, h('header', { class: 'game-head' }, close, h('h1', {}, game.name), hud), body);
    app.root.append(shell);

    let finished = false;
    const finish = (result: GameResult) => {
      if (finished) return;
      finished = true;
      controller.abort();
      shell.classList.add('out');
      setTimeout(() => shell.remove(), 200);
      resolve(result);
    };

    close.addEventListener('click', () => finish({ gameId: game.id, score: 0, coins: 0, moodBoost: 0, aborted: true }));

    void game
      .play({ body, sprites: app.sprites, signal: controller.signal, setHud: (t) => { hud.textContent = t; } })
      .then((score) => {
        if (finished) return;
        const reward = game.reward(score);
        const isRecord = score > (app.store.get().records[game.id] ?? 0);
        const result: GameResult = { gameId: game.id, score, ...reward, aborted: false };
        shell.append(
          h(
            'div',
            { class: 'overlay' },
            h(
              'div',
              { class: 'dialog px-box end-panel' },
              h('h2', {}, isRecord ? 'Nowy rekord!' : 'Koniec gry!'),
              h('p', { class: 'end-score' }, `Wynik: ${score}`),
              h('p', { class: 'end-reward' }, icon('coin', 3), `+${reward.coins}`, icon('heart', 2), `+${reward.moodBoost}`),
              h('button', { class: 'px-btn big', onclick: () => finish(result) }, 'Odbierz'),
            ),
          ),
        );
        if (isRecord || reward.coins >= 30) app.celebrate();
      });
  });
}
