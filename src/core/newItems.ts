import type { Release } from './changelog';
import type { KV } from './save';

/**
 * Znaczek „NOWE” w sklepie i szafie: identyfikatory rzeczy z wersji, które przyszły w aktualizacji. Znaczek
 * zostaje, dopóki gracz nie obejrzy danej kategorii (potem znika przy wyjściu z ekranu). Osobny klucz —
 * to podpowiedź dla widza, nie stan gry.
 */
export const NEW_ITEMS_KEY = 'gabigochi.newItems';

export function readNew(kv: Pick<KV, 'getItem'>): Set<string> {
  try {
    const raw = kv.getItem(NEW_ITEMS_KEY);
    const ids: unknown = raw === null ? [] : JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function write(kv: KV, ids: Set<string>): void {
  try {
    kv.setItem(NEW_ITEMS_KEY, JSON.stringify([...ids]));
  } catch {
    // bez miejsca — znaczki po prostu się nie pokażą
  }
}

export function addNew(kv: KV, ids: Iterable<string>): void {
  const all = readNew(kv);
  const before = all.size;
  for (const id of ids) all.add(id);
  if (all.size !== before) write(kv, all);
}

export function clearNew(kv: KV, ids: Iterable<string>): void {
  const all = readNew(kv);
  const before = all.size;
  for (const id of ids) all.delete(id);
  if (all.size !== before) write(kv, all);
}

/** Rzeczy dodane w podanych wersjach (pole `items` wpisów `RELEASES`). */
export function releaseItems(releases: readonly Release[]): string[] {
  return releases.flatMap((r) => r.items ?? []);
}
