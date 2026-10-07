import type { App, Screen } from '../../app';
import { content } from '../../content';
import { dayNumber } from '../../core/time';
import { GAMES } from '../../games';
import { h, icon } from '../dom';
import { screenHeader } from '../screenHeader';

export function profileScreen(app: App): Screen {
  const header = screenHeader(app, 'Profil');
  const s = app.store.get();
  const rows = GAMES.map((g) =>
    h('li', {}, icon(g.icon, 2), h('span', {}, g.name), h('strong', {}, String(s.records[g.id] ?? '—'))),
  );
  const el = h(
    'div',
    { class: 'screen profile' },
    header.el,
    h(
      'div',
      { class: 'profile-body' },
      h(
        'div',
        { class: 'profile-card px-box' },
        h('img', { class: 'px portrait-mid', src: app.figures.url('portrait_a'), alt: '' }),
        h('h2', {}, content.name),
        h('p', {}, `Dzień ${dayNumber(s.createdAt, Date.now())} w ${content.appName}`),
      ),
      h('section', { class: 'records px-box' }, h('h2', {}, 'Rekordy'), h('ul', {}, ...rows)),
      h('button', { class: 'px-btn', onclick: () => app.go('birthday', { replay: true }) }, 'Pokaż życzenia'),
    ),
  );
  return { el, destroy: header.destroy };
}
