import type { Release } from '../core/changelog';
import { h } from './dom';

/** Okno „Co nowego?” po aktualizacji: nowości z wersji, których gracz jeszcze nie widział (najnowsze na górze). */
export function showWhatsNew(host: HTMLElement, releases: readonly Release[]): void {
  const close = () => overlay.remove();
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  const overlay: HTMLElement = h(
    'div',
    { class: 'overlay rules-overlay', onclick: (e: Event) => { if (e.target === overlay) close(); } },
    h(
      'div',
      { class: 'dialog px-box rules', role: 'dialog', 'aria-label': 'Co nowego' },
      h('h2', {}, 'Co nowego?'),
      ...releases.flatMap((r) => [h('h3', {}, day(r.date)), h('ul', {}, ...r.changes.map((c) => h('li', {}, c)))]),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'px-btn', onclick: close }, 'Super!')),
    ),
  );
  host.append(overlay);
}
