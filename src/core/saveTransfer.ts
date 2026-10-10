import { NewerSaveError, loadState, type KV } from './save';
import type { GameState } from './types';

/**
 * Kopia zapisu w pliku: przenosi postęp na inny telefon, po usunięciu aplikacji albo po zmianie adresu gry
 * (zapis w przeglądarce należy do adresu i znika razem z aplikacją). Plik to zapis w tym samym formacie co
 * w telefonie, z podpisem gry i datą.
 */
export const BACKUP_APP = 'gabigochi';

export function exportSave(state: GameState, now: number): string {
  return JSON.stringify({ app: BACKUP_APP, exportedAt: new Date(now).toISOString(), save: state });
}

/** Nazwa pliku kopii, np. `gabigochi-kopia-2026-10-10.json`. */
export function backupFileName(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `gabigochi-kopia-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export type ImportResult =
  | { ok: true; state: GameState; exportedAt: string | null }
  /** `format` — to nie jest zapis gry (albo jest uszkodzony), `newer` — kopia z nowszej wersji gry. */
  | { ok: false; reason: 'format' | 'newer' };

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Odczyt kopii (plik z `exportSave` albo sam zapis). Przechodzi przez te same migracje i naprawy co zapis
 * w telefonie, więc kopia ze starszej wersji gry wczytuje się w nowszej.
 */
export function importSave(text: string, now: number): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'format' };
  }
  const file = isRecord(parsed) && parsed.app === BACKUP_APP && 'save' in parsed ? parsed : null;
  const save = file ? file.save : parsed;
  const exportedAt = file && typeof file.exportedAt === 'string' ? file.exportedAt : null;
  const raw = JSON.stringify(save ?? null);
  const kv: KV = { getItem: () => raw, setItem: () => {} };
  try {
    const r = loadState(kv, now);
    if (r.fresh || r.recovered) return { ok: false, reason: 'format' };
    return { ok: true, state: r.state, exportedAt };
  } catch (err) {
    if (err instanceof NewerSaveError) return { ok: false, reason: 'newer' };
    throw err;
  }
}
