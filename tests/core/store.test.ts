import { describe, expect, it, vi } from 'vitest';
import { Store } from '../../src/core/store';
import { SAVE_KEY, type KV } from '../../src/core/save';
import { createState } from '../../src/core/state';

const T0 = new Date(2026, 9, 6, 12).getTime();

function kv(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('Store', () => {
  it('update powiadamia i zapisuje', () => {
    const storage = kv();
    const store = new Store(createState(T0), storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => ({ ...s, coins: 1 }));
    expect(store.get().coins).toBe(1);
    expect(listener).toHaveBeenCalledWith(store.get());
    expect(JSON.parse(storage.data.get(SAVE_KEY)!).coins).toBe(1);
  });

  it('ten sam obiekt stanu nie powiadamia', () => {
    const store = new Store(createState(T0), kv());
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => s);
    expect(listener).not.toHaveBeenCalled();
  });

  it('odsubskrybowanie', () => {
    const store = new Store(createState(T0), kv());
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.update((s) => ({ ...s, coins: 2 }));
    expect(listener).not.toHaveBeenCalled();
  });
});
