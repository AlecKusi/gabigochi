import type { App, Screen } from '../../app';
import { FOODS, type FoodDef } from '../../core/config';
import { buyFood, priceOf } from '../../core/economy';
import { comingSoon } from '../comingSoon';
import { h, icon } from '../dom';
import { screenHeader } from '../screenHeader';

type Tab = 'food' | 'extras';

export function shopScreen(app: App): Screen {
  const header = screenHeader(app, 'Sklep');
  const body = h('div', { class: 'shop-body' });
  let tab: Tab = 'food';

  const tabButton = (label: string, id: Tab) =>
    h('button', { class: 'tab', role: 'tab', 'aria-selected': 'false', 'data-tab': id, onclick: () => { tab = id; render(); } }, label);
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, tabButton('Jedzenie', 'food'), tabButton('Dodatki', 'extras'));

  function foodRow(food: FoodDef): HTMLElement {
    const state = app.store.get();
    const price = priceOf(state, food.id, Date.now());
    const owned = state.fridge[food.id] ?? 0;
    const effects = [`+${food.hunger} głodu`, food.mood ? `+${food.mood} humoru` : null].filter(Boolean).join(' · ');
    const buy = h(
      'button',
      { class: price === 0 ? 'px-btn free' : 'px-btn', 'aria-label': `Kup: ${food.name}` },
      price === 0 ? 'Gratis!' : h('span', { class: 'price' }, icon('coin', 2), String(price)),
    );
    buy.addEventListener('click', () => {
      const res = buyFood(app.store.get(), food.id, Date.now());
      if (!res.ok) {
        buy.classList.remove('shake');
        void buy.offsetWidth;
        buy.classList.add('shake');
        app.toast('Za mało monet. Zagraj w minigrę!');
        return;
      }
      app.store.update(() => res.state);
      app.toast(`${food.name} jest w lodówce!`);
      app.celebrate();
      render();
    });
    const fav = food.id === 'kitkat';
    return h(
      'div',
      { class: fav ? 'shop-row px-box fav' : 'shop-row px-box' },
      icon(food.id, 4),
      h(
        'div',
        { class: 'shop-info' },
        h('strong', {}, food.name, fav ? h('span', { class: 'badge' }, 'ulubiony') : null),
        h('small', {}, effects),
        h('small', {}, price === 0 ? 'Prezent dnia!' : `W lodówce: ${owned}`),
      ),
      buy,
    );
  }

  function render(): void {
    tabs.querySelectorAll<HTMLElement>('.tab').forEach((b) => {
      const active = b.dataset.tab === tab;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    body.replaceChildren(
      ...(tab === 'food' ? FOODS.map(foodRow) : [comingSoon('Czapki, sukienki i nowe tła już wkrótce!')]),
    );
  }

  render();
  // Po wejściu wierszy wyłącz animację, żeby kolejne renderowania (zakupy) jej nie powtarzały.
  setTimeout(() => body.classList.add('settled'), 600);
  return { el: h('div', { class: 'screen shop' }, header.el, tabs, body), destroy: header.destroy };
}
