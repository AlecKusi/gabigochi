import type { App, Screen } from '../../app';
import { content } from '../../content';
import { dayNumber } from '../../core/time';
import { GAMES } from '../../games';
import { h, icon } from '../dom';
import { screenHeader } from '../screenHeader';
import { CONFIG } from '../../core/config';
import { itemUrl } from '../home/itemSprites';
import { needBar } from '../needBar';
import { backupCard } from '../saveBackup';
import { play, setSoundEnabled, soundEnabled } from '../sound';

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
      catCard(app),
      h('section', { class: 'records px-box' }, h('h2', {}, 'Rekordy'), h('ul', {}, ...rows)),
      soundToggle(),
      h('button', { class: 'px-btn', onclick: () => app.go('birthday', { replay: true }) }, 'Pokaż życzenia'),
      backupCard(app),
    ),
  );
  return { el, destroy: header.destroy };
}

/** Karta kotka: obrazek, imię do zmiany, najedzenie i sympatia. */
function catCard(app: App): HTMLElement {
  const cat = app.store.get().cat;
  const hunger = needBar('hunger', 'Najedzenie', 'apple');
  const love = needBar('mood', 'Sympatia', 'heart');
  hunger.set(cat.hunger);
  love.set(cat.love);
  const name = h('input', {
    class: 'cat-name',
    type: 'text',
    value: cat.name,
    maxlength: String(CONFIG.cat.maxName),
    'aria-label': 'Imię kotka',
    enterkeyhint: 'done',
  });
  const save = () => {
    const v = name.value.trim().slice(0, CONFIG.cat.maxName);
    if (!v) {
      name.value = app.store.get().cat.name;
      return;
    }
    if (v !== app.store.get().cat.name) {
      app.store.update((st) => ({ ...st, cat: { ...st.cat, name: v } }));
      play('meow');
      app.toast(`Kotek nazywa się teraz ${v}!`);
    }
  };
  name.addEventListener('change', save);
  name.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') name.blur();
  });
  const mood =
    cat.hunger < CONFIG.cat.hungryBelow ? 'Jest głodny — nasyp karmy do miski w kuchni!' : cat.love > 70 ? 'Uwielbia Gabi i łasi się do niej.' : 'Pogłaszcz go, a polubi Gabi jeszcze bardziej.';
  return h(
    'section',
    { class: 'cat-card px-box' },
    h('img', { class: 'px cat-pic', src: itemUrl('cat_sit'), alt: '' }),
    h('div', { class: 'cat-info' }, h('label', { class: 'cat-label' }, 'Imię kotka', name), hunger.el, love.el, h('small', {}, mood)),
  );
}

/** Przełącznik dźwięków 8-bit. */
function soundToggle(): HTMLElement {
  const btn = h('button', { class: 'px-btn secondary sound-toggle', 'aria-pressed': String(soundEnabled()) });
  const label = () => {
    btn.textContent = soundEnabled() ? 'Dźwięki: włączone' : 'Dźwięki: wyłączone';
    btn.setAttribute('aria-pressed', String(soundEnabled()));
  };
  btn.addEventListener('click', () => {
    setSoundEnabled(!soundEnabled());
    label();
  });
  label();
  return btn;
}

