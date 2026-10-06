import type { Store } from '../../core/store';
import type { GameState, PlacedItem, RoomId } from '../../core/types';
import { findItem } from '../../home/catalog';
import { clampToLayer, flipItem, hitItem, moveItem, placeItem, storeItem, applyLook, type HomeOutcome, type Pos } from '../../home/layout';
import { h, icon } from '../dom';
import { createInventoryPanel } from './inventoryPanel';

/** Przesunięcie palca (px logiczne), od którego stuknięcie w przedmiot staje się przeciąganiem. */
const DRAG_START = 2;

/**
 * Układ do narysowania w trakcie przeciągania: przesuwany przedmiot w nowym miejscu i na wierzchu swojej warstwy
 * (tak jak po `moveItem`). Bez zmian, gdy nie ma takiego przedmiotu.
 */
export function withPreview(items: readonly PlacedItem[], uid: string, pos: Pos): readonly PlacedItem[] {
  const it = items.find((i) => i.uid === uid);
  if (!it) return items;
  return [...items.filter((i) => i.uid !== uid), { ...it, x: pos.x, y: pos.y }];
}

export interface EditHooks {
  store: Store;
  /** Pokój oglądany w tej chwili. */
  room(): RoomId;
  toLogical(e: PointerEvent): { x: number; y: number };
  toast(text: string): void;
  /** Wejście/wyjście z trybu (pokój chowa nawigację, przygasza Gabi…). */
  onToggle(active: boolean): void;
}

export interface EditMode {
  readonly active: boolean;
  readonly selectedUid: string | null;
  /** Przycisk ołówka (w rogu sceny). */
  readonly button: HTMLElement;
  /** Pasek narzędzi i panel magazynu (pod sceną, zamiast nawigacji). */
  readonly el: HTMLElement;
  open(): void;
  close(): void;
  /** Przedmioty pokoju do narysowania — z podglądem przeciąganego. */
  displayItems(items: readonly PlacedItem[]): readonly PlacedItem[];
  /** Po zmianie pokoju: bez zaznaczenia, przerwane przeciąganie. */
  roomChanged(): void;
  sync(state: GameState): void;
  destroy(): void;
}

interface Drag {
  id: number;
  uid: string;
  /** Punkt chwycenia względem kotwicy przedmiotu (środek dołu). */
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  /** Bieżące (przyciągnięte do siatki) miejsce; null, dopóki palec się nie ruszył. */
  pos: Pos | null;
}

/**
 * Tryb „Urządzaj”: stuknięcie przedmiotu zaznacza go, przeciąganie przesuwa (siatka + warstwa), pasek: Odbij,
 * Do magazynu, Gotowe; panel: magazyn i wybór tapety/podłogi. Każda zmiana od razu trafia do zapisu.
 */
export function createEditMode(canvas: HTMLCanvasElement, hooks: EditHooks): EditMode {
  const { store } = hooks;
  let active = false;
  let selected: string | null = null;
  let drag: Drag | null = null;

  /** Zmiana układu przez czystą funkcję z `home/layout`; błąd — komunikat. */
  function apply(fn: (s: GameState) => HomeOutcome, errors: Partial<Record<string, string>> = {}): boolean {
    const res = fn(store.get());
    if (!res.ok) {
      const msg = errors[res.reason];
      if (msg) hooks.toast(msg);
      return false;
    }
    store.update(() => res.state);
    return true;
  }

  const flipBtn = h('button', { class: 'px-btn secondary', onclick: () => selected && apply((s) => flipItem(s, hooks.room(), selected!)) }, 'Odbij');
  const storeBtn = h('button', { class: 'px-btn secondary', onclick: storeSelected }, 'Do magazynu');
  const doneBtn = h('button', { class: 'px-btn', onclick: () => close() }, 'Gotowe');
  const toolbar = h('div', { class: 'edit-bar' }, flipBtn, storeBtn, doneBtn);

  const panel = createInventoryPanel({
    onPlace(itemId) {
      const room = hooks.room();
      const uid = `u${store.get().nextUid}`;
      if (apply((s) => placeItem(s, room, itemId, Date.now()))) select(uid);
    },
    onLook(lookId) {
      apply((s) => applyLook(s, hooks.room(), lookId));
    },
  });

  const el = h('div', { class: 'edit-dock px-box' }, toolbar, panel.el);
  const button = h(
    'button',
    { class: 'px-btn secondary icon-only edit-toggle', 'aria-label': 'Urządzaj', title: 'Urządzaj', onclick: () => open() },
    icon('pencil', 2),
  );

  function storeSelected(): void {
    if (!selected) return;
    const uid = selected;
    if (apply((s) => storeItem(s, hooks.room(), uid), { fixed: 'Łóżko Gabi musi zostać w sypialni' })) select(null);
  }

  function refreshToolbar(): void {
    for (const b of [flipBtn, storeBtn]) b.toggleAttribute('disabled', selected === null);
  }

  function select(uid: string | null): void {
    selected = uid;
    refreshToolbar();
  }

  function releaseCapture(id: number): void {
    try {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    } catch {
      /* nic do zwolnienia */
    }
  }

  function cancelDrag(): void {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    releaseCapture(id);
  }

  const onDown = (e: PointerEvent) => {
    if (!active || drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = hooks.toLogical(e);
    const hit = hitItem(store.get().rooms[hooks.room()].items, p.x, p.y);
    select(hit?.uid ?? null);
    if (!hit) return;
    drag = { id: e.pointerId, uid: hit.uid, dx: p.x - hit.x, dy: p.y - hit.y, startX: p.x, startY: p.y, pos: null };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ruch i puszczenie dochodzą też przez window */
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = hooks.toLogical(e);
    if (!drag.pos && Math.hypot(p.x - drag.startX, p.y - drag.startY) < DRAG_START) return;
    const it = store.get().rooms[hooks.room()].items.find((i) => i.uid === drag!.uid);
    const def = it && findItem(it.itemId);
    if (!def) {
      cancelDrag();
      return;
    }
    drag.pos = clampToLayer(def, { x: p.x - drag.dx, y: p.y - drag.dy });
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { uid, pos } = drag;
    cancelDrag();
    if (!pos) return;
    const it = store.get().rooms[hooks.room()].items.find((i) => i.uid === uid);
    if (it && (it.x !== pos.x || it.y !== pos.y)) apply((s) => moveItem(s, hooks.room(), uid, pos));
  };

  const onCancel = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) cancelDrag();
  };

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  function open(): void {
    if (active) return;
    active = true;
    select(null);
    panel.render(store.get(), hooks.room());
    hooks.onToggle(true);
  }

  function close(): void {
    if (!active) return;
    cancelDrag();
    active = false;
    select(null);
    hooks.onToggle(false);
  }

  refreshToolbar();

  return {
    get active() {
      return active;
    },
    get selectedUid() {
      return selected;
    },
    button,
    el,
    open,
    close,
    displayItems(items) {
      return drag?.pos ? withPreview(items, drag.uid, drag.pos) : items;
    },
    roomChanged() {
      cancelDrag();
      select(null);
      if (active) panel.render(store.get(), hooks.room());
    },
    sync(state) {
      if (!active) return;
      // zaznaczony przedmiot mógł zniknąć (schowany do magazynu)
      if (selected && !state.rooms[hooks.room()].items.some((i) => i.uid === selected)) select(null);
      panel.render(state, hooks.room());
    },
    destroy() {
      cancelDrag();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    },
  };
}
