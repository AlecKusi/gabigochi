import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, SAVE_KEY, loadState, saveState, type KV } from '../../src/core/save';
import { createState } from '../../src/core/state';

const T0 = new Date(2026, 9, 6, 12).getTime();

function memoryKV(init: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('save', () => {
  it('brak zapisu → nowy stan', () => {
    const r = loadState(memoryKV(), T0);
    expect(r.fresh).toBe(true);
    expect(r.recovered).toBe(false);
    expect(r.state.coins).toBe(150);
  });

  it('zapis i odczyt dają ten sam stan', () => {
    const kv = memoryKV();
    const s = { ...createState(T0), coins: 777, records: { catch: 5 } };
    expect(saveState(kv, s)).toBe(true);
    const r = loadState(kv, T0 + 5);
    expect(r.fresh).toBe(false);
    expect(r.state).toEqual(s);
  });

  it('uszkodzony JSON → kopia zapasowa i nowy stan', () => {
    const kv = memoryKV({ [SAVE_KEY]: '{oops' });
    const r = loadState(kv, T0);
    expect(r.recovered).toBe(true);
    expect(r.fresh).toBe(true);
    expect(kv.data.get(BACKUP_KEY)).toBe('{oops');
  });

  it('nieznana wersja lub zły kształt → kopia i nowy stan', () => {
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify({ version: 99 }) });
    expect(loadState(kv, T0).recovered).toBe(true);
    const kv2 = memoryKV({ [SAVE_KEY]: JSON.stringify({ ...createState(T0), coins: 'dużo' }) });
    expect(loadState(kv2, T0).recovered).toBe(true);
  });

  it('zapis stanu z NaN jest odrzucany i nie nadpisuje dobrego zapisu', () => {
    const kv = memoryKV();
    const good = { ...createState(T0), coins: 42 };
    expect(saveState(kv, good)).toBe(true);
    const before = kv.data.get(SAVE_KEY);
    expect(saveState(kv, { ...good, coins: NaN })).toBe(false);
    expect(kv.data.get(SAVE_KEY)).toBe(before);
  });

  it('wartości w fridge/records muszą być skończonymi liczbami', () => {
    const bad = { ...createState(T0), fridge: { apple: '2' } };
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify(bad) });
    expect(loadState(kv, T0).recovered).toBe(true);
    const bad2 = { ...createState(T0), records: { catch: null } };
    expect(loadState(memoryKV({ [SAVE_KEY]: JSON.stringify(bad2) }), T0).recovered).toBe(true);
  });

  it('błąd zapisu (np. pełna pamięć) nie wywraca aplikacji', () => {
    const kv: KV = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(saveState(kv, createState(T0))).toBe(false);
  });
});
