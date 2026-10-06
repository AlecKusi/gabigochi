import type { App, Screen } from '../../app';
import { spriteUrl } from '../../sprites/loader';
import { comingSoon } from '../comingSoon';
import { h } from '../dom';
import { screenHeader } from '../screenHeader';

export function wardrobeScreen(app: App): Screen {
  const header = screenHeader(app, 'Szafa');
  const el = h(
    'div',
    { class: 'screen wardrobe' },
    header.el,
    h(
      'div',
      { class: 'wardrobe-body' },
      h('img', { class: 'px wardrobe-preview', src: spriteUrl('idle_front'), alt: '' }),
      comingSoon('Szafa otworzy się już wkrótce: sukienki, czapki i nowe tła!'),
    ),
  );
  return { el, destroy: header.destroy };
}
