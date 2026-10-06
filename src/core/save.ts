import { createState } from './state';
import type { GameState } from './types';

export const SAVE_KEY = 'gabigochi.save';
export const BACKUP_KEY = 'gabigochi.save_backup';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  state: GameState;
  fresh: boolean;
  recovered: boolean;
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const allNums = (x: Record<string, unknown>): boolean => Object.values(x).every(isNum);

function isValidV1(x: Record<string, unknown>): boolean {
  const n = x.needs;
  return (
    x.version === 1 &&
    isNum(x.createdAt) && isNum(x.lastUpdate) && isNum(x.coins) && isNum(x.lastPetAt) &&
    isRecord(n) && isNum(n.hunger) && isNum(n.mood) && isNum(n.energy) &&
    isRecord(x.fridge) && allNums(x.fridge) && isRecord(x.records) && allNums(x.records) &&
    typeof x.sleeping === 'boolean' && typeof x.seenBirthday === 'boolean' &&
    typeof x.lastDailyBonus === 'string' &&
    (x.lastFreeKitkat === null || typeof x.lastFreeKitkat === 'string')
  );
}

/** Miejsce na przyszłe migracje (etap 2 podbije `version`). */
function migrate(x: unknown): GameState | null {
  if (!isRecord(x)) return null;
  if (isValidV1(x)) return x as unknown as GameState;
  return null;
}

/** Zapis pochodzi z nowszej wersji gry niż ta, która go czyta — nie wolno go ruszać. */
export class NewerSaveError extends Error {
  constructor() {
    super('Zapis pochodzi z nowszej wersji gry.');
    this.name = 'NewerSaveError';
  }
}

export function loadState(kv: KV, now: number): LoadResult {
  const raw = kv.getItem(SAVE_KEY);
  if (raw === null) return { state: createState(now), fresh: true, recovered: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && isNum(parsed.version) && parsed.version > 1) throw new NewerSaveError();
    const state = migrate(parsed);
    if (state) return { state, fresh: false, recovered: false };
  } catch (err) {
    if (err instanceof NewerSaveError) throw err;
    // uszkodzony JSON — obsłużony poniżej
  }
  try {
    kv.setItem(BACKUP_KEY, raw);
  } catch {
    // brak miejsca na kopię — trudno, startujemy od nowa
  }
  return { state: createState(now), fresh: true, recovered: true };
}

export function saveState(kv: KV, state: GameState): boolean {
  // NaN/Infinity zamieniłoby się w null i następny odczyt odrzuciłby cały zapis
  if (!isValidV1(state as unknown as Record<string, unknown>)) return false;
  try {
    kv.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
