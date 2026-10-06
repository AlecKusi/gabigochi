import type { App } from '../app';
import { coinCounter } from './coinCounter';
import { h, icon } from './dom';

/** Nagłówek podstron: przycisk powrotu do pokoju, tytuł, monety. */
export function screenHeader(app: App, title: string): { el: HTMLElement; destroy(): void } {
  const coins = coinCounter(app.store.get().coins);
  const unsubscribe = app.store.subscribe((s) => coins.set(s.coins));
  const el = h(
    'header',
    { class: 'screen-header' },
    h('button', { class: 'px-btn secondary icon-only', 'aria-label': 'Wróć', onclick: () => app.go('room') }, icon('back', 2)),
    h('h1', {}, title),
    coins.el,
  );
  return { el, destroy: unsubscribe };
}
