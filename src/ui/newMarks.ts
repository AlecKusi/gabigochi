import { clearNew, readNew } from '../core/newItems';
import { h } from './dom';

export interface NewMarks {
  /** Czy któraś z rzeczy jest nowa (kropka na kategorii / zakładce). */
  any(ids: Iterable<string>): boolean;
  /** Znaczek „NOWE” dla rzeczy (i zapamiętanie, że gracz ją zobaczył) albo null. */
  badge(id: string, cls?: string): HTMLElement | null;
  /** Przy wyjściu z ekranu: obejrzane rzeczy przestają być nowe. */
  done(): void;
}

/** Znaczki nowości na ekranie sklepu albo szafy (lista z `core/newItems`). */
export function newMarks(): NewMarks {
  const fresh = readNew(localStorage);
  const seen = new Set<string>();
  return {
    any: (ids) => [...ids].some((id) => fresh.has(id)),
    badge(id, cls = 'new-badge') {
      if (!fresh.has(id)) return null;
      seen.add(id);
      return h('span', { class: cls }, 'NOWE');
    },
    done() {
      if (seen.size > 0) clearNew(localStorage, seen);
    },
  };
}
