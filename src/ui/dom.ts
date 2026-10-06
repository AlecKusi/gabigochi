import { ICONS, type IconName } from '../art/icons';
import { artDataUrl } from '../art/pixels';

type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

/** Ikona pixel art jako <img> w skali całkowitej (ostre piksele). */
export function icon(name: IconName, scale = 3, cls = 'px-icon'): HTMLImageElement {
  const art = ICONS[name];
  return h('img', {
    src: artDataUrl(name, art, scale),
    class: cls,
    alt: '',
    draggable: 'false',
    width: art[0].length * scale,
    height: art.length * scale,
  });
}
