import { h } from './dom';

let active: HTMLElement | null = null;

export function showToast(host: HTMLElement, text: string): void {
  active?.remove();
  const el = h('div', { class: 'toast px-box', role: 'status' }, text);
  host.append(el);
  active = el;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, 2200);
}
