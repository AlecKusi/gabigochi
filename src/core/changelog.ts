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
    version: 4,
    date: '2026-10-20',
    changes: [
      'Naprawiona sukienka „Gotycka lolita”: Gabi wygląda w niej jak na obrazku — przy chodzeniu, siedzeniu, zajęciach, z kotkiem i na portrecie.',
      'W Szafie znaczek „Naprawiony” pokazuje ubrania już poprawione, a „Do naprawy” te, które czekają na swoją kolej.',
      'Gabi przy karaoke nie zmienia już rozmiaru.',
    ],
    items: ['goth_lolita'],
    soon: ['Naprawiamy po kolei kolejne ubrania Gabi!'],
  },
  {
    version: 3,
    date: '2026-10-19',
    changes: [
      'Pory roku i pogoda: balkon zmienia się z porą roku, pada deszcz i śnieg, latem są burze, motyle i świetliki.',
      'Gabi mówi o pogodzie, a w oknach widać deszcz, śnieg i liście.',
      'Ozdoby sezonowe w sklepie — teraz jesienne: dynie, wrzosy, kominek, palenisko i dużo więcej!',
    ],
    items: [
      'pumpkin', 'apple_basket', 'leaf_garland', 'xmas_tree', 'xmas_tree_blue', 'snowman', 'poinsettia', 'catkins',
      'egg_basket', 'birdhouse', 'fan', 'paddling_pool', 'flamingo', 'watermelon', 'pumpkin_classic', 'gourd',
      'pumpkin_giant', 'pumpkin_cluster', 'harvest_basket', 'jar_candle', 'fireplace', 'corn_stalks', 'scarecrow',
      'heather', 'pinecone_basket', 'autumn_lantern', 'butternut', 'pattypan', 'corn_basket', 'harvest_veggies',
      'straw_bale', 'door_wreath', 'porch_display', 'autumn_sign', 'blanket_bench', 'straw_pumpkins', 'mum_pot',
      'leaf_basket', 'fire_pit',
    ],
    soon: ['Staramy się naprawić ubrania Gabi i dodać kilka nowych rzeczy dla Gabi i Somerki!'],
  },
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
