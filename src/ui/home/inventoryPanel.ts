import type { GameState, RoomId } from '../../core/types';
import { findItem } from '../../home/catalog';
import { LOOKS, type LookDef, type LookKind } from '../../home/looks';
import { h } from '../dom';
import { itemUrl } from './itemSprites';
import { lookSwatch } from './lookSwatch';

export type PanelTab = 'inventory' | LookKind;

/** Wpisy magazynu do pokazania: znane przedmioty z liczbą > 0, w kolejności katalogu (stabilnej). */
export function inventoryEntries(inventory: Readonly<Record<string, number>>): { itemId: string; count: number }[] {
  return Object.entries(inventory)
    .filter(([id, n]) => n > 0 && findItem(id) !== undefined)
    .map(([itemId, count]) => ({ itemId, count }));
}

/** Posiadane wyglądy danego rodzaju w kolejności z `LOOKS`. */
export function ownedLooksOf(owned: readonly string[], kind: LookKind): LookDef[] {
  return LOOKS.filter((l) => l.kind === kind && owned.includes(l.id));
}

export interface InventoryHooks {
  /** Stuknięcie przedmiotu w magazynie — postaw w bieżącym pokoju. */
  onPlace(itemId: string): void;
  /** Stuknięcie tapety/podłogi — zastosuj w bieżącym pokoju. */
  onLook(lookId: string): void;
}

export interface InventoryPanel {
  readonly el: HTMLElement;
  /** Odświeża zawartość (tylko gdy coś istotnego się zmieniło). */
  render(state: GameState, room: RoomId): void;
}

/** Wymiary próbki wyglądu (px logiczne) i jej powiększenie na ekranie. */
const SWATCH = { w: 24, h: 16, scale: 3 } as const;

const swatch = (look: LookDef): HTMLCanvasElement => lookSwatch(look, SWATCH.w, SWATCH.h, SWATCH.scale);

/** Dolny panel trybu „Urządzaj”: zakładki Magazyn / Tapeta / Podłoga i poziomo przewijana lista. */
export function createInventoryPanel(hooks: InventoryHooks): InventoryPanel {
  let tab: PanelTab = 'inventory';
  let lastKey = '';
  let lastView = '';
  let last: { state: GameState; room: RoomId } | null = null;

  const tabBtn = (id: PanelTab, label: string) =>
    h('button', { class: 'edit-tab', role: 'tab', 'data-tab': id, onclick: () => setTab(id) }, label);
  const tabs = [tabBtn('inventory', 'Magazyn'), tabBtn('wallpaper', 'Tapeta'), tabBtn('floor', 'Podłoga')];
  const hint = h('p', { class: 'edit-hint' });
  const list = h('div', { class: 'edit-list' });
  const el = h('div', { class: 'edit-panel' }, h('div', { class: 'edit-tabs', role: 'tablist' }, ...tabs), hint, list);

  function setTab(id: PanelTab): void {
    tab = id;
    if (last) render(last.state, last.room);
  }

  function inventoryTiles(state: GameState): HTMLElement[] {
    return inventoryEntries(state.inventory).map(({ itemId, count }) => {
      const def = findItem(itemId)!;
      return h(
        'button',
        { class: 'edit-tile', title: def.name, 'aria-label': `${def.name}, ${count} szt. — postaw w pokoju`, onclick: () => hooks.onPlace(itemId) },
        h('img', { class: 'px', src: itemUrl(def.sprite), alt: '', draggable: 'false' }),
        count > 1 ? h('span', { class: 'edit-count' }, `×${count}`) : null,
      );
    });
  }

  function lookTiles(state: GameState, room: RoomId, kind: LookKind): HTMLElement[] {
    const current = kind === 'wallpaper' ? state.rooms[room].wallpaper : state.rooms[room].floor;
    return ownedLooksOf(state.ownedLooks, kind).map((look) =>
      h(
        'button',
        {
          class: `edit-tile look${look.id === current ? ' on' : ''}`,
          title: look.name,
          'aria-label': look.name,
          'aria-pressed': String(look.id === current),
          onclick: () => hooks.onLook(look.id),
        },
        swatch(look),
      ),
    );
  }

  function render(state: GameState, room: RoomId): void {
    // balkon nie ma tapety (niebo z pory dnia) — bez zakładki „Tapeta”
    const noWall = room === 'balcony';
    tabs[1].hidden = noWall;
    if (noWall && tab === 'wallpaper') tab = 'inventory';
    last = { state, room };
    const r = state.rooms[room];
    const key = JSON.stringify([tab, room, state.inventory, state.ownedLooks, r.wallpaper, r.floor]);
    if (key === lastKey) return;
    lastKey = key;
    for (const t of tabs) t.setAttribute('aria-selected', String(t.dataset.tab === tab));
    // Ta sama zakładka i pokój — zostajemy w tym samym miejscu listy; inaczej od początku.
    const scroll = lastView === `${tab}|${room}` ? list.scrollLeft : 0;
    lastView = `${tab}|${room}`;
    if (tab === 'inventory') {
      const tiles = inventoryTiles(state);
      hint.textContent = tiles.length ? 'Stuknij, żeby postawić w pokoju.' : 'Magazyn jest pusty — meble kupisz w sklepie.';
      list.replaceChildren(...tiles);
    } else {
      const current = LOOKS.find((l) => l.id === (tab === 'wallpaper' ? r.wallpaper : r.floor));
      hint.textContent = `${tab === 'wallpaper' ? 'Tapeta' : 'Podłoga'}: ${current?.name ?? '—'}`;
      list.replaceChildren(...lookTiles(state, room, tab));
    }
    list.scrollLeft = scroll;
  }

  return { el, render };
}
