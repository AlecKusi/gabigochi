import { content } from '../content';
import { spriteUrl } from '../sprites/loader';
import { h } from './dom';

/** Ekran dla zwykłej karty Safari: zapis gry działa tylko w aplikacji z ekranu początkowego. */
export function mountInstall(root: HTMLElement): void {
  root.append(
    h(
      'div',
      { class: 'screen install' },
      h('img', { class: 'px portrait-mid', src: spriteUrl('portrait_a'), alt: '' }),
      h('h1', {}, content.appName),
      h('p', {}, `Prezent dla ${content.nameGenitive}! Zainstaluj go na ekranie początkowym:`),
      h(
        'ol',
        { class: 'install-steps px-box' },
        h('li', {}, 'Stuknij ', h('strong', {}, 'Udostępnij'), ' na pasku Safari (kwadrat ze strzałką).'),
        h('li', {}, 'Wybierz ', h('strong', {}, 'Dodaj do ekranu początkowego'), '.'),
        h('li', {}, 'Otwórz ', h('strong', {}, content.appName), ' z ekranu początkowego.'),
      ),
      h('a', { class: 'small-link', href: '?play' }, 'Zagraj w przeglądarce (osobny zapis)'),
    ),
  );
}
