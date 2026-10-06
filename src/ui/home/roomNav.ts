import type { RoomId } from '../../core/types';
import { ROOMS, ROOM_NAMES } from '../../home/layout';
import { h, icon } from '../dom';
import { neighborRoom, swipeDir } from './scene';

export interface RoomNavHooks {
  /** Czy gest przewijania może zacząć się w tym punkcie (px logiczne) — tylko puste tło. */
  canSwipeFrom(e: PointerEvent): boolean;
  onNavigate(dir: -1 | 1): void;
}

export interface RoomNav {
  /** Nazwa pokoju i kropki — nad sceną. */
  readonly title: HTMLElement;
  /** Strzałki ‹ › — do wstawienia w scenę. */
  readonly arrows: readonly HTMLElement[];
  setRoom(room: RoomId): void;
  /** Zablokowane (Gabi śpi): strzałki ukryte, przesunięcie nic nie robi. */
  setLocked(locked: boolean): void;
  destroy(): void;
}

/** Strzałki przy krawędziach sceny i poziome przesunięcie palcem po pustym tle (> SWIPE_MIN px). */
export function createRoomNav(canvas: HTMLCanvasElement, hooks: RoomNavHooks): RoomNav {
  let room: RoomId = ROOMS[0];
  let locked = false;
  let swipe: { id: number; x: number; y: number } | null = null;

  const name = h('span', { class: 'room-name' });
  const dots = ROOMS.map(() => h('i', { class: 'room-dot' }));
  const title = h('div', { class: 'room-title', 'aria-live': 'polite' }, name, h('span', { class: 'room-dots', 'aria-hidden': 'true' }, ...dots));

  const go = (dir: -1 | 1) => {
    if (!locked) hooks.onNavigate(dir);
  };
  const arrow = (dir: -1 | 1) =>
    h(
      'button',
      { class: `room-arrow ${dir < 0 ? 'left' : 'right'}`, onclick: () => go(dir) },
      icon(dir < 0 ? 'chevronLeft' : 'chevronRight', 3),
    );
  const arrows = [arrow(-1), arrow(1)];

  const onDown = (e: PointerEvent) => {
    if (swipe || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (locked || !hooks.canSwipeFrom(e)) return;
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dir = swipeDir(e.clientX - swipe.x, e.clientY - swipe.y);
    swipe = null;
    if (dir !== 0) go(dir);
  };
  const onCancel = (e: PointerEvent) => {
    if (swipe && e.pointerId === swipe.id) swipe = null;
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  function setRoom(r: RoomId): void {
    room = r;
    name.textContent = ROOM_NAMES[r];
    dots.forEach((d, i) => d.classList.toggle('on', ROOMS[i] === r));
    arrows[0].setAttribute('aria-label', `Do pokoju: ${ROOM_NAMES[neighborRoom(room, -1)]}`);
    arrows[1].setAttribute('aria-label', `Do pokoju: ${ROOM_NAMES[neighborRoom(room, 1)]}`);
  }
  setRoom(room);

  return {
    title,
    arrows,
    setRoom,
    setLocked(v) {
      locked = v;
      if (v) swipe = null;
      for (const a of arrows) a.classList.toggle('hidden', v);
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    },
  };
}

/** Czas przesunięcia sceny przy zmianie pokoju. */
export const SLIDE_MS = 200;

/**
 * Przejście między pokojami: zrzut bieżącej klatki odjeżdża w bok, a scena (od następnej klatki już nowy pokój)
 * wjeżdża z drugiej strony. Wołać przed zmianą pokoju. Bez Web Animations albo przy ograniczonym ruchu — bez efektu.
 */
export function slideStage(canvas: HTMLCanvasElement, dir: -1 | 1): void {
  if (typeof canvas.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const shot = document.createElement('canvas');
  shot.width = canvas.width;
  shot.height = canvas.height;
  shot.className = 'px px-stage stage-shot';
  shot.getContext('2d')?.drawImage(canvas, 0, 0);
  canvas.after(shot);
  const opts: KeyframeAnimationOptions = { duration: SLIDE_MS, easing: 'cubic-bezier(.3, .7, .4, 1)' };
  const out = shot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-dir * 100}%)` }], opts);
  out.onfinish = () => shot.remove();
  out.oncancel = () => shot.remove();
  canvas.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'translateX(0)' }], opts);
}
