import type { App, Screen, ScreenParams } from '../../app';
import { content } from '../../content';
import { FRAMES } from '../../sprites/loader';
import { h } from '../dom';

export function birthdayScreen(app: App, params?: ScreenParams): Screen {
  const replay = params?.replay === true;
  const start = () => {
    app.store.update((s) => (s.seenBirthday ? s : { ...s, seenBirthday: true }));
    void app.go(replay ? 'profile' : 'room');
  };
  const el = h(
    'div',
    { class: 'screen birthday' },
    h('div', { class: 'bday-age', 'aria-label': `${content.age} urodziny` }, String(content.age)),
    h(
      'div',
      { class: 'bday-hero' },
      h('img', { class: 'px portrait-big', src: app.figures.url('portrait_b'), alt: `Portret: ${content.name}` }),
      h('img', { class: 'px wave-sprite', src: app.figures.url('fun_wave'), alt: '', style: waveStyle(app) }),
    ),
    h('h1', { class: 'bday-title' }, content.wishesTitle),
    h(
      'div',
      { class: 'bday-wishes px-box' },
      ...content.wishes.map((p) => h('p', {}, p)),
      h('p', { class: 'signature' }, content.signature),
    ),
    h('button', { class: 'px-btn big', onclick: start }, replay ? 'Wróć' : 'Zaczynamy!'),
  );
  const timers = [setTimeout(() => app.celebrate(), 400), setTimeout(() => app.celebrate(), 2600)];
  return { el, destroy: () => timers.forEach(clearTimeout) };
}

/** Machająca Gabi w ozdobie głowy jest wyższa — obrazek rośnie, żeby postać zachowała rozmiar. */
function waveStyle(app: App): string {
  const h = app.figures.get('fun_wave')?.meta.h;
  const base = FRAMES.fun_wave?.h;
  return h && base ? `height: ${Math.round((114 * h) / base)}px` : '';
}
