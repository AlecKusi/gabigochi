import type { KV } from './save';

/** Jedna wydana wersja gry i jej nowości (pokazywane graczowi po aktualizacji). */
export interface Release {
  version: number;
  /** Data wydania (RRRR-MM-DD). */
  date: string;
  changes: readonly string[];
  /** Rzeczy dodane w tej wersji (id przedmiotów, tapet i podłóg, ubrań, jedzenia) — znaczek „NOWE” w sklepie i szafie. */
  items?: readonly string[];
  /** Zapowiedź kolejnych zmian („W planach”) — w oknie „Co nowego?” tylko z najnowszej wersji. */
  soon?: readonly string[];
}

/**
 * Wersje gry, najnowsza na górze. Aktualizacja = nowy wpis z numerem o 1 wyższym (patrz docs/AKTUALIZACJE.md).
 * To numer wydania, a nie `SAVE_VERSION` — format zapisu zmienia się rzadko i ma własne migracje.
 */
export const RELEASES: readonly Release[] = [
  {
    version: 2,
    date: '2026-10-15',
    changes: [
      'Nowa szyfrokrzyżówka: 40 plansz z ukrytymi hasłami o Gabi.',
      'Przycisk „Sprawdź” zaznacza błędne litery na czerwono.',
    ],
    soon: ['Staramy się naprawić ubrania Gabi, dodać pory roku i kilka nowych rzeczy dla Gabi i Somerki!'],
  },
  { version: 1, date: '2026-10-10', changes: ['Pierwsza wersja Gabigochi. Wszystkiego najlepszego!'] },
];

export const APP_VERSION = RELEASES[0].version;

/** Ostatnia wersja, której nowości gracz widział (osobno od zapisu gry — kopia zapisu go nie przenosi). */
export const SEEN_VERSION_KEY = 'gabigochi.seenVersion';

export function readSeenVersion(kv: Pick<KV, 'getItem'>): number | null {
  const raw = kv.getItem(SEEN_VERSION_KEY);
  const v = raw === null ? NaN : Number(raw);
  return Number.isFinite(v) ? v : null;
}

export function markSeen(kv: KV): void {
  try {
    kv.setItem(SEEN_VERSION_KEY, String(APP_VERSION));
  } catch {
    // bez miejsca — nowości pokażą się jeszcze raz, nic złego
  }
}

/**
 * Wersje nowsze niż ostatnio widziana (najnowsza pierwsza). Brak wpisu (pierwsze uruchomienie) — nic do pokazania:
 * nowa gra zaczyna od bieżącej wersji.
 */
export function unseenReleases(seen: number | null): Release[] {
  if (seen === null) return [];
  return RELEASES.filter((r) => r.version > seen);
}
