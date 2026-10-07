import type { IconName } from '../art/icons';
import type { ClothSlot } from '../core/types';

export type ClothPattern = 'dots' | 'stripes' | 'flowers' | 'checks' | 'hearts';
export type ClothCut = 'pants' | 'skirt' | 'leggings';

/** Trzy tony ubrania (jasny, średni, ciemny) jako `#rrggbb` — przemalowanie zachowuje cieniowanie rysunku. */
export type ClothColors = readonly [light: string, mid: string, dark: string];

export interface ClothDef {
  id: string;
  slot: ClothSlot;
  name: string;
  /** Cena w monetach. */
  price: number;
  colors: ClothColors;
  /** Wzór nakładany na kolor ubrania (tylko wraz z `patternColor`). */
  pattern?: ClothPattern;
  patternColor?: string;
  /** Tylko doły: kształt nogawek (spodnie / spódnica / legginsy). Sukienka jest zawsze spódnicowa. */
  cut?: ClothCut;
  /** Tylko ozdoby głowy: nazwa ikony pixel art z `ICONS`. */
  headArt?: IconName;
}

/** Kolejność zakładek w Szafie: Sukienki / Góra / Dół / Głowa. */
export const CLOTH_SLOTS: readonly ClothSlot[] = ['dress', 'top', 'bottom', 'head'];

export const CLOTH_SLOT_NAMES: Readonly<Record<ClothSlot, string>> = {
  dress: 'Sukienki',
  top: 'Góra',
  bottom: 'Dół',
  head: 'Głowa',
};

export const CLOTHES: readonly ClothDef[] = [
  // sukienki 150–300
  { id: 'dress_dots', slot: 'dress', name: 'Sukienka w kropki', price: 180, colors: ['#7d93d4', '#4660b0', '#2c3f7c'], pattern: 'dots', patternColor: '#ffffff' },
  { id: 'dress_flowers', slot: 'dress', name: 'Sukienka w kwiatki', price: 220, colors: ['#fbe6a8', '#f2c85b', '#c39a2f'], pattern: 'flowers', patternColor: '#e0608f' },
  { id: 'dress_stripes', slot: 'dress', name: 'Sukienka w paski', price: 160, colors: ['#a6e4da', '#4fb8aa', '#2f8478'], pattern: 'stripes', patternColor: '#ffffff' },
  { id: 'dress_plaid', slot: 'dress', name: 'Sukienka w kratkę', price: 200, colors: ['#ea7886', '#c73c52', '#8f2438'], pattern: 'checks', patternColor: '#f6e7c8' },
  { id: 'dress_evening', slot: 'dress', name: 'Sukienka wieczorowa', price: 300, colors: ['#8a5cc4', '#5a2f98', '#37195f'] },
  { id: 'dress_summer_pink', slot: 'dress', name: 'Różowa sukienka letnia', price: 150, colors: ['#ffc8de', '#f58fb8', '#c25a88'] },

  // koszulki 60–120
  { id: 'top_white', slot: 'top', name: 'Biała koszulka', price: 60, colors: ['#ffffff', '#e0dcec', '#a8a2c0'] },
  { id: 'top_pink', slot: 'top', name: 'Różowa koszulka', price: 70, colors: ['#ffc8de', '#f58fb8', '#c25a88'] },
  { id: 'top_lavender', slot: 'top', name: 'Lawendowa koszulka', price: 70, colors: ['#e9dcff', '#b9a0e8', '#8466bd'] },
  { id: 'top_stripes', slot: 'top', name: 'Koszulka w paski', price: 90, colors: ['#f6f3fb', '#d3cde6', '#9f97bd'], pattern: 'stripes', patternColor: '#3f5aa8' },
  { id: 'top_heart', slot: 'top', name: 'Koszulka z serduszkiem', price: 120, colors: ['#fff4f8', '#ffd3e2', '#d894ac'], pattern: 'hearts', patternColor: '#e0384f' },

  // doły 60–120
  { id: 'bottom_jeans_light', slot: 'bottom', name: 'Jasne dżinsy', price: 80, colors: ['#bddaf6', '#82b0e2', '#5482b8'], cut: 'pants' },
  { id: 'bottom_black', slot: 'bottom', name: 'Czarne spodnie', price: 70, colors: ['#5f586e', '#3a3347', '#201c2b'], cut: 'pants' },
  { id: 'skirt_purple', slot: 'bottom', name: 'Fioletowa spódnica', price: 100, colors: ['#cdacf3', '#9d72d3', '#6c41a1'], cut: 'skirt' },
  { id: 'skirt_plaid', slot: 'bottom', name: 'Spódnica w kratę', price: 120, colors: ['#92d4a3', '#4fa96c', '#2f7a4a'], pattern: 'checks', patternColor: '#fff3d6', cut: 'skirt' },
  { id: 'leggings_pink', slot: 'bottom', name: 'Różowe legginsy', price: 60, colors: ['#ffb6d3', '#f06aa0', '#b83c74'], cut: 'leggings' },

  // ozdoby głowy 80–200
  { id: 'head_party_hat', slot: 'head', name: 'Czapka urodzinowa', price: 80, colors: ['#cfb2f2', '#b48ae0', '#7a4fb3'], headArt: 'hat_party' },
  { id: 'head_crown', slot: 'head', name: 'Korona', price: 200, colors: ['#ffe27a', '#ffd34d', '#c99a2e'], headArt: 'crown' },
  { id: 'head_cat_ears', slot: 'head', name: 'Kocie uszy', price: 120, colors: ['#e2dcee', '#c9c3d6', '#9a93ab'], headArt: 'cat_ears' },
  { id: 'head_flower', slot: 'head', name: 'Kwiatek', price: 90, colors: ['#ffb6d3', '#ff9ec4', '#d9608f'], headArt: 'flower' },
  { id: 'head_beret', slot: 'head', name: 'Beret', price: 110, colors: ['#ee5a70', '#e0384f', '#9c1f36'], headArt: 'beret' },
  { id: 'head_bow', slot: 'head', name: 'Kokarda', price: 80, colors: ['#ffb6d3', '#ff9ec4', '#d9608f'], headArt: 'bow' },
];

const BY_ID = new Map(CLOTHES.map((c) => [c.id, c]));

export function findCloth(id: string): ClothDef | undefined {
  return BY_ID.get(id);
}

/** Ubrania danego slotu w kolejności katalogu. */
export function clothesBySlot(slot: ClothSlot): ClothDef[] {
  return CLOTHES.filter((c) => c.slot === slot);
}
