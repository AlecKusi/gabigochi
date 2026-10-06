import { h, icon } from './dom';

export function comingSoon(text: string): HTMLElement {
  return h('div', { class: 'coming-soon px-box' }, icon('lock', 4), h('p', {}, text));
}
