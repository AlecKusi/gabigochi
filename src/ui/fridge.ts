import type { App } from '../app';
import { FOODS, type FoodDef, type FoodId } from '../core/config';
import { h, icon } from './dom';

/** Wysuwana lodówka: przeciągnij jedzenie na scenę albo stuknij, żeby nakarmić. */
export function openFridge(app: App, host: HTMLElement, target: HTMLElement, onFeed: (id: FoodId) => void): void {
  const state = app.store.get();
  const items = FOODS.filter((f) => (state.fridge[f.id] ?? 0) > 0);

  const close = () => {
    sheet.classList.add('out');
    setTimeout(() => backdrop.remove(), 220);
  };

  const list = items.length
    ? h('div', { class: 'fridge-items' }, ...items.map((f) => foodItem(f, state.fridge[f.id] ?? 0)))
    : h(
        'div',
        { class: 'fridge-empty' },
        h('p', {}, 'Lodówka jest pusta.'),
        h('button', { class: 'px-btn', onclick: () => { close(); void app.go('shop'); } }, 'Do sklepu'),
      );

  const sheet = h(
    'div',
    { class: 'sheet px-box' },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, 'Lodówka'),
      h('button', { class: 'px-btn secondary', onclick: close, 'aria-label': 'Zamknij' }, 'X'),
    ),
    h('p', { class: 'hint' }, 'Przeciągnij jedzenie do Gabi albo stuknij.'),
    list,
  );
  const backdrop = h('div', { class: 'sheet-backdrop' }, sheet);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  host.append(backdrop);

  function foodItem(food: FoodDef, count: number): HTMLElement {
    const btn = h(
      'button',
      { class: 'food-item', 'aria-label': `${food.name}, ${count} szt.` },
      icon(food.id, 4),
      h('span', { class: 'food-count' }, `×${count}`),
    );
    btn.addEventListener('pointerdown', (e) => startDrag(e, food));
    return btn;
  }

  function startDrag(e: PointerEvent, food: FoodDef): void {
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let dragging = false;
    const ghost = icon(food.id, 5, 'px-icon drag-ghost');
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
        dragging = true;
        document.body.append(ghost);
        sheet.classList.add('peek');
      }
      if (dragging) {
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      ghost.remove();
      sheet.classList.remove('peek');
      const r = target.getBoundingClientRect();
      const onTarget = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      if (!dragging || onTarget) {
        close();
        onFeed(food.id);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
}
