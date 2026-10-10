import type { App } from '../app';
import { ageOn, withAge } from '../core/birthday';
import { CONFIG } from '../core/config';
import { content } from '../content';
import { h, icon } from './dom';
import { play } from './sound';

/** Urodziny Gabi: życzenia, prezent w monetach i konfetti (raz w roku, patrz `claimBirthdayGift`). */
export function showBirthdayGift(app: App, now: number): void {
  const close = () => {
    overlay.remove();
    play('coin');
    app.celebrate();
  };
  const overlay: HTMLElement = h(
    'div',
    { class: 'overlay' },
    h(
      'div',
      { class: 'dialog px-box birthday-gift', role: 'dialog', 'aria-label': 'Urodziny' },
      h('h2', {}, content.wishesTitle),
      h('p', { class: 'gift-age' }, String(ageOn(now))),
      h('p', {}, withAge(content.birthdayGift, now)),
      h('p', { class: 'end-reward' }, icon('coin', 3), `+${CONFIG.coins.birthdayGift}`),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'px-btn big', onclick: close }, 'Dziękuję!')),
    ),
  );
  app.root.append(overlay);
  app.celebrate();
  play('record');
}
