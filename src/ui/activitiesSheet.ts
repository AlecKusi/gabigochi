import { ACTIVITIES, ACTIVITY_IDS, type ActivityId } from '../pet/activities';
import { spriteUrl } from '../sprites/loader';
import { h } from './dom';

/** Wysuwany panel „Zajęcia”: stuknięcie w kartę od razu zaczyna zajęcie. Zwraca funkcję zamykającą. */
export function openActivities(host: HTMLElement, onPick: (id: ActivityId) => void): () => void {
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    sheet.classList.add('out');
    setTimeout(() => backdrop.remove(), 220);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  const card = (id: ActivityId) => {
    const def = ACTIVITIES[id];
    return h(
      'button',
      {
        class: 'activity-card',
        onclick: () => {
          close();
          onPick(id);
        },
      },
      h('img', { class: 'px', src: spriteUrl(def.frames[0]), alt: '', draggable: 'false' }),
      h('span', {}, def.name),
    );
  };

  const cards = ACTIVITY_IDS.map(card);
  const sheet = h(
    'div',
    { class: 'sheet px-box', role: 'dialog', 'aria-label': 'Zajęcia' },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, 'Zajęcia'),
      h('button', { class: 'px-btn secondary', onclick: close, 'aria-label': 'Zamknij' }, 'X'),
    ),
    h('p', { class: 'hint' }, 'Czym ma się zająć Gabi?'),
    h('div', { class: 'activity-cards' }, ...cards),
  );
  const backdrop = h('div', { class: 'sheet-backdrop' }, sheet);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  host.append(backdrop);
  return close;
}
