import { describe, expect, it } from 'vitest';
import { APP_VERSION, RELEASES, SEEN_VERSION_KEY, markSeen, readSeenVersion, unseenReleases } from '../../src/core/changelog';
import { createState } from '../../src/core/state';
import { backupFileName, exportSave, importSave } from '../../src/core/saveTransfer';
import fixture from '../fixtures/save-v2-2026-10-10.json';

const NOW = new Date(2026, 9, 10, 13).getTime();

describe('kopia zapisu w pliku', () => {
  it('eksport i import: ten sam postęp, data kopii', () => {
    const s = { ...createState(NOW), coins: 777, seenBirthday: true };
    const r = importSave(exportSave(s, NOW), NOW + 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.coins).toBe(777);
    expect(r.state.rooms).toEqual(s.rooms);
    expect(new Date(r.exportedAt!).getTime()).toBe(NOW);
  });

  it('sam zapis (bez opakowania) też się wczytuje, a starszy przechodzi przez migracje', () => {
    expect(importSave(JSON.stringify(fixture), NOW)).toMatchObject({ ok: true, exportedAt: null });
    const v1 = { ...createState(NOW), version: 1 } as Record<string, unknown>;
    for (const k of ['rooms', 'inventory', 'ownedLooks', 'currentRoom', 'itemCooldowns', 'outfit', 'ownedClothes', 'nextUid', 'cat']) delete v1[k];
    const r = importSave(JSON.stringify(v1), NOW);
    expect(r.ok && r.state.version).toBe(2);
  });

  it('odrzuca obce pliki i kopie z nowszej wersji gry', () => {
    expect(importSave('to nie json', NOW)).toEqual({ ok: false, reason: 'format' });
    expect(importSave('{"a":1}', NOW)).toEqual({ ok: false, reason: 'format' });
    expect(importSave('{"app":"gabigochi","save":null}', NOW)).toEqual({ ok: false, reason: 'format' });
    expect(importSave(JSON.stringify({ app: 'gabigochi', save: { ...fixture, version: 99 } }), NOW)).toEqual({ ok: false, reason: 'newer' });
  });

  it('nazwa pliku z datą', () => {
    expect(backupFileName(NOW)).toBe('gabigochi-kopia-2026-10-10.json');
  });
});

describe('co nowego po aktualizacji', () => {
  const kv = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('wersje rosną od góry, bieżąca to najnowsza', () => {
    expect(APP_VERSION).toBe(Math.max(...RELEASES.map((r) => r.version)));
    for (let i = 1; i < RELEASES.length; i++) expect(RELEASES[i - 1].version).toBeGreaterThan(RELEASES[i].version);
    for (const r of RELEASES) expect(r.changes.length, String(r.version)).toBeGreaterThan(0);
  });

  it('pierwsze uruchomienie — nic; po aktualizacji — tylko nowsze wersje; po obejrzeniu — nic', () => {
    const store = kv();
    expect(unseenReleases(readSeenVersion(store))).toEqual([]);
    markSeen(store);
    expect(store.getItem(SEEN_VERSION_KEY)).toBe(String(APP_VERSION));
    expect(unseenReleases(readSeenVersion(store))).toEqual([]);
    expect(unseenReleases(APP_VERSION - 1).map((r) => r.version)).toEqual([APP_VERSION]);
    store.setItem(SEEN_VERSION_KEY, 'bzdura');
    expect(readSeenVersion(store)).toBeNull();
  });
});
