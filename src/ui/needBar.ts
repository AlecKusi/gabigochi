import type { IconName } from '../art/icons';
import { h, icon } from './dom';

export interface NeedBar {
  el: HTMLElement;
  set(value: number): void;
}

export function needBar(kind: 'hunger' | 'mood' | 'energy', label: string, iconName: IconName): NeedBar {
  const fill = h('div', { class: 'need-fill' });
  const el = h(
    'div',
    { class: `need need-${kind}`, role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('div', { class: 'need-label' }, icon(iconName, 1), label),
    h('div', { class: 'need-track' }, fill),
  );
  return {
    el,
    set(value) {
      const v = Math.round(value);
      fill.style.width = `${v}%`;
      el.classList.toggle('low', v < 25);
      el.setAttribute('aria-valuenow', String(v));
      el.setAttribute('aria-label', `${label}: ${v}%`);
    },
  };
}
