import { h } from './dom';

export function confirmDialog(host: HTMLElement, text: string, yes = 'Tak', no = 'Nie'): Promise<boolean> {
  return new Promise((resolve) => {
    const close = (value: boolean) => {
      overlay.remove();
      resolve(value);
    };
    const overlay = h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'dialog px-box', role: 'dialog' },
        h('p', {}, text),
        h(
          'div',
          { class: 'dialog-actions' },
          h('button', { class: 'px-btn secondary', onclick: () => close(false) }, no),
          h('button', { class: 'px-btn', onclick: () => close(true) }, yes),
        ),
      ),
    );
    host.append(overlay);
  });
}
