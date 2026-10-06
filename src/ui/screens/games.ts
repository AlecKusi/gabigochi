import type { App, Screen } from '../../app';
import { CONFIG } from '../../core/config';
import { applyGameResult } from '../../core/economy';
import { coinsLabel } from '../../core/plural';
import { COMING_SOON, GAMES } from '../../games';
import { runGame } from '../../games/shell';
import type { MiniGame } from '../../games/types';
import { confirmDialog } from '../dialog';
import { h, icon } from '../dom';
import { screenHeader } from '../screenHeader';

export function gamesScreen(app: App): Screen {
  const header = screenHeader(app, 'Minigry');
  const body = h('div', { class: 'games-body' });

  function card(game: MiniGame): HTMLElement {
    const record = app.store.get().records[game.id];
    return h(
      'button',
      { class: 'game-card px-box', onclick: () => void start(game) },
      icon(game.icon, 4),
      h('strong', {}, game.name),
      h('small', {}, game.description),
      record ? h('small', { class: 'record' }, `Rekord: ${record}`) : null,
    );
  }

  function soon(item: (typeof COMING_SOON)[number]): HTMLElement {
    return h(
      'div',
      { class: 'game-card px-box soon', 'aria-disabled': 'true' },
      icon(item.icon, 4),
      h('strong', {}, item.name),
      h('small', {}, 'wkrótce'),
      icon('lock', 2, 'px-icon lock'),
    );
  }

  function section(title: string, category: MiniGame['category']): HTMLElement {
    const cards = [
      ...GAMES.filter((g) => g.category === category).map(card),
      ...COMING_SOON.filter((s) => s.category === category).map(soon),
    ];
    return h('section', { class: 'game-section' }, h('h2', {}, title), h('div', { class: 'game-grid' }, ...cards));
  }

  function render(): void {
    body.replaceChildren(section('Zręcznościowe', 'arcade'), section('Łamigłówki', 'puzzle'));
  }

  async function start(game: MiniGame): Promise<void> {
    if (app.store.get().needs.energy < CONFIG.games.tiredBelow) {
      const ok = await confirmDialog(app.root, 'Jestem zbyt śpiąca… Zagrać mimo to?', 'Gramy!', 'Nie');
      if (!ok) return;
    }
    // Nagroda zapisuje się w chwili końca gry (nie po „Odbierz”) – iOS może ubić aplikację w tle.
    const result = await runGame(game, app, (r) => app.store.update((s) => applyGameResult(s, r)));
    if (result.aborted) return;
    if (result.coins > 0) app.toast(`+${result.coins} ${coinsLabel(result.coins)}!`);
    render();
  }

  render();
  return { el: h('div', { class: 'screen games' }, header.el, body), destroy: header.destroy };
}
