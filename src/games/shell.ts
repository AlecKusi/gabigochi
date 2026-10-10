import type { App } from '../app';
import type { GameResult } from '../core/types';
import { h, icon } from '../ui/dom';
import { setGamesPaused } from './canvas';
import { COMMON_RULES, GAME_RULES } from './rules';
import type { MiniGame } from './types';
import { play } from '../ui/sound';

/** Okienko z zasadami gry; gra stoi, dopóki jest otwarte. */
export function showRules(host: HTMLElement, game: MiniGame): void {
  const rules = GAME_RULES[game.id];
  if (!rules) return;
  setGamesPaused(true);
  const close = () => {
    setGamesPaused(false);
    overlay.remove();
  };
  const list = (items: string[]) => h('ul', {}, ...items.map((t) => h('li', {}, t)));
  const overlay = h(
    'div',
    { class: 'overlay rules-overlay', onclick: (e: Event) => { if (e.target === overlay) close(); } },
    h(
      'div',
      { class: 'dialog px-box rules', role: 'dialog', 'aria-label': `Zasady: ${game.name}` },
      h('h2', {}, game.name),
      h('p', { class: 'rules-goal' }, rules.goal),
      h('h3', {}, 'Jak grać'),
      list(rules.how),
      h('h3', {}, 'Punkty i nagroda'),
      list(rules.scoring),
      h('p', { class: 'rules-common' }, COMMON_RULES),
      h('button', { class: 'px-btn big', onclick: close }, 'Gramy!'),
    ),
  );
  host.append(overlay);
}

/**
 * Uruchamia minigrę na pełnym ekranie; rozwiązuje się po zamknięciu powłoki (Odbierz / X).
 * `onResult` wołane jest od razu po zakończeniu rozgrywki (przed panelem końcowym), żeby nagroda
 * została zapisana, nawet jeśli iOS ubije aplikację, zanim gracz stuknie „Odbierz”.
 */
export function runGame(game: MiniGame, app: App, onResult: (result: GameResult) => void = () => {}): Promise<GameResult> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const hud = h('span', { class: 'hud', 'aria-live': 'polite' });
    const body = h('div', { class: 'game-body' });
    const close = h('button', { class: 'px-btn secondary', 'aria-label': 'Zakończ grę' }, 'X');
    const info = h('button', { class: 'px-btn secondary rules-btn', 'aria-label': 'Zasady gry' }, 'i');
    const shell = h('div', { class: 'game-shell' }, h('header', { class: 'game-head' }, close, h('h1', {}, game.name), hud, info), body);
    info.addEventListener('click', () => {
      play('tap');
      showRules(shell, game);
    });
    app.root.append(shell);

    const aborted: GameResult = { gameId: game.id, score: 0, coins: 0, moodBoost: 0, aborted: true };
    let settled: GameResult | null = null;
    let finished = false;
    const finish = (result: GameResult) => {
      if (finished) return;
      finished = true;
      setGamesPaused(false);
      controller.abort();
      shell.classList.add('out');
      setTimeout(() => shell.remove(), 200);
      resolve(result);
    };

    // Po zakończeniu rozgrywki wynik jest już zapisany – zamknięcie przyciskiem X go nie cofa.
    close.addEventListener('click', () => finish(settled ?? aborted));

    void game
      .play({ body, sprites: app.sprites, figures: app.figures, signal: controller.signal, setHud: (t) => { hud.textContent = t; } })
      .then((score) => {
        if (finished) return;
        const reward = game.reward(score);
        const isRecord = score > (app.store.get().records[game.id] ?? 0);
        const result: GameResult = { gameId: game.id, score, ...reward, aborted: false };
        settled = result;
        onResult(result);
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
              h('button', { class: 'px-btn big', onclick: () => { play('coin'); finish(result); } }, 'Odbierz'),
            ),
          ),
        );
        play(isRecord && score > 0 ? 'record' : score > 0 ? 'win' : 'lose');
        if (isRecord || reward.coins >= 30) app.celebrate();
      })
      .catch(() => {
        if (finished) return;
        app.toast('Ups, coś poszło nie tak w grze.');
        finish(settled ?? aborted);
      });
  });
}
