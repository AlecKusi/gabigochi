import type { App, Screen } from '../../app';
import { FOODS, type FoodDef } from '../../core/config';
import { buyFood, priceOf } from '../../core/economy';
import { SHOP_CATEGORIES, type ItemDef, type ShopCategory } from '../../home/catalog';
import { buyItem, buyLook, type HomeError } from '../../home/layout';
import type { LookDef } from '../../home/looks';
import { DEFAULT_SHOP_CATEGORY, countsLabel, itemCounts, shopItems, shopLooks, thumbScale } from '../../home/shop';
import { h, icon } from '../dom';
import { itemUrl } from '../home/itemSprites';
import { lookSwatch } from '../home/lookSwatch';
import { screenHeader } from '../screenHeader';
import { play } from '../sound';

type Tab = 'food' | 'home';

/** Bok kwadratowego pola miniatury przedmiotu (px) i próbka tapety/podłogi (px logiczne i powiększenie). */
const THUMB_BOX = 60;
const SWATCH = { w: 32, h: 20, scale: 2 } as const;

export function shopScreen(app: App): Screen {
  const header = screenHeader(app, 'Sklep');
  const body = h('div', { class: 'shop-body' });
  let tab: Tab = 'food';
  let category: ShopCategory = DEFAULT_SHOP_CATEGORY;

  const tabButton = (label: string, id: Tab) =>
    h('button', { class: 'tab', role: 'tab', 'aria-selected': 'false', 'data-tab': id, onclick: () => { tab = id; render(); } }, label);
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, tabButton('Jedzenie', 'food'), tabButton('Meble', 'home'));

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
      play('buy');
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

  // --- zakładka „Meble” ---

  const failBuy = (btn: HTMLElement, reason: HomeError): void => {
    if (reason === 'no-coins') {
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      app.toast('Za mało monet. Zagraj w minigrę!');
    } else app.toast('Nie da się tego teraz kupić.');
  };

  const priceLabel = (price: number): HTMLElement =>
    h('span', { class: 'price' }, icon('coin', 2), String(price));

  function itemCard(def: ItemDef): HTMLElement {
    const counts = itemCounts(app.store.get(), def.id);
    const factor = thumbScale(def.w, def.h, THUMB_BOX);
    const buy = h('button', { class: 'px-btn', 'aria-label': `Kup: ${def.name}` }, priceLabel(def.price));
    buy.addEventListener('click', () => {
      const res = buyItem(app.store.get(), def.id);
      if (!res.ok) return failBuy(buy, res.reason);
      app.store.update(() => res.state);
      play('buy');
      app.toast(`${def.name} w magazynie — postaw w trybie Urządzaj`);
      app.celebrate();
      render(true);
    });
    return h(
      'div',
      { class: 'shop-card px-box' },
      h(
        'div',
        { class: 'shop-thumb' },
        h('img', {
          class: 'px',
          src: itemUrl(def.sprite),
          alt: '',
          draggable: 'false',
          width: def.w * factor,
          height: def.h * factor,
        }),
      ),
      h('strong', {}, def.name),
      h('small', {}, countsLabel(counts)),
      buy,
    );
  }

  function lookCard(look: LookDef): HTMLElement {
    const owned = app.store.get().ownedLooks.includes(look.id);
    const thumb = h('div', { class: 'shop-thumb look' }, lookSwatch(look, SWATCH.w, SWATCH.h, SWATCH.scale));
    let action: HTMLElement;
    if (owned) {
      action = h('button', { class: 'px-btn secondary', disabled: true, 'aria-label': `${look.name}: już masz` }, 'Masz');
    } else {
      const buy = h('button', { class: 'px-btn', 'aria-label': `Kup: ${look.name}` }, priceLabel(look.price));
      buy.addEventListener('click', () => {
        const res = buyLook(app.store.get(), look.id);
        if (!res.ok) return failBuy(buy, res.reason);
        app.store.update(() => res.state);
        play('buy');
      play('buy');
        app.toast(`${look.name} — ustaw w trybie Urządzaj`);
        app.celebrate();
        render(true);
      });
      action = buy;
    }
    return h(
      'div',
      { class: 'shop-card px-box' },
      thumb,
      h('strong', {}, look.name),
      h('small', {}, owned ? 'Zmień w trybie Urządzaj' : look.kind === 'wallpaper' ? 'Tapeta' : 'Podłoga'),
      action,
    );
  }

  const chips = h(
    'div',
    { class: 'shop-chips', role: 'tablist', 'aria-label': 'Kategorie' },
    ...SHOP_CATEGORIES.map((c) =>
      h(
        'button',
        {
          class: 'chip',
          role: 'tab',
          'aria-selected': 'false',
          'data-cat': c.id,
          onclick: () => {
            category = c.id;
            render();
          },
        },
        c.name,
      ),
    ),
  );

  function furnitureView(keepScroll: boolean): void {
    chips.querySelectorAll<HTMLElement>('.chip').forEach((b) => {
      const active = b.dataset.cat === category;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    const looks = shopLooks(category);
    const cards = looks ? looks.map(lookCard) : shopItems(category).map(itemCard);
    const scroll = keepScroll ? body.scrollTop : 0;
    body.replaceChildren(chips, h('div', { class: 'shop-grid' }, ...cards));
    body.scrollTop = scroll;
  }

  function render(keepScroll = false): void {
    tabs.querySelectorAll<HTMLElement>('.tab').forEach((b) => {
      const active = b.dataset.tab === tab;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    body.classList.toggle('home', tab === 'home');
    if (tab === 'food') body.replaceChildren(...FOODS.map(foodRow));
    else furnitureView(keepScroll);
  }

  render();
  // Po wejściu wierszy wyłącz animację, żeby kolejne renderowania (zakupy) jej nie powtarzały.
  setTimeout(() => body.classList.add('settled'), 600);
  return { el: h('div', { class: 'screen shop' }, header.el, tabs, body), destroy: header.destroy };
}
